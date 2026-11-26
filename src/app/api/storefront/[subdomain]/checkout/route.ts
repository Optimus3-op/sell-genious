import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCustomerSession, getOrCreateCartToken, setCustomerCookie } from "@/lib/auth/session";
import { sandboxPaymentAdapter } from "@/lib/services/payments";
import { calculateShippingOptions } from "@/lib/services/shipping";
import { logSalesActivity, recomputeCustomerSegment } from "@/lib/services/crm";
import { newId } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ subdomain: string }> }) {
  try {
    const { subdomain } = await params;
    const db = getDb();

    const store = db
      .prepare("SELECT id, business_id, name, is_published FROM stores WHERE subdomain = ?")
      .get(subdomain) as { id: string; business_id: string; name: string; is_published: number } | undefined;

    if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

    const body = (await req.json()) as {
      fullName?: string;
      email?: string;
      phone?: string;
      shippingMethodId?: string;
      address?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      };
    };

    const { token } = await getOrCreateCartToken();
    const cart = db
      .prepare("SELECT id FROM carts WHERE business_id = ? AND session_token = ? AND status = 'active' LIMIT 1")
      .get(store.business_id, token) as { id: string } | undefined;

    if (!cart) {
      return NextResponse.json({ error: "Your shopping cart is empty." }, { status: 400 });
    }

    const cartItems = db
      .prepare(
        `SELECT ci.*, p.title, p.sku, COALESCE(i.quantity, 0) as stock_quantity
         FROM cart_items ci
         JOIN products p ON p.id = ci.product_id
         LEFT JOIN inventory i ON i.product_id = p.id
         WHERE ci.cart_id = ?`
      )
      .all(cart.id) as Array<{
      id: string;
      product_id: string;
      variant_id: string | null;
      quantity: number;
      unit_price_cents: number;
      title: string;
      sku: string;
      stock_quantity: number;
    }>;

    if (cartItems.length === 0) {
      return NextResponse.json({ error: "Your shopping cart is empty." }, { status: 400 });
    }

    for (const item of cartItems) {
      if (item.stock_quantity < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${item.title}. Only ${item.stock_quantity} remaining.` },
          { status: 400 }
        );
      }
    }

    const loggedCustomer = await getCustomerSession(store.business_id);
    const email = (loggedCustomer?.email || body.email || "").trim().toLowerCase();
    const fullName = (loggedCustomer?.full_name || body.fullName || "").trim();
    const line1 = body.address?.line1?.trim();
    const city = body.address?.city?.trim();
    const state = body.address?.state?.trim();
    const postalCode = body.address?.postalCode?.trim();

    if (!email || !fullName || !line1 || !city || !state || !postalCode) {
      return NextResponse.json(
        { error: "Customer name, email, and complete shipping address are required." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    let customerId = loggedCustomer?.id;
    let shouldSetCookie = false;

    if (!customerId) {
      const existingCust = db
        .prepare("SELECT id FROM customers WHERE business_id = ? AND email = ?")
        .get(store.business_id, email) as { id: string } | undefined;

      if (existingCust) {
        customerId = existingCust.id;
      } else {
        customerId = newId("cust");
        db.prepare(
          `INSERT INTO customers (id, business_id, user_id, full_name, email, phone, segment, total_spent_cents, orders_count, created_at)
           VALUES (?, ?, NULL, ?, ?, ?, 'new', 0, 0, ?)`
        ).run(customerId, store.business_id, fullName, email, body.phone?.trim() || "", now);
        shouldSetCookie = true;
      }
    }

    // Save shipping address
    db.prepare(
      `INSERT INTO customer_addresses (id, business_id, customer_id, label, line1, line2, city, state, postal_code, country, is_default)
       VALUES (?, ?, ?, 'Checkout Shipping', ?, ?, ?, ?, ?, ?, 1)`
    ).run(
      newId("addr"),
      store.business_id,
      customerId,
      line1,
      body.address?.line2?.trim() || "",
      city,
      state,
      postalCode,
      body.address?.country?.trim() || "US"
    );

    const subtotalCents = cartItems.reduce((acc, it) => acc + it.unit_price_cents * it.quantity, 0);
    const shippingOptions = calculateShippingOptions(subtotalCents);
    const selectedShip = shippingOptions.find((o) => o.id === body.shippingMethodId) || shippingOptions[0];
    const totalCents = subtotalCents + selectedShip.costCents;

    const orderNumber = `SG-${Math.floor(10000 + Math.random() * 89999)}`;
    const paymentRes = await sandboxPaymentAdapter.processCheckout(totalCents, orderNumber);

    const orderId = newId("ord");
    const shippingAddressJson = JSON.stringify({
      fullName,
      line1,
      line2: body.address?.line2 || "",
      city,
      state,
      postalCode,
      country: body.address?.country || "US",
    });

    db.prepare(
      `INSERT INTO orders (id, business_id, store_id, customer_id, order_number, status, payment_status, fulfillment_status, subtotal_cents, shipping_cents, discount_cents, total_cents, shipping_address_json, shipping_method, tracking_number, refund_amount_cents, notes, created_at)
       VALUES (?, ?, ?, ?, ?, 'confirmed', 'simulated_paid', 'unfulfilled', ?, ?, 0, ?, ?, ?, '', 0, ?, ?)`
    ).run(
      orderId,
      store.business_id,
      store.id,
      customerId,
      orderNumber,
      subtotalCents,
      selectedShip.costCents,
      totalCents,
      shippingAddressJson,
      selectedShip.name,
      paymentRes.notice,
      now
    );

    const insOrderItem = db.prepare(
      `INSERT INTO order_items (id, order_id, business_id, product_id, variant_id, product_title, sku, quantity, unit_price_cents, total_cents)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const item of cartItems) {
      insOrderItem.run(
        newId("oi"),
        orderId,
        store.business_id,
        item.product_id,
        item.variant_id,
        item.title,
        item.sku,
        item.quantity,
        item.unit_price_cents,
        item.unit_price_cents * item.quantity
      );

      // Decrement inventory & log stock movement
      const inv = db
        .prepare("SELECT id, quantity FROM inventory WHERE product_id = ? AND business_id = ?")
        .get(item.product_id, store.business_id) as { id: string; quantity: number } | undefined;
      if (inv) {
        const newQty = Math.max(0, inv.quantity - item.quantity);
        db.prepare("UPDATE inventory SET quantity = ?, updated_at = ? WHERE id = ?").run(newQty, now, inv.id);
        db.prepare(
          "INSERT INTO inventory_movements (id, business_id, product_id, delta, reason, previous_qty, new_qty, actor_user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)"
        ).run(newId("im"), store.business_id, item.product_id, -item.quantity, `Storefront order ${orderNumber}`, inv.quantity, newQty, now);
      }
    }

    db.prepare(
      `INSERT INTO payments (id, order_id, business_id, provider, status, amount_cents, reference_code, is_simulated, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`
    ).run(newId("pay"), orderId, store.business_id, paymentRes.provider, paymentRes.status, totalCents, paymentRes.referenceCode, now);

    // Update customer CRM metrics & segment automatically
    db.prepare(
      `UPDATE customers
       SET total_spent_cents = total_spent_cents + ?,
           orders_count = orders_count + 1,
           last_purchase_at = ?,
           full_name = ?
       WHERE id = ? AND business_id = ?`
    ).run(totalCents, now, fullName, customerId, store.business_id);

    // Mark cart converted first so abandoned_cart check reflects checkout
    db.prepare("UPDATE carts SET status = 'converted', customer_id = ?, updated_at = ? WHERE id = ?").run(
      customerId,
      now,
      cart.id
    );

    recomputeCustomerSegment(db, store.business_id, customerId);
    logSalesActivity(db, {
      businessId: store.business_id,
      customerId,
      activityType: "order",
      summary: `Placed storefront order ${orderNumber} ($${(totalCents / 100).toFixed(2)}) via Sandbox Simulated Checkout`,
      completed: true,
      actorName: fullName,
    });

    // Update today's analytics snapshot
    const today = now.slice(0, 10);
    db.prepare(
      `INSERT INTO analytics_snapshots (id, business_id, snapshot_date, revenue_cents, orders_count, new_customers_count, visitors_count, conversion_rate)
       VALUES (?, ?, ?, ?, 1, 1, 25, 4.0)
       ON CONFLICT(business_id, snapshot_date) DO UPDATE SET
         revenue_cents = analytics_snapshots.revenue_cents + excluded.revenue_cents,
         orders_count = analytics_snapshots.orders_count + 1`
    ).run(newId("snap"), store.business_id, today, totalCents);

    const res = NextResponse.json(
      {
        order: {
          id: orderId,
          orderNumber,
          totalCents,
          subtotalCents,
          shippingCents: selectedShip.costCents,
          shippingMethod: selectedShip.name,
          paymentStatus: "simulated_paid",
          paymentReference: paymentRes.referenceCode,
          isSimulatedPayment: true,
          notice: paymentRes.notice,
          createdAt: now,
        },
      },
      { status: 201 }
    );

    if (shouldSetCookie) {
      await setCustomerCookie(res, {
        customerId,
        businessId: store.business_id,
        email,
        fullName,
      });
    }
    return res;
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
