"use client";

import { useEffect, useState } from "react";
import { Edit2, Plus, Star, Trash2, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ProductRow {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  price_cents: number;
  discount_price_cents: number | null;
  sku: string;
  status: "active" | "draft" | "archived";
  is_featured: boolean;
  images: string[];
  stock_quantity: number;
  low_stock_threshold: number;
  variants: Array<{ id: string; name: string; sku: string; price_cents: number; stock_quantity: number }>;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Apparel");
  const [priceDollars, setPriceDollars] = useState("79");
  const [discountDollars, setDiscountDollars] = useState("");
  const [sku, setSku] = useState("");
  const [status, setStatus] = useState<"active" | "draft" | "archived">("active");
  const [isFeatured, setIsFeatured] = useState(false);
  const [imagesText, setImagesText] = useState("");
  const [stockQuantity, setStockQuantity] = useState("20");
  const [lowStockThreshold, setLowStockThreshold] = useState("5");
  const [variantName, setVariantName] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/products");
    const data = (await res.json()) as { products: ProductRow[] };
    setProducts(data.products || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditing(null);
    setTitle("");
    setDescription("");
    setCategory("Apparel");
    setPriceDollars("79");
    setDiscountDollars("");
    setSku("");
    setStatus("active");
    setIsFeatured(false);
    setImagesText("");
    setStockQuantity("20");
    setLowStockThreshold("5");
    setVariantName("");
    setModalOpen(true);
  }

  function openEdit(p: ProductRow) {
    setEditing(p);
    setTitle(p.title);
    setDescription(p.description);
    setCategory(p.category);
    setPriceDollars(String((p.price_cents / 100).toFixed(2)));
    setDiscountDollars(p.discount_price_cents ? String((p.discount_price_cents / 100).toFixed(2)) : "");
    setSku(p.sku);
    setStatus(p.status);
    setIsFeatured(p.is_featured);
    setImagesText(p.images.join("\n"));
    setStockQuantity(String(p.stock_quantity));
    setLowStockThreshold(String(p.low_stock_threshold));
    setVariantName("");
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const images = imagesText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const priceCents = Math.round((Number(priceDollars) || 0) * 100);
    const discountPriceCents = discountDollars.trim() ? Math.round(Number(discountDollars) * 100) : null;

    if (editing) {
      await fetch(`/api/products/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          priceCents,
          discountPriceCents,
          sku,
          status,
          isFeatured,
          images: images.length ? images : editing.images,
          lowStockThreshold: Number(lowStockThreshold) || 5,
        }),
      });
    } else {
      await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          priceCents,
          discountPriceCents,
          sku,
          status,
          isFeatured,
          images,
          stockQuantity: Number(stockQuantity) || 0,
          lowStockThreshold: Number(lowStockThreshold) || 5,
          variants: variantName.trim()
            ? variantName.split(",").map((vn) => ({
                name: vn.trim(),
                sku: `${sku || "VAR"}-${vn.trim().slice(0, 3).toUpperCase()}`,
                priceCents: discountPriceCents ?? priceCents,
                stockQuantity: Number(stockQuantity) || 10,
              }))
            : [],
        }),
      });
    }

    setSaving(false);
    setModalOpen(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete or archive this product?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Products Catalog</h1>
          <p className="text-sm text-slate-600">
            Manage SKUs, pricing, discount offers, multi-image galleries, variants, and featured status.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading catalog...</div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm font-semibold text-navy-900">No products yet</p>
          <p className="mt-1 text-xs text-slate-500">Add your first product to make it live on your storefront.</p>
          <button
            type="button"
            onClick={openNew}
            className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white"
          >
            + Add Product
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.images[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=200&q=60"}
                          alt={p.title}
                          className="h-11 w-11 rounded-lg border border-slate-200 object-cover"
                        />
                        <div>
                          <div className="flex items-center gap-1.5 font-semibold text-navy-900">
                            {p.title}
                            {p.is_featured && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                          </div>
                          <div className="text-xs font-mono text-slate-500">
                            {p.sku}
                            {p.variants.length > 0 ? ` • ${p.variants.length} variant(s)` : ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{p.category}</td>
                    <td className="px-4 py-3">
                      {p.discount_price_cents ? (
                        <div>
                          <span className="font-semibold text-navy-900">{formatCurrency(p.discount_price_cents)}</span>{" "}
                          <span className="text-xs text-slate-400 line-through">{formatCurrency(p.price_cents)}</span>
                        </div>
                      ) : (
                        <span className="font-semibold text-navy-900">{formatCurrency(p.price_cents)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          p.stock_quantity <= p.low_stock_threshold
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {p.stock_quantity} units
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-700">
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          className="rounded-md border border-slate-200 p-1.5 text-rose-600 hover:bg-rose-50"
                          title="Delete / Archive"
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
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy-900">{editing ? "Edit Product" : "Create Product"}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-1 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Product Title</label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Category</label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">SKU</label>
                <input
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="AUTO-GENERATED"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Price (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={priceDollars}
                  onChange={(e) => setPriceDollars(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Discount Price (optional)</label>
                <input
                  type="number"
                  step="0.01"
                  value={discountDollars}
                  onChange={(e) => setDiscountDollars(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              {!editing && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Initial Stock</label>
                  <input
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Low-Stock Alert Threshold</label>
                <input
                  type="number"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "active" | "draft" | "archived")}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  id="featChk"
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                />
                <label htmlFor="featChk" className="text-sm font-medium text-navy-900">
                  Featured product on storefront
                </label>
              </div>
              {!editing && (
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                    Variants (comma-separated, e.g. Black / M, Black / L)
                  </label>
                  <input
                    value={variantName}
                    onChange={(e) => setVariantName(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                  Product Image URLs (one per line)
                </label>
                <textarea
                  rows={2}
                  value={imagesText}
                  onChange={(e) => setImagesText(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  {saving ? "Saving..." : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
