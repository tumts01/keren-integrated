import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { clearDataIndukMemoryCache } from '@/lib/data-induk';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tag = searchParams.get('tag') || 'data_induk';

    if (tag === 'data_induk' || tag === 'siswa') {
      clearDataIndukMemoryCache();
    }

    // @ts-ignore
    revalidateTag(tag);
    
    return NextResponse.json({ success: true, revalidated: tag, time: Date.now() });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
