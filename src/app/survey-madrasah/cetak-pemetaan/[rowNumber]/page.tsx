import { getEVotingDoc } from '@/lib/google-sheets';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CetakPemetaanPage({ params }: { params: { rowNumber: string } }) {
  const rowNumber = parseInt(params.rowNumber);
  
  if (isNaN(rowNumber)) {
    notFound();
  }

  const doc = await getEVotingDoc();
  const sheet = doc.sheetsByTitle['LATAR BELAKANG'];
  
  if (!sheet) {
    return <div>Sheet LATAR BELAKANG tidak ditemukan</div>;
  }

  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();
  
  const row = rows.find(r => r.rowNumber === rowNumber);

  if (!row) {
    return <div>Data tidak ditemukan untuk baris {rowNumber}</div>;
  }

  const data = {
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
  };

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      maxWidth: '210mm',
      margin: '0 auto',
      background: 'white',
      padding: '20mm',
      color: 'black',
      minHeight: '297mm',
      boxSizing: 'border-box'
    }}>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .print-container { padding: 15mm !important; }
        }
        table, th, td {
          border: 1px solid black;
          border-collapse: collapse;
        }
        th, td {
          padding: 8px 12px;
          font-size: 11pt;
        }
      `}} />

      <div className="no-print" style={{ marginBottom: '20px', textAlign: 'right' }}>
        <button onClick={() => window.print()} style={{
          padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
        }}>
          <i className="fas fa-print"></i> Cetak Sekarang
        </button>
      </div>

      <div className="print-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '30px' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '70px', height: '70px', marginRight: '20px' }} />
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '14pt', fontWeight: 'bold' }}>DATA PRIBADI SISWA KELAS VII</h2>
            <h3 style={{ margin: '4px 0', fontSize: '12pt', fontWeight: 'bold' }}>TH. AJARAN 2025/2026</h3>
            <h3 style={{ margin: 0, fontSize: '14pt', fontWeight: 'bold' }}>MTs ALMAARIF 01 SINGOSARI</h3>
          </div>
          <div style={{ width: '70px' }}></div>
        </div>

        <div style={{ marginBottom: '20px' }}>
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

        <table style={{ width: '100%', marginBottom: '30px' }}>
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>No</th>
              <th style={{ width: '250px', textAlign: 'center' }}>Item Pernyataan</th>
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

        <div style={{ border: '1px solid black', padding: '15px', minHeight: '150px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Catatan Wali Kelas:</div>
          <div></div>
        </div>
      </div>
    </div>
  );
}