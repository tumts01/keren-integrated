import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const MAX_LOLOS_SELEKSI = 30;

function normalizeCbtCabang(raw: string): string {
  const clean = (raw || '').trim().replace(/_FINAL$/i, '');
  const l = clean.toLowerCase();
  if (l.includes('matematika') || l === 'mtk') return 'Matematika';
  if (l.includes('ipas') || l.includes('ipa')) return 'IPAS';
  if (l.includes('pai') || l.includes('agama')) return 'PAI';
  if (l.includes('inggris') || l.includes('english')) return 'Inggris';
  if (l.includes('arab')) return 'Arab';
  return clean;
}

// Helper: ambil soal tanpa kunci
async function getSoalForSesi(lombaKey: string) {
  const { data, error } = await supabase
    .from('cbt_soal')
    .select('id, cabang_lomba, nomor_soal, pertanyaan, gambar_url, opsi_a, opsi_b, opsi_c, opsi_d, opsi_e')
    .eq('cabang_lomba', lombaKey)
    .order('nomor_soal', { ascending: true });
  
  if (error) throw error;
  return data;
}

// Helper: ambil konfigurasi CBT aktif (cbt_buka & tahap_cbt)
async function getCbtConfig() {
  const { data: config } = await supabase
    .from('profil_lembaga')
    .select('metadata')
    .eq('jenis', 'CONFIG_OLIMPIADE')
    .limit(1)
    .maybeSingle();

  const cbtBuka = config?.metadata?.cbt_buka ?? false;
  const tahapCbt: 'seleksi' | 'final' = config?.metadata?.tahap_cbt === 'final' ? 'final' : 'seleksi';
  return { cbtBuka, tahapCbt };
}

// Helper: cek apakah peserta lolos Top 30 pada Babak Seleksi
async function checkLolosSeleksi(baseNomor: string, baseCabang: string, pesertaMeta: any): Promise<boolean> {
  if (pesertaMeta?.LOLOS_FINAL === true) return true;

  const { data: allSeleksiSesi } = await supabase
    .from('cbt_sesi')
    .select('nomor_peserta, cabang_lomba, nilai_akhir');

  if (!allSeleksiSesi || allSeleksiSesi.length === 0) return false;

  const cabangScores: number[] = [];
  let myScore: number | null = null;

  allSeleksiSesi.forEach((s: any) => {
    const no = (s.nomor_peserta || '').trim();
    if (no.endsWith('_FINAL')) return; // Hanya sesi babak seleksi
    const c = normalizeCbtCabang(s.cabang_lomba || '');
    if (c === baseCabang && s.nilai_akhir !== null && s.nilai_akhir !== undefined) {
      const val = Number(s.nilai_akhir);
      if (val > 0) {
        cabangScores.push(val);
      }
      if (no === baseNomor) {
        myScore = val;
      }
    }
  });

  if (cabangScores.length === 0 || myScore === null || myScore <= 0) return false;

  cabangScores.sort((a, b) => b - a);
  const cutoff = cabangScores[Math.min(MAX_LOLOS_SELEKSI - 1, cabangScores.length - 1)];
  return myScore >= cutoff;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawNomor = searchParams.get('nomorPeserta');
    if (!rawNomor) return NextResponse.json({ success: false, error: 'Parameter nomorPeserta wajib' }, { status: 400 });

    const baseNomor = rawNomor.trim().replace(/_FINAL$/i, '');

    // Validasi apakah peserta masih terdaftar aktif di data_olimpiade_seni
    const { data: peserta } = await supabase
      .from('data_olimpiade_seni')
      .select('id, metadata')
      .in('jenis_pendaftaran', ['individu', 'peserta_kolektif'])
      .filter('metadata->>NOMOR_PESERTA', 'eq', baseNomor)
      .maybeSingle();

    if (!peserta) {
      // Hapus sesi orphan jika ada
      await supabase.from('cbt_sesi').delete().in('nomor_peserta', [baseNomor, `${baseNomor}_FINAL`]);
      return NextResponse.json({
        success: false,
        isDeleted: true,
        error: 'Akun pendaftaran Anda tidak ditemukan atau telah dihapus dari sistem.'
      }, { status: 403 });
    }

    const { cbtBuka, tahapCbt } = await getCbtConfig();
    const requestedTahap = searchParams.get('tahap') === 'final' ? 'final' : searchParams.get('tahap') === 'seleksi' ? 'seleksi' : tahapCbt;
    const activeNomorKey = requestedTahap === 'final' ? `${baseNomor}_FINAL` : baseNomor;

    // Ambil sesi seleksi dan sesi final sekaligus
    const { data: bothSesi, error } = await supabase
      .from('cbt_sesi')
      .select('*')
      .in('nomor_peserta', [baseNomor, `${baseNomor}_FINAL`]);
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const sesiSeleksi = (bothSesi || []).find((s: any) => s.nomor_peserta === baseNomor) || null;
    const sesiFinal = (bothSesi || []).find((s: any) => s.nomor_peserta === `${baseNomor}_FINAL`) || null;
    const activeSesi = requestedTahap === 'final' ? sesiFinal : sesiSeleksi;

    const rawCabang = peserta.metadata?.LOMBA_DIPILIH || peserta.metadata?.['LOMBA YANG DIPILIH'] || '';
    const baseCabang = normalizeCbtCabang(rawCabang);
    const lolosSeleksi = await checkLolosSeleksi(baseNomor, baseCabang, peserta.metadata);

    const isBypass = peserta.metadata?.IS_BYPASS === true || baseNomor.startsWith('BYPASS-');
    const effectiveCbtBuka = isBypass ? true : cbtBuka;
    const effectiveLolos = isBypass ? true : lolosSeleksi;

    if (!activeSesi) {
      return NextResponse.json({
        success: true,
        sesi: null,
        sesi_seleksi: sesiSeleksi,
        sesi_final: sesiFinal,
        tahap_cbt: tahapCbt,
        cbt_buka: effectiveCbtBuka,
        lolos_seleksi: effectiveLolos,
        is_bypass: isBypass
      });
    }

    const soal = await getSoalForSesi(activeSesi.cabang_lomba);

    return NextResponse.json({
      success: true,
      sesi: activeSesi,
      sesi_seleksi: sesiSeleksi,
      sesi_final: sesiFinal,
      tahap_cbt: tahapCbt,
      cbt_buka: effectiveCbtBuka,
      lolos_seleksi: effectiveLolos,
      is_bypass: isBypass,
      soal
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, nomorPeserta, lomba } = body;

    if (!nomorPeserta) {
      return NextResponse.json({ success: false, error: 'Parameter nomorPeserta wajib diisi' }, { status: 400 });
    }

    const baseNomor = nomorPeserta.trim().replace(/_FINAL$/i, '');

    // Validasi apakah peserta masih terdaftar aktif di data_olimpiade_seni
    const { data: peserta } = await supabase
      .from('data_olimpiade_seni')
      .select('id, metadata')
      .in('jenis_pendaftaran', ['individu', 'peserta_kolektif'])
      .filter('metadata->>NOMOR_PESERTA', 'eq', baseNomor)
      .maybeSingle();

    if (!peserta) {
      // Hapus sesi orphan jika ada
      await supabase.from('cbt_sesi').delete().in('nomor_peserta', [baseNomor, `${baseNomor}_FINAL`]);
      return NextResponse.json({
        success: false,
        isDeleted: true,
        error: 'Akun pendaftaran Anda tidak ditemukan atau telah dihapus dari sistem.'
      }, { status: 403 });
    }

    const isBypass = peserta.metadata?.IS_BYPASS === true || baseNomor.startsWith('BYPASS-');
    const { cbtBuka, tahapCbt } = await getCbtConfig();
    const targetNomorKey = tahapCbt === 'final' ? `${baseNomor}_FINAL` : baseNomor;
    const baseCabang = normalizeCbtCabang(lomba || peserta.metadata?.LOMBA_DIPILIH || peserta.metadata?.['LOMBA YANG DIPILIH'] || '');
    const targetCabangKey = tahapCbt === 'final' ? `${baseCabang}_FINAL` : baseCabang;

    if (action === 'start') {
      if (!cbtBuka && !isBypass) {
        return NextResponse.json({ success: false, error: 'Ujian CBT saat ini sedang ditutup/disembunyikan oleh panitia.' }, { status: 403 });
      }

      // Jika tahap aktif adalah FINAL, pastikan peserta lolos seleksi (Top 30)
      if (tahapCbt === 'final' && !isBypass) {
        const isFinalist = await checkLolosSeleksi(baseNomor, baseCabang, peserta.metadata);
        if (!isFinalist) {
          return NextResponse.json({
            success: false,
            error: 'Mohon maaf, hanya peserta yang dinyatakan LOLOS Babak Seleksi (Top 30) yang dapat mengikuti Ujian CBT Babak Final.'
          }, { status: 403 });
        }
      }

      // Cek apakah sudah ada sesi pada tahap aktif ini
      const { data: existing } = await supabase
        .from('cbt_sesi')
        .select('*')
        .eq('nomor_peserta', targetNomorKey)
        .maybeSingle();
      
      if (existing) {
        if (existing.status === 'selesai') {
          if (isBypass) {
            // Untuk akun bypass, hapus sesi lama agar bisa menguji ulang kapan saja
            await supabase.from('cbt_sesi').delete().eq('nomor_peserta', targetNomorKey);
          } else {
            return NextResponse.json({
              success: false,
              error: `Anda sudah menyelesaikan ujian ${tahapCbt === 'final' ? 'Babak Final' : 'Babak Seleksi'} ini.`
            }, { status: 403 });
          }
        } else {
          return NextResponse.json({ success: true, sesi: existing, tahap_cbt: tahapCbt });
        }
      }

      // Pastikan paket soal untuk tahap & cabang ini sudah tersedia
      const { count: soalCount } = await supabase
        .from('cbt_soal')
        .select('id', { count: 'exact', head: true })
        .eq('cabang_lomba', targetCabangKey);

      if (!soalCount || soalCount === 0) {
        return NextResponse.json({
          success: false,
          error: `Paket soal ${tahapCbt === 'final' ? 'Babak Final' : 'Babak Seleksi'} untuk cabang ${baseCabang} belum tersedia.`
        }, { status: 400 });
      }

      // Buat sesi baru
      const { data: newSesi, error } = await supabase.from('cbt_sesi').insert([{
        nomor_peserta: targetNomorKey,
        cabang_lomba: targetCabangKey,
        waktu_mulai: new Date().toISOString(),
        status: 'berjalan'
      }]).select().single();

      if (error) throw error;
      return NextResponse.json({ success: true, sesi: newSesi, tahap_cbt: tahapCbt });
    }

    else if (action === 'reset') {
      if (!isBypass) {
        return NextResponse.json({ success: false, error: 'Aksi reset hanya untuk akun bypass/uji coba' }, { status: 403 });
      }
      await supabase.from('cbt_sesi').delete().in('nomor_peserta', [baseNomor, `${baseNomor}_FINAL`]);
      return NextResponse.json({ success: true, message: 'Sesi ujian uji coba berhasil di-reset' });
    }

    else if (action === 'save') {
      const { nomorSoal, jawaban } = body;
      
      const { data: sesi } = await supabase
        .from('cbt_sesi')
        .select('jawaban_tersimpan, status')
        .eq('nomor_peserta', targetNomorKey)
        .single();
      if (!sesi || sesi.status === 'selesai') {
        return NextResponse.json({ success: false, error: 'Sesi tidak valid atau sudah selesai' }, { status: 403 });
      }

      const newJawaban = { ...sesi.jawaban_tersimpan, [nomorSoal.toString()]: jawaban };

      const { error } = await supabase.from('cbt_sesi').update({ 
        jawaban_tersimpan: newJawaban,
        updated_at: new Date().toISOString()
      }).eq('nomor_peserta', targetNomorKey);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Tersimpan' });
    }

    else if (action === 'submit') {
      const { data: sesi } = await supabase
        .from('cbt_sesi')
        .select('*')
        .eq('nomor_peserta', targetNomorKey)
        .single();
      if (!sesi) return NextResponse.json({ success: false, error: 'Sesi tidak valid' }, { status: 400 });
      if (sesi.status === 'selesai') return NextResponse.json({ success: true, message: 'Sudah pernah disubmit' });

      // Skoring Olimpiade: Benar +4, Salah -1, Tidak Dijawab 0
      const { data: soalList } = await supabase
        .from('cbt_soal')
        .select('nomor_soal, kunci_jawaban')
        .eq('cabang_lomba', sesi.cabang_lomba);
      
      let totalBenar = 0;
      let totalSalah = 0;
      let totalKosong = 0;
      const totalSoal = soalList?.length || 0;

      if (soalList && totalSoal > 0) {
        soalList.forEach(soal => {
          const jawabanUser = sesi.jawaban_tersimpan?.[soal.nomor_soal.toString()];
          if (!jawabanUser || jawabanUser === '') {
            totalKosong++;
          } else if (jawabanUser === soal.kunci_jawaban) {
            totalBenar++;
          } else {
            totalSalah++;
          }
        });
      }

      // Skor mentah: benar*4, salah*(-1), kosong*0
      const skorMentah = (totalBenar * 4) + (totalSalah * -1);
      // Skor max = totalSoal * 4
      const skorMax = totalSoal * 4;
      // nilaiAkhir dikonversi ke skala 0-100 (boleh negatif kalau jawaban salah semua)
      const nilaiAkhir = skorMax > 0 ? (skorMentah / skorMax) * 100 : 0;

      const { error } = await supabase.from('cbt_sesi').update({
        status: 'selesai',
        waktu_selesai: new Date().toISOString(),
        nilai_akhir: nilaiAkhir,
        updated_at: new Date().toISOString()
      }).eq('nomor_peserta', targetNomorKey);

      if (error) throw error;
      return NextResponse.json({ 
        success: true, 
        nilai: nilaiAkhir,
        skor: skorMentah,
        benar: totalBenar,
        salah: totalSalah,
        kosong: totalKosong,
        totalSoal,
        message: 'Ujian selesai disimpan' 
      });
    }

    else if (action === 'log_kecurangan') {
      const { jenisKecurangan, jumlahPelanggaran } = body;
      
      const { data: sesiData } = await supabase
        .from('cbt_sesi')
        .select('log_kecurangan')
        .eq('nomor_peserta', targetNomorKey)
        .single();
      const existingLog = Array.isArray(sesiData?.log_kecurangan) ? sesiData.log_kecurangan : [];
      const newEntry = { jenis: jenisKecurangan, waktu: new Date().toISOString(), ke: jumlahPelanggaran };
      const newLog = [...existingLog, newEntry];

      await supabase
        .from('cbt_sesi')
        .update({ log_kecurangan: newLog, updated_at: new Date().toISOString() })
        .eq('nomor_peserta', targetNomorKey);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
