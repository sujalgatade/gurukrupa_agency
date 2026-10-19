import mongoose, { Schema } from "mongoose";

const billSchema = new Schema({
  invoiceNumber: {
    type: Number,
    required: true,
    unique: true,
    default: 0,
  },
  issueDate: { type: Date, required: true },
  items: [
    {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
      quantity: { type: Number, required: true },
      rate: { type: Number, required: true },
      originalRate: { type: Number, required: true },
      unitCost: { type: Number, default: 0, min: 0 },
      amount: { type: Number, required: true },
      boxQty: { type: Number, required: true },
      returnedBoxes: { type: Number, default: 0, min: 0 },
      itemname: { type: String, required: true },
    },
  ],
  isPaid: { type: Boolean, default: false },
  paidAmount: { type: Number, default: 0, min: 0 },
  paymentEntries: [{
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ["Cash", "UPI", "Bank", "Cheque", "Other"], default: "Cash" },
    reference: { type: String, default: "" },
    receivedAt: { type: Date, default: Date.now },
  }],
  client: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0, min: 0 },
  tax: { type: Number, required: true },
  taxRate: { type: Number, required: true },
  total: {
    type: Number,
    required: true,
  },
  returnedAmount: { type: Number, default: 0, min: 0 },
  creditApplied: { type: Number, default: 0, min: 0 },
  returns: [{
    date: { type: Date, default: Date.now },
    amount: { type: Number, required: true, min: 0 },
    profitReduction: { type: Number, default: 0 },
    reason: { type: String, required: true },
    items: [{ itemname: String, boxes: Number, amount: Number }],
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  profit: {
    type: Number,
    default: 0,
  },
  marginBeforeDiscount: { type: Number },
  changeHistory: [{
    reason: { type: String, required: true },
    editedAt: { type: Date, default: Date.now },
    before: {
      issueDate: Date,
      discount: Number,
      taxRate: Number,
      tax: Number,
      total: Number,
    },
    after: {
      issueDate: Date,
      discount: Number,
      taxRate: Number,
      tax: Number,
      total: Number,
    },
  }],
});
const Bill = mongoose.models.Bill || mongoose.model("Bill", billSchema);
export default Bill;
