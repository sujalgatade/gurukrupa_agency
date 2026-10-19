import mongoose, { Schema } from "mongoose";

const supplierSchema = new Schema({
  name: { type: String, required: true, trim: true },
  nameKey: { type: String, required: true, unique: true, lowercase: true, trim: true },
  creditBalance: { type: Number, default: 0, min: 0 },
  creditEntries: [{
    amount: { type: Number, required: true, min: 0 },
    direction: { type: String, enum: ["credit", "applied"], required: true },
    date: { type: Date, default: Date.now },
    reference: { type: String, default: "" },
    reason: { type: String, default: "" },
  }],
}, { timestamps: true });

const Supplier = mongoose.models.Supplier || mongoose.model("Supplier", supplierSchema);
export default Supplier;
