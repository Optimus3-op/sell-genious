"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { LeadStage } from "@/lib/types";

interface PipelineLead {
  id: string;
  full_name: string;
  email: string;
  company: string;
  source: string;
  status: LeadStage;
  owner_name: string;
  estimated_value_cents: number;
  follow_up_date: string;
  notes: string;
}

const PIPELINE_STAGES: Array<{ id: LeadStage; title: string; color: string }> = [
  { id: "new_lead", title: "New Lead", color: "border-t-slate-400" },
  { id: "contacted", title: "Contacted", color: "border-t-blue-500" },
  { id: "interested", title: "Interested", color: "border-t-indigo-500" },
  { id: "negotiation", title: "Negotiation", color: "border-t-violet-600" },
  { id: "converted", title: "Converted", color: "border-t-emerald-500" },
  { id: "lost", title: "Lost", color: "border-t-rose-500" },
];

export default function SalesPipelinePage() {
  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/crm/leads");
    const data = (await res.json()) as { leads: PipelineLead[] };
    setLeads(data.leads || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function moveLead(id: string, nextStage: LeadStage) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: nextStage } : l)));
    await fetch(`/api/crm/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStage }),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Visual Sales Pipeline</h1>
          <p className="text-sm text-slate-600">
            Drag cards or use stage controls to advance leads from New Lead to Converted.
          </p>
        </div>
        <Link
          href="/dashboard/crm"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> Manage Leads
        </Link>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading pipeline...</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage, stageIdx) => {
            const stageLeads = leads.filter((l) => l.status === stage.id);
            const totalCents = stageLeads.reduce((acc, l) => acc + l.estimated_value_cents, 0);

            return (
              <div
                key={stage.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedId) {
                    moveLead(draggedId, stage.id);
                    setDraggedId(null);
                  }
                }}
                className={`flex min-w-[270px] flex-1 flex-col rounded-xl border border-slate-200 border-t-4 ${stage.color} bg-slate-100/70 p-3`}
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-navy-900">
                      {stage.title} ({stageLeads.length})
                    </h2>
                    <p className="text-[11px] font-semibold text-slate-500">{formatCurrency(totalCents)}</p>
                  </div>
                </div>

                <div className="space-y-2.5 flex-1">
                  {stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={() => setDraggedId(lead.id)}
                      className="cursor-grab rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-brand-300"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-navy-900">{lead.full_name}</p>
                          <p className="text-xs text-slate-500">{lead.company || lead.email}</p>
                        </div>
                        <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">
                          {formatCurrency(lead.estimated_value_cents)}
                        </span>
                      </div>

                      {lead.notes && <p className="mt-2 line-clamp-2 text-xs text-slate-600">{lead.notes}</p>}

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                        <span>Owner: {lead.owner_name}</span>
                        <div className="flex items-center gap-1">
                          {stageIdx > 0 && (
                            <button
                              type="button"
                              onClick={() => moveLead(lead.id, PIPELINE_STAGES[stageIdx - 1].id)}
                              className="rounded border border-slate-200 p-1 hover:bg-slate-100"
                              title={`Move back to ${PIPELINE_STAGES[stageIdx - 1].title}`}
                            >
                              <ArrowLeft className="h-3 w-3" />
                            </button>
                          )}
                          {stageIdx < PIPELINE_STAGES.length - 1 && (
                            <button
                              type="button"
                              onClick={() => moveLead(lead.id, PIPELINE_STAGES[stageIdx + 1].id)}
                              className="rounded border border-slate-200 bg-brand-50 p-1 text-brand-700 hover:bg-brand-100"
                              title={`Advance to ${PIPELINE_STAGES[stageIdx + 1].title}`}
                            >
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {stageLeads.length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-300 py-8 text-center text-xs text-slate-400">
                      Drop lead here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
