'use client';
import { useState, useEffect } from 'react';
import styles from './Absensi.module.css';

export default function AbsensiGTK() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  
  // States for Clock
  const [time, setTime] = useState<Date | null>(null);
  
  // States for Attendance
  const [status, setStatus] = useState<{ hasCheckedIn: boolean; hasCheckedOut: boolean; jamMasuk: string | null; jamPulang: string | null; isHoliday?: boolean; holidayName?: string | null }>({ hasCheckedIn: false, hasCheckedOut: false, jamMasuk: null, jamPulang: null });
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
  const [guruList, setGuruList] = useState<any[]>([]);
  const [rekapUser, setRekapUser] = useState('');

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
        setGuruList(data.data);
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
    const targetUser = rekapUser || user?.nama;
    if (!targetUser) return;
    setLoadingRekap(true);
    try {
      const bln = rekapBulan.toString().padStart(2, '0');
      const thn = rekapTahun.toString();
      const res = await fetch(`/api/absensi?nama=${encodeURIComponent(targetUser)}&bulan=${bln}&tahun=${thn}`);
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
  }, [activeTab, rekapBulan, rekapTahun, rekapUser]);

  const handleAbsen = async (action: 'checkin' | 'checkout') => {
    if (!user || actionLoading) return; // proteksi double submit
    setActionLoading(true);
    setMessage('');

    // ── OPTIMISTIC UPDATE ──────────────────────────────────────────────────
    // Langsung ubah state lokal agar tombol nonaktif & jam tampil SEKETIKA
    // (tidak perlu menunggu API response)
    const currentTimeOptimistic = new Date().toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit'
    });
    const prevStatus = { ...status }; // simpan untuk rollback jika gagal
    if (action === 'checkin') {
      setStatus(s => ({ ...s, hasCheckedIn: true, jamMasuk: currentTimeOptimistic }));
    } else {
      setStatus(s => ({ ...s, hasCheckedOut: true, jamPulang: currentTimeOptimistic }));
    }
    // ──────────────────────────────────────────────────────────────────────

    const maxRetries = 3;
    let lastError = '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch('/api/absensi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, nama: user.nama })
        });
        const data = await res.json();
        if (data.success) {
          setMessage(data.message);
          // Perbarui dengan waktu akurat dari server
          if (action === 'checkin') {
            setStatus(s => ({ ...s, hasCheckedIn: true, jamMasuk: data.time || currentTimeOptimistic }));
          } else {
            setStatus(s => ({ ...s, hasCheckedOut: true, jamPulang: data.time || currentTimeOptimistic }));
          }
          setActionLoading(false);
          setTimeout(() => setMessage(''), 4000);
          return; // sukses, keluar
        } else {
          // Error dari server (bukan network) — rollback & hentikan retry
          setStatus(prevStatus);
          setMessage(data.error || 'Gagal memproses absensi.');
          setActionLoading(false);
          setTimeout(() => setMessage(''), 4000);
          return;
        }
      } catch (err) {
        lastError = `Koneksi gagal, mencoba ulang... (${attempt}/${maxRetries})`;
        if (attempt < maxRetries) {
          setMessage(lastError);
          await new Promise(r => setTimeout(r, 1000 * attempt)); // backoff: 1s, 2s
        }
      }
    }

    // Semua retry habis — rollback optimistic update
    setStatus(prevStatus);
    setMessage('Gagal terhubung ke server setelah beberapa percobaan. Cek koneksi internet dan coba lagi.');
    setActionLoading(false);
    setTimeout(() => setMessage(''), 6000);
  };

  const handleSaveLibur = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // transform YYYY-MM-DD from type="date" to DD/MM/YYYY expected by backend
      const parts = liburTanggal.split('-');
      const formattedTanggal = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : liburTanggal;

      const res = await fetch('/api/absensi/libur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tanggal: formattedTanggal, keterangan: liburKeterangan })
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

  if (!time || !user) return (
    <div className={styles.skeletonPage}>
      {/* Skeleton clock card */}
      <div className={styles.skeletonCard}>
        <div className={styles.skeletonCircle}></div>
        <div className={styles.skeletonLine} style={{ width: '60%', height: 28, marginTop: 16 }}></div>
        <div className={styles.skeletonLine} style={{ width: '40%', height: 16, marginTop: 10 }}></div>
      </div>
      {/* Skeleton absen card */}
      <div className={styles.skeletonCard}>
        <div className={styles.skeletonLine} style={{ width: '45%', height: 20, marginBottom: 20 }}></div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className={styles.skeletonBtn}></div>
          <div className={styles.skeletonBtn}></div>
        </div>
        <div className={styles.skeletonLine} style={{ width: '70%', height: 14, marginTop: 16 }}></div>
      </div>
      {/* Skeleton rekap card */}
      <div className={styles.skeletonCard}>
        <div className={styles.skeletonLine} style={{ width: '35%', height: 20, marginBottom: 16 }}></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className={styles.skeletonLine} style={{ width: `${75 + (i % 3) * 8}%`, height: 14, marginBottom: 10 }}></div>
        ))}
      </div>
    </div>
  );

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
        <tr key={i} style={{ background: '#f1f5f9' }}>
          <td>{i}</td>
          <td>{dayName}, {dateStr}</td>
          <td colSpan={7} className={styles.printHoliday} style={{ textAlign: 'center', fontWeight: 'bold' }}>
            {holidayInfo ? holidayInfo.keterangan : 'LIBUR AKHIR PEKAN'}
          </td>
        </tr>
      );
    } else {
      const dataAbsen = rekapData.find(r => r.tanggal === dateStr);
      if (dataAbsen) hadirCount++;

      const hitungSelisih = (std: string, actual: string | undefined | null) => {
        if (!actual || actual === '-') return '-';
        const partsAct = actual.replace('.', ':').split(':');
        const partsStd = std.split(':');
        if (partsAct.length !== 2 || partsStd.length !== 2) return '-';
        const actMin = parseInt(partsAct[0]) * 60 + parseInt(partsAct[1]);
        const stdMin = parseInt(partsStd[0]) * 60 + parseInt(partsStd[1]);
        const diff = actMin - stdMin;
        if (diff === 0) return '0m';
        const absDiff = Math.abs(diff);
        const h = Math.floor(absDiff / 60);
        const m = absDiff % 60;
        const fmt = `${h > 0 ? h + 'j ' : ''}${m}m`;
        return diff > 0 ? `+${fmt}` : `-${fmt}`;
      };

      recapRows.push(
        <tr key={i}>
          <td>{i}</td>
          <td>{dayName}, {dateStr}</td>
          <td style={{ textAlign: 'center' }}>07:00</td>
          <td style={{ textAlign: 'center' }}>{dataAbsen ? dataAbsen.jam_masuk : '-'}</td>
          <td style={{ textAlign: 'center', color: dataAbsen && dataAbsen.jam_masuk ? (hitungSelisih('07:00', dataAbsen.jam_masuk).startsWith('+') ? '#ef4444' : '#10b981') : 'inherit' }}>
            {dataAbsen ? hitungSelisih('07:00', dataAbsen.jam_masuk) : '-'}
          </td>
          <td style={{ textAlign: 'center' }}>14:05</td>
          <td style={{ textAlign: 'center' }}>{dataAbsen ? dataAbsen.jam_pulang : '-'}</td>
          <td style={{ textAlign: 'center', color: dataAbsen && dataAbsen.jam_pulang ? (hitungSelisih('14:05', dataAbsen.jam_pulang).startsWith('-') ? '#ef4444' : '#10b981') : 'inherit' }}>
            {dataAbsen ? hitungSelisih('14:05', dataAbsen.jam_pulang) : '-'}
          </td>
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
            <p style={{ color: '#64748b', margin: 0 }}>{profile?.jabatan || user.role}</p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', color: '#64748b' }}><i className="fas fa-spinner fa-spin"></i> Memeriksa status...</div>
          ) : (
            <div className={styles.actionContainer}>
              {status.isHoliday ? (
                <div style={{ width: '100%', padding: '15px', background: '#fee2e2', color: '#ef4444', borderRadius: '8px', fontWeight: 'bold', border: '1px solid #fca5a5', textAlign: 'center' }}>
                  <i className="fas fa-calendar-times" style={{ marginRight: '8px' }}></i>
                  Absensi Libur: {status.holidayName}
                </div>
              ) : (
                <>
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
                </>
              )}
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
              {user.role?.toLowerCase() === 'admin' && (
                <select 
                  className={styles.input} 
                  style={{ width: '200px' }} 
                  value={rekapUser || user.nama} 
                  onChange={e => setRekapUser(e.target.value)}
                >
                  {guruList.map((g, idx) => (
                    <option key={idx} value={g.nama}>{g.nama}</option>
                  ))}
                </select>
              )}
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
              {user.role?.toLowerCase() === 'admin' && (
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
                    const children = Array.isArray(row.props.children) ? row.props.children : [row.props.children];
                    // Holiday row: has background set (isHoliday) — check by row style
                    const isHolidayRow = row.props.style?.background === '#f1f5f9';
                    if (isHolidayRow) {
                      return (
                        <tr key={idx} style={{ background: '#f1f5f9' }}>
                          <td>{children[0]?.props?.children}</td>
                          <td>{children[1]?.props?.children}</td>
                          <td colSpan={5} style={{ textAlign: 'center', fontWeight: 'bold', color: '#64748b' }}>
                            {children[2]?.props?.children}
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={idx}>
                        <td>{children[0]?.props?.children}</td>
                        <td>{children[1]?.props?.children}</td>
                        <td>{children[2]?.props?.children}</td>
                        <td><strong style={{ color: '#10b981' }}>{children[3]?.props?.children}</strong></td>
                        <td>{children[5]?.props?.children}</td>
                        <td><strong style={{ color: '#f59e0b' }}>{children[6]?.props?.children}</strong></td>
                        <td>{children[3]?.props?.children !== '-' ? 'Hadir' : '-'}</td>
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
                <label className={styles.label}>Tanggal Libur</label>
                <input 
                  type="date" 
                  className={styles.input} 
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
                <td>{rekapUser || user.nama}</td>
                <td rowSpan={4} style={{ textAlign: 'right' }}>
                  <img src="/logo.png" alt="Logo" className={styles.printLogo} />
                </td>
              </tr>
              <tr>
                <td>JABATAN</td>
                <td>{guruList.find(g => g.nama === (rekapUser || user.nama))?.jabatan || profile?.jabatan || user.role?.toUpperCase() || '-'}</td>
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
            <p>Singosari, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p style={{ marginBottom: '60px' }}>Mengetahui,<br/>Kepala Madrasah</p>
            <p style={{ fontWeight: 'bold', textDecoration: 'underline' }}>DWI RETNO PALUPI, M.Pd.</p>
          </div>
        </div>
      )}
    </div>
  );
}
