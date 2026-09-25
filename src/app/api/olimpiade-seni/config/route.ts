import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET: Ambil status publikasi hasil
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('olimpiade_config')
      .select('hasil_published, published_at')
      .order('id', { ascending: true })
      .limit(1)
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, hasil_published: data?.hasil_published ?? false, published_at: data?.published_at ?? null });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Toggle publikasi hasil
export async function POST(req: Request) {
  try {
    const { publish } = await req.json();

    const { data: existing } = await supabase
      .from('olimpiade_config')
      .select('id')
      .order('id', { ascending: true })
      .limit(1)
      .single();

    const updateData = {
      hasil_published: publish,
      published_at: publish ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await supabase
        .from('olimpiade_config')
        .update(updateData)
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('olimpiade_config')
        .insert([updateData]);
      if (error) throw error;
    }

    return NextResponse.json({ success: true, hasil_published: publish });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
