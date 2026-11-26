"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, DollarSign, ExternalLink, LogOut, ShieldAlert, ShieldCheck, Sparkles, Store } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface AdminBusiness {
  id: string;
  name: string;
  slug: string;
  category: string;
  status: "active" | "suspended";
  subscription_plan: string;
  owner_name: string;
  owner_email: string;
  subdomain: string;
  is_published: number;
  monthly_price_cents: number;
  products_count: number;
  orders_count: number;
  customers_count: number;
  gmv_cents: number;
}

export default function AdminPanelPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [totals, setTotals] = useState<{
    totalBusinesses: number;
    activeBusinesses: number;
    publishedStores: number;
    totalGmvCents: number;
    totalMrrCents: number;
    totalOrders: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin");
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    const data = await res.json();
    setBusinesses(data.businesses || []);
    setTotals(data.totals || null);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateBusiness(businessId: string, payload: Record<string, unknown>) {
    await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, ...payload }),
    });
    load();
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">Loading Platform Admin...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-navy-900">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-navy-900">SellGenius AI — Platform Administration</h1>
              <p className="text-xs text-slate-500">Multi-tenant governance, subscriptions &amp; system-wide telemetry</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs font-semibold text-slate-600 hover:text-brand-600">
              Platform Home
            </Link>
            <button
              type="button"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                router.push("/login");
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
        {totals && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Registered Businesses", value: `${totals.activeBusinesses} / ${totals.totalBusinesses} active`, icon: Building2 },
              { label: "Published Storefronts", value: String(totals.publishedStores), icon: Store },
              { label: "Platform GMV", value: formatCurrency(totals.totalGmvCents), icon: DollarSign },
              { label: "Platform Subscription MRR", value: formatCurrency(totals.totalMrrCents), icon: ShieldCheck },
            ].map((card) => (
              <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-500">
                  <span>{card.label}</span>
                  <card.icon className="h-4 w-4 text-brand-600" />
                </div>
                <p className="mt-2 text-2xl font-bold text-navy-900">{card.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-bold text-navy-900">Seller Tenants &amp; Storefronts</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Business &amp; Owner</th>
                  <th className="px-4 py-3">Storefront</th>
                  <th className="px-4 py-3">Usage</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Governance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {businesses.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-3">
                      <p className="font-bold text-navy-900">{b.name}</p>
                      <p className="text-xs text-slate-500">
                        {b.owner_name} ({b.owner_email})
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <a
                        href={`/store/${b.subdomain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono font-semibold text-brand-600 hover:underline"
                      >
                        {b.subdomain}.sellgenius.com <ExternalLink className="h-3 w-3" />
                      </a>
                      <div className="mt-0.5 text-slate-500">{b.is_published ? "Published" : "Unpublished"}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <div>{b.products_count} products • {b.orders_count} orders</div>
                      <div className="font-semibold text-navy-900">GMV: {formatCurrency(b.gmv_cents)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={b.subscription_plan}
                        onChange={(e) => updateBusiness(b.id, { subscriptionPlan: e.target.value })}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold capitalize"
                      >
                        <option value="starter">Starter ($19)</option>
                        <option value="growth">Growth ($49)</option>
                        <option value="scale">Scale ($99)</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                          b.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {b.status === "active" ? (
                        <button
                          type="button"
                          onClick={() => updateBusiness(b.id, { status: "suspended" })}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          <ShieldAlert className="h-3.5 w-3.5" /> Suspend
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => updateBusiness(b.id, { status: "active" })}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" /> Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
