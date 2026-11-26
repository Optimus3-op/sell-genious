import { getDb } from "@/lib/db";

export interface BusinessIntelligenceSnapshot {
  business: {
    id: string;
    name: string;
    category: string;
    storeSubdomain: string;
    storePublished: boolean;
  };
  kpis: {
    totalRevenueCents: number;
    totalOrders: number;
    paidOrders: number;
    cancelledOrders: number;
    averageOrderValueCents: number;
    totalCustomers: number;
    repeatCustomers: number;
    repeatPurchaseRatePct: number;
    averageLtvCents: number;
    totalProducts: number;
    activeProducts: number;
    lowStockCount: number;
    conversionRatePct: number | null;
    recent7dRevenueCents: number;
    previous7dRevenueCents: number;
    revenueTrendPct: number | null;
  };
  topProducts: Array<{
    id: string;
    title: string;
    category: string;
    priceCents: number;
    discountPriceCents: number | null;
    unitsSold: number;
    revenueCents: number;
    stockQuantity: number;
    lowStockThreshold: number;
  }>;
  underperformingProducts: Array<{
    id: string;
    title: string;
    category: string;
    priceCents: number;
    unitsSold: number;
    stockQuantity: number;
  }>;
  lowStockProducts: Array<{
    id: string;
    title: string;
    sku: string;
    stockQuantity: number;
    lowStockThreshold: number;
  }>;
  customerSegments: Array<{
    slug: string;
    name: string;
    count: number;
  }>;
  topCustomers: Array<{
    id: string;
    fullName: string;
    email: string;
    segment: string;
    ordersCount: number;
    totalSpentCents: number;
    lastPurchaseAt: string | null;
  }>;
  inactiveCustomers: Array<{
    id: string;
    fullName: string;
    email: string;
    totalSpentCents: number;
    lastPurchaseAt: string | null;
  }>;
  abandonedCarts: Array<{
    cartId: string;
    customerName: string;
    customerEmail: string;
    valueCents: number;
    itemCount: number;
    updatedAt: string;
  }>;
  pipeline: {
    totalLeads: number;
    openPipelineValueCents: number;
    stages: Array<{ stage: string; count: number; valueCents: number }>;
  };
}

/**
 * Permission-controlled, tenant-isolated backend analytics tool used by both Dashboard Analytics and AI Growth Advisor.
 */
export function getBusinessIntelligenceSnapshot(businessId: string, days = 30): BusinessIntelligenceSnapshot {
  const db = getDb();

  const biz = db
    .prepare(
      `SELECT b.id, b.name, b.category, s.subdomain as store_subdomain, s.is_published as store_published
       FROM businesses b LEFT JOIN stores s ON s.business_id = b.id WHERE b.id = ?`
    )
    .get(businessId) as
    | { id: string; name: string; category: string; store_subdomain: string; store_published: number }
    | undefined;

  if (!biz) {
    throw new Error("BUSINESS_NOT_FOUND");
  }

  const cutoffIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const orderAgg = db
    .prepare(
      `SELECT
         COUNT(*) as total_orders,
         SUM(CASE WHEN status != 'cancelled' THEN 1 ELSE 0 END) as paid_orders,
         SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
         COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_cents - refund_amount_cents ELSE 0 END), 0) as revenue_cents
       FROM orders
       WHERE business_id = ? AND created_at >= ?`
    )
    .get(businessId, cutoffIso) as {
    total_orders: number;
    paid_orders: number;
    cancelled_orders: number;
    revenue_cents: number;
  };

  const recent7 = (
    db
      .prepare(
        "SELECT COALESCE(SUM(total_cents - refund_amount_cents), 0) as rev FROM orders WHERE business_id = ? AND status != 'cancelled' AND created_at >= ?"
      )
      .get(businessId, sevenDaysAgo) as { rev: number }
  ).rev;

  const prev7 = (
    db
      .prepare(
        "SELECT COALESCE(SUM(total_cents - refund_amount_cents), 0) as rev FROM orders WHERE business_id = ? AND status != 'cancelled' AND created_at >= ? AND created_at < ?"
      )
      .get(businessId, fourteenDaysAgo, sevenDaysAgo) as { rev: number }
  ).rev;

  const revenueTrendPct = prev7 > 0 ? Number((((recent7 - prev7) / prev7) * 100).toFixed(1)) : null;

  const custAgg = db
    .prepare(
      `SELECT
         COUNT(*) as total_customers,
         SUM(CASE WHEN orders_count >= 2 THEN 1 ELSE 0 END) as repeat_customers,
         COALESCE(AVG(CASE WHEN orders_count > 0 THEN total_spent_cents END), 0) as avg_ltv
       FROM customers WHERE business_id = ?`
    )
    .get(businessId) as { total_customers: number; repeat_customers: number; avg_ltv: number };

  const buyersCount = (
    db.prepare("SELECT COUNT(*) as c FROM customers WHERE business_id = ? AND orders_count > 0").get(businessId) as { c: number }
  ).c;

  const prodAgg = db
    .prepare(
      `SELECT
         COUNT(*) as total_products,
         SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_products
       FROM products WHERE business_id = ?`
    )
    .get(businessId) as { total_products: number; active_products: number };

  const snapStats = db
    .prepare(
      `SELECT COALESCE(SUM(visitors_count), 0) as visitors, COALESCE(SUM(orders_count), 0) as snap_orders
       FROM analytics_snapshots WHERE business_id = ? AND snapshot_date >= ?`
    )
    .get(businessId, cutoffIso.slice(0, 10)) as { visitors: number; snap_orders: number };

  const conversionRatePct =
    snapStats.visitors > 0 ? Number(((snapStats.snap_orders / snapStats.visitors) * 100).toFixed(2)) : null;

  const productRows = db
    .prepare(
      `SELECT
         p.id, p.title, p.category, p.price_cents, p.discount_price_cents, p.sku,
         COALESCE(i.quantity, 0) as stock_quantity,
         COALESCE(i.low_stock_threshold, 5) as low_stock_threshold,
         COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN oi.quantity ELSE 0 END), 0) as units_sold,
         COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN oi.total_cents ELSE 0 END), 0) as revenue_cents
       FROM products p
       LEFT JOIN inventory i ON i.product_id = p.id AND i.business_id = p.business_id
       LEFT JOIN order_items oi ON oi.product_id = p.id AND oi.business_id = p.business_id
       LEFT JOIN orders o ON o.id = oi.order_id
       WHERE p.business_id = ? AND p.status != 'archived'
       GROUP BY p.id
       ORDER BY revenue_cents DESC, units_sold DESC`
    )
    .all(businessId) as Array<{
    id: string;
    title: string;
    category: string;
    price_cents: number;
    discount_price_cents: number | null;
    sku: string;
    stock_quantity: number;
    low_stock_threshold: number;
    units_sold: number;
    revenue_cents: number;
  }>;

  const lowStockProducts = productRows
    .filter((p) => p.stock_quantity <= p.low_stock_threshold)
    .map((p) => ({
      id: p.id,
      title: p.title,
      sku: p.sku,
      stockQuantity: p.stock_quantity,
      lowStockThreshold: p.low_stock_threshold,
    }));

  const topProducts = productRows.slice(0, 5).map((p) => ({
    id: p.id,
    title: p.title,
    category: p.category,
    priceCents: p.price_cents,
    discountPriceCents: p.discount_price_cents,
    unitsSold: p.units_sold,
    revenueCents: p.revenue_cents,
    stockQuantity: p.stock_quantity,
    lowStockThreshold: p.low_stock_threshold,
  }));

  const underperformingProducts = [...productRows]
    .sort((a, b) => a.units_sold - b.units_sold || b.stock_quantity - a.stock_quantity)
    .slice(0, 4)
    .map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      priceCents: p.price_cents,
      unitsSold: p.units_sold,
      stockQuantity: p.stock_quantity,
    }));

  const segRows = db
    .prepare(
      `SELECT segment as slug, COUNT(*) as count FROM customers WHERE business_id = ? GROUP BY segment`
    )
    .all(businessId) as Array<{ slug: string; count: number }>;

  const segNames: Record<string, string> = {
    new: "New Customers",
    returning: "Returning Customers",
    high_value: "High-Value Customers",
    inactive: "Inactive Customers",
    potential_repeat: "Potential Repeat Buyers",
    abandoned_cart: "Abandoned Cart Shoppers",
  };

  const topCustomers = (
    db
      .prepare(
        `SELECT id, full_name, email, segment, orders_count, total_spent_cents, last_purchase_at
         FROM customers WHERE business_id = ? ORDER BY total_spent_cents DESC LIMIT 5`
      )
      .all(businessId) as Array<{
      id: string;
      full_name: string;
      email: string;
      segment: string;
      orders_count: number;
      total_spent_cents: number;
      last_purchase_at: string | null;
    }>
  ).map((c) => ({
    id: c.id,
    fullName: c.full_name,
    email: c.email,
    segment: c.segment,
    ordersCount: c.orders_count,
    totalSpentCents: c.total_spent_cents,
    lastPurchaseAt: c.last_purchase_at,
  }));

  const inactiveCustomers = (
    db
      .prepare(
        `SELECT id, full_name, email, total_spent_cents, last_purchase_at
         FROM customers WHERE business_id = ? AND segment = 'inactive' ORDER BY total_spent_cents DESC LIMIT 5`
      )
      .all(businessId) as Array<{
      id: string;
      full_name: string;
      email: string;
      total_spent_cents: number;
      last_purchase_at: string | null;
    }>
  ).map((c) => ({
    id: c.id,
    fullName: c.full_name,
    email: c.email,
    totalSpentCents: c.total_spent_cents,
    lastPurchaseAt: c.last_purchase_at,
  }));

  const abandonedCarts = (
    db
      .prepare(
        `SELECT
           c.id as cart_id,
           COALESCE(cu.full_name, 'Guest Shopper') as customer_name,
           COALESCE(cu.email, 'Unregistered guest') as customer_email,
           COALESCE(SUM(ci.quantity * ci.unit_price_cents), 0) as value_cents,
           COALESCE(SUM(ci.quantity), 0) as item_count,
           c.updated_at
         FROM carts c
         LEFT JOIN customers cu ON cu.id = c.customer_id
         JOIN cart_items ci ON ci.cart_id = c.id
         WHERE c.business_id = ? AND c.status IN ('abandoned', 'active')
         GROUP BY c.id
         ORDER BY value_cents DESC`
      )
      .all(businessId) as Array<{
      cart_id: string;
      customer_name: string;
      customer_email: string;
      value_cents: number;
      item_count: number;
      updated_at: string;
    }>
  ).map((r) => ({
    cartId: r.cart_id,
    customerName: r.customer_name,
    customerEmail: r.customer_email,
    valueCents: r.value_cents,
    itemCount: r.item_count,
    updatedAt: r.updated_at,
  }));

  const leadRows = db
    .prepare(
      `SELECT status as stage, COUNT(*) as count, COALESCE(SUM(estimated_value_cents), 0) as value_cents
       FROM leads WHERE business_id = ? GROUP BY status`
    )
    .all(businessId) as Array<{ stage: string; count: number; value_cents: number }>;

  const openStages = new Set(["new_lead", "contacted", "interested", "negotiation"]);
  const openPipelineValueCents = leadRows
    .filter((r) => openStages.has(r.stage))
    .reduce((acc, r) => acc + r.value_cents, 0);
  const totalLeads = leadRows.reduce((acc, r) => acc + r.count, 0);

  return {
    business: {
      id: biz.id,
      name: biz.name,
      category: biz.category,
      storeSubdomain: biz.store_subdomain,
      storePublished: Boolean(biz.store_published),
    },
    kpis: {
      totalRevenueCents: orderAgg.revenue_cents,
      totalOrders: orderAgg.total_orders,
      paidOrders: orderAgg.paid_orders,
      cancelledOrders: orderAgg.cancelled_orders,
      averageOrderValueCents: orderAgg.paid_orders > 0 ? Math.round(orderAgg.revenue_cents / orderAgg.paid_orders) : 0,
      totalCustomers: custAgg.total_customers,
      repeatCustomers: custAgg.repeat_customers,
      repeatPurchaseRatePct: buyersCount > 0 ? Number(((custAgg.repeat_customers / buyersCount) * 100).toFixed(1)) : 0,
      averageLtvCents: Math.round(custAgg.avg_ltv || 0),
      totalProducts: prodAgg.total_products,
      activeProducts: prodAgg.active_products,
      lowStockCount: lowStockProducts.length,
      conversionRatePct,
      recent7dRevenueCents: recent7,
      previous7dRevenueCents: prev7,
      revenueTrendPct,
    },
    topProducts,
    underperformingProducts,
    lowStockProducts,
    customerSegments: segRows.map((s) => ({
      slug: s.slug,
      name: segNames[s.slug] ?? s.slug,
      count: s.count,
    })),
    topCustomers,
    inactiveCustomers,
    abandonedCarts,
    pipeline: {
      totalLeads,
      openPipelineValueCents,
      stages: leadRows.map((r) => ({ stage: r.stage, count: r.count, valueCents: r.value_cents })),
    },
  };
}
