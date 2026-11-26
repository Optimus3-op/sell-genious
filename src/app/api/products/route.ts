import { NextRequest, NextResponse } from "next/server";
import { requireSellerContext } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";
import { newId, safeJsonParse, slugify } from "@/lib/utils";

export async function GET() {
  try {
    const ctx = await requireSellerContext();
    const db = getDb();

    const rows = db
      .prepare(
        `SELECT p.*, COALESCE(i.quantity, 0) as stock_quantity, COALESCE(i.low_stock_threshold, 5) as low_stock_threshold
         FROM products p
         LEFT JOIN inventory i ON i.product_id = p.id AND i.business_id = p.business_id
         WHERE p.business_id = ?
         ORDER BY p.created_at DESC`
      )
      .all(ctx.businessId) as Array<Record<string, unknown>>;

    const variants = db
      .prepare("SELECT * FROM product_variants WHERE business_id = ?")
      .all(ctx.businessId) as Array<Record<string, unknown>>;

    const products = rows.map((r) => ({
      ...r,
      is_featured: Boolean(r.is_featured),
      images: safeJsonParse<string[]>(r.images_json as string, []),
      variants: variants.filter((v) => v.product_id === r.id),
    }));

    return NextResponse.json({ products });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSellerContext();
    const db = getDb();
    const body = (await req.json()) as {
      title?: string;
      description?: string;
      category?: string;
      priceCents?: number;
      discountPriceCents?: number | null;
      sku?: string;
      status?: "active" | "draft" | "archived";
      isFeatured?: boolean;
      images?: string[];
      stockQuantity?: number;
      lowStockThreshold?: number;
      variants?: Array<{ name: string; sku: string; priceCents: number; stockQuantity: number }>;
    };

    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json({ error: "Product title is required." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const id = newId("prod");
    const baseSlug = slugify(title) || "item";
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    const priceCents = Math.max(0, Math.round(Number(body.priceCents) || 0));
    const discountPriceCents =
      body.discountPriceCents !== undefined && body.discountPriceCents !== null && body.discountPriceCents > 0
        ? Math.round(Number(body.discountPriceCents))
        : null;
    const sku = body.sku?.trim() || `SKU-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const images = (body.images || []).filter((u) => u.trim().length > 0);
    if (images.length === 0) {
      images.push("https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80");
    }
    const qty = Math.max(0, Math.round(Number(body.stockQuantity) || 0));
    const threshold = Math.max(1, Math.round(Number(body.lowStockThreshold) || 5));

    db.prepare(
      `INSERT INTO products (id, business_id, title, slug, description, category, price_cents, discount_price_cents, sku, status, is_featured, images_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      ctx.businessId,
      title,
      slug,
      body.description?.trim() || "",
      body.category?.trim() || "General",
      priceCents,
      discountPriceCents,
      sku,
      body.status || "active",
      body.isFeatured ? 1 : 0,
      JSON.stringify(images),
      now,
      now
    );

    if (body.variants && body.variants.length > 0) {
      const insVar = db.prepare(
        "INSERT INTO product_variants (id, business_id, product_id, name, sku, price_cents, stock_quantity, attributes_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      );
      for (const v of body.variants) {
        if (v.name?.trim()) {
          insVar.run(
            newId("var"),
            ctx.businessId,
            id,
            v.name.trim(),
            v.sku?.trim() || `${sku}-${slugify(v.name).slice(0, 4).toUpperCase()}`,
            Math.max(0, Math.round(v.priceCents || priceCents)),
            Math.max(0, Math.round(v.stockQuantity || 0)),
            JSON.stringify({ option: v.name.trim() })
          );
        }
      }
    }

    db.prepare(
      "INSERT INTO inventory (id, business_id, product_id, variant_id, quantity, low_stock_threshold, updated_at) VALUES (?, ?, ?, NULL, ?, ?, ?)"
    ).run(newId("inv"), ctx.businessId, id, qty, threshold, now);

    db.prepare(
      "INSERT INTO inventory_movements (id, business_id, product_id, delta, reason, previous_qty, new_qty, actor_user_id, created_at) VALUES (?, ?, ?, ?, 'Initial product stock', 0, ?, ?, ?)"
    ).run(newId("im"), ctx.businessId, id, qty, qty, ctx.user.id, now);

    return NextResponse.json({ id, slug }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
