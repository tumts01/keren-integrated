'use client';

import { useState } from 'react';

type Role = 'guru' | 'piket' | 'admin';

type Section = {
  title: string;
  icon: string;
  content: { subtitle: string; steps: string[] }[];
};

const guruSections: Section[] = [
  {
    title: 'Presensi Siswa & Jurnal Mengajar',
    icon: 'fa-calendar-check',
    content: [
      {
        subtitle: 'Cara Input Presensi Harian',
        steps: [
          'Buka menu Presensi & Jurnal di sidebar kiri.',
          'Pilih tab Absen Siswa di bagian atas halaman.',
          'Pilih Tanggal hari ini (sudah otomatis terisi).',
          'Pilih Jam Ke yang sedang berlangsung (bisa pilih lebih dari satu).',
          'Pilih Kelas yang akan diabsen.',
          'Pilih Mata Pelajaran yang Anda ajarkan.',
          'Nama siswa akan muncul otomatis di bawah. Centang siswa yang TIDAK HADIR (Sakit / Izin / Alpha). Siswa yang tidak dicentang dianggap Hadir.',
          'Klik tombol Simpan Absensi. Sistem akan menampilkan notifikasi berhasil.',
          'Catatan: Sistem memiliki proteksi anti-dobel. Jika jam dan kelas yang sama sudah diabsen oleh guru lain, sistem akan menolak input Anda.',
        ],
      },
      {
        subtitle: 'Cara Mengisi Jurnal Mengajar',
        steps: [
          'Setelah mengisi presensi, klik tab Jurnal Mengajar.',
          'Pilih Tanggal, Jam Ke, Kelas, dan Mata Pelajaran.',
          'Isi kolom Materi Pembelajaran yang diajarkan hari ini.',
          'Klik tombol Simpan Jurnal.',
          'Untuk melihat rekap jurnal Anda: klik tab Rekap Jurnal Mengajar.',
          'Gunakan filter Dari Tanggal dan Sampai Tanggal, lalu klik Terapkan untuk memuat data.',
        ],
      },
      {
        subtitle: 'Melihat & Mengedit Rekap Presensi',
        steps: [
          'Klik tab Rekap Presensi Siswa.',
          'Atur rentang tanggal yang ingin dilihat, lalu klik Terapkan.',
          'Data presensi ditampilkan dalam tabel. Gunakan filter Nama, Kelas, atau Domisili untuk mempersempit hasil.',
          'Klik tombol Edit (ikon pensil) pada baris tertentu untuk mengubah status kehadiran.',
          'Klik Hapus (ikon tong sampah) untuk menghapus data presensi yang salah.',
          'Gunakan tombol Export Excel untuk mengunduh data ke file spreadsheet.',
        ],
      },
    ],
  },
  {
    title: 'Absensi GTK',
    icon: 'fa-user-check',
    content: [
      {
        subtitle: 'Cara Mengisi Absensi GTK',
        steps: [
          'Buka menu Absensi GTK di sidebar bagian Utama.',
          'Halaman menampilkan kalender bulanan.',
          'Klik tanggal yang ingin diisi absensi.',
          'Pilih status kehadiran: Hadir, Sakit, Izin, atau Cuti.',
          'Klik Simpan.',
          'Kotak tanggal akan berubah warna sesuai status kehadiran.',
        ],
      },
    ],
  },
  {
    title: 'Jadwal Mengajar',
    icon: 'fa-clock',
    content: [
      {
        subtitle: 'Melihat Jadwal Mengajar',
        steps: [
          'Buka menu Jadwal Mengajar di sidebar (hanya tampil untuk admin).',
          'Jadwal ditampilkan dalam format tabel per hari (Senin–Sabtu).',
          'Anda bisa mencetak jadwal dengan menekan tombol Cetak.',
        ],
      },
    ],
  },
  {
    title: 'Pengembalian Rapor',
    icon: 'fa-file-signature',
    content: [
      {
        subtitle: 'Cara Konfirmasi Pengembalian Rapor',
        steps: [
          'Buka menu Pengembalian Rapor di sidebar.',
          'Pilih kelas Anda sebagai wali kelas.',
          'Centang nama siswa yang sudah mengambil rapor.',
          'Data tersimpan otomatis.',
          'Status pengambilan rapor per siswa akan terlihat secara real-time.',
        ],
      },
    ],
  },
  {
    title: 'Pengumuman',
    icon: 'fa-bullhorn',
    content: [
      {
        subtitle: 'Membaca Pengumuman',
        steps: [
          'Buka menu Pengumuman di sidebar. Tanda titik merah menandakan ada pengumuman baru.',
          'Klik judul pengumuman untuk membaca isinya.',
          'Tanda merah akan hilang setelah Anda membuka halaman Pengumuman.',
        ],
      },
    ],
  },
];

const piketSections: Section[] = [
  {
    title: 'Presensi Piket (Absen Massal)',
    icon: 'fa-school',
    content: [
      {
        subtitle: 'Cara Input Presensi Piket',
        steps: [
          'Buka menu Presensi & Jurnal, lalu pilih tab Piket.',
          'Pilih Tanggal.',
          'Di kotak daftar siswa, ketik nama siswa yang tidak hadir (sakit/izin/alpha). Sistem akan mendeteksi kelas siswa tersebut secara otomatis.',
          'Klik tombol + Tambah Baris untuk menambah baris jika ada lebih dari satu siswa yang tidak hadir.',
          'Pilih status ketidakhadiran untuk setiap siswa (S = Sakit, I = Izin, A = Alpha/Tanpa Keterangan).',
          'Klik Simpan Presensi Piket.',
        ],
      },
    ],
  },
  {
    title: 'Jurnal Piket',
    icon: 'fa-book-open',
    content: [
      {
        subtitle: 'Cara Mengisi Jurnal Piket',
        steps: [
          'Di halaman Presensi & Jurnal, pilih tab Jurnal Piket.',
          'Isi nama Petugas Piket (bisa lebih dari satu, pisahkan dengan koma).',
          'Jika ada guru yang tidak hadir (dinas luar, izin, sakit), isi data Guru Izin beserta alasan dan kelas yang ditinggalkan.',
          'Klik tombol + Tambah Baris untuk menambah data guru izin berikutnya.',
          'Klik Simpan Jurnal Piket.',
          'Rekap jurnal piket bisa dilihat di tab Rekap Jurnal Piket.',
        ],
      },
      {
        subtitle: 'Melihat Rekap Jurnal Piket',
        steps: [
          'Klik tab Rekap Jurnal Piket.',
          'Atur filter tanggal Dari – Sampai, lalu klik Terapkan.',
          'Gunakan tombol Export Excel untuk mengunduh rekap.',
        ],
      },
    ],
  },
  {
    title: 'Dispo Siswa',
    icon: 'fa-user-clock',
    content: [
      {
        subtitle: 'Mencatat Disposisi Siswa',
        steps: [
          'Buka menu Dispo Siswa di sidebar.',
          'Isi nama siswa, keperluan, asal kelas, dan waktu keluar.',
          'Klik Simpan. Data akan tercatat dan bisa dijadikan bukti siswa izin keluar.',
          'Ketika siswa kembali, klik tombol Kembali untuk mencatat waktu masuk.',
        ],
      },
    ],
  },
];

const adminSections: Section[] = [
  {
    title: 'Manajemen Data Siswa',
    icon: 'fa-users',
    content: [
      {
        subtitle: 'Menambah & Mengelola Data Siswa',
        steps: [
          'Buka menu Data Siswa di sidebar.',
          'Klik tombol + Tambah Siswa untuk menambah siswa baru secara manual.',
          'Isi formulir data siswa: Nama, NISN, Kelas, Jenis Kelamin, dll.',
          'Klik Simpan.',
          'Untuk mengedit data, klik ikon pensil pada baris siswa yang bersangkutan.',
          'Untuk menonaktifkan siswa yang sudah lulus, ubah status menjadi Tidak Aktif.',
          'Gunakan fitur filter dan pencarian di atas tabel untuk menemukan siswa dengan cepat.',
          'Untuk impor data massal, gunakan fitur Upload Excel (format harus sesuai template).',
        ],
      },
    ],
  },
  {
    title: 'Manajemen Data Guru & Staf',
    icon: 'fa-chalkboard-teacher',
    content: [
      {
        subtitle: 'Mengelola Data Guru',
        steps: [
          'Buka menu Data Guru & Staf di sidebar.',
          'Klik + Tambah Guru untuk menambah entri baru.',
          'Isi data: Nama Lengkap, NIP, Mata Pelajaran, Jabatan, Status Aktif.',
          'Klik Simpan.',
          'Data guru yang aktif akan otomatis muncul di pilihan dropdown pada menu Presensi dan Jurnal.',
        ],
      },
    ],
  },
  {
    title: 'Manajemen Kelas & Jadwal',
    icon: 'fa-chalkboard',
    content: [
      {
        subtitle: 'Mengatur Kelas',
        steps: [
          'Buka menu Data Kelas.',
          'Tambah kelas baru dengan mengisi nama kelas (contoh: 7A, 8B, 9C) dan wali kelas.',
          'Kelas yang sudah dibuat akan muncul sebagai pilihan di semua menu yang membutuhkan filter kelas.',
        ],
      },
      {
        subtitle: 'Mengatur Jadwal Mengajar',
        steps: [
          'Buka menu Jadwal Mengajar.',
          'Klik sel jadwal yang kosong (pertemuan hari & jam tertentu untuk suatu kelas).',
          'Pilih guru dan mata pelajaran yang mengisi jam tersebut.',
          'Klik Simpan. Jadwal akan otomatis terlihat oleh semua guru.',
        ],
      },
    ],
  },
  {
    title: 'SPMB (Penerimaan Siswa Baru)',
    icon: 'fa-user-graduate',
    content: [
      {
        subtitle: 'Memantau Pendaftaran SPMB',
        steps: [
          'Buka menu SPMB > Rekap di sidebar untuk melihat seluruh daftar pendaftar.',
          'Tabel menampilkan: Waktu Daftar, Nama Lengkap, NISN, Jalur, Asal Sekolah, dan status Berkas.',
          'Klik ikon KK atau Akta untuk melihat berkas yang diunggah pendaftar.',
          'Klik Cetak Kartu untuk mencetak kartu peserta SPMB.',
        ],
      },
      {
        subtitle: 'Halaman Pendaftaran Publik',
        steps: [
          'Buka menu SPMB > Pendaftaran untuk melihat tampilan formulir pendaftaran.',
          'Formulir ini juga bisa diakses oleh calon siswa baru dari luar aplikasi.',
          'Calon siswa mengisi data diri, mengunggah scan KK dan Akta Kelahiran, lalu submit.',
          'Data akan otomatis masuk ke Rekap SPMB.',
        ],
      },
    ],
  },
  {
    title: 'Perangkat Ujian & Cetak Rapor STS',
    icon: 'fa-file-alt',
    content: [
      {
        subtitle: 'Upload Nilai STS',
        steps: [
          'Buka menu Perangkat Ujian > STS.',
          'Pilih Tahun Ajaran, Semester, dan Kelas.',
          'Pilih Mata Pelajaran yang akan diupload nilainya.',
          'Siapkan file Excel dengan kolom: Nama Siswa, NISN, TP1, TP2, TP3, TP4, TP5, TP6, STS, NILAI AKHIR.',
          'Klik tombol Pilih File dan unggah file Excel tersebut.',
          'Preview data akan muncul. Periksa kecocokannya, lalu klik Simpan ke Database.',
        ],
      },
      {
        subtitle: 'Review & Edit Nilai',
        steps: [
          'Klik tab Review & Edit Nilai.',
          'Pilih filter Tahun Ajaran, Semester, dan Kelas, lalu klik Cari.',
          'Tabel menampilkan semua mata pelajaran yang sudah ada nilainya.',
          'Klik Lihat untuk melihat detail nilai per siswa.',
          'Klik Edit untuk mengubah nilai siswa tertentu.',
          'Klik Hapus untuk menghapus seluruh data nilai suatu mata pelajaran.',
        ],
      },
      {
        subtitle: 'Cetak Rapor STS',
        steps: [
          'Klik tab Cetak Rapor.',
          'Pilih Kelas yang ingin dicetak rapornya.',
          'Daftar siswa akan muncul. Klik tombol Cetak Rapor pada nama siswa yang dituju.',
          'Halaman rapor akan terbuka di tab baru dalam format siap cetak.',
          'Tekan Ctrl+P untuk mencetak atau simpan sebagai PDF.',
          'Catatan: Nilai hanya akan muncul jika sudah ada data nilai yang diupload untuk kelas dan semester tersebut.',
        ],
      },
    ],
  },
  {
    title: 'Persuratan & Disposisi',
    icon: 'fa-envelope-open-text',
    content: [
      {
        subtitle: 'Mengelola Surat Masuk',
        steps: [
          'Buka menu Persuratan di sidebar.',
          'Klik tab Surat Masuk.',
          'Klik + Tambah Surat Masuk dan isi nomor surat, perihal, asal surat, dan tanggal.',
          'Unggah scan surat jika ada.',
          'Klik Simpan.',
        ],
      },
      {
        subtitle: 'Mengelola Surat Keluar',
        steps: [
          'Klik tab Surat Keluar.',
          'Klik + Tambah Surat Keluar, isi data surat, dan simpan.',
          'Nomor surat keluar akan otomatis tercatat sesuai urutan.',
        ],
      },
      {
        subtitle: 'Membuat Disposisi',
        steps: [
          'Dari halaman Surat Masuk, klik tombol Disposisi pada surat yang ingin didisposisi.',
          'Pilih penerima disposisi (misal: Waka Kurikulum, Waka Kesiswaan).',
          'Tulis catatan atau instruksi disposisi.',
          'Klik Kirim Disposisi. Penerima akan bisa melihatnya di menu mereka.',
        ],
      },
    ],
  },
  {
    title: 'Keuangan (Nota BON & Bendahara)',
    icon: 'fa-wallet',
    content: [
      {
        subtitle: 'Membuat Nota BON (Pengajuan Dana)',
        steps: [
          'Buka menu Nota Bon di sidebar.',
          'Klik + Buat Nota BON Baru.',
          'Isi keperluan, rincian item, jumlah, dan penerima.',
          'Klik Simpan. Nota BON tersimpan di Google Sheets.',
          'Untuk mencetak nota, klik ikon Print pada baris nota yang dimaksud.',
        ],
      },
      {
        subtitle: 'Realisasi Pengeluaran',
        steps: [
          'Di halaman Nota BON, buka tab Realisasi.',
          'Pilih bulan dan klik Tampilkan.',
          'Klik tombol Realisasi pada baris dana yang ingin direalisasikan.',
          'Isi jumlah realisasi aktual dan keterangan, lalu Simpan.',
          'Kolom Sisa Saldo akan otomatis terhitung.',
        ],
      },
      {
        subtitle: 'Laporan Keuangan Bulanan',
        steps: [
          'Di menu Nota BON, buka tab Laporan.',
          'Pilih bulan dan tahun, lalu klik Tampilkan.',
          'Laporan menampilkan total pengajuan, total realisasi, dan sisa saldo.',
          'Gunakan tombol Export untuk mengunduh laporan ke Excel.',
        ],
      },
    ],
  },
  {
    title: 'Loker Digital & Arsip',
    icon: 'fa-folder-open',
    content: [
      {
        subtitle: 'Menggunakan Loker Digital',
        steps: [
          'Buka menu Loker Digital di sidebar.',
          'Klik + Upload Dokumen untuk mengunggah file (PDF, Word, Excel, gambar).',
          'Isi nama dokumen dan kategori, lalu klik Simpan.',
          'File tersimpan di Google Drive sekolah.',
          'Klik ikon Unduh untuk mengunduh, atau ikon Hapus untuk menghapus dokumen.',
        ],
      },
      {
        subtitle: 'Arsip Foto',
        steps: [
          'Buka menu Arsip Foto di sidebar.',
          'Foto-foto kegiatan madrasah ditampilkan dalam galeri.',
          'Klik + Upload Foto untuk menambah foto baru.',
          'Isi judul kegiatan dan tanggal, lalu pilih file foto.',
          'Klik Simpan. Foto tersimpan di Google Drive dan tampil di galeri.',
        ],
      },
    ],
  },
  {
    title: 'EMIS & Data Induk',
    icon: 'fa-database',
    content: [
      {
        subtitle: 'Mengelola Data EMIS',
        steps: [
          'Buka menu EMIS di sidebar.',
          'Data EMIS menampilkan rekap statistik siswa untuk keperluan laporan ke Kemenag.',
          'Gunakan filter Kelas untuk melihat data per rombel.',
          'Data ini otomatis tersinkron dari Data Siswa yang sudah diinput.',
          'Klik Export untuk mengunduh data dalam format Excel sesuai format EMIS.',
        ],
      },
    ],
  },
  {
    title: 'Buku Tamu',
    icon: 'fa-address-book',
    content: [
      {
        subtitle: 'Mencatat Tamu',
        steps: [
          'Buka menu Buku Tamu di sidebar.',
          'Klik + Tambah Tamu.',
          'Isi nama tamu, instansi, keperluan, dan waktu kedatangan.',
          'Klik Simpan.',
          'Ketika tamu meninggalkan madrasah, klik tombol Keluar untuk mencatat waktu kepulangan.',
          'Riwayat kunjungan tamu tersimpan dan bisa diekspor ke Excel.',
        ],
      },
    ],
  },
  {
    title: 'Sajian Data & Statistik',
    icon: 'fa-chart-pie',
    content: [
      {
        subtitle: 'Melihat Sajian Data',
        steps: [
          'Buka menu Sajian Data di sidebar.',
          'Halaman menampilkan grafik dan statistik terkini: jumlah siswa per kelas, rekap kehadiran, dll.',
          'Data diperbarui secara otomatis dari seluruh input yang sudah dilakukan.',
          'Gunakan menu ini untuk presentasi atau pelaporan cepat kepada kepala madrasah.',
        ],
      },
    ],
  },
  {
    title: 'Survey Madrasah',
    icon: 'fa-poll-h',
    content: [
      {
        subtitle: 'Membuat & Mengelola Survey',
        steps: [
          'Buka menu Survey Madrasah di sidebar.',
          'Klik + Buat Survey Baru.',
          'Isi judul survey dan tambahkan daftar pertanyaan.',
          'Klik Publikasikan agar bisa diisi oleh responden.',
          'Bagikan tautan survey kepada guru atau wali murid.',
          'Hasil survey bisa dilihat di tab Hasil Survey dalam bentuk grafik dan rekap jawaban.',
        ],
      },
    ],
  },
];

const sectionData: Record<Role, Section[]> = {
  guru: guruSections,
  piket: piketSections,
  admin: adminSections,
};

export default function PanduanPage() {
  const [activeRole, setActiveRole] = useState<Role>('guru');
  const [openSections, setOpenSections] = useState<string[]>([]);

  const toggleSection = (title: string) => {
    setOpenSections(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const roles: { key: Role; label: string; icon: string; desc: string }[] = [
    { key: 'guru', label: 'Guru', icon: 'fa-chalkboard-teacher', desc: 'Presensi, Jurnal Mengajar, Absensi GTK, Pengembalian Rapor' },
    { key: 'piket', label: 'Guru Piket', icon: 'fa-school', desc: 'Input Presensi Piket, Jurnal Piket, Dispo Siswa' },
    { key: 'admin', label: 'Admin / TU', icon: 'fa-user-shield', desc: 'Semua fitur: SPMB, Keuangan, Rapor, Persuratan, dll.' },
  ];

  const sections = sectionData[activeRole];

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ background: '#237227', color: 'white', borderRadius: 10, padding: '6px 12px', fontSize: '1rem' }}>
            <i className="fas fa-book-open"></i>
          </span>
          Panduan Penggunaan Aplikasi
        </h1>
        <p style={{ color: '#64748b', marginTop: 8, marginBottom: 0 }}>
          Sistem Informasi Administrasi Digital — MTs Almaarif 01 Singosari
        </p>
      </div>

      {/* Role Selector */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        {roles.map(r => (
          <button
            key={r.key}
            onClick={() => { setActiveRole(r.key); setOpenSections([]); }}
            style={{
              flex: 1,
              minWidth: 200,
              padding: '14px 16px',
              borderRadius: 12,
              border: `2px solid ${activeRole === r.key ? '#237227' : '#e2e8f0'}`,
              background: activeRole === r.key ? '#f0fdf4' : 'white',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <i className={`fas ${r.icon}`} style={{ color: activeRole === r.key ? '#237227' : '#94a3b8', fontSize: '1.1rem' }}></i>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: activeRole === r.key ? '#237227' : '#1e293b' }}>{r.label}</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>{r.desc}</p>
          </button>
        ))}
      </div>

      {/* Expand All / Collapse All */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setOpenSections(sections.map(s => s.title))}
          style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.82rem', color: '#475569' }}
        >
          <i className="fas fa-expand-alt" style={{ marginRight: 6 }}></i>Buka Semua
        </button>
        <button
          onClick={() => setOpenSections([])}
          style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.82rem', color: '#475569' }}
        >
          <i className="fas fa-compress-alt" style={{ marginRight: 6 }}></i>Tutup Semua
        </button>
      </div>

      {/* Sections Accordion */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sections.map((section) => {
          const isOpen = openSections.includes(section.title);
          return (
            <div
              key={section.title}
              style={{
                border: `1px solid ${isOpen ? '#86efac' : '#e2e8f0'}`,
                borderRadius: 12,
                overflow: 'hidden',
                background: 'white',
                boxShadow: isOpen ? '0 2px 8px rgba(35,114,39,0.08)' : 'none',
                transition: 'box-shadow 0.2s',
              }}
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.title)}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  background: isOpen ? '#f0fdf4' : 'white',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  textAlign: 'left',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isOpen ? '#237227' : '#f1f5f9', flexShrink: 0,
                  }}>
                    <i className={`fas ${section.icon}`} style={{ color: isOpen ? 'white' : '#64748b', fontSize: '0.9rem' }}></i>
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>{section.title}</span>
                </div>
                <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: '0.8rem', flexShrink: 0 }}></i>
              </button>

              {/* Section Content */}
              {isOpen && (
                <div style={{ padding: '4px 20px 20px 20px' }}>
                  {section.content.map((sub) => (
                    <div key={sub.subtitle} style={{ marginTop: 16 }}>
                      <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#237227', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fas fa-play-circle" style={{ fontSize: '0.75rem' }}></i>
                        {sub.subtitle}
                      </h3>
                      <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {sub.steps.map((step, i) => (
                          <li key={i} style={{ fontSize: '0.88rem', color: '#374151', lineHeight: 1.6 }}>
                            {step.startsWith('Catatan:') ? (
                              <span style={{
                                display: 'inline-block',
                                background: '#fefce8',
                                border: '1px solid #fde047',
                                borderRadius: 6,
                                padding: '4px 10px',
                                fontSize: '0.82rem',
                                color: '#713f12',
                              }}>
                                <i className="fas fa-lightbulb" style={{ marginRight: 6, color: '#ca8a04' }}></i>
                                {step}
                              </span>
                            ) : step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div style={{
        marginTop: 32,
        padding: '14px 18px',
        background: '#f8fafc',
        borderRadius: 10,
        border: '1px solid #e2e8f0',
        fontSize: '0.82rem',
        color: '#64748b',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}>
        <i className="fas fa-info-circle" style={{ color: '#3b82f6', marginTop: 2, flexShrink: 0 }}></i>
        <span>
          Jika mengalami kendala teknis atau ada fitur yang belum berfungsi, silakan hubungi admin sistem. Panduan ini akan diperbarui seiring pengembangan aplikasi.
        </span>
      </div>
    </div>
  );
}
