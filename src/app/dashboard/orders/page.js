"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import LoadingAnimation from "@/components/LoadingAnimation";

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

const Orders = () => {
  const [bills, setBills] = useState([]);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(
    String(currentDate.getMonth() + 1),
  );
  const [selectedYear, setSelectedYear] = useState(
    String(currentDate.getFullYear()),
  );

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch bills for the selected month and year.
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await axios.get("/api/bill", {
          params: {
            month: selectedMonth,
            year: selectedYear,
          },
        });

        setBills(Array.isArray(response.data?.data) ? response.data.data : []);
      } catch (err) {
        console.error("Unable to load bills:", err);
        setError("Unable to load bills. Please try again.");
        setBills([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [selectedMonth, selectedYear]);

  // Convert a bill date into YYYY-MM-DD.
  const getDateKey = (value) => {
    if (!value) return "";

    if (typeof value === "string") {
      const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) return match[1];
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const formatDate = (dateKey) => {
    if (!dateKey) return "Date unavailable";

    const [, month, day] = dateKey.split("-");
    return `${day}/${month}/${dateKey.split("-")[0]}`;
  };

  const getProductName = (item) =>
    item?.itemname ??
    item?.productName ??
    item?.productname ??
    item?.name ??
    item?.product?.productName ??
    item?.product?.productname ??
    item?.product?.name ??
    "Unnamed Product";

  const getQuantityInPieces = (item) => {
    const unitsPerBox = Math.round(Number(item?.quantity || item?.unitsPerBox || item?.itemperbox || 0));
    if (item?.boxQty !== undefined && unitsPerBox > 0) {
      const soldPieces = Number(item.boxQty || 0) * unitsPerBox + Number(item.itemQty || 0);
      const returnedPieces = Number(item.returnedBoxes || 0) * unitsPerBox + Number(item.returnedItemQty || 0);
      return {
        unitsPerBox,
        totalPieces: Math.max(0, Math.round(soldPieces - returnedPieces)),
      };
    }

    const value = Number(
      item?.boxQuantity ?? item?.box ?? item?.boxes ?? item?.quantityOfBoxes ?? item?.quantity ?? 0,
    );
    const legacyUnitsPerBox = Math.max(1, Math.round(Number(item?.unitsPerBox || item?.itemperbox || 1)));
    return {
      unitsPerBox: legacyUnitsPerBox,
      totalPieces: Number.isFinite(value) ? Math.max(0, Math.round(value * legacyUnitsPerBox)) : 0,
    };
  };

  // Calculate the number of days in the selected month/year.
  const daysInMonth = new Date(
    Number(selectedYear),
    Number(selectedMonth),
    0,
  ).getDate();

  // Build day options: 1, 2, 3 ... 31 (depending on month).
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);

  // Combine product box quantities from matching bills.
  const productSummary = useMemo(() => {
    const summary = new Map();
    const monthPrefix = `${selectedYear}-${String(selectedMonth).padStart(
      2,
      "0",
    )}`;

    bills.forEach((bill) => {
      const dateKey = getDateKey(bill.issueDate);

      if (!dateKey || !dateKey.startsWith(monthPrefix)) return;

      // Compare only the day number when a day is selected.
      const billDay = Number(dateKey.split("-")[2]);

      if (selectedDay && billDay !== Number(selectedDay)) return;

      const items = Array.isArray(bill.items) ? bill.items : [];
      items.forEach((item) => {
        const productName = getProductName(item);
        const { unitsPerBox, totalPieces } = getQuantityInPieces(item);
        const key = `${dateKey}__${productName.toLowerCase()}__${unitsPerBox}`;

        if (!summary.has(key)) {
          summary.set(key, {
            date: dateKey,
            productName,
            unitsPerBox,
            totalPieces: 0,
          });
        }

        summary.get(key).totalPieces += totalPieces;
      });
    });

    return Array.from(summary.values(), (item) => ({
      ...item,
      fullBoxes: Math.floor(item.totalPieces / item.unitsPerBox),
      loosePieces: item.totalPieces % item.unitsPerBox,
    })).sort((a, b) => {
      const dateComparison = b.date.localeCompare(a.date);
      if (dateComparison !== 0) return dateComparison;

      return a.productName.localeCompare(b.productName);
    });
  }, [bills, selectedDay, selectedMonth, selectedYear]);

  const totalBoxes = useMemo(
    () => productSummary.reduce((total, item) => total + item.fullBoxes, 0),
    [productSummary],
  );
  const totalLoosePieces = useMemo(
    () => productSummary.reduce((total, item) => total + item.loosePieces, 0),
    [productSummary],
  );
  const quantityRows = useMemo(
    () => productSummary.flatMap((item) => {
      const rows = [];
      if (item.fullBoxes > 0 || item.loosePieces === 0) {
        rows.push({ ...item, type: "boxes", quantity: item.fullBoxes });
      }
      if (item.loosePieces > 0) {
        rows.push({ ...item, type: "loose", quantity: item.loosePieces });
      }
      return rows;
    }),
    [productSummary],
  );

  const years = Array.from(
    { length: 10 },
    (_, index) => currentDate.getFullYear() - index,
  );

  const handleMonthChange = (value) => {
    setSelectedMonth(value);
    setSelectedDay("");
  };

  const handleYearChange = (value) => {
    setSelectedYear(value);
    setSelectedDay("");
  };

  const clearDayFilter = () => setSelectedDay("");

  const retryFetch = async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await axios.get("/api/bill", {
        params: {
          month: selectedMonth,
          year: selectedYear,
        },
      });

      setBills(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (err) {
      console.error(err);
      setError("Unable to load bills. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/95">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
                Gurukrupa Agency
              </p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
                Search Orders 
              </h1>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-3">
            <p className="text-xs text-slate-400">Total Full Boxes</p>
            <p className="mt-1 text-2xl font-bold text-amber-400">
              {isLoading ? "—" : totalBoxes.toLocaleString("en-IN")}
            </p>
            {!isLoading && <p className="mt-1 text-xs text-slate-400">Loose pieces: {totalLoosePieces.toLocaleString("en-IN")}</p>}
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Introduction */}
        <section>
          <h2 className="text-lg font-semibold text-white">
            Product Quantity Register
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Filter by day, month, and year to view full boxes and loose pieces separately.
          </p>
        </section>

        {/* Filters */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
          <div className="mb-5">
            <h2 className="font-semibold text-white">Filter Records</h2>
            <p className="mt-1 text-sm text-slate-400">
              Select a day number, month, and year.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Day number only */}
            <div>
              <label
                htmlFor="filterDay"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Date (Day Number)
              </label>

              <select
                id="filterDay"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
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
                htmlFor="filterMonth"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Month
              </label>

              <select
                id="filterMonth"
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              >
                {MONTHS.map((month, index) => (
                  <option key={month} value={String(index + 1)}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div>
              <label
                htmlFor="filterYear"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Year
              </label>

              <select
                id="filterYear"
                value={selectedYear}
                onChange={(e) => handleYearChange(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              >
                {years.map((year) => (
                  <option key={year} value={String(year)}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear day */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={clearDayFilter}
                disabled={!selectedDay}
                className="w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-amber-400 hover:bg-slate-800 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear Day Filter
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Showing records for{" "}
            <span className="font-medium text-amber-300">
              {selectedDay ? `Day ${selectedDay}, ` : ""}
              {MONTHS[Number(selectedMonth) - 1]} {selectedYear}
            </span>
          </div>
        </section>

        {/* Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="font-semibold text-white">
                Product Quantity Details
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Matching bills are combined by date and product. Loose pieces appear on their own row.
              </p>
            </div>

            <span className="w-fit rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-300">
              {isLoading
                ? <span className="inline-flex items-center gap-1"><LoadingAnimation size={24} label="Loading orders" />Loading...</span>
                : `${productSummary.length} product records`}
            </span>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center px-5 py-20 text-center">
              <LoadingAnimation size={72} label="Loading product quantities" />
              <p className="mt-4 text-sm text-slate-400">
                Loading product quantities...
              </p>
            </div>
          ) : error ? (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-2xl text-red-400">
                !
              </div>
              <h3 className="mt-4 font-semibold text-white">
                Unable to load records
              </h3>
              <p className="mt-2 text-sm text-slate-400">{error}</p>

              <button
                type="button"
                onClick={retryFetch}
                className="mt-5 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
              >
                Try Again
              </button>
            </div>
          ) : productSummary.length === 0 ? (
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
                No product records found
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                No bill items were found for the selected day and period. Try
                changing your filters.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-4 font-semibold sm:px-6">Date</th>
                      <th className="px-5 py-4 font-semibold">Product Name</th>
                      <th className="px-5 py-4 font-semibold">Quantity Type</th>
                      <th className="px-5 py-4 text-right font-semibold sm:px-6">
                        Quantity
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800">
                    {quantityRows.map((item) => (
                      <tr
                        key={`${item.date}-${item.productName}-${item.unitsPerBox}-${item.type}`}
                        className="transition hover:bg-slate-800/50"
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-slate-300 sm:px-6">
                          {formatDate(item.date)}
                        </td>
                        <td className="px-5 py-4 font-medium text-white">
                          {item.productName}
                        </td>
                        <td className="px-5 py-4 text-slate-300">
                          {item.type === "boxes" ? "Full boxes" : "Loose pieces"}
                        </td>
                        <td className="px-5 py-4 text-right sm:px-6">
                          <span className="inline-flex min-w-14 justify-center rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 font-bold text-amber-300">
                            {item.quantity.toLocaleString("en-IN")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  <tfoot className="border-t border-slate-700 bg-slate-950/70">
                    <tr>
                      <td
                        colSpan={3}
                        className="px-5 py-4 font-semibold text-white sm:px-6"
                      >
                        Total Full Boxes
                      </td>
                      <td className="px-5 py-4 text-right sm:px-6">
                        <span className="text-lg font-bold text-amber-400">
                          {totalBoxes.toLocaleString("en-IN")}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-5 py-4 font-semibold text-white sm:px-6">Total Loose Pieces</td>
                      <td className="px-5 py-4 text-right sm:px-6">
                        <span className="text-lg font-bold text-sky-300">{totalLoosePieces.toLocaleString("en-IN")}</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="border-t border-slate-800 px-5 py-3 text-xs text-slate-500 sm:px-6">
                Loose pieces are counted separately and are never shown as decimal boxes.
              </div>
            </>
          )}
        </section>

        <footer className="pb-4 pt-2 text-center text-xs text-slate-600">
          Gurukrupa Agency · Product Quantity Register
        </footer>
      </div>
    </main>
  );
};

export default Orders;
