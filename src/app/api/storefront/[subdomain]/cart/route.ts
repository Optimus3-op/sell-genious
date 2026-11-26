import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { CART_COOKIE, getCustomerSession, getOrCreateCartToken } from "@/lib/auth/session";
import { newId } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ subdomain: string }> }) {
  try {
    const { subdomain } = await params;
    const db = getDb();
    const store = db.prepare("SELECT id, business_id FROM stores WHERE subdomain = ?").get(subdomain) as
      | { id: string; business_id: string }
      | undefined;

    if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

    const body = (await req.json()) as {
      action: "add" | "update" | "remove" | "clear";
      productId?: string;
      variantId?: string | null;
      itemId?: string;
      quantity?: number;
    };

    const { token, isNew } = await getOrCreateCartToken();
    const customer = await getCustomerSession(store.business_id);
    const now = new Date().toISOString();

    let cart = db
      .prepare("SELECT id FROM carts WHERE business_id = ? AND session_token = ? AND status = 'active' LIMIT 1")
      .get(store.business_id, token) as { id: string } | undefined;

    if (!cart) {
      const cartId = newId("cart");
      db.prepare(
        "INSERT INTO carts (id, business_id, store_id, customer_id, session_token, status, updated_at, created_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)"
      ).run(cartId, store.business_id, store.id, customer?.id ?? null, token, now, now);
      cart = { id: cartId };
    } else if (customer) {
      db.prepare("UPDATE carts SET customer_id = ?, updated_at = ? WHERE id = ?").run(customer.id, now, cart.id);
    }

    if (body.action === "clear") {
      db.prepare("DELETE FROM cart_items WHERE cart_id = ?").run(cart.id);
    } else if (body.action === "remove" && body.itemId) {
      db.prepare("DELETE FROM cart_items WHERE id = ? AND cart_id = ?").run(body.itemId, cart.id);
    } else if (body.action === "update" && body.itemId) {
      const qty = Math.round(Number(body.quantity) || 0);
      if (qty <= 0) {
        db.prepare("DELETE FROM cart_items WHERE id = ? AND cart_id = ?").run(body.itemId, cart.id);
      } else {
        db.prepare("UPDATE cart_items SET quantity = ? WHERE id = ? AND cart_id = ?").run(qty, body.itemId, cart.id);
      }
    } else if (body.action === "add" && body.productId) {
      const product = db
        .prepare(
          `SELECT p.id, p.price_cents, p.discount_price_cents, COALESCE(i.quantity, 0) as stock_quantity
           FROM products p LEFT JOIN inventory i ON i.product_id = p.id
           WHERE p.id = ? AND p.business_id = ? AND p.status = 'active'`
        )
        .get(body.productId, store.business_id) as
        | { id: string; price_cents: number; discount_price_cents: number | null; stock_quantity: number }
        | undefined;

      if (!product) return NextResponse.json({ error: "Product unavailable" }, { status: 404 });
      if (product.stock_quantity <= 0) return NextResponse.json({ error: "Product is out of stock" }, { status: 400 });

      const unitPrice = product.discount_price_cents ?? product.price_cents;
      const qtyToAdd = Math.max(1, Math.round(Number(body.quantity) || 1));

      const existingItem = db
        .prepare("SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?")
        .get(cart.id, product.id) as { id: string; quantity: number } | undefined;

      if (existingItem) {
        const nextQty = Math.min(product.stock_quantity, existingItem.quantity + qtyToAdd);
        db.prepare("UPDATE cart_items SET quantity = ?, unit_price_cents = ? WHERE id = ?").run(
          nextQty,
          unitPrice,
          existingItem.id
        );
      } else {
        db.prepare(
          "INSERT INTO cart_items (id, cart_id, product_id, variant_id, quantity, unit_price_cents) VALUES (?, ?, ?, ?, ?, ?)"
        ).run(newId("ci"), cart.id, product.id, body.variantId ?? null, Math.min(product.stock_quantity, qtyToAdd), unitPrice);
      }
    }

    db.prepare("UPDATE carts SET updated_at = ? WHERE id = ?").run(now, cart.id);

    const res = NextResponse.json({ ok: true });
    if (isNew) {
      res.cookies.set(CART_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
    }
    return res;
  } catch (err) {
    console.error("Cart error:", err);
    return NextResponse.json({ error: "Cart update failed" }, { status: 500 });
  }
}
