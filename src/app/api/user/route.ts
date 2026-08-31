import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: rows, error } = await supabase.from('data_users').select('*');
    if (error) throw error;
    
    const users = (rows || []).map(row => ({
      nama: row.nama || '',
      username: row.username || '',
      role: row.role || 'Staf',
    })).filter(u => u.nama);

    return NextResponse.json({ success: true, data: users }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
    });
  } catch (error: any) {
    console.error('Fetch Users Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data user dari Spreadsheet.' }, { status: 500 });
  }
}
