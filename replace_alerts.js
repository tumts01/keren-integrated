const fs = require('fs');
let code = fs.readFileSync('src/app/siswa/page.tsx', 'utf8');

code = code.replace(/alert\('Pilih tanggal mulai dan tanggal selesai'\);/g, `Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Pilih tanggal mulai dan tanggal selesai' });`);
code = code.replace(/alert\('Tidak ada data siswa aktif untuk tingkat ini'\);/g, `Swal.fire({ icon: 'warning', title: 'Data Kosong', text: 'Tidak ada data siswa aktif untuk tingkat ini' });`);
code = code.replace(/alert\('Rentang tanggal tidak valid \\(atau hanya berisi hari Minggu\\)'\);/g, `Swal.fire({ icon: 'error', title: 'Tidak Valid', text: 'Rentang tanggal tidak valid (atau hanya berisi hari Minggu)' });`);
code = code.replace(/alert\('Sinkronisasi berhasil! Halaman akan dimuat ulang.'\);/g, `await Swal.fire({ icon: 'success', title: 'Sukses', text: 'Sinkronisasi berhasil! Halaman akan dimuat ulang.' });`);
code = code.replace(/alert\('Gagal: ' \+ json\.error\);/g, `Swal.fire({ icon: 'error', title: 'Gagal', text: json.error });`);
code = code.replace(/alert\('Error: ' \+ err\.message\);/g, `Swal.fire({ icon: 'error', title: 'Error', text: err.message });`);
code = code.replace(/alert\('Tidak ada siswa dengan NISN atau NIK kosong pada filter saat ini.'\);/g, `Swal.fire({ icon: 'info', title: 'Data Lengkap', text: 'Tidak ada siswa dengan NISN atau NIK kosong pada filter saat ini.' });`);

fs.writeFileSync('src/app/siswa/page.tsx', code);
