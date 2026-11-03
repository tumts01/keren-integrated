import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const MAX_LOLOS_SELEKSI = 30;

const CABANG_AKADEMIK = ['Matematika', 'IPAS', 'PAI', 'Bahasa Inggris', 'Bahasa Arab'];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cabangLomba = searchParams.get('cabangLomba');
    const tahap = searchParams.get('tahap') === 'final' ? 'final' : 'seleksi';

    // Ambil data nilai JURI (untuk Cabang Seni yang langsung Final)
    const { data: nilaiData, error: errNilai } = await supabase
      .from('olimpiade_nilai')
      .select('peserta_id, juri_id, nilai, olimpiade_juri(nama_juri)');

    if (errNilai) throw errNilai;

    // Ambil data nilai CBT (termasuk sesi Seleksi dan sesi _FINAL)
    const { data: cbtData, error: errCbt } = await supabase
      .from('cbt_sesi')
      .select('nomor_peserta, cabang_lomba, nilai_akhir, log_kecurangan, waktu_mulai, waktu_selesai, status');
      
    if (errCbt && errCbt.code !== '42P01') {
      console.warn('CBT Table error or missing', errCbt);
    }

    const cbtSeleksiMap: Record<string, any> = {};
    const cbtFinalMap: Record<string, any> = {};
    (cbtData || []).forEach((c: any) => {
      const no = (c.nomor_peserta || '').trim();
      if (!no) return;
      if (no.endsWith('_FINAL')) {
        const baseNo = no.replace(/_FINAL$/i, '');
        cbtFinalMap[baseNo] = c;
      } else {
        cbtSeleksiMap[no] = c;
      }
    });

    // Ambil data peserta dari data_olimpiade_seni
    const { data: allData, error: errAll } = await supabase
      .from('data_olimpiade_seni')
      .select('id, jenis_pendaftaran, metadata');

    if (errAll) throw errAll;

    let pesertaList: any[] = [];
    allData.forEach(row => {
      const meta = row.metadata || {};
      
      if (row.jenis_pendaftaran?.toLowerCase() === 'individu' || row.jenis_pendaftaran?.toLowerCase() === 'peserta_kolektif') {
        let cabang = meta.LOMBA_DIPILIH || meta['LOMBA YANG DIPILIH'] || '';
        
        // Normalisasi nama cabang lomba agar tidak ada duplikasi kategori
        const l = cabang.toLowerCase();
        if (l.includes('matematika') || l === 'mtk') cabang = 'Matematika';
        else if (l.includes('ipas') || l.includes('ipa')) cabang = 'IPAS';
        else if (l.includes('pai') || l.includes('agama')) cabang = 'PAI';
        else if (l.includes('inggris') || l.includes('english')) cabang = 'Bahasa Inggris';
        else if (l.includes('arab')) cabang = 'Bahasa Arab';
        else if (l.includes('singer') || l.includes('solo')) cabang = 'Singer Solo';
        else if (l.includes('banjari')) cabang = 'Al Banjari';
        else if (l.includes('sandi') || l.includes('morse') || l.includes('sms')) cabang = 'SMS';

        const isAkademik = CABANG_AKADEMIK.includes(cabang);

        if (!cabangLomba || cabang === cabangLomba || meta.KATEGORI?.includes(cabangLomba)) {
          pesertaList.push({
            id: row.id,
            nomor_peserta: (meta.NOMOR_PESERTA || '').trim(),
            nama: meta.NAMA || meta.NAMA_REGU || 'Tanpa Nama',
            asal_sekolah: meta.ASAL_SEKOLAH,
            cabang_lomba: cabang,
            kategori_lomba: isAkademik ? 'akademik' : 'seni',
            lolos_manual: meta.LOLOS_FINAL === true
          });
        }
      }
    });

    // Hitung ambang batas (cutoff) Top 30 Babak Seleksi per cabang Akademik
    const seleksiScoresByCabang: Record<string, number[]> = {};
    pesertaList.forEach(p => {
      if (p.kategori_lomba !== 'akademik') return;
      const s = cbtSeleksiMap[p.nomor_peserta];
      if (s && s.nilai_akhir !== null && s.nilai_akhir !== undefined && Number(s.nilai_akhir) > 0) {
        if (!seleksiScoresByCabang[p.cabang_lomba]) seleksiScoresByCabang[p.cabang_lomba] = [];
        seleksiScoresByCabang[p.cabang_lomba].push(Number(s.nilai_akhir));
      }
    });

    const cutoffSeleksiMap: Record<string, number> = {};
    Object.entries(seleksiScoresByCabang).forEach(([cab, scores]) => {
      scores.sort((a, b) => b - a);
      cutoffSeleksiMap[cab] = scores[Math.min(MAX_LOLOS_SELEKSI - 1, scores.length - 1)];
    });

    // Gabungkan nilai per peserta sesuai tahapan ('seleksi' vs 'final')
    const rawResult = pesertaList.map(p => {
      const sesiSeleksi = cbtSeleksiMap[p.nomor_peserta] || null;
      const sesiFinal = cbtFinalMap[p.nomor_peserta] || null;

      const nilaiSeleksi = sesiSeleksi && sesiSeleksi.nilai_akhir !== null && sesiSeleksi.nilai_akhir !== undefined
        ? Number(sesiSeleksi.nilai_akhir)
        : 0;
      const cutoff = cutoffSeleksiMap[p.cabang_lomba];
      const lolosSeleksi = p.kategori_lomba === 'akademik'
        ? (p.lolos_manual || (nilaiSeleksi > 0 && cutoff !== undefined && nilaiSeleksi >= cutoff))
        : true; // Cabang Seni langsung Final

      if (p.kategori_lomba === 'akademik') {
        const targetSesi = tahap === 'final' ? sesiFinal : sesiSeleksi;
        const nilaiTarget = targetSesi && targetSesi.nilai_akhir !== null && targetSesi.nilai_akhir !== undefined
          ? Number(targetSesi.nilai_akhir).toFixed(2)
          : 0;

        return {
          ...p,
          lolos_seleksi: lolosSeleksi,
          has_final_sesi: !!sesiFinal,
          nilai_seleksi: nilaiSeleksi > 0 ? nilaiSeleksi.toFixed(2) : 0,
          rata_rata: nilaiTarget,
          jumlah_juri: 1,
          detail_nilai: targetSesi && targetSesi.nilai_akhir !== null
            ? [{ nilai: targetSesi.nilai_akhir, olimpiade_juri: { nama_juri: tahap === 'final' ? 'CBT Final' : 'CBT Seleksi' } }]
            : [],
          log_kecurangan: targetSesi?.log_kecurangan || [],
          waktu_mulai: targetSesi?.waktu_mulai || null,
          waktu_selesai: targetSesi?.waktu_selesai || null
        };
      }

      // Cabang Seni (langsung Final dinilai oleh Juri)
      const pNilai = (nilaiData || []).filter(n => n.peserta_id === p.id);
      let total = 0;
      let count = 0;
      pNilai.forEach(n => {
        total += n.nilai;
        count++;
      });
      return {
        ...p,
        lolos_seleksi: true,
        has_final_sesi: count > 0,
        nilai_seleksi: null,
        rata_rata: count > 0 ? (total / count).toFixed(2) : 0,
        jumlah_juri: count,
        detail_nilai: pNilai,
        log_kecurangan: [],
        waktu_mulai: null,
        waktu_selesai: null
      };
    });

    // Filter peserta berdasarkan tahap:
    // - Pada tahap 'seleksi': hanya tampilkan cabang Akademik (karena Seni langsung Final)
    // - Pada tahap 'final': tampilkan cabang Seni + peserta Akademik yang Lolos Seleksi (atau sudah punya sesi Final)
    const filteredByStage = rawResult.filter(item => {
      if (tahap === 'seleksi') {
        return item.kategori_lomba === 'akademik';
      } else {
        // tahap === 'final'
        if (item.kategori_lomba === 'seni') return true;
        return item.lolos_seleksi || item.has_final_sesi;
      }
    });

    // Urutkan dari tertinggi ke terendah (tie-breaker: durasi pengerjaan lebih cepat)
    filteredByStage.sort((a, b) => {
      const diff = Number(b.rata_rata) - Number(a.rata_rata);
      if (diff !== 0) return diff;
      const durA = a.waktu_mulai && a.waktu_selesai
        ? new Date(a.waktu_selesai).getTime() - new Date(a.waktu_mulai).getTime()
        : Infinity;
      const durB = b.waktu_mulai && b.waktu_selesai
        ? new Date(b.waktu_selesai).getTime() - new Date(b.waktu_mulai).getTime()
        : Infinity;
      return durA - durB;
    });

    return NextResponse.json({ success: true, tahap, data: filteredByStage });
  } catch (err: any) {
    console.error('Error GET monitoring:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
