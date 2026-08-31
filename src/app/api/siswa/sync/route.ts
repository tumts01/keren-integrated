import { NextResponse } from 'next/server';
import { getIndukDoc } from '@/lib/google-sheets';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    const doc = await getIndukDoc();
    const sheet = doc.sheetsByTitle['DATABASE'];
    if (!sheet) {
      return NextResponse.json({ success: false, error: 'Tab DATABASE tidak ditemukan' }, { status: 404 });
    }

    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();
    const headers = sheet.headerValues;

    const payload = rows.map(r => {
      const metadata: Record<string, any> = {};
      headers.forEach(h => {
        try { 
          let val = r.get(h) || '';
          if (typeof val === 'string') val = val.replace(/\0/g, '');
          metadata[h] = val; 
        } catch(e) {}
      });

      return {
        id_siswa: r.get('ID SISWA') || '',
        nama: (r.get('NAMA') || '').trim().replace(/\0/g, ''),
        metadata
      };
    }).filter(k => k.nama && k.id_siswa);

    if (payload.length === 0) {
      return NextResponse.json({ success: true, message: 'Tidak ada data untuk disinkronisasi' });
    }

    // Delete all current records safely (in chunks if needed, or all at once)
    const { error: delErr } = await supabase.from('data_induk').delete().gt('id', 0);
    if (delErr) throw delErr;

    // Insert in batches
    const chunkSize = 200;
    for (let i = 0; i < payload.length; i += chunkSize) {
      const chunk = payload.slice(i, i + chunkSize);
      const { error: insErr } = await supabase.from('data_induk').insert(chunk);
      if (insErr) throw insErr;
    }

    return NextResponse.json({ success: true, message: 'Sinkronisasi berhasil!' });
  } catch (error: any) {
    console.error('Error Sync Siswa:', error);
    return NextResponse.json({ success: false, error: 'Gagal sinkronisasi: ' + (error.message || '') }, { status: 500 });
  }
}
