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
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const sessionStr = localStorage.getItem('keren_user_data');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        setIsAdmin(session.role === 'admin' || session.role === 'Admin' || session.role === 'ADMIN');
      } catch (e) {
        setIsAdmin(false);
      }
    }
  }, []);

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

  const handleValidasi = async (id: number) => {
    try {
      const res = await fetch('/api/olimpiade-seni/rekap', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'validasi' })
      });
      const json = await res.json();
      
      if (json.success) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: 'Pembayaran telah divalidasi',
          timer: 1500,
          showConfirmButton: false
        });
        fetchData();
      } else {
        Swal.fire('Error', json.error, 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', 'Gagal memvalidasi: ' + err.message, 'error');
    }
  };

  const filteredData = data.filter(item => {
    if (filterJenis === 'semua') return true;
    return item.jenis_pendaftaran === filterJenis;
  });

  // Hitung total peserta per cabang lomba
  const summaryCounts: Record<string, number> = {};
  data.forEach(row => {
    if (row.jenis_pendaftaran === 'individu') {
      const lomba = row.metadata.LOMBA_DIPILIH;
      if (lomba) {
        summaryCounts[lomba] = (summaryCounts[lomba] || 0) + 1;
      }
    } else if (row.jenis_pendaftaran === 'kolektif' && row.metadata.REKAP_PESERTA) {
      const rekap = row.metadata.REKAP_PESERTA;
      Object.keys(rekap).forEach(lomba => {
        summaryCounts[lomba] = (summaryCounts[lomba] || 0) + rekap[lomba];
      });
    }
  });

  const totalSemuaPeserta = Object.values(summaryCounts).reduce((a, b) => a + b, 0);

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

        {/* Dashboard Banner Lomba */}
        {!loading && data.length > 0 && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Ringkasan Peserta Per Cabang Lomba</span>
              <span style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 12px', borderRadius: '20px', fontSize: '0.9rem' }}>
                Total Keseluruhan: <b>{totalSemuaPeserta} Peserta</b>
              </span>
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {Object.entries(summaryCounts).sort((a, b) => b[1] - a[1]).map(([lomba, count]) => (
                <div key={lomba} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, lineHeight: 1.4 }}>{lomba}</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{count} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Peserta</span></span>
                </div>
              ))}
            </div>
          </div>
        )}

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
                    {isAdmin && <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0' }}>Lampiran</th>}
                    <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0' }}>Validasi Pembayaran</th>
                    {isAdmin && <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0', textAlign: 'right' }}>Aksi</th>}
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
                              {row.metadata.USERNAME_CBT && (
                                <div style={{ marginTop: '8px', padding: '6px', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.8rem' }}>
                                  <div style={{ color: '#0f172a', fontWeight: 600 }}>CBT Login:</div>
                                  <div style={{ color: '#0284c7' }}>User: {row.metadata.USERNAME_CBT}</div>
                                  <div style={{ color: '#0284c7' }}>Pass: {row.metadata.PASSWORD_CBT}</div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>Pendaftaran Kolektif</div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>Asal Instansi: {row.metadata.ASAL_SEKOLAH || '-'}</div>
                              {row.file_excel_url && (
                                <div style={{ marginTop: '8px' }}>
                                  <a href={row.file_excel_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: '#10b981', textDecoration: 'none', fontWeight: 600 }}>
                                    <i className="fas fa-file-excel"></i> Unduh File Excel CBT
                                  </a>
                                </div>
                              )}
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
                        {isAdmin && (
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
                        )}
                        <td style={{ padding: '16px' }}>
                          {row.metadata.STATUS_PEMBAYARAN === 'Valid' ? (
                            <span style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                              <i className="fas fa-check-circle" style={{ marginRight: '4px' }}></i> LUNAS
                            </span>
                          ) : (
                            <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                              <i className="fas fa-clock" style={{ marginRight: '4px' }}></i> MENUNGGU
                            </span>
                          )}
                        </td>
                        {isAdmin && (
                          <td style={{ padding: '16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              {row.metadata.STATUS_PEMBAYARAN !== 'Valid' && (
                                <button 
                                  onClick={() => handleValidasi(row.id)}
                                  style={{ padding: '6px 12px', borderRadius: '6px', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600 }}
                                  title="Validasi Pembayaran"
                                >
                                  <i className="fas fa-check"></i> Validasi
                                </button>
                              )}
                              <button 
                                onClick={() => handleDelete(row.id)}
                                style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#fee2e2', color: '#ef4444', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Hapus Data"
                              >
                                <i className="fas fa-trash-alt"></i>
                              </button>
                            </div>
                          </td>
                        )}
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
