-- ============================================================
-- Migration 002 — categories
-- Prerequisite: 001_create_users.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) NOT NULL,
  description TEXT,
  parent_id   UUID         REFERENCES categories (id) ON DELETE SET NULL,
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_slug
  ON categories (slug)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_categories_parent_id
  ON categories (parent_id);

CREATE INDEX IF NOT EXISTS idx_categories_is_active
  ON categories (is_active);

CREATE INDEX IF NOT EXISTS idx_categories_sort_order
  ON categories (sort_order);

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
