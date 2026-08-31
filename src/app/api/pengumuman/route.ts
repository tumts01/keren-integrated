import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { uploadFileToDrive } from '@/lib/google-drive';

function formatPhone(rawHp: string) {
  let hp = rawHp.replace(/\D/g, ''); 
  if (hp.startsWith('0')) {
    hp = '62' + hp.substring(1);
  }
  return hp;
}

export async function POST(request: Request) {
  try {
    const fd = await request.formData();
    const pesan = (fd.get('pesan') as string) || '';
    const pengirim = fd.get('pengirim') as string;
    const target = fd.get('target') as string;
    const phonesStr = fd.get('phones') as string;
    const phones = phonesStr ? JSON.parse(phonesStr) : [];
    const viaAppOnly = true; 
    const file = fd.get('file') as File | null;

    if (!pesan && !file) {
      return NextResponse.json({ success: false, error: 'Pesan atau lampiran tidak boleh kosong' }, { status: 400 });
    }
    
    let lampiranUrl = '';
    if (file && file.size > 0) {
      const folderId = process.env.GOOGLE_DRIVE_PERSURATAN_FOLDER_ID || '';
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      try {
        const driveRes = await uploadFileToDrive(buffer, file.name, file.type, folderId);
        lampiranUrl = driveRes.webViewLink || '';
      } catch (e) {
        console.error('Upload to Drive failed', e);
      }
    }

    const { data: rowsGtk } = await supabase.from('data_guru').select('*');
    
    const mapGtk = new Map<string, string>();
    (rowsGtk || []).forEach((r: any) => {
      const isAktif = (r.metadata?.['STATUS'] || r.metadata?.['Status'] || '').toLowerCase().trim() === 'aktif';
      if (isAktif) {
        mapGtk.set((r.nama || '').trim(), (r.metadata?.['No WA'] || r.metadata?.['Whatsapp'] || '').trim());
      }
    });

    let selectedPhones: string[] = [];
    if (target === 'pimpinan') {
      const pimpinan = (rowsGtk || []).filter((r: any) => {
        const status = (r.metadata?.['STATUS'] || r.metadata?.['Status'] || '').toLowerCase().trim();
        const tupoksi = (r.metadata?.['Tupoksi Pokok'] || '').toLowerCase();
        return status === 'aktif' && (tupoksi.includes('kepala') || tupoksi.includes('waka'));
      });
      selectedPhones = pimpinan.map((r: any) => mapGtk.get(r.nama?.trim())).filter(Boolean) as string[];
    } else if (target === 'custom') {
      selectedPhones = phones.map((nama: string) => mapGtk.get(nama?.trim())).filter(Boolean);
    } else {
      selectedPhones = Array.from(mapGtk.values()).filter(Boolean);
    }

    const count = selectedPhones.length;

    try {
      const dateWIB = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      const tanggal = dateWIB.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const jam = dateWIB.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const targetLabel = viaAppOnly ? (target === 'pimpinan' ? 'Aplikasi: Pimpinan' : 'Aplikasi: Semua GTK') : (target === 'pimpinan' ? 'Pimpinan' : target === 'custom' ? `${count} Guru Pilihan` : 'Semua GTK');

      const metadata = {
        'Tanggal': tanggal,
        'Jam': jam,
        'Pengirim': pengirim,
        'Pesan': pesan,
        'Target': targetLabel,
        'Lampiran': lampiranUrl
      };

      await supabase.from('data_pengumuman').insert([{ tanggal, metadata }]);
    } catch (e: any) {
      console.error('Failed to log to Supabase PENGUMUMAN', e);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Pengumuman ${viaAppOnly ? 'disimpan ke aplikasi' : 'dikirim via WA dan aplikasi'} (${count} target)`
    });
  } catch (error: any) {
    console.error('Pengumuman Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const { data: rows, error } = await supabase.from('data_pengumuman').select('*').order('id', { ascending: false }).limit(limit);
    if (error) throw error;

    const data = (rows || []).map((r: any) => ({
      tanggal: r.metadata?.['Tanggal'] || r.tanggal || '',
      jam: r.metadata?.['Jam'] || '',
      pengirim: r.metadata?.['Pengirim'] || '',
      pesan: r.metadata?.['Pesan'] || '',
      target: r.metadata?.['Target'] || 'Semua GTK',
      lampiran: r.metadata?.['Lampiran'] || ''
    }));

    return NextResponse.json({ success: true, data, total: data.length }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' }
    });
  } catch (error: any) {
    console.error('GET Pengumuman error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
