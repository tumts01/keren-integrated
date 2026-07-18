'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Mapel.module.css';

interface Mapel {
  id: string;
  namaMapel: string;
}

export default function MataPelajaranPage() {
  const [mapelList, setMapelList] = useState<Mapel[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [namaMapelInput, setNamaMapelInput] = useState('');
  const [saving, setSaving] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem('keren_user_data');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const role = (user.rule || user.role || '').toLowerCase();
        setUserRole(role);
        if (role !== 'admin' && role !== 'pimpinan') {
          alert('Anda tidak memiliki akses ke halaman ini.');
          router.push('/');
        } else {
          fetchMapel();
        }
      } catch(e) {}
    } else {
      router.push('/');
    }
  }, []);

  const fetchMapel = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/jadwal/mapel');
      const data = await res.json();
      if (data.success) {
        setMapelList(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!namaMapelInput.trim()) return;
    setSaving(true);
    try {
      const payload = {
        action: editId ? 'edit' : 'add',
        id: editId,
        namaMapel: namaMapelInput.trim()
      };

      const res = await fetch('/api/jadwal/mapel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.success) {
        setShowModal(false);
        setNamaMapelInput('');
        setEditId(null);
        fetchMapel();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Terjadi kesalahan jaringan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus mata pelajaran "${name}"?`)) return;
    
    try {
      const res = await fetch('/api/jadwal/mapel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id })
      });
      const data = await res.json();
      if (data.success) {
        fetchMapel();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Terjadi kesalahan');
    }
  };

  const filteredMapel = mapelList.filter(m => m.namaMapel.toLowerCase().includes(searchTerm.toLowerCase()));

  if (userRole !== 'admin' && userRole !== 'pimpinan') {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Memverifikasi akses...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Data Mata Pelajaran</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Kelola referensi mata pelajaran untuk jadwal mengajar.
          </p>
        </div>
        <button 
          className={styles.addBtn}
          onClick={() => {
            setEditId(null);
            setNamaMapelInput('');
            setShowModal(true);
          }}
        >
          <i className="fas fa-plus"></i> Tambah Mapel
        </button>
      </div>

      <div className={styles.searchContainer}>
        <input 
          type="text" 
          placeholder="Cari mata pelajaran..." 
          className={styles.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className={styles.card}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fas fa-spinner fa-spin fa-2x"></i>
            <p>Memuat data...</p>
          </div>
        ) : filteredMapel.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>Belum ada data mata pelajaran.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>No</th>
                <th>Nama Mata Pelajaran</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredMapel.map((item, idx) => (
                <tr key={item.id}>
                  <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ fontWeight: 500 }}>{item.namaMapel}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div className={styles.actionBtns}>
                      <button 
                        className={styles.editBtn}
                        onClick={() => {
                          setEditId(item.id);
                          setNamaMapelInput(item.namaMapel);
                          setShowModal(true);
                        }}
                        title="Edit"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(item.id, item.namaMapel)}
                        title="Hapus"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>{editId ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}</h3>
            <div className={styles.inputGroup}>
              <label>Nama Mata Pelajaran</label>
              <input 
                type="text" 
                placeholder="Misal: BHS. INDONESIA" 
                value={namaMapelInput}
                onChange={(e) => setNamaMapelInput(e.target.value.toUpperCase())}
                autoFocus
              />
            </div>
            <div className={styles.modalActions}>
              <button 
                className={styles.cancelBtn} 
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                Batal
              </button>
              <button 
                className={styles.saveBtn} 
                onClick={handleSave}
                disabled={saving || !namaMapelInput.trim()}
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
