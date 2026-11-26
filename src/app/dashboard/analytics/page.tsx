"use client";

import { useEffect, useState } from "react";
import { Bot } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { BusinessIntelligenceSnapshot } from "@/lib/ai/tools";

interface AnalyticsPayload {
  days: number;
  snapshot: BusinessIntelligenceSnapshot;
  timeSeries: Array<{ date: string; revenue: number; orders: number; newCustomers: number; visitors: number }>;
  campaigns: Array<{ id: string; name: string; channel: string; status: string; budget_cents: number }>;
  plainEnglishSummary: string;
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?days=${days}`)
      .then((r) => r.json())
      .then((d: AnalyticsPayload) => {
        setData(d);
        setLoading(false);
      });
  }, [days]);

  if (loading || !data) {
    return <div className="py-12 text-center text-sm text-slate-500">Loading analytics engine...</div>;
  }

  const k = data.snapshot.kpis;
  const prodChartData = data.snapshot.topProducts.map((p) => ({
    name: p.title.length > 18 ? `${p.title.slice(0, 18)}…` : p.title,
    revenue: Number((p.revenueCents / 100).toFixed(2)),
    units: p.unitsSold,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Business Analytics Engine</h1>
          <p className="text-sm text-slate-600">
            Revenue, order trends, customer acquisition &amp; retention, inventory performance, and AI explanations.
          </p>
        </div>
        <div className="flex gap-1.5 rounded-lg border border-slate-200 bg-white p-1">
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                days === d ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {d}D
            </button>
          ))}
        </div>
      </div>

      {/* AI Plain-English Summary */}
      <div className="flex items-start gap-3 rounded-2xl border border-violet-200 bg-gradient-to-r from-brand-50/70 to-violet-50/70 p-5">
        <Bot className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-violet-700">AI Plain-Language Analytics Brief</p>
          <p className="mt-1 text-sm leading-relaxed text-navy-900">{data.plainEnglishSummary}</p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: `Total Revenue (${days}d)`, value: formatCurrency(k.totalRevenueCents) },
          { label: "Total Orders", value: String(k.paidOrders) },
          { label: "Average Order Value", value: formatCurrency(k.averageOrderValueCents) },
          { label: "Repeat Purchase Rate", value: `${k.repeatPurchaseRatePct}%` },
          { label: "Total Customers", value: String(k.totalCustomers) },
          { label: "Customer Lifetime Value", value: formatCurrency(k.averageLtvCents) },
          { label: "Conversion Rate", value: k.conversionRatePct !== null ? `${k.conversionRatePct}%` : "N/A (no traffic data)" },
          { label: "Low-Stock SKUs", value: String(k.lowStockCount) },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">{item.label}</p>
            <p className="mt-1.5 text-xl font-bold text-navy-900">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-navy-900">Revenue ($) &amp; Orders Trend</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.timeSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#4F46E5" strokeWidth={2.5} name="Revenue ($)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-navy-900">Top Product Revenue ($)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prodChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#7C3AED" radius={[6, 6, 0, 0]} name="Revenue ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Retention & Marketing Reports */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-navy-900">Customer Retention &amp; Segment Breakdown</h2>
          <div className="space-y-2.5">
            {data.snapshot.customerSegments.map((seg) => (
              <div key={seg.slug} className="flex items-center justify-between rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs">
                <span className="font-semibold text-navy-900">{seg.name}</span>
                <span className="rounded-full bg-brand-100 px-2.5 py-0.5 font-bold text-brand-700">{seg.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-navy-900">Marketing Campaign Performance Ledger</h2>
          {data.campaigns.length === 0 ? (
            <p className="text-xs text-slate-500">No marketing campaigns scheduled yet.</p>
          ) : (
            <div className="space-y-2.5">
              {data.campaigns.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-xs">
                  <div>
                    <p className="font-bold text-navy-900">{c.name}</p>
                    <p className="text-slate-500">{c.channel}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-navy-900">{formatCurrency(c.budget_cents)}</p>
                    <span className="capitalize text-emerald-700 font-semibold">{c.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
