import { NextResponse } from 'next/server';
import { getSurveyDoc } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const doc = await getSurveyDoc();
    
    const rekap = [
      { id: 'wali_murid', nama: 'Angket Persepsi Wali Murid', total: 0, latest: [] as any[] },
      { id: 'siswa', nama: 'Angket Persepsi Siswa', total: 0, latest: [] as any[] },
      { id: 'kepuasan_ortu', nama: 'Angket Kepuasan Orang Tua', total: 0, latest: [] as any[] },
    ];

    const sheetTitles = ['Survey_Wali_Murid', 'Survey_Siswa', 'Survey_Kepuasan_Ortu'];
    
    for (let i = 0; i < sheetTitles.length; i++) {
      const sheet = doc.sheetsByTitle[sheetTitles[i]];
      if (sheet) {
        try {
          const rows = await sheet.getRows();
          rekap[i].total = rows.length;
          
          // Ambil 10 data terakhir untuk detail ringkas
          const lastRows = rows.slice(-10).reverse();
          rekap[i].latest = lastRows.map(r => ({
            timestamp: r.get('Timestamp') || '-',
            nama: r.get('Nama Wali Murid') || r.get('Nama Siswa') || r.get('Nama Anak / Siswa') || '-',
            kelas: r.get('Kelas') || r.get('Kelas Siswa') || '-'
          }));
        } catch (e) {
          console.error(`Error loading rows for sheet ${sheetTitles[i]}:`, e);
          // Biarkan total 0 dan latest kosong
        }
      }
    }

    return NextResponse.json({ success: true, data: rekap });
  } catch (error: any) {
    console.error('API Survey Rekap Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data rekap: ' + error.message }, { status: 500 });
  }
}
