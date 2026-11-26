"use client";

import { useEffect, useState } from "react";
import { Calendar, Mail, MapPin, MessageSquarePlus, Phone, ShoppingBag, Users, X } from "lucide-react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

interface CustomerRecord {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  segment: string;
  total_spent_cents: number;
  orders_count: number;
  last_purchase_at: string | null;
  notes: string;
  created_at: string;
  orders: Array<{ id: string; order_number: string; status: string; total_cents: number; created_at: string }>;
  activities: Array<{ id: string; activity_type: string; summary: string; due_date: string; actor_name: string; created_at: string }>;
  addresses: Array<{ id: string; label: string; line1: string; city: string; state: string; postal_code: string }>;
}

interface SegmentMeta {
  slug: string;
  name: string;
  description: string;
  customer_count: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [segments, setSegments] = useState<SegmentMeta[]>([]);
  const [activeSeg, setActiveSeg] = useState("all");
  const [selected, setSelected] = useState<CustomerRecord | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [activityText, setActivityText] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(seg = activeSeg) {
    setLoading(true);
    const res = await fetch(`/api/customers?segment=${seg}`);
    const data = (await res.json()) as { customers: CustomerRecord[]; segments: SegmentMeta[] };
    setCustomers(data.customers || []);
    setSegments(data.segments || []);
    if (selected) {
      const updated = (data.customers || []).find((c) => c.id === selected.id);
      if (updated) setSelected(updated);
    }
    setLoading(false);
  }

  useEffect(() => {
    load(activeSeg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSeg]);

  async function saveEngagement(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    await fetch(`/api/customers/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: noteInput,
        activitySummary: activityText.trim() || undefined,
        activityType: dueDate ? "follow_up" : "note",
        dueDate: dueDate || undefined,
      }),
    });
    setActivityText("");
    setDueDate("");
    load(activeSeg);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Customers &amp; Auto-Segmentation</h1>
        <p className="text-sm text-slate-600">
          Native customer database synchronized automatically from storefront registrations, carts, and orders.
        </p>
      </div>

      {/* Segment Filter Pills */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveSeg("all")}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
            activeSeg === "all"
              ? "border-brand-600 bg-brand-600 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          All Customers
        </button>
        {segments.map((s) => (
          <button
            key={s.slug}
            type="button"
            onClick={() => setActiveSeg(s.slug)}
            title={s.description}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeSeg === s.slug
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {s.name} ({s.customer_count})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading CRM customers...</div>
      ) : customers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Users className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-2 text-sm font-semibold text-navy-900">No customers in this segment</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Segment</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="px-4 py-3">Last Purchase</th>
                  <th className="px-4 py-3 text-right">Lifetime Value (LTV)</th>
                  <th className="px-4 py-3 text-right">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-navy-900">{c.full_name}</p>
                      <p className="text-xs text-slate-500">{c.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold capitalize text-brand-700">
                        {c.segment.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-navy-900">{c.orders_count}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{formatDate(c.last_purchase_at)}</td>
                    <td className="px-4 py-3 text-right font-bold text-navy-900">{formatCurrency(c.total_spent_cents)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(c);
                          setNoteInput(c.notes || "");
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy-900 hover:bg-slate-50"
                      >
                        View 360°
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 360 Customer Profile Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
          <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl space-y-6">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold capitalize text-brand-700">
                  {selected.segment.replace("_", " ")}
                </span>
                <h2 className="mt-2 text-xl font-bold text-navy-900">{selected.full_name}</h2>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> {selected.email}
                  </span>
                  {selected.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" /> {selected.phone}
                    </span>
                  )}
                </div>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg p-1 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase text-slate-500">Lifetime Value</p>
                <p className="mt-1 text-lg font-bold text-navy-900">{formatCurrency(selected.total_spent_cents)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase text-slate-500">Orders</p>
                <p className="mt-1 text-lg font-bold text-navy-900">{selected.orders_count}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase text-slate-500">Last Purchase</p>
                <p className="mt-1 text-xs font-bold text-navy-900">{formatDate(selected.last_purchase_at)}</p>
              </div>
            </div>

            {selected.addresses.length > 0 && (
              <div className="rounded-xl border border-slate-200 p-4 text-xs">
                <p className="mb-1.5 flex items-center gap-1.5 font-bold text-navy-900">
                  <MapPin className="h-3.5 w-3.5 text-brand-600" /> Saved Addresses
                </p>
                {selected.addresses.map((a) => (
                  <p key={a.id} className="text-slate-600">
                    <strong>{a.label}:</strong> {a.line1}, {a.city}, {a.state} {a.postal_code}
                  </p>
                ))}
              </div>
            )}

            {/* Notes & Follow-up Form */}
            <form onSubmit={saveEngagement} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-600">Notes &amp; Follow-up Reminder</p>
              <textarea
                rows={2}
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Customer preferences or account notes..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              />
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  value={activityText}
                  onChange={(e) => setActivityText(e.target.value)}
                  placeholder="Log call, email, or reminder..."
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:col-span-2"
                />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-700"
              >
                <MessageSquarePlus className="h-3.5 w-3.5" /> Save Note &amp; Log Activity
              </button>
            </form>

            {/* Purchase History */}
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase text-slate-500">
                <ShoppingBag className="h-3.5 w-3.5" /> Purchase History ({selected.orders.length})
              </h3>
              <div className="space-y-2">
                {selected.orders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs">
                    <div>
                      <span className="font-bold text-navy-900">{o.order_number}</span>
                      <span className="ml-2 text-slate-500">{formatDate(o.created_at)}</span>
                    </div>
                    <span className="font-bold text-navy-900">{formatCurrency(o.total_cents)}</span>
                  </div>
                ))}
                {selected.orders.length === 0 && <p className="text-xs text-slate-400">No completed orders yet.</p>}
              </div>
            </div>

            {/* Activity Timeline */}
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase text-slate-500">
                <Calendar className="h-3.5 w-3.5" /> Customer Activity Timeline
              </h3>
              <div className="space-y-2 border-l-2 border-brand-100 pl-3">
                {selected.activities.map((a) => (
                  <div key={a.id} className="text-xs">
                    <p className="font-semibold text-navy-900">{a.summary}</p>
                    <p className="text-[11px] text-slate-500">
                      {a.activity_type} • {a.actor_name} • {formatDateTime(a.created_at)}
                      {a.due_date ? ` • Due ${a.due_date}` : ""}
                    </p>
                  </div>
                ))}
                {selected.activities.length === 0 && <p className="text-xs text-slate-400">No logged CRM activities yet.</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
