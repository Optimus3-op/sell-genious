import { NextResponse } from "next/server";
import { requireSellerContext } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";
import { getBusinessIntelligenceSnapshot } from "@/lib/ai/tools";
import { runBusinessGrowthAdvisor } from "@/lib/ai/advisor";

export async function GET() {
  try {
    const ctx = await requireSellerContext();
    const db = getDb();

    const snapshot = getBusinessIntelligenceSnapshot(ctx.businessId, 30);

    const recentOrders = db
      .prepare(
        `SELECT o.id, o.order_number, o.status, o.payment_status, o.fulfillment_status, o.total_cents, o.created_at,
                c.full_name as customer_name, c.email as customer_email
         FROM orders o JOIN customers c ON c.id = o.customer_id
         WHERE o.business_id = ? ORDER BY o.created_at DESC LIMIT 6`
      )
      .all(ctx.businessId);

    const recentCustomers = db
      .prepare(
        `SELECT id, full_name, email, segment, total_spent_cents, orders_count, last_purchase_at, created_at
         FROM customers WHERE business_id = ? ORDER BY created_at DESC LIMIT 6`
      )
      .all(ctx.businessId);

    let recommendations = db
      .prepare("SELECT * FROM ai_recommendations WHERE business_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 4")
      .all(ctx.businessId);

    if (recommendations.length === 0) {
      await runBusinessGrowthAdvisor(ctx.businessId, "How can I increase my sales?", true);
      recommendations = db
        .prepare("SELECT * FROM ai_recommendations WHERE business_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 4")
        .all(ctx.businessId);
    }

    const chartRows = db
      .prepare(
        `SELECT snapshot_date as date, revenue_cents, orders_count, visitors_count
         FROM analytics_snapshots WHERE business_id = ? ORDER BY snapshot_date ASC LIMIT 14`
      )
      .all(ctx.businessId) as Array<{ date: string; revenue_cents: number; orders_count: number; visitors_count: number }>;

    return NextResponse.json({
      context: ctx,
      snapshot,
      recentOrders,
      recentCustomers,
      recommendations,
      chartSeries: chartRows.map((r) => ({
        date: r.date.slice(5),
        revenue: Number((r.revenue_cents / 100).toFixed(2)),
        orders: r.orders_count,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
