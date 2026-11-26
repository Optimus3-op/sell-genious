import { NextResponse } from "next/server";
import { requireSellerContext } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";
import { safeJsonParse } from "@/lib/utils";

export async function GET() {
  try {
    const ctx = await requireSellerContext();
    const db = getDb();

    const orders = db
      .prepare(
        `SELECT o.*, c.full_name as customer_name, c.email as customer_email, c.phone as customer_phone,
                p.provider as payment_provider, p.reference_code as payment_reference, p.is_simulated as payment_is_simulated
         FROM orders o
         JOIN customers c ON c.id = o.customer_id
         LEFT JOIN payments p ON p.order_id = o.id
         WHERE o.business_id = ?
         ORDER BY o.created_at DESC`
      )
      .all(ctx.businessId) as Array<Record<string, unknown>>;

    const items = db
      .prepare("SELECT * FROM order_items WHERE business_id = ?")
      .all(ctx.businessId) as Array<Record<string, unknown>>;

    const hydrated = orders.map((o) => ({
      ...o,
      shipping_address: safeJsonParse(o.shipping_address_json as string, {}),
      items: items.filter((it) => it.order_id === o.id),
    }));

    return NextResponse.json({ orders: hydrated });
  } catch (err) {
    return handleApiError(err);
  }
}
