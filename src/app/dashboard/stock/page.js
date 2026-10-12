
"use client";

import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";

const Stock = () => {
  const [items, setItems] = useState([]);
  const [loadData, setLoadData] = useState(true);
  const [form, setForm] = useState({ name: "", quantity: "" });
  const [stockInput, setStockInput] = useState({});
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");

  // Fetch stock items
  const fetchData = useCallback(async () => {
    setLoadData(true);
    setError("");

    try {
      const { data } = await axios.get("/api/items");
      setItems(data.data || []);
    } catch (e) {
      console.error("Error fetching stock:", e);
      setError("Unable to load stock items. Please try again.");
    } finally {
      setLoadData(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Add a new stock item
  const handleSubmit = async (e) => {
    e.preventDefault();

    const name = form.name.trim();
    const quantity = Number(form.quantity);

    if (!name || form.quantity === "" || !Number.isFinite(quantity) || quantity < 0) {
      alert("Please enter a valid item name and quantity.");
      return;
    }

    const alreadyExists = items.some(
      (item) =>
        String(item.itemname ?? item.name ?? "").trim().toLowerCase() ===
        name.toLowerCase()
    );

    if (alreadyExists) {
      alert("Item with this name already exists.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await axios.post("/api/items", {
        itemname: name,
        quantity: form.quantity,
      });

      setForm({ name: "", quantity: "" });
      setShowForm(false);
      await fetchData();
    } catch (e) {
      console.error("Error adding item:", e);
      setError("Unable to add the item. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Update an item's quantity
  const updateStock = async (id, direction) => {
    const value = Number(stockInput[id] || 0);

    if (!Number.isFinite(value) || value <= 0) {
      alert("Please enter a quantity greater than zero.");
      return;
    }

    const item = items.find((current) => current._id === id);

    if (!item) return;

    const currentQuantity = Number(item.quantity) || 0;
    const quantity =
      direction === "increase"
        ? currentQuantity + value
        : Math.max(0, currentQuantity - value);

    setProcessingId(id);
    setError("");

    try {
      await axios.put("/api/items", {
        id,
        quantity,
      });

      setStockInput((prev) => ({
        ...prev,
        [id]: "",
      }));

      await fetchData();
    } catch (e) {
      console.error("Error updating stock:", e);
      setError("Unable to update stock. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  const increaseStock = (id) => updateStock(id, "increase");
  const decreaseStock = (id) => updateStock(id, "decrease");

  // Delete a stock item
  const deleteItem = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this stock item?"
    );

    if (!confirmed) return;

    setProcessingId(id);
    setError("");

    try {
      await axios.delete(`/api/items?id=${id}`);
      await fetchData();
    } catch (e) {
      console.error("Error deleting item:", e);
      setError("Unable to delete this item. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  const totalStock = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0),
        0
      ),
    [items]
  );

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    return items.filter((item) =>
      String(item.itemname ?? item.name ?? "")
        .toLowerCase()
        .includes(term)
    );
  }, [items, search]);

  const lowStockItems = items.filter(
    (item) => Number(item.quantity) <= 5
  ).length;

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
                Stock Management
              </h1>

              <p className="mt-2 text-sm text-slate-400">
                Manage inventory, update quantities, and monitor stock levels.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowForm((prev) => !prev)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
            >
              {showForm ? (
                <>
                  <span className="text-lg leading-none">×</span>
                  Cancel
                </>
              ) : (
                <>
                  <span className="text-xl leading-none">+</span>
                  Add New Item
                </>
              )}
            </button>
          </div>
        </header>

        {/* Summary Cards */}
        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400">Total Products</p>
                <p className="mt-2 text-3xl font-bold">
                  {loadData ? "—" : items.length}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Unique inventory items
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
                    d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m4.5 7.5 7.5 4 7.5-4M12 12v8.5"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400">Total Stock Quantity</p>
                <p className="mt-2 text-3xl font-bold text-amber-400">
                  {loadData ? "—" : totalStock.toLocaleString("en-IN")}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Combined quantity across items
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
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
                    d="M4 17 9 12l4 4 7-8"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14 8h6v6"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400">Low Stock Items</p>
                <p className="mt-2 text-3xl font-bold text-orange-300">
                  {loadData ? "—" : lowStockItems}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Items with quantity of 5 or less
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-400/10 text-orange-300">
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
                    d="M12 3 22 20H2L12 3Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v5m0 3h.01"
                  />
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* Add Item Form */}
        {showForm && (
          <section className="mb-6 overflow-hidden rounded-2xl border border-amber-400/20 bg-slate-900 shadow-xl">
            <div className="border-b border-slate-800 px-5 py-4 sm:px-6">
              <h2 className="text-lg font-bold">Add New Stock Item</h2>
              <p className="mt-1 text-sm text-slate-400">
                Enter the item name and its initial quantity.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6"
            >
              <div>
                <label
                  htmlFor="item-name"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Item Name
                </label>
                <input
                  id="item-name"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Cement Bag"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="item-quantity"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Initial Quantity
                </label>
                <input
                  id="item-quantity"
                  type="number"
                  name="quantity"
                  min="0"
                  step="any"
                  value={form.quantity}
                  onChange={handleChange}
                  placeholder="Enter quantity"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10"
                  required
                />
              </div>

              <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setForm({ name: "", quantity: "" });
                  }}
                  className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Adding Item..." : "Add Item"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Error Message */}
        {error && (
          <div
            role="alert"
            className="mb-5 flex flex-col gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm text-red-300">{error}</p>
            <button
              type="button"
              onClick={fetchData}
              disabled={loadData}
              className="self-start rounded-lg border border-red-400/30 px-3 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-400/10 disabled:opacity-50 sm:self-auto"
            >
              Reload Stock
            </button>
          </div>
        )}

        {/* Search and Inventory */}
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="flex flex-col gap-4 border-b border-slate-800 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold">Inventory Items</h2>
              <p className="mt-1 text-sm text-slate-400">
                Search products and manage their quantities.
              </p>
            </div>

            <div className="relative w-full lg:max-w-sm">
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
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search stock items..."
                aria-label="Search stock items"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
            <p className="text-sm text-slate-400">
              Showing{" "}
              <span className="font-semibold text-white">
                {loadData ? "…" : filteredItems.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-white">{items.length}</span>{" "}
              items
            </p>

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-sm font-medium text-amber-400 transition hover:text-amber-300"
              >
                Clear search
              </button>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[850px] text-left">
              <thead className="border-y border-slate-800 bg-slate-950/70">
                <tr className="text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-4 font-semibold">Item Name</th>
                  <th className="px-5 py-4 text-center font-semibold">
                    Available Quantity
                  </th>
                  <th className="px-5 py-4 font-semibold">Manage Stock</th>
                  <th className="px-5 py-4 text-center font-semibold">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {loadData ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-16 text-center text-slate-400"
                    >
                      <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-amber-400" />
                      Loading inventory...
                    </td>
                  </tr>
                ) : filteredItems.length > 0 ? (
                  filteredItems.map((item) => {
                    const quantity = Number(item.quantity) || 0;
                    const isLowStock = quantity <= 5;
                    const isProcessing = processingId === item._id;

                    return (
                      <tr
                        key={item._id}
                        className="transition hover:bg-slate-800/40"
                      >
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

                            <div>
                              <p className="font-semibold text-white">
                                {item.itemname || item.name}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Inventory item
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span
                            className={`inline-flex min-w-16 items-center justify-center rounded-lg px-3 py-1.5 text-sm font-bold ${
                              isLowStock
                                ? "bg-orange-400/10 text-orange-300"
                                : "bg-emerald-400/10 text-emerald-300"
                            }`}
                          >
                            {quantity}
                          </span>
                          {isLowStock && (
                            <p className="mt-1 text-xs text-orange-300">
                              Low stock
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              aria-label={`Quantity to adjust for ${item.itemname}`}
                              placeholder="Qty"
                              value={stockInput[item._id] || ""}
                              onChange={(e) =>
                                setStockInput((prev) => ({
                                  ...prev,
                                  [item._id]: e.target.value,
                                }))
                              }
                              className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-center text-sm text-white outline-none focus:border-amber-400"
                            />

                            <button
                              type="button"
                              onClick={() => increaseStock(item._id)}
                              disabled={isProcessing || loadData}
                              aria-label={`Increase ${item.itemname} stock`}
                              className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-lg font-bold text-emerald-300 ring-1 ring-emerald-500/20 transition hover:bg-emerald-500/20 disabled:opacity-40"
                            >
                              +
                            </button>

                            <button
                              type="button"
                              onClick={() => decreaseStock(item._id)}
                              disabled={isProcessing || loadData}
                              aria-label={`Decrease ${item.itemname} stock`}
                              className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10 text-lg font-bold text-orange-300 ring-1 ring-orange-500/20 transition hover:bg-orange-500/20 disabled:opacity-40"
                            >
                              −
                            </button>

                            {isProcessing && (
                              <span className="text-xs text-slate-400">
                                Updating...
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => deleteItem(item._id)}
                            disabled={isProcessing}
                            className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/15 disabled:opacity-40"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-16 text-center"
                    >
                      <p className="font-semibold text-white">
                        No stock items found
                      </p>
                      <p className="mt-2 text-sm text-slate-400">
                        {search
                          ? "Try another search term."
                          : "Add your first inventory item to get started."}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>

              <tfoot className="border-t border-slate-800 bg-slate-950/70">
                <tr>
                  <td className="px-5 py-4 font-semibold text-slate-300">
                    Total Stock
                  </td>
                  <td className="px-5 py-4 text-center text-lg font-bold text-amber-400">
                    {loadData ? "—" : totalStock.toLocaleString("en-IN")}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-4 p-4 md:hidden">
            {loadData ? (
              <div className="py-12 text-center text-slate-400">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-amber-400" />
                Loading inventory...
              </div>
            ) : filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                const quantity = Number(item.quantity) || 0;
                const isLowStock = quantity <= 5;
                const isProcessing = processingId === item._id;

                return (
                  <article
                    key={item._id}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
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
                              d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m4.5 7.5 7.5 4 7.5-4M12 12v8.5"
                            />
                          </svg>
                        </div>

                        <div className="min-w-0">
                          <h3 className="break-words font-bold text-white">
                            {item.itemname || item.name}
                          </h3>
                          <p className="mt-1 text-xs text-slate-500">
                            Inventory item
                          </p>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-bold ${
                          isLowStock
                            ? "bg-orange-400/10 text-orange-300"
                            : "bg-emerald-400/10 text-emerald-300"
                        }`}
                      >
                        {quantity} units
                      </span>
                    </div>

                    {isLowStock && (
                      <p className="mt-3 text-xs font-medium text-orange-300">
                        Low stock — consider replenishing this item.
                      </p>
                    )}

                    <div className="mt-4 border-t border-slate-800 pt-4">
                      <label
                        htmlFor={`stock-${item._id}`}
                        className="mb-2 block text-sm font-medium text-slate-300"
                      >
                        Adjust quantity
                      </label>

                      <div className="flex items-center gap-2">
                        <input
                          id={`stock-${item._id}`}
                          type="number"
                          min="0"
                          step="any"
                          placeholder="Enter quantity"
                          value={stockInput[item._id] || ""}
                          onChange={(e) =>
                            setStockInput((prev) => ({
                              ...prev,
                              [item._id]: e.target.value,
                            }))
                          }
                          className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white outline-none focus:border-amber-400"
                        />

                        <button
                          type="button"
                          onClick={() => increaseStock(item._id)}
                          disabled={isProcessing || loadData}
                          aria-label={`Increase ${item.itemname} stock`}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-xl font-bold text-emerald-300 ring-1 ring-emerald-500/20 transition hover:bg-emerald-500/20 disabled:opacity-40"
                        >
                          +
                        </button>

                        <button
                          type="button"
                          onClick={() => decreaseStock(item._id)}
                          disabled={isProcessing || loadData}
                          aria-label={`Decrease ${item.itemname} stock`}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-xl font-bold text-orange-300 ring-1 ring-orange-500/20 transition hover:bg-orange-500/20 disabled:opacity-40"
                        >
                          −
                        </button>
                      </div>

                      {isProcessing && (
                        <p className="mt-2 text-xs text-slate-400">
                          Updating stock...
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() => deleteItem(item._id)}
                        disabled={isProcessing}
                        className="mt-4 w-full rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/15 disabled:opacity-40"
                      >
                        Delete Item
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="py-12 text-center">
                <p className="font-semibold text-white">
                  No stock items found
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  {search
                    ? "Try another search term."
                    : "Add your first inventory item to get started."}
                </p>
              </div>
            )}

            {!loadData && filteredItems.length > 0 && (
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
                <p className="text-sm text-slate-400">
                  Total stock quantity
                </p>
                <p className="mt-1 text-2xl font-bold text-amber-400">
                  {totalStock.toLocaleString("en-IN")}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-10 border-t border-slate-800 py-5 text-center text-xs text-slate-500">
          Gurukrupa Agency · Stock Management
        </footer>
      </div>
    </div>
  );
};

export default Stock;
