-- ============================================================
-- Migration 004 — inventory
-- Prerequisite: 003_create_products.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS inventory (
  id                  UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id          UUID    NOT NULL UNIQUE REFERENCES product_variants (id) ON DELETE CASCADE,
  quantity            INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved            INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 10 CHECK (low_stock_threshold >= 0),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Computed available = quantity - reserved (must be >= 0 maintained by application)
-- Application enforces quantity >= reserved via SELECT FOR UPDATE on add-to-cart.

CREATE INDEX IF NOT EXISTS idx_inventory_variant_id
  ON inventory (variant_id);

-- Index for fast low-stock queries: WHERE quantity - reserved <= low_stock_threshold
CREATE INDEX IF NOT EXISTS idx_inventory_available
  ON inventory ((quantity - reserved));

CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
