'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import InlineLoading from '@/components/InlineLoading';

export default function PenilaianJuriPage() {
  const router = useRouter();
  const [juriData, setJuriData] = useState<any>(null);
  const [peserta, setPeserta] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = localStorage.getItem('keren_juri_data');
    if (!data) {
      router.push('/olimpiade-seni/juri');
      return;
    }
    const parsed = JSON.parse(data);
    setJuriData(parsed);
    fetchData(parsed.id, parsed.cabang_lomba);
  }, []);

  const fetchData = async (juriId: string, cabangLomba: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/olimpiade-seni/juri/penilaian?juriId=${juriId}&cabangLomba=${encodeURIComponent(cabangLomba)}`);
      const json = await res.json();
      if (json.success) {
        setPeserta(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('keren_juri_data');
    router.push('/olimpiade-seni/juri');
  };

  const handleSimpanNilai = async (pesertaId: string, nilaiStr: string) => {
    if (nilaiStr === '') return;
    const nilai = parseFloat(nilaiStr);
    if (isNaN(nilai) || nilai < 0 || nilai > 100) {
      Swal.fire('Peringatan', 'Nilai harus antara 0 - 100', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/olimpiade-seni/juri/penilaian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ juri_id: juriData.id, peserta_id: pesertaId, nilai })
      });
      const json = await res.json();
      if (json.success) {
        // Tampilkan toast ringan tanpa menghalangi
        const Toast = Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1500,
          timerProgressBar: true,
        });
        Toast.fire({ icon: 'success', title: 'Nilai tersimpan' });
      } else {
        Swal.fire('Gagal', json.error, 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Kesalahan jaringan saat menyimpan nilai', 'error');
    }
  };

  if (!juriData) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '20px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: '0 0 5px 0', color: '#0f172a' }}>Panel Penilaian Juri</h2>
            <p style={{ margin: 0, color: '#64748b' }}>
              Selamat bertugas, <strong>{juriData.nama_juri}</strong>. Cabang Lomba: <strong style={{color: '#10b981'}}>{juriData.cabang_lomba}</strong>
            </p>
          </div>
          <button 
            onClick={handleLogout}
            style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
          >
            <i className="fas fa-sign-out-alt"></i> Keluar
          </button>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <InlineLoading message="Memuat daftar peserta..." />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#334155', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '15px' }}>No</th>
                    <th style={{ padding: '15px' }}>Nama Peserta / Tim</th>
                    <th style={{ padding: '15px' }}>Asal Sekolah</th>
                    <th style={{ padding: '15px', width: '200px' }}>Nilai Total (0-100)</th>
                  </tr>
                </thead>
                <tbody>
                  {peserta.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Belum ada peserta yang mendaftar atau lunas untuk lomba ini.</td></tr>
                  ) : (
                    peserta.map((p, idx) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '15px' }}>{idx + 1}</td>
                        <td style={{ padding: '15px', fontWeight: 500, color: '#0f172a' }}>{p.nama}</td>
                        <td style={{ padding: '15px', color: '#64748b' }}>{p.asal_sekolah || '-'}</td>
                        <td style={{ padding: '15px' }}>
                          <input 
                            type="number"
                            min="0"
                            max="100"
                            defaultValue={p.nilai !== null ? p.nilai : ''}
                            onBlur={(e) => handleSimpanNilai(p.id, e.target.value)}
                            placeholder="Input Nilai..."
                            style={{ 
                              width: '100%', padding: '8px 12px', borderRadius: '6px', 
                              border: '1px solid #cbd5e1', outline: 'none', 
                              fontWeight: 'bold', fontSize: '1rem', color: '#0ea5e9'
                            }}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
