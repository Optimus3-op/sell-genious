import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/crypto";
import { CUSTOMER_COOKIE, getCustomerSession, setCustomerCookie } from "@/lib/auth/session";
import { syncSegmentCounts } from "@/lib/services/crm";
import { newId, safeJsonParse } from "@/lib/utils";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;
  const db = getDb();
  const store = db.prepare("SELECT id, business_id FROM stores WHERE subdomain = ?").get(subdomain) as
    | { id: string; business_id: string }
    | undefined;
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const customer = await getCustomerSession(store.business_id);
  if (!customer) return NextResponse.json({ customer: null, orders: [] });

  const orders = db
    .prepare("SELECT * FROM orders WHERE business_id = ? AND customer_id = ? ORDER BY created_at DESC")
    .all(store.business_id, customer.id) as Array<Record<string, unknown>>;

  const items = db
    .prepare("SELECT * FROM order_items WHERE business_id = ?")
    .all(store.business_id) as Array<Record<string, unknown>>;

  return NextResponse.json({
    customer,
    orders: orders.map((o) => ({
      ...o,
      shipping_address: safeJsonParse(o.shipping_address_json as string, {}),
      items: items.filter((it) => it.order_id === o.id),
    })),
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ subdomain: string }> }) {
  try {
    const { subdomain } = await params;
    const db = getDb();
    const store = db.prepare("SELECT id, business_id FROM stores WHERE subdomain = ?").get(subdomain) as
      | { id: string; business_id: string }
      | undefined;

    if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

    const body = (await req.json()) as {
      action: "register" | "login" | "logout";
      fullName?: string;
      email?: string;
      password?: string;
      phone?: string;
    };

    if (body.action === "logout") {
      const res = NextResponse.json({ ok: true });
      res.cookies.set(CUSTOMER_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
      return res;
    }

    const email = body.email?.trim().toLowerCase();
    const password = body.password || "";
    if (!email || password.length < 6) {
      return NextResponse.json({ error: "Valid email and password (min 6 characters) are required." }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (body.action === "register") {
      const fullName = body.fullName?.trim();
      if (!fullName) return NextResponse.json({ error: "Full name is required." }, { status: 400 });

      let user = db.prepare("SELECT id, password_hash, full_name FROM users WHERE email = ?").get(email) as
        | { id: string; password_hash: string; full_name: string }
        | undefined;

      if (!user) {
        const userId = newId("usr");
        db.prepare("INSERT INTO users (id, email, password_hash, full_name, role, created_at) VALUES (?, ?, ?, ?, 'customer', ?)").run(
          userId,
          email,
          hashPassword(password),
          fullName,
          now
        );
        user = { id: userId, password_hash: "", full_name: fullName };
      }

      let customer = db
        .prepare("SELECT id, full_name, email FROM customers WHERE business_id = ? AND email = ?")
        .get(store.business_id, email) as { id: string; full_name: string; email: string } | undefined;

      if (!customer) {
        const custId = newId("cust");
        db.prepare(
          `INSERT INTO customers (id, business_id, user_id, full_name, email, phone, segment, total_spent_cents, orders_count, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'new', 0, 0, ?)`
        ).run(custId, store.business_id, user.id, fullName, email, body.phone?.trim() || "", now);
        syncSegmentCounts(db, store.business_id);
        customer = { id: custId, full_name: fullName, email };
      } else {
        db.prepare("UPDATE customers SET user_id = ? WHERE id = ?").run(user.id, customer.id);
      }

      const res = NextResponse.json({ customer }, { status: 201 });
      await setCustomerCookie(res, {
        customerId: customer.id,
        businessId: store.business_id,
        userId: user.id,
        email: customer.email,
        fullName: customer.full_name,
      });
      return res;
    }

    // Login
    const user = db.prepare("SELECT id, email, password_hash, full_name FROM users WHERE email = ?").get(email) as
      | { id: string; email: string; password_hash: string; full_name: string }
      | undefined;

    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    let customer = db
      .prepare("SELECT id, full_name, email FROM customers WHERE business_id = ? AND email = ?")
      .get(store.business_id, email) as { id: string; full_name: string; email: string } | undefined;

    if (!customer) {
      const custId = newId("cust");
      db.prepare(
        `INSERT INTO customers (id, business_id, user_id, full_name, email, segment, total_spent_cents, orders_count, created_at)
         VALUES (?, ?, ?, ?, ?, 'new', 0, 0, ?)`
      ).run(custId, store.business_id, user.id, user.full_name, email, now);
      syncSegmentCounts(db, store.business_id);
      customer = { id: custId, full_name: user.full_name, email };
    }

    const res = NextResponse.json({ customer });
    await setCustomerCookie(res, {
      customerId: customer.id,
      businessId: store.business_id,
      userId: user.id,
      email: customer.email,
      fullName: customer.full_name,
    });
    return res;
  } catch (err) {
    console.error("Customer auth error:", err);
    return NextResponse.json({ error: "Customer authentication failed" }, { status: 500 });
  }
}
