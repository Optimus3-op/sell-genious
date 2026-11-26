import { NextRequest, NextResponse } from "next/server";
import { requireSellerContext } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";
import { generateMarketingCopy, type MarketingContentType } from "@/lib/ai/marketing";
import { newId } from "@/lib/utils";

export async function GET() {
  try {
    const ctx = await requireSellerContext();
    const db = getDb();

    const content = db
      .prepare(
        `SELECT mc.*, p.title as product_title
         FROM marketing_content mc
         LEFT JOIN products p ON p.id = mc.product_id
         WHERE mc.business_id = ?
         ORDER BY mc.created_at DESC`
      )
      .all(ctx.businessId);

    const campaigns = db
      .prepare(
        `SELECT cam.*, p.title as product_title
         FROM marketing_campaigns cam
         LEFT JOIN products p ON p.id = cam.product_id
         WHERE cam.business_id = ?
         ORDER BY cam.scheduled_date ASC`
      )
      .all(ctx.businessId);

    const products = db
      .prepare(
        `SELECT p.id, p.title, p.category, p.price_cents, p.discount_price_cents, COALESCE(i.quantity, 0) as stock_quantity
         FROM products p LEFT JOIN inventory i ON i.product_id = p.id
         WHERE p.business_id = ? AND p.status != 'archived'`
      )
      .all(ctx.businessId);

    return NextResponse.json({ content, campaigns, products });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSellerContext();
    const db = getDb();
    const body = (await req.json()) as {
      action?: "generate" | "save_content" | "create_campaign";
      productId?: string;
      contentType?: MarketingContentType;
      targetAudience?: string;
      tone?: string;
      title?: string;
      textBody?: string;
      campaign?: {
        name: string;
        channel: string;
        targetSegment: string;
        productId?: string;
        scheduledDate: string;
        budgetDollars?: number;
        notes?: string;
      };
    };

    const now = new Date().toISOString();

    if (body.action === "create_campaign" && body.campaign) {
      const c = body.campaign;
      const id = newId("camp");
      db.prepare(
        `INSERT INTO marketing_campaigns (id, business_id, name, channel, status, target_segment, product_id, scheduled_date, budget_cents, notes, created_at)
         VALUES (?, ?, ?, ?, 'planned', ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        ctx.businessId,
        c.name.trim(),
        c.channel,
        c.targetSegment || "all",
        c.productId || null,
        c.scheduledDate || now.slice(0, 10),
        Math.round((Number(c.budgetDollars) || 0) * 100),
        c.notes || "",
        now
      );
      return NextResponse.json({ id }, { status: 201 });
    }

    if (body.action === "save_content") {
      const id = newId("mc");
      db.prepare(
        `INSERT INTO marketing_content (id, business_id, product_id, content_type, title, body, target_audience, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'saved', ?)`
      ).run(
        id,
        ctx.businessId,
        body.productId || null,
        body.contentType || "instagram_post",
        body.title || "Untitled Marketing Copy",
        body.textBody || "",
        body.targetAudience || "",
        now
      );
      return NextResponse.json({ id }, { status: 201 });
    }

    // Generate AI marketing content grounded in actual product data
    if (!body.productId) {
      return NextResponse.json({ error: "Please select a product to generate grounded marketing content." }, { status: 400 });
    }

    const product = db
      .prepare(
        `SELECT p.*, COALESCE(i.quantity, 0) as stock_quantity
         FROM products p
         LEFT JOIN inventory i ON i.product_id = p.id
         WHERE p.id = ? AND p.business_id = ?`
      )
      .get(body.productId, ctx.businessId) as
      | {
          id: string;
          title: string;
          description: string;
          category: string;
          price_cents: number;
          discount_price_cents: number | null;
          stock_quantity: number;
        }
      | undefined;

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const generated = await generateMarketingCopy({
      businessName: ctx.businessName,
      businessCategory: ctx.businessCategory,
      productTitle: product.title,
      productDescription: product.description,
      productCategory: product.category,
      priceCents: product.price_cents,
      discountPriceCents: product.discount_price_cents,
      stockQuantity: product.stock_quantity,
      contentType: body.contentType || "instagram_post",
      targetAudience: body.targetAudience,
      tone: body.tone,
    });

    return NextResponse.json({ generated });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireSellerContext();
    const db = getDb();
    const body = (await req.json()) as { id?: string; title?: string; body?: string; status?: string };
    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    db.prepare(
      `UPDATE marketing_content
       SET title = COALESCE(?, title),
           body = COALESCE(?, body),
           status = COALESCE(?, status)
       WHERE id = ? AND business_id = ?`
    ).run(body.title ?? null, body.body ?? null, body.status ?? null, body.id, ctx.businessId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await requireSellerContext();
    const db = getDb();
    const id = req.nextUrl.searchParams.get("id");
    const kind = req.nextUrl.searchParams.get("kind") || "content";
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    if (kind === "campaign") {
      db.prepare("DELETE FROM marketing_campaigns WHERE id = ? AND business_id = ?").run(id, ctx.businessId);
    } else {
      db.prepare("DELETE FROM marketing_content WHERE id = ? AND business_id = ?").run(id, ctx.businessId);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
