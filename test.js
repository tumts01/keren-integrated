const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const getNilaiAkhir = (record) => {
  const keys = ['NILAI AKHIR', 'Nilai Akhir', 'NA'];
  for (const k of keys) {
    if (record[k] !== undefined && record[k] !== '') return record[k];
  }
  const stsKeys = ['STS', 'SUMATIF TENGAH SEMESTER', 'Nilai STS', 'NILAI STS'];
  for (const k of stsKeys) {
    if (record[k] !== undefined && record[k] !== '') return record[k];
  }
  return '';
};

async function run() {
  const { data: nilaiRows } = await supabase
      .from('nilai_sts')
      .select('mata_pelajaran, data_nilai')
      .eq('kelas', '8G').eq('tahun_ajaran', '2026/2027');

  const mapelNilaiMap = {};
  for (const row of nilaiRows) {
    const mapel = row.mata_pelajaran;
    if (!mapel) continue;
    mapelNilaiMap[mapel] = {};
    for (const rec of row.data_nilai) {
      const nisn = (rec['NISN'] || rec['nisn'] || '').toString().trim();
      const namaRec = (rec['NAMA SISWA'] || rec['NAMA'] || rec['nama'] || '').toString().trim().toUpperCase();
      const nilai = getNilaiAkhir(rec);
      if (nisn) mapelNilaiMap[mapel][nisn] = nilai;
      if (namaRec) mapelNilaiMap[mapel]['__nama__' + namaRec] = nilai;
    }
  }

  // MOCK SISWA based on my previous query
  const mockSiswa = [
    { nama: 'AALIYAH AURAMADHAN PUTRI ADI PRAJNAPARAMITA', nisn: 3126189495 }
  ];

  const uniqueMapels = ['Akidah Akhlak', 'Matematika'];

  mockSiswa.forEach((s) => {
    console.log(`Student: ${s.nama} (${s.nisn})`);
    for (const mapel of uniqueMapels) {
      const nilaiByMapel = mapelNilaiMap[mapel] || {};
      let nilai = '';
      if (s.nisn && nilaiByMapel[s.nisn] !== undefined) {
        nilai = nilaiByMapel[s.nisn];
        console.log(`  ${mapel}: ${nilai} (matched by NISN)`);
      } else if (s.nama) {
        const namaUpper = s.nama.toUpperCase();
        if (nilaiByMapel['__nama__' + namaUpper] !== undefined) {
          nilai = nilaiByMapel['__nama__' + namaUpper];
          console.log(`  ${mapel}: ${nilai} (matched by NAMA)`);
        } else {
          console.log(`  ${mapel}: NOT FOUND (namaUpper: ${namaUpper})`);
        }
      } else {
        console.log(`  ${mapel}: NOT FOUND (no nisn or nama)`);
      }
    }
  });
}
run();
