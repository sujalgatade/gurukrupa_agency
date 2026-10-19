"use client";

import InvoicePrint from "@/components/InvoicePrint";
import LoadingAnimation from "@/components/LoadingAnimation";
import printDocument from "@/lib/printDocument";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function Billout() {
    const searchParams = useSearchParams();
    const [invoiceData, setInvoiceData] = useState(null);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [pageSize, setPageSize] = useState("a4");
    const [error, setError] = useState("");
    const [editOpen, setEditOpen] = useState(false);
    const [savingCorrection, setSavingCorrection] = useState(false);
    const [correctionError, setCorrectionError] = useState("");
    const [correction, setCorrection] = useState({ issueDate: "", taxRate: "0", discount: "0", reason: "" });
    const [returnOpen, setReturnOpen] = useState(false);
    const [savingReturn, setSavingReturn] = useState(false);
    const [returnError, setReturnError] = useState("");
    const [returnForm, setReturnForm] = useState({ itemIndex: "", boxes: "1", reason: "" });
    const [loading, setLoading] = useState(true);
    const id = searchParams.get("id");
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

    const startCorrection = () => {
        if (!invoiceData) return;
        const date = new Date(invoiceData.issueDate);
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        setCorrection({ issueDate: localDate, taxRate: String(invoiceData.taxRate || 0), discount: String(invoiceData.discount || 0), reason: "" });
        setCorrectionError("");
        setEditOpen(true);
    };

    const saveCorrection = async (event) => {
        event.preventDefault();
        setSavingCorrection(true);
        setCorrectionError("");
        try {
            const response = await axios.patch(`/api/bill?id=${id}`, { ...correction, taxRate: Number(correction.taxRate), discount: Number(correction.discount) });
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
            const response = await axios.post("/api/sales-return", { billId: id, ...returnForm, boxes: Number(returnForm.boxes), itemIndex: Number(returnForm.itemIndex) });
            setInvoiceData(response.data.data);
            setReturnOpen(false);
            setReturnForm({ itemIndex: "", boxes: "1", reason: "" });
        } catch (returnRequestError) {
            setReturnError(returnRequestError.response?.data?.message || "Could not record this return.");
        } finally {
            setSavingReturn(false);
        }
    };

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
                    <button type="button" onClick={startCorrection} disabled={!invoiceData} style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "4px", color: "#334155", background: "#fff", cursor: "pointer" }}>Correct invoice</button>
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
                    <div><label htmlFor="correction-reason" style={{ display: "block", fontSize: "12px", marginBottom: "5px" }}>Reason for change</label><input id="correction-reason" required minLength="3" value={correction.reason} onChange={(event) => setCorrection({ ...correction, reason: event.target.value })} placeholder="Required for audit history" style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: "5px", padding: "8px" }} /></div>
                    {correctionError && <p role="alert" style={{ gridColumn: "1/-1", color: "#b91c1c", margin: 0 }}>{correctionError}</p>}
                    <div style={{ gridColumn: "1/-1", display: "flex", gap: "8px", justifyContent: "flex-end" }}><button type="button" onClick={() => setEditOpen(false)} style={{ border: "1px solid #cbd5e1", borderRadius: "5px", padding: "8px 12px", background: "white" }}>Cancel</button><button disabled={savingCorrection} style={{ border: 0, borderRadius: "5px", padding: "8px 12px", background: "#2563eb", color: "white", opacity: savingCorrection ? .6 : 1 }}>{savingCorrection ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><LoadingAnimation size={26} label="Saving correction" />Saving…</span> : "Save correction"}</button></div>
                </form>}
                {returnOpen && <form onSubmit={saveReturn} style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", border: "1px solid #dbe3ef", background: "#f8fafc", borderRadius: "8px", padding: "16px", marginBottom: "18px" }}>
                    <div><label htmlFor="return-item" style={{ display: "block", fontSize: "12px", marginBottom: "5px" }}>Returned product</label><select id="return-item" required value={returnForm.itemIndex} onChange={(event) => setReturnForm({ ...returnForm, itemIndex: event.target.value, boxes: "1" })} style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: "5px", padding: "8px", background: "white" }}><option value="">Select invoice item</option>{(invoiceData?.items || []).map((item, index) => { const remaining = Number(item.boxQty || 0) - Number(item.returnedBoxes || 0); return remaining > 0 ? <option key={`${item.itemname}-${index}`} value={index}>{item.itemname} · {remaining} boxes available</option> : null; })}</select></div>
                    <div><label htmlFor="return-boxes" style={{ display: "block", fontSize: "12px", marginBottom: "5px" }}>Boxes returned</label><input id="return-boxes" required type="number" min="1" max={returnForm.itemIndex === "" ? undefined : Math.max(0, Number(invoiceData?.items?.[Number(returnForm.itemIndex)]?.boxQty || 0) - Number(invoiceData?.items?.[Number(returnForm.itemIndex)]?.returnedBoxes || 0))} step="1" value={returnForm.boxes} onChange={(event) => setReturnForm({ ...returnForm, boxes: event.target.value })} style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: "5px", padding: "8px" }} /></div>
                    <div><label htmlFor="return-reason" style={{ display: "block", fontSize: "12px", marginBottom: "5px" }}>Return reason</label><input id="return-reason" required minLength="3" value={returnForm.reason} onChange={(event) => setReturnForm({ ...returnForm, reason: event.target.value })} placeholder="Damaged, expiry, customer return…" style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: "5px", padding: "8px" }} /></div>
                    {returnError && <p role="alert" style={{ gridColumn: "1/-1", color: "#b91c1c", margin: 0 }}>{returnError}</p>}
                    <p style={{ gridColumn: "1/-1", fontSize: "12px", color: "#64748b", margin: 0 }}>Returned goods are added back to stock and credited against the unpaid invoice balance.</p>
                    <div style={{ gridColumn: "1/-1", display: "flex", gap: "8px", justifyContent: "flex-end" }}><button type="button" onClick={() => setReturnOpen(false)} style={{ border: "1px solid #cbd5e1", borderRadius: "5px", padding: "8px 12px", background: "white" }}>Cancel</button><button disabled={savingReturn || !invoiceData?.items?.length} style={{ border: 0, borderRadius: "5px", padding: "8px 12px", background: "#2563eb", color: "white", opacity: savingReturn ? .6 : 1 }}>{savingReturn ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><LoadingAnimation size={26} label="Saving return" />Saving…</span> : "Save return"}</button></div>
                </form>}

                {invoiceData?.returnedAmount > 0 && <section aria-label="Sales returns" style={{ marginBottom: "18px", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "12px 14px", background: "#f8fafc" }}><strong>Returned / credited: ₹{Number(invoiceData.returnedAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>{(invoiceData.returns || []).map((entry, index) => <p key={`${entry.date}-${index}`} style={{ margin: "6px 0 0", fontSize: "12px", color: "#475569" }}>{new Date(entry.date).toLocaleDateString("en-IN")} · {(entry.items || []).map((item) => `${item.itemname} × ${item.boxes} boxes`).join(", ")} · {entry.reason} · ₹{Number(entry.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>)}</section>}

                {/* Invoice Content */}
                <div id="invoice-content">
                    {invoiceData && <InvoicePrint invoiceData={invoiceData} />}
                </div>
                {invoiceData?.changeHistory?.length > 0 && <section aria-label="Invoice correction history" style={{ marginTop: "20px", borderTop: "1px solid #e2e8f0", paddingTop: "14px" }}><h2 style={{ fontSize: "15px", fontWeight: 700 }}>Correction history</h2><ul style={{ display: "grid", gap: "8px", marginTop: "10px", paddingLeft: "18px" }}>{[...invoiceData.changeHistory].reverse().map((entry, index) => <li key={`${entry.editedAt}-${index}`} style={{ fontSize: "12px", color: "#475569" }}><strong>{new Date(entry.editedAt).toLocaleString("en-IN")}</strong> — {entry.reason}. Total: ₹{Number(entry.before?.total || 0).toLocaleString("en-IN")} → ₹{Number(entry.after?.total || 0).toLocaleString("en-IN")}.</li>)}</ul></section>}
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
