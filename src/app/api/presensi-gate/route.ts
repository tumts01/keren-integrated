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

// Helper format objek siswa dari row data_induk
function formatStudentFromRow(s: any, overrideRfid?: string) {
  const meta = s.metadata || {};
  let rombel = String(meta['ROMBEL KELAS 9'] || '').trim();
  if (!rombel) rombel = String(meta['ROMBEL KELAS 8'] || '').trim();
  if (!rombel) rombel = String(meta['ROMBEL KELAS 7'] || '').trim();
  if (!rombel) rombel = String(meta['ROMBEL'] || '').trim();

  let foto = meta['LINK FOTO TERBARU'] || meta['LINK URL FOTO 1'] || '';
  if (foto.includes('drive.google.com')) {
    const match = foto.match(/\/d\/([a-zA-Z0-9_-]+)/) || foto.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      foto = `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400-h400`;
    }
  }

  return {
    id: s.id,
    nama: meta['NAMA'] || s.nama || '',
    nisn: String(meta['NISN'] || '').trim(),
    nis: String(meta['ID SISWA'] || s.id_siswa || '').trim(),
    kelas: rombel || 'Kelas ?',
    foto,
    role: 'SISWA',
    rfidUid: overrideRfid ?? String(meta['RFID_UID'] || meta['NO_RFID'] || '').trim()
  };
}

// GET: Ambil ringkasan dan riwayat tap gate hari ini (atau kamus kartu untuk in-memory cache Kiosk)
export async function GET(request: Request) {
  try {
    const { tanggal } = getWibDateTime();
    const { searchParams } = new URL(request.url);
    const directoryMode = searchParams.get('directory'); // 'rfid' | 'full'

    // Mode Khusus Preload Kamus Kartu di Browser Kiosk (0ms Instant Tap)
    if (directoryMode === 'rfid' || directoryMode === 'full') {
      const [rfidRes, guruRes, usersRes] = await Promise.all([
        supabase
          .from('data_induk')
          .select('id, id_siswa, nama, metadata')
          .not('metadata->>RFID_UID', 'is', null),
        supabase
          .from('data_guru')
          .select('id, nama, nomor_induk, metadata'),
        supabase
          .from('data_users')
          .select('nama, metadata')
      ]);

      const userPhotos: Record<string, string> = {};
      (usersRes.data || []).forEach((u: any) => {
        const uNama = (u.nama || '').trim().toLowerCase();
        let uFoto = u.metadata?.['Foto'] || u.metadata?.['foto'] || '';
        if (uNama && uFoto) {
          if (uFoto.includes('drive.google.com')) {
            const m = uFoto.match(/\/d\/([a-zA-Z0-9_-]+)/) || uFoto.match(/id=([a-zA-Z0-9_-]+)/);
            if (m && m[1]) uFoto = `https://drive.google.com/thumbnail?id=${m[1]}&sz=w400-h400`;
          }
          userPhotos[uNama] = uFoto;
        }
      });

      const items: any[] = [];
      const seenStudentIds = new Set<number>();

      // Masukkan semua siswa yang sudah punya RFID (sangat cepat)
      (rfidRes.data || []).forEach((s: any) => {
        seenStudentIds.add(s.id);
        items.push(formatStudentFromRow(s));
      });

      // Jika full directory diminta, masukkan juga siswa aktif lainnya (untuk scan barcode NISN/NIS)
      if (directoryMode === 'full') {
        const allStudents = await getAllCachedDataInduk();
        for (const s of allStudents) {
          if (seenStudentIds.has(s.id)) continue;
          const item = formatStudentFromRow(s);
          if (item.nama && (item.nisn || item.nis || item.rfidUid)) {
            items.push(item);
          }
        }
      }

      // Masukkan semua Guru / GTK
      (guruRes.data || []).forEach((g: any) => {
        const meta = g.metadata || {};
        const gRfid = String(meta['RFID_UID'] || meta['NO_RFID'] || '').trim();
        const gNip = String(g.nomor_induk || meta['NIP'] || '').trim();
        const gPegId = String(meta['PEG ID'] || meta['PegID'] || '').trim();
        const gNama = (g.nama || '').trim();
        items.push({
          id: g.id,
          nama: gNama,
          nisn: gNip || gPegId || '-',
          nis: gPegId,
          nip: gNip,
          kelas: 'GURU / GTK',
          foto: userPhotos[gNama.toLowerCase()] || '',
          role: 'GURU',
          rfidUid: gRfid
        });
      });

      return NextResponse.json({ success: true, directory: items });
    }

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
    const { code, mode = 'auto', preMatched } = body; // code = RFID UID, NISN, atau ID SISWA

    if (!code || !String(code).trim()) {
      return NextResponse.json({ success: false, error: 'Kode scan / RFID tidak boleh kosong' }, { status: 400 });
    }

    const cleanCode = String(code).trim().replace(/^0+/, '');
    const rawCleanCode = String(code).trim();

    let matchedStudent: any = null;
    let matchedGuru: any = null;

    // 0. FAST PATH (0ms): Jika Kiosk sudah mencocokkan identitas dari memori lokal browser
    if (preMatched && preMatched.nama) {
      if (preMatched.role === 'GURU' || preMatched.kelas === 'GURU / GTK') {
        matchedGuru = preMatched;
      } else {
        matchedStudent = preMatched;
      }
    }

    // 1. TARGETED DB QUERY (~60ms): Cari langsung 1 baris di Supabase data_induk tanpa load ribuan baris
    if (!matchedStudent && !matchedGuru) {
      const { data: directRows } = await supabase
        .from('data_induk')
        .select('id, id_siswa, nama, metadata')
        .or(`metadata->>RFID_UID.eq.${rawCleanCode},metadata->>NO_RFID.eq.${rawCleanCode},metadata->>NISN.eq.${rawCleanCode},id_siswa.eq.${cleanCode},id_siswa.eq.${rawCleanCode}`)
        .limit(1);

      if (directRows && directRows.length > 0) {
        matchedStudent = formatStudentFromRow(directRows[0], rawCleanCode);
      }
    }

    // 1b. Cari di data_guru jika belum ketemu di siswa
    if (!matchedStudent && !matchedGuru) {
      const { data: guruRows } = await supabase.from('data_guru').select('id, nama, nomor_induk, metadata');
      for (const g of (guruRows || [])) {
        const meta = g.metadata || {};
        const gRfid = String(meta['RFID_UID'] || meta['NO_RFID'] || '').trim();
        const gNip = String(g.nomor_induk || meta['NIP'] || '').trim();
        const gPegId = String(meta['PEG ID'] || meta['PegID'] || '').trim();

        if (
          (gRfid && gRfid.toLowerCase() === rawCleanCode.toLowerCase()) ||
          (gNip && gNip === rawCleanCode) ||
          (gPegId && gPegId === rawCleanCode)
        ) {
          matchedGuru = {
            id: g.id,
            nama: g.nama,
            nip: gNip,
            kelas: 'GURU / GTK',
            foto: '',
            role: 'GURU',
            rfidUid: gRfid
          };
          break;
        }
      }
    }

    // 1c. Fallback terakhir ke cache penuh hanya jika format NISN memiliki leading zero berbeda
    if (!matchedStudent && !matchedGuru) {
      const allStudents = await getAllCachedDataInduk();
      for (const s of allStudents) {
        const meta = s.metadata || {};
        const sNisn = String(meta['NISN'] || '').trim().replace(/^0+/, '');
        const sIdSiswa = String(meta['ID SISWA'] || s.id_siswa || '').trim().replace(/^0+/, '');
        const sRfid = String(meta['RFID_UID'] || meta['NO_RFID'] || '').trim();

        if (
          (sRfid && sRfid.toLowerCase() === rawCleanCode.toLowerCase()) ||
          (sNisn && sNisn === cleanCode) ||
          (sIdSiswa && sIdSiswa === cleanCode)
        ) {
          matchedStudent = formatStudentFromRow(s, sRfid);
          break;
        }
      }
    }

    if (!matchedStudent && !matchedGuru) {
      return NextResponse.json({ 
        success: false, 
        notFound: true,
        error: `Kartu / Kode "${code}" belum terdaftar pada siswa maupun guru.` 
      }, { status: 404 });
    }

    // 2. Waktu sekarang (WIB)
    const { tanggal, jam, wibDate } = getWibDateTime();
    const jamShort = jam.substring(0, 5).replace(':', '.'); // '06.42'
    const tanggalIndo = `${String(wibDate.getDate()).padStart(2, '0')}/${String(wibDate.getMonth() + 1).padStart(2, '0')}/${wibDate.getFullYear()}`;

    // ==========================================
    // PROSES PRESENSI KHUSUS GURU / GTK
    // ==========================================
    if (matchedGuru) {
      // Cek di absen_gtk
      const { data: gtkRows } = await supabase
        .from('absen_gtk')
        .select('*')
        .eq('nama', matchedGuru.nama)
        .eq('tanggal', tanggalIndo);

      const existingGtk = (gtkRows || [])[0] || null;
      const gtkMeta = existingGtk?.metadata || {};
      const existingJamMasuk = gtkMeta['jam_masuk'] || '';
      const existingJamPulang = gtkMeta['jam_pulang'] || '';

      // JIKA BELUM CHECK-IN HARI INI
      if (!existingJamMasuk) {
        if (!existingGtk) {
          await supabase.from('absen_gtk').insert([{
            nama: matchedGuru.nama,
            tanggal: tanggalIndo,
            metadata: {
              Nama: matchedGuru.nama,
              tanggal: tanggalIndo,
              jam_masuk: jamShort,
              jam_pulang: '',
              status: 'Hadir',
              sumber: 'GATE'
            }
          }]);
        } else {
          await supabase.from('absen_gtk').update({
            metadata: {
              ...gtkMeta,
              jam_masuk: jamShort,
              status: 'Hadir',
              sumber: 'GATE'
            }
          }).eq('id', existingGtk.id);
        }

        // Catat juga ke feed gerbang
        await supabase.from('data_presensi_siswa').insert([{
          tanggal,
          kelas: 'GTK',
          metadata: {
            'NISN': matchedGuru.nip || '-',
            'NAMA SISWA': matchedGuru.nama,
            'KELAS': 'GURU / GTK',
            'KEHADIRAN': 'H',
            'STATUS': 'HADIR',
            'JAM_MASUK': jam,
            'STATUS_MASUK': 'Tepat Waktu',
            'SUMBER': 'GATE',
            'ROLE': 'GURU',
            'TIMESTAMP': new Date().toLocaleString('id-ID')
          }
        }]);

        return NextResponse.json({
          success: true,
          actionType: 'MASUK',
          isGuru: true,
          message: `Check-in Guru Berhasil: ${matchedGuru.nama}`,
          data: {
            ...matchedGuru,
            jamMasuk: jam,
            jamPulang: null,
            statusMasuk: 'Tepat Waktu',
            tanggal
          }
        });
      }

      // JIKA SUDAH CHECK-IN: CEK COOLDOWN
      if (existingJamMasuk && !existingJamPulang) {
        const [hMasuk, mMasuk] = existingJamMasuk.split('.').map(Number);
        const [hNow, mNow] = jamShort.split('.').map(Number);
        const diffMenit = ((hNow * 60) + mNow) - ((hMasuk * 60) + mMasuk);

        if (diffMenit < 3 && mode === 'auto') {
          return NextResponse.json({
            success: true,
            actionType: 'SUDAH_MASUK',
            isGuru: true,
            message: `Bapak/Ibu ${matchedGuru.nama} sudah tercatat masuk pada pukul ${existingJamMasuk} WIB`,
            data: {
              ...matchedGuru,
              jamMasuk: existingJamMasuk,
              jamPulang: null,
              statusMasuk: 'Tepat Waktu',
              tanggal
            }
          });
        }
      }

      // CHECK-OUT PULANG GURU
      await supabase.from('absen_gtk').update({
        metadata: {
          ...gtkMeta,
          jam_pulang: jamShort
        }
      }).eq('id', existingGtk.id);

      // Update feed gerbang
      const { data: gateFeedRows } = await supabase
        .from('data_presensi_siswa')
        .select('id, metadata')
        .eq('tanggal', tanggal)
        .eq('kelas', 'GTK');

      const matchedGateFeed = (gateFeedRows || []).find((r: any) => r.metadata?.['NAMA SISWA'] === matchedGuru.nama);
      if (matchedGateFeed) {
        await supabase.from('data_presensi_siswa').update({
          metadata: {
            ...matchedGateFeed.metadata,
            'JAM_PULANG': jam,
            'STATUS_PULANG': 'Pulang'
          }
        }).eq('id', matchedGateFeed.id);
      }

      return NextResponse.json({
        success: true,
        actionType: 'PULANG',
        isGuru: true,
        message: `Check-out Pulang Guru Berhasil: ${matchedGuru.nama}`,
        data: {
          ...matchedGuru,
          jamMasuk: existingJamMasuk,
          jamPulang: jam,
          statusMasuk: 'Tepat Waktu',
          tanggal
        }
      });
    }

    // 3. Cek apakah siswa sudah punya catatan di tanggal hari ini (exact match agar cepat)
    const targetNisn = String(matchedStudent.nisn || '').trim();
    const { data: existingRows } = await supabase
      .from('data_presensi_siswa')
      .select('id, metadata')
      .eq('tanggal', tanggal)
      .eq('metadata->>NISN', targetNisn)
      .limit(1);

    const existing = existingRows?.[0] || null;

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

      const { error: insertErr } = await supabase
        .from('data_presensi_siswa')
        .insert([{
          tanggal,
          kelas: matchedStudent.kelas,
          metadata: newMeta
        }]);

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
