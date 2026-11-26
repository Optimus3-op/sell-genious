import { NextRequest, NextResponse } from "next/server";
import { requireSellerContext } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";
import { logSalesActivity, recomputeCustomerSegment } from "@/lib/services/crm";
import { newId } from "@/lib/utils";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSellerContext();
    const { id } = await params;
    const db = getDb();

    const order = db
      .prepare("SELECT * FROM orders WHERE id = ? AND business_id = ?")
      .get(id, ctx.businessId) as
      | {
          id: string;
          order_number: string;
          customer_id: string;
          status: string;
          payment_status: string;
          fulfillment_status: string;
          total_cents: number;
          refund_amount_cents: number;
        }
      | undefined;

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const body = (await req.json()) as {
      status?: string;
      fulfillmentStatus?: string;
      paymentStatus?: string;
      trackingNumber?: string;
      refundAmountCents?: number;
      cancelOrder?: boolean;
    };

    const now = new Date().toISOString();

    if (body.cancelOrder && order.status !== "cancelled") {
      // Restock items and record movement
      const orderItems = db
        .prepare("SELECT product_id, quantity FROM order_items WHERE order_id = ? AND business_id = ?")
        .all(order.id, ctx.businessId) as Array<{ product_id: string; quantity: number }>;

      for (const item of orderItems) {
        const inv = db
          .prepare("SELECT id, quantity FROM inventory WHERE product_id = ? AND business_id = ?")
          .get(item.product_id, ctx.businessId) as { id: string; quantity: number } | undefined;
        if (inv) {
          const newQty = inv.quantity + item.quantity;
          db.prepare("UPDATE inventory SET quantity = ?, updated_at = ? WHERE id = ?").run(newQty, now, inv.id);
          db.prepare(
            "INSERT INTO inventory_movements (id, business_id, product_id, delta, reason, previous_qty, new_qty, actor_user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
          ).run(newId("im"), ctx.businessId, item.product_id, item.quantity, `Order ${order.order_number} cancelled`, inv.quantity, newQty, ctx.user.id, now);
        }
      }

      const refundCents = body.refundAmountCents ?? order.total_cents;
      db.prepare(
        `UPDATE orders
         SET status = 'cancelled',
             fulfillment_status = 'cancelled',
             payment_status = 'refunded',
             refund_amount_cents = ?
         WHERE id = ? AND business_id = ?`
      ).run(refundCents, order.id, ctx.businessId);

      db.prepare("UPDATE payments SET status = 'refunded' WHERE order_id = ? AND business_id = ?").run(order.id, ctx.businessId);

      // Update customer lifetime spend
      db.prepare(
        `UPDATE customers
         SET total_spent_cents = MAX(0, total_spent_cents - ?),
             orders_count = MAX(0, orders_count - 1)
         WHERE id = ? AND business_id = ?`
      ).run(order.total_cents, order.customer_id, ctx.businessId);
      recomputeCustomerSegment(db, ctx.businessId, order.customer_id);

      logSalesActivity(db, {
        businessId: ctx.businessId,
        customerId: order.customer_id,
        activityType: "order_cancelled",
        summary: `Order ${order.order_number} cancelled & simulated refund tracked`,
        completed: true,
        actorName: ctx.user.fullName,
      });

      return NextResponse.json({ ok: true });
    }

    db.prepare(
      `UPDATE orders
       SET status = COALESCE(?, status),
           fulfillment_status = COALESCE(?, fulfillment_status),
           payment_status = COALESCE(?, payment_status),
           tracking_number = COALESCE(?, tracking_number),
           refund_amount_cents = COALESCE(?, refund_amount_cents)
       WHERE id = ? AND business_id = ?`
    ).run(
      body.status ?? null,
      body.fulfillmentStatus ?? null,
      body.paymentStatus ?? null,
      body.trackingNumber ?? null,
      body.refundAmountCents !== undefined ? Math.max(0, Math.round(body.refundAmountCents)) : null,
      order.id,
      ctx.businessId
    );

    if (body.refundAmountCents && body.refundAmountCents > 0) {
      db.prepare("UPDATE payments SET status = 'refunded' WHERE order_id = ? AND business_id = ?").run(order.id, ctx.businessId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
