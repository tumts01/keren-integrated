'use client';
import { useState, useEffect } from 'react';
import styles from './Absensi.module.css';

export default function AbsensiGTK() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  
  // States for Clock
  const [time, setTime] = useState<Date | null>(null);
  
  // States for Attendance
  const [status, setStatus] = useState({ hasCheckedIn: false, hasCheckedOut: false, jamMasuk: null, jamPulang: null });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  // States for Recap
  const [activeTab, setActiveTab] = useState<'absen' | 'rekap'>('absen');
  const [rekapBulan, setRekapBulan] = useState(new Date().getMonth() + 1);
  const [rekapTahun, setRekapTahun] = useState(new Date().getFullYear());
  const [rekapData, setRekapData] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loadingRekap, setLoadingRekap] = useState(false);

  // States for Admin Holiday
  const [showModalLibur, setShowModalLibur] = useState(false);
  const [liburTanggal, setLiburTanggal] = useState('');
  const [liburKeterangan, setLiburKeterangan] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('keren_user_data');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchProfile(parsedUser.nama);
      fetchStatus(parsedUser.nama);
    }
  }, []);

  const fetchProfile = async (nama: string) => {
    try {
      const res = await fetch('/api/guru');
      const data = await res.json();
      if (data.success) {
        const found = data.data.find((g: any) => g.nama.toLowerCase().trim() === nama.toLowerCase().trim());
        setProfile(found);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStatus = async (nama: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/absensi?nama=${encodeURIComponent(nama)}`);
      const data = await res.json();
      if (data.success) {
        setStatus(data.todayStatus);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRekap = async () => {
    if (!user) return;
    setLoadingRekap(true);
    try {
      const bln = rekapBulan.toString().padStart(2, '0');
      const thn = rekapTahun.toString();
      const res = await fetch(`/api/absensi?nama=${encodeURIComponent(user.nama)}&bulan=${bln}&tahun=${thn}`);
      const data = await res.json();
      if (data.success) {
        setRekapData(data.rekap);
        setHolidays(data.holidays);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRekap(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'rekap') {
      fetchRekap();
    }
  }, [activeTab, rekapBulan, rekapTahun]);

  const handleAbsen = async (action: 'checkin' | 'checkout') => {
    if (!user) return;
    setActionLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/absensi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, nama: user.nama })
      });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message);
        fetchStatus(user.nama); // refresh status
      } else {
        setMessage(data.error);
      }
    } catch (err) {
      setMessage('Gagal memproses absensi.');
    } finally {
      setActionLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleSaveLibur = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/absensi/libur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tanggal: liburTanggal, keterangan: liburKeterangan })
      });
      const data = await res.json();
      if (data.success) {
        alert('Hari libur berhasil disimpan!');
        setShowModalLibur(false);
        setLiburTanggal('');
        setLiburKeterangan('');
        if (activeTab === 'rekap') fetchRekap();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Gagal menyimpan hari libur.');
    }
  };

  if (!time || !user) return <div style={{ padding: '24px' }}>Loading...</div>;

  // Generate days in month for recap
  const daysInMonth = new Date(rekapTahun, rekapBulan, 0).getDate();
  const recapRows = [];
  let hadirCount = 0;

  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${i.toString().padStart(2, '0')}/${rekapBulan.toString().padStart(2, '0')}/${rekapTahun}`;
    const dateObj = new Date(rekapTahun, rekapBulan - 1, i);
    const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'long' });
    
    // Check if it's Sunday or in holidays
    const isSunday = dateObj.getDay() === 0;
    const holidayInfo = holidays.find(h => h.tanggal === dateStr);
    
    if (holidayInfo || isSunday) {
      recapRows.push(
        <tr key={i}>
          <td colSpan={8} className={styles.printHoliday} style={{ background: '#f1f5f9', textAlign: 'center', fontWeight: 'bold' }}>
            {holidayInfo ? holidayInfo.keterangan : 'LIBUR AKHIR PEKAN'}
          </td>
        </tr>
      );
    } else {
      const dataAbsen = rekapData.find(r => r.tanggal === dateStr);
      if (dataAbsen) hadirCount++;
      recapRows.push(
        <tr key={i}>
          <td>{i}</td>
          <td>{dayName}, {dateStr}</td>
          <td style={{ textAlign: 'center' }}>07:00</td>
          <td style={{ textAlign: 'center' }}>{dataAbsen ? dataAbsen.jam_masuk : '-'}</td>
          <td style={{ textAlign: 'center' }}>-</td>
          <td style={{ textAlign: 'center' }}>14:05</td>
          <td style={{ textAlign: 'center' }}>{dataAbsen ? dataAbsen.jam_pulang : '-'}</td>
          <td style={{ textAlign: 'center' }}>-</td>
          <td></td>
        </tr>
      );
    }
  }

  const bulanNama = new Date(rekapTahun, rekapBulan - 1, 1).toLocaleDateString('id-ID', { month: 'long' }).toUpperCase();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Absensi GTK</h1>
        <p className={styles.subtitle}>Catat kehadiran Anda setiap hari dengan mudah.</p>
      </div>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'absen' ? styles.active : ''}`}
          onClick={() => setActiveTab('absen')}
        >
          <i className="fas fa-fingerprint"></i> Absen Harian
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'rekap' ? styles.active : ''}`}
          onClick={() => setActiveTab('rekap')}
        >
          <i className="fas fa-calendar-check"></i> Rekap Kehadiran
        </button>
      </div>

      {activeTab === 'absen' && (
        <div className={styles.card} style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className={styles.clockContainer}>
            <div className={styles.time}>{time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
            <div className={styles.date}>{time.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{user.nama}</h3>
            <p style={{ color: '#64748b', margin: 0 }}>{profile?.jabatan || user.rule}</p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', color: '#64748b' }}><i className="fas fa-spinner fa-spin"></i> Memeriksa status...</div>
          ) : (
            <div className={styles.actionContainer}>
              <button 
                className={styles.btnCheckIn} 
                onClick={() => handleAbsen('checkin')}
                disabled={status.hasCheckedIn || actionLoading}
              >
                <i className="fas fa-sign-in-alt"></i> Check In
              </button>
              <button 
                className={styles.btnCheckOut} 
                onClick={() => handleAbsen('checkout')}
                disabled={!status.hasCheckedIn || status.hasCheckedOut || actionLoading}
              >
                <i className="fas fa-sign-out-alt"></i> Check Out
              </button>
            </div>
          )}

          {message && (
            <div style={{ marginTop: '20px', textAlign: 'center', fontWeight: 'bold', color: message.includes('Berhasil') ? '#10b981' : '#ef4444' }}>
              {message}
            </div>
          )}

          {status.hasCheckedIn && (
            <div style={{ marginTop: '30px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#475569' }}>Status Hari Ini</p>
              <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Jam Masuk</span>
                  <span style={{ fontWeight: 'bold', color: '#10b981' }}>{status.jamMasuk}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Jam Pulang</span>
                  <span style={{ fontWeight: 'bold', color: status.hasCheckedOut ? '#f59e0b' : '#94a3b8' }}>
                    {status.jamPulang || '--:--'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'rekap' && (
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <select className={styles.input} style={{ width: '150px' }} value={rekapBulan} onChange={e => setRekapBulan(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i+1} value={i+1}>{new Date(2000, i, 1).toLocaleDateString('id-ID', { month: 'long' })}</option>
                ))}
              </select>
              <select className={styles.input} style={{ width: '120px' }} value={rekapTahun} onChange={e => setRekapTahun(Number(e.target.value))}>
                {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              {user.rule?.toLowerCase() === 'admin' && (
                <button className="btn" style={{ background: '#3b82f6', color: 'white' }} onClick={() => setShowModalLibur(true)}>
                  <i className="fas fa-calendar-alt"></i> Set Hari Libur
                </button>
              )}
              <button className="btn btn-primary" onClick={() => window.print()}>
                <i className="fas fa-print"></i> Cetak Rekap
              </button>
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Hari, Tanggal</th>
                  <th>Jam Masuk (Std)</th>
                  <th>Check In</th>
                  <th>Jam Pulang (Std)</th>
                  <th>Check Out</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loadingRekap ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center' }}>Memuat data...</td></tr>
                ) : (
                  recapRows.map((row, idx) => {
                    // Extracting for UI display (simplifying from print logic)
                    if (row.props.children.props?.colSpan === 8) {
                      return (
                        <tr key={idx}>
                          <td colSpan={7} style={{ background: '#f1f5f9', textAlign: 'center', fontWeight: 'bold' }}>
                            {row.props.children.props.children}
                          </td>
                        </tr>
                      );
                    }
                    const children = row.props.children;
                    return (
                      <tr key={idx}>
                        <td>{children[0].props.children}</td>
                        <td>{children[1].props.children}</td>
                        <td>{children[2].props.children}</td>
                        <td><strong style={{ color: '#10b981' }}>{children[3].props.children}</strong></td>
                        <td>{children[5].props.children}</td>
                        <td><strong style={{ color: '#f59e0b' }}>{children[6].props.children}</strong></td>
                        <td>{children[3].props.children !== '-' ? 'Hadir' : '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Holiday Modal */}
      {showModalLibur && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <h3 style={{ margin: '0 0 20px 0' }}>Pengaturan Hari Libur</h3>
            <form onSubmit={handleSaveLibur}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Tanggal (DD/MM/YYYY)</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  placeholder="Contoh: 17/08/2026"
                  value={liburTanggal}
                  onChange={e => setLiburTanggal(e.target.value)}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Keterangan Libur</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  placeholder="Contoh: Hari Kemerdekaan RI"
                  value={liburKeterangan}
                  onChange={e => setLiburKeterangan(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                <button type="button" className="btn" style={{ flex: 1, background: '#cbd5e1' }} onClick={() => setShowModalLibur(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Layout */}
      {activeTab === 'rekap' && (
        <div className={styles.printOnly}>
          <div className={styles.printHeader}>
            ATTENDANCE RECORD
          </div>
          
          <table className={styles.printInfoTable}>
            <tbody>
              <tr>
                <td style={{ width: '150px' }}>NAMA</td>
                <td>{user.nama}</td>
                <td rowSpan={4} style={{ textAlign: 'right' }}>
                  <img src="/logo.png" alt="Logo" className={styles.printLogo} />
                </td>
              </tr>
              <tr>
                <td>JABATAN</td>
                <td>{profile?.jabatan || user.rule?.toUpperCase() || '-'}</td>
              </tr>
              <tr>
                <td>DEPARTMENT</td>
                <td>MTs Almaarif 01 Singosari</td>
              </tr>
              <tr>
                <td>BULAN</td>
                <td>{bulanNama} {rekapTahun}</td>
              </tr>
              <tr>
                <td>JUMLAH KEHADIRAN</td>
                <td colSpan={2}>{hadirCount}</td>
              </tr>
            </tbody>
          </table>

          <table className={styles.printRecapTable}>
            <thead>
              <tr>
                <th>NO</th>
                <th>HARI, TANGGAL</th>
                <th>JAM MASUK</th>
                <th>CHECK IN</th>
                <th>SELISIH</th>
                <th>JAM PULANG</th>
                <th>CHECK OUT</th>
                <th>SELISIH</th>
                <th>KETERANGAN</th>
              </tr>
            </thead>
            <tbody>
              {recapRows}
            </tbody>
          </table>

          <div className={styles.printTtd}>
            <p>Singosari, {new Date(rekapTahun, rekapBulan, 0).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p style={{ marginBottom: '60px' }}>Mengetahui,<br/>Kepala Madrasah</p>
            <p style={{ fontWeight: 'bold', textDecoration: 'underline' }}>DWI RETNO PALUPI, M.Pd.</p>
          </div>
        </div>
      )}
    </div>
  );
}
