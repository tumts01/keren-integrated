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
  const [activeTab, setActiveTab] = useState<'keluar' | 'masuk' | 'tagihan' | 'tugas'>('keluar');
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
  const [generating, setGenerating] = useState(false);
  const [searchGuru, setSearchGuru] = useState('');
  const [searchPj, setSearchPj] = useState('');
  const [searchTopik, setSearchTopik] = useState('');

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
            pj: formPj
          }
        })
      });
      const result = await res.json();
      if (result.success) {
        showToast(`Nomor Surat berhasil dibuat: ${result.noSurat}`, 'success');
        setShowGenerateModal(false);
        // Reset form
        setFormNamaSurat('');
        setFormSasaran('Guru');
        setFormDitugaskan([]);
        setFormTopik('');
        setFormPj('');
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
    s.topik.toLowerCase().includes(searchTerm.toLowerCase())
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
      const persons = s.yangDitugaskan.split(';').map(p => p.trim()).filter(Boolean);
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
  dataKeluar.forEach(s => {
    if (s.yangDitugaskan) {
      // Split by semicolon if multiple people
      const persons = s.yangDitugaskan.split(';').map(p => p.trim()).filter(Boolean);
      persons.forEach(p => {
        guruCounts[p] = (guruCounts[p] || 0) + 1;
      });
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
            <div className={styles.modalBody}>
              <p style={{ marginBottom: '20px', color: '#64748b', fontSize: '0.9rem' }}>
                Pilih file PDF atau Gambar dari perangkat Anda. Sistem akan otomatis mengunggah file ini ke folder Google Drive Madrasah dan melampirkan tautannya.
              </p>
              <form onSubmit={handleFileUpload}>
                <div className={styles.infoGroup} style={{ marginBottom: '20px' }}>
                  <label className={styles.infoLabel}>Pilih File (PDF/JPG/PNG)</label>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    accept=".pdf,image/*"
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
                    <label className={styles.infoLabel}>Yang Ditugaskan / Kepada</label>
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
                        {guruList.filter(g => g.nama.toLowerCase().includes(searchGuru.toLowerCase()) && !formDitugaskan.includes(g.nama)).map(g => (
                          <div key={g.id} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }} onClick={() => {
                            setFormDitugaskan(prev => [...prev, g.nama]);
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
      </div>
    </div>
  );
}
