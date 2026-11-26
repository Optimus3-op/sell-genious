"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bot,
  Boxes,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Kanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Sparkles,
  Store,
  UserCheck,
  Users,
  Wand2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SellerContext } from "@/lib/types";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/store", label: "My Online Store", icon: Store },
  { href: "/dashboard/products", label: "Products", icon: Package },
  { href: "/dashboard/inventory", label: "Inventory", icon: Boxes },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/crm", label: "CRM", icon: UserCheck },
  { href: "/dashboard/pipeline", label: "Sales Pipeline", icon: Kanban },
  { href: "/dashboard/ai-advisor", label: "AI Growth Advisor", icon: Bot, highlight: true },
  { href: "/dashboard/marketing", label: "Marketing Studio", icon: Wand2 },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [seller, setSeller] = useState<SellerContext | null>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: { user?: { role: string } | null; seller?: SellerContext | null }) => {
        if (!data.user) {
          router.push("/login");
          return;
        }
        if (data.user.role === "platform_admin" && !data.seller) {
          router.push("/admin");
          return;
        }
        if (!data.seller) {
          router.push("/login");
          return;
        }
        setSeller(data.seller);
        setCheckedAuth(true);
      })
      .catch(() => {
        router.push("/login");
      });
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (!checkedAuth || !seller) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
        Loading SellGenius AI workspace...
      </div>
    );
  }

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white border-r border-slate-200">
      <div>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-violet-600 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            {!collapsed && (
              <div className="truncate">
                <p className="text-sm font-bold text-navy-900 truncate">SellGenius AI</p>
                <p className="text-[11px] text-slate-500 truncate">{seller.businessName}</p>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:inline-flex"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="space-y-1 p-3">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  active
                    ? "bg-brand-50 text-brand-700"
                    : item.highlight
                      ? "text-violet-700 hover:bg-violet-50"
                      : "text-slate-600 hover:bg-slate-100 hover:text-navy-900"
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-brand-600" : item.highlight ? "text-violet-600" : "text-slate-400")} />
                {!collapsed && (
                  <span className="flex flex-1 items-center justify-between truncate">
                    {item.label}
                    {item.highlight && (
                      <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">AI</span>
                    )}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-200 p-3 space-y-2">
        {!collapsed && (
          <a
            href={`/store/${seller.storeSubdomain}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-navy-900 hover:bg-slate-100"
          >
            <span className="truncate">
              {seller.storePublished ? "Live Storefront" : "Preview Draft Store"}
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-brand-600 shrink-0" />
          </a>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-700"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign Out ({seller.user.fullName.split(" ")[0]})</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-navy-900">
      {/* Desktop Sidebar */}
      <aside className={cn("hidden shrink-0 transition-all duration-200 lg:block", collapsed ? "w-16" : "w-64")}>
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 w-64">{sidebarContent}</div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs font-medium text-slate-500">
                {seller.businessName} •{" "}
                <span className="font-mono text-brand-600">{seller.storeSubdomain}.sellgenius.com</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/ai-advisor"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-95"
            >
              <Bot className="h-3.5 w-3.5" /> Ask AI Advisor
            </Link>
            <a
              href={`/store/${seller.storeSubdomain}`}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-navy-900 hover:bg-slate-50 sm:inline-flex"
            >
              View Store <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
