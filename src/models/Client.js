import mongoose, { Schema } from "mongoose";

const clientSchema = new Schema({
    clientname: {
        type: String,
        required: true,
    },
    address: { type: String, required: true },
    phone: { type: String, trim: true },
    gstNumber: { type: String },
    openingBalance: { type: Number, default: 0, min: 0 },
    openingBalancePaid: { type: Number, default: 0, min: 0 },
    openingBalanceEntries: [{
        amount: { type: Number, required: true, min: 0 },
        method: { type: String, enum: ["Cash", "UPI", "Bank", "Cheque", "Other"], default: "Cash" },
        reference: { type: String, default: "" },
        receivedAt: { type: Date, default: Date.now },
    }],
    creditBalance: { type: Number, default: 0, min: 0 },
    creditEntries: [{
        amount: { type: Number, required: true, min: 0 },
        direction: { type: String, enum: ["credit", "applied"], required: true },
        reference: { type: String, default: "" },
        reason: { type: String, default: "" },
        date: { type: Date, default: Date.now },
    }],
    creditLimit: { type: Number, default: 0, min: 0 },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});
const Client = mongoose.models.Client || mongoose.model("Client", clientSchema);
export default Client;
