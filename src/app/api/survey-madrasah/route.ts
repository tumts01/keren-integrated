import { NextResponse } from 'next/server';
import { getSurveyDoc } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { surveyType, data } = body;

    if (!surveyType || !data) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const doc = await getSurveyDoc();
    
    let sheetTitle = '';
    if (surveyType === 'ortu_siswa') sheetTitle = 'Survey_Ortu_Siswa';
    else if (surveyType === 'kepuasan_ortu') sheetTitle = 'Survey_Kepuasan_Ortu';
    else {
      return NextResponse.json({ success: false, error: 'Tipe survey tidak valid' }, { status: 400 });
    }

    let sheet = doc.sheetsByTitle[sheetTitle];
    if (!sheet) {
      // Create sheet if it doesn't exist
      const headers = Object.keys(data);
      if (!headers.includes('Timestamp')) headers.unshift('Timestamp');
      
      try {
        sheet = await doc.addSheet({
          title: sheetTitle,
          headerValues: headers
        });
      } catch (err: any) {
        // sometimes it fails if someone created it concurrently or without headers
        // just fallback
      }
    } 
    
    // Check again
    sheet = doc.sheetsByTitle[sheetTitle];
    if (sheet) {
      try {
        await sheet.loadHeaderRow();
      } catch (e) {
        const headers = Object.keys(data);
        if (!headers.includes('Timestamp')) headers.unshift('Timestamp');
        await sheet.setHeaderRow(headers);
      }
    } else {
       return NextResponse.json({ success: false, error: 'Sheet tidak bisa dibuat' }, { status: 500 });
    }

    // Add Timestamp
    const rowData = {
      Timestamp: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      ...data
    };

    await sheet.addRow(rowData);

    return NextResponse.json({ success: true, message: 'Survey berhasil dikirim' });
  } catch (error: any) {
    console.error('API Survey Madrasah POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
