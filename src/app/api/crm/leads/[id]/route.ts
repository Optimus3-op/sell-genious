import { NextRequest, NextResponse } from "next/server";
import { requireSellerContext } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";
import { logSalesActivity } from "@/lib/services/crm";
import type { LeadStage } from "@/lib/types";

const STAGE_PROB: Record<LeadStage, number> = {
  new_lead: 15,
  contacted: 30,
  interested: 55,
  negotiation: 80,
  converted: 100,
  lost: 0,
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSellerContext();
    const { id } = await params;
    const db = getDb();

    const existing = db
      .prepare("SELECT id, full_name, status FROM leads WHERE id = ? AND business_id = ?")
      .get(id, ctx.businessId) as { id: string; full_name: string; status: LeadStage } | undefined;

    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const body = (await req.json()) as {
      fullName?: string;
      email?: string;
      phone?: string;
      company?: string;
      source?: string;
      status?: LeadStage;
      ownerName?: string;
      estimatedValueCents?: number;
      followUpDate?: string;
      notes?: string;
      activitySummary?: string;
      activityType?: string;
      completeActivityId?: string;
    };

    const now = new Date().toISOString();

    db.prepare(
      `UPDATE leads
       SET full_name = COALESCE(?, full_name),
           email = COALESCE(?, email),
           phone = COALESCE(?, phone),
           company = COALESCE(?, company),
           source = COALESCE(?, source),
           status = COALESCE(?, status),
           owner_name = COALESCE(?, owner_name),
           estimated_value_cents = COALESCE(?, estimated_value_cents),
           follow_up_date = COALESCE(?, follow_up_date),
           notes = COALESCE(?, notes),
           updated_at = ?
       WHERE id = ? AND business_id = ?`
    ).run(
      body.fullName ?? null,
      body.email ?? null,
      body.phone ?? null,
      body.company ?? null,
      body.source ?? null,
      body.status ?? null,
      body.ownerName ?? null,
      body.estimatedValueCents !== undefined ? Math.max(0, Math.round(body.estimatedValueCents)) : null,
      body.followUpDate ?? null,
      body.notes ?? null,
      now,
      id,
      ctx.businessId
    );

    if (body.status && body.status !== existing.status) {
      db.prepare("UPDATE sales_opportunities SET stage = ?, probability = ? WHERE lead_id = ? AND business_id = ?").run(
        body.status,
        STAGE_PROB[body.status] ?? 25,
        id,
        ctx.businessId
      );
      logSalesActivity(db, {
        businessId: ctx.businessId,
        leadId: id,
        activityType: "stage_change",
        summary: `Moved ${existing.full_name} from ${existing.status.replace("_", " ")} to ${body.status.replace("_", " ")}`,
        completed: true,
        actorName: ctx.user.fullName,
      });
    }

    if (body.activitySummary?.trim()) {
      logSalesActivity(db, {
        businessId: ctx.businessId,
        leadId: id,
        activityType: body.activityType || "follow_up",
        summary: body.activitySummary.trim(),
        dueDate: body.followUpDate || "",
        completed: false,
        actorName: ctx.user.fullName,
      });
    }

    if (body.completeActivityId) {
      db.prepare("UPDATE sales_activities SET completed = 1 WHERE id = ? AND business_id = ?").run(
        body.completeActivityId,
        ctx.businessId
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSellerContext();
    const { id } = await params;
    const db = getDb();
    db.prepare("DELETE FROM leads WHERE id = ? AND business_id = ?").run(id, ctx.businessId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
