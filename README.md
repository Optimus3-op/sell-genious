# SellGenius AI — Independent AI-Powered Commerce, CRM & Business Growth Ecosystem

SellGenius AI is an independent, multi-tenant SaaS platform combining:
1. **E-Commerce Engine & Store Builder** (catalog, variants, stock ledger, orders, refunds, 3-theme dynamic storefronts, sandbox simulated checkout).
2. **Native CRM & Kanban Sales Pipeline** (auto-segmented customer profiles, LTV, purchase timeline, lead management, 6-stage Kanban pipeline).
3. **AI Business Growth Advisor & Marketing Studio** (analytics-grounded AI advisor querying real tenant-isolated business metrics with OpenAI tool-calling support + built-in grounded fallback).

> **Architectural Independence:** Built completely independently with its own relational database, authentication, storefront engine, and native CRM—no Shopify or Salesforce integrations or dependencies.

---

## Quick Start (Runs Out-of-the-Box Locally)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

On first boot, `src/lib/db/index.ts` initializes a relational SQLite database at `data/sellgenius.db` (using Node's built-in `node:sqlite`) and seeds clearly labeled demo tenants:

| Role | Email | Password | Workspace |
| --- | --- | --- | --- |
| Seller (UrbanStyle) | `demo@urbanstyle.com` | `SellerPass123!` | `/dashboard` & `/store/urbanstyle` |
| Seller (TerraRoast) | `founder@terraroast.com` | `SellerPass123!` | `/dashboard` & `/store/terraroast` |
| Platform Admin | `admin@sellgenius.ai` | `AdminPass123!` | `/admin` |
| Storefront Shopper | `alex.rivera@example.com` | `CustomerPass123!` | `/store/urbanstyle` |

---

## Optional Cloud Configuration (Supabase + OpenAI)

Copy `.env.example` to `.env.local` to enable optional OpenAI LLM tool-calling (`OPENAI_API_KEY`) or deploy the PostgreSQL schema & Row Level Security (RLS) policies to Supabase:
- `supabase/migrations/001_initial_schema.sql` — 24 relational tables (`users`, `businesses`, `business_members`, `stores`, `store_themes`, `products`, `product_variants`, `inventory`, `inventory_movements`, `customers`, `customer_addresses`, `carts`, `cart_items`, `orders`, `order_items`, `payments`, `leads`, `sales_opportunities`, `sales_activities`, `customer_segments`, `marketing_campaigns`, `marketing_content`, `analytics_snapshots`, `ai_conversations`, `ai_recommendations`, `subscriptions`).
- `supabase/migrations/002_rls_policies.sql` — Database-level tenant isolation policies via `is_business_member()` and `is_platform_admin()`.

---

## Multi-Tenant Security & API Surface

- **Server-side Tenant Isolation:** Every seller endpoint calls `requireSellerContext()` (`src/lib/auth/session.ts`) to resolve the authenticated `user_id -> business_members -> business_id` on the server and filters every query by `WHERE business_id = ?`.
- **Auth & Onboarding:** `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/onboarding`
- **Commerce & Store Builder:** `/api/products`, `/api/products/[id]`, `/api/inventory`, `/api/orders`, `/api/orders/[id]`, `/api/store`
- **Native CRM & Pipeline:** `/api/customers`, `/api/customers/[id]`, `/api/crm/leads`, `/api/crm/leads/[id]`
- **AI & Analytics:** `/api/ai/advisor`, `/api/ai/marketing`, `/api/analytics`, `/api/dashboard/overview`
- **Public Storefront:** `/api/storefront/[subdomain]`, `/api/storefront/[subdomain]/auth`, `/api/storefront/[subdomain]/cart`, `/api/storefront/[subdomain]/checkout`
- **Platform Admin & Settings:** `/api/admin`, `/api/settings`

---

## Payments & Shipping Disclaimer

For the MVP, `/api/storefront/[subdomain]/checkout` uses the clearly labeled `sandboxPaymentAdapter` (`src/lib/services/payments.ts`), creating simulated payment records (`is_simulated = 1`) without charging real cards. Modular payment (`Stripe`, `Razorpay`) and shipping rate (`src/lib/services/shipping.ts`) interfaces are ready for Phase 5 live gateway keys.
