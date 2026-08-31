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
    const sheetRiwayat = doc.sheetsByTitle['RIWAYAT_CETAK'];

    if (!sheetKeluar) {
      return NextResponse.json({ success: false, error: 'Tab NO SURAT KELUAR tidak ditemukan. Tab yang ada: ' + sheetTitles.join(', ') }, { status: 404 });
    }

    // Prepare promises to load everything in parallel
    const promises: Promise<any>[] = [];
    
    // 0: Keluar
    promises.push(sheetKeluar.getRows());
    
    // 1 & 2: Masuk (Header & Rows)
    if (sheetMasuk) {
      promises.push(sheetMasuk.loadHeaderRow().then(() => sheetMasuk.getRows()));
    } else {
      promises.push(Promise.resolve(null));
    }

    // 3: Kode (Cells)
    if (sheetKode) {
      promises.push(sheetKode.loadCells('A1:B100'));
    } else {
      promises.push(Promise.resolve(null));
    }
    
    // 4: Riwayat
    if (sheetRiwayat) {
      promises.push(sheetRiwayat.getRows());
    } else {
      promises.push(Promise.resolve([]));
    }

    // Wait for all Google Sheets requests to finish simultaneously
    const [rowsKeluar, rowsMasuk, _, riwayatRows] = await Promise.all(promises);

    const dataKeluar = rowsKeluar.map((row: any, index: number) => {
      return {
        id: index,
        rowNumber: row.rowNumber,
        no: row.get('NO') || '',
        tanggal: row.get('TANGGAL') || '',
        namaSurat: row.get('NAMA SURAT') || '',
        yangDitugaskan: row.get('yang Ditugaskan') || row.get('YANG DITUGASKAN') || row.get('NAMA KORBAN') || '',
        topik: row.get('TOPIK') || '',
        pj: row.get('PJ') || '',
        noSurat: row.get('NO. SURAT') || '',
        batasWaktu: row.get('BATAS WAKTU TUGAS') || '',
        fileScan: (() => {
          const val = row.get('FILE/SCAN SURAT') || '';
          if (val.toLowerCase().includes('klik disini') || !val.includes('http')) {
            return '';
          }
          return val;
        })(),
      };
    }).filter((item: any) => item.noSurat || item.namaSurat); // Filter out empty rows

    let dataMasuk: any[] = [];
    if (sheetMasuk && rowsMasuk) {
      const headers = sheetMasuk.headerValues.map(h => h?.toUpperCase().trim() || '');
      const headerTanggal = headers.find(h => h.includes('TANGGAL') || h.includes('TGL')) || 'TANGGAL';
      const headerNamaSurat = headers.find(h => h.includes('NAMA SURAT') || h.includes('PERIHAL')) || 'NAMA SURAT';
      const headerPengirim = headers.find(h => h.includes('INSTANSI') || h.includes('ASAL') || h.includes('PENGIRIM')) || 'NAMA INSTANSI';
      const headerFile = headers.find(h => h.includes('FILE') || h.includes('SCAN')) || 'FILE/SCAN SURAT';

      dataMasuk = rowsMasuk.map((row: any, index: number) => {
        return {
          id: index,
          rowNumber: row.rowNumber,
          tanggal: row.get(headerTanggal) || '',
          namaSurat: row.get(headerNamaSurat) || '',
          pengirim: row.get(headerPengirim) || '',
          fileScan: (() => {
            const val = row.get(headerFile) || '';
            if (val.toLowerCase().includes('klik disini') || !val.includes('http')) {
              return '';
            }
            return val;
          })()
        };
      }).filter((item: any) => item.namaSurat || item.pengirim || item.fileScan);
    }

    let listTopik: string[] = [];
    if (sheetKode) {
      for (let i = 2; i < 100; i++) {
        const kodeVal = sheetKode.getCell(i, 0).value;
        const topikVal = sheetKode.getCell(i, 1).value;
        if (kodeVal && topikVal) {
          listTopik.push(topikVal.toString().trim());
        }
      }
    }

    let riwayatCetak: any[] = [];
    if (riwayatRows) {
      riwayatCetak = riwayatRows.map((r: any) => {
        try { return JSON.parse(r.get('DataJSON') || '{}'); } catch { return null; }
      }).filter(Boolean).reverse();
    }

    const instansiList = Array.from(new Set(dataMasuk.map((item: any) => item.pengirim).filter(Boolean))).sort();

    return NextResponse.json({ 
      success: true, 
      suratKeluar: dataKeluar,
      suratMasuk: dataMasuk.reverse(),
      topikList: listTopik,
      instansiList,
      riwayatCetak,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
    });

  } catch (error: any) {
    console.error('API Persuratan Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memuat data dari Spreadsheet: ' + error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { action, noSurat, ...data } = payload;

    if (action === 'delete') {
      const doc = await getPersuratanDoc();
      const sheet = doc.sheetsByTitle['NO SURAT KELUAR'];
      if (!sheet) return NextResponse.json({ success: false, error: 'Tab NO SURAT KELUAR tidak ditemukan' }, { status: 404 });
      
      const rows = await sheet.getRows();
      const targetRow = rows.find(r => r.rowNumber === payload.rowNumber);
      
      if (!targetRow) return NextResponse.json({ success: false, error: 'Surat tidak ditemukan' }, { status: 404 });
      
      await targetRow.delete();
      return NextResponse.json({ success: true });
    }

    if (action === 'generate_no_surat') {
      const { topik, targetNoSurat } = data;
      const doc = await getPersuratanDoc();
      const sheetKeluar = doc.sheetsByTitle['NO SURAT KELUAR'];
      const sheetKode = doc.sheetsByTitle['KODE SURAT'];

      if (!sheetKeluar || !sheetKode) {
        return NextResponse.json({ success: false, error: 'Tab NO SURAT KELUAR atau KODE SURAT tidak ditemukan' }, { status: 404 });
      }

      await sheetKode.loadCells('A1:B100');
      let kodeTopik = '';
      for (let i = 2; i < 100; i++) {
        if (sheetKode.getCell(i, 1).value?.toString().trim() === topik) {
          kodeTopik = sheetKode.getCell(i, 0).value?.toString().trim() || '';
          break;
        }
      }

      if (!kodeTopik) {
        return NextResponse.json({ success: false, error: `Kode surat tidak ditemukan untuk topik: ${topik}` }, { status: 400 });
      }

      const currentDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      const monthRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][currentDate.getMonth()];
      const year = currentDate.getFullYear();

      const newRow = await sheetKeluar.addRow({
        'NO': targetNoSurat,
        'TANGGAL': data.tanggal,
        'NAMA SURAT': data.namaSurat,
        'yang Ditugaskan': data.yangDitugaskan,
        'TOPIK': topik,
        'PJ': data.pj,
        'BATAS WAKTU TUGAS': data.batasWaktu,
        'NO. SURAT': `${targetNoSurat}/${kodeTopik}/${monthRoman}/${year}`
      });

      return NextResponse.json({ success: true, newRowNumber: newRow.rowNumber });
    }

    if (action === 'edit') {
      const doc = await getPersuratanDoc();
      const sheet = doc.sheetsByTitle['NO SURAT KELUAR'];
      const rows = await sheet.getRows();
      const targetRow = rows.find(r => r.rowNumber === payload.rowNumber);
      
      if (!targetRow) return NextResponse.json({ success: false, error: 'Surat tidak ditemukan' }, { status: 404 });

      targetRow.set('NAMA SURAT', data.namaSurat);
      targetRow.set('yang Ditugaskan', data.yangDitugaskan);
      targetRow.set('TOPIK', data.topik);
      targetRow.set('PJ', data.pj);
      targetRow.set('BATAS WAKTU TUGAS', data.batasWaktu);
      
      await targetRow.save();
      return NextResponse.json({ success: true });
    }

    if (action === 'upload_scan') {
      const doc = await getPersuratanDoc();
      const sheet = doc.sheetsByTitle['NO SURAT KELUAR'];
      const rows = await sheet.getRows();
      const targetRow = rows.find(r => r.rowNumber === payload.rowNumber);
      
      if (!targetRow) return NextResponse.json({ success: false, error: 'Surat tidak ditemukan' }, { status: 404 });

      targetRow.set('FILE/SCAN SURAT', data.fileScan);
      await targetRow.save();
      return NextResponse.json({ success: true });
    }

    if (action === 'save_riwayat') {
      const doc = await getPersuratanDoc();
      let riwayatSheet = doc.sheetsByTitle['RIWAYAT_CETAK'];
      if (!riwayatSheet) {
        riwayatSheet = await doc.addSheet({ title: 'RIWAYAT_CETAK', headerValues: ['DataJSON'] });
      }
      await riwayatSheet.addRow({ DataJSON: JSON.stringify(payload) });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak valid' }, { status: 400 });

  } catch (error: any) {
    console.error('POST Persuratan Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memproses data: ' + error.message }, { status: 500 });
  }
}
