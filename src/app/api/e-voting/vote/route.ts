import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { namaPemilih, namaPaslon } = await req.json();

    if (!namaPemilih || !namaPaslon) {
      return NextResponse.json({ success: false, error: 'Nama Pemilih dan Paslon wajib diisi' }, { status: 400 });
    }

    // Cek apakah sudah pernah memilih
    const { data: existingVotes, error: errCek } = await supabase
      .from('suara_osim')
      .select('nama_pemilih');

    if (errCek) throw errCek;

    const pemilihSet = new Set((existingVotes || []).map(r => (r.nama_pemilih || '').trim().toUpperCase()));

    if (pemilihSet.has(namaPemilih.trim().toUpperCase())) {
      return NextResponse.json({ success: false, error: 'Anda sudah pernah memberikan suara!' }, { status: 400 });
    }

    // Insert suara
    const waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const { error: errInsert } = await supabase
      .from('suara_osim')
      .insert({
        waktu,
        nama_pemilih: namaPemilih.trim(),
        nama_paslon: namaPaslon.trim()
      });

    if (errInsert) throw errInsert;

    return NextResponse.json({ success: true, message: 'Suara berhasil direkam' });
  } catch (err: any) {
    console.error('Error POST E-Voting Supabase:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
