'use client';
import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import styles from './NilaiSiswa.module.css';

export default function NilaiSiswaPage() {
  const [mainTab, setMainTab] = useState<'pk'>('pk');
  const [subTab, setSubTab] = useState<'input'|'cetak'|'rekap'>('input');
  
  // PK States
  const [kelas, setKelas] = useState('');
  const [mapel, setMapel] = useState('BTQ');
  const [mapelLain, setMapelLain] = useState('');
  const [tipe, setTipe] = useState<'materi_harian'|'sts'|'sas'>('materi_harian');
  const [materi, setMateri] = useState('Materi 1');
  const [subMateri, setSubMateri] = useState('S1');
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const defaultTA = currentMonth >= 6 ? `${currentYear}/${currentYear + 1}` : `${currentYear - 1}/${currentYear}`;
  const [tahunAjaran, setTahunAjaran] = useState(defaultTA);
  
  const [students, setStudents] = useState<any[]>([]);
  const [rekapStudents, setRekapStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [mapelList, setMapelList] = useState<string[]>(['BTQ', 'Tahfidz', 'Madin', 'Sorogan']);

  useEffect(() => {
    const userStr = localStorage.getItem('keren_user_data');
    if (userStr) {
      try {
        setProfile(JSON.parse(userStr));
      } catch (e) {}
    }

    fetch('/api/jadwal/mapel')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          const list = data.data.map((m: any) => m.namaMapel);
          setMapelList(list);
          setMapel(prevMapel => {
            if (!list.includes(prevMapel) && prevMapel !== 'Lainnya' && list.length > 0) {
              return list[0];
            }
            return prevMapel;
          });
        }
      })
      .catch(console.error);
  }, []);

  const fetchRekap = async () => {
    if (!kelas || !tahunAjaran) {
      Swal.fire('Peringatan', 'Silakan pilih Kelas dan Tahun Ajaran terlebih dahulu', 'warning');
      return;
    }
    setLoading(true);
    const finalMapel = mapel === 'Lainnya' ? mapelLain : mapel;
    try {
      const res = await fetch(`/api/nilai-siswa/pk/rekap?kelas=${encodeURIComponent(kelas)}&mapel=${encodeURIComponent(finalMapel)}&tahunAjaran=${encodeURIComponent(tahunAjaran)}`);
      const result = await res.json();
      if (result.success) {
        setRekapStudents(result.data);
      } else {
        Swal.fire('Gagal', result.error || 'Gagal mengambil rekap', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
    setLoading(false);
  };

  const fetchStudents = async () => {
    if (!kelas || !tahunAjaran) {
      Swal.fire('Peringatan', 'Silakan pilih Kelas dan Tahun Ajaran terlebih dahulu', 'warning');
      return;
    }
    setLoading(true);
    const finalMapel = mapel === 'Lainnya' ? mapelLain : mapel;
    try {
      const res = await fetch(`/api/nilai-siswa/pk?kelas=${encodeURIComponent(kelas)}&mapel=${encodeURIComponent(finalMapel)}&tipe=${tipe}&materi=${encodeURIComponent(materi)}&sub=${encodeURIComponent(subMateri)}&tahunAjaran=${encodeURIComponent(tahunAjaran)}`);
      const result = await res.json();
      if (result.success) {
        setStudents(result.data);
      } else {
        Swal.fire('Gagal', result.error || 'Gagal mengambil data', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
    setLoading(false);
  };

  const handleScoreChange = (idx: number, val: string) => {
    const newStudents = [...students];
    newStudents[idx].score = val;
    setStudents(newStudents);
  };

  const saveScores = async () => {
    if (students.length === 0) return;
    
    const confirm = await Swal.fire({
      title: 'Simpan Nilai?',
      text: "Pastikan data nilai yang diinput sudah benar.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: '<i class="fas fa-save"></i> Ya, Simpan',
      cancelButtonText: 'Batal',
      reverseButtons: true
    });

    if (!confirm.isConfirmed) return;

    setSaving(true);
    const finalMapel = mapel === 'Lainnya' ? mapelLain : mapel;
    try {
      const res = await fetch('/api/nilai-siswa/pk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kelas,
          mapel: finalMapel,
          tipe,
          materi,
          sub: subMateri,
          data: students,
          guru: profile?.nama || '',
          tahunAjaran
        })
      });
      const result = await res.json();
      if (result.success) {
        Swal.fire({
          title: 'Mantap Keren!',
          text: 'Nilai berhasil disimpan ke spreadsheet.',
          icon: 'success',
          timer: 2500,
          showConfirmButton: false,
          timerProgressBar: true
        });
      } else {
        Swal.fire({
          title: 'Gagal',
          text: result.error || 'Gagal menyimpan nilai',
          icon: 'error',
          confirmButtonColor: '#ef4444'
        });
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
    setSaving(false);
  };

  const kelasOptions = ['7A','7B','7C','7D','7E','7F','7G','7H','7I','8A','8B','8C','8D','8E','8F','8G','8H','8I','9A','9B','9C','9D','9E','9F','9G','9H','9I'];

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>
        <i className="fas fa-star"></i> Nilai Siswa
      </h1>
      <p className={styles.subtitle}>
        Input dan kelola nilai siswa madrasah.
      </p>

      <div className={styles.tabContainer}>
        <button className={`${styles.tabBtn} ${mainTab === 'pk' ? styles.activeTab : ''}`} onClick={() => setMainTab('pk')}>
          <i className="fas fa-book-open"></i> Nilai Program Khusus
        </button>
      </div>

      {mainTab === 'pk' && (
        <>
          <div className={styles.tabContainer} style={{ marginTop: '-10px', transform: 'scale(0.9)', transformOrigin: 'left' }}>
            <button className={`${styles.tabBtn} ${subTab === 'input' ? styles.activeTab : ''}`} onClick={() => setSubTab('input')}>
              <i className="fas fa-edit"></i> Input Nilai
            </button>
            <button className={`${styles.tabBtn} ${subTab === 'cetak' ? styles.activeTab : ''}`} onClick={() => setSubTab('cetak')}>
              <i className="fas fa-print"></i> Cetak Rapor
            </button>
            <button className={`${styles.tabBtn} ${subTab === 'rekap' ? styles.activeTab : ''}`} onClick={() => setSubTab('rekap')}>
              <i className="fas fa-table"></i> Cek Nilai (Rekap)
            </button>
          </div>

          {subTab === 'input' && (
            <div>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Tahun Ajaran</label>
                  <select className={styles.select} value={tahunAjaran} onChange={e => setTahunAjaran(e.target.value)}>
                    <option value="2023/2024">2023/2024</option>
                    <option value="2024/2025">2024/2025</option>
                    <option value="2025/2026">2025/2026</option>
                    <option value="2026/2027">2026/2027</option>
                    <option value="2027/2028">2027/2028</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Kelas</label>
                  <select className={styles.select} value={kelas} onChange={e => setKelas(e.target.value)}>
                    <option value="">-- Pilih Kelas --</option>
                    {kelasOptions.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                
                <div className={styles.formGroup}>
                  <label>Mata Pelajaran</label>
                  <select className={styles.select} value={mapel} onChange={e => setMapel(e.target.value)}>
                    {mapelList.map(m => <option key={m} value={m}>{m}</option>)}
                    <option value="Lainnya">Lainnya...</option>
                  </select>
                </div>

                {mapel === 'Lainnya' && (
                  <div className={styles.formGroup}>
                    <label>Nama Mapel Lainnya</label>
                    <input type="text" className={styles.input} value={mapelLain} onChange={e => setMapelLain(e.target.value)} placeholder="Tulis mapel..." />
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label>Jenis Penilaian</label>
                  <select className={styles.select} value={tipe} onChange={e => setTipe(e.target.value as any)}>
                    <option value="materi_harian">Materi Harian</option>
                    <option value="sts">Sumatif Tengah Semester</option>
                    <option value="sas">Sumatif Akhir Semester</option>
                  </select>
                </div>

                {tipe === 'materi_harian' && (
                  <>
                    <div className={styles.formGroup}>
                      <label>Pilihan Materi</label>
                      <select className={styles.select} value={materi} onChange={e => setMateri(e.target.value)}>
                        {[1,2,3,4,5,6].map(m => <option key={m} value={`Materi ${m}`}>Materi {m}</option>)}
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Sub Materi</label>
                      <select className={styles.select} value={subMateri} onChange={e => setSubMateri(e.target.value)}>
                        {['S1','S2','S3'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </>
                )}
                
                <div className={styles.formGroup} style={{ justifyContent: 'flex-end' }}>
                  <button className={styles.btnSubmit} onClick={fetchStudents} disabled={loading || !kelas}>
                    {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
                    Tampilkan
                  </button>
                </div>
              </div>

              {students.length > 0 && (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th style={{width: '50px'}}>No</th>
                        <th style={{width: '120px'}}>No Induk</th>
                        <th>Nama Lengkap</th>
                        <th style={{width: '80px', textAlign: 'center'}}>L/P</th>
                        <th style={{width: '150px', textAlign: 'center'}}>Nilai</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>{s.induk}</td>
                          <td>{s.nama}</td>
                          <td style={{textAlign: 'center'}}>{s.jk}</td>
                          <td style={{textAlign: 'center'}}>
                            <input 
                              type="number" 
                              className={styles.inputScore} 
                              value={s.score || ''} 
                              onChange={e => handleScoreChange(idx, e.target.value)}
                              placeholder="0-100"
                              min="0"
                              max="100"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <div style={{ padding: '20px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <button className={styles.btnSubmit} onClick={saveScores} disabled={saving}>
                      {saving ? <><i className="fas fa-spinner fa-spin"></i> Menyimpan...</> : <><i className="fas fa-save"></i> Simpan Nilai</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {subTab === 'rekap' && (
            <div>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Tahun Ajaran</label>
                  <select className={styles.select} value={tahunAjaran} onChange={e => setTahunAjaran(e.target.value)}>
                    <option value="2023/2024">2023/2024</option>
                    <option value="2024/2025">2024/2025</option>
                    <option value="2025/2026">2025/2026</option>
                    <option value="2026/2027">2026/2027</option>
                    <option value="2027/2028">2027/2028</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Kelas</label>
                  <select className={styles.select} value={kelas} onChange={e => setKelas(e.target.value)}>
                    <option value="">-- Pilih Kelas --</option>
                    {kelasOptions.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Mata Pelajaran</label>
                  <select className={styles.select} value={mapel} onChange={e => setMapel(e.target.value)}>
                    {mapelList.map(m => <option key={m} value={m}>{m}</option>)}
                    <option value="Lainnya">Lainnya...</option>
                  </select>
                </div>
                {mapel === 'Lainnya' && (
                  <div className={styles.formGroup}>
                    <label>Nama Mapel Lainnya</label>
                    <input type="text" className={styles.input} value={mapelLain} onChange={e => setMapelLain(e.target.value)} placeholder="Tulis mapel..." />
                  </div>
                )}
                <div className={styles.formGroup} style={{ justifyContent: 'flex-end' }}>
                  <button className={styles.btnSubmit} onClick={fetchRekap} disabled={loading || !kelas}>
                    {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
                    Tampilkan Rekap
                  </button>
                </div>
              </div>

              {rekapStudents.length > 0 && (
                <div className={styles.tableWrapper}>
                  <table className={styles.table} style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th rowSpan={2} style={{width: '40px'}}>No</th>
                        <th rowSpan={2}>No Induk</th>
                        <th rowSpan={2} style={{minWidth: '200px'}}>Nama Lengkap</th>
                        <th rowSpan={2}>L/P</th>
                        {[1,2,3,4,5,6].map(m => (
                          <th key={m} colSpan={3} style={{textAlign: 'center', borderLeft: '1px solid #e2e8f0'}}>Materi {m}</th>
                        ))}
                        <th rowSpan={2} style={{borderLeft: '1px solid #e2e8f0'}}>STS</th>
                        <th rowSpan={2}>SAS</th>
                        <th rowSpan={2}>Rata-Rata</th>
                      </tr>
                      <tr>
                        {[1,2,3,4,5,6].map(m => (
                          <React.Fragment key={m}>
                            <th style={{borderLeft: '1px solid #e2e8f0', textAlign: 'center'}}>S1</th>
                            <th style={{textAlign: 'center'}}>S2</th>
                            <th style={{textAlign: 'center'}}>S3</th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rekapStudents.map((s, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>{s.induk}</td>
                          <td>{s.nama}</td>
                          <td style={{textAlign: 'center'}}>{s.jk}</td>
                          {[1,2,3,4,5,6].map(m => (
                            <React.Fragment key={m}>
                              <td style={{borderLeft: '1px solid #e2e8f0', textAlign: 'center'}}>{s.scores[`m${m}s1`]}</td>
                              <td style={{textAlign: 'center'}}>{s.scores[`m${m}s2`]}</td>
                              <td style={{textAlign: 'center'}}>{s.scores[`m${m}s3`]}</td>
                            </React.Fragment>
                          ))}
                          <td style={{borderLeft: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold'}}>{s.scores.sts}</td>
                          <td style={{textAlign: 'center', fontWeight: 'bold'}}>{s.scores.sas}</td>
                          <td style={{textAlign: 'center', fontWeight: 'bold', color: '#0ea5e9'}}>{s.scores.rata}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {subTab === 'cetak' && (
            <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              <i className="fas fa-print" style={{ fontSize: '3rem', color: '#94a3b8', marginBottom: '1rem' }}></i>
              <h2 style={{ color: '#475569', marginBottom: '0.5rem' }}>Cetak Rapor Program Khusus</h2>
              <p style={{ color: '#64748b' }}>Fitur cetak rapor sedang dalam tahap pengembangan.</p>
            </div>
          )}
        </>
      )}

    </div>
  );
}
