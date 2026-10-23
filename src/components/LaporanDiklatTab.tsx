'use client';
import { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import InlineLoading from '@/components/InlineLoading';
import styles from './LaporanDiklat.module.css';
import { exportDiklatToDocx } from '@/lib/export-diklat-docx';

export interface LaporanDiklat {
  id: number;
  created_at?: string;
  namaGuru: string;
  jabatan: string;
  namaKegiatan: string;
  tempat: string;
  tanggal: string;
  tanggalSelesai?: string;
  lama: string;
  penyelenggara: string;
  tujuanSingkat?: string;
  noSuratTugas?: string;
  fileSuratTugas?: string;
  noSertifikat?: string;
  fileSertifikat?: string;
  tujuan: string;
  isi: string;
  tindakLanjut: string;
  dampak: string;
  dokumentasi?: string[];
}

interface Guru {
  nama: string;
  jabatan: string;
}

const compressImage = async (file: File): Promise<File> => {
  if (!file.type.startsWith('image/')) return file;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 1200;
        if (width > height && width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const ext = file.name.split('.').pop() || 'jpg';
                const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_') + '.' + ext;
                resolve(new File([blob], cleanName, { type: 'image/jpeg' }));
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.75
          );
        } else {
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
      img.src = event.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

export default function LaporanDiklatTab() {
  const [data, setData] = useState<LaporanDiklat[]>([]);
  const [gurus, setGurus] = useState<Guru[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGuru, setFilterGuru] = useState('semua');
  const [filterBulan, setFilterBulan] = useState('semua');

  // Detail Modal
  const [selectedItem, setSelectedItem] = useState<LaporanDiklat | null>(null);
  const [detailTab, setDetailTab] = useState<'dokumen' | 'lampiran'>('dokumen');

  // Form Modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    namaGuru: '',
    jabatan: '',
    namaKegiatan: '',
    tempat: '',
    tanggal: new Date().toISOString().split('T')[0],
    tanggalSelesai: '',
    lama: '',
    penyelenggara: '',
    tujuanSingkat: '',
    noSuratTugas: '',
    fileSuratTugas: '',
    noSertifikat: '',
    fileSertifikat: '',
    tujuan: '',
    isi: '',
    tindakLanjut: '',
    dampak: '',
    dokumentasi: [] as string[]
  });

  const [fileSuratTugasObj, setFileSuratTugasObj] = useState<File | null>(null);
  const [fileSertifikatObj, setFileSertifikatObj] = useState<File | null>(null);
  const [newFotoFiles, setNewFotoFiles] = useState<File[]>([]);
  const [fotoPreviews, setFotoPreviews] = useState<string[]>([]);

  const suratTugasInputRef = useRef<HTMLInputElement>(null);
  const sertifikatInputRef = useRef<HTMLInputElement>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
    fetchGurus();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/laporan-diklat');
      const json = await res.json();
      if (json.success) {
        setData(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching laporan diklat:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGurus = async () => {
    try {
      const res = await fetch('/api/guru');
      const json = await res.json();
      if (json.success && json.data) {
        const mapped = json.data.map((g: any) => ({
          nama: g.nama || '',
          jabatan: g.jabatan || 'Guru'
        })).filter((g: any) => g.nama);
        setGurus(mapped);
      }
    } catch (err) {
      console.error('Error fetching gurus:', err);
    }
  };

  // Autocomplete guru change (aman untuk guru yang memiliki gelar ganda / koma)
  const handleGuruChange = (nama: string) => {
    const clean = nama.trim().toLowerCase();
    const selected = gurus.find(g => {
      const gNama = g.nama.trim().toLowerCase();
      return (
        gNama === clean ||
        gNama.replace(/,/g, '') === clean.replace(/,/g, '') ||
        gNama.includes(clean) ||
        clean.includes(gNama)
      );
    });
    setFormData(prev => ({
      ...prev,
      namaGuru: nama,
      jabatan: selected?.jabatan || prev.jabatan || 'Guru'
    }));
  };

  // Upload single file helper dengan kompresi otomatis & perlindungan batas ukuran
  const uploadFile = async (file: File): Promise<string> => {
    let processFile = file;
    // Kompresi jika file adalah gambar (surat tugas / sertifikat / foto)
    if (file.type.startsWith('image/')) {
      try {
        processFile = await compressImage(file);
      } catch (e) {
        console.warn('Compress fallback to original:', e);
      }
    }

    if (processFile.size > 4.5 * 1024 * 1024) {
      throw new Error(`Ukuran berkas "${file.name}" (${(processFile.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas upload maksimal 4 MB.`);
    }

    const fd = new FormData();
    fd.append('file', processFile);

    let res: Response;
    try {
      res = await fetch('/api/laporan-diklat/upload', {
        method: 'POST',
        body: fd
      });
    } catch (netErr: any) {
      throw new Error(`Koneksi gagal saat mengunggah "${file.name}". Pastikan koneksi stabil.`);
    }

    if (!res.ok) {
      if (res.status === 413) {
        throw new Error(`Berkas "${file.name}" terlalu besar untuk diunggah (maksimal 4 MB).`);
      }
      const text = await res.text();
      let errorMsg = `Gagal mengunggah berkas (${res.status})`;
      try {
        const j = JSON.parse(text);
        if (j.error) errorMsg = j.error;
      } catch {}
      throw new Error(errorMsg);
    }

    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Gagal mengunggah berkas');
    return json.url || '';
  };

  const handleOpenAdd = () => {
    setEditId(null);
    setFormData({
      namaGuru: '',
      jabatan: '',
      namaKegiatan: '',
      tempat: '',
      tanggal: new Date().toISOString().split('T')[0],
      tanggalSelesai: '',
      lama: '',
      penyelenggara: '',
      tujuanSingkat: '',
      noSuratTugas: '',
      fileSuratTugas: '',
      noSertifikat: '',
      fileSertifikat: '',
      tujuan: '',
      isi: '',
      tindakLanjut: '',
      dampak: '',
      dokumentasi: []
    });
    setFileSuratTugasObj(null);
    setFileSertifikatObj(null);
    setNewFotoFiles([]);
    setFotoPreviews([]);
    setShowFormModal(true);
  };

  const handleOpenEdit = (item: LaporanDiklat) => {
    setEditId(item.id);
    setFormData({
      namaGuru: item.namaGuru || '',
      jabatan: item.jabatan || '',
      namaKegiatan: item.namaKegiatan || '',
      tempat: item.tempat || '',
      tanggal: item.tanggal || '',
      tanggalSelesai: item.tanggalSelesai || '',
      lama: item.lama || '',
      penyelenggara: item.penyelenggara || '',
      tujuanSingkat: item.tujuanSingkat || '',
      noSuratTugas: item.noSuratTugas || '',
      fileSuratTugas: item.fileSuratTugas || '',
      noSertifikat: item.noSertifikat || '',
      fileSertifikat: item.fileSertifikat || '',
      tujuan: item.tujuan || '',
      isi: item.isi || '',
      tindakLanjut: item.tindakLanjut || '',
      dampak: item.dampak || '',
      dokumentasi: item.dokumentasi || []
    });
    setFileSuratTugasObj(null);
    setFileSertifikatObj(null);
    setNewFotoFiles([]);
    setFotoPreviews([]);
    setShowFormModal(true);
  };

  const handleNewFotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const compressedList: File[] = [];
    const previewList: string[] = [];

    for (const f of files) {
      if (f.type.startsWith('image/')) {
        const comp = await compressImage(f);
        compressedList.push(comp);
        previewList.push(URL.createObjectURL(comp));
      } else {
        compressedList.push(f);
        previewList.push(URL.createObjectURL(f));
      }
    }

    setNewFotoFiles(prev => [...prev, ...compressedList]);
    setFotoPreviews(prev => [...prev, ...previewList]);
  };

  const handleRemoveExistingFoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      dokumentasi: prev.dokumentasi.filter((_, i) => i !== index)
    }));
  };

  const handleRemoveNewFoto = (index: number) => {
    setNewFotoFiles(prev => prev.filter((_, i) => i !== index));
    setFotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaGuru.trim() || !formData.namaKegiatan.trim() || !formData.tanggal) {
      Swal.fire('Data Belum Lengkap', 'Nama Guru, Nama Kegiatan, dan Tanggal wajib diisi.', 'warning');
      return;
    }

    setIsSubmitting(true);
    Swal.fire({
      title: 'Menyimpan Laporan...',
      text: 'Sedang memproses data dan berkas lampiran.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      let finalSuratTugasUrl = formData.fileSuratTugas;
      let finalSertifikatUrl = formData.fileSertifikat;
      let uploadedFotos: string[] = [...formData.dokumentasi];

      // Upload Surat Tugas jika ada
      if (fileSuratTugasObj) {
        finalSuratTugasUrl = await uploadFile(fileSuratTugasObj);
      }

      // Upload Sertifikat jika ada
      if (fileSertifikatObj) {
        finalSertifikatUrl = await uploadFile(fileSertifikatObj);
      }

      // Upload Foto Dokumentasi jika ada
      if (newFotoFiles.length > 0) {
        for (const file of newFotoFiles) {
          const url = await uploadFile(file);
          if (url) uploadedFotos.push(url);
        }
      }

      const payload = {
        ...(editId ? { id: editId } : {}),
        namaGuru: formData.namaGuru.trim(),
        jabatan: formData.jabatan.trim(),
        namaKegiatan: formData.namaKegiatan.trim(),
        tempat: formData.tempat.trim(),
        tanggal: formData.tanggal,
        tanggalSelesai: formData.tanggalSelesai,
        lama: formData.lama.trim(),
        penyelenggara: formData.penyelenggara.trim(),
        tujuanSingkat: formData.tujuanSingkat.trim(),
        noSuratTugas: formData.noSuratTugas.trim(),
        fileSuratTugas: finalSuratTugasUrl,
        noSertifikat: formData.noSertifikat.trim(),
        fileSertifikat: finalSertifikatUrl,
        tujuan: formData.tujuan.trim(),
        isi: formData.isi.trim(),
        tindakLanjut: formData.tindakLanjut.trim(),
        dampak: formData.dampak.trim(),
        dokumentasi: uploadedFotos
      };

      let res: Response;
      try {
        res = await fetch('/api/laporan-diklat', {
          method: editId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (netErr: any) {
        throw new Error('Gagal terhubung ke server saat menyimpan data laporan. Silakan periksa koneksi internet Anda.');
      }

      if (!res.ok) {
        const text = await res.text();
        let errMsg = `Server error (${res.status})`;
        try {
          const j = JSON.parse(text);
          if (j.error) errMsg = j.error;
        } catch {}
        throw new Error(errMsg);
      }

      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Gagal menyimpan laporan diklat');

      Swal.fire({
        icon: 'success',
        title: 'Berhasil Disimpan!',
        text: editId ? 'Laporan diklat berhasil diperbarui.' : 'Laporan diklat baru berhasil disimpan.',
        timer: 1800,
        showConfirmButton: false
      });

      setShowFormModal(false);
      fetchData();
    } catch (err: any) {
      console.error('Error saving laporan diklat:', err);
      Swal.fire('Gagal Menyimpan', err.message || 'Terjadi kesalahan sistem', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item: LaporanDiklat) => {
    const confirm = await Swal.fire({
      title: 'Hapus Laporan Diklat?',
      html: `Apakah Anda yakin ingin menghapus laporan <b>${item.namaKegiatan}</b> oleh <b>${item.namaGuru}</b>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });

    if (confirm.isConfirmed) {
      try {
        Swal.fire({ title: 'Menghapus...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const res = await fetch(`/api/laporan-diklat?id=${item.id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          Swal.fire({
            icon: 'success',
            title: 'Terhapus',
            text: 'Laporan diklat telah dihapus.',
            timer: 1500,
            showConfirmButton: false
          });
          if (selectedItem?.id === item.id) setSelectedItem(null);
          fetchData();
        } else {
          Swal.fire('Gagal', json.error || 'Gagal menghapus data', 'error');
        }
      } catch (err) {
        Swal.fire('Error', 'Gagal menghubungi server', 'error');
      }
    }
  };

  const handleExportWord = async (item: LaporanDiklat) => {
    try {
      Swal.fire({
        title: 'Menyiapkan File Word...',
        text: 'Mengonversi format sesuai template resmi MTs Almaarif 01.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });
      await exportDiklatToDocx({
        namaGuru: item.namaGuru,
        jabatan: item.jabatan,
        namaKegiatan: item.namaKegiatan,
        tempat: item.tempat,
        tanggal: item.tanggalSelesai ? `${item.tanggal} s.d. ${item.tanggalSelesai}` : item.tanggal,
        lama: item.lama,
        penyelenggara: item.penyelenggara,
        tujuanSingkat: item.tujuanSingkat,
        noSuratTugas: item.noSuratTugas,
        noSertifikat: item.noSertifikat,
        tujuan: item.tujuan,
        isi: item.isi,
        tindakLanjut: item.tindakLanjut,
        dampak: item.dampak
      });
      Swal.close();
    } catch (err) {
      console.error('Word export error:', err);
      Swal.fire('Gagal Export', 'Gagal membuat dokumen Word: ' + String(err), 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter calculations
  const filteredData = data.filter(item => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchNama = (item.namaGuru || '').toLowerCase().includes(q);
      const matchKegiatan = (item.namaKegiatan || '').toLowerCase().includes(q);
      const matchTempat = (item.tempat || '').toLowerCase().includes(q);
      const matchPenyelenggara = (item.penyelenggara || '').toLowerCase().includes(q);
      if (!matchNama && !matchKegiatan && !matchTempat && !matchPenyelenggara) return false;
    }

    if (filterGuru !== 'semua' && item.namaGuru !== filterGuru) {
      return false;
    }

    if (filterBulan !== 'semua') {
      const itemMonth = (item.tanggal || '').slice(5, 7);
      if (itemMonth !== filterBulan) return false;
    }

    return true;
  });

  // Stats
  const totalLaporan = data.length;
  const uniqueGurus = new Set(data.map(d => d.namaGuru).filter(Boolean)).size;

  return (
    <div className={styles.container}>
      {/* Stat Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#ecfdf5', color: '#047857' }}>
            <i className="fas fa-certificate"></i>
          </div>
          <div className={styles.statInfo}>
            <h4>Total Diklat / Workshop</h4>
            <div className={styles.statNumber}>{totalLaporan} Kegiatan</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#eff6ff', color: '#1d4ed8' }}>
            <i className="fas fa-chalkboard-teacher"></i>
          </div>
          <div className={styles.statInfo}>
            <h4>Guru Mengikuti</h4>
            <div className={styles.statNumber}>{uniqueGurus} Guru / GTK</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fef3c7', color: '#b45309' }}>
            <i className="fas fa-file-signature"></i>
          </div>
          <div className={styles.statInfo}>
            <h4>Format Dokumen</h4>
            <div className={styles.statNumber} style={{ fontSize: '1.05rem', marginTop: '6px' }}>
              Standard Word (.docx) &amp; PDF
            </div>
          </div>
        </div>
      </div>

      {/* Top Controls / Filter Bar */}
      <div className={styles.topActions}>
        <div className={styles.filterGroup}>
          <div style={{ position: 'relative' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem' }}></i>
            <input
              type="text"
              placeholder="Cari guru, kegiatan, tempat..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <select
            value={filterGuru}
            onChange={e => setFilterGuru(e.target.value)}
            className={styles.selectInput}
          >
            <option value="semua">Semua Guru ({gurus.length})</option>
            {gurus.map((g, i) => (
              <option key={i} value={g.nama}>{g.nama}</option>
            ))}
          </select>

          <select
            value={filterBulan}
            onChange={e => setFilterBulan(e.target.value)}
            className={styles.selectInput}
          >
            <option value="semua">Semua Bulan</option>
            <option value="01">Januari</option>
            <option value="02">Februari</option>
            <option value="03">Maret</option>
            <option value="04">April</option>
            <option value="05">Mei</option>
            <option value="06">Juni</option>
            <option value="07">Juli</option>
            <option value="08">Agustus</option>
            <option value="09">September</option>
            <option value="10">Oktober</option>
            <option value="11">November</option>
            <option value="12">Desember</option>
          </select>

          {(searchTerm || filterGuru !== 'semua' || filterBulan !== 'semua') && (
            <button
              onClick={() => { setSearchTerm(''); setFilterGuru('semua'); setFilterBulan('semua'); }}
              className={styles.btnReset}
              title="Reset Filter"
            >
              <i className="fas fa-undo"></i> Reset
            </button>
          )}
        </div>

        <button onClick={handleOpenAdd} className={styles.btnPrimary}>
          <i className="fas fa-plus-circle"></i> Buat Laporan Diklat
        </button>
      </div>

      {/* Table List */}
      <div className={styles.cardTable}>
        {loading ? (
          <InlineLoading message="Memuat data Laporan Diklat..." />
        ) : filteredData.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
            <i className="fas fa-folder-open" style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '14px' }}></i>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: '#1e293b' }}>Belum Ada Laporan Diklat</h4>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              {searchTerm || filterGuru !== 'semua' || filterBulan !== 'semua'
                ? 'Tidak ada data yang cocok dengan filter yang dipilih.'
                : 'Klik tombol "+ Buat Laporan Diklat" di atas untuk menambahkan laporan kegiatan pertama Anda.'}
            </p>
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>No</th>
                  <th>Waktu &amp; Durasi</th>
                  <th>Nama Guru &amp; Jabatan</th>
                  <th>Nama Kegiatan &amp; Penyelenggara</th>
                  <th>Kelengkapan Berkas</th>
                  <th style={{ textAlign: 'center', minWidth: '220px' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, idx) => (
                  <tr key={item.id}>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b' }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>
                        {item.tanggal}
                        {item.tanggalSelesai && ` s.d. ${item.tanggalSelesai}`}
                      </div>
                      {item.lama && (
                        <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: '2px', fontWeight: 600 }}>
                          <i className="fas fa-clock" style={{ marginRight: '4px' }}></i>{item.lama}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.namaGuru}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{item.jabatan || 'Guru'}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.namaKegiatan}</div>
                      <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '2px' }}>
                        <i className="fas fa-map-marker-alt" style={{ marginRight: '4px', color: '#ef4444' }}></i>
                        {item.tempat || '-'} &bull; {item.penyelenggara || '-'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {item.fileSuratTugas ? (
                          <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                            <i className="fas fa-check-circle"></i> Surat Tugas
                          </span>
                        ) : (
                          <span className={`${styles.badge} ${styles.badgeGray}`}>
                            <i className="fas fa-minus-circle"></i> Surat Tugas
                          </span>
                        )}

                        {item.fileSertifikat ? (
                          <span className={`${styles.badge} ${styles.badgeInfo}`}>
                            <i className="fas fa-award"></i> Sertifikat
                          </span>
                        ) : (
                          <span className={`${styles.badge} ${styles.badgeGray}`}>
                            <i className="fas fa-minus-circle"></i> Sertifikat
                          </span>
                        )}

                        {item.dokumentasi && item.dokumentasi.length > 0 && (
                          <span className={`${styles.badge} ${styles.badgeWarning}`}>
                            <i className="fas fa-images"></i> {item.dokumentasi.length} Foto
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className={styles.actionGroup} style={{ justifyContent: 'center' }}>
                        <button
                          onClick={() => { setSelectedItem(item); setDetailTab('dokumen'); }}
                          className={`${styles.btnAction} ${styles.btnActionView}`}
                          title="Lihat Detail & Dokumen"
                        >
                          <i className="fas fa-eye"></i> Detail
                        </button>

                        <button
                          onClick={() => handleExportWord(item)}
                          className={`${styles.btnAction} ${styles.btnActionWord}`}
                          title="Unduh File Word (.docx) Resmi"
                        >
                          <i className="fas fa-file-word"></i> Word
                        </button>

                        <button
                          onClick={() => handleOpenEdit(item)}
                          className={`${styles.btnAction} ${styles.btnActionEdit}`}
                          title="Edit Laporan"
                        >
                          <i className="fas fa-edit"></i>
                        </button>

                        <button
                          onClick={() => handleDelete(item)}
                          className={`${styles.btnAction} ${styles.btnActionDelete}`}
                          title="Hapus Laporan"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detail & Print */}
      {selectedItem && (
        <div className={styles.modalOverlay} onClick={() => setSelectedItem(null)}>
          <div className={styles.modalBox} style={{ maxWidth: '850px' }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <i className="fas fa-file-alt" style={{ color: '#059669' }}></i>
                <span>Laporan Hasil Workshop / Diklat</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setDetailTab(prev => prev === 'dokumen' ? 'lampiran' : 'dokumen')}
                  className={styles.btnAction}
                  style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1' }}
                >
                  <i className={`fas ${detailTab === 'dokumen' ? 'fa-paperclip' : 'fa-file-alt'}`}></i>
                  {detailTab === 'dokumen' ? 'Lihat Lampiran & Foto' : 'Lihat Format Dokumen'}
                </button>

                <button
                  type="button"
                  onClick={() => handleExportWord(selectedItem)}
                  className={`${styles.btnAction} ${styles.btnActionWord}`}
                >
                  <i className="fas fa-file-word"></i> Unduh Word
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className={`${styles.btnAction} ${styles.btnActionView}`}
                >
                  <i className="fas fa-print"></i> Cetak / PDF
                </button>

                <button className={styles.modalClose} onClick={() => setSelectedItem(null)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            <div className={styles.modalBody}>
              {detailTab === 'dokumen' ? (
                /* Format Dokumen Resmi (Sesuai Word Template) */
                <div className={`${styles.documentSheet} ${styles.printableArea}`} id="print-diklat">
                  {/* Kop Surat MTs */}
                  <img src="/kop_surat_mts.png" alt="Kop Surat MTs Almaarif 01" className={styles.docKop} />

                  <div className={styles.docTitle}>
                    LAPORAN<br />
                    HASIL WORKSHOP / DIKLAT
                  </div>

                  <table className={styles.docTable}>
                    <tbody>
                      <tr>
                        <td style={{ width: '25%', fontWeight: 'bold' }}>Nama</td>
                        <td style={{ width: '3%' }}>:</td>
                        <td style={{ width: '72%', fontWeight: 'bold' }}>{selectedItem.namaGuru}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 'bold' }}>Jabatan</td>
                        <td>:</td>
                        <td>{selectedItem.jabatan || '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 'bold' }}>Nama Kegiatan</td>
                        <td>:</td>
                        <td><strong>{selectedItem.namaKegiatan}</strong></td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 'bold' }}>Tempat</td>
                        <td>:</td>
                        <td>{selectedItem.tempat || '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 'bold' }}>Tanggal</td>
                        <td>:</td>
                        <td>
                          {selectedItem.tanggal}
                          {selectedItem.tanggalSelesai ? ` s.d. ${selectedItem.tanggalSelesai}` : ''}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 'bold' }}>Lama</td>
                        <td>:</td>
                        <td>{selectedItem.lama || '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 'bold' }}>Penyelenggara</td>
                        <td>:</td>
                        <td>{selectedItem.penyelenggara || '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 'bold' }}>Tujuan</td>
                        <td>:</td>
                        <td>{selectedItem.tujuanSingkat || selectedItem.tujuan || '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 'bold' }}>Surat Tugas</td>
                        <td>:</td>
                        <td>{selectedItem.noSuratTugas || '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 'bold' }}>Sertifikat</td>
                        <td>:</td>
                        <td>{selectedItem.noSertifikat || '-'}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className={styles.docSectionHeader}>URAIAN KEGIATAN</div>

                  <div className={styles.docHeading}>TUJUAN:</div>
                  <p className={styles.docParagraph}>{selectedItem.tujuan || '-'}</p>

                  <div className={styles.docHeading}>ISI MATERI / KEGIATAN:</div>
                  <p className={styles.docParagraph} style={{ whiteSpace: 'pre-line' }}>{selectedItem.isi || '-'}</p>

                  <div className={styles.docHeading}>TINDAK LANJUT WORKSHOP:</div>
                  <p className={styles.docParagraph} style={{ whiteSpace: 'pre-line' }}>{selectedItem.tindakLanjut || '-'}</p>

                  <div className={styles.docHeading}>DAMPAK WORKSHOP:</div>
                  <p className={styles.docParagraph} style={{ whiteSpace: 'pre-line' }}>{selectedItem.dampak || '-'}</p>

                  {/* Tanda Tangan */}
                  <div className={styles.docSignatureGrid}>
                    <div className={styles.docSignatureBox}>
                      <p style={{ margin: 0 }}>Mengetahui,</p>
                      <p style={{ margin: '0 0 70px 0' }}>Kepala MTs Almaarif 01 Singosari</p>
                      <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>Dwi Retno Palupi, M.Pd.</p>
                    </div>

                    <div className={styles.docSignatureBox}>
                      <p style={{ margin: 0 }}>Singosari, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      <p style={{ margin: '0 0 70px 0' }}>Guru yang Melaporkan,</p>
                      <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>{selectedItem.namaGuru}</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Tab Lampiran */
                <div>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#1e293b' }}>Lampiran Berkas &amp; Sertifikat</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    {/* Surat Tugas Card */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a', marginBottom: '6px' }}>
                        <i className="fas fa-file-contract" style={{ color: '#059669', marginRight: '6px' }}></i> Surat Tugas
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '12px' }}>
                        Nomor: {selectedItem.noSuratTugas || '-'}
                      </div>
                      {selectedItem.fileSuratTugas ? (
                        <a
                          href={selectedItem.fileSuratTugas}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${styles.btnAction} ${styles.btnActionView}`}
                        >
                          <i className="fas fa-external-link-alt"></i> Buka File Surat Tugas
                        </a>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>Tidak ada file dilampirkan</span>
                      )}
                    </div>

                    {/* Sertifikat Card */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a', marginBottom: '6px' }}>
                        <i className="fas fa-award" style={{ color: '#1d4ed8', marginRight: '6px' }}></i> Sertifikat Diklat
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '12px' }}>
                        Nomor: {selectedItem.noSertifikat || '-'}
                      </div>
                      {selectedItem.fileSertifikat ? (
                        <a
                          href={selectedItem.fileSertifikat}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${styles.btnAction} ${styles.btnActionWord}`}
                        >
                          <i className="fas fa-external-link-alt"></i> Buka File Sertifikat
                        </a>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>Tidak ada file dilampirkan</span>
                      )}
                    </div>
                  </div>

                  <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#1e293b' }}>
                    Dokumentasi Foto Kegiatan ({selectedItem.dokumentasi?.length || 0})
                  </h4>

                  {selectedItem.dokumentasi && selectedItem.dokumentasi.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                      {selectedItem.dokumentasi.map((imgUrl, i) => (
                        <a
                          key={i}
                          href={imgUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'block',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            border: '1px solid #e2e8f0',
                            height: '160px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                          }}
                        >
                          <img
                            src={imgUrl.includes('drive.google.com') ? `https://drive.google.com/thumbnail?id=${(imgUrl.match(/\/d\/([\w-]+)/) || [])[1]}&sz=w600` : imgUrl}
                            alt={`Dokumentasi ${i + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                      Belum ada foto dokumentasi yang diunggah.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Tambah / Edit */}
      {showFormModal && (
        <div className={styles.modalOverlay} onClick={() => !isSubmitting && setShowFormModal(false)}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSubmit} className={styles.modalForm}>
              <div className={styles.modalHeader}>
                <div className={styles.modalTitle}>
                  <i className={`fas ${editId ? 'fa-edit' : 'fa-plus-circle'}`} style={{ color: '#059669' }}></i>
                  <span>{editId ? 'Edit Laporan Diklat' : 'Formulir Laporan Diklat Baru'}</span>
                </div>
                <button
                  type="button"
                  className={styles.modalClose}
                  onClick={() => !isSubmitting && setShowFormModal(false)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className={styles.modalBody}>
                {/* Bagian 1: Identitas Peserta & Kegiatan */}
                <div className={styles.formSection}>
                  <div className={styles.formSectionTitle}>
                    <i className="fas fa-user-tie" style={{ color: '#059669' }}></i>
                    <span>1. Identitas Peserta &amp; Kegiatan</span>
                  </div>

                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Nama Guru / Peserta *</label>
                      <input
                        list="list-gurus"
                        type="text"
                        placeholder="Pilih atau ketik nama guru..."
                        value={formData.namaGuru}
                        onChange={e => handleGuruChange(e.target.value)}
                        className={styles.formInput}
                        required
                      />
                      <datalist id="list-gurus">
                        {gurus.map((g, i) => (
                          <option key={i} value={g.nama}>{g.jabatan}</option>
                        ))}
                      </datalist>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Jabatan Guru *</label>
                      <input
                        type="text"
                        placeholder="Contoh: Guru Bahasa Arab / Waka Kurikulum"
                        value={formData.jabatan}
                        onChange={e => setFormData({ ...formData, jabatan: e.target.value })}
                        className={styles.formInput}
                        required
                      />
                    </div>

                    <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                      <label className={styles.formLabel}>Nama Kegiatan Diklat / Workshop *</label>
                      <input
                        type="text"
                        placeholder="Contoh: Bimbingan Teknis Implementasi Kurikulum Merdeka Jenjang MTs"
                        value={formData.namaKegiatan}
                        onChange={e => setFormData({ ...formData, namaKegiatan: e.target.value })}
                        className={styles.formInput}
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Tempat Pelaksanaan *</label>
                      <input
                        type="text"
                        placeholder="Contoh: Balai Diklat Keagamaan Surabaya / Daring Zoom"
                        value={formData.tempat}
                        onChange={e => setFormData({ ...formData, tempat: e.target.value })}
                        className={styles.formInput}
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Penyelenggara *</label>
                      <input
                        type="text"
                        placeholder="Contoh: BDK Surabaya / Kemenag Kab. Malang"
                        value={formData.penyelenggara}
                        onChange={e => setFormData({ ...formData, penyelenggara: e.target.value })}
                        className={styles.formInput}
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Tanggal Mulai *</label>
                      <input
                        type="date"
                        value={formData.tanggal}
                        onChange={e => setFormData({ ...formData, tanggal: e.target.value })}
                        className={styles.formInput}
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Tanggal Selesai (Opsional)</label>
                      <input
                        type="date"
                        value={formData.tanggalSelesai}
                        onChange={e => setFormData({ ...formData, tanggalSelesai: e.target.value })}
                        className={styles.formInput}
                      />
                    </div>

                    <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                      <label className={styles.formLabel}>Lama Kegiatan</label>
                      <input
                        type="text"
                        placeholder="Contoh: 3 Hari (32 JP) / 40 Jam Pelajaran"
                        value={formData.lama}
                        onChange={e => setFormData({ ...formData, lama: e.target.value })}
                        className={styles.formInput}
                      />
                    </div>
                  </div>
                </div>

                {/* Bagian 2: Surat Tugas & Sertifikat */}
                <div className={styles.formSection}>
                  <div className={styles.formSectionTitle}>
                    <i className="fas fa-file-contract" style={{ color: '#0284c7' }}></i>
                    <span>2. Dokumen Administrasi (Surat Tugas &amp; Sertifikat)</span>
                  </div>

                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Nomor Surat Tugas</label>
                      <input
                        type="text"
                        placeholder="Nomor surat tugas jika ada..."
                        value={formData.noSuratTugas}
                        onChange={e => setFormData({ ...formData, noSuratTugas: e.target.value })}
                        className={styles.formInput}
                      />
                      <input
                        type="file"
                        ref={suratTugasInputRef}
                        accept=".pdf,image/*,.doc,.docx"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file && file.size > 4.5 * 1024 * 1024 && !file.type.startsWith('image/')) {
                            Swal.fire('Ukuran File Terlalu Besar', `File "${file.name}" berukuran ${(file.size / (1024 * 1024)).toFixed(1)} MB (maksimal 4 MB). Mohon gunakan file PDF yang telah dikompresi.`, 'warning');
                            if (suratTugasInputRef.current) suratTugasInputRef.current.value = '';
                            setFileSuratTugasObj(null);
                            return;
                          }
                          setFileSuratTugasObj(file || null);
                        }}
                        style={{ marginTop: '4px', fontSize: '0.8rem' }}
                      />
                      {formData.fileSuratTugas && !fileSuratTugasObj && (
                        <span className={styles.formHelper}>File tersimpan: <a href={formData.fileSuratTugas} target="_blank" rel="noreferrer">Lihat Berkas</a></span>
                      )}
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Nomor Sertifikat</label>
                      <input
                        type="text"
                        placeholder="Nomor sertifikat jika ada..."
                        value={formData.noSertifikat}
                        onChange={e => setFormData({ ...formData, noSertifikat: e.target.value })}
                        className={styles.formInput}
                      />
                      <input
                        type="file"
                        ref={sertifikatInputRef}
                        accept=".pdf,image/*,.doc,.docx"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file && file.size > 4.5 * 1024 * 1024 && !file.type.startsWith('image/')) {
                            Swal.fire('Ukuran File Terlalu Besar', `File "${file.name}" berukuran ${(file.size / (1024 * 1024)).toFixed(1)} MB (maksimal 4 MB). Mohon gunakan file PDF yang telah dikompresi.`, 'warning');
                            if (sertifikatInputRef.current) sertifikatInputRef.current.value = '';
                            setFileSertifikatObj(null);
                            return;
                          }
                          setFileSertifikatObj(file || null);
                        }}
                        style={{ marginTop: '4px', fontSize: '0.8rem' }}
                      />
                      {formData.fileSertifikat && !fileSertifikatObj && (
                        <span className={styles.formHelper}>File tersimpan: <a href={formData.fileSertifikat} target="_blank" rel="noreferrer">Lihat Berkas</a></span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bagian 3: Uraian Kegiatan (Format Word docx) */}
                <div className={styles.formSection}>
                  <div className={styles.formSectionTitle}>
                    <i className="fas fa-list-ol" style={{ color: '#d97706' }}></i>
                    <span>3. Uraian Kegiatan (Format Laporan Resmi)</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>A. TUJUAN KEGIATAN</label>
                      <textarea
                        placeholder="Uraikan tujuan yang ingin dicapai melalui keikutsertaan dalam kegiatan diklat ini..."
                        value={formData.tujuan}
                        onChange={e => setFormData({ ...formData, tujuan: e.target.value })}
                        className={styles.formTextarea}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>B. ISI MATERI / KEGIATAN</label>
                      <textarea
                        placeholder="Tuliskan rangkuman pokok-pokok materi atau hasil pembelajaran yang didapatkan selama kegiatan..."
                        value={formData.isi}
                        onChange={e => setFormData({ ...formData, isi: e.target.value })}
                        className={styles.formTextarea}
                        style={{ minHeight: '120px' }}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>C. TINDAK LANJUT WORKSHOP</label>
                      <textarea
                        placeholder="Rencana aksi atau tindak lanjut yang akan diterapkan (misal: diseminasi ke MGMP madrasah, implementasi modul ajar di kelas, dll)..."
                        value={formData.tindakLanjut}
                        onChange={e => setFormData({ ...formData, tindakLanjut: e.target.value })}
                        className={styles.formTextarea}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>D. DAMPAK WORKSHOP</label>
                      <textarea
                        placeholder="Uraikan dampak positif workshop terhadap peningkatan kompetensi pribadi, kualitas pembelajaran siswa, dan kemajuan madrasah..."
                        value={formData.dampak}
                        onChange={e => setFormData({ ...formData, dampak: e.target.value })}
                        className={styles.formTextarea}
                      />
                    </div>
                  </div>
                </div>

                {/* Bagian 4: Dokumentasi Foto Kegiatan */}
                <div className={styles.formSection}>
                  <div className={styles.formSectionTitle}>
                    <i className="fas fa-camera" style={{ color: '#7c3aed' }}></i>
                    <span>4. Foto Dokumentasi Kegiatan</span>
                  </div>

                  <div className={styles.formGroup}>
                    <input
                      type="file"
                      ref={fotoInputRef}
                      accept="image/*"
                      multiple
                      onChange={handleNewFotos}
                      style={{ fontSize: '0.85rem' }}
                    />
                    <span className={styles.formHelper}>Dapat memilih beberapa foto sekaligus (otomatis dikompresi).</span>

                    {/* Gallery Previews */}
                    <div className={styles.photoGallery}>
                      {/* Existing Uploaded Photos */}
                      {formData.dokumentasi.map((url, i) => (
                        <div key={`exist-${i}`} className={styles.photoThumb}>
                          <img src={url} alt={`Foto ${i}`} />
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingFoto(i)}
                            className={styles.btnRemovePhoto}
                            title="Hapus foto"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      ))}

                      {/* New Chosen Photos Previews */}
                      {fotoPreviews.map((url, i) => (
                        <div key={`new-${i}`} className={styles.photoThumb} style={{ borderColor: '#059669' }}>
                          <img src={url} alt={`Preview ${i}`} />
                          <button
                            type="button"
                            onClick={() => handleRemoveNewFoto(i)}
                            className={styles.btnRemovePhoto}
                            title="Hapus foto baru"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className={styles.btnReset}
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={isSubmitting}
                >
                  <i className="fas fa-save"></i>
                  {isSubmitting ? 'Menyimpan...' : (editId ? 'Perbarui Laporan' : 'Simpan Laporan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
