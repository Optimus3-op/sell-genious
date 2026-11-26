import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCustomerSession, getOrCreateCartToken, getSellerContext } from "@/lib/auth/session";
import { safeJsonParse } from "@/lib/utils";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;
  const db = getDb();

  const store = db
    .prepare(
      `SELECT s.*, b.name as business_name, b.description as business_description, b.status as business_status, b.category as business_category
       FROM stores s
       JOIN businesses b ON b.id = s.business_id
       WHERE s.subdomain = ?`
    )
    .get(subdomain) as Record<string, unknown> | undefined;

  if (!store || store.business_status === "suspended") {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  // Allow store owner to preview unpublished store; block public visitors if unpublished
  const sellerCtx = await getSellerContext();
  const isOwnerPreview = sellerCtx?.businessId === store.business_id;
  if (!store.is_published && !isOwnerPreview) {
    return NextResponse.json({ error: "This store is not published yet.", unpublished: true }, { status: 403 });
  }

  const products = db
    .prepare(
      `SELECT p.*, COALESCE(i.quantity, 0) as stock_quantity
       FROM products p
       LEFT JOIN inventory i ON i.product_id = p.id AND i.business_id = p.business_id
       WHERE p.business_id = ? AND p.status = 'active'
       ORDER BY p.is_featured DESC, p.created_at DESC`
    )
    .all(store.business_id as string) as Array<Record<string, unknown>>;

  const variants = db
    .prepare("SELECT * FROM product_variants WHERE business_id = ?")
    .all(store.business_id as string) as Array<Record<string, unknown>>;

  const hydratedProducts = products.map((p) => ({
    ...p,
    category: String(p.category || "General"),
    is_featured: Boolean(p.is_featured),
    images: safeJsonParse<string[]>(p.images_json as string, []),
    variants: variants.filter((v) => v.product_id === p.id),
  }));

  const categories = Array.from(new Set(hydratedProducts.map((p) => p.category)));
  const customer = await getCustomerSession(store.business_id as string);
  const { token } = await getOrCreateCartToken();

  const cartRow = db
    .prepare("SELECT id FROM carts WHERE business_id = ? AND session_token = ? AND status = 'active' LIMIT 1")
    .get(store.business_id as string, token) as { id: string } | undefined;

  const cartItems = cartRow
    ? (db
        .prepare(
          `SELECT ci.id, ci.product_id, ci.variant_id, ci.quantity, ci.unit_price_cents,
                  p.title, p.slug, p.images_json, COALESCE(i.quantity, 0) as stock_quantity
           FROM cart_items ci
           JOIN products p ON p.id = ci.product_id
           LEFT JOIN inventory i ON i.product_id = p.id
           WHERE ci.cart_id = ?`
        )
        .all(cartRow.id) as Array<Record<string, unknown>>).map((it) => ({
        ...it,
        images: safeJsonParse<string[]>(it.images_json as string, []),
      }))
    : [];

  return NextResponse.json({
    store: {
      ...store,
      is_published: Boolean(store.is_published),
      sections: safeJsonParse(store.sections_json as string, []),
      social_links: safeJsonParse(store.social_links_json as string, {}),
    },
    isOwnerPreview,
    products: hydratedProducts,
    categories,
    customer,
    cart: cartItems,
  });
}
