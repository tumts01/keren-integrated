import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getIndukDoc } from '@/lib/google-sheets';
import { getAllCachedDataInduk } from '@/lib/data-induk';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kelas = searchParams.get('kelas');
    if (!kelas) {
      return NextResponse.json({ success: false, error: 'Parameter kelas wajib diisi' }, { status: 400 });
    }

    const allSiswa = await getAllCachedDataInduk();
    
    // Helper to determine latest rombel
    const getLatestRombel = (metadata: any) => {
      if (!metadata) return '';
      if ((metadata['TA KELAS 9'] || '').trim() && (metadata['ROMBEL KELAS 9'] || '').trim()) return (metadata['ROMBEL KELAS 9'] || '').trim();
      if ((metadata['TA KELAS 8'] || '').trim() && (metadata['ROMBEL KELAS 8'] || '').trim()) return (metadata['ROMBEL KELAS 8'] || '').trim();
      if ((metadata['TA KELAS 7'] || '').trim() && (metadata['ROMBEL KELAS 7'] || '').trim()) return (metadata['ROMBEL KELAS 7'] || '').trim();
      return (metadata['ROMBEL'] || '').trim();
    };

    // Filter siswa
    const filtered = allSiswa.filter((s: any) => {
      const status = s.metadata?.['STATUS SISWA'] || '';
      const isAktif = status.toLowerCase().trim() === 'aktif';
      const rombel = getLatestRombel(s.metadata);
      return rombel.toUpperCase() === kelas.toUpperCase() && isAktif;
    });

    // Sort by nama abjad
    filtered.sort((a: any, b: any) => (a.nama || '').localeCompare(b.nama || '', 'id'));

    // Siapkan data untuk Excel
    const rows = [
      ['No', 'NIS', 'Nama Siswa', 'Rombel', 'Link Foto']
    ];

    filtered.forEach((s: any, idx: number) => {
      rows.push([
        String(idx + 1),
        s.id_siswa || '',
        s.nama || '',
        getLatestRombel(s.metadata),
        '' // Kosong untuk diisi link foto
      ]);
    });

    // Buat workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, `Kelas ${kelas}`);

    // Generate buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="template-foto-${kelas}.xlsx"`,
      },
    });

  } catch (error: any) {
    console.error('Error generate template foto:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ success: false, error: 'File Excel tidak ditemukan' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 }) as string[][];

    // Mulai dari baris 1 karena baris 0 adalah header
    const updates = rows.slice(1).map(row => {
      return {
        nis: String(row[1] || '').trim(),
        linkFoto: String(row[4] || '').trim(),
      };
    }).filter(u => u.nis && u.linkFoto);

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'Tidak ada data foto yang valid untuk diupdate' }, { status: 400 });
    }

    let updated = 0;
    let skipped = rows.length - 1 - updates.length;
    const errors: string[] = [];

    // 1. Update Supabase
    // Ambil data lama dulu untuk update metadata JSONB
    const { data: currentData, error: fetchErr } = await supabase
      .from('data_induk')
      .select('id_siswa, metadata')
      .in('id_siswa', updates.map(u => u.nis));

    if (!fetchErr && currentData) {
      const updatePromises = updates.map(async u => {
        const existing = currentData.find(d => d.id_siswa === u.nis);
        if (existing) {
          const newMetadata = { ...existing.metadata, 'LINK FOTO TERBARU': u.linkFoto };
          const { error } = await supabase
            .from('data_induk')
            .update({ metadata: newMetadata })
            .eq('id_siswa', u.nis);
          if (error) errors.push(`Supabase: Gagal update NIS ${u.nis} - ${error.message}`);
        }
      });
      await Promise.all(updatePromises);
    } else {
      errors.push(`Supabase: Gagal mengambil data saat ini - ${fetchErr?.message}`);
    }

    // 2. Update Google Sheets
    try {
      const doc = await getIndukDoc();
      const sheet = doc.sheetsByTitle['DATABASE'];
      if (sheet) {
        await sheet.loadHeaderRow();
        const sheetRows = await sheet.getRows();
        const nisToRow = new Map();
        sheetRows.forEach(r => {
          const id = r.get('ID SISWA');
          if (id) nisToRow.set(id.toString(), r);
        });

        const sheetUpdatePromises = updates.map(async u => {
          const r = nisToRow.get(u.nis);
          if (r) {
            r.set('LINK FOTO TERBARU', u.linkFoto);
            await r.save();
            updated++;
          } else {
            errors.push(`GSheets: NIS ${u.nis} tidak ditemukan di sheet DATABASE`);
          }
        });
        await Promise.all(sheetUpdatePromises);
      } else {
        errors.push('GSheets: Sheet DATABASE tidak ditemukan');
      }
    } catch (sheetErr: any) {
      errors.push(`GSheets: Gagal update - ${sheetErr.message}`);
    }

    const { revalidateTag } = require('next/cache');
    revalidateTag('data_induk');
    revalidateTag('siswa');

    return NextResponse.json({ success: true, updated, skipped, errors });
  } catch (error: any) {
    console.error('Error upload mapping foto:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
