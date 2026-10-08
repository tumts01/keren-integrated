const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const kelas = '8F';
  const mapel = 'Keterampilan Kreatif Produktif';
  const tahunAjaran = '2026/2027';
  const guru = 'Admin';
  
  const dataNilai = [
    { induk: '123', nama: 'Test', jk: 'L', 'MATERI 1 S1': '90', 'STS': '85' }
  ];

  const columns = [
    { key: 'MATERI 1 S1', tipe: 'materi_harian', materi: 'Materi 1', sub: 'S1' },
    { key: 'STS', tipe: 'sts', materi: '', sub: '' }
  ];

  const bulkUpserts = [];
  const timestamp = new Date().toISOString();

  for (const col of columns) {
    const dataForThisCol = dataNilai.map(student => ({
      induk: student.induk,
      nama: student.nama,
      jk: student.jk,
      nilai: student[col.key] !== undefined && student[col.key] !== null ? String(student[col.key]) : ''
    }));

    const hasAnyValue = dataForThisCol.some(d => d.nilai !== '');

    if (hasAnyValue) {
      bulkUpserts.push({
        tahun_ajaran: tahunAjaran,
        kelas,
        mata_pelajaran: mapel,
        tipe: col.tipe,
        materi: col.materi,
        sub_materi: col.sub,
        data_nilai: dataForThisCol,
        guru: guru || '',
        updated_at: timestamp
      });
    }
  }

  if (bulkUpserts.length > 0) {
    const { data: existingRows } = await supabase
      .from('nilai_pk')
      .select('id, tipe, materi, sub_materi')
      .eq('tahun_ajaran', tahunAjaran)
      .eq('kelas', kelas)
      .eq('mata_pelajaran', mapel);

    const toUpsert = [];

    for (const row of bulkUpserts) {
      const existing = existingRows?.find(e => e.tipe === row.tipe && e.materi === row.materi && e.sub_materi === row.sub_materi);
      if (existing) {
        toUpsert.push({ ...row, id: existing.id });
      } else {
        toUpsert.push(row);
      }
    }

    const { error } = await supabase
      .from('nilai_pk')
      .upsert(toUpsert);

    if (error) console.error('UPSERT ERROR:', error);
    else console.log('SUCCESS!');
  } else {
    console.log('NO DATA TO UPSERT');
  }
}
run();
