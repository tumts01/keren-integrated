'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import styles from './CetakNota.module.css';
import LoadingScreen from '@/components/LoadingScreen';

// Helper format Rupiah
const formatRp = (n: any) => {
  if (!n && n !== 0) return 'Rp 0';
  return 'Rp ' + Number(n).toLocaleString('id-ID');
};

// Helper tanggal Indonesia
const tglIndo = (str: string) => {
  if (!str) return '-';
  try {
    return new Date(str).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return str; }
};

const tglSingkat = (str: string) => {
  if (!str) return '';
  try {
    return new Date(str).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return str; }
};

// Helper angka ke terbilang (huruf)
function angkaKeTerbilang(angka: number): string {
  const bilangan = Math.floor(Math.abs(angka));
  const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan',
    'Sepuluh', 'Sebelas', 'Dua Belas', 'Tiga Belas', 'Empat Belas', 'Lima Belas', 'Enam Belas',
    'Tujuh Belas', 'Delapan Belas', 'Sembilan Belas'];
  
  if (bilangan < 20) return satuan[bilangan];
  if (bilangan < 100) return satuan[Math.floor(bilangan / 10)] + ' Puluh' + (bilangan % 10 !== 0 ? ' ' + satuan[bilangan % 10] : '');
  if (bilangan < 200) return 'Seratus' + (bilangan % 100 !== 0 ? ' ' + angkaKeTerbilang(bilangan % 100) : '');
  if (bilangan < 1000) return satuan[Math.floor(bilangan / 100)] + ' Ratus' + (bilangan % 100 !== 0 ? ' ' + angkaKeTerbilang(bilangan % 100) : '');
  if (bilangan < 2000) return 'Seribu' + (bilangan % 1000 !== 0 ? ' ' + angkaKeTerbilang(bilangan % 1000) : '');
  if (bilangan < 1000000) return angkaKeTerbilang(Math.floor(bilangan / 1000)) + ' Ribu' + (bilangan % 1000 !== 0 ? ' ' + angkaKeTerbilang(bilangan % 1000) : '');
  if (bilangan < 1000000000) return angkaKeTerbilang(Math.floor(bilangan / 1000000)) + ' Juta' + (bilangan % 1000000 !== 0 ? ' ' + angkaKeTerbilang(bilangan % 1000000) : '');
  return angkaKeTerbilang(Math.floor(bilangan / 1000000000)) + ' Miliar' + (bilangan % 1000000000 !== 0 ? ' ' + angkaKeTerbilang(bilangan % 1000000000) : '');
}

export default function CetakNotaPage() {
  const params = useParams();
  const id = decodeURIComponent((params.id as string) || '');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const inIframe = typeof window !== 'undefined' && window !== window.parent;

  useEffect(() => {
    if (id === 'custom') {
      try {
        const stored = sessionStorage.getItem('custom_nota_tu');
        if (stored) {
          setData(JSON.parse(stored));
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
      return;
    }

    // Ambil dari detail BON
    fetch(`/api/bon/detail/${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(j => {
        if (j.bon) {
          let rincianArr: any[] = [];
          if (j.realisasi?.RincianJSON) {
            try { rincianArr = JSON.parse(j.realisasi.RincianJSON); } catch {}
          } else if (j.bon.RincianJSON) {
            try { rincianArr = JSON.parse(j.bon.RincianJSON); } catch {}
          }

          let penerimaArr: any[] = [];
          try { penerimaArr = JSON.parse(j.bon.PenerimaJSON || '[]'); } catch {}

          const penerimaNama = penerimaArr.length > 0 
            ? penerimaArr.map((p: any) => p.nama + (p.keterangan ? ` (${p.keterangan})` : '')).join(', ')
            : j.bon.Nama || '';

          setData({
            noNota: j.bon.NoBon || j.bon.ID || `NOTA-TU-${id}`,
            tanggal: j.bon.Tanggal || new Date().toISOString().split('T')[0],
            keperluan: j.bon.Keperluan || 'Kegiatan Operasional Tata Usaha',
            sumberAnggaran: 'Kas Madrasah / MTs Almaarif 01 Singosari',
            penerima: penerimaNama,
            rincian: rincianArr,
            keterangan: j.bon.Keterangan || '',
          });
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (data && !loading && !inIframe) {
      setTimeout(() => window.print(), 500);
    }
  }, [data, loading]);

  if (loading) return <LoadingScreen />;
  if (!data) return <div style={{ textAlign: 'center', padding: 48 }}>Data Nota tidak ditemukan</div>;

  const rincian = data.rincian || [];
  const totalRincian = rincian.reduce((s: number, i: any) => s + ((Number(i.qty) || 0) * (Number(i.harga) || 0)), 0);
  const terbilangStr = totalRincian > 0 ? `${angkaKeTerbilang(totalRincian)} Rupiah` : 'Nol Rupiah';

  return (
    <div className={styles.page}>
      {/* Action Buttons Toolbar */}
      {(!inIframe) && (
        <div className={styles.noPrint}>
          <button className={styles.printBtn} onClick={() => window.print()}>
            <i className="fas fa-print"></i> Cetak / Unduh PDF
          </button>
          <button className={styles.backBtn} onClick={() => window.close()}>
            <i className="fas fa-times"></i> Tutup
          </button>
        </div>
      )}

      {/* Dokumen Nota A4 */}
      <div className={styles.doc}>
        <div className={styles.notaBorder}>
          {/* KOP RESMI TATA USAHA */}
          <div className={styles.kop}>
            <img src="/logo.png" alt="Logo Madrasah" className={styles.logo} />
            <div className={styles.kopText}>
              <div className={styles.kopSekolah}>MTs ALMAARIF 01 SINGOSARI</div>
              <div className={styles.kopUnit}>BAGIAN TATA USAHA</div>
              <div className={styles.kopAlamat}>Jl. Masjid No. 33 Pagentan Singosari Malang 65153 | Telp. (0341) 458776</div>
            </div>
          </div>
          <div className={styles.kopLine}></div>

          {/* JUDUL NOTA */}
          <div className={styles.notaTitleBox}>
            <div className={styles.notaTitle}>NOTA PEMBAYARAN / PENGELUARAN</div>
            <div className={styles.notaNomor}>Nomor: {data.noNota}</div>
          </div>

          {/* INFORMASI TRANSAKSI */}
          <table className={styles.infoTable}>
            <tbody>
              <tr>
                <td className={styles.infoKey}>Hari / Tanggal</td>
                <td className={styles.infoColon}>:</td>
                <td className={styles.infoVal} style={{ fontWeight: 600 }}>{tglIndo(data.tanggal)}</td>
                <td className={styles.infoKey}>Sumber Anggaran</td>
                <td className={styles.infoColon}>:</td>
                <td className={styles.infoVal}>{data.sumberAnggaran || 'Kas Madrasah MTs Almaarif 01'}</td>
              </tr>
              <tr>
                <td className={styles.infoKey}>Diberikan Kepada</td>
                <td className={styles.infoColon}>:</td>
                <td className={styles.infoVal} style={{ fontWeight: 600 }}>{data.penerima || '-'}</td>
                <td className={styles.infoKey}>Keperluan</td>
                <td className={styles.infoColon}>:</td>
                <td className={styles.infoVal} style={{ fontWeight: 600 }}>{data.keperluan}</td>
              </tr>
            </tbody>
          </table>

          {/* TABEL RINCIAN PENGELUARAN */}
          <table className={styles.rincianTable}>
            <thead>
              <tr>
                <th style={{ width: 36 }}>No</th>
                <th>Nama Barang / Uraian Kegiatan</th>
                <th style={{ width: 55 }}>Banyak</th>
                <th style={{ width: 75 }}>Satuan</th>
                <th style={{ width: 120 }}>Harga Satuan</th>
                <th style={{ width: 130 }}>Jumlah (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {rincian.length > 0 ? (
                rincian.map((item: any, idx: number) => {
                  const sub = (Number(item.qty) || 0) * (Number(item.harga) || 0);
                  return (
                    <tr key={idx}>
                      <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                      <td>{item.barang || item.nama || '-'}</td>
                      <td style={{ textAlign: 'center' }}>{item.qty || 1}</td>
                      <td style={{ textAlign: 'center', fontStyle: 'italic' }}>{item.satuan || 'PCS'}</td>
                      <td style={{ textAlign: 'right' }}>{formatRp(item.harga || 0)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatRp(sub)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', fontStyle: 'italic', padding: 16 }}>
                    Tidak ada rincian barang/kegiatan
                  </td>
                </tr>
              )}
              <tr className={styles.totalRow}>
                <td colSpan={5} style={{ textAlign: 'right', fontWeight: 700, letterSpacing: 0.5 }}>
                  TOTAL PEMBAYARAN
                </td>
                <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '11pt', color: '#15803d' }}>
                  {formatRp(totalRincian)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* TERBILANG BOX */}
          <div className={styles.terbilangBox}>
            <strong>Terbilang:</strong> ( <em>{terbilangStr}</em> )
          </div>

          {data.keterangan && (
            <div style={{ fontSize: '9.5pt', color: '#475569', marginBottom: 14 }}>
              <em>Catatan: {data.keterangan}</em>
            </div>
          )}

          {/* TANDA TANGAN */}
          <div className={styles.ttdWrapper}>
            <table className={styles.ttdTable}>
              <tbody>
                <tr>
                  <td className={styles.ttdCell} style={{ width: '50%' }}>
                    <div className={styles.ttdTitle}>Yang Menerima,</div>
                    <div className={styles.ttdSub}>Penerima / Petugas</div>
                    <div className={styles.ttdSpace}></div>
                    <div className={styles.ttdName}>{data.penerima ? data.penerima.split(',')[0].trim() : '( ...................................... )'}</div>
                  </td>
                  <td className={styles.ttdCell} style={{ width: '50%' }}>
                    <div className={styles.ttdKota}>Singosari, {tglSingkat(data.tanggal)}</div>
                    <div className={styles.ttdTitle}>Kepala Tata Usaha,</div>
                    <div className={styles.ttdSub}>Mengetahui / Menyetujui</div>
                    <div className={styles.ttdSpace}></div>
                    <div className={styles.ttdName}>M. FAISAL ABDA&apos;U</div>
                    <div className={styles.ttdNip}>NIP. 121235070115110043</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
