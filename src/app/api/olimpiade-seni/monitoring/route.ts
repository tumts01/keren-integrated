import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const MAX_LOLOS_SELEKSI = 30;

const CABANG_AKADEMIK = ['Matematika', 'IPAS', 'PAI', 'Bahasa Inggris', 'Bahasa Arab'];
const CABANG_SENI = ['Singer Solo', 'Al Banjari', 'SMS'];

function getDurationMs(waktuMulai?: string | null, waktuSelesai?: string | null): number {
  if (!waktuMulai || !waktuSelesai) return Infinity;
  const diff = new Date(waktuSelesai).getTime() - new Date(waktuMulai).getTime();
  return Number.isFinite(diff) && diff >= 0 ? diff : Infinity;
}

function getFinishMs(waktuSelesai?: string | null): number {
  if (!waktuSelesai) return Infinity;
  const t = new Date(waktuSelesai).getTime();
  return Number.isFinite(t) ? t : Infinity;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cabangLomba = searchParams.get('cabangLomba');
    const tahap = searchParams.get('tahap') === 'final' ? 'final' : 'seleksi';

    // Ambil data nilai JURI (untuk Cabang Seni yang langsung Final)
    const { data: nilaiData, error: errNilai } = await supabase
      .from('olimpiade_nilai')
      .select('peserta_id, juri_id, nilai, olimpiade_juri(nama_juri)')
      .range(0, 4999);

    if (errNilai) throw errNilai;

    // Ambil data nilai CBT (termasuk sesi Seleksi dan sesi _FINAL)
    const { data: cbtData, error: errCbt } = await supabase
      .from('cbt_sesi')
      .select('nomor_peserta, cabang_lomba, nilai_akhir, log_kecurangan, waktu_mulai, waktu_selesai, status')
      .range(0, 4999);
      
    if (errCbt && errCbt.code !== '42P01') {
      console.warn('CBT Table error or missing', errCbt);
    }

    const cbtSeleksiMap: Record<string, any> = {};
    const cbtFinalMap: Record<string, any> = {};
    (cbtData || []).forEach((c: any) => {
      const no = (c.nomor_peserta || '').trim();
      if (!no || no.startsWith('BYPASS-')) return;
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
      .select('id, jenis_pendaftaran, metadata')
      .range(0, 4999);

    if (errAll) throw errAll;

    const pesertaList: any[] = [];
    (allData || []).forEach(row => {
      const meta = row.metadata || {};
      const nomorPeserta = (meta.NOMOR_PESERTA || '').trim();

      // Kecualikan akun bypass/trial panitia dari klasemen Live Score & kuota Top 30
      if (meta.IS_BYPASS === true || nomorPeserta.startsWith('BYPASS-')) return;
      
      if (row.jenis_pendaftaran?.toLowerCase() === 'individu' || row.jenis_pendaftaran?.toLowerCase() === 'peserta_kolektif') {
        let cabang = (meta.LOMBA_DIPILIH || meta['LOMBA YANG DIPILIH'] || '').toString().trim();
        
        // Normalisasi nama cabang lomba agar tidak ada duplikasi kategori
        const l = cabang.toLowerCase();
        if (l.includes('matematika') || l === 'mtk') cabang = 'Matematika';
        else if (l.includes('ipas') || l === 'ipa' || l.includes('ipa')) cabang = 'IPAS';
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
            nomor_peserta: nomorPeserta,
            nama: meta.NAMA || meta.NAMA_REGU || 'Tanpa Nama',
            asal_sekolah: meta.ASAL_SEKOLAH,
            cabang_lomba: cabang,
            kategori_lomba: isAkademik ? 'akademik' : 'seni',
            lolos_manual: meta.LOLOS_FINAL === true
          });
        }
      }
    });

    // Tentukan tepat maksimal 30 peserta terbaik (Lolos Seleksi) per cabang mapel Akademik
    // Urutan penentu: 1) Nilai Seleksi tertinggi (>0), 2) Durasi pengerjaan tercepat, 3) Waktu selesai lebih awal, 4) Nomor peserta
    const candidatesByCabang: Record<string, any[]> = {};
    pesertaList.forEach(p => {
      if (p.kategori_lomba !== 'akademik') return;
      const s = cbtSeleksiMap[p.nomor_peserta];
      const nilai = s && s.nilai_akhir !== null && s.nilai_akhir !== undefined ? Number(s.nilai_akhir) : 0;
      if (nilai > 0 || p.lolos_manual) {
        if (!candidatesByCabang[p.cabang_lomba]) candidatesByCabang[p.cabang_lomba] = [];
        candidatesByCabang[p.cabang_lomba].push({
          nomor_peserta: p.nomor_peserta,
          nilai,
          durasiMs: getDurationMs(s?.waktu_mulai, s?.waktu_selesai),
          finishMs: getFinishMs(s?.waktu_selesai),
          lolos_manual: p.lolos_manual
        });
      }
    });

    const top30RankMap: Record<string, number> = {};
    Object.values(candidatesByCabang).forEach(arr => {
      arr.sort((a, b) => {
        if (b.nilai !== a.nilai) return b.nilai - a.nilai;
        if (a.durasiMs !== b.durasiMs) return a.durasiMs - b.durasiMs;
        if (a.finishMs !== b.finishMs) return a.finishMs - b.finishMs;
        return a.nomor_peserta.localeCompare(b.nomor_peserta);
      });
      arr.slice(0, MAX_LOLOS_SELEKSI).forEach((item, idx) => {
        top30RankMap[item.nomor_peserta] = idx + 1;
      });
    });

    // Gabungkan nilai per peserta sesuai tahapan ('seleksi' vs 'final')
    const rawResult = pesertaList.map(p => {
      const sesiSeleksi = cbtSeleksiMap[p.nomor_peserta] || null;
      const sesiFinal = cbtFinalMap[p.nomor_peserta] || null;

      const nilaiSeleksi = sesiSeleksi && sesiSeleksi.nilai_akhir !== null && sesiSeleksi.nilai_akhir !== undefined
        ? Number(sesiSeleksi.nilai_akhir)
        : 0;
      const peringkatSeleksi = top30RankMap[p.nomor_peserta] || null;
      const lolosSeleksi = p.kategori_lomba === 'akademik'
        ? peringkatSeleksi !== null
        : true; // Cabang Seni langsung Final

      if (p.kategori_lomba === 'akademik') {
        const targetSesi = tahap === 'final' ? sesiFinal : sesiSeleksi;
        const nilaiTarget = targetSesi && targetSesi.nilai_akhir !== null && targetSesi.nilai_akhir !== undefined
          ? Number(targetSesi.nilai_akhir).toFixed(2)
          : 0;

        return {
          ...p,
          lolos_seleksi: lolosSeleksi,
          peringkat_seleksi: peringkatSeleksi,
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
        peringkat_seleksi: null,
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

    // Tampilkan hanya 30 peserta yang lolos di setiap cabang mapel Akademik (baik pada tab Seleksi maupun Final)
    const filteredByStage = rawResult.filter(item => {
      if (tahap === 'seleksi') {
        return item.kategori_lomba === 'akademik' && item.lolos_seleksi;
      } else {
        if (item.kategori_lomba === 'seni') return true;
        return item.lolos_seleksi;
      }
    });

    // Urutkan dari tertinggi ke terendah (tie-breaker: durasi pengerjaan lebih cepat, lalu waktu selesai lebih awal)
    filteredByStage.sort((a, b) => {
      const diff = Number(b.rata_rata) - Number(a.rata_rata);
      if (diff !== 0) return diff;
      const durA = getDurationMs(a.waktu_mulai, a.waktu_selesai);
      const durB = getDurationMs(b.waktu_mulai, b.waktu_selesai);
      if (durA !== durB) return durA - durB;
      const finA = getFinishMs(a.waktu_selesai);
      const finB = getFinishMs(b.waktu_selesai);
      if (finA !== finB) return finA - finB;
      return (a.nomor_peserta || '').localeCompare(b.nomor_peserta || '');
    });

    const cabangList = tahap === 'seleksi'
      ? [...CABANG_AKADEMIK]
      : [...CABANG_AKADEMIK, ...CABANG_SENI];

    return NextResponse.json({
      success: true,
      tahap,
      cabang_list: cabangList,
      data: filteredByStage
    });
  } catch (err: any) {
    console.error('Error GET monitoring:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
