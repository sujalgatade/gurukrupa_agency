"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import LoadingAnimation from "@/components/LoadingAnimation";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  ChevronDown,
  CircleHelp,
  Download,
  FilePlus2,
  FileText,
  LayoutDashboard,
  Menu,
  Package,
  Search,
  Settings2,
  ShoppingCart,
  Users,
  Wallet,
  X,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import AiAssistantLauncher from "@/components/AiAssistantLauncher";

const menu = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Billing & Sales", href: "/dashboard/bill", icon: FileText },
  { label: "Customers", href: "/dashboard/client", icon: Users },
  { label: "Inventory", href: "/dashboard/stock", icon: Boxes },
  { label: "Purchases", href: "/dashboard/buy", icon: ShoppingCart },
  { label: "Payments", href: "/dashboard/payment", icon: Wallet },
  { label: "Orders", href: "/dashboard/orders", icon: Package },
  { label: "Profit & Loss", href: "/dashboard/profitloss", icon: BarChart3 },
  { label: "Export & Backup", href: "/dashboard/export", icon: Download },
];
const currency = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const asArray = (value) =>
  Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : [];
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  if(hour<22) return "Good Evening";
  return "Good Night"
};

export default function Dashboard() {
  const [data, setData] = useState({
    bills: [],
    items: [],
    clients: [],
    purchases: [],
  });
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [query, setQuery] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [greeting, setGreeting] = useState("Good morning");

  useEffect(() => {
    const updateGreeting = () => setGreeting(getGreeting());
    updateGreeting();
    const interval = window.setInterval(updateGreeting, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      fetch("/api/bill", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : Promise.reject(),
      ),
      fetch("/api/items?unique=true&bill=true", { cache: "no-store" }).then(
        (r) => (r.ok ? r.json() : Promise.reject()),
      ),
      fetch("/api/client", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : Promise.reject(),
      ),
      fetch("/api/buy-bill", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : Promise.reject(),
      ),
    ]).then((results) => {
      if (!active) return;
      setData({
        bills:
          results[0].status === "fulfilled" ? asArray(results[0].value) : [],
        items:
          results[1].status === "fulfilled" ? asArray(results[1].value) : [],
        clients:
          results[2].status === "fulfilled" ? asArray(results[2].value) : [],
        purchases:
          results[3].status === "fulfilled" ? asArray(results[3].value) : [],
      });
      setApiError(results.some((result) => result.status === "rejected"));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const dateKey = (value) => {
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const todayKey = dateKey(new Date());
  const todayBills = data.bills.filter(
    (bill) => dateKey(bill.issueDate) === todayKey,
  );
  const todayReturns = data.bills
    .flatMap((bill) => bill.returns || [])
    .filter((entry) => dateKey(entry.date) === todayKey);
  const todaySales =
    todayBills.reduce((sum, bill) => sum + Number(bill.total || 0), 0) -
    todayReturns.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const openingDue = data.clients.reduce(
    (sum, client) =>
      sum +
      Math.max(
        0,
        Number(client.openingBalance || 0) -
          Number(client.openingBalancePaid || 0),
      ),
    0,
  );
  const outstanding =
    openingDue +
    data.bills.reduce(
      (sum, bill) =>
        sum +
        (bill.isPaid
          ? 0
          : Math.max(
              0,
              Number(bill.total || 0) -
                Number(bill.paidAmount || 0) -
                Number(bill.returnedAmount || 0) -
                Number(bill.creditApplied || 0),
            )),
      0,
    );
  const supplierPayable = data.purchases.reduce(
    (sum, purchase) =>
      sum +
      Math.max(
        0,
        Number(purchase.total || 0) -
          Number(purchase.paidAmount || 0) -
          Number(purchase.returnedAmount || 0) -
          Number(purchase.supplierCreditApplied || 0),
      ),
    0,
  );
  const todayReceipts =
    data.bills.reduce(
      (sum, bill) =>
        sum +
        (bill.paymentEntries || [])
          .filter((entry) => dateKey(entry.receivedAt) === todayKey)
          .reduce((amount, entry) => amount + Number(entry.amount || 0), 0),
      0,
    ) +
    data.clients.reduce(
      (sum, client) =>
        sum +
        (client.openingBalanceEntries || [])
          .filter((entry) => dateKey(entry.receivedAt) === todayKey)
          .reduce((amount, entry) => amount + Number(entry.amount || 0), 0),
      0,
    );
  const todayGrossProfit =
    todayBills.reduce((sum, bill) => sum + Number(bill.profit || 0), 0) -
    todayReturns.reduce(
      (sum, entry) => sum + Number(entry.profitReduction || 0),
      0,
    );
  const stockUnits = data.items.reduce(
    (sum, item) => sum + Number(item.box || 0) * Number(item.itemperbox || 0),
    0,
  );
  const stockValue = data.items.reduce(
    (sum, item) =>
      sum +
      Number(item.box || 0) *
        Number(item.itemperbox || 0) *
        Number(item.originalrate || 0),
    0,
  );
  const outOfStock = data.items.filter((item) => Number(item.box || 0) <= 0);
  const lowStock = data.items.filter(
    (item) => Number(item.box || 0) > 0 && Number(item.box || 0) <= 2,
  );
  const recentBills = [...data.bills]
    .sort(
      (a, b) =>
        new Date(b.issueDate || b.createdAt) -
        new Date(a.issueDate || a.createdAt),
    )
    .slice(0, 5);
  const topProduct = data.bills
    .flatMap((bill) => bill.items || [])
    .reduce((totals, line) => {
      const name = line.itemname || "Unnamed product";
      totals[name] =
        (totals[name] || 0) +
        Number(line.quantity || 0) *
          Math.max(
            0,
            Number(line.boxQty || 0) - Number(line.returnedBoxes || 0),
          );
      return totals;
    }, {});
  const bestSeller = Object.entries(topProduct).sort((a, b) => b[1] - a[1])[0];
  const searchResults = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return [
      ...data.bills
        .filter(
          (bill) =>
            String(bill.invoiceNumber).includes(term) ||
            String(bill.client?.clientname || "")
              .toLowerCase()
              .includes(term),
        )
        .map((bill) => ({
          title: `Bill #${bill.invoiceNumber}`,
          detail: bill.client?.clientname || "Customer not linked",
          href: "/dashboard/bill",
        })),
      ...data.clients
        .filter(
          (client) =>
            String(client.clientname || "")
              .toLowerCase()
              .includes(term) || String(client.phone || "").includes(term),
        )
        .map((client) => ({
          title: client.clientname,
          detail: client.phone || "Customer",
          href: "/dashboard/client",
        })),
      ...data.items
        .filter((item) =>
          String(item.itemname || "")
            .toLowerCase()
            .includes(term),
        )
        .map((item) => ({
          title: item.itemname,
          detail:
            Number(item.box || 0) <= 0
              ? "Out of stock"
              : `${item.box} boxes in stock`,
          href: "/dashboard/stock",
        })),
    ].slice(0, 6);
  }, [data, query]);

  const stats = [
    {
      label: "Today's sales",
      value: currency(todaySales),
      note: `${todayBills.length} invoices today`,
      icon: ArrowUpRight,
      tone: "blue",
    },
    {
      label: "Payments received today",
      value: currency(todayReceipts),
      note: "Recorded customer receipts",
      icon: ArrowDownLeft,
      tone: "green",
    },
    {
      label: "Customer receivables",
      value: currency(outstanding),
      note: "Total invoice balance",
      icon: Wallet,
      tone: "amber",
    },
    {
      label: "Stock value",
      value: currency(stockValue),
      note: `${stockUnits.toLocaleString("en-IN")} pieces on hand`,
      icon: Boxes,
      tone: "violet",
    },
    {
      label: "Supplier payables",
      value: currency(supplierPayable),
      note: "Unpaid purchase balances",
      icon: ShoppingCart,
      tone: "amber",
    },
    // {
    //   label: "Today's gross profit",
    //   value: currency(todayGrossProfit),
    //   note: "Recorded invoice margin before expenses",
    //   icon: ArrowUpRight,
    //   tone: "blue",
    // },
  ];

  return (
    <div className="app-shell">
      {!mobileNav && <AiAssistantLauncher />}
      {mobileNav && (
        <button
          className="mobile-scrim"
          aria-label="Close menu"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <Link href="/dashboard" className="brand-logo-card" aria-label="Gurukrupa Agency overview" onClick={() => setMobileNav(false)}>
            <Image
              src="/Gurukrupa%20logo.png"
              alt="Gurukrupa Agency"
              width={797}
              height={222}
              className="brand-logo"
              priority
            />
          </Link>
          <button
            className="mobile-close"
            onClick={(e) => {
              setMobileNav(false);
            }}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {menu.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              onClick={() => setMobileNav(false)}
              className={`nav-link ${label === "Overview" ? "nav-active" : ""}`}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {label === "Inventory" &&
                lowStock.length + outOfStock.length > 0 && (
                  <b className="nav-count">
                    {lowStock.length + outOfStock.length}
                  </b>
                )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        {/* <div className="help-card">
          <div className="help-icon">
            <CircleHelp size={17} />
          </div>
          <strong>Need a hand?</strong>
          <p>Your business overview, all in one place.</p>
          <Link href="/dashboard">
            Explore dashboard <ArrowRight size={14} />
          </Link>
        </div> */}
        {/* <div className="user-card">
          <div className="user-avatar">GA</div>
          <div className="user-name">
            <strong>Gurukrupa Agency</strong>
            <small>Business account</small>
          </div>
          <ChevronDown size={15} className="muted-icon" />
        </div> */}
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button
            className="menu-toggle"
            onClick={() => setMobileNav(true)}
            aria-label="Open navigation"
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>Dashboard</strong>
          </div>
          <div className="topbar-right">
            <label className="search-box">
              <Search size={17} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search bills, customers, products..."
                aria-label="Search bills, customers, products"
              />
            </label>
            <ThemeToggle />
            {/* <button className="icon-button" aria-label="Settings">
              <Settings2 size={18} />
            </button> */}
          </div>
        </header>
        <div className="page-content">
          <section className="welcome-row">
            <div>
              <div className="eyebrow">
                <span className="live-dot" /> BUSINESS DASHBOARD
              </div>
              <h1>
                {greeting}, Gurukrupa Agency<span>👋</span>
              </h1>
              <p>Here’s what’s happening with your business today.</p>
            </div>
            <Link className="primary-button" href="/dashboard/createbill">
              <FilePlus2 size={40} /> Create New Invoice
            </Link>
          </section>
          {query.trim() && (
            <section className="search-results">
              <div className="search-results-head">
                <strong>Search results</strong>
                <button onClick={() => setQuery("")}>Clear</button>
              </div>
              {searchResults.length ? (
                searchResults.map((result, index) => (
                  <Link key={`${result.title}-${index}`} href={result.href}>
                    <Search size={15} />
                    <span>
                      <strong>{result.title}</strong>
                      <small>{result.detail}</small>
                    </span>
                    <ArrowRight size={15} />
                  </Link>
                ))
              ) : (
                <p>No matching bills, customers, or products.</p>
              )}
            </section>
          )}
          {apiError && (
            <div className="data-notice">
              Some business records could not be loaded. Summary figures may be
              incomplete.
            </div>
          )}
          <section className="stats-grid" aria-label="Business summary">
            {stats.map(({ label, value, note, icon: Icon, tone }) => (
              <article className="stat-card" key={label}>
                <div className="stat-top">
                  <span>{label}</span>
                  <span className={`stat-icon ${tone}`}>
                    <Icon size={18} />
                  </span>
                </div>
                <strong className="stat-value">{loading ? "—" : value}</strong>
                <div className="stat-note">
                  <span className={`note-dot ${tone}`} />
                  {loading ? <span className="inline-flex items-center gap-1"><LoadingAnimation size={28} label="Loading business records" />Loading records</span> : note}
                </div>
              </article>
            ))}
          </section>
          <section className="content-grid">
            <article className="panel recent-panel">
              <div className="panel-heading">
                <div>
                  <h2>Recent invoices</h2>
                  <p>Your latest customer billing activity</p>
                </div>
                <Link href="/dashboard/bill" className="text-link">
                  View all <ArrowRight size={15} />
                </Link>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>INVOICE</th>
                      <th>CUSTOMER</th>
                      <th>DATE</th>
                      <th>AMOUNT</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="empty-state">
                          <span className="inline-flex items-center gap-2"><LoadingAnimation size={32} label="Loading invoices" />Loading invoices…</span>
                        </td>
                      </tr>
                    ) : recentBills.length ? (
                      recentBills.map((bill) => (
                        <tr key={bill._id}>
                          <td>
                            <span className="invoice-id">
                              #{bill.invoiceNumber}
                            </span>
                          </td>
                          <td>
                            <span className="customer-cell">
                              <span className="customer-avatar">
                                {(bill.client?.clientname || "C")
                                  .slice(0, 1)
                                  .toUpperCase()}
                              </span>
                              {bill.client?.clientname || "Walk-in customer"}
                            </span>
                          </td>
                          <td>
                            {bill.issueDate
                              ? new Date(bill.issueDate).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )
                              : "—"}
                          </td>
                          <td className="amount-cell">
                            {currency(bill.total)}
                          </td>
                          <td>
                            <span
                              className={`status-pill ${bill.isPaid ? "paid" : "due"}`}
                            >
                              <i />
                              {bill.isPaid ? "Paid" : "Due"}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="empty-state">
                          No invoices yet. Create your first invoice to see
                          activity here.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
            <article className="panel stock-panel">
              <div className="panel-heading">
                <div>
                  <h2>Stock watch</h2>
                  <p>Products that need attention</p>
                </div>
                <Link
                  href="/dashboard/stock"
                  className="round-link"
                  aria-label="View inventory"
                >
                  <ArrowRight size={16} />
                </Link>
              </div>
              <div className="stock-summary">
                <span className="stock-summary-icon">
                  <Boxes size={18} />
                </span>
                <span>
                  <strong>{loading ? "—" : lowStock.length}</strong>
                  <small>Low stock items</small>
                </span>
                <span className="stock-caption">1–2 boxes remaining</span>
              </div>
              {!loading && outOfStock.length > 0 && (
                <div className="out-of-stock-alert" role="status">
                  <span className="out-of-stock-mark" aria-hidden="true">
                    !
                  </span>
                  <div>
                    <strong>
                      Out of stock · {outOfStock.length}{" "}
                      {outOfStock.length === 1 ? "product" : "products"}
                    </strong>
                    <p>
                      {outOfStock
                        .slice(0, 3)
                        .map((item) => item.itemname)
                        .join(", ")}
                      {outOfStock.length > 3
                        ? ` and ${outOfStock.length - 3} more`
                        : ""}
                    </p>
                  </div>
                </div>
              )}
              <div className="stock-list">
                {loading ? (
                  <div className="stock-empty"><LoadingAnimation size={48} label="Loading inventory" />Loading inventory…</div>
                ) : lowStock.length ? (
                  lowStock.slice(0, 4).map((item) => (
                    <div className="stock-item" key={item._id}>
                      <span className="product-icon">
                        <Package size={16} />
                      </span>
                      <span className="product-name">
                        <strong>{item.itemname}</strong>
                        <small>{item.itemperbox || 0} pcs / box</small>
                      </span>
                      <span className="stock-qty">
                        {item.box || 0}
                        <small>boxes</small>
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="stock-empty">
                    No products are running low.
                  </div>
                )}
              </div>
              {bestSeller && (
                <div className="stock-summary best-seller">
                  <span className="product-icon">
                    <Package size={16} />
                  </span>
                  <span className="product-name">
                    <small>Best seller · all recorded sales</small>
                    <strong>{bestSeller[0]}</strong>
                  </span>
                  <span className="stock-qty">
                    {bestSeller[1]}
                    <small>pieces</small>
                  </span>
                </div>
              )}
              <Link href="/dashboard/stock" className="stock-footer">
                Manage Stock <ArrowRight size={15} />
              </Link>
            </article>
          </section>
          <section className="quick-section">
            <div className="panel-heading">
              <div>
                <h2>Quick actions</h2>
                <p>Get common tasks done faster</p>
              </div>
            </div>
            <div className="quick-grid">
              <Link href="/dashboard/createbill" className="quick-card">
                <span className="quick-icon blue">
                  <FilePlus2 size={19} />
                </span>
                <span>
                  <strong>New invoice</strong>
                  <small>Create a customer bill</small>
                </span>
                <ArrowRight size={16} />
              </Link>
              <Link href="/dashboard/client" className="quick-card">
                <span className="quick-icon green">
                  <Users size={19} />
                </span>
                <span>
                  <strong>Add customer</strong>
                  <small>Manage customer accounts</small>
                </span>
                <ArrowRight size={16} />
              </Link>
              <Link href="/dashboard/buy" className="quick-card">
                <span className="quick-icon violet">
                  <ShoppingCart size={19} />
                </span>
                <span>
                  <strong>Record purchase</strong>
                  <small>Add stock from supplier</small>
                </span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </section>
          <footer className="dashboard-footer">
            <span>
              Gurukrupa Agency <span>·</span> Developed By SUJAL GATADE
            </span>
            <span>Data shown from recorded invoices and stock</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
