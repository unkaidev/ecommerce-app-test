-- ============================================================
-- Migration 003 — products + product_variants
-- Prerequisite: 002_create_categories.sql
-- ============================================================

-- -----------------------------------------------------------
-- products
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              VARCHAR(255) NOT NULL,
  slug              VARCHAR(255) NOT NULL,
  description       TEXT,
  short_description VARCHAR(500),
  price             NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  compare_at_price  NUMERIC(12, 2) CHECK (compare_at_price IS NULL OR compare_at_price > price),
  cost_price        NUMERIC(12, 2),                       -- never exposed via public API (BR-09)
  sku               VARCHAR(100) NOT NULL,
  category_id       UUID         REFERENCES categories (id) ON DELETE SET NULL,
  is_active         BOOLEAN      NOT NULL DEFAULT true,
  is_featured       BOOLEAN      NOT NULL DEFAULT false,
  images            JSONB        NOT NULL DEFAULT '[]',   -- ordered array of URLs
  tags              JSONB        NOT NULL DEFAULT '[]',
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug
  ON products (slug)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku
  ON products (sku)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_category_id
  ON products (category_id);

CREATE INDEX IF NOT EXISTS idx_products_is_active
  ON products (is_active);

CREATE INDEX IF NOT EXISTS idx_products_is_featured
  ON products (is_featured);

-- Full-text search index (PG tsvector — catalog < 10K products per spec)
CREATE INDEX IF NOT EXISTS idx_products_fts
  ON products USING GIN (
    to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(short_description, ''))
  );

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------
-- product_variants
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_variants (
  id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id     UUID         NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  sku            VARCHAR(100) NOT NULL,
  name           VARCHAR(255) NOT NULL,
  price_override NUMERIC(12, 2) CHECK (price_override IS NULL OR price_override >= 0),
  attributes     JSONB        NOT NULL DEFAULT '{}',   -- e.g. {"color":"red","size":"M"}
  sort_order     INTEGER      NOT NULL DEFAULT 0,
  is_active      BOOLEAN      NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_sku
  ON product_variants (sku)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id
  ON product_variants (product_id);

CREATE INDEX IF NOT EXISTS idx_product_variants_is_active
  ON product_variants (is_active);

CREATE TRIGGER trg_product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
