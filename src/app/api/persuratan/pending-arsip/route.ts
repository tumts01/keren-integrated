import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function normalizePersonName(raw: string): string {
  return String(raw || '')
    .toLowerCase()
    .split(',')[0]
    .replace(/\b(h|hj|drs|dra|dr|ust|usth|ir|prof)\.?\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSamePerson(pjName: string, userName: string): boolean {
  const a = String(pjName || '').trim().toLowerCase();
  const b = String(userName || '').trim().toLowerCase();
  if (!a || !b) return false;
  if (a === b) return true;

  const normA = normalizePersonName(pjName);
  const normB = normalizePersonName(userName);
  return normA.length >= 3 && normA === normB;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nama = (searchParams.get('nama') || '').trim();

    if (!nama) {
      return NextResponse.json({ success: true, totalPending: 0, items: [] });
    }

    const { data, error } = await supabase
      .from('data_surat_keluar')
      .select('id, metadata')
      .order('id', { ascending: false })
      .limit(5000);

    if (error) throw error;

    const pendingItems = (data || [])
      .map((row: any) => {
        const meta = row.metadata || {};
        const noSurat = String(meta['NO. SURAT'] || '').trim();
        const namaSurat = String(meta['NAMA SURAT'] || '').trim();
        const tanggal = String(meta['TANGGAL'] || '').trim();
        const pj = String(meta['PJ'] || '').trim();
        const topik = String(meta['TOPIK'] || '').trim();
        const rawScan = String(meta['FILE/SCAN SURAT'] || '').trim();
        const hasValidArchive =
          rawScan !== '' &&
          !rawScan.toLowerCase().includes('klik disini') &&
          rawScan.includes('http');

        return {
          id: row.id,
          noSurat,
          namaSurat,
          tanggal,
          pj,
          topik,
          hasValidArchive,
        };
      })
      .filter(
        (item) =>
          (item.noSurat || item.namaSurat) &&
          !item.hasValidArchive &&
          isSamePerson(item.pj, nama)
      )
      .map(({ hasValidArchive: _ignored, ...rest }) => rest);

    return NextResponse.json(
      {
        success: true,
        totalPending: pendingItems.length,
        items: pendingItems.slice(0, 20),
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error: any) {
    console.error('Pending Arsip Surat Keluar Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memeriksa arsip surat keluar' },
      { status: 500 }
    );
  }
}
