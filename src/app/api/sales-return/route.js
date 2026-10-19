import dbConnect from "@/lib/db";
import Bill from "@/models/Bill";
import Client from "@/models/Client";
import Item from "@/models/Item";
import mongoose from "mongoose";

const fail = (message, status = 400) => Response.json({ success: false, message }, { status });

export async function POST(request) {
  let restockedItemId = null;
  let bill;
  let clientRecord = null;
  let billLine = null;
  let returnEntryPushed = false;
  let beforeLineReturnedBoxes = 0;
  let beforeReturnedAmount = 0;
  let beforeIsPaid = false;
  let creditAdded = 0;
  let creditEntryId = null;
  try {
    const input = await request.json();
    const { billId, itemIndex } = input;
    const boxes = Number(input.boxes);
    const reason = String(input.reason || "").trim();
    if (!mongoose.isValidObjectId(billId) || itemIndex === "" || itemIndex === null || !Number.isInteger(Number(itemIndex)) || Number(itemIndex) < 0) return fail("Choose a valid invoice item.");
    if (!Number.isInteger(boxes) || boxes < 1 || reason.length < 3) return fail("Enter a positive box quantity and a return reason.");

    await dbConnect();
    bill = await Bill.findById(billId);
    if (!bill) return fail("Invoice not found.", 404);
    billLine = bill.items[Number(itemIndex)];
    if (!billLine) return fail("Invoice item not found.", 404);
    const alreadyReturned = Number(billLine.returnedBoxes || 0);
    if (boxes > Number(billLine.boxQty || 0) - alreadyReturned) return fail(`Only ${Number(billLine.boxQty || 0) - alreadyReturned} boxes are available to return.`);

    const lineSubtotal = Number(billLine.rate || 0) * Number(billLine.quantity || 0) * boxes;
    const discountShare = Number(bill.subtotal || 0) > 0 ? Number(bill.discount || 0) * lineSubtotal / Number(bill.subtotal) : 0;
    const amountBeforeTax = Math.max(0, lineSubtotal - discountShare);
    const returnTax = amountBeforeTax * Number(bill.taxRate || 0) / 100;
    const returnAmount = Number((amountBeforeTax + returnTax).toFixed(2));
    const legacyPaidAmount = bill.isPaid && !Number(bill.returnedAmount || 0) && !Number(bill.creditApplied || 0) && !(bill.paymentEntries || []).length && !Number(bill.paidAmount || 0) ? Number(bill.total || 0) : 0;
    const paidAmount = Number(bill.paidAmount || legacyPaidAmount);
    const outstanding = Math.max(0, Number(bill.total || 0) - paidAmount - Number(bill.returnedAmount || 0) - Number(bill.creditApplied || 0));
    creditAdded = Number(Math.max(0, returnAmount - outstanding).toFixed(2));
    if (creditAdded > 0) {
      clientRecord = await Client.findById(bill.client);
      if (!clientRecord) return fail("The customer account for this invoice no longer exists, so a credit cannot be recorded.", 409);
      creditEntryId = new mongoose.Types.ObjectId();
    }

    const unitCost = bill.marginBeforeDiscount === undefined ? Number(billLine.originalRate || 0) : Number(billLine.unitCost || 0);
    const [restocked] = await Item.create([{
      itemname: billLine.itemname,
      box: boxes,
      itemperbox: billLine.quantity,
      originalrate: unitCost,
      purchaseRatePerBox: Number((unitCost * Number(billLine.quantity || 0)).toFixed(2)),
      date: new Date(),
    }]);
    restockedItemId = restocked._id;

    beforeLineReturnedBoxes = alreadyReturned;
    beforeReturnedAmount = Number(bill.returnedAmount || 0);
    beforeIsPaid = Boolean(bill.isPaid);
    if (legacyPaidAmount) bill.paidAmount = legacyPaidAmount;
    billLine.returnedBoxes = alreadyReturned + boxes;
    bill.returnedAmount = Number((beforeReturnedAmount + returnAmount).toFixed(2));
    const profitReduction = Number((((Number(billLine.rate || 0) - unitCost) * Number(billLine.quantity || 0) * boxes) - discountShare).toFixed(2));
    bill.returns.push({ date: new Date(), amount: returnAmount, profitReduction, reason, items: [{ itemname: billLine.itemname, boxes, amount: returnAmount }] });
    returnEntryPushed = true;
    bill.isPaid = paidAmount + bill.returnedAmount + Number(bill.creditApplied || 0) >= Number(bill.total || 0) - 0.005;
    await bill.save();
    if (creditAdded > 0) {
      const priorCredit = Number(clientRecord.creditBalance || 0);
      const creditUpdate = await Client.updateOne(
        { _id: clientRecord._id, $or: [{ creditBalance: priorCredit }, { creditBalance: { $exists: false } }] },
        { $inc: { creditBalance: creditAdded }, $push: { creditEntries: { _id: creditEntryId, amount: creditAdded, direction: "credit", reference: `Invoice #${bill.invoiceNumber}`, reason: `Customer credit from return: ${reason}`, date: new Date() } } },
      );
      if (creditUpdate.matchedCount !== 1) throw new Error("Customer credit changed while this return was being recorded.");
    }
    await bill.populate("client");
    return Response.json({ success: true, message: "Sales return recorded and stock restored.", data: bill });
  } catch (error) {
    if (bill && restockedItemId) {
      try {
        if (billLine) billLine.returnedBoxes = beforeLineReturnedBoxes;
        bill.returnedAmount = beforeReturnedAmount;
        bill.isPaid = beforeIsPaid;
        if (returnEntryPushed) bill.returns.pop();
        await bill.save();
      } catch (rollbackError) {
        console.error("Sales return rollback failed:", rollbackError);
      }
    }
    if (restockedItemId) {
      try { await Item.deleteOne({ _id: restockedItemId }); }
      catch (rollbackError) { console.error("Returned stock rollback failed:", rollbackError); }
    }
    if (creditAdded > 0 && creditEntryId && clientRecord) {
      try { await Client.updateOne({ _id: clientRecord._id, "creditEntries._id": creditEntryId }, { $inc: { creditBalance: -creditAdded }, $pull: { creditEntries: { _id: creditEntryId } } }); }
      catch (rollbackError) { console.error("Customer credit rollback failed:", rollbackError); }
    }
    console.error("Sales return failed:", error);
    return fail("Unable to record this sales return.", 500);
  }
}
