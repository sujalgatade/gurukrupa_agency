"use client";

import axios from "axios";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import LoadingAnimation from "@/components/LoadingAnimation";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const currentDate = new Date();

const toDateKey = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const PaymentHistory = () => {
  const [bills, setBills] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [pendingReversal, setPendingReversal] = useState(null);
  const [reversingId, setReversingId] = useState("");
  const [actionError, setActionError] = useState("");

  const filterYears = Array.from({ length: 10 }, (_, index) => currentDate.getFullYear() - index);
  const yearsForFilter = selectedYear ? [Number(selectedYear)] : filterYears;
  const daysInFilterMonth = selectedMonth
    ? Math.max(...yearsForFilter.map((year) => new Date(year, Number(selectedMonth), 0).getDate()))
    : 31;
  const filterDays = Array.from({ length: daysInFilterMonth }, (_, index) => index + 1);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [billResponse, clientResponse] = await Promise.all([
        axios.get("/api/bill"),
        axios.get("/api/client?includeArchived=true"),
      ]);
      setBills(Array.isArray(billResponse.data?.data) ? billResponse.data.data : []);
      setClients(Array.isArray(clientResponse.data?.data) ? clientResponse.data.data : []);
    } catch (exception) {
      console.error("Unable to load payment history:", exception);
      setBills([]);
      setClients([]);
      setError("Unable to load payment history. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, retryCount]);

  const records = useMemo(() => {
    const invoicePayments = bills.flatMap((bill) =>
      (bill.paymentEntries || []).map((payment, index) => ({
        id: `invoice-${bill._id}-${payment._id || index}`,
        sourceType: "invoice",
        sourceId: bill._id,
        entryId: payment._id,
        date: payment.receivedAt,
        customer: bill.client?.clientname || "Unknown customer",
        accountEntry: "Invoice receipt",
        invoiceNumber: bill.invoiceNumber,
        method: payment.method || "—",
        reference: payment.reference || "—",
        amount: Number(payment.amount || 0),
      })),
    );

    const openingBalancePayments = clients.flatMap((client) =>
      (client.openingBalanceEntries || []).map((payment, index) => ({
        id: `opening-${client._id}-${payment._id || index}`,
        sourceType: "opening",
        sourceId: client._id,
        entryId: payment._id,
        date: payment.receivedAt,
        customer: client.clientname || "Unknown customer",
        accountEntry: "Opening balance receipt",
        invoiceNumber: "—",
        method: payment.method || "—",
        reference: payment.reference || "—",
        amount: Number(payment.amount || 0),
      })),
    );

    return [...invoicePayments, ...openingBalancePayments].sort(
      (first, second) => new Date(second.date || 0).getTime() - new Date(first.date || 0).getTime(),
    );
  }, [bills, clients]);

  const filteredRecords = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return records.filter((record) => {
      const date = toDateKey(record.date);
      if (!date) return false;
      const [recordYear, recordMonth, recordDay] = date.split("-").map(Number);
      if (selectedDay && recordDay !== Number(selectedDay)) return false;
      if (selectedMonth && recordMonth !== Number(selectedMonth)) return false;
      if (selectedYear && recordYear !== Number(selectedYear)) return false;

      return [record.customer, record.invoiceNumber, record.accountEntry, record.method, record.reference]
        .some((value) => String(value ?? "").toLowerCase().includes(term));
    });
  }, [records, selectedDay, selectedMonth, selectedYear, searchTerm]);

  const totalReceived = useMemo(
    () => filteredRecords.reduce((total, record) => total + record.amount, 0),
    [filteredRecords],
  );

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0);

  const formatDate = (value) => {
    if (!value || Number.isNaN(new Date(value).getTime())) return "—";
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const reversePayment = async () => {
    if (!pendingReversal?.sourceId || !pendingReversal?.entryId) return;

    setReversingId(pendingReversal.id);
    setActionError("");
    try {
      const params = new URLSearchParams({
        type: pendingReversal.sourceType,
        documentId: pendingReversal.sourceId,
        entryId: pendingReversal.entryId,
      });
      await axios.delete(`/api/payment-entry?${params.toString()}`);
      setPendingReversal(null);
      await fetchHistory();
    } catch (exception) {
      setActionError(exception.response?.data?.message || "Unable to reverse this payment.");
    } finally {
      setReversingId("");
    }
  };

  return (
    <main className="min-h-screen w-full bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">Gurukrupa Agency</p>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Payment History</h1>
            <p className="mt-2 text-sm text-slate-400">Customer invoice and opening balance receipts that have been recorded.</p>
          </div>
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-amber-400/50 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <LoadingAnimation size={30} label="Loading payment history" /> : "Refresh"}
          </button>
        </header>

        <nav className="billing-tabs mb-6" aria-label="Payments views">
          <Link href="/dashboard/payment">Payments</Link>
          <Link href="/dashboard/payment/history" aria-current="page">Payment History</Link>
        </nav>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Recorded payments</p>
            <p className="mt-2 text-3xl font-bold">{loading ? "—" : filteredRecords.length}</p>
            <p className="mt-1 text-xs text-slate-500">Matching receipt entries</p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Total received</p>
            <p className="mt-2 break-words text-2xl font-bold text-amber-400 sm:text-3xl">{loading ? "—" : formatCurrency(totalReceived)}</p>
            <p className="mt-1 text-xs text-slate-500">For the current filters</p>
          </article>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
            <div>
              <label htmlFor="payment-history-search" className="mb-2 block text-sm font-medium text-slate-300">Search records</label>
              <input
                id="payment-history-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Customer, invoice, method, or reference..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-400"
              />
            </div>
            <div>
              <label htmlFor="payment-history-day" className="mb-2 block text-sm font-medium text-slate-300">Date (Day Number)</label>
              <select id="payment-history-day" value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-amber-400">
                <option value="">All Days</option>
                {filterDays.map((day) => <option key={day} value={String(day)}>{day}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="payment-history-month" className="mb-2 block text-sm font-medium text-slate-300">Month</label>
              <select id="payment-history-month" value={selectedMonth} onChange={(event) => { setSelectedMonth(event.target.value); setSelectedDay(""); }} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-amber-400">
                <option value="">All Months</option>
                {MONTHS.map((month, index) => <option key={month} value={String(index + 1)}>{month}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="payment-history-year" className="mb-2 block text-sm font-medium text-slate-300">Year</label>
              <select id="payment-history-year" value={selectedYear} onChange={(event) => { setSelectedYear(event.target.value); setSelectedDay(""); }} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-amber-400">
                <option value="">All Years</option>
                {filterYears.map((year) => <option key={year} value={String(year)}>{year}</option>)}
              </select>
            </div>
            {(selectedDay || selectedMonth || selectedYear || searchTerm) && (
              <button
                type="button"
                onClick={() => { setSelectedDay(""); setSelectedMonth(""); setSelectedYear(""); setSearchTerm(""); }}
                className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-amber-400 hover:text-amber-300"
              >
                Clear filters
              </button>
            )}
          </div>
          <p className="mt-4 text-sm text-slate-400">
            Showing <span className="font-semibold text-white">{loading ? "…" : filteredRecords.length}</span> payment records.
          </p>
        </section>

        {error ? (
          <section role="alert" className="rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-12 text-center">
            <p className="font-semibold text-red-300">{error}</p>
            <button type="button" onClick={() => setRetryCount((count) => count + 1)} className="mt-4 rounded-lg border border-red-400/30 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-400/10">Try Again</button>
          </section>
        ) : loading ? (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-16 text-center">
            <div className="mb-4 flex justify-center"><LoadingAnimation size={72} label="Loading payment history" /></div>
            <p className="font-medium text-slate-200">Loading payment history...</p>
          </section>
        ) : filteredRecords.length ? (
          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1020px] text-left text-sm">
                <thead className="border-b border-slate-800 bg-slate-950/70 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Date</th>
                    <th className="px-5 py-4 font-semibold">Customer</th>
                    <th className="px-5 py-4 font-semibold">Payment For</th>
                    <th className="px-5 py-4 font-semibold">Invoice</th>
                    <th className="px-5 py-4 font-semibold">Method</th>
                    <th className="px-5 py-4 font-semibold">Reference</th>
                    <th className="px-5 py-4 text-right font-semibold">Amount</th>
                    <th className="px-5 py-4 text-center font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-300">{formatDate(record.date)}</td>
                      <td className="px-5 py-4 font-medium text-white">{record.customer}</td>
                      <td className="px-5 py-4 text-slate-300">{record.accountEntry}</td>
                      <td className="px-5 py-4">{record.invoiceNumber === "—" ? "—" : `#${record.invoiceNumber}`}</td>
                      <td className="px-5 py-4 text-slate-300">{record.method}</td>
                      <td className="px-5 py-4 text-slate-400">{record.reference}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-emerald-400">{formatCurrency(record.amount)}</td>
                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => { setActionError(""); setPendingReversal(record); }}
                          disabled={!record.entryId || Boolean(reversingId)}
                          className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Undo receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-slate-800 bg-slate-950/70">
                  <tr>
                    <td colSpan={6} className="px-5 py-4 text-right font-semibold text-slate-300">Total received</td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-lg font-bold text-emerald-400">{formatCurrency(totalReceived)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-5 py-16 text-center">
            <h2 className="font-semibold text-white">No payment records found</h2>
            <p className="mt-2 text-sm text-slate-400">Recorded customer receipts will appear here. Try changing the date filters or search.</p>
          </section>
        )}

        <footer className="mt-10 border-t border-slate-800 py-5 text-center text-xs text-slate-500">Gurukrupa Agency · Payment History</footer>

        {pendingReversal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="presentation">
            <section role="dialog" aria-modal="true" aria-labelledby="reverse-payment-title" className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
              <h2 id="reverse-payment-title" className="text-xl font-bold text-white">Undo this receipt?</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Reverse {formatCurrency(pendingReversal.amount)}{pendingReversal.invoiceNumber !== "—" ? ` from invoice #${pendingReversal.invoiceNumber}` : ` from ${pendingReversal.customer}`}? The amount will become due again.
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                This removes the receipt from payment history, the customer statement, dashboard cash received, Profit &amp; Loss cash received, and payment exports. The invoice profit stays unchanged because profit comes from the sale itself.
              </p>
              {actionError && <p role="alert" className="mt-4 text-sm text-red-300">{actionError}</p>}
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setPendingReversal(null)} disabled={Boolean(reversingId)} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50">Cancel</button>
                <button type="button" onClick={reversePayment} disabled={Boolean(reversingId)} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50">
                  {reversingId ? <span className="inline-flex items-center gap-2"><LoadingAnimation size={24} label="Reversing receipt" />Reversing…</span> : "Confirm reversal"}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
};

export default PaymentHistory;
