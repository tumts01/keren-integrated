'use client';
import { useState, useEffect } from 'react';
import styles from './pengumuman.module.css';

export default function PengumumanPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    fetchHistory().then(() => setLoading(false));
  }, []);

  const isAdmin = user?.rule?.toLowerCase() === 'admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setStatus({ type: 'error', text: 'Isi pengumuman tidak boleh kosong.' });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: null, text: '' });

    try {
      const response = await fetch('/api/pengumuman', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pesan: message,
          pengirim: user?.nama || 'Admin'
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus({ type: 'success', text: 'Pengumuman berhasil dikirim ke seluruh Guru & Staf via WhatsApp!' });
        setMessage(''); // Reset form
        fetchHistory(); // Segarkan riwayat
      } else {
        setStatus({ type: 'error', text: data.error || 'Gagal mengirim pengumuman.' });
      }
    } catch (error: any) {
      setStatus({ type: 'error', text: 'Terjadi kesalahan sistem. Coba lagi.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderHistory = () => (
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
                <span className={styles.historySender}><i className="fa-solid fa-user mr-1"></i> {h.pengirim}</span>
                <span><i className="fa-solid fa-calendar mr-1"></i> {h.tanggal} - {h.jam} WIB</span>
              </div>
              <div className={styles.historyMessage}>{h.pesan}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  if (loading) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>{isAdmin ? 'Broadcast Pengumuman' : 'Papan Pengumuman'}</h1>
        <p>{isAdmin ? 'Kirim pesan WhatsApp massal ke seluruh Guru & Staf' : 'Daftar informasi dan pengumuman terbaru'}</p>
      </div>

      {isAdmin && (
        <div className={styles.card}>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="message">Isi Pesan Pengumuman</label>
              <textarea
                id="message"
                className={styles.textarea}
                placeholder="Ketik pengumuman di sini... (Otomatis terkirim ke seluruh nomor WA GTK yang aktif)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <button 
              type="submit" 
              className={styles.submitBtn} 
              disabled={isSubmitting || !message.trim()}
            >
              {isSubmitting ? (
                <><i className="fa-solid fa-spinner fa-spin"></i> Mengirim Pesan...</>
              ) : (
                <><i className="fa-brands fa-whatsapp"></i> Kirim WA ke Semua User</>
              )}
            </button>

            {status.type && (
              <div className={`${styles.alertMessage} ${status.type === 'success' ? styles.alertSuccess : styles.alertError}`}>
                <i className={`fa-solid ${status.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'} mr-2`}></i> 
                {status.text}
              </div>
            )}
          </form>
        </div>
      )}

      {renderHistory()}
    </div>
  );
}
