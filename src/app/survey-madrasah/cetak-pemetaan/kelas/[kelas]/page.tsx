import { getEVotingDoc } from '@/lib/google-sheets';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CetakPemetaanKelasPage({ params }: { params: { kelas: string } }) {
  const targetKelas = decodeURIComponent(params.kelas).toUpperCase();
  
  if (!targetKelas) {
    notFound();
  }

  const doc = await getEVotingDoc();
  const sheet = doc.sheetsByTitle['LATAR BELAKANG'];
  
  if (!sheet) {
    return <div>Sheet LATAR BELAKANG tidak ditemukan</div>;
  }

  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();
  
  // Filter by class (checking multiple possible column names for class)
  const classRows = rows.filter(r => {
    const k = (r.get('Kelas') || r.get('Kelas Saat Ini') || '').trim().toUpperCase();
    return k === targetKelas;
  });

  if (classRows.length === 0) {
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif', textAlign: 'center' }}>
        <h2>Belum ada data untuk kelas {targetKelas}</h2>
        <button onClick={() => window.close()} style={{ padding: '10px 20px', cursor: 'pointer' }}>Tutup</button>
      </div>
    );
  }

  const allData = classRows.map(row => ({
    nama: row.get('Nama Lengkap Anak') || row.get('Nama Lengkap Siswa') || row.get('Nama') || '-',
    kelas: row.get('Kelas') || row.get('Kelas Saat Ini') || '-',
    items: [
      { label: 'Anak ke-', value: row.get('Anak ke-') || '-' },
      { label: 'Saudara kandung', value: row.get('Saudara kandung') || '-' },
      { label: 'Saudara tiri', value: row.get('Saudara tiri') || '-' },
      { label: 'Tinggal bersama', value: row.get('Tinggal bersama') || '-' },
      { label: 'Status Ayah', value: row.get('Status Ayah') || '-' },
      { label: 'Status Ibu', value: row.get('Status Ibu') || '-' },
      { label: 'Kondisi orangtua', value: row.get('Kondisi Orangtua') || row.get('Kondisi orangtua') || '-' },
      { label: 'Tinggal di', value: row.get('Alamat Lengkap') || row.get('Tinggal di') || '-' },
      { label: 'Perasaan di pesantren', value: row.get('Perasaan saat ini tentang belajar di MTs / Pesantren') || '-' },
      { label: 'Riwayat sakit sejak kecil', value: row.get('Penyakit kronis / menular / riwayat sakit khusus sejak kecil') || '-' },
      { label: 'Uang saku/hari', value: row.get('Rata-rata Uang saku/hari') || '-' },
      { label: 'Pernah menjadi korban bullying', value: row.get('Pernah menjadi korban bullying/perundungan? Jika YA pada saat dijenjang apa?') || '-' },
      { label: 'Kenyamanan di kelas', value: row.get('Kenyamanan berada di lingkungan kelas / sekolah saat ini') || '-' },
      { label: 'Kendala di kelas', value: row.get('Kendala apa saja yang dialami selama disekolah saat ini') || '-' },
      { label: 'Menghabiskan waktu luang', value: row.get('Bagaimana Anda menghabiskan waktu luang') || '-' },
      { label: 'Lomba yang ingin diikuti', value: row.get('Lomba/kompetisi akademik maupun non akademik yang ingin diikuti') || '-' },
      { label: 'Cara belajar', value: (row.get('Cara belajar yang diinginkan/menyenangkan') || '') + ' ' + (row.get('Tipe Belajar') ? `(${row.get('Tipe Belajar')})` : '') },
      { label: 'Catatan tambahan', value: row.get('Catatan Tambahan') || row.get('Catatan tambahan') || '-' },
    ]
  }));

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      background: '#f1f5f9',
      margin: 0,
      padding: 0,
      color: 'black',
      boxSizing: 'border-box',
      minHeight: '100vh'
    }}>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .page-break { page-break-after: always; margin-bottom: 0 !important; border: none !important; padding: 15mm !important; }
          .page-break:last-child { page-break-after: avoid; }
        }
        table, th, td {
          border: 1px solid black;
          border-collapse: collapse;
        }
        th, td {
          padding: 6px 10px;
          font-size: 10.5pt;
        }
        .page-break {
          background: white;
          max-width: 210mm;
          margin: 0 auto 20px auto;
          padding: 20mm;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
      `}} />

      <div className="no-print" style={{ position: 'sticky', top: 0, background: 'white', padding: '15px 20px', borderBottom: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#334155' }}>Pemetaan Kelas {targetKelas}</h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>Total: {allData.length} siswa</p>
        </div>
        <button onClick={() => window.print()} style={{
          padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <i className="fas fa-print"></i> Cetak PDF
        </button>
      </div>

      <div style={{ padding: '20px' }} className="print-padding-zero">
        {allData.map((data, idx) => (
          <div key={idx} className="page-break">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '25px' }}>
              <img src="/logo.png" alt="Logo" style={{ width: '65px', height: '65px', marginRight: '20px' }} />
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '13pt', fontWeight: 'bold' }}>DATA PRIBADI SISWA KELAS VII</h2>
                <h3 style={{ margin: '4px 0', fontSize: '11pt', fontWeight: 'bold' }}>TH. AJARAN 2025/2026</h3>
                <h3 style={{ margin: 0, fontSize: '13pt', fontWeight: 'bold' }}>MTs ALMAARIF 01 SINGOSARI</h3>
              </div>
              <div style={{ width: '65px' }}></div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <table style={{ border: 'none', width: '100%', fontSize: '11pt', fontWeight: 'bold' }}>
                <tbody>
                  <tr>
                    <td style={{ border: 'none', padding: '4px 0', width: '80px' }}>NAMA</td>
                    <td style={{ border: 'none', padding: '4px 0', width: '20px' }}>:</td>
                    <td style={{ border: 'none', padding: '4px 0' }}>{data.nama.toUpperCase()}</td>
                  </tr>
                  <tr>
                    <td style={{ border: 'none', padding: '4px 0' }}>KELAS</td>
                    <td style={{ border: 'none', padding: '4px 0' }}>:</td>
                    <td style={{ border: 'none', padding: '4px 0' }}>{data.kelas}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <table style={{ width: '100%', marginBottom: '20px' }}>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>No</th>
                  <th style={{ width: '230px', textAlign: 'center' }}>Item Pernyataan</th>
                  <th style={{ textAlign: 'center' }}>Jawaban</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr key={index}>
                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                    <td>{item.label}</td>
                    <td>{item.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ border: '1px solid black', padding: '15px', minHeight: '120px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Catatan Wali Kelas:</div>
              <div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}