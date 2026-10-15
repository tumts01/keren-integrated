import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const DEFAULT_JALUR = [
  { id: 'inden', nama: 'Inden', aktif: true, deskripsi: 'Pendaftaran inden / kuota awal' },
  { id: 'reguler', nama: 'Reguler', aktif: true, deskripsi: 'Pendaftaran reguler umum' },
  { id: 'terpadu', nama: 'Terpadu', aktif: true, deskripsi: 'Pendaftaran terpadu madrasah' },
  { id: 'afirmasi', nama: 'Afirmasi', aktif: true, deskripsi: 'Jalur afirmasi khusus' },
  { id: 'prestasi', nama: 'Prestasi', aktif: true, deskripsi: 'Jalur prestasi akademik & non-akademik' },
  { id: 'mandiri', nama: 'Mandiri', aktif: true, deskripsi: 'Jalur mandiri' }
];

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('profil_lembaga')
      .select('*')
      .eq('jenis', 'CONFIG_SPMB')
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      // Auto initialize default config if not found
      const newMeta = {
        jalur: DEFAULT_JALUR,
        pendaftaran_buka: true,
        updated_at: new Date().toISOString()
      };
      await supabase.from('profil_lembaga').insert([{
        jenis: 'CONFIG_SPMB',
        isi: 'CONFIG_SPMB',
        metadata: newMeta
      }]);
      return NextResponse.json({
        success: true,
        jalur: DEFAULT_JALUR,
        pendaftaran_buka: true
      }, {
        headers: { 'Cache-Control': 'no-store, max-age=0' }
      });
    }

    const meta = data.metadata || {};
    const jalur = Array.isArray(meta.jalur) && meta.jalur.length > 0 ? meta.jalur : DEFAULT_JALUR;
    const pendaftaran_buka = meta.pendaftaran_buka ?? true;

    return NextResponse.json({
      success: true,
      jalur,
      pendaftaran_buka
    }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  } catch (error: any) {
    console.error('Fetch SPMB Config Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Gagal mengambil konfigurasi SPMB: ' + error.message,
      jalur: DEFAULT_JALUR,
      pendaftaran_buka: true
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { jalur, pendaftaran_buka } = body;

    if (!Array.isArray(jalur) || jalur.length === 0) {
      return NextResponse.json({ success: false, error: 'Daftar jalur pendaftaran tidak valid' }, { status: 400 });
    }

    const { data: existing, error: findError } = await supabase
      .from('profil_lembaga')
      .select('*')
      .eq('jenis', 'CONFIG_SPMB')
      .limit(1)
      .maybeSingle();

    if (findError) throw findError;

    const updatedMeta = {
      ...(existing?.metadata || {}),
      jalur,
      pendaftaran_buka: pendaftaran_buka ?? (existing?.metadata?.pendaftaran_buka ?? true),
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
          jenis: 'CONFIG_SPMB',
          isi: 'CONFIG_SPMB',
          metadata: updatedMeta
        }]);

      if (insertError) throw insertError;
    }

    return NextResponse.json({
      success: true,
      message: 'Konfigurasi jalur pendaftaran SPMB berhasil disimpan',
      jalur,
      pendaftaran_buka: updatedMeta.pendaftaran_buka
    });
  } catch (error: any) {
    console.error('Save SPMB Config Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menyimpan konfigurasi SPMB: ' + error.message }, { status: 500 });
  }
}
