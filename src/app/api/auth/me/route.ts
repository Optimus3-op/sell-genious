import { NextResponse } from "next/server";
import { getSellerContext, getSessionUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null, seller: null }, { status: 200 });
  }
  const seller = await getSellerContext();
  return NextResponse.json({ user, seller });
}
