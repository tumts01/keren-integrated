import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  findTeacherClashes,
  generateJadwalKelasFromGuru,
  JadwalKelasEntry,
} from '@/lib/jadwalGenerator';

export const dynamic = 'force-dynamic';

const DAYS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

function normalizeClassCode(raw: string): string {
  const s = raw.trim().toUpperCase().replace(/\s+/g, '_');
  if (/^(VII|VIII|IX)_[A-Z]+$/.test(s)) return s;
  const m = s.match(/^([789])([A-Z]+)$/);
  if (m) {
    const prefix = m[1] === '7' ? 'VII' : m[1] === '8' ? 'VIII' : 'IX';
    return `${prefix}_${m[2]}`;
  }
  return s;
}

function parseLegacyRows(
  rows: unknown[][],
  mapKodeGuru: Record<string, { namaGuru: string; mataPelajaran: string }>
): JadwalKelasEntry[] {
  const rowCount = rows.length;
  const parsedData: JadwalKelasEntry[] = [];
  const activeBlocks: Record<number, { day: string; classColMap: Record<number, string> }> = {};

  for (let r = 0; r < rowCount - 1; r++) {
    let isHeaderRow = false;
    const colCount = rows[r]?.length || 0;
    for (let c = 0; c < colCount - 1; c++) {
      const valC = String(rows[r][c] || '').trim().toUpperCase();
      const valC1 = String(rows[r][c + 1] || '').trim().toUpperCase();

      if (valC === 'JAM' && valC1 === 'WAKTU') {
        isHeaderRow = true;
        let currentDay = '';
        if (r > 0) {
          const dayText = String(rows[r - 1][c] || '').toUpperCase().trim();
          for (const d of DAYS) {
            if (dayText.includes(d)) {
              currentDay = d;
              break;
            }
          }
        }
        if (!currentDay) currentDay = 'UNKNOWN';

        const classColMap: Record<number, string> = {};
        for (let k = c + 2; k < colCount; k++) {
          const classVal = String(rows[r][k] || '').trim();
          if (classVal) {
            classColMap[k] = normalizeClassCode(classVal);
          } else if (Object.keys(classColMap).length > 0) {
            break;
          }
        }
        activeBlocks[c] = { day: currentDay, classColMap };
      }
    }

    if (isHeaderRow) continue;

    for (const jamColStr in activeBlocks) {
      const jamCol = parseInt(jamColStr, 10);
      const block = activeBlocks[jamCol];
      const jamKeStr = String(rows[r][jamCol] || '').trim();
      const jamKeNum = parseInt(jamKeStr, 10);
      const waktu = String(rows[r][jamCol + 1] || '').trim();

      if (!jamKeStr || jamKeStr.toLowerCase().includes('istirahat') || isNaN(jamKeNum)) {
        continue;
      }

      for (const classColStr in block.classColMap) {
        const classCol = parseInt(classColStr, 10);
        const className = block.classColMap[classCol];
        const kodeGuruRaw = String(rows[r][classCol] || '').trim();
        const kodes = kodeGuruRaw.split('/').map(k => k.trim()).filter(Boolean);

        for (const kode of kodes) {
          const guruInfo = mapKodeGuru[kode];
          parsedData.push({
            hari: block.day,
            kelas: className,
            jamKe: jamKeNum,
            waktu,
            kodeGuru: kode,
            namaGuru: guruInfo?.namaGuru || 'TIDAK DIKETAHUI / EKSKUL',
            mataPelajaran: guruInfo?.mataPelajaran || 'TIDAK DIKETAHUI',
          });
        }
      }
    }
  }

  return parsedData;
}

async function persistScheduleMetadata(metadata: Record<string, unknown>) {
  const { data: existingRows, error: fetchErr } = await supabase
    .from('data_master_jadwal')
    .select('id, metadata')
    .order('id', { ascending: true });

  if (fetchErr) throw fetchErr;

  if (existingRows && existingRows.length > 0) {
    const targetRow = existingRows[0];
    const mergedMetadata = {
      ...(targetRow.metadata || {}),
      ...metadata,
    };
    const { error: updErr } = await supabase
      .from('data_master_jadwal')
      .update({ metadata: mergedMetadata })
      .eq('id', targetRow.id);
    if (updErr) throw updErr;
  } else {
    const { error: insErr } = await supabase
      .from('data_master_jadwal')
      .insert([{ metadata }]);
    if (insErr) throw insErr;
  }
}

export async function GET() {
  try {
    const [{ data: jadwalMengajar }, { data: masterRows, error: masterErr }] = await Promise.all([
      supabase.from('jadwal_mengajar').select('*'),
      supabase.from('data_master_jadwal').select('*').order('id', { ascending: true }),
    ]);

    if (masterErr) throw masterErr;

    const masterJadwal =
      masterRows?.find(r => Array.isArray(r.metadata?.entries)) ||
      masterRows?.[0];

    if (!masterJadwal || !masterJadwal.metadata) {
      return NextResponse.json({ success: true, data: [], meta: null });
    }

    // Format baru hasil generator / edit Jadwal Kelas
    if (Array.isArray(masterJadwal.metadata.entries)) {
      const normalizedEntries: JadwalKelasEntry[] = masterJadwal.metadata.entries.map(
        (e: JadwalKelasEntry) => ({
          ...e,
          kelas: normalizeClassCode(String(e.kelas || '')),
          jamKe: Number(e.jamKe),
          kodeGuru: String(e.kodeGuru || '').trim(),
          namaGuru: String(e.namaGuru || '').trim(),
          mataPelajaran: String(e.mataPelajaran || '').trim(),
        })
      );

      return NextResponse.json(
        {
          success: true,
          data: normalizedEntries,
          meta: {
            format: masterJadwal.metadata.format || 'generated_v1',
            generatedAt: masterJadwal.metadata.generatedAt || null,
            includePK: masterJadwal.metadata.includePK !== false,
            stats: masterJadwal.metadata.stats || null,
          },
          clashes: findTeacherClashes(normalizedEntries),
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Fallback format Excel template lama jika masih ada
    const mapKodeGuru: Record<string, { namaGuru: string; mataPelajaran: string }> = {};
    if (jadwalMengajar) {
      jadwalMengajar.forEach((r: { metadata?: Record<string, unknown> }) => {
        const kode = String(r.metadata?.kodeGuru || '').trim();
        if (kode) {
          mapKodeGuru[kode] = {
            namaGuru: String(r.metadata?.namaGuru || ''),
            mataPelajaran: String(r.metadata?.mataPelajaran || ''),
          };
        }
      });
    }

    const parsedData = Array.isArray(masterJadwal.metadata.rows)
      ? parseLegacyRows(masterJadwal.metadata.rows, mapKodeGuru)
      : [];

    return NextResponse.json(
      { success: true, data: parsedData, meta: null, clashes: findTeacherClashes(parsedData) },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Jadwal Fetch Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memuat jadwal' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action || 'generate';

    if (action === 'generate') {
      const includePK = body?.includePK !== false;
      const { data: jadwalMengajar, error: jmErr } = await supabase
        .from('jadwal_mengajar')
        .select('*');
      if (jmErr) throw jmErr;

      if (!jadwalMengajar || jadwalMengajar.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Data Jadwal Guru masih kosong.' },
          { status: 400 }
        );
      }

      const result = generateJadwalKelasFromGuru(jadwalMengajar, { includePK });
      const generatedAt = new Date().toISOString();

      await persistScheduleMetadata({
        format: 'generated_v1',
        generatedAt,
        includePK,
        stats: result.stats,
        entries: result.entries,
      });

      return NextResponse.json({
        success: true,
        data: result.entries,
        stats: result.stats,
        unplacedCount: result.unplaced.length,
        clashes: findTeacherClashes(result.entries),
        meta: { format: 'generated_v1', generatedAt, includePK, stats: result.stats },
      });
    }

    if (action === 'save') {
      const entriesInput = Array.isArray(body?.entries) ? body.entries : null;
      if (!entriesInput) {
        return NextResponse.json(
          { success: false, error: 'Payload entries tidak valid.' },
          { status: 400 }
        );
      }

      const normalizedEntries: JadwalKelasEntry[] = entriesInput.map((e: JadwalKelasEntry) => ({
        hari: String(e.hari || '').toUpperCase().trim(),
        kelas: normalizeClassCode(String(e.kelas || '')),
        jamKe: Number(e.jamKe),
        kodeGuru: String(e.kodeGuru || '').trim(),
        namaGuru: String(e.namaGuru || '').trim(),
        mataPelajaran: String(e.mataPelajaran || '').trim(),
        isPK: Boolean(e.isPK || String(e.kodeGuru || '').trim() === 'PK'),
      }));

      const clashes = findTeacherClashes(normalizedEntries);
      const updatedAt = new Date().toISOString();

      await persistScheduleMetadata({
        format: 'generated_v1',
        generatedAt: updatedAt,
        entries: normalizedEntries,
      });

      return NextResponse.json({
        success: true,
        data: normalizedEntries,
        clashes,
        meta: { format: 'generated_v1', generatedAt: updatedAt },
      });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak dikenal.' }, { status: 400 });
  } catch (error) {
    console.error('Jadwal Save/Generate Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memproses jadwal kelas' },
      { status: 500 }
    );
  }
}
