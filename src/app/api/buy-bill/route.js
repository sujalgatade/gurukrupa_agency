import dbConnect from "@/lib/db";
import Item from "@/models/Item";
import Purchase from "@/models/Purchase";
import Supplier from "@/models/Supplier";

const errorResponse = (message, status = 400) =>
  Response.json({ success: false, message }, { status });

export async function GET() {
  try {
    await dbConnect();
    const purchases = await Purchase.find({}).sort({ date: -1, createdAt: -1 }).lean();
    const suppliers = await Supplier.find({}).select("creditBalance").lean();
    const supplierCreditBalance = suppliers.reduce((sum, supplier) => sum + Number(supplier.creditBalance || 0), 0);
    return Response.json({ success: true, data: purchases, supplierCreditBalance });
  } catch (error) {
    console.error("Unable to load purchases:", error);
    return errorResponse("Unable to load purchases. Check the database connection.", 500);
  }
}

export async function POST(request) {
  let createdStockIds = [];
  let createdPurchaseId = null;
  try {
    const input = await request.json();
    const lines = Array.isArray(input.items) ? input.items : [];
    if (!lines.length) return errorResponse("Add at least one purchase item.");

    const date = new Date(input.date || new Date());
    const supplierName = String(input.supplierName || "").trim();
    const taxRate = 5;
    const paidAmount = Number(input.paidAmount || 0);
    const paymentMethod = input.paymentMethod || "Cash";
    if (Number.isNaN(date.getTime())) return errorResponse("Enter a valid purchase date.");
    if (!supplierName) return errorResponse("Supplier name is required.");
    if (!Number.isFinite(paidAmount) || paidAmount < 0) return errorResponse("Paid amount cannot be negative.");

    const items = lines.map((line) => {
      const itemname = String(line.itemname || "").trim();
      const itemDate = new Date(line.date || date);
      const box = Number(line.box);
      const itemperbox = Number(line.itemperbox);
      const rate = Number(line.rate);
      if (!itemname || Number.isNaN(itemDate.getTime()) || !Number.isInteger(box) || box < 1 || !Number.isInteger(itemperbox) || itemperbox < 1 || !Number.isFinite(rate) || rate < 0) {
        throw new Error("Each item needs a name, positive box and piece quantities, and a valid box rate.");
      }
      const amount = Number((box * rate).toFixed(2));
      const rateWithGst = Number((rate * (1 + taxRate / 100)).toFixed(2));
      return { date: itemDate, itemname, box, itemperbox, rate, unitCost: Number((rateWithGst / itemperbox).toFixed(4)), amount };
    });

    const subtotal = Number(items.reduce((sum, item) => sum + item.amount, 0).toFixed(2));
    const tax = Number(items.reduce((sum, item) => sum + Number((item.amount * taxRate / 100).toFixed(2)), 0).toFixed(2));
    const total = Number((subtotal + tax).toFixed(2));
    if (paidAmount > total) return errorResponse("Paid amount cannot be greater than the purchase total.");
    if (!paymentMethod || !["Cash", "UPI", "Bank", "Cheque", "Other"].includes(paymentMethod)) return errorResponse("Choose a valid payment method.");

    await dbConnect();
    const nameKey = supplierName.toLowerCase();
    const supplier = await Supplier.findOneAndUpdate(
      { nameKey },
      { $setOnInsert: { name: supplierName, nameKey } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    const creditApplied = Number(Math.min(Number(supplier.creditBalance || 0), total).toFixed(2));
    if (paidAmount + creditApplied > total + 0.005) return errorResponse(`Payment exceeds the purchase balance after ₹${creditApplied.toFixed(2)} supplier credit is applied.`);
    const stockRows = await Item.insertMany(items.map((item, purchaseItemIndex) => ({
      itemname: item.itemname,
      box: item.box,
      itemperbox: item.itemperbox,
      originalrate: item.unitCost,
      date: item.date,
      purchaseRatePerBox: Number((item.rate * (1 + taxRate / 100)).toFixed(2)),
      purchaseItemIndex,
    })));
    createdStockIds = stockRows.map((row) => row._id);
    const [purchase] = await Purchase.create([{
      supplierName,
      supplierInvoiceNumber: String(input.supplierInvoiceNumber || "").trim(),
      date,
      items,
      subtotal,
      taxRate,
      tax,
      total,
      supplierCreditApplied: creditApplied,
      paidAmount,
      paymentMethod,
      paymentEntries: paidAmount > 0 ? [{ amount: paidAmount, method: paymentMethod, paidAt: new Date(), reference: "Initial payment" }] : [],
    }]);
    createdPurchaseId = purchase._id;
    await Item.updateMany({ _id: { $in: createdStockIds } }, { $set: { purchaseId: purchase._id } });
    if (creditApplied > 0) {
      const creditUpdate = await Supplier.updateOne(
        { _id: supplier._id, creditBalance: Number(supplier.creditBalance || 0) },
        { $inc: { creditBalance: -creditApplied }, $push: { creditEntries: { amount: creditApplied, direction: "applied", reference: `Supplier invoice ${purchase.supplierInvoiceNumber || purchase._id}`, reason: "Supplier credit applied to purchase", date: new Date() } } },
      );
      if (creditUpdate.matchedCount !== 1) throw new Error("Supplier credit changed while this purchase was being saved. Refresh and try again.");
    }

    return Response.json({ success: true, message: "Purchase saved and stock updated.", data: purchase }, { status: 201 });
  } catch (error) {
    if (createdStockIds.length) {
      try { await Item.deleteMany({ _id: { $in: createdStockIds } }); } catch (rollbackError) { console.error("Purchase stock rollback failed:", rollbackError); }
    }
    if (createdPurchaseId) {
      try { await Purchase.deleteOne({ _id: createdPurchaseId }); } catch (rollbackError) { console.error("Purchase record rollback failed:", rollbackError); }
    }
    const status = error.message?.startsWith("Each item") ? 400 : 500;
    console.error("Purchase save failed:", error);
    return errorResponse(error.message || "Unable to save the purchase.", status);
  }
}

export async function PUT(request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return errorResponse("Purchase ID is required.");
  try {
    const input = await request.json();
    const amount = Number(input.amount);
    const method = input.method || "Cash";
    await dbConnect();
    const purchase = await Purchase.findById(id);
    if (!purchase) return errorResponse("Purchase not found.", 404);
    const balance = Math.max(0, Number(purchase.total || 0) - Number(purchase.paidAmount || 0) - Number(purchase.returnedAmount || 0) - Number(purchase.supplierCreditApplied || 0));
    if (!Number.isFinite(amount) || amount <= 0 || amount > balance + 0.005) return errorResponse(`Enter a payment above zero and no greater than ₹${balance.toFixed(2)}.`);
    if (!["Cash", "UPI", "Bank", "Cheque", "Other"].includes(method)) return errorResponse("Choose a valid payment method.");
    purchase.paidAmount = Number((Number(purchase.paidAmount || 0) + amount).toFixed(2));
    purchase.paymentEntries.push({ amount, method, paidAt: new Date(), reference: String(input.reference || "").trim() });
    await purchase.save();
    return Response.json({ success: true, message: "Supplier payment recorded.", data: purchase });
  } catch (error) {
    console.error("Supplier payment failed:", error);
    return errorResponse("Unable to record supplier payment.", 500);
  }
}
