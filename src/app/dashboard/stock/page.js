"use client";

import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const getPurchaseDate = (purchase) =>
  purchase?.date ??
  purchase?.purchaseDate ??
  purchase?.buyDate ??
  purchase?.createdAt ??
  purchase?.issueDate ??
  purchase?.updatedAt ??
  null;

const getProductName = (purchase) =>
  purchase?.productName ??
  purchase?.itemname ??
  purchase?.itemName ??
  purchase?.name ??
  purchase?.product?.itemname ??
  purchase?.product?.name ??
  purchase?.item?.itemname ??
  purchase?.item?.name ??
  "Unnamed Product";

const getItemQuantity = (purchase) =>
  purchase?.itemQty ??
  purchase?.itemQuantity ??
  purchase?.itemqty ??
  purchase?.quantity ??
  purchase?.qty ??
  purchase?.product?.itemQty ??
  purchase?.item?.quantity ??
  0;

const getBoxQuantity = (purchase) =>
  purchase?.boxQty ??
  purchase?.boxQuantity ??
  purchase?.boxqty ??
  purchase?.box ??
  purchase?.numberOfBoxes ??
  0;

const getBuyingRate = (purchase) =>
  purchase?.buyingRatePerItem ??
  purchase?.buyingPricePerItem ??
  purchase?.buyingRate ??
  purchase?.ratePerItem ??
  purchase?.buyingPrice ??
  purchase?.rate ??
  0;

const getDateKey = (value) => {
  if (!value) return "";

  // Preserve the date portion of ISO date strings.
  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDate = (value) => {
  const dateKey = getDateKey(value);
  if (!dateKey) return "—";

  const [year, month, day] = dateKey.split("-");
  return `${day}/${month}/${year}`;
};

const formatCurrency = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "₹0.00";

  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const getPurchaseId = (purchase, index) =>
  purchase?._id ??
  purchase?.id ??
  purchase?.purchaseId ??
  `${getDateKey(getPurchaseDate(purchase))}-${index}`;

const normalizePurchaseResponse = (responseData) => {
  if (Array.isArray(responseData)) return responseData;

  if (Array.isArray(responseData?.data)) return responseData.data;
  if (Array.isArray(responseData?.purchases)) return responseData.purchases;
  if (Array.isArray(responseData?.buys)) return responseData.buys;
  if (Array.isArray(responseData?.items)) return responseData.items;
  if (Array.isArray(responseData?.results)) return responseData.results;

  return [];
};

const PurchaseHistory = () => {
  const now = new Date();

  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [selectedDay, setSelectedDay] = useState("");
  const [search, setSearch] = useState("");

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // Fetch purchase records from your existing buy API route.
      const response = await axios.get("/api/buy", {
        params: {
          month,
          year,
        },
      });

      setPurchases(normalizePurchaseResponse(response.data));
    } catch (err) {
      console.error("Error fetching purchase history:", err);
      setPurchases([]);
      setError(
        err?.response?.data?.message ||
          "Unable to load purchase history. Check your /api/buy route and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  // Days available in the selected month and year.
  const daysInMonth = useMemo(
    () => new Date(Number(year), Number(month), 0).getDate(),
    [month, year],
  );

  // Reset the selected day if it does not exist in the selected month.
  useEffect(() => {
    if (selectedDay && Number(selectedDay) > daysInMonth) {
      setSelectedDay("");
    }
  }, [selectedDay, daysInMonth]);

  // Filter by selected month/year, optional day, and search term.
  // Sort newest first and display only the latest 10 matching records.
  const filteredPurchases = useMemo(() => {
    const term = search.trim().toLowerCase();

    return purchases
      .filter((purchase) => {
        const dateKey = getDateKey(getPurchaseDate(purchase));

        if (!dateKey) return false;

        const [purchaseYear, purchaseMonth, purchaseDay] = dateKey.split("-");

        if (purchaseYear !== year) return false;
        if (Number(purchaseMonth) !== Number(month)) return false;

        if (selectedDay && Number(purchaseDay) !== Number(selectedDay)) {
          return false;
        }

        if (term) {
          const productName = String(getProductName(purchase)).toLowerCase();
          const purchaseId = String(
            purchase?.invoiceNumber ??
              purchase?.purchaseNumber ??
              purchase?.billNumber ??
              purchase?._id ??
              "",
          ).toLowerCase();

          if (!productName.includes(term) && !purchaseId.includes(term)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(getPurchaseDate(a) || 0).getTime();
        const dateB = new Date(getPurchaseDate(b) || 0).getTime();

        if (dateB !== dateA) return dateB - dateA;

        const createdA = new Date(a?.createdAt || 0).getTime();
        const createdB = new Date(b?.createdAt || 0).getTime();

        return createdB - createdA;
      })
      .slice(0, 10);
  }, [purchases, month, year, selectedDay, search]);

  const clearFilters = () => {
    setMonth(String(now.getMonth() + 1));
    setYear(String(now.getFullYear()));
    setSelectedDay("");
    setSearch("");
  };

  const hasFilters =
    selectedDay !== "" ||
    search.trim() !== "" ||
    month !== String(now.getMonth() + 1) ||
    year !== String(now.getFullYear());

  return (
    <main className="min-h-screen w-full bg-slate-950 text-white">
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
                Purchase History
              </h1>

              <p className="mt-2 text-sm text-slate-400">
                View purchase dates, product quantities, box quantities, and
                buying rates.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchPurchases}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
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
                  d="M5.5 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.5-1"
                />
              </svg>
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </header>

        {/* Summary */}
        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Matching Records Shown</p>
            <p className="mt-2 text-3xl font-bold text-amber-400">
              {loading ? "—" : filteredPurchases.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Latest 10 matching purchase records maximum
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Selected Period</p>
            <p className="mt-2 text-xl font-bold">
              {MONTHS.find((item) => item.value === Number(month))?.label}{" "}
              {year}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {selectedDay
                ? `Filtered to day ${selectedDay}`
                : "Showing all days in the selected month"}
            </p>
          </div>
        </section>

        {/* Filters */}
        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold">Filters</h2>
            <p className="mt-1 text-sm text-slate-400">
              Filter purchases by month, year, day, or product name.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label
                htmlFor="purchase-month"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Month
              </label>
              <select
                id="purchase-month"
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  setSelectedDay("");
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-amber-400"
              >
                {MONTHS.map((item) => (
                  <option key={item.value} value={String(item.value)}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="purchase-year"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Year
              </label>
              <select
                id="purchase-year"
                value={year}
                onChange={(e) => {
                  setYear(e.target.value);
                  setSelectedDay("");
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-amber-400"
              >
                {Array.from({ length: 10 }, (_, index) => {
                  const optionYear = now.getFullYear() - index;

                  return (
                    <option key={optionYear} value={String(optionYear)}>
                      {optionYear}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label
                htmlFor="purchase-day"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Day
              </label>
              <select
                id="purchase-day"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-amber-400"
              >
                <option value="">All Days</option>
                {Array.from({ length: daysInMonth }, (_, index) => {
                  const day = index + 1;

                  return (
                    <option key={day} value={String(day)}>
                      {day}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label
                htmlFor="purchase-search"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Search Product
              </label>
              <input
                id="purchase-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Product name or purchase number"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-400"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              Showing{" "}
              <span className="font-semibold text-white">
                {loading ? "…" : filteredPurchases.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-white">
                {loading ? "…" : purchases.length}
              </span>{" "}
              records returned by the API.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasFilters}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-amber-400/50 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reset Filters
            </button>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mb-5 flex flex-col gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm text-red-300">{error}</p>
            <button
              type="button"
              onClick={fetchPurchases}
              disabled={loading}
              className="self-start rounded-lg border border-red-400/30 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-400/10 disabled:opacity-50 sm:self-auto"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Purchase Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-4 sm:p-6">
            <h2 className="text-xl font-bold">Purchase Records</h2>
            <p className="mt-1 text-sm text-slate-400">
              Sorted by newest purchase date first.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="border-y border-slate-800 bg-slate-950/70">
                <tr className="text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-4 font-semibold">Date</th>
                  <th className="px-5 py-4 font-semibold">Product Name</th>
                  <th className="px-5 py-4 text-center font-semibold">
                    Item Qty
                  </th>
                  <th className="px-5 py-4 text-center font-semibold">
                    Box Qty
                  </th>
                  <th className="px-5 py-4 text-right font-semibold">
                    Buying Rate per Item
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-16 text-center text-slate-400"
                    >
                      <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-amber-400" />
                      Loading purchase records...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-16 text-center text-slate-400"
                    >
                      Unable to display purchase records.
                    </td>
                  </tr>
                ) : filteredPurchases.length > 0 ? (
                  filteredPurchases.map((purchase, index) => (
                    <tr
                      key={getPurchaseId(purchase, index)}
                      className="transition hover:bg-slate-800/40"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-300">
                        {formatDate(getPurchaseDate(purchase))}
                      </td>

                      <td className="px-5 py-4">
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
                                d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m4.5 7.5 7.5 4 7.5-4M12 12v8.5"
                              />
                            </svg>
                          </div>
                          <span className="font-semibold text-white">
                            {getProductName(purchase)}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex min-w-14 items-center justify-center rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-semibold text-slate-200">
                          {Number(getItemQuantity(purchase)) || 0}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex min-w-14 items-center justify-center rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-semibold text-slate-200">
                          {Number(getBoxQuantity(purchase)) || 0}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-amber-300">
                        {formatCurrency(getBuyingRate(purchase))}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-400">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          className="h-6 w-6"
                        >
                          <circle cx="10.5" cy="10.5" r="6.5" />
                          <path strokeLinecap="round" d="m15.5 15.5 5 5" />
                        </svg>
                      </div>
                      <p className="font-semibold text-white">
                        No purchase records found
                      </p>
                      <p className="mt-2 text-sm text-slate-400">
                        Try changing the date filters or search term.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile-friendly table scroll hint */}
          <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-500 md:hidden">
            Swipe horizontally to view all table columns.
          </div>
        </section>

        <footer className="mt-10 border-t border-slate-800 py-5 text-center text-xs text-slate-500">
          Gurukrupa Agency · Purchase History
        </footer>
      </div>
    </main>
  );
};

export default PurchaseHistory;
