-- Run this script in your Supabase SQL Editor

CREATE TABLE public.rapor_pengembalian (
    id BIGSERIAL PRIMARY KEY,
    scan_data TEXT NOT NULL,
    waktu TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.rapor_config (
    id SERIAL PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT
);

-- Insert default config values if they don't exist
INSERT INTO public.rapor_config (key, value) VALUES
('StartDate', ''),
('EndDate', '')
ON CONFLICT (key) DO NOTHING;
