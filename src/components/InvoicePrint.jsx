
import React from "react";

const InvoicePrint = ({ invoiceData }) => {
  const formatAmount = (value) => Number(value ?? 0).toFixed(2);

  return (
    <div
      className="invoice-print-page"
      style={{
        backgroundColor: "white",
        boxSizing: "border-box",
        fontFamily: "Arial, sans-serif",
        color: "#000",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "20px",
          marginBottom: "32px",
          borderBottom: "2px solid #222",
          paddingBottom: "16px",
        }}
      >
        {/* Agency Information */}
        <div style={{ flex: 1 }}>
          <img
            src="/Gurukrupa%20logo.png"
            alt="Gurukrupa Agency"
            style={{
              display: "block",
              width: "170px",
              maxWidth: "100%",
              height: "auto",
              maxHeight: "52px",
              objectFit: "contain",
              objectPosition: "left center",
              margin: "0 0 10px 0",
            }}
          />

          <div
            style={{
              fontSize: "12px",
              lineHeight: "1.8",
            }}
          >
            <p style={{ margin: "2px 0" }}>
              <strong>Contact Number : </strong> 9579749504
            </p>
            <p style={{ margin: "6px 0 0 0" }}>
              <strong>Address : </strong> Peth Vadgaon,Kolhapur,416112.
            </p>

            <p style={{ margin: "2px 0" }}>
              <strong>Bank Details:- </strong>
            </p>

            <p style={{ margin: "2px 0" }}>
              <strong>Bank:</strong> BANK OF INDIA
            </p>

            <p style={{ margin: "2px 0" }}>
              <strong>Branch:</strong> Peth Vadgaon
            </p>

            <p style={{ margin: "2px 0" }}>
              <strong>IFSC:</strong> BKID0000922
            </p>

            <p style={{ margin: "2px 0" }}>
              <strong>A/c. No.:</strong> 092220110000773
            </p>

          </div>
        </div>

        {/* Invoice Information */}
        <div
          style={{
            textAlign: "right",
            minWidth: "150px",
          }}
        >
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "bold",
              margin: "0 0 12px 0",
            }}
          >
            INVOICE
          </h3>

          <p style={{ fontSize: "14px", fontWeight: "600", margin: "6px 0" }}>
            Invoice Number : {invoiceData?.invoiceNumber || "-"}
          </p>

          
          <p style={{ margin: "2px 0" }}>
              <strong>GSTIN:</strong> 27BXJPG3749K1Z1
            </p>
            <p style={{ margin: "6px 0 0 0" }}>
              <strong>FDA Lic. No.:</strong> 21525086001585
            </p>
        </div>
      </div>

      {/* Customer Information */}
      <div style={{ marginBottom: "32px",fontSize: "12px" }}>
        <p style={{ fontSize: "13px", margin: "6px 0" }}>
            Date:{" "}
            {invoiceData?.issueDate
              ? new Date(invoiceData.issueDate).toLocaleDateString("en-IN")
              : "-"}
          </p>
        <h3 style={{ fontWeight: "600", marginBottom: "8px",fontSize:"14px" }}>
          Bill To:
        </h3>

        <p style={{ margin: "2px 0" }}>
          <strong>Name : </strong>
          {invoiceData?.client?.clientname || "-"}
        </p>

        <p style={{ margin: "4px 0", whiteSpace: "pre-line" }}>
          <strong>Address : </strong>
          {invoiceData?.client?.address || "-"}
        </p>
        <p style={{ margin: "4px 0", whiteSpace: "pre-line" }}>
          <strong>GSTN Number : </strong>
          {invoiceData?.client?.gstNumber
 || "-"}
        </p>
        <p style={{ margin: "4px 0", whiteSpace: "pre-line" }}>
          <strong>Contact : </strong>
          {invoiceData?.client?.phone
 || "-"}
        </p>
      </div>

      {/* Items Table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "24px",
        }}
      >
        <thead style={{ backgroundColor: "#e5e7eb" }}>
          <tr>
            <th
              style={{
                border: "1px solid #d1d5db",
                padding: "8px",
                textAlign: "left",
              }}
            >
              Description
            </th>

            <th
              style={{
                border: "1px solid #d1d5db",
                padding: "8px",
                textAlign: "center",
              }}
            >
              Item Qty
            </th>
            <th
              style={{
                border: "1px solid #d1d5db",
                padding: "8px",
                textAlign: "center",
              }}
            >
              Box Qty
            </th>

            <th
              style={{
                border: "1px solid #d1d5db",
                padding: "8px",
                textAlign: "right",
              }}
            >
              Rate (₹)
            </th>

            <th
              style={{
                border: "1px solid #d1d5db",
                padding: "8px",
                textAlign: "right",
              }}
            >
              Amount (₹)
            </th>
          </tr>
        </thead>

        <tbody>
          {invoiceData?.items?.map((item, index) => (
            <tr key={item.id ?? index}>
              <td
                style={{
                  border: "1px solid #d1d5db",
                  padding: "8px",
                }}
              >
                {item.itemname}
              </td>

              <td
                style={{
                  border: "1px solid #d1d5db",
                  padding: "8px",
                  textAlign: "center",
                }}
              >
                {item.quantity*item.boxQty}
              </td>
              <td
                style={{
                  border: "1px solid #d1d5db",
                  padding: "8px",
                  textAlign: "center",
                }}
              >
                {item.boxQty}
              </td>

              <td
                style={{
                  border: "1px solid #d1d5db",
                  padding: "8px",
                  textAlign: "right",
                }}
              >
                {formatAmount(item.rate)}
              </td>

              <td
                style={{
                  border: "1px solid #d1d5db",
                  padding: "8px",
                  textAlign: "right",
                }}
              >
                {formatAmount(item.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Invoice Totals */}
      <div style={{ textAlign: "right", marginBottom: "24px" }}>
        <p>
          Subtotal:{" "}
          <span style={{ fontWeight: "600" }}>
            ₹{formatAmount(invoiceData?.subtotal)}
          </span>
        </p>

        {/* <p>
          Discount:{" "}
          <span style={{ fontWeight: "600" }}>− ₹{formatAmount(invoiceData?.discount)}</span>
        </p> */}

        <p>
          CGST ({Number(invoiceData?.taxRate || 0)/2}%):{" "}
          <span style={{ fontWeight: "600" }}>
            ₹{formatAmount(invoiceData?.tax)/2}
          </span>
        </p>
        <p>
          SGST ({Number(invoiceData?.taxRate || 0)/2}%):{" "}
          <span style={{ fontWeight: "600" }}>
            ₹{formatAmount(invoiceData?.tax)/2}
          </span>
        </p>

        <p style={{ fontSize: "18px", fontWeight: "bold" }}>
          Total: ₹{formatAmount(invoiceData?.total)}
        </p>
        {Number(invoiceData?.returnedAmount || 0) > 0 && <>
          <p>Sales return credit: <span style={{ fontWeight: "600" }}>− ₹{formatAmount(invoiceData.returnedAmount)}</span></p>
          <p>Net invoice after returns: <span style={{ fontWeight: "600" }}>₹{formatAmount(Number(invoiceData.total || 0) - Number(invoiceData.returnedAmount || 0))}</span></p>
          <p>Payments received: <span style={{ fontWeight: "600" }}>₹{formatAmount(invoiceData.paidAmount || 0)}</span></p>
          {Number(invoiceData.creditApplied || 0) > 0 && <p>Customer credit applied: <span style={{ fontWeight: "600" }}>− ₹{formatAmount(invoiceData.creditApplied)}</span></p>}
          <p style={{ fontSize: "16px", fontWeight: "bold" }}>Current balance: ₹{formatAmount(Math.max(0, Number(invoiceData.total || 0) - Number(invoiceData.returnedAmount || 0) - Number(invoiceData.paidAmount || 0) - Number(invoiceData.creditApplied || 0)))}</p>
        </>}
        {Number(invoiceData?.creditApplied || 0) > 0 && !Number(invoiceData?.returnedAmount || 0) && <p>Customer credit applied: − ₹{formatAmount(invoiceData.creditApplied)}</p>}
      </div>

      {/* Notes */}
      <div
        style={{
          borderTop: "1px solid #d1d5db",
          paddingTop: "12px",
          marginTop: "32px",
        }}
      >
        <h3 style={{ fontWeight: "600", margin: 0 }}>
          Notes: Thank you!!
        </h3>
      </div>
    </div>
  );
};

export default InvoicePrint;
