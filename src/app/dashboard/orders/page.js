
"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const Orders = () => {
  const [bills, setBills] = useState([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const router = useRouter();

  // Fetch today's orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        const res = await axios.get("/api/bill?today=true");
        setBills(res.data.data || []);
        console.log(res);
      } catch (e) {
        console.error(e);
        setError("Unable to load today's orders. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Client-side search
  const filteredBills = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return bills;

    return bills.filter((bill) => {
      const invoiceNumber = String(bill.invoiceNumber ?? "").toLowerCase();
      const clientName = String(
        bill?.client?.clientname ?? ""
      ).toLowerCase();

      return (
        invoiceNumber.includes(query) ||
        clientName.includes(query)
      );
    });
  }, [bills, search]);

  const formatCurrency = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (value) => {
    if (!value) return "Date unavailable";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? "Date unavailable"
      : date.toLocaleDateString("en-IN", {
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
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/95">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div className="flex items-center gap-4">
            <a
              href="/dashboard"
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-700 px-4 text-sm font-medium text-slate-300 transition hover:border-amber-400 hover:bg-slate-900 hover:text-amber-300"
            >
              <span aria-hidden="true">←</span>
              Back
            </a>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
                Gurukrupa Agency
              </p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
                Today's Orders
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-xl text-amber-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-5 w-5"
              >
                <path d="M6 3h12v18H6z" />
                <path d="M9 8h6M9 12h6M9 16h4" />
              </svg>
            </div>

            <div>
              <p className="text-xs text-slate-400">
                Orders Today
              </p>
              <p className="text-lg font-bold text-white">
                {isLoading ? "—" : filteredBills.length}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Introduction */}
        <section>
          <h2 className="text-lg font-semibold text-white">
            Order Register
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            View and search invoices created today.
          </p>
        </section>

        {/* Search and summary */}
        <section className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m16 16 4 4" />
            </svg>

            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice number or client..."
              aria-label="Search today's orders"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Showing {filteredBills.length} of {bills.length} orders
          </div>
        </section>

        {/* Orders list */}
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-5 sm:px-6">
            <div>
              <h2 className="font-semibold text-white">
                Today's Invoices
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Select an invoice to view its details.
              </p>
            </div>

            <span className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-300">
              Today
            </span>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center px-5 py-20 text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-amber-400" />
              <p className="mt-4 text-sm text-slate-400">
                Loading today's orders...
              </p>
            </div>
          ) : error ? (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-2xl text-red-400">
                !
              </div>
              <h3 className="mt-4 font-semibold text-white">
                Unable to load orders
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                {error}
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-5 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
              >
                Try Again
              </button>
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-slate-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-8 w-8"
                >
                  <path d="M6 3h12v18H6z" />
                  <path d="M9 8h6M9 12h6M9 16h4" />
                </svg>
              </div>

              <h3 className="mt-5 text-lg font-semibold text-white">
                {search
                  ? "No matching orders found"
                  : "No orders for today"}
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">
                {search
                  ? "Try another invoice number or client name."
                  : "Invoices created today will appear here."}
              </p>

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="mt-5 rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-amber-400 transition hover:bg-slate-800"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {filteredBills.map((bill) => (
                <article
                  key={bill._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openBill(bill._id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openBill(bill._id);
                    }
                  }}
                  className="group cursor-pointer px-5 py-5 transition hover:bg-slate-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400 sm:px-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Invoice and client */}
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-400">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          className="h-6 w-6"
                        >
                          <path d="M6 3h12v18H6z" />
                          <path d="M9 8h6M9 12h6M9 16h4" />
                        </svg>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-white transition group-hover:text-amber-300">
                            Invoice #{bill.invoiceNumber}
                          </h3>

                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                            Today's Order
                          </span>
                        </div>

                        <p className="mt-1 truncate text-sm text-slate-400">
                          {bill?.client?.clientname || "Client not available"}
                        </p>

                        <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            className="h-4 w-4"
                          >
                            <rect
                              x="3"
                              y="5"
                              width="18"
                              height="16"
                              rx="2"
                            />
                            <path d="M16 3v4M8 3v4M3 10h18" />
                          </svg>
                          {formatDate(bill.issueDate)}
                        </p>
                      </div>
                    </div>

                    {/* Amount and action */}
                    <div className="flex items-center justify-between gap-4 border-t border-slate-800 pt-4 sm:justify-end sm:border-t-0 sm:pt-0">
                      <div className="sm:text-right">
                        <p className="text-xs text-slate-500">
                          Total Amount
                        </p>
                        <p className="mt-1 text-lg font-bold text-amber-400">
                          {formatCurrency(bill.total)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openBill(bill._id);
                        }}
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-amber-400 hover:bg-amber-400 hover:text-slate-950"
                      >
                        View
                        <span aria-hidden="true">→</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="pb-4 pt-2 text-center text-xs text-slate-600">
          Gurukrupa Agency · Order Management
        </footer>
      </div>
    </main>
  );
};

export default Orders;
