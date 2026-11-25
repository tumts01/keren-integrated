import { NextRequest, NextResponse } from 'next/server';
import {
  GuruSessionPayload,
  isAdminOrPimpinanRole,
  KEREN_SESSION_COOKIE,
  PORTAL_SESSION_COOKIE,
  PortalSessionPayload,
  verifyToken,
} from '@/lib/auth-session';

const PUBLIC_EXACT_API = new Set([
  '/api/login',
  '/api/auth/session',
  '/api/auth/logout',
  '/api/proxy-image',
  '/api/portal/auth',
  '/api/cbt/login',
  '/api/cbt/sesi',
  '/api/cbt/bayar',
  '/api/olimpiade-seni/daftar',
  '/api/olimpiade-seni/config',
  '/api/olimpiade-seni/config-cbt',
  '/api/olimpiade-seni/config-pendaftaran',
  '/api/olimpiade-seni/rekap',
  '/api/olimpiade-seni/monitoring',
  '/api/olimpiade-seni/juri/login',
  '/api/olimpiade-seni/juri/penilaian',
  '/api/survey-madrasah',
  '/api/survey-madrasah/rekap',
  '/api/e-voting/kandidat',
]);

const SPMB_ADMIN_ONLY_PREFIXES = [
  '/api/spmb/jadwal-massal',
  '/api/spmb/kelulusan-massal',
  '/api/spmb/pembayaran',
  '/api/spmb/pemetaan',
];

function cleanLeadingZeros(val: string): string {
  return val.trim().replace(/^0+/, '');
}

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 1. Endpoint Publik Eksplisit
  if (PUBLIC_EXACT_API.has(pathname)) {
    return NextResponse.next();
  }

  // 3. Autocomplete publik Survey Madrasah (hanya mode=survey dengan metode GET)
  if (pathname === '/api/siswa' && request.method === 'GET' && searchParams.get('mode') === 'survey') {
    return NextResponse.next();
  }

  // 4. Portal Pendaftaran SPMB Publik (kecuali sub-rute manajemen Admin SPMB)
  if (pathname === '/api/spmb' || pathname.startsWith('/api/spmb/')) {
    const isSpmbAdminRoute = SPMB_ADMIN_ONLY_PREFIXES.some(
      prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
    if (!isSpmbAdminRoute) {
      return NextResponse.next();
    }
  }

  // Verifikasi cookie sesi Guru/Staf/Admin
  const rawGuruToken = request.cookies.get(KEREN_SESSION_COOKIE)?.value;
  const guruSession = await verifyToken<GuruSessionPayload>(rawGuruToken);

  // 5. Endpoint yang dapat diakses oleh Wali Murid (Portal Session) ATAU Guru/Admin
  const isSharedPortalEndpoint =
    pathname.startsWith('/api/portal/') ||
    (pathname === '/api/pengumuman' && request.method === 'GET') ||
    pathname === '/api/kendaraan-siswa' ||
    pathname.startsWith('/api/kendaraan-siswa/');

  if (isSharedPortalEndpoint) {
    if (guruSession) {
      return NextResponse.next();
    }

    const rawPortalToken = request.cookies.get(PORTAL_SESSION_COOKIE)?.value;
    const portalSession = await verifyToken<PortalSessionPayload>(rawPortalToken);
    if (!portalSession) {
      return NextResponse.json(
        { success: false, error: 'Sesi Portal Wali Murid berakhir. Silakan login kembali.' },
        { status: 401 }
      );
    }

    // Cegah IDOR antar Wali Murid: jika request menyertakan query nisn, wajib sama dengan nisn di cookie sesi
    const requestedNisn = searchParams.get('nisn');
    if (
      requestedNisn &&
      cleanLeadingZeros(requestedNisn) !== cleanLeadingZeros(portalSession.nisn)
    ) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: hanya dapat melihat data putra/putri sendiri.' },
        { status: 403 }
      );
    }

    return NextResponse.next();
  }

  // 6. Seluruh endpoint internal lainnya WAJIB memiliki sesi Guru/Staf/Admin yang sah
  if (!guruSession) {
    return NextResponse.json(
      { success: false, error: 'Akses ditolak: silakan login sebagai Guru / Staf terlebih dahulu.' },
      { status: 401 }
    );
  }

  // 7. Proteksi khusus endpoint eksklusif Admin / Pimpinan
  const isAdminExclusive =
    pathname === '/api/clear-cache' ||
    pathname.startsWith('/api/olimpiade-seni/juri/admin');

  if (isAdminExclusive && !isAdminOrPimpinanRole(guruSession.role)) {
    return NextResponse.json(
      { success: false, error: 'Akses khusus Admin / Pimpinan.' },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
