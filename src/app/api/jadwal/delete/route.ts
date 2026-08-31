import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    if (!data.id) {
      return NextResponse.json({ success: false, error: 'ID tidak ditemukan' }, { status: 400 });
    }

    const { data: rows, error: fetchError } = await supabase.from('jadwal_mengajar').select('*');
    if (fetchError) throw fetchError;

    const row = (rows || []).find((r: any) => r.id === data.id || r.metadata?.id === data.id);
    
    if (row) {
      const { error } = await supabase.from('jadwal_mengajar').delete().eq('id', row.id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: 'Data tidak ditemukan' }, { status: 404 });
    }
  } catch (error: any) {
    console.error('Error in DELETE Jadwal:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
