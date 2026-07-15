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
  
  return (
    <header className={styles.header}>
      <div className={styles.search}>
        <i className={`fas fa-search ${styles.searchIcon}`}></i>
        <input 
          type="text" 
          placeholder="Cari data siswa, no BON..." 
          className={styles.searchInput} 
        />
      </div>

      <div className={styles.actions}>
        <button className={styles.iconBtn}>
          <i className="far fa-bell"></i>
        </button>
        <div className={styles.profile}>
          {user?.foto ? (
            <img src={user.foto} alt="Profile" className={styles.avatar} style={{ objectFit: 'cover' }} />
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
