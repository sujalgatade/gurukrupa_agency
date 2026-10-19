import dbConnect from "@/lib/db";
import Item from "@/models/Item";
import Purchase from "@/models/Purchase";
import Supplier from "@/models/Supplier";
import mongoose from "mongoose";

const fail = (message, status = 400) => Response.json({ success: false, message }, { status });

export async function POST(request) {
  let purchase;
  let itemLine = null;
  let changedLots = [];
  let priorReturnedBoxes = 0;
  let priorReturnedAmount = 0;
  let returnAdded = false;
  let purchaseMutated = false;
  let supplierRecord = null;
  let supplierCreditAdded = 0;
  let supplierCreditEntryId = null;
  try {
    const input = await request.json();
    const { purchaseId } = input;
    const itemIndex = Number(input.itemIndex);
    const boxes = Number(input.boxes);
    const reason = String(input.reason || "").trim();
    if (!mongoose.isValidObjectId(purchaseId) || input.itemIndex === "" || input.itemIndex === null || !Number.isInteger(itemIndex) || itemIndex < 0) return fail("Choose a valid purchase item.");
    if (!Number.isInteger(boxes) || boxes < 1 || reason.length < 3) return fail("Enter a positive box quantity and a return reason.");

    await dbConnect();
    purchase = await Purchase.findById(purchaseId);
    if (!purchase) return fail("Purchase not found.", 404);
    itemLine = purchase.items[itemIndex];
    if (!itemLine) return fail("Purchase item not found.", 404);
    priorReturnedBoxes = Number(itemLine.returnedBoxes || 0);
    priorReturnedAmount = Number(purchase.returnedAmount || 0);
    const leftOnPurchase = Number(itemLine.box || 0) - Number(itemLine.returnedBoxes || 0);
    if (boxes > leftOnPurchase) return fail(`Only ${leftOnPurchase} boxes are left on this purchase line.`);

    const lots = await Item.find({ purchaseId: purchase._id, purchaseItemIndex: itemIndex, box: { $gt: 0 } }).sort({ date: 1, _id: 1 });
    const available = lots.reduce((sum, lot) => sum + Number(lot.box || 0), 0);
    if (boxes > available) return fail(`Only ${available} boxes from this purchase are still in stock.` , 409);
    const lineSubtotal = boxes * Number(itemLine.rate || 0);
    const amount = Number((lineSubtotal * (1 + Number(purchase.taxRate || 0) / 100)).toFixed(2));
    const due = Math.max(0, Number(purchase.total || 0) - Number(purchase.paidAmount || 0) - Number(purchase.returnedAmount || 0) - Number(purchase.supplierCreditApplied || 0));
    supplierCreditAdded = Number(Math.max(0, amount - due).toFixed(2));
    if (supplierCreditAdded > 0) {
      const nameKey = String(purchase.supplierName || "").trim().toLowerCase();
      if (!nameKey) return fail("This purchase does not have a supplier name for credit tracking.", 409);
      supplierRecord = await Supplier.findOneAndUpdate({ nameKey }, { $setOnInsert: { name: String(purchase.supplierName).trim(), nameKey } }, { new: true, upsert: true, setDefaultsOnInsert: true });
      supplierCreditEntryId = new mongoose.Types.ObjectId();
    }

    let remaining = boxes;
    for (const lot of lots) {
      if (remaining <= 0) break;
      const before = Number(lot.box || 0);
      const remove = Math.min(before, remaining);
      lot.box = before - remove;
      await lot.save();
      changedLots.push({ id: lot._id, before });
      remaining -= remove;
    }
    itemLine.returnedBoxes = priorReturnedBoxes + boxes;
    purchase.returnedAmount = Number((priorReturnedAmount + amount).toFixed(2));
    purchase.returns.push({ date: new Date(), amount, reason, items: [{ itemname: itemLine.itemname, boxes, amount }] });
    returnAdded = true;
    purchaseMutated = true;
    await purchase.save();
    if (supplierCreditAdded > 0) {
      const priorCredit = Number(supplierRecord.creditBalance || 0);
      const creditUpdate = await Supplier.updateOne(
        { _id: supplierRecord._id, $or: [{ creditBalance: priorCredit }, { creditBalance: { $exists: false } }] },
        { $inc: { creditBalance: supplierCreditAdded }, $push: { creditEntries: { _id: supplierCreditEntryId, amount: supplierCreditAdded, direction: "credit", reference: purchase.supplierInvoiceNumber || `Purchase ${purchase._id}`, reason: `Supplier credit from return: ${reason}`, date: new Date() } } },
      );
      if (creditUpdate.matchedCount !== 1) throw new Error("Supplier credit changed while this return was being recorded.");
    }
    const suppliers = await Supplier.find({}).select("creditBalance").lean();
    const supplierCreditBalance = suppliers.reduce((sum, supplier) => sum + Number(supplier.creditBalance || 0), 0);
    return Response.json({ success: true, message: "Purchase return saved and stock reduced.", data: purchase, supplierCreditBalance });
  } catch (error) {
    if (purchase && itemLine && purchaseMutated) {
      try {
        itemLine.returnedBoxes = priorReturnedBoxes;
        purchase.returnedAmount = priorReturnedAmount;
        if (returnAdded) purchase.returns.pop();
        await purchase.save();
      } catch (rollbackError) {
        console.error("Purchase return rollback failed:", rollbackError);
      }
    }
    if (changedLots.length) {
      try { await Promise.all(changedLots.map(({ id, before }) => Item.updateOne({ _id: id }, { $set: { box: before } }))); }
      catch (rollbackError) { console.error("Purchase stock rollback failed:", rollbackError); }
    }
    if (supplierCreditAdded > 0 && supplierCreditEntryId && supplierRecord) {
      try { await Supplier.updateOne({ _id: supplierRecord._id, "creditEntries._id": supplierCreditEntryId }, { $inc: { creditBalance: -supplierCreditAdded }, $pull: { creditEntries: { _id: supplierCreditEntryId } } }); }
      catch (rollbackError) { console.error("Supplier credit rollback failed:", rollbackError); }
    }
    console.error("Purchase return failed:", error);
    return fail("Unable to record this purchase return.", 500);
  }
}
