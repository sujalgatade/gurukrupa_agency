"use client";

import { useMemo, useState } from "react";

const DUMMY_API = "https://jsonplaceholder.typicode.com/posts";

const createEmptyRow = () => ({
  id: `${Date.now()}-${Math.random()}`,
  date: new Date().toISOString().split("T")[0],
  itemName: "",
  rate: "",
  itemQuantity: "",
  boxQuantity: "",
});

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const getBuyingPricePerItem = (row) => {
  const rate = Number(row.rate) || 0;
  const quantity = Number(row.itemQuantity) || 0;

  if (quantity <= 0) return 0;

  return (rate * 1.05) / quantity;
};

const getTotalBuyingValue = (row) => {
  const rate = Number(row.rate) || 0;
  const boxes = Number(row.boxQuantity) || 0;

  return rate * 1.05 * boxes;
};

export default function BuyAddPage() {
  const [rows, setRows] = useState([createEmptyRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [submittedData, setSubmittedData] = useState(null);

  const completedRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.itemName.trim() &&
          row.date &&
          row.rate !== "" &&
          row.itemQuantity !== "" &&
          row.boxQuantity !== "",
      ),
    [rows],
  );

  const totalBuyingValue = useMemo(
    () => completedRows.reduce((sum, row) => sum + getTotalBuyingValue(row), 0),
    [completedRows],
  );

  const totalBoxes = useMemo(
    () =>
      completedRows.reduce(
        (sum, row) => sum + (Number(row.boxQuantity) || 0),
        0,
      ),
    [completedRows],
  );

  const updateRow = (id, field, value) => {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row,
      ),
    );

    setMessage(null);
  };

  const addRow = () => {
    setRows((currentRows) => [...currentRows, createEmptyRow()]);
    setMessage(null);
  };

  const removeRow = (id) => {
    setRows((currentRows) => currentRows.filter((row) => row.id !== id));
    setMessage(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);
    setSubmittedData(null);

    if (completedRows.length === 0) {
      setMessage({
        type: "error",
        text: "Please complete at least one item before submitting.",
      });
      return;
    }

    const invalidRow = completedRows.find(
      (row) =>
        Number(row.rate) < 0 ||
        Number(row.itemQuantity) <= 0 ||
        Number(row.boxQuantity) < 0,
    );

    if (invalidRow) {
      setMessage({
        type: "error",
        text: "Rate and box quantity cannot be negative. Item quantity must be greater than zero.",
      });
      return;
    }

    const incompleteRows = rows.length - completedRows.length;

    if (incompleteRows > 0) {
      setMessage({
        type: "error",
        text: "Please complete or remove every empty row before submitting.",
      });
      return;
    }

    const payload = {
      title: "Gurukrupa Agency - Buy Add",
      date: new Date().toISOString().split("T")[0],
      totalItems: completedRows.length,
      totalBoxes,
      totalBuyingValue: Number(totalBuyingValue.toFixed(2)),
      items: completedRows.map((row) => ({
        date: row.date,
        itemName: row.itemName.trim(),
        rate: Number(row.rate),
        itemQuantity: Number(row.itemQuantity),
        boxQuantity: Number(row.boxQuantity),
        buyingPricePerItem: Number(getBuyingPricePerItem(row).toFixed(2)),
        totalBuyingValue: Number(getTotalBuyingValue(row).toFixed(2)),
      })),
    };

    setIsSubmitting(true);

    try {
      const response = await fetch(DUMMY_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API request failed (${response.status})`);
      }

      const result = await response.json();

      setSubmittedData(result);
      setMessage({
        type: "success",
        text: `Demo submission successful! Dummy API returned ID: ${result.id}.`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.message ||
          "Unable to submit the data. Please check your internet connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page heading */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">
              Gurukrupa Agency
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
              Buy Add
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Add purchase items and calculate their buying value automatically.
            </p>
          </div>

          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-5 py-3 text-sm font-semibold text-amber-300 transition hover:bg-amber-400/20"
          >
            <span className="text-lg">+</span>
            Add New Item
          </button>
        </div>

        {/* Summary cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Total Items</p>
            <p className="mt-3 text-3xl font-bold text-white">
              {completedRows.length}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Completed purchase entries
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Total Box Quantity</p>
            <p className="mt-3 text-3xl font-bold text-white">{totalBoxes}</p>
            <p className="mt-2 text-xs text-slate-500">
              Combined boxes across items
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-900/60 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Total Buying Value</p>
            <p className="mt-3 break-words text-2xl font-bold text-emerald-400 sm:text-3xl">
              {money(totalBuyingValue)}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Rate × 1.05 × box quantity
            </p>
          </div>
        </section>

        {/* Purchase form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/10">
            <div className="flex flex-col gap-2 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-white">
                  Purchase Item Details
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Enter the item information below.
                </p>
              </div>
              <span className="w-fit rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                {rows.length} {rows.length === 1 ? "row" : "rows"}
              </span>
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="bg-slate-950/70">
                  <tr className="text-xs uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-4 font-semibold">Date</th>
                    <th className="px-4 py-4 font-semibold">Item Name</th>
                    <th className="px-4 py-4 font-semibold">Rate (₹)</th>
                    <th className="px-4 py-4 font-semibold">Item Qty</th>
                    <th className="px-4 py-4 font-semibold">Box Qty</th>
                    <th className="px-4 py-4 font-semibold">
                      Buying Price / Item
                    </th>
                    <th className="px-4 py-4 font-semibold">
                      Total Buying Value
                    </th>
                    <th className="px-4 py-4 font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {rows.map((row) => (
                    <tr key={row.id} className="align-top">
                      <td className="px-4 py-4">
                        <input
                          type="date"
                          value={row.date}
                          onChange={(e) =>
                            updateRow(row.id, "date", e.target.value)
                          }
                          required
                          className="w-36 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
                        />
                      </td>

                      <td className="px-4 py-4">
                        <input
                          type="text"
                          value={row.itemName}
                          onChange={(e) =>
                            updateRow(row.id, "itemName", e.target.value)
                          }
                          placeholder="Enter item name"
                          required
                          className="w-44 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-400"
                        />
                      </td>

                      <td className="px-4 py-4">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.rate}
                          onChange={(e) =>
                            updateRow(row.id, "rate", e.target.value)
                          }
                          placeholder="0.00"
                          required
                          className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
                        />
                      </td>

                      <td className="px-4 py-4">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={row.itemQuantity}
                          onChange={(e) =>
                            updateRow(row.id, "itemQuantity", e.target.value)
                          }
                          placeholder="0"
                          required
                          className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
                        />
                      </td>

                      <td className="px-4 py-4">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={row.boxQuantity}
                          onChange={(e) =>
                            updateRow(row.id, "boxQuantity", e.target.value)
                          }
                          placeholder="0"
                          required
                          className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
                        />
                      </td>

                      <td className="px-4 py-4">
                        <div className="min-w-32 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2.5 text-sm font-medium text-amber-300">
                          {money(getBuyingPricePerItem(row))}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="min-w-36 rounded-lg border border-emerald-900/60 bg-emerald-950/30 px-3 py-2.5 text-sm font-semibold text-emerald-400">
                          {money(getTotalBuyingValue(row))}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          disabled={rows.length === 1}
                          title="Remove item"
                          className="rounded-lg border border-red-900/60 px-3 py-2 text-sm text-red-400 transition hover:bg-red-950/50 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile item cards */}
            <div className="space-y-4 p-4 md:hidden">
              {rows.map((row, index) => (
                <div
                  key={row.id}
                  className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">
                      Item {index + 1}
                    </h3>
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length === 1}
                      className="text-sm text-red-400 disabled:opacity-30"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400">Date</label>
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) =>
                        updateRow(row.id, "date", e.target.value)
                      }
                      required
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400">Item Name</label>
                    <input
                      type="text"
                      value={row.itemName}
                      onChange={(e) =>
                        updateRow(row.id, "itemName", e.target.value)
                      }
                      placeholder="Enter item name"
                      required
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400">Rate (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.rate}
                        onChange={(e) =>
                          updateRow(row.id, "rate", e.target.value)
                        }
                        placeholder="0.00"
                        required
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400">
                        Item Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={row.itemQuantity}
                        onChange={(e) =>
                          updateRow(row.id, "itemQuantity", e.target.value)
                        }
                        placeholder="0"
                        required
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="col-span-2 space-y-1.5">
                      <label className="text-xs text-slate-400">
                        Box Quantity
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={row.boxQuantity}
                        onChange={(e) =>
                          updateRow(row.id, "boxQuantity", e.target.value)
                        }
                        placeholder="0"
                        required
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                      <p className="text-xs text-slate-400">
                        Buying Price / Item
                      </p>
                      <p className="mt-1 font-semibold text-amber-300">
                        {money(getBuyingPricePerItem(row))}
                      </p>
                    </div>

                    <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 p-3">
                      <p className="text-xs text-slate-400">
                        Total Buying Value
                      </p>
                      <p className="mt-1 font-semibold text-emerald-400">
                        {money(getTotalBuyingValue(row))}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Grand total */}
            <div className="flex flex-col gap-2 border-t border-slate-800 bg-slate-950/60 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-400">
                  Grand Total Buying Value
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Includes the additional 5% in the rate calculation.
                </p>
              </div>
              <p className="text-2xl font-bold text-emerald-400">
                {money(totalBuyingValue)}
              </p>
            </div>
          </section>

          {/* API status */}
          {message && (
            <div
              role="status"
              aria-live="polite"
              className={`rounded-xl border px-4 py-3 text-sm ${
                message.type === "success"
                  ? "border-emerald-800 bg-emerald-950/40 text-emerald-300"
                  : "border-red-800 bg-red-950/40 text-red-300"
              }`}
            >
              {message.text}
              {submittedData && (
                <p className="mt-1 text-xs text-emerald-400">
                  Demo response received. This API does not permanently save
                  your purchase records.
                </p>
              )}
            </div>
          )}

          {/* Submit actions */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setRows([createEmptyRow()]);
                setMessage(null);
                setSubmittedData(null);
              }}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-700 px-6 py-3 font-semibold text-slate-300 transition hover:bg-slate-900 disabled:opacity-50"
            >
              Clear Form
            </button>

            <button
              type="submit"
              disabled={isSubmitting || completedRows.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-8 py-3 font-bold text-slate-950 shadow-lg shadow-amber-400/10 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
                  Submitting...
                </>
              ) : (
                <>
                  <span>✓</span>
                  Submit Purchase
                </>
              )}
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-slate-600">
          Demo mode · Submitted data is sent to JSONPlaceholder, not stored in
          your Gurukrupa Agency database.
        </p>
      </div>
    </main>
  );
}
