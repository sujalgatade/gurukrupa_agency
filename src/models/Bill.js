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
      amount: { type: Number, required: true },
      boxQty: { type: Number, required: true },
      itemname: { type: String, required: true },
    },
  ],
  isPaid: { type: Boolean, default: false },
  client: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
  subtotal: { type: Number, required: true },
  tax: { type: Number, required: true },
  taxRate: { type: Number, required: true },
  total: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  profit: {
    type: Number,
    default: 0,
  },
});
const Bill = mongoose.models.Bill || mongoose.model("Bill", billSchema);
export default Bill;
