import dbConnect from "@/lib/db";
import Bill from "@/models/Bill";
import Client from "@/models/Client";
import Item from "@/models/Item";
import mongoose from "mongoose";

const fail = (message, status = 400) => Response.json({ success: false, message }, { status });
const balanceOf = (bill) => bill.isPaid ? 0 : Math.max(0, Number(bill.total || 0) - Number(bill.paidAmount || 0) - Number(bill.returnedAmount || 0) - Number(bill.creditApplied || 0));

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
      const bill = await Bill.findById(id).populate("client");
      return bill ? Response.json({ success: true, data: bill }) : fail("Bill not found.", 404);
    }
    const query = {};
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
      const boxQty = Number(line.boxQty);
      const rate = Number(line.rate);
      const originalRate = Number(line.originalRate ?? line.rate);
      const itemname = String(line.itemname || "").trim();
      if (!itemname || !Number.isInteger(quantity) || quantity < 1 || !Number.isInteger(boxQty) || boxQty < 1 || !Number.isFinite(rate) || rate < 0 || !Number.isFinite(originalRate) || originalRate < 0) {
        throw new Error("Each invoice line needs a product, positive box quantity, and valid rate.");
      }
      return { id: line.id, itemname, quantity, boxQty, returnedBoxes: 0, rate, originalRate, unitCost: 0, amount: Number((quantity * boxQty * rate).toFixed(2)) };
    });
    const subtotal = Number(items.reduce((sum, item) => sum + item.amount, 0).toFixed(2));
    if (discount > subtotal) return fail("Discount cannot be greater than the invoice subtotal.");
    const taxableAmount = subtotal - discount;
    const tax = Number((taxableAmount * taxRate / 100).toFixed(2));
    const total = Number((taxableAmount + tax).toFixed(2));

    await dbConnect();
    if (await Bill.exists({ invoiceNumber })) return fail("This invoice number already exists. Refresh and try again.", 409);
    if (!mongoose.isValidObjectId(input.client)) return fail("Selected customer could not be found.", 400);
    const clientRecord = await Client.findById(input.client);
    if (!clientRecord) return fail("Selected customer could not be found.", 400);
    const existingBills = await Bill.find({ client: clientRecord._id }).select("total paidAmount isPaid returnedAmount creditApplied").lean();
    const openingDue = Math.max(0, Number(clientRecord.openingBalance || 0) - Number(clientRecord.openingBalancePaid || 0));
    const currentDue = openingDue + existingBills.reduce((sum, existingBill) => sum + balanceOf(existingBill), 0);
    const creditApplied = Number(Math.min(Number(clientRecord.creditBalance || 0), total).toFixed(2));
    const creditLimit = Number(clientRecord.creditLimit || 0);
    const creditWarning = creditLimit > 0 && currentDue + total - creditApplied > creditLimit
      ? { exceeded: true, creditLimit, dueAfterInvoice: Number((currentDue + total - creditApplied).toFixed(2)) }
      : null;

    let profit = 0;
    const neededByProduct = new Map();
    for (const item of items) {
      const key = `${item.itemname.toLowerCase()}::${item.quantity}`;
      neededByProduct.set(key, (neededByProduct.get(key) || 0) + item.boxQty);
    }
    const lotsByKey = new Map();
    for (const [key] of neededByProduct) {
      const [itemname, quantity] = key.split("::");
      const escapedName = itemname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const lots = await Item.find({ itemname: new RegExp(`^${escapedName}$`, "i"), itemperbox: Number(quantity), box: { $gt: 0 } }).sort({ date: 1, _id: 1 });
      const available = lots.reduce((sum, lot) => sum + Number(lot.box || 0), 0);
      if (available < neededByProduct.get(key)) return fail(`Not enough stock for ${itemname}. Available: ${available} boxes.`, 409);
      lotsByKey.set(key, lots);
    }

    for (const item of items) {
      const key = `${item.itemname.toLowerCase()}::${item.quantity}`;
      let remaining = item.boxQty;
      let costTotal = 0;
      for (const lot of lotsByKey.get(key)) {
        if (remaining <= 0) break;
        const deduct = Math.min(Number(lot.box), remaining);
        if (!changedLots.has(String(lot._id))) changedLots.set(String(lot._id), { document: lot, originalBox: lot.box });
        lot.box -= deduct;
        remaining -= deduct;
        const units = item.quantity * deduct;
        const unitCost = Number(lot.originalrate || 0);
        costTotal += unitCost * units;
        profit += (item.rate - unitCost) * units;
      }
      item.unitCost = item.quantity * item.boxQty ? Number((costTotal / (item.quantity * item.boxQty)).toFixed(4)) : 0;
    }
    await Promise.all([...changedLots.values()].map(({ document }) => document.save()));

    let bill;
    try {
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
      await Promise.all([...changedLots.values()].map(({ document, originalBox }) => Item.updateOne({ _id: document._id }, { $set: { box: originalBox } })));
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
  try {
    const input = await request.json();
    const reason = String(input.reason || "").trim();
    if (reason.length < 3) return fail("Enter a short reason for this invoice correction.");
    const issueDate = new Date(input.issueDate);
    const taxRate = Number(input.taxRate);
    const discount = Number(input.discount);
    if (Number.isNaN(issueDate.getTime())) return fail("Choose a valid invoice date.");
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) return fail("GST rate must be between 0 and 100.");
    if (!Number.isFinite(discount) || discount < 0) return fail("Discount must be a valid non-negative amount.");

    await dbConnect();
    const bill = await Bill.findById(id);
    if (!bill) return fail("Bill not found.", 404);
    if ((bill.returns || []).length && (discount !== Number(bill.discount || 0) || taxRate !== Number(bill.taxRate || 0))) {
      return fail("GST or discount cannot be changed after a sales return has been recorded. Add a follow-up credit adjustment instead.", 409);
    }
    if (discount > Number(bill.subtotal || 0)) return fail("Discount cannot be greater than the invoice subtotal.");
    const tax = Number(((Number(bill.subtotal || 0) - discount) * taxRate / 100).toFixed(2));
    const total = Number((Number(bill.subtotal || 0) - discount + tax).toFixed(2));
    const legacyPaidAmount = bill.isPaid && !Number(bill.returnedAmount || 0) && !Number(bill.creditApplied || 0) && !(bill.paymentEntries || []).length && !Number(bill.paidAmount || 0) ? Number(bill.total || 0) : 0;
    const paidAmount = Number(bill.paidAmount || legacyPaidAmount);
    const priorAllocations = paidAmount + Number(bill.returnedAmount || 0) + Number(bill.creditApplied || 0);
    if (total + 0.005 < priorAllocations) return fail("The corrected total cannot be lower than payments, returns, and customer credit already recorded.");

    const before = { issueDate: bill.issueDate, discount: Number(bill.discount || 0), taxRate: Number(bill.taxRate || 0), tax: Number(bill.tax || 0), total: Number(bill.total || 0) };
    const after = { issueDate, discount, taxRate, tax, total };
    bill.changeHistory.push({ reason, editedAt: new Date(), before, after });
    bill.issueDate = issueDate;
    bill.discount = discount;
    bill.taxRate = taxRate;
    bill.tax = tax;
    bill.total = total;
    if (legacyPaidAmount) bill.paidAmount = legacyPaidAmount;
    if (Number.isFinite(Number(bill.marginBeforeDiscount))) {
      bill.profit = Number((Number(bill.marginBeforeDiscount) - discount).toFixed(2));
    }
    bill.isPaid = paidAmount + Number(bill.returnedAmount || 0) + Number(bill.creditApplied || 0) >= total - 0.005;
    await bill.save();
    await bill.populate("client");
    return Response.json({ success: true, message: "Invoice corrected and change recorded.", data: bill });
  } catch (error) {
    console.error("Invoice correction failed:", error);
    return fail("Unable to correct this invoice.", 500);
  }
}

export async function PUT(request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return fail("Bill ID is required.");
  try {
    const input = await request.json().catch(() => ({}));
    await dbConnect();
    const bill = await Bill.findById(id);
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
