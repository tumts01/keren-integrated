import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  ALL_JAMS,
  computeUnionJams,
  createDefaultJamPerTingkat,
  normalizeJamPerTingkat,
  parseJamList
} from '@/lib/jam-config';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tanggal = searchParams.get('tanggal');

    const { data: rows, error } = await supabase.from('data_jam_config').select('*');
    if (error) throw error;

    const data = (rows || []).map((r: any) => ({
      id: r.id,
      tanggal: r.metadata?.['Tanggal'] || r.tanggal || '',
      jamTersedia: r.metadata?.['JamTersedia'] ?? (r.jam_tersedia || ''),
      jamPerTingkat: r.metadata?.['JamPerTingkat'] ?? null,
      keterangan: r.metadata?.['Keterangan'] || '',
      updatedAt: r.metadata?.['UpdatedAt'] || '',
    })).filter((r: any) => r.tanggal);

    if (tanggal) {
      const found = data.find((r: any) => r.tanggal === tanggal);
      if (!found) {
        return NextResponse.json({
          success: true,
          hasConfig: false,
          jamTersedia: [...ALL_JAMS],
          jamPerTingkat: createDefaultJamPerTingkat(),
          keterangan: ''
        });
      }
      const jams = parseJamList(found.jamTersedia);
      const jamPerTingkat = normalizeJamPerTingkat(found.jamPerTingkat, jams);
      return NextResponse.json({
        success: true,
        hasConfig: true,
        jamTersedia: jams,
        jamPerTingkat,
        keterangan: found.keterangan
      });
    }

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tanggal, jamTersedia, jamPerTingkat, keterangan } = body;

    if (!tanggal || (!Array.isArray(jamTersedia) && (!jamPerTingkat || typeof jamPerTingkat !== 'object'))) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const baseGlobal = Array.isArray(jamTersedia) ? parseJamList(jamTersedia) : [...ALL_JAMS];
    const normalizedPerTingkat = normalizeJamPerTingkat(jamPerTingkat, baseGlobal);
    const effectiveGlobal = jamPerTingkat
      ? computeUnionJams(normalizedPerTingkat)
      : baseGlobal;

    const jamStr = effectiveGlobal.join(', ');
    const updatedAt = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    // Check existing
    const { data: existingRows } = await supabase.from('data_jam_config').select('id, tanggal, metadata');
    const existingRow = (existingRows || []).find((r: any) => (r.metadata?.['Tanggal'] || r.tanggal) === tanggal);

    const metadata = {
      'Tanggal': tanggal,
      'JamTersedia': jamStr,
      'JamPerTingkat': normalizedPerTingkat,
      'Keterangan': keterangan || '',
      'UpdatedAt': updatedAt
    };

    if (existingRow) {
      const { error } = await supabase.from('data_jam_config').update({ metadata }).eq('id', existingRow.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('data_jam_config').insert([{ tanggal, metadata }]);
      if (error) throw error;
    }

    return NextResponse.json({
      success: true,
      jamTersedia: effectiveGlobal,
      jamPerTingkat: normalizedPerTingkat
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tanggal = searchParams.get('tanggal');

    if (!tanggal) {
      return NextResponse.json({ success: false, error: 'Tanggal diperlukan' }, { status: 400 });
    }

    const { data: rows, error: selectErr } = await supabase.from('data_jam_config').select('id, tanggal, metadata');
    if (selectErr) throw selectErr;

    const matched = (rows || []).filter((r: any) => (r.metadata?.['Tanggal'] || r.tanggal) === tanggal);
    if (matched.length > 0) {
      const ids = matched.map((r: any) => r.id);
      const { error: delErr } = await supabase.from('data_jam_config').delete().in('id', ids);
      if (delErr) throw delErr;
    } else {
      await supabase.from('data_jam_config').delete().eq('tanggal', tanggal);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
