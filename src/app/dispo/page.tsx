'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import styles from '../presensi/presensi.module.css';

export default function DispoPage() {
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [jamKedatangan, setJamKedatangan] = useState('');
  
  // States for student autocomplete
  const [siswaList, setSiswaList] = useState<any[]>([]); // All students
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSiswa, setSelectedSiswa] = useState<any>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [alasanTerlambat, setAlasanTerlambat] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [dispoHistory, setDispoHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    // Clock for Jam Kedatangan
    const timer = setInterval(() => {
      const now = new Date();
      setJamKedatangan(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Load user role
    const storedUser = localStorage.getItem('keren_user_data');
    const usernameRaw = localStorage.getItem('username') || '';
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setCurrentUsername(u.nama || usernameRaw);
      } catch {
        setCurrentUsername(usernameRaw);
      }
    } else {
      setCurrentUsername(usernameRaw);
    }

    // Load all students for autocomplete
    fetch('/api/siswa').then(res => res.json()).then(data => {
      if (data.success) {
        const aktif = data.data.filter((s: any) => s.isLatest && (s.status || '').toLowerCase().trim() === 'aktif');
        setSiswaList(aktif);
      }
    });

    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/dispo');
      const json = await res.json();
      if (json.success) {
        setDispoHistory(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSelectSiswa = (s: any) => {
    setSelectedSiswa(s);
    setSearchTerm(`${s.nama} (${s.rombel})`);
    setShowSuggestions(false);
  };

  const filteredSiswa = searchTerm
    ? siswaList.filter(s => 
        (s.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
         s.rombel.toLowerCase().includes(searchTerm.toLowerCase())) &&
        selectedSiswa?.id !== s.id
      ).slice(0, 10)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiswa) {
      Swal.fire({ icon: 'warning', title: 'Oops...', text: 'Pilih siswa dari daftar yang tersedia!' });
      return;
    }
    if (!alasanTerlambat.trim()) {
      Swal.fire({ icon: 'warning', title: 'Oops...', text: 'Alasan terlambat wajib diisi!' });
      return;
    }

    const confirm = await Swal.fire({
      title: 'Simpan Data Dispo?',
      text: `Siswa: ${selectedSiswa.nama} (${selectedSiswa.rombel})`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, Simpan!'
    });

    if (!confirm.isConfirmed) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/dispo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal,
          jamKedatangan,
          kelas: selectedSiswa.rombel,
          namaSiswa: selectedSiswa.nama,
          alasanTerlambat,
          petugasDispo: currentUsername || 'Unknown'
        })
      });
      const data = await res.json();
      
      if (data.success) {
        Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Data dispo berhasil disimpan.' });
        setSearchTerm('');
        setSelectedSiswa(null);
        setAlasanTerlambat('');
        fetchHistory();
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal', text: data.error || 'Terjadi kesalahan' });
      }
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const todayHistory = dispoHistory.filter(r => r.tanggal === tanggal);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Dispo Siswa (Terlambat)</h1>
        <p className={styles.subtitle}>Catat dan kelola data siswa yang datang terlambat</p>
      </header>

      <div className={styles.content}>
        <div className={styles.card} style={{ maxWidth: '600px', margin: '0 auto 30px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fas fa-user-clock" style={{ color: '#ea580c' }}></i> Input Dispo
          </h2>
          
          <form onSubmit={handleSubmit}>
            <div className={styles.filterSection} style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className={styles.filterGroup}>
                <label>Tanggal</label>
                <input 
                  type="date" 
                  value={tanggal} 
                  onChange={(e) => setTanggal(e.target.value)}
                  className={styles.inputField}
                  required
                />
              </div>
              <div className={styles.filterGroup}>
                <label>Jam Kedatangan</label>
                <input 
                  type="text" 
                  value={jamKedatangan} 
                  readOnly
                  className={styles.inputField}
                  style={{ background: '#f8fafc', fontWeight: 'bold', color: '#334155' }}
                />
              </div>
            </div>

            <div className={styles.filterGroup} style={{ position: 'relative', marginBottom: '16px' }}>
              <label>Ketik Nama Siswa</label>
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedSiswa(null);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Cari nama atau kelas..."
                className={styles.inputField}
                style={{ width: '100%', marginBottom: 0 }}
                autoComplete="off"
                required
              />
              {showSuggestions && searchTerm && !selectedSiswa && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #cbd5e1', borderRadius: '0 0 8px 8px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                  {filteredSiswa.length > 0 ? filteredSiswa.map(s => (
                    <div 
                      key={s.id} 
                      onClick={() => handleSelectSiswa(s)}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span style={{ fontWeight: 500, color: '#1e293b' }}>{s.nama}</span>
                      <span style={{ fontSize: '0.8rem', background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>Kelas {s.rombel}</span>
                    </div>
                  )) : (
                    <div style={{ padding: '10px 14px', color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic' }}>Tidak ada siswa yang cocok</div>
                  )}
                </div>
              )}
            </div>

            <div className={styles.filterGroup} style={{ marginBottom: '24px' }}>
              <label>Alasan Terlambat</label>
              <input 
                type="text" 
                value={alasanTerlambat}
                onChange={(e) => setAlasanTerlambat(e.target.value)}
                placeholder="Contoh: Bangun kesiangan, ban bocor..."
                className={styles.inputField}
                style={{ width: '100%' }}
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting || !selectedSiswa}
              style={{ width: '100%', background: (!selectedSiswa || isSubmitting) ? '#94a3b8' : '#ea580c', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, cursor: (!selectedSiswa || isSubmitting) ? 'not-allowed' : 'pointer' }}
            >
              {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-save mr-2"></i> Simpan Dispo</>}
            </button>
          </form>
        </div>

        <div className={styles.card}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <i className="fas fa-history" style={{ color: '#475569' }}></i> Riwayat Hari Ini ({tanggal})
          </h2>
          
          {loadingHistory ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: '10px' }}></i>
              <p>Memuat riwayat...</p>
            </div>
          ) : todayHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
              <i className="fas fa-check-circle" style={{ fontSize: '2.5rem', marginBottom: '10px', color: '#10b981', opacity: 0.7 }}></i>
              <p>Belum ada siswa yang terlambat hari ini.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Jam</th>
                    <th>Nama Siswa</th>
                    <th>Kelas</th>
                    <th>Alasan</th>
                    <th>Petugas Dispo</th>
                  </tr>
                </thead>
                <tbody>
                  {todayHistory.map((r, idx) => (
                    <tr key={r.id}>
                      <td>{idx + 1}</td>
                      <td><span style={{ fontWeight: 600, color: '#ea580c' }}>{r.jamKedatangan}</span></td>
                      <td style={{ fontWeight: 500 }}>{r.namaSiswa}</td>
                      <td><span style={{ fontSize: '0.8rem', background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>{r.kelas}</span></td>
                      <td>{r.alasanTerlambat}</td>
                      <td style={{ fontSize: '0.85rem' }}>{r.petugasDispo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
