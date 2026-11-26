import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/auth/crypto";
import { setSellerCookie } from "@/lib/auth/session";
import { syncSegmentCounts } from "@/lib/services/crm";
import { newId, slugify } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      fullName?: string;
      email?: string;
      password?: string;
      businessName?: string;
      category?: string;
    };

    const fullName = body.fullName?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const businessName = body.businessName?.trim() || `${fullName?.split(" ")[0] || "My"} Store`;
    const category = body.category?.trim() || "Retail & E-Commerce";

    if (!fullName || !email || !password || password.length < 6) {
      return NextResponse.json(
        { error: "Full name, valid email, and password (min 6 characters) are required." },
        { status: 400 }
      );
    }

    const db = getDb();
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const now = new Date().toISOString();
    const userId = newId("usr");
    const businessId = newId("biz");
    const storeId = newId("store");
    const baseSlug = slugify(businessName) || `store-${Date.now().toString(36)}`;
    const slugConflict = db.prepare("SELECT 1 FROM stores WHERE subdomain = ? OR ? IN (SELECT slug FROM businesses)").get(baseSlug, baseSlug);
    const subdomain = slugConflict ? `${baseSlug}-${Math.random().toString(36).slice(2, 6)}` : baseSlug;

    const defaultSections = JSON.stringify([
      { id: "sec_hero", type: "hero", title: "Hero Spotlight", enabled: true },
      { id: "sec_featured", type: "featured_products", title: "Featured Essentials", enabled: true },
      { id: "sec_categories", type: "categories", title: "Shop by Category", enabled: true },
      { id: "sec_catalog", type: "catalog", title: "Full Collection", enabled: true },
      { id: "sec_story", type: "brand_story", title: "Our Story", enabled: true },
    ]);

    db.prepare("INSERT INTO users (id, email, password_hash, full_name, role, created_at) VALUES (?, ?, ?, ?, 'seller', ?)").run(
      userId,
      email,
      hashPassword(password),
      fullName,
      now
    );

    db.prepare(
      `INSERT INTO businesses (id, owner_user_id, name, slug, category, email, subscription_plan, status, onboarding_step, onboarding_completed, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'growth', 'active', 2, 0, ?)`
    ).run(businessId, userId, businessName, subdomain, category, email, now);

    db.prepare("INSERT INTO business_members (id, business_id, user_id, role, created_at) VALUES (?, ?, ?, 'owner', ?)").run(
      newId("bm"),
      businessId,
      userId,
      now
    );

    db.prepare(
      `INSERT INTO stores (id, business_id, subdomain, name, tagline, primary_color, accent_color, banner_title, banner_subtitle, theme_id, sections_json, contact_email, is_published, created_at)
       VALUES (?, ?, ?, ?, ?, '#4F46E5', '#7C3AED', ?, ?, 'theme_modern', ?, ?, 0, ?)`
    ).run(
      storeId,
      businessId,
      subdomain,
      businessName,
      `Independent ${category} Store`,
      `Welcome to ${businessName}`,
      `Explore curated ${category.toLowerCase()} essentials crafted for modern shoppers.`,
      defaultSections,
      email,
      now
    );

    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(
      "INSERT INTO subscriptions (id, business_id, plan_name, monthly_price_cents, status, current_period_end, created_at) VALUES (?, ?, 'Growth', 4900, 'active', ?, ?)"
    ).run(newId("sub"), businessId, periodEnd, now);

    syncSegmentCounts(db, businessId);

    const res = NextResponse.json(
      {
        user: { id: userId, email, fullName, role: "seller" },
        businessId,
        storeSubdomain: subdomain,
        onboardingStep: 2,
      },
      { status: 201 }
    );
    await setSellerCookie(res, userId, "seller");
    return res;
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
