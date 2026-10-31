import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAllCachedDataInduk } from '@/lib/data-induk';

export const dynamic = 'force-dynamic';

// --- HELPER NORMALISASI & FUZZY MATCHING CERDAS ---

function cleanString(str: any): string {
  return (str || '')
    .toString()
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeName(str: any): string {
  return cleanString(str)
    // Ekspansi singkatan nama umum di Indonesia
    .replace(/\bM\b/g, 'MUHAMMAD')
    .replace(/\bMUH\b/g, 'MUHAMMAD')
    .replace(/\bMOH\b/g, 'MUHAMMAD')
    .replace(/\bMHD\b/g, 'MUHAMMAD')
    .replace(/\bACH\b/g, 'ACHMAD')
    .replace(/\bAHM\b/g, 'AHMAD')
    .replace(/\bABD\b/g, 'ABDUL')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + 1);
    }
  }
  return dp[m][n];
}

function computeSimilarity(strA: string, strB: string): number {
  const a = normalizeName(strA);
  const b = normalizeName(strB);

  if (a === b) return 1.0;
  if (!a || !b) return 0;

  // Exact word set comparison (Jaccard similarity)
  const wordsA = a.split(' ').filter(Boolean);
  const wordsB = b.split(' ').filter(Boolean);
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  const intersect = wordsA.filter(w => setB.has(w));
  const jaccard = intersect.length / Math.max(setA.size, setB.size);

  // Levenshtein edit distance
  const maxLen = Math.max(a.length, b.length);
  const dist = levenshteinDistance(a, b);
  const levSim = 1 - dist / maxLen;

  // Substring check jika nama di excel merupakan bagian utuh dari nama di DB atau sebaliknya
  let substringBonus = 0;
  if (a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a))) {
    substringBonus = 0.85;
  }

  return Math.max(levSim, jaccard, substringBonus);
}

function parseKelasExcel(val: any): string {
  const s = String(val || '').trim().toUpperCase();
  if (s.includes('7') || s.includes('VII')) return '7';
  if (s.includes('8') || s.includes('VIII')) return '8';
  if (s.includes('9') || s.includes('IX')) return '9';
  return '';
}

function getTingkatFromRombel(rombel: string): string {
  const r = (rombel || '').trim().toUpperCase();
  if (r.startsWith('7') || r.startsWith('VII')) return '7';
  if (r.startsWith('8') || r.startsWith('VIII')) return '8';
  if (r.startsWith('9') || r.startsWith('IX')) return '9';
  return '';
}

// Helper: ambil atau inisialisasi baris BANTUAN_PIP di profil_lembaga
async function getPipConfig() {
  const { data: existing } = await supabase
    .from('profil_lembaga')
    .select('*')
    .eq('jenis', 'BANTUAN_PIP')
    .maybeSingle();

  if (existing) {
    return existing;
  }

  const defaultMeta = {
    active_periode: 'Tahun 2026/2027 - Tahap 1',
    periodes: ['Tahun 2026/2027 - Tahap 1'],
    items: []
  };

  const { data: inserted, error } = await supabase
    .from('profil_lembaga')
    .insert([{
      jenis: 'BANTUAN_PIP',
      isi: 'DATA_BANTUAN_PIP',
      metadata: defaultMeta
    }])
    .select()
    .single();

  if (error) throw error;
  return inserted;
}

// --- GET: AMBIL DATA REKAP & DAFTAR SISWA USULAN PIP ---
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const kelasParam = searchParams.get('kelas'); // e.g. "7A", "Semua"
    const statusParam = searchParams.get('status'); // e.g. "layak", "tidak_layak", "belum_diverifikasi"
    const periodeParam = searchParams.get('periode');

    const configRow = await getPipConfig();
    const meta = configRow.metadata || {};
    const activePeriode = periodeParam || meta.active_periode || 'Tahun 2026/2027 - Tahap 1';
    const allItems: any[] = Array.isArray(meta.items) ? meta.items : [];

    // Ambil data rombel dan wali kelas dari data_kelas
    const { data: rowsKelas } = await supabase.from('data_kelas').select('*');
    const classesList: Array<{ rombel: string, waliKelas: string, tingkat: string }> = (rowsKelas || [])
      .map(k => {
        const rombel = (k.metadata?.ROMBEL || '').trim().toUpperCase();
        return {
          rombel,
          waliKelas: (k.metadata?.['WALI KELAS'] || '').trim(),
          tingkat: getTingkatFromRombel(rombel)
        };
      })
      .filter(k => !!k.rombel)
      .sort((a, b) => a.rombel.localeCompare(b.rombel, undefined, { numeric: true }));

    // Filter items berdasarkan periode aktif
    const periodItems = allItems.filter(item => (item.periode || activePeriode) === activePeriode);

    // Ambil data siswa dari cache data induk untuk memastikan status keaktifan real-time
    const rawSiswa = await getAllCachedDataInduk();
    const siswaMap: Record<number, any> = {};
    rawSiswa.forEach(s => {
      siswaMap[s.id] = s.metadata || {};
    });

    // Perkaya item dengan status keaktifan terkini
    let totalTidakAktif = 0;
    const enrichedItems = periodItems.map(item => {
      let statusSiswa = item.status_siswa || '';
      let isTidakAktif = item.is_tidak_aktif || false;

      if (item.siswa_id && siswaMap[item.siswa_id]) {
        const metaSiswa = siswaMap[item.siswa_id];
        const dbStatus = (metaSiswa['STATUS SISWA'] || '').trim().toUpperCase();
        const hasMutasiKeluar = !!metaSiswa['TANGGAL MUTASI KELUAR'] || !!metaSiswa['TANGGAL KELUAR'];
        statusSiswa = dbStatus || 'AKTIF';
        if (dbStatus !== 'AKTIF' || hasMutasiKeluar) {
          isTidakAktif = true;
        }
      } else if (item.warning?.toLowerCase().includes('tidak aktif') || item.warning?.toLowerCase().includes('mutasi')) {
        isTidakAktif = true;
        statusSiswa = statusSiswa || 'TIDAK AKTIF';
      }

      if (isTidakAktif) {
        totalTidakAktif++;
      }

      return {
        ...item,
        status_siswa: statusSiswa || (isTidakAktif ? 'TIDAK AKTIF' : 'AKTIF'),
        is_tidak_aktif: !!isTidakAktif
      };
    });

    // Hitung ringkasan statistik
    let totalLayak = 0;
    let totalTidakLayak = 0;
    let totalBelum = 0;
    const perRombelMap: Record<string, { total: number, layak: number, tidak_layak: number, belum: number, tidak_aktif: number, wali_kelas: string }> = {};

    classesList.forEach(c => {
      perRombelMap[c.rombel] = { total: 0, layak: 0, tidak_layak: 0, belum: 0, tidak_aktif: 0, wali_kelas: c.waliKelas };
    });

    enrichedItems.forEach(item => {
      const st = item.status_kelayakan || 'belum_diverifikasi';
      if (st === 'layak') totalLayak++;
      else if (st === 'tidak_layak') totalTidakLayak++;
      else totalBelum++;

      const r = item.rombel;
      if (r) {
        if (!perRombelMap[r]) {
          perRombelMap[r] = { total: 0, layak: 0, tidak_layak: 0, belum: 0, tidak_aktif: 0, wali_kelas: item.wali_kelas || '-' };
        }
        perRombelMap[r].total++;
        if (item.is_tidak_aktif) perRombelMap[r].tidak_aktif++;
        if (st === 'layak') perRombelMap[r].layak++;
        else if (st === 'tidak_layak') perRombelMap[r].tidak_layak++;
        else perRombelMap[r].belum++;
      }
    });

    // Filter tampilan data sesuai query params
    let filteredItems = enrichedItems;
    if (kelasParam && kelasParam !== 'Semua') {
      filteredItems = filteredItems.filter(item => item.rombel === kelasParam.toUpperCase());
    }
    if (statusParam && statusParam !== 'Semua') {
      if (statusParam === 'tidak_aktif') {
        filteredItems = filteredItems.filter(item => item.is_tidak_aktif || (item.status_siswa && item.status_siswa !== 'AKTIF'));
      } else {
        filteredItems = filteredItems.filter(item => (item.status_kelayakan || 'belum_diverifikasi') === statusParam);
      }
    }

    return NextResponse.json({
      success: true,
      active_periode: activePeriode,
      periodes: meta.periodes || [activePeriode],
      items: filteredItems,
      all_items_count: periodItems.length,
      summary: {
        total: periodItems.length,
        layak: totalLayak,
        tidak_layak: totalTidakLayak,
        belum_diverifikasi: totalBelum,
        tidak_aktif: totalTidakAktif,
        per_rombel: perRombelMap
      },
      classes: classesList
    });
  } catch (error: any) {
    console.error('GET /api/keuangan/pip Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// --- POST: OPERASI UPLOAD EXCEL, FUZZY MATCH, VERIFIKASI WALI KELAS, & MANAGEMENT ---
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    const configRow = await getPipConfig();
    const meta = configRow.metadata || {};
    let allItems: any[] = Array.isArray(meta.items) ? [...meta.items] : [];
    const activePeriode = body.periode || meta.active_periode || 'Tahun 2026/2027 - Tahap 1';

    // 1. ACTION: PREVIEW MATCH & UPLOAD DATA DARI EXCEL DENGAN SMART FUZZY MATCHING
    if (action === 'preview_match' || action === 'upload') {
      const rawRows: Array<{ nama: string, kelas: string | number, keterangan?: string }> = body.rows || [];
      if (!rawRows || rawRows.length === 0) {
        return NextResponse.json({ success: false, error: 'Tidak ada baris data siswa yang dikirimkan.' }, { status: 400 });
      }

      // Ambil seluruh data siswa dari cache data induk (baik aktif maupun tidak aktif)
      const rawSiswa = await getAllCachedDataInduk();
      const allMappedStudents = rawSiswa.map(s => {
        const rombel = (s.metadata?.ROMBEL || '').trim().toUpperCase();
        const tingkat = getTingkatFromRombel(rombel);
        const status = (s.metadata?.['STATUS SISWA'] || '').trim().toUpperCase();
        return {
          id: s.id,
          nama: (s.metadata?.NAMA || '').trim(),
          nisn: (s.metadata?.NISN || '').trim(),
          rombel,
          tingkat,
          status,
          kip: (s.metadata?.KIP || '').trim(),
          ayah: (s.metadata?.['NAMA AYAH KANDUNG'] || '').trim(),
          ibu: (s.metadata?.['NAMA IBU KANDUNG'] || '').trim(),
        };
      });

      const activeStudents = allMappedStudents.filter(s => s.status === 'AKTIF' || s.status === 'AKTIF ');

      // Ambil mapping wali kelas dari data_kelas
      const { data: rowsKelas } = await supabase.from('data_kelas').select('*');
      const waliMap: Record<string, string> = {};
      (rowsKelas || []).forEach(k => {
        const rombel = (k.metadata?.ROMBEL || '').trim().toUpperCase();
        if (rombel) waliMap[rombel] = (k.metadata?.['WALI KELAS'] || '').trim();
      });

      // Kelompokkan siswa aktif berdasarkan tingkat kelas (7, 8, 9)
      const poolByTingkat: Record<string, typeof activeStudents> = {
        '7': activeStudents.filter(s => s.tingkat === '7'),
        '8': activeStudents.filter(s => s.tingkat === '8'),
        '9': activeStudents.filter(s => s.tingkat === '9')
      };

      // Jalankan matching algorithm bertahap (Tier 1: Tingkat sama aktif -> Tier 2: Semua aktif -> Tier 3: Riwayat non-aktif)
      const matchedResults = rawRows.map((row, index) => {
        const rawNama = String(row.nama || '').trim();
        const rawKelas = parseKelasExcel(row.kelas);
        const keteranganExcel = String(row.keterangan || '').trim();

        if (!rawNama) {
          return null;
        }

        let bestMatch: (typeof allMappedStudents)[0] | null = null;
        let bestScore = 0;
        let matchType: 'exact' | 'fuzzy' | 'unmatched' = 'unmatched';
        let matchWarning = '';

        // TAHAP 1: Cari pada tingkat kelas yang sesuai di antara siswa AKTIF
        const poolStage1 = poolByTingkat[rawKelas] && poolByTingkat[rawKelas].length > 0
          ? poolByTingkat[rawKelas]
          : activeStudents;

        const normInput = normalizeName(rawNama);

        // 1a. Cek Exact Match di Tahap 1
        for (const cand of poolStage1) {
          const normCand = normalizeName(cand.nama);
          if (normInput === normCand) {
            bestMatch = cand;
            bestScore = 1.0;
            matchType = 'exact';
            break;
          }
        }

        // 1b. Cek Fuzzy di Tahap 1
        if (!bestMatch) {
          for (const cand of poolStage1) {
            const score = computeSimilarity(rawNama, cand.nama);
            if (score > bestScore) {
              bestScore = score;
              bestMatch = cand;
            }
          }
          if (bestScore >= 0.80) {
            matchType = 'fuzzy';
          }
        }

        // TAHAP 2: Jika belum ketemu di tingkat tersebut, cari di seluruh siswa AKTIF (beda kelas)
        if (bestScore < 0.80) {
          for (const cand of activeStudents) {
            const score = computeSimilarity(rawNama, cand.nama);
            if (score > bestScore) {
              bestScore = score;
              bestMatch = cand;
            }
          }
          if (bestScore >= 0.80 && bestMatch) {
            matchType = 'fuzzy';
            if (rawKelas && bestMatch.tingkat !== rawKelas) {
              matchWarning = `Di Excel tertulis Kelas ${rawKelas}, di database terdaftar di Kelas ${bestMatch.rombel}`;
            }
          }
        }

        // TAHAP 3: Jika masih belum ketemu, cari di riwayat siswa Non-Aktif / Alumni / Mutasi
        if (bestScore < 0.80) {
          const inactiveStudents = allMappedStudents.filter(s => s.status !== 'AKTIF' && s.status !== 'AKTIF ');
          for (const cand of inactiveStudents) {
            const score = computeSimilarity(rawNama, cand.nama);
            if (score > bestScore) {
              bestScore = score;
              bestMatch = cand;
            }
          }
          if (bestScore >= 0.80 && bestMatch) {
            matchType = 'fuzzy';
            matchWarning = `Siswa ditemukan di database tetapi berstatus: ${bestMatch.status || 'TIDAK AKTIF'}`;
          } else {
            matchType = 'unmatched';
          }
        }

        const matchScorePercent = Math.round(bestScore * 100);
        const statusSiswa = bestMatch ? (bestMatch.status || 'AKTIF') : '';
        const isTidakAktif = statusSiswa !== 'AKTIF';

        return {
          id: `pip-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
          periode: activePeriode,
          nama_excel: rawNama,
          kelas_excel: rawKelas || String(row.kelas || ''),
          keterangan_excel: keteranganExcel,

          // Data siswa hasil pencocokan sistem
          siswa_id: bestMatch ? bestMatch.id : null,
          nama_siswa: bestMatch ? bestMatch.nama : '',
          nisn: bestMatch ? bestMatch.nisn : '',
          rombel: bestMatch ? bestMatch.rombel : '',
          tingkat: bestMatch ? bestMatch.tingkat : (rawKelas || ''),
          wali_kelas: bestMatch ? (waliMap[bestMatch.rombel] || '-') : '-',
          kip: bestMatch ? bestMatch.kip : '',
          warning: matchWarning,
          status_siswa: statusSiswa,
          is_tidak_aktif: isTidakAktif,

          // Status & Skor Kecocokan
          match_type: matchType,
          match_score: matchScorePercent,

          // Status Verifikasi oleh Wali Kelas
          status_kelayakan: isTidakAktif ? 'tidak_layak' : 'belum_diverifikasi',
          alasan_tidak_layak: isTidakAktif ? (matchWarning || `Siswa berstatus ${statusSiswa || 'TIDAK AKTIF'}`) : '',
          catatan_wali: '',
          verified_by: isTidakAktif ? 'Sistem (Otomatis: Tidak Aktif)' : '',
          verified_at: isTidakAktif ? new Date().toISOString() : null,
          created_at: new Date().toISOString()
        };
      }).filter(Boolean);

      // Jika hanya preview match, jangan simpan ke database dulu
      if (action === 'preview_match') {
        const inactiveCount = matchedResults.filter(r => r?.is_tidak_aktif).length;
        const exactCount = matchedResults.filter(r => r?.match_type === 'exact' && !r?.is_tidak_aktif).length;
        const fuzzyCount = matchedResults.filter(r => r?.match_type === 'fuzzy' && !r?.is_tidak_aktif).length;
        const unmatchedCount = matchedResults.filter(r => r?.match_type === 'unmatched').length;

        return NextResponse.json({
          success: true,
          preview: true,
          total: matchedResults.length,
          stats: { exactCount, fuzzyCount, unmatchedCount, inactiveCount },
          items: matchedResults
        });
      }

      // Jika aksi upload definitif:
      // Pilihan replace atau append: jika mode replace, hapus data lama pada periode tersebut
      const mode = body.mode || 'append';
      let nextItems: any[] = [];
      if (mode === 'replace') {
        nextItems = allItems.filter(item => (item.periode || activePeriode) !== activePeriode);
        nextItems = [...nextItems, ...matchedResults];
      } else {
        // Mode append: tambahkan baris yang belum ada
        nextItems = [...allItems, ...matchedResults];
      }

      const updatedMeta = {
        ...meta,
        active_periode: activePeriode,
        items: nextItems
      };

      const { error: saveErr } = await supabase
        .from('profil_lembaga')
        .update({ metadata: updatedMeta })
        .eq('id', configRow.id);

      if (saveErr) throw saveErr;

      return NextResponse.json({
        success: true,
        message: `Berhasil mengunggah dan mencocokkan ${matchedResults.length} siswa calon penerima PIP.`,
        total: matchedResults.length,
        items: matchedResults
      });
    }

    // 2. ACTION: VERIFIKASI SISWA OLEH WALI KELAS (SATU SISWA)
    if (action === 'verify') {
      const { id, status_kelayakan, alasan_tidak_layak, catatan_wali, verified_by } = body;
      if (!id || !status_kelayakan) {
        return NextResponse.json({ success: false, error: 'Parameter id dan status_kelayakan wajib diisi.' }, { status: 400 });
      }

      let found = false;
      const nextItems = allItems.map(item => {
        if (item.id === id) {
          found = true;
          return {
            ...item,
            status_kelayakan,
            alasan_tidak_layak: alasan_tidak_layak || '',
            catatan_wali: catatan_wali || '',
            verified_by: verified_by || 'Wali Kelas',
            verified_at: new Date().toISOString()
          };
        }
        return item;
      });

      if (!found) {
        return NextResponse.json({ success: false, error: 'Data usulan PIP tidak ditemukan.' }, { status: 404 });
      }

      const { error: updateErr } = await supabase
        .from('profil_lembaga')
        .update({ metadata: { ...meta, items: nextItems } })
        .eq('id', configRow.id);

      if (updateErr) throw updateErr;

      return NextResponse.json({ success: true, message: 'Verifikasi kelayakan berhasil disimpan.' });
    }

    // 3. ACTION: BATCH VERIFIKASI (MISAL: VERIFIKASI SELURUH SISWA KELAS TERTENTU SEBAGAI LAYAK)
    if (action === 'batch_verify') {
      const { ids, status_kelayakan, verified_by } = body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ success: false, error: 'Daftar ID siswa wajib diisi.' }, { status: 400 });
      }

      const idSet = new Set(ids);
      const nowIso = new Date().toISOString();
      const nextItems = allItems.map(item => {
        if (idSet.has(item.id)) {
          return {
            ...item,
            status_kelayakan: status_kelayakan || 'layak',
            verified_by: verified_by || 'Wali Kelas',
            verified_at: nowIso
          };
        }
        return item;
      });

      const { error: updateErr } = await supabase
        .from('profil_lembaga')
        .update({ metadata: { ...meta, items: nextItems } })
        .eq('id', configRow.id);

      if (updateErr) throw updateErr;

      return NextResponse.json({ success: true, message: `${ids.length} siswa berhasil diverifikasi.` });
    }

    // 4. ACTION: MANUAL MATCH (ADMIN MEMILIH SISWA ALTERNATIF JIKA MISMATCH)
    if (action === 'manual_match') {
      const { id, siswa_id } = body;
      const rawSiswa = await getAllCachedDataInduk();
      const targetSiswa = rawSiswa.find(s => s.id === siswa_id);
      if (!targetSiswa) {
        return NextResponse.json({ success: false, error: 'Siswa tujuan tidak ditemukan di database induk.' }, { status: 404 });
      }

      const { data: rowsKelas } = await supabase.from('data_kelas').select('*');
      const waliMap: Record<string, string> = {};
      (rowsKelas || []).forEach(k => {
        const rombel = (k.metadata?.ROMBEL || '').trim().toUpperCase();
        if (rombel) waliMap[rombel] = (k.metadata?.['WALI KELAS'] || '').trim();
      });

      const rombel = (targetSiswa.metadata?.ROMBEL || '').trim().toUpperCase();
      const tingkat = getTingkatFromRombel(rombel);

      const nextItems = allItems.map(item => {
        if (item.id === id) {
          return {
            ...item,
            siswa_id: targetSiswa.id,
            nama_siswa: targetSiswa.metadata?.NAMA || '',
            nisn: targetSiswa.metadata?.NISN || '',
            rombel,
            tingkat,
            wali_kelas: waliMap[rombel] || '-',
            kip: targetSiswa.metadata?.KIP || '',
            match_type: 'manual',
            match_score: 100
          };
        }
        return item;
      });

      const { error: updateErr } = await supabase
        .from('profil_lembaga')
        .update({ metadata: { ...meta, items: nextItems } })
        .eq('id', configRow.id);

      if (updateErr) throw updateErr;

      return NextResponse.json({ success: true, message: 'Kecocokan siswa berhasil diperbarui.' });
    }

    // 5. ACTION: HAPUS SATU SISWA
    if (action === 'delete_item') {
      const { id } = body;
      const nextItems = allItems.filter(item => item.id !== id);

      const { error: updateErr } = await supabase
        .from('profil_lembaga')
        .update({ metadata: { ...meta, items: nextItems } })
        .eq('id', configRow.id);

      if (updateErr) throw updateErr;
      return NextResponse.json({ success: true, message: 'Data siswa berhasil dihapus.' });
    }

    // 6. ACTION: KOSONGKAN SELURUH DATA PERIODE AKTIF
    if (action === 'clear_period') {
      const nextItems = allItems.filter(item => (item.periode || activePeriode) !== activePeriode);

      const { error: updateErr } = await supabase
        .from('profil_lembaga')
        .update({ metadata: { ...meta, items: nextItems } })
        .eq('id', configRow.id);

      if (updateErr) throw updateErr;
      return NextResponse.json({ success: true, message: 'Seluruh data usulan PIP pada periode ini berhasil dibersihkan.' });
    }

    // 7. ACTION: TAMBAH PERIODE BARU
    if (action === 'add_periode') {
      const { new_periode } = body;
      if (!new_periode || !new_periode.trim()) {
        return NextResponse.json({ success: false, error: 'Nama periode baru wajib diisi.' }, { status: 400 });
      }

      const existingPeriodes: string[] = meta.periodes || [activePeriode];
      if (!existingPeriodes.includes(new_periode.trim())) {
        existingPeriodes.push(new_periode.trim());
      }

      const { error: updateErr } = await supabase
        .from('profil_lembaga')
        .update({
          metadata: {
            ...meta,
            active_periode: new_periode.trim(),
            periodes: existingPeriodes
          }
        })
        .eq('id', configRow.id);

      if (updateErr) throw updateErr;
      return NextResponse.json({ success: true, message: `Periode ${new_periode} berhasil ditambahkan.` });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak valid' }, { status: 400 });
  } catch (error: any) {
    console.error('POST /api/keuangan/pip Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
