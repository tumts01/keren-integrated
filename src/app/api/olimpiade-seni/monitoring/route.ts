import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cabangLomba = searchParams.get('cabangLomba');

    // Ambil data nilai JURI
    const { data: nilaiData, error: errNilai } = await supabase
      .from('olimpiade_nilai')
      .select('peserta_id, juri_id, nilai, olimpiade_juri(nama_juri)');

    if (errNilai) throw errNilai;

    // Ambil data nilai CBT (including cheat logs)
    const { data: cbtData, error: errCbt } = await supabase
      .from('cbt_sesi')
      .select('nomor_peserta, nilai_akhir, log_kecurangan');
      
    if (errCbt && errCbt.code !== '42P01') { // Ignore relation doesn't exist just in case
      console.warn('CBT Table error or missing', errCbt);
    }

    // Ambil data peserta lunas
    const { data: allData, error: errAll } = await supabase
      .from('data_olimpiade_seni')
      .select('id, jenis_pendaftaran, metadata');

    if (errAll) throw errAll;

    let pesertaList: any[] = [];
    allData.forEach(row => {
      const meta = row.metadata || {};
      
      // Untuk Akademik, bebas bayar. Untuk Seni, kita tidak filter Valid karena form tidak menyimpannya otomatis sebagai Valid, tapi ada field lain atau asumsikan sudah bayar.
      // Wait, let's just include all for now to avoid participants missing in monitoring if they haven't been manually validated, or we can check if it's Lomba Seni and valid.
      // But for CBT, they don't have status pembayaran. So we include them.
      
      if (row.jenis_pendaftaran?.toLowerCase() === 'individu') {
        let cabang = meta.LOMBA_DIPILIH || '';
        
        // Normalisasi nama cabang lomba agar tidak ada duplikasi kategori
        const l = cabang.toLowerCase();
        if (l.includes('matematika')) cabang = 'Matematika';
        else if (l.includes('ipas') || l.includes('ipa')) cabang = 'IPAS';
        else if (l.includes('pai') || l.includes('agama')) cabang = 'PAI';
        else if (l.includes('inggris') || l.includes('english')) cabang = 'Bahasa Inggris';
        else if (l.includes('arab')) cabang = 'Bahasa Arab';
        else if (l.includes('singer') || l.includes('solo')) cabang = 'Singer Solo';
        else if (l.includes('banjari')) cabang = 'Al Banjari';
        else if (l.includes('sandi') || l.includes('morse') || l.includes('sms')) cabang = 'SMS';

        if (!cabangLomba || cabang === cabangLomba || meta.KATEGORI?.includes(cabangLomba)) {
          pesertaList.push({
            id: row.id,
            nomor_peserta: meta.NOMOR_PESERTA || '',
            nama: meta.NAMA || meta.NAMA_REGU || 'Tanpa Nama',
            asal_sekolah: meta.ASAL_SEKOLAH,
            cabang_lomba: cabang
          });
        }
      }
    });

    // Gabungkan nilai per peserta (Bisa dari Juri atau dari CBT)
    const result = pesertaList.map(p => {
      // Cek CBT
      const cbtSesi = (cbtData || []).find(c => c.nomor_peserta === p.nomor_peserta);
      if (cbtSesi && cbtSesi.nilai_akhir !== null) {
        return {
          ...p,
          rata_rata: Number(cbtSesi.nilai_akhir).toFixed(2),
          jumlah_juri: 1,
          detail_nilai: [{ nilai: cbtSesi.nilai_akhir, olimpiade_juri: { nama_juri: 'Sistem CBT' } }],
          log_kecurangan: cbtSesi.log_kecurangan || []
        };
      }

      // Cek Juri
      const pNilai = (nilaiData || []).filter(n => n.peserta_id === p.id);
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
