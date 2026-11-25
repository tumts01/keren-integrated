import { NextResponse } from 'next/server';
import { getAllCachedDataInduk } from '@/lib/data-induk';
import {
  PORTAL_SESSION_COOKIE,
  PortalSessionPayload,
  SESSION_MAX_AGE_SECONDS,
  signToken,
} from '@/lib/auth-session';
import { checkRateLimit, clearRateLimit, getClientIp } from '@/lib/pin-crypto';

export const dynamic = 'force-dynamic';

const INDO_MONTHS: Record<string, number> = {
  januari: 1, jan: 1, january: 1,
  februari: 2, pebruari: 2, feb: 2, peb: 2, february: 2,
  maret: 3, mar: 3, march: 3,
  april: 4, apr: 4,
  mei: 5, may: 5,
  juni: 6, jun: 6, june: 6,
  juli: 7, jul: 7, july: 7,
  agustus: 8, agu: 8, agt: 8, aug: 8, august: 8,
  september: 9, sep: 9, sept: 9,
  oktober: 10, okt: 10, oct: 10, october: 10,
  november: 11, nopember: 11, nov: 11, nop: 11,
  desember: 12, des: 12, dec: 12, december: 12,
};

function parseFlexibleBirthDate(raw: string): { day: number; month: number; year: number } | null {
  let clean = (raw || '').trim();
  if (!clean) return null;

  // Jika masih mengandung nama kota di depan koma ("Malang, 14 Mei 2012")
  if (clean.includes(',')) {
    clean = clean.split(',').slice(1).join(',').trim();
  }

  // 1. Format ISO: YYYY-MM-DD atau YYYY/MM/DD
  const isoMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (year >= 1990 && year <= 2030 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { day, month, year };
    }
  }

  // 2. Format Numerik Indonesia: DD-MM-YYYY atau DD/MM/YYYY atau DD.MM.YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const year = Number(dmyMatch[3]);
    if (year >= 1990 && year <= 2030 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { day, month, year };
    }
  }

  // 3. Format Teks Bulan Indonesia/Inggris: "14 Mei 2012" atau "14-Mei-2012"
  const textMatch = clean.match(/(\d{1,2})[\s\-/.]+([a-zA-Z]+)[\s\-/.]+(\d{4})/);
  if (textMatch) {
    const day = Number(textMatch[1]);
    const month = INDO_MONTHS[textMatch[2].toLowerCase()];
    const year = Number(textMatch[3]);
    if (month && year >= 1990 && year <= 2030 && day >= 1 && day <= 31) {
      return { day, month, year };
    }
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateKey = `portal-auth:${ip}`;
    const rate = checkRateLimit(rateKey, 15, 5 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Terlalu banyak percobaan login. Silakan tunggu ${rate.retryAfterSec} detik.`,
        },
        { status: 429 }
      );
    }

    const { nisn, tanggalLahir } = await req.json();

    if (!nisn) {
      return NextResponse.json({ success: false, error: 'NISN tidak boleh kosong' }, { status: 400 });
    }

    const cleanInputNisn = String(nisn).trim().replace(/^0+/, '');
    const rawSiswa = await getAllCachedDataInduk();
    let foundStudent: any = null;
    let dbBirthRaw = '';

    for (const row of rawSiswa) {
      const rowNisn = String(row.metadata?.['NISN'] || '').trim().replace(/^0+/, '');

      if (rowNisn && rowNisn === cleanInputNisn) {
        let rombel = (row.metadata?.['ROMBEL KELAS 9'] || '').trim();
        if (!rombel) rombel = (row.metadata?.['ROMBEL KELAS 8'] || '').trim();
        if (!rombel) rombel = (row.metadata?.['ROMBEL KELAS 7'] || '').trim();
        if (!rombel) rombel = (row.metadata?.['ROMBEL'] || '').trim();

        const getThumbUrl = (url: string) => {
          if (!url) return '';
          if (url.includes('drive.google.com')) {
            const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
              return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400-h400`;
            }
          }
          return url;
        };

        const rawTtl = row.metadata?.['TEMPAT, TANGGAL LAHIR'] || '';
        const rawTempat = row.metadata?.['TEMPAT LAHIR'] || rawTtl.split(',')[0]?.trim() || '';
        const rawTanggal =
          row.metadata?.['TANGGAL LAHIR'] || rawTtl.split(',').slice(1).join(',')?.trim() || '';
        dbBirthRaw = rawTanggal || rawTtl;

        foundStudent = {
          supabaseId: row.id,
          nisn: row.metadata?.['NISN'] || '',
          nis: row.metadata?.['ID SISWA'] || row.id_siswa || '',
          nama: row.metadata?.['NAMA'] || row.nama || '',
          kelas: rombel,
          status: (row.metadata?.['STATUS SISWA'] || '').toUpperCase().trim(),
          asalSekolah: row.metadata?.['SD/MI'] || row.metadata?.['ASAL SEKOLAH'] || '',
          namaAyah: row.metadata?.['NAMA AYAH KANDUNG'] || '',
          namaIbu: row.metadata?.['NAMA IBU KANDUNG'] || '',
          foto: getThumbUrl(
            row.metadata?.['LINK FOTO TERBARU'] ||
              row.metadata?.['LINK URL FOTO 1'] ||
              row.metadata?.['LINK URL FOTO 2'] ||
              ''
          ),
          jenisKelamin: row.metadata?.['JENIS KELAMIN'] || '',
          noHp:
            row.metadata?.['NOMOR WHATSAPP'] ||
            row.metadata?.['NO WA'] ||
            row.metadata?.['NO. WA'] ||
            row.metadata?.['NO. HP'] ||
            '',
          domisili: row.metadata?.['DOMISILI'] || '',
          alamat:
            row.metadata?.['ALAMAT ASAL SESUAI KK TERAKHIR'] ||
            row.metadata?.['ALAMAT AYAH KANDUNG'] ||
            '',
          tahunAjaran: row.metadata?.['TAHUN AJARAN'] || '2023/2024',
          ttl: rawTtl,
          tempatLahir: rawTempat,
          tanggalLahir: rawTanggal,
          nik: row.metadata?.['NIK'] || '',
          nism: row.metadata?.['NISM'] || '',
          verifikasiIjazah: row.metadata?.['VERIFIKASI_IJAZAH'] || null,
          bio: row.metadata?.['BIO_SISWA'] || null,
        };
        break;
      }
    }

    if (!foundStudent) {
      return NextResponse.json(
        { success: false, error: 'NISN atau Tanggal Lahir tidak sesuai' },
        { status: 401 }
      );
    }

    // Verifikasi Tanggal Lahir Siswa (jika tanggal lahir tercatat valid pada Data Induk)
    const dbBirthParts = parseFlexibleBirthDate(dbBirthRaw);
    if (dbBirthParts) {
      if (!tanggalLahir) {
        return NextResponse.json(
          { success: false, error: 'Tanggal Lahir Siswa wajib diisi' },
          { status: 400 }
        );
      }
      const inputParts = parseFlexibleBirthDate(String(tanggalLahir));
      if (
        !inputParts ||
        inputParts.day !== dbBirthParts.day ||
        inputParts.month !== dbBirthParts.month ||
        inputParts.year !== dbBirthParts.year
      ) {
        return NextResponse.json(
          { success: false, error: 'NISN atau Tanggal Lahir tidak sesuai dengan data madrasah' },
          { status: 401 }
        );
      }
    }

    if (foundStudent.status !== 'AKTIF') {
      return NextResponse.json(
        { success: false, error: 'Status siswa sudah tidak aktif' },
        { status: 403 }
      );
    }

    clearRateLimit(rateKey);

    const nowSec = Math.floor(Date.now() / 1000);
    const portalToken = await signToken<PortalSessionPayload>({
      nisn: foundStudent.nisn,
      nis: foundStudent.nis,
      nama: foundStudent.nama,
      kelas: foundStudent.kelas,
      iat: nowSec,
      exp: nowSec + SESSION_MAX_AGE_SECONDS,
    });

    const response = NextResponse.json({
      success: true,
      data: foundStudent,
      message: 'Berhasil login',
    });

    response.cookies.set(PORTAL_SESSION_COOKIE, portalToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error: any) {
    console.error('Portal Auth Error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}
