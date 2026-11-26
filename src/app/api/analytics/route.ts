import { NextRequest, NextResponse } from "next/server";
import { requireSellerContext } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";
import { getBusinessIntelligenceSnapshot } from "@/lib/ai/tools";
import { formatCurrency } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireSellerContext();
    const daysParam = Number(req.nextUrl.searchParams.get("days") || "30");
    const days = [7, 14, 30, 90].includes(daysParam) ? daysParam : 30;

    const db = getDb();
    const snapshot = getBusinessIntelligenceSnapshot(ctx.businessId, days);
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Combine analytics_snapshots with live orders by date
    const snapRows = db
      .prepare(
        `SELECT snapshot_date as date, revenue_cents, orders_count, new_customers_count, visitors_count, conversion_rate
         FROM analytics_snapshots
         WHERE business_id = ? AND snapshot_date >= ?
         ORDER BY snapshot_date ASC`
      )
      .all(ctx.businessId, cutoffDate) as Array<{
      date: string;
      revenue_cents: number;
      orders_count: number;
      new_customers_count: number;
      visitors_count: number;
      conversion_rate: number;
    }>;

    const liveOrderDays = db
      .prepare(
        `SELECT substr(created_at, 1, 10) as date,
                SUM(CASE WHEN status != 'cancelled' THEN total_cents - refund_amount_cents ELSE 0 END) as revenue_cents,
                COUNT(*) as orders_count
         FROM orders
         WHERE business_id = ? AND substr(created_at, 1, 10) >= ?
         GROUP BY substr(created_at, 1, 10)
         ORDER BY date ASC`
      )
      .all(ctx.businessId, cutoffDate) as Array<{ date: string; revenue_cents: number; orders_count: number }>;

    const dateMap = new Map<
      string,
      { date: string; revenue: number; orders: number; newCustomers: number; visitors: number }
    >();

    for (const s of snapRows) {
      dateMap.set(s.date, {
        date: s.date,
        revenue: Number((s.revenue_cents / 100).toFixed(2)),
        orders: s.orders_count,
        newCustomers: s.new_customers_count,
        visitors: s.visitors_count,
      });
    }

    for (const l of liveOrderDays) {
      const existing = dateMap.get(l.date);
      if (existing) {
        existing.revenue = Math.max(existing.revenue, Number((l.revenue_cents / 100).toFixed(2)));
        existing.orders = Math.max(existing.orders, l.orders_count);
      } else {
        dateMap.set(l.date, {
          date: l.date,
          revenue: Number((l.revenue_cents / 100).toFixed(2)),
          orders: l.orders_count,
          newCustomers: 1,
          visitors: l.orders_count * 40,
        });
      }
    }

    const timeSeries = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    const campaigns = db
      .prepare("SELECT id, name, channel, status, target_segment, scheduled_date, budget_cents FROM marketing_campaigns WHERE business_id = ?")
      .all(ctx.businessId);

    const plainEnglishSummary = [
      `Over the last ${days} days, ${snapshot.business.name} recorded ${formatCurrency(snapshot.kpis.totalRevenueCents)} in net revenue across ${snapshot.kpis.paidOrders} active orders (AOV: ${formatCurrency(snapshot.kpis.averageOrderValueCents)}).`,
      snapshot.topProducts[0]
        ? `Your #1 product is "${snapshot.topProducts[0].title}" with ${snapshot.topProducts[0].unitsSold} units sold (${formatCurrency(snapshot.topProducts[0].revenueCents)}).`
        : "Add products and complete orders to reveal your top-performing SKUs.",
      `You have ${snapshot.kpis.totalCustomers} CRM customers with a ${snapshot.kpis.repeatPurchaseRatePct}% repeat purchase rate and ${formatCurrency(snapshot.kpis.averageLtvCents)} average buyer LTV.`,
      snapshot.kpis.lowStockCount > 0
        ? `Attention needed: ${snapshot.kpis.lowStockCount} product(s) are at or below their low-stock alert threshold.`
        : "Inventory stock levels are currently healthy across your catalog.",
    ].join(" ");

    return NextResponse.json({
      days,
      snapshot,
      timeSeries,
      campaigns,
      plainEnglishSummary,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
