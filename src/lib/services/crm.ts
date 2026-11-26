import type { DatabaseSync } from "node:sqlite";
import type { CustomerSegmentSlug } from "@/lib/types";
import { newId } from "@/lib/utils";

/**
 * Recomputes a single customer's automatic CRM segment from real purchase and cart state.
 */
export function recomputeCustomerSegment(db: DatabaseSync, businessId: string, customerId: string): CustomerSegmentSlug {
  const cust = db
    .prepare("SELECT id, orders_count, total_spent_cents, last_purchase_at FROM customers WHERE id = ? AND business_id = ?")
    .get(customerId, businessId) as
    | { id: string; orders_count: number; total_spent_cents: number; last_purchase_at: string | null }
    | undefined;

  if (!cust) return "new";

  const hasAbandonedCart = Boolean(
    db
      .prepare(
        "SELECT 1 FROM carts WHERE business_id = ? AND customer_id = ? AND status IN ('active', 'abandoned') AND EXISTS (SELECT 1 FROM cart_items ci WHERE ci.cart_id = carts.id)"
      )
      .get(businessId, customerId)
  );

  let segment: CustomerSegmentSlug = "new";

  if (cust.orders_count === 0 && hasAbandonedCart) {
    segment = "abandoned_cart";
  } else if (cust.total_spent_cents >= 35000 || cust.orders_count >= 3) {
    segment = "high_value";
  } else if (cust.orders_count >= 2) {
    segment = "returning";
  } else if (cust.orders_count === 1 && cust.last_purchase_at) {
    const daysSince = (Date.now() - new Date(cust.last_purchase_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince >= 35) {
      segment = "inactive";
    } else if (daysSince >= 14) {
      segment = "potential_repeat";
    } else {
      segment = "new";
    }
  } else if (hasAbandonedCart) {
    segment = "abandoned_cart";
  }

  db.prepare("UPDATE customers SET segment = ? WHERE id = ? AND business_id = ?").run(segment, customerId, businessId);
  syncSegmentCounts(db, businessId);
  return segment;
}

export function syncSegmentCounts(db: DatabaseSync, businessId: string): void {
  const now = new Date().toISOString();
  const defs: Array<[CustomerSegmentSlug, string, string, string]> = [
    ["new", "New Customers", "Purchased once within the last 14 days", "orders_count = 1 AND <= 14d"],
    ["returning", "Returning Customers", "Completed 2+ orders", "orders_count >= 2"],
    ["high_value", "High-Value Customers", "Lifetime spend >= $350 or 3+ orders", "total_spent >= $350 OR orders >= 3"],
    ["inactive", "Inactive Customers", "No purchase in the last 35+ days", "days_since_last_order >= 35"],
    ["potential_repeat", "Potential Repeat Buyers", "1 order placed 14–34 days ago", "orders_count = 1 AND 14-34d"],
    ["abandoned_cart", "Abandoned Cart Shoppers", "Items left in cart without completed order", "cart_status IN (active, abandoned)"],
  ];

  const upsert = db.prepare(
    `INSERT INTO customer_segments (id, business_id, name, slug, description, rule_summary, customer_count, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(business_id, slug) DO UPDATE SET customer_count = excluded.customer_count, updated_at = excluded.updated_at`
  );

  for (const [slug, name, desc, rule] of defs) {
    const row = db
      .prepare("SELECT COUNT(*) as c FROM customers WHERE business_id = ? AND segment = ?")
      .get(businessId, slug) as { c: number };
    upsert.run(newId("seg"), businessId, name, slug, desc, rule, row.c, now);
  }
}

export function logSalesActivity(
  db: DatabaseSync,
  params: {
    businessId: string;
    customerId?: string | null;
    leadId?: string | null;
    activityType: string;
    summary: string;
    dueDate?: string;
    completed?: boolean;
    actorName?: string;
  }
): void {
  db.prepare(
    `INSERT INTO sales_activities (id, business_id, customer_id, lead_id, activity_type, summary, due_date, completed, actor_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    newId("act"),
    params.businessId,
    params.customerId ?? null,
    params.leadId ?? null,
    params.activityType,
    params.summary,
    params.dueDate ?? "",
    params.completed ? 1 : 0,
    params.actorName ?? "System",
    new Date().toISOString()
  );
}
