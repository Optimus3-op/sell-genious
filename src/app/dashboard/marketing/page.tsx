"use client";

import { useEffect, useState } from "react";
import { Calendar, Check, Copy, Plus, Save, Trash2, Wand2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { MarketingContentType } from "@/lib/ai/marketing";

interface StudioProduct {
  id: string;
  title: string;
  category: string;
  price_cents: number;
  discount_price_cents: number | null;
  stock_quantity: number;
}

interface SavedContent {
  id: string;
  product_id: string | null;
  product_title: string | null;
  content_type: string;
  title: string;
  body: string;
  target_audience: string;
  created_at: string;
}

interface Campaign {
  id: string;
  name: string;
  channel: string;
  status: string;
  target_segment: string;
  product_title: string | null;
  scheduled_date: string;
  budget_cents: number;
  notes: string;
}

const CONTENT_TYPES: Array<{ id: MarketingContentType; label: string }> = [
  { id: "product_description", label: "Product Description" },
  { id: "instagram_post", label: "Instagram Post" },
  { id: "facebook_ad", label: "Facebook Ad Copy" },
  { id: "email_campaign", label: "Email Campaign" },
  { id: "promo_idea", label: "Promotional Campaign Idea" },
  { id: "discount_campaign", label: "Discount Strategy" },
  { id: "audience_recommendation", label: "Audience Blueprint" },
];

export default function MarketingStudioPage() {
  const [products, setProducts] = useState<StudioProduct[]>([]);
  const [savedContent, setSavedContent] = useState<SavedContent[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const [productId, setProductId] = useState("");
  const [contentType, setContentType] = useState<MarketingContentType>("instagram_post");
  const [audience, setAudience] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Campaign form
  const [campName, setCampName] = useState("");
  const [campChannel, setCampChannel] = useState("Instagram & Email");
  const [campSegment, setCampSegment] = useState("potential_repeat");
  const [campDate, setCampDate] = useState(new Date().toISOString().slice(0, 10));
  const [campBudget, setCampBudget] = useState("250");

  async function load() {
    const res = await fetch("/api/ai/marketing");
    const data = await res.json();
    setProducts(data.products || []);
    setSavedContent(data.content || []);
    setCampaigns(data.campaigns || []);
    if (!productId && data.products?.[0]) {
      setProductId(data.products[0].id);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generateCopy() {
    if (!productId) return;
    setGenerating(true);
    const res = await fetch("/api/ai/marketing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate",
        productId,
        contentType,
        targetAudience: audience,
      }),
    });
    const data = await res.json();
    if (data.generated) {
      setDraftTitle(data.generated.title);
      setDraftBody(data.generated.body);
      if (!audience) setAudience(data.generated.targetAudience);
    }
    setGenerating(false);
  }

  async function saveGenerated() {
    if (!draftBody.trim()) return;
    await fetch("/api/ai/marketing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save_content",
        productId,
        contentType,
        title: draftTitle,
        textBody: draftBody,
        targetAudience: audience,
      }),
    });
    load();
  }

  async function addCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!campName.trim()) return;
    await fetch("/api/ai/marketing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_campaign",
        campaign: {
          name: campName,
          channel: campChannel,
          targetSegment: campSegment,
          productId: productId || undefined,
          scheduledDate: campDate,
          budgetDollars: Number(campBudget) || 0,
        },
      }),
    });
    setCampName("");
    load();
  }

  function copyText(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">AI Marketing Studio</h1>
        <p className="text-sm text-slate-600">
          Generate product-grounded descriptions, social ads, email campaigns, and organize your marketing calendar.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Generator */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-navy-900">
            <Wand2 className="h-4 w-4 text-violet-600" /> Product-Grounded Content Generator
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Select Catalog Product</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({formatCurrency(p.discount_price_cents ?? p.price_cents)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Content Format</label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as MarketingContentType)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {CONTENT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Target Customer Audience</label>
              <input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="e.g. Returning buyers & urban commuters"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={generating || !productId}
            onClick={generateCopy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
          >
            <Wand2 className="h-4 w-4" /> {generating ? "Generating from product facts..." : "Generate Marketing Content"}
          </button>

          {draftBody && (
            <div className="space-y-3 border-t border-slate-200 pt-4">
              <input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold"
              />
              <textarea
                rows={7}
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs leading-relaxed"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveGenerated}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white"
                >
                  <Save className="h-3.5 w-3.5" /> Save to Library
                </button>
                <button
                  type="button"
                  onClick={() => copyText("draft", draftBody)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold"
                >
                  {copiedId === "draft" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Marketing Calendar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-navy-900">
            <Calendar className="h-4 w-4 text-brand-600" /> Marketing Calendar &amp; Campaigns
          </h2>
          <form onSubmit={addCampaign} className="grid gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
            <input
              required
              value={campName}
              onChange={(e) => setCampName(e.target.value)}
              placeholder="Campaign title..."
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:col-span-2"
            />
            <select value={campChannel} onChange={(e) => setCampChannel(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs">
              <option>Instagram &amp; Email</option>
              <option>Instagram Reels</option>
              <option>Facebook Ads</option>
              <option>Email Retention</option>
            </select>
            <select value={campSegment} onChange={(e) => setCampSegment(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs">
              <option value="all">All Customers</option>
              <option value="high_value">High-Value Buyers</option>
              <option value="potential_repeat">Potential Repeat Buyers</option>
              <option value="inactive">Inactive Win-Back</option>
              <option value="abandoned_cart">Abandoned Cart Recovery</option>
            </select>
            <input type="date" value={campDate} onChange={(e) => setCampDate(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs" />
            <input type="number" value={campBudget} onChange={(e) => setCampBudget(e.target.value)} placeholder="Budget ($)" className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs" />
            <button type="submit" className="inline-flex items-center justify-center gap-1 rounded-lg bg-navy-900 py-2 text-xs font-semibold text-white sm:col-span-2">
              <Plus className="h-3.5 w-3.5" /> Schedule Campaign
            </button>
          </form>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
            {campaigns.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-xs">
                <div>
                  <p className="font-bold text-navy-900">{c.name}</p>
                  <p className="text-slate-500">
                    {c.channel} • Target: {c.target_segment.replace("_", " ")} • {c.scheduled_date} • Budget {formatCurrency(c.budget_cents)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch(`/api/ai/marketing?id=${c.id}&kind=campaign`, { method: "DELETE" });
                    load();
                  }}
                  className="text-rose-500 hover:text-rose-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400">
            Future roadmap: direct Instagram, Facebook &amp; ESP publishing via official OAuth APIs with explicit seller approval.
          </p>
        </div>
      </div>

      {/* Saved Copy Library */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-navy-900">Saved Content Library ({savedContent.length})</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {savedContent.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="rounded bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-700">
                    {item.content_type.replace("_", " ")}
                  </span>
                  <h3 className="mt-1 text-sm font-bold text-navy-900">{item.title}</h3>
                  <p className="text-[11px] text-slate-500">{formatDate(item.created_at)}</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => copyText(item.id, item.body)}
                    className="rounded border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
                  >
                    {copiedId === item.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch(`/api/ai/marketing?id=${item.id}&kind=content`, { method: "DELETE" });
                      load();
                    }}
                    className="rounded border border-slate-200 p-1.5 text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-xs text-slate-600">{item.body}</pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
