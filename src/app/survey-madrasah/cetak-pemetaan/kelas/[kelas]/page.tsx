'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function CetakPemetaanKelasPage() {
  const params = useParams();
  const kelas = decodeURIComponent(params.kelas as string).toUpperCase();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/survey-madrasah/pemetaan')
      .then(r => r.json())
      .then(res => {
        if (!res.success) throw new Error(res.error || 'Gagal memuat data');
        const filtered = res.data.filter((row: any) =>
          (row.kelas || '').trim().toUpperCase() === kelas
        );
        setData(filtered);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [kelas]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial, sans-serif', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: '2rem' }}>⏳</div>
      <p>Memuat data pemetaan kelas {kelas}...</p>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial, sans-serif', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: '2rem' }}>❌</div>
      <p style={{ color: 'red' }}>Error: {error}</p>
    </div>
  );

  if (data.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial, sans-serif', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: '2rem' }}>📭</div>
      <p>Belum ada data untuk kelas {kelas}</p>
      <button onClick={() => window.close()} style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: 6, border: 'none', background: '#64748b', color: 'white' }}>Tutup</button>
    </div>
  );

  const getField = (row: any, ...keys: string[]) => {
    for (const k of keys) {
      if (row[k]) return row[k];
    }
    return '-';
  };

  const buildItems = (row: any) => [
    { label: 'Anak ke-', value: row.anak_ke || '-' },
    { label: 'Saudara kandung', value: row.saudara_kandung || '-' },
    { label: 'Saudara tiri', value: row.saudara_tiri || '-' },
    { label: 'Tinggal bersama', value: row.tinggal_bersama || '-' },
    { label: 'Status Ayah', value: row.status_ayah || '-' },
    { label: 'Status Ibu', value: row.status_ibu || '-' },
    { label: 'Kondisi orangtua', value: row.kondisi_orang_tua || '-' },
    { label: 'Tinggal di', value: row.tinggal_di || '-' },
    { label: 'Perasaan di Pesantren', value: row.perasaan_di_pesantren || '-' },
    { label: 'Riwayat sakit sejak kecil', value: row.riwayat_sakit || '-' },
    { label: 'Uang saku/hari', value: row.uang_saku || '-' },
    { label: 'Pernah menjadi korban bullying', value: row.pernah_di_bully || '-' },
    { label: 'Kenyamanan di kelas', value: row.kenyamanan_di_kelas || '-' },
    { label: 'Kendala di kelas', value: row.kendala_di_kelas || '-' },
    { label: 'Menghabiskan waktu luang', value: row.menghabiskan_waktu_luang || '-' },
    { label: 'Tipe belajar', value: row.tipe_belajar || '-' },
    { label: 'Mata pelajaran disukai', value: row.mapel_disukai || '-' },
    { label: 'Mata pelajaran sulit', value: row.mapel_sulit || '-' },
    { label: 'Kendala belajar', value: row.kendala_belajar || '-' },
    { label: 'Minat / Bakat', value: row.minat_bakat || '-' },
    { label: 'Olahraga yang disukai', value: row.olahraga_disukai || '-' },
    { label: 'Lomba yang ingin diikuti', value: row.lomba_diikuti || '-' },
    { label: 'Prestasi yang pernah diraih', value: row.prestasi_diraih || '-' },
    { label: 'Kesediaan ke ruang BK', value: row.kesediaan_ke_bk || '-' },
    { label: 'Harapan untuk Guru BK', value: row.harapan_guru_bk || '-' },
    { label: 'Catatan tambahan', value: row.catatan_tambahan || '-' },
  ];

  return (
    <div className="print-container" style={{ fontFamily: 'Arial, sans-serif', background: '#f1f5f9', margin: 0, padding: 0, color: 'black' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4; margin: 8mm; }
          body { background: white !important; }
          .print-container { background: white !important; }
          .print-wrapper { padding: 0 !important; }
          .no-print { display: none !important; }
          .page-item { page-break-after: always; box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
          .page-item:last-child { page-break-after: avoid; }
        }
        table { border-collapse: collapse; width: 100%; }
        table, th, td { border: 1px solid #333; }
        th, td { padding: 3px 6px; font-size: 9pt; vertical-align: top; line-height: 1.2; }
        .page-item { background: white; max-width: 210mm; margin: 0 auto 20px; padding: 12mm 18mm; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
      `}} />

      <div className="no-print" style={{ position: 'sticky', top: 0, background: 'white', padding: '12px 20px', borderBottom: '2px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div>
          <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#1e40af' }}>📄 Pemetaan Kelas {kelas}</span>
          <span style={{ marginLeft: '12px', color: '#64748b', fontSize: '0.9rem' }}>{data.length} siswa</span>
        </div>
        <button onClick={() => window.print()} style={{ padding: '10px 22px', background: '#1d4ed8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem' }}>
          🖨️ Cetak / Save PDF
        </button>
      </div>

      <div className="print-wrapper" style={{ padding: '20px' }}>
        {data.map((row, idx) => {
          const items = buildItems(row);
          const nama = row.nama_siswa || '-';
          const kelasVal = row.kelas || '-';
          return (
            <div key={idx} className="page-item">
              <div style={{ textAlign: 'center', marginBottom: '8px', borderBottom: '2px solid #333', paddingBottom: '6px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '12pt' }}>DATA PRIBADI SISWA KELAS VII</div>
                <div style={{ fontWeight: 'bold', fontSize: '10pt', margin: '2px 0' }}>TAHUN AJARAN 2025/2026</div>
                <div style={{ fontWeight: 'bold', fontSize: '12pt' }}>MTs ALMAARIF 01 SINGOSARI</div>
              </div>

              <table style={{ border: 'none', marginBottom: '4px', fontSize: '10pt', fontWeight: 'bold' }}>
                <tbody>
                  <tr><td style={{ border: 'none', width: '80px', padding: '2px 0' }}>NAMA</td><td style={{ border: 'none', width: '12px', padding: '2px 0' }}>:</td><td style={{ border: 'none', padding: '2px 0' }}>{nama.toUpperCase()}</td></tr>
                  <tr><td style={{ border: 'none', padding: '2px 0' }}>KELAS</td><td style={{ border: 'none', padding: '2px 0' }}>:</td><td style={{ border: 'none', padding: '2px 0' }}>{kelasVal}</td></tr>
                </tbody>
              </table>

              <table style={{ marginBottom: '8px' }}>
                <thead>
                  <tr style={{ background: '#f0f4ff' }}>
                    <th style={{ width: '35px', textAlign: 'center' }}>No</th>
                    <th style={{ width: '210px' }}>Item Pernyataan</th>
                    <th>Jawaban</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                      <td style={{ textAlign: 'center' }}>{i + 1}</td>
                      <td>{item.label}</td>
                      <td>{item.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ border: '1px solid #333', padding: '8px', minHeight: '60px', fontSize: '9pt' }}>
                <strong>Catatan Wali Kelas:</strong>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}