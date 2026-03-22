-- ============================================================
-- Migration 007 — order_status_history
-- Prerequisite: 006_create_orders.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS order_status_history (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID        NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  from_status VARCHAR(20),
  to_status   VARCHAR(20) NOT NULL
                CHECK (to_status IN ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
  changed_by  UUID        REFERENCES users (id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id
  ON order_status_history (order_id);

CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at
  ON order_status_history (created_at DESC);
