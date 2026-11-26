"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Edit2, Plus, Trash2, X } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { LeadStage } from "@/lib/types";

interface LeadRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  status: LeadStage;
  owner_name: string;
  estimated_value_cents: number;
  follow_up_date: string;
  notes: string;
  updated_at: string;
  activities: Array<{ id: string; activity_type: string; summary: string; due_date: string; completed: number; created_at: string }>;
}

const STAGES: Array<{ id: LeadStage; label: string }> = [
  { id: "new_lead", label: "New Lead" },
  { id: "contacted", label: "Contacted" },
  { id: "interested", label: "Interested" },
  { id: "negotiation", label: "Negotiation" },
  { id: "converted", label: "Converted" },
  { id: "lost", label: "Lost" },
];

export default function CrmLeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [activities, setActivities] = useState<Array<{ id: string; summary: string; activity_type: string; due_date: string; created_at: string; actor_name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LeadRow | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [source, setSource] = useState("storefront");
  const [status, setStatus] = useState<LeadStage>("new_lead");
  const [ownerName, setOwnerName] = useState("Founder");
  const [valueDollars, setValueDollars] = useState("500");
  const [followUpDate, setFollowUpDate] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/crm/leads");
    const data = (await res.json()) as { leads: LeadRow[]; activities: typeof activities };
    setLeads(data.leads || []);
    setActivities(data.activities || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditing(null);
    setFullName("");
    setEmail("");
    setPhone("");
    setCompany("");
    setSource("instagram");
    setStatus("new_lead");
    setOwnerName("Maya Lin");
    setValueDollars("500");
    setFollowUpDate("");
    setNotes("");
    setModalOpen(true);
  }

  function openEdit(l: LeadRow) {
    setEditing(l);
    setFullName(l.full_name);
    setEmail(l.email);
    setPhone(l.phone);
    setCompany(l.company);
    setSource(l.source);
    setStatus(l.status);
    setOwnerName(l.owner_name);
    setValueDollars(String((l.estimated_value_cents / 100).toFixed(0)));
    setFollowUpDate(l.follow_up_date || "");
    setNotes(l.notes);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      fullName,
      email,
      phone,
      company,
      source,
      status,
      ownerName,
      estimatedValueCents: Math.round((Number(valueDollars) || 0) * 100),
      followUpDate,
      notes,
    };

    if (editing) {
      await fetch(`/api/crm/leads/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setModalOpen(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this lead?")) return;
    await fetch(`/api/crm/leads/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Native CRM &amp; Lead Management</h1>
          <p className="text-sm text-slate-600">
            Capture leads, assign owners, schedule follow-ups, and track all interaction history inside SellGenius AI.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> New Lead
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading CRM leads...</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Lead</th>
                    <th className="px-4 py-3">Source &amp; Owner</th>
                    <th className="px-4 py-3">Stage</th>
                    <th className="px-4 py-3">Follow-Up</th>
                    <th className="px-4 py-3 text-right">Est. Value</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-navy-900">{l.full_name}</p>
                        <p className="text-xs text-slate-500">
                          {l.company ? `${l.company} • ` : ""}
                          {l.email}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="capitalize font-medium text-navy-900">{l.source.replace("_", " ")}</span>
                        <div className="text-slate-500">Owner: {l.owner_name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold capitalize text-brand-700">
                          {l.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{l.follow_up_date || "—"}</td>
                      <td className="px-4 py-3 text-right font-bold text-navy-900">
                        {formatCurrency(l.estimated_value_cents)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(l)}
                            className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(l.id)}
                            className="rounded-md border border-slate-200 p-1.5 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-bold text-navy-900">
              <CalendarClock className="h-4 w-4 text-brand-600" /> Recent CRM Activity &amp; Follow-Ups
            </h2>
            <div className="mt-4 max-h-[500px] space-y-3 overflow-y-auto pr-1">
              {activities.map((a) => (
                <div key={a.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
                  <p className="font-semibold text-navy-900">{a.summary}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {a.activity_type.replace("_", " ")} • {a.actor_name} • {formatDateTime(a.created_at)}
                  </p>
                  {a.due_date && (
                    <span className="mt-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      Follow-up due: {a.due_date}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={handleSave} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy-900">{editing ? "Edit Lead" : "Create New Lead"}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-1 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Full Name</label>
                <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Phone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Company / Org</label>
                <input value={company} onChange={(e) => setCompany(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Lead Source</label>
                <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                  <option value="storefront">Storefront</option>
                  <option value="instagram">Instagram</option>
                  <option value="abandoned_cart">Abandoned Cart</option>
                  <option value="referral">Referral</option>
                  <option value="outbound">Outbound</option>
                  <option value="repeat_b2b">Repeat B2B</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Pipeline Stage</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as LeadStage)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                  {STAGES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Lead Owner</label>
                <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Est. Value (USD)</label>
                <input type="number" value={valueDollars} onChange={(e) => setValueDollars(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Follow-Up Date</label>
                <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Notes</label>
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold">
                Cancel
              </button>
              <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white">
                Save Lead
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
