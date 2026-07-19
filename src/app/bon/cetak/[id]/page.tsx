'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import styles from './Cetak.module.css';

const formatRp = (n: any) => {
  if (!n && n !== 0) return 'Rp 0';
  return 'Rp ' + Number(n).toLocaleString('id-ID');
};

const tglIndo = (str: string) => {
  if (!str) return '-';
  try {
    return new Date(str).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return str; }
};

export default function CetakBonPage() {
  const params = useParams();
  const id = decodeURIComponent(params.id as string);
  const [bon, setBon] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const inIframe = typeof window !== 'undefined' && window !== window.parent;

  useEffect(() => {
    fetch(`/api/bon/detail/${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(j => { setBon(j.bon); setLoading(false); });
  }, [id]);

  // Hanya auto-print jika dibuka langsung (bukan via iframe modal)
  useEffect(() => {
    if (bon && !loading && !inIframe) {
      setTimeout(() => window.print(), 500);
    }
  }, [bon, loading]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#237227' }}></i>
      <p>Memuat data BON...</p>
    </div>
  );

  if (!bon) return <div style={{ textAlign: 'center', padding: 48 }}>Data tidak ditemukan</div>;

  let rincian: any[] = [];
  try { rincian = JSON.parse(bon['RincianJSON'] || '[]'); } catch {}
  const totalRincian = rincian.reduce((s: number, i: any) => s + ((i.qty || 0) * (i.harga || 0)), 0);

  return (
    <div className={styles.page}>
      {/* Print Button (hidden when printing) */}
      <div className={styles.noPrint}>
        <button className={styles.printBtn} onClick={() => window.print()}>
          <i className="fas fa-print"></i> Cetak / Unduh PDF
        </button>
        <button className={styles.backBtn} onClick={() => window.close()}>
          <i className="fas fa-times"></i> Tutup
        </button>
      </div>

      {/* A4 Document */}
      <div className={styles.doc}>
        {/* KOP */}
        <div className={styles.kop}>
          <img src="/logo.png" alt="Logo" className={styles.logo} />
          <div className={styles.kopText}>
            <div className={styles.kopTitle}>TANDA BUKTI BON</div>
            <div className={styles.kopSekolah}>MTs ALMAARIF 01 SINGOSARI</div>
            <div className={styles.kopAlamat}>Jl. Masjid No. 33 Pagentan Singosari Malang</div>
          </div>
        </div>
        <div className={styles.kopLine}></div>

        {/* INFO */}
        <table className={styles.infoTable}>
          <tbody>
            <tr>
              <td className={styles.infoKey}>Nomor BON</td>
              <td className={styles.infoColon}>:</td>
              <td className={styles.infoVal} style={{ fontWeight: 700 }}>{bon['NoBon'] || bon['ID']}</td>
              <td className={styles.infoKey}>Tahun Ajaran</td>
              <td className={styles.infoColon}>:</td>
              <td className={styles.infoVal}>{bon['TahunAjaran'] || '2026/2027'}</td>
            </tr>
            <tr>
              <td className={styles.infoKey}>Tanggal</td>
              <td className={styles.infoColon}>:</td>
              <td className={styles.infoVal}>{tglIndo(bon['Tanggal'])}</td>
              <td></td><td></td><td></td>
            </tr>
            <tr>
              <td className={styles.infoKey}>Nama Pemohon</td>
              <td className={styles.infoColon}>:</td>
              <td className={styles.infoVal} style={{ fontWeight: 700 }}>{bon['Nama']}</td>
              <td className={styles.infoKey}>Jabatan</td>
              <td className={styles.infoColon}>:</td>
              <td className={styles.infoVal}>{bon['Jabatan'] || '-'}</td>
            </tr>
            <tr>
              <td className={styles.infoKey}>Keperluan</td>
              <td className={styles.infoColon}>:</td>
              <td className={styles.infoVal} colSpan={4}>{bon['Keperluan']}</td>
            </tr>
            <tr>
              <td className={styles.infoKey}>Jumlah Uang</td>
              <td className={styles.infoColon}>:</td>
              <td className={styles.infoVal} style={{ fontWeight: 700, color: '#15803d' }} colSpan={4}>{formatRp(bon['JumlahDiminta'] || bon['JumlahUang'])}</td>
            </tr>
          </tbody>
        </table>

        {/* Terbilang */}
        <div className={styles.terbilang}>
          Terbilang: ( <em>{bon['Terbilang'] || '-'}</em> )
        </div>

        {/* Rincian */}
        <div className={styles.rincianTitle}>RENCANA RINCIAN ANGGARAN</div>
        <table className={styles.rincianTable}>
          <thead>
            <tr>
              <th style={{ width: 36 }}>No</th>
              <th>Nama Barang / Kegiatan</th>
              <th style={{ width: 50 }}>Qty</th>
              <th style={{ width: 70 }}>Satuan</th>
              <th style={{ width: 110 }}>Harga Satuan</th>
              <th style={{ width: 120 }}>Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {rincian.map((item: any, idx: number) => (
              <tr key={idx}>
                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                <td>{item.barang}</td>
                <td style={{ textAlign: 'center' }}>{item.qty}</td>
                <td style={{ textAlign: 'center', fontStyle: 'italic' }}>{item.satuan}</td>
                <td style={{ textAlign: 'right' }}>{formatRp(item.harga)}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatRp(item.qty * item.harga)}</td>
              </tr>
            ))}
            <tr className={styles.totalRow}>
              <td colSpan={5} style={{ textAlign: 'right', fontWeight: 700 }}>TOTAL</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatRp(totalRincian)}</td>
            </tr>
          </tbody>
        </table>

        {bon['Keterangan'] && (
          <div style={{ margin: '8px 0', fontSize: '10pt' }}><em>Ket: {bon['Keterangan']}</em></div>
        )}

        {/* TTD */}
        <table className={styles.ttdTable}>
          <tbody>
            <tr>
              <td className={styles.ttdCell}>
                <div className={styles.ttdTitle}>Bendahara</div>
                <div className={styles.ttdSub}>Mengetahui / Menyetujui</div>
                <div className={styles.ttdSpace}></div>
                <div className={styles.ttdName}>S. Nur Ainy, S.Pd.</div>
              </td>
              <td className={styles.ttdCell}>
                <div className={styles.ttdTitle}>Pemohon</div>
                <div className={styles.ttdSub}>&nbsp;</div>
                <div className={styles.ttdSpace}></div>
                <div className={styles.ttdName}>{bon['Nama']}</div>
                <div className={styles.ttdJabatan}>{bon['Jabatan'] || ''}</div>
              </td>
              <td className={styles.ttdCell}>
                <div className={styles.ttdTitle}>Kepala Madrasah</div>
                <div className={styles.ttdSub}>Menyetujui</div>
                <div className={styles.ttdSpace}></div>
                <div className={styles.ttdName}>Dwi Retno Palupi, M.Pd.</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
