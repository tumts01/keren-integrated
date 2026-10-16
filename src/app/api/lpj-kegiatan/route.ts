import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: rows, error } = await supabase.from('data_lpj_kegiatan').select('*').is('metadata->>jenis', null).order('id', { ascending: false });
    
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

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, tanggal, namaKegiatan, pjKegiatan, fileLink } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID LPJ wajib diisi' }, { status: 400 });
    }

    const { data: existingRows, error: findErr } = await supabase
      .from('data_lpj_kegiatan')
      .select('*')
      .eq('id', id);

    if (findErr) throw findErr;
    const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Data LPJ tidak ditemukan' }, { status: 404 });
    }

    const updatedMetadata = {
      ...existing.metadata,
      ...(tanggal ? { 'TANGGAL': tanggal } : {}),
      ...(namaKegiatan ? { 'NAMA KEGIATAN': namaKegiatan } : {}),
      ...(pjKegiatan ? { 'PJ KEGIATAN': pjKegiatan } : {}),
      ...(fileLink !== undefined ? { 'FILE (UPLOAD)': fileLink } : {})
    };

    const { error: updateErr } = await supabase
      .from('data_lpj_kegiatan')
      .update({ metadata: updatedMetadata })
      .eq('id', id);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true, message: 'LPJ Kegiatan berhasil diperbarui' });
  } catch (error: any) {
    console.error('PUT LPJ Kegiatan Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memperbarui LPJ Kegiatan: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    let id: string | null = null;
    const { searchParams } = new URL(req.url);
    id = searchParams.get('id');

    if (!id) {
      try {
        const body = await req.json();
        id = body.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID LPJ wajib diisi' }, { status: 400 });
    }

    const { error } = await supabase
      .from('data_lpj_kegiatan')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'LPJ Kegiatan berhasil dihapus' });
  } catch (error: any) {
    console.error('DELETE LPJ Kegiatan Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menghapus LPJ Kegiatan: ' + error.message }, { status: 500 });
  }
}
