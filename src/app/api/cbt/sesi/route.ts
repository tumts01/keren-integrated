import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Helper: ambil soal tanpa kunci
async function getSoalForSesi(lomba: string) {
  const { data, error } = await supabase
    .from('cbt_soal')
    .select('id, cabang_lomba, nomor_soal, pertanyaan, gambar_url, opsi_a, opsi_b, opsi_c, opsi_d, opsi_e')
    .eq('cabang_lomba', lomba)
    .order('nomor_soal', { ascending: true });
  
  if (error) throw error;
  return data;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const nomor = searchParams.get('nomorPeserta');
    if (!nomor) return NextResponse.json({ success: false, error: 'Parameter nomorPeserta wajib' }, { status: 400 });

    const { data: sesi, error } = await supabase.from('cbt_sesi').select('*').eq('nomor_peserta', nomor).single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is not found
      throw error;
    }

    if (!sesi) {
      return NextResponse.json({ success: true, sesi: null });
    }

    const soal = await getSoalForSesi(sesi.cabang_lomba);

    return NextResponse.json({ success: true, sesi, soal });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, nomorPeserta, lomba } = body;

    if (action === 'start') {
      // Cek apakah sudah ada sesi
      const { data: existing } = await supabase.from('cbt_sesi').select('*').eq('nomor_peserta', nomorPeserta).single();
      
      if (existing) {
        if (existing.status === 'selesai') {
          return NextResponse.json({ success: false, error: 'Anda sudah menyelesaikan ujian ini.' }, { status: 403 });
        }
        return NextResponse.json({ success: true, sesi: existing });
      }

      // Buat sesi baru
      const { data: newSesi, error } = await supabase.from('cbt_sesi').insert([{
        nomor_peserta: nomorPeserta,
        cabang_lomba: lomba,
        waktu_mulai: new Date().toISOString(),
        status: 'berjalan'
      }]).select().single();

      if (error) throw error;
      return NextResponse.json({ success: true, sesi: newSesi });
    }

    else if (action === 'save') {
      const { nomorSoal, jawaban } = body;
      
      const { data: sesi } = await supabase.from('cbt_sesi').select('jawaban_tersimpan, status').eq('nomor_peserta', nomorPeserta).single();
      if (!sesi || sesi.status === 'selesai') return NextResponse.json({ success: false, error: 'Sesi tidak valid atau sudah selesai' }, { status: 403 });

      const newJawaban = { ...sesi.jawaban_tersimpan, [nomorSoal.toString()]: jawaban };

      const { error } = await supabase.from('cbt_sesi').update({ 
        jawaban_tersimpan: newJawaban,
        updated_at: new Date().toISOString()
      }).eq('nomor_peserta', nomorPeserta);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Tersimpan' });
    }

    else if (action === 'submit') {
      const { data: sesi } = await supabase.from('cbt_sesi').select('*').eq('nomor_peserta', nomorPeserta).single();
      if (!sesi) return NextResponse.json({ success: false, error: 'Sesi tidak valid' }, { status: 400 });
      if (sesi.status === 'selesai') return NextResponse.json({ success: true, message: 'Sudah pernah disubmit' });

      // Skoring Olimpiade: Benar +4, Salah -1, Tidak Dijawab 0
      const { data: soalList } = await supabase.from('cbt_soal').select('nomor_soal, kunci_jawaban').eq('cabang_lomba', sesi.cabang_lomba);
      
      let totalBenar = 0;
      let totalSalah = 0;
      let totalKosong = 0;
      const totalSoal = soalList?.length || 0;

      if (soalList && totalSoal > 0) {
        soalList.forEach(soal => {
          const jawabanUser = sesi.jawaban_tersimpan?.[soal.nomor_soal.toString()];
          if (!jawabanUser || jawabanUser === '') {
            totalKosong++;
          } else if (jawabanUser === soal.kunci_jawaban) {
            totalBenar++;
          } else {
            totalSalah++;
          }
        });
      }

      // Skor mentah: benar*4, salah*(-1), kosong*0
      const skorMentah = (totalBenar * 4) + (totalSalah * -1);
      // Skor max = totalSoal * 4
      const skorMax = totalSoal * 4;
      // nilaiAkhir dikonversi ke skala 0-100 (boleh negatif kalau jawaban salah semua)
      const nilaiAkhir = skorMax > 0 ? (skorMentah / skorMax) * 100 : 0;

      const { error } = await supabase.from('cbt_sesi').update({
        status: 'selesai',
        waktu_selesai: new Date().toISOString(),
        nilai_akhir: nilaiAkhir,
        updated_at: new Date().toISOString()
      }).eq('nomor_peserta', nomorPeserta);

      if (error) throw error;
      return NextResponse.json({ 
        success: true, 
        nilai: nilaiAkhir,
        skor: skorMentah,
        benar: totalBenar,
        salah: totalSalah,
        kosong: totalKosong,
        totalSoal,
        message: 'Ujian selesai disimpan' 
      });
    }

    else if (action === 'log_kecurangan') {
      const { jenisKecurangan, jumlahPelanggaran } = body;
      
      const { data: sesiData } = await supabase.from('cbt_sesi').select('log_kecurangan').eq('nomor_peserta', nomorPeserta).single();
      const existingLog = Array.isArray(sesiData?.log_kecurangan) ? sesiData.log_kecurangan : [];
      const newEntry = { jenis: jenisKecurangan, waktu: new Date().toISOString(), ke: jumlahPelanggaran };
      const newLog = [...existingLog, newEntry];

      await supabase.from('cbt_sesi').update({ log_kecurangan: newLog, updated_at: new Date().toISOString() }).eq('nomor_peserta', nomorPeserta);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
