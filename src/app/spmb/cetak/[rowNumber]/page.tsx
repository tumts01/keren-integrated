'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Script from 'next/script';
import styles from './Cetak.module.css';
import LoadingScreen from '@/components/LoadingScreen';

export default function CetakSpmb() {
  const router = useRouter();
  const { rowNumber } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Hitung Tahun Ajaran Otomatis
  const today = new Date();
  const currentYear = today.getFullYear();
  const month = today.getMonth(); // 0-indexed (0=Jan, 6=Jul)
  let spmbYear = '';
  if (month >= 6) {
    spmbYear = `${currentYear + 1}/${currentYear + 2}`;
  } else {
    spmbYear = `${currentYear}/${currentYear + 1}`;
  }

  // Tanggal Cetak
  const tanggalCetak = today.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  useEffect(() => {
    if (rowNumber) {
      fetchData(rowNumber as string);
    }
  }, [rowNumber]);

  const fetchData = async (row: string) => {
    try {
      const res = await fetch(`/api/spmb/cetak/${row}`);
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    if (typeof window === 'undefined' || !(window as any).html2pdf) {
      alert('Library pembuat PDF sedang dimuat. Silakan tunggu beberapa detik dan coba lagi.');
      return;
    }
    
    setIsGeneratingPdf(true);
    const element = document.getElementById('print-area');
    const opt = {
      margin:       [0, 0, 0, 0], // Set to 0 to prevent cutoff, the CSS handles padding
      filename:     `Kartu_SPMB_${data.namaLengkap.replace(/\s+/g, '_')}_${data.nisn}.pdf`,
      image:        { type: 'jpeg', quality: 1.0 },
      html2canvas:  { scale: 2, useCORS: true, windowWidth: 794 }, // 794px is roughly 210mm at 96dpi
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    (window as any).html2pdf().set(opt).from(element).save().then(() => {
      setIsGeneratingPdf(false);
    });
  };

  const handleKembali = () => {
    if (typeof window !== 'undefined' && localStorage.getItem('spmb_session')) {
      router.push('/spmb/portal');
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/spmb/portal');
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }


  if (error || !data) {
    return <div className={styles.loading}>Error: {error}</div>;
  }

  return (
    <>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js" strategy="lazyOnload" />
      
      <div className={styles.printContainer}>
        
        {/* Toolbar (Hidden when printing via CSS) */}
        <div className={styles.toolbar}>
          <button onClick={handleKembali} className={`${styles.btnToolbar} ${styles.btnBack}`}>
            <i className="fas fa-arrow-left"></i> Kembali ke Portal
          </button>
          <button onClick={handlePrint} className={`${styles.btnToolbar} ${styles.btnPrint}`}>
            <i className="fas fa-print"></i> Cetak Langsung
          </button>
          <button onClick={handleDownloadPdf} className={`${styles.btnToolbar} ${styles.btnPdf}`} disabled={isGeneratingPdf}>
            {isGeneratingPdf ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-pdf"></i>}
            {isGeneratingPdf ? 'Memproses PDF...' : 'Unduh PDF'}
          </button>
        </div>

        <div className={styles.cardWrapper} id="print-area">
          <div className={styles.card}>
            
            {/* Kop Surat Image */}
            <img src="/kop_surat_mts.png" alt="Kop Surat" className={styles.kopImage} />

            <div className={styles.title}>
              KARTU BUKTI PENDAFTARAN SPMB<br/>
              TAHUN AJARAN {spmbYear}
            </div>

            <table className={styles.table}>
              <tbody>
                <tr>
                  <td>Nomor Pendaftaran</td>
                  <td>:</td>
                  <td><strong style={{ fontSize: '1.1rem', color: '#047857', letterSpacing: '0.5px' }}>{data.nomorPendaftaran || '-'}</strong></td>
                </tr>
                <tr>
                  <td>Waktu Pendaftaran</td>
                  <td>:</td>
                  <td>{data.timestamp}</td>
                </tr>
                <tr>
                  <td>Jalur Pendaftaran</td>
                  <td>:</td>
                  <td>{data.jalurPendaftaran}</td>
                </tr>
                <tr>
                  <td>Nama Lengkap</td>
                  <td>:</td>
                  <td>{data.namaLengkap}</td>
                </tr>
                <tr>
                  <td>NISN</td>
                  <td>:</td>
                  <td>{data.nisn}</td>
                </tr>
                <tr>
                  <td>Tempat, Tanggal Lahir</td>
                  <td>:</td>
                  <td>{data.tempatTanggalLahir}</td>
                </tr>
                <tr>
                  <td>Jenis Kelamin</td>
                  <td>:</td>
                  <td>{data.jenisKelamin}</td>
                </tr>
                <tr>
                  <td>Agama</td>
                  <td>:</td>
                  <td>{data.agama}</td>
                </tr>
                <tr>
                  <td>Asal Sekolah</td>
                  <td>:</td>
                  <td>{data.asalSekolah}</td>
                </tr>
                <tr>
                  <td>Alamat Lengkap</td>
                  <td>:</td>
                  <td>{data.alamatLengkap}</td>
                </tr>
              </tbody>
            </table>

            {/* Catatan Berkas yang Harus Dikumpulkan */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '10px 14px',
              margin: '14px 0',
              fontSize: '11px',
              color: '#334155',
              lineHeight: 1.5,
              textAlign: 'left'
            }}>
              <strong style={{ color: '#0f172a' }}>Petunjuk &amp; Pengumpulan Berkas:</strong>
              <div style={{ marginTop: '3px' }}>
                1. Calon santri wajib mengumpulkan berkas <strong>Fotokopi Rapor Kelas 5 (Semester 1 &amp; 2)</strong>.
              </div>
              <div>
                2. Berkas boleh diserahkan secara fisik ke Sekretariat Panitia di madrasah atau dikirim dalam bentuk file/foto via WhatsApp Panitia SPMB.
              </div>
              <div>
                3. Simpan kartu bukti ini dan pantau hasil verifikasi berkas melalui <strong>Portal Calon Siswa</strong>.
              </div>
            </div>

            <div className={styles.footer}>
              <div className={styles.footerLogos}>
                <img src="/keren.png" alt="Sistem KEREN" />
                <img src="/Ramah_Anak.png" alt="Madrasah Ramah Anak" />
                <img src="/Madrasah_Adiwiyata.png" alt="Madrasah Adiwiyata" />
              </div>
              <div className={styles.signature}>
                <p>Singosari, {tanggalCetak}</p>
                <p>Panitia SPMB,</p>
                <div className={styles.signatureSpace}></div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
