import { NextResponse } from 'next/server';
import { getEVotingDoc } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const doc = await getEVotingDoc();
    const sheetKandidat = doc.sheetsByTitle['Kandidat Osim'];
    const rowsKandidat = await sheetKandidat.getRows();
    
    const kandidatList = rowsKandidat.map(r => ({
      noUrut: r.get('Nomor Urut') || '',
      nama: r.get('Nama Paslon') || '',
      visi: r.get('Visi') || '',
      misi: r.get('Misi') || '',
      foto: r.get('Link Foto') || ''
    })).filter(k => k.nama);

    // Get votes from Suara Osim
    let sheetSuara = doc.sheetsByTitle['Suara Osim'];
    if (!sheetSuara) {
      sheetSuara = await doc.addSheet({ title: 'Suara Osim', headerValues: ['Waktu', 'Nama Pemilih', 'Nama Paslon'] });
    }
    const rowsSuara = await sheetSuara.getRows();
    
    const voteCounts: Record<string, number> = {};
    kandidatList.forEach(k => voteCounts[k.nama] = 0);
    
    const pemilihSet = new Set<string>();
    
    rowsSuara.forEach(r => {
      const p = r.get('Nama Pemilih');
      const k = r.get('Nama Paslon');
      if (p) pemilihSet.add(p.trim().toUpperCase());
      if (k && voteCounts[k] !== undefined) {
        voteCounts[k]++;
      }
    });

    const result = kandidatList.map(k => ({
      ...k,
      suara: voteCounts[k.nama] || 0
    }));

    return NextResponse.json({ success: true, data: result, totalPemilih: pemilihSet.size }, {
      headers: { 'Cache-Control': 'public, s-maxage=0, stale-while-revalidate=5' }
    });
  } catch (err: any) {
    console.error('Error GET E-Voting:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
