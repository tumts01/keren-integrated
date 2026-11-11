import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAllCachedDataInduk } from '@/lib/data-induk';
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

export interface BioSiswa {
  hobi: string;
  citaCita: string;
  mediaSosial: string;
  instagram?: string;
  tiktok?: string;
  noHp: string;
  pesanKesan: string;
  updated_at?: string;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const nisn = searchParams.get('nisn');
    const nis = searchParams.get('nis');

    if (!nisn && !nis) {
      return NextResponse.json({ success: false, error: 'NISN atau NIS diperlukan' }, { status: 400 });
    }

    const cleanNisn = nisn ? String(nisn).trim().replace(/^0+/, '') : '';
    const cleanNis = nis ? String(nis).trim() : '';

    const allSiswa = await getAllCachedDataInduk();
    const student = allSiswa.find((row: any) => {
      const rowNisn = String(row.metadata?.['NISN'] || '').trim().replace(/^0+/, '');
      const rowNis = String(row.metadata?.['ID SISWA'] || row.id_siswa || '').trim();
      if (cleanNisn && rowNisn === cleanNisn) return true;
      if (cleanNis && rowNis === cleanNis) return true;
      return false;
    });

    if (!student) {
      return NextResponse.json({ success: false, error: 'Siswa tidak ditemukan' }, { status: 404 });
    }

    const meta = student.metadata || {};
    const existingBio: BioSiswa = meta['BIO_SISWA'] || {
      hobi: '',
      citaCita: '',
      mediaSosial: '',
      instagram: '',
      tiktok: '',
      noHp: meta['NOMOR WHATSAPP'] || meta['NO WA'] || meta['NO. WA'] || meta['NO. HP'] || '',
      pesanKesan: ''
    };

    let rombel = (meta['ROMBEL KELAS 9'] || '').trim();
    if (!rombel) rombel = (meta['ROMBEL KELAS 8'] || '').trim();
    if (!rombel) rombel = (meta['ROMBEL KELAS 7'] || '').trim();
    if (!rombel) rombel = (meta['ROMBEL'] || '').trim();

    const getThumbUrl = (url: string) => {
      if (!url) return '';
      if (url.includes('drive.google.com')) {
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400-h400`;
        }
      }
      return url;
    };

    const studentInfo = {
      supabaseId: student.id,
      nama: meta['NAMA'] || student.nama || '',
      nisn: meta['NISN'] || '',
      nis: meta['ID SISWA'] || student.id_siswa || '',
      kelas: rombel,
      foto: getThumbUrl(meta['LINK FOTO TERBARU'] || meta['LINK URL FOTO 1'] || meta['LINK URL FOTO 2'] || '')
    };

    return NextResponse.json({
      success: true,
      bio: existingBio,
      student: studentInfo
    }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  } catch (error: any) {
    console.error('API Portal Bio GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nisn, nis, supabaseId, bio } = body;

    if (!bio) {
      return NextResponse.json({ success: false, error: 'Data bio tidak boleh kosong' }, { status: 400 });
    }

    let targetStudentId = supabaseId;

    if (!targetStudentId) {
      const cleanNisn = nisn ? String(nisn).trim().replace(/^0+/, '') : '';
      const cleanNis = nis ? String(nis).trim() : '';

      const allSiswa = await getAllCachedDataInduk();
      const student = allSiswa.find((row: any) => {
        const rowNisn = String(row.metadata?.['NISN'] || '').trim().replace(/^0+/, '');
        const rowNis = String(row.metadata?.['ID SISWA'] || row.id_siswa || '').trim();
        if (cleanNisn && rowNisn === cleanNisn) return true;
        if (cleanNis && rowNis === cleanNis) return true;
        return false;
      });

      if (!student) {
        return NextResponse.json({ success: false, error: 'Siswa tidak ditemukan' }, { status: 404 });
      }
      targetStudentId = student.id;
    }

    // Ambil data terkini langsung dari DB Supabase
    const { data: dbStudent, error: findError } = await supabase
      .from('data_induk')
      .select('id, metadata')
      .eq('id', targetStudentId)
      .single();

    if (findError || !dbStudent) {
      return NextResponse.json({ success: false, error: 'Gagal menemukan data siswa di database' }, { status: 404 });
    }

    const currentMetadata = dbStudent.metadata || {};

    const updatedBio: BioSiswa = {
      hobi: (bio.hobi || '').toString().trim(),
      citaCita: (bio.citaCita || '').toString().trim(),
      mediaSosial: (bio.mediaSosial || '').toString().trim(),
      instagram: (bio.instagram || '').toString().trim().replace(/^@/, ''),
      tiktok: (bio.tiktok || '').toString().trim().replace(/^@/, ''),
      noHp: (bio.noHp || '').toString().trim(),
      pesanKesan: (bio.pesanKesan || '').toString().trim(),
      updated_at: new Date().toISOString()
    };

    currentMetadata['BIO_SISWA'] = updatedBio;

    // Sinkronkan juga nomor WhatsApp ke field metadata buku induk agar sinkron
    if (updatedBio.noHp) {
      currentMetadata['NOMOR WHATSAPP'] = updatedBio.noHp;
    }

    const { error: updateError } = await supabase
      .from('data_induk')
      .update({ metadata: currentMetadata })
      .eq('id', targetStudentId);

    if (updateError) {
      throw updateError;
    }

    // Invalidate data_induk cache
    try {
      revalidateTag('data_induk', {} as any);
    } catch (e) {
      // ignore in dev
    }

    return NextResponse.json({
      success: true,
      message: 'Bio berhasil disimpan!',
      bio: updatedBio
    }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  } catch (error: any) {
    console.error('API Portal Bio POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
