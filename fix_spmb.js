const fs = require('fs');
let content = fs.readFileSync('src/app/spmb/page.tsx', 'utf8');

const oldImport = `import { useRouter, usePathname } from 'next/navigation';\r\nimport styles from './Spmb.module.css';`;
const newImport = `import { useRouter, usePathname } from 'next/navigation';\nimport Swal from 'sweetalert2';\nimport styles from './Spmb.module.css';`;

if (content.includes(oldImport)) {
  content = content.replace(oldImport, newImport);
} else {
  // Try with just \n
  const oldImport2 = `import { useRouter, usePathname } from 'next/navigation';\nimport styles from './Spmb.module.css';`;
  if (content.includes(oldImport2)) {
    content = content.replace(oldImport2, newImport);
  } else {
    console.log("Could not find import block");
  }
}

const oldBlock = `      if (result.success) {
        showToast('Pendaftaran Berhasil! Data Anda telah tersimpan.', 'success');
        
        // Reset Form
        setFormData({
          jalurPendaftaran: 'Reguler',
          namaLengkap: '',
          nisn: '',
          tempatLahir: '',
          tanggalLahir: '',
          jenisKelamin: 'Laki-laki',
          agama: 'Islam',
          asalSekolah: '',
          alamatSekolahAsal: '',
          npsnSekolahAsal: '',
          namaAyah: '',
          pekerjaanAyah: '',
          namaIbu: '',
          pekerjaanIbu: '',
          nomorWaAyah: '',
          nomorWaIbu: '',
          alamatLengkap: '',
          desa: '',
          kecamatan: '',
          kabupaten: '',
          prestasi: ''
        });
        setFileKk(null);
        if (fileKkRef.current) fileKkRef.current.value = '';

      } else {`;

const newBlock = `      if (result.success) {
        if (result.id) {
          Swal.fire({
            title: 'Pendaftaran Berhasil!',
            text: 'Data Anda telah tersimpan. Klik tombol di bawah ini untuk mencetak atau mengunduh Kartu Pendaftaran.',
            icon: 'success',
            confirmButtonText: 'Tampilkan Kartu',
            confirmButtonColor: '#0ea5e9'
          }).then(() => {
            router.push('/spmb/cetak/' + result.id);
          });
        } else {
          showToast('Pendaftaran Berhasil! Data Anda telah tersimpan.', 'success');
        }
        
        // Reset Form
        setFormData({
          jalurPendaftaran: 'Reguler',
          namaLengkap: '',
          nisn: '',
          tempatLahir: '',
          tanggalLahir: '',
          jenisKelamin: 'Laki-laki',
          agama: 'Islam',
          asalSekolah: '',
          alamatSekolahAsal: '',
          npsnSekolahAsal: '',
          namaAyah: '',
          pekerjaanAyah: '',
          namaIbu: '',
          pekerjaanIbu: '',
          nomorWaAyah: '',
          nomorWaIbu: '',
          alamatLengkap: '',
          desa: '',
          kecamatan: '',
          kabupaten: '',
          prestasi: ''
        });
        setFileKk(null);
        if (fileKkRef.current) fileKkRef.current.value = '';

      } else {`;

// Replace using regex just in case line endings differ
const regexBlock = /if\s*\(result\.success\)\s*\{\s*showToast\('Pendaftaran Berhasil! Data Anda telah tersimpan\.',\s*'success'\);\s*\/\/\s*Reset Form[\s\S]*?if\s*\(fileKkRef\.current\)\s*fileKkRef\.current\.value\s*=\s*'';\s*\}\s*else\s*\{/;

if (regexBlock.test(content)) {
  content = content.replace(regexBlock, newBlock);
  fs.writeFileSync('src/app/spmb/page.tsx', content);
  console.log("Success");
} else {
  console.log("Could not find block");
}
