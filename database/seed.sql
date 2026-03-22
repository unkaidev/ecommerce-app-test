-- ============================================================
-- Seed data — development / demo environment only
-- Run AFTER all migrations have been applied.
-- ============================================================

-- --------------------------------------------------------
-- Admin user  (bcrypt of "Admin@123!" with cost 12)
-- Use this hash only in dev — regenerate for staging/prod.
-- --------------------------------------------------------
INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, email_verified_at)
VALUES
  ('00000000-0000-0000-0000-000000000001',
   'admin@shopnext.dev',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewqyPRiOf6MKqOaC',  -- Admin@123!
   'Admin', 'User', 'admin', true, NOW()),
  ('00000000-0000-0000-0000-000000000002',
   'jane@example.com',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewqyPRiOf6MKqOaC',  -- Admin@123!
   'Jane', 'Doe', 'customer', true, NOW()),
  ('00000000-0000-0000-0000-000000000003',
   'bob@example.com',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewqyPRiOf6MKqOaC',  -- Admin@123!
   'Bob', 'Smith', 'customer', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------
-- Categories (2 top-level + 2 children)
-- --------------------------------------------------------
INSERT INTO categories (id, name, slug, description, parent_id, sort_order, is_active)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'Electronics', 'electronics', 'Gadgets and devices', NULL, 0, true),
  ('10000000-0000-0000-0000-000000000002', 'Clothing',    'clothing',    'Apparel and accessories', NULL, 1, true),
  ('10000000-0000-0000-0000-000000000003', 'Smartphones', 'smartphones', 'Mobile phones', '10000000-0000-0000-0000-000000000001', 0, true),
  ('10000000-0000-0000-0000-000000000004', 'T-Shirts',    't-shirts',    'Casual tees', '10000000-0000-0000-0000-000000000002', 0, true)
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------
-- Products (4 products)
-- --------------------------------------------------------
INSERT INTO products (id, name, slug, description, short_description, price, compare_at_price, sku, category_id, is_active, is_featured, images, tags)
VALUES
  ('20000000-0000-0000-0000-000000000001',
   'NexPhone Pro',
   'nexphone-pro',
   'The flagship NexPhone Pro features a 6.7" OLED display, 50MP camera, and 5000mAh battery.',
   'Flagship smartphone with pro-grade camera.',
   999.99, 1199.99, 'NEXPHONE-PRO-128',
   '10000000-0000-0000-0000-000000000003',
   true, true,
   '["https://placehold.co/800x800?text=NexPhone+Pro"]',
   '["smartphone","flagship","5G"]'),

  ('20000000-0000-0000-0000-000000000002',
   'NexPhone Lite',
   'nexphone-lite',
   'Affordable 5G smartphone with 6.1" display and long battery life.',
   'Great value 5G phone.',
   399.99, NULL, 'NEXPHONE-LITE-64',
   '10000000-0000-0000-0000-000000000003',
   true, false,
   '["https://placehold.co/800x800?text=NexPhone+Lite"]',
   '["smartphone","budget","5G"]'),

  ('20000000-0000-0000-0000-000000000003',
   'Classic Tee',
   'classic-tee',
   '100% organic cotton t-shirt. Available in multiple sizes and colors.',
   'Everyday organic cotton tee.',
   29.99, NULL, 'CLASSIC-TEE-BLK-M',
   '10000000-0000-0000-0000-000000000004',
   true, false,
   '["https://placehold.co/800x800?text=Classic+Tee"]',
   '["tshirt","organic","casual"]'),

  ('20000000-0000-0000-0000-000000000004',
   'Premium Hoodie',
   'premium-hoodie',
   'Heavyweight 400gsm fleece hoodie with kangaroo pocket and adjustable drawcord.',
   'Premium heavyweight fleece hoodie.',
   79.99, 99.99, 'PREMIUM-HOODIE-GRY-L',
   '10000000-0000-0000-0000-000000000004',
   true, true,
   '["https://placehold.co/800x800?text=Premium+Hoodie"]',
   '["hoodie","fleece","premium"]')
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------
-- Product Variants
-- --------------------------------------------------------
INSERT INTO product_variants (id, product_id, sku, name, price_override, attributes, sort_order, is_active)
VALUES
  -- NexPhone Pro variants
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'NEXPHONE-PRO-128', '128GB / Midnight Black', NULL, '{"storage":"128GB","color":"Midnight Black"}', 0, true),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'NEXPHONE-PRO-256', '256GB / Midnight Black', 1099.99, '{"storage":"256GB","color":"Midnight Black"}', 1, true),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'NEXPHONE-PRO-128-SIL', '128GB / Silver', NULL, '{"storage":"128GB","color":"Silver"}', 2, true),

  -- NexPhone Lite
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 'NEXPHONE-LITE-64', '64GB / Black', NULL, '{"storage":"64GB","color":"Black"}', 0, true),

  -- Classic Tee
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000003', 'CLASSIC-TEE-BLK-S', 'Black / S', NULL, '{"color":"Black","size":"S"}', 0, true),
  ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000003', 'CLASSIC-TEE-BLK-M', 'Black / M', NULL, '{"color":"Black","size":"M"}', 1, true),
  ('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000003', 'CLASSIC-TEE-BLK-L', 'Black / L', NULL, '{"color":"Black","size":"L"}', 2, true),

  -- Premium Hoodie
  ('30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000004', 'PREMIUM-HOODIE-GRY-M', 'Grey / M', NULL, '{"color":"Grey","size":"M"}', 0, true),
  ('30000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000004', 'PREMIUM-HOODIE-GRY-L', 'Grey / L', NULL, '{"color":"Grey","size":"L"}', 1, true)
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------
-- Inventory (initial stock per variant)
-- --------------------------------------------------------
INSERT INTO inventory (id, variant_id, quantity, reserved, low_stock_threshold)
VALUES
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 50,  2,  10),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 25,  0,  5),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 30,  1,  10),
  ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000004', 100, 5,  20),
  ('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000005', 200, 0,  30),
  ('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000006', 200, 3,  30),
  ('40000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000007', 150, 1,  30),
  ('40000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000008', 75,  2,  15),
  ('40000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000009', 8,   3,  10)  -- intentionally low stock
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------
-- Sample addresses for Jane
-- --------------------------------------------------------
INSERT INTO addresses (id, user_id, type, first_name, last_name, line1, city, state, postal_code, country, is_default)
VALUES
  ('50000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000002',
   'shipping', 'Jane', 'Doe', '123 Main St', 'Springfield', 'IL', '62701', 'US', true)
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------
-- Sample delivered order for Jane
-- --------------------------------------------------------
INSERT INTO orders (id, order_number, user_id, status, subtotal, discount_amount, tax_amount, shipping_amount, total, currency, shipping_address_id, shipping_address_snapshot)
VALUES
  ('60000000-0000-0000-0000-000000000001',
   'ORD-20240101-0001',
   '00000000-0000-0000-0000-000000000002',
   'delivered',
   999.99, 0.00, 80.00, 0.00, 1079.99, 'USD',
   '50000000-0000-0000-0000-000000000001',
   '{"firstName":"Jane","lastName":"Doe","line1":"123 Main St","city":"Springfield","state":"IL","postalCode":"62701","country":"US"}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_items (id, order_id, variant_id, product_name, variant_name, sku, quantity, unit_price, total_price)
VALUES
  ('70000000-0000-0000-0000-000000000001',
   '60000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000001',
   'NexPhone Pro', '128GB / Midnight Black', 'NEXPHONE-PRO-128', 1, 999.99, 999.99)
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_status_history (id, order_id, from_status, to_status, notes)
VALUES
  ('80000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', NULL, 'pending', 'Order placed'),
  ('80000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 'pending', 'confirmed', 'Payment confirmed'),
  ('80000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000001', 'confirmed', 'processing', 'Picking and packing'),
  ('80000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000001', 'processing', 'shipped', 'Tracking: 1Z999AA10123456784'),
  ('80000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000001', 'shipped', 'delivered', 'Delivered to front door')
ON CONFLICT (id) DO NOTHING;
