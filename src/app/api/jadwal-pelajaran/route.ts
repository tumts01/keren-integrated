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

    // Keep track of active days we are parsing in parallel (since SENIN and KAMIS are side-by-side)
    // Map column index of "JAM" -> { currentDay, classColMap }
    const activeBlocks: Record<number, { day: string, classColMap: Record<number, string> }> = {};

    for (let r = 0; r < rowCount - 1; r++) {
      // 1. Detect if this row contains 'JAM' headers
      let isHeaderRow = false;
      for (let c = 0; c < colCount - 1; c++) {
        const valC = sheetJadwal.getCell(r, c).value;
        const valD = sheetJadwal.getCell(r, c + 1).value;
        
        if (typeof valC === 'string' && valC.trim().toUpperCase() === 'JAM' && typeof valD === 'string') {
          let dayStr = valD.trim().toUpperCase().replace(/['\s]/g, ''); // "JUM' AT" -> "JUMAT"
          if (DAYS.includes(dayStr)) {
            isHeaderRow = true;
            // The NEXT row contains the class names for this block
            const classColMap: Record<number, string> = {};
            for (let classCol = c + 1; classCol < c + 35 && classCol < colCount; classCol++) {
              const valClass = sheetJadwal.getCell(r + 1, classCol).value;
              if (valClass && typeof valClass === 'string') {
                let rawClass = valClass.trim().toUpperCase();
                if (rawClass.match(/^[789][A-Z]$/)) {
                  if (rawClass.startsWith('7')) rawClass = 'VII_' + rawClass.substring(1);
                  else if (rawClass.startsWith('8')) rawClass = 'VIII_' + rawClass.substring(1);
                  else if (rawClass.startsWith('9')) rawClass = 'IX_' + rawClass.substring(1);
                  classColMap[classCol] = rawClass;
                }
              }
            }
            activeBlocks[c] = { day: dayStr, classColMap };
          }
        }
      }

      if (isHeaderRow) {
        r++; // Skip the next row since we already processed the class names
        continue;
      }

      // 2. Parse schedule rows for all active blocks
      for (const [jamColStr, blockInfo] of Object.entries(activeBlocks)) {
        const jamCol = parseInt(jamColStr);
        const jamVal = sheetJadwal.getCell(r, jamCol).value;
        
        // If it's a valid Jam Ke number
        if (typeof jamVal === 'number' || (typeof jamVal === 'string' && !isNaN(parseInt(jamVal)))) {
          const jamKe = parseInt(jamVal.toString());
          
          for (const [colIndexStr, className] of Object.entries(blockInfo.classColMap)) {
            const colIndex = parseInt(colIndexStr);
            let kodeGuru = sheetJadwal.getCell(r, colIndex).value;
            if (kodeGuru !== null && kodeGuru !== undefined && kodeGuru !== '') {
              kodeGuru = kodeGuru.toString().trim();
              const guruInfo = mapKodeGuru[kodeGuru] || { namaGuru: 'Unknown', mataPelajaran: 'Unknown' };
              
              if (['K', 'PK', 'UPACARA', 'ISTIRAHAT'].includes(kodeGuru.toUpperCase())) {
                 guruInfo.namaGuru = kodeGuru.toUpperCase() === 'K' ? 'Kosong' : kodeGuru.toUpperCase();
                 guruInfo.mataPelajaran = '-';
              }

              parsedData.push({
                kelas: className,
                hari: blockInfo.day,
                jamKe,
                kodeGuru,
                namaGuru: guruInfo.namaGuru,
                mataPelajaran: guruInfo.mataPelajaran
              });
            }
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
