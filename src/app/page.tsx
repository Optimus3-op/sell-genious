import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Layers,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-navy-900">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-navy-900">SellGenius AI</span>
              <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-600">
                Commerce OS
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <Link href="/store/urbanstyle" className="hover:text-brand-600 transition-colors">
              Demo Store: UrbanStyle
            </Link>
            <Link href="/store/terraroast" className="hover:text-brand-600 transition-colors">
              Demo Store: TerraRoast
            </Link>
            <Link href="/admin" className="hover:text-brand-600 transition-colors">
              Platform Admin
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Seller Login
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors"
            >
              Launch Store <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-b from-slate-50 via-white to-white">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50/80 px-3.5 py-1.5 text-xs font-semibold text-brand-700">
              <Bot className="h-3.5 w-3.5" /> Independent Multi-Tenant Commerce + Native CRM + AI Growth Advisor
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-navy-900 sm:text-5xl lg:text-6xl">
              One intelligent operating system to{" "}
              <span className="bg-gradient-to-r from-brand-600 to-violet-600 bg-clip-text text-transparent">
                sell, retain &amp; scale
              </span>
              .
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-600">
              SellGenius AI unites an independent online storefront engine, a native Kanban CRM &amp; customer
              segmentation suite, and an analytics-grounded AI Business Growth Advisor—without external Shopify or
              Salesforce dependencies.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-brand-700 transition-all"
              >
                Create Your Business Free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-navy-900 hover:bg-slate-50 transition-all"
              >
                Explore Demo Seller Dashboard
              </Link>
              <Link
                href="/store/urbanstyle"
                className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-5 py-3.5 text-sm font-semibold text-brand-700 hover:bg-brand-100 transition-all"
              >
                <Store className="h-4 w-4" /> Visit UrbanStyle Storefront
              </Link>
            </div>
          </div>

          {/* Demo credentials bar */}
          <div className="mx-auto mt-12 max-w-4xl rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand-600">Interactive Demo Environments</p>
                <p className="text-sm text-slate-600">
                  Test the full journey from public storefront checkout to live CRM sync and AI Growth Advisor analysis.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-slate-700">
                  Seller: demo@urbanstyle.com / SellerPass123!
                </span>
                <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-slate-700">
                  Admin: admin@sellgenius.ai / AdminPass123!
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three Core Pillars */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-navy-900">Independent E-Commerce Engine</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Full catalog, variants, stock movement ledger, order &amp; refund tracking, modular sandbox checkout, and
              a 3-template Store Builder generating dynamic public storefronts at <code className="text-xs">/store/your-brand</code>.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-navy-900">Native CRM &amp; Kanban Pipeline</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Every storefront customer syncs automatically into your CRM with LTV, purchase timeline, automatic
              segments (High-Value, Inactive, Abandoned Cart), lead tracking, and a 6-stage sales pipeline.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Bot className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-navy-900">AI Business Growth Advisor</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Queries your real store data—never fabricating metrics—to diagnose revenue trends, flag low stock,
              surface high-value segments, and generate product-grounded ads &amp; emails in Marketing Studio.
            </p>
          </div>
        </div>

        <div className="mt-12 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: ShieldCheck, label: "Multi-Tenant Isolation", desc: "Server-verified business scoping & Supabase RLS migrations" },
            { icon: Layers, label: "8-Step Onboarding", desc: "Guided business, catalog & store launch flow" },
            { icon: BarChart3, label: "Recharts Analytics", desc: "Date-filtered revenue, retention, LTV & AI explanations" },
            { icon: CheckCircle2, label: "Platform Admin Panel", desc: "Manage tenants, plans, store statuses & GMV" },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-3">
              <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              <div>
                <p className="text-sm font-semibold text-navy-900">{item.label}</p>
                <p className="text-xs text-slate-600">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
