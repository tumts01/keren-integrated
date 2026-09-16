import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase.from('data_susulan').select('*').order('id', { ascending: true });
    
    if (error) {
      // If table doesn't exist, Supabase returns an error
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, data: [] });
      }
      throw error;
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('API GET Susulan Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { participants } = body;

    if (!participants || !Array.isArray(participants)) {
      return NextResponse.json({ success: false, error: 'Invalid data' }, { status: 400 });
    }

    // Since it's a rekap, we typically want to clear old data or we can just append?
    // "simpan agar datanya tidak hilang" suggests bulk saving the current list.
    // Let's clear and re-insert for simplicity, OR if we append, we might get duplicates.
    // Let's clear all first. (Assuming 'data_susulan' is fully managed here)
    const { error: deleteError } = await supabase.from('data_susulan').delete().gt('id', 0);
    if (deleteError && deleteError.code !== '42P01') {
       throw deleteError;
    }

    if (participants.length > 0) {
      const payload = participants.map(p => ({
        metadata: {
          NISN: p.nisn,
          NAMA: p.nama,
          KELAS: p.kelas,
          'NO UJIAN': p.noUjian,
          RUANG: p.ruang
        }
      }));

      const { error: insertError } = await supabase.from('data_susulan').insert(payload);
      if (insertError) {
         throw insertError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API POST Susulan Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
