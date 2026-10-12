
"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";

const Payment = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchBills = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await axios.get("/api/bill?paymentStatus=unpaid");
      setBills(res.data.data || []);
    } catch (e) {
      console.error("Error fetching unpaid bills:", e);
      setBills([]);
      setError("Unable to load unpaid bills. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const handlePaid = async (billId) => {
    const confirmed = window.confirm(
      "Are you sure you want to mark this invoice as paid?"
    );

    if (!confirmed) return;

    setProcessingId(billId);
    setError("");

    try {
      await axios.put(`/api/bill?id=${billId}`);

      // Remove the invoice from the unpaid list after successful update.
      setBills((prevBills) =>
        prevBills.filter((bill) => bill._id !== billId)
      );
    } catch (e) {
      console.error("Error updating payment:", e);
      setError("Unable to update payment status. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredBills = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return bills.filter((bill) => {
      const invoiceNumber = String(bill.invoiceNumber ?? "").toLowerCase();
      const clientName = String(
        bill.client?.clientname ?? ""
      ).toLowerCase();
      const address = String(bill.client?.address ?? "").toLowerCase();

      return (
        invoiceNumber.includes(term) ||
        clientName.includes(term) ||
        address.includes(term)
      );
    });
  }, [bills, searchTerm]);

  const totalAmount = useMemo(
    () =>
      bills.reduce((sum, bill) => sum + (Number(bill.total) || 0), 0),
    [bills]
  );

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0);

  const formatDate = (date) => {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return "—";

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          <a
            href="/dashboard"
            className="mb-6 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-amber-400/50 hover:bg-slate-800 hover:text-amber-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m15 18-6-6 6-6"
              />
            </svg>
            Back to Dashboard
          </a>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">
                  Gurukrupa Agency
                </p>
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Payment Management
              </h1>

              <p className="mt-2 text-sm text-slate-400">
                Track outstanding invoices and update payment status.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchBills}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-amber-400/50 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20 7v5h-5M4 17v-5h5"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5.5 9a7 7 0 0 1 11.8-2L20 12M4 12l2.7 5a7 7 0 0 0 11.8-2"
                />
              </svg>
              Refresh
            </button>
          </div>
        </header>

        {/* Summary Cards */}
        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400">Unpaid Invoices</p>
                <p className="mt-2 text-3xl font-bold">
                  {loading ? "—" : bills.length}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Invoices awaiting payment
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 3.75h7.5L19 8.25v12H7a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14 4v5h5M9 13h6M9 16.5h3"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400">Outstanding Amount</p>
                <p className="mt-2 break-words text-2xl font-bold text-amber-400 sm:text-3xl">
                  {loading ? "—" : formatCurrency(totalAmount)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Total value of unpaid invoices
                </p>
              </div>

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-400/10 text-red-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v18m5-14H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
                  />
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* Search */}
        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
          <label
            htmlFor="payment-search"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Search unpaid invoices
          </label>

          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
            >
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path strokeLinecap="round" d="m15.5 15.5 5 5" />
            </svg>

            <input
              id="payment-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by invoice, client, or address..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="text-slate-400">
              Showing{" "}
              <span className="font-semibold text-white">
                {loading ? "…" : filteredBills.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-white">{bills.length}</span>{" "}
              unpaid invoices
            </p>

            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="font-medium text-amber-400 transition hover:text-amber-300"
              >
                Clear search
              </button>
            )}
          </div>
        </section>

        {/* Error Message */}
        {error && (
          <div
            role="alert"
            className="mb-5 flex flex-col gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm text-red-300">{error}</p>
            <button
              type="button"
              onClick={fetchBills}
              disabled={loading}
              className="self-start rounded-lg border border-red-400/30 px-3 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-400/10 disabled:opacity-50 sm:self-auto"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Desktop Table */}
        <section className="hidden overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 md:block">
          <div className="flex flex-col gap-1 border-b border-slate-800 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">Outstanding Invoices</h2>
              <p className="mt-1 text-sm text-slate-400">
                Review invoices and mark payments received.
              </p>
            </div>

            <span className="w-fit rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
              {bills.length} Pending
            </span>
          </div>

          {loading ? (
            <div className="px-5 py-16 text-center text-slate-400">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-amber-400" />
              Loading unpaid invoices...
            </div>
          ) : !error && filteredBills.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-slate-950/70">
                  <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-4 font-semibold">Invoice</th>
                    <th className="px-5 py-4 font-semibold">Client</th>
                    <th className="px-5 py-4 font-semibold">Address</th>
                    <th className="px-5 py-4 font-semibold">Issue Date</th>
                    <th className="px-5 py-4 text-right font-semibold">
                      Amount
                    </th>
                    <th className="px-5 py-4 text-center font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {filteredBills.map((bill) => (
                    <tr
                      key={bill._id}
                      className="transition hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-4">
                        <span className="font-semibold text-white">
                          #{bill.invoiceNumber}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="block max-w-[190px] truncate text-sm text-slate-200">
                          {bill.client?.clientname || "Unknown Client"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="block max-w-[220px] truncate text-sm text-slate-400">
                          {bill.client?.address || "—"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-400">
                        {formatDate(bill.issueDate)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right font-bold text-amber-400">
                        {formatCurrency(bill.total)}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handlePaid(bill._id)}
                          disabled={processingId === bill._id}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-500/20 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {processingId === bill._id ? (
                            <>
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-300/30 border-t-emerald-300" />
                              Updating
                            </>
                          ) : (
                            <>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="h-4 w-4"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="m5 12 4 4L19 6"
                                />
                              </svg>
                              Mark Paid
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>

                <tfoot className="border-t border-slate-800 bg-slate-950/70">
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-5 text-right font-semibold text-slate-300"
                    >
                      Total Outstanding
                    </td>
                    <td className="whitespace-nowrap px-5 py-5 text-right text-lg font-bold text-amber-400">
                      {formatCurrency(
                        filteredBills.reduce(
                          (sum, bill) => sum + (Number(bill.total) || 0),
                          0
                        )
                      )}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : !error ? (
            <div className="px-5 py-16 text-center">
              <p className="font-semibold text-white">
                {bills.length === 0
                  ? "All caught up!"
                  : "No matching invoices"}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {bills.length === 0
                  ? "There are currently no unpaid invoices."
                  : "Try searching with a different invoice number or client."}
              </p>
            </div>
          ) : null}
        </section>

        {/* Mobile Invoice Cards */}
        <section className="space-y-4 md:hidden">
          <div>
            <h2 className="text-lg font-bold">Outstanding Invoices</h2>
            <p className="mt-1 text-sm text-slate-400">
              Review and update unpaid payments.
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-12 text-center text-slate-400">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-amber-400" />
              Loading unpaid invoices...
            </div>
          ) : !error && filteredBills.length > 0 ? (
            filteredBills.map((bill) => (
              <article
                key={bill._id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-5 w-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M7 3.75h7.5L19 8.25v12H7a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2Z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M14 4v5h5M9 13h6"
                        />
                      </svg>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">Invoice Number</p>
                      <h3 className="truncate font-bold text-white">
                        #{bill.invoiceNumber}
                      </h3>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-300">
                    Unpaid
                  </span>
                </div>

                <div className="mt-5 space-y-4 border-t border-slate-800 pt-4">
                  <div>
                    <p className="text-xs text-slate-500">Client</p>
                    <p className="mt-1 font-medium text-slate-200">
                      {bill.client?.clientname || "Unknown Client"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Address</p>
                    <p className="mt-1 break-words text-sm text-slate-300">
                      {bill.client?.address || "—"}
                    </p>
                  </div>

                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">Issue Date</p>
                      <p className="mt-1 text-sm text-slate-300">
                        {formatDate(bill.issueDate)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-slate-500">Amount Due</p>
                      <p className="mt-1 text-xl font-bold text-amber-400">
                        {formatCurrency(bill.total)}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handlePaid(bill._id)}
                  disabled={processingId === bill._id}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processingId === bill._id ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Updating Payment...
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-4 w-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m5 12 4 4L19 6"
                        />
                      </svg>
                      Mark as Paid
                    </>
                  )}
                </button>
              </article>
            ))
          ) : !error ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-5 py-12 text-center">
              <h3 className="font-semibold text-white">
                {bills.length === 0
                  ? "No unpaid invoices"
                  : "No matching invoices"}
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                {bills.length === 0
                  ? "All your current invoices are marked as paid."
                  : "Try a different search term."}
              </p>
            </div>
          ) : null}

          {!loading && !error && filteredBills.length > 0 && (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
              <p className="text-sm text-slate-400">
                Outstanding amount in current results
              </p>
              <p className="mt-2 text-2xl font-bold text-amber-400">
                {formatCurrency(
                  filteredBills.reduce(
                    (sum, bill) => sum + (Number(bill.total) || 0),
                    0
                  )
                )}
              </p>
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-10 border-t border-slate-800 py-5 text-center text-xs text-slate-500">
          Gurukrupa Agency · Payment Management
        </footer>
      </div>
    </div>
  );
};

export default Payment;
