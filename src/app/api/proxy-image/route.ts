import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB

function isAllowedImageHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (
    host === 'drive.google.com' ||
    host === 'docs.google.com' ||
    host === 'drive.usercontent.google.com' ||
    host.endsWith('.googleusercontent.com') ||
    host.endsWith('.ggpht.com')
  ) {
    return true;
  }

  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (sbUrl) {
    try {
      if (host === new URL(sbUrl).hostname.toLowerCase()) {
        return true;
      }
    } catch {
      // Abaikan jika format URL env tidak valid
    }
  }

  return false;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  const rawSize = searchParams.get('size') || 'w800';
  const size = /^[whs]\d{2,4}(?:-[whs]\d{2,4})?$/i.test(rawSize) ? rawSize : 'w800';

  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

  try {
    let fetchUrl = url.trim();
    // Extract Google Drive file ID and use thumbnail API
    const match = fetchUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || fetchUrl.match(/(?:\?id=|&id=|open\?id=)([a-zA-Z0-9_-]+)/);
    if (fetchUrl.includes('drive.google.com') && match && match[1]) {
      fetchUrl = `https://drive.google.com/thumbnail?id=${encodeURIComponent(match[1])}&sz=${encodeURIComponent(size)}`;
    }

    let parsedTarget: URL;
    try {
      parsedTarget = new URL(fetchUrl);
    } catch {
      return NextResponse.json({ error: 'Format URL tidak valid' }, { status: 400 });
    }

    if (
      parsedTarget.protocol !== 'https:' ||
      parsedTarget.username ||
      parsedTarget.password ||
      !isAllowedImageHost(parsedTarget.hostname)
    ) {
      return NextResponse.json({ error: 'Domain sumber gambar tidak diizinkan' }, { status: 403 });
    }

    const res = await fetch(parsedTarget.toString(), {
      cache: 'no-store',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);

    // Pastikan hasil redirect akhir tetap berada pada domain yang diizinkan
    if (res.url) {
      const finalUrl = new URL(res.url);
      if (finalUrl.protocol !== 'https:' || !isAllowedImageHost(finalUrl.hostname)) {
        return NextResponse.json({ error: 'Redirect sumber gambar tidak diizinkan' }, { status: 403 });
      }
    }

    const contentType = (res.headers.get('Content-Type') || '').toLowerCase();
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Konten bukan berkas gambar yang valid' }, { status: 415 });
    }

    const declaredLength = Number(res.headers.get('Content-Length') || '0');
    if (declaredLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Ukuran gambar melebihi batas maksimum' }, { status: 413 });
    }

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Ukuran gambar melebihi batas maksimum' }, { status: 413 });
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memuat gambar' }, { status: 502 });
  }
}
