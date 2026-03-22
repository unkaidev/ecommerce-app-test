-- ============================================================
-- Migration 006 — orders + order_items
-- Prerequisite: 001_create_users.sql, 003_create_products.sql
-- ============================================================

-- -----------------------------------------------------------
-- orders
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                        UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number              VARCHAR(30)    NOT NULL,
  user_id                   UUID           NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  status                    VARCHAR(20)    NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
  subtotal                  NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  discount_amount           NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tax_amount                NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  shipping_amount           NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  total                     NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
  currency                  VARCHAR(3)     NOT NULL DEFAULT 'USD',
  coupon_code               VARCHAR(50),
  shipping_address_id       UUID           REFERENCES addresses (id) ON DELETE SET NULL,
  shipping_address_snapshot JSONB          NOT NULL DEFAULT '{}',  -- immutable copy (BR-27)
  notes                     TEXT,
  created_at                TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  deleted_at                TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number
  ON orders (order_number);

CREATE INDEX IF NOT EXISTS idx_orders_user_id
  ON orders (user_id);

CREATE INDEX IF NOT EXISTS idx_orders_status
  ON orders (status);

CREATE INDEX IF NOT EXISTS idx_orders_created_at
  ON orders (created_at DESC);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------
-- order_items
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id           UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID           NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  variant_id   UUID           NOT NULL REFERENCES product_variants (id) ON DELETE RESTRICT,
  product_name VARCHAR(255)   NOT NULL,  -- snapshot at order time
  variant_name VARCHAR(255)   NOT NULL,  -- snapshot at order time
  sku          VARCHAR(100)   NOT NULL,  -- snapshot at order time
  quantity     INTEGER        NOT NULL CHECK (quantity > 0),
  unit_price   NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  total_price  NUMERIC(12, 2) NOT NULL CHECK (total_price >= 0),
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id
  ON order_items (order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_variant_id
  ON order_items (variant_id);
