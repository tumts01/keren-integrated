'use client';
import React, { useState, useEffect } from 'react';
import styles from '@/app/presensi/presensi.module.css';
import InlineLoading from '@/components/InlineLoading';
import SearchableSelect from '@/components/SearchableSelect';
import Swal from 'sweetalert2';

const TRAITS = [
  { id: 'religius', label: 'Religius' },
  { id: 'disiplin', label: 'Disiplin' },
  { id: 'demokratis', label: 'Demokratis' },
  { id: 'kreatif', label: 'Kreatif' },
  { id: 'mandiri', label: 'Mandiri' },
  { id: 'kritis', label: 'Kritis' },
  { id: 'responsif', label: 'Responsif' },
  { id: 'nasionalis', label: 'Nasionalis' },
  { id: 'toleran', label: 'Toleran' },
  { id: 'peduli', label: 'Peduli' },
  { id: 'leadership', label: 'Leadership' },
  { id: 'jujur', label: 'Jujur' }
];

export default function PenilaianDiriPage() {
  const [activeTab, setActiveTab] = useState<'form' | 'rekap'>('form');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [userRole, setUserRole] = useState('');
  const [userNisn, setUserNisn] = useState('');
  const [userName, setUserName] = useState('');
  const [userRombel, setUserRombel] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [periode, setPeriode] = useState('');
  
  const [siswaData, setSiswaData] = useState<any[]>([]);
  const [temanSekelas, setTemanSekelas] = useState<any[]>([]);
  
  const [dataDiri, setDataDiri] = useState<any>({});
  const [dataTeman, setDataTeman] = useState<any>({});
  const [dataGuru, setDataGuru] = useState<any>({});
  const [halBaik, setHalBaik] = useState('');
  const [halDiperbaiki, setHalDiperbaiki] = useState('');

  // Lock 1x per periode states
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const [rekapData, setRekapData] = useState<any[]>([]);

  const isSiswa = (userRole || '').toLowerCase().includes('siswa');

  useEffect(() => {
    // Current period (e.g. "Oktober 2026")
    const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const d = new Date();
    setPeriode(`${months[d.getMonth()]} ${d.getFullYear()}`);

    const str = localStorage.getItem('keren_user_data');
    const portalStr = localStorage.getItem('portal_session');
    
    if (str) {
      try {
        const u = JSON.parse(str);
        const role = (u.role || '').toLowerCase();
        setUserRole(role);
        setUserNisn(u.nisn || u.username || '');
        setUserName(u.nama || u.username || '');
        setUserRombel(u.rombel || '');
        setIsAdmin(role.includes('admin') || role.includes('super'));
      } catch(e){}
    } else if (portalStr) {
      try {
        const u = JSON.parse(portalStr);
        setUserRole('siswa');
        setIsAdmin(false);
        setUserNisn(u.nisn || '');
        setUserName(u.nama || '');
        setUserRombel(u.rombel || '');
        setIsAdmin(false);
      } catch(e){}
    }

    fetchSiswa();
  }, []);

  const fetchSiswa = async () => {
    try {
      const res = await fetch('/api/siswa');
      const json = await res.json();
      if (json.success && json.data) {
        const aktif = json.data.filter((s: any) => (s.status || '').toLowerCase() === 'aktif' && s.isLatest);
        setSiswaData(aktif);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSiswa && userRombel && siswaData.length > 0) {
      setTemanSekelas(siswaData.filter(s => s.rombel === userRombel && s.nisn !== userNisn));
    }
  }, [isSiswa, userRombel, siswaData, userNisn]);

  // Check submission status whenever period or user changes
  useEffect(() => {
    const penilaiId = isSiswa ? userNisn : (userNisn || userName);
    if (periode && penilaiId) {
      checkSubmissionStatus(periode, penilaiId);
    }
  }, [periode, userRole, userNisn, userName, isSiswa]);

  const checkSubmissionStatus = async (p: string, id: string) => {
    if (!p || !id) return;
    try {
      setCheckingStatus(true);
      const res = await fetch(`/api/penilaian-karakter?periode=${encodeURIComponent(p)}&penilai_id=${encodeURIComponent(id)}`);
      const json = await res.json();
      if (json.success && json.alreadySubmitted) {
        setAlreadySubmitted(true);
        setSubmittedData(json.data);
        // Pre-fill so the user can review their submitted answers
        if (json.data?.data_diri) {
          const { halBaik: hb, halDiperbaiki: hd, ...restDiri } = json.data.data_diri;
          setDataDiri(restDiri || {});
          setHalBaik(hb || '');
          setHalDiperbaiki(hd || '');
        }
        if (json.data?.data_teman) {
          setDataTeman(json.data.data_teman || {});
        }
        if (json.data?.data_guru) {
          setDataGuru(json.data.data_guru || {});
        }
      } else {
        setAlreadySubmitted(false);
        setSubmittedData(null);
        setDataDiri({});
        setDataTeman({});
        setDataGuru({});
        setHalBaik('');
        setHalDiperbaiki('');
      }
    } catch (e) {
      console.error('Error checking submission status:', e);
    } finally {
      setCheckingStatus(false);
    }
  };

  const loadRekap = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/penilaian-karakter/rekap?periode=${encodeURIComponent(periode)}`);
      const json = await res.json();
      if (json.success) {
        setRekapData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'rekap') {
      if (isAdmin) {
        loadRekap();
      } else {
        setActiveTab('form');
      }
    }
  }, [activeTab, periode, isAdmin]);

  const handleSave = async () => {
    if (alreadySubmitted) {
      Swal.fire('Informasi', 'Anda sudah pernah mengisi penilaian untuk periode ini (hanya 1x pengisian per periode).', 'info');
      return;
    }

    try {
      setSaving(true);

      // Validation
      for (const t of TRAITS) {
        if (isSiswa) {
          if (!dataDiri[t.id]?.jawaban) return Swal.fire('Oops!', `Pilihan penilaian diri untuk sikap ${t.label} belum diisi!`, 'warning');
          if (!dataDiri[t.id]?.alasan) return Swal.fire('Oops!', `Alasan penilaian diri untuk sikap ${t.label} wajib diisi!`, 'warning');
          if (!dataTeman[t.id]?.nisn) return Swal.fire('Oops!', `Teman untuk sikap ${t.label} belum dipilih!`, 'warning');
          if (!dataTeman[t.id]?.alasan) return Swal.fire('Oops!', `Alasan untuk teman (${t.label}) wajib diisi!`, 'warning');
        } else {
          // Guru / Pimpinan / GTK / Staf
          if (!dataGuru[t.id]?.nisn) return Swal.fire('Oops!', `Siswa untuk sikap ${t.label} belum dipilih!`, 'warning');
        }
      }

      const penilai_id = isSiswa ? userNisn : (userNisn || userName);
      const body = {
        periode,
        penilai_id,
        penilai_nama: userName,
        penilai_role: userRole || (isSiswa ? 'siswa' : 'guru'),
        data_diri: isSiswa ? { ...dataDiri, halBaik, halDiperbaiki } : null,
        data_teman: isSiswa ? dataTeman : null,
        data_guru: !isSiswa ? dataGuru : null
      };

      const res = await fetch('/api/penilaian-karakter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (json.success) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: 'Penilaian karakter berhasil disimpan dan telah dikunci untuk periode ini.',
          confirmButtonColor: '#047857'
        });
        setAlreadySubmitted(true);
        setSubmittedData(json.data);
      } else {
        Swal.fire('Gagal!', json.error || 'Gagal menyimpan penilaian', 'error');
      }
    } catch (e: any) {
      Swal.fire('Error!', 'Terjadi kesalahan: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAdminReset = async () => {
    const penilaiId = isSiswa ? userNisn : (userNisn || userName);
    const confirm = await Swal.fire({
      title: 'Reset Pengisian?',
      text: `Yakin ingin mereset pengisian untuk "${userName}" pada periode "${periode}"? Formulir akan dapat diisi ulang kembali.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Reset',
      cancelButtonText: 'Batal'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await fetch(`/api/penilaian-karakter?periode=${encodeURIComponent(periode)}&penilai_id=${encodeURIComponent(penilaiId)}`, {
          method: 'DELETE'
        });
        const json = await res.json();
        if (json.success) {
          Swal.fire('Berhasil', 'Pengisian telah direset. Formulir dapat diisi kembali.', 'success');
          setAlreadySubmitted(false);
          setSubmittedData(null);
          setDataDiri({});
          setDataTeman({});
          setDataGuru({});
          setHalBaik('');
          setHalDiperbaiki('');
        } else {
          Swal.fire('Gagal', json.error, 'error');
        }
      } catch (e: any) {
        Swal.fire('Error', 'Gagal mereset: ' + e.message, 'error');
      }
    }
  };

  if (loading && activeTab === 'form') return <div style={{padding: 40}}><InlineLoading message="Memuat data siswa..." /></div>;

  return (
    <div className={styles.container}>
      {isSiswa && (
        <button onClick={() => window.location.href = '/portal/dashboard'} 
          style={{ 
            background: '#1e293b', 
            color: 'white', 
            border: 'none',
            padding: '10px 20px', 
            borderRadius: '10px', 
            cursor: 'pointer', 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '10px', 
            fontWeight: 'bold', 
            marginBottom: '20px', 
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)',
            fontSize: '0.95rem'
          }}
          onMouseOver={e => e.currentTarget.style.background = '#0f172a'}
          onMouseOut={e => e.currentTarget.style.background = '#1e293b'}
        >
          <i className="fas fa-arrow-left"></i> KEMBALI KE DASHBOARD
        </button>
      )}

      <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #047857 100%)', color: 'white', padding: '30px 20px', borderRadius: '16px', textAlign: 'center', marginBottom: '30px', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.2)' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>Penilaian Diri & Karakter</h1>
        <p style={{ margin: '10px 0 0 0', opacity: 0.9, fontSize: '0.95rem' }}>Formulir evaluasi sikap dan karakter antar siswa dan guru</p>
      </div>
      
      <div className={styles.tabsContainer} style={{ maxWidth: 450, margin: "0 auto 20px auto" }}>
        <div className={styles.tabsWrapper}>
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${activeTab === 'form' ? styles.activeTab : ''}`} onClick={() => setActiveTab('form')}>
              <i className="fas fa-clipboard-list"></i> Formulir Penilaian
            </button>
            {isAdmin && (
              <button className={`${styles.tab} ${activeTab === 'rekap' ? styles.activeTab : ''}`} onClick={() => setActiveTab('rekap')}>
                <i className="fas fa-chart-bar"></i> Rekapitulasi Poin
              </button>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'form' && (
        <div className={styles.card} style={{ maxWidth: '900px', margin: '20px auto', padding: '30px' }}>
          
          {/* Header Periode */}
          <div style={{ marginBottom: 25, display: 'flex', alignItems: 'center', gap: '15px', background: '#f8fafc', padding: '15px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            <label style={{ fontWeight: 'bold', color: '#1e293b', margin: 0, whiteSpace: 'nowrap' }}>
              <i className="fas fa-calendar-alt" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
              Periode Penilaian:
            </label>
            <select className={styles.inputField} style={{ margin: 0, flex: 1, maxWidth: '250px', cursor: 'pointer', fontWeight: 'bold', color: 'var(--primary)' }} value={periode} onChange={e => setPeriode(e.target.value)}>
              {Array.from({length: 12}).map((_, i) => {
                 const d = new Date();
                 d.setMonth(d.getMonth() - i);
                 const val = d.toLocaleString('id-ID', {month: 'long'}) + ' ' + d.getFullYear();
                 return <option key={val} value={val}>{val}</option>
              })}
            </select>

            <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
              Penilai: <b style={{ color: '#0f172a' }}>{userName || 'User'}</b> ({userRole || 'Umum'})
            </span>
          </div>

          {/* Loading Indicator when checking status */}
          {checkingStatus && (
            <div style={{ marginBottom: 20 }}>
              <InlineLoading message="Memeriksa riwayat pengisian..." />
            </div>
          )}

          {/* Banner Sudah Mengisi */}
          {!checkingStatus && alreadySubmitted && (
            <div style={{
              background: '#ecfdf5',
              border: '1.5px solid #a7f3d0',
              borderRadius: '14px',
              padding: '18px 22px',
              marginBottom: '25px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.08)'
            }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                <i className="fas fa-check-double"></i>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#065f46' }}>
                  Anda Telah Menyelesaikan Penilaian Karakter untuk Periode Ini
                </div>
                <div style={{ fontSize: '0.85rem', color: '#047857', marginTop: '3px', lineHeight: 1.5 }}>
                  {submittedData?.created_at && (
                    <span>Terkirim pada: <b>{new Date(submittedData.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB</b>. </span>
                  )}
                  Penilaian karakter dibatasi <b>1 kali pengisian per periode</b>. Isian Anda di bawah telah dikunci dan tersimpan dengan aman.
                </div>
              </div>
            </div>
          )}

          {/* FORM SISWA */}
          {isSiswa && (
            <>
              <h2 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 10, marginTop: 10 }}>A. Penilaian Diri</h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>Nilailah dirimu sendiri secara objektif untuk karakter-karakter di bawah ini.</p>
              
              {TRAITS.map((t, idx) => (
                <div key={t.id} style={{ marginBottom: 25, padding: 15, background: '#f8fafc', borderRadius: 8, opacity: alreadySubmitted ? 0.85 : 1 }}>
                  <p style={{ fontWeight: 'bold', margin: '0 0 10px 0' }}>{idx + 1}. Saya anak yang...</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 15 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: alreadySubmitted ? 'default' : 'pointer' }}>
                      <input 
                        type="radio" 
                        name={`diri_${t.id}`} 
                        disabled={alreadySubmitted}
                        checked={dataDiri[t.id]?.jawaban === 'A'} 
                        onChange={() => setDataDiri({ ...dataDiri, [t.id]: { ...dataDiri[t.id], jawaban: 'A' } })} 
                      />
                      <span>{t.label} (Sangat/Selalu)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: alreadySubmitted ? 'default' : 'pointer' }}>
                      <input 
                        type="radio" 
                        name={`diri_${t.id}`} 
                        disabled={alreadySubmitted}
                        checked={dataDiri[t.id]?.jawaban === 'B'} 
                        onChange={() => setDataDiri({ ...dataDiri, [t.id]: { ...dataDiri[t.id], jawaban: 'B' } })} 
                      />
                      <span>Biasa (Kadang-kadang)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: alreadySubmitted ? 'default' : 'pointer' }}>
                      <input 
                        type="radio" 
                        name={`diri_${t.id}`} 
                        disabled={alreadySubmitted}
                        checked={dataDiri[t.id]?.jawaban === 'C'} 
                        onChange={() => setDataDiri({ ...dataDiri, [t.id]: { ...dataDiri[t.id], jawaban: 'C' } })} 
                      />
                      <span>Tidak/Kurang {t.label.toLowerCase()}</span>
                    </label>
                  </div>
                  <input 
                    type="text" 
                    className={styles.inputField} 
                    style={{ width: '100%', boxSizing: 'border-box' }} 
                    placeholder="Tuliskan alasannya..." 
                    disabled={alreadySubmitted}
                    value={dataDiri[t.id]?.alasan || ''} 
                    onChange={e => setDataDiri({ ...dataDiri, [t.id]: { ...dataDiri[t.id], alasan: e.target.value } })} 
                  />
                </div>
              ))}

              <div style={{ marginBottom: 25, opacity: alreadySubmitted ? 0.85 : 1 }}>
                <p style={{ fontWeight: 'bold' }}>13. Selama bulan ini, hal baik yang sudah saya lakukan di madrasah adalah...</p>
                <textarea 
                  className={styles.inputField} 
                  style={{ height: 80, resize: 'vertical' }} 
                  disabled={alreadySubmitted}
                  value={halBaik} 
                  onChange={e => setHalBaik(e.target.value)}
                ></textarea>
              </div>
              <div style={{ marginBottom: 25, opacity: alreadySubmitted ? 0.85 : 1 }}>
                <p style={{ fontWeight: 'bold' }}>14. Yang perlu saya perbaiki dari diri saya adalah...</p>
                <textarea 
                  className={styles.inputField} 
                  style={{ height: 80, resize: 'vertical' }} 
                  disabled={alreadySubmitted}
                  value={halDiperbaiki} 
                  onChange={e => setHalDiperbaiki(e.target.value)}
                ></textarea>
              </div>

              <h2 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 10, marginTop: 40 }}>B. Penilaian Teman</h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>Pilih teman sekelas yang paling mewakili karakter di bawah ini, dan tulis alasannya.</p>

              {TRAITS.map((t, idx) => (
                <div key={`teman_${t.id}`} style={{ marginBottom: 25, padding: 15, background: '#f8fafc', borderRadius: 8, opacity: alreadySubmitted ? 0.85 : 1 }}>
                  <p style={{ fontWeight: 'bold', margin: '0 0 10px 0' }}>{idx + 1}. Teman saya yang paling {t.label.toLowerCase()} adalah:</p>
                  {alreadySubmitted ? (
                    <div style={{ padding: '9px 12px', background: '#e2e8f0', borderRadius: '8px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                      {temanSekelas.find(s => s.nisn === dataTeman[t.id]?.nisn)?.nama || dataTeman[t.id]?.nisn || '-'}
                    </div>
                  ) : (
                    <SearchableSelect 
                      options={temanSekelas.map(s => ({ value: s.nisn, label: s.nama }))} 
                      value={dataTeman[t.id]?.nisn || ''} 
                      onChange={val => setDataTeman({ ...dataTeman, [t.id]: { ...dataTeman[t.id], nisn: val } })} 
                      placeholder="-- Cari Teman Sekelas --" 
                    />
                  )}
                  <input 
                    type="text" 
                    className={styles.inputField} 
                    style={{ width: '100%', boxSizing: 'border-box' }} 
                    placeholder="Karena..." 
                    disabled={alreadySubmitted}
                    value={dataTeman[t.id]?.alasan || ''} 
                    onChange={e => setDataTeman({ ...dataTeman, [t.id]: { ...dataTeman[t.id], alasan: e.target.value } })} 
                  />
                </div>
              ))}
            </>
          )}

          {/* FORM GURU / PIMPINAN / GTK / STAF */}
          {!isSiswa && (userRole || userName) && (
            <>
              <h2 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 10, marginTop: 10 }}>
                Penilaian Karakter Murid oleh Guru / Pimpinan / Staf
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>
                Pilih murid (dari kelas berapapun) yang paling mewakili karakter di bawah ini. Alasan bersifat opsional.
              </p>

              {TRAITS.map((t, idx) => (
                <div key={`guru_${t.id}`} style={{ marginBottom: 25, padding: 15, background: '#f8fafc', borderRadius: 8, opacity: alreadySubmitted ? 0.85 : 1 }}>
                  <p style={{ fontWeight: 'bold', margin: '0 0 10px 0' }}>{idx + 1}. Murid yang paling {t.label.toLowerCase()} adalah:</p>
                  
                  {alreadySubmitted ? (
                    <div style={{ padding: '9px 12px', background: '#e2e8f0', borderRadius: '8px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                      {(() => {
                        const s = siswaData.find(st => st.nisn === dataGuru[t.id]?.nisn);
                        return s ? `${s.nama} (Kelas ${s.rombel})` : (dataGuru[t.id]?.nisn || '-');
                      })()}
                    </div>
                  ) : (
                    <SearchableSelect 
                      options={siswaData.map(s => ({ value: s.nisn, label: s.nama, subLabel: 'Kelas ' + s.rombel }))} 
                      value={dataGuru[t.id]?.nisn || ''} 
                      onChange={val => setDataGuru({ ...dataGuru, [t.id]: { ...dataGuru[t.id], nisn: val } })} 
                      placeholder="-- Cari Nama Siswa --" 
                    />
                  )}

                  <input 
                    type="text" 
                    className={styles.inputField} 
                    style={{ width: '100%', boxSizing: 'border-box' }} 
                    placeholder="Karena... (Opsional)" 
                    disabled={alreadySubmitted}
                    value={dataGuru[t.id]?.alasan || ''} 
                    onChange={e => setDataGuru({ ...dataGuru, [t.id]: { ...dataGuru[t.id], alasan: e.target.value } })} 
                  />
                </div>
              ))}
            </>
          )}

          {/* Not logged in */}
          {!userRole && !userName && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-user-lock" style={{ fontSize: '3rem', marginBottom: '15px', color: '#cbd5e1' }}></i>
              <h3>Silakan Login</h3>
              <p>Silakan login terlebih dahulu ke Portal Siswa atau Akun Madrasah untuk mengakses formulir ini.</p>
            </div>
          )}
          
          {/* Action Footer */}
          {(userRole || userName) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, borderTop: '2px dashed #e2e8f0', paddingTop: 25, flexWrap: 'wrap', gap: '15px' }}>
              {alreadySubmitted ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{
                    background: '#ecfdf5',
                    color: '#047857',
                    border: '1px solid #a7f3d0',
                    padding: '10px 18px',
                    borderRadius: '50px',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <i className="fas fa-check-circle" style={{ color: '#10b981' }}></i> Pengisian Sudah Selesai (Terkunci)
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={handleAdminReset}
                      style={{
                        background: '#fee2e2',
                        color: '#ef4444',
                        border: 'none',
                        padding: '9px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      title="Reset pengisian untuk akun ini"
                    >
                      <i className="fas fa-undo"></i> Reset Pengisian (Admin)
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: '6px', color: 'var(--primary)' }}></i>
                  Penilaian hanya dapat dikirim <b>1 kali</b> per periode. Pastikan semua data sudah terisi dengan benar.
                </div>
              )}

              {!alreadySubmitted && (
                <button 
                  onClick={handleSave} 
                  disabled={saving}
                  style={{ 
                    background: 'linear-gradient(135deg, var(--primary) 0%, #047857 100%)', 
                    color: 'white', 
                    padding: '14px 32px', 
                    fontSize: '1.05rem', 
                    fontWeight: 'bold',
                    border: 'none',
                    borderRadius: '50px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)',
                    transition: 'all 0.3s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    opacity: saving ? 0.7 : 1
                  }}
                  onMouseOver={e => { if(!saving) e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseOut={e => { if(!saving) e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>} 
                  {saving ? 'Sedang Menyimpan...' : 'Kirim Penilaian Sekarang'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'rekap' && isAdmin && (
        <div className={styles.card} style={{ maxWidth: '100%', width: '95%', margin: '20px auto', padding: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ margin: 0 }}><i className="fas fa-trophy"></i> Rekapitulasi Poin Karakter ({periode})</h2>
            <button className={styles.btn} onClick={loadRekap} style={{ padding: '8px 16px' }}><i className="fas fa-sync-alt"></i> Segarkan</button>
          </div>
          
          {loading ? (
            <InlineLoading message="Menghitung poin rekapitulasi..." />
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Kelas</th>
                    <th>Nama Siswa</th>
                    {TRAITS.map(t => <th key={t.id} style={{ fontSize: '0.8rem', textAlign: 'center' }}>{t.label}</th>)}
                    <th>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {rekapData
                    .sort((a, b) => b.total - a.total || (a.kelas || '').localeCompare(b.kelas || '') || (a.nama || '').localeCompare(b.nama || ''))
                    .map((r, idx) => (
                    <tr key={r.nisn}>
                      <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ textAlign: 'center' }}>{r.kelas}</td>
                      <td>{r.nama}</td>
                      {TRAITS.map(t => (
                        <td key={t.id} style={{ textAlign: 'center', background: r.scores[t.id] > 0 ? '#ecfdf5' : 'transparent', fontWeight: r.scores[t.id] > 0 ? 'bold' : 'normal', color: r.scores[t.id] > 0 ? '#10b981' : '#94a3b8' }}>
                          {r.scores[t.id]}
                        </td>
                      ))}
                      <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}>{r.total}</td>
                    </tr>
                  ))}
                  {rekapData.length === 0 && (
                    <tr>
                      <td colSpan={16} style={{ textAlign: 'center', padding: 20 }}>Belum ada data penilaian di periode ini.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
