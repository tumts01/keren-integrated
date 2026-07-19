'use client';
import { useState, useEffect } from 'react';
import styles from './pengumuman.module.css';

export default function PengumumanPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });

  useEffect(() => {
    const storedUser = localStorage.getItem('keren_user_data');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
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
      } else {
        setStatus({ type: 'error', text: data.error || 'Gagal mengirim pengumuman.' });
      }
    } catch (error: any) {
      setStatus({ type: 'error', text: 'Terjadi kesalahan sistem. Coba lagi.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Broadcast Pengumuman</h1>
        <p>Kirim pesan WhatsApp massal ke seluruh Guru & Staf</p>
      </div>

      <div className={styles.card}>
        {!isAdmin ? (
          <div className={styles.notAdmin}>
            <i className="fa-solid fa-lock"></i>
            <h2>Akses Ditolak</h2>
            <p>Hanya pengguna dengan hak akses <b>Admin</b> yang dapat mengirimkan pengumuman.</p>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
