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
  
  const [periode, setPeriode] = useState('');
  
  const [siswaData, setSiswaData] = useState<any[]>([]);
  const [temanSekelas, setTemanSekelas] = useState<any[]>([]);
  
  const [dataDiri, setDataDiri] = useState<any>({});
  const [dataTeman, setDataTeman] = useState<any>({});
  const [dataGuru, setDataGuru] = useState<any>({});
  const [halBaik, setHalBaik] = useState('');
  const [halDiperbaiki, setHalDiperbaiki] = useState('');

  const [rekapData, setRekapData] = useState<any[]>([]);

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
        setUserRole(u.role || '');
        setUserNisn(u.nisn || '');
        setUserName(u.nama || '');
        setUserRombel(u.rombel || '');
      } catch(e){}
    } else if (portalStr) {
      try {
        const u = JSON.parse(portalStr);
        setUserRole('siswa');
        setUserNisn(u.nisn || '');
        setUserName(u.nama || '');
        setUserRombel(u.rombel || '');
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
        // Filter by rombel later when we know the user
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole.toLowerCase().includes('siswa') && userRombel && siswaData.length > 0) {
      setTemanSekelas(siswaData.filter(s => s.rombel === userRombel && s.nisn !== userNisn));
    }
  }, [userRole, userRombel, siswaData, userNisn]);

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
      loadRekap();
    }
  }, [activeTab, periode]);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const isSiswa = userRole.toLowerCase().includes('siswa');
      const isGuru = (userRole.toLowerCase().includes('guru') || userRole.toLowerCase().includes('admin') || userRole.toLowerCase().includes('wali'));

      // Validation
      for (const t of TRAITS) {
        if (isSiswa) {
          if (!dataDiri[t.id]?.jawaban) return Swal.fire('Oops!', `Pilihan penilaian diri untuk sikap ${t.label} belum diisi!`, 'warning');
          if (!dataDiri[t.id]?.alasan) return Swal.fire('Oops!', `Alasan penilaian diri untuk sikap ${t.label} wajib diisi!`, 'warning');
          if (!dataTeman[t.id]?.nisn) return Swal.fire('Oops!', `Teman untuk sikap ${t.label} belum dipilih!`, 'warning');
          if (!dataTeman[t.id]?.alasan) return Swal.fire('Oops!', `Alasan untuk teman (${t.label}) wajib diisi!`, 'warning');
        }
        if (isGuru) {
          if (!dataGuru[t.id]?.nisn) return Swal.fire('Oops!', `Siswa untuk sikap ${t.label} belum dipilih!`, 'warning');
        }
      }

      const body = {
        periode,
        penilai_id: isSiswa ? userNisn : userName,
        penilai_nama: userName,
        penilai_role: isSiswa ? 'siswa' : 'guru',
        data_diri: isSiswa ? { ...dataDiri, halBaik, halDiperbaiki } : null,
        data_teman: isSiswa ? dataTeman : null,
        data_guru: isGuru ? dataGuru : null
      };

      const res = await fetch('/api/penilaian-karakter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (json.success) {
        Swal.fire('Berhasil!', 'Penilaian karakter berhasil disimpan.', 'success');
      } else {
        Swal.fire('Gagal!', 'Gagal menyimpan: ' + json.error, 'error');
      }
    } catch (e: any) {
      Swal.fire('Error!', 'Terjadi kesalahan: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading && activeTab === 'form') return <div style={{padding: 40}}><InlineLoading message="Memuat data siswa..." /></div>;

  return (
    <div className={styles.container}>
      {(userRole || '').toLowerCase().includes('siswa') && (
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
      
      <div className={styles.tabsContainer} style={{ maxWidth: 450, margin: "0 auto 20px auto" }}><div className={styles.tabsWrapper}><div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'form' ? styles.activeTab : ''}`} onClick={() => setActiveTab('form')}>
          <i className="fas fa-clipboard-list"></i> Formulir Penilaian
        </button>
        <button className={`${styles.tab} ${activeTab === 'rekap' ? styles.activeTab : ''}`} onClick={() => setActiveTab('rekap')}>
          <i className="fas fa-chart-bar"></i> Rekapitulasi Poin
        </button>
      </div></div></div>

      {activeTab === 'form' && (
        <div className={styles.card} style={{ maxWidth: '900px', margin: '20px auto', padding: '30px' }}>
          <div style={{ marginBottom: 30, display: 'flex', alignItems: 'center', gap: '15px', background: '#f8fafc', padding: '15px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
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
          </div>

          {userRole.toLowerCase().includes('siswa') && (
            <>
              <h2 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 10, marginTop: 30 }}>A. Penilaian Diri</h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>Nilailah dirimu sendiri secara objektif untuk karakter-karakter di bawah ini.</p>
              
              {TRAITS.map((t, idx) => (
                <div key={t.id} style={{ marginBottom: 25, padding: 15, background: '#f8fafc', borderRadius: 8 }}>
                  <p style={{ fontWeight: 'bold', margin: '0 0 10px 0' }}>{idx + 1}. Saya anak yang...</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 15 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="radio" name={`diri_${t.id}`} checked={dataDiri[t.id]?.jawaban === 'A'} onChange={() => setDataDiri({ ...dataDiri, [t.id]: { ...dataDiri[t.id], jawaban: 'A' } })} />
                      <span>{t.label} (Sangat/Selalu)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="radio" name={`diri_${t.id}`} checked={dataDiri[t.id]?.jawaban === 'B'} onChange={() => setDataDiri({ ...dataDiri, [t.id]: { ...dataDiri[t.id], jawaban: 'B' } })} />
                      <span>Biasa (Kadang-kadang)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="radio" name={`diri_${t.id}`} checked={dataDiri[t.id]?.jawaban === 'C'} onChange={() => setDataDiri({ ...dataDiri, [t.id]: { ...dataDiri[t.id], jawaban: 'C' } })} />
                      <span>Tidak/Kurang {t.label.toLowerCase()}</span>
                    </label>
                  </div>
                  <input type="text" className={styles.inputField} style={{ width: '100%', boxSizing: 'border-box' }} placeholder="Tuliskan alasannya..." value={dataDiri[t.id]?.alasan || ''} onChange={e => setDataDiri({ ...dataDiri, [t.id]: { ...dataDiri[t.id], alasan: e.target.value } })} />
                </div>
              ))}

              <div style={{ marginBottom: 25 }}>
                <p style={{ fontWeight: 'bold' }}>13. Selama bulan ini, hal baik yang sudah saya lakukan di madrasah adalah...</p>
                <textarea className={styles.inputField} style={{ height: 80, resize: 'vertical' }} value={halBaik} onChange={e => setHalBaik(e.target.value)}></textarea>
              </div>
              <div style={{ marginBottom: 25 }}>
                <p style={{ fontWeight: 'bold' }}>14. Yang perlu saya perbaiki dari diri saya adalah...</p>
                <textarea className={styles.inputField} style={{ height: 80, resize: 'vertical' }} value={halDiperbaiki} onChange={e => setHalDiperbaiki(e.target.value)}></textarea>
              </div>

              <h2 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 10, marginTop: 40 }}>B. Penilaian Teman</h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>Pilih teman sekelas yang paling mewakili karakter di bawah ini, dan tulis alasannya.</p>

              {TRAITS.map((t, idx) => (
                <div key={`teman_${t.id}`} style={{ marginBottom: 25, padding: 15, background: '#f8fafc', borderRadius: 8 }}>
                  <p style={{ fontWeight: 'bold', margin: '0 0 10px 0' }}>{idx + 1}. Teman saya yang paling {t.label.toLowerCase()} adalah:</p>
                  <SearchableSelect 
                    options={temanSekelas.map(s => ({ value: s.nisn, label: s.nama }))} 
                    value={dataTeman[t.id]?.nisn || ''} 
                    onChange={val => setDataTeman({ ...dataTeman, [t.id]: { ...dataTeman[t.id], nisn: val } })} 
                    placeholder="-- Cari Teman Sekelas --" 
                  />
                  <input type="text" className={styles.inputField} style={{ width: '100%', boxSizing: 'border-box' }} placeholder="Karena..." value={dataTeman[t.id]?.alasan || ''} onChange={e => setDataTeman({ ...dataTeman, [t.id]: { ...dataTeman[t.id], alasan: e.target.value } })} />
                </div>
              ))}
            </>
          )}

          {((userRole.toLowerCase().includes('guru') || userRole.toLowerCase().includes('admin') || userRole.toLowerCase().includes('wali'))) && (
            <>
              <h2 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 10, marginTop: 10 }}>Penilaian Murid oleh Guru / Wali Kelas</h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>Pilih murid (dari kelas berapapun) yang paling mewakili karakter di bawah ini. Alasan bersifat opsional.</p>

              {TRAITS.map((t, idx) => (
                <div key={`guru_${t.id}`} style={{ marginBottom: 25, padding: 15, background: '#f8fafc', borderRadius: 8 }}>
                  <p style={{ fontWeight: 'bold', margin: '0 0 10px 0' }}>{idx + 1}. Murid yang paling {t.label.toLowerCase()} adalah:</p>
                  
                  <SearchableSelect 
                    options={siswaData.map(s => ({ value: s.nisn, label: s.nama, subLabel: 'Kelas ' + s.rombel }))} 
                    value={dataGuru[t.id]?.nisn || ''} 
                    onChange={val => setDataGuru({ ...dataGuru, [t.id]: { ...dataGuru[t.id], nisn: val } })} 
                    placeholder="-- Cari Nama Siswa --" 
                  />

                  <input type="text" className={styles.inputField} style={{ width: '100%', boxSizing: 'border-box' }} placeholder="Karena... (Opsional)" value={dataGuru[t.id]?.alasan || ''} onChange={e => setDataGuru({ ...dataGuru, [t.id]: { ...dataGuru[t.id], alasan: e.target.value } })} />
                </div>
              ))}
            </>
          )}

          
          {(!userRole.toLowerCase().includes('siswa') && !userRole.toLowerCase().includes('guru') && !userRole.toLowerCase().includes('admin') && !userRole.toLowerCase().includes('wali')) && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-lock" style={{ fontSize: '3rem', marginBottom: '15px', color: '#cbd5e1' }}></i>
              <h3>Akses Terbatas</h3>
              <p>Maaf, peran akun Anda ({userRole || 'Tidak diketahui'}) tidak memiliki akses untuk mengisi formulir ini.</p>
            </div>
          )}
          
          <div style={{ textAlign: 'right', marginTop: 40, borderTop: '2px dashed #e2e8f0', paddingTop: 25 }}>

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
          </div>
        </div>
      )}

      {activeTab === 'rekap' && (
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
