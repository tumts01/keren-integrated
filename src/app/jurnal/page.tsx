'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import styles from './jurnal.module.css';

interface JurnalRecord {
  id: string;
  timestamp: string;
  tanggal: string;
  jamKe: string;
  tahunAjaran: string;
  kelas: string;
  mapel: string;
  namaGuru: string;
  materi: string;
}

export default function JurnalPage() {
  const [activeTab, setActiveTab] = useState<'isi' | 'rekap'>('isi');

  // --- ISI JURNAL STATE ---
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedMapel, setSelectedMapel] = useState('');
  const [selectedJam, setSelectedJam] = useState<number[]>([]);
  const [materi, setMateri] = useState('');
  const [kelasList, setKelasList] = useState<string[]>([]);
  const [mapelList, setMapelList] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- REKAP STATE ---
  const [rekapData, setRekapData] = useState<JurnalRecord[]>([]);
  const [rekapLoading, setRekapLoading] = useState(false);
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterGuru, setFilterGuru] = useState('');
  const [guruList, setGuruList] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');

  useEffect(() => {
    // Load user info
    const storedUser = localStorage.getItem('keren_user_data');
    const username = localStorage.getItem('username') || '';
    setCurrentUsername(username);
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        const role = (u.rule || u.role || '').toLowerCase();
        setIsAdmin(role === 'admin');
        if (role !== 'admin') setFilterGuru(username);
      } catch {}
    }

    // Load kelas & mapel
    fetch('/api/kelas').then(r => r.json()).then(data => {
      if (data.success) {
        const uniqueKelas = Array.from(new Set(data.data.map((k: any) => k.rombel)))
          .filter((k: any) => k && k.length >= 2 && k !== '-') as string[];
        uniqueKelas.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        setKelasList(uniqueKelas);
      }
    }).catch(console.error);

    fetch('/api/jadwal/mapel').then(r => r.json()).then(data => {
      if (data.success && data.data) {
        setMapelList(data.data.map((m: any) => m.namaMapel));
      }
    }).catch(console.error);
  }, []);

  const fetchRekap = useCallback(async () => {
    setRekapLoading(true);
    try {
      const res = await fetch('/api/jurnal');
      const json = await res.json();
      if (json.success) {
        setRekapData(json.data);
        // Build guru list for admin filter
        const gurus = Array.from(new Set(json.data.map((r: JurnalRecord) => r.namaGuru).filter(Boolean))) as string[];
        gurus.sort();
        setGuruList(gurus);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRekapLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'rekap') fetchRekap();
  }, [activeTab, fetchRekap]);

  const toggleJam = (jam: number) => {
    setSelectedJam(prev =>
      prev.includes(jam) ? prev.filter(j => j !== jam) : [...prev, jam].sort((a, b) => a - b)
    );
  };

  const handleSubmit = async () => {
    if (!selectedKelas || !selectedMapel) {
      Swal.fire({ icon: 'warning', title: 'Oops...', text: 'Mohon pilih Kelas dan Mata Pelajaran!' });
      return;
    }
    if (selectedJam.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Oops...', text: 'Mohon pilih Jam Ke!' });
      return;
    }
    if (!materi.trim()) {
      Swal.fire({ icon: 'warning', title: 'Oops...', text: 'Mohon isi Materi!' });
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
    const guru = localStorage.getItem('username') || 'Unknown';
    try {
      const res = await fetch('/api/jurnal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal, jamKe: selectedJam.join(', '), kelas: selectedKelas,
          mapel: selectedMapel, guru, materi,
          tahunAjaran: new Date().getFullYear() + '/' + (new Date().getFullYear() + 1)
        })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Jurnal mengajar berhasil disimpan.' });
        setMateri('');
        setSelectedJam([]);
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal', text: data.error || 'Terjadi kesalahan' });
      }
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter rekap
  const filtered = rekapData.filter(r => {
    if (!isAdmin && r.namaGuru !== currentUsername) return false;
    if (filterGuru && r.namaGuru !== filterGuru) return false;
    if (filterFrom && r.tanggal < filterFrom) return false;
    if (filterTo && r.tanggal > filterTo) return false;
    return true;
  });

  // Group by guru for admin summary
  const guruSummary = filtered.reduce((acc: Record<string, number>, r) => {
    acc[r.namaGuru] = (acc[r.namaGuru] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className={styles.container}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '0', background: 'white', borderRadius: '12px 12px 0 0', border: '1px solid #e2e8f0', borderBottom: 'none', overflow: 'hidden' }}>
        <button
          onClick={() => setActiveTab('isi')}
          style={{
            flex: 1, padding: '14px 20px', border: 'none', background: activeTab === 'isi' ? 'var(--primary)' : 'white',
            color: activeTab === 'isi' ? 'white' : '#64748b', fontWeight: 600, fontSize: '0.95rem',
            cursor: 'pointer', transition: 'all 0.2s', borderBottom: activeTab === 'isi' ? 'none' : '1px solid #e2e8f0'
          }}
        >
          <i className="fas fa-pen" style={{ marginRight: 8 }}></i>Isi Jurnal
        </button>
        <button
          onClick={() => setActiveTab('rekap')}
          style={{
            flex: 1, padding: '14px 20px', border: 'none', background: activeTab === 'rekap' ? 'var(--primary)' : 'white',
            color: activeTab === 'rekap' ? 'white' : '#64748b', fontWeight: 600, fontSize: '0.95rem',
            cursor: 'pointer', transition: 'all 0.2s', borderBottom: activeTab === 'rekap' ? 'none' : '1px solid #e2e8f0'
          }}
        >
          <i className="fas fa-chart-bar" style={{ marginRight: 8 }}></i>Rekap Jurnal
        </button>
      </div>

      {/* ISI JURNAL TAB */}
      {activeTab === 'isi' && (
        <div className={styles.card} style={{ borderRadius: '0 0 12px 12px', marginTop: 0 }}>
          <div className={styles.header}>
            <h2><i className="fas fa-book-open"></i> Jurnal Mengajar</h2>
            <p>Isi jurnal kegiatan pembelajaran kelas.</p>
          </div>
          <div className={styles.filterSection}>
            <div className={styles.filterGroup}>
              <label>Tanggal</label>
              <input type="date" className={styles.inputField} value={tanggal} onChange={e => setTanggal(e.target.value)} />
            </div>
            <div className={styles.filterGroup}>
              <label>Mata Pelajaran</label>
              <select value={selectedMapel} onChange={e => setSelectedMapel(e.target.value)} className={styles.inputField}>
                <option value="">-- Pilih Mapel --</option>
                {mapelList.map((m, i) => <option key={i} value={m}>{m}</option>)}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label>Kelas</label>
              <select value={selectedKelas} onChange={e => setSelectedKelas(e.target.value)} className={styles.inputField}>
                <option value="">-- Pilih Kelas --</option>
                {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className={styles.filterGroup} style={{ flex: '1 1 100%' }}>
              <label>Jam Ke (Pilih satu atau lebih)</label>
              <div className={styles.jamPills}>
                {[1,2,3,4,5,6,7,8,9,10].map(jam => (
                  <button key={jam} type="button" onClick={() => toggleJam(jam)}
                    className={`${styles.jamPill} ${selectedJam.includes(jam) ? styles.jamPillActive : ''}`}>
                    {jam}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {selectedKelas && (
            <div style={{ marginTop: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', color: '#334155' }}>Materi Pembelajaran</label>
              <textarea className={styles.inputField} style={{ width: '100%', height: 120, resize: 'vertical' }}
                placeholder="Tuliskan materi yang diajarkan pada sesi ini..."
                value={materi} onChange={e => setMateri(e.target.value)} />
            </div>
          )}
          <div className={styles.actions} style={{ marginTop: 30, display: 'flex', justifyContent: 'flex-end' }}>
            <button className={styles.btnSave} onClick={handleSubmit} disabled={isSubmitting}
              style={{ opacity: isSubmitting ? 0.7 : 1, width: '100%' }}>
              {isSubmitting ? 'Menyimpan...' : <><i className="fas fa-save"></i> Simpan Jurnal</>}
            </button>
          </div>
        </div>
      )}

      {/* REKAP JURNAL TAB */}
      {activeTab === 'rekap' && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '0 0 12px 12px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>
                <i className="fas fa-chart-bar" style={{ marginRight: 8, color: 'var(--primary)' }}></i>
                Rekap Jurnal Mengajar
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                {isAdmin ? 'Menampilkan data semua guru' : `Data jurnal: ${currentUsername}`}
              </p>
            </div>
            <button onClick={fetchRekap} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
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
                <select value={filterGuru} onChange={e => setFilterGuru(e.target.value)}
                  style={{ padding: '7px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem', minWidth: 180 }}>
                  <option value="">Semua Guru</option>
                  {guruList.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            )}
            {(filterFrom || filterTo || (isAdmin && filterGuru)) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'flex-end' }}>
                <button onClick={() => { setFilterFrom(''); setFilterTo(''); if (isAdmin) setFilterGuru(''); }}
                  style={{ padding: '7px 14px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  <i className="fas fa-times"></i> Reset Filter
                </button>
              </div>
            )}
          </div>

          {/* Summary cards (admin only) */}
          {isAdmin && !filterGuru && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600 }}>TOTAL ENTRI</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e40af' }}>{filtered.length}</span>
              </div>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>JUMLAH GURU</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#15803d' }}>{Object.keys(guruSummary).length}</span>
              </div>
              {Object.entries(guruSummary).sort((a,b) => b[1]-a[1]).slice(0,3).map(([nama, count]) => (
                <div key={nama} style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>🏆 {nama}</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#92400e' }}>{count} <span style={{fontSize:'0.8rem', fontWeight:500}}>entri</span></span>
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          {rekapLoading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: 12, display: 'block' }}></i>
              Memuat data jurnal...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
              <i className="fas fa-inbox" style={{ fontSize: '2.5rem', display: 'block', marginBottom: 12 }}></i>
              Tidak ada data jurnal ditemukan
            </div>
          ) : (
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
                      <td style={{ padding: '10px 14px', color: '#94a3b8', fontWeight: 500 }}>{i + 1}</td>
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
                      <td style={{ padding: '10px 14px', color: '#475569', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.materi}>{r.materi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 12, fontSize: '0.8rem', color: '#94a3b8', textAlign: 'right' }}>
                Menampilkan {filtered.length} dari {rekapData.length} entri
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
