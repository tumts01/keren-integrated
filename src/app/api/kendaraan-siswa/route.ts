import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { unstable_cache, revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

const getCachedKendaraanAll = unstable_cache(
  async () => {
    const { data, error } = await supabase
      .from('kendaraan_siswa')
      .select('*')
      .order('kelas', { ascending: true })
      .order('nama', { ascending: true });

    if (error) {
      console.error('Error fetch kendaraan_siswa:', error);
      return [];
    }
    return data || [];
  },
  ['kendaraan-siswa-all'],
  { tags: ['kendaraan_siswa'], revalidate: 3600 }
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filterNis = searchParams.get('nis');

    // Jika pencarian khusus 1 siswa (misal untuk portal)
    if (filterNis) {
      const { data, error } = await supabase
        .from('kendaraan_siswa')
        .select('*')
        .eq('nis', filterNis)
        .maybeSingle();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    const allData = await getCachedKendaraanAll();

    // Rekap per kelas
    const rekapMap: Record<string, { total: number; izin: number; belumIzin: number }> = {};
    for (const item of allData) {
      const k = item.kelas || 'Lainnya';
      if (!rekapMap[k]) {
        rekapMap[k] = { total: 0, izin: 0, belumIzin: 0 };
      }
      rekapMap[k].total += 1;
      if (item.izin_ortu) {
        rekapMap[k].izin += 1;
      } else {
        rekapMap[k].belumIzin += 1;
      }
    }

    const rekapArray = Object.keys(rekapMap)
      .map(k => ({
        kelas: k,
        total: rekapMap[k].total,
        izin: rekapMap[k].izin,
        belumIzin: rekapMap[k].belumIzin
      }))
      .sort((a, b) => a.kelas.localeCompare(b.kelas, undefined, { numeric: true }));

    return NextResponse.json({
      success: true,
      data: allData,
      total: allData.length,
      rekap: rekapArray
    });
  } catch (error: any) {
    console.error('GET kendaraan error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nis, nama, kelas, plat_nomor, merk_motor, warna_motor, izin_ortu, keterangan, diinput_oleh } = body;

    if (!nis || !nama || !plat_nomor) {
      return NextResponse.json(
        { success: false, error: 'NIS, Nama Siswa, dan Plat Nomor wajib diisi!' },
        { status: 400 }
      );
    }

    const payload = {
      nis: String(nis).trim(),
      nama: String(nama).trim(),
      kelas: String(kelas || '').trim(),
      plat_nomor: String(plat_nomor).trim().toUpperCase(),
      merk_motor: merk_motor ? String(merk_motor).trim() : '',
      warna_motor: warna_motor ? String(warna_motor).trim() : '',
      izin_ortu: Boolean(izin_ortu),
      keterangan: keterangan ? String(keterangan).trim() : '',
      diinput_oleh: diinput_oleh ? String(diinput_oleh).trim() : 'Guru',
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('kendaraan_siswa')
      .upsert([payload], { onConflict: 'nis' });

    if (error) throw error;

    revalidateTag('kendaraan_siswa', {});
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('POST kendaraan error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID data diperlukan' }, { status: 400 });
    }

    const { error } = await supabase
      .from('kendaraan_siswa')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidateTag('kendaraan_siswa', {});
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE kendaraan error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
