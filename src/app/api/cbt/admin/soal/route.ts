import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { uploadFileToDrive } from '@/lib/google-drive';
import * as xlsx from 'xlsx';

export const dynamic = 'force-dynamic';

// GET: Ambil daftar soal
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lomba = searchParams.get('lomba');

    let query = supabase.from('cbt_soal').select('*').order('nomor_soal', { ascending: true });
    
    if (lomba) {
      query = query.eq('cabang_lomba', lomba);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Upload Soal (Excel massal atau Satuan dengan gambar)
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const type = formData.get('type') as string;

    if (type === 'excel') {
      const fileExcel = formData.get('fileExcel') as File;
      if (!fileExcel) return NextResponse.json({ success: false, error: 'File Excel tidak ditemukan' }, { status: 400 });

      const arrayBuffer = await fileExcel.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const dataExcel = xlsx.utils.sheet_to_json<any>(workbook.Sheets[sheetName]);

      const rowsToInsert = dataExcel.map(row => ({
        cabang_lomba: row['LOMBA'] || '',
        nomor_soal: parseInt(row['NOMOR_SOAL'] || '0', 10),
        pertanyaan: row['PERTANYAAN'] || '',
        opsi_a: row['OPSI_A'] || '',
        opsi_b: row['OPSI_B'] || '',
        opsi_c: row['OPSI_C'] || '',
        opsi_d: row['OPSI_D'] || '',
        opsi_e: row['OPSI_E'] || null,
        kunci_jawaban: (row['KUNCI'] || '').toUpperCase(),
        bobot_skor: parseInt(row['BOBOT'] || '1', 10)
      })).filter(r => r.cabang_lomba && r.pertanyaan && r.kunci_jawaban);

      const { error } = await supabase.from('cbt_soal').insert(rowsToInsert);
      if (error) throw error;

      return NextResponse.json({ success: true, message: `${rowsToInsert.length} soal berhasil diunggah` });
    } 
    
    else if (type === 'single') {
      const lomba = formData.get('cabang_lomba') as string;
      const nomor = parseInt(formData.get('nomor_soal') as string, 10);
      const pertanyaan = formData.get('pertanyaan') as string;
      const opsiA = formData.get('opsi_a') as string;
      const opsiB = formData.get('opsi_b') as string;
      const opsiC = formData.get('opsi_c') as string;
      const opsiD = formData.get('opsi_d') as string;
      const opsiE = formData.get('opsi_e') as string;
      const kunci = (formData.get('kunci_jawaban') as string).toUpperCase();
      const bobot = parseInt(formData.get('bobot_skor') as string || '1', 10);

      const gambar = formData.get('gambar') as File | null;
      let gambarUrl = null;

      if (gambar) {
        const folderId = process.env.GOOGLE_DRIVE_CBT_FOLDER_ID || '1XMpQqdTzx0i_WaD79AHdgzhRUUmgQX6z'; // Use existing folder if CBT specific doesn't exist
        const buffer = Buffer.from(await gambar.arrayBuffer());
        const res = await uploadFileToDrive(buffer, `Soal_${lomba}_${nomor}_${gambar.name}`, gambar.type, folderId);
        gambarUrl = res.webViewLink || null;
      }

      const { data, error } = await supabase.from('cbt_soal').insert([{
        cabang_lomba: lomba, nomor_soal: nomor, pertanyaan, gambar_url: gambarUrl,
        opsi_a: opsiA, opsi_b: opsiB, opsi_c: opsiC, opsi_d: opsiD, opsi_e: opsiE,
        kunci_jawaban: kunci, bobot_skor: bobot
      }]).select();

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Soal berhasil ditambahkan', data });
    }

    return NextResponse.json({ success: false, error: 'Tipe upload tidak valid' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Hapus soal
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const lomba = searchParams.get('lomba'); // Untuk clear semua soal 1 lomba

    if (id) {
      const { error } = await supabase.from('cbt_soal').delete().eq('id', id);
      if (error) throw error;
    } else if (lomba) {
      const { error } = await supabase.from('cbt_soal').delete().eq('cabang_lomba', lomba);
      if (error) throw error;
    } else {
      return NextResponse.json({ success: false, error: 'ID atau Lomba harus disertakan' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Berhasil dihapus' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
