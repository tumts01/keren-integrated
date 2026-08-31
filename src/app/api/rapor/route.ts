import { NextResponse } from 'next/server';
import { getRaporDoc } from '@/lib/google-sheets';
import { supabase } from '@/lib/supabase';

function excelDateToJSDate(serial: number) {
  const utc_days  = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;                                        
  const date_info = new Date(utc_value * 1000);
  return date_info;
}

export async function GET() {
  try {
    // 1. Fetch Students from Supabase
    const { data: rawSiswa, error } = await supabase.from('data_induk').select('*');
    if (error) throw error;
    
    const activeStudents = (rawSiswa || []).map((row: any) => {
        let rombel = (row.metadata?.['ROMBEL KELAS 9'] || '').trim();
        if (!rombel) rombel = (row.metadata?.['ROMBEL KELAS 8'] || '').trim();
        if (!rombel) rombel = (row.metadata?.['ROMBEL KELAS 7'] || '').trim();
        if (!rombel) rombel = (row.metadata?.['ROMBEL'] || '').trim();

        return {
           nis: row.metadata?.['ID SISWA'] || row.id_siswa || '',
           nama: row.metadata?.['NAMA'] || row.nama || '',
           kelas: rombel,
           status: (row.metadata?.['STATUS SISWA'] || '').toLowerCase().trim()
        }
    }).filter((s: any) => s.status === 'aktif' && s.kelas && s.nis);

    // 2. Fetch Config & Returned Report Cards in Parallel
    const raporDoc = await getRaporDoc();
    let configSheet = raporDoc.sheetsByTitle['CONFIG'];
    let returnedSheet = raporDoc.sheetsByTitle['PENGEMBALIAN'];
    
    // Create them if missing
    if (!configSheet) {
      configSheet = await raporDoc.addSheet({ title: 'CONFIG', headerValues: ['Key', 'Value'] });
      await configSheet.addRow({ Key: 'StartDate', Value: '' });
      await configSheet.addRow({ Key: 'EndDate', Value: '' });
    }
    if (!returnedSheet) {
      returnedSheet = await raporDoc.addSheet({ title: 'PENGEMBALIAN', headerValues: ['NIS', 'TANGGAL KEMBALI'] });
    }

    const [configRows, returnedRows] = await Promise.all([
      configSheet.getRows(),
      returnedSheet.getRows()
    ]);

    let startDate = '', endDate = '';
    const startRow = configRows.find(r => r.get('Key') === 'StartDate');
    const endRow = configRows.find(r => r.get('Key') === 'EndDate');
    if (startRow) startDate = startRow.get('Value') || '';
    if (endRow) endDate = endRow.get('Value') || '';

    let returnedMap: Record<string, string> = {};
    returnedRows.forEach(r => {
      const nis = (r.get('NIS') || '').toString().trim();
      let tgl = (r.get('TANGGAL KEMBALI') || '').trim();
      
      if (tgl && !isNaN(Number(tgl))) {
        const jsDate = excelDateToJSDate(Number(tgl));
        tgl = jsDate.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
      
      if (nis) returnedMap[nis] = tgl;
    });

    // 4. Combine Data
    const data = activeStudents.map((s: any) => ({
      ...s,
      tanggalKembali: returnedMap[s.nis] || null,
      isReturned: !!returnedMap[s.nis]
    }));

    return NextResponse.json({ success: true, data, config: { startDate, endDate } }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
    });

  } catch (error: any) {
    console.error('Fetch Rapor Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memuat data rapor' }, { status: 500 });
  }
}
