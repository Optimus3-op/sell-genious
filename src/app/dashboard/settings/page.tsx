"use client";

import { useEffect, useState } from "react";
import { Check, CreditCard, Save, Shield, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [plan, setPlan] = useState("growth");
  const [members, setMembers] = useState<Array<{ id: string; full_name: string; email: string; role: string }>>([]);
  const [gateways, setGateways] = useState<Array<{ id: string; name: string; configured: boolean; description: string }>>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setName(data.business?.name || "");
        setCategory(data.business?.category || "");
        setEmail(data.business?.email || "");
        setPhone(data.business?.phone || "");
        setAddress(data.business?.address || "");
        setDescription(data.business?.description || "");
        setPlan(data.business?.subscription_plan || "growth");
        setMembers(data.members || []);
        setGateways(data.paymentGatewayStatus?.providers || []);
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category, email, phone, address, description, subscriptionPlan: plan }),
    });
    setSaved(true);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Business &amp; Platform Settings</h1>
        <p className="text-sm text-slate-600">
          Manage your business profile, team members, subscription plan, and modular payment adapters.
        </p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700">
          <Check className="h-4 w-4" /> Settings updated successfully.
        </div>
      )}

      <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-navy-900">Business Profile</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Business Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Category</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Business Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Business Address</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Description</label>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="pt-2">
          <h3 className="mb-2 text-xs font-bold uppercase text-slate-600">SellGenius AI Subscription Plan</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { id: "starter", name: "Starter", price: 1900 },
              { id: "growth", name: "Growth", price: 4900 },
              { id: "scale", name: "Scale", price: 9900 },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlan(p.id)}
                className={`rounded-xl border p-3.5 text-left ${
                  plan.toLowerCase() === p.id ? "border-brand-600 bg-brand-50" : "border-slate-200"
                }`}
              >
                <p className="text-sm font-bold text-navy-900">{p.name}</p>
                <p className="text-xs text-slate-600">{formatCurrency(p.price)} / month (MVP simulated)</p>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Save className="h-4 w-4" /> Save Settings
        </button>
      </form>

      {/* Modular Payment Gateway Architecture */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-navy-900">
          <CreditCard className="h-4 w-4 text-brand-600" /> Payment Architecture (Modular Adapters)
        </h2>
        <div className="space-y-2.5">
          {gateways.map((g) => (
            <div key={g.id} className="flex items-start justify-between rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
              <div>
                <p className="font-bold text-navy-900">{g.name}</p>
                <p className="mt-0.5 text-slate-600">{g.description}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 font-semibold ${
                  g.configured ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-600"
                }`}
              >
                {g.configured ? "Active" : "Future Phase"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Business Members */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-navy-900">
          <Users className="h-4 w-4 text-brand-600" /> Business Members &amp; Tenant Isolation
        </h2>
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5 text-xs">
            <div>
              <p className="font-bold text-navy-900">{m.full_name}</p>
              <p className="text-slate-500">{m.email}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 font-bold capitalize text-brand-700">
              <Shield className="h-3 w-3" /> {m.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
