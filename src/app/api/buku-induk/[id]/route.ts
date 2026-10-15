import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAllCachedDataInduk } from '@/lib/data-induk';

export const dynamic = 'force-dynamic';

function getRombelVariations(rombel: string) {
  const vars = new Set<string>();
  vars.add(rombel);

  const numMap: Record<string, string> = { '7': 'VII', '8': 'VIII', '9': 'IX' };
  const romanMap: Record<string, string> = { 'VII': '7', 'VIII': '8', 'IX': '9' };

  const m1 = rombel.match(/^(\d)(.*)$/);
  if (m1) {
    const num = m1[1];
    const rest = m1[2].replace(/^[\s\.]+/, '');
    if (numMap[num]) {
      const rom = numMap[num];
      vars.add(rom + rest);
      vars.add(rom + '.' + rest);
      vars.add(rom + ' ' + rest);
    }
  }

  const m2 = rombel.match(/^(VII|VIII|IX)(.*)$/i);
  if (m2) {
    const rom = m2[1].toUpperCase();
    const rest = m2[2].replace(/^[\s\.]+/, '');
    if (romanMap[rom]) {
      const num = romanMap[rom];
      vars.add(num + rest);
      vars.add(num + '.' + rest);
      vars.add(num + ' ' + rest);
    }
  }
  return Array.from(vars);
}

function matchNis(a: any, b: any): boolean {
  if (!a || !b) return false;
  const strA = String(a).trim();
  const strB = String(b).trim();
  if (strA === strB) return true;
  const cleanA = strA.replace(/\D/g, '');
  const cleanB = strB.replace(/\D/g, '');
  return cleanA !== '' && cleanB !== '' && cleanA === cleanB;
}

function matchNama(a: any, b: any): boolean {
  if (!a || !b) return false;
  const normA = String(a).toUpperCase().replace(/\s+/g, ' ').trim();
  const normB = String(b).toUpperCase().replace(/\s+/g, ' ').trim();
  return normA !== '' && normB !== '' && normA === normB;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    
    // 1. Get Data Induk
    const allStudents = await getAllCachedDataInduk();
    const student = allStudents.find((s: any) => 
      String(s.id_siswa) === String(id) || 
      (s.metadata && String(s.metadata['ID SISWA']) === String(id)) || 
      (s.metadata && String(s.metadata['NISN']) === String(id))
    );
    
    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const metadata = student.metadata || {};
    const nis = metadata['NISM'] || metadata['ID SISWA'] || id;
    const nisn = metadata['NISN'] || '';
    const nama = metadata['NAMA'] || student.nama || '';
    
    // Extract history of classes
    const history = [
      { kelas: '7', tahun_ajaran: metadata['TA KELAS 7'], rombel: metadata['ROMBEL KELAS 7'] },
      { kelas: '8', tahun_ajaran: metadata['TA KELAS 8'], rombel: metadata['ROMBEL KELAS 8'] },
      { kelas: '9', tahun_ajaran: metadata['TA KELAS 9'], rombel: metadata['ROMBEL KELAS 9'] }
    ].filter(h => h.rombel && h.tahun_ajaran);

    // 2. Fetch Nilai Buku Induk for these classes
    let nilaiData: any[] = [];
    if (history.length > 0) {
      const allRombels = Array.from(new Set(history.flatMap(h => getRombelVariations(h.rombel))));
      const tas = history.map(h => h.tahun_ajaran);
      
      const { data: sts, error: stsError } = await supabase
        .from('nilai_buku_induk')
        .select('*')
        .in('kelas', allRombels)
        .in('tahun_ajaran', tas);
        
      if (!stsError && sts) {
        // filter the jsonb array for this student
        for (const row of sts) {
          const matchedHistory = history.find(h =>
            h.tahun_ajaran === row.tahun_ajaran &&
            getRombelVariations(h.rombel).some(v => v.toUpperCase() === String(row.kelas || '').trim().toUpperCase())
          );

          if (matchedHistory) {
            const studentGrades = (row.data_nilai || []).find((d: any) =>
              matchNis(d.nis, nis) ||
              matchNama(d.nama, nama) ||
              (nisn && matchNis(d.nisn, nisn))
            );

            if (studentGrades) {
              nilaiData.push({
                tahun_ajaran: row.tahun_ajaran,
                semester: row.semester,
                kelas: matchedHistory.kelas,
                mata_pelajaran: row.mata_pelajaran,
                nilai: studentGrades.nilai
              });
            }
          }
        }
      }
    }

    // 2.1. Merge manual grades from DKN (metadata['R_GRADES']) for transfer students or missing report grades
    const manualR = metadata['R_GRADES'] || metadata['DKN_R'] || {};
    const rKeyMap: Record<string, { k: string; s: string; ta?: string }> = {
      r1: { k: '7', s: 'Ganjil', ta: metadata['TA KELAS 7'] },
      r2: { k: '7', s: 'Genap', ta: metadata['TA KELAS 7'] },
      r3: { k: '8', s: 'Ganjil', ta: metadata['TA KELAS 8'] },
      r4: { k: '8', s: 'Genap', ta: metadata['TA KELAS 8'] },
      r5: { k: '9', s: 'Ganjil', ta: metadata['TA KELAS 9'] || metadata['TAHUN AJARAN'] },
    };

    Object.keys(manualR).forEach(mapelName => {
      const mapelObj = manualR[mapelName] || {};
      (['r1', 'r2', 'r3', 'r4', 'r5'] as const).forEach(rKey => {
        const val = mapelObj[rKey];
        if (val !== undefined && val !== null && val !== '') {
          const conf = rKeyMap[rKey];
          const existingIdx = nilaiData.findIndex(item =>
            item.kelas?.includes(conf.k) &&
            item.semester?.toLowerCase() === conf.s.toLowerCase() &&
            item.mata_pelajaran?.toLowerCase() === mapelName.toLowerCase()
          );

          if (existingIdx !== -1) {
            nilaiData[existingIdx].nilai = val;
          } else {
            nilaiData.push({
              tahun_ajaran: conf.ta || '',
              semester: conf.s,
              kelas: conf.k,
              mata_pelajaran: mapelName,
              nilai: val
            });
          }
        }
      });
    });

    // 2.5. Fetch Nilai Ekstra for these classes
    let ekstraData: any[] = [];
    if (history.length > 0) {
      const allRombels = Array.from(new Set(history.flatMap(h => getRombelVariations(h.rombel))));
      const tas = history.map(h => h.tahun_ajaran);
      
      const { data: exs, error: exsError } = await supabase
        .from('ekstra_buku_induk')
        .select('*')
        .in('kelas', allRombels)
        .in('tahun_ajaran', tas);
        
      if (!exsError && exs) {
        for (const row of exs) {
          const matchedHistory = history.find(h =>
            h.tahun_ajaran === row.tahun_ajaran &&
            getRombelVariations(h.rombel).some(v => v.toUpperCase() === String(row.kelas || '').trim().toUpperCase())
          );

          if (matchedHistory) {
            const studentEkstra = (row.data_ekstra || []).filter((d: any) =>
              (nisn && matchNis(d.nisn, nisn)) ||
              (nis && matchNis(d.nis, nis)) ||
              (nama && matchNama(d.nama, nama)) ||
              (student.nama && matchNama(d.nama, student.nama))
            );

            if (studentEkstra && studentEkstra.length > 0) {
              for (const ek of studentEkstra) {
                ekstraData.push({
                  tahun_ajaran: row.tahun_ajaran,
                  semester: row.semester,
                  kelas: matchedHistory.kelas,
                  jenis_ekstra: ek.jenis_ekstra,
                  nilai: ek.nilai
                });
              }
            }
          }
        }
      }
    }

    // 3. Fetch Prestasi
    const { data: prestasi, error: prestasiError } = await supabase
      .from('data_prestasi')
      .select('metadata');
      
    let prestasiList = [];
    if (!prestasiError && prestasi) {
      prestasiList = prestasi
        .map(p => p.metadata)
        .filter(m => m && (m.nama === nama || m.induk === nis));
    }

    // 4. Fetch Presensi
    let rekapPresensi: Record<string, { S: number; I: number; A: number }> = {
      '7-Ganjil': { S: 0, I: 0, A: 0 },
      '7-Genap': { S: 0, I: 0, A: 0 },
      '8-Ganjil': { S: 0, I: 0, A: 0 },
      '8-Genap': { S: 0, I: 0, A: 0 },
      '9-Ganjil': { S: 0, I: 0, A: 0 },
      '9-Genap': { S: 0, I: 0, A: 0 }
    };
    if (nisn || nama) {
      const orQuery = [];
      if (nisn) orQuery.push(`metadata->>NISN.eq.${nisn}`);
      if (nama) orQuery.push(`metadata->>NAMA SISWA.eq.${nama}`);
      
      const { data: presensiData, error: presensiError } = await supabase
        .from('data_presensi_siswa')
        .select('tanggal, metadata')
        .or(orQuery.join(','));
        
      if (!presensiError && presensiData) {
        const seenDateStatus = new Set<string>();

        presensiData.forEach(p => {
          if (!p.tanggal) return;
          const hadir = (p.metadata?.['KEHADIRAN'] || '').trim().toUpperCase();
          if (hadir !== 'S' && hadir !== 'I' && hadir !== 'A') return;

          // Prevent counting duplicate subject periods on the same date for the same status
          const dateKey = `${p.tanggal}::${hadir}`;
          if (seenDateStatus.has(dateKey)) return;
          seenDateStatus.add(dateKey);

          const d = new Date(p.tanggal);
          const month = d.getMonth() + 1; // 1-12
          const semester = (month >= 7 && month <= 12) ? 'Ganjil' : 'Genap';
          const kelas = (p.metadata?.['KELAS'] || '').trim().toUpperCase();
          
          let level = '';
          if (kelas.startsWith('7') || kelas.startsWith('VII')) level = '7';
          else if (kelas.startsWith('8') || kelas.startsWith('VIII')) level = '8';
          else if (kelas.startsWith('9') || kelas.startsWith('IX')) level = '9';
          else return;
  
          const key = `${level}-${semester}`;
          if (!rekapPresensi[key]) rekapPresensi[key] = { S: 0, I: 0, A: 0 };
          
          if (hadir === 'S') rekapPresensi[key].S += 1;
          if (hadir === 'I') rekapPresensi[key].I += 1;
          if (hadir === 'A') rekapPresensi[key].A += 1;
        });
      }

      // Also support manual presensi override if present in metadata
      const manualPres = metadata['MANUAL_PRESENSI'] || metadata['PRESENSI'] || {};
      Object.keys(manualPres).forEach(k => {
        if (!rekapPresensi[k]) rekapPresensi[k] = { S: 0, I: 0, A: 0 };
        if (manualPres[k]?.S !== undefined) rekapPresensi[k].S = manualPres[k].S;
        if (manualPres[k]?.I !== undefined) rekapPresensi[k].I = manualPres[k].I;
        if (manualPres[k]?.A !== undefined) rekapPresensi[k].A = manualPres[k].A;
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        induk: {
          id_siswa: student.id_siswa,
          ...metadata
        },
        history,
        nilai: nilaiData,
        ekstra: ekstraData,
        prestasi: prestasiList,
        presensi: rekapPresensi
      }
    });

  } catch (error: any) {
    console.error('Error fetching buku induk:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
