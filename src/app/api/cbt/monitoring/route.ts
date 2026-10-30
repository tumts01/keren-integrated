import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const DURASI_MENIT = 90;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cabangFilter = searchParams.get('cabang');
    const statusFilter = searchParams.get('status');
    const search = (searchParams.get('q') || '').trim().toLowerCase();

    // 1. Ambil data soal untuk mengetahui total soal per cabang lomba
    const { data: soalData, error: errSoal } = await supabase
      .from('cbt_soal')
      .select('cabang_lomba, nomor_soal');
    if (errSoal) console.warn('Gagal ambil soal:', errSoal);

    const soalCountMap: Record<string, number> = {};
    (soalData || []).forEach((s: any) => {
      const c = (s.cabang_lomba || '').trim();
      soalCountMap[c] = (soalCountMap[c] || 0) + 1;
    });

    // 2. Ambil data sesi CBT
    const { data: sesiData, error: errSesi } = await supabase
      .from('cbt_sesi')
      .select('*');
    if (errSesi && errSesi.code !== '42P01') throw errSesi;

    const sesiMap: Record<string, any> = {};
    (sesiData || []).forEach((sesi: any) => {
      if (sesi.nomor_peserta) {
        sesiMap[sesi.nomor_peserta.trim()] = sesi;
      }
    });

    // 3. Ambil data peserta akademik dari data_olimpiade_seni
    const { data: pesertaData, error: errPeserta } = await supabase
      .from('data_olimpiade_seni')
      .select('id, jenis_pendaftaran, metadata');
    if (errPeserta) throw errPeserta;

    const list: any[] = [];
    const now = Date.now();

    (pesertaData || []).forEach((row: any) => {
      const meta = row.metadata || {};
      const jenis = (row.jenis_pendaftaran || '').toLowerCase();
      if (jenis !== 'individu' && jenis !== 'peserta_kolektif') return;

      const kategori = (meta.KATEGORI || '').toLowerCase();
      let cabang = (meta.LOMBA_DIPILIH || meta['LOMBA YANG DIPILIH'] || '').trim();

      // Normalisasi cabang lomba akademik
      const cLow = cabang.toLowerCase();
      if (cLow.includes('matematika') || cLow === 'mtk') cabang = 'Matematika';
      else if (cLow.includes('ipas') || cLow.includes('ipa')) cabang = 'IPAS';
      else if (cLow.includes('pai') || cLow.includes('agama')) cabang = 'PAI';
      else if (cLow.includes('inggris') || cLow.includes('english')) cabang = 'Inggris';
      else if (cLow.includes('arab')) cabang = 'Arab';

      // Pastikan peserta ini peserta akademik (CBT)
      const isAkademik = kategori.includes('akademik') || ['Matematika', 'IPAS', 'PAI', 'Inggris', 'Arab'].includes(cabang);
      if (!isAkademik) return;

      const nomorPeserta = (meta.NOMOR_PESERTA || '').trim();
      const nama = meta.NAMA || meta.NAMA_REGU || 'Tanpa Nama';
      const asalSekolah = meta.ASAL_SEKOLAH || '-';

      const sesi = sesiMap[nomorPeserta] || null;
      let status = 'belum_mulai';
      let terjawab = 0;
      let totalSoal = soalCountMap[cabang] || 40;
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
    const { action, nomorPeserta } = body;

    if (!nomorPeserta) {
      return NextResponse.json({ success: false, error: 'Nomor peserta wajib diisi' }, { status: 400 });
    }

    const cleanNomor = nomorPeserta.trim();

    // 1. Reset Sesi Total (hapus record sesi sehingga peserta mulai dari awal)
    if (action === 'reset_sesi_full') {
      const { error } = await supabase
        .from('cbt_sesi')
        .delete()
        .eq('nomor_peserta', cleanNomor);

      if (error) throw error;
      return NextResponse.json({
        success: true,
        message: `Sesi peserta ${cleanNomor} berhasil direset penuh. Peserta dapat memulai ujian dari awal.`
      });
    }

    // 2. Buka Kunci Sesi / Re-open Sesi (Kembalikan dari selesai ke berjalan, jawaban tetap tersimpan)
    else if (action === 'reopen_sesi') {
      const { data: sesi, error: errFind } = await supabase
        .from('cbt_sesi')
        .select('*')
        .eq('nomor_peserta', cleanNomor)
        .single();

      if (errFind || !sesi) {
        return NextResponse.json({ success: false, error: 'Sesi peserta tidak ditemukan' }, { status: 404 });
      }

      // Berikan tambahan waktu jika waktu awal sudah habis (misal beri 30 menit sisa waktu)
      const startTime = sesi.waktu_mulai ? new Date(sesi.waktu_mulai).getTime() : Date.now();
      const endTime = startTime + DURASI_MENIT * 60 * 1000;
      const now = Date.now();

      let newStartTime = sesi.waktu_mulai;
      // Jika waktu sudah lewat atau sisa waktu < 10 menit, mundurkan waktu_mulai agar peserta mendapat sisa 30 menit
      if (endTime - now < 10 * 60 * 1000) {
        newStartTime = new Date(now - 60 * 60 * 1000).toISOString(); // 90 - 60 = sisa 30 menit
      }

      const { error } = await supabase
        .from('cbt_sesi')
        .update({
          status: 'berjalan',
          waktu_selesai: null,
          waktu_mulai: newStartTime,
          nilai_akhir: null,
          updated_at: new Date().toISOString()
        })
        .eq('nomor_peserta', cleanNomor);

      if (error) throw error;
      return NextResponse.json({
        success: true,
        message: `Sesi ${cleanNomor} berhasil dibuka kembali. Jawaban yang tersimpan tetap utuh dan peserta dapat melanjutkan ujian.`
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
        message: `Riwayat peringatan/pelanggaran peserta ${cleanNomor} telah direset menjadi 0.`
      });
    }

    // 4. Tambah Durasi Waktu Ujian (misal +15 menit atau +30 menit karena listrik padam)
    else if (action === 'tambah_waktu') {
      const menitTambahan = Number(body.menit) || 15;
      const { data: sesi, error: errFind } = await supabase
        .from('cbt_sesi')
        .select('*')
        .eq('nomor_peserta', cleanNomor)
        .single();

      if (errFind || !sesi) {
        return NextResponse.json({ success: false, error: 'Sesi peserta tidak ditemukan' }, { status: 404 });
      }

      const curStart = sesi.waktu_mulai ? new Date(sesi.waktu_mulai).getTime() : Date.now();
      // Menambah sisa waktu = memajukan waktu selesai / memundurkan waktu_mulai
      const newStart = new Date(curStart + (menitTambahan * 60 * 1000) > Date.now() ? Date.now() : curStart + (menitTambahan * 60 * 1000)).toISOString();
      // Sebenarnya jika endTime = startTime + 90m, untuk menambah endTime sebesar X menit, startTime harus ditambah X menit!
      // Mari kita pastikan rumusnya:
      // endTime_baru = (startTime + X) + 90m = endTime_lama + X menit. Betul!
      const adjustedStartTime = new Date(curStart + menitTambahan * 60 * 1000).toISOString();

      const { error } = await supabase
        .from('cbt_sesi')
        .update({
          waktu_mulai: adjustedStartTime,
          updated_at: new Date().toISOString()
        })
        .eq('nomor_peserta', cleanNomor);

      if (error) throw error;
      return NextResponse.json({
        success: true,
        message: `Waktu pengerjaan peserta ${cleanNomor} berhasil ditambah +${menitTambahan} menit.`
      });
    }

    // 5. Force Submit (Pengawas mengakhiri ujian peserta secara manual)
    else if (action === 'force_submit') {
      const { data: sesi, error: errFind } = await supabase
        .from('cbt_sesi')
        .select('*')
        .eq('nomor_peserta', cleanNomor)
        .single();

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
        message: `Ujian peserta ${cleanNomor} berhasil diakhiri secara manual oleh pengawas. Nilai akhir: ${nilaiAkhir.toFixed(1)}`
      });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak valid' }, { status: 400 });

  } catch (error: any) {
    console.error('Error POST monitoring CBT:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
