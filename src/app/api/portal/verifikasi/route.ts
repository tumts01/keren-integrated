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
    const all = searchParams.get('all');

    const allSiswa = await getAllCachedDataInduk();

    // 1. Single Student Query
    if (nisn || nis) {
      const cleanNisn = nisn ? String(nisn).trim().replace(/^0+/, '') : '';
      const cleanNis = nis ? String(nis).trim() : '';

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
    }

    // 2. Admin List Query (all active students with verification summary)
    const activeStudents = allSiswa.filter((s: any) => {
      const status = (s.metadata?.['STATUS SISWA'] || '').toUpperCase().trim();
      return status === 'AKTIF' || !status;
    });

    let verifiedCount = 0;
    let pendingCount = 0;
    let unverifiedCount = 0;

    const list = activeStudents.map((student: any) => {
      const meta = student.metadata || {};
      const rawTtl = meta['TEMPAT, TANGGAL LAHIR'] || '';
      
      let rombel = (meta['ROMBEL KELAS 9'] || '').trim();
      if (!rombel) rombel = (meta['ROMBEL KELAS 8'] || '').trim();
      if (!rombel) rombel = (meta['ROMBEL KELAS 7'] || '').trim();
      if (!rombel) rombel = (meta['ROMBEL'] || '').trim();

      const verifikasi = meta['VERIFIKASI_IJAZAH'] || null;
      let statusVerifikasi = 'BELUM_VERIFIKASI';
      if (verifikasi?.status === 'VERIFIED') {
        statusVerifikasi = 'VERIFIED';
        verifiedCount++;
      } else if (verifikasi?.status === 'MENGAJUKAN_PERBAIKAN') {
        statusVerifikasi = 'MENGAJUKAN_PERBAIKAN';
        pendingCount++;
      } else {
        unverifiedCount++;
      }

      return {
        supabaseId: student.id,
        nisn: meta['NISN'] || '',
        nis: meta['ID SISWA'] || student.id_siswa || '',
        nism: meta['NISM'] || '',
        nik: meta['NIK'] || '',
        nama: meta['NAMA'] || student.nama || '',
        kelas: rombel,
        ttl: rawTtl,
        jenisKelamin: meta['JENIS KELAMIN'] || '',
        namaAyah: meta['NAMA AYAH KANDUNG'] || '',
        namaIbu: meta['NAMA IBU KANDUNG'] || '',
        noHp: meta['NOMOR WHATSAPP'] || meta['NO WA'] || meta['NO. WA'] || meta['NO. HP'] || '',
        statusVerifikasi,
        verifikasiIjazah: verifikasi
      };
    });

    // Sort by class then by name
    list.sort((a: any, b: any) => {
      if (a.kelas !== b.kelas) return a.kelas.localeCompare(b.kelas);
      return a.nama.localeCompare(b.nama);
    });

    return NextResponse.json({
      success: true,
      stats: {
        total: activeStudents.length,
        verified: verifiedCount,
        pendingReview: pendingCount,
        unverified: unverifiedCount
      },
      data: list
    });

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
            // Also sync TEMPAT LAHIR / TANGGAL LAHIR if TEMPAT, TANGGAL LAHIR was updated
            if (item.field === 'TEMPAT, TANGGAL LAHIR') {
              const parts = item.dataBaru.split(',');
              currentMetadata['TEMPAT LAHIR'] = parts[0]?.trim() || '';
              currentMetadata['TANGGAL LAHIR'] = parts.slice(1).join(',')?.trim() || '';
            }
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
    } else if (action === 'TU_REJECT') {
      const prev = currentMetadata['VERIFIKASI_IJAZAH'] || {};
      newVerifikasi = {
        status: 'BELUM_VERIFIKASI',
        catatan_penolakan: adminNotes || 'Pengajuan perbaikan ditolak. Silakan bawa berkas fisik ke ruang Tata Usaha.',
        rejected_at: new Date().toISOString(),
        previous_attempt: prev
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
        : action === 'TU_APPROVE'
        ? 'Pengajuan perbaikan berhasil disetujui dan data siswa telah diperbarui.'
        : action === 'TU_REJECT'
        ? 'Pengajuan perbaikan telah ditolak.'
        : 'Status berhasil diperbarui.',
      verifikasi: newVerifikasi
    });

  } catch (error: any) {
    console.error('Post Verifikasi Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}
