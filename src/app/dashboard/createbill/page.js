"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import LoadingAnimation from "@/components/LoadingAnimation";

const getLocalDateInputValue = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
};

const CreateBill = () => {
  const [items, setItems] = useState([
    {
      id: "",
      quantity: 0,
      boxQty: 0,
      rate: 0,
      amount: 0,
      originalRate: 0,
    },
  ]);

  const [client, setClient] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [itemOptions, setItemOptions] = useState([]);
  const [clients, setClients] = useState([]);
  const [invoiceNumber, setInvoiceNumber] = useState(0);
  const [issueDate, setIssueDate] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [total, setTotal] = useState(0);
  const [initialDataLoading, setInitialDataLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  // Fetch clients, items, and next invoice number
  useEffect(() => {
    setIssueDate(getLocalDateInputValue());

    const fetchClients = async () => {
      try {
        const res = await axios.get("/api/client");

        if (res.data?.data) {
          setClients(res.data.data);
        }
      } catch (error) {
        console.error("Error fetching clients:", error);
      }
    };

    const fetchItems = async () => {
      try {
        const res = await axios.get("/api/items?unique=true&bill=true");
        if (res.data?.data) {
          setItemOptions(res.data.data);
        }
      } catch (error) {
        console.error("Error fetching items:", error);
      }
    };

    const fetchInvoiceNumber = async () => {
      try {
        const { data } = await axios.get("/api/bill/last");
        const nextNumber = data?.data || 0;

        setInvoiceNumber(nextNumber);
      } catch (error) {
        console.log("Error fetching invoice number:", error);
      }
    };

    Promise.all([fetchClients(), fetchItems(), fetchInvoiceNumber()]).finally(
      () => setInitialDataLoading(false),
    );
  }, []);

  const selectedClient = clients.find((entry) => entry._id === client);
  const clientAddresses = [
    ...new Map(
      clients
        .map((entry) => String(entry.address || "").trim())
        .filter(Boolean)
        .map((address) => [address.toLocaleLowerCase("en-IN"), address]),
    ).values(),
  ].sort((first, second) => first.localeCompare(second, "en-IN"));
  const clientsAtSelectedAddress = selectedAddress
    ? clients.filter(
        (entry) =>
          String(entry.address || "")
            .trim()
            .toLocaleLowerCase("en-IN") ===
          selectedAddress.toLocaleLowerCase("en-IN"),
      )
    : [];

  // Update item rates and amounts when tax rate changes
  useEffect(() => {
    console.log(items);
    const updatedItems = items.map((item) => {
      const origRate = item.originalRate;

      const newRate = taxRate > 0 ? origRate / (1 + taxRate / 100) : origRate;
      console.log(newRate, origRate);
      return {
        ...item,
        rate: parseFloat(newRate.toFixed(2)),
        originalRate: origRate,
        amount: (item.quantity || 0) * newRate * item.boxQty,
      };
    });
    console.log(updatedItems);
    setItems(updatedItems);
    // Preserving the existing tax calculation behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taxRate]);

  // Calculate subtotal, tax, and total
  useEffect(() => {
    let newSubtotal = 0;

    items.forEach((item) => {
      newSubtotal += item.amount;
    });

    const taxableAmount = Math.max(0, newSubtotal - discount);
    const calculatedTax = (taxableAmount * taxRate) / 100;

    setSubtotal(newSubtotal);
    setTaxAmount(calculatedTax);
    setTotal(taxableAmount + calculatedTax);
  }, [items, taxRate, discount]);

  // Handle item input changes

  const handleChange = (index, field, value) => {
    const updated = [...items];

    if (field === "id") {
      const selectedItem = itemOptions.find((cur) => cur._id === value);

      if (!selectedItem) return;

      updated[index] = {
        ...updated[index],
        id: selectedItem._id, // Store ID for dropdown
        itemname: selectedItem.itemname, // Keep product name
        box: selectedItem.box,
        quantity: selectedItem.itemperbox || 0,
        originalRate: selectedItem.originalrate || 0,
        rate: selectedItem.originalrate || 0,
      };
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
    }

    if (field === "boxQty" && updated[index].box !== undefined) {
      updated[index].boxQty = Math.min(Number(value) || 0, updated[index].box);
    }

    if (field === "rate") {
      updated[index].originalRate = Number(value) || 0;
    }

    updated[index].amount =
      (Number(updated[index].quantity) || 0) *
      (Number(updated[index].rate) || 0) *
      Number(updated[index].boxQty);

    setItems(updated);
  };

  const handleFocus = (index, field) => {
    const updated = [...items];

    if (updated[index][field] === 0) {
      updated[index][field] = "";
    }

    setItems(updated);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: "",
        quantity: 0,
        boxQty: 0,
        rate: 0,
        amount: 0,
        originalRate: 0,
      },
    ]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Submit invoice
  const handleSubmit = async () => {
    setSubmitError("");
    
    const filteredItems = items.filter(
      (item) => item.id && item.amount > 0 && item.boxQty > 0,
    );

    if (!client || !issueDate) {
      toast.error("Please select a customer and invoice date.");
      return;
    }
    if (!filteredItems.length) {
      toast.error(
        "Add at least one product with a box quantity before saving.",
      );
      return;   
    }
    if (!invoiceNumber) {
      toast.error(
        "The next invoice number could not be loaded. Refresh and try again.",
      );
      return;
    }

    setIsLoading(true);

    try {
      const res = await axios.post("/api/bill", {
        client,
        invoiceNumber,
        issueDate,
        items: filteredItems,
        subtotal,
        discount,
        tax: taxAmount,
        total,
        taxRate,
      });

      toast("Invoice Created Successfully !! ");
      router.push(`/dashboard`);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to save the invoice. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20";

  const labelClass = "mb-2 block text-sm font-medium text-slate-300";

  const formatCurrency = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <main className="min-h-screen w-full bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/95">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
                Gurukrupa Agency
              </p>
              <h1 className="mt-1 text-xl font-bold sm:text-2xl">
                Create New Invoice
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-400/10 text-xl text-amber-400">
              ₹
            </div>
            <div>
              <p className="text-xs text-slate-400">Invoice Number</p>
              <p className="font-bold text-white">#{invoiceNumber}</p>
            </div>
          </div>
        </div>
      </header>

      {initialDataLoading && (
        <div
          className="mx-auto flex w-fit items-center gap-2 px-4 py-3 text-sm text-slate-300"
          role="status"
        >
          <LoadingAnimation size={36} label="Loading invoice data" />
          Loading customers, products, and invoice number…
        </div>
      )}

      {/* Main content */}
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Page introduction */}
        <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Invoice Details
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Enter client information, add products, and review the invoice
              total.
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-300">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            New Invoice
          </div>
        </section>

        {/* Invoice information */}
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/10">
          <div className="border-b border-slate-800 px-5 py-5 sm:px-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-lg text-amber-400">
                01
              </div>

              <div>
                <h2 className="font-semibold text-white">
                  Invoice Information
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Select the client and invoice date.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-7 lg:grid-cols-3">
            <div>
              <label className={labelClass}>Invoice Number</label>
              <input
                type="text"
                value={invoiceNumber}
                readOnly
                className={`${inputClass} cursor-not-allowed border-slate-800 bg-slate-950 text-amber-300`}
              />
              <p className="mt-2 text-xs text-slate-500">
                Generated by your existing invoice-number API.
              </p>
            </div>

            <div>
              <label className={labelClass}>
                Client Address <span className="text-amber-400">*</span>
              </label>
              <select
                className={inputClass}
                value={selectedAddress}
                onChange={(event) => {
                  setSelectedAddress(event.target.value);
                  setClient(null);
                }}
                required
                aria-label="Filter clients by address"
              >
                <option value="">Select an address first</option>
                {clientAddresses.map((address) => (
                  <option key={address} value={address}>
                    {address}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Client Name <span className="text-amber-400">*</span>
              </label>
              <select
                className={inputClass}
                value={client || ""}
                disabled={!selectedAddress}
                required
                onChange={(event) => setClient(event.target.value || null)}
              >
                <option value="">
                  {selectedAddress ? "Select a client" : "Select address first"}
                </option>
                {clientsAtSelectedAddress.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.clientname}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <label className={labelClass}>
                Issue Date <span className="text-amber-400">*</span>
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </section>
        {Number(selectedClient?.creditBalance || 0) > 0 && (
          <p
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          >
            Available customer credit:{" "}
            {formatCurrency(selectedClient.creditBalance)}. Up to{" "}
            {formatCurrency(
              Math.min(Number(selectedClient.creditBalance), total),
            )}{" "}
            will apply automatically to this invoice.
          </p>
        )}

        {/* Invoice items */}
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/10">
          <div className="flex flex-col gap-4 border-b border-slate-800 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-lg text-amber-400">
                02
              </div>

              <div>
                <h2 className="font-semibold text-white">Invoice Items</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Add products, quantities, and rates.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300 active:scale-[0.98]"
            >
              <span className="text-lg leading-none">+</span>
              Add Item
            </button>
          </div>

          <div className="space-y-5 p-5 sm:p-7">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-sm font-bold text-amber-400">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <h3 className="text-sm font-semibold text-white">
                      Item {idx + 1}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    disabled={items.length === 1}
                    aria-label={`Remove item ${idx + 1}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-slate-400 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
                  {/* Description */}
                  <div className="sm:col-span-2 lg:col-span-4">
                    <label className={labelClass}>Product Description</label>

                    <select
                      value={item.id}
                      onChange={(e) => handleChange(idx, "id", e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select item</option>

                      {itemOptions.map((opt) => (
                        <option key={opt._id} value={opt._id}>
                          {opt.itemname}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  {/* <div className="lg:col-span-2">
                    <label className={labelClass}>Quantity</label>
                    <input
                      type="number"
                      min="0"
                      value={item.quantity}
                      onFocus={() => handleFocus(idx, "quantity")}
                      onChange={(e) =>
                        handleChange(
                          idx,
                          "quantity",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className={inputClass}
                      placeholder="0"
                    />
                  </div> */}

                  {/* Box quantity */}
                  <div className="lg:col-span-2">
                    <label className={labelClass}>Box Qty</label>
                    <input
                      type="number"
                      min="0"
                      value={item.boxQty || ""}
                      onChange={(e) =>
                        handleChange(
                          idx,
                          "boxQty",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className={inputClass}
                      placeholder="0"
                    />
                  </div>

                  {/* Rate */}
                  <div className="lg:col-span-2">
                    <label className={labelClass}>Rate (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.rate}
                      onFocus={() => handleFocus(idx, "rate")}
                      onChange={(e) =>
                        handleChange(
                          idx,
                          "rate",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className={inputClass}
                      placeholder="0.00"
                    />
                  </div>

                  {/* Amount */}
                  <div className="lg:col-span-2">
                    <label className={labelClass}>Amount</label>
                    <div className="flex min-h-[48px] items-center rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-3 font-semibold text-amber-300">
                      {formatCurrency(item.amount)}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-700 px-4 py-4">
              <p className="text-sm text-slate-400">Total line items</p>
              <p className="font-semibold text-white">
                {items.length} {items.length === 1 ? "item" : "items"}
              </p>
            </div>
          </div>
        </section>

        {/* Invoice summary */}
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/10">
          <div className="border-b border-slate-800 px-5 py-5 sm:px-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-lg text-amber-400">
                03
              </div>

              <div>
                <h2 className="font-semibold text-white">Invoice Summary</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Review tax and payable amount.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 p-5 sm:p-7 lg:grid-cols-2">
            {/* Tax settings */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
              <label className={labelClass}>Tax Rate (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className={inputClass}
              />
              <p className="mt-3 text-xs leading-5 text-slate-500">
                GST is calculated after discount.
              </p>
              <label
                className={`${labelClass} mt-5`}
                htmlFor="invoice-discount"
              >
                Discount (₹)
              </label>
              <input
                id="invoice-discount"
                type="number"
                min="0"
                max={subtotal}
                step="0.01"
                value={discount}
                onChange={(e) =>
                  setDiscount(
                    Math.min(subtotal, Math.max(0, Number(e.target.value))),
                  )
                }
                className={inputClass}
              />
            </div>

            {/* Amount summary */}
            <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/70 p-5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-400">
                  Subtotal (excluding tax)
                </span>
                <span className="font-medium text-white">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-400">Discount</span>
                <span className="font-medium text-white">
                  − {formatCurrency(discount)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-400">Tax ({taxRate}%)</span>
                <span className="font-medium text-white">
                  {formatCurrency(taxAmount)}
                </span>
              </div>

              <div className="border-t border-slate-800 pt-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Total Payable
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Including applicable tax
                    </p>
                  </div>

                  <p className="text-2xl font-bold tracking-tight text-amber-400 sm:text-3xl">
                    {formatCurrency(total)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
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
          </div>
        )}

        {/* Actions */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/10 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-white">
                Ready to create your invoice?
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Verify the client, items, and final amount before saving.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              {submitError && (
                <p
                  role="alert"
                  className="mb-3 w-full rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {submitError}
                </p>
              )}
              <button
                type="button"
                onClick={() => (window.location.href = "/dashboard")}
                className="w-full rounded-xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white sm:w-auto"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className={`w-full rounded-xl px-7 py-3 text-sm font-bold transition sm:w-auto ${
                  isLoading
                    ? "cursor-not-allowed bg-slate-700 text-slate-400"
                    : "bg-amber-400 text-slate-950 hover:bg-amber-300 active:scale-[0.98]"
                }`}
              >
                {isLoading ? <span className="inline-flex items-center gap-2"><LoadingAnimation size={28} label="Saving invoice" /> Saving Invoice...</span> : "Create Invoice"}
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="pb-4 pt-2 text-center text-xs text-slate-600">
          Gurukrupa Agency · Invoice Management
        </footer>
      </div>
    </main>
  );
};

export default CreateBill;
