import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAllCachedDataInduk } from '@/lib/data-induk';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const kelas = searchParams.get('kelas');
    const mapel = searchParams.get('mapel');
    const tipe = searchParams.get('tipe');
    const materi = searchParams.get('materi');
    const sub = searchParams.get('sub');
    const tahunAjaran = searchParams.get('tahunAjaran');

    if (!kelas || !mapel || !tahunAjaran) {
      return NextResponse.json({ success: false, error: 'Kelas, Mapel, dan Tahun Ajaran wajib diisi' }, { status: 400 });
    }

    // 1. Fetch Students from Supabase Data Induk
    const rowsDb = await getAllCachedDataInduk();
    
    const siswas: any[] = [];
    (rowsDb || []).forEach((r: any) => {
      const getVal = (k: string) => k === 'ID SISWA' ? r.id_siswa : k === 'NAMA' ? r.nama : (r.metadata?.[k] || '');
      
      const baseStudent = {
        induk: getVal('ID SISWA') || '',
        nama: getVal('NAMA') || '',
        jk: getVal('JENIS KELAMIN') || '',
      };

      const records = [];
      const ta7 = (getVal('TA KELAS 7') || '').trim();
      const rombel7 = (getVal('ROMBEL KELAS 7') || '').trim();
      if (ta7 && rombel7) records.push({ ...baseStudent, tahunAjaran: ta7, rombel: rombel7 });

      const ta8 = (getVal('TA KELAS 8') || '').trim();
      const rombel8 = (getVal('ROMBEL KELAS 8') || '').trim();
      if (ta8 && rombel8) records.push({ ...baseStudent, tahunAjaran: ta8, rombel: rombel8 });

      const ta9 = (getVal('TA KELAS 9') || '').trim();
      const rombel9 = (getVal('ROMBEL KELAS 9') || '').trim();
      if (ta9 && rombel9) records.push({ ...baseStudent, tahunAjaran: ta9, rombel: rombel9 });

      if (records.length === 0) {
        records.push({
          ...baseStudent,
          tahunAjaran: (getVal('TAHUN AJARAN') || '').trim(),
          rombel: (getVal('ROMBEL') || '').trim()
        });
      }

      records.forEach(rec => siswas.push(rec));
    });

    const activeSiswa = siswas.filter(s => s.tahunAjaran === tahunAjaran && s.rombel === kelas);

    // 2. Fetch Grades from Supabase nilai_pk
    let nilaiMap: Record<string, string> = {};

    if (tipe) {
      const { data: pkData, error } = await supabase
        .from('nilai_pk')
        .select('data_nilai')
        .eq('tahun_ajaran', tahunAjaran)
        .eq('kelas', kelas)
        .eq('mata_pelajaran', mapel)
        .eq('tipe', tipe)
        .eq('materi', materi || '')
        .eq('sub_materi', sub || '')
        .maybeSingle();

      if (pkData && pkData.data_nilai && Array.isArray(pkData.data_nilai)) {
        pkData.data_nilai.forEach((item: any) => {
          nilaiMap[item.induk] = item.nilai || item.score || '';
        });
      }
    }

    const data = activeSiswa.map((s, index) => ({
      no: index + 1,
      induk: s.induk,
      nama: s.nama,
      jk: s.jk,
      nilai: nilaiMap[s.induk] || ''
    }));

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
    });

  } catch (error: any) {
    console.error('API Nilai PK GET Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { kelas, mapel, tipe, materi, sub, data, guru, tahunAjaran } = body;

    if (!kelas || !mapel || !tipe || !data || !Array.isArray(data)) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const { data: existingData } = await supabase
      .from('nilai_pk')
      .select('id')
      .eq('tahun_ajaran', tahunAjaran)
      .eq('kelas', kelas)
      .eq('mata_pelajaran', mapel)
      .eq('tipe', tipe)
      .eq('materi', materi || '')
      .eq('sub_materi', sub || '')
      .maybeSingle();

    if (existingData) {
      const { error } = await supabase
        .from('nilai_pk')
        .update({ data_nilai: data, guru: guru || '', updated_at: new Date().toISOString() })
        .eq('id', existingData.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('nilai_pk')
        .insert({
          tahun_ajaran: tahunAjaran,
          kelas,
          mata_pelajaran: mapel,
          tipe,
          materi: materi || '',
          sub_materi: sub || '',
          guru: guru || '',
          data_nilai: data
        });
      if (error) throw error;
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('API Nilai PK POST Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menyimpan nilai' }, { status: 500 });
  }
}
