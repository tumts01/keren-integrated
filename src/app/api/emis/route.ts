import { NextResponse } from 'next/server';
import { getIndukDoc, getSiswaDoc } from '@/lib/google-sheets';

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
    const tahunAjaran = searchParams.get('tahunAjaran') || '';

    // Ambil data siswa aktif
    const siswaDoc = await getSiswaDoc();
    const siswaSheet = siswaDoc.sheetsByTitle['db_Siswa'] || siswaDoc.sheetsByIndex[0];
    const siswaRows = await siswaSheet.getRows();

    // Filter siswa aktif & latest
    const siswaAktif = siswaRows.filter((r: any) => {
      const status = (r.get('Status') || '').toLowerCase().trim();
      const ta = r.get('Tahun Ajaran') || r.get('TahunAjaran') || '';
      if (tahunAjaran && ta !== tahunAjaran) return false;
      return status === 'aktif';
    });

    // Ambil data EMIS dari induk
    const indukDoc = await getIndukDoc();
    const emisSheet = await getOrCreateEmisSheet(indukDoc);
    const emisRows = await emisSheet.getRows();

    // Buat map EMIS berdasarkan NISN
    const emisMap: Record<string, any> = {};
    emisRows.forEach((r: any) => {
      const nisn = (r.get('NISN') || '').trim();
      if (nisn) {
        emisMap[nisn] = {
          masukEMIS: (r.get('MasukEMIS') || '').toUpperCase() === 'YES',
          emisValid: (r.get('EMISValid') || '').toUpperCase() === 'YES',
          tglMasukEMIS: r.get('TglMasukEMIS') || '',
          tglEMISValid: r.get('TglEMISValid') || '',
        };
      }
    });

    // Kumpulkan tahun ajaran unik
    const tahunAjaranList = Array.from(new Set(
      siswaRows.map((r: any) => r.get('Tahun Ajaran') || r.get('TahunAjaran') || '').filter(Boolean)
    )).sort().reverse();

    const data = siswaAktif.map((r: any) => {
      const nisn = (r.get('NISN') || '').trim();
      const emis = emisMap[nisn] || { masukEMIS: false, emisValid: false, tglMasukEMIS: '', tglEMISValid: '' };
      return {
        nisn,
        nis: r.get('NIS') || '',
        nama: r.get('Nama') || r.get('Nama Siswa') || '',
        kelas: r.get('Rombel') || r.get('Kelas') || '',
        tahunAjaran: r.get('Tahun Ajaran') || r.get('TahunAjaran') || '',
        masukEMIS: emis.masukEMIS,
        emisValid: emis.emisValid,
        tglMasukEMIS: emis.tglMasukEMIS,
        tglEMISValid: emis.tglEMISValid,
      };
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
    // field = 'masukEMIS' | 'emisValid'

    if (!nisn || !field) return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });

    const indukDoc = await getIndukDoc();
    const emisSheet = await getOrCreateEmisSheet(indukDoc);
    const rows = await emisSheet.getRows();

    const tglNow = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const existingRow = rows.find((r: any) => (r.get('NISN') || '').trim() === nisn.trim());

    if (existingRow) {
      // Update existing row
      const currentVal = (existingRow.get(field === 'masukEMIS' ? 'MasukEMIS' : 'EMISValid') || '').toUpperCase();
      const newVal = currentVal === 'YES' ? 'NO' : 'YES'; // toggle
      if (field === 'masukEMIS') {
        existingRow.set('MasukEMIS', newVal);
        existingRow.set('TglMasukEMIS', newVal === 'YES' ? tglNow : '');
      } else {
        existingRow.set('EMISValid', newVal);
        existingRow.set('TglEMISValid', newVal === 'YES' ? tglNow : '');
      }
      await existingRow.save();
      return NextResponse.json({ success: true, newValue: newVal === 'YES' });
    } else {
      // Buat baris baru
      const newRow: any = {
        NISN: nisn,
        Nama: nama || '',
        Kelas: kelas || '',
        TahunAjaran: tahunAjaran || '',
        MasukEMIS: field === 'masukEMIS' ? 'YES' : 'NO',
        EMISValid: field === 'emisValid' ? 'YES' : 'NO',
        TglMasukEMIS: field === 'masukEMIS' ? tglNow : '',
        TglEMISValid: field === 'emisValid' ? tglNow : '',
      };
      await emisSheet.addRow(newRow);
      return NextResponse.json({ success: true, newValue: true });
    }
  } catch (error: any) {
    console.error('EMIS POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
