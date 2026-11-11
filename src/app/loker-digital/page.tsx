'use client';
import { useState, useEffect } from 'react';
import styles from './Loker.module.css';
import InlineLoading from '@/components/InlineLoading';

export default function LokerDigital() {
  const [lokerData, setLokerData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [needsConfig, setNeedsConfig] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadingFolderId, setUploadingFolderId] = useState<string | null>(null);
  
  // User & Tab State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'saya' | 'semua'>('saya');
  
  // Custom Toast State
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  // Custom Modal State
  const [modalFolder, setModalFolder] = useState<{id: string, name: string} | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('keren_user_data');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      } else {
        const uname = localStorage.getItem('username');
        if (uname) setCurrentUser({ nama: uname, username: uname });
      }
    } catch {}

    fetchLokerData();
  }, []);

  const fetchLokerData = async () => {
    try {
      const res = await fetch('/api/loker');
      const json = await res.json();
      
      if (json.success) {
        setLokerData(json.data);
      } else {
        setError(json.error);
        if (json.needsConfig) {
          setNeedsConfig(true);
        }
      }
    } catch {
      setError('Gagal memuat data Loker Digital.');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return (name || 'GTK').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const cleanStr = (s: string) => (s || '').toLowerCase().replace(/[^a-z]/g, '');
  const isMatchUser = (name1: string, name2: string) => {
    const c1 = cleanStr(name1);
    const c2 = cleanStr(name2);
    if (!c1 || !c2) return false;
    if (c1.length > 5 && c2.length > 5) {
      return c1.includes(c2) || c2.includes(c1);
    }
    return c1 === c2;
  };

  const myLoker = (() => {
    if (!currentUser) return null;
    if (currentUser.nama) {
      const exact = lokerData.find(item => isMatchUser(item.nama, currentUser.nama));
      if (exact) return exact;

      // Pencocokan per kata (panjang > 3)
      const words = String(currentUser.nama).split(/\s+/).filter(w => w.length > 3);
      for (const w of words) {
        const match = lokerData.find(item => cleanStr(item.nama).includes(cleanStr(w)));
        if (match) return match;
      }
    }
    if (currentUser.username) {
      const match = lokerData.find(item => cleanStr(item.nama).includes(cleanStr(currentUser.username)));
      if (match) return match;
    }
    return null;
  })();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, folderId: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setUploadingFolderId(folderId);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderId', folderId);

    try {
      const res = await fetch('/api/loker/upload', {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      
      if (json.success) {
        showToast('File berhasil diunggah ke Loker Digital!', 'success');
      } else {
        showToast('Gagal mengunggah: ' + json.error, 'error');
      }
    } catch {
      showToast('Terjadi kesalahan sistem saat mengunggah file.', 'error');
    } finally {
      setUploadingFolderId(null);
      e.target.value = '';
    }
  };

  const filteredData = lokerData.filter(item => 
    item.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      {/* Modal Iframe Folder */}
      {modalFolder && (
        <div className={styles.modalOverlay} onClick={() => setModalFolder(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <i className="fas fa-folder-open" style={{color: 'var(--primary)'}}></i>
                Loker: {modalFolder.name}
              </div>
              <button className={styles.modalClose} onClick={() => setModalFolder(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className={styles.modalBody} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: '12px', textAlign: 'center' }}>
                <a 
                  href={`https://drive.google.com/drive/folders/${modalFolder.id}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#e0f2fe', color: '#0369a1', borderRadius: '8px', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, border: '1px solid #bae6fd' }}
                >
                  <i className="fab fa-google-drive"></i> Buka Langsung di Google Drive
                </a>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '6px 0 0' }}>
                  Jika isi loker di bawah error/tidak muncul (403), klik tombol di atas.
                </p>
              </div>
              <iframe 
                src={`https://drive.google.com/embeddedfolderview?id=${modalFolder.id}#grid`}
                className={styles.iframe}
                allow="autoplay"
                title={`Loker ${modalFolder.name}`}
                style={{ flex: 1, border: 'none', background: '#f8fafc', borderRadius: '8px' }}
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.title}>
          <div className={styles.titleIcon}>
            <i className="fas fa-folder-open"></i>
          </div>
          <div>
            <div style={{ lineHeight: 1.2 }}>Loker Digital & Berkas GTK</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
              Penyimpanan berkas administrasi dan dokumen digital masing-masing akun
            </div>
          </div>
        </div>
        
        {activeTab === 'semua' && (
          <div className={styles.searchBox}>
            <i className={`fas fa-search ${styles.searchIcon}`}></i>
            <input 
              type="text" 
              placeholder="Cari guru / staf..." 
              className={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Tab Switcher */}
      <div className={styles.tabNav}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'saya' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('saya')}
        >
          <i className="fas fa-user-check"></i>
          <span>Loker Saya</span>
          {myLoker && (
            <span className={styles.tabBadge}>Aktif</span>
          )}
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'semua' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('semua')}
        >
          <i className="fas fa-users"></i>
          <span>Semua GTK ({lokerData.length})</span>
        </button>
      </div>

      {loading ? (
        <InlineLoading message="Sinkronisasi Loker Digital dengan Google Drive..." />
      ) : error ? (
        <div className={styles.errorState}>
          <i className="fas fa-exclamation-triangle"></i>
          <h3>Oops, Terjadi Kesalahan!</h3>
          <p>{error}</p>
          {needsConfig && (
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '10px' }}>
              Tambahkan <strong>GOOGLE_DRIVE_LOKER_GTK_FOLDER_ID=id_folder</strong> ke file <code>.env.local</code> Anda.
            </p>
          )}
        </div>
      ) : activeTab === 'saya' ? (
        /* Tab Loker Saya */
        myLoker ? (
          <div className={styles.myLokerWrapper}>
            <div className={styles.myLokerCard}>
              <div className={styles.myLokerProfile}>
                <div className={styles.myLokerAvatar}>
                  {myLoker.foto ? (
                    <img src={myLoker.foto} alt={myLoker.nama} className={styles.avatarImg} />
                  ) : (
                    getInitials(myLoker.nama)
                  )}
                </div>
                <div className={styles.myLokerDetails}>
                  <div className={styles.myLokerBadge}>
                    <i className="fas fa-id-badge"></i> Loker Digital Akun Anda
                  </div>
                  <h2 className={styles.myLokerName}>{myLoker.nama}</h2>
                  <div className={styles.myLokerStatus}>
                    <span>{myLoker.status || currentUser?.role || 'GTK MTs Almaarif 01'}</span>
                    {myLoker.lokerFolder ? (
                      <span className={styles.folderConnected}>
                        <i className="fas fa-check-circle"></i> Google Drive Terhubung
                      </span>
                    ) : (
                      <span className={styles.folderMissing}>
                        <i className="fas fa-exclamation-triangle"></i> Folder Belum Ada
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {myLoker.lokerFolder ? (
                <div className={styles.myLokerActions}>
                  <a
                    href={`https://drive.google.com/drive/folders/${myLoker.lokerFolder.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.btnOpenDrive}
                    title="Buka langsung di aplikasi Google Drive"
                  >
                    <i className="fab fa-google-drive"></i>
                    <span>Buka di Google Drive</span>
                    <i className="fas fa-external-link-alt" style={{ fontSize: '0.75rem', opacity: 0.8 }}></i>
                  </a>

                  <input
                    type="file"
                    id="my-loker-file-input"
                    style={{ display: 'none' }}
                    onChange={(e) => myLoker.lokerFolder && handleUpload(e, myLoker.lokerFolder.id)}
                    disabled={uploadingFolderId === myLoker.lokerFolder.id}
                  />
                  <button
                    type="button"
                    className={styles.btnUploadPrimary}
                    onClick={() => document.getElementById('my-loker-file-input')?.click()}
                    disabled={uploadingFolderId === myLoker.lokerFolder.id}
                    title="Unggah berkas / dokumen ke loker digital Anda"
                  >
                    {uploadingFolderId === myLoker.lokerFolder.id ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        <span>Mengunggah...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-cloud-upload-alt"></i>
                        <span>Upload Berkas Baru</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className={styles.noFolderNotice}>
                  <i className="fas fa-info-circle"></i>
                  <div>
                    <b>Folder Google Drive Belum Ditemukan</b>
                    <p>Folder loker digital atas nama Anda belum tersedia di Google Drive. Silakan hubungi Administrator (Ka. TU) untuk dibuatkan folder.</p>
                  </div>
                </div>
              )}
            </div>

            {/* In-App Preview / Embedded View */}
            {myLoker.lokerFolder && (
              <div className={styles.myLokerEmbedBox}>
                <div className={styles.myLokerEmbedHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#1e293b' }}>
                    <i className="fas fa-folder-open" style={{ color: '#059669' }}></i>
                    Daftar Dokumen di Loker Anda
                  </div>
                  <a
                    href={`https://drive.google.com/drive/folders/${myLoker.lokerFolder.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    Buka Fullscreen <i className="fas fa-external-link-alt" style={{ fontSize: '0.7rem' }}></i>
                  </a>
                </div>

                <div className={styles.myLokerIframeWrapper}>
                  <iframe
                    src={`https://drive.google.com/embeddedfolderview?id=${myLoker.lokerFolder.id}#grid`}
                    className={styles.myLokerIframe}
                    allow="autoplay"
                    title={`Loker ${myLoker.nama}`}
                  />
                </div>

                <div className={styles.myLokerEmbedFooter}>
                  <i className="fas fa-lightbulb" style={{ color: '#f59e0b' }}></i>
                  <span>
                    Jika tampilan berkas di atas tidak muncul karena pembatasan browser HP, klik tombol <b>Buka di Google Drive</b> di atas untuk akses langsung.
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.myLokerEmpty}>
            <i className="fas fa-user-slash" style={{ fontSize: '2.5rem', color: '#94a3b8', marginBottom: '12px' }}></i>
            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem' }}>Akun Anda Belum Terdeteksi di Loker</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', maxWidth: '420px', margin: '8px auto 16px' }}>
              Nama akun Anda ({currentUser?.nama || 'Tamu'}) belum terdaftar atau belum cocok dengan data GTK. Silakan pilih tab <b>Semua GTK</b> untuk mencari manual.
            </p>
            <button
              type="button"
              className={styles.btnSwitchTab}
              onClick={() => setActiveTab('semua')}
            >
              <i className="fas fa-search"></i> Cari di Semua GTK
            </button>
          </div>
        )
      ) : (
        /* Tab Semua GTK */
        <div className={styles.grid}>
          {filteredData.map((guru) => (
            <div key={guru.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.avatar}>
                  {guru.foto ? (
                    <img src={guru.foto} alt={guru.nama} className={styles.avatarImg} />
                  ) : (
                    getInitials(guru.nama)
                  )}
                </div>
                <div className={styles.info}>
                  <div className={styles.nama} title={guru.nama}>{guru.nama}</div>
                  <div className={styles.status}>{guru.status}</div>
                </div>
              </div>

              {!guru.lokerFolder && (
                <div className={styles.noFolder}>
                  <i className="fas fa-times-circle"></i> Folder tidak ditemukan di Drive
                </div>
              )}

              <div className={styles.actions}>
                {guru.lokerFolder ? (
                  <button 
                    onClick={() => setModalFolder({ id: guru.lokerFolder.id, name: guru.nama })}
                    className={`${styles.btnLoker} ${styles.active}`}
                  >
                    <i className="fas fa-external-link-alt"></i> Buka Loker
                  </button>
                ) : (
                  <button className={styles.btnLoker} disabled>
                    <i className="fas fa-folder-minus"></i> Loker Kosong
                  </button>
                )}
                
                <input 
                  type="file" 
                  id={`file-${guru.id}`} 
                  style={{ display: 'none' }}
                  onChange={(e) => guru.lokerFolder && handleUpload(e, guru.lokerFolder.id)}
                />
                <button 
                  className={styles.btnUpload} 
                  title="Upload Berkas" 
                  disabled={!guru.lokerFolder || uploadingFolderId === guru.lokerFolder?.id}
                  onClick={() => document.getElementById(`file-${guru.id}`)?.click()}
                >
                  {uploadingFolderId === guru.lokerFolder?.id ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fas fa-cloud-upload-alt"></i>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
