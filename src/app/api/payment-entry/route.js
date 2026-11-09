import dbConnect from "@/lib/db";
import Bill from "@/models/Bill";
import Client from "@/models/Client";
import mongoose from "mongoose";

const fail = (message, status = 400) =>
  Response.json({ success: false, message }, { status });

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const documentId = searchParams.get("documentId");
  const entryId = searchParams.get("entryId");

  if (!["invoice", "opening"].includes(type)) {
    return fail("Choose a valid payment record type.");
  }
  if (!mongoose.isValidObjectId(documentId) || !mongoose.isValidObjectId(entryId)) {
    return fail("Choose a valid payment record.");
  }

  try {
    await dbConnect();

    if (type === "invoice") {
      const bill = await Bill.findOne({ _id: documentId, isDeleted: { $ne: true } });
      if (!bill) return fail("Invoice not found.", 404);

      const entry = bill.paymentEntries.id(entryId);
      if (!entry) return fail("This payment has already been reversed or no longer exists.", 404);

      const amount = Number(entry.amount || 0);
      const paidAmount = Number(bill.paidAmount || 0);
      if (!Number.isFinite(amount) || amount <= 0 || paidAmount + 0.005 < amount) {
        return fail("The invoice payment totals are inconsistent. Refresh the records before reversing this payment.", 409);
      }

      entry.deleteOne();
      bill.paidAmount = Number(Math.max(0, paidAmount - amount).toFixed(2));
      bill.isPaid = bill.paidAmount + Number(bill.returnedAmount || 0) + Number(bill.creditApplied || 0)
        >= Number(bill.total || 0) - 0.005;
      await bill.save();

      return Response.json({
        success: true,
        message: "Payment reversed. The amount is due again on this invoice.",
        amount,
        data: bill,
      });
    }

    const client = await Client.findById(documentId);
    if (!client) return fail("Customer account not found.", 404);

    const entry = client.openingBalanceEntries.id(entryId);
    if (!entry) return fail("This payment has already been reversed or no longer exists.", 404);

    const amount = Number(entry.amount || 0);
    const openingBalancePaid = Number(client.openingBalancePaid || 0);
    if (!Number.isFinite(amount) || amount <= 0 || openingBalancePaid + 0.005 < amount) {
      return fail("The opening balance payment totals are inconsistent. Refresh the records before reversing this payment.", 409);
    }

    entry.deleteOne();
    client.openingBalancePaid = Number(Math.max(0, openingBalancePaid - amount).toFixed(2));
    await client.save();

    return Response.json({
      success: true,
      message: "Payment reversed. The opening balance is due again.",
      amount,
      data: client,
    });
  } catch (error) {
    console.error("Payment reversal failed:", error);
    return fail("Unable to reverse this payment. Refresh the records and try again.", 500);
  }
}
