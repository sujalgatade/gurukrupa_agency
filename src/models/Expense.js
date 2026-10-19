import mongoose, { Schema } from "mongoose";

const expenseSchema = new Schema({
  date: { type: Date, required: true },
  category: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  paymentMethod: { type: String, enum: ["Cash", "UPI", "Bank", "Cheque", "Other"], default: "Cash" },
  note: { type: String, default: "", trim: true },
}, { timestamps: true });

const Expense = mongoose.models.Expense || mongoose.model("Expense", expenseSchema);
export default Expense;
