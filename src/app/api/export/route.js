import dbConnect from "@/lib/db";
import Bill from "@/models/Bill";
import Client from "@/models/Client";
import Expense from "@/models/Expense";
import Item from "@/models/Item";
import Purchase from "@/models/Purchase";
import Supplier from "@/models/Supplier";

const csvValue = (value) => {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};
const csv = (records) => {
  if (!records.length) return "";
  const headers = Object.keys(records[0]);
  return [headers.map(csvValue).join(","), ...records.map((record) => headers.map((header) => csvValue(record[header])).join(","))].join("\r\n");
};

export async function GET(request) {
  try {
    await dbConnect();
    const type = new URL(request.url).searchParams.get("type") || "backup";
    const [clients, items, bills, purchases, expenses, suppliers] = await Promise.all([
      Client.find({}).lean(), Item.find({}).lean(), Bill.find({}).populate("client").lean(),
      Purchase.find({}).lean(), Expense.find({}).lean(), Supplier.find({}).lean(),
    ]);

    if (type === "backup") {
      const body = JSON.stringify({ exportedAt: new Date().toISOString(), clients, items, bills, purchases, expenses, suppliers }, null, 2);
      return new Response(body, { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="gurukrupa-backup-${new Date().toISOString().slice(0, 10)}.json"`, "Cache-Control": "no-store" } });
    }

    let records;
    if (type === "customers") records = clients.map(({ clientname, address, phone, gstNumber, openingBalance, openingBalancePaid, creditLimit, creditBalance, createdAt }) => ({ name: clientname, address, phone, gstNumber, openingBalance, openingBalancePaid, openingBalanceDue: Math.max(0, Number(openingBalance || 0) - Number(openingBalancePaid || 0)), creditLimit, creditBalance, createdAt }));
    else if (type === "stock") records = items.map(({ itemname, itemperbox, box, originalrate, purchaseRatePerBox, date }) => ({ itemname, piecesPerBox: itemperbox, boxes: box, pieces: Number(itemperbox || 0) * Number(box || 0), unitCost: originalrate, purchaseRatePerBox, date }));
    else if (type === "sales") records = bills.map((bill) => ({ invoiceNumber: bill.invoiceNumber, date: bill.issueDate, customer: bill.client?.clientname || "", subtotal: bill.subtotal, taxRate: bill.taxRate, gst: bill.tax, total: bill.total, returned: bill.returnedAmount || 0, netTotal: Math.max(0, Number(bill.total || 0) - Number(bill.returnedAmount || 0)), paid: bill.isPaid && !Number(bill.returnedAmount || 0) && !Number(bill.creditApplied || 0) && !(bill.paymentEntries || []).length && !Number(bill.paidAmount || 0) ? bill.total : bill.paidAmount || 0, creditApplied: bill.creditApplied || 0, balance: bill.isPaid ? 0 : Math.max(0, Number(bill.total || 0) - Number(bill.paidAmount || 0) - Number(bill.returnedAmount || 0) - Number(bill.creditApplied || 0)), items: (bill.items || []).map((item) => `${item.itemname} x ${item.boxQty} boxes`).join("; ") }));
    else if (type === "purchases") records = purchases.map((purchase) => ({ supplier: purchase.supplierName, supplierInvoiceNumber: purchase.supplierInvoiceNumber, date: purchase.date, subtotal: purchase.subtotal, gst: purchase.tax, total: purchase.total, returned: purchase.returnedAmount || 0, paid: purchase.paidAmount, supplierCreditApplied: purchase.supplierCreditApplied || 0, balance: Math.max(0, Number(purchase.total || 0) - Number(purchase.paidAmount || 0) - Number(purchase.returnedAmount || 0) - Number(purchase.supplierCreditApplied || 0)), items: (purchase.items || []).map((item) => `${item.itemname} x ${item.box} boxes`).join("; ") }));
    else if (type === "sales-returns") records = bills.flatMap((bill) => (bill.returns || []).map((entry) => ({ invoiceNumber: bill.invoiceNumber, customer: bill.client?.clientname || "", date: entry.date, amount: entry.amount, reason: entry.reason, items: (entry.items || []).map((item) => `${item.itemname} x ${item.boxes} boxes`).join("; ") })));
    else if (type === "purchase-returns") records = purchases.flatMap((purchase) => (purchase.returns || []).map((entry) => ({ supplier: purchase.supplierName || "", supplierInvoiceNumber: purchase.supplierInvoiceNumber || "", date: entry.date, amount: entry.amount, reason: entry.reason, items: (entry.items || []).map((item) => `${item.itemname} x ${item.boxes} boxes`).join("; ") })));
    else if (type === "payments") records = [
      ...bills.flatMap((bill) => (bill.paymentEntries || []).map((payment) => ({ invoiceNumber: bill.invoiceNumber, customer: bill.client?.clientname || "", accountEntry: "Invoice receipt", receivedAt: payment.receivedAt, amount: payment.amount, method: payment.method, reference: payment.reference }))),
      ...clients.flatMap((client) => (client.openingBalanceEntries || []).map((payment) => ({ invoiceNumber: "", customer: client.clientname || "", accountEntry: "Opening balance receipt", receivedAt: payment.receivedAt, amount: payment.amount, method: payment.method, reference: payment.reference }))),
      ...purchases.flatMap((purchase) => (purchase.paymentEntries || []).map((payment) => ({ invoiceNumber: purchase.supplierInvoiceNumber || "", customer: purchase.supplierName || "", accountEntry: "Supplier payment", receivedAt: payment.paidAt, amount: payment.amount, method: payment.method, reference: payment.reference }))),
    ];
    else if (type === "customer-credits") records = clients.flatMap((client) => (client.creditEntries || []).map((entry) => ({ customer: client.clientname || "", date: entry.date, type: entry.direction, amount: entry.amount, reference: entry.reference, reason: entry.reason })));
    else if (type === "supplier-credits") records = suppliers.flatMap((supplier) => (supplier.creditEntries || []).map((entry) => ({ supplier: supplier.name, date: entry.date, type: entry.direction, amount: entry.amount, reference: entry.reference, reason: entry.reason })));
    else if (type === "expenses") records = expenses.map(({ date, category, amount, paymentMethod, note }) => ({ date, category, amount, paymentMethod, note }));
    else return Response.json({ success: false, message: "Unknown export type." }, { status: 400 });

    const body = `\uFEFF${csv(records)}`;
    return new Response(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="gurukrupa-${type}-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Export failed:", error);
    return Response.json({ success: false, message: "Unable to export records. Check the database connection." }, { status: 500 });
  }
}
