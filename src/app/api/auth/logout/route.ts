import { NextResponse } from "next/server";
import { clearSellerCookie } from "@/lib/auth/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  await clearSellerCookie(res);
  return res;
}
