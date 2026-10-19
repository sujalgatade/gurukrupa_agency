"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import LoadingAnimation from "@/components/LoadingAnimation";

const today = new Date();
const isoDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const money = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateInRange = (value, from, to) => { const date = new Date(value); const key = isoDate(date); return !Number.isNaN(date.getTime()) && key >= from && key <= to; };
const gstFromInclusiveAmount = (amount, rate) => {
  const gstRate = Number(rate || 0);
  if (gstRate <= 0) return 0;
  return Number((Number(amount || 0) * gstRate / (100 + gstRate)).toFixed(2));
};

export default function ProfitLossPage() {
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(isoDate(firstOfMonth));
  const [to, setTo] = useState(isoDate(today));
  const [bills, setBills] = useState([]);
  const [clients, setClients] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ date: isoDate(today), category: "Transport", amount: "", paymentMethod: "Cash", note: "" });
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [billResponse, expenseResponse, clientResponse] = await Promise.all([fetch("/api/bill", { cache: "no-store" }), fetch("/api/expenses", { cache: "no-store" }), fetch("/api/client", { cache: "no-store" })]);
      const [billJson, expenseJson, clientJson] = await Promise.all([billResponse.json(), expenseResponse.json(), clientResponse.json()]);
      if (!billResponse.ok || !expenseResponse.ok || !clientResponse.ok) throw new Error(billJson.message || expenseJson.message || clientJson.message || "Could not load report data.");
      setBills(Array.isArray(billJson.data) ? billJson.data : []);
      setExpenses(Array.isArray(expenseJson.data) ? expenseJson.data : []);
      setClients(Array.isArray(clientJson.data) ? clientJson.data : []);
    } catch (exception) { setError(exception.message || "Could not load report data."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const periodBills = useMemo(() => bills.filter((bill) => dateInRange(bill.issueDate, from, to)), [bills, from, to]);
  const periodExpenses = useMemo(() => expenses.filter((expense) => dateInRange(expense.date, from, to)), [expenses, from, to]);
  const returnsInPeriod = bills.flatMap((bill) => (bill.returns || []).map((entry) => ({ ...entry, taxRate: bill.taxRate }))).filter((entry) => dateInRange(entry.date, from, to));
  const sales = periodBills.reduce((sum, bill) => sum + Number(bill.total || 0), 0) - returnsInPeriod.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const invoiceMargin = periodBills.reduce((sum, bill) => sum + Number(bill.profit || 0), 0);
  const billedGst = periodBills.reduce((sum, bill) => sum + Number(bill.tax || 0), 0);
  const returnMargin = returnsInPeriod.reduce((sum, entry) => sum + Number(entry.profitReduction || 0), 0);
  const returnedGst = returnsInPeriod.reduce((sum, entry) => sum + gstFromInclusiveAmount(entry.amount, entry.taxRate), 0);
  const grossProfit = Number((invoiceMargin + billedGst - returnMargin - returnedGst).toFixed(2));
  const expenseTotal = periodExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const receipts = bills.reduce((sum, bill) => {
    const entries = bill.paymentEntries || [];
    if (entries.length) return sum + entries.filter((entry) => dateInRange(entry.receivedAt, from, to)).reduce((total, entry) => total + Number(entry.amount || 0), 0);
    return sum + (bill.isPaid && !Number(bill.returnedAmount || 0) && !Number(bill.creditApplied || 0) && dateInRange(bill.issueDate, from, to) ? Number(bill.total || 0) : 0);
  }, 0) + clients.reduce((sum, client) => sum + (client.openingBalanceEntries || []).filter((entry) => dateInRange(entry.receivedAt, from, to)).reduce((total, entry) => total + Number(entry.amount || 0), 0), 0);
  const dailyExpenses = periodExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  const saveExpense = async (event) => {
    event.preventDefault(); setSaving(true); setNotice(""); setError("");
    try {
      const response = await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, amount: Number(form.amount) }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to save expense.");
      setNotice("Expense saved to the ledger."); setForm((current) => ({ ...current, amount: "", note: "" })); await refresh();
    } catch (exception) { setError(exception.message || "Unable to save expense."); }
    finally { setSaving(false); }
  };

  const cards = [
    ["Sales billed", sales], ["Profit incl. billed GST", grossProfit], ["Business expenses", expenseTotal], ["Net after recorded expenses", grossProfit - expenseTotal],
  ];

  return <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-[.18em] text-amber-400">Business reports</p><h1 className="mt-2 text-3xl font-bold">Profit &amp; Loss</h1><p className="mt-2 max-w-3xl text-sm text-slate-400">Invoice margin plus GST billed to clients, adjusted for sales returns. Expenses entered here are deducted from the result.</p></header>
    {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}{notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
    <section className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-2"><div><label htmlFor="report-from" className="mb-2 block text-sm text-slate-300">From</label><input id="report-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm" /></div><div><label htmlFor="report-to" className="mb-2 block text-sm text-slate-300">To</label><input id="report-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm" /></div></section>
    {loading && <div className="flex flex-col items-center justify-center gap-1 text-sm text-slate-400"><LoadingAnimation size={72} label="Loading profit and loss report" />Loading report…</div>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Profit and loss summary">{cards.map(([label, value]) => <article key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-5"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold">{loading ? "—" : money(value)}</p><p className="mt-2 text-xs text-slate-500">{periodBills.length} invoices · {periodExpenses.length} expenses</p></article>)}</section>
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,.8fr)]">
      <article className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900"><div className="border-b border-slate-800 px-5 py-4"><h2 className="font-semibold">Cash movement summary</h2><p className="mt-1 text-xs text-slate-400">Recorded customer receipts less recorded operating expenses for this period.</p></div><dl className="grid gap-4 p-5 sm:grid-cols-3"><div><dt className="text-xs text-slate-400">Cash received</dt><dd className="mt-2 text-lg font-bold">{loading ? "—" : money(receipts)}</dd></div><div><dt className="text-xs text-slate-400">Expenses paid</dt><dd className="mt-2 text-lg font-bold">{loading ? "—" : money(dailyExpenses)}</dd></div><div><dt className="text-xs text-slate-400">Net cash movement</dt><dd className="mt-2 text-lg font-bold">{loading ? "—" : money(receipts - dailyExpenses)}</dd></div></dl><div className="border-t border-slate-800 px-5 py-3"><a href="/api/export?type=sales" className="mr-4 text-sm font-semibold text-amber-300 underline">Export sales CSV</a><a href="/api/export?type=expenses" className="text-sm font-semibold text-amber-300 underline">Export expenses CSV</a></div></article>
      <article className="rounded-xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-semibold">Record an expense</h2><p className="mt-1 text-xs text-slate-400">Transport, wages, rent and other operating costs.</p><form onSubmit={saveExpense} className="mt-4 space-y-3"><div><label htmlFor="expense-date" className="mb-1.5 block text-xs text-slate-300">Date</label><input id="expense-date" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm" /></div><div><label htmlFor="expense-category" className="mb-1.5 block text-xs text-slate-300">Category</label><input id="expense-category" required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm" /></div><div><label htmlFor="expense-amount" className="mb-1.5 block text-xs text-slate-300">Amount (₹)</label><input id="expense-amount" type="number" min="0.01" step="0.01" required value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm" /></div><div className="grid grid-cols-2 gap-3"><div><label htmlFor="expense-method" className="mb-1.5 block text-xs text-slate-300">Paid by</label><select id="expense-method" value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm"><option>Cash</option><option>UPI</option><option>Bank</option><option>Cheque</option><option>Other</option></select></div><div><label htmlFor="expense-note" className="mb-1.5 block text-xs text-slate-300">Note</label><input id="expense-note" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm" /></div></div><button disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">{saving ? <><LoadingAnimation size={28} label="Saving expense" />Saving…</> : "Save expense"}</button></form></article>
    </section>
    <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900"><div className="border-b border-slate-800 px-5 py-4"><h2 className="font-semibold">Expenses in selected period</h2></div>{periodExpenses.length ? <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left"><thead><tr><th className="px-4 py-3">DATE</th><th className="px-4 py-3">CATEGORY</th><th className="px-4 py-3">NOTE</th><th className="px-4 py-3">METHOD</th><th className="px-4 py-3">AMOUNT</th></tr></thead><tbody>{periodExpenses.map((expense) => <tr key={expense._id}><td className="px-4 py-3">{new Date(expense.date).toLocaleDateString("en-IN")}</td><td className="px-4 py-3">{expense.category}</td><td className="px-4 py-3">{expense.note || "—"}</td><td className="px-4 py-3">{expense.paymentMethod}</td><td className="px-4 py-3 font-semibold">{money(expense.amount)}</td></tr>)}</tbody></table></div> : <p className="px-5 py-8 text-center text-sm text-slate-400">No expenses recorded for this period.</p>}</section>
    <p className="text-xs leading-5 text-slate-500">This operating estimate uses saved invoice margins, GST on billed sales, GST adjusted for recorded returns, and expenses entered here.</p>
  </div></main>;
}
