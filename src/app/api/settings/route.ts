import { NextRequest, NextResponse } from "next/server";
import { requireSellerContext } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";
import { getPaymentGatewayStatus } from "@/lib/services/payments";

export async function GET() {
  try {
    const ctx = await requireSellerContext();
    const db = getDb();

    const business = db.prepare("SELECT * FROM businesses WHERE id = ?").get(ctx.businessId);
    const store = db.prepare("SELECT subdomain, name, contact_email, contact_phone, is_published FROM stores WHERE id = ?").get(ctx.storeId);
    const subscription = db.prepare("SELECT * FROM subscriptions WHERE business_id = ?").get(ctx.businessId);
    const members = db
      .prepare(
        `SELECT bm.id, bm.role, bm.created_at, u.full_name, u.email
         FROM business_members bm JOIN users u ON u.id = bm.user_id
         WHERE bm.business_id = ?`
      )
      .all(ctx.businessId);

    return NextResponse.json({
      business,
      store,
      subscription,
      members,
      paymentGatewayStatus: getPaymentGatewayStatus(),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireSellerContext();
    const db = getDb();
    const body = (await req.json()) as {
      name?: string;
      category?: string;
      description?: string;
      email?: string;
      phone?: string;
      address?: string;
      subscriptionPlan?: string;
    };

    db.prepare(
      `UPDATE businesses
       SET name = COALESCE(?, name),
           category = COALESCE(?, category),
           description = COALESCE(?, description),
           email = COALESCE(?, email),
           phone = COALESCE(?, phone),
           address = COALESCE(?, address),
           subscription_plan = COALESCE(?, subscription_plan)
       WHERE id = ?`
    ).run(
      body.name ?? null,
      body.category ?? null,
      body.description ?? null,
      body.email ?? null,
      body.phone ?? null,
      body.address ?? null,
      body.subscriptionPlan ?? null,
      ctx.businessId
    );

    if (body.subscriptionPlan) {
      const priceMap: Record<string, number> = { starter: 1900, growth: 4900, scale: 9900 };
      const planKey = body.subscriptionPlan.toLowerCase();
      db.prepare("UPDATE subscriptions SET plan_name = ?, monthly_price_cents = ? WHERE business_id = ?").run(
        body.subscriptionPlan,
        priceMap[planKey] ?? 4900,
        ctx.businessId
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
