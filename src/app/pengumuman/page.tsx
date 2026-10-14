'use client';
import { useState, useEffect, useMemo } from 'react';
import styles from './pengumuman.module.css';
import LoadingScreen from '@/components/LoadingScreen';

// ===== CUSTOM SEND MODAL =====
function CustomSendModal({
  pesan, pengirim, attachmentFile, onClose, onSent
}: { pesan: string; pengirim: string; attachmentFile: File | null; onClose: () => void; onSent: () => void }) {
  const [gtkList, setGtkList] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingGtk, setLoadingGtk] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/pengumuman?list=gtk')
      .then(r => r.json())
      .then(j => { setGtkList(j.data || []); setLoadingGtk(false); });
  }, []);

  const filtered = useMemo(() =>
    gtkList.filter(g => g.nama.toLowerCase().includes(search.toLowerCase()) ||
      (g.jabatan || '').toLowerCase().includes(search.toLowerCase())),
    [gtkList, search]
  );

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(g => g.noWA)));
    }
  };

  const toggle = (noWA: string) => {
    const s = new Set(selected);
    s.has(noWA) ? s.delete(noWA) : s.add(noWA);
    setSelected(s);
  };

  const handleSend = async () => {
    if (selected.size === 0) { setErr('Pilih minimal 1 guru'); return; }
    setSending(true); setErr('');
    try {
      const fd = new FormData();
      fd.append('pesan', pesan);
      fd.append('pengirim', pengirim);
      fd.append('target', 'custom');
      fd.append('phones', JSON.stringify(Array.from(selected)));
      if (attachmentFile) fd.append('file', attachmentFile);

      const res = await fetch('/api/pengumuman', {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      if (data.success) { onSent(); onClose(); }
      else setErr(data.error || 'Gagal mengirim');
    } catch { setErr('Terjadi kesalahan jaringan'); }
    finally { setSending(false); }
  };

  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520,
        maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
          padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
              <i className="fas fa-user-check" style={{ marginRight: 8 }}></i>Pilih Penerima
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', marginTop: 2 }}>
              {selected.size} guru dipilih dari {gtkList.length} GTK aktif
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
            borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontWeight: 700
          }}><i className="fas fa-times"></i></button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ position: 'relative' }}>
            <i className="fas fa-search" style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              color: '#94a3b8', fontSize: '0.85rem'
            }}></i>
            <input
              style={{
                width: '100%', padding: '8px 8px 8px 32px', border: '1.5px solid #e2e8f0',
                borderRadius: 8, fontSize: '0.875rem', outline: 'none'
              }}
              placeholder="Cari nama atau jabatan..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Pilih Semua */}
        <div style={{
          padding: '8px 16px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc'
        }}>
          <input type="checkbox" id="selectAll" checked={allSelected}
            onChange={toggleAll} style={{ width: 16, height: 16, cursor: 'pointer' }} />
          <label htmlFor="selectAll" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', color: '#475569' }}>
            {allSelected ? 'Batalkan Semua' : `Pilih Semua (${filtered.length})`}
          </label>
        </div>

        {/* List GTK */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {loadingGtk ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
              <i className="fas fa-spinner fa-spin"></i> Memuat daftar GTK...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: '0.875rem' }}>
              Tidak ada hasil
            </div>
          ) : filtered.map((g, i) => (
            <div key={i}
              onClick={() => toggle(g.noWA)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                background: selected.has(g.noWA) ? '#eff6ff' : 'transparent',
                transition: 'background 0.15s'
              }}>
              <input type="checkbox" checked={selected.has(g.noWA)} onChange={() => toggle(g.noWA)}
                onClick={e => e.stopPropagation()}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#0ea5e9' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{g.nama}</div>
                {g.jabatan && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{g.jabatan}</div>}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{g.noWA}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
          {err && <div style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: 8 }}>
            <i className="fas fa-exclamation-circle" style={{ marginRight: 4 }}></i>{err}
          </div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} disabled={sending} style={{
              flex: 1, padding: '10px', background: '#f1f5f9', border: '1px solid #e2e8f0',
              borderRadius: 10, cursor: 'pointer', fontWeight: 600, color: '#475569'
            }}>Batal</button>
            <button onClick={handleSend} disabled={sending || selected.size === 0} style={{
              flex: 2, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: selected.size === 0 ? '#bae6fd' : 'linear-gradient(135deg, #0ea5e9, #0284c7)',
              color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}>
              {sending ? <><i className="fas fa-spinner fa-spin"></i> Mengirim...</> :
                <><i className="fas fa-paper-plane"></i> Kirim ke {selected.size} Guru</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== MAIN PAGE =====
export default function PengumumanPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [shareToPortal, setShareToPortal] = useState(false);
  const [sendingTo, setSendingTo] = useState<'all' | 'pimpinan' | 'siswa' | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });
  const [history, setHistory] = useState<any[]>([]);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/pengumuman');
      const data = await res.json();
      if (data.success) {
        setHistory(data.data);
        localStorage.setItem('keren_last_pengumuman_count', data.total.toString());
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('keren_user_data');
    if (storedUser) setUser(JSON.parse(storedUser));
    fetchHistory().then(() => setLoading(false));
  }, []);

  const isAdmin = user?.role?.toLowerCase() === 'admin';

  const handleSend = async (target: 'all' | 'pimpinan' | 'siswa') => {
    if (!message.trim() && !attachment) {
      setStatus({ type: 'error', text: 'Isi pengumuman atau lampiran tidak boleh kosong.' });
      return;
    }
    setSendingTo(target);
    setStatus({ type: null, text: '' });
    try {
      const fd = new FormData();
      fd.append('pesan', message);
      fd.append('pengirim', user?.nama || 'Admin');

      let finalTarget = target === 'pimpinan' ? 'pimpinan' : target === 'siswa' ? 'siswa' : 'semua';
      if (target === 'all' && shareToPortal) {
        finalTarget = 'semua_all';
      }

      fd.append('target', finalTarget);
      fd.append('kirimKePortal', (target === 'siswa' || shareToPortal).toString());
      fd.append('viaAppOnly', 'true');
      if (attachment) fd.append('file', attachment);

      const response = await fetch('/api/pengumuman', {
        method: 'POST',
        body: fd
      });
      const data = await response.json();
      if (response.ok && data.success) {
        let label = 'seluruh Guru & Staf';
        if (target === 'pimpinan') label = 'Pimpinan';
        else if (target === 'siswa') label = 'Portal Siswa & Wali Murid';
        else if (shareToPortal) label = 'Guru, Staf, & Portal Siswa';

        setStatus({ type: 'success', text: `Pengumuman berhasil diposting untuk ${label}!` });
        setMessage(''); setAttachment(null); setShareToPortal(false); fetchHistory();
      } else {
        setStatus({ type: 'error', text: data.error || 'Gagal mengirim pengumuman.' });
      }
    } catch { setStatus({ type: 'error', text: 'Terjadi kesalahan sistem. Coba lagi.' }); }
    finally { setSendingTo(null); }
  };

  const togglePortalShare = async (id: number, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/pengumuman', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, kirimKePortal: !currentStatus })
      });
      const data = await res.json();
      if (data.success) {
        fetchHistory();
      } else {
        alert('Gagal mengubah status portal: ' + (data.error || 'Error'));
      }
    } catch (e: any) {
      alert('Gagal mengubah status: ' + e.message);
    }
  };

  const badgeStyle = (target: string) => {
    if (target?.includes('Portal Siswa') || target?.includes('Siswa')) {
      return { background: '#ecfdf5', color: '#059669', borderRadius: 20, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #a7f3d0' };
    }
    if (target === 'Pimpinan' || target?.includes('Pimpinan')) {
      return { background: '#ede9fe', color: '#7c3aed', borderRadius: 20, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700 };
    }
    if (target?.includes('Guru Pilihan')) {
      return { background: '#e0f2fe', color: '#0284c7', borderRadius: 20, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700 };
    }
    return { background: '#dcfce7', color: '#15803d', borderRadius: 20, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700 };
  };

  const badgeIcon = (target: string) => {
    if (target?.includes('Portal Siswa') || target?.includes('Siswa')) return 'fa-graduation-cap';
    if (target?.includes('Pimpinan')) return 'fa-user-tie';
    if (target?.includes('Guru Pilihan')) return 'fa-user-check';
    return 'fa-users';
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className={styles.container}>
      {/* Custom Send Modal */}
      {showCustomModal && (
        <CustomSendModal
          pesan={message}
          pengirim={user?.nama || 'Admin'}
          attachmentFile={attachment}
          onClose={() => setShowCustomModal(false)}
          onSent={() => { setMessage(''); setAttachment(null); setStatus({ type: 'success', text: 'Pengumuman berhasil diposting di Aplikasi untuk guru pilihan!' }); fetchHistory(); }}
        />
      )}

      <div className={styles.header}>
        <h1>{isAdmin ? 'Broadcast Pengumuman' : 'Papan Pengumuman'}</h1>
        <p>{isAdmin ? 'Kirim Pengumuman ke GTK atau Portal Siswa & Wali Murid' : 'Daftar informasi dan pengumuman terbaru'}</p>
      </div>

      {isAdmin && (
        <div className={styles.card}>
          <form onSubmit={e => e.preventDefault()}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="message">Isi Pesan Pengumuman</label>
              <textarea
                id="message" className={styles.textarea}
                placeholder="Ketik pengumuman di sini..."
                value={message} onChange={(e) => setMessage(e.target.value)}
                disabled={sendingTo !== null}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Lampirkan File (Opsional, Max 2MB)</label>
              <label style={{ 
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '10px 16px', border: '2px dashed #0ea5e9', borderRadius: '8px',
                cursor: 'pointer', color: '#0ea5e9', fontWeight: 600, fontSize: '0.9rem',
                background: '#f0f9ff', width: 'fit-content'
              }}>
                <i className="fas fa-paperclip"></i> Pilih File JPG/PDF/Word
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                  style={{ display: 'none' }} 
                  disabled={sendingTo !== null}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) {
                      if (f.size > 2 * 1024 * 1024) {
                        alert('Ukuran file maksimal 2MB!');
                        e.target.value = '';
                        return;
                      }
                      setAttachment(f);
                    } else {
                      setAttachment(null);
                    }
                  }} 
                />
              </label>
              {attachment && (
                <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#16a34a', fontWeight: '500' }}>
                  ✅ File dilampirkan: {attachment.name} 
                  <button type="button" onClick={() => setAttachment(null)} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>✕ Batal</button>
                </div>
              )}
            </div>

            {/* Opsi Kirim ke Portal Siswa Checkbox */}
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', background: '#f0fdf4', padding: '10px 14px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
              <input
                type="checkbox"
                id="shareToPortal"
                checked={shareToPortal}
                onChange={(e) => setShareToPortal(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#10b981' }}
              />
              <label htmlFor="shareToPortal" style={{ fontSize: '0.875rem', color: '#166534', fontWeight: 600, cursor: 'pointer' }}>
                <i className="fas fa-graduation-cap" style={{ marginRight: '6px', color: '#10b981' }}></i>
                Tayangkan juga di Portal Siswa & Wali Murid
              </label>
            </div>
            
            {/* Tombol kirim */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {/* Tombol Kirim ke Portal Siswa */}
              <button type="button"
                disabled={sendingTo !== null || (!message.trim() && !attachment)}
                onClick={() => handleSend('siswa')}
                style={{
                  flex: 1, minWidth: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px 16px',
                  background: (sendingTo !== null || (!message.trim() && !attachment)) ? '#bbf7d0' : 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white', border: 'none', borderRadius: 12, fontSize: '0.9rem', fontWeight: 700,
                  cursor: (sendingTo !== null || (!message.trim() && !attachment)) ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(16,185,129,0.25)', transition: 'all 0.2s'
                }}>
                {sendingTo === 'siswa'
                  ? <><i className="fa-solid fa-spinner fa-spin"></i> Mengirim...</>
                  : <><i className="fa-solid fa-graduation-cap"></i> Kirim ke Portal Siswa</>}
              </button>

              {/* Semua GTK */}
              <button type="button" className={styles.submitBtn}
                disabled={sendingTo !== null || (!message.trim() && !attachment)}
                onClick={() => handleSend('all')}
                style={{ flex: 1, minWidth: 160 }}>
                {sendingTo === 'all'
                  ? <><i className="fa-solid fa-spinner fa-spin"></i> Mengirim...</>
                  : <><i className="fa-solid fa-bullhorn"></i> {shareToPortal ? 'Kirim ke GTK & Portal' : 'Kirim ke Semua GTK'}</>}
              </button>

              {/* Guru Tertentu */}
              <button type="button"
                disabled={sendingTo !== null || (!message.trim() && !attachment)}
                onClick={() => setShowCustomModal(true)}
                style={{
                  flex: 1, minWidth: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px 16px',
                  background: (sendingTo !== null || (!message.trim() && !attachment)) ? '#bae6fd' : 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                  color: 'white', border: 'none', borderRadius: 12, fontSize: '0.9rem', fontWeight: 700,
                  cursor: (sendingTo !== null || (!message.trim() && !attachment)) ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(14,165,233,0.25)', transition: 'all 0.2s'
                }}>
                <i className="fa-solid fa-user-check"></i> Pilih Guru Tertentu
              </button>
            </div>

            {status.type && (
              <div className={`${styles.alertMessage} ${status.type === 'success' ? styles.alertSuccess : styles.alertError}`}
                style={{ marginTop: 12 }}>
                <i className={`fa-solid ${status.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'} mr-2`}></i>
                {status.text}
              </div>
            )}
          </form>
        </div>
      )}

      {/* Riwayat */}
      <div className={styles.historyContainer}>
        <h2 className={styles.historyTitle}>
          <i className="fa-solid fa-clock-rotate-left"></i> Riwayat Pengumuman
        </h2>
        <div className={styles.historyList}>
          {(() => {
            const isPimpinan = user?.role?.toLowerCase() === 'pimpinan';
            const visibleHistory = isAdmin
              ? history
              : history.filter(h => {
                  if (!h.target) return true;
                  if (h.target === 'Semua GTK' || h.target === 'Aplikasi: Semua GTK') return true;
                  if (isPimpinan && (h.target === 'Pimpinan' || h.target === 'Aplikasi: Pimpinan')) return true;
                  return false;
                });

            return visibleHistory.length === 0 ? (
              <div className={styles.noHistory}>Belum ada pengumuman.</div>
            ) : (
              visibleHistory.map((h, i) => (
                <div key={i} className={styles.historyCard}>
                  <div className={styles.historyMeta}>
                    <span className={styles.historySender}>
                      <i className="fa-solid fa-user mr-1"></i> {h.pengirim}
                    </span>
                    <span>
                      <i className="fa-solid fa-calendar mr-1"></i> {h.tanggal} - {h.jam} WIB
                    </span>
                    {isAdmin && h.target && (
                      <span style={badgeStyle(h.target)}>
                        <i className={`fas ${badgeIcon(h.target)}`} style={{ marginRight: 4 }}></i>
                        {h.target}
                      </span>
                    )}
                  </div>
                  <div className={styles.historyMessage}>{h.pesan}</div>
                  
                  {/* Actions / Lampiran row */}
                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    {h.lampiran ? (
                      <a href={h.lampiran} target="_blank" rel="noreferrer" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '6px 12px', background: '#f1f5f9', color: '#0ea5e9',
                        borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600,
                        textDecoration: 'none', border: '1px solid #e2e8f0'
                      }}>
                        <i className="fas fa-paperclip"></i> Lihat Lampiran
                      </a>
                    ) : <div />}

                    {/* Admin Portal Toggle Button */}
                    {isAdmin && h.id && (
                      <button
                        type="button"
                        onClick={() => togglePortalShare(h.id, h.kirimKePortal)}
                        style={{
                          background: h.kirimKePortal ? '#ecfdf5' : '#f8fafc',
                          border: h.kirimKePortal ? '1px solid #10b981' : '1px solid #cbd5e1',
                          color: h.kirimKePortal ? '#059669' : '#64748b',
                          padding: '5px 12px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                        title={h.kirimKePortal ? 'Klik untuk menarik pengumuman dari Portal Siswa' : 'Klik untuk menampilkan pengumuman ini di Portal Siswa'}
                      >
                        <i className={`fas ${h.kirimKePortal ? 'fa-check-circle' : 'fa-share-square'}`}></i>
                        {h.kirimKePortal ? 'Tayang di Portal Siswa' : 'Bagikan ke Portal Siswa'}
                      </button>
                    )}
                  </div>
                </div>
              ))
            );
          })()}
        </div>
      </div>
    </div>
  );
}
