import dbConnect from "@/lib/db";
import Client from "@/models/Client";
import mongoose from "mongoose";

const methods = ["Cash", "UPI", "Bank", "Cheque", "Other"];

export async function POST(request) {
  try {
    const input = await request.json();
    const amount = Number(input.amount);
    const method = input.method || "Cash";
    if (!mongoose.isValidObjectId(input.clientId)) {
      return Response.json({ success: false, message: "Choose a valid customer." }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0 || !methods.includes(method)) {
      return Response.json({ success: false, message: "Enter a payment above zero and choose a valid method." }, { status: 400 });
    }

    await dbConnect();
    const client = await Client.findById(input.clientId);
    if (!client) return Response.json({ success: false, message: "Customer not found." }, { status: 404 });
    const due = Math.max(0, Number(client.openingBalance || 0) - Number(client.openingBalancePaid || 0));
    if (amount > due + 0.005) {
      return Response.json({ success: false, message: `Payment exceeds opening balance due of ₹${due.toFixed(2)}.` }, { status: 400 });
    }

    client.openingBalancePaid = Number((Number(client.openingBalancePaid || 0) + amount).toFixed(2));
    client.openingBalanceEntries.push({ amount, method, reference: String(input.reference || "").trim(), receivedAt: new Date() });
    await client.save();
    return Response.json({ success: true, message: "Opening balance payment recorded.", data: client });
  } catch (error) {
    console.error("Opening balance payment failed:", error);
    return Response.json({ success: false, message: "Unable to record this customer payment." }, { status: 500 });
  }
}
