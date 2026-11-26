import { NextRequest, NextResponse } from "next/server";
import { requireSellerContext } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";
import { safeJsonParse, slugify } from "@/lib/utils";

export async function GET() {
  try {
    const ctx = await requireSellerContext();
    const db = getDb();

    const store = db.prepare("SELECT * FROM stores WHERE id = ? AND business_id = ?").get(ctx.storeId, ctx.businessId) as Record<string, unknown>;
    const business = db.prepare("SELECT * FROM businesses WHERE id = ?").get(ctx.businessId) as Record<string, unknown>;
    const themes = db.prepare("SELECT * FROM store_themes").all();

    return NextResponse.json({
      store: {
        ...store,
        is_published: Boolean(store.is_published),
        sections: safeJsonParse(store.sections_json as string, []),
        social_links: safeJsonParse(store.social_links_json as string, {}),
      },
      business,
      themes,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireSellerContext();
    const db = getDb();
    const body = (await req.json()) as {
      name?: string;
      tagline?: string;
      subdomain?: string;
      logoUrl?: string;
      primaryColor?: string;
      accentColor?: string;
      bannerTitle?: string;
      bannerSubtitle?: string;
      bannerImageUrl?: string;
      themeId?: string;
      sections?: unknown[];
      socialLinks?: Record<string, string>;
      contactEmail?: string;
      contactPhone?: string;
      isPublished?: boolean;
      businessDescription?: string;
      businessAddress?: string;
      businessCategory?: string;
    };

    if (body.subdomain !== undefined) {
      const cleanSub = slugify(body.subdomain);
      if (cleanSub.length < 3) {
        return NextResponse.json({ error: "Store subdomain must be at least 3 characters." }, { status: 400 });
      }
      const conflict = db.prepare("SELECT id FROM stores WHERE subdomain = ? AND id != ?").get(cleanSub, ctx.storeId);
      if (conflict) {
        return NextResponse.json({ error: `Subdomain "${cleanSub}" is already taken.` }, { status: 409 });
      }
      db.prepare("UPDATE stores SET subdomain = ? WHERE id = ? AND business_id = ?").run(cleanSub, ctx.storeId, ctx.businessId);
    }

    db.prepare(
      `UPDATE stores
       SET name = COALESCE(?, name),
           tagline = COALESCE(?, tagline),
           logo_url = COALESCE(?, logo_url),
           primary_color = COALESCE(?, primary_color),
           accent_color = COALESCE(?, accent_color),
           banner_title = COALESCE(?, banner_title),
           banner_subtitle = COALESCE(?, banner_subtitle),
           banner_image_url = COALESCE(?, banner_image_url),
           theme_id = COALESCE(?, theme_id),
           sections_json = COALESCE(?, sections_json),
           social_links_json = COALESCE(?, social_links_json),
           contact_email = COALESCE(?, contact_email),
           contact_phone = COALESCE(?, contact_phone),
           is_published = COALESCE(?, is_published)
       WHERE id = ? AND business_id = ?`
    ).run(
      body.name ?? null,
      body.tagline ?? null,
      body.logoUrl ?? null,
      body.primaryColor ?? null,
      body.accentColor ?? null,
      body.bannerTitle ?? null,
      body.bannerSubtitle ?? null,
      body.bannerImageUrl ?? null,
      body.themeId ?? null,
      body.sections ? JSON.stringify(body.sections) : null,
      body.socialLinks ? JSON.stringify(body.socialLinks) : null,
      body.contactEmail ?? null,
      body.contactPhone ?? null,
      body.isPublished !== undefined ? (body.isPublished ? 1 : 0) : null,
      ctx.storeId,
      ctx.businessId
    );

    if (body.businessDescription !== undefined || body.businessAddress !== undefined || body.businessCategory !== undefined || body.name !== undefined) {
      db.prepare(
        `UPDATE businesses
         SET name = COALESCE(?, name),
             description = COALESCE(?, description),
             address = COALESCE(?, address),
             category = COALESCE(?, category)
         WHERE id = ?`
      ).run(
        body.name ?? null,
        body.businessDescription ?? null,
        body.businessAddress ?? null,
        body.businessCategory ?? null,
        ctx.businessId
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
