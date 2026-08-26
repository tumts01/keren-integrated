import { NextResponse } from 'next/server';
import { getIndukDoc } from '@/lib/google-sheets';

export async function GET() {
  try {
    const doc = await getIndukDoc();
    const sheet = doc.sheetsByTitle['DATABASE'];
    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();
    const asalHeader = 'SD/MI';
    const counts: Record<string, number> = {}; 
    let total = 0;
    
    rows.forEach(r => {
      if ((r.get('STATUS SISWA') || '').toString().toLowerCase() !== 'aktif') return;
      
      const ta7 = r.get('TA KELAS 7');
      const ta8 = r.get('TA KELAS 8');
      const ta9 = r.get('TA KELAS 9');
      
      // Siswa kelas 7 adalah yang punya TA KELAS 7 tapi TIDAK punya TA KELAS 8 & 9
      if (ta7 && !ta8 && !ta9) {
        const val = r.get(asalHeader) || 'TIDAK DIKETAHUI';
        let key = val.toString().trim().toUpperCase();
        if (key === '' || key === '-') key = 'TIDAK DIKETAHUI';
        counts[key] = (counts[key] || 0) + 1;
        total++;
      }
    });
    
    const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
    return NextResponse.json({ total, data: sorted });
  } catch(e: any) {
    return NextResponse.json({ error: e.message });
  }
}
