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

  let mutasi: any[] = [];
  let currentSaldo = 0;
  let jabatanUser = '';
  
  const sortedData = [...data].reverse();
  
  sortedData.filter(d => (d.Nama || d.nama || '').trim() === user).forEach(bon => {
    const isTargetMonth = (bon.Tanggal || '').startsWith(bulan);
    const idBukti = bon.NoBon || bon.ID;
    if (!jabatanUser && bon.Jabatan) jabatanUser = bon.Jabatan;
    
    const requested = parseFloat(bon.JumlahDiminta || '0');
    const saldoDipakai = parseFloat(bon.SaldoTerpakai || '0');
    const isSaldoOnly = requested <= saldoDipakai && saldoDipakai > 0;
    
    let penerimaanKas = 0;
    if (!isSaldoOnly && requested > 0) {
      penerimaanKas = Math.max(0, requested - saldoDipakai);
      currentSaldo += penerimaanKas;
      if (isTargetMonth && penerimaanKas > 0) {
        mutasi.push({
          id: `TRM-${idBukti}`,
          tanggal: bon.Tanggal,
          noBukti: idBukti,
          uraian: `Penerimaan Kas: ${bon.Keperluan}`,
          terima: penerimaanKas,
          keluar: 0,
          saldo: currentSaldo
        });
      }
    }

    let rincian: any[] = [];
    try {
      if (bon.RealisasiRincianJSON) rincian = JSON.parse(bon.RealisasiRincianJSON);
      else if (bon.RincianJSON) rincian = JSON.parse(bon.RincianJSON);
    } catch(e){}

    if (rincian.length > 0) {
      rincian.forEach((r, idx) => {
        const qty = Number(r.qty) || 0;
        const harga = Number(r.harga) || 0;
        const out = qty * harga;
        if (out > 0) {
          currentSaldo -= out;
          if (isTargetMonth) {
            mutasi.push({
              id: `KLR-${idBukti}-${idx}`,
              tanggal: bon.Tanggal,
              noBukti: idBukti,
              uraian: `Belanja: ${r.barang} (${qty} ${r.satuan})`,
              terima: 0,
              keluar: out,
              saldo: currentSaldo
            });
          }
        }
      });
    }
    
    // Tambahkan baris khusus Sisa Saldo di akhir setiap BON
    if (isTargetMonth) {
      mutasi.push({
        id: `SISA-${idBukti}`,
        tanggal: bon.Tanggal,
        noBukti: idBukti,
        uraian: `*Sisa Saldo dari BON ini*`,
        terima: 0,
        keluar: 0,
        saldo: currentSaldo
      });
    }
  });

  let lastBukti = '';
  let counter = 0;
  const finalMutasi = mutasi.map((m, i, arr) => {
    if (m.noBukti !== lastBukti) {
      lastBukti = m.noBukti;
      counter++;
      const rowSpanCount = arr.filter(x => x.noBukti === m.noBukti).length;
      return { ...m, rowSpan: rowSpanCount, num: counter };
    }
    return { ...m, rowSpan: 0, num: counter };
  });

  return (
    <div className={styles.printContainer}>
      <style>{`
        @media print {
          @page { size: landscape; margin: 15mm; }
        }
      `}</style>
      <div className={styles.page} style={{ minHeight: 'auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 20, borderBottom: '2px solid #000', paddingBottom: 10 }}>
          <div style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: 4 }}>
            BUKU KAS PEMBANTU (LAPORAN KEUANGAN)
          </div>
          <div style={{ fontSize: '12pt', fontWeight: 'bold', marginBottom: 4 }}>
            {(jabatanUser || 'Staf / Pemohon').toUpperCase()}
          </div>
          <div style={{ fontSize: '11pt' }}>
            Bulan {bulanIndo(bulan)}
          </div>
        </div>

        <table style={{ width: '100%', boxSizing: 'border-box', borderCollapse: 'collapse', fontSize: '10pt', marginTop: '20px', border: '1px solid #000' }}>
          <thead>
            <tr>
              <th style={{ width: 30, textAlign: 'center', border: '1px solid #000', padding: 6, backgroundColor: '#f1f5f9' }}>No</th>
              <th style={{ width: 80, border: '1px solid #000', padding: 6, backgroundColor: '#f1f5f9' }}>Tanggal</th>
              <th style={{ width: 140, border: '1px solid #000', padding: 6, backgroundColor: '#f1f5f9' }}>No. Bukti / BON</th>
              <th style={{ border: '1px solid #000', padding: 6, backgroundColor: '#f1f5f9' }}>Uraian / Keperluan</th>
              <th style={{ width: 90, textAlign: 'right', border: '1px solid #000', padding: 6, backgroundColor: '#f1f5f9' }}>Penerimaan</th>
              <th style={{ width: 90, textAlign: 'right', border: '1px solid #000', padding: 6, backgroundColor: '#f1f5f9' }}>Pengeluaran</th>
              <th style={{ width: 100, textAlign: 'right', border: '1px solid #000', padding: 6, backgroundColor: '#f1f5f9' }}>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {finalMutasi.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', border: '1px solid #000', padding: 8 }}>Nihil / Tidak ada mutasi pada bulan ini</td></tr>
            )}
            {finalMutasi.map((m) => (
              <tr key={m.id}>
                {m.rowSpan > 0 && <td rowSpan={m.rowSpan} style={{ textAlign: 'center', verticalAlign: 'top', border: '1px solid #000', padding: 6 }}>{m.num}</td>}
                {m.rowSpan > 0 && <td rowSpan={m.rowSpan} style={{ verticalAlign: 'top', border: '1px solid #000', padding: 6, whiteSpace: 'nowrap' }}>{m.tanggal}</td>}
                {m.rowSpan > 0 && <td rowSpan={m.rowSpan} style={{ verticalAlign: 'top', border: '1px solid #000', padding: 6, whiteSpace: 'nowrap', fontWeight: 600 }}>{m.noBukti}</td>}
                <td style={{ verticalAlign: 'top', border: '1px solid #000', padding: 6 }}>{m.uraian}</td>
                <td style={{ textAlign: 'right', verticalAlign: 'top', border: '1px solid #000', padding: 6 }}>{m.terima > 0 ? formatRp(m.terima) : '-'}</td>
                <td style={{ textAlign: 'right', verticalAlign: 'top', border: '1px solid #000', padding: 6 }}>{m.keluar > 0 ? formatRp(m.keluar) : '-'}</td>
                <td style={{ textAlign: 'right', verticalAlign: 'top', border: '1px solid #000', padding: 6, fontWeight: 600 }}>{formatRp(m.saldo)}</td>
              </tr>
            ))}
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
      </div>
    </div>
  );
}
