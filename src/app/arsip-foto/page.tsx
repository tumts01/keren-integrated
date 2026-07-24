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
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [error, setError] = useState('');

  const currentFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : '';

  const fetchData = async (folderId?: string) => {
    setLoading(true);
    setError('');
    try {
      const url = folderId ? `/api/arsip-foto?folderId=${folderId}` : '/api/arsip-foto';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setFolders(data.folders);
        setFiles(data.files);
        setCurrentName(data.folderName);
      } else {
        setError(data.error || 'Gagal memuat data');
      }
    } catch {
      setError('Gagal menghubungi server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openFolder = (folder: DriveFolder) => {
    setFolderStack(prev => [...prev, folder]);
    fetchData(folder.id);
  };

  const goBack = () => {
    const newStack = [...folderStack];
    newStack.pop();
    setFolderStack(newStack);
    const parentId = newStack.length > 0 ? newStack[newStack.length - 1].id : undefined;
    fetchData(parentId);
  };

  const goToRoot = () => {
    setFolderStack([]);
    fetchData();
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
        borderRadius: '16px', padding: '28px 32px', marginBottom: '24px',
        color: 'white', boxShadow: '0 8px 24px rgba(14,165,233,0.3)'
      }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <i className="fas fa-images"></i> Arsip Foto
        </h1>
        <p style={{ margin: '6px 0 0', opacity: 0.85, fontSize: '0.9rem' }}>
          Galeri dokumentasi kegiatan madrasah
        </p>
      </div>

      {/* Breadcrumb */}
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

      {/* Back Button */}
      {folderStack.length > 0 && (
        <button onClick={goBack} style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px',
          padding: '8px 16px', cursor: 'pointer', fontWeight: 600,
          color: '#475569', fontSize: '0.85rem', marginBottom: '16px',
          transition: 'all 0.2s'
        }}>
          <i className="fas fa-arrow-left"></i> Kembali
        </button>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '12px', display: 'block' }}></i>
          Memuat arsip foto...
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{
          textAlign: 'center', padding: '40px', background: '#fef2f2',
          borderRadius: '12px', color: '#dc2626', fontWeight: 600
        }}>
          <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i> {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Folders Grid */}
          {folders.length > 0 && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '14px', marginBottom: '28px'
            }}>
              {folders.map(f => (
                <button key={f.id} onClick={() => openFolder(f)} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px',
                  padding: '16px', cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.2s', fontWeight: 600, color: '#92400e',
                  fontSize: '0.88rem', boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                }}
                  onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)'; }}
                  onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)'; }}
                >
                  <i className="fas fa-folder" style={{ fontSize: '1.4rem', color: '#f59e0b' }}></i>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Photos Grid */}
          {files.length > 0 && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '12px'
            }}>
              {files.map(f => (
                <div key={f.id} style={{
                  borderRadius: '12px', overflow: 'hidden', cursor: 'pointer',
                  border: '1px solid #e2e8f0', background: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'all 0.2s'
                }}
                  onClick={() => setLightbox(f.id)}
                  onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.12)'; }}
                  onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
                >
                  <img
                    src={`https://lh3.googleusercontent.com/d/${f.id}=w400`}
                    alt={f.name}
                    style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }}
                    loading="lazy"
                    onError={e => { (e.target as HTMLImageElement).src = `https://drive.google.com/thumbnail?id=${f.id}&sz=w400`; }}
                  />
                  <div style={{ padding: '8px 10px' }}>
                    <p style={{
                      margin: 0, fontSize: '0.78rem', color: '#475569', fontWeight: 500,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      {f.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {folders.length === 0 && files.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '60px 20px', color: '#94a3b8'
            }}>
              <i className="fas fa-folder-open" style={{ fontSize: '3rem', marginBottom: '16px', display: 'block' }}></i>
              <p style={{ fontWeight: 600, fontSize: '1rem' }}>Folder ini kosong</p>
              <p style={{ fontSize: '0.85rem' }}>Belum ada foto atau subfolder di sini.</p>
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out', padding: '20px', animation: 'fadeIn 0.2s ease'
          }}
        >
          <button onClick={() => setLightbox(null)} style={{
            position: 'absolute', top: '20px', right: '24px',
            background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
            width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer',
            fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <i className="fas fa-times"></i>
          </button>
          <img
            src={`https://lh3.googleusercontent.com/d/${lightbox}=w1200`}
            alt="Preview"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '90vw', maxHeight: '85vh', borderRadius: '8px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)', cursor: 'default',
              objectFit: 'contain'
            }}
          />
        </div>
      )}
    </div>
  );
}
