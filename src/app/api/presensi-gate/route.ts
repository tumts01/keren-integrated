import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAllCachedDataInduk } from '@/lib/data-induk';

export const dynamic = 'force-dynamic';

// Helper get current WIB Date & Time (UTC+7)
function getWibDateTime() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wib = new Date(utc + (7 * 3600000));
  
  const yyyy = wib.getFullYear();
  const mm = String(wib.getMonth() + 1).padStart(2, '0');
  const dd = String(wib.getDate()).padStart(2, '0');
  const tanggal = `${yyyy}-${mm}-${dd}`;

  const hh = String(wib.getHours()).padStart(2, '0');
  const min = String(wib.getMinutes()).padStart(2, '0');
  const ss = String(wib.getSeconds()).padStart(2, '0');
  const jam = `${hh}:${min}:${ss}`;

  return { tanggal, jam, wibDate: wib };
}

// GET: Ambil ringkasan dan riwayat tap gate hari ini
export async function GET(request: Request) {
  try {
    const { tanggal } = getWibDateTime();
    const { searchParams } = new URL(request.url);
    const filterTanggal = searchParams.get('tanggal') || tanggal;

    // Ambil semua presensi siswa hari ini dari data_presensi_siswa
    const { data: rows, error } = await supabase
      .from('data_presensi_siswa')
      .select('*')
      .eq('tanggal', filterTanggal)
      .order('id', { ascending: false });

    if (error) throw error;

    // Hanya ambil siswa yang tercatat tap di gerbang (memiliki jam masuk atau sumber GATE)
    const list = (rows || [])
      .filter((r: any) => {
        const meta = r.metadata || {};
        return Boolean(meta['JAM_MASUK'] || meta['JAM MASUK'] || meta['SUMBER'] === 'GATE');
      })
      .map((r: any) => ({
        id: r.id,
        tanggal: r.tanggal,
        kelas: r.kelas,
        nisn: r.metadata?.['NISN'] || '',
        nama: r.metadata?.['NAMA SISWA'] || '',
        kehadiran: r.metadata?.['KEHADIRAN'] || 'H',
        jamMasuk: r.metadata?.['JAM_MASUK'] || r.metadata?.['JAM MASUK'] || '',
        jamPulang: r.metadata?.['JAM_PULANG'] || r.metadata?.['JAM PULANG'] || '',
        statusMasuk: r.metadata?.['STATUS_MASUK'] || 'Tepat Waktu',
        sumber: r.metadata?.['SUMBER'] || 'GATE'
      }));

    // Hitung counter
    let totalHadir = list.length;
    let tepatWaktu = list.filter(x => x.statusMasuk === 'Tepat Waktu').length;
    let terlambat = list.filter(x => x.statusMasuk === 'Terlambat').length;
    let sudahPulang = list.filter(x => !!x.jamPulang).length;

    return NextResponse.json({
      success: true,
      tanggal: filterTanggal,
      stats: {
        totalHadir,
        tepatWaktu,
        terlambat,
        sudahPulang
      },
      data: list
    });

  } catch (error: any) {
    console.error('GET Presensi Gate Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Handle Scan Barcode / Tap Kartu RFID Siswa
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, mode = 'auto' } = body; // code = RFID UID, NISN, atau ID SISWA

    if (!code || !String(code).trim()) {
      return NextResponse.json({ success: false, error: 'Kode scan / RFID tidak boleh kosong' }, { status: 400 });
    }

    const cleanCode = String(code).trim().replace(/^0+/, '');
    const rawCleanCode = String(code).trim();

    // 1. Cari siswa di data_induk
    const allStudents = await getAllCachedDataInduk();
    
    let matchedStudent: any = null;

    for (const s of allStudents) {
      const meta = s.metadata || {};
      const sNisn = String(meta['NISN'] || '').trim().replace(/^0+/, '');
      const sIdSiswa = String(meta['ID SISWA'] || s.id_siswa || '').trim().replace(/^0+/, '');
      const sRfid = String(meta['RFID_UID'] || meta['NO_RFID'] || '').trim();

      // Cocokkan dengan RFID UID, NISN, atau ID Siswa
      if (
        (sRfid && sRfid.toLowerCase() === rawCleanCode.toLowerCase()) ||
        (sNisn && sNisn === cleanCode) ||
        (sIdSiswa && sIdSiswa === cleanCode) ||
        (rawCleanCode === String(meta['NISN'] || '').trim())
      ) {
        // Tentukan kelas aktif
        let rombel = (meta['ROMBEL KELAS 9'] || '').trim();
        if (!rombel) rombel = (meta['ROMBEL KELAS 8'] || '').trim();
        if (!rombel) rombel = (meta['ROMBEL KELAS 7'] || '').trim();
        if (!rombel) rombel = (meta['ROMBEL'] || '').trim();

        // Helper thumb foto
        let foto = meta['LINK FOTO TERBARU'] || meta['LINK URL FOTO 1'] || '';
        if (foto.includes('drive.google.com')) {
          const match = foto.match(/\/d\/([a-zA-Z0-9_-]+)/) || foto.match(/id=([a-zA-Z0-9_-]+)/);
          if (match && match[1]) {
            foto = `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400-h400`;
          }
        }

        matchedStudent = {
          id: s.id,
          nama: meta['NAMA'] || s.nama || '',
          nisn: meta['NISN'] || '',
          nis: meta['ID SISWA'] || s.id_siswa || '',
          kelas: rombel || 'Kelas ?',
          foto,
          rfidUid: sRfid
        };
        break;
      }
    }

    if (!matchedStudent) {
      return NextResponse.json({ 
        success: false, 
        notFound: true,
        error: `Kartu / Kode "${code}" belum terdaftar pada siswa manapun.` 
      }, { status: 404 });
    }

    // 2. Waktu sekarang (WIB)
    const { tanggal, jam } = getWibDateTime();

    // 3. Cek apakah siswa sudah punya catatan di tanggal hari ini
    const { data: existingRows } = await supabase
      .from('data_presensi_siswa')
      .select('*')
      .eq('tanggal', tanggal)
      .ilike('metadata->>NISN', `%${matchedStudent.nisn}%`);

    const existing = (existingRows || []).find((r: any) => {
      const rNisn = String(r.metadata?.['NISN'] || '').trim();
      return rNisn === String(matchedStudent.nisn).trim();
    });

    // Batas jam masuk (default 06:45:00 WIB)
    const BATAS_JAM_MASUK = '06:45:00';
    const isTerlambat = jam > BATAS_JAM_MASUK;
    const statusMasuk = isTerlambat ? 'Terlambat' : 'Tepat Waktu';

    // JIKA BELUM ADA RECORD HARI INI -> CATAT JAM MASUK
    if (!existing) {
      const newMeta = {
        'NISN': matchedStudent.nisn,
        'NAMA SISWA': matchedStudent.nama,
        'KELAS': matchedStudent.kelas,
        'KEHADIRAN': 'H',
        'STATUS': 'HADIR',
        'JAM_MASUK': jam,
        'STATUS_MASUK': statusMasuk,
        'SUMBER': 'GATE',
        'TIMESTAMP': new Date().toLocaleString('id-ID')
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('data_presensi_siswa')
        .insert([{
          tanggal,
          kelas: matchedStudent.kelas,
          metadata: newMeta
        }])
        .select()
        .single();

      if (insertErr) throw insertErr;

      return NextResponse.json({
        success: true,
        actionType: 'MASUK',
        message: isTerlambat ? 'Check-in Berhasil (Terlambat)' : 'Check-in Berhasil (Tepat Waktu)',
        data: {
          ...matchedStudent,
          jamMasuk: jam,
          jamPulang: null,
          statusMasuk,
          tanggal
        }
      });
    }

    // JIKA SUDAH ADA RECORD HARI INI
    const currentMeta = existing.metadata || {};
    const existingJamMasuk = currentMeta['JAM_MASUK'] || currentMeta['JAM MASUK'] || '';
    const existingJamPulang = currentMeta['JAM_PULANG'] || currentMeta['JAM PULANG'] || '';

    // Jika tap lagi dalam waktu kurang dari 3 menit dari jam masuk, anggap accidental double tap
    if (existingJamMasuk && !existingJamPulang) {
      // Hitung selisih waktu dalam detik
      const [hMasuk, mMasuk, sMasuk] = existingJamMasuk.split(':').map(Number);
      const [hNow, mNow, sNow] = jam.split(':').map(Number);
      const totalDetikMasuk = (hMasuk * 3600) + (mMasuk * 60) + (sMasuk || 0);
      const totalDetikNow = (hNow * 3600) + (mNow * 60) + (sNow || 0);
      const selisihMenit = (totalDetikNow - totalDetikMasuk) / 60;

      // Jika selisih kurang dari 3 menit, jangan ganti ke jam pulang dulu (hindari tap berkali-kali waktu antre pagi)
      if (selisihMenit < 3 && mode === 'auto') {
        return NextResponse.json({
          success: true,
          actionType: 'SUDAH_MASUK',
          message: `Siswa ${matchedStudent.nama} sudah tercatat masuk pada pukul ${existingJamMasuk} WIB`,
          data: {
            ...matchedStudent,
            jamMasuk: existingJamMasuk,
            jamPulang: null,
            statusMasuk: currentMeta['STATUS_MASUK'] || 'Tepat Waktu',
            tanggal
          }
        });
      }
    }

    // JIKA MODE PULANG ATAU TAP KEDUA (JAM PULANG)
    const updatedMeta = {
      ...currentMeta,
      'JAM_PULANG': jam,
      'STATUS_PULANG': 'Pulang',
      'TIMESTAMP_PULANG': new Date().toLocaleString('id-ID')
    };

    const { error: updateErr } = await supabase
      .from('data_presensi_siswa')
      .update({ metadata: updatedMeta })
      .eq('id', existing.id);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      actionType: 'PULANG',
      message: 'Check-out Pulang Berhasil',
      data: {
        ...matchedStudent,
        jamMasuk: existingJamMasuk,
        jamPulang: jam,
        statusMasuk: currentMeta['STATUS_MASUK'] || 'Tepat Waktu',
        tanggal
      }
    });

  } catch (error: any) {
    console.error('POST Presensi Gate Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
