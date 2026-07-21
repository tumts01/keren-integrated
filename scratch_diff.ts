import { getIndukDoc } from './src/lib/google-sheets';

async function main() {
  try {
    const doc = await getIndukDoc();
    const sheetSiswa = doc.sheetsByTitle['DATABASE'];
    await sheetSiswa.loadHeaderRow();
    const rows = await sheetSiswa.getRows();

    const dataSiswaPage = [];
    const sajianData = [];

    rows.forEach((r, idx) => {
      const statusAktif = (r.get('Status Siswa') || r.get('STATUS SISWA') || r.get('Ket') || r.get('KETERANGAN') || '').toString().toLowerCase().trim();
      const nama = (r.get('Nama') || r.get('NAMA') || r.get('Nama Siswa') || r.get('NAMA SISWA') || '').toString().trim();

      // Logika di halaman Data Siswa:
      // dataSiswaPage menggunakan ['aktif', 'lulus'].includes() 
      // Tapi user bilang "ambil yang Aktif saja".
      // Apakah selisih karena ada yg 'Aktif' tapi namanya kosong?
      if (statusAktif === 'aktif') {
        if (!nama) {
          console.log(`Baris ${idx + 2} (Index ${idx}): Status aktif tapi nama kosong!`);
        } else {
          sajianData.push(nama);
        }
      }
      
      // Let's check gender format issues
      if (statusAktif === 'aktif' && nama) {
        const lpRaw = (r.get('JENIS KELAMIN') || r.get('L/P') || '').toString().trim().toUpperCase();
        const lp = lpRaw === 'L' || lpRaw === 'LAKI-LAKI' ? 'L' : (lpRaw === 'P' || lpRaw === 'PEREMPUAN' ? 'P' : 'Lainnya');
        if (lp !== 'L' && lp !== 'P') {
          console.log(`Baris ${idx + 2}: Status aktif, nama ${nama}, tapi LP invalid (${lpRaw})`);
        }
      }
    });

    console.log(`Total sajian data (aktif & nama ada & kelamin valid? wait di api saya skip kelamin tidak valid)`);
  } catch(e) {
    console.error(e);
  }
}
main();
