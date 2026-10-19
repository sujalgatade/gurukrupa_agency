"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { History } from "lucide-react";
import LoadingAnimation from "@/components/LoadingAnimation";

const PURCHASE_GST_RATE = 5;

const createEmptyRow = () => ({
  id: `${Date.now()}-${Math.random()}`,
  date: new Date().toISOString().split("T")[0],
  itemname: "",
  rate: "",
  itemperbox: "",
  box: "",
});

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const getBaseBuyingValue = (row) => {
  const rate = Number(row.rate) || 0;
  const boxes = Number(row.box) || 0;

  return Number((rate * boxes).toFixed(2));
};

const getBuyingPricePerItem = (row) => {
  const rate = Number(row.rate) || 0;
  const quantity = Number(row.itemperbox) || 0;

  if (quantity <= 0) return 0;

  const rateWithGst = rate * (1 + PURCHASE_GST_RATE / 100);
  return rateWithGst / quantity;
};

const getTotalBuyingValue = (row) => {
  const baseValue = getBaseBuyingValue(row);
  return Number((baseValue * (1 + PURCHASE_GST_RATE / 100)).toFixed(2));
};

export default function BuyAddPage() {
  const [rows, setRows] = useState([createEmptyRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [purchasesLoading, setPurchasesLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [supplierCreditBalance, setSupplierCreditBalance] = useState(0);
  const [supplierName, setSupplierName] = useState("");
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [supplierPaymentAmounts, setSupplierPaymentAmounts] = useState({});
  const [supplierPaymentMethods, setSupplierPaymentMethods] = useState({});
  const [recordingSupplierPayment, setRecordingSupplierPayment] =
    useState(null);
  const [returnOpenId, setReturnOpenId] = useState(null);
  const [purchaseReturnForms, setPurchaseReturnForms] = useState({});
  const [recordingPurchaseReturn, setRecordingPurchaseReturn] = useState(null);

  useEffect(() => {
    const fetchitem = async () => {
      try {
        const { data } = await axios.get("/api/items?unique=true&&bill=true");
        let r = data.data.map((cur) => ({
          ...cur,
          id: cur._id,
          date: new Date(cur.date).toISOString().split("T")[0],
        }));
        console.log(data.data);
        setRows(r);
      } catch (e) {
        console.log(e);
      }
    };
    fetchitem();
  }, []);
  useEffect(() => {
    fetch("/api/buy-bill", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((result) => {
        setPurchases(Array.isArray(result.data) ? result.data : []);
        setSupplierCreditBalance(Number(result.supplierCreditBalance || 0));
      })
      .catch(() => setPurchases([]))
      .finally(() => setPurchasesLoading(false));
  }, []);
  const completedRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.itemname.trim() &&
          row.date &&
          row.rate !== "" &&
          row.itemperbox !== "" &&
          row.box !== "",
      ),
    [rows],
  );

  const subtotal = useMemo(
    () => completedRows.reduce((sum, row) => sum + getBaseBuyingValue(row), 0),
    [completedRows],
  );
  const taxAmount = Number(
    completedRows
      .reduce(
        (sum, row) => sum + getTotalBuyingValue(row) - getBaseBuyingValue(row),
        0,
      )
      .toFixed(2),
  );
  const purchaseTotal = Number((subtotal + taxAmount).toFixed(2));

  const totalBoxes = useMemo(
    () => completedRows.reduce((sum, row) => sum + (Number(row.box) || 0), 0),
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

  const recordSupplierPayment = async (purchase) => {
    const due = Math.max(
      0,
      Number(purchase.total || 0) -
        Number(purchase.paidAmount || 0) -
        Number(purchase.returnedAmount || 0) -
        Number(purchase.supplierCreditApplied || 0),
    );
    const amount = Number(supplierPaymentAmounts[purchase._id]);
    const method = supplierPaymentMethods[purchase._id] || "Cash";
    if (!Number.isFinite(amount) || amount <= 0 || amount > due) {
      setMessage({
        type: "error",
        text: `Enter a payment from ₹0.01 to ${money(due)}.`,
      });
      return;
    }
    setRecordingSupplierPayment(purchase._id);
    try {
      const response = await fetch(`/api/buy-bill?id=${purchase._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, method }),
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Payment could not be recorded.");
      setPurchases((current) =>
        current.map((entry) =>
          entry._id === purchase._id ? result.data : entry,
        ),
      );
      setSupplierCreditBalance(Number(result.supplierCreditBalance || 0));
      setSupplierPaymentAmounts((current) => ({
        ...current,
        [purchase._id]: "",
      }));
      setMessage({ type: "success", text: "Supplier payment recorded." });
    } catch (exception) {
      setMessage({
        type: "error",
        text: exception.message || "Unable to record supplier payment.",
      });
    } finally {
      setRecordingSupplierPayment(null);
    }
  };

  const recordPurchaseReturn = async (purchase) => {
    const form = purchaseReturnForms[purchase._id] || {
      itemIndex: "",
      boxes: "1",
      reason: "",
    };
    const itemIndex = Number(form.itemIndex);
    const boxes = Number(form.boxes);
    if (
      form.itemIndex === "" ||
      !Number.isInteger(itemIndex) ||
      itemIndex < 0 ||
      !Number.isInteger(boxes) ||
      boxes < 1 ||
      String(form.reason || "").trim().length < 3
    ) {
      setMessage({
        type: "error",
        text: "Select an item, enter the box quantity and return reason.",
      });
      return;
    }
    setRecordingPurchaseReturn(purchase._id);
    try {
      const response = await fetch("/api/purchase-return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseId: purchase._id,
          itemIndex,
          boxes,
          reason: form.reason,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(
          result.message || "Purchase return could not be saved.",
        );
      setPurchases((current) =>
        current.map((entry) =>
          entry._id === purchase._id ? result.data : entry,
        ),
      );
      setReturnOpenId(null);
      setPurchaseReturnForms((current) => ({
        ...current,
        [purchase._id]: { itemIndex: "", boxes: "1", reason: "" },
      }));
      setMessage({
        type: "success",
        text: "Purchase return saved and stock reduced.",
      });
    } catch (exception) {
      setMessage({
        type: "error",
        text: exception.message || "Unable to record purchase return.",
      });
    } finally {
      setRecordingPurchaseReturn(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);
    if (completedRows.length === 0) {
      setMessage({
        type: "error",
        text: "Please complete at least one item before submitting.",
      });
      return;
    }
    if (!supplierName.trim()) {
      setMessage({
        type: "error",
        text: "Enter the supplier name before saving this purchase.",
      });
      return;
    }

    const invalidRow = completedRows.find(
      (row) =>
        Number(row.rate) < 0 ||
        Number(row.itemperbox) <= 0 ||
        Number(row.box) < 1,
    );

    if (invalidRow) {
      setMessage({
        type: "error",
        text: "Rate cannot be negative. Box quantity and pieces per box must be greater than zero.",
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
      supplierName,
      supplierInvoiceNumber,
      date: new Date().toISOString().split("T")[0],
      taxRate: PURCHASE_GST_RATE,
      paidAmount: Number(paidAmount) || 0,
      paymentMethod,
      items: completedRows.map((row) => ({
        date: row.date,
        itemname: row.itemname.trim(),
        rate: Number(row.rate),
        itemperbox: Number(row.itemperbox),
        box: Number(row.box),
        amount: getBaseBuyingValue(row),
      })),
    };

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/buy-bill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Purchase could not be saved.");
      setMessage({
        type: "success",
        text: "Purchase saved and stock updated.",
      });
      setRows([createEmptyRow()]);
      setSupplierInvoiceNumber("");
      setPaidAmount("");
      const saved = await fetch("/api/buy-bill", { cache: "no-store" }).then(
        (response) => response.json(),
      );
      setPurchases(Array.isArray(saved.data) ? saved.data : []);
      setSupplierCreditBalance(Number(saved.supplierCreditBalance || 0));
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
             <span className="h-2 w-2 rounded-full bg-amber-400" />
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">
                  Gurukrupa Agency
                </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
              Purchased Bill 
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Add purchase items and calculate their buying value automatically.
            </p>
          </div>
          <Link
            href="/dashboard/buy/history"
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-300 transition hover:border-amber-300 hover:bg-amber-400/15 sm:self-auto"
          >
            <History size={18} />
            Purchase History
          </Link>
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
              {money(purchaseTotal)}
            </p>
            <p className="mt-2 text-xs text-slate-500">Includes fixed 5% GST</p>
          </div>
        </section>

        {/* Purchase form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label
                htmlFor="supplier-name"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Supplier name
              </label>
              <input
                id="supplier-name"
                required
                value={supplierName}
                onChange={(event) => setSupplierName(event.target.value)}
                autoComplete="organization"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
                placeholder="Supplier or company"
              />
            </div>
            <div>
              <label
                htmlFor="supplier-invoice"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Supplier invoice number
              </label>
              <input
                id="supplier-invoice"
                value={supplierInvoiceNumber}
                onChange={(event) =>
                  setSupplierInvoiceNumber(event.target.value)
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
                placeholder="Invoice / bill number"
              />
            </div>
            <div>
              <label
                htmlFor="purchase-gst"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                GST rate (fixed)
              </label>
              <input
                id="purchase-gst"
                type="text"
                value={`${PURCHASE_GST_RATE}%`}
                readOnly
                aria-readonly="true"
                className="w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-300"
              />
            </div>
            <div>
              <label
                htmlFor="purchase-paid"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Paid to supplier (₹)
              </label>
              <input
                id="purchase-paid"
                type="number"
                min="0"
                step="0.01"
                value={paidAmount}
                onChange={(event) => setPaidAmount(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
                placeholder="0.00"
              />
            </div>
            <div>
              <label
                htmlFor="purchase-method"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Payment method
              </label>
              <select
                id="purchase-method"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
              >
                <option>Cash</option>
                <option>UPI</option>
                <option>Bank</option>
                <option>Cheque</option>
                <option>Other</option>
              </select>
            </div>
          </section>
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
            <div className="hidden overflow-hidden xl:block">
              <table className="w-full table-fixed text-left">
                <colgroup>
                  <col className="w-[12%]" />
                  <col className="w-[30%]" />
                  <col className="w-[10%]" />
                  <col className="w-[6%]" />
                  <col className="w-[10%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                  <col className="w-[8%]" />
                </colgroup>
                <thead className="bg-slate-950/70">
                  <tr className="text-xs text-slate-400">
                    <th className="px-1.5 py-3 font-semibold">Date</th>
                    <th className="px-1.5 py-3 font-semibold">Item Name</th>
                    <th className="px-1.5 py-3 font-semibold">
                      Rate / Box (₹)
                    </th>
                    <th className="px-1.5 py-3 font-semibold">Item Qty</th>
                    <th className="px-1.5 py-3 font-semibold">Box Qty</th>
                    <th className="px-1.5 py-3 font-semibold">
                      Buying Price / Item
                    </th>
                    <th className="px-1.5 py-3 font-semibold">
                      Total Buying Value
                    </th>
                    <th className="px-1.5 py-3 font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {rows.map((row) => (
                    <tr key={row.id} className="align-top">
                      <td className="px-1.5 py-3">
                        <input
                          type="date"
                          value={row.date}
                          onChange={(e) =>
                            updateRow(row.id, "date", e.target.value)
                          }
                          required
                          className="w-full min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-1.5 py-2.5 text-xs text-white outline-none focus:border-amber-400"
                        />
                      </td>

                      <td className="px-1.5 py-3">
                        <textarea
                          value={row.itemname}
                          rows={Math.max(
                            1,
                            Math.ceil(row.itemname.length / 40),
                          )}
                          title={row.itemname}
                          onChange={(e) =>
                            updateRow(row.id, "itemname", e.target.value)
                          }
                          onInput={(e) => {
                            e.currentTarget.style.height = "auto";
                            e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                          }}
                          placeholder="Enter item name"
                          required
                          className="min-h-10 w-full min-w-0 resize-none break-words rounded-lg border border-slate-700 bg-slate-950 px-2 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-400"
                        />
                      </td>

                      <td className="px-1.5 py-3">
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
                          className="w-full min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-1.5 py-2.5 text-xs text-white outline-none focus:border-amber-400"
                        />
                      </td>

                      <td className="px-1.5 py-3">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={row.itemperbox}
                          onChange={(e) =>
                            updateRow(row.id, "itemperbox", e.target.value)
                          }
                          placeholder="0"
                          required
                          className="w-full min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-1 py-2.5 text-xs text-white outline-none focus:border-amber-400"
                        />
                      </td>

                      <td className="px-1.5 py-3">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={row.box}
                          onChange={(e) =>
                            updateRow(row.id, "box", e.target.value)
                          }
                          placeholder="0"
                          required
                          className="w-full min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-1 py-2.5 text-xs text-white outline-none focus:border-amber-400"
                        />
                      </td>

                      <td className="px-1.5 py-3">
                        <div className="w-full min-w-0 rounded-lg border border-slate-800 bg-slate-950/70 px-1.5 py-2.5 text-xs font-medium text-amber-300">
                          {money(getBuyingPricePerItem(row))}
                        </div>
                      </td>

                      <td className="px-1.5 py-3">
                        <div className="w-full min-w-0 rounded-lg border border-emerald-900/60 bg-slate-950/70 px-1.5 py-2.5 text-xs font-semibold text-emerald-400">
                          {money(getTotalBuyingValue(row))}
                        </div>
                      </td>

                      <td className="px-1.5 py-3">
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          disabled={rows.length === 1}
                          title="Remove item"
                          className="rounded-lg border border-red-900/60 px-1.5 py-2 text-xs text-red-400 transition hover:bg-red-950/50 disabled:cursor-not-allowed disabled:opacity-30"
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
            <div className="space-y-4 p-4 xl:hidden">
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
                      value={row.itemname}
                      onChange={(e) =>
                        updateRow(row.id, "itemname", e.target.value)
                      }
                      placeholder="Enter item name"
                      required
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400">
                        Rate / Box (₹)
                      </label>
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
                        value={row.itemperbox}
                        onChange={(e) =>
                          updateRow(row.id, "itemperbox", e.target.value)
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
                        value={row.box}
                        onChange={(e) =>
                          updateRow(row.id, "box", e.target.value)
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

                    <div className="rounded-lg border border-emerald-900/60 bg-slate-900 p-3">
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
                <p className="text-sm text-slate-400">Purchase total</p>
                <p className="mt-1 text-xs text-slate-500">
                  Subtotal {money(subtotal)} + GST {money(taxAmount)}
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
              <p className="text-2xl font-bold text-emerald-400">
                {money(purchaseTotal)}
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
            </div>
          )}

          {/* Submit actions */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setRows([createEmptyRow()]);
                setMessage(null);
                setSupplierName("");
                setSupplierInvoiceNumber("");
                setPaidAmount("");
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
                  <LoadingAnimation size={28} label="Submitting purchase" />
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

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="font-semibold text-white">Recent purchases</h2>
            <p className="mt-1 text-xs text-slate-400">
              Saved supplier invoices and recorded payments
            </p>
          </div>
          {supplierCreditBalance > 0 && (
            <p className="border-b border-slate-800 bg-emerald-50 px-5 py-3 text-sm text-emerald-900">
              Supplier credit available: {money(supplierCreditBalance)}. Credit
              is applied automatically to the next purchase from the same
              supplier.
            </p>
          )}
          {purchasesLoading ? (
            <div className="flex flex-col items-center justify-center gap-1 px-5 py-8 text-center text-sm text-slate-400">
              <LoadingAnimation size={56} label="Loading purchase history" />
              Loading purchase history…
            </div>
          ) : purchases.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1220px] text-left">
                <thead>
                  <tr>
                    <th className="px-4 py-3">DATE</th>
                    <th className="px-4 py-3">SUPPLIER</th>
                    <th className="px-4 py-3">SUPPLIER INVOICE</th>
                    <th className="px-4 py-3">TOTAL</th>
                    <th className="px-4 py-3">PAID</th>
                    <th className="px-4 py-3">BALANCE DUE</th>
                    <th className="px-4 py-3">RECORD PAYMENT</th>
                    <th className="px-4 py-3">PURCHASE RETURN</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.slice(0, 10).map((purchase) => {
                    const due = Math.max(
                      0,
                      Number(purchase.total || 0) -
                        Number(purchase.paidAmount || 0) -
                        Number(purchase.returnedAmount || 0) -
                        Number(purchase.supplierCreditApplied || 0),
                    );
                    const form = purchaseReturnForms[purchase._id] || {
                      itemIndex: "",
                      boxes: "1",
                      reason: "",
                    };
                    return (
                      <tr key={purchase._id}>
                        <td className="px-4 py-3">
                          {new Date(purchase.date).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-4 py-3">
                          {purchase.supplierName || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {purchase.supplierInvoiceNumber || "—"}
                        </td>
                        <td className="px-4 py-3">{money(purchase.total)}</td>
                        <td className="px-4 py-3">
                          {money(purchase.paidAmount)}
                          {Number(purchase.supplierCreditApplied || 0) > 0 && (
                            <small className="mt-1 block text-slate-400">
                              Credit {money(purchase.supplierCreditApplied)}
                            </small>
                          )}
                        </td>
                        <td className="px-4 py-3">{money(due)}</td>
                        <td className="px-4 py-3">
                          <div className="flex min-w-48 flex-col gap-2">
                            <label
                              className="sr-only"
                              htmlFor={`supplier-payment-${purchase._id}`}
                            >
                              Payment amount to supplier{" "}
                              {purchase.supplierName || ""}
                            </label>
                            <input
                              id={`supplier-payment-${purchase._id}`}
                              type="number"
                              min="0.01"
                              max={due}
                              step="0.01"
                              disabled={due <= 0}
                              value={supplierPaymentAmounts[purchase._id] || ""}
                              onChange={(event) =>
                                setSupplierPaymentAmounts((current) => ({
                                  ...current,
                                  [purchase._id]: event.target.value,
                                }))
                              }
                              placeholder={
                                due ? `Due ${money(due)}` : "Fully paid"
                              }
                              className="w-40 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white disabled:opacity-50"
                            />
                            <label
                              className="sr-only"
                              htmlFor={`supplier-method-${purchase._id}`}
                            >
                              Payment method for this supplier
                            </label>
                            <select
                              id={`supplier-method-${purchase._id}`}
                              disabled={due <= 0}
                              value={
                                supplierPaymentMethods[purchase._id] || "Cash"
                              }
                              onChange={(event) =>
                                setSupplierPaymentMethods((current) => ({
                                  ...current,
                                  [purchase._id]: event.target.value,
                                }))
                              }
                              className="w-40 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                            >
                              <option>Cash</option>
                              <option>UPI</option>
                              <option>Bank</option>
                              <option>Cheque</option>
                              <option>Other</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => recordSupplierPayment(purchase)}
                              disabled={
                                due <= 0 ||
                                recordingSupplierPayment === purchase._id
                              }
                              className="w-40 rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-50"
                            >
                              {recordingSupplierPayment === purchase._id
                                ? <span className="inline-flex items-center gap-1"><LoadingAnimation size={26} label="Saving supplier payment" />Saving…</span>
                                : "Record payment"}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="min-w-56 space-y-2">
                            <button
                              type="button"
                              onClick={() =>
                                setReturnOpenId(
                                  returnOpenId === purchase._id
                                    ? null
                                    : purchase._id,
                                )
                              }
                              className="text-sm font-semibold text-amber-300 underline"
                            >
                              {returnOpenId === purchase._id
                                ? "Cancel return"
                                : "Return stock"}
                            </button>
                            {Number(purchase.returnedAmount || 0) > 0 && (
                              <p className="text-xs text-slate-400">
                                Returned: {money(purchase.returnedAmount)}
                              </p>
                            )}
                            {returnOpenId === purchase._id && (
                              <div className="space-y-2">
                                <label
                                  className="sr-only"
                                  htmlFor={`purchase-return-item-${purchase._id}`}
                                >
                                  Item to return to supplier
                                </label>
                                <select
                                  id={`purchase-return-item-${purchase._id}`}
                                  value={form.itemIndex}
                                  onChange={(event) =>
                                    setPurchaseReturnForms((current) => ({
                                      ...current,
                                      [purchase._id]: {
                                        ...form,
                                        itemIndex: event.target.value,
                                        boxes: "1",
                                      },
                                    }))
                                  }
                                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-white"
                                >
                                  <option value="">Select purchase item</option>
                                  {(purchase.items || []).map((item, index) => (
                                    <option
                                      key={`${item.itemname}-${index}`}
                                      value={index}
                                    >
                                      {item.itemname} ·{" "}
                                      {Number(item.box || 0) -
                                        Number(item.returnedBoxes || 0)}{" "}
                                      boxes
                                    </option>
                                  ))}
                                </select>
                                <label
                                  className="sr-only"
                                  htmlFor={`purchase-return-boxes-${purchase._id}`}
                                >
                                  Boxes to return
                                </label>
                                <input
                                  id={`purchase-return-boxes-${purchase._id}`}
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={form.boxes}
                                  onChange={(event) =>
                                    setPurchaseReturnForms((current) => ({
                                      ...current,
                                      [purchase._id]: {
                                        ...form,
                                        boxes: event.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="Boxes"
                                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-white"
                                />
                                <label
                                  className="sr-only"
                                  htmlFor={`purchase-return-reason-${purchase._id}`}
                                >
                                  Reason for purchase return
                                </label>
                                <input
                                  id={`purchase-return-reason-${purchase._id}`}
                                  value={form.reason}
                                  onChange={(event) =>
                                    setPurchaseReturnForms((current) => ({
                                      ...current,
                                      [purchase._id]: {
                                        ...form,
                                        reason: event.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="Reason for return"
                                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-white"
                                />
                                <button
                                  type="button"
                                  onClick={() => recordPurchaseReturn(purchase)}
                                  disabled={
                                    recordingPurchaseReturn === purchase._id
                                  }
                                  className="w-full rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-50"
                                >
                                  {recordingPurchaseReturn === purchase._id
                                    ? <span className="inline-flex items-center gap-1"><LoadingAnimation size={26} label="Saving purchase return" />Saving…</span>
                                    : "Save purchase return"}
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-slate-400">
              No purchases recorded yet.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
