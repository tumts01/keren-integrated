'use client';
import { useState, useEffect } from 'react';
import styles from './pengumuman.module.css';

export default function PengumumanPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sendingTo, setSendingTo] = useState<'all' | 'pimpinan' | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });
  const [history, setHistory] = useState<any[]>([]);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/pengumuman');
      const data = await res.json();
      if (data.success) {
        setHistory(data.data);
        localStorage.setItem('keren_last_pengumuman_count', data.total.toString());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('keren_user_data');
    if (storedUser) setUser(JSON.parse(storedUser));
    fetchHistory().then(() => setLoading(false));
  }, []);

  const isAdmin = user?.rule?.toLowerCase() === 'admin';

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
          target: target === 'pimpinan' ? 'pimpinan' : 'semua'
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const label = target === 'pimpinan' ? 'Pimpinan' : 'seluruh Guru & Staf';
        setStatus({ type: 'success', text: `Pengumuman berhasil dikirim ke ${label} via WhatsApp!` });
        setMessage('');
        fetchHistory();
      } else {
        setStatus({ type: 'error', text: data.error || 'Gagal mengirim pengumuman.' });
      }
    } catch {
      setStatus({ type: 'error', text: 'Terjadi kesalahan sistem. Coba lagi.' });
    } finally {
      setSendingTo(null);
    }
  };

  if (loading) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>{isAdmin ? 'Broadcast Pengumuman' : 'Papan Pengumuman'}</h1>
        <p>{isAdmin ? 'Kirim pesan WhatsApp ke Guru & Staf atau khusus Pimpinan' : 'Daftar informasi dan pengumuman terbaru'}</p>
      </div>

      {isAdmin && (
        <div className={styles.card}>
          <form onSubmit={e => e.preventDefault()}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="message">Isi Pesan Pengumuman</label>
              <textarea
                id="message"
                className={styles.textarea}
                placeholder="Ketik pengumuman di sini..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={sendingTo !== null}
              />
            </div>

            {/* Dua tombol kirim */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {/* Kirim semua GTK */}
              <button
                type="button"
                className={styles.submitBtn}
                disabled={sendingTo !== null || !message.trim()}
                onClick={() => handleSend('all')}
                style={{ flex: 1, minWidth: 180 }}
              >
                {sendingTo === 'all' ? (
                  <><i className="fa-solid fa-spinner fa-spin"></i> Mengirim...</>
                ) : (
                  <><i className="fa-brands fa-whatsapp"></i> Kirim ke Semua GTK</>
                )}
              </button>

              {/* Kirim ke Pimpinan */}
              <button
                type="button"
                disabled={sendingTo !== null || !message.trim()}
                onClick={() => handleSend('pimpinan')}
                style={{
                  flex: 1, minWidth: 180,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px 20px',
                  background: (sendingTo !== null || !message.trim())
                    ? '#e9d5ff'
                    : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                  color: 'white', border: 'none', borderRadius: 12,
                  fontSize: '0.95rem', fontWeight: 700,
                  cursor: (sendingTo !== null || !message.trim()) ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
                  transition: 'all 0.2s'
                }}
              >
                {sendingTo === 'pimpinan' ? (
                  <><i className="fa-solid fa-spinner fa-spin"></i> Mengirim...</>
                ) : (
                  <><i className="fa-solid fa-user-tie"></i> Kirim ke Pimpinan</>
                )}
              </button>
            </div>

            {status.type && (
              <div
                className={`${styles.alertMessage} ${status.type === 'success' ? styles.alertSuccess : styles.alertError}`}
                style={{ marginTop: 12 }}
              >
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
          {history.length === 0 ? (
            <div className={styles.noHistory}>Belum ada pengumuman.</div>
          ) : (
            history.map((h, i) => (
              <div key={i} className={styles.historyCard}>
                <div className={styles.historyMeta}>
                  <span className={styles.historySender}>
                    <i className="fa-solid fa-user mr-1"></i> {h.pengirim}
                  </span>
                  <span>
                    <i className="fa-solid fa-calendar mr-1"></i> {h.tanggal} - {h.jam} WIB
                  </span>
                  {h.target && (
                    <span style={{
                      background: h.target === 'Pimpinan' ? '#ede9fe' : '#dcfce7',
                      color: h.target === 'Pimpinan' ? '#7c3aed' : '#15803d',
                      borderRadius: 20, padding: '2px 10px',
                      fontSize: '0.75rem', fontWeight: 700
                    }}>
                      <i className={`fas ${h.target === 'Pimpinan' ? 'fa-user-tie' : 'fa-users'}`} style={{ marginRight: 4 }}></i>
                      {h.target}
                    </span>
                  )}
                </div>
                <div className={styles.historyMessage}>{h.pesan}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
