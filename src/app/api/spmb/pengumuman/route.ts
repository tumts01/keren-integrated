import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function getOrCreatePengumumanRecord() {
  const { data, error } = await supabase
    .from('profil_lembaga')
    .select('*')
    .eq('jenis', 'PENGUMUMAN_SPMB')
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    const initialMeta = { list: [] };
    const { data: created, error: createError } = await supabase
      .from('profil_lembaga')
      .insert([{
        jenis: 'PENGUMUMAN_SPMB',
        isi: 'PENGUMUMAN_SPMB',
        metadata: initialMeta
      }])
      .select()
      .single();

    if (createError) throw createError;
    return created;
  }

  return data;
}

// GET: Fetch announcements (optionally filtered by ?jalur=...)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filterJalur = searchParams.get('jalur')?.trim() || '';

    const record = await getOrCreatePengumumanRecord();
    const list: any[] = Array.isArray(record.metadata?.list) ? record.metadata.list : [];

    let filtered = list;
    if (filterJalur) {
      const cleanJalur = filterJalur.toLowerCase();
      filtered = list.filter((item: any) => {
        const target = (item.targetJalur || 'Semua Jalur').toLowerCase();
        return target === 'semua jalur' || target === 'semua' || target === cleanJalur;
      });
    }

    return NextResponse.json({
      success: true,
      data: filtered,
      all: list
    }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  } catch (err: any) {
    console.error('Fetch Pengumuman SPMB Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Add new announcement
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const judul = (body.judul || '').trim();
    const pesan = (body.pesan || '').trim();
    const targetJalur = (body.targetJalur || 'Semua Jalur').trim();
    const penulis = (body.penulis || 'Panitia SPMB').trim();

    if (!judul && !pesan) {
      return NextResponse.json({ success: false, error: 'Judul atau isi pengumuman wajib diisi' }, { status: 400 });
    }

    const record = await getOrCreatePengumumanRecord();
    const currentList: any[] = Array.isArray(record.metadata?.list) ? record.metadata.list : [];

    const now = new Date();
    const tanggal = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const jam = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');

    const newItem = {
      id: `ann-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      judul: judul || 'Pengumuman SPMB',
      pesan,
      targetJalur,
      penulis,
      tanggal,
      jam,
      createdAt: now.toISOString()
    };

    // Prepend newest first
    const updatedList = [newItem, ...currentList];

    const { error: updateError } = await supabase
      .from('profil_lembaga')
      .update({
        metadata: {
          ...record.metadata,
          list: updatedList,
          updated_at: now.toISOString()
        }
      })
      .eq('id', record.id);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      data: newItem
    });
  } catch (err: any) {
    console.error('Create Pengumuman SPMB Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: Remove announcement by ?id=...
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch (e) {
        // Body might be empty or invalid, ignore
      }
    }

    const cleanId = (id || '').trim();
    if (!cleanId) {
      return NextResponse.json({ success: false, error: 'Parameter id pengumuman diperlukan' }, { status: 400 });
    }

    const record = await getOrCreatePengumumanRecord();
    const currentList: any[] = Array.isArray(record.metadata?.list) ? record.metadata.list : [];

    const updatedList = currentList.filter((item: any) => String(item.id || '').trim() !== cleanId);

    const { error: updateError } = await supabase
      .from('profil_lembaga')
      .update({
        metadata: {
          ...record.metadata,
          list: updatedList,
          updated_at: new Date().toISOString()
        }
      })
      .eq('id', record.id);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: 'Pengumuman berhasil dihapus',
      deletedId: cleanId,
      remainingCount: updatedList.length
    });
  } catch (err: any) {
    console.error('Delete Pengumuman SPMB Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
