-- SellGenius AI: Supabase Row Level Security (RLS) Policies
-- Ensures strict multi-tenant isolation at the database layer.

CREATE OR REPLACE FUNCTION public.is_business_member(target_business_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_members
    WHERE business_id = target_business_id
      AND user_id = auth.uid()::text
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()::text AND role = 'platform_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Tenant-scoped policies for all seller-owned tables
CREATE POLICY tenant_businesses ON businesses
  FOR ALL USING (public.is_business_member(id) OR public.is_platform_admin());

CREATE POLICY tenant_stores_read_public ON stores
  FOR SELECT USING (is_published = TRUE OR public.is_business_member(business_id) OR public.is_platform_admin());
CREATE POLICY tenant_stores_write ON stores
  FOR ALL USING (public.is_business_member(business_id) OR public.is_platform_admin());

CREATE POLICY tenant_products_public_read ON products
  FOR SELECT USING (
    (status = 'active' AND EXISTS (SELECT 1 FROM stores s WHERE s.business_id = products.business_id AND s.is_published = TRUE))
    OR public.is_business_member(business_id)
  );
CREATE POLICY tenant_products_write ON products
  FOR ALL USING (public.is_business_member(business_id));

CREATE POLICY tenant_inventory ON inventory FOR ALL USING (public.is_business_member(business_id));
CREATE POLICY tenant_inventory_movements ON inventory_movements FOR ALL USING (public.is_business_member(business_id));
CREATE POLICY tenant_customers ON customers FOR ALL USING (public.is_business_member(business_id) OR user_id = auth.uid()::text);
CREATE POLICY tenant_orders ON orders FOR ALL USING (public.is_business_member(business_id));
CREATE POLICY tenant_order_items ON order_items FOR ALL USING (public.is_business_member(business_id));
CREATE POLICY tenant_payments ON payments FOR ALL USING (public.is_business_member(business_id));
CREATE POLICY tenant_leads ON leads FOR ALL USING (public.is_business_member(business_id));
CREATE POLICY tenant_opportunities ON sales_opportunities FOR ALL USING (public.is_business_member(business_id));
CREATE POLICY tenant_activities ON sales_activities FOR ALL USING (public.is_business_member(business_id));
CREATE POLICY tenant_segments ON customer_segments FOR ALL USING (public.is_business_member(business_id));
CREATE POLICY tenant_campaigns ON marketing_campaigns FOR ALL USING (public.is_business_member(business_id));
CREATE POLICY tenant_content ON marketing_content FOR ALL USING (public.is_business_member(business_id));
CREATE POLICY tenant_snapshots ON analytics_snapshots FOR ALL USING (public.is_business_member(business_id));
CREATE POLICY tenant_ai_conv ON ai_conversations FOR ALL USING (public.is_business_member(business_id));
CREATE POLICY tenant_ai_recs ON ai_recommendations FOR ALL USING (public.is_business_member(business_id));
CREATE POLICY tenant_subscriptions ON subscriptions FOR ALL USING (public.is_business_member(business_id) OR public.is_platform_admin());
