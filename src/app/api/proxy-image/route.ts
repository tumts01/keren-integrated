import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

  try {
    let fetchUrl = url;
    // Extract Google Drive file ID and use thumbnail (sz=w400) for small, fast images
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/(?:\?id=|&id=|open\?id=)([a-zA-Z0-9_-]+)/);
    if (url.includes('drive.google.com') && match && match[1]) {
      // Use Google Drive thumbnail API - much smaller, no auth required for public files
      fetchUrl = `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`;
    }

    const res = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
