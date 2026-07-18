'use client';

import React, { useState, useEffect } from 'react';
import styles from './presensi.module.css';

export default function PresensiPage() {
  const [activeTab, setActiveTab] = useState<'absen' | 'jurnal' | 'rekap_siswa' | 'rekap_jurnal'>('absen');

  // States for Absen Siswa
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedMapel, setSelectedMapel] = useState('');
  
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
        setKelasList(data.data.map((k: any) => k.rombel));
      }
    }).catch(err => console.error(err));
  }, []);

  // Effect when class changes (Mock loading students)
  useEffect(() => {
    if (selectedKelas) {
      // In actual implementation, fetch from /api/siswa and filter by selectedKelas
      fetch('/api/siswa').then(res => res.json()).then(data => {
        if (data.success) {
          // Find students in the selected class (dummy filter based on our API knowledge)
          const filtered = data.data.filter((s: any) => s.rombel === selectedKelas && s.isLatest);
          // If the API doesn't support direct class filtering properly, just use dummy data for template if empty
          if (filtered.length > 0) {
            setSiswaList(filtered);
          } else {
             // Mock 5 students if API filter fails for this template
             setSiswaList([
               { id: 1, nisn: '101', nama: 'Ahmad Mubarok' },
               { id: 2, nisn: '102', nama: 'Budi Santoso' },
               { id: 3, nisn: '103', nama: 'Citra Kirana' },
               { id: 4, nisn: '104', nama: 'Deni Cagur' },
               { id: 5, nisn: '105', nama: 'Eka Saputra' },
             ]);
          }
        }
      });
    } else {
      setSiswaList([]);
    }
  }, [selectedKelas]);

  const handlePresensiChange = (nisn: string, status: string) => {
    setPresensi(prev => ({
      ...prev,
      [nisn]: status
    }));
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
                  <button className={styles.submitBtn}>
                    <i className="fas fa-save" style={{ marginRight: '8px' }}></i>
                    Simpan Presensi
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
