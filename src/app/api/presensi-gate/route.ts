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
    const [yyyyPart, mmPart, ddPart] = filterTanggal.split('-');
    const filterTanggalIndo = ddPart && mmPart && yyyyPart ? `${ddPart}/${mmPart}/${yyyyPart}` : '';

    // Ambil semua presensi siswa/gate hari ini DAN absen_gtk hari ini secara paralel
    const [presensiRes, gtkAbsenRes] = await Promise.all([
      supabase
        .from('data_presensi_siswa')
        .select('*')
        .eq('tanggal', filterTanggal)
        .order('id', { ascending: false }),
      filterTanggalIndo
        ? supabase
            .from('absen_gtk')
            .select('id, nama, tanggal, metadata')
            .eq('tanggal', filterTanggalIndo)
        : Promise.resolve({ data: [], error: null })
    ]);

    if (presensiRes.error) throw presensiRes.error;
    const rows = presensiRes.data || [];
    const gtkRows = gtkAbsenRes.data || [];

    const normName = (v: any) => String(v || '').trim().replace(/\s+/g, ' ').toUpperCase();
    const cleanNisn = (v: any) => String(v || '').replace(/^'/, '').trim().replace(/^0+/, '');
    const parseSec = (t: string): number | null => {
      if (!t) return null;
      const clean = String(t).trim().replace(/\./g, ':');
      const parts = clean.split(':').map(Number);
      if (parts.length < 2 || parts.some(isNaN)) return null;
      return (parts[0] * 3600) + (parts[1] * 60) + (parts[2] || 0);
    };

    // Pisahkan baris tap gerbang dan baris presensi kelas jam pertama / piket
    const gateRawRows = rows.filter((r: any) => {
      const meta = r.metadata || {};
      return Boolean(meta['JAM_MASUK'] || meta['JAM MASUK'] || meta['JAM_PULANG'] || meta['SUMBER'] === 'GATE');
    });

    const classJam1Rows = rows.filter((r: any) => {
      const meta = r.metadata || {};
      if (meta['JAM_MASUK'] || meta['JAM MASUK'] || meta['SUMBER'] === 'GATE') return false;
      const keh = String(meta['KEHADIRAN'] || '').trim().toUpperCase();
      const mapel = String(meta['MAPEL'] || '').trim().toUpperCase();
      const jamKeRaw = String(meta['JAM KE'] || '').replace(/^'/, '').trim();
      const jams = jamKeRaw.split(',').map((j: string) => j.trim()).filter(Boolean);
      const isJam1 = jams.includes('1');
      if (keh === 'A' && (isJam1 || mapel === 'PIKET')) return true;
      if ((keh === 'S' || keh === 'I') && mapel === 'PIKET' && isJam1) return true;
      return false;
    });

    // Helper cari Terduga Pembawa Kartu (siswa lain yang tap berurutan <= 25 detik)
    const findBuddiesForRow = (targetRow: any) => {
      const tm = targetRow.metadata || {};
      const tNama = normName(tm['NAMA SISWA']);
      const tJam = String(tm['JAM_MASUK'] || tm['JAM MASUK'] || '').trim();
      const tSec = parseSec(tJam);
      if (tSec === null) return [];

      const buddies: any[] = [];
      for (const other of gateRawRows) {
        if (other.id === targetRow.id || other.kelas === 'GTK') continue;
        const om = other.metadata || {};
        const oNama = String(om['NAMA SISWA'] || '').trim();
        if (!oNama || normName(oNama) === tNama) continue;
        const oJam = String(om['JAM_MASUK'] || om['JAM MASUK'] || '').trim();
        const oSec = parseSec(oJam);
        if (oSec === null) continue;
        const diff = Math.abs(oSec - tSec);
        if (diff <= 25) {
          buddies.push({
            nama: oNama,
            kelas: other.kelas || om['KELAS'] || '-',
            nisn: String(om['NISN'] || '').trim(),
            jamMasuk: oJam,
            selisihDetik: diff,
            arah: oSec <= tSec ? 'sebelum' : 'sesudah'
          });
        }
      }
      buddies.sort((a, b) => a.selisihDetik - b.selisihDetik);
      return buddies.slice(0, 3);
    };

    // Rekonsiliasi Audit Silang Otomatis (jika ada siswa tap gerbang tapi Alpha di Jam ke-1)
    const auditList: any[] = [];
    for (const r of gateRawRows) {
      if (r.kelas === 'GTK') continue;
      const meta = r.metadata || {};
      const rNama = normName(meta['NAMA SISWA']);
      const rNisn = cleanNisn(meta['NISN']);

      const matchedConflict = classJam1Rows.find((cr: any) => {
        const cm = cr.metadata || {};
        const cNama = normName(cm['NAMA SISWA']);
        const cNisn = cleanNisn(cm['NISN']);
        return (rNama && cNama === rNama) || (rNisn && cNisn === rNisn);
      });

      const buddies = findBuddiesForRow(r);

      if (matchedConflict && meta['AUDIT_STATUS'] !== 'DIPULIHKAN' && meta['AUDIT_STATUS'] !== 'DIBATALKAN') {
        const cm = matchedConflict.metadata || {};
        const statusKelas = String(cm['KEHADIRAN'] || 'A').trim().toUpperCase();
        const guruPenginput = String(cm['GURU PENGINPUT'] || '-').trim();
        const mapelKelas = String(cm['MAPEL'] || '-').trim();
        const jamKeKelas = String(cm['JAM KE'] || '1').replace(/^'/, '').trim();
        const origStatusMasuk = meta['AUDIT_ORIGINAL_STATUS_MASUK'] || meta['STATUS_MASUK'] || 'Tepat Waktu';

        const newMeta = {
          ...meta,
          'KEHADIRAN': 'BATAL_RFID',
          'STATUS_MASUK': 'DIBATALKAN',
          'AUDIT_ORIGINAL_STATUS_MASUK': origStatusMasuk,
          'AUDIT_STATUS': 'DIBATALKAN',
          'AUDIT_SANKSI': 'Presensi RFID Dibatalkan & Terkena Sanksi (Indikasi Titip Kartu / Alpha Jam Ke-1)',
          'AUDIT_GURU': guruPenginput,
          'AUDIT_MAPEL': mapelKelas,
          'AUDIT_JAM_KE': jamKeKelas,
          'AUDIT_STATUS_KELAS': statusKelas,
          'AUDIT_WAKTU': new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
          'AUDIT_TERDUGA_PEMBAWA': buddies
        };
        r.metadata = newMeta;
        // Simpan pembatalan ke database di background
        supabase.from('data_presensi_siswa').update({ metadata: newMeta }).eq('id', r.id).then(() => {});
      }

      if (r.metadata?.['AUDIT_STATUS'] === 'DIBATALKAN' || r.metadata?.['AUDIT_STATUS'] === 'DIPULIHKAN') {
        const m = r.metadata;
        auditList.push({
          id: r.id,
          tanggal: r.tanggal,
          nama: m['NAMA SISWA'] || '',
          nisn: String(m['NISN'] || '').replace(/^'/, '').trim(),
          kelas: r.kelas || m['KELAS'] || '',
          jamMasuk: m['JAM_MASUK'] || m['JAM MASUK'] || '',
          jamPulang: m['JAM_PULANG'] || m['JAM PULANG'] || '',
          auditStatus: m['AUDIT_STATUS'],
          auditSanksi: m['AUDIT_SANKSI'] || 'Presensi RFID Dibatalkan & Terkena Sanksi',
          auditCatatan: m['AUDIT_CATATAN'] || '',
          auditGuru: m['AUDIT_GURU'] || '-',
          auditMapel: m['AUDIT_MAPEL'] || '-',
          auditJamKe: m['AUDIT_JAM_KE'] || '1',
          auditStatusKelas: m['AUDIT_STATUS_KELAS'] || 'A',
          auditWaktu: m['AUDIT_WAKTU'] || '',
          pembawaKenaSanksi: Boolean(m['AUDIT_PEMBAWA_SANKSI']),
          terdugaPembawa: buddies.length > 0 ? buddies : (m['AUDIT_TERDUGA_PEMBAWA'] || [])
        });
      }
    }

    // Hanya ambil siswa/guru yang tercatat tap di gerbang
    const list = gateRawRows.map((r: any) => {
      const m = r.metadata || {};
      const isCancelled = m['AUDIT_STATUS'] === 'DIBATALKAN' || m['STATUS_MASUK'] === 'DIBATALKAN';
      return {
        id: r.id,
        tanggal: r.tanggal,
        kelas: r.kelas,
        nisn: String(m['NISN'] || '').replace(/^'/, '').trim(),
        nama: m['NAMA SISWA'] || '',
        kehadiran: m['KEHADIRAN'] || 'H',
        jamMasuk: m['JAM_MASUK'] || m['JAM MASUK'] || '',
        jamPulang: m['JAM_PULANG'] || m['JAM PULANG'] || '',
        statusMasuk: isCancelled ? 'DIBATALKAN' : (m['STATUS_MASUK'] || 'Tepat Waktu'),
        sumber: m['SUMBER'] || 'GATE',
        auditSanksi: isCancelled ? (m['AUDIT_SANKSI'] || 'Dibatalkan (Indikasi Titip Kartu)') : undefined
      };
    });

    // Peta status presensi GTK hari ini (termasuk yang absen pagi lewat Menu Absensi GTK)
    const gtkTaps: Record<string, { jamMasuk: string; jamPulang: string | null; statusMasuk: string }> = {};
    for (const g of gtkRows) {
      const gNama = String(g.nama || g.metadata?.['Nama'] || '').trim();
      const gMasuk = String(g.metadata?.['jam_masuk'] || '').trim();
      const gPulang = String(g.metadata?.['jam_pulang'] || '').trim();
      if (gNama && gMasuk) {
        gtkTaps[gNama.toLowerCase()] = {
          jamMasuk: gMasuk,
          jamPulang: gPulang || null,
          statusMasuk: 'Tepat Waktu'
        };
      }
    }

    // Hitung counter (siswa yang tap-nya dibatalkan otomatis dikurangi dari Total Hadir)
    const validList = list.filter((x: any) => x.statusMasuk !== 'DIBATALKAN');
    const totalHadir = validList.length;
    const tepatWaktu = validList.filter((x: any) => x.statusMasuk === 'Tepat Waktu').length;
    const terlambat = validList.filter((x: any) => x.statusMasuk === 'Terlambat').length;
    const sudahPulang = validList.filter((x: any) => !!x.jamPulang).length;
    const dibatalkan = auditList.filter((x: any) => x.auditStatus === 'DIBATALKAN').length;

    return NextResponse.json({
      success: true,
      tanggal: filterTanggal,
      stats: {
        totalHadir,
        tepatWaktu,
        terlambat,
        sudahPulang,
        dibatalkan
      },
      data: list,
      auditList,
      gtkTaps
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
        const [hMasuk, mMasuk] = existingJamMasuk.replace(':', '.').split('.').map(Number);
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
      } else {
        // Jika pagi absen datang lewat menu Absensi GTK lalu sore tap pulang di Gerbang,
        // tambahkan juga ke feed gerbang agar riwayatnya sinkron
        const gateMeta = {
          'NISN': matchedGuru.nisn || '-',
          'NAMA SISWA': matchedGuru.nama,
          'KELAS': 'GTK',
          'KEHADIRAN': 'H',
          'TANGGAL': tanggal,
          'JAM_MASUK': existingJamMasuk,
          'JAM_PULANG': jam,
          'STATUS_MASUK': 'Tepat Waktu',
          'STATUS_PULANG': 'Pulang',
          'SUMBER': 'GATE'
        };
        await supabase.from('data_presensi_siswa').insert({
          tanggal,
          kelas: 'GTK',
          metadata: gateMeta
        });
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
      .eq('metadata->>NAMA SISWA', matchedStudent.nama);

    const existing = (existingRows || []).find((r: any) => {
      const m = r.metadata || {};
      return Boolean(m['JAM_MASUK'] || m['JAM MASUK'] || m['SUMBER'] === 'GATE');
    }) || null;

    // Cek apakah guru di kelas sudah terlanjur menginput Alpha (A) di Jam ke-1 untuk siswa ini
    const existingClassAlphaJam1 = (existingRows || []).find((r: any) => {
      const m = r.metadata || {};
      if (m['JAM_MASUK'] || m['JAM MASUK'] || m['SUMBER'] === 'GATE') return false;
      const keh = String(m['KEHADIRAN'] || '').trim().toUpperCase();
      const mapel = String(m['MAPEL'] || '').trim().toUpperCase();
      const jams = String(m['JAM KE'] || '').replace(/^'/, '').split(',').map((s: string) => s.trim());
      return keh === 'A' && (jams.includes('1') || mapel === 'PIKET');
    }) || null;

    // Batas jam masuk (default 06:45:00 WIB)
    const BATAS_JAM_MASUK = '06:45:00';
    const isTerlambat = jam > BATAS_JAM_MASUK;
    const statusMasuk = isTerlambat ? 'Terlambat' : 'Tepat Waktu';

    // JIKA BELUM ADA RECORD HARI INI -> CATAT JAM MASUK
    if (!existing) {
      const isAutoCancelled = Boolean(existingClassAlphaJam1);
      const cm = existingClassAlphaJam1?.metadata || {};
      const newMeta: Record<string, any> = {
        'NISN': targetNisn,
        'NAMA SISWA': matchedStudent.nama,
        'KELAS': matchedStudent.kelas,
        'KEHADIRAN': isAutoCancelled ? 'BATAL_RFID' : 'H',
        'STATUS': isAutoCancelled ? 'DIBATALKAN' : 'HADIR',
        'JAM_MASUK': jam,
        'STATUS_MASUK': isAutoCancelled ? 'DIBATALKAN' : statusMasuk,
        'SUMBER': 'GATE',
        'TIMESTAMP': new Date().toLocaleString('id-ID'),
        ...(isAutoCancelled ? {
          'AUDIT_ORIGINAL_STATUS_MASUK': statusMasuk,
          'AUDIT_STATUS': 'DIBATALKAN',
          'AUDIT_SANKSI': 'Presensi RFID Dibatalkan & Terkena Sanksi (Indikasi Titip Kartu / Alpha Jam Ke-1)',
          'AUDIT_GURU': cm['GURU PENGINPUT'] || '-',
          'AUDIT_MAPEL': cm['MAPEL'] || '-',
          'AUDIT_JAM_KE': String(cm['JAM KE'] || '1').replace(/^'/, ''),
          'AUDIT_STATUS_KELAS': 'A',
          'AUDIT_WAKTU': new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
        } : {})
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
        message: isAutoCancelled
          ? 'PERINGATAN: Siswa tercatat Alpha di Jam ke-1! Presensi RFID dibatalkan & masuk daftar sanksi.'
          : (isTerlambat ? 'Check-in Berhasil (Terlambat)' : 'Check-in Berhasil (Tepat Waktu)'),
        data: {
          ...matchedStudent,
          jamMasuk: jam,
          jamPulang: null,
          statusMasuk: isAutoCancelled ? 'DIBATALKAN' : statusMasuk,
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

// PATCH: Kelola Sanksi atau Pulihkan Presensi RFID yang Dibatalkan oleh Sistem Audit
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, action, sanksi, catatan, pembawaKenaSanksi } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID presensi tidak valid' }, { status: 400 });
    }

    const { data: row, error: fetchErr } = await supabase
      .from('data_presensi_siswa')
      .select('id, metadata')
      .eq('id', id)
      .single();

    if (fetchErr || !row) {
      return NextResponse.json({ success: false, error: 'Data presensi tidak ditemukan' }, { status: 404 });
    }

    const meta = row.metadata || {};

    if (action === 'pulihkan') {
      const origStatus = meta['AUDIT_ORIGINAL_STATUS_MASUK'] || (String(meta['JAM_MASUK'] || '') > '06:45:00' ? 'Terlambat' : 'Tepat Waktu');
      const restoredMeta = {
        ...meta,
        'KEHADIRAN': 'H',
        'STATUS': 'HADIR',
        'STATUS_MASUK': origStatus,
        'AUDIT_STATUS': 'DIPULIHKAN',
        'AUDIT_CATATAN': catatan || 'Dipulihkan oleh Petugas / Guru Piket (Bukan Titip Kartu)'
      };
      const { error: upErr } = await supabase
        .from('data_presensi_siswa')
        .update({ metadata: restoredMeta })
        .eq('id', id);
      if (upErr) throw upErr;
      return NextResponse.json({ success: true, message: 'Presensi RFID siswa berhasil dipulihkan menjadi Hadir.' });
    }

    if (action === 'sanksi') {
      const sanksiMeta = {
        ...meta,
        'KEHADIRAN': 'BATAL_RFID',
        'STATUS': 'DIBATALKAN',
        'STATUS_MASUK': 'DIBATALKAN',
        'AUDIT_STATUS': 'DIBATALKAN',
        'AUDIT_SANKSI': sanksi || meta['AUDIT_SANKSI'] || 'Presensi RFID Dibatalkan & Terkena Sanksi Titip Kartu',
        'AUDIT_CATATAN': catatan ?? meta['AUDIT_CATATAN'] ?? '',
        'AUDIT_PEMBAWA_SANKSI': Boolean(pembawaKenaSanksi)
      };
      const { error: upErr } = await supabase
        .from('data_presensi_siswa')
        .update({ metadata: sanksiMeta })
        .eq('id', id);
      if (upErr) throw upErr;
      return NextResponse.json({ success: true, message: 'Data sanksi pelanggaran RFID berhasil diperbarui.' });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak dikenali' }, { status: 400 });
  } catch (error: any) {
    console.error('PATCH Presensi Gate Audit Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
