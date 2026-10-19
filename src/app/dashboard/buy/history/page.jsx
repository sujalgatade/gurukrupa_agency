"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  History,
  Printer,
} from "lucide-react";
import LoadingAnimation from "@/components/LoadingAnimation";

const money = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const toDateInputValue = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const todayDateInputValue = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function PurchaseHistoryPage() {
  const [purchases, setPurchases] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [expandedPurchaseId, setExpandedPurchaseId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    axios
      .get("/api/buy-bill", { headers: { "Cache-Control": "no-cache" } })
      .then(({ data }) => {
        if (active) setPurchases(Array.isArray(data?.data) ? data.data : []);
      })
      .catch(() => {
        if (active) setError("Purchase history could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const sortedPurchases = useMemo(
    () =>
      [...purchases].sort(
        (first, second) =>
          new Date(second.createdAt || second.date).getTime() -
          new Date(first.createdAt || first.date).getTime(),
      ),
    [purchases],
  );

  const visiblePurchases = useMemo(
    () =>
      selectedDate
        ? sortedPurchases.filter(
            (purchase) =>
              toDateInputValue(purchase.date || purchase.createdAt) === selectedDate,
          )
        : sortedPurchases.slice(0, 10),
    [sortedPurchases, selectedDate],
  );

  const totalValue = visiblePurchases.reduce(
    (sum, purchase) => sum + Number(purchase.total || 0),
    0,
  );

  const togglePurchase = (purchaseId) => {
    setExpandedPurchaseId((currentId) =>
      currentId === purchaseId ? null : purchaseId,
    );
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 14mm;
          }

          body {
            background: #fff !important;
          }

          body * {
            visibility: hidden !important;
          }

          .purchase-print-area,
          .purchase-print-area * {
            visibility: visible !important;
          }

          .purchase-print-area {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            color: #111827 !important;
            background: #fff !important;
            box-shadow: none !important;
          }

          .purchase-print-area * {
            color: #111827 !important;
            background-color: #fff !important;
            border-color: #d1d5db !important;
          }

          .purchase-no-print {
            display: none !important;
          }

          .purchase-print-table {
            width: 100% !important;
            min-width: 0 !important;
            border-collapse: collapse !important;
          }

          .purchase-print-table th,
          .purchase-print-table td {
            padding: 8px !important;
          }

          .purchase-print-area .overflow-x-auto {
            overflow: visible !important;
          }
        }
      `}</style>

      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">
              Purchases
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
              Purchase History
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Pick a date to find its purchases. Open a card to view or print
              the item-wise record.
            </p>
          </div>
          <Link
            href="/dashboard/buy"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-amber-400/50 hover:text-amber-300"
          >
            <ArrowLeft size={16} />
            Back to Purchases
          </Link>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <label className="block w-full sm:max-w-md">
              <span className="mb-2 block text-sm font-semibold text-slate-200">
                Search purchases by date
              </span>
              <span className="relative block">
                <CalendarDays
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-amber-300"
                />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => {
                    setSelectedDate(event.target.value);
                    setExpandedPurchaseId(null);
                  }}
                  aria-label="Filter purchases by date"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-3 text-base text-white outline-none [color-scheme:dark] focus:border-amber-400"
                />
              </span>
            </label>
            <button
              type="button"
              onClick={() => {
                setSelectedDate(todayDateInputValue());
                setExpandedPurchaseId(null);
              }}
              className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-300 transition hover:bg-amber-400/20"
            >
              Today
            </button>
          </div>
        </section>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-5 py-16 text-sm text-slate-400">
            <LoadingAnimation size={72} label="Loading purchase history" />
            Loading purchase records…
          </div>
        ) : error ? (
          <p
            role="alert"
            className="rounded-2xl border border-red-900/60 bg-red-950/30 px-5 py-12 text-center text-sm text-red-300"
          >
            {error}
          </p>
        ) : (
          <section className="space-y-4" aria-live="polite">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {selectedDate ? `Purchases for ${formatDate(selectedDate)}` : "Latest 10 Purchases"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {visiblePurchases.length} purchase
                  {visiblePurchases.length === 1 ? "" : "s"} · Total value: {money(totalValue)}
                </p>
              </div>
            </div>

            {visiblePurchases.length ? (
              <div className="space-y-3">
                {visiblePurchases.map((purchase) => {
                  const purchaseId = String(purchase._id);
                  const isExpanded = expandedPurchaseId === purchaseId;
                  const taxRate = Number(purchase.taxRate || 0);
                  const due = Math.max(
                    0,
                    Number(purchase.total || 0) -
                      Number(purchase.paidAmount || 0) -
                      Number(purchase.returnedAmount || 0) -
                      Number(purchase.supplierCreditApplied || 0),
                  );

                  return (
                    <article
                      key={purchaseId}
                      className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"
                    >
                      <button
                        type="button"
                        onClick={() => togglePurchase(purchaseId)}
                        aria-expanded={isExpanded}
                        className="flex w-full flex-wrap items-center justify-between gap-4 p-4 text-left transition hover:bg-slate-800/60 sm:p-5"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
                            <History size={20} />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-white">
                              {purchase.supplierName || "Supplier not recorded"}
                            </span>
                            <span className="mt-1 block text-sm text-slate-400">
                              Invoice: {purchase.supplierInvoiceNumber || "—"} · {formatDate(purchase.date)}
                            </span>
                          </span>
                        </span>
                        <span className="flex items-center gap-4 sm:gap-6">
                          <span className="text-right">
                            <span className="block text-xs text-slate-400">
                              Invoice total · GST included
                            </span>
                            <span className="mt-1 block text-lg font-bold text-emerald-300">
                              {money(purchase.total)}
                            </span>
                          </span>
                          <ChevronDown
                            size={20}
                            className={`shrink-0 text-slate-400 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-800 p-4 sm:p-5">
                          <div className="purchase-print-area rounded-xl border border-slate-700 bg-slate-950 p-4 sm:p-5">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                                  Gurukrupa Agency · Purchase Record
                                </p>
                                <h3 className="mt-2 text-xl font-bold text-white">
                                  {purchase.supplierName || "Supplier not recorded"}
                                </h3>
                                <p className="mt-1 text-sm text-slate-300">
                                  Invoice: {purchase.supplierInvoiceNumber || "—"}
                                </p>
                                <p className="mt-1 text-sm text-slate-300">
                                  Purchase date: {formatDate(purchase.date)}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => window.print()}
                                className="purchase-no-print inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
                              >
                                <Printer size={17} />
                                Print record
                              </button>
                            </div>

                            <div className="mt-5 overflow-x-auto rounded-xl border border-slate-700">
                              <table className="purchase-print-table w-full min-w-[760px] text-left">
                                <thead className="bg-slate-900">
                                  <tr className="text-xs uppercase tracking-wide text-slate-300">
                                    <th className="border-b border-slate-700 px-3 py-3 font-semibold">
                                      Date
                                    </th>
                                    <th className="border-b border-slate-700 px-3 py-3 font-semibold">
                                      Product
                                    </th>
                                    <th className="border-b border-slate-700 px-3 py-3 font-semibold">
                                      Quantity
                                    </th>
                                    <th className="border-b border-slate-700 px-3 py-3 font-semibold">
                                      Rate / box · incl. GST
                                    </th>
                                    <th className="border-b border-slate-700 px-3 py-3 text-right font-semibold">
                                      Line value
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(purchase.items || []).map((item, index) => {
                                    const boxes = Number(item.box || 0);
                                    const piecesPerBox = Number(item.itemperbox || 0);
                                    const amount = Number(item.amount || 0);
                                    const lineTax = Number(
                                      (amount * taxRate / 100).toFixed(2),
                                    );
                                    const rateWithGst =
                                      Number(item.rate || 0) * (1 + taxRate / 100);

                                    return (
                                      <tr
                                        key={`${item.itemname}-${index}`}
                                        className="text-sm text-slate-100"
                                      >
                                        <td className="whitespace-nowrap border-b border-slate-800 px-3 py-3">
                                          {formatDate(item.date || purchase.date)}
                                        </td>
                                        <td className="border-b border-slate-800 px-3 py-3 font-medium">
                                          {item.itemname}
                                        </td>
                                        <td className="whitespace-nowrap border-b border-slate-800 px-3 py-3">
                                          {boxes} boxes · {boxes * piecesPerBox} pieces
                                        </td>
                                        <td className="whitespace-nowrap border-b border-slate-800 px-3 py-3">
                                          {money(rateWithGst)}
                                        </td>
                                        <td className="whitespace-nowrap border-b border-slate-800 px-3 py-3 text-right font-semibold">
                                          {money(amount + lineTax)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            <div className="mt-4 flex flex-wrap justify-end gap-x-6 gap-y-2 text-sm text-slate-300">
                              <span>
                                Subtotal: <strong className="text-white">{money(purchase.subtotal)}</strong>
                              </span>
                              <span>
                                GST: <strong className="text-white">{money(purchase.tax)}</strong>
                              </span>
                              <span>
                                Paid: <strong className="text-white">{money(purchase.paidAmount)}</strong>
                              </span>
                              {Number(purchase.returnedAmount || 0) > 0 && (
                                <span>
                                  Returned: <strong className="text-amber-300">{money(purchase.returnedAmount)}</strong>
                                </span>
                              )}
                              <span>
                                Balance due: <strong className={due > 0 ? "text-rose-300" : "text-emerald-300"}>{money(due)}</strong>
                              </span>
                              <span className="w-full text-right text-base font-bold text-emerald-300">
                                Invoice total: {money(purchase.total)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-5 py-12 text-center">
                <p className="font-semibold text-white">
                  {selectedDate
                    ? `No purchases found for ${formatDate(selectedDate)}`
                    : "No purchases have been recorded yet."}
                </p>
                {selectedDate && (
                  <p className="mt-1 text-sm text-slate-400">
                    Choose another date to view its purchase records.
                  </p>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
