import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data: allStudents } = await supabase.from('data_induk').select('*');
  
  const parsedStudents = allStudents.flatMap((row) => {
    const metadata = row.metadata || {};
    const nama = metadata['NAMA'] || row.nama || '';
    const nisn = metadata['NISN'] || row.nisn || '';
    const jk = metadata['JENIS KELAMIN'] || metadata['L/P'] || '';
    const status = (metadata['STATUS SISWA'] || metadata['STATUS'] || 'Aktif').toLowerCase();

    const records = [];
    const ta7 = (metadata['TA KELAS 7'] || '').trim();
    const rombel7 = (metadata['ROMBEL KELAS 7'] || '').trim();
    if (ta7 && rombel7) records.push({ nisn, nama, jk, status, tahunAjaran: ta7, rombel: rombel7 });

    const ta8 = (metadata['TA KELAS 8'] || '').trim();
    const rombel8 = (metadata['ROMBEL KELAS 8'] || '').trim();
    if (ta8 && rombel8) records.push({ nisn, nama, jk, status, tahunAjaran: ta8, rombel: rombel8 });

    const ta9 = (metadata['TA KELAS 9'] || '').trim();
    const rombel9 = (metadata['ROMBEL KELAS 9'] || '').trim();
    if (ta9 && rombel9) records.push({ nisn, nama, jk, status, tahunAjaran: ta9, rombel: rombel9 });

    if (records.length === 0) {
      records.push({
        nisn, nama, jk, status,
        tahunAjaran: (metadata['TAHUN AJARAN'] || row.tahun_ajaran || '').trim(),
        rombel: (metadata['ROMBEL'] || metadata['rombel'] || row.rombel || '').trim()
      });
    }
    return records;
  });

  const siswaKelas = parsedStudents
    .filter((s) => s.rombel === '7A' && s.tahunAjaran === '2026/2027' && s.status.includes('aktif'))
    
  console.log(`Found ${siswaKelas.length} students in 7A 2026/2027`);
  if (siswaKelas.length > 0) {
    console.log("Sample:", siswaKelas[0]);
  } else {
    console.log("All parsed sample:", parsedStudents[0]);
  }
}

test();
