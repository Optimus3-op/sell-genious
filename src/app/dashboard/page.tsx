"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  DollarSign,
  Kanban,
  Package,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { BusinessIntelligenceSnapshot } from "@/lib/ai/tools";

interface OverviewResponse {
  context: { businessName: string; storeSubdomain: string; storePublished: boolean };
  snapshot: BusinessIntelligenceSnapshot;
  recentOrders: Array<{
    id: string;
    order_number: string;
    status: string;
    fulfillment_status: string;
    total_cents: number;
    created_at: string;
    customer_name: string;
  }>;
  recentCustomers: Array<{
    id: string;
    full_name: string;
    email: string;
    segment: string;
    total_spent_cents: number;
    orders_count: number;
  }>;
  recommendations: Array<{
    id: string;
    category: string;
    title: string;
    opportunity_or_problem: string;
    supporting_data: string;
    recommended_action: string;
    expected_impact_estimate: string;
  }>;
  chartSeries: Array<{ date: string; revenue: number; orders: number }>;
}

export default function DashboardOverviewPage() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/overview")
      .then((r) => r.json())
      .then((d: OverviewResponse) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <div className="py-12 text-center text-sm text-slate-500">Loading business overview...</div>;
  }

  const { snapshot, recentOrders, recentCustomers, recommendations, chartSeries } = data;
  const k = snapshot.kpis;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">{snapshot.business.name} Overview</h1>
          <p className="text-sm text-slate-600">
            Real-time commerce, CRM pipeline, and AI growth intelligence in one workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/products"
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-navy-900 hover:bg-slate-50"
          >
            + Add Product
          </Link>
          <Link
            href="/dashboard/store"
            className="rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-700"
          >
            Customize Store
          </Link>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "30-Day Revenue",
            value: formatCurrency(k.totalRevenueCents),
            sub: `AOV: ${formatCurrency(k.averageOrderValueCents)}`,
            icon: DollarSign,
            color: "text-brand-600 bg-brand-50",
          },
          {
            label: "Orders",
            value: String(k.paidOrders),
            sub: `${k.cancelledOrders} cancelled • ${k.repeatPurchaseRatePct}% repeat rate`,
            icon: ShoppingBag,
            color: "text-emerald-600 bg-emerald-50",
          },
          {
            label: "CRM Customers",
            value: String(k.totalCustomers),
            sub: `Avg LTV: ${formatCurrency(k.averageLtvCents)}`,
            icon: Users,
            color: "text-violet-600 bg-violet-50",
          },
          {
            label: "Active Products",
            value: String(k.activeProducts),
            sub: `${k.lowStockCount} low-stock alert(s)`,
            icon: Package,
            color: k.lowStockCount > 0 ? "text-amber-600 bg-amber-50" : "text-slate-600 bg-slate-100",
          },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{card.label}</span>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.color}`}>
                <card.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-navy-900">{card.value}</p>
            <p className="mt-1 text-xs text-slate-500">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* AI Growth Advisor Spotlight + Revenue Chart */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-navy-900">Sales Performance Trend</h2>
              <p className="text-xs text-slate-500">Daily revenue ($) across your storefront</p>
            </div>
            <Link href="/dashboard/analytics" className="text-xs font-semibold text-brand-600 hover:underline">
              Full Analytics →
            </Link>
          </div>
          <div className="h-64 w-full">
            {chartSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartSeries}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748B" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="revenue" stroke="#4F46E5" strokeWidth={2.5} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Complete storefront orders to populate sales trend charts.
              </div>
            )}
          </div>
        </div>

        {/* High-Visibility AI Growth Advisor Card */}
        <div className="flex flex-col justify-between rounded-xl border border-violet-200 bg-gradient-to-br from-white via-brand-50/40 to-violet-50/60 p-6 shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700">
                <Bot className="h-3.5 w-3.5" /> AI Growth Advisor
              </div>
              <Sparkles className="h-4 w-4 text-violet-500" />
            </div>
            <h2 className="mt-3 text-base font-bold text-navy-900">Top AI Recommendations</h2>
            <p className="mt-0.5 text-xs text-slate-600">Grounded strictly in your live catalog, CRM &amp; order data.</p>

            <div className="mt-4 space-y-3">
              {recommendations.slice(0, 2).map((rec) => (
                <div key={rec.id} className="rounded-lg border border-violet-100 bg-white p-3 shadow-xs">
                  <p className="text-xs font-bold text-navy-900">{rec.title}</p>
                  <p className="mt-1 text-[11px] text-slate-600">{rec.supporting_data}</p>
                  <p className="mt-1.5 text-[11px] font-medium text-brand-700">Action: {rec.recommended_action}</p>
                </div>
              ))}
            </div>
          </div>

          <Link
            href="/dashboard/ai-advisor"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-600 to-violet-600 px-4 py-2.5 text-xs font-semibold text-white hover:opacity-95"
          >
            Open AI Growth Advisor <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Middle Grid: Top Selling Products + Low Stock Alerts + Sales Pipeline Summary */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-navy-900">Top-Selling Products</h2>
            <Link href="/dashboard/products" className="text-xs font-semibold text-brand-600">
              All Products
            </Link>
          </div>
          <div className="space-y-3">
            {snapshot.topProducts.slice(0, 4).map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                <div className="min-w-0 pr-2">
                  <p className="truncate text-sm font-medium text-navy-900">{p.title}</p>
                  <p className="text-xs text-slate-500">
                    {p.unitsSold} sold • {p.stockQuantity} in stock
                  </p>
                </div>
                <span className="text-sm font-bold text-navy-900">{formatCurrency(p.revenueCents)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-navy-900">Low-Stock Alerts</h2>
            <Link href="/dashboard/inventory" className="text-xs font-semibold text-brand-600">
              Manage Stock
            </Link>
          </div>
          {snapshot.lowStockProducts.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">All products are stocked above alert thresholds.</p>
          ) : (
            <div className="space-y-2.5">
              {snapshot.lowStockProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-navy-900">{p.title}</p>
                      <p className="text-[11px] text-slate-600">SKU: {p.sku}</p>
                    </div>
                  </div>
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                    {p.stockQuantity} left
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Kanban className="h-4 w-4 text-brand-600" />
              <h2 className="text-sm font-bold text-navy-900">Sales Pipeline Summary</h2>
            </div>
            <Link href="/dashboard/pipeline" className="text-xs font-semibold text-brand-600">
              Open Kanban
            </Link>
          </div>
          <p className="text-xs text-slate-500">
            Open Pipeline Value:{" "}
            <strong className="text-navy-900">{formatCurrency(snapshot.pipeline.openPipelineValueCents)}</strong>
          </p>
          <div className="mt-3 space-y-2">
            {["new_lead", "contacted", "interested", "negotiation", "converted"].map((stg) => {
              const found = snapshot.pipeline.stages.find((s) => s.stage === stg);
              return (
                <div key={stg} className="flex items-center justify-between text-xs">
                  <span className="capitalize text-slate-600">{stg.replace("_", " ")}</span>
                  <span className="font-semibold text-navy-900">
                    {found?.count ?? 0} ({formatCurrency(found?.valueCents ?? 0)})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Orders + Recent Customers */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-navy-900">Recent Orders</h2>
            <Link href="/dashboard/orders" className="text-xs font-semibold text-brand-600">
              View All Orders →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-2 font-semibold">Order</th>
                  <th className="pb-2 font-semibold">Customer</th>
                  <th className="pb-2 font-semibold">Fulfillment</th>
                  <th className="pb-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="py-2.5 font-semibold text-navy-900">
                      {o.order_number}
                      <div className="text-[11px] font-normal text-slate-400">{formatDate(o.created_at)}</div>
                    </td>
                    <td className="py-2.5 text-slate-700">{o.customer_name}</td>
                    <td className="py-2.5">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-700">
                        {o.fulfillment_status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-semibold text-navy-900">{formatCurrency(o.total_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-navy-900">Recent CRM Customers</h2>
            <Link href="/dashboard/customers" className="text-xs font-semibold text-brand-600">
              Customer Directory →
            </Link>
          </div>
          <div className="space-y-3">
            {recentCustomers.map((c) => (
              <div key={c.id} className="flex items-center justify-between border-b border-slate-100 pb-2.5 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-navy-900">{c.full_name}</p>
                  <p className="text-xs text-slate-500">
                    {c.email} • {c.orders_count} order(s)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-navy-900">{formatCurrency(c.total_spent_cents)}</p>
                  <span className="inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold capitalize text-brand-700">
                    {c.segment.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
