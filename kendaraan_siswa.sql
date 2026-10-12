-- Jalankan SQL ini di Supabase SQL Editor

CREATE TABLE IF NOT EXISTS kendaraan_siswa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  nis text NOT NULL,
  nama text NOT NULL,
  kelas text NOT NULL,
  plat_nomor text NOT NULL,
  merk_motor text,
  warna_motor text,
  izin_ortu boolean DEFAULT true,
  keterangan text,
  diinput_oleh text,
  CONSTRAINT uq_kendaraan_siswa_nis UNIQUE (nis)
);

CREATE INDEX IF NOT EXISTS idx_kendaraan_siswa_nis ON kendaraan_siswa(nis);
CREATE INDEX IF NOT EXISTS idx_kendaraan_siswa_kelas ON kendaraan_siswa(kelas);
CREATE INDEX IF NOT EXISTS idx_kendaraan_siswa_plat ON kendaraan_siswa(plat_nomor);

-- Enable Row Level Security (RLS) & Policies
ALTER TABLE kendaraan_siswa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all actions for anon" ON kendaraan_siswa
  FOR ALL
  USING (true)
  WITH CHECK (true);
