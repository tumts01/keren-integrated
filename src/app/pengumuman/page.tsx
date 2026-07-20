'use client';
import { useState, useEffect, useMemo } from 'react';
import styles from './pengumuman.module.css';

// ===== CUSTOM SEND MODAL =====
function CustomSendModal({
  pesan, pengirim, onClose, onSent
}: { pesan: string; pengirim: string; onClose: () => void; onSent: () => void }) {
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
      const res = await fetch('/api/pengumuman', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pesan, pengirim,
          target: 'custom',
          phones: Array.from(selected)
        })
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
  const [sendingTo, setSendingTo] = useState<'all' | 'pimpinan' | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });
  const [history, setHistory] = useState<any[]>([]);
  const [showCustomModal, setShowCustomModal] = useState(false);

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

  const isAdmin = user?.rule?.toLowerCase() === 'admin';
  const [viaAppOnly, setViaAppOnly] = useState(false);

  const handleSend = async (target: 'all' | 'pimpinan') => {
    if (!message.trim()) {
      setStatus({ type: 'error', text: 'Isi pengumuman tidak boleh kosong.' });
      return;
    }
    setSendingTo(target);
    setStatus({ type: null, text: '' });
    try {
      const response = await fetch('/api/pengumuman', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pesan: message,
          pengirim: user?.nama || 'Admin',
          target: target === 'pimpinan' ? 'pimpinan' : 'semua',
          viaAppOnly
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const label = target === 'pimpinan' ? 'Pimpinan' : 'seluruh Guru & Staf';
        setStatus({ type: 'success', text: `Pengumuman berhasil ${viaAppOnly ? 'diposting di Aplikasi untuk' : 'dikirim ke'} ${label}!` });
        setMessage(''); fetchHistory();
      } else {
        setStatus({ type: 'error', text: data.error || 'Gagal mengirim pengumuman.' });
      }
    } catch { setStatus({ type: 'error', text: 'Terjadi kesalahan sistem. Coba lagi.' }); }
    finally { setSendingTo(null); }
  };

  const badgeStyle = (target: string) => ({
    background: target === 'Pimpinan' ? '#ede9fe' : target?.includes('Guru Pilihan') ? '#e0f2fe' : '#dcfce7',
    color: target === 'Pimpinan' ? '#7c3aed' : target?.includes('Guru Pilihan') ? '#0284c7' : '#15803d',
    borderRadius: 20, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700
  });

  const badgeIcon = (target: string) =>
    target === 'Pimpinan' ? 'fa-user-tie' : target?.includes('Guru Pilihan') ? 'fa-user-check' : 'fa-users';

  if (loading) return null;

  return (
    <div className={styles.container}>
      {/* Custom Send Modal */}
      {showCustomModal && (
        <CustomSendModal
          pesan={message}
          pengirim={user?.nama || 'Admin'}
          onClose={() => setShowCustomModal(false)}
          onSent={() => { setMessage(''); setStatus({ type: 'success', text: 'Pengumuman berhasil dikirim ke guru pilihan via WhatsApp!' }); fetchHistory(); }}
        />
      )}

      <div className={styles.header}>
        <h1>{isAdmin ? 'Broadcast Pengumuman' : 'Papan Pengumuman'}</h1>
        <p>{isAdmin ? 'Kirim pesan WhatsApp ke Semua GTK, Pimpinan, atau Guru Tertentu' : 'Daftar informasi dan pengumuman terbaru'}</p>
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
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <input 
                type="checkbox" id="viaAppOnly" 
                checked={viaAppOnly} onChange={e => setViaAppOnly(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#0ea5e9' }}
              />
              <label htmlFor="viaAppOnly" style={{ fontSize: '0.85rem', cursor: 'pointer', color: '#475569', fontWeight: 600 }}>
                Hanya tampilkan di Aplikasi (Jangan kirim pesan WhatsApp)
              </label>
            </div>

            {/* Tiga tombol kirim */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {/* Semua GTK */}
              <button type="button" className={styles.submitBtn}
                disabled={sendingTo !== null || !message.trim()}
                onClick={() => handleSend('all')}
                style={{ flex: 1, minWidth: 160 }}>
                {sendingTo === 'all'
                  ? <><i className="fa-solid fa-spinner fa-spin"></i> Mengirim...</>
                  : <><i className="fa-brands fa-whatsapp"></i> Kirim ke Semua GTK</>}
              </button>

              {/* Pimpinan */}
              <button type="button"
                disabled={sendingTo !== null || !message.trim()}
                onClick={() => handleSend('pimpinan')}
                style={{
                  flex: 1, minWidth: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px 16px',
                  background: (sendingTo !== null || !message.trim()) ? '#e9d5ff' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                  color: 'white', border: 'none', borderRadius: 12, fontSize: '0.9rem', fontWeight: 700,
                  cursor: (sendingTo !== null || !message.trim()) ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(124,58,237,0.25)', transition: 'all 0.2s'
                }}>
                {sendingTo === 'pimpinan'
                  ? <><i className="fa-solid fa-spinner fa-spin"></i> Mengirim...</>
                  : <><i className="fa-solid fa-user-tie"></i> Kirim ke Pimpinan</>}
              </button>

              {/* Guru Tertentu */}
              <button type="button"
                disabled={sendingTo !== null || !message.trim()}
                onClick={() => setShowCustomModal(true)}
                style={{
                  flex: 1, minWidth: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px 16px',
                  background: (sendingTo !== null || !message.trim()) ? '#bae6fd' : 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                  color: 'white', border: 'none', borderRadius: 12, fontSize: '0.9rem', fontWeight: 700,
                  cursor: (sendingTo !== null || !message.trim()) ? 'not-allowed' : 'pointer',
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
            const visibleHistory = isAdmin
              ? history
              : history.filter(h => !h.target || h.target === 'Semua GTK');

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
                </div>
              ))
            );
          })()}
        </div>
      </div>
    </div>
  );
}
