import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const EXPECTED_HEADERS = [
  'id', 'kodeGuru', 'namaGuru', 'statusGuru', 'mataPelajaran',
  'VII_A', 'VII_B', 'VII_C', 'VII_D', 'VII_E', 'VII_F', 'VII_G', 'VII_H', 'VII_I',
  'VIII_A', 'VIII_B', 'VIII_C', 'VIII_D', 'VIII_E', 'VIII_F', 'VIII_G', 'VIII_H', 'VIII_I',
  'IX_A', 'IX_B', 'IX_C', 'IX_D', 'IX_E', 'IX_F', 'IX_G', 'IX_H', 'IX_I',
  'totalJam', 'keterangan'
];

export async function GET() {
  try {
    const { data: rows, error } = await supabase.from('jadwal_mengajar').select('*');
    if (error) throw error;

    const data = (rows || []).map((r: any) => {
      const rowData: Record<string, any> = {};
      EXPECTED_HEADERS.forEach(header => {
        rowData[header] = r.metadata?.[header] || '';
      });
      if (!rowData['id']) {
        rowData['id'] = r.id;
      }
      return rowData;
    });

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
    });
  } catch (error) {
    console.error('Error fetching Jadwal Mengajar:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data jadwal mengajar' }, { status: 500 });
  }
}