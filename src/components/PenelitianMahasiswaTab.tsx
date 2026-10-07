'use client';
import { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import InlineLoading from '@/components/InlineLoading';
import styles from '@/app/jurnal-kegiatan/JurnalKegiatan.module.css';

interface Penelitian {
  id: number;
  namaMahasiswa: string[];
  universitas: string;
  jenisPenelitian: string;
  judul: string;
  target: string;
  keterangan: string;
  dokumentasi?: string;
  created_at?: string;
}

function compressImage(file: File, maxSize = 1200, quality = 0.7): Promise<Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', quality);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function getProxiedUrl(url: string) {
  if (!url) return '';
  const match = url.match(/\/d\/([\w-]+)/);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
  return url;
}

export default function PenelitianMahasiswaTab() {
  const [data, setData] = useState<Penelitian[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Detail Modal
  const [selectedDetail, setSelectedDetail] = useState<Penelitian | null>(null);

  // Upload Dokumentasi Modal
  const [uploadTarget, setUploadTarget] = useState<Penelitian | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Form state
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<{
    namaMahasiswa: string[];
    universitas: string;
    jenisPenelitian: string;
    judul: string;
    target: string;
    keterangan: string;
  }>({
    namaMahasiswa: [''],
    universitas: '',
    jenisPenelitian: '',
    judul: '',
    target: '',
    keterangan: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/penelitian-mahasiswa');
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setEditId(null);
    setForm({
      namaMahasiswa: [''],
      universitas: '',
      jenisPenelitian: '',
      judul: '',
      target: '',
      keterangan: '',
    });
  };

  const handleEdit = (item: Penelitian) => {
    setEditId(item.id);
    setForm({
      namaMahasiswa: item.namaMahasiswa || [''],
      universitas: item.universitas || '',
      jenisPenelitian: item.jenisPenelitian || '',
      judul: item.judul || '',
      target: item.target || '',
      keterangan: item.keterangan || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Hapus Data?',
      text: 'Data penelitian mahasiswa ini akan dihapus permanen.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/penelitian-mahasiswa?id=${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          Swal.fire('Terhapus!', 'Data berhasil dihapus.', 'success');
          fetchData();
        } else {
          Swal.fire('Gagal', json.error, 'error');
        }
      } catch (e: any) {
        Swal.fire('Error', e.message, 'error');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Filter out empty names
      const filteredNames = form.namaMahasiswa.map(n => n.trim()).filter(Boolean);
      if (filteredNames.length === 0) {
        Swal.fire('Peringatan', 'Minimal satu nama mahasiswa harus diisi.', 'warning');
        setSubmitting(false);
        return;
      }

      const payload = {
        ...form,
        namaMahasiswa: filteredNames
      };

      const url = '/api/penelitian-mahasiswa';
      const method = editId ? 'PUT' : 'POST';
      const body = editId ? { id: editId, ...payload } : payload;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      
      if (json.success) {
        Swal.fire('Berhasil', 'Data penelitian mahasiswa tersimpan.', 'success');
        setShowModal(false);
        resetForm();
        fetchData();
      } else {
        Swal.fire('Gagal', json.error, 'error');
      }
    } catch (e: any) {
      Swal.fire('Error', e.message, 'error');
    }
    setSubmitting(false);
  };

  // Upload Dokumentasi
  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    // Kita gunakan endpoint upload MGMP karena tujuannya sama-sama upload ke folder drive publik
    const res = await fetch('/api/jurnal-mgmp/upload', { method: 'POST', body: formData });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    return json.url;
  };

  const handleUploadDokumentasi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTarget) return;
    setUploadingDoc(true);

    try {
      if (uploadFiles.length === 0) {
        Swal.fire('Peringatan', 'Pilih minimal 1 file gambar.', 'warning');
        setUploadingDoc(false);
        return;
      }

      const uploadedUrls: string[] = [];
      for (const file of uploadFiles) {
        const url = await uploadFile(file);
        uploadedUrls.push(url);
      }

      const existingUrls = uploadTarget.dokumentasi ? uploadTarget.dokumentasi.split(' || ').filter(Boolean) : [];
      const combinedUrls = [...existingUrls, ...uploadedUrls].join(' || ');

      const res = await fetch('/api/penelitian-mahasiswa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: uploadTarget.id, dokumentasi: combinedUrls })
      });
      const json = await res.json();

      if (json.success) {
        Swal.fire('Berhasil', 'Dokumentasi berhasil ditambahkan', 'success');
        setUploadTarget(null);
        setUploadFiles([]);
        fetchData();
      } else {
        Swal.fire('Gagal', json.error, 'error');
      }
    } catch (e: any) {
      Swal.fire('Error', 'Gagal upload file: ' + e.message, 'error');
    }
    setUploadingDoc(false);
  };

  if (loading) {
    return <InlineLoading message="Memuat data penelitian mahasiswa..." />;
  }

  return (
    <div style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>
          Daftar Penelitian Mahasiswa
        </h2>
        <button 
          className="btn btn-primary"
          onClick={() => { resetForm(); setShowModal(true); }}
        >
          <i className="fas fa-plus"></i> Tambah Data
        </button>
      </div>

      <div className={styles.tableContainer} style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '50px', textAlign: 'center' }}>No</th>
              <th style={{ width: '220px' }}>Mahasiswa & Universitas</th>
              <th style={{ width: '250px' }}>Judul & Jenis</th>
              <th>Target & Ket</th>
              <th style={{ width: '150px', textAlign: 'center' }}>Dokumentasi</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>Belum ada data penelitian mahasiswa.</td></tr>
            ) : data.map((item, idx) => (
              <tr key={item.id}>
                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                <td>
                  <ul style={{ margin: 0, paddingLeft: '16px', color: '#0f172a', fontWeight: 600, fontSize: '0.9rem' }}>
                    {(item.namaMahasiswa || []).map((nm, i) => <li key={i}>{nm}</li>)}
                  </ul>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                    <i className="fas fa-university" style={{ marginRight: '4px' }}></i> {item.universitas}
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>{item.judul}</div>
                  <span style={{ display: 'inline-block', padding: '2px 8px', background: '#eff6ff', color: '#3b82f6', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, marginTop: '6px' }}>
                    {item.jenisPenelitian}
                  </span>
                </td>
                <td>
                  <div style={{ fontSize: '0.85rem' }}><strong>Target:</strong> {item.target || '-'}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}><strong>Ket:</strong> {item.keterangan || '-'}</div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  {item.dokumentasi ? (
                    <button 
                      onClick={() => setSelectedDetail(item)}
                      style={{ padding: '6px 12px', background: '#f0fdf4', color: '#10b981', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 auto' }}
                    >
                      <i className="fas fa-images"></i> {item.dokumentasi.split(' || ').filter(Boolean).length} Foto
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Belum ada</span>
                  )}
                  <button 
                    onClick={() => { setUploadTarget(item); setUploadFiles([]); }}
                    style={{ marginTop: '8px', padding: '4px 8px', background: 'white', color: '#3b82f6', border: '1px dashed #93c5fd', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', margin: '8px auto 0' }}
                  >
                    <i className="fas fa-upload"></i> Upload
                  </button>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button onClick={() => handleEdit(item)} style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#f8fafc', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Edit">
                      <i className="fas fa-edit"></i>
                    </button>
                    <button onClick={() => handleDelete(item.id)} style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#fcf8f8', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Hapus">
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: '#1e293b' }}>
                <i className="fas fa-user-graduate" style={{ marginRight: '8px', color: '#3b82f6' }}></i>
                {editId ? 'Edit Data Penelitian' : 'Tambah Data Penelitian'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', color: '#94a3b8', cursor: 'pointer' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Nama Mahasiswa</label>
                {form.namaMahasiswa.map((nama, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      required
                      placeholder={`Nama Mahasiswa ${i + 1}`}
                      value={nama}
                      onChange={e => {
                        const newArr = [...form.namaMahasiswa];
                        newArr[i] = e.target.value;
                        setForm({ ...form, namaMahasiswa: newArr });
                      }}
                      style={{ flex: 1, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
                    />
                    {form.namaMahasiswa.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => {
                          const newArr = form.namaMahasiswa.filter((_, idx) => idx !== i);
                          setForm({ ...form, namaMahasiswa: newArr });
                        }}
                        style={{ padding: '0 12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                      >
                        <i className="fas fa-minus"></i>
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  type="button" 
                  onClick={() => setForm({ ...form, namaMahasiswa: [...form.namaMahasiswa, ''] })}
                  style={{ padding: '6px 12px', background: '#f0fdf4', color: '#16a34a', border: '1px dashed #86efac', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className="fas fa-plus"></i> Tambah Baris Nama
                </button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Asal Universitas / Institusi</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Universitas Brawijaya"
                  value={form.universitas}
                  onChange={e => setForm({ ...form, universitas: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Jenis Penelitian</label>
                  <input
                    type="text"
                    required
                    placeholder="Skripsi / PKL / Observasi"
                    value={form.jenisPenelitian}
                    onChange={e => setForm({ ...form, jenisPenelitian: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Target Penelitian</label>
                  <input
                    type="text"
                    required
                    placeholder="Misal: Siswa Kelas 8A"
                    value={form.target}
                    onChange={e => setForm({ ...form, target: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Judul Penelitian</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Tuliskan judul penelitian lengkap..."
                  value={form.judul}
                  onChange={e => setForm({ ...form, judul: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Keterangan Tambahan</label>
                <textarea
                  rows={2}
                  placeholder="Opsional..."
                  value={form.keterangan}
                  onChange={e => setForm({ ...form, keterangan: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Batal</button>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ minWidth: '120px' }}>
                  {submitting ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-save"></i> Simpan</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {uploadTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0, color: '#1e293b' }}>
                <i className="fas fa-upload" style={{ marginRight: '8px', color: '#3b82f6' }}></i>
                Upload Dokumentasi
              </h2>
              <button onClick={() => setUploadTarget(null)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', color: '#94a3b8', cursor: 'pointer' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <form onSubmit={handleUploadDokumentasi}>
              <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '16px' }}>
                Upload foto kegiatan penelitian untuk <strong>{uploadTarget.namaMahasiswa[0]} {uploadTarget.namaMahasiswa.length > 1 ? `dkk` : ''}</strong>
              </p>

              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', border: '2px dashed #cbd5e1', borderRadius: '12px', cursor: 'pointer', background: '#f8fafc', marginBottom: '16px' }}>
                <i className="fas fa-images" style={{ fontSize: '2rem', color: '#94a3b8', marginBottom: '12px' }}></i>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>Pilih File Foto</span>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Bisa pilih lebih dari satu</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  style={{ display: 'none' }} 
                  onChange={async e => {
                    if (e.target.files && e.target.files.length > 0) {
                      const files = Array.from(e.target.files);
                      const compressed = await Promise.all(files.map(f => compressImage(f)));
                      const compressedFiles = compressed.map((b, i) => new File([b], files[i].name, { type: 'image/jpeg' }));
                      setUploadFiles(prev => [...prev, ...compressedFiles]);
                    }
                  }} 
                />
              </label>

              {uploadFiles.length > 0 && (
                <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#16a34a', marginBottom: '8px' }}>
                    ✅ {uploadFiles.length} foto siap diupload:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', color: '#475569' }}>
                    {uploadFiles.map((f, i) => <li key={i}>{f.name}</li>)}
                  </ul>
                  <button type="button" onClick={() => setUploadFiles([])} style={{ marginTop: '12px', padding: '4px 8px', color: '#ef4444', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                    Hapus Semua
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setUploadTarget(null)} className="btn btn-secondary">Batal</button>
                <button type="submit" disabled={uploadingDoc || uploadFiles.length === 0} className="btn btn-primary" style={{ minWidth: '120px' }}>
                  {uploadingDoc ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-cloud-upload-alt"></i> Upload</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gallery Modal */}
      {selectedDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: '#1e293b' }}>
                <i className="fas fa-images" style={{ marginRight: '8px', color: '#10b981' }}></i>
                Galeri Dokumentasi
              </h2>
              <button onClick={() => setSelectedDetail(null)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', color: '#94a3b8', cursor: 'pointer' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {selectedDetail.dokumentasi?.split(' || ').filter(Boolean).map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={getProxiedUrl(url)}
                    alt={`Dokumentasi ${i + 1}`}
                    style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
                  />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
