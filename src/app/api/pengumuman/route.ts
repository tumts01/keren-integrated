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
    const pengirim = (fd.get('pengirim') as string) || 'Admin';
    const target = (fd.get('target') as string) || 'semua';
    const phonesStr = fd.get('phones') as string;
    const phones = phonesStr ? JSON.parse(phonesStr) : [];
    const viaAppOnly = true; 
    const file = fd.get('file') as File | null;
    const kirimKePortal = fd.get('kirimKePortal') === 'true' || target === 'siswa' || target === 'portal_siswa';

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

    let count = 0;
    if (target !== 'siswa' && target !== 'portal_siswa') {
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

      count = selectedPhones.length;
    }

    try {
      const dateWIB = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      const tanggal = dateWIB.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const jam = dateWIB.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.');

      let targetLabel = 'Aplikasi: Semua GTK';
      if (target === 'siswa' || target === 'portal_siswa') {
        targetLabel = 'Portal Siswa & Wali';
      } else if (target === 'semua_all') {
        targetLabel = 'Semua (GTK & Siswa)';
      } else if (target === 'pimpinan') {
        targetLabel = 'Aplikasi: Pimpinan';
      } else if (target === 'custom') {
        targetLabel = `${count} Guru Pilihan`;
      }

      const isSiswaTarget = target === 'siswa' || target === 'portal_siswa' || target === 'semua_all' || kirimKePortal;

      const metadata = {
        'Tanggal': tanggal,
        'Jam': jam,
        'Pengirim': pengirim,
        'Pesan': pesan,
        'Target': targetLabel,
        'kirimKePortal': isSiswaTarget,
        'targetAudience': isSiswaTarget ? (target === 'semua_all' ? 'all' : 'siswa') : 'gtk',
        'Lampiran': lampiranUrl
      };

      await supabase.from('data_pengumuman').insert([{ tanggal, metadata }]);
    } catch (e: any) {
      console.error('Failed to log to Supabase PENGUMUMAN', e);
    }

    let successMsg = 'Pengumuman berhasil disimpan ke aplikasi';
    if (target === 'siswa' || target === 'portal_siswa') {
      successMsg = 'Pengumuman berhasil diposting ke Portal Siswa & Wali Murid';
    } else if (target === 'semua_all') {
      successMsg = 'Pengumuman berhasil diposting ke GTK dan Portal Siswa';
    }

    return NextResponse.json({ 
      success: true, 
      message: successMsg
    });
  } catch (error: any) {
    console.error('Pengumuman Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, kirimKePortal } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID pengumuman diperlukan' }, { status: 400 });
    }

    const { data: row, error: fetchErr } = await supabase
      .from('data_pengumuman')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !row) {
      return NextResponse.json({ success: false, error: 'Pengumuman tidak ditemukan' }, { status: 404 });
    }

    const meta = row.metadata || {};
    const newPortalState = Boolean(kirimKePortal);
    meta.kirimKePortal = newPortalState;
    if (newPortalState) {
      if (!meta.Target || !meta.Target.toLowerCase().includes('siswa')) {
        meta.Target = meta.Target ? `${meta.Target} + Portal Siswa` : 'Portal Siswa & Wali';
      }
      meta.targetAudience = meta.targetAudience === 'gtk' ? 'all' : 'siswa';
    } else {
      meta.targetAudience = 'gtk';
      meta.Target = (meta.Target || '').replace(/\s*\+\s*Portal Siswa/i, '').replace(/Portal Siswa & Wali/i, 'Aplikasi: Semua GTK').trim();
    }

    const { error: updateErr } = await supabase
      .from('data_pengumuman')
      .update({ metadata: meta })
      .eq('id', id);

    if (updateErr) throw updateErr;

    return NextResponse.json({ 
      success: true, 
      kirimKePortal: newPortalState, 
      target: meta.Target 
    });
  } catch (error: any) {
    console.error('PATCH Pengumuman error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const forPortal = searchParams.get('portal') === 'true' || searchParams.get('target') === 'siswa';

    const { data: rows, error } = await supabase.from('data_pengumuman').select('*').order('id', { ascending: false }).limit(limit);
    if (error) throw error;

    let filteredRows = rows || [];

    if (forPortal) {
      // Filter ONLY announcements meant for portal / students / parents
      filteredRows = filteredRows.filter((r: any) => {
        const meta = r.metadata || {};
        if (meta.kirimKePortal === true) return true;
        if (meta.targetAudience === 'siswa' || meta.targetAudience === 'all') return true;
        const targetStr = (meta['Target'] || '').toLowerCase();
        if (targetStr.includes('siswa') || targetStr.includes('wali') || targetStr.includes('murid')) return true;
        return false;
      });
    }

    const data = filteredRows.map((r: any) => {
      const meta = r.metadata || {};
      const isPortalAnnounce = meta.kirimKePortal === true || (meta.Target || '').toLowerCase().includes('siswa');

      return {
        id: r.id,
        tanggal: meta['Tanggal'] || r.tanggal || '',
        jam: meta['Jam'] || '',
        // For portal users: Author is ALWAYS "Admin", never personal teacher names
        pengirim: forPortal ? 'Admin' : (meta['Pengirim'] || 'Admin'),
        pesan: meta['Pesan'] || '',
        isi: meta['Pesan'] || '',
        target: meta['Target'] || 'Semua GTK',
        kirimKePortal: isPortalAnnounce,
        lampiran: meta['Lampiran'] || ''
      };
    });

    return NextResponse.json({ success: true, data, total: data.length }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  } catch (error: any) {
    console.error('GET Pengumuman error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
