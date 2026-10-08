import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';
import { unstable_cache, revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

const getCachedPoin = unstable_cache(
  async () => {
    // Ambil data yang memiliki TIPE (Apresiasi/Pelanggaran)
    const { data, error } = await supabase
      .from('data_dispo_siswa')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching poin:', error);
      return [];
    }

    return (data || [])
      .filter(r => r.metadata && r.metadata['TIPE'])
      .map(r => ({
        id: r.metadata['ID'] || r.id.toString(),
        tanggal: r.tanggal,
        timestamp: r.metadata['TIMESTAMP'] || '',
        namaSiswa: r.metadata['NAMA SISWA'] || '',
        kelas: r.metadata['KELAS'] || '',
        tipe: r.metadata['TIPE'] || '',
        keterangan: r.metadata['KETERANGAN'] || '',
        poin: parseInt(r.metadata['POIN'] || '0', 10),
        petugas: r.metadata['PETUGAS'] || '',
        dbId: r.id
      }));
  },
  ['poin-siswa-all'],
  { tags: ['poin-siswa'], revalidate: 60 }
);

export async function GET() {
  try {
    const data = await getCachedPoin();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tanggal, namaSiswa, kelas, tipe, keterangan, poin, petugas } = body;

    if (!tanggal || !namaSiswa || !kelas || !tipe || !keterangan || !poin) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const id = crypto.randomUUID().substring(0, 8);

    const metadata = {
      'ID': id,
      'TANGGAL': tanggal,
      'TIMESTAMP': timestamp,
      'NAMA SISWA': namaSiswa,
      'KELAS': kelas,
      'TIPE': tipe,
      'KETERANGAN': keterangan,
      'POIN': poin.toString(),
      'PETUGAS': petugas || ''
    };

    const { error } = await supabase.from('data_dispo_siswa').insert([{ tanggal, metadata }]);
    if (error) throw error;

    revalidateTag('poin-siswa');
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    // Since we filtered data_dispo_siswa with metadata['ID'] == id
    const { data: foundRow } = await supabase.from('data_dispo_siswa').select('id').contains('metadata', { 'ID': id }).single();
    
    if (foundRow) {
      const { error } = await supabase.from('data_dispo_siswa').delete().eq('id', foundRow.id);
      if (error) throw error;
    }

    revalidateTag('poin-siswa');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
