const exports = [
  ["customers", "Customer ledgers", "Customer name, address, phone and GSTIN."],
  ["stock", "Stock items and opening quantities", "Item, pieces per box, available boxes, pieces and unit cost."],
  ["sales", "Sales invoices", "Invoice totals, GST, paid amount and customer balance."],
  ["sales-returns", "Sales returns", "Return dates, quantities, credited value and reason."],
  ["purchases", "Purchase invoices", "Supplier, supplier bill number, GST, paid amount and balance."],
  ["purchase-returns", "Purchase returns", "Supplier returns with item quantities, credited value and reason."],
  ["payments", "Receipt entries", "Customer receipts by invoice, date, method and reference."],
  ["customer-credits", "Customer credits", "Credits created by returns and applied to future invoices."],
  ["supplier-credits", "Supplier credits", "Supplier credits created by returns and applied to future purchases."],
  ["expenses", "Business expenses", "Operating expense entries by date and payment method."],
];

export default function ExportPage() {
  return <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-[.18em] text-amber-400">Data management</p><h1 className="mt-2 text-3xl font-bold">Export &amp; Backup</h1><p className="mt-2 text-sm text-slate-400">Download recorded business data for your files and TallyPrime transfer preparation.</p></header>
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-semibold">CSV exports</h2><p className="mt-1 text-sm text-slate-400">Files use UTF-8 encoding and include the fields listed below.</p><div className="mt-4 divide-y divide-slate-800">{exports.map(([type, title, detail]) => <div key={type} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-semibold text-white">{title}</h3><p className="mt-1 text-xs text-slate-400">{detail}</p></div><a href={`/api/export?type=${type}`} className="inline-flex w-fit rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-300">Download CSV</a></div>)}</div></section>
    <section className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-blue-950"><h2 className="font-semibold">Full backup</h2><p className="mt-1 text-sm">Download a JSON backup containing customers, stock lots, sales and correction history, purchases, receipts, returns and expenses.</p><a href="/api/export?type=backup" className="mt-4 inline-flex rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800">Download full backup</a></section>
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950"><h2 className="font-semibold">TallyPrime transfer note</h2><p className="mt-1">These CSV files are data exports; they are not guaranteed TallyPrime import templates. Test with a copy in TallyPrime and verify ledgers, GST treatment, item units and opening balances before using the imported records for accounts.</p></section>
  </div></main>;
}
