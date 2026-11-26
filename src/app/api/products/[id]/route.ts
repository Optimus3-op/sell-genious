import { NextRequest, NextResponse } from "next/server";
import { requireSellerContext } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSellerContext();
    const { id } = await params;
    const db = getDb();

    const existing = db.prepare("SELECT id FROM products WHERE id = ? AND business_id = ?").get(id, ctx.businessId);
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

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
      lowStockThreshold?: number;
    };

    const now = new Date().toISOString();
    db.prepare(
      `UPDATE products
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           category = COALESCE(?, category),
           price_cents = COALESCE(?, price_cents),
           discount_price_cents = CASE WHEN ? = 1 THEN ? ELSE discount_price_cents END,
           sku = COALESCE(?, sku),
           status = COALESCE(?, status),
           is_featured = COALESCE(?, is_featured),
           images_json = COALESCE(?, images_json),
           updated_at = ?
       WHERE id = ? AND business_id = ?`
    ).run(
      body.title?.trim() ?? null,
      body.description ?? null,
      body.category?.trim() ?? null,
      body.priceCents !== undefined ? Math.max(0, Math.round(body.priceCents)) : null,
      body.discountPriceCents !== undefined ? 1 : 0,
      body.discountPriceCents !== undefined && body.discountPriceCents !== null && body.discountPriceCents > 0
        ? Math.round(body.discountPriceCents)
        : null,
      body.sku?.trim() ?? null,
      body.status ?? null,
      body.isFeatured !== undefined ? (body.isFeatured ? 1 : 0) : null,
      body.images ? JSON.stringify(body.images.filter((u) => u.trim().length > 0)) : null,
      now,
      id,
      ctx.businessId
    );

    if (body.lowStockThreshold !== undefined) {
      db.prepare("UPDATE inventory SET low_stock_threshold = ?, updated_at = ? WHERE product_id = ? AND business_id = ?").run(
        Math.max(1, Math.round(body.lowStockThreshold)),
        now,
        id,
        ctx.businessId
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSellerContext();
    const { id } = await params;
    const db = getDb();

    const hasOrders = db
      .prepare("SELECT 1 FROM order_items WHERE product_id = ? AND business_id = ? LIMIT 1")
      .get(id, ctx.businessId);

    if (hasOrders) {
      // Preserve referential integrity for historical orders by archiving instead of hard delete
      db.prepare("UPDATE products SET status = 'archived', updated_at = ? WHERE id = ? AND business_id = ?").run(
        new Date().toISOString(),
        id,
        ctx.businessId
      );
      return NextResponse.json({ ok: true, archived: true });
    }

    db.prepare("DELETE FROM products WHERE id = ? AND business_id = ?").run(id, ctx.businessId);
    return NextResponse.json({ ok: true, deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}
