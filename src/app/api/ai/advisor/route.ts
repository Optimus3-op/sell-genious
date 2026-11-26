import { NextRequest, NextResponse } from "next/server";
import { requireSellerContext } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";
import { runBusinessGrowthAdvisor } from "@/lib/ai/advisor";
import { getBusinessIntelligenceSnapshot } from "@/lib/ai/tools";
import { newId, safeJsonParse } from "@/lib/utils";

export async function GET() {
  try {
    const ctx = await requireSellerContext();
    const db = getDb();

    let recommendations = db
      .prepare("SELECT * FROM ai_recommendations WHERE business_id = ? ORDER BY created_at DESC")
      .all(ctx.businessId);

    // Ensure even freshly registered sellers receive real grounded recommendations
    if (recommendations.length === 0) {
      await runBusinessGrowthAdvisor(ctx.businessId, "How can I increase my sales?", true);
      recommendations = db
        .prepare("SELECT * FROM ai_recommendations WHERE business_id = ? ORDER BY created_at DESC")
        .all(ctx.businessId);
    }

    const conversations = db
      .prepare("SELECT id, title, messages_json, updated_at FROM ai_conversations WHERE business_id = ? ORDER BY updated_at DESC LIMIT 10")
      .all(ctx.businessId) as Array<{ id: string; title: string; messages_json: string; updated_at: string }>;

    const snapshot = getBusinessIntelligenceSnapshot(ctx.businessId, 30);

    return NextResponse.json({
      recommendations,
      conversations: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        messages: safeJsonParse(c.messages_json, []),
        updatedAt: c.updated_at,
      })),
      snapshot,
      openAiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSellerContext();
    const db = getDb();
    const body = (await req.json()) as {
      question?: string;
      conversationId?: string;
      refreshRecommendations?: boolean;
    };

    const question = body.question?.trim() || "How can I increase my sales?";
    const result = await runBusinessGrowthAdvisor(ctx.businessId, question, Boolean(body.refreshRecommendations));

    const now = new Date().toISOString();
    let convId = body.conversationId;
    const newMsgs = [
      { role: "user", content: question, timestamp: now },
      { role: "assistant", content: result.answer, mode: result.mode, timestamp: now },
    ];

    if (convId) {
      const existing = db
        .prepare("SELECT messages_json FROM ai_conversations WHERE id = ? AND business_id = ?")
        .get(convId, ctx.businessId) as { messages_json: string } | undefined;
      if (existing) {
        const prev = safeJsonParse<unknown[]>(existing.messages_json, []);
        db.prepare("UPDATE ai_conversations SET messages_json = ?, updated_at = ? WHERE id = ?").run(
          JSON.stringify([...prev, ...newMsgs]),
          now,
          convId
        );
      } else {
        convId = undefined;
      }
    }

    if (!convId) {
      convId = newId("aiconv");
      db.prepare(
        "INSERT INTO ai_conversations (id, business_id, user_id, title, messages_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(convId, ctx.businessId, ctx.user.id, question.slice(0, 60), JSON.stringify(newMsgs), now, now);
    }

    return NextResponse.json({
      conversationId: convId,
      ...result,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireSellerContext();
    const db = getDb();
    const body = (await req.json()) as { id?: string; status?: "active" | "applied" | "dismissed" };
    if (!body.id || !body.status) {
      return NextResponse.json({ error: "id and status are required" }, { status: 400 });
    }
    db.prepare("UPDATE ai_recommendations SET status = ? WHERE id = ? AND business_id = ?").run(
      body.status,
      body.id,
      ctx.businessId
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
