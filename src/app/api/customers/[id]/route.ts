import { NextRequest, NextResponse } from "next/server";
import { requireSellerContext } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";
import { logSalesActivity } from "@/lib/services/crm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSellerContext();
    const { id } = await params;
    const db = getDb();

    const cust = db.prepare("SELECT id FROM customers WHERE id = ? AND business_id = ?").get(id, ctx.businessId);
    if (!cust) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const body = (await req.json()) as {
      notes?: string;
      phone?: string;
      activitySummary?: string;
      activityType?: string;
      dueDate?: string;
    };

    if (body.notes !== undefined || body.phone !== undefined) {
      db.prepare(
        `UPDATE customers
         SET notes = COALESCE(?, notes),
             phone = COALESCE(?, phone)
         WHERE id = ? AND business_id = ?`
      ).run(body.notes ?? null, body.phone ?? null, id, ctx.businessId);
    }

    if (body.activitySummary?.trim()) {
      logSalesActivity(db, {
        businessId: ctx.businessId,
        customerId: id,
        activityType: body.activityType || "note",
        summary: body.activitySummary.trim(),
        dueDate: body.dueDate || "",
        completed: !body.dueDate,
        actorName: ctx.user.fullName,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
