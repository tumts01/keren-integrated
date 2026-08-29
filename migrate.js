const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const creds = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
const auth = new JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const docId = '1cfMdNVk0iOKNq1MV05UJ07vXH0JTvhIYh_StZuNZd-4';

async function migrate() {
  console.log('Menghubungkan ke Google Sheets...');
  const doc = new GoogleSpreadsheet(docId, auth);
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle['LATAR BELAKANG'];
  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();
  console.log('Ditemukan ' + rows.length + ' data di Google Sheets.');
  
  const g = (row, key) => {
    try { return row.get(key) || ''; } catch(e) { return ''; }
  };

  const payload = rows.map(r => ({
    kelas: g(r, 'Kelas'),
    nama_siswa: g(r, 'Nama Siswa'),
    anak_ke: g(r, 'Anak ke-'),
    saudara_kandung: g(r, 'Saudara Kandung'),
    saudara_tiri: g(r, 'Saudara tiri'),
    tinggal_bersama: g(r, 'Tinggal Bersama'),
    status_ayah: g(r, 'Status Ayah'),
    status_ibu: g(r, 'Status Ibu'),
    kondisi_orang_tua: g(r, 'Kondisi Orang Tua'),
    tinggal_di: g(r, 'Tinggal di'),
    perasaan_di_pesantren: g(r, 'Perasaan di Pesantren'),
    riwayat_sakit: g(r, 'Riwayat Sakit'),
    uang_saku: g(r, 'Uang Saku per-Hari'),
    pernah_di_bully: g(r, 'Pernah menjadi korban bullying'),
    kenyamanan_di_kelas: g(r, 'Kenyamanan di kelas'),
    kendala_di_kelas: g(r, 'Kendala di kelas'),
    menghabiskan_waktu_luang: g(r, 'Menghabiskan waktu luang'),
    tipe_belajar: g(r, 'Tipe Belajar'),
    mapel_disukai: g(r, 'Mata pelajaran yang paling disukai'),
    mapel_sulit: g(r, 'Mata pelajaran yang paling sulit'),
    kendala_belajar: g(r, 'Kendala belajar'),
    minat_bakat: g(r, 'Minat / Bakat'),
    olahraga_disukai: g(r, 'Bidang olahraga yang disukai'),
    lomba_diikuti: g(r, 'Lomba yang ingin diikuti'),
    prestasi_diraih: g(r, 'Prestasi yang pernah diraih'),
    kesediaan_ke_bk: g(r, 'Kesediaan datang ke ruang BK'),
    harapan_guru_bk: g(r, 'Harapan untuk Guru BK'),
    catatan_tambahan: g(r, 'Catatan Tambahan')
  })).filter(p => p.nama_siswa && p.kelas);

  console.log('Mengirim ' + payload.length + ' data ke Supabase...');
  
  const { data, error } = await supabase.from('pemetaan_siswa').insert(payload);
  if (error) console.error('Error saat insert:', error);
  else console.log('BERHASIL! Data pindah ke Supabase.');
}

migrate();
