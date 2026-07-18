'use client';

import React, { useState, useEffect } from 'react';
import styles from './presensi.module.css';

export default function PresensiPage() {
  const [activeTab, setActiveTab] = useState<'absen' | 'jurnal' | 'rekap_siswa' | 'rekap_jurnal'>('absen');

  // States for Absen Siswa
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedMapel, setSelectedMapel] = useState('');
  const [selectedJam, setSelectedJam] = useState<number[]>([]);
  
  // Dummy/Mock data states for template
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [mapelList, setMapelList] = useState<string[]>(['Matematika', 'Bahasa Indonesia', 'IPA', 'IPS', 'Bahasa Inggris', 'PJOK', 'PAI']);
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [presensi, setPresensi] = useState<Record<string, string>>({}); // { nisn: 'H' | 'S' | 'I' | 'A' }

  // Load classes and mapel (Mock for now, waiting for actual backend logic)
  useEffect(() => {
    // In actual implementation, fetch from /api/kelas and /api/jadwal/mapel
    fetch('/api/kelas').then(res => res.json()).then(data => {
      if (data.success) {
        // Unique kelas list, filter out invalid names like '-' or '7'
        const uniqueKelas = Array.from(new Set(data.data.map((k: any) => k.rombel)))
          .filter((k: any) => k && k.length >= 2 && k !== '-') as string[];
        
        // Sort properly (7A, 7B, 8A, etc.)
        uniqueKelas.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        setKelasList(uniqueKelas);
      }
    }).catch(err => console.error(err));
  }, []);

  // Effect when class changes (Mock loading students)
  useEffect(() => {
    if (selectedKelas) {
      // In actual implementation, fetch from /api/siswa and filter by selectedKelas
      fetch('/api/siswa').then(res => res.json()).then(data => {
        if (data.success) {
          // Find students in the selected class that are active and in the latest academic year
          const filtered = data.data.filter((s: any) => 
            s.rombel === selectedKelas && 
            s.isLatest && 
            (s.status || '').toLowerCase().trim() === 'aktif'
          );
          
          if (filtered.length > 0) {
            setSiswaList(filtered);
            // Otomatis set 'H' (Hadir) untuk semua siswa
            const defaultPresensi: Record<string, string> = {};
            filtered.forEach((s: any) => {
              defaultPresensi[s.nisn] = 'H';
            });
            setPresensi(defaultPresensi);
          } else {
             setSiswaList([]);
             setPresensi({});
          }
        }
      });
    } else {
      setSiswaList([]);
      setPresensi({});
    }
  }, [selectedKelas]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePresensiChange = (nisn: string, status: string) => {
    setPresensi(prev => ({
      ...prev,
      [nisn]: status
    }));
  };

  const toggleJam = (jam: number) => {
    setSelectedJam(prev => 
      prev.includes(jam) ? prev.filter(j => j !== jam) : [...prev, jam].sort((a,b) => a-b)
    );
  };

  const handleSubmit = async () => {
    if (!selectedKelas || !selectedMapel) {
      alert('Mohon pilih Kelas dan Mata Pelajaran terlebih dahulu!');
      return;
    }
    if (selectedJam.length === 0) {
      alert('Mohon pilih Jam Ke!');
      return;
    }

    if (!confirm(`Simpan presensi untuk kelas ${selectedKelas}?`)) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/presensi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal,
          jamKe: selectedJam.join(', '),
          kelas: selectedKelas,
          mapel: selectedMapel,
          presensi,
          siswaList
        })
      });
      const data = await res.json();
      
      if (data.success) {
        alert(`Berhasil menyimpan presensi! ${data.totalSaved > 0 ? (data.totalSaved + ' data S/I/A tercatat.') : 'Semua siswa Hadir (tidak ada data absen ke sheet).'}`);
      } else {
        alert('Gagal menyimpan: ' + (data.error || 'Terjadi kesalahan'));
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Presensi & Jurnal Mengajar</h1>
        <p className={styles.subtitle}>Kelola kehadiran siswa dan aktivitas jurnal harian</p>
      </header>

      <div className={styles.tabsContainer}>
        <div className={styles.tabsWrapper}>
          <div className={styles.tabs}>
            <button 
              className={`${styles.tab} ${activeTab === 'absen' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('absen')}
            >
              <i className="fas fa-user-check"></i>
              Absen Siswa
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'jurnal' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('jurnal')}
            >
              <i className="fas fa-book-open"></i>
              Jurnal Mengajar
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'rekap_siswa' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('rekap_siswa')}
            >
              <i className="fas fa-users"></i>
              Rekap Siswa
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'rekap_jurnal' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('rekap_jurnal')}
            >
              <i className="fas fa-clipboard-list"></i>
              Rekap Jurnal
            </button>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {activeTab === 'absen' && (
          <div className={styles.card}>
            <h2>Absen Siswa</h2>
            
            <div className={styles.filterSection}>
              <div className={styles.filterGroup}>
                <label>Tanggal</label>
                <input 
                  type="date" 
                  value={tanggal} 
                  onChange={(e) => setTanggal(e.target.value)}
                  className={styles.inputField}
                />
              </div>
              
              <div className={styles.filterGroup}>
                <label>Kelas</label>
                <select 
                  value={selectedKelas} 
                  onChange={(e) => setSelectedKelas(e.target.value)}
                  className={styles.inputField}
                >
                  <option value="">-- Pilih Kelas --</option>
                  {kelasList.map(kelas => (
                    <option key={kelas} value={kelas}>{kelas}</option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label>Jam Ke</label>
                <div className={styles.jamPills}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(jam => (
                    <button
                      key={jam}
                      className={`${styles.jamPill} ${selectedJam.includes(jam) ? styles.jamPillActive : ''}`}
                      onClick={() => toggleJam(jam)}
                    >
                      {jam}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.filterGroup}>
                <label>Mata Pelajaran</label>
                <select 
                  value={selectedMapel} 
                  onChange={(e) => setSelectedMapel(e.target.value)}
                  className={styles.inputField}
                >
                  <option value="">-- Pilih Mapel --</option>
                  {mapelList.map(mapel => (
                    <option key={mapel} value={mapel}>{mapel}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedKelas ? (
              <div className={styles.studentList}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>No</th>
                      <th>Nama Siswa</th>
                      <th style={{ textAlign: 'center' }}>Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siswaList.map((siswa, idx) => (
                      <tr key={siswa.nisn || siswa.id}>
                        <td>{idx + 1}</td>
                        <td style={{ fontWeight: 500 }}>{siswa.nama}</td>
                        <td>
                          <div className={styles.radioGroup}>
                            <label className={`${styles.radioLabel} ${presensi[siswa.nisn] === 'H' ? styles.radioCheckedH : ''}`}>
                              <input 
                                type="radio" 
                                name={`presensi_${siswa.nisn}`} 
                                value="H" 
                                checked={presensi[siswa.nisn] === 'H'}
                                onChange={() => handlePresensiChange(siswa.nisn, 'H')}
                              />
                              H
                            </label>
                            <label className={`${styles.radioLabel} ${presensi[siswa.nisn] === 'S' ? styles.radioCheckedS : ''}`}>
                              <input 
                                type="radio" 
                                name={`presensi_${siswa.nisn}`} 
                                value="S" 
                                checked={presensi[siswa.nisn] === 'S'}
                                onChange={() => handlePresensiChange(siswa.nisn, 'S')}
                              />
                              S
                            </label>
                            <label className={`${styles.radioLabel} ${presensi[siswa.nisn] === 'I' ? styles.radioCheckedI : ''}`}>
                              <input 
                                type="radio" 
                                name={`presensi_${siswa.nisn}`} 
                                value="I" 
                                checked={presensi[siswa.nisn] === 'I'}
                                onChange={() => handlePresensiChange(siswa.nisn, 'I')}
                              />
                              I
                            </label>
                            <label className={`${styles.radioLabel} ${presensi[siswa.nisn] === 'A' ? styles.radioCheckedA : ''}`}>
                              <input 
                                type="radio" 
                                name={`presensi_${siswa.nisn}`} 
                                value="A" 
                                checked={presensi[siswa.nisn] === 'A'}
                                onChange={() => handlePresensiChange(siswa.nisn, 'A')}
                              />
                              A
                            </label>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button 
                    className={styles.submitBtn} 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    style={{ opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                  >
                    <i className={isSubmitting ? "fas fa-spinner fa-spin" : "fas fa-save"} style={{ marginRight: '8px' }}></i>
                    {isSubmitting ? 'Menyimpan...' : 'Simpan Presensi'}
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <i className="fas fa-chalkboard-user"></i>
                <p>Silakan pilih kelas terlebih dahulu untuk melihat daftar siswa.</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'jurnal' && (
          <div className={styles.card}>
            <h2>Jurnal Mengajar</h2>
            <p className={styles.placeholderText}>Modul pengisian jurnal mengajar akan segera hadir. Menunggu konfigurasi spreadsheet.</p>
          </div>
        )}

        {activeTab === 'rekap_siswa' && (
          <div className={styles.card}>
            <h2>Rekap Siswa</h2>
            <p className={styles.placeholderText}>Modul rekap absensi per siswa akan segera hadir. Menunggu konfigurasi spreadsheet.</p>
          </div>
        )}

        {activeTab === 'rekap_jurnal' && (
          <div className={styles.card}>
            <h2>Rekap Jurnal</h2>
            <p className={styles.placeholderText}>Modul rekap jurnal mengajar akan segera hadir. Menunggu konfigurasi spreadsheet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
