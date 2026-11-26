import { getBusinessIntelligenceSnapshot, type BusinessIntelligenceSnapshot } from "./tools";
import { formatCurrency, newId } from "@/lib/utils";
import type { AIRecommendationDTO } from "@/lib/types";
import { getDb } from "@/lib/db";

export interface AdvisorAnswerResult {
  answer: string;
  mode: "openai_tool_calling" | "analytics_grounded_engine";
  recommendations: Array<Omit<AIRecommendationDTO, "id" | "businessId" | "status" | "createdAt">>;
  dataSnapshotSummary: {
    revenue: string;
    orders: number;
    aov: string;
    repeatRate: string;
    lowStockCount: number;
    openPipeline: string;
  };
}

function buildDynamicRecommendations(
  snap: BusinessIntelligenceSnapshot
): Array<Omit<AIRecommendationDTO, "id" | "businessId" | "status" | "createdAt">> {
  const recs: Array<Omit<AIRecommendationDTO, "id" | "businessId" | "status" | "createdAt">> = [];
  const topProd = snap.topProducts[0];
  const secondProd = snap.topProducts[1];
  const lowProd = snap.lowStockProducts[0];
  const slowProd = snap.underperformingProducts[0];
  const topCust = snap.topCustomers[0];
  const inactiveCust = snap.inactiveCustomers[0];
  const abandoned = snap.abandonedCarts[0];

  // 1. Product Intelligence
  if (lowProd) {
    recs.push({
      category: "product",
      title: `Restock Low-Inventory SKU: ${lowProd.title}`,
      opportunityOrProblem: `${lowProd.title} (${lowProd.sku}) is approaching stockout.`,
      supportingData: `Current stock is ${lowProd.stockQuantity} units against your low-stock threshold of ${lowProd.lowStockThreshold} units.`,
      whyItMatters: `Stockouts cut off active customer demand and reduce storefront conversion when shoppers hit unavailable items.`,
      recommendedAction: `Place a replenishment order for ${lowProd.title} immediately and temporarily spotlight high-inventory items (${topProd ? `${topProd.title} with ${topProd.stockQuantity} in stock` : "active catalog items"}).`,
      expectedImpactEstimate: `Estimated to prevent stockout revenue loss based on your ${formatCurrency(snap.kpis.averageOrderValueCents)} average order value (estimate).`,
      measurementMetric: `Monitor days-in-stock (target: 0 stockout days) and unit velocity over the next 14 days.`,
    });
  } else if (topProd) {
    recs.push({
      category: "product",
      title: `Promote Top Revenue Driver: ${topProd.title}`,
      opportunityOrProblem: `${topProd.title} leads catalog demand and can anchor product bundles.`,
      supportingData: `${topProd.unitsSold} units sold generating ${formatCurrency(topProd.revenueCents)} with ${topProd.stockQuantity} units available.`,
      whyItMatters: `Promoting proven winners lowers customer acquisition cost and pairs naturally with slower-moving accessories.`,
      recommendedAction: `Feature ${topProd.title} in your homepage Hero Spotlight${secondProd ? ` and bundle it with ${secondProd.title}` : ""}.`,
      expectedImpactEstimate: `Estimated +10% to +15% lift in storefront product clicks and bundle attachment (estimate).`,
      measurementMetric: `Track ${topProd.title} weekly units sold and bundle order share in Analytics.`,
    });
  }

  // 2. Customer Intelligence
  if (abandoned || inactiveCust) {
    const parts: string[] = [];
    if (abandoned) {
      parts.push(`1 active/abandoned cart (${abandoned.customerName}: ${formatCurrency(abandoned.valueCents)})`);
    }
    if (inactiveCust) {
      parts.push(`inactive buyer ${inactiveCust.fullName} (${formatCurrency(inactiveCust.totalSpentCents)} historical spend)`);
    }
    recs.push({
      category: "customer",
      title: "Recover Abandoned Carts & Re-Engage Inactive Buyers",
      opportunityOrProblem: "Warm purchase intent and past customers are currently unengaged.",
      supportingData: `${parts.join("; ")}. Current repeat purchase rate is ${snap.kpis.repeatPurchaseRatePct}% across ${snap.kpis.totalCustomers} customers.`,
      whyItMatters: `Retaining existing buyers and converting warm carts is 3–5x more cost-efficient than cold acquisition.`,
      recommendedAction: `Trigger a 48-hour follow-up reminder for abandoned carts and send a targeted new-arrival or loyalty perk to inactive customers.`,
      expectedImpactEstimate: `Estimated 15%–30% recovery rate on warm abandoned carts (estimate, not guaranteed).`,
      measurementMetric: `Measure abandoned-cart recovery orders and repeat purchase rate over the next 7–14 days.`,
    });
  } else if (topCust) {
    recs.push({
      category: "customer",
      title: `Launch VIP Retention Tier for ${topCust.fullName} & Top Buyers`,
      opportunityOrProblem: "High-value buyers contribute disproportionate lifetime revenue.",
      supportingData: `Top customer ${topCust.fullName} has spent ${formatCurrency(topCust.totalSpentCents)} across ${topCust.ordersCount} orders; store avg LTV is ${formatCurrency(snap.kpis.averageLtvCents)}.`,
      whyItMatters: `Protecting VIP retention stabilizes recurring revenue and generates organic referrals.`,
      recommendedAction: `Offer early access to new drops and complimentary shipping to customers in the High-Value segment.`,
      expectedImpactEstimate: `Estimated +10% repeat order frequency among High-Value customers over 60 days (estimate).`,
      measurementMetric: `Track High-Value segment order frequency and average LTV monthly.`,
    });
  }

  // 3. Sales Intelligence
  recs.push({
    category: "sales",
    title: "Lift Average Order Value & Close Active Pipeline Deals",
    opportunityOrProblem:
      snap.pipeline.openPipelineValueCents > 0
        ? `You have ${formatCurrency(snap.pipeline.openPipelineValueCents)} in open CRM pipeline alongside ${formatCurrency(snap.kpis.averageOrderValueCents)} storefront AOV.`
        : `Storefront Average Order Value is ${formatCurrency(snap.kpis.averageOrderValueCents)} across ${snap.kpis.paidOrders} orders.`,
    supportingData: `Total 30d revenue: ${formatCurrency(snap.kpis.totalRevenueCents)} from ${snap.kpis.paidOrders} orders; ${snap.pipeline.totalLeads} total leads in CRM pipeline.`,
    whyItMatters: `Closing warm pipeline opportunities and raising AOV expands revenue without needing more website traffic.`,
    recommendedAction: `Add a free-shipping threshold incentive above ${formatCurrency(Math.max(15000, snap.kpis.averageOrderValueCents + 2500))} and schedule follow-ups for leads in Interested and Negotiation stages.`,
    expectedImpactEstimate: `Estimated +8% to +15% lift in AOV and faster pipeline conversion (estimate).`,
    measurementMetric: `Compare AOV and CRM stage conversion velocity over the next 14 days.`,
  });

  // 4. Marketing Intelligence
  if (slowProd) {
    recs.push({
      category: "marketing",
      title: `Reposition & Promote Under-Sold Product: ${slowProd.title}`,
      opportunityOrProblem: `${slowProd.title} has low sell-through relative to available inventory.`,
      supportingData: `${slowProd.unitsSold} units sold so far with ${slowProd.stockQuantity} units sitting in stock at ${formatCurrency(slowProd.priceCents)}.`,
      whyItMatters: `Tying up capital in slow-moving stock reduces cash flow available for best sellers.`,
      recommendedAction: `Use AI Marketing Studio to generate fresh Instagram & Email copy positioning ${slowProd.title} as an add-on or limited-time bundle partner.`,
      expectedImpactEstimate: `Estimated 2x–3x impression-to-click improvement on slow-moving inventory campaigns (estimate).`,
      measurementMetric: `Track weekly unit sales of ${slowProd.title} and campaign engagement over 14 days.`,
    });
  }

  // 5. Growth Planning (Daily / Weekly / Monthly)
  recs.push({
    category: "growth_plan",
    title: "Structured Weekly & Monthly Growth Action Plan",
    opportunityOrProblem: "Unstructured execution slows compounding e-commerce and CRM growth.",
    supportingData: `Last 7d revenue: ${formatCurrency(snap.kpis.recent7dRevenueCents)} vs prior 7d: ${formatCurrency(snap.kpis.previous7dRevenueCents)}${
      snap.kpis.conversionRatePct !== null ? `; tracked conversion rate: ${snap.kpis.conversionRatePct}%` : ""
    }.`,
    whyItMatters: `Consistent daily inventory hygiene, weekly campaigns, and monthly cohort reviews create predictable revenue growth.`,
    recommendedAction: `Daily: clear unfulfilled orders & follow up due CRM leads. Weekly: launch 1 bundle campaign in Marketing Studio. Monthly: audit low-stock thresholds and inactive customer win-backs.`,
    expectedImpactEstimate: `Estimated steady improvement in repeat purchase rate (+3–6 percentage points over 60 days, estimate).`,
    measurementMetric: `Review 7d vs prior 7d revenue trend, repeat rate, and conversion rate every Monday in Analytics.`,
  });

  return recs;
}

function buildDeterministicAnswer(question: string, snap: BusinessIntelligenceSnapshot): string {
  const q = question.toLowerCase();
  const rev = formatCurrency(snap.kpis.totalRevenueCents);
  const aov = formatCurrency(snap.kpis.averageOrderValueCents);
  const topProdList =
    snap.topProducts
      .slice(0, 3)
      .map((p, i) => `${i + 1}. **${p.title}** — ${p.unitsSold} units sold (${formatCurrency(p.revenueCents)}), ${p.stockQuantity} in stock`)
      .join("\n") || "No completed product sales recorded yet.";

  const lowStockList =
    snap.lowStockProducts.length > 0
      ? snap.lowStockProducts.map((p) => `- **${p.title}** (${p.sku}): ${p.stockQuantity} left (threshold: ${p.lowStockThreshold})`).join("\n")
      : "No products are currently below their low-stock threshold.";

  const topCustList =
    snap.topCustomers
      .slice(0, 3)
      .map((c, i) => `${i + 1}. **${c.fullName}** (${c.segment.replace("_", " ")}) — ${formatCurrency(c.totalSpentCents)} across ${c.ordersCount} orders`)
      .join("\n") || "No customer purchase records yet.";

  if (q.includes("valuable") || q.includes("top customer") || q.includes("target") || q.includes("repeat")) {
    return `### Customer & Retention Intelligence for ${snap.business.name}

**Current Metrics (Real Platform Data):**
- Total Customers: **${snap.kpis.totalCustomers}** | Repeat Purchase Rate: **${snap.kpis.repeatPurchaseRatePct}%** | Avg Buyer LTV: **${formatCurrency(snap.kpis.averageLtvCents)}**

**Most Valuable Customers:**
${topCustList}

**Priority Segments to Target This Week:**
- **Abandoned Carts (${snap.abandonedCarts.length}):** ${
      snap.abandonedCarts[0]
        ? `${snap.abandonedCarts[0].customerName} left ${formatCurrency(snap.abandonedCarts[0].valueCents)} in cart.`
        : "None currently open."
    }
- **Inactive Customers (${snap.inactiveCustomers.length}):** ${
      snap.inactiveCustomers[0]
        ? `${snap.inactiveCustomers[0].fullName} (${formatCurrency(snap.inactiveCustomers[0].totalSpentCents)} past spend) is overdue for a win-back offer.`
        : "No inactive cohort flagged yet."
    }

**Recommended Action:** Launch a two-step retention sequence — a cart reminder within 48 hours and a VIP/win-back perk for inactive buyers. *Estimated impact: +15%–25% recovery on warm intent (estimate).*`;
  }

  if (q.includes("poorly") || q.includes("promote") || q.includes("product") || q.includes("stock") || q.includes("conversion")) {
    const slowList =
      snap.underperformingProducts
        .slice(0, 3)
        .map((p) => `- **${p.title}** (${p.category}): ${p.unitsSold} units sold, ${p.stockQuantity} in stock at ${formatCurrency(p.priceCents)}`)
        .join("\n") || "Insufficient product history.";

    return `### Product & Merchandising Intelligence for ${snap.business.name}

**Top-Performing Products to Anchor Promotions:**
${topProdList}

**Slower-Moving Products Needing Positioning:**
${slowList}

**Low-Stock Alerts:**
${lowStockList}

${
  snap.kpis.conversionRatePct !== null
    ? `**Observed Storefront Conversion Rate:** **${snap.kpis.conversionRatePct}%** (from recorded analytics snapshots).\n`
    : "**Note:** Storefront visitor traffic data is limited; add more traffic snapshots to measure conversion rate precisely.\n"
}
**Recommended Action:** Promote your #1 seller alongside a slow-moving item as a curated bundle, and restock any low-inventory SKUs before running paid ads.`;
  }

  if (q.includes("decreas") || q.includes("drop") || q.includes("why") || q.includes("trend") || q.includes("aov") || q.includes("order value")) {
    const trendLabel =
      snap.kpis.revenueTrendPct === null
        ? "Insufficient prior-period baseline to calculate a week-over-week percentage."
        : snap.kpis.revenueTrendPct >= 0
          ? `Up **+${snap.kpis.revenueTrendPct}%** week-over-week (${formatCurrency(snap.kpis.recent7dRevenueCents)} vs ${formatCurrency(snap.kpis.previous7dRevenueCents)}).`
          : `Down **${snap.kpis.revenueTrendPct}%** week-over-week (${formatCurrency(snap.kpis.recent7dRevenueCents)} vs ${formatCurrency(snap.kpis.previous7dRevenueCents)}).`;

    return `### Sales Trend & AOV Analysis for ${snap.business.name}

**Observed Revenue Trend:** ${trendLabel}
- 30-Day Revenue: **${rev}** across **${snap.kpis.paidOrders}** active orders
- Average Order Value (AOV): **${aov}**
- Cancelled Orders: **${snap.kpis.cancelledOrders}**
- Low-Stock Bottlenecks: **${snap.kpis.lowStockCount}** SKU(s)

**Root Signals:**
1. ${snap.kpis.lowStockCount > 0 ? `Low inventory on ${snap.lowStockProducts.map((p) => p.title).join(", ")} can suppress high-intent checkouts.` : "Inventory availability is healthy across active SKUs."}
2. ${snap.abandonedCarts.length > 0 ? `${snap.abandonedCarts.length} abandoned cart(s) worth ${formatCurrency(snap.abandonedCarts.reduce((a, b) => a + b.valueCents, 0))} remain unconverted.` : "No open abandoned carts detected."}
3. **To increase AOV:** Introduce tiered free shipping or a 2-item outfit/product bundle priced ~15% above your current ${aov} AOV (*estimated +10%–18% AOV lift*).`;
  }

  if (q.includes("marketing") || q.includes("week") || q.includes("campaign") || q.includes("plan")) {
    return `### Weekly Growth & Marketing Strategy for ${snap.business.name}

Based on your real store performance (**${rev}** revenue, **${snap.kpis.paidOrders}** orders, **${aov}** AOV):

1. **Hero Campaign (Days 1–3):** Spotlight **${snap.topProducts[0]?.title ?? "your flagship product"}** on Instagram and email, paired with a cross-sell to **${snap.underperformingProducts[0]?.title ?? "complementary accessories"}**.
2. **Retention & Cart Recovery (Days 3–5):** Target **${snap.abandonedCarts.length}** abandoned cart shopper(s) and **${snap.inactiveCustomers.length}** inactive customer(s) via personalized follow-up.
3. **CRM Pipeline Push (Days 5–7):** Follow up on **${formatCurrency(snap.pipeline.openPipelineValueCents)}** in open CRM leads (${snap.pipeline.totalLeads} total leads).

Use **Marketing Studio** to generate ready-to-publish Instagram, Facebook, and Email copy grounded in your actual product details.`;
  }

  // Default comprehensive answer ("How can I increase my sales?")
  return `### Growth Diagnosis & Action Plan for ${snap.business.name}

**Real Business Snapshot (Last 30 Days):**
- Revenue: **${rev}** | Orders: **${snap.kpis.paidOrders}** | AOV: **${aov}**
- Customers: **${snap.kpis.totalCustomers}** | Repeat Rate: **${snap.kpis.repeatPurchaseRatePct}%**
- Open CRM Pipeline: **${formatCurrency(snap.pipeline.openPipelineValueCents)}** across **${snap.pipeline.totalLeads}** leads

**Top 3 Highest-Leverage Opportunities:**
1. **Protect Best-Seller Stock:** ${snap.lowStockProducts.length > 0 ? `${snap.lowStockProducts[0].title} has only ${snap.lowStockProducts[0].stockQuantity} units left — restock immediately to avoid lost demand.` : "Inventory is well-stocked; spotlight your top seller on the homepage."}
2. **Capture Warm Intent & Repeat Buyers:** ${snap.abandonedCarts.length > 0 ? `Recover ${formatCurrency(snap.abandonedCarts[0].valueCents)} in abandoned cart value` : "Launch a repeat-purchase perk"} and re-engage inactive buyers.
3. **Expand AOV & Close Pipeline:** Bundle top sellers with higher-stock items to push AOV above ${aov}, and advance open leads in your Sales Pipeline.

*All impact projections in the recommendation cards below are explicitly labeled estimates grounded in your current store metrics.*`;
}

export async function runBusinessGrowthAdvisor(
  businessId: string,
  question: string,
  saveRecommendations = false
): Promise<AdvisorAnswerResult> {
  const snap = getBusinessIntelligenceSnapshot(businessId, 30);
  const recommendations = buildDynamicRecommendations(snap);

  if (saveRecommendations) {
    const db = getDb();
    const existingCount = (db.prepare("SELECT COUNT(*) as c FROM ai_recommendations WHERE business_id = ?").get(businessId) as { c: number }).c;
    if (existingCount < 12) {
      const insert = db.prepare(
        `INSERT INTO ai_recommendations (id, business_id, category, title, opportunity_or_problem, supporting_data, why_it_matters, recommended_action, expected_impact_estimate, measurement_metric, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`
      );
      const now = new Date().toISOString();
      for (const r of recommendations) {
        const dup = db
          .prepare("SELECT 1 FROM ai_recommendations WHERE business_id = ? AND title = ? AND status = 'active'")
          .get(businessId, r.title);
        if (!dup) {
          insert.run(
            newId("rec"),
            businessId,
            r.category,
            r.title,
            r.opportunityOrProblem,
            r.supportingData,
            r.whyItMatters,
            r.recommendedAction,
            r.expectedImpactEstimate,
            r.measurementMetric,
            now
          );
        }
      }
    }
  }

  let answer = buildDeterministicAnswer(question, snap);
  let mode: AdvisorAnswerResult["mode"] = "analytics_grounded_engine";

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (apiKey) {
    try {
      const systemPrompt = `You are SellGenius AI Business Growth Advisor for "${snap.business.name}" (${snap.business.category}).
You must ONLY cite metrics provided by the backend analytics tool below. NEVER fabricate revenue, order counts, conversion rates, or guarantees.
Always label expected impact as an estimate and include: Opportunity/Problem, Supporting Data, Why It Matters, Recommended Action, Expected Impact (estimate), and Measurement Method.`;

      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          temperature: 0.3,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Seller Question: ${question}\n\nVerified Backend Business Data Snapshot:\n${JSON.stringify(snap, null, 2)}`,
            },
          ],
        }),
      });
      if (resp.ok) {
        const data = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          answer = content;
          mode = "openai_tool_calling";
        }
      }
    } catch {
      // Gracefully fall back to deterministic analytics-grounded engine
    }
  }

  return {
    answer,
    mode,
    recommendations,
    dataSnapshotSummary: {
      revenue: formatCurrency(snap.kpis.totalRevenueCents),
      orders: snap.kpis.paidOrders,
      aov: formatCurrency(snap.kpis.averageOrderValueCents),
      repeatRate: `${snap.kpis.repeatPurchaseRatePct}%`,
      lowStockCount: snap.kpis.lowStockCount,
      openPipeline: formatCurrency(snap.pipeline.openPipelineValueCents),
    },
  };
}
