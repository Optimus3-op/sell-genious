import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { signToken, verifyToken } from "./crypto";
import { getDb } from "@/lib/db";
import type { SellerContext, SessionUser, UserRole } from "@/lib/types";

export const SELLER_COOKIE = "sg_seller_session";
export const CUSTOMER_COOKIE = "sg_customer_session";
export const CART_COOKIE = "sg_cart_token";

interface SellerTokenPayload {
  userId: string;
  role: UserRole;
  [key: string]: unknown;
}

interface CustomerTokenPayload {
  customerId: string;
  businessId: string;
  userId?: string;
  email: string;
  fullName: string;
  [key: string]: unknown;
}

export async function setSellerCookie(res: NextResponse, userId: string, role: UserRole) {
  const token = signToken({ userId, role });
  res.cookies.set(SELLER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSellerCookie(res: NextResponse) {
  res.cookies.set(SELLER_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function setCustomerCookie(
  res: NextResponse,
  payload: { customerId: string; businessId: string; userId?: string; email: string; fullName: string }
) {
  const token = signToken(payload);
  res.cookies.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SELLER_COOKIE)?.value;
  const payload = verifyToken<SellerTokenPayload>(raw);
  if (!payload?.userId) return null;

  const db = getDb();
  const row = db
    .prepare("SELECT id, email, full_name, role FROM users WHERE id = ?")
    .get(payload.userId) as { id: string; email: string; full_name: string; role: UserRole } | undefined;

  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
  };
}

export async function getSellerContext(): Promise<SellerContext | null> {
  const user = await getSessionUser();
  if (!user || (user.role !== "seller" && user.role !== "platform_admin")) {
    return null;
  }

  const db = getDb();
  const row = db
    .prepare(
      `SELECT
         b.id as business_id,
         b.name as business_name,
         b.slug as business_slug,
         b.category as business_category,
         b.status as business_status,
         b.subscription_plan,
         b.onboarding_step,
         b.onboarding_completed,
         bm.role as member_role,
         s.id as store_id,
         s.subdomain as store_subdomain,
         s.name as store_name,
         s.is_published as store_published
       FROM business_members bm
       JOIN businesses b ON b.id = bm.business_id
       LEFT JOIN stores s ON s.business_id = b.id
       WHERE bm.user_id = ?
       ORDER BY b.created_at ASC
       LIMIT 1`
    )
    .get(user.id) as
    | {
        business_id: string;
        business_name: string;
        business_slug: string;
        business_category: string;
        business_status: "active" | "suspended";
        subscription_plan: string;
        onboarding_step: number;
        onboarding_completed: number;
        member_role: "owner" | "manager" | "staff";
        store_id: string;
        store_subdomain: string;
        store_name: string;
        store_published: number;
      }
    | undefined;

  if (!row) return null;

  return {
    user,
    businessId: row.business_id,
    businessName: row.business_name,
    businessSlug: row.business_slug,
    businessCategory: row.business_category,
    businessStatus: row.business_status,
    subscriptionPlan: row.subscription_plan,
    onboardingStep: row.onboarding_step,
    onboardingCompleted: Boolean(row.onboarding_completed),
    memberRole: row.member_role,
    storeId: row.store_id,
    storeSubdomain: row.store_subdomain,
    storeName: row.store_name,
    storePublished: Boolean(row.store_published),
  };
}

export async function requireSellerContext(): Promise<SellerContext> {
  const ctx = await getSellerContext();
  if (!ctx) {
    throw new Error("UNAUTHORIZED_SELLER");
  }
  if (ctx.businessStatus === "suspended") {
    throw new Error("BUSINESS_SUSPENDED");
  }
  return ctx;
}

export async function requireAdminContext(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || user.role !== "platform_admin") {
    throw new Error("UNAUTHORIZED_ADMIN");
  }
  return user;
}

export async function getCustomerSession(businessId: string) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(CUSTOMER_COOKIE)?.value;
  const payload = verifyToken<CustomerTokenPayload>(raw);
  if (!payload || payload.businessId !== businessId) return null;
  const db = getDb();
  const customer = db
    .prepare("SELECT id, business_id, user_id, full_name, email, phone, segment, total_spent_cents, orders_count FROM customers WHERE id = ? AND business_id = ?")
    .get(payload.customerId, businessId) as
    | {
        id: string;
        business_id: string;
        user_id: string | null;
        full_name: string;
        email: string;
        phone: string;
        segment: string;
        total_spent_cents: number;
        orders_count: number;
      }
    | undefined;
  return customer ?? null;
}

export async function getOrCreateCartToken(): Promise<{ token: string; isNew: boolean }> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(CART_COOKIE)?.value;
  if (existing) return { token: existing, isNew: false };
  return { token: `cart_${crypto.randomUUID().replace(/-/g, "")}`, isNew: true };
}
