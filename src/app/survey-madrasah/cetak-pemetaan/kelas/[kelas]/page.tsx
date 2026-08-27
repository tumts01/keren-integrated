import { getEVotingDoc } from '@/lib/google-sheets';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CetakPemetaanKelasPage({ params }: { params: Promise<{ kelas: string }> }) {
  const resolvedParams = await params;
  const targetKelas = decodeURIComponent(resolvedParams.kelas).toUpperCase();
  
  if (!targetKelas) { notFound(); }

  const doc = await getEVotingDoc();
  const sheet = doc.sheetsByTitle['LATAR BELAKANG'];
  if (!sheet) return <div>Sheet LATAR BELAKANG tidak ditemukan</div>;

  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();
  
  // Safe getter - returns empty string if header not found
  const g = (row: any, key: string) => {
    try { return row.get(key) || ''; } catch(e) { return ''; }
  };

  const classRows = rows.filter(r => g(r, 'Kelas').trim().toUpperCase() === targetKelas);

  if (classRows.length === 0) {
    return (
      <div style={{ padding: '40px', fontFamily: 'sans-serif', textAlign: 'center' }}>
        <h2>Belum ada data untuk kelas {targetKelas}</h2>
        <a href="/survey-madrasah" style={{ padding: '10px 20px', background: '#2563eb', color: 'white', borderRadius: '6px', textDecoration: 'none' }}>Kembali</a>
      </div>
    );
  }

  const allData = classRows.map(row => ({
    nama: g(row, 'Nama Siswa') || '-',
    kelas: g(row, 'Kelas') || '-',
    items: [
      { label: 'Anak ke-', value: g(row, 'Anak ke-') || '-' },
      { label: 'Saudara kandung', value: g(row, 'Saudara Kandung') || '-' },
      { label: 'Saudara tiri', value: g(row, 'Saudara tiri') || '-' },
      { label: 'Tinggal bersama', value: g(row, 'Tinggal Bersama') || '-' },
      { label: 'Status Ayah', value: g(row, 'Status Ayah') || '-' },
      { label: 'Status Ibu', value: g(row, 'Status Ibu') || '-' },
      { label: 'Kondisi orangtua', value: g(row, 'Kondisi Orang Tua') || '-' },
      { label: 'Tinggal di', value: g(row, 'Tinggal di') || '-' },
      { label: 'Perasaan di Pesantren', value: g(row, 'Perasaan di Pesantren') || '-' },
      { label: 'Riwayat sakit sejak kecil', value: g(row, 'Riwayat Sakit') || '-' },
      { label: 'Uang saku/hari', value: g(row, 'Uang Saku per-Hari') || '-' },
      { label: 'Pernah menjadi korban bullying', value: g(row, 'Pernah menjadi korban bullying') || '-' },
      { label: 'Kenyamanan di kelas', value: g(row, 'Kenyamanan di kelas') || '-' },
      { label: 'Kendala di kelas', value: g(row, 'Kendala di kelas') || '-' },
      { label: 'Menghabiskan waktu luang', value: g(row, 'Menghabiskan waktu luang') || '-' },
      { label: 'Tipe belajar', value: g(row, 'Tipe Belajar') || '-' },
      { label: 'Mata pelajaran disukai', value: g(row, 'Mata pelajaran yang paling disukai') || '-' },
      { label: 'Mata pelajaran sulit', value: g(row, 'Mata pelajaran yang paling sulit') || '-' },
      { label: 'Kendala belajar', value: g(row, 'Kendala belajar') || '-' },
      { label: 'Minat / Bakat', value: g(row, 'Minat / Bakat') || '-' },
      { label: 'Olahraga yang disukai', value: g(row, 'Bidang olahraga yang disukai') || '-' },
      { label: 'Lomba yang ingin diikuti', value: g(row, 'Lomba yang ingin diikuti') || '-' },
      { label: 'Prestasi yang pernah diraih', value: g(row, 'Prestasi yang pernah diraih') || '-' },
      { label: 'Kesediaan ke ruang BK', value: g(row, 'Kesediaan datang ke ruang BK') || '-' },
      { label: 'Harapan untuk Guru BK', value: g(row, 'Harapan untuk Guru BK') || '-' },
      { label: 'Catatan tambahan', value: g(row, 'Catatan Tambahan') || '-' },
    ]
  }));

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', background: '#f1f5f9', margin: 0, padding: 0, color: 'black' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4; margin: 15mm; }
          body { background: white; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .page-item { page-break-after: always; box-shadow: none !important; }
          .page-item:last-child { page-break-after: avoid; }
        }
        table { border-collapse: collapse; width: 100%; }
        table, th, td { border: 1px solid #333; }
        th, td { padding: 5px 9px; font-size: 10pt; vertical-align: top; }
        .page-item { background: white; max-width: 210mm; margin: 0 auto 20px; padding: 15mm 20mm; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
      `}} />

      <div className="no-print" style={{ position: 'sticky', top: 0, background: 'white', padding: '12px 20px', borderBottom: '2px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100, boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
        <div>
          <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#1e40af' }}>📄 Pemetaan Kelas {targetKelas}</span>
          <span style={{ marginLeft: '12px', color: '#64748b', fontSize: '0.9rem' }}>{allData.length} siswa</span>
        </div>
        <button onClick={() => window.print()} style={{ padding: '10px 22px', background: '#1d4ed8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem' }}>
          🖨️ Cetak / Save PDF
        </button>
      </div>

      <div style={{ padding: '20px' }}>
        {allData.map((data, idx) => (
          <div key={idx} className="page-item">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', gap: '18px' }}>
              <img src="/logo.png" alt="Logo" style={{ width: '60px', height: '60px', flexShrink: 0 }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', fontSize: '12pt' }}>DATA PRIBADI SISWA KELAS VII</div>
                <div style={{ fontWeight: 'bold', fontSize: '11pt', margin: '3px 0' }}>TH. AJARAN 2025/2026</div>
                <div style={{ fontWeight: 'bold', fontSize: '12pt' }}>MTs ALMAARIF 01 SINGOSARI</div>
              </div>
              <div style={{ width: '60px' }}></div>
            </div>

            <table style={{ border: 'none', marginBottom: '12px', fontSize: '11pt', fontWeight: 'bold' }}>
              <tbody>
                <tr>
                  <td style={{ border: 'none', width: '80px', padding: '3px 0' }}>NAMA</td>
                  <td style={{ border: 'none', width: '15px', padding: '3px 0' }}>:</td>
                  <td style={{ border: 'none', padding: '3px 0' }}>{data.nama.toUpperCase()}</td>
                </tr>
                <tr>
                  <td style={{ border: 'none', padding: '3px 0' }}>KELAS</td>
                  <td style={{ border: 'none', padding: '3px 0' }}>:</td>
                  <td style={{ border: 'none', padding: '3px 0' }}>{data.kelas}</td>
                </tr>
              </tbody>
            </table>

            <table style={{ marginBottom: '18px' }}>
              <thead>
                <tr style={{ background: '#f0f4ff' }}>
                  <th style={{ width: '35px', textAlign: 'center' }}>No</th>
                  <th style={{ width: '220px' }}>Item Pernyataan</th>
                  <th>Jawaban</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                    <td style={{ textAlign: 'center' }}>{i + 1}</td>
                    <td>{item.label}</td>
                    <td>{item.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ border: '1px solid #333', padding: '12px', minHeight: '100px' }}>
              <strong>Catatan Wali Kelas:</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}