import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

const cleanJamKe = (val: string) => val.replace(/,(19|20)\d{2}$/g, '').replace(/^'/, '').trim();

function kelasToJadwalCol(kelas: string): string {
  const match = kelas.trim().match(/^(\d+)([A-Za-z]+)$/);
  if (!match) return '';
  const num = parseInt(match[1]);
  const suffix = match[2].toUpperCase();
  const roman: Record<number, string> = { 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII' };
  const r = roman[num] || '';
  return r ? `${r}_${suffix}` : '';
}

export async function GET() {
  try {
    
    let rows = [];
    let page = 0;
    while (true) {
      const { data, error } = await supabase.from('data_jurnal_mengajar').select('*').range(page * 1000, (page + 1) * 1000 - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      rows = rows.concat(data);
      if (data.length < 1000) break;
      page++;
    }


    const rawData = (rows || []).map((r: any) => ({
      id: r.metadata?.['ID'] || r.id.toString(),
      timestamp: r.metadata?.['TIMESTAMP'] || '',
      tanggal: r.metadata?.['TANGGAL'] || r.tanggal || '',
      jamKe: cleanJamKe(r.metadata?.['JAM KE'] || ''),
      tahunAjaran: r.metadata?.['TAHUN AJARAN'] || '',
      kelas: r.metadata?.['KELAS'] || r.kelas || '',
      mapel: r.metadata?.['MAPEL'] || '',
      namaGuru: r.metadata?.['NAMA GURU'] || '',
      materi: r.metadata?.['MATERI'] || '',
    })).filter((r: any) => r.tanggal || r.materi);

    const seen = new Set<string>();
    const data = rawData.filter((r: any) => {
      const key = `${r.tanggal}|${r.kelas}|${r.mapel}|${r.jamKe}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).reverse();

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
    });

  } catch (error: any) {
    console.error('Fetch Jurnal Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memuat jurnal' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tanggal, jamKe, kelas, mapel, guru, materi, tahunAjaran } = body;

    if (!tanggal || !jamKe || !kelas || !mapel || !materi) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const id = crypto.randomUUID().substring(0, 8);
    const jamKeText = String(jamKe);

    const { data: rows, error: readError } = await supabase.from('data_jurnal_mengajar').select('*').eq('tanggal', tanggal).eq('kelas', kelas);
    if (readError) throw readError;

    const submittedJams = jamKeText.split(',').map(j => j.trim()).filter(Boolean);
    let overlappingRow = null;
    let isExactMatch = false;

    if (rows && rows.length > 0) {
      for (let i = rows.length - 1; i >= 0; i--) {
        const r = rows[i];
        const existingJamKeStr = cleanJamKe(String(r.metadata?.['JAM KE'] || ''));
        const existingJams = existingJamKeStr.split(',').map(j => j.trim()).filter(Boolean);
        
        const hasOverlap = submittedJams.some(j => existingJams.includes(j));
        if (hasOverlap) {
          overlappingRow = r;
          if (existingJamKeStr === cleanJamKe(jamKeText) && r.metadata?.['MAPEL'] === mapel) {
            isExactMatch = true;
          }
          break;
        }
      }
    }

    if (isExactMatch) {
      return NextResponse.json({ success: true, message: 'Jurnal sudah pernah diinput (Anti-Dobel Aktif)' });
    }

    if (overlappingRow) {
      const dbMapel = overlappingRow.metadata?.['MAPEL'];
      const dbGuru = overlappingRow.metadata?.['NAMA GURU'];
      return NextResponse.json({ 
        success: false, 
        error: `Jam ke-${jamKeText} di kelas ${kelas} sudah diisi oleh ${dbGuru} (Mapel: ${dbMapel}). Anda tidak bisa menimpa jadwal orang lain.` 
      }, { status: 409 });
    }

    const metadata = {
      'ID': id,
      'TIMESTAMP': timestamp,
      'TANGGAL': tanggal,
      'JAM KE': `'${jamKeText}`,
      'TAHUN AJARAN': tahunAjaran,
      'KELAS': kelas,
      'MAPEL': mapel,
      'NAMA GURU': guru,
      'MATERI': materi
    };

    const { error: insertError } = await supabase.from('data_jurnal_mengajar').insert([{ tanggal, kelas, metadata }]);
    if (insertError) throw insertError;

    // Optional: Fetch Schedule update code could go here, but omitted for brevity if it's already refactored out

    return NextResponse.json({ success: true, id });

  } catch (error: any) {
    console.error('POST Jurnal Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memproses jurnal: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: 'ID tidak valid' }, { status: 400 });

    let deleteId = parseInt(id, 10);
    
    if (isNaN(deleteId)) {
      const { data: foundRow } = await supabase.from('data_jurnal_mengajar').select('id').contains('metadata', { 'ID': id }).single();
      if (foundRow) deleteId = foundRow.id;
    }

    if (!isNaN(deleteId)) {
      const { error } = await supabase.from('data_jurnal_mengajar').delete().eq('id', deleteId);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete Jurnal Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menghapus jurnal' }, { status: 500 });
  }
}
