import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: rows, error } = await supabase
      .from('jurnal_mgmp')
      .select('*')
      .order('id', { ascending: false });

    if (error) throw error;

    const data = (rows || []).map((row: any) => {
      const meta = row.metadata || {};
      return {
        id: row.id,
        namaGuru: meta['NAMA GURU'] || '',
        bidangStudi: meta['BIDANG STUDI'] || '',
        namaKegiatan: meta['NAMA KEGIATAN'] || '',
        tempat: meta['TEMPAT'] || '',
        tanggal: meta['TANGGAL'] || '',
        penyelenggara: meta['PENYELENGGARA'] || '',
        agenda: meta['AGENDA'] || '',
        suratTugas: meta['SURAT TUGAS'] || '',
        dokumentasi: meta['DOKUMENTASI'] || '',
        notulen: meta['NOTULEN'] || '',
      };
    }).filter((item: any) => item.namaGuru || item.namaKegiatan);

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
    });
  } catch (error: any) {
    console.error('GET Jurnal MGMP Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { namaGuru, bidangStudi, namaKegiatan, tempat, tanggal, penyelenggara, agenda, suratTugas, dokumentasi, notulen } = body;

    if (!namaGuru || !namaKegiatan || !tanggal) {
      return NextResponse.json({ success: false, error: 'Nama guru, nama kegiatan, dan tanggal wajib diisi' }, { status: 400 });
    }

    const { error } = await supabase.from('jurnal_mgmp').insert([{
      metadata: {
        'NAMA GURU': namaGuru,
        'BIDANG STUDI': bidangStudi || '',
        'NAMA KEGIATAN': namaKegiatan,
        'TEMPAT': tempat || '',
        'TANGGAL': tanggal,
        'PENYELENGGARA': penyelenggara || '',
        'AGENDA': agenda || '',
        'SURAT TUGAS': suratTugas || '',
        'DOKUMENTASI': dokumentasi || '',
        'NOTULEN': notulen || '',
        'CREATED_AT': new Date().toISOString(),
      }
    }]);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('POST Jurnal MGMP Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menyimpan data: ' + error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, namaGuru, bidangStudi, namaKegiatan, tempat, tanggal, penyelenggara, agenda, suratTugas, dokumentasi, notulen } = body;

    if (!id || !namaGuru || !namaKegiatan || !tanggal) {
      return NextResponse.json({ success: false, error: 'ID, Nama guru, nama kegiatan, dan tanggal wajib diisi' }, { status: 400 });
    }

    const { error } = await supabase.from('jurnal_mgmp').update({
      metadata: {
        'NAMA GURU': namaGuru,
        'BIDANG STUDI': bidangStudi || '',
        'NAMA KEGIATAN': namaKegiatan,
        'TEMPAT': tempat || '',
        'TANGGAL': tanggal,
        'PENYELENGGARA': penyelenggara || '',
        'AGENDA': agenda || '',
        'SURAT TUGAS': suratTugas || '',
        'DOKUMENTASI': dokumentasi || '',
        'NOTULEN': notulen || '',
        'UPDATED_AT': new Date().toISOString(),
      }
    }).eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PUT Jurnal MGMP Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengupdate data: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: 'ID tidak ditemukan' }, { status: 400 });

    const { error } = await supabase.from('jurnal_mgmp').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE Jurnal MGMP Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menghapus data: ' + error.message }, { status: 500 });
  }
}
