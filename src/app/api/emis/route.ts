import { NextResponse } from 'next/server';
import { getIndukDoc } from '@/lib/google-sheets';

const EMIS_SHEET = 'Data_EMIS';
const EMIS_HEADERS = ['NISN', 'Nama', 'Kelas', 'TahunAjaran', 'MasukEMIS', 'EMISValid', 'TglMasukEMIS', 'TglEMISValid'];

async function getOrCreateEmisSheet(doc: any) {
  if (doc.sheetsByTitle[EMIS_SHEET]) return doc.sheetsByTitle[EMIS_SHEET];
  const sheet = await doc.addSheet({ title: EMIS_SHEET, headerValues: EMIS_HEADERS });
  return sheet;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahunAjaranFilter = searchParams.get('tahunAjaran') || '';

    // Gunakan getIndukDoc (sama dengan /api/siswa) + sheet DATABASE
    const doc = await getIndukDoc();
    const siswaSheet = doc.sheetsByTitle['DATABASE'];
    if (!siswaSheet) {
      return NextResponse.json({ success: false, error: 'Tab DATABASE tidak ditemukan' }, { status: 404 });
    }

    const rows = await siswaSheet.getRows();

    // Bangun list siswa aktif (logika sama persis dengan /api/siswa)
    type SiswaRecord = {
      nisn: string; nis: string; nama: string;
      kelas: string; tahunAjaran: string; isLatest: boolean;
    };

    const allRecords: SiswaRecord[] = rows.flatMap((row: any) => {
      const status = (row.get('STATUS SISWA') || '').toLowerCase().trim();
      if (status !== 'aktif') return [];

      const base = {
        nisn: (row.get('NISN') || '').trim(),
        nis: (row.get('ID SISWA') || '').trim(),
        nama: row.get('NAMA') || '',
      };

      const records: SiswaRecord[] = [];
      const ta7 = (row.get('TA KELAS 7') || '').trim();
      const r7  = (row.get('ROMBEL KELAS 7') || '').trim();
      if (ta7 && r7) records.push({ ...base, kelas: r7, tahunAjaran: ta7, isLatest: false });

      const ta8 = (row.get('TA KELAS 8') || '').trim();
      const r8  = (row.get('ROMBEL KELAS 8') || '').trim();
      if (ta8 && r8) records.push({ ...base, kelas: r8, tahunAjaran: ta8, isLatest: false });

      const ta9 = (row.get('TA KELAS 9') || '').trim();
      const r9  = (row.get('ROMBEL KELAS 9') || '').trim();
      if (ta9 && r9) records.push({ ...base, kelas: r9, tahunAjaran: ta9, isLatest: false });

      if (records.length === 0) {
        records.push({
          ...base,
          kelas:  (row.get('ROMBEL') || '').trim(),
          tahunAjaran: (row.get('TAHUN AJARAN') || '').trim(),
          isLatest: true,
        });
      } else {
        records[records.length - 1].isLatest = true;
      }

      return records;
    });

    // Ambil hanya isLatest
    const siswaAktif = allRecords.filter(s =>
      s.isLatest && s.nisn &&
      (!tahunAjaranFilter || s.tahunAjaran === tahunAjaranFilter)
    );

    // Kumpulkan tahun ajaran unik
    const tahunAjaranList = Array.from(new Set(
      allRecords.filter(s => s.isLatest).map(s => s.tahunAjaran).filter(Boolean)
    )).sort().reverse();

    // Ambil status EMIS dari sheet Data_EMIS
    const emisSheet = await getOrCreateEmisSheet(doc);
    const emisRows = await emisSheet.getRows();
    const emisMap: Record<string, any> = {};
    emisRows.forEach((r: any) => {
      const nisn = (r.get('NISN') || '').trim();
      if (nisn) {
        emisMap[nisn] = {
          masukEMIS: (r.get('MasukEMIS') || '').toUpperCase() === 'YES',
          emisValid:  (r.get('EMISValid')  || '').toUpperCase() === 'YES',
          tglMasukEMIS: r.get('TglMasukEMIS') || '',
          tglEMISValid:  r.get('TglEMISValid')  || '',
        };
      }
    });

    const data = siswaAktif.map(s => {
      const emis = emisMap[s.nisn] || { masukEMIS: false, emisValid: false, tglMasukEMIS: '', tglEMISValid: '' };
      return { ...s, ...emis };
    });

    return NextResponse.json({ success: true, data, tahunAjaranList });
  } catch (error: any) {
    console.error('EMIS GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nisn, nama, kelas, tahunAjaran, field } = body;
    if (!nisn || !field) return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });

    const doc = await getIndukDoc();
    const emisSheet = await getOrCreateEmisSheet(doc);
    const rows = await emisSheet.getRows();

    const tglNow = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const existingRow = rows.find((r: any) => (r.get('NISN') || '').trim() === nisn.trim());

    if (existingRow) {
      const colName = field === 'masukEMIS' ? 'MasukEMIS' : 'EMISValid';
      const tglCol  = field === 'masukEMIS' ? 'TglMasukEMIS' : 'TglEMISValid';
      const currentVal = (existingRow.get(colName) || '').toUpperCase();
      const newVal = currentVal === 'YES' ? 'NO' : 'YES';
      existingRow.set(colName, newVal);
      existingRow.set(tglCol, newVal === 'YES' ? tglNow : '');
      await existingRow.save();
      return NextResponse.json({ success: true, newValue: newVal === 'YES' });
    } else {
      await emisSheet.addRow({
        NISN: nisn, Nama: nama || '', Kelas: kelas || '', TahunAjaran: tahunAjaran || '',
        MasukEMIS: field === 'masukEMIS' ? 'YES' : 'NO',
        EMISValid:  field === 'emisValid'  ? 'YES' : 'NO',
        TglMasukEMIS: field === 'masukEMIS' ? tglNow : '',
        TglEMISValid:  field === 'emisValid'  ? tglNow : '',
      });
      return NextResponse.json({ success: true, newValue: true });
    }
  } catch (error: any) {
    console.error('EMIS POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
