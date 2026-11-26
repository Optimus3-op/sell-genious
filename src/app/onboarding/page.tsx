"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Globe, Package, Palette, Rocket, Sparkles, Store } from "lucide-react";

const STEPS = [
  "1. Account Created",
  "2. Business Name",
  "3. Business Category",
  "4. Logo & Brand Details",
  "5. Add First Product",
  "6. Configure Store",
  "7. Publish Store",
  "8. Enter Dashboard",
];

const CATEGORIES = [
  "Apparel & Accessories",
  "Specialty Food & Beverage",
  "Beauty & Skincare",
  "Home & Living",
  "Electronics & Carry",
  "Health & Fitness",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(2);

  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [tagline, setTagline] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#4F46E5");
  const [accentColor, setAccentColor] = useState("#7C3AED");

  const [prodTitle, setProdTitle] = useState("");
  const [prodCategory, setProdCategory] = useState("Featured");
  const [prodPrice, setProdPrice] = useState("49");
  const [prodStock, setProdStock] = useState("25");
  const [prodDesc, setProdDesc] = useState("");
  const [prodImg, setProdImg] = useState("");
  const [productAdded, setProductAdded] = useState(false);

  const [subdomain, setSubdomain] = useState("");
  const [themeId, setThemeId] = useState("theme_modern");
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerSubtitle, setBannerSubtitle] = useState("");
  const [themes, setThemes] = useState<Array<{ id: string; name: string; description: string; preview_badge: string }>>([]);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    fetch("/api/onboarding")
      .then((r) => {
        if (r.status === 401) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setBusinessName(data.business?.name || "");
        setCategory(data.business?.category || CATEGORIES[0]);
        setDescription(data.business?.description || "");
        setTagline(data.store?.tagline || "");
        setLogoUrl(data.store?.logo_url || "");
        setPrimaryColor(data.store?.primary_color || "#4F46E5");
        setAccentColor(data.store?.accent_color || "#7C3AED");
        setSubdomain(data.store?.subdomain || "");
        setThemeId(data.store?.theme_id || "theme_modern");
        setBannerTitle(data.store?.banner_title || "");
        setBannerSubtitle(data.store?.banner_subtitle || "");
        setPublished(Boolean(data.store?.is_published));
        setThemes(data.themes || []);
        setProductAdded((data.productsCount || 0) > 0);
        setStep(Math.max(2, Math.min(8, data.business?.onboarding_step || 2)));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  async function saveStep(payload: Record<string, unknown>, nextStep: number) {
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, step: nextStep }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not save step");
        setSaving(false);
        return false;
      }
      setStep(nextStep);
      setSaving(false);
      return true;
    } catch {
      setError("Network error");
      setSaving(false);
      return false;
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
        Loading your SellGenius AI workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-navy-900">SellGenius AI Guided Setup</h1>
              <p className="text-xs text-slate-500">Step {step} of 8 • Build &amp; launch your independent business</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => saveStep({ completeOnboarding: true }, 8).then((ok) => ok && router.push("/dashboard"))}
            className="text-xs font-medium text-slate-500 hover:text-brand-600"
          >
            Skip to Dashboard →
          </button>
        </div>

        {/* 8-Step Progress Bar */}
        <div className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {STEPS.map((label, idx) => {
            const num = idx + 1;
            const active = num === step;
            const done = num < step;
            return (
              <button
                key={label}
                type="button"
                onClick={() => num >= 2 && setStep(num)}
                className={`rounded-lg border px-2.5 py-2 text-left text-[11px] font-medium transition-all ${
                  active
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : done
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-500"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          {error && (
            <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-brand-600">
                <Store className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Step 2 • Business Identity</span>
              </div>
              <h2 className="text-2xl font-bold text-navy-900">Confirm your business name &amp; story</h2>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-600">Business Name</label>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm"
                  placeholder="UrbanStyle"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-600">Short Business Bio</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm"
                  placeholder="Tell shoppers what makes your brand unique..."
                />
              </div>
              <button
                type="button"
                disabled={saving || !businessName.trim()}
                onClick={() => saveStep({ businessName, description }, 3)}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Continue to Category <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600">Step 3 • Business Category</span>
              <h2 className="text-2xl font-bold text-navy-900">Choose your primary industry</h2>
              <p className="text-sm text-slate-600">
                SellGenius AI calibrates product templates and growth advisor benchmarks to your category.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`rounded-xl border p-4 text-left text-sm font-semibold transition-all ${
                      category === c
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-slate-200 bg-white text-navy-900 hover:bg-slate-50"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => saveStep({ category }, 4)}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Continue to Brand Details <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-brand-600">
                <Palette className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Step 4 • Logo &amp; Brand Colors</span>
              </div>
              <h2 className="text-2xl font-bold text-navy-900">Customize your visual identity</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Store Tagline</label>
                  <input
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Architectural Everyday Carry"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Logo Image URL (optional)</label>
                  <input
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Primary Brand Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-12 rounded border" />
                    <input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-10 w-12 rounded border" />
                    <input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono" />
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => saveStep({ tagline, logoUrl, primaryColor, accentColor }, 5)}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Continue to First Product <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-brand-600">
                <Package className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Step 5 • Add First Product</span>
              </div>
              <h2 className="text-2xl font-bold text-navy-900">Launch your catalog with a signature product</h2>
              {productAdded && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
                  You already have at least one product in your catalog. Add another below or continue to Step 6.
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Product Title</label>
                  <input
                    value={prodTitle}
                    onChange={(e) => setProdTitle(e.target.value)}
                    placeholder="Signature Everyday Tote"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Category</label>
                  <input
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Price (USD)</label>
                  <input
                    type="number"
                    min="1"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Opening Stock Qty</label>
                  <input
                    type="number"
                    min="0"
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Product Image URL (optional)</label>
                  <input
                    value={prodImg}
                    onChange={(e) => setProdImg(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Description</label>
                  <textarea
                    rows={2}
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                    placeholder="Key features, materials, and benefits..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    saveStep(
                      prodTitle.trim()
                        ? {
                            firstProduct: {
                              title: prodTitle,
                              category: prodCategory,
                              priceDollars: Number(prodPrice) || 49,
                              stockQuantity: Number(prodStock) || 10,
                              description: prodDesc,
                              imageUrl: prodImg,
                            },
                          }
                        : {},
                      6
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  {prodTitle.trim() ? "Save Product & Continue" : "Continue to Store Config"} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-brand-600">
                <Globe className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Step 6 • Configure Storefront</span>
              </div>
              <h2 className="text-2xl font-bold text-navy-900">Choose your Store URL, theme &amp; banner</h2>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Store Subdomain</label>
                <div className="flex items-center overflow-hidden rounded-lg border border-slate-300">
                  <input
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm focus:outline-none"
                  />
                  <span className="border-l border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-600">
                    .sellgenius.com (/store/{subdomain})
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setThemeId(t.id)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      themeId === t.id ? "border-brand-600 bg-brand-50" : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-navy-900">{t.name}</span>
                      <span className="rounded bg-white px-2 py-0.5 text-[10px] font-semibold text-brand-600">{t.preview_badge}</span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600">{t.description}</p>
                  </button>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Homepage Banner Headline</label>
                  <input
                    value={bannerTitle}
                    onChange={(e) => setBannerTitle(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Banner Subheadline</label>
                  <input
                    value={bannerSubtitle}
                    onChange={(e) => setBannerSubtitle(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() => saveStep({ subdomain, themeId, bannerTitle, bannerSubtitle }, 7)}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Save &amp; Proceed to Publish <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-5 text-center py-4">
              <Rocket className="mx-auto h-12 w-12 text-brand-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600">Step 7 • Publish Store</span>
              <h2 className="text-2xl font-bold text-navy-900">Ready to make {businessName} live?</h2>
              <p className="mx-auto max-w-lg text-sm text-slate-600">
                Publishing makes your storefront live at <code className="rounded bg-slate-100 px-1.5 py-0.5">/store/{subdomain}</code>{" "}
                so customers can browse, register, add to cart, and place sandbox orders that sync directly into your CRM.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    const ok = await saveStep({ publishStore: true }, 8);
                    if (ok) setPublished(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  <Rocket className="h-4 w-4" /> Publish Online Store
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => saveStep({ publishStore: false }, 8)}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Keep as Draft for Now
                </button>
              </div>
            </div>
          )}

          {step === 8 && (
            <div className="space-y-5 text-center py-6">
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
              <h2 className="text-2xl font-bold text-navy-900">
                {businessName} is {published ? "live on SellGenius AI!" : "configured and ready!"}
              </h2>
              <p className="mx-auto max-w-md text-sm text-slate-600">
                Your Seller Dashboard, Native CRM, Sales Pipeline, Store Builder, and AI Business Growth Advisor are active.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => saveStep({ completeOnboarding: true }, 8).then((ok) => ok && router.push("/dashboard"))}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Enter Business Dashboard <ArrowRight className="h-4 w-4" />
                </button>
                {subdomain && (
                  <a
                    href={`/store/${subdomain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-navy-900 hover:bg-slate-50"
                  >
                    Preview Storefront ↗
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
