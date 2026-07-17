'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import styles from './Cetak.module.css';

export default function CetakSpmb() {
  const { rowNumber } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        // Automatically trigger print after a short delay for rendering
        setTimeout(() => {
          window.print();
        }, 800);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Menyiapkan Dokumen Cetak...</div>;
  }

  if (error || !data) {
    return <div className={styles.loading}>Error: {error}</div>;
  }

  return (
    <div className={styles.printContainer}>
      <div className={styles.card}>
        
        {/* Kop Surat */}
        <div className={styles.kop}>
          {/* Logo Sekolah */}
          <img src="/logo.png" alt="Logo Sekolah" />
          <div className={styles.kopText}>
            <h2>YAYASAN PENDIDIKAN ALMAARIF SINGOSARI</h2>
            <h1>MTs ALMAARIF 01 SINGOSARI</h1>
            <p>Jl. Masjid No. 22 Singosari - Malang, Jawa Timur</p>
          </div>
        </div>

        <div className={styles.title}>
          KARTU BUKTI PENDAFTARAN SPMB<br/>
          TAHUN AJARAN {spmbYear}
        </div>

        <table className={styles.table}>
          <tbody>
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

        <div className={styles.footer}>
          <div className={styles.signature}>
            <p>Singosari, {tanggalCetak}</p>
            <p>Panitia SPMB,</p>
            <div className={styles.signatureSpace}></div>
            <p>_______________________</p>
          </div>
        </div>

      </div>
    </div>
  );
}
