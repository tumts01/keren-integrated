'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import PortalHeaderBrand from '@/components/PortalHeaderBrand';
import PortalFooter from '@/components/PortalFooter';

export default function PortalSurveyMadrasah() {
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [activeSurvey, setActiveSurvey] = useState<'wali_murid' | 'siswa' | 'kepuasan_ortu' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Status whether already submitted
  const [surveyStatus, setSurveyStatus] = useState({
    wali_murid: false,
    siswa: false,
    kepuasan_ortu: false,
  });

  // Forms data
  const [formWaliMurid, setFormWaliMurid] = useState({
    namaOrtu: '',
    alasanMemilih: [] as string[],
    alasanLain: '',
    sumberInfo: [] as string[],
    sumberInfoLain: '',
    saran: ''
  });

  const [formSiswa, setFormSiswa] = useState({
    alasanMemilih: [] as string[],
    alasanLain: '',
    sumberInfo: [] as string[],
    harapan: ''
  });

  const [formOrtu, setFormOrtu] = useState({
    namaWali: '',
    q1: '', q2: '', q3: '', q4: '', q5: '', q6: '', q7: '', q8: '', q9: '', q10: ''
  });

  // Options & Questions
  const alasanWaliMurid = [
    'Dekat dengan tempat tinggal',
    'Memiliki banyak program unggulan',
    'Biaya pendidikan sangat terjangkau',
    'Maju/Unggul dan berkualitas',
    'Dikelilingi oleh banyak pondok pesantren',
    'Lingkungan mendukung, aman dan nyaman ramah anak',
    'Sarana Prasarana memadai dan sangat mendukung proses Pembelajaran',
    'Menyediakan banyak pilihan Kegiatan ekstra kurikuler',
    'Menyelenggarakan kegiatan pembelajaran di luar Madrasah/alam bebas',
    'Memiliki Banyak kegiatan pembiasaan untuk mendukung pembelajaran dan pembentukan karaktet',
    'Pendiri dan pembina banyak dari tokoh kharismatik/ulama',
    'Menerapkan model pembelajaran yang menyenangkan dan bermakna',
    'Menyelenggarakan kelas sesuai dengan minat anak',
    'Lulusannya unggul/berkualitas dan banyak mengabdi di berbagai bidang',
    'Gurunya memiliki kemampuan yang baik dalam mengajar',
    'Mengutamakan pendidikan karakter (Akhlak Mulia)',
    'Mengajarkan Wawasan Ahlussunnah waljamaah an Nahdhiyah',
    'Saya alumni MTs Almaarif 01 Singosari',
    'Atas saran dari pengasuh pondok pesantren'
  ];

  const infoWaliMurid = [
    'Dari tetangga/teman',
    'Dari alumni',
    'Dari pengasuh pesantren',
    'Dari guru MTs Almaarif',
    'Dari Web/IG/Tik tok MTs Almaarif',
    'Dari dikoran/majalah',
    'Dari brosur',
    'Dari kegiatan yang diadakan oleh MTs'
  ];

  const alasanSiswa = [
    'MTs Almaarif 01 dekat dengan rumah saya',
    'MTs Almaarif 01 memiliki banyak program unggulan',
    'MTs Almaarif 01 maju dan berkualitas',
    'MTs Almaarif 01 dikelilingi pondok pesantren',
    'MTs Almaarif 01 Lingkungannya mendukung, aman dan nyaman',
    'Di MTs Almaarif 01 sarana prasarana memadai dan sangat mendukung proses pembelajaran',
    'MTs Almaarif 01 memiliki banyak pilihan kegiatan ekstra kurikuler',
    'MTs Almaarif 01 memiliki program kegiatan pembelajaran di luar madrasah/alam bebas',
    'MTs Almaarif 01 memiliki banyak kegiatan pembiasaan untuk mendukung pembelajaran',
    'MTs Almaarif 01 menerapkan model pembelajaran yang menyenangkan dan bermakna',
    'Lulusan MTs Almaarif berkualitas, dan berakhlak',
    'Guru-guru di MTs Almaarif 01 memiliki kemampuan yang baik dalam mengajar, ramah dan sopan',
    'MTs Almaarif 01 mengutamakan pendidikan karakter (Akhlak Mulia)',
    'MTs Almaarif 01 mengajarkan wawasan Ahlussunnah waljamaah an Nahdhiyah'
  ];

  const infoSiswa = [
    'Dari tetangga/teman',
    'Dari alumni',
    'Dari pengasuh pesantren',
    'Dari guru MTs Almaarif',
    'Dari Web/IG MTs Almaarif',
    'Dari berita dikoran',
    'Dari brosur',
    'Dari kegiatan yang diadakan oleh MTs',
    'Dari Guru di Madrasah (MI)/ Sekolah (SD)'
  ];

  const pertanyaanOrtu = [
    'Pelayanan administrasi dilakukan dengan ramah dan sopan.',
    'Pegawai memberikan pelayanan yang cepat dan membantu.',
    'Lingkungan madrasah bersih dan nyaman.',
    'Keamanan lingkungan madrasah sudah baik.',
    'Guru memberikan perhatian terhadap perkembangan belajar siswa.',
    'Guru bersikap adil kepada seluruh siswa.',
    'Informasi tugas dan nilai disampaikan dengan jelas.',
    'Wali kelas mudah dihubungi saat diperlukan.',
    'Madrasah melibatkan orang tua ketika diperlukan dalam penyelesaian masalah siswa.',
    'Anak saya merasa aman dan nyaman selama berada di madrasah.'
  ];

  const likertOptions = ['Sangat Setuju', 'Setuju', 'Kurang Setuju', 'Sangat Tidak Setuju'];

  // Check Session
  useEffect(() => {
    const sessionStr = localStorage.getItem('portal_session');
    if (!sessionStr) {
      router.replace('/portal/login');
      return;
    }
    try {
      const parsed = JSON.parse(sessionStr);
      setStudent(parsed);

      const ortuName = parsed.namaAyah || parsed.namaIbu || '';
      setFormWaliMurid(prev => ({ ...prev, namaOrtu: ortuName }));
      setFormOrtu(prev => ({ ...prev, namaWali: ortuName }));

      // Fetch Survey Status
      const q = new URLSearchParams();
      if (parsed.nisn) q.set('nisn', parsed.nisn);
      if (parsed.nama) q.set('nama', parsed.nama);

      fetch(`/api/portal/survey?${q.toString()}`)
        .then(r => r.json())
        .then(res => {
          if (res.success && res.status) {
            setSurveyStatus(res.status);
          }
        })
        .catch(err => console.error('Fetch survey status error:', err))
        .finally(() => setLoadingStatus(false));

    } catch {
      router.replace('/portal/login');
    }
  }, [router]);

  if (!student) return null;

  const isKelas7 = /^(7|VII)/i.test(String(student.kelas || '').trim());

  // Checkbox helpers
  const handleCheckboxToggle = (list: string[], item: string, setter: (val: string[]) => void) => {
    if (list.includes(item)) {
      setter(list.filter(x => x !== item));
    } else {
      setter([...list, item]);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent, type: 'wali_murid' | 'siswa' | 'kepuasan_ortu') => {
    e.preventDefault();
    setSubmitting(true);

    let payload: any = {};

    if (type === 'wali_murid') {
      let finalAlasan = [...formWaliMurid.alasanMemilih];
      if (formWaliMurid.alasanLain.trim()) finalAlasan.push(`Lainnya: ${formWaliMurid.alasanLain.trim()}`);

      let finalInfo = [...formWaliMurid.sumberInfo];
      if (formWaliMurid.sumberInfoLain.trim()) finalInfo.push(`Lainnya: ${formWaliMurid.sumberInfoLain.trim()}`);

      payload = {
        'Nama Wali Murid': student.nama, // For backward compatibility with existing rekap
        'Nama Orang Tua': formWaliMurid.namaOrtu.trim() || student.namaAyah || student.namaIbu || '',
        'Nama Siswa': student.nama,
        'Kelas': student.kelas,
        'Alasan Memilih MTs': finalAlasan.join(', '),
        'Sumber Informasi': finalInfo.join(', '),
        'Saran & Masukan': formWaliMurid.saran.trim()
      };
    } else if (type === 'siswa') {
      let finalAlasan = [...formSiswa.alasanMemilih];
      if (formSiswa.alasanLain.trim()) finalAlasan.push(`Lainnya: ${formSiswa.alasanLain.trim()}`);

      payload = {
        'Nama Siswa': student.nama,
        'Kelas': student.kelas,
        'Alasan Memilih MTs': finalAlasan.join(', '),
        'Sumber Informasi': formSiswa.sumberInfo.join(', '),
        'Harapan Ke Depan': formSiswa.harapan.trim()
      };
    } else if (type === 'kepuasan_ortu') {
      payload = {
        'Nama Wali Murid': formOrtu.namaWali.trim() || student.namaAyah || student.namaIbu || '',
        'Nama Siswa': student.nama,
        'Kelas Siswa': student.kelas,
        'Q1: Administrasi Ramah': formOrtu.q1,
        'Q2: Pelayanan Cepat': formOrtu.q2,
        'Q3: Lingkungan Bersih': formOrtu.q3,
        'Q4: Keamanan Baik': formOrtu.q4,
        'Q5: Perhatian Guru': formOrtu.q5,
        'Q6: Guru Adil': formOrtu.q6,
        'Q7: Info Jelas': formOrtu.q7,
        'Q8: Wali Kelas Dihubungi': formOrtu.q8,
        'Q9: Melibatkan Ortu': formOrtu.q9,
        'Q10: Anak Aman Nyaman': formOrtu.q10,
      };
    }

    try {
      const res = await fetch('/api/portal/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyType: type,
          data: payload,
          student: {
            nisn: student.nisn,
            nis: student.nis,
            nama: student.nama,
            kelas: student.kelas,
            namaAyah: student.namaAyah,
            namaIbu: student.namaIbu
          }
        })
      });

      const json = await res.json();
      if (json.success) {
        Swal.fire({
          icon: 'success',
          title: 'Terima Kasih!',
          text: 'Jawaban survey Anda telah berhasil disimpan.',
          confirmButtonColor: '#4f46e5'
        });
        setSurveyStatus(prev => ({ ...prev, [type]: true }));
        setActiveSurvey(null);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Mengirim',
          text: json.error || 'Terjadi kesalahan sistem'
        });
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Kesalahan Jaringan',
        text: err.message
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="portal-container" style={{ paddingBottom: '40px' }}>
      <PortalHeaderBrand />

      {/* Header */}
      <div className="portal-header" style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
        padding: '18px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px'
      }}>
        <button
          onClick={() => {
            if (activeSurvey) setActiveSurvey(null);
            else router.push('/portal/dashboard');
          }}
          style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer', padding: '4px' }}
          title="Kembali"
        >
          <i className="fas fa-arrow-left"></i>
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Survey Madrasah</h2>
          <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
            {student.nama} • Kelas {student.kelas}
          </div>
        </div>
      </div>

      <div className="portal-content" style={{ marginTop: '16px' }}>

        {/* RESTRICTION: KHUSUS KELAS 7 */}
        {!isKelas7 ? (
          <div className="portal-card" style={{ textAlign: 'center', padding: '36px 20px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#eef2ff',
              color: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              margin: '0 auto 16px'
            }}>
              <i className="fas fa-info-circle"></i>
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
              Khusus Siswa & Wali Murid Kelas 7
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, margin: '0 0 24px 0' }}>
              Mohon maaf, pengisian Survey Madrasah saat ini dikhususkan bagi siswa dan orang tua / wali murid <strong>Kelas 7</strong>. Ananda terdaftar di kelas <strong>{student.kelas || '-'}</strong>.
            </p>
            <button
              onClick={() => router.push('/portal/dashboard')}
              style={{
                background: '#4f46e5',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              &larr; Kembali ke Dashboard
            </button>
          </div>
        ) : (
          <>
            {/* VIEW 1: PILIHAN ANGKET */}
            {!activeSurvey && (
              <>
                <div style={{
                  background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  border: '1px solid #c7d2fe',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <i className="fas fa-bullhorn" style={{ color: '#4f46e5', fontSize: '18px', marginTop: '2px' }}></i>
                    <div style={{ fontSize: '12.5px', color: '#3730a3', lineHeight: 1.5 }}>
                      Selamat datang di <strong>Survey Madrasah</strong>. Mohon kesediaan Bapak/Ibu Wali Murid dan Ananda untuk meluangkan waktu mengisi angket di bawah ini demi peningkatan kualitas madrasah.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                  {/* 1. Angket Persepsi Wali Murid */}
                  <div
                    onClick={() => setActiveSurvey('wali_murid')}
                    className="portal-card"
                    style={{
                      cursor: 'pointer',
                      border: surveyStatus.wali_murid ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: '#ede9fe',
                          color: '#7c3aed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px'
                        }}>
                          <i className="fas fa-user-friends"></i>
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>
                            Angket Persepsi Wali Murid
                          </h4>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>Diisi oleh Orang Tua / Wali</span>
                        </div>
                      </div>

                      {surveyStatus.wali_murid ? (
                        <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: '10.5px', fontWeight: 800, padding: '3px 8px', borderRadius: '12px' }}>
                          <i className="fas fa-check-circle"></i> Sudah Diisi
                        </span>
                      ) : (
                        <span style={{ background: '#fef3c7', color: '#d97706', fontSize: '10.5px', fontWeight: 800, padding: '3px 8px', borderRadius: '12px' }}>
                          Belum Diisi
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                      Alasan memilih madrasah, sumber informasi, serta saran untuk MTs Almaarif 01 Singosari.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {surveyStatus.wali_murid ? 'Buka / Isi Ulang' : 'Mulai Isi Angket'} &rarr;
                      </span>
                    </div>
                  </div>

                  {/* 2. Angket Persepsi Siswa */}
                  <div
                    onClick={() => setActiveSurvey('siswa')}
                    className="portal-card"
                    style={{
                      cursor: 'pointer',
                      border: surveyStatus.siswa ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: '#e0f2fe',
                          color: '#0284c7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px'
                        }}>
                          <i className="fas fa-user-graduate"></i>
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>
                            Angket Persepsi Siswa
                          </h4>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>Diisi oleh Siswa / Ananda</span>
                        </div>
                      </div>

                      {surveyStatus.siswa ? (
                        <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: '10.5px', fontWeight: 800, padding: '3px 8px', borderRadius: '12px' }}>
                          <i className="fas fa-check-circle"></i> Sudah Diisi
                        </span>
                      ) : (
                        <span style={{ background: '#fef3c7', color: '#d97706', fontSize: '10.5px', fontWeight: 800, padding: '3px 8px', borderRadius: '12px' }}>
                          Belum Diisi
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                      Alasan memilih belajar di MTs, darimana memperoleh info, serta harapan ananda ke depan.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {surveyStatus.siswa ? 'Buka / Isi Ulang' : 'Mulai Isi Angket'} &rarr;
                      </span>
                    </div>
                  </div>

                  {/* 3. Angket Kepuasan Orang Tua */}
                  <div
                    onClick={() => setActiveSurvey('kepuasan_ortu')}
                    className="portal-card"
                    style={{
                      cursor: 'pointer',
                      border: surveyStatus.kepuasan_ortu ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: '#fce7f3',
                          color: '#db2777',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px'
                        }}>
                          <i className="fas fa-heart"></i>
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>
                            Angket Kepuasan Orang Tua
                          </h4>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>Penilaian Layanan Madrasah</span>
                        </div>
                      </div>

                      {surveyStatus.kepuasan_ortu ? (
                        <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: '10.5px', fontWeight: 800, padding: '3px 8px', borderRadius: '12px' }}>
                          <i className="fas fa-check-circle"></i> Sudah Diisi
                        </span>
                      ) : (
                        <span style={{ background: '#fef3c7', color: '#d97706', fontSize: '10.5px', fontWeight: 800, padding: '3px 8px', borderRadius: '12px' }}>
                          Belum Diisi
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                      Penilaian kepuasan terhadap pelayanan administrasi, pengajaran guru, dan kenyamanan lingkungan.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#db2777', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {surveyStatus.kepuasan_ortu ? 'Buka / Isi Ulang' : 'Mulai Isi Angket'} &rarr;
                      </span>
                    </div>
                  </div>

                </div>
              </>
            )}

            {/* FORM 1: ANGKET PERSEPSI WALI MURID */}
            {activeSurvey === 'wali_murid' && (
              <form onSubmit={e => handleSubmit(e, 'wali_murid')} className="portal-card" style={{ padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveSurvey(null)}
                    style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <i className="fas fa-arrow-left"></i> Menu Survey
                  </button>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Angket Wali Murid</span>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Nama Siswa:
                  </label>
                  <input
                    type="text"
                    value={`${student.nama} (${student.kelas})`}
                    disabled
                    style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '13px', fontWeight: 700, color: '#334155' }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Nama Orang Tua / Wali Murid:
                  </label>
                  <input
                    type="text"
                    value={formWaliMurid.namaOrtu}
                    onChange={e => setFormWaliMurid({ ...formWaliMurid, namaOrtu: e.target.value })}
                    placeholder="Contoh: Heri Jatmiko / Siti Aminah"
                    style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                  />
                </div>

                {/* Pertanyaan A */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', lineHeight: 1.4 }}>
                    A. Mengapa Bapak/Ibu memilih MTs Almaarif sebagai tempat pendidikan untuk putra putrinya? <br />
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 400 }}>* Bisa memilih lebih dari satu jawaban</span>
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {alasanWaliMurid.map((item, idx) => {
                      const isChecked = formWaliMurid.alasanMemilih.includes(item);
                      return (
                        <div
                          key={idx}
                          onClick={() => handleCheckboxToggle(formWaliMurid.alasanMemilih, item, (v) => setFormWaliMurid({ ...formWaliMurid, alasanMemilih: v }))}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: isChecked ? '1.5px solid #6366f1' : '1px solid #e2e8f0',
                            background: isChecked ? '#f5f3ff' : '#ffffff',
                            cursor: 'pointer'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            style={{ marginTop: '2px', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '12px', color: isChecked ? '#4338ca' : '#334155', lineHeight: 1.4, fontWeight: isChecked ? 600 : 400 }}>
                            {item}
                          </span>
                        </div>
                      );
                    })}

                    <div style={{ marginTop: '4px' }}>
                      <input
                        type="text"
                        value={formWaliMurid.alasanLain}
                        onChange={e => setFormWaliMurid({ ...formWaliMurid, alasanLain: e.target.value })}
                        placeholder="Alasan lainnya (tulis di sini jika ada)..."
                        style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Pertanyaan B */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', lineHeight: 1.4 }}>
                    B. Bagaimana Bapak/Ibu mendapatkan informasi tentang MTs Almaarif 01? <br />
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 400 }}>* Bisa memilih lebih dari satu jawaban</span>
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {infoWaliMurid.map((item, idx) => {
                      const isChecked = formWaliMurid.sumberInfo.includes(item);
                      return (
                        <div
                          key={idx}
                          onClick={() => handleCheckboxToggle(formWaliMurid.sumberInfo, item, (v) => setFormWaliMurid({ ...formWaliMurid, sumberInfo: v }))}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: isChecked ? '1.5px solid #6366f1' : '1px solid #e2e8f0',
                            background: isChecked ? '#f5f3ff' : '#ffffff',
                            cursor: 'pointer'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '12px', color: isChecked ? '#4338ca' : '#334155', fontWeight: isChecked ? 600 : 400 }}>
                            {item}
                          </span>
                        </div>
                      );
                    })}

                    <div style={{ marginTop: '4px' }}>
                      <input
                        type="text"
                        value={formWaliMurid.sumberInfoLain}
                        onChange={e => setFormWaliMurid({ ...formWaliMurid, sumberInfoLain: e.target.value })}
                        placeholder="Sumber info lainnya (jika ada)..."
                        style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Pertanyaan C */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                    C. Apa saran Bapak/Ibu Wali Murid untuk MTs Almaarif 01 Singosari agar ke depan lebih baik dan unggul?
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={formWaliMurid.saran}
                    onChange={e => setFormWaliMurid({ ...formWaliMurid, saran: e.target.value })}
                    placeholder="Tuliskan saran dan masukan Bapak/Ibu di sini..."
                    style={{ width: '100%', padding: '10px 12px', boxSizing: 'border-box', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', lineHeight: 1.5 }}
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={submitting || (formWaliMurid.alasanMemilih.length === 0 && !formWaliMurid.alasanLain.trim()) || (formWaliMurid.sumberInfo.length === 0 && !formWaliMurid.sumberInfoLain.trim())}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: (formWaliMurid.alasanMemilih.length > 0 || formWaliMurid.alasanLain.trim()) ? '#4f46e5' : '#94a3b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: submitting ? 'wait' : 'pointer',
                    boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)'
                  }}
                >
                  {submitting ? 'Menyimpan...' : 'Kirim Angket Wali Murid'}
                </button>
              </form>
            )}

            {/* FORM 2: ANGKET PERSEPSI SISWA */}
            {activeSurvey === 'siswa' && (
              <form onSubmit={e => handleSubmit(e, 'siswa')} className="portal-card" style={{ padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveSurvey(null)}
                    style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <i className="fas fa-arrow-left"></i> Menu Survey
                  </button>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Angket Siswa</span>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Nama Siswa:
                  </label>
                  <input
                    type="text"
                    value={`${student.nama} (${student.kelas})`}
                    disabled
                    style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '13px', fontWeight: 700, color: '#334155' }}
                  />
                </div>

                {/* Pertanyaan A */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', lineHeight: 1.4 }}>
                    A. Mengapa Ananda memilih MTs Almaarif sebagai tempat belajar dan menuntut ilmu? Karena… <br />
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 400 }}>* Bisa memilih lebih dari satu jawaban</span>
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {alasanSiswa.map((item, idx) => {
                      const isChecked = formSiswa.alasanMemilih.includes(item);
                      return (
                        <div
                          key={idx}
                          onClick={() => handleCheckboxToggle(formSiswa.alasanMemilih, item, (v) => setFormSiswa({ ...formSiswa, alasanMemilih: v }))}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: isChecked ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                            background: isChecked ? '#f0f9ff' : '#ffffff',
                            cursor: 'pointer'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            style={{ marginTop: '2px', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '12px', color: isChecked ? '#0369a1' : '#334155', lineHeight: 1.4, fontWeight: isChecked ? 600 : 400 }}>
                            {item}
                          </span>
                        </div>
                      );
                    })}

                    <div style={{ marginTop: '4px' }}>
                      <input
                        type="text"
                        value={formSiswa.alasanLain}
                        onChange={e => setFormSiswa({ ...formSiswa, alasanLain: e.target.value })}
                        placeholder="Alasan lainnya (tulis di sini jika ada)..."
                        style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Pertanyaan B */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', lineHeight: 1.4 }}>
                    B. Bagaimana Ananda mendapatkan informasi tentang MTs Almaarif 01 Singosari? <br />
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 400 }}>* Bisa memilih lebih dari satu jawaban</span>
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {infoSiswa.map((item, idx) => {
                      const isChecked = formSiswa.sumberInfo.includes(item);
                      return (
                        <div
                          key={idx}
                          onClick={() => handleCheckboxToggle(formSiswa.sumberInfo, item, (v) => setFormSiswa({ ...formSiswa, sumberInfo: v }))}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: isChecked ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                            background: isChecked ? '#f0f9ff' : '#ffffff',
                            cursor: 'pointer'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '12px', color: isChecked ? '#0369a1' : '#334155', fontWeight: isChecked ? 600 : 400 }}>
                            {item}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pertanyaan C */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                    C. Apa harapan Ananda untuk MTs Almaarif ke depan?
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={formSiswa.harapan}
                    onChange={e => setFormSiswa({ ...formSiswa, harapan: e.target.value })}
                    placeholder="Tuliskan harapanmu di sini..."
                    style={{ width: '100%', padding: '10px 12px', boxSizing: 'border-box', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', lineHeight: 1.5 }}
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={submitting || (formSiswa.alasanMemilih.length === 0 && !formSiswa.alasanLain.trim()) || formSiswa.sumberInfo.length === 0}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: (formSiswa.alasanMemilih.length > 0 || formSiswa.alasanLain.trim()) ? '#0284c7' : '#94a3b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: submitting ? 'wait' : 'pointer',
                    boxShadow: '0 4px 10px rgba(2, 132, 199, 0.3)'
                  }}
                >
                  {submitting ? 'Menyimpan...' : 'Kirim Angket Siswa'}
                </button>
              </form>
            )}

            {/* FORM 3: ANGKET KEPUASAN ORANG TUA */}
            {activeSurvey === 'kepuasan_ortu' && (
              <form onSubmit={e => handleSubmit(e, 'kepuasan_ortu')} className="portal-card" style={{ padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveSurvey(null)}
                    style={{ background: 'none', border: 'none', color: '#db2777', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <i className="fas fa-arrow-left"></i> Menu Survey
                  </button>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Kepuasan Layanan</span>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Nama Siswa:
                  </label>
                  <input
                    type="text"
                    value={`${student.nama} (${student.kelas})`}
                    disabled
                    style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '13px', fontWeight: 700, color: '#334155' }}
                  />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Nama Orang Tua / Wali (Opsional):
                  </label>
                  <input
                    type="text"
                    value={formOrtu.namaWali}
                    onChange={e => setFormOrtu({ ...formOrtu, namaWali: e.target.value })}
                    placeholder="Nama Bapak / Ibu..."
                    style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                    Silakan berikan penilaian Bapak/Ibu terhadap pernyataan berikut:
                  </span>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {pertanyaanOrtu.map((q, idx) => {
                      const qKey = `q${idx + 1}` as keyof typeof formOrtu;
                      const selectedVal = formOrtu[qKey];
                      return (
                        <div key={idx} style={{
                          background: '#f8fafc',
                          borderRadius: '10px',
                          padding: '12px',
                          border: selectedVal ? '1px solid #cbd5e1' : '1px solid #e2e8f0'
                        }}>
                          <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1e293b', marginBottom: '10px', lineHeight: 1.4 }}>
                            {idx + 1}. {q}
                          </div>

                          {/* Options grid */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                            {likertOptions.map(opt => {
                              const isChecked = selectedVal === opt;
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setFormOrtu({ ...formOrtu, [qKey]: opt })}
                                  style={{
                                    padding: '8px 10px',
                                    borderRadius: '6px',
                                    border: isChecked ? '1.5px solid #db2777' : '1px solid #e2e8f0',
                                    background: isChecked ? '#fdf2f8' : '#ffffff',
                                    color: isChecked ? '#be185d' : '#475569',
                                    fontSize: '11px',
                                    fontWeight: isChecked ? 700 : 500,
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    transition: 'all 0.15s'
                                  }}
                                >
                                  {isChecked && <i className="fas fa-check" style={{ marginRight: '4px' }}></i>}
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !formOrtu.q1 || !formOrtu.q2 || !formOrtu.q3 || !formOrtu.q4 || !formOrtu.q5 || !formOrtu.q6 || !formOrtu.q7 || !formOrtu.q8 || !formOrtu.q9 || !formOrtu.q10}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: (formOrtu.q1 && formOrtu.q2 && formOrtu.q3 && formOrtu.q4 && formOrtu.q5 && formOrtu.q6 && formOrtu.q7 && formOrtu.q8 && formOrtu.q9 && formOrtu.q10) ? '#db2777' : '#94a3b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: submitting ? 'wait' : 'pointer',
                    boxShadow: '0 4px 10px rgba(219, 39, 119, 0.3)'
                  }}
                >
                  {submitting ? 'Menyimpan...' : 'Kirim Penilaian Kepuasan'}
                </button>
              </form>
            )}

          </>
        )}

      </div>

      <PortalFooter />
    </div>
  );
}
