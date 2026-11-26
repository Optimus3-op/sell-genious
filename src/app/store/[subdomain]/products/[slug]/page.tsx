"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, ShoppingBag } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ProductDetail {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  price_cents: number;
  discount_price_cents: number | null;
  sku: string;
  images: string[];
  stock_quantity: number;
  variants: Array<{ id: string; name: string; price_cents: number }>;
}

export default function ProductDetailPage() {
  const params = useParams<{ subdomain: string; slug: string }>();
  const router = useRouter();
  const [storeName, setStoreName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#4F46E5");
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    fetch(`/api/storefront/${params.subdomain}`)
      .then((r) => r.json())
      .then((data) => {
        setStoreName(data.store?.name || "");
        setPrimaryColor(data.store?.primary_color || "#4F46E5");
        const found = (data.products || []).find((p: ProductDetail) => p.slug === params.slug);
        setProduct(found || null);
        if (found?.variants?.[0]) setSelectedVariant(found.variants[0].id);
      });
  }, [params.subdomain, params.slug]);

  async function addToCart() {
    if (!product) return;
    await fetch(`/api/storefront/${params.subdomain}/cart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", productId: product.id, variantId: selectedVariant, quantity: qty }),
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6">
        <p className="text-sm text-slate-500">Loading product...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-navy-900">
      <header className="border-b border-slate-200 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href={`/store/${params.subdomain}`} className="inline-flex items-center gap-2 text-sm font-bold text-navy-900">
            <ArrowLeft className="h-4 w-4" /> Back to {storeName}
          </Link>
          <button
            type="button"
            onClick={() => router.push(`/store/${params.subdomain}`)}
            className="text-xs font-semibold text-brand-600 hover:underline"
          >
            View Cart &amp; Checkout →
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-2">
        <div className="space-y-3">
          <img src={product.images[0]} alt={product.title} className="w-full rounded-2xl border border-slate-200 object-cover h-[440px]" />
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((img, i) => (
                <img key={i} src={img} alt={`${product.title} ${i + 1}`} className="h-20 w-full rounded-lg border object-cover" />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {product.category}
          </span>
          <h1 className="text-3xl font-extrabold text-navy-900">{product.title}</h1>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-extrabold text-navy-900">
              {formatCurrency(product.discount_price_cents ?? product.price_cents)}
            </span>
            {product.discount_price_cents && (
              <span className="text-base text-slate-400 line-through">{formatCurrency(product.price_cents)}</span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-slate-600">{product.description}</p>
          <p className="text-xs font-mono text-slate-500">
            SKU: {product.sku} • {product.stock_quantity > 0 ? `${product.stock_quantity} units available` : "Out of stock"}
          </p>

          {product.variants.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase text-slate-600">Select Option</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariant(v.id)}
                    className={`rounded-lg border px-3.5 py-2 text-xs font-semibold ${
                      selectedVariant === v.id ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200"
                    }`}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <input
              type="number"
              min={1}
              max={Math.max(1, product.stock_quantity)}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
              className="w-20 rounded-xl border border-slate-300 px-3 py-3 text-center text-sm font-bold"
            />
            <button
              type="button"
              disabled={product.stock_quantity <= 0}
              onClick={addToCart}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow disabled:opacity-40"
              style={{ backgroundColor: primaryColor }}
            >
              {added ? (
                <>
                  <Check className="h-4 w-4" /> Added to Cart
                </>
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" /> Add to Cart
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
