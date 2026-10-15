import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function mapStudentData(r: any) {
  const meta = r.metadata || {};
  return {
    id: r.id,
    nomorPendaftaran: meta['Nomor Pendaftaran'] || (`MTS01-2026-${String(r.id).padStart(4, '0')}`),
    namaLengkap: r.nama || meta['Nama Lengkap'] || '',
    nisn: r.nisn || meta['NISN'] || '',
    jalurPendaftaran: meta['Jalur Pendaftaran'] || '',
    asalSekolah: meta['Asal Sekolah'] || '',
    npsnSekolahAsal: meta['NPSN SD/MI'] || '',
    alamatSekolahAsal: meta['Alamat Sekolah Asal'] || '',
    tempatTanggalLahir: meta['Tempat, Tanggal Lahir'] || '',
    jenisKelamin: meta['Jenis Kelamin'] || '',
    agama: meta['Agama'] || '',
    namaAyah: meta['Nama Ayah'] || '',
    pekerjaanAyah: meta['Pekerjaan Ayah'] || '',
    namaIbu: meta['Nama Ibu'] || '',
    pekerjaanIbu: meta['Pekerjaan Ibu'] || '',
    nomorWaAyah: meta['Nomor WA Ayah'] || '',
    nomorWaIbu: meta['Nomor WA Ibu'] || '',
    alamatLengkap: meta['Alamat Lengkap'] || '',
    prestasi: meta['Prestasi (Jika Ada)'] || '',
    linkKk: meta['File KK'] || '',
    statusVerifikasi: meta['status_verifikasi'] || 'menunggu',
    catatanVerifikasi: meta['catatan_verifikasi'] || '',
    statusKelulusan: meta['status_kelulusan'] || 'proses',
    jadwalTes: meta['jadwal_tes'] || '',
    timestamp: meta['Timestamp'] || ''
  };
}

// POST: Login using Nomor Pendaftaran (or NISN)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawInput = String(body.nomorPendaftaran || body.identifier || '').trim();

    if (!rawInput) {
      return NextResponse.json(
        { success: false, error: 'Nomor Pendaftaran tidak boleh kosong.' },
        { status: 400 }
      );
    }

    const cleanInput = rawInput.toUpperCase().replace(/\s+/g, '');

    // Fetch all SPMB records to match flexibly
    const { data: rows, error } = await supabase.from('data_spmb').select('*');
    if (error) throw error;

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Belum ada data pendaftar di sistem.' },
        { status: 404 }
      );
    }

    // Strict exact match on full Nomor Pendaftaran (e.g. MTS01-2026-0001)
    const found = rows.find((r: any) => {
      const meta = r.metadata || {};
      const noReg = String(meta['Nomor Pendaftaran'] || (`MTS01-2026-${String(r.id).padStart(4, '0')}`)).toUpperCase().trim();
      return noReg === cleanInput;
    });

    if (!found) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Nomor Pendaftaran "${rawInput}" tidak ditemukan. Pastikan Anda memasukkan nomor pendaftaran lengkap sesuai kartu (Contoh: MTS01-2026-0001).` 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: mapStudentData(found)
    });

  } catch (err: any) {
    console.error('SPMB Auth Error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan pada server: ' + err.message },
      { status: 500 }
    );
  }
}

// GET: Refresh student data by ID or Nomor Pendaftaran
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const nomor = searchParams.get('nomor');

    if (!id && !nomor) {
      return NextResponse.json({ success: false, error: 'Parameter id atau nomor diperlukan' }, { status: 400 });
    }

    let query = supabase.from('data_spmb').select('*');
    if (id) {
      query = query.eq('id', parseInt(id, 10));
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    let target = null;
    if (id && rows && rows.length > 0) {
      target = rows[0];
    } else if (nomor && rows) {
      const cleanNomor = nomor.toUpperCase().trim();
      target = rows.find((r: any) => {
        const noReg = String(r.metadata?.['Nomor Pendaftaran'] || '').toUpperCase().trim();
        return noReg === cleanNomor;
      });
    }

    if (!target) {
      return NextResponse.json({ success: false, error: 'Data pendaftar tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: mapStudentData(target)
    });

  } catch (err: any) {
    console.error('SPMB Refresh Error:', err);
    return NextResponse.json({ success: false, error: 'Gagal memuat status pendaftar: ' + err.message }, { status: 500 });
  }
}
