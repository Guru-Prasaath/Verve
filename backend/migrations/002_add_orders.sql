-- Adds the orders table: individual purchases as first-class records.
-- The customer aggregate columns (lifetime_value, total_orders,
-- days_since_last_order) are DERIVED from these rows at seed/ingest time, so they
-- are provable rather than invented. A campaign-driven purchase writes a row here
-- with campaign_id set — the literal "this order came because of this
-- communication" attribution link the brief asks us to surface.
-- Safe + non-destructive: run once in the Supabase SQL editor on an existing DB.
-- (Fresh setups get this automatically from schema.sql.) After running, re-run
-- `npm run seed` to backfill order history for the seeded customers.

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    drink TEXT NOT NULL,
    store TEXT NOT NULL,
    ordered_at TIMESTAMP WITH TIME ZONE NOT NULL,
    campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_campaign_id ON orders(campaign_id);
CREATE INDEX IF NOT EXISTS idx_orders_ordered_at ON orders(ordered_at);
