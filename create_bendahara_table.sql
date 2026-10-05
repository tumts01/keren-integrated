CREATE TABLE IF NOT EXISTS bendahara_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  periode TEXT UNIQUE NOT NULL DEFAULT 'active',
  columns JSONB DEFAULT '[]'::jsonb,
  data_map JSONB DEFAULT '{}'::jsonb,
  config JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO bendahara_data (periode) VALUES ('active') ON CONFLICT (periode) DO NOTHING;
