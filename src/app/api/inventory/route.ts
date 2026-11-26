import { NextRequest, NextResponse } from "next/server";
import { requireSellerContext } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";
import { newId } from "@/lib/utils";

export async function GET() {
  try {
    const ctx = await requireSellerContext();
    const db = getDb();

    const items = db
      .prepare(
        `SELECT i.id, i.product_id, i.quantity, i.low_stock_threshold, i.updated_at,
                p.title, p.sku, p.category, p.status, p.price_cents
         FROM inventory i
         JOIN products p ON p.id = i.product_id
         WHERE i.business_id = ? AND p.status != 'archived'
         ORDER BY (i.quantity <= i.low_stock_threshold) DESC, i.quantity ASC`
      )
      .all(ctx.businessId);

    const movements = db
      .prepare(
        `SELECT m.*, p.title as product_title, p.sku
         FROM inventory_movements m
         JOIN products p ON p.id = m.product_id
         WHERE m.business_id = ?
         ORDER BY m.created_at DESC
         LIMIT 50`
      )
      .all(ctx.businessId);

    return NextResponse.json({ items, movements });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSellerContext();
    const db = getDb();
    const body = (await req.json()) as {
      productId?: string;
      delta?: number;
      newQuantity?: number;
      lowStockThreshold?: number;
      reason?: string;
    };

    if (!body.productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }

    const inv = db
      .prepare("SELECT id, quantity, low_stock_threshold FROM inventory WHERE product_id = ? AND business_id = ?")
      .get(body.productId, ctx.businessId) as { id: string; quantity: number; low_stock_threshold: number } | undefined;

    if (!inv) {
      return NextResponse.json({ error: "Inventory record not found" }, { status: 404 });
    }

    const previousQty = inv.quantity;
    const newQty =
      body.newQuantity !== undefined
        ? Math.max(0, Math.round(body.newQuantity))
        : Math.max(0, previousQty + Math.round(body.delta || 0));
    const delta = newQty - previousQty;
    const threshold =
      body.lowStockThreshold !== undefined ? Math.max(1, Math.round(body.lowStockThreshold)) : inv.low_stock_threshold;

    const now = new Date().toISOString();
    db.prepare("UPDATE inventory SET quantity = ?, low_stock_threshold = ?, updated_at = ? WHERE id = ? AND business_id = ?").run(
      newQty,
      threshold,
      now,
      inv.id,
      ctx.businessId
    );

    if (delta !== 0) {
      db.prepare(
        `INSERT INTO inventory_movements (id, business_id, product_id, delta, reason, previous_qty, new_qty, actor_user_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        newId("im"),
        ctx.businessId,
        body.productId,
        delta,
        body.reason?.trim() || "Manual inventory adjustment",
        previousQty,
        newQty,
        ctx.user.id,
        now
      );
    }

    return NextResponse.json({ ok: true, previousQty, newQty, delta });
  } catch (err) {
    return handleApiError(err);
  }
}
