import { NextRequest, NextResponse } from "next/server";
import { requireSellerContext } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";
import { newId, slugify } from "@/lib/utils";

export async function GET() {
  try {
    const ctx = await requireSellerContext();
    const db = getDb();
    const business = db.prepare("SELECT * FROM businesses WHERE id = ?").get(ctx.businessId);
    const store = db.prepare("SELECT * FROM stores WHERE id = ?").get(ctx.storeId);
    const themes = db.prepare("SELECT * FROM store_themes").all();
    const productsCount = (db.prepare("SELECT COUNT(*) as c FROM products WHERE business_id = ?").get(ctx.businessId) as { c: number }).c;

    return NextResponse.json({ context: ctx, business, store, themes, productsCount });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireSellerContext();
    const db = getDb();
    const body = (await req.json()) as {
      step?: number;
      businessName?: string;
      category?: string;
      description?: string;
      logoUrl?: string;
      primaryColor?: string;
      accentColor?: string;
      tagline?: string;
      subdomain?: string;
      themeId?: string;
      bannerTitle?: string;
      bannerSubtitle?: string;
      publishStore?: boolean;
      completeOnboarding?: boolean;
      firstProduct?: {
        title: string;
        description: string;
        category: string;
        priceDollars: number;
        stockQuantity: number;
        imageUrl?: string;
      };
    };

    const now = new Date().toISOString();

    if (body.businessName !== undefined || body.category !== undefined || body.description !== undefined) {
      db.prepare(
        `UPDATE businesses
         SET name = COALESCE(?, name),
             category = COALESCE(?, category),
             description = COALESCE(?, description)
         WHERE id = ?`
      ).run(
        body.businessName?.trim() || null,
        body.category?.trim() || null,
        body.description?.trim() ?? null,
        ctx.businessId
      );
      if (body.businessName?.trim()) {
        db.prepare("UPDATE stores SET name = ? WHERE id = ?").run(body.businessName.trim(), ctx.storeId);
      }
    }

    if (
      body.logoUrl !== undefined ||
      body.primaryColor !== undefined ||
      body.accentColor !== undefined ||
      body.tagline !== undefined ||
      body.themeId !== undefined ||
      body.bannerTitle !== undefined ||
      body.bannerSubtitle !== undefined
    ) {
      db.prepare(
        `UPDATE stores
         SET logo_url = COALESCE(?, logo_url),
             primary_color = COALESCE(?, primary_color),
             accent_color = COALESCE(?, accent_color),
             tagline = COALESCE(?, tagline),
             theme_id = COALESCE(?, theme_id),
             banner_title = COALESCE(?, banner_title),
             banner_subtitle = COALESCE(?, banner_subtitle)
         WHERE id = ? AND business_id = ?`
      ).run(
        body.logoUrl ?? null,
        body.primaryColor ?? null,
        body.accentColor ?? null,
        body.tagline ?? null,
        body.themeId ?? null,
        body.bannerTitle ?? null,
        body.bannerSubtitle ?? null,
        ctx.storeId,
        ctx.businessId
      );
    }

    if (body.subdomain?.trim()) {
      const cleanSub = slugify(body.subdomain);
      if (cleanSub.length >= 3) {
        const conflict = db.prepare("SELECT id FROM stores WHERE subdomain = ? AND id != ?").get(cleanSub, ctx.storeId);
        if (conflict) {
          return NextResponse.json({ error: `Store URL "${cleanSub}" is already taken.` }, { status: 409 });
        }
        db.prepare("UPDATE stores SET subdomain = ? WHERE id = ?").run(cleanSub, ctx.storeId);
      }
    }

    if (body.firstProduct && body.firstProduct.title.trim()) {
      const p = body.firstProduct;
      const productId = newId("prod");
      const slug = `${slugify(p.title) || "product"}-${Math.random().toString(36).slice(2, 5)}`;
      const priceCents = Math.max(100, Math.round((Number(p.priceDollars) || 29) * 100));
      const qty = Math.max(0, Math.round(Number(p.stockQuantity) || 10));
      const sku = `SG-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      const imgs = p.imageUrl?.trim() ? [p.imageUrl.trim()] : ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80"];

      db.prepare(
        `INSERT INTO products (id, business_id, title, slug, description, category, price_cents, sku, status, is_featured, images_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 1, ?, ?, ?)`
      ).run(productId, ctx.businessId, p.title.trim(), slug, p.description?.trim() || "Signature storefront launch product.", p.category?.trim() || "Featured", priceCents, sku, JSON.stringify(imgs), now, now);

      db.prepare(
        "INSERT INTO inventory (id, business_id, product_id, variant_id, quantity, low_stock_threshold, updated_at) VALUES (?, ?, ?, NULL, ?, 5, ?)"
      ).run(newId("inv"), ctx.businessId, productId, qty, now);

      db.prepare(
        "INSERT INTO inventory_movements (id, business_id, product_id, delta, reason, previous_qty, new_qty, actor_user_id, created_at) VALUES (?, ?, ?, ?, 'Onboarding launch stock', 0, ?, ?, ?)"
      ).run(newId("im"), ctx.businessId, productId, qty, qty, ctx.user.id, now);
    }

    if (body.publishStore !== undefined) {
      db.prepare("UPDATE stores SET is_published = ? WHERE id = ? AND business_id = ?").run(
        body.publishStore ? 1 : 0,
        ctx.storeId,
        ctx.businessId
      );
    }

    if (body.step !== undefined || body.completeOnboarding !== undefined) {
      db.prepare(
        `UPDATE businesses
         SET onboarding_step = COALESCE(?, onboarding_step),
             onboarding_completed = CASE WHEN ? = 1 THEN 1 ELSE onboarding_completed END
         WHERE id = ?`
      ).run(body.step ?? null, body.completeOnboarding ? 1 : 0, ctx.businessId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
