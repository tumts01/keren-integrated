import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import styles from './EVoting.module.css';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function EVoting({ isAdmin = false }: { isAdmin?: boolean }) {
  const [view, setView] = useState<'login' | 'vote' | 'dashboard'>('login');
  const [kandidatList, setKandidatList] = useState<any[]>([]);
  const [totalPemilih, setTotalPemilih] = useState(0);
  const [loading, setLoading] = useState(false);
  const [voterName, setVoterName] = useState('');
  const [namesDb, setNamesDb] = useState<string[]>([]);
  
  useEffect(() => {
    // Fetch kandidat
    fetchKandidat();
    // Fetch names for autocomplete
    fetchNames();
  }, []);

  const fetchKandidat = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/e-voting/kandidat');
      const result = await res.json();
      if (result.success) {
        setKandidatList(result.data);
        setTotalPemilih(result.totalPemilih || 0);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fetchNames = async () => {
    try {
      const [resSiswa, resGuru] = await Promise.all([
        fetch('/api/siswa'),
        fetch('/api/guru')
      ]);
      const dataSiswa = await resSiswa.json();
      const dataGuru = await resGuru.json();
      
      let allNames: string[] = [];
      if (dataSiswa.success) {
        allNames = [...allNames, ...dataSiswa.data.map((s: any) => s.nama)];
      }
      if (dataGuru.success) {
        allNames = [...allNames, ...dataGuru.data.map((g: any) => g.nama)];
      }
      
      const uniqueNames = Array.from(new Set(allNames.filter(Boolean)));
      setNamesDb(uniqueNames);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voterName.trim()) {
      Swal.fire('Oops', 'Silakan masukkan nama Anda', 'warning');
      return;
    }
    
    // Optional: Validate if name exists in DB to prevent random names
    const exactMatch = namesDb.find(n => n.toLowerCase() === voterName.trim().toLowerCase());
    if (!exactMatch) {
      Swal.fire('Tidak Terdaftar', 'Nama tidak ditemukan di database Siswa/Guru. Pastikan memilih nama dari saran yang muncul.', 'error');
      return;
    }

    setVoterName(exactMatch); // Normalize to DB case
    setView('vote');
  };

  const handleCoblos = async (kandidat: any) => {
    const confirm = await Swal.fire({
      title: 'Konfirmasi Pilihan',
      html: `Anda akan memilih:<br/><b>Paslon ${kandidat.noUrut} - ${kandidat.nama}</b><br/><br/>Pilihan tidak dapat diubah setelah disimpan!`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Coblos Sekarang!',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#10b981'
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    try {
      const res = await fetch('/api/e-voting/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namaPemilih: voterName,
          namaPaslon: kandidat.nama
        })
      });
      const result = await res.json();
      if (result.success) {
        Swal.fire({
          title: 'Terima Kasih!',
          text: 'Suara Anda berhasil direkam.',
          icon: 'success',
          timer: 3000,
          showConfirmButton: false
        });
        setVoterName('');
        setView('login');
        fetchKandidat(); // Refresh data
      } else {
        Swal.fire('Gagal', result.error, 'error');
        if (result.error.includes('sudah pernah')) {
          setVoterName('');
          setView('login');
        }
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
    setLoading(false);
  };

  const chartData = {
    labels: kandidatList.map(k => `Paslon ${k.noUrut}: ${k.nama}`),
    datasets: [
      {
        label: 'Perolehan Suara',
        data: kandidatList.map(k => k.suara),
        backgroundColor: [
          'rgba(59, 130, 246, 0.7)',
          'rgba(16, 185, 129, 0.7)',
          'rgba(245, 158, 11, 0.7)',
          'rgba(239, 68, 68, 0.7)',
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}><i className="fas fa-vote-yea"></i> E-Voting Pemilihan Ketua OSIM</h2>
      <p className={styles.subtitle}>Gunakan hak pilih Anda dengan bijak.</p>

      {isAdmin && (
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <button 
            className={styles.btnPrimary} 
            style={{ width: 'auto', marginRight: '10px', background: view === 'dashboard' ? '#0f172a' : '#3b82f6' }}
            onClick={() => setView('dashboard')}
          >
            <i className="fas fa-chart-bar"></i> Quick Count
          </button>
          <button 
            className={styles.btnPrimary} 
            style={{ width: 'auto', background: view === 'login' ? '#0f172a' : '#3b82f6' }}
            onClick={() => setView('login')}
          >
            <i className="fas fa-user-check"></i> Form Pemilih
          </button>
        </div>
      )}

      {view === 'login' && (
        <div className={styles.loginCard}>
          <i className="fas fa-fingerprint" style={{ fontSize: '4rem', color: '#cbd5e1', marginBottom: '1rem' }}></i>
          <h3>Verifikasi Pemilih</h3>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Silakan masukkan nama lengkap Anda (Siswa/Guru) untuk mulai memilih.</p>
          <form onSubmit={handleLogin}>
            <input 
              type="text" 
              className={styles.input} 
              placeholder="Ketik Nama Anda..."
              value={voterName}
              onChange={(e) => setVoterName(e.target.value)}
              list="nama-list"
              required
            />
            <datalist id="nama-list">
              {namesDb.map((n, i) => <option key={i} value={n} />)}
            </datalist>
            <button type="submit" className={styles.btnPrimary}>
              Lanjut ke Surat Suara <i className="fas fa-arrow-right"></i>
            </button>
          </form>
        </div>
      )}

      {view === 'vote' && (
        <div>
          <div style={{ background: '#eff6ff', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #3b82f6', marginBottom: '20px' }}>
            Pemilih Aktif: <strong>{voterName}</strong>
          </div>
          
          <div className={styles.grid}>
            {kandidatList.map((k, idx) => (
              <div key={idx} className={styles.paslonCard}>
                <div style={{ display: 'flex', width: '100%', height: '250px', background: '#f1f5f9' }}>
                  {k.fotoKetua && <img src={k.fotoKetua} alt={`Ketua ${k.noUrut}`} style={{ flex: k.fotoWakil ? 1 : 'none', width: k.fotoWakil ? '50%' : '100%', objectFit: 'cover', borderRight: k.fotoWakil ? '2px solid white' : 'none' }} />}
                  {k.fotoWakil && <img src={k.fotoWakil} alt={`Wakil ${k.noUrut}`} style={{ flex: 1, width: '50%', objectFit: 'cover' }} />}
                  {!k.fotoKetua && !k.fotoWakil && (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                      <i className="fas fa-user-tie" style={{ fontSize: '4rem' }}></i>
                    </div>
                  )}
                </div>
                <div className={styles.paslonContent}>
                  <div className={styles.nomorUrut}>PASLON {k.noUrut}</div>
                  <div className={styles.namaPaslon}>{k.nama}</div>
                  <div className={styles.visimisi}>
                    <h4>Visi</h4>
                    <p>{k.visi || '-'}</p>
                    <h4>Misi</h4>
                    <p>{k.misi || '-'}</p>
                  </div>
                  <button className={styles.btnCoblos} onClick={() => handleCoblos(k)} disabled={loading}>
                    <i className="fas fa-check-circle"></i> COBLOS
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'dashboard' && (
        <div className={styles.quickCountCard}>
          <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>Hasil Quick Count Sementara</h3>
          <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '30px' }}>Total Pemilih Masuk: {totalPemilih} Suara</p>
          
          <div style={{ height: '400px' }}>
            <Bar 
              data={chartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false }
                },
                scales: {
                  y: { beginAtZero: true, ticks: { precision: 0 } }
                }
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
