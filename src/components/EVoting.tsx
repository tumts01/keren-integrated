import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import styles from './EVoting.module.css';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const getImageUrl = (url: string) => {
  if (!url) return '';
  if (url.includes('drive.google.com')) {
    const match = url.match(/[?&]id=([^&]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
    }
  }
  return url;
};

export default function EVoting({ isAdmin = false }: { isAdmin?: boolean }) {
  const [view, setView] = useState<'login' | 'vote' | 'dashboard' | 'pengaturan'>('login');
  const [kandidatList, setKandidatList] = useState<any[]>([]);
  const [totalPemilih, setTotalPemilih] = useState(0);
  const [loading, setLoading] = useState(false);
  const [voterName, setVoterName] = useState('');
  const [namesDb, setNamesDb] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchName, setSearchName] = useState('');
  
  useEffect(() => {
    // Fetch kandidat
    fetchKandidat();
    // Fetch names for autocomplete
    fetchNames();
  }, []);

  const fetchKandidat = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/e-voting/kandidat?t=' + Date.now());
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nomor_urut: '',
    nama_paslon: '',
    visi: '',
    misi: '',
    foto_ketua: '',
    foto_wakil: ''
  });

  const handleEditKandidat = (k: any) => {
    setEditingId(k.id);
    setFormData({
      nomor_urut: k.noUrut || '',
      nama_paslon: k.nama || '',
      visi: k.visi || '',
      misi: k.misi || '',
      foto_ketua: k.fotoKetua || '',
      foto_wakil: k.fotoWakil || ''
    });
  };

  const handleDeleteKandidat = async (id: string) => {
    const confirmDelete = await Swal.fire({
      title: 'Hapus Kandidat?',
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, hapus!'
    });
    
    if (!confirmDelete.isConfirmed) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/e-voting/kandidat?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        Swal.fire('Terhapus', 'Kandidat berhasil dihapus', 'success');
        fetchKandidat();
      } else {
        Swal.fire('Gagal', result.error, 'error');
      }
    } catch (e: any) {
      Swal.fire('Error', e.message, 'error');
    }
    setLoading(false);
  };

  const handleSaveKandidat = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editingId ? `/api/e-voting/kandidat?id=${editingId}` : `/api/e-voting/kandidat`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const result = await res.json();
      if (result.success) {
        Swal.fire('Tersimpan', 'Data kandidat berhasil disimpan', 'success');
        setEditingId(null);
        setFormData({ nomor_urut: '', nama_paslon: '', visi: '', misi: '', foto_ketua: '', foto_wakil: '' });
        fetchKandidat();
      } else {
        Swal.fire('Gagal', result.error, 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
    setLoading(false);
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
      html: `Anda akan memilih:<br/><b>Calon ${kandidat.noUrut} - ${kandidat.nama}</b><br/><br/>Pilihan tidak dapat diubah setelah disimpan!`,
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
    labels: kandidatList.map(k => `Calon ${k.noUrut}: ${k.nama}`),
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
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <img src="/logo.png" alt="Logo MTs Almaarif 01 Singosari" style={{ height: '70px', width: 'auto', marginBottom: '10px' }} />
        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '1px' }}>
          MTs Almaarif 01 Singosari
        </div>
      </div>
      <h2 className={styles.title} style={{ marginTop: '0.5rem' }}>
        <i className="fas fa-vote-yea" style={{ color: '#3b82f6' }}></i> E-Voting Pemilihan Ketua OSIM
      </h2>
      <p className={styles.subtitle}>Gunakan hak pilih Anda dengan bijak dan rahasia.</p>

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
            style={{ width: 'auto', background: view === 'login' ? '#0f172a' : '#3b82f6', marginRight: '10px' }}
            onClick={() => setView('login')}
          >
            <i className="fas fa-user-check"></i> Form Pemilih
          </button>
          <button 
            className={styles.btnPrimary} 
            style={{ width: 'auto', background: view === 'pengaturan' ? '#0f172a' : '#3b82f6' }}
            onClick={() => setView('pengaturan')}
          >
            <i className="fas fa-cog"></i> Pengaturan
          </button>
        </div>
      )}

      {view === 'login' && (
        <div className={styles.loginCard}>
          <i className="fas fa-fingerprint" style={{ fontSize: '4rem', color: '#cbd5e1', marginBottom: '1rem' }}></i>
          <h3>Verifikasi Pemilih</h3>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Silakan cari nama lengkap Anda (Siswa/Guru) untuk mulai memilih.</p>
          <form onSubmit={handleLogin}>
            
            <div className={styles.dropdownContainer}>
              <div 
                className={styles.dropdownButton} 
                onClick={() => {
                  setIsDropdownOpen(!isDropdownOpen);
                  if (!isDropdownOpen) setSearchName('');
                }}
              >
                <span style={{ color: voterName ? '#1e293b' : '#94a3b8' }}>
                  {voterName || 'Pilih Nama Anda...'}
                </span>
                <i className="fas fa-chevron-down" style={{ color: '#94a3b8' }}></i>
              </div>

              {isDropdownOpen && (
                <div className={styles.dropdownMenu}>
                  <div className={styles.dropdownSearch}>
                    <input 
                      type="text" 
                      placeholder="Cari nama..." 
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className={styles.dropdownList}>
                    {namesDb
                      .filter(n => n.toLowerCase().includes(searchName.toLowerCase()))
                      .slice(0, 50)
                      .map((n, i) => (
                        <div 
                          key={i} 
                          className={styles.dropdownItem}
                          onClick={() => {
                            setVoterName(n);
                            setIsDropdownOpen(false);
                          }}
                        >
                          {n}
                        </div>
                      ))}
                    {namesDb.filter(n => n.toLowerCase().includes(searchName.toLowerCase())).length === 0 && (
                      <div style={{ padding: '10px', textAlign: 'center', color: '#94a3b8' }}>Nama tidak ditemukan</div>
                    )}
                  </div>
                </div>
              )}
            </div>

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
                <div style={{ display: 'flex', width: '100%', height: '360px', background: '#1e293b' }}>
                  {k.fotoKetua && <img src={getImageUrl(k.fotoKetua)} alt={`Calon ${k.noUrut}`} style={{ flex: k.fotoWakil ? 1 : 'none', width: k.fotoWakil ? '50%' : '100%', objectFit: 'contain', borderRight: k.fotoWakil ? '2px solid white' : 'none' }} />}
                  {k.fotoWakil && <img src={getImageUrl(k.fotoWakil)} alt={`Calon ${k.noUrut}`} style={{ flex: 1, width: '50%', objectFit: 'contain' }} />}
                  {!k.fotoKetua && !k.fotoWakil && (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                      <i className="fas fa-user-tie" style={{ fontSize: '4rem' }}></i>
                    </div>
                  )}
                </div>
                <div className={styles.paslonContent}>
                  <div className={styles.nomorUrut}>CALON {k.noUrut}</div>
                  <div className={styles.namaPaslon}>{k.nama}</div>
                  <div className={styles.visimisi}>
                    <h4>Visi</h4>
                    <p style={{ whiteSpace: 'pre-line' }}>{k.visi || '-'}</p>
                    <h4>Misi</h4>
                    <p style={{ whiteSpace: 'pre-line' }}>{k.misi || '-'}</p>
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
          <div style={{ marginBottom: '20px', textAlign: 'center', fontWeight: 'bold', color: '#3b82f6' }}>
            Total Suara Masuk: {totalPemilih} Suara
          </div>
          <div style={{ height: '400px', display: 'flex', justifyContent: 'center' }}>
            <Bar 
              data={chartData} 
              options={{ 
                maintainAspectRatio: false,
                scales: {
                  y: { beginAtZero: true, ticks: { precision: 0 } }
                }
              }} 
            />
          </div>
        </div>
      )}

      {view === 'pengaturan' && (
        <div className={styles.loginCard} style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
          <h3 style={{ textAlign: 'center', marginBottom: '20px' }}><i className="fas fa-users-cog"></i> Pengaturan Kandidat OSIM</h3>
          
          <form onSubmit={handleSaveKandidat} style={{ marginBottom: '30px', padding: '20px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ marginBottom: '15px' }}>{editingId ? 'Edit Kandidat' : 'Tambah Kandidat Baru'}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', fontWeight: 'bold' }}>Nomor Urut</label>
                <input type="text" value={formData.nomor_urut} onChange={e => setFormData({...formData, nomor_urut: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', fontWeight: 'bold' }}>Nama Calon</label>
                <input type="text" value={formData.nama_paslon} onChange={e => setFormData({...formData, nama_paslon: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} required />
              </div>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', fontWeight: 'bold' }}>Visi</label>
              <textarea value={formData.visi} onChange={e => setFormData({...formData, visi: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', minHeight: '60px' }} />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', fontWeight: 'bold' }}>Misi</label>
              <textarea value={formData.misi} onChange={e => setFormData({...formData, misi: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', minHeight: '80px' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', fontWeight: 'bold' }}>URL Foto Calon (Drive/Lainnya)</label>
              <input type="text" value={formData.foto_ketua} onChange={e => setFormData({...formData, foto_ketua: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" disabled={loading} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                <i className="fas fa-save"></i> {loading ? 'Menyimpan...' : 'Simpan Kandidat'}
              </button>
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); setFormData({ nomor_urut: '', nama_paslon: '', visi: '', misi: '', foto_ketua: '', foto_wakil: '' }); }} style={{ background: '#64748b', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Batal Edit
                </button>
              )}
            </div>
          </form>

          <h4 style={{ marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>Daftar Kandidat Saat Ini</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {kandidatList.map(k => (
              <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div>
                  <h5 style={{ margin: '0 0 5px 0', fontSize: '1.1rem' }}>CALON {k.noUrut}: {k.nama}</h5>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      <span style={{ marginRight: '10px' }}><i className="fas fa-image"></i> Foto Calon: {k.fotoKetua ? 'Ada' : 'Kosong'}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleEditKandidat(k)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                    <i className="fas fa-edit"></i> Edit
                  </button>
                  <button onClick={() => handleDeleteKandidat(k.id)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                    <i className="fas fa-trash"></i> Hapus
                  </button>
                </div>
              </div>
            ))}
            {kandidatList.length === 0 && (
              <p style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>Belum ada data kandidat</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
