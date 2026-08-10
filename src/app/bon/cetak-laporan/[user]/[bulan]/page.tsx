'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import styles from '../../../cetak/[id]/Cetak.module.css';

const formatRp = (n: any) => {
  if (!n && n !== 0) return 'Rp 0';
  return 'Rp ' + Number(n).toLocaleString('id-ID');
};

const bulanIndo = (yyyy_mm: string) => {
  if (!yyyy_mm) return '';
  const [y, m] = yyyy_mm.split('-');
  const b = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return `${b[parseInt(m,10)-1]} ${y}`;
};

export default function CetakLaporanKeuanganPage() {
  const params = useParams();
  const user = decodeURIComponent(params.user as string);
  const bulan = params.bulan as string; // format YYYY-MM
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const inIframe = typeof window !== 'undefined' && window !== window.parent;

  useEffect(() => {
    fetch(`/api/bon`)
      .then(r => r.json())
      .then(j => { setData(j.data || []); setLoading(false); });
  }, []);

  useEffect(() => {
    if (data.length > 0 && !loading && !inIframe) {
      setTimeout(() => window.print(), 500);
    }
  }, [data, loading]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#237227' }}></i>
      <p>Memuat laporan keuangan...</p>
    </div>
  );

  let arrPemasukan: { uraian: string, jumlah: number }[] = [];
  let arrPengeluaran: { uraian: string, jumlah: number }[] = [];
  let totalPemasukan = 0;
  let totalPengeluaran = 0;
  let jabatanUser = '';
  
  const sortedData = [...data].reverse();
  
  let currentSaldo = 0; // running saldo lintas semua bulan

  sortedData.filter(d => (d.Nama || d.nama || '').trim() === user).forEach(bon => {
    const isTargetMonth = (bon.Tanggal || '').startsWith(bulan);
    if (!jabatanUser && bon.Jabatan) jabatanUser = bon.Jabatan;

    const noBon = bon.NoBon || bon.ID || '';
    const isSaldoEntry = noBon.toUpperCase().startsWith('SALDO') || noBon === '';
    const requested = parseFloat(bon.JumlahDiminta || '0');
    const saldoDipakai = parseFloat(bon.SaldoTerpakai || '0');
    const isSaldoOnly = requested <= saldoDipakai && saldoDipakai > 0;

    // Running saldo: hitung untuk semua bulan (bukan hanya target bulan)
    let penerimaanKas = 0;
    if (!isSaldoOnly && requested > 0) {
      penerimaanKas = Math.max(0, requested - saldoDipakai);
      currentSaldo += penerimaanKas;
    }

    // Rincian pengeluaran untuk running saldo
    let rincian: any[] = [];
    try {
      if (bon.RealisasiRincianJSON) rincian = JSON.parse(bon.RealisasiRincianJSON);
      else if (bon.RincianJSON) rincian = JSON.parse(bon.RincianJSON);
    } catch(e){}

    rincian.forEach((r: any) => {
      const qty = Number(r.qty) || 0;
      const harga = Number(r.harga) || 0;
      const out = qty * harga;
      if (out > 0) currentSaldo -= out;
    });

    // Kumpulkan data hanya untuk bulan target (ditampilkan di tabel)
    if (isTargetMonth) {
      if (penerimaanKas > 0 && !isSaldoEntry) {
        arrPemasukan.push({
          uraian: noBon || bon.Keperluan || '',
          jumlah: penerimaanKas
        });
        totalPemasukan += penerimaanKas;
      }
      rincian.forEach((r: any) => {
        const qty = Number(r.qty) || 0;
        const harga = Number(r.harga) || 0;
        const out = qty * harga;
        if (out > 0) {
          arrPengeluaran.push({ uraian: r.barang, jumlah: out });
          totalPengeluaran += out;
        }
      });
    }
  });

  // Saldo debet = saldo akhir running (akumulasi semua bulan s.d. bulan ini)
  const saldoDebet = currentSaldo > 0 ? currentSaldo : 0;

  
  const rows = [];
  const maxRows = Math.max(arrPemasukan.length, arrPengeluaran.length + (saldoDebet > 0 ? 1 : 0));
  for (let i = 0; i < maxRows; i++) {
    const pem = arrPemasukan[i];
    
    let pengUraian = '';
    let pengJumlah: number | null = null;
    let pengNo = '';
    let isSaldoRow = false;
    
    if (i < arrPengeluaran.length) {
      pengNo = (i + 1).toString();
      pengUraian = arrPengeluaran[i].uraian;
      pengJumlah = arrPengeluaran[i].jumlah;
    } else if (i === arrPengeluaran.length && saldoDebet > 0) {
      pengUraian = 'Saldo Debet';
      pengJumlah = saldoDebet;
      isSaldoRow = true;
    }

    // Menghasilkan minimum 10 baris agar tabel tidak terlalu pendek
    rows.push({
      pemasukanUraian: pem ? pem.uraian : '',
      pemasukanJumlah: pem ? pem.jumlah : null,
      pengeluaranNo: pengNo,
      pengeluaranUraian: pengUraian,
      pengeluaranJumlah: pengJumlah,
      isSaldoRow
    });
  }

  // Tambahkan baris kosong jika rows < 10
  while (rows.length < 10) {
    rows.push({
      pemasukanUraian: '', pemasukanJumlah: null,
      pengeluaranNo: '', pengeluaranUraian: '', pengeluaranJumlah: null,
      isSaldoRow: false
    });
  }

  // grandTotal = totalPengeluaran + saldoDebet = totalPemasukan (kedua sisi harus seimbang)
  const grandTotal = totalPengeluaran + saldoDebet;

  return (
    <div className={styles.printContainer}>
      <style>{`
        @media print {
          @page { size: portrait; margin: 15mm 15mm 15mm 15mm; }
          .page { background: white !important; padding: 0 !important; }
          .custom-table th { background-color: #ffb703 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .total-row td { background-color: #ffb703 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .saldo-row td.saldo-cell { background-color: #e5e5e5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .custom-table { border-collapse: collapse; }
        .custom-table th { background-color: #ffb703; color: #000; font-weight: 700; border: 2px solid #000; padding: 8px; text-align: center; }
        .custom-table td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; }
        .rp-cell { display: flex; justify-content: space-between; align-items: flex-start; width: 100%; }
        .saldo-cell { background-color: #e5e5e5; font-weight: bold; }
        .total-row td { background-color: #ffb703; font-weight: bold; border: 2px solid #000; padding: 8px; }
      `}</style>
      <div className={styles.page} style={{ minHeight: 'auto' }}>
        <div style={{ background: 'white', padding: '10mm 15mm', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: 4 }}>
            LAPORAN KEUANGAN
          </div>
          <div style={{ fontSize: '12pt', fontWeight: 'bold', marginBottom: 4 }}>
            {(jabatanUser || 'Staf / Pemohon').toUpperCase()}
          </div>
          <div style={{ fontSize: '12pt', fontWeight: 'bold' }}>
            BULAN {bulanIndo(bulan).toUpperCase()}
          </div>
        </div>

        <table className="custom-table" style={{ width: '100%', boxSizing: 'border-box', borderCollapse: 'collapse', fontSize: '10pt', marginTop: '20px' }}>
          <thead>
            <tr>
              <th style={{ width: '25%' }}>PEMASUKAN</th>
              <th style={{ width: '20%' }}>JUMLAH</th>
              <th style={{ width: '5%', textAlign: 'center' }}>NO</th>
              <th style={{ width: '30%' }}>PENGELUARAN</th>
              <th style={{ width: '20%' }}>JUMLAH</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.pemasukanUraian}</td>
                <td>
                  <div className="rp-cell">
                    <span>{r.pemasukanJumlah !== null ? 'Rp' : ''}</span>
                    <span>{r.pemasukanJumlah !== null ? Number(r.pemasukanJumlah).toLocaleString('id-ID') : ''}</span>
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>{r.pengeluaranNo}</td>
                <td className={r.isSaldoRow ? 'saldo-cell' : ''}>{r.pengeluaranUraian}</td>
                <td className={r.isSaldoRow ? 'saldo-cell' : ''}>
                  <div className="rp-cell">
                    <span>{r.pengeluaranJumlah !== null ? 'Rp' : ''}</span>
                    <span>{r.pengeluaranJumlah !== null ? Number(r.pengeluaranJumlah).toLocaleString('id-ID') : ''}</span>
                  </div>
                </td>
              </tr>
            ))}
            <tr className="total-row">
              <td style={{ textAlign: 'center' }}>JUMLAH</td>
              <td>
                <div className="rp-cell">
                  <span>Rp</span>
                  <span>{Number(grandTotal).toLocaleString('id-ID')}</span>
                </div>
              </td>
              <td colSpan={2} style={{ textAlign: 'center' }}>JUMLAH</td>
              <td>
                <div className="rp-cell">
                  <span>Rp</span>
                  <span>{Number(grandTotal).toLocaleString('id-ID')}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* TTD */}
        <table className={styles.ttdTable} style={{ marginTop: '40px' }}>
          <tbody>
            <tr>
              <td className={styles.ttdCell}>
                <div className={styles.ttdTitle}>Kepala Madrasah</div>
                <div className={styles.ttdSub}>Mengetahui</div>
                <div className={styles.ttdSpace}></div>
                <div className={styles.ttdName}>Dwi Retno Palupi, M.Pd.</div>
              </td>
              <td className={styles.ttdCell}>
                <div className={styles.ttdTitle}>Bendahara</div>
                <div className={styles.ttdSub}>Mengetahui / Menerima</div>
                <div className={styles.ttdSpace}></div>
                <div className={styles.ttdName}>S. Nur Ainy, S.Pd.</div>
              </td>
              <td className={styles.ttdCell}>
                <div className={styles.ttdTitle}>Pembuat Laporan</div>
                <div className={styles.ttdSub}>&nbsp;</div>
                <div className={styles.ttdSpace}></div>
                <div className={styles.ttdName}>{user}</div>
              </td>
            </tr>
          </tbody>
        </table>
        </div>{/* end padding wrapper */}
      </div>
    </div>
  );
}
