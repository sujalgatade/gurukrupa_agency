import dbConnect from "@/lib/db";
import Expense from "@/models/Expense";

const methods = ["Cash", "UPI", "Bank", "Cheque", "Other"];

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const query = {};
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(`${from}T00:00:00`);
      if (to) query.date.$lt = new Date(new Date(`${to}T00:00:00`).getTime() + 86400000);
    }
    const data = await Expense.find(query).sort({ date: -1, createdAt: -1 }).lean();
    return Response.json({ success: true, data });
  } catch (error) {
    console.error("Expenses load failed:", error);
    return Response.json({ success: false, message: "Unable to load expenses." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const input = await request.json();
    const date = new Date(input.date);
    const amount = Number(input.amount);
    const category = String(input.category || "").trim();
    const paymentMethod = input.paymentMethod || "Cash";
    if (Number.isNaN(date.getTime()) || !category || !Number.isFinite(amount) || amount <= 0 || !methods.includes(paymentMethod)) {
      return Response.json({ success: false, message: "Enter an expense date, category, amount above zero, and payment method." }, { status: 400 });
    }
    await dbConnect();
    const expense = await Expense.create({ date, category, amount, paymentMethod, note: String(input.note || "").trim() });
    return Response.json({ success: true, message: "Expense saved.", data: expense }, { status: 201 });
  } catch (error) {
    console.error("Expense save failed:", error);
    return Response.json({ success: false, message: "Unable to save the expense." }, { status: 500 });
  }
}
