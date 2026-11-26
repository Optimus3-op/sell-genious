import { formatCurrency } from "@/lib/utils";

export type MarketingContentType =
  | "product_description"
  | "instagram_post"
  | "facebook_ad"
  | "email_campaign"
  | "promo_idea"
  | "discount_campaign"
  | "audience_recommendation";

export interface MarketingGenInput {
  businessName: string;
  businessCategory: string;
  productTitle: string;
  productDescription: string;
  productCategory: string;
  priceCents: number;
  discountPriceCents: number | null;
  stockQuantity: number;
  contentType: MarketingContentType;
  targetAudience?: string;
  tone?: string;
}

export async function generateMarketingCopy(input: MarketingGenInput): Promise<{
  title: string;
  body: string;
  targetAudience: string;
  mode: "openai" | "product_grounded_engine";
}> {
  const effectivePrice = formatCurrency(input.discountPriceCents ?? input.priceCents);
  const originalPrice = formatCurrency(input.priceCents);
  const hasDiscount = Boolean(input.discountPriceCents && input.discountPriceCents < input.priceCents);
  const savings = hasDiscount ? formatCurrency(input.priceCents - (input.discountPriceCents ?? input.priceCents)) : null;
  const audience = input.targetAudience?.trim() || `${input.businessCategory} shoppers & returning buyers`;

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (apiKey) {
    try {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          temperature: 0.6,
          messages: [
            {
              role: "system",
              content:
                "You are an expert e-commerce copywriter inside SellGenius AI Marketing Studio. Use ONLY the provided real product facts. Never invent fake specifications or fake reviews.",
            },
            {
              role: "user",
              content: `Create a ${input.contentType.replace("_", " ")} for "${input.productTitle}" from ${input.businessName}.
Category: ${input.productCategory}
Current Price: ${effectivePrice}${hasDiscount ? ` (regular ${originalPrice}, save ${savings})` : ""}
In Stock: ${input.stockQuantity} units
Description: ${input.productDescription}
Target Audience: ${audience}
Tone: ${input.tone || "Modern, confident, conversion-focused"}`,
            },
          ],
        }),
      });
      if (resp.ok) {
        const data = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          return {
            title: `${input.productTitle} — ${input.contentType.replace(/_/g, " ").toUpperCase()}`,
            body: text,
            targetAudience: audience,
            mode: "openai",
          };
        }
      }
    } catch {
      // Fall back cleanly
    }
  }

  const priceLine = hasDiscount ? `${effectivePrice} (was ${originalPrice} — save ${savings})` : `${effectivePrice}`;
  const scarcity = input.stockQuantity <= 10 ? `Only ${input.stockQuantity} units currently left in stock.` : `Ready to ship now (${input.stockQuantity} units available).`;

  const templates: Record<MarketingContentType, { title: string; body: string }> = {
    product_description: {
      title: `${input.productTitle} — Conversion Description`,
      body: `Meet the ${input.productTitle} by ${input.businessName} — engineered for ${audience}.\n\n${input.productDescription}\n\nWhy customers choose it:\n• Category-leading ${input.productCategory} craftsmanship\n• Transparent value at ${priceLine}\n• ${scarcity}\n\nAdd to your cart today and elevate your daily setup.`,
    },
    instagram_post: {
      title: `${input.productTitle} — Instagram Carousel / Reel Caption`,
      body: `Built for everyday performance, refined to stand out.\n\nIntroducing the ${input.productTitle} (${priceLine}) — ${input.productDescription}\n\n${scarcity}\n\nTap the store link to shop the ${input.productCategory} collection.\n\n#${input.businessName.replace(/\s+/g, "")} #${input.productCategory.replace(/[^a-zA-Z0-9]/g, "")} #SellGeniusStore`,
    },
    facebook_ad: {
      title: `${input.productTitle} — Facebook Ad Copy`,
      body: `[Primary Text]\nUpgrade your ${input.productCategory.toLowerCase()} essentials with the ${input.productTitle} from ${input.businessName}. ${input.productDescription}\n\nNow ${priceLine}. ${scarcity}\n\n[Headline]\n${input.productTitle} — Shop ${input.businessName}\n\n[Call To Action]\nShop Now`,
    },
    email_campaign: {
      title: `${input.productTitle} — Customer Email Spotlight`,
      body: `Subject: Spotlight: ${input.productTitle} ${hasDiscount ? `(Save ${savings} today)` : "from " + input.businessName}\nPreview: Designed for ${audience} — ${priceLine}\n\nHi {{first_name}},\n\nIf you've been waiting to upgrade your ${input.productCategory.toLowerCase()}, take a closer look at our ${input.productTitle}:\n\n"${input.productDescription}"\n\nAvailable now at ${priceLine}. ${scarcity}\n\n[CTA Button: View ${input.productTitle}]`,
    },
    promo_idea: {
      title: `${input.productTitle} — Promotional Campaign Concept`,
      body: `Campaign Name: "The ${input.productCategory} Upgrade Weekend"\nHero Product: ${input.productTitle} (${priceLine})\nTarget Segment: ${audience}\n\nExecution:\n1. Bundle ${input.productTitle} with a complementary accessory for a 10%–12% combined order incentive.\n2. Run a 72-hour feature banner on your storefront homepage.\n3. Follow up with past buyers and abandoned-cart shoppers via CRM.`,
    },
    discount_campaign: {
      title: `${input.productTitle} — Discount Campaign Strategy`,
      body: `Recommended Offer Structure for ${input.productTitle} (${priceLine}):\n\n• Tiered Incentive: Offer 10% off when paired with any second item, or Free Express Shipping above $150.\n• Margin Guardrail: Avoid blanket deep markdowns if stock is low (${input.stockQuantity} units available) — protect margin with bundle-only savings.\n• Measurement: Track AOV and net margin over 7 days.`,
    },
    audience_recommendation: {
      title: `${input.productTitle} — Target Audience Blueprint`,
      body: `Recommended Audiences for ${input.productTitle} (${input.productCategory}):\n\n1. High-Value & Returning Buyers: Position as a cohesive addition to their previous ${input.businessName} purchases.\n2. Potential Repeat Buyers (14–34 days post-first order): Highlight ${effectivePrice} value and quick dispatch.\n3. Abandoned Cart Recovery: Re-target shoppers who browsed ${input.productCategory} without checking out.`,
    },
  };

  const chosen = templates[input.contentType];
  return {
    title: chosen.title,
    body: chosen.body,
    targetAudience: audience,
    mode: "product_grounded_engine",
  };
}
