import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Bersihkan karakter tak terlihat (Zero-Width Space, LTR/RTL mark dari copy-paste WA/PDF/Excel, NBSP)
function stripInvisible(val: unknown): string {
  return (val ?? '')
    .toString()
    .replace(/[\u00A0\u1680\u180E\u2000-\u200F\u2028-\u202F\u205F-\u206F\uFEFF]/g, '')
    .trim();
}

function isPasswordMatch(dbRawPass: unknown, rawInputPass: unknown): boolean {
  const dbPass = stripInvisible(dbRawPass);
  const inputTrim = stripInvisible(rawInputPass);
  if (!dbPass || !inputTrim) return false;

  // 1. Cocok persis (setelah bersihkan karakter invisible)
  if (inputTrim === dbPass) return true;

  // 2. Bersihkan spasi tidak sengaja & tanda kutip/bintang dari copy-paste WA/Excel (misal *123456* atau '052894)
  const dbCompact = dbPass.replace(/\s+/g, '');
  const inputCompact = inputTrim.replace(/\s+/g, '').replace(/^['"`*]+|['"`*]+$/g, '');
  if (!inputCompact) return false;

  if (inputCompact === dbCompact) return true;

  // 3. Case-insensitive (misal cbt2026 vs CBT2026)
  if (inputCompact.toLowerCase() === dbCompact.toLowerCase()) return true;

  // 4. Khusus password numerik 6 digit peserta CBT
  if (/^\d{6}$/.test(dbCompact)) {
    // Antisipasi angka 0 di depan hilang karena dibuka di Excel / Google Sheets (misal 052894 -> 52894, 002618 -> 2618)
    if (dbCompact.startsWith('0') && /^\d{1,5}$/.test(inputCompact)) {
      if (inputCompact.padStart(6, '0') === dbCompact) return true;
    }

    // Antisipasi salah baca huruf O/o menjadi 0 atau I/l menjadi 1 dari kartu cetak
    const deconfused = inputCompact.replace(/[Oo]/g, '0').replace(/[Il]/g, '1');
    if (/^\d{6}$/.test(deconfused) && deconfused === dbCompact) return true;
    if (dbCompact.startsWith('0') && /^\d{1,5}$/.test(deconfused)) {
      if (deconfused.padStart(6, '0') === dbCompact) return true;
    }
  }

  return false;
}

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    const rawCleanUser = stripInvisible(username)
      .replace(/\s+/g, '')
      .replace(/^['"`*]+|['"`*]+$/g, '');
    const rawCleanPass = stripInvisible(password);

    if (!rawCleanUser || !rawCleanPass) {
      return NextResponse.json({ success: false, error: 'Username dan Password wajib diisi' }, { status: 400 });
    }

    // Alias map agar username varian (misal bypass_mtk, trial_ipas) tetap bisa login
    const ALIAS_MAP: Record<string, string> = {
      'bypass_mtk': 'bypass_matematika',
      'trial_matematika': 'bypass_matematika',
      'trial_mtk': 'bypass_matematika',
      'trial_ipas': 'bypass_ipas',
      'trial_ipa': 'bypass_ipas',
      'bypass_ipa': 'bypass_ipas',
      'trial_pai': 'bypass_pai',
      'trial_inggris': 'bypass_inggris',
      'bypass_ing': 'bypass_inggris',
      'bypass_bing': 'bypass_inggris',
      'trial_arab': 'bypass_arab',
      'bypass_barab': 'bypass_arab',
    };
    const normalizedAliasKey = rawCleanUser.toLowerCase().replace(/-/g, '_');
    const lookupUser = ALIAS_MAP[rawCleanUser.toLowerCase()] || ALIAS_MAP[normalizedAliasKey] || rawCleanUser;

    // Kumpulkan semua varian penulisan username (case-insensitive, tanpa tanda hubung, salah ketik O->0 / I/l->1, atau tanpa prefix CBT)
    const usernameVariants = new Set<string>([
      lookupUser,
      lookupUser.toUpperCase(),
      lookupUser.toLowerCase(),
    ]);

    const strippedSep = lookupUser.replace(/[-_.]/g, '');
    if (strippedSep) {
      usernameVariants.add(strippedSep.toUpperCase());
      usernameVariants.add(strippedSep.toLowerCase());

      // Jika format CBT + 5 karakter (dengan kemungkinan huruf O/o atau I/l tertukar angka 0/1)
      if (/^cbt[0-9oOil]{5}$/i.test(strippedSep)) {
        const fixedDigits = strippedSep.slice(3).replace(/[Oo]/g, '0').replace(/[Il]/g, '1');
        usernameVariants.add(`CBT${fixedDigits}`);
      }

      // Jika peserta hanya mengetik 5 digit angkanya saja tanpa tulisan "CBT"
      if (/^[0-9oOil]{5}$/.test(strippedSep)) {
        const fixedDigits = strippedSep.replace(/[Oo]/g, '0').replace(/[Il]/g, '1');
        usernameVariants.add(`CBT${fixedDigits}`);
      }
    }

    const variantsArr = Array.from(usernameVariants).filter(Boolean);
    let candidates: any[] = [];

    // 1. Cari peserta di data_olimpiade_seni tanpa .single() agar aman jika ada duplikat username
    if (variantsArr.length > 0) {
      const { data: exactRows, error: exactErr } = await supabase
        .from('data_olimpiade_seni')
        .select('id, metadata')
        .in('jenis_pendaftaran', ['individu', 'peserta_kolektif'])
        .in('metadata->>USERNAME_CBT', variantsArr)
        .order('id', { ascending: true });

      if (exactErr) throw exactErr;
      if (exactRows && exactRows.length > 0) {
        candidates = exactRows;
      }
    }

    // 2. Fallback ilike jika di DB ada spasi / kombinasi huruf besar-kecil tak terduga
    const safeLike = lookupUser.replace(/[^a-zA-Z0-9_-]/g, '');
    if (candidates.length === 0 && safeLike.length >= 4) {
      const { data: ilikeRows } = await supabase
        .from('data_olimpiade_seni')
        .select('id, metadata')
        .in('jenis_pendaftaran', ['individu', 'peserta_kolektif'])
        .ilike('metadata->>USERNAME_CBT', `%${safeLike}%`)
        .order('id', { ascending: true })
        .limit(20);

      if (ilikeRows && ilikeRows.length > 0) {
        const targetUpperSet = new Set(variantsArr.map(v => v.toUpperCase()));
        candidates = ilikeRows.filter((r: any) => {
          const dbU = stripInvisible(r.metadata?.USERNAME_CBT).replace(/\s+/g, '').toUpperCase();
          return targetUpperSet.has(dbU);
        });
      }
    }

    // 3. Fallback jika peserta memasukkan Nomor Peserta (misal OLM-MAT-015) ke kolom Username
    if (candidates.length === 0 && /^(olm|bypass)/i.test(rawCleanUser)) {
      const [{ data: nomorRows }, { data: nomorLamaRows }] = await Promise.all([
        supabase
          .from('data_olimpiade_seni')
          .select('id, metadata')
          .in('jenis_pendaftaran', ['individu', 'peserta_kolektif'])
          .ilike('metadata->>NOMOR_PESERTA', rawCleanUser)
          .order('id', { ascending: true })
          .limit(10),
        supabase
          .from('data_olimpiade_seni')
          .select('id, metadata')
          .in('jenis_pendaftaran', ['individu', 'peserta_kolektif'])
          .ilike('metadata->>NOMOR_PESERTA_LAMA', rawCleanUser)
          .order('id', { ascending: true })
          .limit(10),
      ]);

      const merged = [...(nomorRows || []), ...(nomorLamaRows || [])];
      if (merged.length > 0) {
        candidates = merged;
      }
    }

    // Verifikasi password terhadap seluruh kandidat akun yang ditemukan
    const matchedRow = candidates.find((row: any) => isPasswordMatch(row?.metadata?.PASSWORD_CBT, password));

    if (!matchedRow) {
      return NextResponse.json({ success: false, error: 'Username atau Password salah!' }, { status: 401 });
    }

    const p = matchedRow.metadata || {};

    // Temukan nilai lomba
    let lombaStr = p.LOMBA_DIPILIH || '';
    if (!lombaStr) {
      for (const key of Object.keys(p)) {
        if (key.toLowerCase().includes('lomba')) {
          lombaStr = p[key];
          break;
        }
      }
    }

    // Normalisasi
    let cabang = stripInvisible(lombaStr);
    if (cabang.toLowerCase() === 'arab' || cabang.toLowerCase() === 'bahasa arab' || cabang.toLowerCase() === 'b. arab') cabang = 'Arab';
    else if (cabang.toLowerCase() === 'inggris' || cabang.toLowerCase() === 'bahasa inggris' || cabang.toLowerCase() === 'b. inggris') cabang = 'Inggris';
    else if (cabang.toLowerCase() === 'pai' || cabang.toLowerCase() === 'p a i' || cabang.toLowerCase() === 'pendidikan agama islam') cabang = 'PAI';
    else if (cabang.toLowerCase() === 'ipas' || cabang.toLowerCase() === 'ipa') cabang = 'IPAS';
    else if (cabang.toLowerCase() === 'matematika' || cabang.toLowerCase() === 'mtk') cabang = 'Matematika';

    // Temukan nama
    let namaStr = p.NAMA || p.NAMA_REGU || '';
    if (!namaStr) {
      for (const key of Object.keys(p)) {
        if (key.toLowerCase().includes('nama')) {
          namaStr = p[key];
          break;
        }
      }
    }

    const nomorPesertaClean = stripInvisible(p.NOMOR_PESERTA);
    const isBypass = p.IS_BYPASS === true || nomorPesertaClean.startsWith('BYPASS-');

    return NextResponse.json({
      success: true,
      message: 'Login Berhasil',
      user: {
        pesertaId: matchedRow.id,
        nomorPeserta: nomorPesertaClean,
        nama: stripInvisible(namaStr),
        lomba: cabang,
        asalSekolah: stripInvisible(p.ASAL_SEKOLAH),
        isBypass
      }
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
