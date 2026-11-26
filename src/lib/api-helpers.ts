import { NextResponse } from "next/server";

export function handleApiError(err: unknown) {
  const msg = err instanceof Error ? err.message : "Unknown error";
  if (msg === "UNAUTHORIZED_SELLER" || msg === "UNAUTHORIZED_ADMIN") {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (msg === "BUSINESS_SUSPENDED") {
    return NextResponse.json({ error: "This business account is currently suspended. Contact platform support." }, { status: 403 });
  }
  if (msg === "BUSINESS_NOT_FOUND") {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }
  console.error("API Error:", err);
  return NextResponse.json({ error: msg }, { status: 500 });
}
