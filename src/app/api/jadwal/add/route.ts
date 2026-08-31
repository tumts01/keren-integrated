import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const EXPECTED_HEADERS = [
  'id', 'kodeGuru', 'namaGuru', 'statusGuru', 'mataPelajaran',
  'VII_A', 'VII_B', 'VII_C', 'VII_D', 'VII_E', 'VII_F', 'VII_G', 'VII_H', 'VII_I',
  'VIII_A', 'VIII_B', 'VIII_C', 'VIII_D', 'VIII_E', 'VIII_F', 'VIII_G', 'VIII_H', 'VIII_I',
  'IX_A', 'IX_B', 'IX_C', 'IX_D', 'IX_E', 'IX_F', 'IX_G', 'IX_H', 'IX_I',
  'totalJam', 'keterangan'
];

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    if (!data.kodeGuru || !data.namaGuru || !data.mataPelajaran) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap (Kode Guru, Nama, dan Mapel wajib diisi)' }, { status: 400 });
    }

    const { data: rows, error: fetchError } = await supabase.from('jadwal_mengajar').select('*');
    if (fetchError) throw fetchError;

    if (data.id) {
      const row = (rows || []).find((r: any) => r.id === data.id || r.metadata?.id === data.id);
      if (row) {
        const newMetadata = { ...row.metadata };
        EXPECTED_HEADERS.forEach(header => {
          if (header !== 'id' && data[header] !== undefined) {
            newMetadata[header] = data[header];
          }
        });
        const { error } = await supabase.from('jadwal_mengajar').update({ metadata: newMetadata }).eq('id', row.id);
        if (error) throw error;
        return NextResponse.json({ success: true });
      }
    }

    // Jika tidak ada ID atau row tidak ditemukan, buat baris baru
    const newId = Date.now().toString();
    const newMetadata: Record<string, any> = { id: newId };
    
    EXPECTED_HEADERS.forEach(header => {
      if (header !== 'id') {
        newMetadata[header] = data[header] !== undefined ? data[header] : '';
      }
    });

    const { error: insertError } = await supabase.from('jadwal_mengajar').insert([{ metadata: newMetadata }]);
    if (insertError) throw insertError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in POST Jadwal:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
