import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { uploadFileToDrive } from '@/lib/google-drive';
import { formatMathSymbols } from '@/lib/cbt-format';
import * as xlsx from 'xlsx';

export const dynamic = 'force-dynamic';

function resolveCabangKey(lomba: string, tahap?: string | null): string {
  const base = (lomba || '').trim().replace(/_FINAL$/i, '');
  if (tahap === 'final') {
    return `${base}_FINAL`;
  }
  return base;
}

// GET: Ambil daftar soal
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lomba = searchParams.get('lomba');
    const tahap = searchParams.get('tahap');

    let query = supabase.from('cbt_soal').select('*').order('nomor_soal', { ascending: true });
    
    if (lomba) {
      const targetCabang = resolveCabangKey(lomba, tahap);
      query = query.eq('cabang_lomba', targetCabang);
    }

    const [{ data, error }, { data: allRows }] = await Promise.all([
      query,
      supabase.from('cbt_soal').select('cabang_lomba')
    ]);
    if (error) throw error;

    const counts: Record<string, number> = {};
    (allRows || []).forEach((r: any) => {
      const c = (r.cabang_lomba || '').trim();
      if (c) counts[c] = (counts[c] || 0) + 1;
    });

    return NextResponse.json({ success: true, data, counts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Upload Soal (Excel massal atau Satuan dengan gambar)
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const type = formData.get('type') as string;
    const tahap = (formData.get('tahap') as string) || 'seleksi';

    if (type === 'excel') {
      const fileExcel = formData.get('fileExcel') as File;
      if (!fileExcel) return NextResponse.json({ success: false, error: 'File Excel tidak ditemukan' }, { status: 400 });

      const arrayBuffer = await fileExcel.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const dataExcel = xlsx.utils.sheet_to_json<any>(workbook.Sheets[sheetName]);

      const rowsToInsert = dataExcel.map(row => {
        let cabang = (row['LOMBA'] || '').toString().trim().replace(/_FINAL$/i, '');
        // Auto-fix common naming issues
        if (cabang.toLowerCase() === 'arab' || cabang.toLowerCase() === 'bahasa arab' || cabang.toLowerCase() === 'b. arab') cabang = 'Arab';
        if (cabang.toLowerCase() === 'inggris' || cabang.toLowerCase() === 'bahasa inggris' || cabang.toLowerCase() === 'b. inggris') cabang = 'Inggris';
        if (cabang.toLowerCase() === 'pai' || cabang.toLowerCase() === 'p a i' || cabang.toLowerCase() === 'pendidikan agama islam') cabang = 'PAI';
        if (cabang.toLowerCase() === 'ipas' || cabang.toLowerCase() === 'ipa') cabang = 'IPAS';
        if (cabang.toLowerCase() === 'matematika' || cabang.toLowerCase() === 'mtk') cabang = 'Matematika';

        const finalCabangKey = cabang ? resolveCabangKey(cabang, tahap) : '';

        return {
          cabang_lomba: finalCabangKey,
          nomor_soal: parseInt(row['NOMOR_SOAL'] || '0', 10),
          pertanyaan: formatMathSymbols(row['PERTANYAAN'] || ''),
          opsi_a: formatMathSymbols(row['OPSI_A'] || ''),
          opsi_b: formatMathSymbols(row['OPSI_B'] || ''),
          opsi_c: formatMathSymbols(row['OPSI_C'] || ''),
          opsi_d: formatMathSymbols(row['OPSI_D'] || ''),
          opsi_e: row['OPSI_E'] ? formatMathSymbols(row['OPSI_E']) : null,
          kunci_jawaban: (row['KUNCI'] || '').toString().trim().toUpperCase(),
          bobot_skor: parseInt(row['BOBOT'] || '1', 10)
        };
      }).filter(r => r.cabang_lomba && r.pertanyaan && r.kunci_jawaban);

      const { error } = await supabase.from('cbt_soal').insert(rowsToInsert);
      if (error) throw error;

      const labelTahap = tahap === 'final' ? 'Babak Final' : 'Babak Seleksi';
      return NextResponse.json({ success: true, message: `${rowsToInsert.length} soal (${labelTahap}) berhasil diunggah` });
    } 
    
    else if (type === 'single') {
      const rawLomba = formData.get('cabang_lomba') as string;
      const lomba = resolveCabangKey(rawLomba, tahap);
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
        cabang_lomba: lomba,
        nomor_soal: nomor,
        pertanyaan: formatMathSymbols(pertanyaan),
        gambar_url: gambarUrl,
        opsi_a: formatMathSymbols(opsiA),
        opsi_b: formatMathSymbols(opsiB),
        opsi_c: formatMathSymbols(opsiC),
        opsi_d: formatMathSymbols(opsiD),
        opsi_e: opsiE ? formatMathSymbols(opsiE) : null,
        kunci_jawaban: kunci,
        bobot_skor: bobot
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
    const tahap = searchParams.get('tahap');

    if (id) {
      const { error } = await supabase.from('cbt_soal').delete().eq('id', id);
      if (error) throw error;
    } else if (lomba) {
      const targetCabang = resolveCabangKey(lomba, tahap);
      const { error } = await supabase.from('cbt_soal').delete().eq('cabang_lomba', targetCabang);
      if (error) throw error;
    } else {
      return NextResponse.json({ success: false, error: 'ID atau Lomba harus disertakan' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Berhasil dihapus' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH: Update gambar soal
export async function PATCH(req: Request) {
  try {
    const formData = await req.formData();
    const id = formData.get('id') as string;
    const gambar = formData.get('gambar') as File | null;

    if (!id || !gambar) {
      return NextResponse.json({ success: false, error: 'ID soal dan gambar wajib disertakan' }, { status: 400 });
    }

    const folderId = process.env.GOOGLE_DRIVE_CBT_FOLDER_ID || '1XMpQqdTzx0i_WaD79AHdgzhRUUmgQX6z';
    const buffer = Buffer.from(await gambar.arrayBuffer());
    const res = await uploadFileToDrive(buffer, `Soal_Img_${id}_${gambar.name}`, gambar.type, folderId);
    const gambarUrl = res.webViewLink || null;

    if (!gambarUrl) throw new Error('Gagal mengupload gambar ke Google Drive');

    const { error } = await supabase.from('cbt_soal').update({ gambar_url: gambarUrl }).eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Gambar berhasil ditambahkan', gambarUrl });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update detail data soal langsung
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      nomor_soal,
      pertanyaan,
      opsi_a,
      opsi_b,
      opsi_c,
      opsi_d,
      opsi_e,
      kunci_jawaban,
      bobot_skor,
      hapus_gambar
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID soal wajib disertakan' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {};

    if (nomor_soal !== undefined) {
      updatePayload.nomor_soal = parseInt(nomor_soal.toString(), 10) || 1;
    }
    if (pertanyaan !== undefined) {
      updatePayload.pertanyaan = formatMathSymbols((pertanyaan || '').toString());
    }
    if (opsi_a !== undefined) {
      updatePayload.opsi_a = formatMathSymbols((opsi_a || '').toString());
    }
    if (opsi_b !== undefined) {
      updatePayload.opsi_b = formatMathSymbols((opsi_b || '').toString());
    }
    if (opsi_c !== undefined) {
      updatePayload.opsi_c = formatMathSymbols((opsi_c || '').toString());
    }
    if (opsi_d !== undefined) {
      updatePayload.opsi_d = formatMathSymbols((opsi_d || '').toString());
    }
    if (opsi_e !== undefined) {
      const trimmedE = (opsi_e || '').toString().trim();
      updatePayload.opsi_e = trimmedE ? formatMathSymbols(trimmedE) : null;
    }
    if (kunci_jawaban !== undefined) {
      updatePayload.kunci_jawaban = (kunci_jawaban || '').toString().trim().toUpperCase();
    }
    if (bobot_skor !== undefined) {
      updatePayload.bobot_skor = parseInt(bobot_skor.toString(), 10) || 1;
    }
    if (hapus_gambar === true) {
      updatePayload.gambar_url = null;
    }

    const { data, error } = await supabase
      .from('cbt_soal')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Soal berhasil diperbarui', data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
