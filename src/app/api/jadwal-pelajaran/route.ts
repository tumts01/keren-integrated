import { NextResponse } from 'next/server';
import { getPresensiDoc, getIndukDoc } from '@/lib/google-sheets';

const DAYS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

export async function GET() {
  try {
    const [presensiDoc, indukDoc] = await Promise.all([getPresensiDoc(), getIndukDoc()]);
    
    // 1. Ambil Data Guru & Mapel dari Induk (JadwalMengajar)
    const sheetMengajar = indukDoc.sheetsByTitle['JadwalMengajar'];
    const mapKodeGuru: Record<string, { namaGuru: string, mataPelajaran: string }> = {};
    if (sheetMengajar) {
      const rows = await sheetMengajar.getRows();
      rows.forEach(r => {
        const kode = (r.get('kodeGuru') || '').toString().trim();
        if (kode) {
          mapKodeGuru[kode] = {
            namaGuru: r.get('namaGuru') || '',
            mataPelajaran: r.get('mataPelajaran') || ''
          };
        }
      });
    }

    // 2. Ambil Jadwal Pelajaran (MASTER TEMPLATE JADWAL) dari Presensi
    const sheetJadwal = presensiDoc.sheetsByTitle['MASTER TEMPLATE JADWAL'];
    if (!sheetJadwal) {
      return NextResponse.json({ success: false, error: 'Sheet MASTER TEMPLATE JADWAL tidak ditemukan' }, { status: 404 });
    }

    const rowCount = sheetJadwal.rowCount;
    const colCount = sheetJadwal.columnCount;
    await sheetJadwal.loadCells({
      startRowIndex: 0,
      endRowIndex: rowCount,
      startColumnIndex: 0,
      endColumnIndex: colCount
    });
    
    const parsedData: any[] = [];
    let currentDay = '';
    let classColMap: Record<number, string> = {};

    for (let r = 0; r < rowCount - 1; r++) {
      const colC = sheetJadwal.getCell(r, 2).value; // Index 2 is Column C
      const colD = sheetJadwal.getCell(r, 3).value; // Index 3 is Column D
      
      if (typeof colC === 'string' && colC.trim().toUpperCase() === 'JAM' && colD && typeof colD === 'string' && DAYS.includes(colD.trim().toUpperCase())) {
        currentDay = colD.trim().toUpperCase();
        // The NEXT row contains the class names
        classColMap = {};
        for (let c = 3; c < colCount; c++) { 
          const val = sheetJadwal.getCell(r + 1, c).value;
          if (val) {
            // Format class from '7A' to 'VII_A'
            let rawClass = val.toString().trim().toUpperCase();
            if (rawClass.startsWith('7')) rawClass = 'VII_' + rawClass.substring(1);
            else if (rawClass.startsWith('8')) rawClass = 'VIII_' + rawClass.substring(1);
            else if (rawClass.startsWith('9')) rawClass = 'IX_' + rawClass.substring(1);
            
            classColMap[c] = rawClass;
          }
        }
        r++; // skip the class row since we just processed it
        continue;
      }

      // If it's a schedule row
      if (currentDay && typeof colC === 'number') {
        const jamKe = colC;
        for (const [colIndex, className] of Object.entries(classColMap)) {
          let kodeGuru = sheetJadwal.getCell(r, parseInt(colIndex)).value;
          if (kodeGuru !== null && kodeGuru !== undefined && kodeGuru !== '') {
            kodeGuru = kodeGuru.toString().trim();
            const guruInfo = mapKodeGuru[kodeGuru] || { namaGuru: 'Unknown', mataPelajaran: 'Unknown' };
            
            // Special codes like 'K' (Kosong), 'PK' (Pramuka/Upacara), etc
            if (['K', 'PK', 'UPACARA', 'ISTIRAHAT'].includes(kodeGuru.toUpperCase())) {
               guruInfo.namaGuru = kodeGuru;
               guruInfo.mataPelajaran = '-';
            }

            parsedData.push({
              kelas: className,
              hari: currentDay,
              jamKe,
              kodeGuru,
              namaGuru: guruInfo.namaGuru,
              mataPelajaran: guruInfo.mataPelajaran
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('Error fetching Jadwal Pelajaran:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
