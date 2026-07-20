'use client';

import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
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
  const [mapelList, setMapelList] = useState<string[]>([]);
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [presensi, setPresensi] = useState<Record<string, string>>({}); // { nisn: 'H' | 'S' | 'I' | 'A' }
  const [loadingSiswa, setLoadingSiswa] = useState(false);
  // Cache siswa per kelas agar tidak refetch ulang ke server
  const siswaCache = useRef<Record<string, any[]>>({});

  // Jurnal: guru yang mengajar
  const [guruList, setGuruList] = useState<string[]>([]);
  const [selectedGuru, setSelectedGuru] = useState('');

  // Rekap Jurnal
  const [rekapJurnalData, setRekapJurnalData] = useState<any[]>([]);
  const [rekapJurnalLoading, setRekapJurnalLoading] = useState(false);
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterGuruRekap, setFilterGuruRekap] = useState('');
  const [guruListRekap, setGuruListRekap] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');
  const [fixUnknownLoading, setFixUnknownLoading] = useState(false);

  // Load classes and mapel
  useEffect(() => {
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

    fetch('/api/jadwal/mapel').then(res => res.json()).then(data => {
      if (data.success && data.data) {
        setMapelList(data.data.map((m: any) => m.namaMapel));
      }
    }).catch(err => console.error(err));

    // Load daftar guru aktif untuk pilihan guru di jurnal
    fetch('/api/guru').then(res => res.json()).then(data => {
      if (data.success && data.data) {
        const namaGuru = data.data
          .filter((g: any) => (g.status || '').toLowerCase().trim() === 'aktif')
          .map((g: any) => g.nama)
          .filter(Boolean);
        setGuruList(namaGuru);
      }
      // Pre-fill dengan nama user yang login
      const loginName = localStorage.getItem('username') || '';
      setSelectedGuru(loginName);
    }).catch(() => {
      setSelectedGuru(localStorage.getItem('username') || '');
    });

    // Load user role — gunakan NAMA LENGKAP (u.nama) untuk cocok dengan namaGuru di jurnal
    const storedUser = localStorage.getItem('keren_user_data');
    const usernameRaw = localStorage.getItem('username') || '';
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        const role = (u.rule || u.role || '').toLowerCase();
        const namaLengkap = u.nama || usernameRaw; // ← nama lengkap untuk filter jurnal
        setCurrentUsername(namaLengkap);
        setIsAdmin(role === 'admin');
        if (role !== 'admin') setFilterGuruRekap(namaLengkap);
      } catch {
        setCurrentUsername(usernameRaw);
        setFilterGuruRekap(usernameRaw);
      }
    } else {
      setCurrentUsername(usernameRaw);
      setFilterGuruRekap(usernameRaw);
    }
  }, []);

  // Auto-load rekap jurnal ketika tab rekap_jurnal dibuka
  useEffect(() => {
    if (activeTab === 'rekap_jurnal' && rekapJurnalData.length === 0 && !rekapJurnalLoading) {
      fetchRekapJurnal();
    }
  }, [activeTab]);

  const fetchRekapJurnal = async () => {
    setRekapJurnalLoading(true);
    try {
      const res = await fetch('/api/jurnal');
      const json = await res.json();
      if (json.success) {
        setRekapJurnalData(json.data);
        const gurus = Array.from(new Set(json.data.map((r: any) => r.namaGuru).filter(Boolean))) as string[];
        gurus.sort();
        setGuruListRekap(gurus);
      }
    } catch (e) { console.error(e); }
    finally { setRekapJurnalLoading(false); }
  };

  const handleExportExcel = (filtered: any[]) => {
    const rows = filtered.map((r, i) => ({
      'No': i + 1,
      'Tanggal': r.tanggal || '-',
      'Nama Guru': r.namaGuru || '-',
      'Kelas': r.kelas || '-',
      'Mata Pelajaran': r.mapel || '-',
      'Jam Ke': r.jamKe || '-',
      'Materi': r.materi || '-',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Jurnal Mengajar');
    const now = new Date().toLocaleDateString('id-ID').replace(/\//g, '-');
    XLSX.writeFile(wb, `Rekap_Jurnal_${now}.xlsx`);
  };

  const handleFixUnknown = async () => {
    const confirmResult = await Swal.fire({
      title: 'Fix Nama Guru Unknown?',
      html: 'Sistem akan mencoba mencocokkan data jurnal yang <b>Unknown</b> dengan jadwal mengajar.<br><br>Data di spreadsheet akan diperbarui otomatis jika ditemukan.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#7c3aed',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Proses!',
      cancelButtonText: 'Batal'
    });
    if (!confirmResult.isConfirmed) return;

    setFixUnknownLoading(true);
    try {
      // Ambil data jadwal dulu dari client (hemat quota — tidak perlu buka 2 spreadsheet di server)
      const jadwalRes = await fetch('/api/jadwal');
      const jadwalJson = await jadwalRes.json();
      const jadwalData = jadwalJson.success ? jadwalJson.data : [];

      const res = await fetch('/api/jurnal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jadwalData })
      });
      const json = await res.json();
      if (json.success) {
        let html = `<div style="text-align:left">`;
        html += `<p>📊 Total Unknown: <b>${json.totalUnknown}</b></p>`;
        html += `<p>✅ Berhasil difix: <b>${json.fixed}</b></p>`;
        if (json.ambiguous?.length > 0) {
          html += `<p>⚠️ Ambigu (lebih dari 1 kandidat):</p><ul style="margin:4px 0 8px 16px;font-size:0.85rem">`;
          json.ambiguous.forEach((a: any) => {
            html += `<li>${a.tanggal} — ${a.kelas} ${a.mapel}: <em>${a.candidates.join(', ')}</em></li>`;
          });
          html += `</ul>`;
        }
        if (json.notFound?.length > 0) {
          html += `<p>❌ Tidak ditemukan di jadwal (${json.notFound.length} baris) — perlu update manual</p>`;
        }
        html += `</div>`;
        await Swal.fire({
          title: json.fixed > 0 ? 'Selesai!' : 'Hasil Proses',
          html,
          icon: json.fixed > 0 ? 'success' : 'info',
          width: 520
        });
        if (json.fixed > 0) fetchRekapJurnal(); // Refresh data
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal', text: json.error || 'Terjadi kesalahan' });
      }
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: e.message });
    } finally {
      setFixUnknownLoading(false);
    }
  };

  // Effect when class changes (Mock loading students)
  useEffect(() => {
    if (selectedKelas) {
      // Pakai cache kalau data kelas ini sudah pernah diambil
      if (siswaCache.current[selectedKelas]) {
        const cached = siswaCache.current[selectedKelas];
        setSiswaList(cached);
        const defaultPresensi: Record<string, string> = {};
        cached.forEach((s: any) => { defaultPresensi[s.id] = 'H'; });
        setPresensi(defaultPresensi);
        return;
      }
      setLoadingSiswa(true);
      setSiswaList([]);
      setPresensi({});
      fetch('/api/siswa').then(res => res.json()).then(data => {
        if (data.success) {
          const filtered = data.data.filter((s: any) =>
            s.rombel === selectedKelas &&
            s.isLatest &&
            (s.status || '').toLowerCase().trim() === 'aktif'
          );
          // Simpan ke cache
          siswaCache.current[selectedKelas] = filtered;
          if (filtered.length > 0) {
            setSiswaList(filtered);
            const defaultPresensi: Record<string, string> = {};
            filtered.forEach((s: any) => { defaultPresensi[s.id] = 'H'; });
            setPresensi(defaultPresensi);
          } else {
            setSiswaList([]);
            setPresensi({});
          }
        }
      }).finally(() => setLoadingSiswa(false));
    } else {
      setSiswaList([]);
      setPresensi({});
    }
  }, [selectedKelas]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [materi, setMateri] = useState('');

  const handlePresensiChange = (id: string, status: string) => {
    setPresensi(prev => ({
      ...prev,
      [id]: status
    }));
  };

  const toggleJam = (jam: number) => {
    setSelectedJam(prev => 
      prev.includes(jam) ? prev.filter(j => j !== jam) : [...prev, jam].sort((a,b) => a-b)
    );
  };

  const handleSubmit = async () => {
    if (!selectedKelas || !selectedMapel) {
      Swal.fire({
        icon: 'warning',
        title: 'Oops...',
        text: 'Mohon pilih Kelas dan Mata Pelajaran terlebih dahulu!'
      });
      return;
    }
    if (selectedJam.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Oops...',
        text: 'Mohon pilih Jam Ke!'
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Konfirmasi',
      text: `Simpan presensi untuk kelas ${selectedKelas}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, Simpan!',
      cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) return;

    setIsSubmitting(true);
    const guru = localStorage.getItem('username') || 'Unknown';
    try {
      const res = await fetch('/api/presensi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal,
          jamKe: selectedJam.join(', '),
          kelas: selectedKelas,
          mapel: selectedMapel,
          guru,
          presensi,
          siswaList
        })
      });
      const data = await res.json();
      
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: `Berhasil menyimpan presensi! ${data.totalSaved > 0 ? (data.totalSaved + ' data S/I/A tercatat.') : 'Semua siswa Hadir (tidak ada data absen ke sheet).'}`
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: 'Gagal menyimpan: ' + (data.error || 'Terjadi kesalahan')
        });
      }
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Terjadi kesalahan sistem: ' + error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJurnalSubmit = async () => {
    if (!selectedKelas || !selectedMapel) {
      Swal.fire({ icon: 'warning', title: 'Oops...', text: 'Mohon pilih Kelas dan Mata Pelajaran terlebih dahulu!' });
      return;
    }
    if (selectedJam.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Oops...', text: 'Mohon pilih Jam Ke!' });
      return;
    }
    if (!materi.trim()) {
      Swal.fire({ icon: 'warning', title: 'Oops...', text: 'Mohon isi Materi yang diajarkan!' });
      return;
    }

    const result = await Swal.fire({
      title: 'Konfirmasi',
      text: `Simpan jurnal mengajar untuk kelas ${selectedKelas}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, Simpan!',
      cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) return;

    setIsSubmitting(true);
    const guru = selectedGuru || localStorage.getItem('username') || 'Unknown';
    try {
      const res = await fetch('/api/jurnal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal,
          jamKe: selectedJam.join(', '),
          kelas: selectedKelas,
          mapel: selectedMapel,
          guru,
          materi,
          tahunAjaran: new Date().getFullYear().toString() + '/' + (new Date().getFullYear() + 1).toString()
        })
      });
      const data = await res.json();
      
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: 'Jurnal mengajar berhasil disimpan.'
        });
        setMateri('');
        setSelectedJam([]);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: 'Gagal menyimpan: ' + (data.error || 'Terjadi kesalahan')
        });
      }
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Terjadi kesalahan sistem: ' + error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Presensi Kelas & Jurnal Mengajar</h1>
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
                <input
                  list="mapel-options"
                  value={selectedMapel}
                  onChange={(e) => setSelectedMapel(e.target.value)}
                  className={styles.inputField}
                  placeholder="Ketik atau pilih mata pelajaran..."
                  autoComplete="off"
                />
                <datalist id="mapel-options">
                  {mapelList.map((mapel, i) => (
                    <option key={i} value={mapel} />
                  ))}
                </datalist>
              </div>
            </div>

            {loadingSiswa ? (
              <div style={{ marginTop: 16 }}>
                {/* Skeleton loading rows */}
                {[...Array(6)].map((_, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', borderBottom: '1px solid #f1f5f9',
                    animation: 'pulse 1.5s ease-in-out infinite',
                    animationDelay: `${i * 0.1}s`
                  }}>
                    <div style={{ width: 28, height: 14, background: '#e2e8f0', borderRadius: 4 }} />
                    <div style={{ flex: 1, height: 14, background: '#e2e8f0', borderRadius: 4 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[1,2,3,4].map(j => <div key={j} style={{ width: 36, height: 28, background: '#e2e8f0', borderRadius: 6 }} />)}
                    </div>
                  </div>
                ))}
                <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
              </div>
            ) : selectedKelas ? (
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
                      <tr key={siswa.id}>
                        <td>{idx + 1}</td>
                        <td style={{ fontWeight: 500 }}>{siswa.nama}</td>
                        <td>
                          <div className={styles.radioGroup}>
                            <label className={`${styles.radioLabel} ${presensi[siswa.id] === 'H' ? styles.radioCheckedH : ''}`}>
                              <input 
                                type="radio" 
                                name={`presensi_${siswa.id}`} 
                                value="H" 
                                checked={presensi[siswa.id] === 'H'}
                                onChange={() => handlePresensiChange(siswa.id, 'H')}
                              />
                              H
                            </label>
                            <label className={`${styles.radioLabel} ${presensi[siswa.id] === 'S' ? styles.radioCheckedS : ''}`}>
                              <input 
                                type="radio" 
                                name={`presensi_${siswa.id}`} 
                                value="S" 
                                checked={presensi[siswa.id] === 'S'}
                                onChange={() => handlePresensiChange(siswa.id, 'S')}
                              />
                              S
                            </label>
                            <label className={`${styles.radioLabel} ${presensi[siswa.id] === 'I' ? styles.radioCheckedI : ''}`}>
                              <input 
                                type="radio" 
                                name={`presensi_${siswa.id}`} 
                                value="I" 
                                checked={presensi[siswa.id] === 'I'}
                                onChange={() => handlePresensiChange(siswa.id, 'I')}
                              />
                              I
                            </label>
                            <label className={`${styles.radioLabel} ${presensi[siswa.id] === 'A' ? styles.radioCheckedA : ''}`}>
                              <input 
                                type="radio" 
                                name={`presensi_${siswa.id}`} 
                                value="A" 
                                checked={presensi[siswa.id] === 'A'}
                                onChange={() => handlePresensiChange(siswa.id, 'A')}
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
                <label>Mata Pelajaran</label>
                <input
                  list="mapel-options"
                  value={selectedMapel}
                  onChange={(e) => setSelectedMapel(e.target.value)}
                  className={styles.inputField}
                  placeholder="Ketik atau pilih mata pelajaran..."
                  autoComplete="off"
                />
                <datalist id="mapel-options">
                  {mapelList.map((mapel, i) => (
                    <option key={i} value={mapel} />
                  ))}
                </datalist>
              </div>

              <div className={styles.filterGroup}>
                <label>Kelas</label>
                <select 
                  value={selectedKelas} 
                  onChange={(e) => setSelectedKelas(e.target.value)}
                  className={styles.inputField}
                >
                  <option value="">-- Pilih Kelas --</option>
                  {kelasList.map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label>Guru yang Mengajar</label>
                <input
                  list="guru-options"
                  value={selectedGuru}
                  onChange={(e) => setSelectedGuru(e.target.value)}
                  className={styles.inputField}
                  placeholder="Ketik atau pilih nama guru..."
                  autoComplete="off"
                />
                <datalist id="guru-options">
                  {guruList.map((nama, i) => (
                    <option key={i} value={nama} />
                  ))}
                </datalist>
              </div>
              
              <div className={styles.filterGroup} style={{ flex: '1 1 100%' }}>
                <label>Jam Ke (Bisa pilih lebih dari satu)</label>
                <div className={styles.jamPills}>
                  {[1,2,3,4,5,6,7,8,9,10].map(jam => (
                    <button
                      key={jam}
                      type="button"
                      onClick={() => toggleJam(jam)}
                      className={`${styles.jamPill} ${selectedJam.includes(jam) ? styles.jamPillActive : ''}`}
                    >
                      {jam}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {selectedKelas ? (
              <div style={{ marginTop: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#334155' }}>
                  Materi Pembelajaran
                </label>
                <textarea 
                  className={styles.inputField}
                  style={{ width: '100%', height: '120px', resize: 'vertical' }}
                  placeholder="Tuliskan materi yang diajarkan pada sesi ini..."
                  value={materi}
                  onChange={(e) => setMateri(e.target.value)}
                />
                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    className={styles.submitBtn} 
                    onClick={handleJurnalSubmit} 
                    disabled={isSubmitting}
                    style={{ opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                  >
                    <i className={isSubmitting ? "fas fa-spinner fa-spin" : "fas fa-save"} style={{ marginRight: '8px' }}></i>
                    {isSubmitting ? 'Menyimpan...' : 'Simpan Jurnal'}
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <i className="fas fa-book-open"></i>
                <p>Silakan pilih kelas terlebih dahulu untuk mengisi materi jurnal.</p>
              </div>
            )}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>
                  <i className="fas fa-clipboard-list" style={{ marginRight: 8, color: '#237227' }}></i>
                  Rekap Jurnal Mengajar
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  {isAdmin ? 'Data semua guru' : `Data jurnal: ${currentUsername}`}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={fetchRekapJurnal}
                  style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <i className="fas fa-sync-alt"></i> Muat Data
                </button>
                {isAdmin && (
                  <button
                    onClick={handleFixUnknown}
                    disabled={fixUnknownLoading}
                    style={{ background: fixUnknownLoading ? '#ede9fe' : '#7c3aed', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: fixUnknownLoading ? 'not-allowed' : 'pointer', fontSize: '0.85rem', color: 'white', display: 'flex', alignItems: 'center', gap: 6, opacity: fixUnknownLoading ? 0.7 : 1 }}
                  >
                    <i className={fixUnknownLoading ? 'fas fa-spinner fa-spin' : 'fas fa-magic'}></i>
                    {fixUnknownLoading ? 'Memproses...' : 'Fix Unknown'}
                  </button>
                )}
              </div>
            </div>

            {/* Filter */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20, padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Dari Tanggal</label>
                <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                  style={{ padding: '7px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Sampai Tanggal</label>
                <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
                  style={{ padding: '7px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem' }} />
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Filter Guru</label>
                  <select value={filterGuruRekap} onChange={e => setFilterGuruRekap(e.target.value)}
                    style={{ padding: '7px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem', minWidth: 200 }}>
                    <option value="">Semua Guru</option>
                    {guruListRekap.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              )}
              {(filterFrom || filterTo || (isAdmin && filterGuruRekap)) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'flex-end' }}>
                  <button onClick={() => { setFilterFrom(''); setFilterTo(''); if (isAdmin) setFilterGuruRekap(''); }}
                    style={{ padding: '7px 14px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                    <i className="fas fa-times"></i> Reset
                  </button>
                </div>
              )}
            </div>

            {rekapJurnalLoading ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', display: 'block', marginBottom: 12 }}></i>
                Memuat data jurnal...
              </div>
            ) : rekapJurnalData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', display: 'block', marginBottom: 12 }}></i>
                Memuat data jurnal...
              </div>
            ) : (() => {
              const filtered = rekapJurnalData.filter(r => {
                if (!isAdmin && r.namaGuru !== currentUsername) return false;
                if (filterGuruRekap && r.namaGuru !== filterGuruRekap) return false;
                if (filterFrom && r.tanggal < filterFrom) return false;
                if (filterTo && r.tanggal > filterTo) return false;
                return true;
              });
              return (
                <div>
                  {filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
                      <i className="fas fa-search" style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }}></i>
                      Tidak ada data jurnal ditemukan
                      {!isAdmin && <p style={{ fontSize: '0.82rem', marginTop: 8 }}>Pastikan nama akun Anda cocok dengan nama guru di jurnal: <strong>{currentUsername}</strong></p>}
                    </div>
                  ) : (
                    <div>
                      {/* Export button */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                        <button
                          onClick={() => handleExportExcel(filtered)}
                          style={{ background: '#16a34a', border: 'none', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', color: 'white', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                        >
                          <i className="fas fa-file-excel"></i> Export Excel ({filtered.length} data)
                        </button>
                      </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                            <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>No</th>
                            <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>Tanggal</th>
                            {isAdmin && <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>Nama Guru</th>}
                            <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>Kelas</th>
                            <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>Mata Pelajaran</th>
                            <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>Jam Ke</th>
                            <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Materi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((r, i) => (
                            <tr key={r.id || i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                              <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{i + 1}</td>
                              <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: '#334155', fontWeight: 500 }}>
                                {r.tanggal ? new Date(r.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                              </td>
                              {isAdmin && (
                                <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                                  <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '3px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600 }}>{r.namaGuru}</span>
                                </td>
                              )}
                              <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', fontWeight: 600, color: '#1e293b' }}>{r.kelas}</td>
                              <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: '#475569' }}>{r.mapel}</td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                <span style={{ background: '#dcfce7', color: '#16a34a', padding: '3px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600 }}>Jam {r.jamKe}</span>
                              </td>
                              <td style={{ padding: '10px 14px', color: '#475569', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.materi}>{r.materi}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{ marginTop: 12, fontSize: '0.8rem', color: '#94a3b8', textAlign: 'right' }}>
                        Menampilkan {filtered.length} dari {rekapJurnalData.length} entri
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
