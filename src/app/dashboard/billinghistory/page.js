"use client";

import InvoicePrint from "@/components/InvoicePrint";
import printDocument from "@/lib/printDocument";
import axios from "axios";
import { useState, useEffect, useMemo } from "react";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const currentDate = new Date();

const Billinghistory = () => {
  const [bills, setBills] = useState([]);
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [selectedDay, setSelectedDay] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  // Fetch bills whenever the month, year, or retry changes.
  useEffect(() => {
    let cancelled = false;

    const fetchBills = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await axios.get("/api/bill", {
          params: { month, year },
        });

        if (!cancelled) {
          setBills(Array.isArray(res.data?.data) ? res.data.data : []);
        }
      } catch (e) {
        console.error("Error fetching billing history:", e);

        if (!cancelled) {
          setBills([]);
          setError("Unable to load billing history. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchBills();

    return () => {
      cancelled = true;
    };
  }, [month, year, retryCount]);

  // Convert a date into YYYY-MM-DD for reliable day filtering.
  const getDateKey = (value) => {
    if (!value) return "";

    if (typeof value === "string") {
      const match = value.match(/^(\d{4}-\d{2}-\d{2})/);

      if (match) return match[1];
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");

    return `${y}-${m}-${d}`;
  };

  const formatDate = (value) => {
    if (!value) return "Date unavailable";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Date unavailable";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0);

  // Number of days in the currently selected month.
  const daysInMonth = new Date(Number(year), Number(month), 0).getDate();

  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);

  // Apply day filter and search, sort newest first, then keep 10 bills.
  const filteredBills = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return bills
      .filter((bill) => {
        const dateKey = getDateKey(bill.issueDate);

        // Make sure the bill belongs to the selected month/year.
        const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;

        if (!dateKey || !dateKey.startsWith(monthPrefix)) {
          return false;
        }

        // If a day is selected, show only that day.
        if (
          selectedDay &&
          Number(dateKey.split("-")[2]) !== Number(selectedDay)
        ) {
          return false;
        }

        // Search by invoice number or client name.
        const invoiceNumber = String(bill.invoiceNumber ?? "").toLowerCase();

        const clientName = String(bill.client?.clientname ?? "").toLowerCase();

        return invoiceNumber.includes(term) || clientName.includes(term);
      })
      .sort((a, b) => {
        const dateA = new Date(a.issueDate).getTime() || 0;
        const dateB = new Date(b.issueDate).getTime() || 0;

        // Latest date/time first.
        if (dateA !== dateB) return dateB - dateA;

        // Tie-breaker for bills on the same date.
        const createdA = new Date(a.createdAt).getTime() || 0;
        const createdB = new Date(b.createdAt).getTime() || 0;

        return createdB - createdA;
      })
      .slice(0, 10);
  }, [bills, month, year, selectedDay, searchTerm]);

  // Period summaries are based on all bills loaded for the selected month.
  const totalSales = useMemo(
    () => bills.reduce((sum, bill) => sum + (Number(bill.total) || 0), 0),
    [bills],
  );

  const monthName = MONTHS[Number(month) - 1];

  const clearDayFilter = () => setSelectedDay("");

  const generatePDF = async () => {
    if (!filteredBills.length) {
      alert("There are no displayed bills available to print.");
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
                Filter, search, and print your 10 latest invoices.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Selected Period
              </p>
              <p className="mt-1 text-lg font-semibold text-amber-400">
                {monthName} {year}
              </p>
              {selectedDay && (
                <p className="mt-1 text-sm text-slate-400">Day {selectedDay}</p>
              )}
            </div>
          </div>
        </header>

        {/* Summary Cards */}
        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400">Invoices This Period</p>
                <p className="mt-2 text-3xl font-bold">
                  {loading ? "—" : bills.length}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  All bills for the selected month
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
                <p className="text-sm text-slate-400">Total Billed Amount</p>
                <p className="mt-2 break-words text-2xl font-bold text-amber-400 sm:text-3xl">
                  {loading ? "—" : formatCurrency(totalSales)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  All invoices for {monthName} {year}
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

        {/* Filters */}
        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Find Invoices</h2>
            <p className="mt-1 text-sm text-slate-400">
              Filter by day, month, and year, or search by invoice number or
              client name.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label
                htmlFor="billing-search"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Search Invoice or Client
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
                  id="billing-search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Invoice number or client name..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10"
                />
              </div>
            </div>

            {/* Day Number */}
            <div>
              <label
                htmlFor="billing-day"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Date (Day Number)
              </label>

              <select
                id="billing-day"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10"
              >
                <option value="">All Days</option>
                {days.map((day) => (
                  <option key={day} value={String(day)}>
                    {day}
                  </option>
                ))}
              </select>
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
                onChange={(e) => {
                  setMonth(Number(e.target.value));
                  setSelectedDay("");
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10"
              >
                {MONTHS.map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label}
                  </option>
                ))}
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

              <select
                id="billing-year"
                value={year}
                onChange={(e) => {
                  setYear(Number(e.target.value));
                  setSelectedDay("");
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10"
              >
                {Array.from(
                  { length: 10 },
                  (_, index) => currentDate.getFullYear() - index,
                ).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-400">
              Showing{" "}
              <span className="font-semibold text-white">
                {loading ? "…" : filteredBills.length}
              </span>{" "}
              of the latest 10 matching invoices
            </div>

            <div className="flex flex-wrap gap-3">
              {selectedDay && (
                <button
                  type="button"
                  onClick={clearDayFilter}
                  className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-amber-400 hover:text-amber-300"
                >
                  Clear Day Filter
                </button>
              )}

              <button
                type="button"
                onClick={generatePDF}
                disabled={loading || filteredBills.length === 0}
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
                Print Displayed Bills
              </button>
            </div>
          </div>
        </section>

        {/* Hidden print content: only the displayed invoices */}
        <div className="hidden">
          <div id="invoice-content">
            {filteredBills.map((bill, index) => (
              <InvoicePrint key={bill._id || index} invoiceData={bill} />
            ))}
          </div>
        </div>

        {/* Invoice List */}
        <section>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">Latest Invoices</h2>
              <p className="mt-1 text-sm text-slate-400">
                {selectedDay
                  ? `Bills for ${selectedDay} ${monthName} ${year}`
                  : `Latest 10 bills for ${monthName} ${year}`}
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
                onClick={() => setRetryCount((count) => count + 1)}
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
                      {filteredBills.map((bill, index) => (
                        <tr
                          key={bill._id || index}
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

              {/* Mobile Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:hidden">
                {filteredBills.map((bill, index) => (
                  <article
                    key={bill._id || index}
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

                      <div className="mt-4">
                        <p className="text-xs text-slate-500">Invoice Total</p>
                        <p className="mt-1 text-xl font-bold text-amber-400">
                          {formatCurrency(bill.total)}
                        </p>
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
                {searchTerm || selectedDay
                  ? "No invoices match the selected date or search. Try changing your filters."
                  : `There are no billing records for ${monthName} ${year}.`}
              </p>

              {(searchTerm || selectedDay) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedDay("");
                  }}
                  className="mt-5 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-amber-400 transition hover:bg-slate-800"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </section>

        <footer className="mt-10 border-t border-slate-800 py-5 text-center text-xs text-slate-500">
          Gurukrupa Agency · Billing History
        </footer>
      </div>
    </div>
  );
};

export default Billinghistory;
