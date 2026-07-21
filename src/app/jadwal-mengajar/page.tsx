'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Jadwal.module.css';

interface Jadwal {
  id: string;
  kodeGuru: string;
  namaGuru: string;
  statusGuru: string;
  mataPelajaran: string;
  totalJam: string;
  keterangan: string;
  [key: string]: string; // For class columns
}

interface Mapel {
  id: string;
  namaMapel: string;
}

interface Guru {
  id: number;
  nama: string;
}

const KELAS_VII = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
const KELAS_VIII = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
const KELAS_IX = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

const STATUS_GURU = ['GTY', 'DPK', 'PTY', 'GTT', 'PTT'];

export default function JadwalMengajarPage() {
  const [jadwalList, setJadwalList] = useState<Jadwal[]>([]);
  const [mapelList, setMapelList] = useState<Mapel[]>([]);
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Jadwal>>({});

  const [activeTab, setActiveTab] = useState<'guru' | 'kelas'>('guru');
  const [selectedKelas, setSelectedKelas] = useState('VII_A');
  const [jadwalPelajaran, setJadwalPelajaran] = useState<any[]>([]);
  const [loadingPelajaran, setLoadingPelajaran] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem('keren_user_data');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserRole((user.rule || user.role || '').toLowerCase());
        setCurrentUsername(user.nama || user.username || '');
      } catch(e) {}
    }
    if (activeTab === 'guru') {
      fetchData();
    } else if (activeTab === 'kelas' && jadwalPelajaran.length === 0 && !loadingPelajaran) {
      fetchJadwalPelajaran();
    }
  }, [activeTab]);

  const fetchJadwalPelajaran = async () => {
    setLoadingPelajaran(true);
    try {
      const res = await fetch('/api/jadwal-pelajaran');
      const data = await res.json();
      if (data.success) {
        setJadwalPelajaran(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPelajaran(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resJadwal, resMapel, resGuru] = await Promise.all([
        fetch('/api/jadwal'),
        fetch('/api/jadwal/mapel'),
        fetch('/api/guru')
      ]);
      const dataJadwal = await resJadwal.json();
      const dataMapel = await resMapel.json();
      const dataGuru = await resGuru.json();
      
      if (dataJadwal.success) setJadwalList(dataJadwal.data);
      if (dataMapel.success) setMapelList(dataMapel.data);
      if (dataGuru.success) setGuruList(dataGuru.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleJamChange = (prefix: string, kelas: string, value: string) => {
    const field = `${prefix}_${kelas}`;
    // Only allow numbers
    if (value && !/^\d*$/.test(value)) return;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Calculate total jam dynamically
  const calculateTotal = () => {
    let total = 0;
    ['VII', 'VIII', 'IX'].forEach(prefix => {
      const arr = prefix === 'VII' ? KELAS_VII : prefix === 'VIII' ? KELAS_VIII : KELAS_IX;
      arr.forEach(k => {
        const val = parseInt(formData[`${prefix}_${k}`] || '0');
        if (!isNaN(val)) total += val;
      });
    });
    return total;
  };

  const openAddModal = () => {
    setFormData({
      statusGuru: 'GTY', // default
    });
    setShowModal(true);
  };

  const openEditModal = (item: Jadwal) => {
    setFormData({ ...item });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!isAdmin) { alert('Akses ditolak'); return; }
    if (!formData.kodeGuru || !formData.namaGuru || !formData.mataPelajaran) {
      alert('Kode Guru, Nama, dan Mata Pelajaran harus diisi!');
      return;
    }
    
    setSaving(true);
    try {
      const payload = { ...formData, totalJam: calculateTotal().toString() };
      
      const res = await fetch('/api/jadwal/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.success) {
        setShowModal(false);
        fetchData();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Terjadi kesalahan jaringan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) { alert('Akses ditolak'); return; }
    if (!confirm('Apakah Anda yakin ingin menghapus jadwal ini?')) return;
    
    try {
      const res = await fetch('/api/jadwal/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Terjadi kesalahan');
    }
  };

  // Filter functionality
  const filteredList = jadwalList.filter(j => {
    const term = searchTerm.toLowerCase();
    return (
      (j.namaGuru || '').toLowerCase().includes(term) ||
      (j.mataPelajaran || '').toLowerCase().includes(term)
    );
  });

  const isAdmin = userRole === 'admin' || userRole === 'pimpinan';

  // Jadwal Kelas computed
  // Filter for the selected class
  const classTimetable = jadwalPelajaran.filter(j => j.kelas === selectedKelas);
  
  // Get unique Jam Ke
  const jamKeList = Array.from(new Set(classTimetable.map(j => j.jamKe))).sort((a, b) => a - b);
  
  // Get unique days 
  const DAYS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
  
  const getCellData = (hari: string, jam: number) => {
    const entry = classTimetable.find(j => j.hari === hari && j.jamKe === jam);
    if (!entry) return null;
    return entry;
  };

  const ALL_KELAS_OPTIONS = [
    ...KELAS_VII.map(k => `VII_${k}`),
    ...KELAS_VIII.map(k => `VIII_${k}`),
    ...KELAS_IX.map(k => `IX_${k}`)
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Jadwal Mengajar</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Rincian beban jam mengajar guru semester ini.
          </p>
        </div>
        {isAdmin && activeTab === 'guru' && (
          <button className={styles.addBtn} onClick={openAddModal}>
            <i className="fas fa-plus"></i> Tambah Jadwal
          </button>
        )}
      </div>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'guru' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('guru')}
        >
          <i className="fas fa-chalkboard-teacher"></i>
          Jadwal Guru
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'kelas' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('kelas')}
        >
          <i className="fas fa-users"></i>
          Jadwal Kelas
        </button>
      </div>

      {activeTab === 'guru' && (
        <div className={styles.controls}>
          <input 
            type="text" 
            placeholder="Cari berdasarkan nama guru atau mata pelajaran..." 
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}

      {activeTab === 'kelas' && (
        <div className={styles.controls}>
          <select 
            className={styles.searchInput}
            value={selectedKelas}
            onChange={(e) => setSelectedKelas(e.target.value)}
            style={{ maxWidth: '300px' }}
          >
            {ALL_KELAS_OPTIONS.map(k => (
              <option key={k} value={k}>Kelas {k.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      )}

      <div className={styles.card}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fas fa-spinner fa-spin fa-2x"></i>
            <p>Memuat data jadwal...</p>
          </div>
        ) : activeTab === 'guru' ? (
          filteredList.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p>Tidak ada data jadwal ditemukan.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th rowSpan={2}>Kode</th>
                  <th rowSpan={2} className={styles.textLeft}>Nama Guru</th>
                  <th rowSpan={2}>Status</th>
                  <th rowSpan={2}>Mata Pelajaran</th>
                  <th colSpan={9}>Kelas VII</th>
                  <th colSpan={9}>Kelas VIII</th>
                  <th colSpan={9}>Kelas IX</th>
                  <th rowSpan={2}>JML</th>
                  <th rowSpan={2}>KET.</th>
                  {isAdmin && <th rowSpan={2}>Aksi</th>}
                </tr>
                <tr>
                  {KELAS_VII.map(k => <th key={`7${k}`}>{k}</th>)}
                  {KELAS_VIII.map(k => <th key={`8${k}`}>{k}</th>)}
                  {KELAS_IX.map(k => <th key={`9${k}`}>{k}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item, idx) => {
                  const isCurrentUser = currentUsername.toLowerCase().includes(item.namaGuru?.toLowerCase()) && item.namaGuru.length > 3;
                  return (
                    <tr key={item.id} style={{ backgroundColor: isCurrentUser ? '#f0fdf4' : 'transparent' }}>
                      <td>{item.kodeGuru}</td>
                      <td className={styles.textLeft} style={{ fontWeight: isCurrentUser ? 700 : 500 }}>
                        {item.namaGuru} {isCurrentUser && <i className="fas fa-star" style={{color: '#f59e0b', fontSize: '10px', marginLeft: '4px'}}></i>}
                      </td>
                      <td>{item.statusGuru}</td>
                      <td style={{ fontWeight: 600 }}>{item.mataPelajaran}</td>
                      
                      {KELAS_VII.map(k => <td key={`7${k}`}>{item[`VII_${k}`] || '-'}</td>)}
                      {KELAS_VIII.map(k => <td key={`8${k}`}>{item[`VIII_${k}`] || '-'}</td>)}
                      {KELAS_IX.map(k => <td key={`9${k}`}>{item[`IX_${k}`] || '-'}</td>)}
                      
                      <td style={{ fontWeight: 'bold' }}>{item.totalJam || '0'}</td>
                      <td>{item.keterangan || '-'}</td>
                      
                      {isAdmin && (
                        <td>
                          <div className={styles.actionBtns}>
                            <button className={styles.editBtn} onClick={() => openEditModal(item)} title="Edit"><i className="fas fa-edit"></i></button>
                            <button className={styles.deleteBtn} onClick={() => handleDelete(item.id)} title="Hapus"><i className="fas fa-trash"></i></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          )
        ) : (
          loadingPelajaran ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <i className="fas fa-spinner fa-spin fa-2x"></i>
              <p>Memuat jadwal kelas...</p>
            </div>
          ) : classTimetable.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p>Tidak ada jadwal untuk kelas {selectedKelas.replace('_', ' ')}.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table} style={{ minWidth: '800px' }}>
                <thead>
                  <tr style={{ background: '#1e3a5f', color: 'white' }}>
                    <th style={{ padding: '6px 4px', fontSize: '0.75rem', textAlign: 'center', width: '40px' }}>Jam Ke</th>
                    {DAYS.map(day => (
                      <th key={day} style={{ padding: '6px 4px', fontSize: '0.75rem', textAlign: 'center', width: '16%' }}>{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jamKeList.map((jam) => (
                    <tr key={jam} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ fontWeight: 'bold', background: '#f8fafc', fontSize: '0.8rem', textAlign: 'center' }}>{jam}</td>
                      {DAYS.map(day => {
                        const entry = getCellData(day, jam);
                        return (
                          <td key={`${day}-${jam}`} style={{ padding: '4px', verticalAlign: 'top', height: '50px' }}>
                            {entry ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'center', lineHeight: '1.2' }}>
                                <span style={{ fontWeight: 700, color: '#1e3a5f', fontSize: '0.7rem' }}>{entry.mataPelajaran}</span>
                                <span style={{ fontSize: '0.6rem', color: '#64748b', wordWrap: 'break-word' }}>{entry.namaGuru}</span>
                              </div>
                            ) : (
                              <span style={{ color: '#cbd5e1' }}>-</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {showModal && isAdmin && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>{formData.id ? 'Edit Jadwal Mengajar' : 'Tambah Jadwal Mengajar'}</h3>
            
            <div className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label>Kode Guru (Urutan di Excel)</label>
                <input 
                  type="text" 
                  value={formData.kodeGuru || ''} 
                  onChange={(e) => handleInputChange('kodeGuru', e.target.value)}
                  placeholder="Misal: 1"
                />
              </div>
              
              <div className={styles.inputGroup}>
                <label>Nama Guru</label>
                <input 
                  type="text" 
                  list="guru-options"
                  value={formData.namaGuru || ''} 
                  onChange={(e) => handleInputChange('namaGuru', e.target.value)}
                  placeholder="Ketik atau pilih nama guru..."
                />
                <datalist id="guru-options">
                  {guruList.map(g => (
                    <option key={g.id} value={g.nama} />
                  ))}
                </datalist>
              </div>

              <div className={styles.inputGroup}>
                <label>Status Guru</label>
                <select 
                  value={formData.statusGuru || 'GTY'} 
                  onChange={(e) => handleInputChange('statusGuru', e.target.value)}
                >
                  {STATUS_GURU.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label>Mata Pelajaran</label>
                <select 
                  value={formData.mataPelajaran || ''} 
                  onChange={(e) => handleInputChange('mataPelajaran', e.target.value)}
                >
                  <option value="" disabled>-- Pilih Mapel --</option>
                  {mapelList.map(m => (
                    <option key={m.id} value={m.namaMapel}>{m.namaMapel}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.sectionTitle}>Beban Jam Kelas VII</div>
            <div className={styles.kelasGrid}>
              {KELAS_VII.map(k => (
                <div key={k} className={styles.kelasItem}>
                  <label>{k}</label>
                  <input type="text" maxLength={2} value={formData[`VII_${k}`] || ''} onChange={(e) => handleJamChange('VII', k, e.target.value)} />
                </div>
              ))}
            </div>

            <div className={styles.sectionTitle} style={{marginTop: '16px'}}>Beban Jam Kelas VIII</div>
            <div className={styles.kelasGrid}>
              {KELAS_VIII.map(k => (
                <div key={k} className={styles.kelasItem}>
                  <label>{k}</label>
                  <input type="text" maxLength={2} value={formData[`VIII_${k}`] || ''} onChange={(e) => handleJamChange('VIII', k, e.target.value)} />
                </div>
              ))}
            </div>

            <div className={styles.sectionTitle} style={{marginTop: '16px'}}>Beban Jam Kelas IX</div>
            <div className={styles.kelasGrid}>
              {KELAS_IX.map(k => (
                <div key={k} className={styles.kelasItem}>
                  <label>{k}</label>
                  <input type="text" maxLength={2} value={formData[`IX_${k}`] || ''} onChange={(e) => handleJamChange('IX', k, e.target.value)} />
                </div>
              ))}
            </div>

            <div className={styles.formGrid} style={{ marginTop: '20px' }}>
              <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                <label>Keterangan Tambahan</label>
                <input 
                  type="text" 
                  value={formData.keterangan || ''} 
                  onChange={(e) => handleInputChange('keterangan', e.target.value)}
                  placeholder="Opsional, misal: GUSER, WAKAMAD"
                />
              </div>
            </div>

            <div className={styles.summary}>
              <span>Total Jam Keseluruhan:</span>
              <span style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>{calculateTotal()} Jam</span>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowModal(false)} disabled={saving}>Batal</button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan Jadwal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
