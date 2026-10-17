"use client";

import InvoicePrint from "@/components/InvoicePrint";
import printDocument from "@/lib/printDocument";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function Billout() {
    const searchParams = useSearchParams();
    const [invoiceData, setInvoiceData] = useState(null);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const id = searchParams.get("id");

    useEffect(() => {
        const fetchBill = async () => {
            const res = await axios.get(`/api/bill?id=${id}`);
            console.log(res.data.data)
            setInvoiceData(res.data.data);
        };
        if (id) fetchBill();
    }, [id]);

    const generatePDF = async () => {
        if (!invoiceData) return;
        setIsGeneratingPDF(true);
        try {
            const originalElement = document.getElementById("invoice-content");
            printDocument({ invoiceData, originalElement });
        } catch (err) {
            console.error("PDF Error:", err);
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundColor: "#1f2937",
                padding: "40px",
                color: "#000",
            }}>
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
                    <button
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
                        {isGeneratingPDF ? "Generating..." : "Download PDF"}
                    </button>
                </div>

                {/* Invoice Content */}
                <div id="invoice-content">
                    <InvoicePrint invoiceData={invoiceData} />
                </div>
            </div>
        </div>
    );
}
export default function Page() {
    return (
        <Suspense fallback={<div className="text-white p-10">Loading...</div>}>
            <Billout />
        </Suspense>
    );
}
