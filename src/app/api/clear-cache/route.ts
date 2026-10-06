import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tag = searchParams.get('tag') || 'data_induk';
    
    revalidateTag(tag);
    
    return NextResponse.json({ success: true, revalidated: tag, time: Date.now() });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
