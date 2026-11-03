import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export interface SebaranKomponen {
  id: string;
  nama: string;
  nominal: number;
}

export const DEFAULT_SEBARAN_KOMPONEN: SebaranKomponen[] = [
  { id: 'seragam', nama: 'Seragam & Atribut Madrasah', nominal: 1250000 },
  { id: 'sarpras', nama: 'Sarana Prasarana / Gedung', nominal: 1450000 },
  { id: 'kitab', nama: 'Kitab Kuning & Modul Belajar', nominal: 700000 },
  { id: 'kegiatan', nama: 'MOS, Matsama & Karakter', nominal: 600000 },
  { id: 'spp1', nama: 'SPP Bulan Pertama (Juli)', nominal: 500000 }
];

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('profil_lembaga')
      .select('*')
      .eq('jenis', 'CONFIG_SEBARAN_DPP')
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      // Auto initialize default config if not found
      const newMeta = {
        komponen: DEFAULT_SEBARAN_KOMPONEN,
        updated_at: new Date().toISOString()
      };
      await supabase.from('profil_lembaga').insert([{
        jenis: 'CONFIG_SEBARAN_DPP',
        isi: 'CONFIG_SEBARAN_DPP',
        metadata: newMeta
      }]);
      return NextResponse.json({
        success: true,
        komponen: DEFAULT_SEBARAN_KOMPONEN
      }, {
        headers: { 'Cache-Control': 'no-store, max-age=0' }
      });
    }

    const meta = data.metadata || {};
    const komponen = Array.isArray(meta.komponen) && meta.komponen.length > 0 
      ? meta.komponen 
      : DEFAULT_SEBARAN_KOMPONEN;

    return NextResponse.json({
      success: true,
      komponen
    }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  } catch (error: any) {
    console.error('Fetch Sebaran DPP Config Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Gagal mengambil konfigurasi Sebaran DPP: ' + error.message,
      komponen: DEFAULT_SEBARAN_KOMPONEN
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { komponen } = body;

    if (!Array.isArray(komponen) || komponen.length === 0) {
      return NextResponse.json({ success: false, error: 'Daftar komponen sebaran DPP tidak valid' }, { status: 400 });
    }

    // Clean data
    const cleanedKomponen: SebaranKomponen[] = komponen.map((k, idx) => ({
      id: k.id || `komp_${idx}_${Date.now()}`,
      nama: String(k.nama || '').trim(),
      nominal: Number(k.nominal || 0)
    })).filter(k => k.nama.length > 0);

    const { data: existing, error: findError } = await supabase
      .from('profil_lembaga')
      .select('*')
      .eq('jenis', 'CONFIG_SEBARAN_DPP')
      .limit(1)
      .maybeSingle();

    if (findError) throw findError;

    const updatedMeta = {
      komponen: cleanedKomponen,
      updated_at: new Date().toISOString()
    };

    if (existing) {
      const { error: updateError } = await supabase
        .from('profil_lembaga')
        .update({ metadata: updatedMeta })
        .eq('id', existing.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('profil_lembaga')
        .insert([{
          jenis: 'CONFIG_SEBARAN_DPP',
          isi: 'CONFIG_SEBARAN_DPP',
          metadata: updatedMeta
        }]);

      if (insertError) throw insertError;
    }

    return NextResponse.json({
      success: true,
      message: 'Konfigurasi komponen Sebaran DPP berhasil disimpan',
      komponen: cleanedKomponen
    });
  } catch (error: any) {
    console.error('Save Sebaran DPP Config Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menyimpan konfigurasi Sebaran DPP: ' + error.message }, { status: 500 });
  }
}
