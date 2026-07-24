'use client';
import { useState, useEffect, useRef } from 'react';
import styles from './Persuratan.module.css';
import * as XLSX from 'xlsx';

interface SuratKeluar {
  id: number;
  rowNumber: number;
  no: string;
  tanggal: string;
  namaSurat: string;
  yangDitugaskan: string;
  topik: string;
  pj: string;
  noSurat: string;
  fileScan: string;
  batasWaktu?: string;
}

interface SuratMasuk {
  id: number;
  rowNumber: number;
  tanggal: string;
  pengirim: string;
  noSurat: string;
  perihal: string;
  fileScan: string;
}

export default function PersuratanPage() {
  const [activeTab, setActiveTab] = useState<'keluar' | 'masuk' | 'tagihan' | 'tugas' | 'generate'>('keluar');
  const [dataKeluar, setDataKeluar] = useState<SuratKeluar[]>([]);
  const [dataMasuk, setDataMasuk] = useState<SuratMasuk[]>([]);
  const [topikList, setTopikList] = useState<string[]>([]);
  const [guruList, setGuruList] = useState<{ id: string, nama: string }[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal states
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [successNoSurat, setSuccessNoSurat] = useState<string | null>(null);
  const [uploadTarget, setUploadTarget] = useState<{ id: number, rowNumber: number, type: 'keluar' | 'masuk' } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom Toast State
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Form Generate States
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [formNamaSurat, setFormNamaSurat] = useState('');
  const [formSasaran, setFormSasaran] = useState<'Guru' | 'Siswa'>('Guru');
  const [formDitugaskan, setFormDitugaskan] = useState<string[]>([]);
  const [formTopik, setFormTopik] = useState('');
  const [formPj, setFormPj] = useState('');
  const [formBatasWaktu, setFormBatasWaktu] = useState('');
  const [generating, setGenerating] = useState(false);
  const [searchGuru, setSearchGuru] = useState('');
  const [searchPj, setSearchPj] = useState('');
  const [searchTopik, setSearchTopik] = useState('');

  // Generate Surat state
  const [generateJenis, setGenerateJenis] = useState('Surat Keterangan Aktif Siswa');
  const [generateNomor, setGenerateNomor] = useState('');
  const [generateSiswa, setGenerateSiswa] = useState<any>(null); // For Keterangan Aktif
  const [generateSiswaList, setGenerateSiswaList] = useState<any[]>([]); // For Permohonan Izin
  
  // New States for Surat Permohonan Izin
  const [generateTujuan, setGenerateTujuan] = useState('');
  const [generateKegiatan, setGenerateKegiatan] = useState('');
  const [generateKonteks, setGenerateKonteks] = useState('');
  const [generateHariTanggal, setGenerateHariTanggal] = useState('');
  const [generateWaktu, setGenerateWaktu] = useState('');
  const [generateTempat, setGenerateTempat] = useState('');
  const [generateHari, setGenerateHari] = useState('');
  const [generateTanggalPelaksanaan, setGenerateTanggalPelaksanaan] = useState('');
  const [generateAcara, setGenerateAcara] = useState('');
  
  // New States for Surat Tugas
  const [generateGuruTugas, setGenerateGuruTugas] = useState<{guru: any, tugas: string}[]>([]);
  const [searchGuruTerm, setSearchGuruTerm] = useState('');
  const [guruOptions, setGuruOptions] = useState<any[]>([]);
  const [isSearchingGuru, setIsSearchingGuru] = useState(false);
  const [showGuruDropdown, setShowGuruDropdown] = useState(false);

  const [generateTanggal, setGenerateTanggal] = useState(
    new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
  );

  // Riwayat cetak
  const [riwayatCetak, setRiwayatCetak] = useState<any[]>([]);
  const [showRiwayat, setShowRiwayat] = useState(true);
  const [searchRiwayat, setSearchRiwayat] = useState('');
  
  const [searchSiswaTerm, setSearchSiswaTerm] = useState('');
  const [siswaOptions, setSiswaOptions] = useState<any[]>([]);
  const [isSearchingSiswa, setIsSearchingSiswa] = useState(false);
  const [showSiswaDropdown, setShowSiswaDropdown] = useState(false);

  // Debounced search for Siswa
  useEffect(() => {
    if (!searchSiswaTerm || searchSiswaTerm.length < 3 || (generateSiswa && generateSiswa.nama === searchSiswaTerm)) {
      setSiswaOptions([]);
      setShowSiswaDropdown(false);
      return;
    }

    const searchSiswa = async () => {
      setIsSearchingSiswa(true);
      try {
        const res = await fetch('/api/siswa');
        const json = await res.json();
        if (json.success) {
          const latestStudents = json.data.filter((s: any) => s.isLatest);
          const filtered = latestStudents.filter((s: any) => 
            s.nama.toLowerCase().includes(searchSiswaTerm.toLowerCase())
          ).slice(0, 50); // Max 50 results
          setSiswaOptions(filtered);
          setShowSiswaDropdown(true);
        }
      } catch (error) {
        console.error('Error searching siswa:', error);
      } finally {
        setIsSearchingSiswa(false);
      }
    };

    const delay = setTimeout(searchSiswa, 500);
    return () => clearTimeout(delay);
  }, [searchSiswaTerm, generateSiswa]);

  // Debounced search for Guru in Surat Tugas
  useEffect(() => {
    if (!searchGuruTerm || searchGuruTerm.length < 3) {
      setGuruOptions([]);
      setShowGuruDropdown(false);
      return;
    }

    const searchGuruAction = async () => {
      setIsSearchingGuru(true);
      try {
        const filtered = guruList.filter((g: any) => 
          g.nama.toLowerCase().includes(searchGuruTerm.toLowerCase())
        ).slice(0, 50);
        
        if ("nama terlampir".includes(searchGuruTerm.toLowerCase())) {
          filtered.push({ id: 'terlampir', nama: 'Nama Terlampir' });
        }
        setGuruOptions(filtered);
        setShowGuruDropdown(true);
      } catch (error) {
        console.error('Error searching guru:', error);
      } finally {
        setIsSearchingGuru(false);
      }
    };

    const delay = setTimeout(searchGuruAction, 500);
    return () => clearTimeout(delay);
  }, [searchGuruTerm, guruList]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resPersuratan, resGuru] = await Promise.all([
        fetch('/api/persuratan'),
        fetch('/api/guru')
      ]);
      const result = await resPersuratan.json();
      const guruResult = await resGuru.json();

      if (result.success) {
        const sortedKeluar = result.suratKeluar.sort((a: any, b: any) => b.rowNumber - a.rowNumber);
        const sortedMasuk = result.suratMasuk.sort((a: any, b: any) => b.rowNumber - a.rowNumber);
        setDataKeluar(sortedKeluar);
        setDataMasuk(sortedMasuk);
        setTopikList(result.topikList);
        // Load riwayat dari API (cross-device)
        if (result.riwayatCetak) setRiwayatCetak(result.riwayatCetak);
      } else {
        setError(result.error);
      }

      if (guruResult.success) {
        setGuruList(guruResult.data);
      }
    } catch (err) {
      setError('Gagal memuat data persuratan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const repopulateForm = (record: any) => {
    setGenerateJenis(record.jenis);
    setGenerateNomor(record.nomor);
    setGenerateTanggal(record.tanggal);
    setGenerateSiswa(record.siswa || null);
    setSearchSiswaTerm(record.siswa?.nama || '');
    setGenerateSiswaList(record.siswaList || []);
    setGenerateGuruTugas(record.guruTugas || []);
    setGenerateTujuan(record.tujuan || '');
    setGenerateKegiatan(record.kegiatan || '');
    setGenerateKonteks(record.konteks || '');
    setGenerateHariTanggal(record.hariTanggal || '');
    setGenerateWaktu(record.waktu || '');
    setGenerateTempat(record.tempat || '');
    setGenerateHari(record.hari || '');
    setGenerateTanggalPelaksanaan(record.tanggalPelaksanaan || '');
    setGenerateAcara(record.acara || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveAndPrint = async () => {
    const record = {
      id: Date.now().toString(),
      jenis: generateJenis,
      nomor: generateNomor,
      tanggal: generateTanggal,
      tglCetak: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      siswa: generateSiswa,
      siswaList: generateSiswaList,
      guruTugas: generateGuruTugas,
      tujuan: generateTujuan,
      kegiatan: generateKegiatan,
      konteks: generateKonteks,
      hariTanggal: generateHariTanggal,
      waktu: generateWaktu,
      tempat: generateTempat,
      hari: generateHari,
      tanggalPelaksanaan: generateTanggalPelaksanaan,
      acara: generateAcara,
    };
    // Simpan ke Google Sheets (cross-device)
    fetch('/api/persuratan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_riwayat', payload: record }),
    }).then(() => fetchData()); // refresh riwayat setelah simpan
    window.print();
  };

  const handleGenerateSurat = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await fetch('/api/persuratan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          payload: {
            tanggal: formTanggal,
            namaSurat: formNamaSurat,
            yangDitugaskan: formSasaran === 'Siswa' ? 'Siswa' : formDitugaskan.join('; '),
            topik: formTopik,
            pj: formPj,
            batasWaktu: formBatasWaktu
          }
        })
      });
      const result = await res.json();
      if (result.success) {
        setShowGenerateModal(false);
        setSuccessNoSurat(result.noSurat);
        // Reset form
        setFormNamaSurat('');
        setFormSasaran('Guru');
        setFormDitugaskan([]);
        setFormTopik('');
        setFormPj('');
        setFormBatasWaktu('');
        setSearchGuru('');
        setSearchPj('');
        setSearchTopik('');
        // Refresh data
        fetchData();
      } else {
        showToast(`Gagal: ${result.error}`, 'error');
      }
    } catch (err) {
      showToast('Terjadi kesalahan saat membuat nomor surat.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleUploadClick = (id: number, rowNumber: number, type: 'keluar' | 'masuk') => {
    setUploadTarget({ id, rowNumber, type });
    setShowUploadModal(true);
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTarget) return;
    if (!fileInputRef.current?.files?.[0]) {
      showToast("Silakan pilih file terlebih dahulu", 'error');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', fileInputRef.current.files[0]);
    formData.append('rowNumber', String(uploadTarget.rowNumber));
    formData.append('type', uploadTarget.type);

    try {
      const res = await fetch('/api/persuratan/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (result.success) {
        showToast('File berhasil diarsipkan ke Google Drive!', 'success');
        setShowUploadModal(false);
        setUploadTarget(null);
        fetchData();
      } else {
        showToast(`Gagal upload: ${result.error}`, 'error');
      }
    } catch (error) {
      showToast('Terjadi kesalahan sistem saat upload file.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleExportExcel = () => {
    let dataToExport: any[] = [];
    if (activeTab === 'keluar' || activeTab === 'tagihan') {
      const source = activeTab === 'keluar' ? filteredKeluar : filteredTagihan;
      dataToExport = source.map(s => ({
        'No': s.no,
        'Tanggal': s.tanggal,
        'Nama Surat': s.namaSurat,
        'Yang Ditugaskan': s.yangDitugaskan,
        'Topik': s.topik,
        'Pembuat Surat': s.pj,
        'No Surat': s.noSurat,
        'Status Arsip': s.fileScan ? 'Diarsipkan' : 'Belum Diarsipkan'
      }));
    } else if (activeTab === 'masuk') {
      dataToExport = filteredMasuk.map(s => ({
        'Tanggal': s.tanggal,
        'Pengirim': s.pengirim,
        'No Surat': s.noSurat,
        'Perihal': s.perihal,
        'Status Arsip': s.fileScan ? 'Diarsipkan' : 'Belum Diarsipkan'
      }));
    } else if (activeTab === 'tugas') {
      dataToExport = filteredTugas.map(t => ({
        'Nama Guru': t.nama,
        'Total Penugasan': t.total,
        'Daftar Surat': t.surat.map(s => `${s.noSurat} - ${s.namaSurat}`).join(' || ')
      }));
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Data ${activeTab}`);
    XLSX.writeFile(workbook, `Data_Persuratan_${activeTab}_${new Date().getTime()}.xlsx`);
  };

  // Filter Data
  const filteredKeluar = dataKeluar.filter(s => 
    s.namaSurat.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.yangDitugaskan.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.noSurat.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.topik.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.pj || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMasuk = dataMasuk.filter(s => 
    s.perihal.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.pengirim.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.noSurat.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTagihan = filteredKeluar.filter(s => !s.fileScan);

  const tugasMap: Record<string, typeof filteredKeluar> = {};
  filteredKeluar.forEach(s => {
    if (s.yangDitugaskan) {
      const persons = s.yangDitugaskan.split(';').map(p => p.trim()).filter(Boolean).filter(p => p.toLowerCase() !== 'nama terlampir');
      persons.forEach(p => {
        if (!tugasMap[p]) tugasMap[p] = [];
        tugasMap[p].push(s);
      });
    }
  });
  
  const filteredTugas = Object.keys(tugasMap).map(nama => ({
    nama,
    total: tugasMap[nama].length,
    surat: tugasMap[nama]
  })).sort((a, b) => b.total - a.total);

  const getActiveDataLength = () => {
    if (activeTab === 'keluar') return filteredKeluar.length;
    if (activeTab === 'masuk') return filteredMasuk.length;
    if (activeTab === 'tagihan') return filteredTagihan.length;
    if (activeTab === 'tugas') return filteredTugas.length;
    return 0;
  };

  const activeDataLength = getActiveDataLength();
  const totalPages = Math.ceil(activeDataLength / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  
  const currentKeluar = filteredKeluar.slice(startIndex, startIndex + itemsPerPage);
  const currentMasuk = filteredMasuk.slice(startIndex, startIndex + itemsPerPage);
  const currentTagihan = filteredTagihan.slice(startIndex, startIndex + itemsPerPage);
  const currentTugas = filteredTugas.slice(startIndex, startIndex + itemsPerPage);

  // Statistics
  const totalKeluar = dataKeluar.length;
  const totalBelumArsipKeluar = dataKeluar.filter(s => !s.fileScan).length;
  
  // Calculate who has the most assignments (Rekap Guru Ditugaskan)
  const guruCounts: Record<string, number> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  dataKeluar.forEach(s => {
    if (s.yangDitugaskan) {
      let isExpired = false;
      if (s.batasWaktu) {
        const parts = s.batasWaktu.split('/'); // DD/MM/YYYY
        if (parts.length === 3) {
          const batasDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          if (batasDate < today) {
            isExpired = true;
          }
        }
      }

      if (!isExpired) {
        // Split by semicolon if multiple people
        const persons = s.yangDitugaskan.split(';').map(p => p.trim()).filter(Boolean).filter(p => p.toLowerCase() !== 'nama terlampir');
        persons.forEach(p => {
          guruCounts[p] = (guruCounts[p] || 0) + 1;
        });
      }
    }
  });
  const topGuru = Object.entries(guruCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  // Reset page when switching tabs or searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  return (
    <div className={styles.container}>
      {/* Toast Notification */}
      {toast && (
        <div className={styles.toastContainer}>
          <div className={`${styles.toast} ${styles[toast.type]}`}>
            <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} ${styles.toastIcon}`}></i>
            {toast.message}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className={styles.modalOverlay} onClick={() => !uploading && setShowUploadModal(false)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className={styles.modalHeader}>
              <h2><i className="fas fa-cloud-upload-alt"></i> Upload Arsip Surat</h2>
              <button className={styles.closeBtn} onClick={() => !uploading && setShowUploadModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className={styles.modalBody} style={{ display: 'block' }}>
              <p style={{ marginBottom: '20px', color: '#64748b', fontSize: '0.9rem' }}>
                Pilih file PDF, Excel, atau Gambar dari perangkat Anda. Sistem akan otomatis mengunggah file ini ke folder Google Drive Madrasah dan melampirkan tautannya.
              </p>
              <form onSubmit={handleFileUpload}>
                <div className={styles.infoGroup} style={{ marginBottom: '20px' }}>
                  <label className={styles.infoLabel}>Pilih File (PDF/Excel/Gambar)</label>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    accept=".pdf,image/*,.doc,.docx,.xls,.xlsx"
                    style={{ 
                      width: '100%', 
                      padding: '10px', 
                      border: '2px dashed #cbd5e1', 
                      borderRadius: '8px',
                      background: '#f8fafc',
                      cursor: 'pointer'
                    }}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn" style={{ background: '#f1f5f9', color: '#475569' }} onClick={() => setShowUploadModal(false)} disabled={uploading}>
                    Batal
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={uploading}>
                    {uploading ? <><i className="fas fa-spinner fa-spin"></i> Mengunggah...</> : <><i className="fas fa-upload"></i> Upload & Simpan</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Generate Nomor Surat Modal */}
      {showGenerateModal && (
        <div className={styles.modalOverlay} onClick={() => !generating && setShowGenerateModal(false)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2><i className="fas fa-magic"></i> Ambil Nomor Surat Baru</h2>
              <button className={styles.closeBtn} onClick={() => !generating && setShowGenerateModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className={styles.modalBody}>
              <form onSubmit={handleGenerateSurat}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className={styles.infoGroup}>
                    <label className={styles.infoLabel}>Tanggal</label>
                    <input type="date" className={styles.searchInput} value={formTanggal} onChange={e => setFormTanggal(e.target.value)} required />
                  </div>
                  <div className={styles.infoGroup}>
                    <label className={styles.infoLabel}>Tanggal Akhir Tugas</label>
                    <input 
                      type="date" 
                      className={styles.searchInput} 
                      value={formBatasWaktu} 
                      onChange={e => setFormBatasWaktu(e.target.value)} 
                    />
                  </div>
                  <div className={styles.infoGroup} style={{ position: 'relative' }}>
                    <label className={styles.infoLabel}>Topik (Kode Surat)</label>
                    <input 
                      type="text" 
                      className={styles.searchInput} 
                      value={formTopik} 
                      onChange={e => { setFormTopik(e.target.value); setSearchTopik(e.target.value); }} 
                      placeholder="Ketik topik surat..." 
                      required 
                    />
                    {searchTopik && topikList.filter(t => t.toLowerCase().includes(searchTopik.toLowerCase())).length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', maxHeight: '150px', overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        {topikList.filter(t => t.toLowerCase().includes(searchTopik.toLowerCase())).map((t, i) => (
                          <div key={i} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }} onClick={() => {
                            setFormTopik(t);
                            setSearchTopik('');
                          }}>
                            {t}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.infoGroup} style={{ marginBottom: '16px' }}>
                  <label className={styles.infoLabel}>Nama Surat / Perihal</label>
                  <input type="text" className={styles.searchInput} value={formNamaSurat} onChange={e => setFormNamaSurat(e.target.value)} placeholder="Contoh: Surat Edaran Kegiatan..." required />
                </div>
                <div className={styles.infoGroup} style={{ marginBottom: '16px' }}>
                  <label className={styles.infoLabel}>Sasaran Surat</label>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="radio" name="sasaran" value="Guru" checked={formSasaran === 'Guru'} onChange={() => setFormSasaran('Guru')} />
                      Surat untuk Guru / Staf
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="radio" name="sasaran" value="Siswa" checked={formSasaran === 'Siswa'} onChange={() => setFormSasaran('Siswa')} />
                      Surat untuk Siswa / Eksternal
                    </label>
                  </div>
                </div>
                {formSasaran === 'Guru' && (
                  <div className={styles.infoGroup} style={{ marginBottom: '16px', position: 'relative' }}>
                    <label className={styles.infoLabel} style={{ marginBottom: '4px' }}>Yang Ditugaskan / Kepada</label>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px', textTransform: 'none', letterSpacing: 'normal' }}>(Ketik "Terlampir" jika delegasi lebih dari 10 orang)</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: formDitugaskan.length > 0 ? '8px' : '0', border: '1px solid #cbd5e1', borderRadius: '8px', minHeight: '42px', alignItems: 'center' }}>
                      {formDitugaskan.map((guru, idx) => (
                        <span key={idx} style={{ background: 'var(--primary)', color: 'white', padding: '4px 10px', borderRadius: '16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {guru}
                          <i className="fas fa-times" style={{ cursor: 'pointer' }} onClick={() => setFormDitugaskan(prev => prev.filter(g => g !== guru))}></i>
                        </span>
                      ))}
                      <input 
                        type="text" 
                        style={{ border: 'none', outline: 'none', flex: 1, minWidth: '150px', padding: formDitugaskan.length > 0 ? '4px' : '10px' }} 
                        value={searchGuru} 
                        onChange={e => setSearchGuru(e.target.value)} 
                        placeholder={formDitugaskan.length === 0 ? "Ketik nama guru..." : ""}
                      />
                    </div>
                    {searchGuru && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', maxHeight: '150px', overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        {[...guruList, { id: 'terlampir', nama: 'Nama Terlampir' }].filter(g => g.nama.toLowerCase().includes(searchGuru.toLowerCase()) && !formDitugaskan.includes(g.nama)).map(g => (
                          <div key={g.id} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }} onClick={() => {
                            if (g.id === 'terlampir') {
                              setFormDitugaskan(['Nama Terlampir']);
                            } else {
                              setFormDitugaskan(prev => {
                                const prevFiltered = prev.filter(p => p !== 'Nama Terlampir');
                                return [...prevFiltered, g.nama];
                              });
                            }
                            setSearchGuru('');
                          }}>
                            {g.nama}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className={styles.infoGroup} style={{ marginBottom: '24px', position: 'relative' }}>
                  <label className={styles.infoLabel}>Nama Pembuat Surat</label>
                  <input 
                    type="text" 
                    className={styles.searchInput} 
                    value={formPj} 
                    onChange={e => { setFormPj(e.target.value); setSearchPj(e.target.value); }} 
                    placeholder="Contoh: Ahmad, S.Pd" 
                    required 
                  />
                  {searchPj && guruList.filter(g => g.nama.toLowerCase().includes(searchPj.toLowerCase())).length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', maxHeight: '150px', overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                      {guruList.filter(g => g.nama.toLowerCase().includes(searchPj.toLowerCase())).map(g => (
                        <div key={g.id} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }} onClick={() => {
                          setFormPj(g.nama);
                          setSearchPj('');
                        }}>
                          {g.nama}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                  <button type="button" className="btn" style={{ background: '#f1f5f9', color: '#475569' }} onClick={() => setShowGenerateModal(false)} disabled={generating}>
                    Batal
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={generating}>
                    {generating ? <><i className="fas fa-spinner fa-spin"></i> Memproses...</> : <><i className="fas fa-bolt"></i> Generate Nomor Surat</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className={styles.stickyTop}>
        <div className={styles.header}>
          <div className={styles.title}>
            <div className={styles.titleIcon}>
              <i className="fas fa-envelope-open-text"></i>
            </div>
            Sistem Persuratan Digital
          </div>
          
          <div className={styles.actions}>
            <div className={styles.searchBox}>
              <i className={`fas fa-search ${styles.searchIcon}`}></i>
              <input 
                type="text" 
                placeholder="Cari surat, perihal, atau nama..." 
                className={styles.searchInput}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={handleExportExcel} className="btn btn-gold" style={{ marginRight: '8px' }}>
              <i className="fas fa-file-excel"></i> Export Excel
            </button>
            {activeTab === 'keluar' && (
              <button className="btn btn-primary" onClick={() => setShowGenerateModal(true)}>
                <i className="fas fa-plus"></i> Ambil Nomor Surat
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', padding: '0 24px', background: 'white', borderBottom: '1px solid #e2e8f0', overflowX: 'auto' }}>
          <button 
            style={{ padding: '16px 24px', border: 'none', background: 'transparent', fontWeight: 600, fontSize: '0.95rem', color: activeTab === 'keluar' ? 'var(--primary)' : '#64748b', borderBottom: activeTab === 'keluar' ? '3px solid var(--primary)' : '3px solid transparent', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
            onClick={() => setActiveTab('keluar')}
          >
            <i className="fas fa-paper-plane" style={{ marginRight: '8px' }}></i> Surat Keluar
          </button>
          <button 
            style={{ padding: '16px 24px', border: 'none', background: 'transparent', fontWeight: 600, fontSize: '0.95rem', color: activeTab === 'masuk' ? 'var(--primary)' : '#64748b', borderBottom: activeTab === 'masuk' ? '3px solid var(--primary)' : '3px solid transparent', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
            onClick={() => setActiveTab('masuk')}
          >
            <i className="fas fa-inbox" style={{ marginRight: '8px' }}></i> Surat Masuk
          </button>
          <button 
            style={{ padding: '16px 24px', border: 'none', background: 'transparent', fontWeight: 600, fontSize: '0.95rem', color: activeTab === 'tagihan' ? '#ef4444' : '#64748b', borderBottom: activeTab === 'tagihan' ? '3px solid #ef4444' : '3px solid transparent', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
            onClick={() => setActiveTab('tagihan')}
          >
            <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i> Tagihan Arsip
          </button>
          <button 
            style={{ padding: '16px 24px', border: 'none', background: 'transparent', fontWeight: 600, fontSize: '0.95rem', color: activeTab === 'tugas' ? '#10b981' : '#64748b', borderBottom: activeTab === 'tugas' ? '3px solid #10b981' : '3px solid transparent', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
            onClick={() => setActiveTab('tugas')}
          >
            <i className="fas fa-users-cog" style={{ marginRight: '8px' }}></i> Delegasi Tugas
          </button>
          <button 
            style={{ padding: '16px 24px', border: 'none', background: 'transparent', fontWeight: 600, fontSize: '0.95rem', color: activeTab === 'generate' ? '#8b5cf6' : '#64748b', borderBottom: activeTab === 'generate' ? '3px solid #8b5cf6' : '3px solid transparent', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
            onClick={() => setActiveTab('generate')}
          >
            <i className="fas fa-print" style={{ marginRight: '8px' }}></i> Generate Surat
          </button>
        </div>

        {/* Dashboard Analytics for Surat Keluar */}
        {!loading && !error && activeTab === 'keluar' && (
          <div className={styles.statsGrid} style={{ paddingTop: '20px', paddingBottom: '10px' }}>
            <div className={styles.statCard} style={{ borderLeftColor: '#3b82f6' }}>
              <div className={styles.statIcon} style={{ color: '#3b82f6', background: '#eff6ff' }}>
                <i className="fas fa-envelope"></i>
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>Total Surat Keluar</span>
                <span className={styles.statValue}>{totalKeluar}</span>
              </div>
            </div>
            <div className={styles.statCard} style={{ borderLeftColor: '#ef4444' }}>
              <div className={styles.statIcon} style={{ color: '#ef4444', background: '#fef2f2' }}>
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>Belum Diarsipkan</span>
                <span className={styles.statValue} style={{ color: '#ef4444' }}>{totalBelumArsipKeluar}</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Menunggu upload scan/PDF</span>
              </div>
            </div>
            <div className={styles.statCard} style={{ borderLeftColor: '#10b981' }}>
              <div className={styles.statIcon} style={{ color: '#10b981', background: '#dcfce7' }}>
                <i className="fas fa-award"></i>
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>Guru Paling Sering Ditugaskan</span>
                <div style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 500, marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {topGuru.length > 0 ? topGuru.map(([nama, count], idx) => (
                    <span key={idx}>🏆 {nama} <span style={{ color: '#64748b' }}>({count} tugas)</span></span>
                  )) : <span>Belum ada data tugas</span>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.card} style={{ marginTop: activeTab === 'masuk' ? '20px' : '0' }}>
        {loading ? (
          <div className={styles.loading}>
            <i className={`fas fa-circle-notch ${styles.spinner}`}></i>
            <p>Memuat Data Persuratan...</p>
          </div>
        ) : error ? (
          <div className={styles.loading} style={{ color: 'var(--danger)' }}>
            <i className="fas fa-exclamation-triangle" style={{ fontSize: '2rem' }}></i>
            <p>{error}</p>
          </div>
        ) : (
          <>
          {activeTab === 'generate' ? (
            <div className={styles.generateContainer} style={{ padding: '24px' }}>

              {/* Riwayat Cetak */}
              <div style={{ marginBottom: '28px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', cursor: 'pointer', background: '#f1f5f9', borderBottom: showRiwayat ? '1px solid #e2e8f0' : 'none' }}
                  onClick={() => setShowRiwayat(v => !v)}
                >
                  <span style={{ fontWeight: 700, color: '#334155', fontSize: '0.95rem' }}>
                    <i className="fas fa-history" style={{ marginRight: '8px', color: '#8b5cf6' }}></i>
                    Riwayat Cetak ({riwayatCetak.length})
                  </span>
                  <i className={`fas fa-chevron-${showRiwayat ? 'up' : 'down'}`} style={{ color: '#64748b' }}></i>
                </div>
                {showRiwayat && (
                  riwayatCetak.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                      <i className="fas fa-clock" style={{ fontSize: '1.8rem', display: 'block', marginBottom: '8px' }}></i>
                      Belum ada riwayat cetak. Setiap kali klik <strong>"Generate &amp; Cetak Surat"</strong>, rekaman akan muncul di sini.
                      <div style={{ fontSize: '0.78rem', marginTop: '6px', color: '#cbd5e1' }}>⚠️ Riwayat tersimpan di browser ini saja</div>
                    </div>
                  ) : (() => {
                    const q = searchRiwayat.toLowerCase().trim();
                    const filtered = q ? riwayatCetak.filter(r =>
                      (r.nomor || '').toLowerCase().includes(q) ||
                      (r.jenis || '').toLowerCase().includes(q) ||
                      (r.siswa?.nama || '').toLowerCase().includes(q) ||
                      (r.guruTugas || []).some((g: any) => (g.guru?.nama || '').toLowerCase().includes(q))
                    ) : riwayatCetak;
                    return (
                      <>
                        {/* Search Filter */}
                        <div style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', background: 'white' }}>
                          <div style={{ position: 'relative' }}>
                            <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem' }}></i>
                            <input
                              type="text"
                              placeholder="Cari nomor surat atau nama surat..."
                              value={searchRiwayat}
                              onChange={(e) => setSearchRiwayat(e.target.value)}
                              style={{
                                width: '100%', padding: '8px 12px 8px 34px', border: '1px solid #e2e8f0',
                                borderRadius: '8px', fontSize: '0.82rem', outline: 'none',
                                background: '#f8fafc', transition: 'border-color 0.2s', boxSizing: 'border-box'
                              }}
                              onFocus={(e) => e.currentTarget.style.borderColor = '#8b5cf6'}
                              onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                            />
                          </div>
                        </div>
                        {filtered.length === 0 ? (
                          <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                            <i className="fas fa-search" style={{ display: 'block', marginBottom: 6, fontSize: '1.2rem' }}></i>
                            Tidak ditemukan riwayat untuk "{searchRiwayat}"
                          </div>
                        ) : (
                          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                            {filtered.map((r, i) => (
                              <div key={r.id} style={{ padding: '12px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', marginBottom: '3px' }}>{r.nomor}</div>
                                  <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                                    <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', marginRight: '6px' }}>{r.jenis}</span>
                                    {r.siswa?.nama && <span style={{ marginRight: '4px' }}>• {r.siswa.nama}</span>}
                                    {r.siswaList?.length > 0 && <span style={{ marginRight: '4px' }}>• {r.siswaList.length} siswa</span>}
                                    {r.guruTugas?.length > 0 && <span style={{ marginRight: '4px' }}>• {r.guruTugas.map((g: any) => g.guru.nama).join(', ')}</span>}
                                  </div>
                                  <div style={{ fontSize: '0.73rem', color: '#94a3b8', marginTop: '3px' }}>Dicetak: {r.tglCetak}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                  <button
                                    className="btn"
                                    style={{ background: '#ede9fe', color: '#7c3aed', padding: '6px 12px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                                    onClick={() => repopulateForm(r)}
                                  >
                                    <i className="fas fa-redo"></i> Cetak Ulang
                                  </button>
                                  <button
                                    className="btn"
                                    style={{ background: '#fee2e2', color: '#ef4444', padding: '6px 10px', fontSize: '0.78rem' }}
                                    onClick={() => {
                                      const updated = riwayatCetak.filter(x => x.id !== r.id);
                                      setRiwayatCetak(updated);
                                      localStorage.setItem('keren_riwayat_cetak', JSON.stringify(updated));
                                    }}
                                    title="Hapus dari riwayat"
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()
                )}
              </div>

              <h3 style={{ marginBottom: '20px', color: '#1e293b' }}><i className="fas fa-print" style={{ marginRight: '8px' }}></i> Form Generate Surat</h3>
              
              <div style={{ display: 'grid', gap: '20px', maxWidth: '600px' }}>
                <div className={styles.infoGroup}>
                  <label style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Jenis Surat <span style={{ color: 'red' }}>*</span></label>
                  <select 
                    className={styles.searchInput} 
                    value={generateJenis}
                    onChange={(e) => {
                      setGenerateJenis(e.target.value);
                      setSearchSiswaTerm('');
                      setGenerateSiswa(null);
                      setGenerateSiswaList([]);
                      setGenerateGuruTugas([]);
                      setSearchGuruTerm('');
                      setGenerateHari('');
                      setGenerateTanggalPelaksanaan('');
                      setGenerateAcara('');
                    }}
                  >
                    <option value="Surat Keterangan Aktif Siswa">Surat Keterangan Aktif Siswa</option>
                    <option value="Surat Permohonan Izin">Surat Permohonan Izin</option>
                    <option value="Surat Tugas">Surat Tugas</option>
                    <option value="Surat Undangan GTK">Surat Undangan GTK</option>
                  </select>
                </div>

                {generateJenis === 'Surat Permohonan Izin' && (
                  <div className={styles.infoGroup}>
                    <label style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Tujuan Surat (Kepada Yth) <span style={{ color: 'red' }}>*</span></label>
                    <textarea 
                      className={styles.searchInput}
                      style={{ resize: 'vertical', minHeight: '80px', padding: '10px 14px' }}
                      placeholder="Contoh:&#10;Bapak Pengasuh PP. Al-Hikmah&#10;Bapak Pengasuh PP. An-Naslihah"
                      value={generateTujuan}
                      onChange={(e) => setGenerateTujuan(e.target.value)}
                    />
                  </div>
                )}

                <div className={styles.infoGroup}>
                  <label style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Nomor Surat <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="text" 
                    className={styles.searchInput}
                    placeholder={
                      generateJenis === 'Surat Keterangan Aktif Siswa' 
                        ? "Contoh: 115/YPA/MTs-01.A.1/VI/2026" 
                        : generateJenis === 'Surat Undangan GTK'
                        ? "Contoh: 329/YPA/MTs-01.P.8/VII/2026"
                        : "Contoh: 309/YPA/MTs-01.A.8/VII/2026"
                    }
                    value={generateNomor}
                    onChange={(e) => setGenerateNomor(e.target.value)}
                  />
                </div>

                {generateJenis === 'Surat Undangan GTK' && (
                  <>
                    <div className={styles.infoGroup}>
                      <label style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Hari <span style={{ color: 'red' }}>*</span></label>
                      <input 
                        type="text" 
                        className={styles.searchInput}
                        placeholder="Contoh: Jum'at"
                        value={generateHari}
                        onChange={(e) => setGenerateHari(e.target.value)}
                      />
                    </div>
                    <div className={styles.infoGroup}>
                      <label style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Tanggal Pelaksanaan <span style={{ color: 'red' }}>*</span></label>
                      <input 
                        type="text" 
                        className={styles.searchInput}
                        placeholder="Contoh: 24 Juli 2027"
                        value={generateTanggalPelaksanaan}
                        onChange={(e) => setGenerateTanggalPelaksanaan(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {(generateJenis === 'Surat Permohonan Izin' || generateJenis === 'Surat Tugas') && (
                  <>
                    <div className={styles.infoGroup}>
                      <label style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>{generateJenis === 'Surat Tugas' ? 'Konteks / Nama Tugas' : 'Konteks / Nama Kegiatan'} <span style={{ color: 'red' }}>*</span></label>
                      <input 
                        type="text" 
                        className={styles.searchInput}
                        placeholder={generateJenis === 'Surat Tugas' ? "Contoh: Bimtek Fasilitas Daerah satuan pendidikan ramah anak" : "Contoh: MATAMUDA Tahun Ajaran 2026/2027"}
                        value={generateKonteks}
                        onChange={(e) => setGenerateKonteks(e.target.value)}
                      />
                    </div>
                    {generateJenis === 'Surat Permohonan Izin' && (
                      <div className={styles.infoGroup}>
                        <label style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Kegiatan yang Diikuti <span style={{ color: 'red' }}>*</span></label>
                        <input 
                          type="text" 
                          className={styles.searchInput}
                          placeholder="Contoh: Latihan PBB dan Tampilan Matamuda"
                          value={generateKegiatan}
                          onChange={(e) => setGenerateKegiatan(e.target.value)}
                        />
                      </div>
                    )}
                    <div className={styles.infoGroup}>
                      <label style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Hari, Tanggal Pelaksanaan <span style={{ color: 'red' }}>*</span></label>
                      <input 
                        type="text" 
                        className={styles.searchInput}
                        placeholder={generateJenis === 'Surat Tugas' ? "Contoh: 30 Juni 2026 - 02 Juli 2026" : "Contoh: Selasa - Jumat, 14-17 Juli 2026"}
                        value={generateHariTanggal}
                        onChange={(e) => setGenerateHariTanggal(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {(generateJenis === 'Surat Permohonan Izin' || generateJenis === 'Surat Undangan GTK') && (
                  <div className={styles.infoGroup}>
                    <label style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Pukul <span style={{ color: 'red' }}>*</span></label>
                    <input 
                      type="text" 
                      className={styles.searchInput}
                      placeholder={generateJenis === 'Surat Undangan GTK' ? "Contoh: 13.00 - selesai" : "Contoh: Pukul 12.00 - 15.30 WIB"}
                      value={generateWaktu}
                      onChange={(e) => setGenerateWaktu(e.target.value)}
                    />
                  </div>
                )}

                {(generateJenis === 'Surat Permohonan Izin' || generateJenis === 'Surat Tugas' || generateJenis === 'Surat Undangan GTK') && (
                  <div className={styles.infoGroup}>
                    <label style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Tempat <span style={{ color: 'red' }}>*</span></label>
                    <input 
                      type="text" 
                      className={styles.searchInput}
                      placeholder="Contoh: Kantor MTs Almaarif 01 Singosari"
                      value={generateTempat}
                      onChange={(e) => setGenerateTempat(e.target.value)}
                    />
                  </div>
                )}

                {generateJenis === 'Surat Undangan GTK' && (
                  <div className={styles.infoGroup}>
                    <label style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Acara <span style={{ color: 'red' }}>*</span></label>
                    <input 
                      type="text" 
                      className={styles.searchInput}
                      placeholder="Contoh: Rapat Rutin Awal Tahun Ajaran Baru 2026/2027"
                      value={generateAcara}
                      onChange={(e) => setGenerateAcara(e.target.value)}
                    />
                  </div>
                )}

                {(generateJenis === 'Surat Keterangan Aktif Siswa' || generateJenis === 'Surat Permohonan Izin') && (
                  <div className={styles.infoGroup} style={{ position: 'relative' }}>
                    <label style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Pilih Siswa <span style={{ color: 'red' }}>*</span></label>
                  
                  {generateJenis === 'Surat Permohonan Izin' && generateSiswaList.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                      {generateSiswaList.map((siswa, idx) => (
                        <div key={siswa.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{idx + 1}. {siswa.nama}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{siswa.rombel} ({siswa.domisili})</div>
                          </div>
                          <button className="btn btn-sm btn-danger" onClick={() => setGenerateSiswaList(prev => prev.filter(s => s.id !== siswa.id))}>
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <input 
                    type="text" 
                    className={styles.searchInput}
                    placeholder={generateJenis === 'Surat Keterangan Aktif Siswa' ? "Ketik minimal 3 huruf nama siswa..." : "Cari dan klik siswa untuk ditambahkan..."}
                    value={searchSiswaTerm}
                    onChange={(e) => {
                      setSearchSiswaTerm(e.target.value);
                      if (generateJenis === 'Surat Keterangan Aktif Siswa' && (!generateSiswa || e.target.value !== generateSiswa.nama)) {
                        setGenerateSiswa(null);
                      }
                    }}
                  />
                  {isSearchingSiswa && (
                    <div style={{ position: 'absolute', right: '16px', top: (generateJenis === 'Surat Permohonan Izin' && generateSiswaList.length > 0) ? 'auto' : '38px', bottom: (generateJenis === 'Surat Permohonan Izin' && generateSiswaList.length > 0) ? '12px' : 'auto', color: '#64748b' }}>
                      <i className="fas fa-spinner fa-spin"></i>
                    </div>
                  )}
                  {showSiswaDropdown && siswaOptions.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', marginTop: '4px', zIndex: 10, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', maxHeight: '250px', overflowY: 'auto' }}>
                      {siswaOptions.map(siswa => (
                        <div 
                          key={siswa.id} 
                          style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                          onClick={() => {
                            if (generateJenis === 'Surat Keterangan Aktif Siswa') {
                              setGenerateSiswa(siswa);
                              setSearchSiswaTerm(siswa.nama);
                            } else {
                              if (!generateSiswaList.find(s => s.id === siswa.id)) {
                                setGenerateSiswaList(prev => [...prev, siswa]);
                              }
                              setSearchSiswaTerm('');
                            }
                            setShowSiswaDropdown(false);
                          }}
                        >
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{siswa.nama}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Kelas {siswa.rombel} • NIS: {siswa.nis} • {siswa.domisili}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  </div>
                )}

                {generateJenis === 'Surat Tugas' && (
                  <div className={styles.infoGroup} style={{ position: 'relative' }}>
                    <label style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem', display: 'block', marginBottom: '4px' }}>Pilih Guru yang Ditugaskan <span style={{ color: 'red' }}>*</span></label>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px' }}>(Ketik "Terlampir" jika delegasi lebih dari 10 orang)</div>
                    
                    {generateGuruTugas.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                        {generateGuruTugas.map((item, idx) => (
                          <div key={item.guru.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.guru.id === 'terlampir' ? item.guru.nama : `${idx + 1}. ${item.guru.nama}`}</div>
                              {item.guru.id !== 'terlampir' && (
                                <input 
                                  type="text"
                                  style={{ width: '100%', padding: '4px 8px', marginTop: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}
                                  placeholder="Tugas sebagai (contoh: Ketua/Perlengkapan/Dokumentasi)"
                                  value={item.tugas}
                                  onChange={(e) => {
                                    const newGuru = [...generateGuruTugas];
                                    newGuru[idx].tugas = e.target.value;
                                    setGenerateGuruTugas(newGuru);
                                  }}
                                />
                              )}
                            </div>
                            <button className="btn btn-sm btn-danger" onClick={() => setGenerateGuruTugas(prev => prev.filter((_, i) => i !== idx))}>
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {!generateGuruTugas.some(g => g.guru.id === 'terlampir') && (
                      <>
                        <input 
                          type="text" 
                          className={styles.searchInput}
                          placeholder="Cari dan klik guru untuk ditambahkan..."
                          value={searchGuruTerm}
                          onChange={(e) => setSearchGuruTerm(e.target.value)}
                        />
                        {isSearchingGuru && (
                          <div style={{ position: 'absolute', right: '16px', top: (generateGuruTugas.length > 0) ? 'auto' : '38px', bottom: (generateGuruTugas.length > 0) ? '12px' : 'auto', color: '#64748b' }}>
                            <i className="fas fa-spinner fa-spin"></i>
                          </div>
                        )}
                        {showGuruDropdown && guruOptions.length > 0 && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', marginTop: '4px', zIndex: 10, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', maxHeight: '250px', overflowY: 'auto' }}>
                            {guruOptions.map(guru => (
                              <div 
                                key={guru.id} 
                                style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                                onClick={() => {
                                  if (guru.id === 'terlampir') {
                                    setGenerateGuruTugas([{ guru: guru, tugas: '-' }]);
                                  } else if (!generateGuruTugas.find(g => g.guru.id === guru.id)) {
                                    setGenerateGuruTugas(prev => [...prev, { guru: guru, tugas: '' }]);
                                  }
                                  setSearchGuruTerm('');
                                  setShowGuruDropdown(false);
                                }}
                              >
                                <div style={{ fontWeight: 600, color: '#1e293b' }}>{guru.nama}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                <div className={styles.infoGroup}>
                  <label style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Tanggal Surat <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="text" 
                    className={styles.searchInput}
                    placeholder="Contoh: 17 Juli 2026"
                    value={generateTanggal}
                    onChange={(e) => setGenerateTanggal(e.target.value)}
                  />
                </div>

                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%', padding: '12px' }}
                    onClick={handleSaveAndPrint}
                    disabled={!generateNomor || !generateTanggal || (generateJenis === 'Surat Keterangan Aktif Siswa' ? !generateSiswa : (generateJenis === 'Surat Permohonan Izin' ? (generateSiswaList.length === 0 || !generateTujuan || !generateKegiatan || !generateKonteks) : (generateJenis === 'Surat Tugas' ? (generateGuruTugas.length === 0 || !generateKonteks || !generateHariTanggal || !generateTempat) : (!generateHari || !generateTanggalPelaksanaan || !generateWaktu || !generateTempat || !generateAcara))))}
                  >
                    <i className="fas fa-print"></i> Generate & Cetak Surat
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
              <thead>
                {activeTab === 'keluar' || activeTab === 'tagihan' ? (
                  <tr>
                    <th style={{ width: '60px', textAlign: 'center' }}>No</th>
                    <th>Tanggal</th>
                    <th>Nomor Surat</th>
                    <th>Nama Surat</th>
                    <th>Yang Ditugaskan</th>
                    <th>Topik</th>
                    <th>Pembuat Surat</th>
                    <th style={{ textAlign: 'center' }}>Status / Arsip</th>
                  </tr>
                ) : activeTab === 'masuk' ? (
                  <tr>
                    <th>Tanggal Masuk</th>
                    <th>Pengirim</th>
                    <th>Nomor Surat</th>
                    <th>Perihal</th>
                    <th style={{ textAlign: 'center' }}>Status / Arsip</th>
                  </tr>
                ) : (
                  <tr>
                    <th>Nama Guru</th>
                    <th style={{ textAlign: 'center' }}>Total Penugasan</th>
                    <th>Daftar Surat Tugas</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {activeTab === 'keluar' || activeTab === 'tagihan' ? (
                  (activeTab === 'keluar' ? currentKeluar : currentTagihan).length > 0 ? (
                    (activeTab === 'keluar' ? currentKeluar : currentTagihan).map(surat => (
                      <tr key={surat.id}>
                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{surat.no}</td>
                        <td>{surat.tanggal}</td>
                        <td><span style={{ fontWeight: 600, color: 'var(--primary)', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>{surat.noSurat || '-'}</span></td>
                        <td>{surat.namaSurat}</td>
                        <td>{surat.yangDitugaskan || '-'}</td>
                        <td><span className={styles.badge} style={{ background: '#e0e7ff', color: '#4338ca' }}>{surat.topik || '-'}</span></td>
                        <td>{surat.pj}</td>
                        <td style={{ textAlign: 'center' }}>
                          {surat.fileScan ? (
                            <a href={surat.fileScan} target="_blank" rel="noopener noreferrer" className="btn" style={{ background: '#dcfce7', color: '#16a34a', padding: '6px 12px', fontSize: '0.8rem' }}>
                              <i className="fas fa-file-pdf"></i> Buka Surat
                            </a>
                          ) : (
                            <button onClick={() => handleUploadClick(surat.id, surat.rowNumber, 'keluar')} className="btn" style={{ background: '#fee2e2', color: '#ef4444', padding: '6px 12px', fontSize: '0.8rem' }}>
                              <i className="fas fa-exclamation-circle"></i> Upload Arsip
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                        <i className="fas fa-check-circle" style={{ fontSize: '3rem', color: '#10b981', marginBottom: '16px', display: 'block' }}></i>
                        {activeTab === 'tagihan' ? 'Mantap! Semua surat sudah diarsipkan.' : 'Tidak ada surat keluar yang ditemukan.'}
                      </td>
                    </tr>
                  )
                ) : activeTab === 'masuk' ? (
                  currentMasuk.length > 0 ? (
                    currentMasuk.map(surat => (
                      <tr key={surat.id}>
                        <td>{surat.tanggal}</td>
                        <td style={{ fontWeight: 600 }}>{surat.pengirim}</td>
                        <td><span style={{ fontWeight: 600, color: 'var(--primary)', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>{surat.noSurat || '-'}</span></td>
                        <td>{surat.perihal}</td>
                        <td style={{ textAlign: 'center' }}>
                          {surat.fileScan ? (
                            <a href={surat.fileScan} target="_blank" rel="noopener noreferrer" className="btn" style={{ background: '#dcfce7', color: '#16a34a', padding: '6px 12px', fontSize: '0.8rem' }}>
                              <i className="fas fa-file-pdf"></i> Buka Surat
                            </a>
                          ) : (
                            <button onClick={() => handleUploadClick(surat.id, surat.rowNumber, 'masuk')} className="btn" style={{ background: '#fee2e2', color: '#ef4444', padding: '6px 12px', fontSize: '0.8rem' }}>
                              <i className="fas fa-exclamation-circle"></i> Upload Arsip
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>
                        <i className="fas fa-inbox" style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '16px', display: 'block' }}></i>
                        Tidak ada surat masuk yang ditemukan.
                      </td>
                    </tr>
                  )
                ) : (
                  currentTugas.length > 0 ? (
                    currentTugas.map((tugas, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#1e293b' }}>{tugas.nama}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ display: 'inline-block', background: 'var(--primary)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold' }}>
                            {tugas.total}
                          </span>
                        </td>
                        <td>
                          <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569', fontSize: '0.9rem' }}>
                            {tugas.surat.map(s => (
                              <li key={s.id} style={{ marginBottom: '4px' }}>
                                <strong>{s.noSurat || 'Belum ada nomor'}</strong> - {s.namaSurat} ({s.tanggal})
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '40px' }}>
                        <i className="fas fa-users" style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '16px', display: 'block' }}></i>
                        Belum ada data penugasan guru.
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <select 
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none', background: 'white', color: '#475569', cursor: 'pointer' }}
                >
                  <option value={10}>10 Baris</option>
                  <option value={25}>25 Baris</option>
                  <option value={50}>50 Baris</option>
                </select>
                <span>
                  Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, activeDataLength)} dari {activeDataLength} data
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1}
                  style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: currentPage === 1 ? '#f1f5f9' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: '#475569' }}
                >
                  Sebelumnya
                </button>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                  disabled={currentPage === totalPages}
                  style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: currentPage === totalPages ? '#f1f5f9' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: '#475569' }}
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
          </>
          )}
        </>
        )}

        {/* Print Template - Hidden on screen, shown on print */}
        {activeTab === 'generate' && ((generateJenis === 'Surat Keterangan Aktif Siswa' && generateSiswa) || (generateJenis === 'Surat Permohonan Izin' && generateSiswaList.length > 0) || (generateJenis === 'Surat Tugas' && generateGuruTugas.length > 0) || (generateJenis === 'Surat Undangan GTK' && generateNomor)) && (
          <div className={styles.printOnly}>
            <div className={styles.kopSurat}>
              <img src="/kop_surat_mts.png" alt="Kop Surat MTs Almaarif 01" />
            </div>

            {generateJenis === 'Surat Keterangan Aktif Siswa' ? (
              <>
                <div className={styles.suratJudul}>
                  <h3 style={{ textDecoration: 'underline', margin: '0 0 5px 0', fontSize: '14pt' }}>SURAT KETERANGAN</h3>
                  <p style={{ margin: 0 }}>{generateNomor || '.../YPA/MTs-01.A.1/VI/2026'}</p>
                </div>

                <div className={styles.suratIsi}>
                  <p>Yang bertanda tangan di bawah ini:</p>
                  
                  <table className={styles.suratTable}>
                    <tbody>
                      <tr><td style={{ width: '150px' }}>Nama</td><td style={{ width: '20px' }}>:</td><td><strong>DWI RETNO PALUPI, M.Pd.</strong></td></tr>
                      <tr><td>NIP</td><td>:</td><td>19770424 2005012003</td></tr>
                      <tr><td>Jabatan</td><td>:</td><td>Kepala Madrasah Tsanawiyah Almaarif 01 Singosari</td></tr>
                      <tr><td>Sekolah</td><td>:</td><td>MTs. Almaarif 01 Singosari</td></tr>
                      <tr><td>Alamat</td><td>:</td><td>Jl. Masjid No. 33 Singosari Malang</td></tr>
                    </tbody>
                  </table>

                  <p style={{ marginTop: '20px' }}>Menerangkan dengan sebenarnya:</p>

                  <table className={styles.suratTable}>
                    <tbody>
                      <tr><td style={{ width: '150px' }}>Nama</td><td style={{ width: '20px' }}>:</td><td><strong>{generateSiswa.nama}</strong></td></tr>
                      <tr><td>NIS</td><td>:</td><td>{generateSiswa.nis || '-'}</td></tr>
                      <tr><td>Kelas</td><td>:</td><td>{generateSiswa.rombel}</td></tr>
                      <tr><td>NISN</td><td>:</td><td><strong>{generateSiswa.nisn || '-'}</strong></td></tr>
                      <tr><td>TTL</td><td>:</td><td>{generateSiswa.tempatLahir}, {generateSiswa.tanggalLahir}</td></tr>
                      <tr><td>Nama Ayah</td><td>:</td><td>{generateSiswa.namaAyah}</td></tr>
                      <tr><td style={{ verticalAlign: 'top' }}>Alamat</td><td style={{ verticalAlign: 'top' }}>:</td><td>{generateSiswa.alamat}</td></tr>
                    </tbody>
                  </table>

                  <p style={{ marginTop: '20px', lineHeight: '1.5' }}>
                    Bahwa anak tersebut di atas adalah benar-benar Siswa Aktif MTs Almaarif 01 Singosari Malang pada Tahun Ajaran {generateSiswa.tahunAjaran}.
                  </p>

                  <p style={{ marginTop: '20px', lineHeight: '1.5' }}>
                    Demikian surat keterangan ini dibuat dengan sebenar-benarnya.<br/>
                    Atas perhatian Bapak/Ibu disampaikan terima kasih.
                  </p>
                </div>
              </>
            ) : generateJenis === 'Surat Permohonan Izin' ? (
              <>
                <div style={{ fontSize: '12pt', marginTop: '10px' }}>
                  <table style={{ border: 'none', borderCollapse: 'collapse', width: '100%', marginBottom: '15px' }}>
                    <tbody>
                      <tr><td style={{ width: '70px', padding: 0 }}>Nomor</td><td style={{ width: '15px', padding: 0 }}>:</td><td style={{ padding: 0 }}>{generateNomor}</td></tr>
                      <tr><td style={{ padding: 0 }}>Lamp</td><td style={{ padding: 0 }}>:</td><td style={{ padding: 0 }}>-</td></tr>
                      <tr><td style={{ padding: 0 }}>Perihal</td><td style={{ padding: 0 }}>:</td><td style={{ padding: 0 }}><strong>Permohonan Izin</strong></td></tr>
                    </tbody>
                  </table>

                  <p style={{ margin: '0 0 5px 0' }}>Kepada Yth. Bapak/Ibu:</p>
                  <div style={{ fontWeight: 'bold', marginBottom: '20px', lineHeight: '1.2' }}>
                    {generateTujuan.split('\n').map((baris, i) => (
                      <div key={i}>{baris}</div>
                    ))}
                  </div>
                  
                  <p style={{ marginBottom: '15px' }}>di tempat</p>
                  
                  <p style={{ fontStyle: 'italic', marginBottom: '15px' }}>Assalamu'alaikum Wr. Wb.</p>
                  
                  <p style={{ marginBottom: '15px', textAlign: 'justify', lineHeight: '1.3' }}>
                    Salam silaturrahim teriring doa semoga rahmat, hidayah serta inayah Allah selalu menyertai kita dalam beraktifitas sehari-hari, amin.
                  </p>
                  
                  <p style={{ marginBottom: '15px', textAlign: 'justify', lineHeight: '1.3' }}>
                    Kami sampaikan sehubungan dengan adanya kegiatan {generateKonteks || 'MATAMUDA Tahun Ajaran 2026/2027'}, kami memohon izin agar nama-nama berikut:
                  </p>

                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px', border: 'none' }}>
                    <tbody>
                      {generateSiswaList.map((siswa, i) => (
                        <tr key={i}>
                          <td style={{ width: '30px', verticalAlign: 'top', padding: '2px 0' }}>{i + 1}.</td>
                          <td style={{ verticalAlign: 'top', padding: '2px 0' }}>{siswa.nama}</td>
                          <td style={{ width: '60px', verticalAlign: 'top', padding: '2px 0', textAlign: 'center' }}>{siswa.rombel}</td>
                          <td style={{ verticalAlign: 'top', padding: '2px 0' }}>{siswa.domisili ? `(${siswa.domisili})` : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <p style={{ marginBottom: '15px', textAlign: 'justify', lineHeight: '1.3' }}>
                    diberikan izin untuk mengikuti {generateKegiatan} dengan jadwal sebagai berikut:
                  </p>

                  <table style={{ border: 'none', borderCollapse: 'collapse', width: '100%', marginBottom: '15px', marginLeft: '20px' }}>
                    <tbody>
                      <tr><td style={{ width: '100px', padding: '2px 0' }}>Hari, Tanggal</td><td style={{ width: '15px', padding: '2px 0' }}>:</td><td style={{ padding: '2px 0' }}>{generateHariTanggal}</td></tr>
                      <tr><td style={{ padding: '2px 0' }}>Waktu</td><td style={{ padding: '2px 0' }}>:</td><td style={{ padding: '2px 0' }}>{generateWaktu}</td></tr>
                      <tr><td style={{ padding: '2px 0' }}>Tempat</td><td style={{ padding: '2px 0' }}>:</td><td style={{ padding: '2px 0' }}>{generateTempat}</td></tr>
                    </tbody>
                  </table>

                  <p style={{ marginBottom: '20px', textAlign: 'justify', lineHeight: '1.3' }}>
                    Demikian permohonan ini kami sampaikan. Besar harapan kami agar murid tersebut dapat diberikan izin untuk mengikuti kegiatan dimaksud. Atas perhatian, kebijaksanaan, dan kerja sama Bapak/Ibu Pengasuh, kami ucapkan terima kasih.
                  </p>

                  <p style={{ fontStyle: 'italic', marginBottom: '20px' }}>Wassalamu'alaikum Wr. Wb.</p>
                </div>
              </>
            ) : generateJenis === 'Surat Undangan GTK' ? (
              <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '12pt', color: 'black', lineHeight: '1.35' }}>
                <table style={{ border: 'none', borderCollapse: 'collapse', width: '100%', marginBottom: '14px', fontSize: '12pt', fontFamily: 'Arial, sans-serif' }}>
                  <tbody>
                    <tr><td style={{ width: '90px', padding: 0 }}>Nomor</td><td style={{ width: '15px', padding: 0 }}>:</td><td style={{ padding: 0 }}>{generateNomor}</td></tr>
                    <tr><td style={{ padding: 0 }}>Lampiran</td><td style={{ padding: 0 }}>:</td><td style={{ padding: 0 }}>-</td></tr>
                    <tr><td style={{ padding: 0 }}>Perihal</td><td style={{ padding: 0 }}>:</td><td style={{ padding: 0 }}>Undangan</td></tr>
                  </tbody>
                </table>

                <div style={{ marginBottom: '14px', lineHeight: '1.3' }}>
                  <div>Kepada Yth :</div>
                  <div style={{ fontWeight: 'bold' }}>Bapak/Ibu Guru &amp; Staf</div>
                  <div style={{ fontWeight: 'bold' }}>MTs Almaarif 01 Singosari</div>
                  <div>di</div>
                  <div style={{ paddingLeft: '40px' }}>Tempat</div>
                </div>

                <p style={{ margin: '0 0 10px 0' }}>Assalamualaikum Wr. Wb.</p>

                <p style={{ margin: '0 0 10px 0', textAlign: 'justify', lineHeight: '1.35' }}>
                  Salam silaturrahim teriring do'a, semoga rahmat hidayah serta inayah Allah SWT selalu menyertai kita dalam beraktifitas sehari-hari, amin.
                </p>

                <p style={{ margin: '0 0 10px 0', textAlign: 'justify', lineHeight: '1.35' }}>
                  Dengan hormat kami memohon kehadiran Bapak/Ibu Guru &amp; Staf untuk hadir pada:
                </p>

                <table style={{ border: 'none', borderCollapse: 'collapse', width: '100%', marginBottom: '14px', marginLeft: '40px', fontSize: '12pt', fontFamily: 'Arial, sans-serif' }}>
                  <tbody>
                    <tr><td style={{ width: '110px', padding: '2px 0' }}>Hari</td><td style={{ width: '15px', padding: '2px 0' }}>:</td><td style={{ padding: '2px 0' }}>{generateHari}</td></tr>
                    <tr><td style={{ padding: '2px 0' }}>Tanggal</td><td style={{ padding: '2px 0' }}>:</td><td style={{ padding: '2px 0' }}>{generateTanggalPelaksanaan}</td></tr>
                    <tr><td style={{ padding: '2px 0' }}>Pukul</td><td style={{ padding: '2px 0' }}>:</td><td style={{ padding: '2px 0' }}>{generateWaktu}</td></tr>
                    <tr><td style={{ padding: '2px 0' }}>Tempat</td><td style={{ padding: '2px 0' }}>:</td><td style={{ padding: '2px 0' }}>{generateTempat}</td></tr>
                    <tr><td style={{ padding: '2px 0' }}>Acara</td><td style={{ padding: '2px 0' }}>:</td><td style={{ padding: '2px 0' }}>{generateAcara}</td></tr>
                  </tbody>
                </table>

                <p style={{ margin: '0 0 10px 0', textAlign: 'justify', lineHeight: '1.3' }}>
                  Demikian undangan ini disampaikan, atas perhatian dan kehadiran bapak/ibu Guru &amp; Staf kami sampaikan terima kasih.
                </p>

                <p style={{ margin: '0 0 15px 0' }}>Wassalamu'alaikum Wr. Wb.</p>

                <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '12pt', marginTop: '10px', marginLeft: 'auto', width: '300px', textAlign: 'left' }}>
                  <p style={{ margin: '0 0 5px 0' }}>Singosari, {generateTanggal}</p>
                  <p style={{ margin: '0 0 65px 0' }}>Kepala Madrasah</p>
                  <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>Dwi Retno Palupi, M.Pd.</p>
                </div>
              </div>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: '25px', marginTop: '10px' }}>
                  <h3 style={{ textDecoration: 'underline', margin: '0 0 5px 0', fontSize: '14pt', letterSpacing: '1px' }}>S U R A T &nbsp;&nbsp; T U G A S</h3>
                  <p style={{ margin: 0, fontSize: '12pt' }}>Nomor: {generateNomor}</p>
                </div>
                <div style={{ fontSize: '12pt' }}>
                  <p style={{ margin: '0 0 10px 0' }}>Yang bertanda tangan di bawah ini:</p>
                  <table style={{ border: 'none', borderCollapse: 'collapse', width: '100%', marginBottom: '15px' }}>
                    <tbody>
                      <tr><td style={{ width: '100px', padding: '4px 0' }}>Nama</td><td style={{ width: '20px', padding: '4px 0' }}>:</td><td style={{ padding: '4px 0' }}>Dwi Retno Palupi, M.Pd.</td></tr>
                      <tr><td style={{ padding: '4px 0' }}>Jabatan</td><td style={{ padding: '4px 0' }}>:</td><td style={{ padding: '4px 0' }}>Kepala Madrasah Tsanawiyah Almaarif 01 Singosari</td></tr>
                    </tbody>
                  </table>
                  <p>Memberi tugas kepada:</p>
                  
                  {generateGuruTugas.some(g => g.guru.id === 'terlampir') ? (
                    <div style={{ padding: '0 20px', fontWeight: 'bold', fontStyle: 'italic', margin: '20px 0' }}>
                      Nama-nama terlampir
                    </div>
                  ) : (
                    <div style={{ padding: '0 20px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
                        <thead>
                          <tr>
                            <th style={{ border: '1px solid black', padding: '8px', width: '50px' }}>NO</th>
                            <th style={{ border: '1px solid black', padding: '8px' }}>NAMA</th>
                            <th style={{ border: '1px solid black', padding: '8px', width: '150px' }}>JABATAN</th>
                          </tr>
                        </thead>
                        <tbody>
                          {generateGuruTugas.map((item, i) => (
                            <tr key={i}>
                              <td style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }}>{i + 1}</td>
                              <td style={{ border: '1px solid black', padding: '8px' }}>{item.guru.nama}</td>
                              <td style={{ border: '1px solid black', padding: '8px', textAlign: 'center', textTransform: 'uppercase' }}>{item.tugas}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <p style={{ margin: '0 0 15px 0', lineHeight: '1.4', textAlign: 'justify' }}>
                    Untuk {generateKonteks}, {generateHariTanggal} yang bertempat di {generateTempat}.
                  </p>
                  <p style={{ margin: '0 0 25px 0', lineHeight: '1.4', textAlign: 'justify' }}>
                    Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab. Atas perhatian dan kerja samanya diucapkan terima kasih.
                  </p>
                </div>
              </>
            )}

            {generateJenis !== 'Surat Undangan GTK' && (
              <div style={{ marginTop: '20px', marginLeft: 'auto', width: '300px', textAlign: 'left', fontSize: '12pt' }}>
                <p style={{ margin: '0 0 5px 0' }}>Singosari, {generateTanggal}</p>
                <p style={{ margin: '0 0 90px 0' }}>Kepala Madrasah,</p>
                <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>DWI RETNO PALUPI, M.Pd.</p>
              </div>
            )}
            
            <div style={{ clear: 'both' }}></div>
          </div>
        )}
      </div>

      {/* ===== PREMIUM SUCCESS MODAL ===== */}
      {successNoSurat && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999, animation: 'fadeIn 0.3s ease'
        }} onClick={() => setSuccessNoSurat(null)}>
          <div style={{
            background: 'white', borderRadius: '20px', width: '420px', maxWidth: '92vw',
            overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            animation: 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: 'translateY(0)'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Header Gradient */}
            <div style={{
              background: 'linear-gradient(135deg, #1e6b3a, #2d8f4e, #1e6b3a)',
              padding: '32px 24px 28px', textAlign: 'center', position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Decorative circles */}
              <div style={{
                position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px',
                borderRadius: '50%', background: 'rgba(255,255,255,0.08)'
              }}></div>
              <div style={{
                position: 'absolute', bottom: '-15px', left: '-15px', width: '60px', height: '60px',
                borderRadius: '50%', background: 'rgba(255,255,255,0.06)'
              }}></div>
              {/* Check icon */}
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
                border: '3px solid rgba(255,255,255,0.4)',
                animation: 'scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both'
              }}>
                <i className="fas fa-check" style={{ fontSize: '28px', color: 'white' }}></i>
              </div>
              <h3 style={{
                margin: 0, color: 'white', fontSize: '1.25rem', fontWeight: 700,
                letterSpacing: '0.5px'
              }}>Nomor Surat Berhasil Dibuat!</h3>
              <p style={{
                margin: '6px 0 0', color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem'
              }}>Nomor surat Anda telah tercatat di sistem</p>
            </div>

            {/* Body */}
            <div style={{ padding: '28px 24px' }}>
              <p style={{
                margin: '0 0 10px', fontSize: '0.8rem', color: '#64748b',
                textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 600,
                textAlign: 'center'
              }}>Nomor Surat</p>
              <div style={{
                background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
                border: '2px solid #bbf7d0', borderRadius: '12px',
                padding: '16px 20px', textAlign: 'center', position: 'relative'
              }}>
                <p style={{
                  margin: 0, fontSize: '1.2rem', fontWeight: 800,
                  color: '#15803d', letterSpacing: '0.5px', fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  wordBreak: 'break-all', lineHeight: 1.5
                }}>{successNoSurat}</p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(successNoSurat);
                    showToast('Nomor surat berhasil disalin!', 'success');
                  }}
                  style={{
                    flex: 1, padding: '12px 16px', borderRadius: '10px',
                    border: '2px solid #d1d5db', background: 'white',
                    color: '#374151', fontWeight: 600, fontSize: '0.9rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: '8px', transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#9ca3af'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                >
                  <i className="fas fa-copy"></i> Salin
                </button>
                <button
                  onClick={() => { setSuccessNoSurat(null); fetchData(); }}
                  style={{
                    flex: 2, padding: '12px 16px', borderRadius: '10px',
                    border: 'none', background: 'linear-gradient(135deg, #1e6b3a, #2d8f4e)',
                    color: 'white', fontWeight: 700, fontSize: '0.9rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: '8px', transition: 'all 0.2s',
                    boxShadow: '0 4px 14px rgba(30,107,58,0.3)'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(30,107,58,0.4)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(30,107,58,0.3)'; }}
                >
                  <i className="fas fa-check-circle"></i> Selesai
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(40px) scale(0.95) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes scaleIn { from { transform: scale(0) } to { transform: scale(1) } }
      `}</style>

    </div>
  );
}
