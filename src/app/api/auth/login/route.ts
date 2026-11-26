import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/crypto";
import { setSellerCookie } from "@/lib/auth/session";
import type { UserRole } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const db = getDb();
    const user = db
      .prepare("SELECT id, email, password_hash, full_name, role FROM users WHERE email = ?")
      .get(email) as
      | { id: string; email: string; password_hash: string; full_name: string; role: UserRole }
      | undefined;

    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    if (user.role === "customer") {
      return NextResponse.json(
        { error: "This is a storefront shopper account. Please sign in on the seller's store page." },
        { status: 403 }
      );
    }

    let onboardingCompleted = true;
    if (user.role === "seller") {
      const biz = db
        .prepare(
          `SELECT b.status, b.onboarding_completed FROM business_members bm
           JOIN businesses b ON b.id = bm.business_id WHERE bm.user_id = ? LIMIT 1`
        )
        .get(user.id) as { status: string; onboarding_completed: number } | undefined;
      if (biz?.status === "suspended") {
        return NextResponse.json({ error: "Your business account is suspended. Contact SellGenius Admin." }, { status: 403 });
      }
      onboardingCompleted = Boolean(biz?.onboarding_completed);
    }

    const res = NextResponse.json({
      user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role },
      onboardingCompleted,
    });
    await setSellerCookie(res, user.id, user.role);
    return res;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Sign in failed" }, { status: 500 });
  }
}
