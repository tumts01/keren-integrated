'use client';
import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';

interface Participant {
  nisn: string;
  noUjian: string;
  ruang: string;
  nama?: string;
  foto?: string;
}

function getDriveDirectLink(url?: string) {
  if (!url) return 'https://via.placeholder.com/150';
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return 'https://drive.google.com/uc?export=view&id=' + match[1];
  }
  return url;
}

export default function PerangkatUjianPage() {
  const [activeTab, setActiveTab] = useState<'nopes' | 'nobang'>('nopes');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([{ NISN: '1234567890', 'NO UJIAN': '001-01', RUANG: 'Ruang 1' }]);
    XLSX.utils.book_append_sheet(wb, ws, 'Template Nopes');
    XLSX.writeFile(wb, 'Template_Import_Nopes.xlsx');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

      if (rows.length === 0) {
        Swal.fire('Error', 'File Excel kosong', 'error');
        setLoading(false);
        return;
      }

      const parsed: Participant[] = rows.map(r => ({
        nisn: String(r['NISN'] || ''),
        noUjian: String(r['NO UJIAN'] || ''),
        ruang: String(r['RUANG'] || '')
      })).filter(p => p.nisn);

      const pageSize = 1000;
      const pages = [0, 1, 2, 3];
      const results = await Promise.all(
        pages.map(page => 
          supabase
            .from('data_induk')
            .select('metadata')
            .range(page * pageSize, (page + 1) * pageSize - 1)
        )
      );

      let hasError = false;
      let dbData: Record<string, any>[] = [];
      
      for (const res of results) {
        if (res.error) hasError = true;
        if (res.data) dbData = [...dbData, ...res.data];
      }
      
      if (hasError) {
        Swal.fire('Error', 'Gagal memuat sebagian atau seluruh data dari Supabase', 'error');
      } else {
        const enriched = parsed.map(p => {
          const match = dbData.find(d => String(d.metadata?.['NISN']) === p.nisn);
          return {
            ...p,
            nama: match?.metadata?.['NAMA'] || 'TIDAK DITEMUKAN',
            foto: match?.metadata?.['LINK FOTO TERBARU'] || match?.metadata?.['LINK URL FOTO 1'] || ''
          };
        });
        setParticipants(enriched);
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Gagal membaca file Excel', 'error');
    }
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePrint = () => {
    if (participants.length === 0) {
      Swal.fire('Oops', 'Data peserta masih kosong!', 'warning');
      return;
    }
    window.print();
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <style>{`
          @media screen {
            .print-area {
              display: none;
            }
          }
          @media print {
            body * {
              visibility: hidden;
            }
            .print-area, .print-area * {
              visibility: visible;
            }
            .print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white;
            }
            @page {
              size: A4 portrait;
              margin: 0.5cm;
            }
            .nopes-grid {
              display: flex;
              flex-wrap: wrap;
              gap: 0;
              justify-content: flex-start;
              align-content: flex-start;
            }
            .nopes-card {
              page-break-inside: avoid;
              width: 5.58cm;
              height: 9.5cm;
              position: relative;
              box-sizing: border-box;
            }
            .nopes-bg {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              z-index: -1;
              object-fit: cover;
            }
            .nopes-photo {
              position: absolute;
              top: 32%;
              left: 50%;
              transform: translateX(-50%);
              width: 2.8cm;
              height: 3.5cm;
              object-fit: cover;
              border-radius: 4px;
            }
            .nopes-name {
              position: absolute;
              top: 69.5%;
              left: 10%;
              width: 80%;
              text-align: center;
              font-size: 9px;
              font-weight: bold;
              color: #000;
              text-transform: uppercase;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .nopes-detail {
              position: absolute;
              top: 81%;
              left: 10%;
              width: 80%;
              text-align: center;
              font-size: 10px;
              font-weight: bold;
              color: #000;
            }
          }
        `}</style>

      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>
          Perangkat Ujian
        </h1>
        <p style={{ color: '#64748b' }}>
          Generate Nomor Peserta (Nopes) dan Nomor Bangku (Nobang) untuk Ujian.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveTab('nopes')}
          style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'nopes' ? '3px solid #0ea5e9' : '3px solid transparent', color: activeTab === 'nopes' ? '#0ea5e9' : '#64748b', fontWeight: activeTab === 'nopes' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '15px' }}
        >
          <i className="fas fa-id-badge" style={{ marginRight: '8px' }}></i>
          Generate Nopes
        </button>
        <button 
          onClick={() => setActiveTab('nobang')}
          style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'nobang' ? '3px solid #0ea5e9' : '3px solid transparent', color: activeTab === 'nobang' ? '#0ea5e9' : '#64748b', fontWeight: activeTab === 'nobang' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '15px' }}
        >
          <i className="fas fa-chair" style={{ marginRight: '8px' }}></i>
          Generate Nobang
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '400px' }}>
        {activeTab === 'nopes' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#334155', margin: 0 }}>
                Daftar Nomor Peserta
              </h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={downloadTemplate} style={{ padding: '8px 16px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
                  <i className="fas fa-download"></i> Template Excel
                </button>
                <label style={{ padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: 'bold' }}>
                  <i className="fas fa-upload"></i> {loading ? 'Memproses...' : 'Import Data'}
                  <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileUpload} disabled={loading} />
                </label>
                {participants.length > 0 && (
                  <button onClick={handlePrint} style={{ padding: '8px 16px', background: '#10b981', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: 'bold' }}>
                    <i className="fas fa-print"></i> Cetak {participants.length} Kartu
                  </button>
                )}
              </div>
            </div>

            {participants.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>NISN</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>Nama Siswa</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>No Ujian</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>Ruang</th>
                      <th style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>Foto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px' }}>{p.nisn}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{p.nama}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '4px' }}>{p.noUjian}</span>
                        </td>
                        <td style={{ padding: '12px' }}>{p.ruang}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {p.foto ? (
                            <img src={getDriveDirectLink(p.foto)} alt="foto" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '50%', border: '2px solid #e2e8f0' }} />
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '12px' }}>Kosong</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <i className="fas fa-file-excel" style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '16px', display: 'block' }}></i>
                Belum ada data peserta. Silakan import file Excel terlebih dahulu.
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'nobang' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#334155' }}>
              Generate Nomor Bangku (Nobang)
            </h2>
            <p style={{ color: '#64748b' }}>Fitur untuk cetak Nobang akan ditambahkan di sini.</p>
          </div>
        )}
      </div>

      {/* Print Area (Hidden in UI) */}
      <div className="print-area">
        <div className="nopes-grid">
          {participants.map((p, idx) => (
            <div key={idx} className="nopes-card">
              <img src="/nopes sts ganjil.png" alt="Template" className="nopes-bg" />
              <img src={getDriveDirectLink(p.foto)} alt="Foto" className="nopes-photo" />
              <div className="nopes-name">{p.nama}</div>
              <div className="nopes-detail">{p.noUjian} | {p.ruang}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
