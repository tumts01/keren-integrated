import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: rows, error } = await supabase.from('data_lpj_kegiatan').select('*').order('id', { ascending: false });
    
    if (error) throw error;

    const data = (rows || []).map((row: any) => {
      const meta = row.metadata || {};
      const headers = Object.keys(meta).map(h => h.toUpperCase().trim());
      
      const hTanggal = Object.keys(meta).find(h => h.toUpperCase().includes('TANGGAL')) || 'TANGGAL';
      const hNama = Object.keys(meta).find(h => h.toUpperCase().includes('NAMA KEGIATAN')) || 'NAMA KEGIATAN';
      const hPj = Object.keys(meta).find(h => h.toUpperCase().includes('PJ KEGIATAN')) || 'PJ KEGIATAN';
      const hFile = Object.keys(meta).find(h => h.toUpperCase().includes('FILE') || h.toUpperCase().includes('UPLOAD')) || 'FILE (UPLOAD)';

      return {
        id: row.id,
        rowNumber: row.id,
        tanggal: meta[hTanggal] || '',
        namaKegiatan: meta[hNama] || '',
        pjKegiatan: meta[hPj] || '',
        fileUpload: meta[hFile] || ''
      };
    }).filter((item: any) => item.namaKegiatan || item.pjKegiatan);

    return NextResponse.json({ 
      success: true, 
      data
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' }
    });
  } catch (error: any) {
    console.error('Fetch LPJ Kegiatan Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data dari Supabase: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tanggal, namaKegiatan, pjKegiatan, fileLink } = body;

    if (!tanggal || !namaKegiatan || !pjKegiatan || !fileLink) {
      return NextResponse.json({ success: false, error: 'Semua field dan link wajib diisi' }, { status: 400 });
    }

    const { error } = await supabase.from('data_lpj_kegiatan').insert([{
      metadata: {
        'TANGGAL': tanggal,
        'NAMA KEGIATAN': namaKegiatan,
        'PJ KEGIATAN': pjKegiatan,
        'FILE (UPLOAD)': fileLink
      }
    }]);

    if (error) throw error;

    return NextResponse.json({ success: true, url: fileLink });
  } catch (error: any) {
    console.error('POST LPJ Kegiatan Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menyimpan LPJ Kegiatan: ' + error.message }, { status: 500 });
  }
}
