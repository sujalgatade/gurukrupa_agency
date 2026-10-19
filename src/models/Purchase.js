import mongoose, { Schema } from "mongoose";

const purchaseItemSchema = new Schema({
  date: { type: Date, required: true },
  itemname: { type: String, required: true, trim: true },
  box: { type: Number, required: true, min: 0 },
  returnedBoxes: { type: Number, default: 0, min: 0 },
  itemperbox: { type: Number, required: true, min: 1 },
  rate: { type: Number, required: true, min: 0 },
  unitCost: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
}, { _id: false });

const purchaseSchema = new Schema({
  supplierName: { type: String, default: "", trim: true },
  supplierInvoiceNumber: { type: String, default: "", trim: true },
  date: { type: Date, required: true },
  items: { type: [purchaseItemSchema], required: true },
  subtotal: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, default: 0, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  returnedAmount: { type: Number, default: 0, min: 0 },
  supplierCreditApplied: { type: Number, default: 0, min: 0 },
  returns: [{
    date: { type: Date, default: Date.now },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true },
    items: [{ itemname: String, boxes: Number, amount: Number }],
  }],
  paidAmount: { type: Number, default: 0, min: 0 },
  paymentEntries: [{
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ["Cash", "UPI", "Bank", "Cheque", "Other"], default: "Cash" },
    reference: { type: String, default: "" },
    paidAt: { type: Date, default: Date.now },
  }],
  paymentMethod: { type: String, enum: ["Cash", "UPI", "Bank", "Cheque", "Other"], default: "Cash" },
}, { timestamps: true });

const Purchase = mongoose.models.Purchase || mongoose.model("Purchase", purchaseSchema);
export default Purchase;
