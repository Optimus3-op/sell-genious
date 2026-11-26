import { NextRequest, NextResponse } from "next/server";
import { requireSellerContext } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";
import { syncSegmentCounts } from "@/lib/services/crm";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireSellerContext();
    const db = getDb();
    syncSegmentCounts(db, ctx.businessId);

    const segmentFilter = req.nextUrl.searchParams.get("segment");
    const query = segmentFilter && segmentFilter !== "all"
      ? db.prepare("SELECT * FROM customers WHERE business_id = ? AND segment = ? ORDER BY total_spent_cents DESC").all(ctx.businessId, segmentFilter)
      : db.prepare("SELECT * FROM customers WHERE business_id = ? ORDER BY total_spent_cents DESC").all(ctx.businessId);

    const segments = db
      .prepare("SELECT * FROM customer_segments WHERE business_id = ? ORDER BY customer_count DESC")
      .all(ctx.businessId);

    const orders = db
      .prepare("SELECT id, customer_id, order_number, status, total_cents, created_at FROM orders WHERE business_id = ? ORDER BY created_at DESC")
      .all(ctx.businessId) as Array<Record<string, unknown>>;

    const activities = db
      .prepare("SELECT * FROM sales_activities WHERE business_id = ? AND customer_id IS NOT NULL ORDER BY created_at DESC")
      .all(ctx.businessId) as Array<Record<string, unknown>>;

    const addresses = db
      .prepare("SELECT * FROM customer_addresses WHERE business_id = ?")
      .all(ctx.businessId) as Array<Record<string, unknown>>;

    const customers = (query as Array<Record<string, unknown>>).map((c) => ({
      ...c,
      orders: orders.filter((o) => o.customer_id === c.id),
      activities: activities.filter((a) => a.customer_id === c.id),
      addresses: addresses.filter((addr) => addr.customer_id === c.id),
    }));

    return NextResponse.json({ customers, segments });
  } catch (err) {
    return handleApiError(err);
  }
}
