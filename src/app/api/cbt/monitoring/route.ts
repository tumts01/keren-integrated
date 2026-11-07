import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const DURASI_MENIT = 90;
const MAX_LOLOS_SELEKSI = 30;

function normalizeCbtCabang(raw: string): string {
  const clean = (raw || '').trim().replace(/_FINAL$/i, '');
  const cLow = clean.toLowerCase();
  if (cLow.includes('matematika') || cLow === 'mtk') return 'Matematika';
  if (cLow.includes('ipas') || cLow.includes('ipa')) return 'IPAS';
  if (cLow.includes('pai') || cLow.includes('agama')) return 'PAI';
  if (cLow.includes('inggris') || cLow.includes('english')) return 'Inggris';
  if (cLow.includes('arab')) return 'Arab';
  return clean;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cabangFilter = searchParams.get('cabang');
    const statusFilter = searchParams.get('status');
    const tahap = searchParams.get('tahap') === 'final' ? 'final' : 'seleksi';
    const search = (searchParams.get('q') || '').trim().toLowerCase();

    // 1. Ambil data soal untuk mengetahui total soal per cabang lomba
    const { data: soalData, error: errSoal } = await supabase
      .from('cbt_soal')
      .select('cabang_lomba, nomor_soal')
      .range(0, 4999);
    if (errSoal) console.warn('Gagal ambil soal:', errSoal);

    const soalCountMap: Record<string, number> = {};
    (soalData || []).forEach((s: any) => {
      const c = (s.cabang_lomba || '').trim();
      soalCountMap[c] = (soalCountMap[c] || 0) + 1;
    });

    // 2. Ambil data sesi CBT
    const { data: sesiData, error: errSesi } = await supabase
      .from('cbt_sesi')
      .select('*')
      .range(0, 4999);
    if (errSesi && errSesi.code !== '42P01') throw errSesi;

    const sesiSeleksiMap: Record<string, any> = {};
    const sesiFinalMap: Record<string, any> = {};
    (sesiData || []).forEach((sesi: any) => {
      const no = (sesi.nomor_peserta || '').trim();
      if (!no) return;
      if (no.endsWith('_FINAL')) {
        const baseNo = no.replace(/_FINAL$/i, '');
        sesiFinalMap[baseNo] = sesi;
      } else {
        sesiSeleksiMap[no] = sesi;
      }
    });

    // Hitung cutoff Top 30 Babak Seleksi per cabang lomba
    const scoresByCabang: Record<string, number[]> = {};
    Object.values(sesiSeleksiMap).forEach((s: any) => {
      const c = normalizeCbtCabang(s.cabang_lomba || '');
      if (s.nilai_akhir !== null && s.nilai_akhir !== undefined && Number(s.nilai_akhir) > 0) {
        if (!scoresByCabang[c]) scoresByCabang[c] = [];
        scoresByCabang[c].push(Number(s.nilai_akhir));
      }
    });

    const cutoffMap: Record<string, number> = {};
    Object.entries(scoresByCabang).forEach(([c, arr]) => {
      arr.sort((a, b) => b - a);
      cutoffMap[c] = arr[Math.min(MAX_LOLOS_SELEKSI - 1, arr.length - 1)];
    });

    // 3. Ambil data peserta akademik dari data_olimpiade_seni
    const { data: pesertaData, error: errPeserta } = await supabase
      .from('data_olimpiade_seni')
      .select('id, jenis_pendaftaran, metadata')
      .range(0, 4999);
    if (errPeserta) throw errPeserta;

    const list: any[] = [];
    const now = Date.now();

    (pesertaData || []).forEach((row: any) => {
      const meta = row.metadata || {};
      const jenis = (row.jenis_pendaftaran || '').toLowerCase();
      if (jenis !== 'individu' && jenis !== 'peserta_kolektif') return;

      const kategori = (meta.KATEGORI || '').toLowerCase();
      const rawCabang = (meta.LOMBA_DIPILIH || meta['LOMBA YANG DIPILIH'] || '').trim();
      const cabang = normalizeCbtCabang(rawCabang);

      // Pastikan peserta ini peserta akademik (CBT)
      const isAkademik = kategori.includes('akademik') || ['Matematika', 'IPAS', 'PAI', 'Inggris', 'Arab'].includes(cabang);
      if (!isAkademik) return;

      const nomorPeserta = (meta.NOMOR_PESERTA || '').trim();
      const nama = meta.NAMA || meta.NAMA_REGU || 'Tanpa Nama';
      const asalSekolah = meta.ASAL_SEKOLAH || '-';

      const sesiSeleksi = sesiSeleksiMap[nomorPeserta] || null;
      const nilaiSeleksiNum = sesiSeleksi && sesiSeleksi.nilai_akhir !== null && sesiSeleksi.nilai_akhir !== undefined
        ? Number(sesiSeleksi.nilai_akhir)
        : null;
      const cutoff = cutoffMap[cabang];
      const isLolosSeleksi = meta.LOLOS_FINAL === true || (
        nilaiSeleksiNum !== null &&
        nilaiSeleksiNum > 0 &&
        cutoff !== undefined &&
        nilaiSeleksiNum >= cutoff
      );

      // Jika memantau Babak Final, hanya tampilkan peserta yang Lolos Seleksi (Finalis) atau sudah punya sesi Final
      if (tahap === 'final' && !isLolosSeleksi && !sesiFinalMap[nomorPeserta]) {
        return;
      }

      const sesi = tahap === 'final' ? (sesiFinalMap[nomorPeserta] || null) : sesiSeleksi;
      const targetSoalKey = tahap === 'final' ? `${cabang}_FINAL` : cabang;

      let status = 'belum_mulai';
      let terjawab = 0;
      let totalSoal = soalCountMap[targetSoalKey] || soalCountMap[cabang] || 40;
      let sisaWaktuDetik: number | null = null;
      let durasiMenitPengerjaan: number | null = null;

      if (sesi) {
        status = sesi.status === 'selesai' ? 'selesai' : 'sedang_mengerjakan';
        const jawabanMap = sesi.jawaban_tersimpan || {};
        terjawab = Object.values(jawabanMap).filter((v: any) => v && String(v).trim() !== '').length;

        if (sesi.waktu_mulai) {
          const startTime = new Date(sesi.waktu_mulai).getTime();
          if (status === 'sedang_mengerjakan') {
            const endTime = startTime + DURASI_MENIT * 60 * 1000;
            sisaWaktuDetik = Math.max(0, Math.floor((endTime - now) / 1000));
            durasiMenitPengerjaan = Math.floor((now - startTime) / 60000);
          } else if (sesi.waktu_selesai) {
            const endTime = new Date(sesi.waktu_selesai).getTime();
            durasiMenitPengerjaan = Math.max(0, Math.floor((endTime - startTime) / 60000));
          }
        }
      }

      const logKecurangan = Array.isArray(sesi?.log_kecurangan) ? sesi.log_kecurangan : [];

      list.push({
        id: row.id,
        nomor_peserta: nomorPeserta,
        nama,
        asal_sekolah: asalSekolah,
        cabang_lomba: cabang,
        username_cbt: meta.USERNAME_CBT || '',
        password_cbt: meta.PASSWORD_CBT || '',
        no_wa: meta.NO_WA || '',
        status,
        terjawab,
        total_soal: totalSoal,
        nilai_akhir: sesi && sesi.nilai_akhir !== null && sesi.nilai_akhir !== undefined ? Number(sesi.nilai_akhir).toFixed(1) : null,
        nilai_seleksi: nilaiSeleksiNum !== null ? nilaiSeleksiNum.toFixed(1) : null,
        lolos_seleksi: isLolosSeleksi,
        waktu_mulai: sesi?.waktu_mulai || null,
        waktu_selesai: sesi?.waktu_selesai || null,
        sisa_waktu_detik: sisaWaktuDetik,
        durasi_menit: durasiMenitPengerjaan,
        log_kecurangan: logKecurangan,
        jumlah_pelanggaran: logKecurangan.length
      });
    });

    // Urutkan: Sedang mengerjakan di atas, lalu Selesai, lalu Belum Mulai
    list.sort((a, b) => {
      const priority: Record<string, number> = { sedang_mengerjakan: 1, selesai: 2, belum_mulai: 3 };
      if (priority[a.status] !== priority[b.status]) {
        return priority[a.status] - priority[b.status];
      }
      return a.nama.localeCompare(b.nama, 'id');
    });

    // Hitung ringkasan statistik
    const summary = {
      total_peserta: list.length,
      belum_mulai: list.filter(p => p.status === 'belum_mulai').length,
      sedang_mengerjakan: list.filter(p => p.status === 'sedang_mengerjakan').length,
      selesai: list.filter(p => p.status === 'selesai').length,
      ada_pelanggaran: list.filter(p => p.jumlah_pelanggaran > 0).length
    };

    // Filter jika ada parameter query
    let filtered = list;
    if (cabangFilter && cabangFilter !== 'Semua') {
      filtered = filtered.filter(p => p.cabang_lomba === cabangFilter);
    }
    if (statusFilter && statusFilter !== 'Semua') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }
    if (search) {
      filtered = filtered.filter(p =>
        p.nama.toLowerCase().includes(search) ||
        p.nomor_peserta.toLowerCase().includes(search) ||
        p.asal_sekolah.toLowerCase().includes(search) ||
        p.username_cbt.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      success: true,
      tahap,
      summary,
      total_filtered: filtered.length,
      data: filtered
    });

  } catch (error: any) {
    console.error('Error GET monitoring CBT:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, nomorPeserta, tahap, cabang } = body;
    const isFinalTahap = tahap === 'final';

    // 0. Reset Massal Semua Sesi (Hapus data simulasi atau reset 1 babak)
    if (action === 'reset_all_sesi') {
      const { data: allSesi, error: errFetch } = await supabase
        .from('cbt_sesi')
        .select('id, nomor_peserta, cabang_lomba');
      if (errFetch) throw errFetch;

      const idsToDelete: number[] = [];
      (allSesi || []).forEach((s: any) => {
        const no = (s.nomor_peserta || '').trim();
        const isRowFinal = no.endsWith('_FINAL');
        if (isFinalTahap !== isRowFinal) return;

        if (cabang && cabang !== 'Semua') {
          const normCabang = normalizeCbtCabang(s.cabang_lomba || '');
          if (normCabang !== cabang) return;
        }
        idsToDelete.push(s.id);
      });

      if (idsToDelete.length > 0) {
        const { error: errDel } = await supabase
          .from('cbt_sesi')
          .delete()
          .in('id', idsToDelete);
        if (errDel) throw errDel;
      }

      const labelTahap = isFinalTahap ? 'Babak Final' : 'Babak Seleksi';
      const labelCabang = cabang && cabang !== 'Semua' ? ` cabang ${cabang}` : '';
      return NextResponse.json({
        success: true,
        deletedCount: idsToDelete.length,
        message: `${idsToDelete.length} sesi pengerjaan CBT (${labelTahap}${labelCabang}) berhasil dihapus/direset.`
      });
    }

    if (!nomorPeserta) {
      return NextResponse.json({ success: false, error: 'Nomor peserta wajib diisi' }, { status: 400 });
    }

    const baseNomor = nomorPeserta.trim().replace(/_FINAL$/i, '');
    const cleanNomor = isFinalTahap ? `${baseNomor}_FINAL` : baseNomor;

    // 1. Reset Sesi Total (hapus record sesi sehingga peserta mulai dari awal)
    if (action === 'reset_sesi_full') {
      const { error } = await supabase
        .from('cbt_sesi')
        .delete()
        .eq('nomor_peserta', cleanNomor);

      if (error) throw error;
      return NextResponse.json({
        success: true,
        message: `Sesi peserta ${baseNomor} (${isFinalTahap ? 'Babak Final' : 'Babak Seleksi'}) berhasil direset penuh. Peserta dapat memulai ujian dari awal.`
      });
    }

    // 2. Buka Kunci Sesi / Re-open Sesi (Kembalikan dari selesai ke berjalan, jawaban tetap tersimpan & reset pelanggaran lama)
    else if (action === 'reopen_sesi') {
      const { data: sesiRows, error: errFind } = await supabase
        .from('cbt_sesi')
        .select('*')
        .eq('nomor_peserta', cleanNomor)
        .order('id', { ascending: true })
        .limit(1);

      const sesi = sesiRows?.[0] || null;
      if (errFind || !sesi) {
        return NextResponse.json({ success: false, error: 'Sesi peserta tidak ditemukan' }, { status: 404 });
      }

      const now = Date.now();
      const startTime = sesi.waktu_mulai ? new Date(sesi.waktu_mulai).getTime() : now;
      const finishedTime = sesi.waktu_selesai ? new Date(sesi.waktu_selesai).getTime() : now;
      // Hitung durasi yang benar-benar sudah terpakai sebelum sesi tertutup, dan jamin minimal sisa 30 menit
      const usedMs = Math.max(0, finishedTime - startTime);
      const maxUsedMs = (DURASI_MENIT - 30) * 60 * 1000; // maksimal terpakai 60 menit -> sisa minimal 30 menit
      const adjustedUsedMs = Math.min(usedMs, maxUsedMs);
      const newStartTime = new Date(now - adjustedUsedMs).toISOString();

      const { error } = await supabase
        .from('cbt_sesi')
        .update({
          status: 'berjalan',
          waktu_selesai: null,
          waktu_mulai: newStartTime,
          nilai_akhir: null,
          log_kecurangan: [],
          updated_at: new Date(now).toISOString()
        })
        .eq('id', sesi.id);

      if (error) throw error;
      return NextResponse.json({
        success: true,
        message: `Sesi ${baseNomor} berhasil dibuka kembali (pelanggaran direset ke 0 & sisa waktu disesuaikan). Jawaban yang tersimpan tetap utuh dan peserta dapat melanjutkan ujian.`
      });
    }

    // 3. Reset Pelanggaran (Hapus log kecurangan menjadi 0)
    else if (action === 'reset_pelanggaran') {
      const { error } = await supabase
        .from('cbt_sesi')
        .update({
          log_kecurangan: [],
          updated_at: new Date().toISOString()
        })
        .eq('nomor_peserta', cleanNomor);

      if (error) throw error;
      return NextResponse.json({
        success: true,
        message: `Riwayat peringatan/pelanggaran peserta ${baseNomor} telah direset menjadi 0.`
      });
    }

    // 4. Tambah Durasi Waktu Ujian (misal +15 menit atau +30 menit karena listrik padam)
    else if (action === 'tambah_waktu') {
      const menitTambahan = Number(body.menit) || 15;
      const { data: sesiRows, error: errFind } = await supabase
        .from('cbt_sesi')
        .select('*')
        .eq('nomor_peserta', cleanNomor)
        .order('id', { ascending: true })
        .limit(1);

      const sesi = sesiRows?.[0] || null;
      if (errFind || !sesi) {
        return NextResponse.json({ success: false, error: 'Sesi peserta tidak ditemukan' }, { status: 404 });
      }

      const curStart = sesi.waktu_mulai ? new Date(sesi.waktu_mulai).getTime() : Date.now();
      const adjustedStartTime = new Date(curStart + menitTambahan * 60 * 1000).toISOString();

      const { error } = await supabase
        .from('cbt_sesi')
        .update({
          waktu_mulai: adjustedStartTime,
          updated_at: new Date().toISOString()
        })
        .eq('id', sesi.id);

      if (error) throw error;
      return NextResponse.json({
        success: true,
        message: `Waktu pengerjaan peserta ${baseNomor} berhasil ditambah +${menitTambahan} menit.`
      });
    }

    // 5. Force Submit (Pengawas mengakhiri ujian peserta secara manual)
    else if (action === 'force_submit') {
      const { data: sesiRows, error: errFind } = await supabase
        .from('cbt_sesi')
        .select('*')
        .eq('nomor_peserta', cleanNomor)
        .order('id', { ascending: true })
        .limit(1);

      const sesi = sesiRows?.[0] || null;
      if (errFind || !sesi) {
        return NextResponse.json({ success: false, error: 'Sesi peserta tidak ditemukan' }, { status: 404 });
      }

      // Hitung skor berdasarkan kunci jawaban
      const { data: soalList } = await supabase
        .from('cbt_soal')
        .select('nomor_soal, kunci_jawaban')
        .eq('cabang_lomba', sesi.cabang_lomba);

      let totalBenar = 0;
      let totalSalah = 0;
      const totalSoal = soalList?.length || 0;

      if (soalList && totalSoal > 0) {
        soalList.forEach(soal => {
          const jawabanUser = sesi.jawaban_tersimpan?.[soal.nomor_soal.toString()];
          if (jawabanUser && jawabanUser !== '') {
            if (jawabanUser === soal.kunci_jawaban) totalBenar++;
            else totalSalah++;
          }
        });
      }

      const skorMentah = (totalBenar * 4) + (totalSalah * -1);
      const skorMax = totalSoal * 4;
      const nilaiAkhir = skorMax > 0 ? (skorMentah / skorMax) * 100 : 0;

      const { error } = await supabase
        .from('cbt_sesi')
        .update({
          status: 'selesai',
          waktu_selesai: new Date().toISOString(),
          nilai_akhir: nilaiAkhir,
          updated_at: new Date().toISOString()
        })
        .eq('nomor_peserta', cleanNomor);

      if (error) throw error;
      return NextResponse.json({
        success: true,
        message: `Ujian peserta ${baseNomor} berhasil diakhiri secara manual oleh pengawas. Nilai akhir: ${nilaiAkhir.toFixed(1)}`
      });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak valid' }, { status: 400 });

  } catch (error: any) {
    console.error('Error POST monitoring CBT:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
