import { NextResponse } from 'next/server';
import { getIndukDoc, getRaporDoc } from '@/lib/google-sheets';

function excelDateToJSDate(serial: number) {
  const utc_days  = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;                                        
  const date_info = new Date(utc_value * 1000);
  return date_info;
}

export async function GET() {
  try {
    // 1. Fetch Students
    const indukDoc = await getIndukDoc();
    const sheetSiswa = indukDoc.sheetsByTitle['DATABASE'];
    if (!sheetSiswa) throw new Error("Tab DATABASE Siswa tidak ditemukan");
    
    const rowsSiswa = await sheetSiswa.getRows();
    const activeStudents = rowsSiswa.map(row => {
        let rombel = (row.get('ROMBEL KELAS 9') || '').trim();
        if (!rombel) rombel = (row.get('ROMBEL KELAS 8') || '').trim();
        if (!rombel) rombel = (row.get('ROMBEL KELAS 7') || '').trim();
        if (!rombel) rombel = (row.get('ROMBEL') || '').trim();

        return {
           nis: row.get('ID SISWA') || '',
           nama: row.get('NAMA') || '',
           kelas: rombel,
           status: (row.get('STATUS SISWA') || '').toLowerCase().trim()
        }
    }).filter(s => s.status === 'aktif' && s.kelas && s.nis);

    // 2. Fetch Config
    const raporDoc = await getRaporDoc();
    let configSheet = raporDoc.sheetsByTitle['CONFIG'];
    let startDate = '', endDate = '';
    
    if (!configSheet) {
      configSheet = await raporDoc.addSheet({ title: 'CONFIG', headerValues: ['Key', 'Value'] });
      await configSheet.addRow({ Key: 'StartDate', Value: '' });
      await configSheet.addRow({ Key: 'EndDate', Value: '' });
    } else {
      const configRows = await configSheet.getRows();
      const startRow = configRows.find(r => r.get('Key') === 'StartDate');
      const endRow = configRows.find(r => r.get('Key') === 'EndDate');
      if (startRow) startDate = startRow.get('Value') || '';
      if (endRow) endDate = endRow.get('Value') || '';
    }

    // 3. Fetch Returned Report Cards
    const sheetBalekno = raporDoc.sheetsByTitle['BALEKNO'];
    let returnedNis = new Set();
    
    if (sheetBalekno) {
       try {
         await sheetBalekno.loadHeaderRow(1); // The header is on row 1
         const rowsBalekno = await sheetBalekno.getRows({ offset: 0 }); // Fetch rows after header
         
         for (const row of rowsBalekno) {
           const namaKolom = row.get('NAMA') || '';
           const tglVal = row.get('TANGGAL');
           
           if (!namaKolom) continue;
           
           // Extract NIS (first token)
           const nis = namaKolom.split(' ')[0];
           
           // Validate Date
           let isValidDate = true;
           if (startDate || endDate) {
             let jsDate: Date | null = null;
             try {
               if (!isNaN(Number(tglVal))) {
                 jsDate = excelDateToJSDate(Number(tglVal));
               } else if (typeof tglVal === 'string') {
                 const datePart = tglVal.split(' ')[0];
                 const parts = datePart.split(/[\/\-]/);
                 if (parts.length === 3 && parts[2].length === 4) {
                   // Convert DD/MM/YYYY to YYYY-MM-DD
                   jsDate = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T12:00:00Z`);
                 } else {
                   jsDate = new Date(tglVal);
                 }
               }
               
               if (jsDate && !isNaN(jsDate.getTime())) {
                 const yyyy = jsDate.getUTCFullYear();
                 const mm = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
                 const dd = String(jsDate.getUTCDate()).padStart(2, '0');
                 const yyyymmdd = `${yyyy}-${mm}-${dd}`;
                 
                 if (startDate && yyyymmdd < startDate) isValidDate = false;
                 if (endDate && yyyymmdd > endDate) isValidDate = false;
               }
             } catch (e) {
               console.error("Date parsing error for", tglVal, e);
             }
           }
           
           if (isValidDate) {
             returnedNis.add(nis);
           }
         }
       } catch (e) {
         console.error('Error fetching Balekno rows:', e);
       }
    }

    // 4. Calculate Missing Report Cards
    const missingStudents = activeStudents.filter(s => !returnedNis.has(s.nis));
    
    // 5. Aggregate by Class
    const rekap: Record<string, {total: number, missing: number}> = {};
    for (const s of activeStudents) {
      if (!rekap[s.kelas]) {
        rekap[s.kelas] = { total: 0, missing: 0 };
      }
      rekap[s.kelas].total += 1;
    }
    
    for (const s of missingStudents) {
      if (rekap[s.kelas]) {
        rekap[s.kelas].missing += 1;
      }
    }

    const rekapArray = Object.keys(rekap).map(k => ({
      kelas: k,
      total: rekap[k].total,
      missing: rekap[k].missing,
      returned: rekap[k].total - rekap[k].missing
    })).sort((a, b) => a.kelas.localeCompare(b.kelas));

    return NextResponse.json({ 
      success: true, 
      startDate, 
      endDate,
      rekap: rekapArray,
      missingList: missingStudents,
      allActive: activeStudents
    });

  } catch (error: any) {
    console.error('Rapor GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { nis, nama, kelas } = await request.json();
    if (!nis || !nama) return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });

    const raporDoc = await getRaporDoc();
    const sheetBalekno = raporDoc.sheetsByTitle['BALEKNO'];
    if (!sheetBalekno) throw new Error('Tab BALEKNO tidak ditemukan');

    await sheetBalekno.loadHeaderRow(1); // The header is on row 1

    // Excel format date (approx) or just local date string. Let's use local date string to be safe.
    // Wait, the existing data uses serial number. Actually, Google Sheets accepts normal date strings.
    const dateStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    
    await sheetBalekno.addRow({
      'NAMA': `${nis} ${nama} ${kelas}`,
      'TANGGAL': dateStr
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { startDate, endDate } = await request.json();
    
    const raporDoc = await getRaporDoc();
    let configSheet = raporDoc.sheetsByTitle['CONFIG'];
    if (!configSheet) {
      configSheet = await raporDoc.addSheet({ title: 'CONFIG', headerValues: ['Key', 'Value'] });
    }

    const rows = await configSheet.getRows();
    let startRow = rows.find(r => r.get('Key') === 'StartDate');
    let endRow = rows.find(r => r.get('Key') === 'EndDate');

    if (startRow) { startRow.set('Value', startDate || ''); await startRow.save(); }
    else { await configSheet.addRow({ Key: 'StartDate', Value: startDate || '' }); }

    if (endRow) { endRow.set('Value', endDate || ''); await endRow.save(); }
    else { await configSheet.addRow({ Key: 'EndDate', Value: endDate || '' }); }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
