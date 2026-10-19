 "use client";

import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import LoadingAnimation from "@/components/LoadingAnimation";

const Bill = () => {
  const router = useRouter();

  const [bills, setBills] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBills = async () => {
      try {
        const res = await axios.get("/api/bill");
        setBills(res.data.data || []);
      } catch (e) {
        console.error("Error fetching bills:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchBills();
  }, []);

  const filteredBills = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return bills;

    return bills.filter((bill) => {
      const invoiceNumber = String(bill.invoiceNumber ?? "").toLowerCase();
      const clientName = String(bill?.client?.clientname ?? "").toLowerCase();
      const total = String(bill.total ?? "").toLowerCase();

      return (
        invoiceNumber.includes(query) ||
        clientName.includes(query) ||
        total.includes(query)
      );
    });
  }, [bills, searchTerm]);

  const formatCurrency = (amount) => {
    return Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

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

  const openBill = (id) => {
    router.push(`/dashboard/billout?id=${id}`);
  };

  return (
    <main className="min-h-screen w-full bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">
                  Gurukrupa Agency
                </p>
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Invoices
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                View, search, and manage all your business invoices in one place.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/dashboard/createbill")}
              className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300 active:scale-[0.98] sm:self-auto"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 5v14m-7-7h14"
                />
              </svg>
              Create New Bill
            </button>
          </div>
        </header>

        <nav className="billing-tabs" aria-label="Billing and sales views">
          <Link href="/dashboard/bill" aria-current="page">Invoices</Link>
          <Link href="/dashboard/billinghistory">Sales history</Link>
        </nav>

        {/* Summary and search */}
        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-black/10 sm:p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="h-6 w-6"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 3.75h7l4 4V20a.75.75 0 0 1-.75.75h-10.5A.75.75 0 0 1 6 20V4.5a.75.75 0 0 1 .75-.75ZM14 4v4h4M9 13h6M9 16.5h6"
                  />
                </svg>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-300">
                  {loading ? "Loading invoices..." : "Your invoices"}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {loading
                    ? "Please wait"
                    : `${filteredBills.length} of ${bills.length} invoices`}
                </p>
              </div>
            </div>

            <span className="rounded-lg border border-slate-800 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-400">
              Invoice Register
            </span>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              >
                <circle cx="10.8" cy="10.8" r="6.8" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m16 16 4.2 4.2"
                />
              </svg>

              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by invoice number, client, or amount..."
                aria-label="Search invoices"
                className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/10"
              />
            </div>

            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 text-sm font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
              >
                Clear Search
              </button>
            )}
          </div>
        </section>

        {/* Invoice list heading */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white sm:text-xl">
            All Invoices
          </h2>

          {!loading && (
            <span className="text-xs text-slate-500 sm:text-sm">
              {filteredBills.length} result
              {filteredBills.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 px-4 py-12 text-center">
            <LoadingAnimation size={72} label="Loading invoices" />
            <p className="mt-4 text-sm text-slate-400">
              Loading your invoices...
            </p>
          </div>
        ) : filteredBills.length > 0 ? (
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-label="Invoices">
            {filteredBills.map((bill) => (
              <article
                key={bill._id}
                role="button"
                tabIndex={0}
                aria-label={`View invoice ${bill.invoiceNumber}`}
                onClick={() => openBill(bill._id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openBill(bill._id);
                  }
                }}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/10 transition duration-300 hover:-translate-y-0.5 hover:border-amber-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:p-6"
              >
                {/* Accent line */}
                <div className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-amber-400 transition-transform duration-300 group-hover:scale-x-100" />

                {/* Invoice header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-400 transition group-hover:bg-amber-400 group-hover:text-slate-950">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        className="h-6 w-6"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M7 3.75h7l4 4V20a.75.75 0 0 1-.75.75h-10.5A.75.75 0 0 1 6 20V4.5a.75.75 0 0 1 .75-.75ZM14 4v4h4M9 13h6M9 16.5h6"
                        />
                      </svg>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                        Invoice
                      </p>
                      <h3 className="mt-1 break-words text-base font-bold text-white sm:text-lg">
                        #{bill.invoiceNumber}
                      </h3>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.08] px-2.5 py-1.5 text-xs font-medium text-emerald-300">
                    Created
                  </span>
                </div>

                {/* Invoice details */}
                <div className="grid grid-cols-1 gap-4 py-5 sm:grid-cols-2">
                  <div className="min-w-0">
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
                      Client
                    </p>
                    <p className="break-words text-sm font-medium text-slate-200">
                      {bill?.client?.clientname || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
                      Issue Date
                    </p>
                    <p className="text-sm font-medium text-slate-200">
                      {formatDate(bill.issueDate)}
                    </p>
                  </div>
                </div>

                {/* Amount and action */}
                <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                      Total Amount
                    </p>
                    <p className="text-2xl font-bold tracking-tight text-amber-400 sm:text-3xl">
                      ₹{formatCurrency(bill.total)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openBill(bill._id);
                    }}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-sm font-semibold text-amber-300 transition hover:border-amber-400 hover:bg-amber-400 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    View Details
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 12h14m-6-6 6 6-6 6"
                      />
                    </svg>
                  </button>
                </div>
              </article>
            ))}
          </section>
        ) : (
          /* Empty state */
          <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900 px-5 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-slate-800 text-slate-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-8 w-8"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 3.75h7l4 4V20a.75.75 0 0 1-.75.75h-10.5A.75.75 0 0 1 6 20V4.5a.75.75 0 0 1 .75-.75ZM14 4v4h4M9 13h6M9 16.5h3"
                />
              </svg>
            </div>

            <h3 className="mt-5 text-lg font-semibold text-white">
              {searchTerm ? "No matching invoices" : "No bills created yet"}
            </h3>

            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
              {searchTerm
                ? "Try a different invoice number, client name, or amount."
                : "Your invoices will appear here once you create your first bill."}
            </p>

            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="mt-5 rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Clear Search
              </button>
            ) : (
              <button
                type="button"
                onClick={() => router.push("/dashboard/createbill")}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
              >
                <span className="text-lg leading-none">+</span>
                Create Your First Bill
              </button>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-10 border-t border-slate-800 py-5 text-center">
          <p className="text-xs text-slate-500 sm:text-sm">
            © {new Date().getFullYear()} Gurukrupa Agency. All rights reserved.
          </p>
        </footer>
      </div>
    </main>
  );
};

export default Bill;
