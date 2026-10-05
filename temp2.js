const fs = require('fs');
const path = 'D:/keren-integrated/src/app/spmb/edit/[id]/page.tsx';
let code = fs.readFileSync(path, 'utf8');

const strUseEffectStart = \  useEffect(() => {\n    fetch('/api/spmb/sekolah')\;
const strUseEffectEnd = \prestasi: ''\n  });\;

const newCode1 = \  useEffect(() => {
    // Check admin
    const userStr = localStorage.getItem('keren_user_data');
    if (!userStr) {
      router.push('/portal/login');
      return;
    }
    const user = JSON.parse(userStr);
    if (user.role?.toLowerCase() !== 'admin') {
      router.push('/portal/dashboard');
      return;
    }

    fetch('/api/spmb/sekolah')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSekolahRef(data.data);
        }
      })
      .catch(err => console.error('Gagal memuat referensi sekolah', err));

    fetch(\/api/spmb/\\)
      .then(res => res.json())
      .then(resData => {
        if (resData.success && resData.data) {
          const meta = resData.data.metadata || {};
          let ttl = meta['Tempat, Tanggal Lahir'] || '';
          let tLahir = '';
          let dLahir = '';
          if (ttl.includes(', ')) {
            const parts = ttl.split(', ');
            tLahir = parts[0];
            dLahir = parts[1];
          }

          setFormData(prev => ({
            ...prev,
            jalurPendaftaran: meta['Jalur Pendaftaran'] || 'Reguler',
            namaLengkap: meta['Nama Lengkap'] || '',
            nisn: meta['NISN'] || '',
            tempatLahir: tLahir,
            tanggalLahir: dLahir,
            jenisKelamin: meta['Jenis Kelamin'] || 'Laki-laki',
            agama: meta['Agama'] || 'Islam',
            asalSekolah: meta['Asal Sekolah'] || '',
            npsnSekolahAsal: meta['NPSN SD/MI'] || '',
            alamatSekolahAsal: meta['Alamat Sekolah Asal'] || '',
            namaAyah: meta['Nama Ayah'] || '',
            pekerjaanAyah: meta['Pekerjaan Ayah'] || '',
            namaIbu: meta['Nama Ibu'] || '',
            pekerjaanIbu: meta['Pekerjaan Ibu'] || '',
            nomorWaAyah: meta['Nomor WA Ayah'] || '',
            nomorWaIbu: meta['Nomor WA Ibu'] || '',
            alamatLengkap: meta['Alamat (Jalan/RT/RW)'] || '',
            desa: meta['Desa/Kelurahan'] || '',
            kecamatan: meta['Kecamatan'] || '',
            kabupaten: meta['Kabupaten/Kota'] || '',
            prestasi: meta['Prestasi (Jika Ada)'] || '',
            linkKk: meta['File KK'] || '',
            linkAkta: meta['File Akta'] || ''
          }));
        }
      })
      .finally(() => setFetching(false));
  }, [id, router]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Form States
  const [formData, setFormData] = useState({
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
    prestasi: '',
    linkKk: '',
    linkAkta: ''
  });\

const startIdx = code.indexOf(strUseEffectStart);
const endIdx = code.indexOf(strUseEffectEnd) + strUseEffectEnd.length;
code = code.substring(0, startIdx) + newCode1 + code.substring(endIdx);


const strSubmitStart = \  const handleSubmit = async (e: React.FormEvent) => {\;
const strSubmitEnd = \  return (\n    <div className={styles.container}>\;
const newCode2 = \  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.namaLengkap) {
      showToast('Nama Lengkap wajib diisi terlebih dahulu!', 'error');
      return;
    }

    setLoading(true);
    try {
      const safeName = formData.namaLengkap.trim().replace(/\\s+/g, '_');
      let newLinkKk = formData.linkKk || '';
      let newLinkAkta = formData.linkAkta || '';
      
      if (fileKk) newLinkKk = await uploadToDrive(fileKk, \\\KK_\\\\);
      if (fileAkta) newLinkAkta = await uploadToDrive(fileAkta, \\\AKTA_\\\\);

      const tempatTanggalLahir = \\\\, \\\\;

      const dbPayload = {
        ...formData,
        tempatTanggalLahir,
        linkKk: newLinkKk,
        linkAkta: newLinkAkta
      };

      const res = await fetch(\\\/api/spmb/\\\\, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbPayload)
      });

      const result = await res.json();

      if (result.success) {
        showToast('Update Data SPMB Berhasil!', 'success');
        setTimeout(() => router.push('/spmb/rekap'), 1500);
      } else {
        showToast(\\\Gagal mengupdate: \\\\, 'error');
      }

    } catch (error: any) {
      showToast(error.message || 'Terjadi kesalahan sistem saat menyimpan.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div style={{ padding: '40px', textAlign: 'center' }}>Memuat data...</div>;

  return (
    <div className={styles.container}>\;

const sIdx = code.indexOf(strSubmitStart);
const eIdx = code.indexOf(strSubmitEnd) + strSubmitEnd.length;
code = code.substring(0, sIdx) + newCode2 + code.substring(eIdx);


// Replace Headers
code = code.replace("<h1>Pendaftaran SPMB Online</h1>", "<h1>Edit Data SPMB</h1>");
code = code.replace("<strong>Tahun Ajaran {spmbYear}</strong>", "<p>Admin Mode - Update Data Pendaftar</p>");
code = code.replace("<i className=\"fas fa-paper-plane\"></i> Kirim Pendaftaran SPMB", "<i className=\"fas fa-save\"></i> Simpan Perubahan");


const kkStrStart = \{/* KK Upload */}\;
const kkStrEnd = \              <div className={\\\\ \\\\} onClick={() => fileKkRef.current?.click()}>\;
const kkReplace = \{/* KK Upload */}
              {formData.linkKk && !fileKk && (
                <div style={{ padding: '12px', background: '#eef2ff', borderRadius: '12px', gridColumn: '1 / -1', fontSize: '0.9rem', marginBottom: '12px' }}>
                  <strong>File Kartu Keluarga (KK) Saat Ini:</strong><br/>
                  <a href={formData.linkKk} target="_blank" rel="noreferrer" style={{ color: '#4f46e5', textDecoration: 'underline' }}>Lihat File KK Tersimpan</a>
                </div>
              )}
              <div className={\\\\ \\\\} onClick={() => fileKkRef.current?.click()}>\;
code = code.replace(kkStrStart + '\\n' + kkStrEnd, kkReplace);

const aktaStrStart = \{/* Akta Upload */}\;
const aktaStrEnd = \              <div className={\\\\ \\\\} onClick={() => fileAktaRef.current?.click()}>\;
const aktaReplace = \{/* Akta Upload */}
              {formData.linkAkta && !fileAkta && (
                <div style={{ padding: '12px', background: '#eef2ff', borderRadius: '12px', gridColumn: '1 / -1', fontSize: '0.9rem', marginBottom: '12px' }}>
                  <strong>File Akta Kelahiran Saat Ini:</strong><br/>
                  <a href={formData.linkAkta} target="_blank" rel="noreferrer" style={{ color: '#4f46e5', textDecoration: 'underline' }}>Lihat File Akta Tersimpan</a>
                </div>
              )}
              <div className={\\\\ \\\\} onClick={() => fileAktaRef.current?.click()}>\;
code = code.replace(aktaStrStart + '\\n' + aktaStrEnd, aktaReplace);

fs.writeFileSync(path, code);
