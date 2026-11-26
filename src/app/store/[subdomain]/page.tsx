"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CheckCircle2,
  LogOut,
  Minus,
  Package,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { StoreSectionConfig } from "@/lib/types";

interface StoreData {
  id: string;
  business_id: string;
  subdomain: string;
  name: string;
  tagline: string;
  logo_url: string;
  primary_color: string;
  accent_color: string;
  banner_title: string;
  banner_subtitle: string;
  banner_image_url: string;
  theme_id: string;
  sections: StoreSectionConfig[];
  social_links: { instagram?: string; twitter?: string };
  contact_email: string;
  contact_phone: string;
  business_description: string;
  is_published: boolean;
}

interface StoreProduct {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  price_cents: number;
  discount_price_cents: number | null;
  sku: string;
  is_featured: boolean;
  images: string[];
  stock_quantity: number;
  variants: Array<{ id: string; name: string; price_cents: number }>;
}

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price_cents: number;
  title: string;
  slug: string;
  images: string[];
  stock_quantity: number;
}

interface CustomerInfo {
  id: string;
  full_name: string;
  email: string;
  segment: string;
}

interface CustomerOrder {
  id: string;
  order_number: string;
  status: string;
  fulfillment_status: string;
  payment_status: string;
  total_cents: number;
  created_at: string;
  items: Array<{ id: string; product_title: string; quantity: number; total_cents: number }>;
}

export default function PublicStorefrontPage() {
  const params = useParams<{ subdomain: string }>();
  const subdomain = params.subdomain;

  const [store, setStore] = useState<StoreData | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [detailProduct, setDetailProduct] = useState<StoreProduct | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Customer Auth form
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authError, setAuthError] = useState("");

  // Checkout form
  const [shipName, setShipName] = useState("");
  const [shipEmail, setShipEmail] = useState("");
  const [shipPhone, setShipPhone] = useState("");
  const [shipLine1, setShipLine1] = useState("");
  const [shipCity, setShipCity] = useState("");
  const [shipState, setShipState] = useState("");
  const [shipZip, setShipZip] = useState("");
  const [shippingMethodId, setShippingMethodId] = useState("standard");
  const [checkoutError, setCheckoutError] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderConfirmation, setOrderConfirmation] = useState<{
    orderNumber: string;
    totalCents: number;
    paymentReference: string;
    notice: string;
  } | null>(null);

  async function loadStore() {
    setLoading(true);
    const res = await fetch(`/api/storefront/${subdomain}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Storefront unavailable");
      setLoading(false);
      return;
    }
    setStore(data.store);
    setProducts(data.products || []);
    setCategories(data.categories || []);
    setCart(data.cart || []);
    setCustomer(data.customer || null);
    if (data.customer) {
      setShipName(data.customer.full_name);
      setShipEmail(data.customer.email);
    }
    setLoading(false);
  }

  async function loadOrderHistory() {
    const res = await fetch(`/api/storefront/${subdomain}/auth`);
    const data = (await res.json()) as { orders: CustomerOrder[] };
    setOrders(data.orders || []);
  }

  useEffect(() => {
    loadStore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdomain]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === "All" || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQ = !q || p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [products, selectedCategory, searchQuery]);

  const cartSubtotalCents = cart.reduce((acc, item) => acc + item.unit_price_cents * item.quantity, 0);
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const shippingCostCents = shippingMethodId === "priority" ? 2200 : cartSubtotalCents >= 15000 ? 0 : 1200;

  async function mutateCart(payload: Record<string, unknown>, openDrawer = false) {
    await fetch(`/api/storefront/${subdomain}/cart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await loadStore();
    if (openDrawer) setCartOpen(true);
  }

  async function submitCustomerAuth(e: React.FormEvent, presetEmail?: string, presetPass?: string) {
    e.preventDefault();
    setAuthError("");
    const res = await fetch(`/api/storefront/${subdomain}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: presetEmail ? "login" : authMode,
        fullName: authName,
        email: presetEmail ?? authEmail,
        password: presetPass ?? authPass,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setAuthError(data.error || "Authentication failed");
      return;
    }
    setAuthModalOpen(false);
    await loadStore();
  }

  async function submitCheckout(e: React.FormEvent) {
    e.preventDefault();
    setCheckoutError("");
    setPlacingOrder(true);
    const res = await fetch(`/api/storefront/${subdomain}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: shipName,
        email: shipEmail,
        phone: shipPhone,
        shippingMethodId,
        address: { line1: shipLine1, city: shipCity, state: shipState, postalCode: shipZip, country: "US" },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setCheckoutError(data.error || "Checkout failed");
      setPlacingOrder(false);
      return;
    }
    setOrderConfirmation(data.order);
    setCheckoutOpen(false);
    setCartOpen(false);
    setPlacingOrder(false);
    await loadStore();
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-white text-sm text-slate-500">Loading storefront...</div>;
  }

  if (error || !store) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <h1 className="text-2xl font-bold text-navy-900">Storefront Unavailable</h1>
        <p className="mt-2 text-sm text-slate-600">{error}</p>
        <Link href="/" className="mt-5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white">
          Return to SellGenius AI
        </Link>
      </div>
    );
  }

  const isMinimal = store.theme_id === "theme_minimal";
  const isBoutique = store.theme_id === "theme_boutique";
  const primary = store.primary_color || "#4F46E5";
  const accent = store.accent_color || "#7C3AED";
  const enabledSections = (store.sections || []).filter((s) => s.enabled);

  return (
    <div className={`min-h-screen ${isBoutique ? "bg-stone-50" : "bg-white"} text-navy-900`}>
      {/* Storefront Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.name} className="h-9 w-9 rounded-lg object-cover" />
            ) : (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-extrabold text-white"
                style={{ backgroundColor: primary }}
              >
                {store.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <span className="text-lg font-extrabold tracking-tight text-navy-900">{store.name}</span>
              {store.tagline && <p className="hidden text-[11px] text-slate-500 sm:block">{store.tagline}</p>}
            </div>
          </div>

          <div className="hidden max-w-sm flex-1 md:block">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs focus:border-slate-400 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {customer ? (
              <button
                type="button"
                onClick={() => {
                  loadOrderHistory();
                  setAccountModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-xs font-semibold hover:bg-slate-50"
              >
                <User className="h-3.5 w-3.5" /> {customer.full_name.split(" ")[0]}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-xs font-semibold hover:bg-slate-50"
              >
                <User className="h-3.5 w-3.5" /> Sign In / Register
              </button>
            )}

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-white shadow-sm"
              style={{ backgroundColor: primary }}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Cart ({cartCount})
            </button>
          </div>
        </div>
      </header>

      {/* Order Confirmation Banner */}
      {orderConfirmation && (
        <div className="border-b border-emerald-200 bg-emerald-50 px-6 py-5">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-600" />
              <div>
                <h3 className="text-sm font-bold text-emerald-900">
                  Order {orderConfirmation.orderNumber} Confirmed! ({formatCurrency(orderConfirmation.totalCents)})
                </h3>
                <p className="text-xs text-emerald-800">
                  Ref: <code className="font-mono">{orderConfirmation.paymentReference}</code> — {orderConfirmation.notice}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOrderConfirmation(null)}
              className="self-start rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Storefront Sections */}
      <main className="mx-auto max-w-7xl space-y-14 px-6 py-10">
        {enabledSections.map((sec) => {
          if (sec.type === "hero") {
            return (
              <section
                key={sec.id}
                className={`overflow-hidden rounded-3xl ${
                  isMinimal ? "border border-slate-200 bg-slate-50" : "text-white shadow-lg"
                }`}
                style={
                  isMinimal
                    ? undefined
                    : { background: `linear-gradient(125deg, ${primary}, ${accent})` }
                }
              >
                <div className="grid items-center gap-8 p-8 md:grid-cols-2 md:p-12">
                  <div>
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                        isMinimal ? "bg-slate-200 text-navy-900" : "bg-white/20 text-white"
                      }`}
                    >
                      {store.name} Official Store
                    </span>
                    <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                      {store.banner_title || store.name}
                    </h1>
                    <p className={`mt-4 text-sm leading-relaxed sm:text-base ${isMinimal ? "text-slate-600" : "text-white/90"}`}>
                      {store.banner_subtitle || store.business_description}
                    </p>
                    <a
                      href="#catalog"
                      className={`mt-6 inline-block rounded-xl px-6 py-3 text-sm font-bold shadow-sm ${
                        isMinimal ? "text-white" : "bg-white text-navy-900"
                      }`}
                      style={isMinimal ? { backgroundColor: primary } : undefined}
                    >
                      Shop Collection ↓
                    </a>
                  </div>
                  {store.banner_image_url && (
                    <div className="overflow-hidden rounded-2xl shadow-md">
                      <img src={store.banner_image_url} alt={store.name} className="h-72 w-full object-cover sm:h-80" />
                    </div>
                  )}
                </div>
              </section>
            );
          }

          if (sec.type === "featured_products") {
            const featured = products.filter((p) => p.is_featured).slice(0, 3);
            if (featured.length === 0) return null;
            return (
              <section key={sec.id}>
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-navy-900">{sec.title}</h2>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                  {featured.map((p) => (
                    <div key={p.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-all hover:shadow-md">
                      <div className="relative h-60 overflow-hidden bg-slate-100">
                        <img
                          src={p.images[0]}
                          alt={p.title}
                          onClick={() => setDetailProduct(p)}
                          className="h-full w-full cursor-pointer object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {p.discount_price_cents && (
                          <span className="absolute left-3 top-3 rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-bold text-white">
                            SALE
                          </span>
                        )}
                      </div>
                      <div className="p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{p.category}</p>
                        <Link href={`/store/${subdomain}/products/${p.slug}`} className="mt-1 block text-base font-bold text-navy-900 hover:underline">
                          {p.title}
                        </Link>
                        <div className="mt-3 flex items-center justify-between">
                          <div>
                            <span className="text-base font-extrabold text-navy-900">
                              {formatCurrency(p.discount_price_cents ?? p.price_cents)}
                            </span>
                            {p.discount_price_cents && (
                              <span className="ml-2 text-xs text-slate-400 line-through">{formatCurrency(p.price_cents)}</span>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={p.stock_quantity <= 0}
                            onClick={() => mutateCart({ action: "add", productId: p.id, quantity: 1 }, true)}
                            className="rounded-lg px-3.5 py-2 text-xs font-bold text-white disabled:opacity-40"
                            style={{ backgroundColor: primary }}
                          >
                            {p.stock_quantity > 0 ? "Add to Cart" : "Sold Out"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          if (sec.type === "categories") {
            return (
              <section key={sec.id} className="flex flex-wrap items-center gap-2">
                <span className="mr-2 text-xs font-bold uppercase tracking-wider text-slate-500">Categories:</span>
                {["All", ...categories].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-all ${
                      selectedCategory === cat
                        ? "border-transparent text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                    style={selectedCategory === cat ? { backgroundColor: primary } : undefined}
                  >
                    {cat}
                  </button>
                ))}
              </section>
            );
          }

          if (sec.type === "catalog") {
            return (
              <section key={sec.id} id="catalog">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-xl font-bold text-navy-900">
                    {sec.title} ({filteredProducts.length})
                  </h2>
                  <div className="relative md:hidden">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search products..."
                      className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs"
                    />
                  </div>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredProducts.map((p) => (
                    <div key={p.id} className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                      <div>
                        <img
                          src={p.images[0]}
                          alt={p.title}
                          onClick={() => setDetailProduct(p)}
                          className="h-56 w-full cursor-pointer object-cover"
                        />
                        <div className="p-5">
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span className="font-semibold uppercase">{p.category}</span>
                            <span>{p.stock_quantity > 0 ? `${p.stock_quantity} in stock` : "Out of stock"}</span>
                          </div>
                          <Link href={`/store/${subdomain}/products/${p.slug}`} className="mt-1 block text-base font-bold text-navy-900 hover:underline">
                            {p.title}
                          </Link>
                          <p className="mt-1.5 line-clamp-2 text-xs text-slate-600">{p.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5">
                        <div>
                          <span className="text-base font-extrabold text-navy-900">
                            {formatCurrency(p.discount_price_cents ?? p.price_cents)}
                          </span>
                          {p.discount_price_cents && (
                            <span className="ml-2 text-xs text-slate-400 line-through">{formatCurrency(p.price_cents)}</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setDetailProduct(p)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy-900 hover:bg-slate-50"
                          >
                            Quick View
                          </button>
                          <button
                            type="button"
                            disabled={p.stock_quantity <= 0}
                            onClick={() => mutateCart({ action: "add", productId: p.id, quantity: 1 }, true)}
                            className="rounded-lg px-3.5 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                            style={{ backgroundColor: primary }}
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          if (sec.type === "brand_story") {
            return (
              <section key={sec.id} className="rounded-2xl border border-slate-200 bg-white p-8">
                <h2 className="text-lg font-bold text-navy-900">{sec.title}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">{store.business_description}</p>
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
                  {store.contact_email && <span>Support: {store.contact_email}</span>}
                  {store.contact_phone && <span>Phone: {store.contact_phone}</span>}
                  {store.social_links?.instagram && <span>Instagram: {store.social_links.instagram}</span>}
                </div>
              </section>
            );
          }

          return null;
        })}
      </main>

      <footer className="mt-16 border-t border-slate-200 bg-white px-6 py-8 text-center text-xs text-slate-500">
        <p className="font-semibold text-navy-900">{store.name}</p>
        <p className="mt-1 inline-flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5 text-brand-600" /> Powered independently by{" "}
          <Link href="/" className="font-semibold text-brand-600 hover:underline">
            SellGenius AI
          </Link>
        </p>
      </footer>

      {/* Quick Product Details Modal */}
      {detailProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="grid max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl md:grid-cols-2">
            <img src={detailProduct.images[0]} alt={detailProduct.title} className="h-72 w-full object-cover md:h-full" />
            <div className="flex flex-col justify-between p-6">
              <div>
                <div className="flex items-start justify-between">
                  <span className="text-xs font-bold uppercase text-slate-400">{detailProduct.category}</span>
                  <button type="button" onClick={() => setDetailProduct(null)} className="rounded p-1 hover:bg-slate-100">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <h2 className="mt-2 text-xl font-bold text-navy-900">{detailProduct.title}</h2>
                <p className="mt-2 text-lg font-extrabold text-navy-900">
                  {formatCurrency(detailProduct.discount_price_cents ?? detailProduct.price_cents)}
                </p>
                <p className="mt-3 text-sm text-slate-600">{detailProduct.description}</p>
                <p className="mt-3 text-xs text-slate-500">SKU: {detailProduct.sku} • {detailProduct.stock_quantity} available</p>
              </div>
              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  disabled={detailProduct.stock_quantity <= 0}
                  onClick={() => {
                    mutateCart({ action: "add", productId: detailProduct.id, quantity: 1 }, true);
                    setDetailProduct(null);
                  }}
                  className="flex-1 rounded-xl py-3 text-sm font-bold text-white disabled:opacity-40"
                  style={{ backgroundColor: primary }}
                >
                  Add to Cart
                </button>
                <Link
                  href={`/store/${subdomain}/products/${detailProduct.slug}`}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-navy-900"
                >
                  Full Page
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shopping Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
          <div className="flex h-full w-full max-w-md flex-col justify-between bg-white p-6 shadow-2xl">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <h2 className="text-lg font-bold text-navy-900">Shopping Cart ({cartCount})</h2>
                <button type="button" onClick={() => setCartOpen(false)} className="rounded p-1 hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 max-h-[55vh] space-y-3 overflow-y-auto">
                {cart.length === 0 ? (
                  <p className="py-12 text-center text-sm text-slate-500">Your cart is empty.</p>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                      <img src={item.images[0]} alt={item.title} className="h-14 w-14 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-navy-900">{item.title}</p>
                        <p className="text-xs text-slate-500">{formatCurrency(item.unit_price_cents)}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => mutateCart({ action: "update", itemId: item.id, quantity: item.quantity - 1 })}
                            className="rounded border p-1"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs font-bold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => mutateCart({ action: "update", itemId: item.id, quantity: item.quantity + 1 })}
                            className="rounded border p-1"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => mutateCart({ action: "remove", itemId: item.id })}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {cart.length > 0 && (
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div className="flex justify-between text-sm font-bold">
                  <span>Subtotal</span>
                  <span>{formatCurrency(cartSubtotalCents)}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {cartSubtotalCents >= 15000 ? "Qualifies for Free Express Shipping!" : "Orders $150+ unlock Free Express Shipping."}
                </p>
                <button
                  type="button"
                  onClick={() => setCheckoutOpen(true)}
                  className="w-full rounded-xl py-3 text-sm font-bold text-white shadow"
                  style={{ backgroundColor: primary }}
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal (Clearly Labeled Sandbox Simulated Checkout) */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={submitCheckout} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy-900">Checkout — {store.name}</h2>
              <button type="button" onClick={() => setCheckoutOpen(false)} className="rounded p-1 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
              <div>
                <strong>Sandbox Simulated Checkout (MVP):</strong> Placing this order records a simulated payment
                transaction and syncs your order &amp; profile into {store.name}&apos;s SellGenius CRM. No real card is charged.
              </div>
            </div>

            {checkoutError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{checkoutError}</div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Full Name</label>
                <input required value={shipName} onChange={(e) => setShipName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Email</label>
                <input type="email" required value={shipEmail} onChange={(e) => setShipEmail(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Street Address</label>
                <input required value={shipLine1} onChange={(e) => setShipLine1(e.target.value)} placeholder="742 Valencia St" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">City</label>
                <input required value={shipCity} onChange={(e) => setShipCity(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">State</label>
                  <input required value={shipState} onChange={(e) => setShipState(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">ZIP</label>
                  <input required value={shipZip} onChange={(e) => setShipZip(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Phone</label>
                <input value={shipPhone} onChange={(e) => setShipPhone(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-600">Shipping Method</label>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setShippingMethodId("standard")}
                  className={`rounded-xl border p-3 text-left text-xs ${
                    shippingMethodId === "standard" ? "border-brand-600 bg-brand-50" : "border-slate-200"
                  }`}
                >
                  <p className="font-bold text-navy-900">
                    {cartSubtotalCents >= 15000 ? "Free Express ($150+)" : "Standard Ground"}
                  </p>
                  <p className="text-slate-500">{cartSubtotalCents >= 15000 ? "$0.00" : "$12.00"}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setShippingMethodId("priority")}
                  className={`rounded-xl border p-3 text-left text-xs ${
                    shippingMethodId === "priority" ? "border-brand-600 bg-brand-50" : "border-slate-200"
                  }`}
                >
                  <p className="font-bold text-navy-900">Priority Air Express</p>
                  <p className="text-slate-500">$22.00 (1–2 business days)</p>
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(cartSubtotalCents)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{formatCurrency(shippingCostCents)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-extrabold text-navy-900">
                <span>Total (Simulated Checkout)</span>
                <span>{formatCurrency(cartSubtotalCents + shippingCostCents)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={placingOrder}
              className="w-full rounded-xl py-3 text-sm font-bold text-white"
              style={{ backgroundColor: primary }}
            >
              {placingOrder ? "Processing Sandbox Order..." : "Complete Simulated Order"}
            </button>
          </form>
        </div>
      )}

      {/* Customer Auth Modal */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy-900">
                {authMode === "register" ? "Create Shopper Account" : "Customer Sign In"}
              </h2>
              <button type="button" onClick={() => setAuthModalOpen(false)} className="rounded p-1 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            {authError && <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{authError}</div>}
            <form onSubmit={(e) => submitCustomerAuth(e)} className="space-y-3">
              {authMode === "register" && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Full Name</label>
                  <input required value={authName} onChange={(e) => setAuthName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Email</label>
                <input type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Password</label>
                <input type="password" required minLength={6} value={authPass} onChange={(e) => setAuthPass(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <button type="submit" className="w-full rounded-xl py-2.5 text-sm font-bold text-white" style={{ backgroundColor: primary }}>
                {authMode === "register" ? "Register & Continue" : "Sign In"}
              </button>
            </form>
            {subdomain === "urbanstyle" && (
              <button
                type="button"
                onClick={(e) => submitCustomerAuth(e, "alex.rivera@example.com", "CustomerPass123!")}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-navy-900 hover:bg-slate-100"
              >
                Demo Shopper Sign In (alex.rivera@example.com)
              </button>
            )}
            <p className="text-center text-xs text-slate-600">
              {authMode === "register" ? "Already have an account?" : "New shopper?"}{" "}
              <button
                type="button"
                onClick={() => setAuthMode(authMode === "register" ? "login" : "register")}
                className="font-bold text-brand-600 hover:underline"
              >
                {authMode === "register" ? "Sign in" : "Create account"}
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Customer Account & Order History Modal */}
      {accountModalOpen && customer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-lg font-bold text-navy-900">{customer.full_name}</h2>
                <p className="text-xs text-slate-500">{customer.email}</p>
              </div>
              <button type="button" onClick={() => setAccountModalOpen(false)} className="rounded p-1 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase text-slate-500">
                <Package className="h-4 w-4" /> Your Order History ({orders.length})
              </h3>
              <div className="space-y-2.5">
                {orders.map((o) => (
                  <div key={o.id} className="rounded-xl border border-slate-200 p-3.5 text-xs">
                    <div className="flex items-center justify-between font-bold text-navy-900">
                      <span>{o.order_number}</span>
                      <span>{formatCurrency(o.total_cents)}</span>
                    </div>
                    <p className="mt-0.5 text-slate-500">
                      {formatDate(o.created_at)} • Fulfillment: <span className="capitalize">{o.fulfillment_status}</span>
                    </p>
                  </div>
                ))}
                {orders.length === 0 && <p className="text-xs text-slate-400">No orders placed yet.</p>}
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                await fetch(`/api/storefront/${subdomain}/auth`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "logout" }),
                });
                setAccountModalOpen(false);
                loadStore();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
