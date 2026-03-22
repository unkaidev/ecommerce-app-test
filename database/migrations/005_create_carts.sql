-- ============================================================
-- Migration 005 — carts + cart_items
-- Prerequisite: 001_create_users.sql, 003_create_products.sql
-- ============================================================

-- -----------------------------------------------------------
-- carts
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS carts (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        REFERENCES users (id) ON DELETE CASCADE,
  session_id  VARCHAR(255),
  coupon_code VARCHAR(50),
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A user should have at most one active cart
CREATE UNIQUE INDEX IF NOT EXISTS idx_carts_user_id
  ON carts (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_carts_session_id
  ON carts (session_id)
  WHERE session_id IS NOT NULL;

CREATE TRIGGER trg_carts_updated_at
  BEFORE UPDATE ON carts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------
-- cart_items
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS cart_items (
  id         UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id    UUID           NOT NULL REFERENCES carts (id) ON DELETE CASCADE,
  variant_id UUID           NOT NULL REFERENCES product_variants (id) ON DELETE CASCADE,
  quantity   INTEGER        NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  notes      TEXT,
  created_at TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Unique constraint: one row per (cart, variant) — used for upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_cart_variant
  ON cart_items (cart_id, variant_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id
  ON cart_items (cart_id);

CREATE TRIGGER trg_cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
