'use client';
import { useState, useEffect } from 'react';

type DriveFolder = { id: string; name: string };
type DriveFile = { id: string; name: string; mimeType: string; thumbnail: string; createdTime: string };

export default function ArsipFotoPage() {
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([]);
  const [currentName, setCurrentName] = useState('Arsip Foto');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [error, setError] = useState('');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'folders' | 'photos'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name-asc' | 'name-desc'>('newest');
  const [isGlobalSearch, setIsGlobalSearch] = useState(false);
  const [globalSearching, setGlobalSearching] = useState(false);

  const fetchData = async (folderId?: string) => {
    setLoading(true);
    setError('');
    setIsGlobalSearch(false);
    try {
      const url = folderId ? `/api/arsip-foto?folderId=${folderId}` : '/api/arsip-foto';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setFolders(data.folders || []);
        setFiles(data.files || []);
        setCurrentName(data.folderName || 'Arsip Foto');
      } else {
        setError(data.error || 'Gagal memuat data');
      }
    } catch {
      setError('Gagal menghubungi server');
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalSearch = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setGlobalSearching(true);
    setError('');
    setIsGlobalSearch(true);
    try {
      const res = await fetch(`/api/arsip-foto?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (data.success) {
        setFolders(data.folders || []);
        setFiles(data.files || []);
        setCurrentName(data.folderName || `Hasil: "${query}"`);
        setFolderStack([]); // reset folder navigation stack in global search mode
      } else {
        setError(data.error || 'Gagal mencari arsip');
      }
    } catch {
      setError('Gagal menghubungi server');
    } finally {
      setLoading(false);
      setGlobalSearching(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  const openFolder = (folder: DriveFolder) => {
    setFolderStack(prev => [...prev, folder]);
    setSearchQuery('');
    fetchData(folder.id);
  };

  const goBack = () => {
    const newStack = [...folderStack];
    newStack.pop();
    setFolderStack(newStack);
    setSearchQuery('');
    const parentId = newStack.length > 0 ? newStack[newStack.length - 1].id : undefined;
    fetchData(parentId);
  };

  const goToRoot = () => {
    setFolderStack([]);
    setSearchQuery('');
    fetchData();
  };

  // Filtered and sorted folders
  const displayedFolders = (filterType === 'photos' ? [] : folders)
    .filter(f => !searchQuery.trim() || f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      return a.name.localeCompare(b.name);
    });

  // Filtered and sorted files
  const displayedFiles = (filterType === 'folders' ? [] : files)
    .filter(f => !searchQuery.trim() || f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdTime || 0).getTime() - new Date(a.createdTime || 0).getTime();
      if (sortBy === 'oldest') return new Date(a.createdTime || 0).getTime() - new Date(b.createdTime || 0).getTime();
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      return 0;
    });

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') {
        setLightboxIndex(prev => (prev !== null && prev < displayedFiles.length - 1 ? prev + 1 : 0));
      }
      if (e.key === 'ArrowLeft') {
        setLightboxIndex(prev => (prev !== null && prev > 0 ? prev - 1 : displayedFiles.length - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, displayedFiles.length]);

  const activePhoto = lightboxIndex !== null && displayedFiles[lightboxIndex] ? displayedFiles[lightboxIndex] : null;

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
      
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
        borderRadius: '18px', padding: '28px 32px', marginBottom: '24px',
        color: 'white', boxShadow: '0 10px 25px -5px rgba(14,165,233,0.3)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.5px' }}>
            <i className="fas fa-images"></i> Arsip Foto Dokumentasi
          </h1>
          <p style={{ margin: '6px 0 0', opacity: 0.9, fontSize: '0.92rem' }}>
            Galeri dokumentasi kegiatan, prestasi, dan peristiwa madrasah
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => isGlobalSearch ? goToRoot() : fetchData(folderStack.length > 0 ? folderStack[folderStack.length - 1].id : undefined)}
            style={{
              background: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              backdropFilter: 'blur(5px)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Segarkan data"
          >
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i> Refresh
          </button>
        </div>
      </div>

      {/* Control Bar: Pencarian, Filter & Pengurutan */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '18px 20px',
        marginBottom: '24px',
        boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        {/* Baris 1: Search Input */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            position: 'relative',
            flex: '1 1 320px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <i className="fas fa-search" style={{
              position: 'absolute',
              left: '14px',
              color: '#94a3b8',
              fontSize: '0.95rem'
            }}></i>
            <input 
              type="text"
              placeholder="Cari nama foto atau folder... (tekan Enter untuk cari lintas Drive)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  handleGlobalSearch(searchQuery.trim());
                }
              }}
              style={{
                width: '100%',
                padding: '11px 40px 11px 40px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'all 0.2s',
                background: '#f8fafc'
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#0ea5e9'; e.currentTarget.style.background = '#ffffff'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
            />
            {searchQuery && (
              <button 
                onClick={() => {
                  setSearchQuery('');
                  if (isGlobalSearch) {
                    goToRoot();
                  }
                }}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem'
                }}
                title="Hapus pencarian"
              >
                <i className="fas fa-times-circle"></i>
              </button>
            )}
          </div>

          {/* Tombol Cari Lintas Google Drive */}
          {searchQuery.trim() && (
            <button
              onClick={() => handleGlobalSearch(searchQuery.trim())}
              disabled={globalSearching}
              style={{
                background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '11px 18px',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: globalSearching ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(14,165,233,0.3)',
                whiteSpace: 'nowrap'
              }}
            >
              {globalSearching ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-globe"></i>}
              {globalSearching ? 'Mencari...' : 'Cari di Seluruh Arsip'}
            </button>
          )}
        </div>

        {/* Baris 2: Filter Tabs & Sorting */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
          
          {/* Filter Tipe: Semua / Folder / Foto */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button 
              type="button"
              onClick={() => setFilterType('all')}
              style={{
                padding: '7px 16px',
                borderRadius: '20px',
                fontSize: '0.82rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: filterType === 'all' ? '#0284c7' : '#f1f5f9',
                color: filterType === 'all' ? '#ffffff' : '#64748b'
              }}
            >
              <i className="fas fa-th-large" style={{ marginRight: '6px' }}></i>
              Semua ({folders.length + files.length})
            </button>

            <button 
              type="button"
              onClick={() => setFilterType('folders')}
              style={{
                padding: '7px 16px',
                borderRadius: '20px',
                fontSize: '0.82rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: filterType === 'folders' ? '#f59e0b' : '#f1f5f9',
                color: filterType === 'folders' ? '#ffffff' : '#64748b'
              }}
            >
              <i className="fas fa-folder" style={{ marginRight: '6px' }}></i>
              Folder ({folders.length})
            </button>

            <button 
              type="button"
              onClick={() => setFilterType('photos')}
              style={{
                padding: '7px 16px',
                borderRadius: '20px',
                fontSize: '0.82rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: filterType === 'photos' ? '#10b981' : '#f1f5f9',
                color: filterType === 'photos' ? '#ffffff' : '#64748b'
              }}
            >
              <i className="fas fa-image" style={{ marginRight: '6px' }}></i>
              Foto ({files.length})
            </button>
          </div>

          {/* Sorting Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            <label style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <i className="fas fa-sort-amount-down"></i> Urutkan:
            </label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                color: '#1e293b',
                background: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="newest">⏱️ Waktu Terbaru</option>
              <option value="oldest">⏳ Waktu Terlama</option>
              <option value="name-asc">🔤 Nama (A &rarr; Z)</option>
              <option value="name-desc">🔤 Nama (Z &rarr; A)</option>
            </select>
          </div>
        </div>

      </div>

      {/* Global Search Banner Mode */}
      {isGlobalSearch && (
        <div style={{
          background: '#e0f2fe',
          border: '1px solid #bae6fd',
          borderRadius: '12px',
          padding: '14px 20px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '0.92rem', color: '#0369a1', fontWeight: 600 }}>
            <i className="fas fa-search" style={{ marginRight: '8px' }}></i>
            Menampilkan hasil pencarian Google Drive untuk: <b>"{searchQuery}"</b>
          </span>
          <button
            onClick={() => {
              setSearchQuery('');
              setIsGlobalSearch(false);
              goToRoot();
            }}
            style={{
              background: '#0284c7',
              color: 'white',
              border: 'none',
              padding: '7px 16px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className="fas fa-arrow-left"></i> Kembali ke Arsip Utama
          </button>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      {!isGlobalSearch && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px',
          fontSize: '0.88rem', color: '#64748b', flexWrap: 'wrap'
        }}>
          <button onClick={goToRoot} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: folderStack.length > 0 ? '#0ea5e9' : '#1e293b',
            fontWeight: folderStack.length > 0 ? 500 : 700, fontSize: '0.88rem', padding: 0
          }}>
            <i className="fas fa-home" style={{ marginRight: '4px' }}></i> Arsip Foto
          </button>
          {folderStack.map((f, i) => (
            <span key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-chevron-right" style={{ fontSize: '0.7rem', color: '#cbd5e1' }}></i>
              {i === folderStack.length - 1 ? (
                <span style={{ fontWeight: 700, color: '#1e293b' }}>{f.name}</span>
              ) : (
                <button onClick={() => {
                  const newStack = folderStack.slice(0, i + 1);
                  setFolderStack(newStack);
                  setSearchQuery('');
                  fetchData(f.id);
                }} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#0ea5e9', fontWeight: 500, fontSize: '0.88rem', padding: 0
                }}>
                  {f.name}
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Back Button */}
      {folderStack.length > 0 && !isGlobalSearch && (
        <button onClick={goBack} style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px',
          padding: '8px 16px', cursor: 'pointer', fontWeight: 600,
          color: '#475569', fontSize: '0.85rem', marginBottom: '18px',
          transition: 'all 0.2s'
        }}>
          <i className="fas fa-arrow-left"></i> Kembali ke Folder Sebelumnya
        </button>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '2.4rem', color: '#0ea5e9', marginBottom: '14px', display: 'block' }}></i>
          <span style={{ fontWeight: 600 }}>{globalSearching ? 'Mencari di seluruh Google Drive...' : 'Memuat arsip foto...'}</span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div style={{
          textAlign: 'center', padding: '40px', background: '#fef2f2',
          borderRadius: '12px', color: '#dc2626', fontWeight: 600, marginBottom: '24px'
        }}>
          <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i> {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Folders Section */}
          {displayedFolders.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <i className="fas fa-folder" style={{ color: '#f59e0b', fontSize: '1.1rem' }}></i>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                  Folder Kategori ({displayedFolders.length})
                </h2>
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '14px'
              }}>
                {displayedFolders.map(f => (
                  <button key={f.id} onClick={() => openFolder(f)} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '12px',
                    padding: '16px', cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.2s', fontWeight: 600, color: '#92400e',
                    fontSize: '0.88rem', boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(245,158,11,0.18)'; }}
                    onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.03)'; }}
                  >
                    <i className="fas fa-folder" style={{ fontSize: '1.6rem', color: '#f59e0b' }}></i>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Photos Section */}
          {displayedFiles.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <i className="fas fa-image" style={{ color: '#10b981', fontSize: '1.1rem' }}></i>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                  Foto Dokumentasi ({displayedFiles.length})
                </h2>
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                gap: '14px'
              }}>
                {displayedFiles.map((f, idx) => (
                  <div key={f.id} style={{
                    borderRadius: '12px', overflow: 'hidden', cursor: 'pointer',
                    border: '1px solid #e2e8f0', background: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)', transition: 'all 0.2s',
                    position: 'relative'
                  }}
                    onClick={() => setLightboxIndex(idx)}
                    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 22px rgba(0,0,0,0.12)'; }}
                    onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; }}
                  >
                    <div style={{ width: '100%', height: '160px', overflow: 'hidden', background: '#f1f5f9', position: 'relative' }}>
                      <img
                        src={`https://drive.google.com/thumbnail?id=${f.id}&sz=w400`}
                        alt={f.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        loading="lazy"
                        onError={e => { (e.target as HTMLImageElement).src = `https://drive.google.com/thumbnail?id=${f.id}&sz=w400`; }}
                      />
                    </div>
                    <div style={{ padding: '10px 12px' }}>
                      <p style={{
                        margin: 0, fontSize: '0.8rem', color: '#1e293b', fontWeight: 600,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}>
                        {f.name}
                      </p>
                      {f.createdTime && (
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '3px', display: 'block' }}>
                          <i className="far fa-clock" style={{ marginRight: '3px' }}></i>
                          {new Date(f.createdTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {displayedFolders.length === 0 && displayedFiles.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '60px 20px', background: '#f8fafc',
              borderRadius: '16px', border: '1.5px dashed #cbd5e1', color: '#64748b', marginTop: '10px'
            }}>
              <i className="fas fa-search" style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '16px', display: 'block' }}></i>
              <p style={{ fontWeight: 700, fontSize: '1.05rem', color: '#334155', margin: '0 0 6px 0' }}>
                {searchQuery ? `Tidak ada arsip foto yang cocok dengan "${searchQuery}"` : 'Folder ini belum memiliki arsip foto'}
              </p>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
                {searchQuery ? 'Coba ubah kata kunci pencarian atau gunakan tombol "Cari di Seluruh Arsip"' : 'Belum ada foto atau subfolder yang diunggah ke Google Drive di folder ini.'}
              </p>
              {searchQuery && !isGlobalSearch && (
                <button
                  onClick={() => handleGlobalSearch(searchQuery.trim())}
                  style={{
                    marginTop: '16px',
                    background: '#0284c7',
                    color: 'white',
                    border: 'none',
                    padding: '9px 18px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  <i className="fas fa-globe" style={{ marginRight: '6px' }}></i> Cari di Seluruh Google Drive
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Enhanced Lightbox with Next/Prev and Direct Drive Link */}
      {activePhoto && lightboxIndex !== null && (
        <div
          onClick={() => setLightboxIndex(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px', animation: 'fadeIn 0.2s ease', backdropFilter: 'blur(5px)'
          }}
        >
          {/* Top Bar inside Lightbox */}
          <div style={{
            position: 'absolute', top: '16px', left: '20px', right: '20px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white', zIndex: 10001
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '6px' }}>
                {lightboxIndex + 1} / {displayedFiles.length}
              </span>
              <span style={{ fontSize: '0.92rem', fontWeight: 600, maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activePhoto.name}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <a
                href={`https://drive.google.com/file/d/${activePhoto.id}/view`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  textDecoration: 'none',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Buka resolusi penuh di Google Drive"
              >
                <i className="fas fa-external-link-alt"></i> Buka Asli
              </a>

              <button onClick={() => setLightboxIndex(null)} style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
                width: '38px', height: '38px', borderRadius: '50%', cursor: 'pointer',
                fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s'
              }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>

          {/* Left Arrow Button */}
          {displayedFiles.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(prev => (prev !== null && prev > 0 ? prev - 1 : displayedFiles.length - 1));
              }}
              style={{
                position: 'absolute', left: '20px',
                background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
                width: '46px', height: '46px', borderRadius: '50%', cursor: 'pointer',
                fontSize: '1.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 10001, transition: 'all 0.2s'
              }}
              title="Foto sebelumnya (Tombol Panah Kiri)"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
          )}

          {/* Center Image */}
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '82vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img
              src={`https://drive.google.com/thumbnail?id=${activePhoto.id}&sz=w1200`}
              alt={activePhoto.name}
              style={{
                maxWidth: '90vw', maxHeight: '78vh', borderRadius: '10px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.6)', cursor: 'default',
                objectFit: 'contain'
              }}
            />
            {activePhoto.createdTime && (
              <span style={{ color: '#cbd5e1', fontSize: '0.8rem', marginTop: '10px' }}>
                Diambil / Diunggah: {new Date(activePhoto.createdTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB
              </span>
            )}
          </div>

          {/* Right Arrow Button */}
          {displayedFiles.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(prev => (prev !== null && prev < displayedFiles.length - 1 ? prev + 1 : 0));
              }}
              style={{
                position: 'absolute', right: '20px',
                background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
                width: '46px', height: '46px', borderRadius: '50%', cursor: 'pointer',
                fontSize: '1.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 10001, transition: 'all 0.2s'
              }}
              title="Foto selanjutnya (Tombol Panah Kanan)"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          )}
        </div>
      )}

    </div>
  );
}
