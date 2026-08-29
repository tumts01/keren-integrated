import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('pemetaan_siswa')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      throw error;
    }

    // Ubah format menjadi seperti yang diharapkan frontend lama atau biarkan frontend yang menyesuaikan
    // Disini kita biarkan mengembalikan data asli Supabase
    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
    });
  } catch (error: any) {
    console.error('API Survey Pemetaan Supabase Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data pemetaan: ' + error.message }, { status: 500 });
  }
}
