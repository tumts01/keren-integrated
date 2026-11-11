import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { unstable_cache, revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

export interface SekolahItem {
  id: string;
  nama: string;
  npsn: string;
  alamat: string;
  sumber?: string;
  updated_at?: string;
}

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
  }
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
        // Prioritaskan NPSN valid (panjang minimal 8 angka)
        if ((!cur.npsn || cur.npsn.length < 8) && rawNpsn.length >= 8) {
          cur.npsn = rawNpsn;
        } else if (!cur.npsn && rawNpsn) {
          cur.npsn = rawNpsn;
        }
        // Prioritaskan alamat yang lebih panjang & informatif
        if ((!cur.alamat || cur.alamat.length < rawAlamat.length) && rawAlamat) {
          cur.alamat = rawAlamat;
        }
      }
    });

    if (data.length < PAGE_SIZE) break;
    page++;
  }

  // Terapkan known fixes untuk data yang memang kosong di arsip
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
async function getOrInitMasterSekolah(): Promise<{ rowId?: number; list: SekolahItem[] }> {
  const { data, error } = await supabase
    .from('profil_lembaga')
    .select('id, metadata')
    .eq('jenis', 'MASTER_SEKOLAH')
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (data && data.metadata && Array.isArray(data.metadata.sekolah) && data.metadata.sekolah.length > 0) {
    return { rowId: data.id, list: data.metadata.sekolah };
  }

  // Jika belum ada di profil_lembaga, inisialisasi dari Smart Aggregator (Opsi B)
  const initialList = await extractSmartFromDataInduk();
  const newMeta = {
    sekolah: initialList,
    total: initialList.length,
    updated_at: new Date().toISOString()
  };

  if (data) {
    await supabase.from('profil_lembaga').update({ metadata: newMeta }).eq('id', data.id);
    return { rowId: data.id, list: initialList };
  } else {
    const { data: inserted, error: insErr } = await supabase.from('profil_lembaga').insert([{
      jenis: 'MASTER_SEKOLAH',
      isi: 'MASTER_SEKOLAH',
      metadata: newMeta
    }]).select('id').single();

    if (insErr) {
      console.warn('Gagal insert MASTER_SEKOLAH ke profil_lembaga:', insErr);
      return { list: initialList };
    }
    return { rowId: inserted?.id, list: initialList };
  }
}

// Cached fetching untuk performa tinggi form publik
const getCachedSekolah = unstable_cache(
  async () => {
    const { list } = await getOrInitMasterSekolah();
    return list;
  },
  ['spmb_sekolah'],
  { revalidate: 86400, tags: ['spmb_sekolah'] }
);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const summary = url.searchParams.get('summary');
    const refresh = url.searchParams.get('refresh');

    let list: SekolahItem[];
    if (refresh === '1') {
      const res = await getOrInitMasterSekolah();
      list = res.list;
    } else {
      list = await getCachedSekolah();
    }

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
      });
    }

    return NextResponse.json({
      success: true,
      data: list,
      total: list.length
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' }
    });
  } catch (error: any) {
    console.error('API Sekolah error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, item, id, filter } = body;

    const { rowId, list } = await getOrInitMasterSekolah();
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
      // Sinkronisasi cerdas dari data_induk, sambil mempertahankan data yang sudah pernah diedit manual
      const rawExtracted = await extractSmartFromDataInduk();
      const manualEditsMap = new Map<string, SekolahItem>();
      updatedList.forEach(s => {
        if (s.sumber?.startsWith('manual')) {
          manualEditsMap.set(s.nama.toUpperCase(), s);
        }
      });

      // Gabungkan
      const mergedMap = new Map<string, SekolahItem>();
      rawExtracted.forEach(s => mergedMap.set(s.nama.toUpperCase(), s));
      // Terapkan kembali editan manual admin
      manualEditsMap.forEach((val, key) => {
        mergedMap.set(key, val);
      });

      updatedList = Array.from(mergedMap.values()).sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
    } 
    else {
      return NextResponse.json({ success: false, error: 'Aksi tidak dikenali' }, { status: 400 });
    }

    // Simpan ke profil_lembaga
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

    // Revalidasi cache
    try {
      revalidateTag('spmb_sekolah', {} as any);
    } catch (e) {
      // Ignore cache tag warning in dev
    }

    return NextResponse.json({
      success: true,
      message: 'Data master sekolah berhasil diperbarui',
      total: updatedList.length,
      data: updatedList
    });
  } catch (error: any) {
    console.error('API Sekolah POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
