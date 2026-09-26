import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const kelas = searchParams.get('kelas');
    const tahunAjaran = searchParams.get('tahunAjaran');
    const prosusMapelStr = searchParams.get('mapels'); // comma separated

    if (!kelas || !tahunAjaran || !prosusMapelStr) {
      return NextResponse.json({ success: false, error: 'Parameter tidak lengkap' }, { status: 400 });
    }

    const mapels = prosusMapelStr.split(',').map(m => m.trim());

    // Fetch grades for all mapels for this class
    const { data: pkData, error } = await supabase
      .from('nilai_pk')
      .select('*')
      .eq('tahun_ajaran', tahunAjaran)
      .eq('kelas', kelas)
      .in('mata_pelajaran', mapels);

    if (error) throw error;

    // We want to calculate the average for each student for each m1, m2... and sts
    const emptyScores = () => ({
      m1s1: [], m1s2: [], m1s3: [],
      m2s1: [], m2s2: [], m2s3: [],
      m3s1: [], m3s2: [], m3s3: [],
      m4s1: [], m4s2: [], m4s3: [],
      m5s1: [], m5s2: [], m5s3: [],
      m6s1: [], m6s2: [], m6s3: [],
      sts: []
    });

    const studentMap: Record<string, ReturnType<typeof emptyScores>> = {};

    if (pkData && pkData.length > 0) {
      for (const row of pkData) {
        if (!row.data_nilai || !Array.isArray(row.data_nilai)) continue;

        let scoreKey = '';
        if (row.tipe === 'sts') scoreKey = 'sts';
        else if (row.tipe === 'materi_harian') {
          const mMatch = (row.materi || '').match(/\d+/);
          const m = mMatch ? parseInt(mMatch[0]) : 1;
          const sMatch = (row.sub_materi || '').match(/\d+/);
          const s = sMatch ? parseInt(sMatch[0]) : 1;
          scoreKey = `m${m}s${s}`;
        }

        if (scoreKey) {
          for (const item of row.data_nilai) {
            // Nilai PK saves the identifier in item.induk
            const identifier = (item.induk || item.nisn || '').toString().trim();
            // Data bisa disimpan sebagai item.nilai atau item.score
            const val = parseFloat(String(item.nilai || item.score || '').replace(',', '.'));
            if (!identifier || isNaN(val)) continue;

            if (!studentMap[identifier]) studentMap[identifier] = emptyScores();
            // @ts-ignore
            if (studentMap[identifier][scoreKey]) {
              // @ts-ignore
              studentMap[identifier][scoreKey].push(val);
            }
          }
        }
      }
    }

    // Now calculate average across the subjects
    const result: any[] = [];

    Object.keys(studentMap).forEach(identifier => {
      const scores = studentMap[identifier];
      
      const calcAvg = (materiIndex: number) => {
        let sum = 0;
        let count = 0;
        for (let s = 1; s <= 3; s++) {
          // @ts-ignore
          const arr = scores[`m${materiIndex}s${s}`];
          if (arr && arr.length > 0) {
            sum += arr.reduce((a: number, b: number) => a + b, 0) / arr.length;
            count++;
          }
        }
        if (count === 0) return '';
        return Math.round(sum / count);
      };

      const tp1 = calcAvg(1);
      const tp2 = calcAvg(2);
      const tp3 = calcAvg(3);
      const tp4 = calcAvg(4);
      const tp5 = calcAvg(5);
      const tp6 = calcAvg(6);
      
      let sts = '';
      if (scores.sts.length > 0) {
        sts = String(Math.round(scores.sts.reduce((a,b)=>a+b,0) / scores.sts.length));
      }

      result.push({ induk: identifier, tp1, tp2, tp3, tp4, tp5, tp6, sts });
    });

    return NextResponse.json({ success: true, data: result }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
    });

  } catch (error: any) {
    console.error('API Prosus Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
