"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, ExternalLink, Eye, Globe, Palette, Rocket, Save } from "lucide-react";
import type { StoreSectionConfig } from "@/lib/types";

interface StoreTheme {
  id: string;
  name: string;
  description: string;
  layout_style: string;
  default_primary_color: string;
  default_accent_color: string;
  preview_badge: string;
}

export default function StoreBuilderPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [themes, setThemes] = useState<StoreTheme[]>([]);

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#4F46E5");
  const [accentColor, setAccentColor] = useState("#7C3AED");
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerSubtitle, setBannerSubtitle] = useState("");
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [themeId, setThemeId] = useState("theme_modern");
  const [sections, setSections] = useState<StoreSectionConfig[]>([]);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    fetch("/api/store")
      .then((r) => r.json())
      .then((data) => {
        const s = data.store;
        setName(s.name || "");
        setTagline(s.tagline || "");
        setSubdomain(s.subdomain || "");
        setLogoUrl(s.logo_url || "");
        setPrimaryColor(s.primary_color || "#4F46E5");
        setAccentColor(s.accent_color || "#7C3AED");
        setBannerTitle(s.banner_title || "");
        setBannerSubtitle(s.banner_subtitle || "");
        setBannerImageUrl(s.banner_image_url || "");
        setThemeId(s.theme_id || "theme_modern");
        setSections(s.sections || []);
        setContactEmail(s.contact_email || "");
        setContactPhone(s.contact_phone || "");
        setInstagram(s.social_links?.instagram || "");
        setTwitter(s.social_links?.twitter || "");
        setIsPublished(Boolean(s.is_published));
        setBusinessDescription(data.business?.description || "");
        setThemes(data.themes || []);
        setLoading(false);
      });
  }, []);

  function moveSection(index: number, dir: -1 | 1) {
    const next = [...sections];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next);
  }

  function toggleSection(index: number) {
    setSections((prev) => prev.map((sec, i) => (i === index ? { ...sec, enabled: !sec.enabled } : sec)));
  }

  async function saveStore(publishOverride?: boolean) {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/store", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        tagline,
        subdomain,
        logoUrl,
        primaryColor,
        accentColor,
        bannerTitle,
        bannerSubtitle,
        bannerImageUrl,
        themeId,
        sections,
        contactEmail,
        contactPhone,
        socialLinks: { instagram, twitter },
        businessDescription,
        isPublished: publishOverride !== undefined ? publishOverride : isPublished,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setMessage(data.error || "Could not save store");
    } else {
      if (publishOverride !== undefined) setIsPublished(publishOverride);
      setMessage("Storefront saved and synchronized.");
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-slate-500">Loading Store Builder...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Store Builder &amp; Theme Customizer</h1>
          <p className="text-sm text-slate-600">
            Design your public online storefront at{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">/store/{subdomain}</code>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/store/${subdomain}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-navy-900 hover:bg-slate-50"
          >
            <Eye className="h-3.5 w-3.5" /> Preview Storefront <ExternalLink className="h-3 w-3" />
          </a>
          <button
            type="button"
            disabled={saving}
            onClick={() => saveStore(!isPublished)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold ${
              isPublished
                ? "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            <Rocket className="h-3.5 w-3.5" /> {isPublished ? "Unpublish Store" : "Publish Store"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => saveStore()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
          >
            <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-xs font-semibold text-brand-700">
          <Check className="h-4 w-4" /> {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left & Center Config */}
        <div className="space-y-6 lg:col-span-2">
          {/* Templates */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-navy-900">
              <Palette className="h-4 w-4 text-brand-600" /> Storefront Templates
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {themes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setThemeId(t.id);
                    setPrimaryColor(t.default_primary_color);
                    setAccentColor(t.default_accent_color);
                  }}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    themeId === t.id ? "border-brand-600 bg-brand-50/70 ring-1 ring-brand-600" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-navy-900">{t.name}</span>
                    <span className="rounded bg-white px-2 py-0.5 text-[10px] font-bold text-brand-600">{t.preview_badge}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600">{t.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Identity & Banner */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-navy-900">
              <Globe className="h-4 w-4 text-brand-600" /> Brand Identity &amp; Homepage Banner
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Store Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Subdomain</label>
                <input value={subdomain} onChange={(e) => setSubdomain(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Tagline</label>
                <input value={tagline} onChange={(e) => setTagline(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Logo Image URL</label>
                <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="Optional image URL" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Primary Brand Color</label>
                <div className="flex gap-2">
                  <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-9 w-11 rounded border" />
                  <input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-mono" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Accent Color</label>
                <div className="flex gap-2">
                  <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-9 w-11 rounded border" />
                  <input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-mono" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Homepage Banner Title</label>
                <input value={bannerTitle} onChange={(e) => setBannerTitle(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Homepage Banner Subtitle</label>
                <textarea rows={2} value={bannerSubtitle} onChange={(e) => setBannerSubtitle(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Hero Banner Image URL</label>
                <input value={bannerImageUrl} onChange={(e) => setBannerImageUrl(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Brand Story / Store Info</label>
                <textarea rows={2} value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Contact Email</label>
                <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Instagram / Social</label>
                <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@yourbrand" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Section Ordering + Live Miniature Preview */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-navy-900">Homepage Sections Layout</h2>
            <p className="mt-0.5 text-xs text-slate-500">Rearrange or toggle storefront sections dynamically.</p>
            <div className="mt-4 space-y-2">
              {sections.map((sec, idx) => (
                <div key={sec.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs">
                  <label className="flex items-center gap-2 font-semibold text-navy-900">
                    <input type="checkbox" checked={sec.enabled} onChange={() => toggleSection(idx)} />
                    {sec.title}
                  </label>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => moveSection(idx, -1)} className="rounded border bg-white p-1 hover:bg-slate-100">
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button type="button" onClick={() => moveSection(idx, 1)} className="rounded border bg-white p-1 hover:bg-slate-100">
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-500">Live Style Preview</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isPublished ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
                }`}
              >
                {isPublished ? "Published" : "Draft"}
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="p-4 text-white" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}>
                <p className="text-xs font-bold uppercase tracking-wider opacity-85">{name}</p>
                <p className="mt-1 text-base font-extrabold leading-tight">{bannerTitle || name}</p>
                <p className="mt-1 text-[11px] opacity-90 line-clamp-2">{bannerSubtitle}</p>
              </div>
              <div className="bg-slate-50 p-3 text-[11px] text-slate-600">
                Theme: <strong className="text-navy-900">{themes.find((t) => t.id === themeId)?.name}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
