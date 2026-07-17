'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './AddBon.module.css';

export default function AddBonPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [nama, setNama] = useState('');
  const [userRole, setUserRole] = useState<string>('');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  
  // Ambil nama user otomatis
  useEffect(() => {
    const user = localStorage.getItem('keren_user');
    if (user) setNama(user);

    const storedUser = localStorage.getItem('userApp');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUserRole(parsedUser.rule || parsedUser.role || '');
      } catch (e) {}
    }

    // Fetch users for dropdown
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/user');
        const json = await res.json();
        if (json.success && json.data) {
          const filtered = json.data.filter((u: any) => {
            const role = (u.rule || '').toLowerCase();
            return role === 'admin' || role === 'pimpinan';
          });
          setAvailableUsers(filtered);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchUsers();
  }, []);

  const [keperluan, setKeperluan] = useState('');
  const [rincian, setRincian] = useState([{ barang: '', qty: 1, satuan: 'PCS', harga: 0 }]);
  const [fileNota, setFileNota] = useState<File | null>(null);
  const [fileFoto, setFileFoto] = useState<File | null>(null);

  const fileNotaRef = useRef<HTMLInputElement>(null);
  const fileFotoRef = useRef<HTMLInputElement>(null);

  const addRow = () => {
    setRincian([...rincian, { barang: '', qty: 1, satuan: 'PCS', harga: 0 }]);
  };

  const removeRow = (idx: number) => {
    setRincian(rincian.filter((_, i) => i !== idx));
  };

  const updateRow = (idx: number, field: string, value: any) => {
    const newRincian = [...rincian];
    (newRincian[idx] as any)[field] = value;
    setRincian(newRincian);
  };

  const hitungTotal = () => {
    return rincian.reduce((total, item) => total + (item.qty * item.harga), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileNota) return alert("Mohon lengkapi lampiran foto nota!");
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('nama', nama);
      formData.append('keperluan', keperluan);
      formData.append('jumlahUang', hitungTotal().toString());
      formData.append('rincianJSON', JSON.stringify(rincian));
      formData.append('fileNota', fileNota);
      if (fileFoto) formData.append('fileFoto', fileFoto);

      const res = await fetch('/api/bon/add', {
        method: 'POST',
        body: formData
      });

      const json = await res.json();
      if (json.success) {
        alert("Nota BON berhasil diajukan!");
        router.push('/bon');
      } else {
        alert("Gagal: " + json.error);
      }
    } catch (error) {
      alert("Terjadi kesalahan koneksi.");
    } finally {
      setLoading(false);
    }
  };

  if (userRole && userRole.toLowerCase() !== 'admin' && userRole.toLowerCase() !== 'pimpinan') {
    return (
      <div className={styles.container} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <i className="fas fa-lock" style={{ fontSize: '4rem', color: '#94a3b8', marginBottom: '24px' }}></i>
        <h2 style={{ color: '#334155', marginBottom: '12px' }}>Akses Ditolak</h2>
        <p style={{ color: '#64748b', marginBottom: '24px', textAlign: 'center' }}>Maaf, halaman ini hanya dapat diakses oleh Admin atau Pimpinan.</p>
        <Link href="/" className="btn btn-primary">
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push('/bon')}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h1 className={styles.title}>Ajukan Nota BON Baru</h1>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          
          <div className={styles.formGroup}>
            <label>Nama Pemohon</label>
            <select className={styles.input} value={nama} onChange={e => setNama(e.target.value)} required>
              <option value="" disabled>Pilih Nama Pemohon</option>
              {availableUsers.map((u, i) => (
                <option key={i} value={u.nama}>{u.nama} ({u.rule})</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Tujuan / Keperluan Belanja</label>
            <input type="text" className={styles.input} value={keperluan} onChange={e => setKeperluan(e.target.value)} placeholder="Contoh: Beli ATK untuk Rapat..." required />
          </div>

          <div className={styles.rincianSection}>
            <div className={styles.rincianHeader}>
              <span>Rincian Barang</span>
              <button type="button" className="btn btn-primary" onClick={addRow} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                <i className="fas fa-plus"></i> Tambah Baris
              </button>
            </div>
            
            {rincian.map((item, idx) => (
              <div key={idx} className={styles.rincianRow}>
                <input type="text" placeholder="Nama Barang" className={styles.rincianInput} value={item.barang} onChange={e => updateRow(idx, 'barang', e.target.value)} required />
                <input type="number" placeholder="QTY" className={styles.rincianInput} value={item.qty} onChange={e => updateRow(idx, 'qty', parseInt(e.target.value))} min={1} required />
                <select className={styles.rincianInput} value={item.satuan} onChange={e => updateRow(idx, 'satuan', e.target.value)}>
                  <option value="PCS">PCS</option>
                  <option value="PACK">PACK</option>
                  <option value="RIM">RIM</option>
                  <option value="UNIT">UNIT</option>
                </select>
                <input type="number" placeholder="Harga Satuan" className={styles.rincianInput} value={item.harga} onChange={e => updateRow(idx, 'harga', parseInt(e.target.value))} min={0} required />
                
                {rincian.length > 1 ? (
                  <button type="button" className={styles.deleteRowBtn} onClick={() => removeRow(idx)}>
                    <i className="fas fa-times"></i>
                  </button>
                ) : <div style={{width: '32px'}}></div>}
              </div>
            ))}
            
            <div style={{ textAlign: 'right', marginTop: '16px', fontWeight: 700, fontSize: '1.2rem', color: 'var(--primary)' }}>
              Total: Rp {hitungTotal().toLocaleString('id-ID')}
            </div>
          </div>

          <div className={styles.fileUploadArea}>
            <div className={styles.fileBox} onClick={() => fileNotaRef.current?.click()}>
              <input type="file" ref={fileNotaRef} accept="image/*" capture="environment" onChange={e => setFileNota(e.target.files?.[0] || null)} required />
              <i className={`fas fa-receipt ${styles.fileIcon}`} style={{ color: fileNota ? 'var(--success)' : 'var(--text-muted)' }}></i>
              <div style={{ fontWeight: 600 }}>{fileNota ? 'Nota Siap Upload' : 'Foto Nota / Kwitansi'}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fileNota ? fileNota.name : 'Ketuk untuk buka Kamera HP'}</div>
            </div>

            <div className={styles.fileBox} onClick={() => fileFotoRef.current?.click()}>
              <input type="file" ref={fileFotoRef} accept="image/*" capture="environment" onChange={e => setFileFoto(e.target.files?.[0] || null)} />
              <i className={`fas fa-box-open ${styles.fileIcon}`} style={{ color: fileFoto ? 'var(--success)' : 'var(--text-muted)' }}></i>
              <div style={{ fontWeight: 600 }}>{fileFoto ? 'Foto Siap Upload' : 'Foto Barang (Opsional)'}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fileFoto ? fileFoto.name : 'Ketuk untuk buka Kamera HP'}</div>
            </div>
          </div>

          <div className={styles.submitArea}>
            <button type="submit" className="btn btn-gold" disabled={loading} style={{ padding: '12px 24px', fontSize: '1.1rem', width: '100%' }}>
              {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
              {loading ? ' Mengunggah Data ke Server...' : 'Kirim Pengajuan BON'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
