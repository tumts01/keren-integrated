'use client';
import { useState } from 'react';
import styles from './Header.module.css';

interface HeaderProps {
  user: {
    nama: string;
    username: string;
    foto: string;
    rule: string;
  };
  onLogout: () => void;
}

export default function Header({ user, onLogout }: HeaderProps) {
  // Use first letter of Name (or Username) if no photo
  const initial = user?.nama ? user.nama.charAt(0).toUpperCase() : (user?.username ? user.username.charAt(0).toUpperCase() : 'U');
  
  // Helper to convert Google Drive /view links to raw image links
  const getImageUrl = (url: string) => {
    if (!url) return '';
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (url.includes('drive.google.com') && match && match[1]) {
      // Menggunakan lh3.googleusercontent.com yang lebih stabil untuk gambar publik
      return `https://lh3.googleusercontent.com/d/${match[1]}=w200-h200`;
    }
    return url;
  };

  const [imageError, setImageError] = useState(false);
  const fotoUrl = user?.foto && !imageError ? getImageUrl(user.foto) : '';
  
  return (
    <header className={styles.header}>
      {/* Search dihapus sesuai permintaan */}
      <div style={{ flex: 1 }}></div>

      <div className={styles.actions}>
        <button className={styles.iconBtn}>
          <i className="far fa-bell"></i>
        </button>
        <div className={styles.profile}>
          {fotoUrl ? (
            <img 
              src={fotoUrl} 
              alt="Profile" 
              className={styles.avatar} 
              style={{ objectFit: 'cover' }} 
              onError={() => setImageError(true)}
            />
          ) : (
            <div className={styles.avatar}>{initial}</div>
          )}
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.nama || user?.username}</span>
            <span className={styles.userRole}>{user?.rule || 'Staf'}</span>
          </div>
        </div>
        <button onClick={onLogout} className={styles.iconBtn} title="Keluar">
          <i className="fas fa-sign-out-alt"></i>
        </button>
      </div>
    </header>
  );
}
