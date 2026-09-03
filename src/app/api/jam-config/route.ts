import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tanggal = searchParams.get('tanggal');

    const { data: rows, error } = await supabase.from('data_jam_config').select('*');
    if (error) throw error;

    const data = (rows || []).map((r: any) => ({
      tanggal: r.metadata?.['Tanggal'] || r.tanggal || '',
      jamTersedia: r.metadata?.['JamTersedia'] || '',
      keterangan: r.metadata?.['Keterangan'] || '',
      updatedAt: r.metadata?.['UpdatedAt'] || '',
    })).filter((r: any) => r.tanggal);

    if (tanggal) {
      const found = data.find((r: any) => r.tanggal === tanggal);
      if (!found) {
        return NextResponse.json({ success: true, jamTersedia: [1,2,3,4,5,6,7,8,9,10,11,12,13], keterangan: '' });
      }
      const jams = found.jamTersedia.split(',').map((s: string) => parseInt(s.trim())).filter((n: number) => !isNaN(n));
      return NextResponse.json({ success: true, jamTersedia: jams, keterangan: found.keterangan });
    }

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tanggal, jamTersedia, keterangan } = body;

    if (!tanggal || !jamTersedia || !Array.isArray(jamTersedia)) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const jamStr = jamTersedia.join(', ');
    const updatedAt = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    // Check existing
    const { data: existingRow } = await supabase.from('data_jam_config').select('*').eq('tanggal', tanggal).single();

    const metadata = {
      'Tanggal': tanggal,
      'JamTersedia': jamStr,
      'Keterangan': keterangan || '',
      'UpdatedAt': updatedAt
    };

    if (existingRow) {
      const { error } = await supabase.from('data_jam_config').update({ metadata }).eq('id', existingRow.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('data_jam_config').insert([{ tanggal, metadata }]);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
