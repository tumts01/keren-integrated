'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Swal from 'sweetalert2';
import styles from '../../Spmb.module.css';

export default function SpmbEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [sekolahRef, setSekolahRef] = useState<{nama: string, alamat: string, npsn?: string}[]>([]);

  const [formData, setFormData] = useState({
    jalurPendaftaran: 'Reguler',
    namaLengkap: '',
    nisn: '',
    tempatTanggalLahir: '',
    jenisKelamin: 'Laki-laki',
    agama: 'Islam',
    asalSekolah: '',
    npsnSekolahAsal: '',
    alamatSekolahAsal: '',
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

  useEffect(() => {
    // Check admin auth
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(userStr);
    if (user.role !== 'admin' && user.role !== 'Admin') {
      router.push('/dashboard');
      return;
    }

    fetch('/api/spmb/sekolah')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSekolahRef(data.data);
        }
      })
      .catch(err => console.error(err));

    fetchData();
  }, [id, router]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/spmb/${id}`);
      const result = await res.json();
      if (result.success && result.data) {
        const meta = result.data.metadata || {};
        setFormData({
          jalurPendaftaran: meta['Jalur Pendaftaran'] || 'Reguler',
          namaLengkap: meta['Nama Lengkap'] || '',
          nisn: meta['NISN'] || '',
          tempatTanggalLahir: meta['Tempat, Tanggal Lahir'] || '',
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
          prestasi: meta['Prestasi (Jika Ada)'] || ''
        });
      } else {
        Swal.fire('Error', 'Data SPMB tidak ditemukan', 'error').then(() => router.push('/spmb/rekap'));
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setFetching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'asalSekolah') {
        const match = sekolahRef.find(s => s.nama.toLowerCase() === value.toLowerCase());
        if (match) {
          updated.alamatSekolahAsal = match.alamat;
          if (match.npsn) updated.npsnSekolahAsal = match.npsn;
        }
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/spmb/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire('Berhasil', 'Data berhasil diupdate', 'success').then(() => router.push('/spmb/rekap'));
      } else {
        Swal.fire('Error', data.error, 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div style={{ padding: '40px', textAlign: 'center' }}>Memuat data...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Edit Data SPMB</h1>
            <p>Admin Mode - Update Data Pendaftar</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.formContainer}>
          {/* Jalur Pendaftaran */}
          <div className={styles.formSection}>
            <div className={styles.formGroup}>
              <label>Jalur Pendaftaran <span className={styles.required}>*</span></label>
              <select name="jalurPendaftaran" value={formData.jalurPendaftaran} onChange={handleInputChange} required>
                <option value="Reguler">Reguler</option>
                <option value="Prestasi">Prestasi</option>
                <option value="Afirmasi">Afirmasi (Keluarga Tidak Mampu)</option>
              </select>
            </div>
          </div>

          {/* Data Diri */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}><i className="fas fa-user"></i> Data Diri Calon Siswa</h3>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Nama Lengkap <span className={styles.required}>*</span></label>
                <input type="text" name="namaLengkap" placeholder="Contoh: Ahmad Budi Santoso" required value={formData.namaLengkap} onChange={handleInputChange} />
              </div>
              <div className={styles.formGroup}>
                <label>NISN <span className={styles.required}>*</span></label>
                <input type="text" name="nisn" placeholder="10 digit NISN" maxLength={10} required value={formData.nisn} onChange={handleInputChange} />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Tempat, Tanggal Lahir <span className={styles.required}>*</span></label>
                <input type="text" name="tempatTanggalLahir" placeholder="Contoh: Malang, 15 Agustus 2011" required value={formData.tempatTanggalLahir} onChange={handleInputChange} />
              </div>
              <div className={styles.formGroup}>
                <label>Jenis Kelamin <span className={styles.required}>*</span></label>
                <select name="jenisKelamin" required value={formData.jenisKelamin} onChange={handleInputChange}>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Agama <span className={styles.required}>*</span></label>
              <select name="agama" required value={formData.agama} onChange={handleInputChange}>
                <option value="Islam">Islam</option>
                <option value="Kristen">Kristen</option>
                <option value="Katolik">Katolik</option>
                <option value="Hindu">Hindu</option>
                <option value="Buddha">Buddha</option>
                <option value="Konghucu">Konghucu</option>
              </select>
            </div>
          </div>

          {/* Data Sekolah Asal */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}><i className="fas fa-school"></i> Data Sekolah Asal</h3>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Nama SD/MI Asal <span className={styles.required}>*</span></label>
                <input type="text" name="asalSekolah" placeholder="Contoh: SDN 1 Singosari" list="sekolahList" required value={formData.asalSekolah} onChange={handleInputChange} />
                <datalist id="sekolahList">
                  {sekolahRef.map((s, i) => <option key={i} value={s.nama} />)}
                </datalist>
              </div>
              <div className={styles.formGroup}>
                <label>NPSN SD/MI</label>
                <input type="text" name="npsnSekolahAsal" placeholder="Jika diketahui" value={formData.npsnSekolahAsal} onChange={handleInputChange} />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>Alamat Sekolah Asal <span className={styles.required}>*</span></label>
              <input type="text" name="alamatSekolahAsal" placeholder="Alamat SD/MI" required value={formData.alamatSekolahAsal} onChange={handleInputChange} />
            </div>
          </div>

          {/* Data Orang Tua */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}><i className="fas fa-users"></i> Data Orang Tua</h3>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Nama Ayah <span className={styles.required}>*</span></label>
                <input type="text" name="namaAyah" required value={formData.namaAyah} onChange={handleInputChange} />
              </div>
              <div className={styles.formGroup}>
                <label>Pekerjaan Ayah <span className={styles.required}>*</span></label>
                <input type="text" name="pekerjaanAyah" required value={formData.pekerjaanAyah} onChange={handleInputChange} />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Nama Ibu <span className={styles.required}>*</span></label>
                <input type="text" name="namaIbu" required value={formData.namaIbu} onChange={handleInputChange} />
              </div>
              <div className={styles.formGroup}>
                <label>Pekerjaan Ibu <span className={styles.required}>*</span></label>
                <input type="text" name="pekerjaanIbu" required value={formData.pekerjaanIbu} onChange={handleInputChange} />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>No. WA Ayah (Aktif)</label>
                <input type="tel" name="nomorWaAyah" placeholder="08..." value={formData.nomorWaAyah} onChange={handleInputChange} />
              </div>
              <div className={styles.formGroup}>
                <label>No. WA Ibu (Aktif)</label>
                <input type="tel" name="nomorWaIbu" placeholder="08..." value={formData.nomorWaIbu} onChange={handleInputChange} />
              </div>
            </div>
          </div>

          {/* Alamat Rumah */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}><i className="fas fa-home"></i> Alamat Rumah Calon Siswa</h3>
            <div className={styles.formGroup}>
              <label>Alamat Lengkap (Jalan/RT/RW) <span className={styles.required}>*</span></label>
              <textarea name="alamatLengkap" rows={2} required value={formData.alamatLengkap} onChange={handleInputChange}></textarea>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Desa/Kelurahan <span className={styles.required}>*</span></label>
                <input type="text" name="desa" required value={formData.desa} onChange={handleInputChange} />
              </div>
              <div className={styles.formGroup}>
                <label>Kecamatan <span className={styles.required}>*</span></label>
                <input type="text" name="kecamatan" required value={formData.kecamatan} onChange={handleInputChange} />
              </div>
              <div className={styles.formGroup}>
                <label>Kabupaten/Kota <span className={styles.required}>*</span></label>
                <input type="text" name="kabupaten" required value={formData.kabupaten} onChange={handleInputChange} />
              </div>
            </div>
          </div>

          {/* Prestasi */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}><i className="fas fa-trophy"></i> Prestasi (Opsional)</h3>
            <div className={styles.formGroup}>
              <label>Sebutkan Prestasi Akademik / Non Akademik</label>
              <textarea name="prestasi" rows={2} placeholder="Misal: Juara 1 Lomba Pidato Tingkat Kabupaten" value={formData.prestasi} onChange={handleInputChange}></textarea>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
            <button type="button" onClick={() => router.push('/spmb/rekap')} className={styles.btnSubmit} style={{ background: '#64748b', flex: 1 }}>
              Batal
            </button>
            <button type="submit" disabled={loading} className={styles.btnSubmit} style={{ flex: 2 }}>
              {loading ? 'Menyimpan...' : <><i className="fas fa-save"></i> Simpan Perubahan</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
