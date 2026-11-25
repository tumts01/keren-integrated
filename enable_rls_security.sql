-- =============================================================================
-- PENGUNCIAN ROW LEVEL SECURITY (RLS) PENUH UNTUK SUPABASE (keren-integrated)
-- =============================================================================
-- PENTING SEBELUM MENJALANKAN SKRIP INI DI SUPABASE SQL EDITOR:
-- Pastikan variabel environment `SUPABASE_SERVICE_ROLE_KEY` (dari Supabase Dashboard
-- -> Project Settings -> API -> service_role secret) SUDAH ditambahkan ke:
--   1. File `.env.local` (untuk pengembangan lokal)
--   2. Vercel Dashboard -> Settings -> Environment Variables (untuk produksi)
--
-- Karena seluruh akses database di aplikasi kini berjalan murni di sisi server
-- menggunakan `SUPABASE_SERVICE_ROLE_KEY` (yang otomatis melewati RLS secara resmi),
-- mengaktifkan RLS tanpa policy publik akan 100% MENUTUP akses langsung menggunakan
-- `NEXT_PUBLIC_SUPABASE_ANON_KEY` dari internet tanpa mengganggu fungsi aplikasi!
-- =============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
    RAISE NOTICE 'RLS berhasil diaktifkan pada tabel: public.%', r.tablename;
  END LOOP;
END $$;
