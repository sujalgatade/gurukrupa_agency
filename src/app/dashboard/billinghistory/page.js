
"use client";

import InvoicePrint from "@/components/InvoicePrint";
import printDocument from "@/lib/printDocument";
import axios from "axios";
import { useState, useEffect, useMemo } from "react";

const Billinghistory = () => {
  const [bills, setBills] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch bills whenever month or year changes
  useEffect(() => {
    const fetchBills = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await axios.get(
          `/api/bill?month=${month}&year=${year}`
        );

        setBills(res.data.data || []);
      } catch (e) {
        console.error("Error fetching billing history:", e);
        setBills([]);
        setError("Unable to load billing history. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchBills();
  }, [month, year]);

  // Search invoices by invoice number or client name
  const filteredBills = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return bills.filter((bill) => {
      const invoiceNumber = String(bill.invoiceNumber ?? "").toLowerCase();
      const clientName = String(bill.client?.clientname ?? "").toLowerCase();

      return invoiceNumber.includes(term) || clientName.includes(term);
    });
  }, [bills, searchTerm]);

  // Calculate summary values from the selected month's bills
  const totalSales = useMemo(
    () =>
      bills.reduce(
        (sum, bill) => sum + (Number(bill.total) || 0),
        0
      ),
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
    if (!date) return "Date unavailable";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return "Date unavailable";

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const generatePDF = async () => {
    if (!bills.length) {
      alert("There are no bills available to print for this period.");
      return;
    }

    try {
      const originalElement = document.getElementById("invoice-content");

      if (!originalElement) {
        console.error("Invoice print content was not found.");
        return;
      }

      printDocument({ month, originalElement });
    } catch (err) {
      console.error("PDF Error:", err);
    }
  };

  const monthName = new Date(2000, Number(month) - 1, 1).toLocaleString(
    "en-IN",
    { month: "long" }
  );

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
                Billing History
              </h1>

              <p className="mt-2 text-sm text-slate-400">
                View, search, and print your previous invoices.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Selected Period
              </p>
              <p className="mt-1 text-lg font-semibold text-amber-400">
                {monthName} {year}
              </p>
            </div>
          </div>
        </header>

        {/* Summary Cards */}
        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400">
                  Invoices This Period
                </p>
                <p className="mt-2 text-3xl font-bold">
                  {loading ? "—" : bills.length}
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
                    d="M14 4v5h5M9 13h6M9 16.5h6"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400">
                  Total Billed Amount
                </p>
                <p className="mt-2 break-words text-2xl font-bold text-amber-400 sm:text-3xl">
                  {loading ? "—" : formatCurrency(totalSales)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Based on all invoices in this period
                </p>
              </div>

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
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

        {/* Search and Period Controls */}
        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Find Invoices</h2>
            <p className="mt-1 text-sm text-slate-400">
              Choose a billing period or search by invoice number or client.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
            {/* Search */}
            <div className="lg:col-span-2">
              <label
                htmlFor="billing-search"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Search
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
                  <path
                    strokeLinecap="round"
                    d="m15.5 15.5 5 5"
                  />
                </svg>

                <input
                  id="billing-search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Invoice number or client name..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10"
                />
              </div>
            </div>

            {/* Month */}
            <div>
              <label
                htmlFor="billing-month"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Month
              </label>

              <select
                id="billing-month"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10"
              >
                {Array.from({ length: 12 }, (_, index) => {
                  const value = index + 1;
                  const label = new Date(2000, index, 1).toLocaleString(
                    "en-IN",
                    { month: "long" }
                  );

                  return (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Year */}
            <div>
              <label
                htmlFor="billing-year"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Year
              </label>

              <input
                id="billing-year"
                type="number"
                min="2000"
                max="2100"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">
              Showing{" "}
              <span className="font-semibold text-white">
                {loading ? "…" : filteredBills.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-white">{bills.length}</span>{" "}
              invoices
            </p>

            <button
              type="button"
              onClick={generatePDF}
              disabled={loading || bills.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-950/20 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
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
                  d="M7 8V3.75h10V8M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 14h10v6.25H7zM17 11.5h.01"
                />
              </svg>
              Print Billing History
            </button>
          </div>
        </section>

        {/* Hidden Invoice Print Content */}
        <div className="hidden">
          <div id="invoice-content">
            {bills.map((cur, idx) => (
              <InvoicePrint key={cur._id || idx} invoiceData={cur} />
            ))}
          </div>
        </div>

        {/* Invoice List */}
        <section>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">Invoices</h2>
              <p className="mt-1 text-sm text-slate-400">
                Billing records for {monthName} {year}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-16 text-center">
              <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-slate-700 border-t-amber-400" />
              <p className="font-medium text-slate-200">
                Loading billing history...
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Please wait while we retrieve your invoices.
              </p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-12 text-center">
              <p className="font-semibold text-red-300">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setMonth((current) => current);
                  setYear((current) => current);
                  // Retry the current request without changing the API.
                  axios
                    .get(`/api/bill?month=${month}&year=${year}`)
                    .then((res) => {
                      setBills(res.data.data || []);
                      setError("");
                    })
                    .catch((e) => {
                      console.error(e);
                      setError(
                        "Unable to load billing history. Please try again."
                      );
                    });
                }}
                className="mt-4 rounded-lg border border-red-400/30 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-400/10"
              >
                Try Again
              </button>
            </div>
          ) : filteredBills.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 md:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left">
                    <thead className="border-b border-slate-800 bg-slate-950/70">
                      <tr className="text-xs uppercase tracking-wider text-slate-400">
                        <th className="px-6 py-4 font-semibold">Invoice</th>
                        <th className="px-6 py-4 font-semibold">Client</th>
                        <th className="px-6 py-4 font-semibold">Issue Date</th>
                        <th className="px-6 py-4 text-right font-semibold">
                          Total Amount
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-800">
                      {filteredBills.map((bill, idx) => (
                        <tr
                          key={bill._id || idx}
                          className="transition hover:bg-slate-800/50"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
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
                                    d="M14 4v5h5M9 13h6M9 16.5h6"
                                  />
                                </svg>
                              </div>
                              <span className="font-semibold text-white">
                                #{bill.invoiceNumber}
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span className="block max-w-[220px] truncate text-sm text-slate-200">
                              {bill.client?.clientname || "Unknown Client"}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-400">
                            {formatDate(bill.issueDate)}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <span className="font-bold text-amber-400">
                              {formatCurrency(bill.total)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Invoice Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:hidden">
                {filteredBills.map((bill, idx) => (
                  <article
                    key={bill._id || idx}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-amber-400/30"
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
                              d="M14 4v5h5M9 13h6M9 16.5h6"
                            />
                          </svg>
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs text-slate-500">Invoice</p>
                          <h3 className="truncate font-bold text-white">
                            #{bill.invoiceNumber}
                          </h3>
                        </div>
                      </div>

                      <span className="shrink-0 rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-400">
                        {formatDate(bill.issueDate)}
                      </span>
                    </div>

                    <div className="mt-5 border-t border-slate-800 pt-4">
                      <p className="text-xs text-slate-500">Client</p>
                      <p className="mt-1 truncate font-medium text-slate-200">
                        {bill.client?.clientname || "Unknown Client"}
                      </p>

                      <div className="mt-4 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xs text-slate-500">
                            Invoice Total
                          </p>
                          <p className="mt-1 text-xl font-bold text-amber-400">
                            {formatCurrency(bill.total)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-5 py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-slate-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="h-7 w-7"
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

              <h3 className="text-lg font-semibold text-white">
                No invoices found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                {searchTerm
                  ? "No invoices match your search. Try another invoice number or client name."
                  : `There are no billing records for ${monthName} ${year}.`}
              </p>

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="mt-5 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-amber-400 transition hover:bg-slate-800"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-10 border-t border-slate-800 py-5 text-center text-xs text-slate-500">
          Gurukrupa Agency · Billing History
        </footer>
      </div>
    </div>
  );
};

export default Billinghistory;
