import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = (searchParams.get('key') || '').trim();
    const keysParam = (searchParams.get('keys') || '').trim();

    if (key) {
      if (key.length > 120) {
        return NextResponse.json({ success: false, error: 'Key tidak valid' }, { status: 400 });
      }
      const { data, error } = await supabase
        .from('rapor_config')
        .select('key, value')
        .eq('key', key)
        .maybeSingle();

      if (error) throw error;
      return NextResponse.json({ success: true, data: data || null });
    }

    if (keysParam) {
      const keys = keysParam
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0 && k.length <= 120)
        .slice(0, 20);

      if (keys.length === 0) {
        return NextResponse.json({ success: false, error: 'Daftar keys kosong' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('rapor_config')
        .select('key, value')
        .in('key', keys);

      if (error) throw error;
      return NextResponse.json({ success: true, data: data || [] });
    }

    return NextResponse.json({ success: false, error: 'Parameter key atau keys diperlukan' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Gagal memuat konfigurasi' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawItems: Array<{ key: string; value: string }> = Array.isArray(body?.items)
      ? body.items
      : body?.key
      ? [{ key: body.key, value: body.value }]
      : [];

    const validItems = rawItems
      .filter(it => typeof it?.key === 'string' && it.key.trim().length > 0 && it.key.trim().length <= 120)
      .map(it => ({
        key: it.key.trim(),
        value: typeof it.value === 'string' ? it.value : JSON.stringify(it.value ?? '')
      }));

    if (validItems.length === 0) {
      return NextResponse.json({ success: false, error: 'Payload konfigurasi tidak valid' }, { status: 400 });
    }

    const { error } = await supabase
      .from('rapor_config')
      .upsert(validItems, { onConflict: 'key' });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Gagal menyimpan konfigurasi' }, { status: 500 });
  }
}
