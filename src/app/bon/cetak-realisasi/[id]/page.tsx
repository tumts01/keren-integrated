'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import styles from '../../cetak/[id]/Cetak.module.css';
import stylesR from './CetakRealisasi.module.css';

const formatRp = (n: any) => {
  if (!n && n !== 0) return 'Rp 0';
  return 'Rp ' + Number(n).toLocaleString('id-ID');
};

const tglIndo = (str: string) => {
  if (!str) return '-';
  try { return new Date(str).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); } catch { return str; }
};

export default function CetakRealisasiPage() {
  const params = useParams();
  const id = decodeURIComponent(params.id as string);
  const [bon, setBon] = useState<any>(null);
  const [realisasi, setRealisasi] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/bon/detail/${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(j => { setBon(j.bon); setRealisasi(j.realisasi); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (bon && !loading) setTimeout(() => window.print(), 500);
  }, [bon, loading]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#237227' }}></i>
      <p>Memuat laporan realisasi...</p>
    </div>
  );
  if (!bon) return <div style={{ textAlign: 'center', padding: 48 }}>Data tidak ditemukan</div>;

  let rincianPengajuan: any[] = [];
  let rincianRealisasi: any[] = [];
  try { rincianPengajuan = JSON.parse(bon['RincianJSON'] || '[]'); } catch {}
  try { rincianRealisasi = JSON.parse(realisasi?.['RincianJSON'] || '[]'); } catch {}

  const totalDiminta = parseFloat(bon['JumlahDiminta'] || bon['JumlahUang'] || '0');
  const totalRealisasi = rincianRealisasi.reduce((s: number, i: any) => s + ((i.qty || 0) * (i.harga || 0)), 0);
  const sisa = parseFloat(realisasi?.['SisaUang'] || String(totalDiminta - totalRealisasi));

  return (
    <div className={styles.page}>
      <div className={styles.noPrint}>
        <button className={styles.printBtn} onClick={() => window.print()}>
          <i className="fas fa-print"></i> Cetak / Unduh PDF
        </button>
        <button className={styles.backBtn} onClick={() => window.close()}>
          <i className="fas fa-times"></i> Tutup
        </button>
      </div>

      <div className={styles.doc}>
        {/* KOP */}
        <div className={styles.kop}>
          <img src="/logo.png" alt="Logo" className={styles.logo} />
          <div className={styles.kopText}>
            <div className={styles.kopTitle}>LAPORAN REALISASI BELANJA</div>
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
              <td className={styles.infoVal} style={{ fontWeight: 700 }} colSpan={4}>{bon['NoBon'] || bon['ID']}</td>
            </tr>
            <tr>
              <td className={styles.infoKey}>Tgl Pengajuan</td>
              <td className={styles.infoColon}>:</td>
              <td className={styles.infoVal}>{tglIndo(bon['Tanggal'])}</td>
              <td className={styles.infoKey}>Tgl Realisasi</td>
              <td className={styles.infoColon}>:</td>
              <td className={styles.infoVal}>{tglIndo(realisasi?.['TanggalBelanja'])}</td>
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
          </tbody>
        </table>

        {/* Rencana Anggaran */}
        <div className={styles.rincianTitle}>RENCANA ANGGARAN (PENGAJUAN)</div>
        <table className={styles.rincianTable}>
          <thead>
            <tr><th style={{ width: 32 }}>No</th><th>Nama Barang / Kegiatan</th><th style={{ width: 45 }}>Qty</th><th style={{ width: 60 }}>Satuan</th><th style={{ width: 100 }}>Harga Satuan</th><th style={{ width: 110 }}>Jumlah</th></tr>
          </thead>
          <tbody>
            {rincianPengajuan.map((item: any, idx: number) => (
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
              <td colSpan={5} style={{ textAlign: 'right', fontWeight: 700 }}>TOTAL PENGAJUAN</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatRp(totalDiminta)}</td>
            </tr>
          </tbody>
        </table>

        {/* Realisasi */}
        <div className={styles.rincianTitle} style={{ marginTop: 14 }}>REALISASI BELANJA</div>
        <table className={styles.rincianTable}>
          <thead>
            <tr><th style={{ width: 32 }}>No</th><th>Nama Barang / Kegiatan</th><th style={{ width: 45 }}>Qty</th><th style={{ width: 60 }}>Satuan</th><th style={{ width: 100 }}>Harga Satuan</th><th style={{ width: 110 }}>Jumlah</th></tr>
          </thead>
          <tbody>
            {rincianRealisasi.length > 0 ? rincianRealisasi.map((item: any, idx: number) => (
              <tr key={idx}>
                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                <td>{item.barang}</td>
                <td style={{ textAlign: 'center' }}>{item.qty}</td>
                <td style={{ textAlign: 'center', fontStyle: 'italic' }}>{item.satuan}</td>
                <td style={{ textAlign: 'right' }}>{formatRp(item.harga)}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatRp(item.qty * item.harga)}</td>
              </tr>
            )) : (
              <tr><td colSpan={6} style={{ textAlign: 'center', fontStyle: 'italic', color: '#888' }}>Belum ada data realisasi</td></tr>
            )}
            <tr className={styles.totalRow}>
              <td colSpan={5} style={{ textAlign: 'right', fontWeight: 700 }}>TOTAL REALISASI</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatRp(totalRealisasi)}</td>
            </tr>
          </tbody>
        </table>

        {/* Ringkasan */}
        <table className={stylesR.ringkasanTable}>
          <tbody>
            <tr>
              <td className={stylesR.rKey}>Jumlah Diminta</td>
              <td>:</td>
              <td className={stylesR.rVal}>{formatRp(totalDiminta)}</td>
            </tr>
            <tr>
              <td className={stylesR.rKey}>Total Realisasi</td>
              <td>:</td>
              <td className={stylesR.rVal}>{formatRp(totalRealisasi)}</td>
            </tr>
            <tr style={{ fontWeight: 800 }}>
              <td className={stylesR.rKey} style={{ color: sisa >= 0 ? '#15803d' : '#dc2626' }}>
                {sisa >= 0 ? 'Sisa / Kembali' : 'Kekurangan'}
              </td>
              <td>:</td>
              <td className={stylesR.rVal} style={{ color: sisa >= 0 ? '#15803d' : '#dc2626' }}>
                {formatRp(Math.abs(sisa))}
              </td>
            </tr>
          </tbody>
        </table>

        {realisasi?.['Keterangan'] && (
          <div style={{ margin: '8px 0', fontSize: '10pt' }}><em>Ket: {realisasi['Keterangan']}</em></div>
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
