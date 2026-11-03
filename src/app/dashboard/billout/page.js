"use client";

import InvoicePrint from "@/components/InvoicePrint";
import LoadingAnimation from "@/components/LoadingAnimation";
import printDocument from "@/lib/printDocument";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

const describeInvoiceItems = (items = []) => items.map((item) =>
    `${item.itemname}: ${Number(item.boxQty || 0)} boxes + ${Number(item.itemQty || 0)} loose (${Number(item.quantity || 0) * Number(item.boxQty || 0) + Number(item.itemQty || 0)} pieces)`,
).join("; ") || "No items";

function Billout() {
    const searchParams = useSearchParams();
    const [invoiceData, setInvoiceData] = useState(null);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [pageSize, setPageSize] = useState("a4");
    const [error, setError] = useState("");
    const [editOpen, setEditOpen] = useState(false);
    const [savingCorrection, setSavingCorrection] = useState(false);
    const [correctionError, setCorrectionError] = useState("");
    const [correction, setCorrection] = useState({ issueDate: "", taxRate: "0", discount: "0", items: [] });
    const [stockOptions, setStockOptions] = useState([]);
    const [returnOpen, setReturnOpen] = useState(false);
    const [savingReturn, setSavingReturn] = useState(false);
    const [returnError, setReturnError] = useState("");
    const [returnForm, setReturnForm] = useState({ itemIndex: "", boxes: "0", itemQty: "0", reason: "" });
    const [loading, setLoading] = useState(true);
    const id = searchParams.get("id");
    const editRequested = searchParams.get("edit") === "1";
    const autoOpenedEdit = useRef("");
    const creditWarning = searchParams.get("creditWarning") === "1";
    const creditDue = Number(searchParams.get("due") || 0);
    const creditLimit = Number(searchParams.get("limit") || 0);

    useEffect(() => {
        const fetchBill = async () => {
            try {
                const res = await axios.get(`/api/bill?id=${id}`);
                setInvoiceData(res.data.data);
            } catch (fetchError) {
                setError(fetchError.response?.data?.message || "Invoice could not be loaded.");
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchBill();
    }, [id]);

    const generatePDF = async () => {
        if (!invoiceData) return;
        setIsGeneratingPDF(true);
        try {
            const originalElement = document.getElementById("invoice-content");
            await printDocument({ invoiceData, originalElement, pageSize });
        } catch (err) {
            console.error("PDF Error:", err);
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const startCorrection = useCallback(async () => {
        if (!invoiceData) return;
        const date = new Date(invoiceData.issueDate);
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        setCorrection({
            issueDate: localDate,
            taxRate: String(invoiceData.taxRate || 0),
            discount: String(invoiceData.discount || 0),
            items: (invoiceData.items || []).map((item) => ({
                lineId: String(item._id || ""),
                id: item.id || "",
                itemname: item.itemname || "",
                quantity: Number(item.quantity || 0),
                boxQty: String(item.boxQty || 0),
                itemQty: String(item.itemQty || 0),
                rate: String(item.rate || 0),
                originalRate: Number(item.originalRate || item.rate || 0),
                unitCost: Number(item.unitCost || 0),
            })),
        });
        setCorrectionError("");
        setEditOpen(true);
        if (!invoiceData.returns?.length) {
            try {
                const response = await axios.get("/api/items?unique=true&bill=true");
                setStockOptions(Array.isArray(response.data?.data) ? response.data.data : []);
            } catch (optionsError) {
                console.error("Unable to load products for invoice correction:", optionsError);
                setStockOptions([]);
            }
        }
    }, [invoiceData]);

    useEffect(() => {
        if (!editRequested || !invoiceData || autoOpenedEdit.current === id) return;
        autoOpenedEdit.current = id;
        startCorrection();
    }, [editRequested, id, invoiceData, startCorrection]);

    const updateCorrectionItem = (index, field, value) => {
        setCorrection((current) => ({
            ...current,
            items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
        }));
    };

    const addCorrectionItem = (productId) => {
        const product = stockOptions.find((item) => String(item._id) === productId);
        if (!product) return;
        setCorrection((current) => ({
            ...current,
            items: [...current.items, {
                lineId: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                id: product._id,
                itemname: product.itemname,
                quantity: Number(product.itemperbox || 0),
                boxQty: "0",
                itemQty: "0",
                rate: String(product.originalrate || 0),
                originalRate: Number(product.originalrate || 0),
                unitCost: Number(product.originalrate || 0),
            }],
        }));
    };

    const removeCorrectionItem = (index) => {
        setCorrection((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }));
    };

    const saveCorrection = async (event) => {
        event.preventDefault();
        setSavingCorrection(true);
        setCorrectionError("");
        try {
            const { items: correctionItems, ...correctionFields } = correction;
            const payload = {
                ...correctionFields,
                taxRate: Number(correctionFields.taxRate),
                discount: Number(correctionFields.discount),
                ...(invoiceData?.returns?.length ? {} : {
                    items: correctionItems
                        .filter((item) => Number(item.boxQty || 0) > 0 || Number(item.itemQty || 0) > 0)
                        .map((item) => ({
                            lineId: item.lineId,
                            id: item.id,
                            itemname: item.itemname,
                            quantity: Number(item.quantity),
                            boxQty: Number(item.boxQty || 0),
                            itemQty: Number(item.itemQty || 0),
                            rate: Number(item.rate),
                            originalRate: Number(item.originalRate || 0),
                        })),
                }),
            };
            const response = await axios.patch(`/api/bill?id=${id}`, payload);
            setInvoiceData(response.data.data);
            setEditOpen(false);
        } catch (correctionRequestError) {
            setCorrectionError(correctionRequestError.response?.data?.message || "Could not save the invoice correction.");
        } finally {
            setSavingCorrection(false);
        }
    };

    const saveReturn = async (event) => {
        event.preventDefault();
        setSavingReturn(true);
        setReturnError("");
        try {
            const response = await axios.post("/api/sales-return", { billId: id, ...returnForm, boxes: Number(returnForm.boxes), itemQty: Number(returnForm.itemQty), itemIndex: Number(returnForm.itemIndex) });
            setInvoiceData(response.data.data);
            setReturnOpen(false);
            setReturnForm({ itemIndex: "", boxes: "0", itemQty: "0", reason: "" });
        } catch (returnRequestError) {
            setReturnError(returnRequestError.response?.data?.message || "Could not record this return.");
        } finally {
            setSavingReturn(false);
        }
    };

    const selectedReturnItem = returnForm.itemIndex === ""
        ? null
        : invoiceData?.items?.[Number(returnForm.itemIndex)] || null;
    const returnUnitsPerBox = Number(selectedReturnItem?.quantity || 0);
    const returnRemainingUnits = selectedReturnItem
        ? Math.max(
            0,
            returnUnitsPerBox * Number(selectedReturnItem.boxQty || 0) +
                Number(selectedReturnItem.itemQty || 0) -
                returnUnitsPerBox * Number(selectedReturnItem.returnedBoxes || 0) -
                Number(selectedReturnItem.returnedItemQty || 0),
        )
        : 0;
    const returnMaxBoxes = returnUnitsPerBox > 0
        ? Math.floor(returnRemainingUnits / returnUnitsPerBox)
        : 0;
    const returnMaxPieces = Math.max(
        0,
        Math.floor(returnRemainingUnits - Number(returnForm.boxes || 0) * returnUnitsPerBox),
    );
    const correctionSubtotal = correction.items.reduce((sum, item) =>
        sum + (Number(item.quantity || 0) * Number(item.boxQty || 0) + Number(item.itemQty || 0)) * Number(item.rate || 0),
    0);
    const correctionTotal = Math.max(0, correctionSubtotal - Number(correction.discount || 0)) * (1 + Number(correction.taxRate || 0) / 100);

    return (
        <div className="invoice-page">
            <div
                style={{
                    maxWidth: "800px",
                    margin: "0 auto",
                    backgroundColor: "#fff",
                    padding: "32px",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                }}>
                {/* Top Action Bar */}
                <div
                    className="invoice-screen-actions"
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "24px",
                    }}>
                    <h1 style={{ fontSize: "24px", fontWeight: "bold" }}>
                        Invoice
                    </h1>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button type="button" onClick={startCorrection} disabled={!invoiceData} style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "4px", color: "#334155", background: "#fff", cursor: "pointer" }}>Edit invoice</button>
                    <button type="button" onClick={() => { setReturnOpen(true); setReturnError(""); }} disabled={!invoiceData || Number(invoiceData.total || 0) <= Number(invoiceData.paidAmount || 0) + Number(invoiceData.returnedAmount || 0)} style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "4px", color: "#334155", background: "#fff", cursor: "pointer", opacity: !invoiceData || Number(invoiceData.total || 0) <= Number(invoiceData.paidAmount || 0) + Number(invoiceData.returnedAmount || 0) ? .5 : 1 }}>Record return</button>
                    <label htmlFor="invoice-paper-size" className="sr-only">Invoice paper size</label>
                    <select id="invoice-paper-size" value={pageSize} onChange={(event) => setPageSize(event.target.value)} style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px", color: "#111827" }}>
                        <option value="a4">A4</option><option value="a5">A5</option>
                    </select>
                    <button
                        type="button"
                        onClick={generatePDF}
                        disabled={isGeneratingPDF}
                        style={{
                            backgroundColor: "#2563eb",
                            color: "#fff",
                            padding: "8px 16px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            border: "none",
                            opacity: isGeneratingPDF ? 0.6 : 1,
                        }}>
                        {isGeneratingPDF ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><LoadingAnimation size={28} label="Generating PDF" />Generating...</span> : `Download ${pageSize.toUpperCase()} PDF`}
                    </button>
                    </div>
                </div>

                {loading && <p role="status" style={{ color: "#64748b", display: "flex", alignItems: "center", gap: 8 }}><LoadingAnimation size={36} label="Loading invoice" />Loading invoice…</p>}
                {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
                {creditWarning && <p role="status" style={{ border: "1px solid #fcd34d", background: "#fffbeb", color: "#92400e", padding: "12px 14px", borderRadius: "6px", marginBottom: "16px" }}>Customer credit limit exceeded. Account balance after this invoice: ₹{creditDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}; credit limit: ₹{creditLimit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}.</p>}

                {editOpen && <form onSubmit={saveCorrection} style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", border: "1px solid #dbe3ef", background: "#f8fafc", borderRadius: "8px", padding: "16px", marginBottom: "18px" }}>
                    <div><label htmlFor="correction-date" style={{ display: "block", fontSize: "12px", marginBottom: "5px" }}>Invoice date</label><input id="correction-date" required type="date" value={correction.issueDate} onChange={(event) => setCorrection({ ...correction, issueDate: event.target.value })} style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: "5px", padding: "8px" }} /></div>
                    <div><label htmlFor="correction-tax" style={{ display: "block", fontSize: "12px", marginBottom: "5px" }}>GST %</label><input id="correction-tax" required type="number" min="0" max="100" step="0.01" value={correction.taxRate} onChange={(event) => setCorrection({ ...correction, taxRate: event.target.value })} style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: "5px", padding: "8px" }} /></div>
                    <div><label htmlFor="correction-discount" style={{ display: "block", fontSize: "12px", marginBottom: "5px" }}>Discount (₹)</label><input id="correction-discount" required type="number" min="0" step="0.01" value={correction.discount} onChange={(event) => setCorrection({ ...correction, discount: event.target.value })} style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: "5px", padding: "8px" }} /></div>
                    {!invoiceData?.returns?.length ? <section aria-label="Edit invoice items" style={{ gridColumn: "1/-1", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff", padding: "12px" }}>
                        <h2 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 700 }}>Invoice items and stock</h2>
                        <p style={{ margin: "0 0 12px", fontSize: "12px", color: "#64748b" }}>Changing the quantity updates the bill and stock together. Reduced quantity goes back to its original stock lot when available.</p>
                        <div style={{ display: "grid", gap: "10px" }}>
                            {correction.items.map((item, index) => <div key={item.lineId || index} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", alignItems: "end", gap: "8px", padding: "10px", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                                <div style={{ minWidth: 0 }}><span style={{ display: "block", marginBottom: "5px", fontSize: "12px", color: "#64748b" }}>Product · {item.quantity} pieces/box</span><strong style={{ display: "block", overflowWrap: "anywhere", fontSize: "13px" }}>{item.itemname}</strong></div>
                                <div><label htmlFor={`edit-box-${index}`} style={{ display: "block", fontSize: "11px", marginBottom: "4px" }}>Box Qty</label><input id={`edit-box-${index}`} type="number" min="0" step="1" value={item.boxQty} onChange={(event) => updateCorrectionItem(index, "boxQty", event.target.value)} style={{ width: "100%", minWidth: 0, border: "1px solid #cbd5e1", borderRadius: "5px", padding: "7px" }} /></div>
                                <div><label htmlFor={`edit-pieces-${index}`} style={{ display: "block", fontSize: "11px", marginBottom: "4px" }}>Loose Pieces</label><input id={`edit-pieces-${index}`} type="number" min="0" step="1" value={item.itemQty} onChange={(event) => updateCorrectionItem(index, "itemQty", event.target.value)} style={{ width: "100%", minWidth: 0, border: "1px solid #cbd5e1", borderRadius: "5px", padding: "7px" }} /></div>
                                <div><label htmlFor={`edit-rate-${index}`} style={{ display: "block", fontSize: "11px", marginBottom: "4px" }}>Rate / piece (₹)</label><input id={`edit-rate-${index}`} type="number" min="0" step="0.01" value={item.rate} onChange={(event) => updateCorrectionItem(index, "rate", event.target.value)} style={{ width: "100%", minWidth: 0, border: "1px solid #cbd5e1", borderRadius: "5px", padding: "7px" }} /></div>
                                <div><span style={{ display: "block", marginBottom: "5px", fontSize: "11px", color: "#64748b" }}>Line total</span><strong>₹{((Number(item.quantity || 0) * Number(item.boxQty || 0) + Number(item.itemQty || 0)) * Number(item.rate || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
                                <button type="button" onClick={() => removeCorrectionItem(index)} aria-label={`Remove ${item.itemname} from invoice`} style={{ border: "1px solid #fecaca", borderRadius: "5px", padding: "7px", color: "#b91c1c", background: "#fff" }}>Remove</button>
                            </div>)}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "10px", marginTop: "12px" }}>
                            <select aria-label="Add a product to invoice" defaultValue="" onChange={(event) => { addCorrectionItem(event.target.value); event.target.value = ""; }} style={{ maxWidth: "100%", border: "1px solid #cbd5e1", borderRadius: "5px", padding: "8px", background: "white" }}>
                                <option value="">Add product…</option>
                                {stockOptions.filter((product) => Number(product.box || 0) * Number(product.itemperbox || 0) + Number(product.looseQty || 0) > 0).map((product) => <option key={product._id} value={product._id}>{product.itemname} · {Number(product.box || 0)} boxes{Number(product.looseQty || 0) > 0 ? ` + ${Number(product.looseQty)} loose` : ""}</option>)}
                            </select>
                            <strong>Subtotal: ₹{correctionSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · New total with GST: ₹{correctionTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                        </div>
                    </section> : <p style={{ gridColumn: "1/-1", color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "6px", padding: "10px", margin: 0, fontSize: "12px" }}>This bill already has a sales return. Its product quantities cannot be edited because that would change the return and stock history.</p>}
                    {correctionError && <p role="alert" style={{ gridColumn: "1/-1", color: "#b91c1c", margin: 0 }}>{correctionError}</p>}
                    <div style={{ gridColumn: "1/-1", display: "flex", gap: "8px", justifyContent: "flex-end" }}><button type="button" onClick={() => setEditOpen(false)} style={{ border: "1px solid #cbd5e1", borderRadius: "5px", padding: "8px 12px", background: "white" }}>Cancel</button><button disabled={savingCorrection} style={{ border: 0, borderRadius: "5px", padding: "8px 12px", background: "#2563eb", color: "white", opacity: savingCorrection ? .6 : 1 }}>{savingCorrection ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><LoadingAnimation size={26} label="Saving correction" />Saving…</span> : "Save changes"}</button></div>
                </form>}
                {returnOpen && <form onSubmit={saveReturn} style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", border: "1px solid #dbe3ef", background: "#f8fafc", borderRadius: "8px", padding: "16px", marginBottom: "18px" }}>
                    <div><label htmlFor="return-item" style={{ display: "block", fontSize: "12px", marginBottom: "5px" }}>Returned product</label><select id="return-item" required value={returnForm.itemIndex} onChange={(event) => setReturnForm({ ...returnForm, itemIndex: event.target.value, boxes: "0", itemQty: "0" })} style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: "5px", padding: "8px", background: "white" }}><option value="">Select invoice item</option>{(invoiceData?.items || []).map((item, index) => { const unitsPerBox = Number(item.quantity || 0); const remaining = Math.max(0, unitsPerBox * Number(item.boxQty || 0) + Number(item.itemQty || 0) - unitsPerBox * Number(item.returnedBoxes || 0) - Number(item.returnedItemQty || 0)); return remaining > 0 ? <option key={`${item.itemname}-${index}`} value={index}>{item.itemname} · {remaining} pieces available</option> : null; })}</select></div>
                    <div><label htmlFor="return-boxes" style={{ display: "block", fontSize: "12px", marginBottom: "5px" }}>Full boxes returned</label><input id="return-boxes" required type="number" min="0" max={returnMaxBoxes} step="1" value={returnForm.boxes} onChange={(event) => setReturnForm({ ...returnForm, boxes: event.target.value, itemQty: String(Math.min(Number(returnForm.itemQty || 0), Math.max(0, returnRemainingUnits - Number(event.target.value || 0) * returnUnitsPerBox))) })} style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: "5px", padding: "8px" }} /></div>
                    <div><label htmlFor="return-item-qty" style={{ display: "block", fontSize: "12px", marginBottom: "5px" }}>Loose pieces returned</label><input id="return-item-qty" required type="number" min="0" max={returnMaxPieces} step="1" value={returnForm.itemQty} onChange={(event) => setReturnForm({ ...returnForm, itemQty: event.target.value })} style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: "5px", padding: "8px" }} /></div>
                    <div><label htmlFor="return-reason" style={{ display: "block", fontSize: "12px", marginBottom: "5px" }}>Return reason</label><input id="return-reason" required minLength="3" value={returnForm.reason} onChange={(event) => setReturnForm({ ...returnForm, reason: event.target.value })} placeholder="Damaged, expiry, customer return…" style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: "5px", padding: "8px" }} /></div>
                    {returnError && <p role="alert" style={{ gridColumn: "1/-1", color: "#b91c1c", margin: 0 }}>{returnError}</p>}
                    <p style={{ gridColumn: "1/-1", fontSize: "12px", color: "#64748b", margin: 0 }}>Enter full boxes, loose pieces, or both. Returned goods go back into stock and are credited against the unpaid invoice balance.</p>
                    <div style={{ gridColumn: "1/-1", display: "flex", gap: "8px", justifyContent: "flex-end" }}><button type="button" onClick={() => setReturnOpen(false)} style={{ border: "1px solid #cbd5e1", borderRadius: "5px", padding: "8px 12px", background: "white" }}>Cancel</button><button disabled={savingReturn || !invoiceData?.items?.length} style={{ border: 0, borderRadius: "5px", padding: "8px 12px", background: "#2563eb", color: "white", opacity: savingReturn ? .6 : 1 }}>{savingReturn ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><LoadingAnimation size={26} label="Saving return" />Saving…</span> : "Save return"}</button></div>
                </form>}

                {invoiceData?.returnedAmount > 0 && <section aria-label="Sales returns" style={{ marginBottom: "18px", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "12px 14px", background: "#f8fafc" }}><strong>Returned / credited: ₹{Number(invoiceData.returnedAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>{(invoiceData.returns || []).map((entry, index) => <p key={`${entry.date}-${index}`} style={{ margin: "6px 0 0", fontSize: "12px", color: "#475569" }}>{new Date(entry.date).toLocaleDateString("en-IN")} · {(entry.items || []).map((item) => `${item.itemname} × ${item.boxes || 0} boxes + ${item.itemQty || 0} pieces`).join(", ")} · {entry.reason} · ₹{Number(entry.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>)}</section>}

                {/* Invoice Content */}
                <div id="invoice-content">
                    {invoiceData && <InvoicePrint invoiceData={invoiceData} />}
                </div>
                {invoiceData?.changeHistory?.length > 0 && <section aria-label="Invoice correction history" style={{ marginTop: "20px", borderTop: "1px solid #e2e8f0", paddingTop: "14px" }}><h2 style={{ fontSize: "15px", fontWeight: 700 }}>Correction history</h2><ul style={{ display: "grid", gap: "8px", marginTop: "10px", paddingLeft: "18px" }}>{[...invoiceData.changeHistory].reverse().map((entry, index) => <li key={`${entry.editedAt}-${index}`} style={{ fontSize: "12px", color: "#475569" }}><strong>{new Date(entry.editedAt).toLocaleString("en-IN")}</strong> — {entry.reason}. Total: ₹{Number(entry.before?.total || 0).toLocaleString("en-IN")} → ₹{Number(entry.after?.total || 0).toLocaleString("en-IN")}.{(entry.before?.items?.length || entry.after?.items?.length) ? <><br /><span>Items: {describeInvoiceItems(entry.before?.items)} → {describeInvoiceItems(entry.after?.items)}</span>.</> : null}</li>)}</ul></section>}
            </div>
        </div>
    );
}
export default function Page() {
    return (
        <Suspense fallback={<div className="flex min-h-64 items-center justify-center bg-slate-950 p-10"><LoadingAnimation size={128} label="Loading invoice page" /></div>}>
            <Billout />
        </Suspense>
    );
}
