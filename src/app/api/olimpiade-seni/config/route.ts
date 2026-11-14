import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type TahapPublikasi = 'seleksi' | 'final' | 'seni';

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

function isSeniCabang(cabang: string): boolean {
  const l = (cabang || '').toLowerCase();
  return (
    l.includes('singer') ||
    l.includes('solo') ||
    l.includes('banjari') ||
    l.includes('sandi') ||
    l.includes('morse') ||
    l.includes('sms') ||
    l.includes('tahfidz') ||
    l.includes('kaligrafi')
  );
}

function parseTahap(raw: string | null | undefined): TahapPublikasi | null {
  if (raw === 'seleksi' || raw === 'final' || raw === 'seni') return raw;
  return null;
}

async function fetchAllCabangsByTahap(tahap: TahapPublikasi): Promise<string[]> {
  const { data: allData } = await supabase
    .from('data_olimpiade_seni')
    .select('metadata')
    .in('jenis_pendaftaran', ['individu', 'peserta_kolektif']);

  const cabangs = new Set<string>();
  (allData || []).forEach(d => {
    const c = d.metadata?.LOMBA_DIPILIH || d.metadata?.['LOMBA YANG DIPILIH'] || '';
    const norm = normalizeCabang(c);
    if (!norm) return;
    if (tahap === 'seni' && isSeniCabang(norm)) {
      cabangs.add(norm);
    } else if ((tahap === 'seleksi' || tahap === 'final') && !isSeniCabang(norm)) {
      cabangs.add(norm);
    }
  });
  return Array.from(cabangs).sort();
}

function resolvePublishedByTahap(meta: any, legacyGlobalPublished: boolean, fallbackAllCabangs?: string[]) {
  const legacyList: string[] = Array.isArray(meta.published_cabang)
    ? Array.from(new Set(meta.published_cabang.map((c: string) => normalizeCabang(c)).filter(Boolean)))
    : legacyGlobalPublished && Array.isArray(fallbackAllCabangs)
      ? fallbackAllCabangs
      : [];

  const seleksi: string[] = Array.isArray(meta.published_cabang_seleksi)
    ? Array.from(new Set(meta.published_cabang_seleksi.map((c: string) => normalizeCabang(c)).filter(Boolean)))
    : legacyList.filter(c => !isSeniCabang(c));

  const finalList: string[] = Array.isArray(meta.published_cabang_final)
    ? Array.from(new Set(meta.published_cabang_final.map((c: string) => normalizeCabang(c)).filter(Boolean)))
    : [];

  const seni: string[] = Array.isArray(meta.published_cabang_seni)
    ? Array.from(new Set(meta.published_cabang_seni.map((c: string) => normalizeCabang(c)).filter(Boolean)))
    : legacyList.filter(c => isSeniCabang(c));

  return { seleksi, final: finalList, seni };
}

// GET: Ambil status publikasi hasil terpisah per tahap (seleksi, final, seni)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedTahap = parseTahap(searchParams.get('tahap'));

    // 1. Ambil config dari profil_lembaga
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
    const hasNoLegacyCabang = !Array.isArray(meta.published_cabang) || meta.published_cabang.length === 0;
    const needsFallbackFetch =
      !Array.isArray(meta.published_cabang_seleksi) &&
      hasNoLegacyCabang &&
      Boolean(olimpiadeConfig?.hasil_published);

    let fallbackAll: string[] | undefined;
    if (needsFallbackFetch) {
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
      fallbackAll = Array.from(cabangs).sort();
    }

    const byTahap = resolvePublishedByTahap(meta, Boolean(olimpiadeConfig?.hasil_published), fallbackAll);
    const unionCabang = Array.from(new Set([...byTahap.seleksi, ...byTahap.final, ...byTahap.seni]));
    const activeCabang = requestedTahap ? byTahap[requestedTahap] : unionCabang;

    const legacyLink = meta.link_sk_pengumuman || '';
    const linkByTahap = {
      seleksi: meta.link_sk_pengumuman_seleksi ?? legacyLink,
      final: meta.link_sk_pengumuman_final ?? '',
      seni: meta.link_sk_pengumuman_seni ?? legacyLink,
    };

    const legacyPublishedAt = meta.published_at || olimpiadeConfig?.published_at || null;
    const publishedAtByTahap = {
      seleksi: meta.published_at_seleksi !== undefined ? meta.published_at_seleksi : (byTahap.seleksi.length > 0 ? legacyPublishedAt : null),
      final: meta.published_at_final !== undefined ? meta.published_at_final : null,
      seni: meta.published_at_seni !== undefined ? meta.published_at_seni : (byTahap.seni.length > 0 ? legacyPublishedAt : null),
    };

    return NextResponse.json({
      success: true,
      hasil_published: activeCabang.length > 0,
      hasil_published_seleksi: byTahap.seleksi.length > 0,
      hasil_published_final: byTahap.final.length > 0,
      hasil_published_seni: byTahap.seni.length > 0,
      published_cabang: activeCabang,
      published_cabang_seleksi: byTahap.seleksi,
      published_cabang_final: byTahap.final,
      published_cabang_seni: byTahap.seni,
      published_at: requestedTahap ? publishedAtByTahap[requestedTahap] : legacyPublishedAt,
      published_at_by_tahap: publishedAtByTahap,
      link_sk_pengumuman: requestedTahap ? linkByTahap[requestedTahap] : legacyLink,
      link_sk_pengumuman_by_tahap: linkByTahap,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Update publikasi hasil per tahap (seleksi, final, seni) atau per cabang lomba
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { publish, published_cabang, toggle_cabang, link_sk_pengumuman } = body;
    const targetTahap: TahapPublikasi = parseTahap(body.tahap) || 'seleksi';

    const { data: existing } = await supabase
      .from('profil_lembaga')
      .select('id, metadata')
      .eq('jenis', 'CONFIG_OLIMPIADE')
      .limit(1)
      .maybeSingle();

    const currentMeta = existing?.metadata || {};
    const currentByTahap = resolvePublishedByTahap(currentMeta, false);
    const nextByTahap = {
      seleksi: [...currentByTahap.seleksi],
      final: [...currentByTahap.final],
      seni: [...currentByTahap.seni],
    };

    if (Array.isArray(published_cabang)) {
      nextByTahap[targetTahap] = Array.from(
        new Set(published_cabang.map((c: string) => normalizeCabang(c)))
      ).filter(Boolean);
    } else if (toggle_cabang) {
      const target = normalizeCabang(toggle_cabang);
      if (nextByTahap[targetTahap].includes(target)) {
        nextByTahap[targetTahap] = nextByTahap[targetTahap].filter(c => c !== target);
      } else {
        nextByTahap[targetTahap].push(target);
      }
    } else if (typeof publish === 'boolean') {
      if (!publish) {
        nextByTahap[targetTahap] = [];
      } else {
        nextByTahap[targetTahap] = await fetchAllCabangsByTahap(targetTahap);
      }
    }

    const nowIso = new Date().toISOString();
    const legacyPublishedAt = currentMeta.published_at || null;
    const nextPublishedAtByTahap = {
      seleksi: currentMeta.published_at_seleksi !== undefined ? currentMeta.published_at_seleksi : (currentByTahap.seleksi.length > 0 ? legacyPublishedAt : null),
      final: currentMeta.published_at_final !== undefined ? currentMeta.published_at_final : null,
      seni: currentMeta.published_at_seni !== undefined ? currentMeta.published_at_seni : (currentByTahap.seni.length > 0 ? legacyPublishedAt : null),
    };
    nextPublishedAtByTahap[targetTahap] = nextByTahap[targetTahap].length > 0
      ? (nextPublishedAtByTahap[targetTahap] || nowIso)
      : null;

    const legacyLink = currentMeta.link_sk_pengumuman || '';
    const nextLinkByTahap = {
      seleksi: currentMeta.link_sk_pengumuman_seleksi ?? legacyLink,
      final: currentMeta.link_sk_pengumuman_final ?? '',
      seni: currentMeta.link_sk_pengumuman_seni ?? legacyLink,
    };
    if (link_sk_pengumuman !== undefined) {
      nextLinkByTahap[targetTahap] = String(link_sk_pengumuman || '').trim();
    }

    const unionCabang = Array.from(
      new Set([...nextByTahap.seleksi, ...nextByTahap.final, ...nextByTahap.seni])
    );
    const isAnyPublished = unionCabang.length > 0;
    const activeCabang = nextByTahap[targetTahap];

    const newMeta = {
      ...currentMeta,
      published_cabang: unionCabang,
      published_cabang_seleksi: nextByTahap.seleksi,
      published_cabang_final: nextByTahap.final,
      published_cabang_seni: nextByTahap.seni,
      published_at: isAnyPublished ? (currentMeta.published_at || nowIso) : null,
      published_at_seleksi: nextPublishedAtByTahap.seleksi,
      published_at_final: nextPublishedAtByTahap.final,
      published_at_seni: nextPublishedAtByTahap.seni,
      link_sk_pengumuman: nextLinkByTahap.seleksi || nextLinkByTahap.final || nextLinkByTahap.seni || legacyLink,
      link_sk_pengumuman_seleksi: nextLinkByTahap.seleksi,
      link_sk_pengumuman_final: nextLinkByTahap.final,
      link_sk_pengumuman_seni: nextLinkByTahap.seni,
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
          hasil_published: isAnyPublished,
          published_at: newMeta.published_at,
          updated_at: nowIso,
        })
        .eq('id', exOlimpiadeConfig.id);
    } else {
      await supabase
        .from('olimpiade_config')
        .insert([{
          hasil_published: isAnyPublished,
          published_at: newMeta.published_at,
          updated_at: nowIso,
        }]);
    }

    return NextResponse.json({
      success: true,
      tahap: targetTahap,
      hasil_published: activeCabang.length > 0,
      hasil_published_seleksi: nextByTahap.seleksi.length > 0,
      hasil_published_final: nextByTahap.final.length > 0,
      hasil_published_seni: nextByTahap.seni.length > 0,
      published_cabang: activeCabang,
      published_cabang_seleksi: nextByTahap.seleksi,
      published_cabang_final: nextByTahap.final,
      published_cabang_seni: nextByTahap.seni,
      published_at: nextPublishedAtByTahap[targetTahap],
      published_at_by_tahap: nextPublishedAtByTahap,
      link_sk_pengumuman: nextLinkByTahap[targetTahap],
      link_sk_pengumuman_by_tahap: nextLinkByTahap,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
