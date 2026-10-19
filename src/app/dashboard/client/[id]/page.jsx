"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";
import { CheckCircle2 } from "lucide-react";
import LoadingAnimation from "@/components/LoadingAnimation";

const money = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateText = (date) => date ? new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function ClientStatementPage() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let active = true;
    Promise.all([axios.get(`/api/client?id=${id}`), axios.get(`/api/bill?client=${id}`)])
      .then(([clientResponse, billsResponse]) => {
        if (!active) return;
        setClient(clientResponse.data?.data || null);
        setBills(Array.isArray(billsResponse.data?.data) ? billsResponse.data.data : []);
      })
      .catch(() => { if (active) setError("Could not load this customer account."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const billedTotal = bills.reduce((sum, bill) => sum + Number(bill.total || 0), 0);
  const paidTotal = bills.reduce((sum, bill) => sum + (bill.isPaid && !Number(bill.returnedAmount || 0) && !Number(bill.creditApplied || 0) && !(bill.paymentEntries || []).length && !Number(bill.paidAmount || 0) ? Number(bill.total || 0) : Number(bill.paidAmount || 0)), 0);
  const returnedTotal = bills.reduce((sum, bill) => sum + Number(bill.returnedAmount || 0), 0);
  const creditAppliedTotal = bills.reduce((sum, bill) => sum + Number(bill.creditApplied || 0), 0);
  const openingBalance = Number(client?.openingBalance || 0);
  const openingPaid = Number(client?.openingBalancePaid || 0);
  const openingDue = Math.max(0, openingBalance - openingPaid);
  const dueTotal = Math.max(0, billedTotal - paidTotal - returnedTotal - creditAppliedTotal) + openingDue;

  return (
    <main className="customer-statement min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-amber-400">Gurukrupa Agency · Customer account</p><h1 className="mt-2 text-2xl font-bold text-white">{loading ? "Loading account…" : client?.clientname || "Customer statement"}</h1><p className="mt-1 text-sm text-slate-400">Invoices, receipts and outstanding balance</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => window.print()} className="rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-300">Print statement</button><Link href="/dashboard/client" className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800">All customers</Link></div>
        </header>
        {error && <p role="alert" className="rounded-lg border border-rose-900/70 bg-rose-950/50 p-3 text-sm text-rose-300">{error}</p>}
        {client && <section className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-3">
          <div><p className="text-xs text-slate-400">Address</p><p className="mt-1 text-sm font-medium text-slate-100">{client.address || "—"}</p></div>
          <div><p className="text-xs text-slate-400">Phone</p><p className="mt-1 text-sm font-medium text-slate-100">{client.phone || "—"}</p></div>
          <div><p className="text-xs text-slate-400">GSTIN</p><p className="mt-1 text-sm font-medium text-slate-100">{client.gstNumber || "—"}</p></div>
        </section>}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Customer account totals">
          {[
            {
              label: "Invoice total",
              value: billedTotal,
              cardClass: "border-slate-800 bg-slate-900",
              labelClass: "text-slate-400",
              valueClass: "text-slate-100",
            },
            {
              label: "Payments received",
              value: paidTotal + openingPaid,
              cardClass: "border-emerald-900/70 bg-emerald-950/40",
              labelClass: "text-emerald-300",
              valueClass: "text-emerald-200",
            },
            {
              label: "Total balance due",
              value: dueTotal,
              cardClass: "border-rose-900/70 bg-rose-950/40",
              labelClass: "text-rose-300",
              valueClass: "text-rose-200",
            },
          ].map((item) => (
            <article
              key={item.label}
              className={`rounded-xl border p-5 ${item.cardClass}`}
            >
              <p className={`text-sm ${item.labelClass}`}>{item.label}</p>
              <p className={`mt-2 text-2xl font-bold ${item.valueClass}`}>
                {loading ? "—" : money(item.value)}
              </p>
            </article>
          ))}
        </section>
        {client?.creditEntries?.length > 0 && <section className="rounded-xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-semibold text-white">Customer credit history</h2><ul className="mt-3 grid gap-2 text-sm text-slate-300">{[...client.creditEntries].reverse().map((entry, index) => <li key={`${entry._id || entry.date}-${index}`}>{dateText(entry.date)} · {entry.direction === "applied" ? "Applied to invoice" : "Created from return"} · {money(entry.amount)} · {entry.reference || entry.reason}</li>)}</ul></section>}
        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-5 py-4"><h2 className="font-semibold text-white">Statement</h2><p className="mt-1 text-sm text-slate-400">Each invoice includes its recorded receipts and remaining balance.</p></div>
          {loading ? <div className="flex flex-col items-center justify-center p-8 text-center text-sm text-slate-400"><LoadingAnimation size={72} label="Loading customer statement" /><span className="mt-2">Loading statement…</span></div> : <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left"><thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-4 py-3">INVOICE</th><th className="px-4 py-3">DATE</th><th className="px-4 py-3">BILLED</th><th className="px-4 py-3">RETURNED</th><th className="px-4 py-3">RECEIVED</th><th className="px-4 py-3">CREDIT APPLIED</th><th className="px-4 py-3">BALANCE</th><th className="px-4 py-3">ACTIVITY</th><th className="px-4 py-3">BILL</th></tr></thead><tbody className="divide-y divide-slate-800 text-sm text-slate-200">
            {openingBalance > 0 && <tr><td className="px-4 py-3 font-semibold">Opening balance</td><td className="px-4 py-3">—</td><td className="px-4 py-3">{money(openingBalance)}</td><td className="px-4 py-3">—</td><td className="px-4 py-3">{money(openingPaid)}</td><td className="px-4 py-3">—</td><td className="px-4 py-3 font-semibold">{openingDue === 0 ? <span className="inline-flex items-center gap-1.5 text-emerald-300"><CheckCircle2 size={17} aria-hidden="true" />Paid</span> : money(openingDue)}</td><td className="px-4 py-3">{(client?.openingBalanceEntries || []).map((payment, index) => <span className="mr-2 inline-block" key={`opening-${index}`}>{money(payment.amount)} · {payment.method} · {dateText(payment.receivedAt)}</span>)}</td><td className="px-4 py-3">—</td></tr>}
            {bills.map((bill) => { const paid = bill.isPaid && !Number(bill.returnedAmount || 0) && !Number(bill.creditApplied || 0) && !(bill.paymentEntries || []).length && !Number(bill.paidAmount || 0) ? Number(bill.total || 0) : Number(bill.paidAmount || 0); const returned = Number(bill.returnedAmount || 0); const credit = Number(bill.creditApplied || 0); const due = Math.max(0, Number(bill.total || 0) - paid - returned - credit); return <tr key={bill._id}><td className="px-4 py-3 font-semibold">#{bill.invoiceNumber}</td><td className="px-4 py-3">{dateText(bill.issueDate)}</td><td className="px-4 py-3">{money(bill.total)}</td><td className="px-4 py-3">{money(returned)}</td><td className="px-4 py-3">{money(paid)}</td><td className="px-4 py-3">{money(credit)}</td><td className="px-4 py-3 font-semibold">{bill.isPaid ? <span className="inline-flex items-center gap-1.5 text-emerald-300"><CheckCircle2 size={17} aria-hidden="true" />Paid</span> : money(due)}</td><td className="px-4 py-3">{(bill.paymentEntries || []).map((payment, index) => <span className="mr-2 inline-block" key={`${bill._id}-${index}`}>{money(payment.amount)} · {payment.method}</span>)}{(bill.returns || []).map((entry, index) => <span className="mr-2 inline-block" key={`return-${index}`}>Return · {money(entry.amount)} · {dateText(entry.date)}</span>)}</td><td className="px-4 py-3"><Link className="text-amber-300 underline" href={`/dashboard/billout?id=${bill._id}`}>Open bill</Link></td></tr>; })}
          </tbody></table>{!bills.length && !openingBalance && <p className="p-8 text-center text-sm text-slate-400">No invoices or opening balance recorded for this customer.</p>}</div>}
        </section>
      </div>
    </main>
  );
}
