import { NextResponse } from 'next/server';
import { getIndukDoc } from '@/lib/google-sheets';
import { supabase } from '@/lib/supabase';

const SPMB_HEADERS = [
  'Timestamp',
  'Jalur Pendaftaran',
  'Nama Lengkap',
  'NISN',
  'Tempat, Tanggal Lahir',
  'Jenis Kelamin',
  'Agama',
  'Asal Sekolah',
  'NPSN SD/MI',
  'Alamat Sekolah Asal',
  'Nama Ayah',
  'Pekerjaan Ayah',
  'Nama Ibu',
  'Pekerjaan Ibu',
  'Nomor WA Ayah',
  'Nomor WA Ibu',
  'Alamat Lengkap',
  'Prestasi (Jika Ada)',
  'File KK',
  'File Akta'
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const nama = (searchParams.get('nama') || '').trim();
    const nisn = (searchParams.get('nisn') || '').trim();

    if (!nama && !nisn) {
      return NextResponse.json({ success: true, duplicate: false });
    }

    const { data: rows, error } = await supabase
      .from('data_spmb')
      .select('id, nama, nisn, metadata');

    if (error) throw error;

    const currentYear = new Date().getFullYear();

    // 1. Cek duplikasi NISN (hanya jika NISN diisi dan bukan '-')
    if (nisn && nisn !== '-') {
      const cleanNisn = nisn.replace(/\s+/g, '');
      const matchNisn = (rows || []).find((r: any) => {
        const rNisn = String(r.nisn || r.metadata?.['NISN'] || '').trim().replace(/\s+/g, '');
        return rNisn && rNisn !== '-' && rNisn === cleanNisn;
      });
      if (matchNisn) {
        const noReg = matchNisn.metadata?.['Nomor Pendaftaran'] || `MTS01-${currentYear}-${String(matchNisn.id).padStart(4, '0')}`;
        return NextResponse.json({
          success: true,
          duplicate: true,
          field: 'nisn',
          message: `Calon siswa dengan NISN "${cleanNisn}" sudah terdaftar sebelumnya atas nama "${matchNisn.nama || matchNisn.metadata?.['Nama Lengkap']}" (Nomor Pendaftaran: ${noReg}).`
        });
      }
    }

    // 2. Cek duplikasi Nama Lengkap (case-insensitive & spasi berlebih dinormalisasi)
    if (nama) {
      const normNama = nama.toLowerCase().replace(/\s+/g, ' ');
      const matchNama = (rows || []).find((r: any) => {
        const rNama = String(r.nama || r.metadata?.['Nama Lengkap'] || '').trim().toLowerCase().replace(/\s+/g, ' ');
        return rNama && rNama === normNama;
      });
      if (matchNama) {
        const noReg = matchNama.metadata?.['Nomor Pendaftaran'] || `MTS01-${currentYear}-${String(matchNama.id).padStart(4, '0')}`;
        return NextResponse.json({
          success: true,
          duplicate: true,
          field: 'nama',
          message: `Calon siswa dengan nama "${nama}" sudah pernah didaftarkan sebelumnya (Nomor Pendaftaran: ${noReg}).`
        });
      }
    }

    return NextResponse.json({ success: true, duplicate: false });
  } catch (err: any) {
    console.error('Check Duplicate SPMB Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const currentYear = new Date().getFullYear();

    const rawNama = String(payload.namaLengkap || '').trim();
    const rawNisn = String(payload.nisn || '').trim();

    if (!rawNama) {
      return NextResponse.json({ success: false, error: 'Nama Lengkap wajib diisi.' }, { status: 400 });
    }

    // Ambil data yang sudah ada untuk pengecekan duplikasi dan keunikan nomor pendaftaran
    const { data: existingRows, error: fetchErr } = await supabase
      .from('data_spmb')
      .select('id, nama, nisn, metadata');

    if (fetchErr) throw fetchErr;

    // 1. Cek Duplikasi NISN (jika NISN diisi dan bukan '-')
    if (rawNisn && rawNisn !== '-') {
      const cleanNisn = rawNisn.replace(/\s+/g, '');
      const matchNisn = (existingRows || []).find((r: any) => {
        const rNisn = String(r.nisn || r.metadata?.['NISN'] || '').trim().replace(/\s+/g, '');
        return rNisn && rNisn !== '-' && rNisn === cleanNisn;
      });
      if (matchNisn) {
        const noReg = matchNisn.metadata?.['Nomor Pendaftaran'] || `MTS01-${currentYear}-${String(matchNisn.id).padStart(4, '0')}`;
        return NextResponse.json({
          success: false,
          error: `Pendaftaran Ditolak: Calon siswa dengan NISN "${cleanNisn}" sudah terdaftar sebelumnya atas nama "${matchNisn.nama || matchNisn.metadata?.['Nama Lengkap']}" (Nomor Pendaftaran: ${noReg}). Silakan gunakan menu Portal Siswa atau hubungi Panitia SPMB.`
        }, { status: 400 });
      }
    }

    // 2. Cek Duplikasi Nama Lengkap (case-insensitive & spasi berlebih dinormalisasi)
    const normNama = rawNama.toLowerCase().replace(/\s+/g, ' ');
    const matchNama = (existingRows || []).find((r: any) => {
      const rNama = String(r.nama || r.metadata?.['Nama Lengkap'] || '').trim().toLowerCase().replace(/\s+/g, ' ');
      return rNama && rNama === normNama;
    });

    if (matchNama) {
      const noReg = matchNama.metadata?.['Nomor Pendaftaran'] || `MTS01-${currentYear}-${String(matchNama.id).padStart(4, '0')}`;
      return NextResponse.json({
        success: false,
        error: `Pendaftaran Ditolak: Calon siswa dengan nama "${rawNama}" sudah pernah didaftarkan sebelumnya (Nomor Pendaftaran: ${noReg}). Silakan gunakan menu Portal Siswa untuk memantau status atau hubungi Panitia SPMB jika terdapat kekeliruan.`
      }, { status: 400 });
    }
    
    let fullAlamat = payload.alamatLengkap || '';
    if (payload.desa) fullAlamat += `, Desa/Kel. ${payload.desa}`;
    if (payload.kecamatan) fullAlamat += `, Kec. ${payload.kecamatan}`;
    if (payload.kabupaten) fullAlamat += `, ${payload.kabupaten}`;

    // Auto-generate Nomor Pendaftaran kombinasi huruf dan angka acak (misal: MTS01-2026-EM5JJ)
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const generateCode = (length = 5) => {
      let code = '';
      while (true) {
        code = '';
        for (let i = 0; i < length; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        // Pastikan kombinasi huruf dan angka (minimal 1 angka dan minimal 1 huruf)
        if (/[0-9]/.test(code) && /[A-Z]/.test(code)) break;
      }
      return code;
    };

    const existingNomorSet = new Set(
      (existingRows || [])
        .map((r: any) => String(r.metadata?.['Nomor Pendaftaran'] || '').toUpperCase().trim())
        .filter(Boolean)
    );

    let nomorPendaftaran = '';
    for (let attempt = 0; attempt < 50; attempt++) {
      const randomCode = generateCode(5);
      const candidate = `MTS01-${currentYear}-${randomCode}`;
      if (!existingNomorSet.has(candidate)) {
        nomorPendaftaran = candidate;
        break;
      }
    }
    if (!nomorPendaftaran) {
      nomorPendaftaran = `MTS01-${currentYear}-${generateCode(6)}`;
    }
    
    const { data: insertedData, error } = await supabase.from('data_spmb').insert({
      nama: payload.namaLengkap || '',
      nisn: payload.nisn || '',
      metadata: {
        'Timestamp': timestamp,
        'Nomor Pendaftaran': nomorPendaftaran,
        'status_verifikasi': 'menunggu',
        'status_kelulusan': 'proses',
        'catatan_verifikasi': '',
        'Jalur Pendaftaran': payload.jalurPendaftaran || '',
        'Nama Lengkap': payload.namaLengkap || '',
        'NISN': payload.nisn || '',
        'Tempat, Tanggal Lahir': payload.tempatTanggalLahir || '',
        'Jenis Kelamin': payload.jenisKelamin || '',
        'Agama': payload.agama || 'Islam',
        'Asal Sekolah': payload.asalSekolah || '',
        'NPSN SD/MI': payload.npsnSekolahAsal || '',
        'Alamat Sekolah Asal': payload.alamatSekolahAsal || '',
        'Nama Ayah': payload.namaAyah || '',
        'Pendidikan Terakhir Ayah': payload.pendidikanAyah || '',
        'Pendidikan Ayah': payload.pendidikanAyah || '',
        'Pekerjaan Ayah': payload.pekerjaanAyah || '',
        'Nama Ibu': payload.namaIbu || '',
        'Pendidikan Terakhir Ibu': payload.pendidikanIbu || '',
        'Pendidikan Ibu': payload.pendidikanIbu || '',
        'Pekerjaan Ibu': payload.pekerjaanIbu || '',
        'Nomor WA Ayah': payload.nomorWaAyah || '',
        'Nomor WA Ibu': payload.nomorWaIbu || '',
        'Alamat (Jalan/RT/RW)': payload.alamatLengkap || '',
        'Desa/Kelurahan': payload.desa || '',
        'Kecamatan': payload.kecamatan || '',
        'Kabupaten/Kota': payload.kabupaten || '',
        'Alamat Lengkap': fullAlamat,
        'Prestasi (Jika Ada)': payload.prestasi || '',
        'File KK': payload.linkKk || '',
        'File Akta': payload.linkAkta || ''
      }
    }).select();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      id: insertedData && insertedData[0] ? insertedData[0].id : null,
      nomorPendaftaran,
      nama: payload.namaLengkap || ''
    });

  } catch (error: any) {
    console.error('Submit SPMB Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memproses pendaftaran SPMB: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID tidak ditemukan' }, { status: 400 });
    
    const { error } = await supabase.from('data_spmb').delete().eq('id', id);
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete SPMB Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menghapus data: ' + error.message }, { status: 500 });
  }
}
