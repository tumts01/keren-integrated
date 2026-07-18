import { NextResponse } from 'next/server';
import { getPersuratanDoc } from '@/lib/google-sheets';

export async function GET() {
  try {
    const doc = await getPersuratanDoc();
    
    // Log available sheets to debug if ARSIP SURAT MASUK exists
    const sheetTitles = Object.keys(doc.sheetsByTitle);
    
    const sheetKeluar = doc.sheetsByTitle['NO SURAT KELUAR'];
    const sheetMasuk = doc.sheetsByTitle['ARSIP SURAT MASUK'];
    const sheetKode = doc.sheetsByTitle['KODE SURAT'];

    if (!sheetKeluar) {
      return NextResponse.json({ success: false, error: 'Tab NO SURAT KELUAR tidak ditemukan. Tab yang ada: ' + sheetTitles.join(', ') }, { status: 404 });
    }

    const rowsKeluar = await sheetKeluar.getRows();
    const dataKeluar = rowsKeluar.map((row, index) => {
      return {
        id: index,
        rowNumber: row.rowNumber,
        no: row.get('NO') || '',
        tanggal: row.get('TANGGAL') || '',
        namaSurat: row.get('NAMA SURAT') || '',
        yangDitugaskan: row.get('yang Ditugaskan') || row.get('YANG DITUGASKAN') || row.get('NAMA KORBAN') || '', // Handle variations in column names
        topik: row.get('TOPIK') || '',
        pj: row.get('PJ') || '',
        noSurat: row.get('NO. SURAT') || '',
        batasWaktu: row.get('BATAS WAKTU TUGAS') || '',
        fileScan: (() => {
          const val = row.get('FILE/SCAN SURAT') || '';
          // Ignore placeholder texts that are not actual links
          if (val.toLowerCase().includes('klik disini') || !val.includes('http')) {
            return '';
          }
          return val;
        })(),
      };
    }).filter(item => item.noSurat || item.namaSurat); // Filter out empty rows

    let dataMasuk: any[] = [];
    if (sheetMasuk) {
      const rowsMasuk = await sheetMasuk.getRows();
      // We don't know the exact columns for SURAT MASUK yet, let's just grab everything raw
      dataMasuk = rowsMasuk.map((row, index) => {
        // Assuming standard columns like TANGGAL, PENGIRIM, NOMOR SURAT, PERIHAL, FILE
        return {
          id: index,
          rowNumber: row.rowNumber,
          tanggal: row.get('TANGGAL') || row.get('TGL MASUK') || row.get('TANGGAL TERIMA') || '',
          pengirim: row.get('PENGIRIM') || row.get('ASAL SURAT') || '',
          noSurat: row.get('NO. SURAT') || row.get('NOMOR SURAT') || '',
          perihal: row.get('PERIHAL') || row.get('ISI RINGKAS') || row.get('NAMA SURAT') || '',
          fileScan: (() => {
            const val = row.get('FILE/SCAN SURAT') || row.get('FILE') || '';
            if (val.toLowerCase().includes('klik disini') || !val.includes('http')) {
              return '';
            }
            return val;
          })()
        };
      }).filter(item => item.noSurat || item.perihal);
    }

    let listTopik: string[] = [];
    if (sheetKode) {
      await sheetKode.loadCells('A1:B100');
      for (let i = 2; i < 100; i++) {
        const kodeVal = sheetKode.getCell(i, 0).value;
        const topikVal = sheetKode.getCell(i, 1).value;
        if (kodeVal && topikVal) {
          listTopik.push(topikVal.toString().trim());
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      suratKeluar: dataKeluar,
      suratMasuk: dataMasuk,
      topikList: listTopik,
      sheetTitles // For debugging
    });
  } catch (error: any) {
    console.error('Fetch Persuratan Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data dari Database: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    if (action === 'generate') {
      const doc = await getPersuratanDoc();
      const sheetKeluar = doc.sheetsByTitle['NO SURAT KELUAR'];
      const sheetKode = doc.sheetsByTitle['KODE SURAT'];

      if (!sheetKeluar || !sheetKode) {
        return NextResponse.json({ success: false, error: 'Tab NO SURAT KELUAR atau KODE SURAT tidak ditemukan' }, { status: 404 });
      }
      
      // Auto-add column BATAS WAKTU TUGAS if missing
      await sheetKeluar.loadHeaderRow();
      if (!sheetKeluar.headerValues.includes('BATAS WAKTU TUGAS')) {
        await sheetKeluar.setHeaderRow([...sheetKeluar.headerValues, 'BATAS WAKTU TUGAS']);
      }

      const { tanggal, namaSurat, yangDitugaskan, topik, pj, batasWaktu } = payload;
      
      // Parse Date for Roman Month and Year
      // Assume tanggal is YYYY-MM-DD
      const dateObj = new Date(tanggal);
      const romanMonths = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
      const romanMonth = romanMonths[dateObj.getMonth()];
      const year = dateObj.getFullYear();

      // Load all rows to find the next NO for the given year
      const rowsKeluar = await sheetKeluar.getRows();
      let maxNo = 0;
      rowsKeluar.forEach(row => {
        const rowTanggal = row.get('TANGGAL') || '';
        // Only count numbers from the same year
        if (rowTanggal.endsWith(year.toString())) {
          const currentNo = parseInt(row.get('NO'), 10);
          if (!isNaN(currentNo) && currentNo > maxNo) {
            maxNo = currentNo;
          }
        }
      });
      const nextNo = maxNo + 1;

      // Find KODE SURAT mapping
      let kodeSurat = '';
      await sheetKode.loadCells('A1:B100');
      for (let i = 2; i < 100; i++) {
        const kodeVal = sheetKode.getCell(i, 0).value;
        const topikVal = sheetKode.getCell(i, 1).value;
        if (kodeVal && topikVal && topikVal.toString().trim() === topik) {
          kodeSurat = kodeVal.toString().trim();
          break;
        }
      }

      if (!kodeSurat) {
        return NextResponse.json({ success: false, error: `Kode surat tidak ditemukan untuk topik: ${topik}` }, { status: 400 });
      }

      // Format NO with leading zeros: 000
      const formattedNo = String(nextNo).padStart(3, '0');

      // Build NO. SURAT
      // Formula: TEXT(A2;"000")&"/YPA/MTs-01."&FILTER(...)&"/"&ROMAN(MONTH)&"/"&YEAR
      const noSurat = `${formattedNo}/YPA/MTs-01.${kodeSurat}/${romanMonth}/${year}`;

      // Date format for sheets: DD/MM/YYYY
      const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${year}`;
      
      // Date format for batas waktu
      let formattedBatasWaktu = '';
      if (batasWaktu) {
        const batasObj = new Date(batasWaktu);
        formattedBatasWaktu = `${String(batasObj.getDate()).padStart(2, '0')}/${String(batasObj.getMonth() + 1).padStart(2, '0')}/${batasObj.getFullYear()}`;
      }

      // Add Row to Spreadsheet
      await sheetKeluar.addRow({
        'NO': nextNo,
        'TANGGAL': formattedDate,
        'NAMA SURAT': namaSurat,
        'NAMA KORBAN': yangDitugaskan, // User's custom column name (old)
        'YANG DITUGASKAN': yangDitugaskan, // Try uppercase
        'yang Ditugaskan': yangDitugaskan, // Try exact match from user's sheet
        'TOPIK': topik,
        'PJ': pj,
        'NO. SURAT': noSurat,
        'BATAS WAKTU TUGAS': formattedBatasWaktu,
        'FILE/SCAN SURAT': ''
      });

      return NextResponse.json({ success: true, nextNo, noSurat });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak valid' }, { status: 400 });

  } catch (error: any) {
    console.error('POST Persuratan Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memproses data: ' + error.message }, { status: 500 });
  }
}
