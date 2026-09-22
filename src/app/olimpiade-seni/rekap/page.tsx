'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

interface OlimpiadeData {
  id: number;
  created_at: string;
  jenis_pendaftaran: string;
  bukti_pembayaran_url: string;
  file_excel_url?: string;
  metadata: any;
}

export default function RekapOlimpiadeSeni() {
  const router = useRouter();
  const [data, setData] = useState<OlimpiadeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterJenis, setFilterJenis] = useState<'semua' | 'individu' | 'kolektif'>('semua');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/olimpiade-seni/rekap');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        Swal.fire('Error', json.error, 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', 'Gagal memuat data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: number) => {
    const confirm = await Swal.fire({
      title: 'Hapus Data?',
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await fetch('/api/olimpiade-seni/rekap', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        const json = await res.json();
        
        if (json.success) {
          Swal.fire('Terhapus!', 'Data berhasil dihapus.', 'success');
          fetchData();
        } else {
          Swal.fire('Error', json.error, 'error');
        }
      } catch (err: any) {
        Swal.fire('Error', 'Gagal menghapus data: ' + err.message, 'error');
      }
    }
  };

  const filteredData = data.filter(item => {
    if (filterJenis === 'semua') return true;
    return item.jenis_pendaftaran === filterJenis;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={() => router.back()}
              style={{ width: '40px', height: '40px', borderRadius: '50%', border: 'none', background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Rekap Data Pendaftar</h1>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <select 
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value as any)}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
            >
              <option value="semua">Semua Pendaftaran</option>
              <option value="individu">Hanya Individu</option>
              <option value="kolektif">Hanya Kolektif</option>
            </select>
            <button 
              onClick={fetchData}
              style={{ padding: '8px 16px', borderRadius: '8px', background: '#e2e8f0', color: '#475569', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '16px' }}></i>
              <p>Memuat data pendaftar...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              <i className="fas fa-folder-open" style={{ fontSize: '3rem', marginBottom: '16px' }}></i>
              <p>Belum ada data pendaftar yang masuk.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#334155', textAlign: 'left' }}>
                    <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0' }}>No</th>
                    <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0' }}>Tanggal Daftar</th>
                    <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0' }}>Jenis</th>
                    <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0' }}>Identitas Pendaftar</th>
                    <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0' }}>Detail Lomba</th>
                    <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0' }}>Lampiran</th>
                    <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0', textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, index) => {
                    const isIndividu = row.jenis_pendaftaran === 'individu';
                    return (
                      <tr key={row.id} style={{ borderBottom: '1px solid #e2e8f0', background: 'white' }}>
                        <td style={{ padding: '16px', color: '#64748b' }}>{index + 1}</td>
                        <td style={{ padding: '16px' }}>
                          {new Date(row.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ 
                            padding: '4px 10px', 
                            borderRadius: '20px', 
                            fontSize: '0.75rem', 
                            fontWeight: 700,
                            background: isIndividu ? '#e0f2fe' : '#dcfce7',
                            color: isIndividu ? '#0284c7' : '#16a34a'
                          }}>
                            {row.jenis_pendaftaran.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          {isIndividu ? (
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{row.metadata.NAMA || '-'}</div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>NISN: {row.metadata.NISN || '-'}</div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Asal: {row.metadata.ASAL_SEKOLAH || '-'}</div>
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>Pendaftaran Kolektif</div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>Asal Instansi: {row.metadata.ASAL_SEKOLAH || '-'}</div>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '16px' }}>
                          {isIndividu ? (
                            <div>
                              <div style={{ color: '#0f172a' }}>{row.metadata.LOMBA_DIPILIH || '-'}</div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>Kategori: {row.metadata.KATEGORI || '-'}</div>
                              {row.metadata.NAMA_REGU && (
                                <div style={{ fontSize: '0.8rem', color: '#eab308', fontWeight: 600 }}>Grup: {row.metadata.NAMA_REGU}</div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <div style={{ color: '#0f172a' }}>{row.metadata.LOMBA_DIPILIH || '-'}</div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>Peserta via Excel</div>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {row.bukti_pembayaran_url && (
                              <a 
                                href={row.bukti_pembayaran_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#3b82f6', textDecoration: 'none', background: '#eff6ff', padding: '4px 10px', borderRadius: '6px', width: 'fit-content' }}
                              >
                                <i className="fas fa-receipt"></i> Bukti Bayar
                              </a>
                            )}
                            {row.file_excel_url && (
                              <a 
                                href={row.file_excel_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#10b981', textDecoration: 'none', background: '#ecfdf5', padding: '4px 10px', borderRadius: '6px', width: 'fit-content' }}
                              >
                                <i className="fas fa-file-excel"></i> File Excel
                              </a>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <button 
                            onClick={() => handleDelete(row.id)}
                            style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#fee2e2', color: '#ef4444', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Hapus Data"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
