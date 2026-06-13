-- Verve CRM Database Schema for Supabase / PostgreSQL

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if they exist (clean setup)
DROP TABLE IF EXISTS recipients CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS audiences CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- 1. Customers Table
CREATE TABLE customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    home_store TEXT NOT NULL,
    favorite_drink TEXT NOT NULL,
    frequency TEXT NOT NULL,
    time_habit TEXT NOT NULL,
    lifetime_value INTEGER NOT NULL,
    days_since_last_order INTEGER NOT NULL,
    total_orders INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Audiences (Segments) Table
CREATE TABLE audiences (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    persona TEXT NOT NULL,
    count INTEGER NOT NULL,
    filter JSONB NOT NULL,
    top_cities TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Campaigns Table
CREATE TABLE campaigns (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    goal TEXT NOT NULL,
    status TEXT NOT NULL,
    channel TEXT NOT NULL,
    audience_count INTEGER NOT NULL,
    metrics JSONB NOT NULL,
    persona TEXT NOT NULL,
    filter JSONB NOT NULL,
    funnel JSONB NOT NULL,
    failures JSONB NOT NULL,
    attributed_revenue INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Recipients (Campaign Delivery Logs) Table
CREATE TABLE recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id TEXT REFERENCES campaigns(id) ON DELETE CASCADE,
    customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL, -- 'Sent', 'Delivered', 'Opened', 'Clicked', 'Ordered', 'Failed'
    failure_reason TEXT, -- Populated only when state = 'Failed'
    order_value INTEGER, -- Value of order if purchase was completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for performance on foreign keys and search paths
CREATE INDEX idx_recipients_campaign_id ON recipients(campaign_id);
CREATE INDEX idx_recipients_customer_id ON recipients(customer_id);
CREATE INDEX idx_recipients_state ON recipients(state);
CREATE INDEX idx_customers_city ON customers(city);
CREATE INDEX idx_customers_frequency ON customers(frequency);
