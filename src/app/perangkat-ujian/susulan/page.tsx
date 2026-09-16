'use client';
import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

interface Participant {
  nisn: string;
  noUjian: string;
  ruang: string;
  nama?: string;
  kelas?: string;
  foto?: string;
}

export default function SusulanPage() {
  const [activeTab, setActiveTab] = useState<'rekap-data' | 'input' | 'rekap-susulan'>('rekap-data');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ nisn: '', noUjian: '', ruang: '' });

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([{ NISN: '1234567890', 'NO UJIAN': '001-01', RUANG: 'Ruang 1' }]);
    XLSX.utils.book_append_sheet(wb, ws, 'Template Susulan');
    XLSX.writeFile(wb, 'Template_Susulan.xlsx');
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nisn || !formData.noUjian || !formData.ruang) {
      Swal.fire('Error', 'Semua field harus diisi', 'error');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/perangkat-ujian/peserta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nisns: [formData.nisn] })
      });
      const resData = await res.json();
      
      if (!resData.success) {
        Swal.fire('Error', resData.error || 'Gagal memuat data peserta', 'error');
      } else {
        const dbData = resData.data;
        const match = dbData[formData.nisn];
        
        const newPart = {
          nisn: formData.nisn,
          noUjian: formData.noUjian,
          ruang: formData.ruang,
          nama: match?.nama || 'TIDAK DITEMUKAN',
          kelas: match?.rombel || '-'
        };
        
        setParticipants(prev => [...prev, newPart]);
        setIsModalOpen(false);
        setFormData({ nisn: '', noUjian: '', ruang: '' });
        Swal.fire('Berhasil', 'Siswa berhasil ditambahkan', 'success');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Gagal menambahkan peserta', 'error');
    }
    setIsSubmitting(false);
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

      // Fetch names from API
      const nisns = parsed.map(p => p.nisn);
      const res = await fetch('/api/perangkat-ujian/peserta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nisns })
      });
      const resData = await res.json();

      if (!resData.success) {
        Swal.fire('Error', resData.error || 'Gagal memuat data peserta', 'error');
      } else {
        const dbData = resData.data;
        const enriched = parsed.map(p => {
          const match = dbData[p.nisn];
          return {
            ...p,
            nama: match?.nama || 'TIDAK DITEMUKAN',
            kelas: match?.rombel || '-'
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: 'white', padding: '24px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="fas fa-file-alt" style={{ color: '#3b82f6' }}></i>
          Perangkat Ujian Susulan
        </h1>
        <p style={{ color: '#64748b' }}>Kelola data perangkat ujian susulan.</p>
      </div>

      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('rekap-data')}
          style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'rekap-data' ? '3px solid #0ea5e9' : '3px solid transparent', color: activeTab === 'rekap-data' ? '#0ea5e9' : '#64748b', fontWeight: activeTab === 'rekap-data' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '15px' }}
        >
          <i className="fas fa-database" style={{ marginRight: '8px' }}></i>
          Rekap Data
        </button>
        <button
          onClick={() => setActiveTab('input')}
          style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'input' ? '3px solid #0ea5e9' : '3px solid transparent', color: activeTab === 'input' ? '#0ea5e9' : '#64748b', fontWeight: activeTab === 'input' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '15px' }}
        >
          <i className="fas fa-edit" style={{ marginRight: '8px' }}></i>
          Input
        </button>
        <button
          onClick={() => setActiveTab('rekap-susulan')}
          style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'rekap-susulan' ? '3px solid #0ea5e9' : '3px solid transparent', color: activeTab === 'rekap-susulan' ? '#0ea5e9' : '#64748b', fontWeight: activeTab === 'rekap-susulan' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '15px' }}
        >
          <i className="fas fa-list-alt" style={{ marginRight: '8px' }}></i>
          Rekap Susulan
        </button>
      </div>

      <div style={{ background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '400px' }}>
        {activeTab === 'rekap-data' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#334155', margin: 0 }}>
                Rekap Data Susulan
              </h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={downloadTemplate} style={{ padding: '8px 16px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
                  <i className="fas fa-download"></i> Template Excel
                </button>
                <button onClick={() => setIsModalOpen(true)} style={{ padding: '8px 16px', background: '#f59e0b', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: 'bold' }}>
                  <i className="fas fa-plus"></i> Tambah Data
                </button>
                <label style={{ padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: 'bold' }}>
                  <i className="fas fa-upload"></i> {loading ? 'Memproses...' : 'Import Data'}
                  <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileUpload} disabled={loading} />
                </label>
              </div>
            </div>

            {participants.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>NISN</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>Nama Siswa</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>Kelas</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>No Ujian</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>Ruang</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px' }}>{p.nisn}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#334155' }}>{p.nama}</td>
                        <td style={{ padding: '12px' }}>{p.kelas}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '4px' }}>{p.noUjian}</span>
                        </td>
                        <td style={{ padding: '12px' }}>{p.ruang}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <i className="fas fa-file-excel" style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '16px', display: 'block' }}></i>
                Belum ada data. Silakan import file Excel terlebih dahulu.
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'input' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#334155', marginBottom: '20px' }}>Input Susulan</h2>
            <p style={{ color: '#64748b' }}>Halaman ini sedang dalam tahap pengembangan.</p>
          </div>
        )}
        
        {activeTab === 'rekap-susulan' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#334155', marginBottom: '20px' }}>Rekap Susulan</h2>
            <p style={{ color: '#64748b' }}>Halaman ini sedang dalam tahap pengembangan.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.2rem', color: '#1e293b' }}>Tambah Peserta Susulan</h3>
            <form onSubmit={handleAddParticipant}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>NISN</label>
                <input type="text" value={formData.nisn} onChange={e => setFormData({...formData, nisn: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} placeholder="Masukkan NISN" required />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>No Ujian</label>
                <input type="text" value={formData.noUjian} onChange={e => setFormData({...formData, noUjian: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} placeholder="Contoh: 7-09-001" required />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Ruang</label>
                <input type="text" value={formData.ruang} onChange={e => setFormData({...formData, ruang: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} placeholder="Contoh: Ruang 01" required />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '10px 16px', background: '#3b82f6', border: 'none', borderRadius: '6px', color: 'white', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
