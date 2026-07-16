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
  const [activeTab, setActiveTab] = useState<'keluar' | 'masuk'>('keluar');
  const [dataKeluar, setDataKeluar] = useState<SuratKeluar[]>([]);
  const [dataMasuk, setDataMasuk] = useState<SuratMasuk[]>([]);
  const [topikList, setTopikList] = useState<string[]>([]);
  
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

  // Form Generate States
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [formNamaSurat, setFormNamaSurat] = useState('');
  const [formDitugaskan, setFormDitugaskan] = useState('');
  const [formTopik, setFormTopik] = useState('');
  const [formPj, setFormPj] = useState('');
  const [generating, setGenerating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/persuratan');
      const result = await res.json();
      if (result.success) {
        // Sort newest first based on rowNumber or ID
        const sortedKeluar = result.suratKeluar.sort((a: any, b: any) => b.rowNumber - a.rowNumber);
        const sortedMasuk = result.suratMasuk.sort((a: any, b: any) => b.rowNumber - a.rowNumber);
        
        setDataKeluar(sortedKeluar);
        setDataMasuk(sortedMasuk);
        setTopikList(result.topikList);
      } else {
        setError(result.error);
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
            yangDitugaskan: formDitugaskan,
            topik: formTopik,
            pj: formPj
          }
        })
      });
      const result = await res.json();
      if (result.success) {
        alert(`Nomor Surat berhasil dibuat: ${result.noSurat}`);
        setShowGenerateModal(false);
        // Reset form
        setFormNamaSurat('');
        setFormDitugaskan('');
        setFormTopik('');
        setFormPj('');
        // Refresh data
        fetchData();
      } else {
        alert(`Gagal: ${result.error}`);
      }
    } catch (err) {
      alert('Terjadi kesalahan saat membuat nomor surat.');
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
      alert("Silakan pilih file terlebih dahulu");
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
        alert('File berhasil diarsipkan ke Google Drive!');
        setShowUploadModal(false);
        setUploadTarget(null);
        fetchData();
      } else {
        alert(`Gagal upload: ${result.error}`);
      }
    } catch (error) {
      alert('Terjadi kesalahan sistem saat upload file.');
    } finally {
      setUploading(false);
    }
  };

  const handleExportExcel = () => {
    const dataToExport = activeTab === 'keluar' 
      ? filteredKeluar.map(s => ({
          'No': s.no,
          'Tanggal': s.tanggal,
          'Nama Surat': s.namaSurat,
          'Yang Ditugaskan': s.yangDitugaskan,
          'Topik': s.topik,
          'PJ': s.pj,
          'No Surat': s.noSurat,
          'Status Arsip': s.fileScan ? 'Diarsipkan' : 'Belum Diarsipkan'
        }))
      : filteredMasuk.map(s => ({
          'Tanggal': s.tanggal,
          'Pengirim': s.pengirim,
          'No Surat': s.noSurat,
          'Perihal': s.perihal,
          'Status Arsip': s.fileScan ? 'Diarsipkan' : 'Belum Diarsipkan'
        }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Data Surat ${activeTab}`);
    XLSX.writeFile(workbook, `Data_Surat_${activeTab}_${new Date().getTime()}.xlsx`);
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

  const activeDataLength = activeTab === 'keluar' ? filteredKeluar.length : filteredMasuk.length;
  const totalPages = Math.ceil(activeDataLength / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  
  const currentKeluar = filteredKeluar.slice(startIndex, startIndex + itemsPerPage);
  const currentMasuk = filteredMasuk.slice(startIndex, startIndex + itemsPerPage);

  // Statistics
  const totalKeluar = dataKeluar.length;
  const totalBelumArsipKeluar = dataKeluar.filter(s => !s.fileScan).length;
  
  // Calculate who has the most assignments (Rekap Guru Ditugaskan)
  const guruCounts: Record<string, number> = {};
  dataKeluar.forEach(s => {
    if (s.yangDitugaskan) {
      // Split by comma if multiple people
      const persons = s.yangDitugaskan.split(',').map(p => p.trim()).filter(Boolean);
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
                  <div className={styles.infoGroup}>
                    <label className={styles.infoLabel}>Topik (Kode Surat)</label>
                    <select className={styles.searchInput} value={formTopik} onChange={e => setFormTopik(e.target.value)} required>
                      <option value="">-- Pilih Topik --</option>
                      {topikList.map((topik, i) => (
                        <option key={i} value={topik}>{topik}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={styles.infoGroup} style={{ marginBottom: '16px' }}>
                  <label className={styles.infoLabel}>Nama Surat / Perihal</label>
                  <input type="text" className={styles.searchInput} value={formNamaSurat} onChange={e => setFormNamaSurat(e.target.value)} placeholder="Contoh: Surat Edaran Kegiatan..." required />
                </div>
                <div className={styles.infoGroup} style={{ marginBottom: '16px' }}>
                  <label className={styles.infoLabel}>Yang Ditugaskan / Kepada</label>
                  <input type="text" className={styles.searchInput} value={formDitugaskan} onChange={e => setFormDitugaskan(e.target.value)} placeholder="Contoh: Budi, Siti" />
                </div>
                <div className={styles.infoGroup} style={{ marginBottom: '24px' }}>
                  <label className={styles.infoLabel}>Penanggung Jawab (PJ)</label>
                  <input type="text" className={styles.searchInput} value={formPj} onChange={e => setFormPj(e.target.value)} placeholder="Contoh: Kepala Madrasah" required />
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
        <div style={{ display: 'flex', gap: '8px', padding: '0 24px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
          <button 
            style={{ padding: '16px 24px', border: 'none', background: 'transparent', fontWeight: 600, fontSize: '0.95rem', color: activeTab === 'keluar' ? 'var(--primary)' : '#64748b', borderBottom: activeTab === 'keluar' ? '3px solid var(--primary)' : '3px solid transparent', cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => setActiveTab('keluar')}
          >
            <i className="fas fa-paper-plane" style={{ marginRight: '8px' }}></i> Surat Keluar
          </button>
          <button 
            style={{ padding: '16px 24px', border: 'none', background: 'transparent', fontWeight: 600, fontSize: '0.95rem', color: activeTab === 'masuk' ? 'var(--primary)' : '#64748b', borderBottom: activeTab === 'masuk' ? '3px solid var(--primary)' : '3px solid transparent', cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => setActiveTab('masuk')}
          >
            <i className="fas fa-inbox" style={{ marginRight: '8px' }}></i> Surat Masuk
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
                {activeTab === 'keluar' ? (
                  <tr>
                    <th style={{ width: '60px', textAlign: 'center' }}>No</th>
                    <th>Tanggal</th>
                    <th>Nomor Surat</th>
                    <th>Nama Surat</th>
                    <th>Yang Ditugaskan</th>
                    <th>Topik</th>
                    <th>PJ</th>
                    <th style={{ textAlign: 'center' }}>Status / Arsip</th>
                  </tr>
                ) : (
                  <tr>
                    <th>Tanggal Masuk</th>
                    <th>Pengirim</th>
                    <th>Nomor Surat</th>
                    <th>Perihal</th>
                    <th style={{ textAlign: 'center' }}>Status / Arsip</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {activeTab === 'keluar' ? (
                  currentKeluar.length > 0 ? (
                    currentKeluar.map(surat => (
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
                        <i className="fas fa-envelope-open" style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '16px', display: 'block' }}></i>
                        Tidak ada surat keluar yang ditemukan.
                      </td>
                    </tr>
                  )
                ) : (
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
