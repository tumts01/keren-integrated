import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export interface SekolahItem {
  id: string;
  nama: string;
  npsn: string;
  alamat: string;
  sumber?: string;
  updated_at?: string;
}

// In-memory cache server untuk kecepatan maksimal (0ms) & nol delay
let memoryCache: { list: SekolahItem[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 60 * 1000; // 1 menit TTL (langsung di-refresh seketika jika ada update)

// Data perbaikan manual untuk sekolah yang kosong di arsip lama
const KNOWN_FIXES: Record<string, { npsn?: string; alamat?: string }> = {
  'SDI NU LAWANG': {
    npsn: '20518701',
    alamat: 'Jl Untung Suropati 12, Kec. Lawang, Kab. Malang, Prov. Jawa Timur'
  },
  'MI AL MIFTAH DENPASAR': {
    npsn: '60721575',
    alamat: 'Jl. A. Yani No. 26, Dauh Puri Kaja, Kec. Denpasar Utara, Kota Denpasar, Bali'
  },
  "MI ALMA'ARIF 03 LANGLANG": {
    npsn: '60715195',
    alamat: 'Jl. Raya Langlang No. 84, Langlang, Kec. Singosari, Kab. Malang, Prov. Jawa Timur'
  },
  'SDN V TURIREJO': {
    npsn: '20517603',
    alamat: 'Jl. Raya Turirejo No. 05, Turirejo, Kec. Lawang, Kab. Malang, Prov. Jawa Timur'
  },
  'SDN PAGENTAN 5': {
    npsn: '20554101',
    alamat: 'JL. PANGLIMA SUDIRMAN'
  }
};

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0'
};

// Algoritma Smart Aggregation (Opsi B) dari data_induk
async function extractSmartFromDataInduk(): Promise<SekolahItem[]> {
  const sekolahMap = new Map<string, SekolahItem>();
  let page = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('data_induk')
      .select('metadata')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    data.forEach((r: any) => {
      const meta = r.metadata || {};
      const rawNama = (meta['SD/MI'] || '').toString().trim();
      const rawAlamat = (meta['ALAMAT SD/MI'] || '').toString().trim();
      const rawNpsn = (meta['NPSN SD/MI'] || '').toString().trim();
      if (!rawNama) return;

      const normKey = rawNama.toUpperCase();
      if (!sekolahMap.has(normKey)) {
        sekolahMap.set(normKey, {
          id: `sch_${normKey.replace(/[^A-Z0-9]/g, '_').toLowerCase()}`,
          nama: rawNama,
          npsn: rawNpsn,
          alamat: rawAlamat,
          sumber: 'data_induk'
        });
      } else {
        const cur = sekolahMap.get(normKey)!;
        if ((!cur.npsn || cur.npsn.length < 8) && rawNpsn.length >= 8) {
          cur.npsn = rawNpsn;
        } else if (!cur.npsn && rawNpsn) {
          cur.npsn = rawNpsn;
        }
        if ((!cur.alamat || cur.alamat.length < rawAlamat.length) && rawAlamat) {
          cur.alamat = rawAlamat;
        }
      }
    });

    if (data.length < PAGE_SIZE) break;
    page++;
  }

  // Terapkan known fixes
  for (const [normKey, fix] of Object.entries(KNOWN_FIXES)) {
    const found = sekolahMap.get(normKey);
    if (found) {
      if (fix.npsn && (!found.npsn || found.npsn.length < 8)) found.npsn = fix.npsn;
      if (fix.alamat && (!found.alamat || found.alamat.length < 10)) found.alamat = fix.alamat;
    }
  }

  return Array.from(sekolahMap.values()).sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
}

// Fungsi pembaca Master Sekolah dari profil_lembaga
async function getOrInitMasterSekolah(forceFresh = false): Promise<{ rowId?: number; list: SekolahItem[] }> {
  // Cek in-memory cache jika masih valid
  if (!forceFresh && memoryCache && Date.now() - memoryCache.timestamp < CACHE_TTL_MS) {
    return { list: memoryCache.list };
  }

  const { data, error } = await supabase
    .from('profil_lembaga')
    .select('id, metadata')
    .eq('jenis', 'MASTER_SEKOLAH')
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (data && data.metadata && Array.isArray(data.metadata.sekolah) && data.metadata.sekolah.length > 0) {
    const list = data.metadata.sekolah;
    memoryCache = { list, timestamp: Date.now() };
    return { rowId: data.id, list };
  }

  // Inisialisasi dari Smart Aggregator jika belum ada
  const initialList = await extractSmartFromDataInduk();
  const newMeta = {
    sekolah: initialList,
    total: initialList.length,
    updated_at: new Date().toISOString()
  };

  if (data) {
    await supabase.from('profil_lembaga').update({ metadata: newMeta }).eq('id', data.id);
    memoryCache = { list: initialList, timestamp: Date.now() };
    return { rowId: data.id, list: initialList };
  } else {
    const { data: inserted, error: insErr } = await supabase.from('profil_lembaga').insert([{
      jenis: 'MASTER_SEKOLAH',
      isi: 'MASTER_SEKOLAH',
      metadata: newMeta
    }]).select('id').single();

    if (insErr) {
      console.warn('Gagal insert MASTER_SEKOLAH:', insErr);
      memoryCache = { list: initialList, timestamp: Date.now() };
      return { list: initialList };
    }
    memoryCache = { list: initialList, timestamp: Date.now() };
    return { rowId: inserted?.id, list: initialList };
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const summary = url.searchParams.get('summary');
    const refresh = url.searchParams.get('refresh');

    // Force fresh jika admin atau refresh diminta
    const { list } = await getOrInitMasterSekolah(refresh === '1');

    if (summary === 'true') {
      const total = list.length;
      const completeNpsn = list.filter(s => s.npsn && s.npsn.trim().length >= 8).length;
      const missingNpsn = total - completeNpsn;
      const completeAlamat = list.filter(s => s.alamat && s.alamat.trim().length >= 5).length;
      const missingAlamat = total - completeAlamat;

      return NextResponse.json({
        success: true,
        summary: {
          total,
          completeNpsn,
          missingNpsn,
          completeAlamat,
          missingAlamat
        }
      }, {
        headers: NO_CACHE_HEADERS
      });
    }

    return NextResponse.json({
      success: true,
      data: list,
      total: list.length
    }, {
      headers: NO_CACHE_HEADERS
    });
  } catch (error: any) {
    console.error('API Sekolah error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, item, id } = body;

    // Selalu ambil fresh data dari DB untuk operasi write
    const { rowId, list } = await getOrInitMasterSekolah(true);
    let updatedList = [...list];

    if (action === 'create' || action === 'add') {
      if (!item || !item.nama || !item.nama.trim()) {
        return NextResponse.json({ success: false, error: 'Nama sekolah tidak boleh kosong' }, { status: 400 });
      }

      const namaTrim = item.nama.trim();
      const existing = updatedList.find(s => s.nama.toLowerCase() === namaTrim.toLowerCase());
      if (existing) {
        return NextResponse.json({ success: false, error: `Sekolah '${namaTrim}' sudah ada dalam master referensi` }, { status: 400 });
      }

      const newItem: SekolahItem = {
        id: item.id || `sch_${Date.now()}`,
        nama: namaTrim,
        npsn: (item.npsn || '').toString().trim(),
        alamat: (item.alamat || '').toString().trim(),
        sumber: 'manual',
        updated_at: new Date().toISOString()
      };
      updatedList.push(newItem);
      updatedList.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
    } 
    else if (action === 'update') {
      if (!item || (!item.id && !id)) {
        return NextResponse.json({ success: false, error: 'Data sekolah atau ID tidak valid' }, { status: 400 });
      }
      const targetId = item.id || id;
      const targetIndex = updatedList.findIndex(s => s.id === targetId || s.nama.toLowerCase() === (item.nama || '').trim().toLowerCase());

      if (targetIndex === -1) {
        return NextResponse.json({ success: false, error: 'Data sekolah tidak ditemukan' }, { status: 404 });
      }

      updatedList[targetIndex] = {
        ...updatedList[targetIndex],
        nama: (item.nama || updatedList[targetIndex].nama).toString().trim(),
        npsn: (item.npsn !== undefined ? item.npsn : updatedList[targetIndex].npsn).toString().trim(),
        alamat: (item.alamat !== undefined ? item.alamat : updatedList[targetIndex].alamat).toString().trim(),
        sumber: 'manual_terverifikasi',
        updated_at: new Date().toISOString()
      };
      updatedList.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
    } 
    else if (action === 'delete') {
      const targetId = id || item?.id;
      const targetNama = (item?.nama || '').trim().toLowerCase();
      if (!targetId && !targetNama) {
        return NextResponse.json({ success: false, error: 'Target sekolah yang akan dihapus tidak ditentukan' }, { status: 400 });
      }

      const initialLen = updatedList.length;
      updatedList = updatedList.filter(s => {
        if (targetId && s.id === targetId) return false;
        if (targetNama && s.nama.toLowerCase() === targetNama) return false;
        return true;
      });

      if (updatedList.length === initialLen) {
        return NextResponse.json({ success: false, error: 'Sekolah tidak ditemukan untuk dihapus' }, { status: 404 });
      }
    } 
    else if (action === 'resync') {
      const rawExtracted = await extractSmartFromDataInduk();
      const manualEditsMap = new Map<string, SekolahItem>();
      updatedList.forEach(s => {
        if (s.sumber?.startsWith('manual')) {
          manualEditsMap.set(s.nama.toUpperCase(), s);
        }
      });

      const mergedMap = new Map<string, SekolahItem>();
      rawExtracted.forEach(s => mergedMap.set(s.nama.toUpperCase(), s));
      manualEditsMap.forEach((val, key) => {
        mergedMap.set(key, val);
      });

      updatedList = Array.from(mergedMap.values()).sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
    } 
    else {
      return NextResponse.json({ success: false, error: 'Aksi tidak dikenali' }, { status: 400 });
    }

    // Update in-memory cache seketika (0ms delay untuk request berikutnya)
    memoryCache = { list: updatedList, timestamp: Date.now() };

    // Simpan ke profil_lembaga Supabase
    const newMeta = {
      sekolah: updatedList,
      total: updatedList.length,
      updated_at: new Date().toISOString()
    };

    if (rowId) {
      const { error: updErr } = await supabase
        .from('profil_lembaga')
        .update({ metadata: newMeta })
        .eq('id', rowId);
      if (updErr) throw updErr;
    } else {
      const { error: insErr } = await supabase
        .from('profil_lembaga')
        .insert([{
          jenis: 'MASTER_SEKOLAH',
          isi: 'MASTER_SEKOLAH',
          metadata: newMeta
        }]);
      if (insErr) throw insErr;
    }

    return NextResponse.json({
      success: true,
      message: 'Data master sekolah berhasil diperbarui',
      total: updatedList.length,
      data: updatedList
    }, {
      headers: NO_CACHE_HEADERS
    });
  } catch (error: any) {
    console.error('API Sekolah POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
