import { NextResponse } from 'next/server';
import { getEVotingDoc } from '@/lib/google-sheets';

export async function POST(req: Request) {
  try {
    const { namaPemilih, namaPaslon } = await req.json();

    if (!namaPemilih || !namaPaslon) {
      return NextResponse.json({ success: false, error: 'Nama Pemilih dan Paslon wajib diisi' }, { status: 400 });
    }

    const doc = await getEVotingDoc();
    let sheetSuara = doc.sheetsByTitle['Suara Osim'];
    if (!sheetSuara) {
      sheetSuara = await doc.addSheet({ title: 'Suara Osim', headerValues: ['Waktu', 'Nama Pemilih', 'Nama Paslon'] });
    }

    const rowsSuara = await sheetSuara.getRows();
    const pemilihSet = new Set(rowsSuara.map(r => (r.get('Nama Pemilih') || '').trim().toUpperCase()));

    if (pemilihSet.has(namaPemilih.trim().toUpperCase())) {
      return NextResponse.json({ success: false, error: 'Anda sudah pernah memberikan suara!' }, { status: 400 });
    }

    await sheetSuara.addRow({
      'Waktu': new Date().toLocaleString('id-ID'),
      'Nama Pemilih': namaPemilih,
      'Nama Paslon': namaPaslon
    });

    return NextResponse.json({ success: true, message: 'Suara berhasil direkam' });
  } catch (err: any) {
    console.error('Error POST E-Voting:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
