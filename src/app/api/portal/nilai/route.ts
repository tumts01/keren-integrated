import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAllCachedDataInduk } from '@/lib/data-induk';
import { normalizeName, getRombelVariations, DKN_MAPELS } from '@/lib/dkn';

export const dynamic = 'force-dynamic';

function getGradeMeta(score: number): { predikat: string; keterangan: string } {
  if (score >= 88) return { predikat: 'A', keterangan: 'Sangat Baik' };
  if (score >= 75) return { predikat: 'B', keterangan: 'Baik (Tuntas)' };
  if (score >= 60) return { predikat: 'C', keterangan: 'Cukup' };
  return { predikat: 'D', keterangan: 'Perlu Bimbingan' };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nisnParam = (searchParams.get('nisn') || '').trim();
    const nisParam = (searchParams.get('nis') || '').trim();

    if (!nisnParam && !nisParam) {
      return NextResponse.json({ success: false, error: 'Parameter nisn atau nis diperlukan' }, { status: 400 });
    }

    const cleanInputNisn = nisnParam.replace(/^0+/, '');

    // 1. Fetch Students from cached data induk
    const rawSiswa = await getAllCachedDataInduk();
    const student = rawSiswa.find((row: any) => {
      const meta = row.metadata || {};
      const rowNisn = String(meta['NISN'] || '').trim().replace(/^0+/, '');
      const rowId = String(meta['ID SISWA'] || row.id_siswa || '').trim();
      const rowNism = String(meta['NISM'] || '').trim();

      if (cleanInputNisn && rowNisn === cleanInputNisn) return true;
      if (nisnParam && (rowNisn === nisnParam || String(meta['NISN'] || '').trim() === nisnParam)) return true;
      if (nisParam && (rowId === nisParam || rowNism === nisParam)) return true;
      return false;
    });

    if (!student) {
      return NextResponse.json({ success: false, error: 'Data siswa tidak ditemukan' }, { status: 404 });
    }

    const meta = student.metadata || {};
    const nama = String(meta['NAMA'] || student.nama || '').trim();
    const nisn = String(meta['NISN'] || '').trim();
    const idSiswa = String(meta['ID SISWA'] || student.id_siswa || '').trim();
    const nism = String(meta['NISM'] || '').trim();
    const normStudent = normalizeName(nama);

    // 2. Build history of classes
    const history: Array<{ tingkat: string; rombel: string; ta: string }> = [];

    if (meta['ROMBEL KELAS 7'] || meta['TA KELAS 7']) {
      history.push({
        tingkat: 'Kelas 7',
        rombel: meta['ROMBEL KELAS 7'] || '7',
        ta: meta['TA KELAS 7'] || ''
      });
    }
    if (meta['ROMBEL KELAS 8'] || meta['TA KELAS 8']) {
      history.push({
        tingkat: 'Kelas 8',
        rombel: meta['ROMBEL KELAS 8'] || '8',
        ta: meta['TA KELAS 8'] || ''
      });
    }
    if (meta['ROMBEL KELAS 9'] || meta['TA KELAS 9']) {
      history.push({
        tingkat: 'Kelas 9',
        rombel: meta['ROMBEL KELAS 9'] || '9',
        ta: meta['TA KELAS 9'] || meta['TAHUN AJARAN'] || ''
      });
    }

    const currRombel = (meta['ROMBEL'] || '').trim();
    const currTa = (meta['TAHUN AJARAN'] || '').trim();
    if (currRombel && !history.some(h => h.rombel && h.rombel.toUpperCase() === currRombel.toUpperCase())) {
      const m = currRombel.match(/^(\d)/);
      history.push({
        tingkat: m ? `Kelas ${m[1]}` : 'Kelas Aktif',
        rombel: currRombel,
        ta: currTa
      });
    }

    // 3. Collect all variations of rombel names
    const allRombels = new Set<string>();
    history.forEach(h => {
      if (h.rombel) {
        getRombelVariations(h.rombel).forEach(r => allRombels.add(r));
      }
    });

    // 4. Fetch official Legger data (nilai_buku_induk)
    let dbLegger: any[] = [];
    if (allRombels.size > 0) {
      const { data, error } = await supabase
        .from('nilai_buku_induk')
        .select('kelas, semester, tahun_ajaran, mata_pelajaran, data_nilai')
        .in('kelas', Array.from(allRombels));

      if (!error && data) dbLegger = data;
    }

    // 5. Fetch STS / Sumatif data for current/ongoing midterms
    let dbSts: any[] = [];
    if (allRombels.size > 0) {
      const { data, error } = await supabase
        .from('nilai_sts')
        .select('kelas, semester, tahun_ajaran, mata_pelajaran, data_nilai')
        .in('kelas', Array.from(allRombels));

      if (!error && data) dbSts = data;
    }

    // Helper matcher for Legger students
    const matchLeggerStudent = (dataNilai: any[]) => {
      if (!Array.isArray(dataNilai)) return null;
      return dataNilai.find(item => {
        if (item.nis) {
          const itemNis = String(item.nis).trim();
          if (itemNis === idSiswa || itemNis === nism) return true;
          if (nism && nism.endsWith(itemNis) && itemNis.length >= 4) return true;
          if (idSiswa && idSiswa.endsWith(itemNis) && itemNis.length >= 4) return true;
        }
        if (item.nama && normalizeName(item.nama) === normStudent) return true;
        return false;
      });
    };

    // Helper matcher for STS students
    const matchStsStudent = (dataNilai: any[]) => {
      if (!Array.isArray(dataNilai)) return null;
      return dataNilai.find(item => {
        const rowNisn = String(item.NISN || item.nisn || '').trim().replace(/^0+/, '');
        if (cleanInputNisn && rowNisn && rowNisn === cleanInputNisn) return true;
        if (item['NAMA SISWA'] && normalizeName(item['NAMA SISWA']) === normStudent) return true;
        if (item.nama && normalizeName(item.nama) === normStudent) return true;
        return false;
      });
    };

    const semestersMap: Record<string, any> = {};

    // 6. Populate from Legger Nilai (Official Report Card)
    dbLegger.forEach(row => {
      const match = matchLeggerStudent(row.data_nilai);
      if (match && match.nilai !== undefined && match.nilai !== null && match.nilai !== '') {
        const val = Number(match.nilai);
        if (isNaN(val)) return;

        const rawSem = String(row.semester || '').toLowerCase();
        const sem = rawSem.includes('genap') || rawSem === '2' ? 'Genap' : 'Ganjil';
        const semKey = `${row.tahun_ajaran}__${sem}`;

        if (!semestersMap[semKey]) {
          const matchedH = history.find(h => getRombelVariations(h.rombel).includes(row.kelas) && (!h.ta || h.ta === row.tahun_ajaran));
          let tingkat = matchedH?.tingkat;
          if (!tingkat) {
            if (row.kelas.startsWith('VII.') || row.kelas.startsWith('7')) tingkat = 'Kelas 7';
            else if (row.kelas.startsWith('VIII.') || row.kelas.startsWith('8')) tingkat = 'Kelas 8';
            else tingkat = 'Kelas 9';
          }

          semestersMap[semKey] = {
            id: semKey,
            tahunAjaran: row.tahun_ajaran,
            semester: sem,
            tingkat,
            label: `${tingkat} - Semester ${sem} (${row.tahun_ajaran})`,
            type: 'legger',
            typeLabel: 'Legger Nilai Rapor Resmi',
            gradesMap: {}
          };
        }

        const mapelName = row.mata_pelajaran || 'Mapel';
        const metaInfo = getGradeMeta(val);
        semestersMap[semKey].gradesMap[mapelName.toLowerCase()] = {
          mapel: mapelName,
          nilai: val,
          predikat: metaInfo.predikat,
          keterangan: metaInfo.keterangan,
          source: 'legger'
        };
      }
    });

    // 7. Merge / Fallback from STS (Ongoing assessments)
    dbSts.forEach(row => {
      const match = matchStsStudent(row.data_nilai);
      if (match) {
        const rawSem = String(row.semester || '').toLowerCase();
        const sem = rawSem.includes('genap') || rawSem === '2' ? 'Genap' : 'Ganjil';
        const semKey = `${row.tahun_ajaran}__${sem}`;

        const stsScore = match.STS !== undefined && match.STS !== '' ? Number(match.STS) : null;
        const sasScore = match.SAS !== undefined && match.SAS !== '' ? Number(match.SAS) : null;
        const naScore = match['NILAI AKHIR'] !== undefined && match['NILAI AKHIR'] !== '' ? Number(match['NILAI AKHIR']) : null;
        const effectiveScore = naScore ?? stsScore ?? sasScore;

        if (!semestersMap[semKey]) {
          // If no Legger exists for this semester yet (e.g. current running semester)
          const matchedH = history.find(h => getRombelVariations(h.rombel).includes(row.kelas));
          let tingkat = matchedH?.tingkat;
          if (!tingkat) {
            const num = (row.kelas || '').match(/\d/);
            tingkat = num ? `Kelas ${num[0]}` : 'Kelas Berjalan';
          }

          semestersMap[semKey] = {
            id: semKey,
            tahunAjaran: row.tahun_ajaran,
            semester: sem,
            tingkat,
            label: `${tingkat} - Semester ${sem} (${row.tahun_ajaran})`,
            type: 'sts',
            typeLabel: 'Penilaian Tengah Semester (STS)',
            gradesMap: {}
          };
        }

        const mapelName = row.mata_pelajaran || 'Mapel';
        const existingGrade = semestersMap[semKey].gradesMap[mapelName.toLowerCase()];

        if (existingGrade) {
          // Attach STS / SAS breakdown to existing Legger grade
          if (stsScore !== null && !isNaN(stsScore)) existingGrade.sts = stsScore;
          if (sasScore !== null && !isNaN(sasScore)) existingGrade.sas = sasScore;
        } else if (effectiveScore !== null && !isNaN(effectiveScore)) {
          // Add as STS grade
          const metaInfo = getGradeMeta(effectiveScore);
          semestersMap[semKey].gradesMap[mapelName.toLowerCase()] = {
            mapel: mapelName,
            nilai: effectiveScore,
            predikat: metaInfo.predikat,
            keterangan: metaInfo.keterangan,
            sts: stsScore !== null && !isNaN(stsScore) ? stsScore : undefined,
            sas: sasScore !== null && !isNaN(sasScore) ? sasScore : undefined,
            source: 'sts'
          };
        }
      }
    });

    // 8. Fallback for manual DKN / Buku Induk grades (metadata['R_GRADES'] or metadata['DKN_R'])
    const manualR = meta['R_GRADES'] || meta['DKN_R'] || {};
    const rKeyMap: Record<string, { k: string; s: string; ta?: string }> = {
      r1: { k: 'Kelas 7', s: 'Ganjil', ta: meta['TA KELAS 7'] },
      r2: { k: 'Kelas 7', s: 'Genap', ta: meta['TA KELAS 7'] },
      r3: { k: 'Kelas 8', s: 'Ganjil', ta: meta['TA KELAS 8'] },
      r4: { k: 'Kelas 8', s: 'Genap', ta: meta['TA KELAS 8'] },
      r5: { k: 'Kelas 9', s: 'Ganjil', ta: meta['TA KELAS 9'] || meta['TAHUN AJARAN'] },
    };

    Object.keys(manualR).forEach(mapelName => {
      const mapelObj = manualR[mapelName] || {};
      (['r1', 'r2', 'r3', 'r4', 'r5'] as const).forEach(rKey => {
        const val = mapelObj[rKey];
        if (val !== undefined && val !== null && val !== '' && !isNaN(Number(val))) {
          const conf = rKeyMap[rKey];
          const ta = conf.ta || 'Historis';
          const semKey = `${ta}__${conf.s}`;

          if (!semestersMap[semKey]) {
            semestersMap[semKey] = {
              id: semKey,
              tahunAjaran: ta,
              semester: conf.s,
              tingkat: conf.k,
              label: `${conf.k} - Semester ${conf.s} (${ta})`,
              type: 'legger',
              typeLabel: 'Legger Nilai Buku Induk',
              gradesMap: {}
            };
          }

          if (!semestersMap[semKey].gradesMap[mapelName.toLowerCase()]) {
            const numVal = Number(val);
            const metaInfo = getGradeMeta(numVal);
            semestersMap[semKey].gradesMap[mapelName.toLowerCase()] = {
              mapel: mapelName,
              nilai: numVal,
              predikat: metaInfo.predikat,
              keterangan: metaInfo.keterangan,
              source: 'manual'
            };
          }
        }
      });
    });

    // 9. Transform semesters map into sorted array with summaries
    const sortedMapelsOrder = DKN_MAPELS.map(m => m.name.toLowerCase());

    const semestersList = Object.values(semestersMap).map((semObj: any) => {
      const gradesArray: any[] = Object.values(semObj.gradesMap);

      // Sort grades according to standard curriculum order
      gradesArray.sort((a, b) => {
        const idxA = sortedMapelsOrder.indexOf(a.mapel.toLowerCase());
        const idxB = sortedMapelsOrder.indexOf(b.mapel.toLowerCase());
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.mapel.localeCompare(b.mapel);
      });

      const totalNilai = gradesArray.reduce((acc, g) => acc + (g.nilai || 0), 0);
      const count = gradesArray.length;
      const rataRata = count > 0 ? Number((totalNilai / count).toFixed(2)) : 0;
      const nilaiTertinggi = count > 0 ? Math.max(...gradesArray.map(g => g.nilai || 0)) : 0;
      const nilaiTerendah = count > 0 ? Math.min(...gradesArray.map(g => g.nilai || 0)) : 0;
      const predikatUmum = count > 0 ? getGradeMeta(rataRata).predikat : '-';

      // Year weight for sorting
      const yearMatch = (semObj.tahunAjaran || '').match(/(\d{4})/);
      const baseYear = yearMatch ? parseInt(yearMatch[1], 10) : 2020;
      const semWeight = semObj.semester === 'Genap' ? 2 : 1;
      const sortWeight = baseYear * 10 + semWeight;

      return {
        id: semObj.id,
        label: semObj.label,
        tingkat: semObj.tingkat,
        semester: semObj.semester,
        tahunAjaran: semObj.tahunAjaran,
        type: semObj.type,
        typeLabel: semObj.typeLabel,
        totalNilai,
        rataRata,
        nilaiTertinggi,
        nilaiTerendah,
        jumlahMapel: count,
        predikatUmum,
        sortWeight,
        grades: gradesArray
      };
    });

    // Sort newest semester first
    semestersList.sort((a, b) => b.sortWeight - a.sortWeight);

    return NextResponse.json({
      success: true,
      student: {
        nama,
        nisn,
        nis: idSiswa,
        kelas: currRombel,
        tahunAjaran: currTa
      },
      semesters: semestersList,
      totalSemesters: semestersList.length,
      defaultSemesterId: semestersList[0]?.id || ''
    });

  } catch (error: any) {
    console.error('Portal Nilai Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data nilai rapor' }, { status: 500 });
  }
}
