import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Helper normalisasi nama cabang lomba
function normalizeCabang(raw: string): string {
  const l = (raw || '').toLowerCase();
  if (l.includes('matematika')) return 'Matematika';
  if (l.includes('ipas') || l.includes('ipa')) return 'IPAS';
  if (l.includes('pai') || l.includes('agama')) return 'PAI';
  if (l.includes('inggris') || l.includes('english')) return 'Bahasa Inggris';
  if (l.includes('arab')) return 'Bahasa Arab';
  if (l.includes('singer') || l.includes('solo')) return 'Singer Solo';
  if (l.includes('banjari')) return 'Al Banjari';
  if (l.includes('sandi') || l.includes('morse') || l.includes('sms')) return 'SMS';
  return raw.trim();
}

// GET: Ambil status publikasi hasil dan daftar cabang lomba yang dipublikasikan
export async function GET() {
  try {
    // 1. Ambil config dari profil_lembaga (menyimpan array cabang di metadata.published_cabang)
    const { data: configRow } = await supabase
      .from('profil_lembaga')
      .select('metadata')
      .eq('jenis', 'CONFIG_OLIMPIADE')
      .limit(1)
      .maybeSingle();

    // 2. Ambil dari olimpiade_config untuk fallback/backward compatibility
    const { data: olimpiadeConfig } = await supabase
      .from('olimpiade_config')
      .select('hasil_published, published_at')
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    const meta = configRow?.metadata || {};
    let publishedCabang: string[] = Array.isArray(meta.published_cabang) ? meta.published_cabang : [];

    // Jika di profil_lembaga belum ada setting cabang tapi di olimpiade_config hasil_published = true,
    // ambil semua cabang lomba unik sebagai default terpublikasi
    if (publishedCabang.length === 0 && olimpiadeConfig?.hasil_published) {
      const { data: allData } = await supabase
        .from('data_olimpiade_seni')
        .select('metadata')
        .in('jenis_pendaftaran', ['individu', 'peserta_kolektif']);
      
      const cabangs = new Set<string>();
      (allData || []).forEach(d => {
        const c = d.metadata?.LOMBA_DIPILIH || d.metadata?.['LOMBA YANG DIPILIH'] || '';
        const norm = normalizeCabang(c);
        if (norm) cabangs.add(norm);
      });
      publishedCabang = Array.from(cabangs).sort();
    }

    const hasilPublished = publishedCabang.length > 0;
    const publishedAt = meta.published_at || olimpiadeConfig?.published_at || null;

    return NextResponse.json({
      success: true,
      hasil_published: hasilPublished,
      published_cabang: publishedCabang,
      published_at: publishedAt,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Update publikasi hasil (bisa custom per cabang lomba atau global)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { publish, published_cabang, toggle_cabang } = body;

    const { data: existing } = await supabase
      .from('profil_lembaga')
      .select('id, metadata')
      .eq('jenis', 'CONFIG_OLIMPIADE')
      .limit(1)
      .maybeSingle();

    const currentMeta = existing?.metadata || {};
    let nextPublishedCabang: string[] = Array.isArray(currentMeta.published_cabang)
      ? [...currentMeta.published_cabang]
      : [];

    if (Array.isArray(published_cabang)) {
      // Set langsung daftar cabang yang dipilih
      nextPublishedCabang = Array.from(new Set(published_cabang.map(c => normalizeCabang(c)))).filter(Boolean);
    } else if (toggle_cabang) {
      // Toggle satu cabang tertentu
      const target = normalizeCabang(toggle_cabang);
      if (nextPublishedCabang.includes(target)) {
        nextPublishedCabang = nextPublishedCabang.filter(c => c !== target);
      } else {
        nextPublishedCabang.push(target);
      }
    } else if (typeof publish === 'boolean') {
      if (!publish) {
        // Batalkan semua publikasi
        nextPublishedCabang = [];
      } else {
        // Publikasikan semua cabang yang ada
        const { data: allData } = await supabase
          .from('data_olimpiade_seni')
          .select('metadata')
          .in('jenis_pendaftaran', ['individu', 'peserta_kolektif']);
        
        const cabangs = new Set<string>();
        (allData || []).forEach(d => {
          const c = d.metadata?.LOMBA_DIPILIH || d.metadata?.['LOMBA YANG DIPILIH'] || '';
          const norm = normalizeCabang(c);
          if (norm) cabangs.add(norm);
        });
        nextPublishedCabang = Array.from(cabangs).sort();
      }
    }

    const isPublished = nextPublishedCabang.length > 0;
    const nowIso = new Date().toISOString();
    const publishedAt = isPublished ? (currentMeta.published_at || nowIso) : null;

    const newMeta = {
      ...currentMeta,
      published_cabang: nextPublishedCabang,
      published_at: publishedAt,
    };

    if (existing) {
      const { error } = await supabase
        .from('profil_lembaga')
        .update({ metadata: newMeta })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('profil_lembaga')
        .insert([{ jenis: 'CONFIG_OLIMPIADE', isi: 'CONFIG', metadata: newMeta }]);
      if (error) throw error;
    }

    // Sinkronkan juga ke tabel olimpiade_config
    const { data: exOlimpiadeConfig } = await supabase
      .from('olimpiade_config')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (exOlimpiadeConfig) {
      await supabase
        .from('olimpiade_config')
        .update({
          hasil_published: isPublished,
          published_at: publishedAt,
          updated_at: nowIso,
        })
        .eq('id', exOlimpiadeConfig.id);
    } else {
      await supabase
        .from('olimpiade_config')
        .insert([{
          hasil_published: isPublished,
          published_at: publishedAt,
          updated_at: nowIso,
        }]);
    }

    return NextResponse.json({
      success: true,
      hasil_published: isPublished,
      published_cabang: nextPublishedCabang,
      published_at: publishedAt,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
