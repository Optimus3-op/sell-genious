import { NextRequest, NextResponse } from "next/server";
import { requireSellerContext } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";
import { logSalesActivity } from "@/lib/services/crm";
import { newId } from "@/lib/utils";
import type { LeadStage } from "@/lib/types";

const STAGE_PROB: Record<LeadStage, number> = {
  new_lead: 15,
  contacted: 30,
  interested: 55,
  negotiation: 80,
  converted: 100,
  lost: 0,
};

export async function GET() {
  try {
    const ctx = await requireSellerContext();
    const db = getDb();

    const leads = db
      .prepare("SELECT * FROM leads WHERE business_id = ? ORDER BY updated_at DESC")
      .all(ctx.businessId) as Array<Record<string, unknown>>;

    const activities = db
      .prepare("SELECT * FROM sales_activities WHERE business_id = ? ORDER BY created_at DESC LIMIT 80")
      .all(ctx.businessId) as Array<Record<string, unknown>>;

    const hydrated = leads.map((l) => ({
      ...l,
      activities: activities.filter((a) => a.lead_id === l.id),
    }));

    return NextResponse.json({ leads: hydrated, activities });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSellerContext();
    const db = getDb();
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
    };

    const fullName = body.fullName?.trim();
    const email = body.email?.trim().toLowerCase();
    if (!fullName || !email) {
      return NextResponse.json({ error: "Lead name and email are required." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const id = newId("lead");
    const status: LeadStage = body.status || "new_lead";
    const valCents = Math.max(0, Math.round(Number(body.estimatedValueCents) || 0));

    db.prepare(
      `INSERT INTO leads (id, business_id, full_name, email, phone, company, source, status, owner_name, estimated_value_cents, follow_up_date, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      ctx.businessId,
      fullName,
      email,
      body.phone?.trim() || "",
      body.company?.trim() || "",
      body.source?.trim() || "manual",
      status,
      body.ownerName?.trim() || ctx.user.fullName,
      valCents,
      body.followUpDate || "",
      body.notes?.trim() || "",
      now,
      now
    );

    db.prepare(
      `INSERT INTO sales_opportunities (id, business_id, lead_id, title, stage, value_cents, probability, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      newId("opp"),
      ctx.businessId,
      id,
      `${body.company?.trim() || fullName} Opportunity`,
      status,
      valCents,
      STAGE_PROB[status] ?? 20,
      now
    );

    logSalesActivity(db, {
      businessId: ctx.businessId,
      leadId: id,
      activityType: "lead_created",
      summary: `Created lead ${fullName} (${body.source || "manual"})`,
      dueDate: body.followUpDate || "",
      completed: true,
      actorName: ctx.user.fullName,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
