import { NextResponse } from 'next/server';
import { getSurveyDoc, getEVotingDoc } from '@/lib/google-sheets';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { surveyType, data } = body;

    if (!surveyType || !data) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    // Special case for Pemetaan Kelas 7 which goes to a different document
    if (surveyType === 'pemetaan_kelas7') {
      try {
        const payload = {
          kelas: data['Kelas'] || '',
          nama_siswa: data['Nama Siswa'] || '',
          anak_ke: data['Anak ke-'] || '',
          saudara_kandung: data['Saudara Kandung'] || '',
          saudara_tiri: data['Saudara tiri'] || '',
          tinggal_bersama: data['Tinggal Bersama'] || '',
          status_ayah: data['Status Ayah'] || '',
          status_ibu: data['Status Ibu'] || '',
          kondisi_orang_tua: data['Kondisi Orang Tua'] || '',
          tinggal_di: data['Tinggal di'] || '',
          perasaan_di_pesantren: data['Perasaan di Pesantren'] || '',
          riwayat_sakit: data['Riwayat Sakit'] || '',
          uang_saku: data['Uang Saku per-Hari'] || '',
          pernah_di_bully: data['Pernah menjadi korban bullying'] || '',
          kenyamanan_di_kelas: data['Kenyamanan di kelas'] || '',
          kendala_di_kelas: data['Kendala di kelas'] || '',
          menghabiskan_waktu_luang: data['Menghabiskan waktu luang'] || '',
          tipe_belajar: data['Tipe Belajar'] || '',
          mapel_disukai: data['Mata pelajaran yang paling disukai'] || '',
          mapel_sulit: data['Mata pelajaran yang paling sulit'] || '',
          kendala_belajar: data['Kendala belajar'] || '',
          minat_bakat: data['Minat / Bakat'] || '',
          olahraga_disukai: data['Bidang olahraga yang disukai'] || '',
          lomba_diikuti: data['Lomba yang ingin diikuti'] || '',
          prestasi_diraih: data['Prestasi yang pernah diraih'] || '',
          kesediaan_ke_bk: data['Kesediaan datang ke ruang BK'] || '',
          harapan_guru_bk: data['Harapan untuk Guru BK'] || '',
          catatan_tambahan: data['Catatan Tambahan'] || ''
        };
        const { error } = await supabase.from('pemetaan_siswa').insert(payload);
        if (error) throw error;
      } catch (sbError: any) {
        console.error('Gagal insert ke Supabase:', sbError);
        return NextResponse.json({ success: false, error: 'Gagal menyimpan: ' + sbError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Survey berhasil dikirim' });
    }

    const doc = await getSurveyDoc();
    
    let sheetTitle = '';
    if (surveyType === 'wali_murid') sheetTitle = 'Survey_Wali_Murid';
    else if (surveyType === 'siswa') sheetTitle = 'Survey_Siswa';
    else if (surveyType === 'kepuasan_ortu') sheetTitle = 'Survey_Kepuasan_Ortu';
    else {
      return NextResponse.json({ success: false, error: 'Tipe survey tidak valid' }, { status: 400 });
    }

    let sheet = doc.sheetsByTitle[sheetTitle];
    if (!sheet) {
      // Create sheet if it doesn't exist
      const headers = Object.keys(data);
      if (!headers.includes('Timestamp')) headers.unshift('Timestamp');
      
      try {
        sheet = await doc.addSheet({
          title: sheetTitle,
          headerValues: headers
        });
      } catch (err: any) {
        // sometimes it fails if someone created it concurrently or without headers
        // just fallback
      }
    } 
    
    // Check again
    sheet = doc.sheetsByTitle[sheetTitle];
    if (sheet) {
      try {
        await sheet.loadHeaderRow();
      } catch (e) {
        const headers = Object.keys(data);
        if (!headers.includes('Timestamp')) headers.unshift('Timestamp');
        await sheet.setHeaderRow(headers);
      }
    } else {
       return NextResponse.json({ success: false, error: 'Sheet tidak bisa dibuat' }, { status: 500 });
    }

    // Add Timestamp
    const rowData = {
      Timestamp: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      ...data
    };

    await sheet.addRow(rowData);

    return NextResponse.json({ success: true, message: 'Survey berhasil dikirim' });
  } catch (error: any) {
    console.error('API Survey Madrasah POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
