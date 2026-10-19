import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function detectJenjang(asalSekolah: string): 'SD' | 'MI' {
  const s = (asalSekolah || '').trim().toUpperCase();
  if (
    s.startsWith('MI ') ||
    s.startsWith('MIN ') ||
    s.startsWith('MIS ') ||
    s.startsWith('MI.') ||
    s.includes('MADRASAH IBTIDAIYAH') ||
    /\b(MI|MIN|MIS)\b/.test(s)
  ) {
    return 'MI';
  }
  return 'SD';
}

export async function GET() {
  try {
    const { data: rows, error } = await supabase.from('data_spmb').select('*');
    if (error) throw error;

    const data = (rows || [])
      .map((r: any) => {
        const meta = r.metadata || {};
        const namaLengkap = meta['Nama Lengkap'] || r.nama || '';
        const asalSekolah = meta['Asal Sekolah'] || '';
        const savedPemetaan = meta.pemetaan_kelas || {};
        const jenjangAsal: 'SD' | 'MI' =
          savedPemetaan.jenjangAsal === 'MI' || savedPemetaan.jenjangAsal === 'SD'
            ? savedPemetaan.jenjangAsal
            : detectJenjang(asalSekolah);

        return {
          id: r.id,
          rowNumber: r.id,
          nomorPendaftaran:
            meta['Nomor Pendaftaran'] || `MTS01-2026-${String(r.id).padStart(4, '0')}`,
          timestamp: meta['Timestamp'] || '',
          jalurPendaftaran: meta['Jalur Pendaftaran'] || 'Reguler',
          namaLengkap,
          nisn: meta['NISN'] || r.nisn || '',
          jenisKelamin: meta['Jenis Kelamin'] || '',
          asalSekolah,
          prestasiKeterangan: meta['Prestasi (Jika Ada)'] || '',
          statusKelulusan: meta['status_kelulusan'] || 'proses',
          pemetaan: {
            jenjangAsal,
            pilihan1: savedPemetaan.pilihan1 || '',
            pilihan2: savedPemetaan.pilihan2 || '',
            pilihan3: savedPemetaan.pilihan3 || '',
            pilihan4: savedPemetaan.pilihan4 || '',
            pilihan5: savedPemetaan.pilihan5 || '',
            nilai: {
              pai: savedPemetaan.nilai?.pai ?? '',
              qh: savedPemetaan.nilai?.qh ?? '',
              aa: savedPemetaan.nilai?.aa ?? '',
              fq: savedPemetaan.nilai?.fq ?? '',
              ski: savedPemetaan.nilai?.ski ?? '',
              ind: savedPemetaan.nilai?.ind ?? '',
              mat: savedPemetaan.nilai?.mat ?? '',
              ipas: savedPemetaan.nilai?.ipas ?? '',
              sbk: savedPemetaan.nilai?.sbk ?? '',
              bing: savedPemetaan.nilai?.bing ?? '',
              pjok: savedPemetaan.nilai?.pjok ?? '',
            },
            poinPrestasi: savedPemetaan.poinPrestasi ?? '',
            kelasHasilManual: savedPemetaan.kelasHasilManual || '',
          },
        };
      })
      .filter((item: any) => item.namaLengkap !== '');

    // Sort by newest registration first
    const parseTimestamp = (item: any): number => {
      const str = item.timestamp || '';
      if (str) {
        const parts = str.match(
          /^(\d{1,2})\/(\d{1,2})\/(\d{4})[,\s]+(\d{1,2})[.:](\d{1,2})[.:](\d{1,2})/
        );
        if (parts) {
          const [, d, m, y, h, min, s] = parts;
          const t = new Date(
            Number(y),
            Number(m) - 1,
            Number(d),
            Number(h),
            Number(min),
            Number(s)
          ).getTime();
          if (!isNaN(t)) return t;
        }
        const parsed = Date.parse(str);
        if (!isNaN(parsed)) return parsed;
      }
      const numId = Number(item.rowNumber || item.id || 0);
      return !isNaN(numId) ? numId : 0;
    };

    data.sort((a: any, b: any) => {
      const timeDiff = parseTimestamp(b) - parseTimestamp(a);
      if (timeDiff !== 0) return timeDiff;
      return Number(b.rowNumber || 0) - Number(a.rowNumber || 0);
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('GET Pemetaan SPMB Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data pemetaan SPMB: ' + error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const updates: Array<{ id: number | string; pemetaan: any }> = Array.isArray(body.updates)
      ? body.updates
      : body.id !== undefined
      ? [{ id: body.id, pemetaan: body.pemetaan }]
      : [];

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tidak ada data yang dikirim untuk disimpan' },
        { status: 400 }
      );
    }

    const ids = updates.map((u) => Number(u.id)).filter((id) => !isNaN(id));
    const { data: existingRows, error: fetchError } = await supabase
      .from('data_spmb')
      .select('id, metadata')
      .in('id', ids);

    if (fetchError) throw fetchError;

    const existingMap = new Map<number, any>();
    (existingRows || []).forEach((row: any) => {
      existingMap.set(Number(row.id), row.metadata || {});
    });

    let updatedCount = 0;
    const errors: string[] = [];

    // Process updates concurrently in batches of 15
    const batchSize = 15;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (item) => {
          const numId = Number(item.id);
          const currentMeta = existingMap.get(numId);
          if (!currentMeta) {
            errors.push(`ID ${item.id} tidak ditemukan`);
            return;
          }

          const prevPemetaan = currentMeta.pemetaan_kelas || {};
          const nextPemetaan = {
            ...prevPemetaan,
            ...item.pemetaan,
            nilai: {
              ...(prevPemetaan.nilai || {}),
              ...(item.pemetaan?.nilai || {}),
            },
          };

          const newMetadata = {
            ...currentMeta,
            pemetaan_kelas: nextPemetaan,
          };

          const { error: updateErr } = await supabase
            .from('data_spmb')
            .update({ metadata: newMetadata })
            .eq('id', numId);

          if (updateErr) {
            errors.push(`Gagal update ID ${numId}: ${updateErr.message}`);
          } else {
            updatedCount++;
          }
        })
      );
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      errors,
      message: `Berhasil menyimpan data pemetaan untuk ${updatedCount} calon siswa.`,
    });
  } catch (error: any) {
    console.error('POST Pemetaan SPMB Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menyimpan data pemetaan: ' + error.message },
      { status: 500 }
    );
  }
}
