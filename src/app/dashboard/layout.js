"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Download,
  FileText,
  LayoutDashboard,
  Menu,
  Package,
  ShoppingCart,
  Users,
  Wallet,
  X,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import AiAssistantLauncher from "@/components/AiAssistantLauncher";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Billing & Sales", href: "/dashboard/bill", icon: FileText },
  { label: "Customers", href: "/dashboard/client", icon: Users },
  { label: "Stock", href: "/dashboard/stock", icon: Boxes },
  { label: "Purchases", href: "/dashboard/buy", icon: ShoppingCart },
  { label: "Payments", href: "/dashboard/payment", icon: Wallet },
  { label: "Orders", href: "/dashboard/orders", icon: Package },
  { label: "Profit & Loss", href: "/dashboard/profitloss", icon: BarChart3 },
  { label: "Export & Backup", href: "/dashboard/export", icon: Download },
];

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // The overview already includes the responsive workspace chrome.
  if (pathname === "/dashboard") return children;

  const title = pathname.startsWith("/dashboard/billinghistory")
    ? "Billing & Sales"
    : navigation.find(
        (item) =>
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)),
      )?.label || "Invoice";
  const billingActive =
    pathname === "/dashboard/bill" ||
    pathname.startsWith("/dashboard/billinghistory");
  return (
    <div className="workspace-frame">
      {menuOpen && (
        <button
          className="workspace-scrim"
          onClick={() => setMenuOpen(false)}
          aria-label="Close navigation menu"
        />
      )}
      <aside
        className={`workspace-sidebar ${menuOpen ? "workspace-sidebar-open" : ""}`}
        aria-label="Main navigation"
      >
        <div className="workspace-brand-row">
          <Link
            href="/dashboard"
            className="workspace-brand"
            aria-label="Gurukrupa Agency overview"
            onClick={() => setMenuOpen(false)}
          >
            <Image
              src="/Gurukrupa%20logo.png"
              alt="Gurukrupa Agency"
              width={797}
              height={222}
              className="workspace-brand-logo"
              priority
            />
          </Link>
          <button
            className="workspace-close"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <p className="workspace-label">WORKSPACE</p>
        <nav className="workspace-nav">
          {navigation.map(({ label, href, icon: Icon }) => {
            const active =
              label === "Billing & Sales"
                ? billingActive
                : pathname === href ||
                  (href !== "/dashboard" && pathname.startsWith(`${href}/`));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`workspace-nav-link ${active ? "workspace-nav-active" : ""}`}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        {/* <div className="workspace-help">
          <strong>Business management</strong>
          <p>Billing, inventory and customer accounts in one place.</p>
          <Link href="/dashboard">
            Go to overview <ArrowRight size={14} />
          </Link>
        </div> */}
        <div className="workspace-account">
          <span>GA</span>
          <div>
            <strong>Gurukrupa Agency</strong>
            <small>Business account</small>
          </div>
        </div>
      </aside>
      {!menuOpen && <AiAssistantLauncher />}
      <div className="workspace-main">
        <header className="workspace-topbar">
          <button
            className="workspace-menu-button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>
          <div className="workspace-crumb">
            Workspace <span>/</span> <strong>{title}</strong>
          </div>
          <div className="workspace-topbar-actions">
            <ThemeToggle />
          </div>
        </header>
        <div className="workspace-page-content">{children}</div>
      </div>
    </div>
  );
}
