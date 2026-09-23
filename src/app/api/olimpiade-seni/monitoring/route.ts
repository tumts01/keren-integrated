import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cabangLomba = searchParams.get('cabangLomba');

    // Ambil data nilai
    const { data: nilaiData, error: errNilai } = await supabase
      .from('olimpiade_nilai')
      .select('peserta_id, juri_id, nilai, olimpiade_juri(nama_juri)');

    if (errNilai) throw errNilai;

    // Ambil data peserta lunas
    const { data: allData, error: errAll } = await supabase
      .from('data_olimpiade_seni')
      .select('id, jenis_pendaftar, metadata')
      .eq('metadata->>STATUS_PEMBAYARAN', 'Valid');

    if (errAll) throw errAll;

    let pesertaList: any[] = [];
    allData.forEach(row => {
      const meta = row.metadata || {};
      if (row.jenis_pendaftar === 'Individu') {
        const cabang = meta.LOMBA_DIPILIH || '';
        if (!cabangLomba || cabang === cabangLomba || meta.KATEGORI?.includes(cabangLomba)) {
          pesertaList.push({
            id: row.id,
            nama: meta.NAMA_LENGKAP || meta.NAMA_REGU || 'Tanpa Nama',
            asal_sekolah: meta.ASAL_SEKOLAH,
            cabang_lomba: cabang
          });
        }
      }
    });

    // Gabungkan nilai per peserta
    const result = pesertaList.map(p => {
      const pNilai = nilaiData.filter(n => n.peserta_id === p.id);
      let total = 0;
      let count = 0;
      pNilai.forEach(n => {
        total += n.nilai;
        count++;
      });
      return {
        ...p,
        rata_rata: count > 0 ? (total / count).toFixed(2) : 0,
        jumlah_juri: count,
        detail_nilai: pNilai
      };
    });

    // Urutkan dari tertinggi ke terendah
    result.sort((a, b) => Number(b.rata_rata) - Number(a.rata_rata));

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Error GET monitoring:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
