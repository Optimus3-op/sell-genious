import { NextRequest, NextResponse } from "next/server";
import { requireAdminContext } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const admin = await requireAdminContext();
    const db = getDb();

    const businesses = db
      .prepare(
        `SELECT b.*,
                u.full_name as owner_name, u.email as owner_email,
                s.subdomain, s.is_published, s.theme_id,
                sub.plan_name, sub.monthly_price_cents, sub.status as subscription_status,
                (SELECT COUNT(*) FROM products p WHERE p.business_id = b.id) as products_count,
                (SELECT COUNT(*) FROM orders o WHERE o.business_id = b.id) as orders_count,
                (SELECT COUNT(*) FROM customers c WHERE c.business_id = b.id) as customers_count,
                (SELECT COALESCE(SUM(total_cents - refund_amount_cents), 0) FROM orders o WHERE o.business_id = b.id AND o.status != 'cancelled') as gmv_cents
         FROM businesses b
         JOIN users u ON u.id = b.owner_user_id
         LEFT JOIN stores s ON s.business_id = b.id
         LEFT JOIN subscriptions sub ON sub.business_id = b.id
         ORDER BY b.created_at DESC`
      )
      .all() as Array<Record<string, unknown>>;

    const totals = {
      totalBusinesses: businesses.length,
      activeBusinesses: businesses.filter((b) => b.status === "active").length,
      publishedStores: businesses.filter((b) => Boolean(b.is_published)).length,
      totalGmvCents: businesses.reduce((acc, b) => acc + Number(b.gmv_cents || 0), 0),
      totalMrrCents: businesses
        .filter((b) => b.status === "active")
        .reduce((acc, b) => acc + Number(b.monthly_price_cents || 0), 0),
      totalOrders: businesses.reduce((acc, b) => acc + Number(b.orders_count || 0), 0),
    };

    return NextResponse.json({ admin, businesses, totals });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdminContext();
    const db = getDb();
    const body = (await req.json()) as {
      businessId?: string;
      status?: "active" | "suspended";
      subscriptionPlan?: string;
    };

    if (!body.businessId) {
      return NextResponse.json({ error: "businessId required" }, { status: 400 });
    }

    if (body.status) {
      db.prepare("UPDATE businesses SET status = ? WHERE id = ?").run(body.status, body.businessId);
      if (body.status === "suspended") {
        db.prepare("UPDATE stores SET is_published = 0 WHERE business_id = ?").run(body.businessId);
      }
    }

    if (body.subscriptionPlan) {
      const priceMap: Record<string, number> = { starter: 1900, growth: 4900, scale: 9900 };
      const key = body.subscriptionPlan.toLowerCase();
      db.prepare("UPDATE businesses SET subscription_plan = ? WHERE id = ?").run(key, body.businessId);
      db.prepare("UPDATE subscriptions SET plan_name = ?, monthly_price_cents = ? WHERE business_id = ?").run(
        body.subscriptionPlan,
        priceMap[key] ?? 4900,
        body.businessId
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
