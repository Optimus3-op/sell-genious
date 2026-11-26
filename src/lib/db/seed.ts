import type { DatabaseSync } from "node:sqlite";
import { hashPassword } from "@/lib/auth/crypto";

function daysAgoIso(days: number): string {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

function dateOnlyDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export function seedDatabaseIfEmpty(db: DatabaseSync): void {
  const themeCount = (db.prepare("SELECT COUNT(*) as c FROM store_themes").get() as { c: number }).c;
  if (themeCount === 0) {
    const insertTheme = db.prepare(
      "INSERT INTO store_themes (id, name, description, layout_style, default_primary_color, default_accent_color, preview_badge) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    insertTheme.run(
      "theme_minimal",
      "Minimalist Atelier",
      "Clean gallery grid with airy whitespace, crisp typography, and subtle product hover framing.",
      "minimal",
      "#0F172A",
      "#4F46E5",
      "Popular"
    );
    insertTheme.run(
      "theme_modern",
      "Bold Modern Commerce",
      "High-contrast editorial hero, vibrant indigo-violet highlights, and conversion-focused product cards.",
      "modern",
      "#4F46E5",
      "#7C3AED",
      "High Converting"
    );
    insertTheme.run(
      "theme_boutique",
      "Editorial Boutique",
      "Warm luxury storytelling layout with split hero spotlight and curated category strips.",
      "boutique",
      "#1E293B",
      "#0D9488",
      "Storytelling"
    );
  }

  const userCount = (db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c;
  if (userCount > 0) return;

  const now = new Date().toISOString();
  const sellerPass = hashPassword("SellerPass123!");
  const adminPass = hashPassword("AdminPass123!");
  const customerPass = hashPassword("CustomerPass123!");

  // 1. Users
  const insertUser = db.prepare(
    "INSERT INTO users (id, email, password_hash, full_name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  );
  insertUser.run("usr_admin_1", "admin@sellgenius.ai", adminPass, "Aria Vance (Platform Admin)", "platform_admin", daysAgoIso(90));
  insertUser.run("usr_seller_1", "demo@urbanstyle.com", sellerPass, "Maya Lin", "seller", daysAgoIso(60));
  insertUser.run("usr_seller_2", "founder@terraroast.com", sellerPass, "Julian Brooks", "seller", daysAgoIso(45));
  insertUser.run("usr_cust_1", "alex.rivera@example.com", customerPass, "Alex Rivera", "customer", daysAgoIso(40));
  insertUser.run("usr_cust_2", "sophia.chen@example.com", customerPass, "Sophia Chen", "customer", daysAgoIso(35));

  // 2. Businesses
  const insertBiz = db.prepare(
    `INSERT INTO businesses (id, owner_user_id, name, slug, category, description, email, phone, address, subscription_plan, status, onboarding_step, onboarding_completed, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  insertBiz.run(
    "biz_urbanstyle",
    "usr_seller_1",
    "UrbanStyle",
    "urbanstyle",
    "Apparel & Accessories",
    "Modern architectural streetwear, minimalist outerwear, and everyday carry essentials crafted for urban creators.",
    "hello@urbanstyle.sellgenius.com",
    "+1 (415) 555-0192",
    "420 Howard St, Suite 300, San Francisco, CA",
    "scale",
    "active",
    8,
    1,
    daysAgoIso(60)
  );
  insertBiz.run(
    "biz_terraroast",
    "usr_seller_2",
    "TerraRoast Coffee",
    "terraroast",
    "Specialty Food & Beverage",
    "Single-origin micro-lot coffees roasted to order and precision brewing gear.",
    "care@terraroast.sellgenius.com",
    "+1 (206) 555-0148",
    "118 Ballard Ave NW, Seattle, WA",
    "growth",
    "active",
    8,
    1,
    daysAgoIso(45)
  );

  // Business Members & Subscriptions
  const insertMember = db.prepare(
    "INSERT INTO business_members (id, business_id, user_id, role, created_at) VALUES (?, ?, ?, ?, ?)"
  );
  insertMember.run("bm_1", "biz_urbanstyle", "usr_seller_1", "owner", daysAgoIso(60));
  insertMember.run("bm_2", "biz_terraroast", "usr_seller_2", "owner", daysAgoIso(45));

  const insertSub = db.prepare(
    "INSERT INTO subscriptions (id, business_id, plan_name, monthly_price_cents, status, current_period_end, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  insertSub.run("sub_1", "biz_urbanstyle", "Scale", 9900, "active", daysAgoIso(-25), daysAgoIso(60));
  insertSub.run("sub_2", "biz_terraroast", "Growth", 4900, "active", daysAgoIso(-20), daysAgoIso(45));

  // 3. Stores
  const defaultSections = JSON.stringify([
    { id: "sec_hero", type: "hero", title: "Hero Spotlight", enabled: true },
    { id: "sec_featured", type: "featured_products", title: "Featured Essentials", enabled: true },
    { id: "sec_categories", type: "categories", title: "Shop by Category", enabled: true },
    { id: "sec_catalog", type: "catalog", title: "Full Collection", enabled: true },
    { id: "sec_story", type: "brand_story", title: "Our Craft & Story", enabled: true },
  ]);

  const insertStore = db.prepare(
    `INSERT INTO stores (id, business_id, subdomain, name, tagline, logo_url, primary_color, accent_color, banner_title, banner_subtitle, banner_image_url, theme_id, sections_json, social_links_json, contact_email, contact_phone, is_published, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  insertStore.run(
    "store_urbanstyle",
    "biz_urbanstyle",
    "urbanstyle",
    "UrbanStyle",
    "Architectural Streetwear & Everyday Carry",
    "",
    "#4F46E5",
    "#7C3AED",
    "Autumn / Winter Urban Capsule",
    "Weatherproof technical layers, heavyweight organic cotton, and modular commuter packs built to move.",
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=80",
    "theme_modern",
    defaultSections,
    JSON.stringify({ instagram: "@urbanstyle.studio", twitter: "@urbanstylehq", tiktok: "@urbanstyle" }),
    "hello@urbanstyle.sellgenius.com",
    "+1 (415) 555-0192",
    1,
    daysAgoIso(60)
  );
  insertStore.run(
    "store_terraroast",
    "biz_terraroast",
    "terraroast",
    "TerraRoast Coffee",
    "Traceable Micro-Lot Specialty Roasters",
    "",
    "#1E293B",
    "#0D9488",
    "Fresh Harvest Single-Origin Drops",
    "Roasted every Tuesday in small batches. Bright Ethiopian florals, rich Colombian caramel, and pour-over essentials.",
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1400&q=80",
    "theme_boutique",
    defaultSections,
    JSON.stringify({ instagram: "@terraroast", twitter: "@terraroast" }),
    "care@terraroast.sellgenius.com",
    "+1 (206) 555-0148",
    1,
    daysAgoIso(45)
  );

  // 4. Products + Variants + Inventory for UrbanStyle & TerraRoast
  const insertProduct = db.prepare(
    `INSERT INTO products (id, business_id, title, slug, description, category, price_cents, discount_price_cents, sku, status, is_featured, images_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertVariant = db.prepare(
    "INSERT INTO product_variants (id, business_id, product_id, name, sku, price_cents, stock_quantity, attributes_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const insertInv = db.prepare(
    "INSERT INTO inventory (id, business_id, product_id, variant_id, quantity, low_stock_threshold, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const insertInvMove = db.prepare(
    "INSERT INTO inventory_movements (id, business_id, product_id, delta, reason, previous_qty, new_qty, actor_user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );

  const urbanProducts = [
    {
      id: "prod_us_1",
      title: "Apex Weatherproof Shell Jacket",
      slug: "apex-weatherproof-shell-jacket",
      description: "3-layer breathable storm shell with taped seams, matte anodized hardware, and packable hood.",
      category: "Outerwear",
      price: 18500,
      discount: 15900,
      sku: "US-OUT-101",
      status: "active",
      featured: 1,
      stock: 18,
      threshold: 6,
      img: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=80",
      variants: [
        { id: "var_us_1a", name: "Obsidian / M", sku: "US-OUT-101-M", price: 15900, stock: 10 },
        { id: "var_us_1b", name: "Obsidian / L", sku: "US-OUT-101-L", price: 15900, stock: 8 },
      ],
    },
    {
      id: "prod_us_2",
      title: "Metro 22L Commuter Backpack",
      slug: "metro-22l-commuter-backpack",
      description: "Ballistic nylon everyday backpack with suspended 16-inch laptop sleeve and quick-access tech organizer.",
      category: "Bags & Carry",
      price: 12900,
      discount: null,
      sku: "US-BAG-204",
      status: "active",
      featured: 1,
      stock: 4, // Low stock!
      threshold: 8,
      img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80",
      variants: [{ id: "var_us_2a", name: "Slate Charcoal", sku: "US-BAG-204-SL", price: 12900, stock: 4 }],
    },
    {
      id: "prod_us_3",
      title: "Heavyweight Boxy Studio Hoodie",
      slug: "heavyweight-boxy-studio-hoodie",
      description: "460gsm 100% organic loopback French terry with double-lined hood and dropped shoulders.",
      category: "Tops",
      price: 9400,
      discount: 7900,
      sku: "US-TOP-302",
      status: "active",
      featured: 1,
      stock: 32,
      threshold: 10,
      img: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80",
      variants: [
        { id: "var_us_3a", name: "Ash Heather / M", sku: "US-TOP-302-M", price: 7900, stock: 18 },
        { id: "var_us_3b", name: "Midnight / L", sku: "US-TOP-302-L", price: 7900, stock: 14 },
      ],
    },
    {
      id: "prod_us_4",
      title: "Merino Knit Watch Beanie",
      slug: "merino-knit-watch-beanie",
      description: "Extra-fine Australian merino wool ribbed beanie that regulates warmth without itch.",
      category: "Accessories",
      price: 3800,
      discount: null,
      sku: "US-ACC-410",
      status: "active",
      featured: 0,
      stock: 3, // Low stock!
      threshold: 10,
      img: "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?auto=format&fit=crop&w=900&q=80",
      variants: [{ id: "var_us_4a", name: "One Size / Navy", sku: "US-ACC-410-NV", price: 3800, stock: 3 }],
    },
    {
      id: "prod_us_5",
      title: "Tailored Technical Cargo Pant",
      slug: "tailored-technical-cargo-pant",
      description: "Four-way stretch water-repellent twill with concealed gusseted cargo pockets.",
      category: "Bottoms",
      price: 11800,
      discount: null,
      sku: "US-BTM-501",
      status: "active",
      featured: 1,
      stock: 21,
      threshold: 6,
      img: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=900&q=80",
      variants: [{ id: "var_us_5a", name: "Olive / 32", sku: "US-BTM-501-32", price: 11800, stock: 21 }],
    },
    {
      id: "prod_us_6",
      title: "Minimalist Leather Card Folio",
      slug: "minimalist-leather-card-folio",
      description: "Vegetable-tanned full-grain Italian leather slim wallet holding up to 8 cards plus folded bills.",
      category: "Accessories",
      price: 5500,
      discount: null,
      sku: "US-ACC-612",
      status: "active",
      featured: 0,
      stock: 44,
      threshold: 8,
      img: "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=900&q=80",
      variants: [{ id: "var_us_6a", name: "Espresso", sku: "US-ACC-612-ES", price: 5500, stock: 44 }],
    },
  ];

  for (const p of urbanProducts) {
    insertProduct.run(
      p.id,
      "biz_urbanstyle",
      p.title,
      p.slug,
      p.description,
      p.category,
      p.price,
      p.discount,
      p.sku,
      p.status,
      p.featured,
      JSON.stringify([p.img]),
      daysAgoIso(50),
      now
    );
    for (const v of p.variants) {
      insertVariant.run(v.id, "biz_urbanstyle", p.id, v.name, v.sku, v.price, v.stock, JSON.stringify({ option: v.name }));
    }
    insertInv.run(`inv_${p.id}`, "biz_urbanstyle", p.id, null, p.stock, p.threshold, now);
    insertInvMove.run(`im_${p.id}_init`, "biz_urbanstyle", p.id, p.stock, "Initial stock receipt", 0, p.stock, "usr_seller_1", daysAgoIso(45));
  }

  // TerraRoast products (proving multi-tenant catalog isolation)
  const terraProducts = [
    {
      id: "prod_tr_1",
      title: "Ethiopia Yirgacheffe Kochere (340g)",
      slug: "ethiopia-yirgacheffe-kochere",
      description: "Washed heirloom varietals with bergamot, jasmine blossom, and Meyer lemon clarity.",
      category: "Single Origin",
      price: 2200,
      discount: null,
      sku: "TR-SO-01",
      stock: 38,
      img: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "prod_tr_2",
      title: "Precision Gooseneck Pour-Over Kettle",
      slug: "precision-gooseneck-pour-over-kettle",
      description: "Matte black stainless steel variable-temperature kettle with PID hold mode.",
      category: "Brew Gear",
      price: 14500,
      discount: 12900,
      sku: "TR-GR-09",
      stock: 9,
      img: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=900&q=80",
    },
  ];
  for (const p of terraProducts) {
    insertProduct.run(
      p.id,
      "biz_terraroast",
      p.title,
      p.slug,
      p.description,
      p.category,
      p.price,
      p.discount,
      p.sku,
      "active",
      1,
      JSON.stringify([p.img]),
      daysAgoIso(40),
      now
    );
    insertInv.run(`inv_${p.id}`, "biz_terraroast", p.id, null, p.stock, 5, now);
    insertInvMove.run(`im_${p.id}_init`, "biz_terraroast", p.id, p.stock, "Initial roast batch", 0, p.stock, "usr_seller_2", daysAgoIso(40));
  }

  // 5. Customers for UrbanStyle across all 6 segments
  const insertCustomer = db.prepare(
    `INSERT INTO customers (id, business_id, user_id, full_name, email, phone, segment, total_spent_cents, orders_count, last_purchase_at, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  insertCustomer.run("cust_us_1", "biz_urbanstyle", "usr_cust_1", "Alex Rivera", "alex.rivera@example.com", "+1 415-882-1044", "high_value", 56400, 4, daysAgoIso(3), "Prefers matte black technical outerwear. Responsive to early capsule drops.", daysAgoIso(40));
  insertCustomer.run("cust_us_2", "biz_urbanstyle", "usr_cust_2", "Sophia Chen", "sophia.chen@example.com", "+1 646-319-7721", "returning", 27700, 2, daysAgoIso(11), "Bought backpack and hoodie; potential repeat outerwear buyer.", daysAgoIso(35));
  insertCustomer.run("cust_us_3", "biz_urbanstyle", null, "Marcus Thorne", "marcus.thorne@studio.co", "+1 312-904-2280", "high_value", 48900, 3, daysAgoIso(6), "Corporate studio buyer; interested in bulk commuter packs.", daysAgoIso(42));
  insertCustomer.run("cust_us_4", "biz_urbanstyle", null, "Elena Rostova", "elena.rostova@mail.com", "+1 206-441-8890", "inactive", 15900, 1, daysAgoIso(52), "Purchased shell jacket 52 days ago; has not returned since.", daysAgoIso(55));
  insertCustomer.run("cust_us_5", "biz_urbanstyle", null, "Devon Brooks", "devon.brooks@mail.com", "+1 512-774-0932", "potential_repeat", 11800, 1, daysAgoIso(18), "Bought cargo pants; browsed matching tops.", daysAgoIso(20));
  insertCustomer.run("cust_us_6", "biz_urbanstyle", null, "Priya Nair", "priya.nair@mail.com", "+1 408-612-3319", "abandoned_cart", 0, 0, null, "Left Apex Shell Jacket + Beanie ($197) in cart 2 days ago.", daysAgoIso(5));
  insertCustomer.run("cust_us_7", "biz_urbanstyle", null, "Liam O'Connor", "liam.oconnor@mail.com", "+1 617-205-9182", "new", 7900, 1, daysAgoIso(1), "First-time hoodie buyer from Instagram Reels campaign.", daysAgoIso(2));

  // TerraRoast customer
  insertCustomer.run("cust_tr_1", "biz_terraroast", null, "Hannah Kim", "hannah.kim@example.com", "+1 206-912-3301", "returning", 17300, 2, daysAgoIso(7), "Bi-weekly single-origin subscriber.", daysAgoIso(30));

  // Customer address
  db.prepare(
    `INSERT INTO customer_addresses (id, business_id, customer_id, label, line1, line2, city, state, postal_code, country, is_default)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run("addr_us_1", "biz_urbanstyle", "cust_us_1", "Home", "742 Valencia St", "Apt 4B", "San Francisco", "CA", "94110", "US", 1);

  // Abandoned Cart record for Priya Nair
  db.prepare(
    `INSERT INTO carts (id, business_id, store_id, customer_id, session_token, status, updated_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run("cart_abandoned_1", "biz_urbanstyle", "store_urbanstyle", "cust_us_6", "abandoned_tok_priya", "abandoned", daysAgoIso(2), daysAgoIso(2));
  db.prepare(
    `INSERT INTO cart_items (id, cart_id, product_id, variant_id, quantity, unit_price_cents) VALUES (?, ?, ?, ?, ?, ?)`
  ).run("ci_ab_1", "cart_abandoned_1", "prod_us_1", "var_us_1a", 1, 15900);
  db.prepare(
    `INSERT INTO cart_items (id, cart_id, product_id, variant_id, quantity, unit_price_cents) VALUES (?, ?, ?, ?, ?, ?)`
  ).run("ci_ab_2", "cart_abandoned_1", "prod_us_4", "var_us_4a", 1, 3800);

  // 6. Orders + Order Items + Simulated Payments
  const insertOrder = db.prepare(
    `INSERT INTO orders (id, business_id, store_id, customer_id, order_number, status, payment_status, fulfillment_status, subtotal_cents, shipping_cents, discount_cents, total_cents, shipping_address_json, shipping_method, tracking_number, refund_amount_cents, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertOrderItem = db.prepare(
    `INSERT INTO order_items (id, order_id, business_id, product_id, variant_id, product_title, sku, quantity, unit_price_cents, total_cents)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertPayment = db.prepare(
    `INSERT INTO payments (id, order_id, business_id, provider, status, amount_cents, reference_code, is_simulated, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const addrAlex = JSON.stringify({ fullName: "Alex Rivera", line1: "742 Valencia St, Apt 4B", city: "San Francisco", state: "CA", postalCode: "94110", country: "US" });
  const addrGeneric = JSON.stringify({ fullName: "Store Customer", line1: "100 Main St", city: "New York", state: "NY", postalCode: "10001", country: "US" });

  const seedOrders = [
    { id: "ord_us_1001", num: "SG-1001", cust: "cust_us_4", status: "delivered", pay: "simulated_paid", ful: "delivered", sub: 15900, ship: 0, total: 15900, days: 52, prod: "prod_us_1", title: "Apex Weatherproof Shell Jacket", sku: "US-OUT-101", qty: 1, unit: 15900, track: "1Z999AA10123456" },
    { id: "ord_us_1002", num: "SG-1002", cust: "cust_us_1", status: "delivered", pay: "simulated_paid", ful: "delivered", sub: 28800, ship: 0, total: 28800, days: 28, prod: "prod_us_1", title: "Apex Weatherproof Shell Jacket", sku: "US-OUT-101", qty: 1, unit: 15900, track: "1Z999AA10129911" },
    { id: "ord_us_1003", num: "SG-1003", cust: "cust_us_3", status: "delivered", pay: "simulated_paid", ful: "delivered", sub: 25800, ship: 0, total: 25800, days: 21, prod: "prod_us_2", title: "Metro 22L Commuter Backpack", sku: "US-BAG-204", qty: 2, unit: 12900, track: "1Z999AA10131122" },
    { id: "ord_us_1004", num: "SG-1004", cust: "cust_us_5", status: "delivered", pay: "simulated_paid", ful: "delivered", sub: 11800, ship: 0, total: 11800, days: 18, prod: "prod_us_5", title: "Tailored Technical Cargo Pant", sku: "US-BTM-501", qty: 1, unit: 11800, track: "1Z999AA10134500" },
    { id: "ord_us_1005", num: "SG-1005", cust: "cust_us_2", status: "delivered", pay: "simulated_paid", ful: "delivered", sub: 19800, ship: 0, total: 19800, days: 11, prod: "prod_us_2", title: "Metro 22L Commuter Backpack", sku: "US-BAG-204", qty: 1, unit: 12900, track: "1Z999AA10138811" },
    { id: "ord_us_1006", num: "SG-1006", cust: "cust_us_3", status: "shipped", pay: "simulated_paid", ful: "shipped", sub: 23100, ship: 0, total: 23100, days: 6, prod: "prod_us_1", title: "Apex Weatherproof Shell Jacket", sku: "US-OUT-101", qty: 1, unit: 15900, track: "1Z999AA10142019" },
    { id: "ord_us_1007", num: "SG-1007", cust: "cust_us_1", status: "confirmed", pay: "simulated_paid", ful: "processing", sub: 27600, ship: 0, total: 27600, days: 3, prod: "prod_us_3", title: "Heavyweight Boxy Studio Hoodie", sku: "US-TOP-302", qty: 2, unit: 7900, track: "" },
    { id: "ord_us_1008", num: "SG-1008", cust: "cust_us_7", status: "confirmed", pay: "simulated_paid", ful: "unfulfilled", sub: 7900, ship: 1200, total: 9100, days: 1, prod: "prod_us_3", title: "Heavyweight Boxy Studio Hoodie", sku: "US-TOP-302", qty: 1, unit: 7900, track: "" },
  ];

  for (const o of seedOrders) {
    insertOrder.run(
      o.id,
      "biz_urbanstyle",
      "store_urbanstyle",
      o.cust,
      o.num,
      o.status,
      o.pay,
      o.ful,
      o.sub,
      o.ship,
      0,
      o.total,
      o.cust === "cust_us_1" ? addrAlex : addrGeneric,
      o.ship === 0 ? "Free Express Shipping" : "Standard Ground",
      o.track,
      0,
      "Demo seeded order",
      daysAgoIso(o.days)
    );
    insertOrderItem.run(`oi_${o.id}_1`, o.id, "biz_urbanstyle", o.prod, null, o.title, o.sku, o.qty, o.unit, o.qty * o.unit);
    insertPayment.run(`pay_${o.id}`, o.id, "biz_urbanstyle", "sandbox_simulated", "simulated_captured", o.total, `SIM-${o.num}`, 1, daysAgoIso(o.days));
  }
  // Extra line items on multi-item orders so totals match
  insertOrderItem.run("oi_ord_us_1002_2", "ord_us_1002", "biz_urbanstyle", "prod_us_2", null, "Metro 22L Commuter Backpack", "US-BAG-204", 1, 12900, 12900);
  insertOrderItem.run("oi_ord_us_1005_2", "ord_us_1005", "biz_urbanstyle", "prod_us_3", null, "Heavyweight Boxy Studio Hoodie", "US-TOP-302", 1, 7900, 7900);
  insertOrderItem.run("oi_ord_us_1006_2", "ord_us_1006", "biz_urbanstyle", "prod_us_4", null, "Merino Knit Watch Beanie", "US-ACC-410", 2, 3800, 7600);
  insertOrderItem.run("oi_ord_us_1007_2", "ord_us_1007", "biz_urbanstyle", "prod_us_5", null, "Tailored Technical Cargo Pant", "US-BTM-501", 1, 11800, 11800);

  // TerraRoast order
  insertOrder.run("ord_tr_2001", "biz_terraroast", "store_terraroast", "cust_tr_1", "SG-2001", "delivered", "simulated_paid", "delivered", 15100, 0, 0, 15100, addrGeneric, "Free Roaster Dispatch", "1Z999TR88123", 0, "Demo TerraRoast order", daysAgoIso(7));
  insertOrderItem.run("oi_tr_1", "ord_tr_2001", "biz_terraroast", "prod_tr_1", null, "Ethiopia Yirgacheffe Kochere (340g)", "TR-SO-01", 1, 2200, 2200);
  insertOrderItem.run("oi_tr_2", "ord_tr_2001", "biz_terraroast", "prod_tr_2", null, "Precision Gooseneck Pour-Over Kettle", "TR-GR-09", 1, 12900, 12900);
  insertPayment.run("pay_tr_1", "ord_tr_2001", "biz_terraroast", "sandbox_simulated", "simulated_captured", 15100, "SIM-SG-2001", 1, daysAgoIso(7));

  // 7. Leads, Opportunities & Activities for UrbanStyle
  const insertLead = db.prepare(
    `INSERT INTO leads (id, business_id, customer_id, full_name, email, phone, company, source, status, owner_name, estimated_value_cents, follow_up_date, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertOpp = db.prepare(
    `INSERT INTO sales_opportunities (id, business_id, lead_id, customer_id, title, stage, value_cents, probability, expected_close_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertAct = db.prepare(
    `INSERT INTO sales_activities (id, business_id, customer_id, lead_id, activity_type, summary, due_date, completed, actor_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const seedLeads = [
    { id: "lead_1", cust: null, name: "Jordan Vance", email: "jordan@arcadesign.io", phone: "+1 415-391-0021", company: "Arca Design Studio", source: "instagram", status: "new_lead", owner: "Maya Lin", val: 185000, follow: dateOnlyDaysAgo(-2), notes: "Requested team uniform quote for 12 designers (Shell Jackets + Backpacks)." },
    { id: "lead_2", cust: "cust_us_6", name: "Priya Nair", email: "priya.nair@mail.com", phone: "+1 408-612-3319", company: "Direct Shopper", source: "abandoned_cart", status: "contacted", owner: "Maya Lin", val: 19700, follow: dateOnlyDaysAgo(-1), notes: "Sent size guide & free express shipping reminder for abandoned cart." },
    { id: "lead_3", cust: null, name: "Nadia Kouri", email: "nadia@northbound.media", phone: "+1 212-884-1940", company: "Northbound Media", source: "referral", status: "interested", owner: "Maya Lin", val: 340000, follow: dateOnlyDaysAgo(-3), notes: "Interested in 25 Metro 22L Backpacks with custom subtle tag." },
    { id: "lead_4", cust: "cust_us_3", name: "Marcus Thorne", email: "marcus.thorne@studio.co", phone: "+1 312-904-2280", company: "Thorne Creative", source: "repeat_b2b", status: "negotiation", owner: "Maya Lin", val: 420000, follow: dateOnlyDaysAgo(0), notes: "Reviewing Q4 corporate gifting bundle discount (15% off 20+ units)." },
    { id: "lead_5", cust: "cust_us_1", name: "Alex Rivera", email: "alex.rivera@example.com", phone: "+1 415-882-1044", company: "VIP Club", source: "storefront", status: "converted", owner: "Maya Lin", val: 56400, follow: "", notes: "Converted to VIP High-Value tier after 4th order." },
    { id: "lead_6", cust: null, name: "Caleb Foster", email: "caleb@fosterlabs.co", phone: "+1 303-511-4090", company: "Foster Labs", source: "outbound", status: "lost", owner: "Maya Lin", val: 120000, follow: "", notes: "Chose lower-cost promo vendor due to tight 5-day turnaround." },
  ];

  const probMap: Record<string, number> = {
    new_lead: 15,
    contacted: 30,
    interested: 55,
    negotiation: 80,
    converted: 100,
    lost: 0,
  };

  for (const l of seedLeads) {
    insertLead.run(l.id, "biz_urbanstyle", l.cust, l.name, l.email, l.phone, l.company, l.source, l.status, l.owner, l.val, l.follow, l.notes, daysAgoIso(10), now);
    insertOpp.run(`opp_${l.id}`, "biz_urbanstyle", l.id, l.cust, `${l.company} — ${l.name}`, l.status, l.val, probMap[l.status] ?? 25, dateOnlyDaysAgo(-14), daysAgoIso(10));
  }

  insertAct.run("act_1", "biz_urbanstyle", "cust_us_1", "lead_5", "order", "Placed Order SG-1007 ($276.00)", "", 1, "System", daysAgoIso(3));
  insertAct.run("act_2", "biz_urbanstyle", "cust_us_3", "lead_4", "call", "Discussed 20-unit corporate pack bundle pricing", dateOnlyDaysAgo(0), 0, "Maya Lin", daysAgoIso(2));
  insertAct.run("act_3", "biz_urbanstyle", "cust_us_6", "lead_2", "email", "Follow-up on abandoned Apex Shell Jacket + Beanie cart", dateOnlyDaysAgo(-1), 0, "Maya Lin", daysAgoIso(1));

  // 8. Customer Segments summary rows
  const segDefs = [
    ["new", "New Customers", "Purchased once within the last 14 days", "orders_count = 1 AND recent"],
    ["returning", "Returning Customers", "Completed 2+ orders", "orders_count >= 2"],
    ["high_value", "High-Value Customers", "Lifetime spend >= $350 or 3+ orders", "total_spent >= $350"],
    ["inactive", "Inactive Customers", "No purchase in the last 35+ days", "days_since_last_order >= 35"],
    ["potential_repeat", "Potential Repeat Buyers", "1 order placed 14–34 days ago", "orders_count = 1 AND 14-34d"],
    ["abandoned_cart", "Abandoned Cart Shoppers", "Active or abandoned cart without checkout", "cart_status = abandoned"],
  ];
  const insertSeg = db.prepare(
    "INSERT INTO customer_segments (id, business_id, name, slug, description, rule_summary, customer_count, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  for (const [slug, name, desc, rule] of segDefs) {
    const cnt = (db.prepare("SELECT COUNT(*) as c FROM customers WHERE business_id = 'biz_urbanstyle' AND segment = ?").get(slug) as { c: number }).c;
    insertSeg.run(`seg_us_${slug}`, "biz_urbanstyle", name, slug, desc, rule, cnt, now);
  }

  // 9. Analytics Snapshots (Last 14 days for UrbanStyle so charts have rich time-series alongside live orders)
  const insertSnap = db.prepare(
    `INSERT INTO analytics_snapshots (id, business_id, snapshot_date, revenue_cents, orders_count, new_customers_count, visitors_count, conversion_rate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const dailySeries = [
    [13, 18500, 1, 1, 145, 0.69],
    [12, 22400, 2, 1, 162, 1.23],
    [11, 19800, 1, 0, 151, 0.66],
    [10, 31200, 2, 1, 188, 1.06],
    [9, 15900, 1, 0, 140, 0.71],
    [8, 27400, 2, 1, 179, 1.12],
    [7, 34500, 3, 2, 210, 1.43],
    [6, 23100, 1, 0, 168, 0.60],
    [5, 29800, 2, 1, 195, 1.03],
    [4, 18900, 1, 0, 158, 0.63],
    [3, 27600, 1, 0, 184, 0.54],
    [2, 21500, 2, 1, 172, 1.16],
    [1, 9100, 1, 1, 134, 0.75],
    [0, 15900, 1, 0, 149, 0.67],
  ];
  for (const [dAgo, rev, ords, newC, vis, conv] of dailySeries) {
    insertSnap.run(`snap_us_${dAgo}`, "biz_urbanstyle", dateOnlyDaysAgo(dAgo), rev, ords, newC, vis, conv);
  }

  // 10. Marketing Campaigns & Saved AI Content
  db.prepare(
    `INSERT INTO marketing_campaigns (id, business_id, name, channel, status, target_segment, product_id, scheduled_date, budget_cents, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run("camp_1", "biz_urbanstyle", "Winter Weatherproof Bundle Launch", "Instagram & Email", "active", "potential_repeat", "prod_us_1", dateOnlyDaysAgo(-2), 45000, "Pair Apex Shell Jacket with Merino Watch Beanie at 12% bundle savings.", now);
  db.prepare(
    `INSERT INTO marketing_campaigns (id, business_id, name, channel, status, target_segment, product_id, scheduled_date, budget_cents, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run("camp_2", "biz_urbanstyle", "Win-Back Inactive Outerwear Buyers", "Email", "planned", "inactive", "prod_us_3", dateOnlyDaysAgo(-5), 15000, "Target customers inactive 35+ days with early access to Studio Hoodie.", now);

  db.prepare(
    `INSERT INTO marketing_content (id, business_id, product_id, content_type, title, body, target_audience, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    "mc_1",
    "biz_urbanstyle",
    "prod_us_1",
    "instagram_post",
    "Apex Shell Jacket — Rainproof Launch Post",
    "Built for unpredictable city forecasts. The Apex 3-Layer Weatherproof Shell brings taped seams, zero bulk, and breathable movement from studio to street.\n\nCurrently $159 (save $26) while Autumn Capsule stock lasts.\n\n#UrbanStyle #TechnicalOuterwear #EverydayCarry #MinimalMenswear",
    "High-Value & Potential Repeat Buyers",
    "saved",
    daysAgoIso(2)
  );

  // 11. Pre-seeded Structured AI Recommendations (strictly grounded in actual DB numbers)
  const insertRec = db.prepare(
    `INSERT INTO ai_recommendations (id, business_id, category, title, opportunity_or_problem, supporting_data, why_it_matters, recommended_action, expected_impact_estimate, measurement_metric, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  insertRec.run(
    "rec_1",
    "biz_urbanstyle",
    "product",
    "Restock Low-Inventory Best Seller: Metro 22L Backpack",
    "Risk of stockout on a top revenue driver (Metro 22L Commuter Backpack).",
    "Metro 22L Backpack has only 4 units remaining (below your threshold of 8 units) while generating 3 units sold across recent orders ($387.00 revenue).",
    "Running out of stock on a core high-margin carry item stalls repeat orders and weakens bundle conversion with outerwear.",
    "Create a replenishment purchase order for 25–30 units today and feature the Heavyweight Boxy Studio Hoodie (32 in stock) on the homepage while inventory replenishes.",
    "Estimated to prevent ~$500–$900/month in lost backpack revenue (estimate based on recent order velocity).",
    "Track stockout days (target: 0) and weekly unit sales of Metro 22L Backpack over the next 14 days.",
    "active",
    now
  );
  insertRec.run(
    "rec_2",
    "biz_urbanstyle",
    "customer",
    "Recover Abandoned Cart & Re-Engage Inactive Buyers",
    "Untapped near-term revenue sitting in abandoned carts and inactive customer cohorts.",
    "1 shopper (Priya Nair) has $197.00 in an abandoned cart (Apex Shell Jacket + Merino Beanie), and 1 past buyer (Elena Rostova, $159.00 LTV) has been inactive for 52 days.",
    "Recovering warm intent shoppers costs far less than acquiring cold traffic and lifts repeat purchase rate.",
    "Send a personalized 48-hour follow-up offering complimentary express shipping on Priya's cart and a 10% loyalty perk on Merino Accessories for Elena.",
    "Estimated 20%–35% recovery likelihood on warm abandoned intent (~$75–$197 in near-term recovered revenue, estimate).",
    "Measure abandoned-cart conversion rate and repeat orders from the inactive segment within 7 days.",
    "active",
    now
  );
  insertRec.run(
    "rec_3",
    "biz_urbanstyle",
    "sales",
    "Bundle High-Stock Hoodie + Cargo Pant to Lift AOV",
    "Average order value can expand by pairing healthy-stock apparel items.",
    "Heavyweight Studio Hoodie (32 in stock) and Tailored Technical Cargo Pant (21 in stock) have strong margin and deep inventory, while current store AOV sits around $190.50 across 8 recorded orders.",
    "Curated outfits increase units per transaction without increasing customer acquisition spend.",
    "Launch a 'Studio Uniform Set' bundle pairing the Hoodie ($79) + Cargo Pant ($118) for $179 (saving $18) and pitch the 20-unit corporate bundle to Marcus Thorne in Negotiation.",
    "Estimated +12% to +18% lift in Average Order Value on orders containing tops or bottoms (estimate).",
    "Compare AOV and units-per-order in Analytics before and 14 days after bundle launch.",
    "active",
    now
  );
}
