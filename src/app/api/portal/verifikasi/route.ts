import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAllCachedDataInduk } from '@/lib/data-induk';
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

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
      return NextResponse.json({ success: false, error: 'Data siswa tidak ditemukan' }, { status: 404 });
    }

    const meta = student.metadata || {};
    const rawTtl = meta['TEMPAT, TANGGAL LAHIR'] || '';
    const rawTempat = meta['TEMPAT LAHIR'] || rawTtl.split(',')[0]?.trim() || '';
    const rawTanggal = meta['TANGGAL LAHIR'] || rawTtl.split(',').slice(1).join(',')?.trim() || '';

    // Determine current class
    let rombel = (meta['ROMBEL KELAS 9'] || '').trim();
    if (!rombel) rombel = (meta['ROMBEL KELAS 8'] || '').trim();
    if (!rombel) rombel = (meta['ROMBEL KELAS 7'] || '').trim();
    if (!rombel) rombel = (meta['ROMBEL'] || '').trim();

    const data = {
      supabaseId: student.id,
      nisn: meta['NISN'] || '',
      nis: meta['ID SISWA'] || student.id_siswa || '',
      nism: meta['NISM'] || '',
      nik: meta['NIK'] || '',
      nama: meta['NAMA'] || student.nama || '',
      kelas: rombel,
      status: (meta['STATUS SISWA'] || 'AKTIF').toUpperCase().trim(),
      jenisKelamin: meta['JENIS KELAMIN'] || '',
      ttl: rawTtl,
      tempatLahir: rawTempat,
      tanggalLahir: rawTanggal,
      namaAyah: meta['NAMA AYAH KANDUNG'] || '',
      namaIbu: meta['NAMA IBU KANDUNG'] || '',
      asalSekolah: meta['SD/MI'] || meta['ASAL SEKOLAH'] || '',
      alamat: meta['ALAMAT ASAL SESUAI KK TERAKHIR'] || meta['ALAMAT AYAH KANDUNG'] || '',
      domisili: meta['DOMISILI'] || '',
      noHp: meta['NOMOR WHATSAPP'] || meta['NO WA'] || meta['NO. WA'] || meta['NO. HP'] || '',
      verifikasiIjazah: meta['VERIFIKASI_IJAZAH'] || null,
    };

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Get Verifikasi Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nisn, nis, action, dataVerifikasi, dataPerbaikan, adminNotes } = body;

    if (!nisn && !nis) {
      return NextResponse.json({ success: false, error: 'NISN atau NIS diperlukan' }, { status: 400 });
    }

    const cleanNisn = nisn ? String(nisn).trim().replace(/^0+/, '') : '';
    const cleanNis = nis ? String(nis).trim() : '';

    // 1. Fetch current student record from DB
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

    const currentMetadata = { ...(student.metadata || {}) };
    let newVerifikasi: any = null;

    if (action === 'SETUJU') {
      if (!dataVerifikasi?.namaWali) {
        return NextResponse.json({ success: false, error: 'Nama orang tua/wali pemverifikasi wajib diisi' }, { status: 400 });
      }

      newVerifikasi = {
        status: 'VERIFIED',
        nama_wali: dataVerifikasi.namaWali.trim(),
        hubungan: dataVerifikasi.hubungan || 'Orang Tua / Wali',
        verified_at: new Date().toISOString(),
        pernyataan: 'Saya menyatakan bahwa data ini telah saya periksa dengan teliti dan BENAR sesuai Akta Kelahiran/KK sebagai rujukan cetak Ijazah.',
        klausul_hukum: 'Orang tua/wali membebaskan madrasah dari segala tuntutan hukum apabila di kemudian hari terdapat kekeliruan data akibat kelalaian pemeriksaan ini.',
        catatan: dataVerifikasi.catatan || '',
        snapshot: {
          nama: currentMetadata['NAMA'] || student.nama || '',
          ttl: currentMetadata['TEMPAT, TANGGAL LAHIR'] || '',
          nisn: currentMetadata['NISN'] || '',
          nik: currentMetadata['NIK'] || '',
          jenisKelamin: currentMetadata['JENIS KELAMIN'] || '',
          namaAyah: currentMetadata['NAMA AYAH KANDUNG'] || '',
          namaIbu: currentMetadata['NAMA IBU KANDUNG'] || '',
          asalSekolah: currentMetadata['SD/MI'] || currentMetadata['ASAL SEKOLAH'] || ''
        }
      };

      currentMetadata['VERIFIKASI_IJAZAH'] = newVerifikasi;
    } else if (action === 'AJUKAN_PERBAIKAN') {
      if (!dataPerbaikan?.namaPemohon) {
        return NextResponse.json({ success: false, error: 'Nama pemohon perbaikan wajib diisi' }, { status: 400 });
      }
      if (!dataPerbaikan?.perbaikan || dataPerbaikan.perbaikan.length === 0) {
        return NextResponse.json({ success: false, error: 'Pilih minimal satu data yang ingin diperbaiki' }, { status: 400 });
      }

      newVerifikasi = {
        status: 'MENGAJUKAN_PERBAIKAN',
        nama_pemohon: dataPerbaikan.namaPemohon.trim(),
        hubungan: dataPerbaikan.hubungan || 'Orang Tua / Wali',
        no_hp: dataPerbaikan.noHp || '',
        submitted_at: new Date().toISOString(),
        perbaikan: dataPerbaikan.perbaikan,
        alasan: dataPerbaikan.alasan || '',
        status_tu: 'MENUNGGU_VERIFIKASI_TU',
        previous_snapshot: {
          nama: currentMetadata['NAMA'] || student.nama || '',
          ttl: currentMetadata['TEMPAT, TANGGAL LAHIR'] || '',
          nisn: currentMetadata['NISN'] || '',
          nik: currentMetadata['NIK'] || '',
        }
      };

      currentMetadata['VERIFIKASI_IJAZAH'] = newVerifikasi;
    } else if (action === 'BATAL') {
      newVerifikasi = null;
      delete currentMetadata['VERIFIKASI_IJAZAH'];
    } else if (action === 'TU_APPROVE') {
      // TU Staf approves the corrections
      const prev = currentMetadata['VERIFIKASI_IJAZAH'] || {};
      if (prev.perbaikan && Array.isArray(prev.perbaikan)) {
        prev.perbaikan.forEach((item: any) => {
          if (item.field && item.dataBaru) {
            currentMetadata[item.field] = item.dataBaru;
          }
        });
      }
      newVerifikasi = {
        status: 'VERIFIED',
        nama_wali: prev.nama_pemohon || 'Orang Tua',
        hubungan: prev.hubungan || 'Orang Tua',
        verified_at: new Date().toISOString(),
        catatan: `Disetujui dan diperbarui oleh Staf TU: ${adminNotes || 'Dokumen fisik terverifikasi'}`,
        pernyataan: 'Data telah diperbaiki dan disetujui sesuai dokumen resmi (Akta Kelahiran/KK).',
        klausul_hukum: 'Orang tua/wali membebaskan madrasah dari segala tuntutan hukum apabila di kemudian hari terdapat kekeliruan data akibat kelalaian pemeriksaan ini.',
        snapshot: {
          nama: currentMetadata['NAMA'] || student.nama || '',
          ttl: currentMetadata['TEMPAT, TANGGAL LAHIR'] || '',
          nisn: currentMetadata['NISN'] || '',
          nik: currentMetadata['NIK'] || '',
          jenisKelamin: currentMetadata['JENIS KELAMIN'] || '',
          namaAyah: currentMetadata['NAMA AYAH KANDUNG'] || '',
          namaIbu: currentMetadata['NAMA IBU KANDUNG'] || '',
          asalSekolah: currentMetadata['SD/MI'] || currentMetadata['ASAL SEKOLAH'] || ''
        }
      };
      currentMetadata['VERIFIKASI_IJAZAH'] = newVerifikasi;
    } else {
      return NextResponse.json({ success: false, error: 'Aksi tidak valid' }, { status: 400 });
    }

    // 2. Update Supabase
    const { error: updateError } = await supabase
      .from('data_induk')
      .update({
        metadata: currentMetadata,
        nama: currentMetadata['NAMA'] || student.nama
      })
      .eq('id', student.id);

    if (updateError) {
      throw updateError;
    }

    // 3. Invalidate data-induk cache
    revalidateTag('data_induk', {});

    return NextResponse.json({
      success: true,
      message: action === 'SETUJU' 
        ? 'Data kebenaran Ijazah berhasil diverifikasi dan dikunci.' 
        : action === 'AJUKAN_PERBAIKAN'
        ? 'Pengajuan perbaikan data berhasil dikirim ke Tata Usaha.'
        : 'Status berhasil diperbarui.',
      verifikasi: newVerifikasi
    });

  } catch (error: any) {
    console.error('Post Verifikasi Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}
