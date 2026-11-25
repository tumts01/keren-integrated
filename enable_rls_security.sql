-- =============================================================================
-- PENGUNCIAN ROW LEVEL SECURITY (RLS) PENUH & PEMBERSIHAN POLICY PUBLIK LAMA
-- =============================================================================
-- Skrip ini melakukan 2 hal pada seluruh tabel di skema `public`:
--   1. Mengaktifkan Row Level Security (ENABLE ROW LEVEL SECURITY)
--   2. Menghapus Policy publik/anon lama ("Enable read/all access for all users")
--      yang masih menempel dari pembuatan tabel awal, sehingga akses langsung via
--      `NEXT_PUBLIC_SUPABASE_ANON_KEY` tertutup 100% di seluruh tabel, sementara
--      server Next.js (`SUPABASE_SERVICE_ROLE_KEY`) tetap berjalan normal.
-- =============================================================================

DO $$
DECLARE
  r RECORD;
  p RECORD;
BEGIN
  -- 1. Aktifkan RLS pada seluruh tabel di skema public
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;

  -- 2. Hapus seluruh policy lama pada skema public yang membuka celah akses anon/publik
  FOR p IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', p.policyname, p.tablename);
    RAISE NOTICE 'Policy lama dihapus: % pada public.%', p.policyname, p.tablename;
  END LOOP;
END $$;
