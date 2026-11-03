import dbConnect from "@/lib/db";
import Bill from "@/models/Bill";
import Client from "@/models/Client";
import Item from "@/models/Item";
import mongoose from "mongoose";

const fail = (message, status = 400) => Response.json({ success: false, message }, { status });
const balanceOf = (bill) => bill.isPaid ? 0 : Math.max(0, Number(bill.total || 0) - Number(bill.paidAmount || 0) - Number(bill.returnedAmount || 0) - Number(bill.creditApplied || 0));
const unitCostOf = (line) => Number(line?.unitCost ?? line?.originalRate ?? 0);
const stockLotCounts = (lot, unitsPerBox) => {
  const rawBoxes = Math.max(0, Number(lot.box || 0));
  let boxes = Math.floor(rawBoxes + 0.000001);
  let loose = Math.max(0, Number(lot.looseQty || 0)) + Math.round((rawBoxes - boxes) * unitsPerBox);
  boxes += Math.floor(loose / unitsPerBox);
  loose %= unitsPerBox;
  return { boxes, loose };
};
const stockLotTimestamp = (value) => {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};
const compareStockLotsFifo = (unitsPerBox) => (first, second) => {
  const firstCounts = stockLotCounts(first, unitsPerBox);
  const secondCounts = stockLotCounts(second, unitsPerBox);
  const looseOrder = Number(secondCounts.loose > 0) - Number(firstCounts.loose > 0);
  if (looseOrder) return looseOrder;

  // Loose pieces keep the purchase date of their source box, so use that same
  // date for FIFO even if an older record has a stale looseDate value.
  const dateOrder = stockLotTimestamp(first.date) - stockLotTimestamp(second.date);
  if (dateOrder) return dateOrder;

  const createdOrder = stockLotTimestamp(first.createdAt) - stockLotTimestamp(second.createdAt);
  if (createdOrder) return createdOrder;
  return String(first._id || "").localeCompare(String(second._id || ""));
};
const getFirstPurchaseDate = async (itemname, unitsPerBox, fallbackDate) => {
  const escapedName = String(itemname || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const namePattern = new RegExp(`^${escapedName}$`, "i");
  const firstPurchase = await Item.findOne({
    itemname: namePattern,
    itemperbox: unitsPerBox,
    purchaseId: { $exists: true, $ne: null },
  }).sort({ date: 1, createdAt: 1, _id: 1 }).select("date").lean();
  if (firstPurchase?.date) return firstPurchase.date;

  const firstStockLot = await Item.findOne({ itemname: namePattern, itemperbox: unitsPerBox })
    .sort({ date: 1, createdAt: 1, _id: 1 })
    .select("date")
    .lean();
  return firstStockLot?.date || fallbackDate;
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const client = searchParams.get("client");
  const id = searchParams.get("id");
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));
  const today = searchParams.get("today");
  const paymentStatus = searchParams.get("paymentStatus");
  try {
    await dbConnect();
    if (id) {
      const bill = await Bill.findOne({ _id: id, isDeleted: { $ne: true } }).populate("client");
      return bill ? Response.json({ success: true, data: bill }) : fail("Bill not found.", 404);
    }
    const query = { isDeleted: { $ne: true } };
    if (client) query.client = client;
    if (month && year) {
      query.issueDate = { $gte: new Date(year, month - 1, 1), $lt: new Date(year, month, 1) };
    } else if (today) {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(end.getDate() + 1);
      query.issueDate = { $gte: start, $lt: end };
    }
    let bills = await Bill.find(query).sort({ issueDate: -1, createdAt: -1 }).populate("client");
    if (paymentStatus === "paid") bills = bills.filter((bill) => bill.isPaid || balanceOf(bill) === 0);
    if (paymentStatus === "unpaid") bills = bills.filter((bill) => !bill.isPaid && balanceOf(bill) > 0);
    return Response.json({ success: true, data: bills });
  } catch (error) {
    console.error("Bill fetch failed:", error);
    return fail("Unable to load bills. Check the database connection.", 500);
  }
}

export async function POST(request) {
  const changedLots = new Map();
  try {
    const input = await request.json();
    const invoiceNumber = Number(input.invoiceNumber);
    const issueDate = new Date(input.issueDate);
    const taxRate = Number(input.taxRate || 0);
    const discount = Number(input.discount || 0);
    const lines = Array.isArray(input.items) ? input.items : [];
    if (!Number.isInteger(invoiceNumber) || invoiceNumber < 1) return fail("A valid invoice number is required.");
    if (Number.isNaN(issueDate.getTime())) return fail("Choose a valid invoice date.");
    if (!lines.length) return fail("Add at least one product to the invoice.");
    if (!input.client) return fail("Choose a customer before saving the invoice.");
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) return fail("GST rate must be between 0 and 100.");
    if (!Number.isFinite(discount) || discount < 0) return fail("Discount must be a valid non-negative amount.");

    const items = lines.map((line) => {
      const quantity = Number(line.quantity);
      const boxQty = Number(line.boxQty || 0);
      const itemQty = Number(line.itemQty || 0);
      const rate = Number(line.rate);
      const originalRate = Number(line.originalRate ?? line.rate);
      const itemname = String(line.itemname || "").trim();
      if (!itemname || !Number.isInteger(quantity) || quantity < 1 || !Number.isInteger(boxQty) || boxQty < 0 || !Number.isInteger(itemQty) || itemQty < 0 || boxQty + itemQty === 0 || !Number.isFinite(rate) || rate < 0 || !Number.isFinite(originalRate) || originalRate < 0) {
        throw new Error("Each invoice line needs a product, a positive box or item quantity, and a valid rate.");
      }
      const totalUnits = quantity * boxQty + itemQty;
      return { id: line.id, itemname, quantity, boxQty, itemQty, returnedBoxes: 0, returnedItemQty: 0, rate, originalRate, unitCost: 0, amount: Number((totalUnits * rate).toFixed(2)) };
    });
    const subtotal = Number(items.reduce((sum, item) => sum + item.amount, 0).toFixed(2));
    if (discount > subtotal) return fail("Discount cannot be greater than the invoice subtotal.");
    const taxableAmount = subtotal - discount;
    const tax = Number((taxableAmount * taxRate / 100).toFixed(2));
    const total = Number((taxableAmount + tax).toFixed(2));

    await dbConnect();
    if (!Item.schema.path("looseQty") || !Item.schema.path("looseDate") || !Bill.schema.path("items")?.schema?.path("stockAllocations")) {
      return fail("Invoice or inventory stock fields are not loaded by the server yet. Restart the app before saving this invoice; stock was not changed.", 503);
    }
    if (await Bill.exists({ invoiceNumber })) return fail("This invoice number already exists. Refresh and try again.", 409);
    if (!mongoose.isValidObjectId(input.client)) return fail("Selected customer could not be found.", 400);
    const clientRecord = await Client.findOne({ _id: input.client, isDeleted: { $ne: true } });
    if (!clientRecord) return fail("Selected customer could not be found.", 400);
    const existingBills = await Bill.find({ client: clientRecord._id, isDeleted: { $ne: true } }).select("total paidAmount isPaid returnedAmount creditApplied").lean();
    const openingDue = Math.max(0, Number(clientRecord.openingBalance || 0) - Number(clientRecord.openingBalancePaid || 0));
    const currentDue = openingDue + existingBills.reduce((sum, existingBill) => sum + balanceOf(existingBill), 0);
    const creditApplied = Number(Math.min(Number(clientRecord.creditBalance || 0), total).toFixed(2));
    const creditLimit = Number(clientRecord.creditLimit || 0);
    const creditWarning = creditLimit > 0 && currentDue + total - creditApplied > creditLimit
      ? { exceeded: true, creditLimit, dueAfterInvoice: Number((currentDue + total - creditApplied).toFixed(2)) }
      : null;

    let profit = 0;
    const neededUnitsByProduct = new Map();
    for (const item of items) {
      const key = `${item.itemname.toLowerCase()}::${item.quantity}`;
      const totalUnits = item.quantity * item.boxQty + item.itemQty;
      neededUnitsByProduct.set(key, (neededUnitsByProduct.get(key) || 0) + totalUnits);
    }
    const lotsByKey = new Map();
    for (const [key, neededUnits] of neededUnitsByProduct) {
      const [itemname, quantity] = key.split("::");
      const escapedName = itemname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const lots = await Item.find({
        itemname: new RegExp(`^${escapedName}$`, "i"),
        itemperbox: Number(quantity),
        $or: [{ box: { $gt: 0 } }, { looseQty: { $gt: 0 } }],
      }).sort({ date: 1, _id: 1 });
      lots.sort(compareStockLotsFifo(Number(quantity)));
      const availableUnits = lots.reduce((sum, lot) => {
        const rawBoxes = Math.max(0, Number(lot.box || 0));
        const fullBoxes = Math.floor(rawBoxes + 0.000001);
        const legacyLoose = Math.round((rawBoxes - fullBoxes) * Number(quantity));
        return sum + fullBoxes * Number(quantity) + Number(lot.looseQty || 0) + legacyLoose;
      }, 0);
      if (availableUnits + 0.000001 < neededUnits) return fail(`Not enough stock for ${itemname}. Available: ${availableUnits} pieces.`, 409);
      lotsByKey.set(key, lots);
    }

    for (const item of items) {
      const key = `${item.itemname.toLowerCase()}::${item.quantity}`;
      let remainingUnits = item.quantity * item.boxQty + item.itemQty;
      let costTotal = 0;
      item.stockAllocations = [];
      for (const lot of lotsByKey.get(key)) {
        if (remainingUnits <= 0.000001) break;
        const unitsPerBox = Number(item.quantity);
        const rawBoxes = Math.max(0, Number(lot.box || 0));
        let fullBoxes = Math.floor(rawBoxes + 0.000001);
        let looseUnits = Math.max(0, Number(lot.looseQty || 0));
        const legacyLoose = Math.round((rawBoxes - fullBoxes) * unitsPerBox);
        looseUnits += legacyLoose;
        fullBoxes += Math.floor(looseUnits / unitsPerBox);
        looseUnits %= unitsPerBox;
        const lotUnits = fullBoxes * unitsPerBox + looseUnits;
        const deductUnits = Math.min(lotUnits, remainingUnits);
        if (!changedLots.has(String(lot._id))) {
          changedLots.set(String(lot._id), {
            document: lot,
            originalBox: lot.box,
            originalLooseQty: lot.looseQty,
            originalLooseDate: lot.looseDate,
          });
        }

        // Use pieces from already-open boxes first, then open the oldest sealed box only if needed.
        let toDeduct = deductUnits;
        const takeFromLoose = Math.min(looseUnits, toDeduct);
        looseUnits -= takeFromLoose;
        toDeduct -= takeFromLoose;
        while (toDeduct >= unitsPerBox && fullBoxes > 0) {
          const wholeBoxes = Math.min(fullBoxes, Math.floor(toDeduct / unitsPerBox));
          fullBoxes -= wholeBoxes;
          toDeduct -= wholeBoxes * unitsPerBox;
        }
        if (toDeduct > 0 && fullBoxes > 0) {
          fullBoxes -= 1;
          looseUnits = unitsPerBox - toDeduct;
          lot.looseDate = lot.date || issueDate;
          toDeduct = 0;
        }
        if (looseUnits > 0) lot.looseDate = lot.date || issueDate;
        if (looseUnits === 0) lot.looseDate = null;
        lot.box = fullBoxes;
        lot.looseQty = looseUnits;
        remainingUnits = Math.max(0, remainingUnits - deductUnits);
        const unitCost = Number(lot.originalrate || 0);
        item.stockAllocations.push({ stockItemId: lot._id, units: deductUnits, unitCost });
        costTotal += unitCost * deductUnits;
        profit += (item.rate - unitCost) * deductUnits;
      }
      const totalUnits = item.quantity * item.boxQty + item.itemQty;
      item.unitCost = totalUnits ? Number((costTotal / totalUnits).toFixed(4)) : 0;
    }
    let bill;
    try {
      await Promise.all([...changedLots.values()].map(({ document }) => document.save()));
      [bill] = await Bill.create([{
        client: input.client, invoiceNumber, issueDate, items, subtotal, tax, total, taxRate,
        isPaid: creditApplied >= total - 0.005, paidAmount: 0, paymentEntries: [], returnedAmount: 0, creditApplied, returns: [], discount, profit: Number((profit - discount).toFixed(2)),
        marginBeforeDiscount: Number(profit.toFixed(2)),
      }]);
      if (creditApplied > 0) {
        const creditUpdate = await Client.updateOne(
          { _id: clientRecord._id, creditBalance: Number(clientRecord.creditBalance || 0) },
          { $inc: { creditBalance: -creditApplied }, $push: { creditEntries: { amount: creditApplied, direction: "applied", reference: `Invoice #${invoiceNumber}`, reason: "Customer credit applied to new invoice", date: new Date() } } },
        );
        if (creditUpdate.matchedCount !== 1) throw new Error("Customer credit changed while this invoice was being created. Refresh and try again.");
      }
    } catch (error) {
      if (bill?._id) await Bill.deleteOne({ _id: bill._id });
      await Promise.all([...changedLots.values()].map(({ document, originalBox, originalLooseQty, originalLooseDate }) => Item.updateOne(
        { _id: document._id },
        { $set: { box: originalBox, looseQty: originalLooseQty ?? 0, looseDate: originalLooseDate ?? null } },
      )));
      throw error;
    }
    return Response.json({ success: true, message: "Invoice saved and stock updated.", data: bill, creditWarning }, { status: 201 });
  } catch (error) {
    console.error("Bill creation failed:", error);
    if (error.code === 11000) return fail("This invoice number was just used by another save. Refresh for the next number.", 409);
    return fail(error.message || "Unable to save the invoice.", error.message?.startsWith("Each invoice") ? 400 : 500);
  }
}

export async function PATCH(request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !mongoose.isValidObjectId(id)) return fail("A valid bill ID is required.");
  const stockSnapshots = new Map();
  const createdStockIds = [];
  let bill;
  let originalBillState;
  let billSaved = false;

  const rememberLot = (lot) => {
    const key = String(lot._id);
    if (!stockSnapshots.has(key)) {
      stockSnapshots.set(key, { box: lot.box, looseQty: lot.looseQty, looseDate: lot.looseDate });
    }
  };

  const getLotCounts = (lot, unitsPerBox) => {
    return stockLotCounts(lot, unitsPerBox);
  };

  const createCorrectionLot = async ({ itemname, unitsPerBox, units, unitCost, date }) => {
    if (!units) return;
    const purchaseDate = await getFirstPurchaseDate(itemname, unitsPerBox, date);
    const boxes = Math.floor(units / unitsPerBox);
    const looseQty = units % unitsPerBox;
    const [created] = await Item.create([{
      itemname,
      box: boxes,
      looseQty,
      looseDate: looseQty ? purchaseDate : null,
      itemperbox: unitsPerBox,
      originalrate: unitCost,
      purchaseRatePerBox: Number((unitCost * unitsPerBox).toFixed(2)),
      date: purchaseDate,
    }]);
    createdStockIds.push(created._id);
  };

  const restoreUnitsToLot = async ({ stockItemId, itemname, unitsPerBox, units, unitCost, date }) => {
    if (!units) return;
    const lot = stockItemId && mongoose.isValidObjectId(stockItemId)
      ? await Item.findById(stockItemId)
      : null;
    if (!lot || Number(lot.itemperbox || 0) !== unitsPerBox) {
      await createCorrectionLot({ itemname, unitsPerBox, units, unitCost, date });
      return;
    }
    rememberLot(lot);
    const counts = getLotCounts(lot, unitsPerBox);
    const totalUnits = counts.boxes * unitsPerBox + counts.loose + units;
    lot.box = Math.floor(totalUnits / unitsPerBox);
    lot.looseQty = totalUnits % unitsPerBox;
    lot.looseDate = lot.looseQty ? (lot.date || date) : null;
    await lot.save();
  };

  const restoreLineUnits = async (line, unitsToRestore, date) => {
    let remaining = unitsToRestore;
    let restoredCost = 0;
    const allocations = (line.stockAllocations || []).map((allocation) => ({
      stockItemId: allocation.stockItemId,
      units: Number(allocation.units || 0),
      unitCost: Number(allocation.unitCost ?? unitCostOf(line)),
    }));
    const allocatedUnits = allocations.reduce((sum, allocation) => sum + allocation.units, 0);

    for (let index = allocations.length - 1; index >= 0 && remaining > 0; index -= 1) {
      const allocation = allocations[index];
      const restore = Math.min(remaining, allocation.units);
      if (!restore) continue;
      await restoreUnitsToLot({
        stockItemId: allocation.stockItemId,
        itemname: line.itemname,
        unitsPerBox: Number(line.quantity),
        units: restore,
        unitCost: allocation.unitCost,
        date,
      });
      allocation.units -= restore;
      remaining -= restore;
      restoredCost += restore * allocation.unitCost;
    }

    const lineUnits = Number(line.quantity) * Number(line.boxQty || 0) + Number(line.itemQty || 0);
    const unallocatedUnits = Math.max(0, lineUnits - allocatedUnits);
    const restoreUnallocated = Math.min(remaining, unallocatedUnits);
    if (restoreUnallocated > 0) {
      const unitCost = unitCostOf(line);
      await createCorrectionLot({ itemname: line.itemname, unitsPerBox: Number(line.quantity), units: restoreUnallocated, unitCost, date });
      remaining -= restoreUnallocated;
      restoredCost += restoreUnallocated * unitCost;
    }

    if (remaining > 0) {
      const unitCost = unitCostOf(line);
      await createCorrectionLot({ itemname: line.itemname, unitsPerBox: Number(line.quantity), units: remaining, unitCost, date });
      restoredCost += remaining * unitCost;
    }

    return { allocations: allocations.filter((allocation) => allocation.units > 0), restoredCost };
  };

  const consumeStockUnits = async ({ itemname, unitsPerBox, units, issueDate }) => {
    const escapedName = itemname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const lots = await Item.find({
      itemname: new RegExp(`^${escapedName}$`, "i"),
      itemperbox: unitsPerBox,
      $or: [{ box: { $gt: 0 } }, { looseQty: { $gt: 0 } }],
    }).sort({ date: 1, _id: 1 });
    lots.sort(compareStockLotsFifo(unitsPerBox));
    const available = lots.reduce((sum, lot) => {
      const counts = getLotCounts(lot, unitsPerBox);
      return sum + counts.boxes * unitsPerBox + counts.loose;
    }, 0);
    if (available < units) {
      const error = new Error(`Not enough stock for ${itemname}. Available: ${available} pieces.`);
      error.status = 409;
      throw error;
    }

    let remaining = units;
    let costTotal = 0;
    const allocations = [];
    for (const lot of lots) {
      if (remaining <= 0) break;
      const counts = getLotCounts(lot, unitsPerBox);
      const lotUnits = counts.boxes * unitsPerBox + counts.loose;
      if (!lotUnits) continue;
      const deduction = Math.min(remaining, lotUnits);
      rememberLot(lot);
      let boxes = counts.boxes;
      let loose = counts.loose;
      let toDeduct = deduction;
      const fromLoose = Math.min(loose, toDeduct);
      loose -= fromLoose;
      toDeduct -= fromLoose;
      while (toDeduct >= unitsPerBox && boxes > 0) {
        const wholeBoxes = Math.min(boxes, Math.floor(toDeduct / unitsPerBox));
        boxes -= wholeBoxes;
        toDeduct -= wholeBoxes * unitsPerBox;
      }
      if (toDeduct > 0 && boxes > 0) {
        boxes -= 1;
        loose = unitsPerBox - toDeduct;
      }
      lot.box = boxes;
      lot.looseQty = loose;
      lot.looseDate = loose > 0 ? (lot.date || issueDate) : null;
      await lot.save();

      const unitCost = Number(lot.originalrate || 0);
      allocations.push({ stockItemId: lot._id, units: deduction, unitCost });
      costTotal += deduction * unitCost;
      remaining -= deduction;
    }
    return { allocations, costTotal };
  };

  try {
    const input = await request.json();
    const reason = String(input.reason || "Invoice updated from the bill editor").trim();
    const issueDate = input.issueDate === undefined ? null : new Date(input.issueDate);
    const taxRate = Number(input.taxRate ?? 0);
    const discount = Number(input.discount ?? 0);
    if (issueDate && Number.isNaN(issueDate.getTime())) return fail("Choose a valid invoice date.");
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) return fail("GST rate must be between 0 and 100.");
    if (!Number.isFinite(discount) || discount < 0) return fail("Discount must be a valid non-negative amount.");

    await dbConnect();
    if (!Item.schema.path("looseQty") || !Item.schema.path("looseDate") || !Bill.schema.path("items")?.schema?.path("stockAllocations")) return fail("Invoice or inventory stock fields are not ready. Restart the app before editing this invoice; stock was not changed.", 503);
    bill = await Bill.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!bill) return fail("Bill not found.", 404);
    originalBillState = bill.toObject();
    const finalIssueDate = issueDate || bill.issueDate;
    if ((bill.returns || []).length && (Array.isArray(input.items) || discount !== Number(bill.discount || 0) || taxRate !== Number(bill.taxRate || 0))) {
      return fail("GST or discount cannot be changed after a sales return has been recorded. Add a follow-up credit adjustment instead.", 409);
    }

    const currentItems = bill.items.map((line) => line.toObject());
    const currentById = new Map(currentItems.map((line) => [String(line._id), line]));
    const matchedOldIds = new Set();
    const pendingItems = [];
    if (Array.isArray(input.items)) {
      for (const [index, line] of input.items.entries()) {
        const lineId = String(line.lineId || line._id || "");
        const oldLine = lineId ? currentById.get(lineId) : null;
        if (lineId && !oldLine && !lineId.startsWith("new-")) return fail("An invoice item changed on the server. Reload the invoice and try again.", 409);
        if (oldLine && matchedOldIds.has(lineId)) return fail("An invoice item was sent more than once. Reload and try again.");
        if (oldLine) matchedOldIds.add(lineId);
        const itemname = oldLine ? String(oldLine.itemname || "") : String(line.itemname || "").trim();
        const quantity = oldLine ? Number(oldLine.quantity) : Number(line.quantity);
        const boxQty = Number(line.boxQty || 0);
        const itemQty = Number(line.itemQty || 0);
        const rate = Number(line.rate);
        if (!itemname || !Number.isInteger(quantity) || quantity < 1 || !Number.isInteger(boxQty) || boxQty < 0 || !Number.isInteger(itemQty) || itemQty < 0 || !Number.isFinite(rate) || rate < 0) {
          return fail(`Check the product, box quantity, loose pieces, and rate on item ${index + 1}.`);
        }
        const units = quantity * boxQty + itemQty;
        if (units === 0) continue;
        pendingItems.push({
          sourceOldId: oldLine ? String(oldLine._id) : null,
          line: {
            ...(oldLine ? { _id: oldLine._id } : {}),
            id: oldLine?.id || line.id,
            itemname,
            quantity,
            boxQty,
            itemQty,
            returnedBoxes: Number(oldLine?.returnedBoxes || 0),
            returnedItemQty: Number(oldLine?.returnedItemQty || 0),
            rate,
            originalRate: Number(oldLine?.originalRate ?? line.originalRate ?? rate),
            unitCost: Number(oldLine?.unitCost ?? line.unitCost ?? line.originalRate ?? 0),
            amount: Number((units * rate).toFixed(2)),
            stockAllocations: (oldLine?.stockAllocations || []).map((allocation) => ({
              stockItemId: allocation.stockItemId,
              units: Number(allocation.units || 0),
              unitCost: Number(allocation.unitCost ?? unitCostOf(oldLine)),
            })),
          },
        });
      }
      if (!pendingItems.length) return fail("Keep at least one invoice item with a positive quantity.");
    }

    const subtotal = Array.isArray(input.items)
      ? Number(pendingItems.reduce((sum, item) => sum + item.line.amount, 0).toFixed(2))
      : Number(bill.subtotal || 0);
    if (discount > subtotal) return fail("Discount cannot be greater than the invoice subtotal.");
    const tax = Number(((subtotal - discount) * taxRate / 100).toFixed(2));
    const total = Number((subtotal - discount + tax).toFixed(2));
    const legacyPaidAmount = bill.isPaid && !Number(bill.returnedAmount || 0) && !Number(bill.creditApplied || 0) && !(bill.paymentEntries || []).length && !Number(bill.paidAmount || 0) ? Number(bill.total || 0) : 0;
    const paidAmount = Number(bill.paidAmount || legacyPaidAmount);
    const priorAllocations = paidAmount + Number(bill.returnedAmount || 0) + Number(bill.creditApplied || 0);
    if (total + 0.005 < priorAllocations) return fail("The corrected total cannot be lower than payments, returns, and customer credit already recorded.");

    let finalItems = currentItems;
    if (Array.isArray(input.items)) {
      const nextByOldId = new Map(pendingItems.filter((entry) => entry.sourceOldId).map((entry) => [entry.sourceOldId, entry]));
      const allocationResults = new Map();

      for (const oldLine of currentItems) {
        const oldId = String(oldLine._id);
        const nextEntry = nextByOldId.get(oldId);
        const oldUnits = Number(oldLine.quantity) * Number(oldLine.boxQty || 0) + Number(oldLine.itemQty || 0);
        const newUnits = nextEntry ? Number(nextEntry.line.quantity) * Number(nextEntry.line.boxQty || 0) + Number(nextEntry.line.itemQty || 0) : 0;
        if (!nextEntry && oldUnits > 0) {
          await restoreLineUnits(oldLine, oldUnits, bill.issueDate);
        } else if (newUnits < oldUnits) {
          const restored = await restoreLineUnits(oldLine, oldUnits - newUnits, bill.issueDate);
          allocationResults.set(oldId, {
            allocations: restored.allocations,
            costTotal: Math.max(0, oldUnits * unitCostOf(oldLine) - restored.restoredCost),
          });
        }
      }

      finalItems = [];
      for (const entry of pendingItems) {
        const line = entry.line;
        const newUnits = Number(line.quantity) * Number(line.boxQty || 0) + Number(line.itemQty || 0);
        if (!entry.sourceOldId) {
          const consumed = await consumeStockUnits({ itemname: line.itemname, unitsPerBox: line.quantity, units: newUnits, issueDate: finalIssueDate });
          line.stockAllocations = consumed.allocations;
          line.unitCost = Number((consumed.costTotal / newUnits).toFixed(4));
        } else {
          const oldLine = currentById.get(entry.sourceOldId);
          const oldUnits = Number(oldLine.quantity) * Number(oldLine.boxQty || 0) + Number(oldLine.itemQty || 0);
          const result = allocationResults.get(entry.sourceOldId);
          if (newUnits > oldUnits) {
            const consumed = await consumeStockUnits({ itemname: line.itemname, unitsPerBox: line.quantity, units: newUnits - oldUnits, issueDate: finalIssueDate });
            line.stockAllocations = [...line.stockAllocations, ...consumed.allocations];
            line.unitCost = Number(((oldUnits * unitCostOf(oldLine) + consumed.costTotal) / newUnits).toFixed(4));
          } else if (newUnits < oldUnits) {
            line.stockAllocations = result?.allocations || [];
            line.unitCost = newUnits > 0 ? Number(((result?.costTotal || 0) / newUnits).toFixed(4)) : unitCostOf(oldLine);
          } else {
            line.unitCost = unitCostOf(oldLine);
          }
        }
        finalItems.push(line);
      }
    }

    const itemSnapshot = (items) => items.map((line) => ({ itemname: line.itemname, quantity: Number(line.quantity || 0), boxQty: Number(line.boxQty || 0), itemQty: Number(line.itemQty || 0), rate: Number(line.rate || 0), amount: Number(line.amount || 0) }));
    const before = { issueDate: bill.issueDate, discount: Number(bill.discount || 0), taxRate: Number(bill.taxRate || 0), tax: Number(bill.tax || 0), total: Number(bill.total || 0), items: itemSnapshot(currentItems) };
    const after = { issueDate: finalIssueDate, discount, taxRate, tax, total, items: itemSnapshot(finalItems) };
    bill.changeHistory.push({ reason, editedAt: new Date(), before, after });
    bill.issueDate = finalIssueDate;
    bill.discount = discount;
    bill.taxRate = taxRate;
    bill.tax = tax;
    bill.subtotal = subtotal;
    bill.total = total;
    if (Array.isArray(input.items)) bill.items = finalItems;
    if (legacyPaidAmount) bill.paidAmount = legacyPaidAmount;
    if (Array.isArray(input.items) || Number.isFinite(Number(bill.marginBeforeDiscount))) {
      const marginBeforeDiscount = finalItems.reduce((sum, line) => {
        const units = Number(line.quantity || 0) * Number(line.boxQty || 0) + Number(line.itemQty || 0);
        return sum + (Number(line.rate || 0) - Number(line.unitCost ?? line.originalRate ?? 0)) * units;
      }, 0);
      bill.marginBeforeDiscount = Number(marginBeforeDiscount.toFixed(2));
      bill.profit = Number((marginBeforeDiscount - discount).toFixed(2));
    }
    bill.isPaid = paidAmount + Number(bill.returnedAmount || 0) + Number(bill.creditApplied || 0) >= total - 0.005;
    await bill.save();
    billSaved = true;
    await bill.populate("client");
    return Response.json({ success: true, message: "Invoice corrected and stock updated.", data: bill });
  } catch (error) {
    if (billSaved && originalBillState) {
      try { await Bill.replaceOne({ _id: id }, originalBillState); }
      catch (rollbackError) { console.error("Invoice correction rollback failed:", rollbackError); }
    }
    if (createdStockIds.length) {
      try { await Item.deleteMany({ _id: { $in: createdStockIds } }); }
      catch (rollbackError) { console.error("Invoice correction stock rollback failed:", rollbackError); }
    }
    if (stockSnapshots.size) {
      try { await Promise.all([...stockSnapshots.entries()].map(([stockId, state]) => Item.updateOne({ _id: stockId }, { $set: state }))); }
      catch (rollbackError) { console.error("Invoice correction stock rollback failed:", rollbackError); }
    }
    console.error("Invoice correction failed:", error);
    return fail(error.message || "Unable to correct this invoice.", error.status || 500);
  }
}

export async function PUT(request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return fail("Bill ID is required.");
  try {
    const input = await request.json().catch(() => ({}));
    await dbConnect();
    const bill = await Bill.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!bill) return fail("Bill not found.", 404);
    const balance = balanceOf(bill);
    const amount = input.amount === undefined ? balance : Number(input.amount);
    const method = input.method || "Cash";
    if (!Number.isFinite(amount) || amount <= 0) return fail("Enter a payment amount greater than zero.");
    if (amount > balance + 0.005) return fail(`Payment exceeds the outstanding balance of ₹${balance.toFixed(2)}.`);
    if (!["Cash", "UPI", "Bank", "Cheque", "Other"].includes(method)) return fail("Choose a valid payment method.");
    bill.paidAmount = Number((Number(bill.paidAmount || 0) + amount).toFixed(2));
    bill.isPaid = bill.paidAmount + Number(bill.returnedAmount || 0) + Number(bill.creditApplied || 0) >= Number(bill.total) - 0.005;
    bill.paymentEntries.push({ amount, method, receivedAt: new Date(), reference: String(input.reference || "").trim() });
    await bill.save();
    return Response.json({ success: true, message: "Payment recorded.", data: bill });
  } catch (error) {
    console.error("Payment update failed:", error);
    return fail("Unable to record payment.", 500);
  }
}

export async function DELETE(request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !mongoose.isValidObjectId(id)) return fail("A valid bill ID is required.");

  const stockSnapshots = new Map();
  const createdStockIds = [];
  let clientRecord = null;
  let creditEntryId = null;
  let creditReversed = 0;
  let deletionClaimed = false;
  let deletionTimestamp = null;

  const rememberLot = (lot) => {
    const key = String(lot._id);
    if (!stockSnapshots.has(key)) {
      stockSnapshots.set(key, {
        box: lot.box,
        looseQty: lot.looseQty,
        looseDate: lot.looseDate,
      });
    }
  };

  const createRestoredLot = async ({ itemname, unitsPerBox, units, unitCost, date }) => {
    if (!units) return;
    const purchaseDate = await getFirstPurchaseDate(itemname, unitsPerBox, date);
    const boxes = Math.floor(units / unitsPerBox);
    const looseQty = units % unitsPerBox;
    const [created] = await Item.create([{
      itemname,
      box: boxes,
      looseQty,
      looseDate: looseQty ? purchaseDate : null,
      itemperbox: unitsPerBox,
      originalrate: unitCost,
      purchaseRatePerBox: Number((unitCost * unitsPerBox).toFixed(2)),
      date: purchaseDate,
    }]);
    createdStockIds.push(created._id);
  };

  const restoreAllocation = async ({ allocation, line, date }) => {
    const unitsPerBox = Number(line.quantity || 0);
    const units = Number(allocation.units || 0);
    if (!units) return;
    const lot = allocation.stockItemId && mongoose.isValidObjectId(allocation.stockItemId)
      ? await Item.findById(allocation.stockItemId)
      : null;
    if (!lot || Number(lot.itemperbox || 0) !== unitsPerBox) {
      await createRestoredLot({
        itemname: line.itemname,
        unitsPerBox,
        units,
        unitCost: Number(allocation.unitCost ?? unitCostOf(line)),
        date,
      });
      return;
    }

    rememberLot(lot);
    const rawBoxes = Math.max(0, Number(lot.box || 0));
    let boxes = Math.floor(rawBoxes + 0.000001);
    let loose = Math.max(0, Number(lot.looseQty || 0)) + Math.round((rawBoxes - boxes) * unitsPerBox);
    boxes += Math.floor(loose / unitsPerBox);
    loose %= unitsPerBox;
    const totalUnits = boxes * unitsPerBox + loose + units;
    lot.box = Math.floor(totalUnits / unitsPerBox);
    lot.looseQty = totalUnits % unitsPerBox;
    lot.looseDate = lot.looseQty ? (lot.date || date) : null;
    await lot.save();
  };

  try {
    const input = await request.json().catch(() => ({}));
    if (input.confirm !== true) return fail("Confirm bill deletion first.");

    await dbConnect();
    if (!Item.schema.path("looseQty") || !Item.schema.path("looseDate") || !Bill.schema.path("items")?.schema?.path("stockAllocations")) {
      return fail("Bill stock history is not ready yet. Restart the app before deleting; no data was changed.", 503);
    }
    const bill = await Bill.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!bill) return fail("Bill not found.", 404);

    if ((bill.returns || []).length || Number(bill.returnedAmount || 0) > 0) {
      return fail("This bill has a sales return. It cannot be deleted because that would remove return and customer-credit history. Use the return/correction record instead.", 409);
    }
    const paymentEntries = bill.paymentEntries || [];
    const paidAmount = Number(bill.paidAmount || 0);
    const legacyPaid = Boolean(bill.isPaid) && paidAmount <= 0 && Number(bill.creditApplied || 0) <= 0 && paymentEntries.length === 0;
    if (paidAmount > 0 || paymentEntries.length > 0 || legacyPaid) {
      return fail("This bill has a recorded payment or is marked paid. It cannot be deleted until that receipt is reversed safely.", 409);
    }

    const creditApplied = Number(bill.creditApplied || 0);
    if (creditApplied > 0) {
      clientRecord = await Client.findById(bill.client);
      if (!clientRecord) return fail("The customer account is missing, so the bill credit cannot be restored safely.", 409);
      creditEntryId = new mongoose.Types.ObjectId();
    }

    const billLines = bill.items || [];
    for (const line of billLines) {
      if (
        !Number.isInteger(Number(line.quantity)) || Number(line.quantity) < 1 ||
        !Number.isInteger(Number(line.boxQty || 0)) || Number(line.boxQty || 0) < 0 ||
        !Number.isInteger(Number(line.itemQty || 0)) || Number(line.itemQty || 0) < 0
      ) {
        return fail("This bill has incomplete stock quantity details, so it cannot be deleted safely.", 409);
      }
      if ((line.stockAllocations || []).some((allocation) => !Number.isInteger(Number(allocation.units)) || Number(allocation.units) < 0)) {
        return fail("This bill has invalid stock allocation details, so it cannot be deleted safely.", 409);
      }
    }

    deletionTimestamp = new Date();
    const claimFilter = {
      _id: bill._id,
      isDeleted: { $ne: true },
      paidAmount: { $in: [0, null] },
      returnedAmount: { $in: [0, null] },
      $and: [
        { $or: [{ paymentEntries: { $exists: false } }, { paymentEntries: { $size: 0 } }] },
        { $or: [{ returns: { $exists: false } }, { returns: { $size: 0 } }] },
      ],
    };
    if (bill.__v !== undefined) claimFilter.__v = bill.__v;
    const claim = await Bill.updateOne(claimFilter, {
      $set: {
        isDeleted: true,
        deletedAt: deletionTimestamp,
        deleteReason: String(input.reason || "Deleted from Billing & Sales").trim(),
      },
    });
    if (claim.matchedCount !== 1) return fail("This bill changed while you were confirming. Refresh and check it again before deleting.", 409);
    deletionClaimed = true;

    for (const line of billLines) {
      const unitsPerBox = Number(line.quantity || 0);
      const units = unitsPerBox * Number(line.boxQty || 0) + Number(line.itemQty || 0);
      if (units <= 0) continue;

      const allocations = (line.stockAllocations || []).map((allocation) => ({
        stockItemId: allocation.stockItemId,
        units: Number(allocation.units || 0),
        unitCost: Number(allocation.unitCost ?? unitCostOf(line)),
      }));
      let remaining = units;
      for (let index = allocations.length - 1; index >= 0 && remaining > 0; index -= 1) {
        const restore = Math.min(remaining, allocations[index].units);
        if (!restore) continue;
        await restoreAllocation({
          allocation: { ...allocations[index], units: restore },
          line,
          date: bill.issueDate,
        });
        remaining -= restore;
      }
      if (remaining > 0) {
        await createRestoredLot({
          itemname: line.itemname,
          unitsPerBox,
          units: remaining,
          unitCost: unitCostOf(line),
          date: bill.issueDate,
        });
      }
    }

    if (creditApplied > 0) {
      const result = await Client.updateOne(
        { _id: clientRecord._id },
        {
          $inc: { creditBalance: creditApplied },
          $push: {
            creditEntries: {
              _id: creditEntryId,
              amount: creditApplied,
              direction: "credit",
              reference: `Deleted invoice #${bill.invoiceNumber}`,
              reason: "Credit restored after deleting an unpaid invoice",
              date: new Date(),
            },
          },
        },
      );
      if (result.matchedCount !== 1) throw new Error("Customer credit could not be restored.");
      creditReversed = creditApplied;
    }

    return Response.json({ success: true, message: "Bill removed from the register and stock restored." });
  } catch (error) {
    if (createdStockIds.length) {
      try { await Item.deleteMany({ _id: { $in: createdStockIds } }); }
      catch (rollbackError) { console.error("Bill deletion stock rollback failed:", rollbackError); }
    }
    if (stockSnapshots.size) {
      try {
        await Promise.all([...stockSnapshots.entries()].map(([stockId, state]) =>
          Item.updateOne({ _id: stockId }, { $set: state }),
        ));
      } catch (rollbackError) {
        console.error("Bill deletion stock rollback failed:", rollbackError);
      }
    }
    if (creditReversed > 0 && creditEntryId && clientRecord) {
      try {
        await Client.updateOne(
          { _id: clientRecord._id, "creditEntries._id": creditEntryId },
          { $inc: { creditBalance: -creditReversed }, $pull: { creditEntries: { _id: creditEntryId } } },
        );
      } catch (rollbackError) {
        console.error("Bill deletion customer-credit rollback failed:", rollbackError);
      }
    }
    if (deletionClaimed) {
      try {
        await Bill.updateOne(
          { _id: id, isDeleted: true, deletedAt: deletionTimestamp },
          { $set: { isDeleted: false, deletedAt: null, deleteReason: "" } },
        );
      } catch (rollbackError) {
        console.error("Bill deletion status rollback failed:", rollbackError);
      }
    }
    console.error("Bill deletion failed:", error);
    return fail(error.message || "Unable to delete this bill.", error.status || 500);
  }
}
