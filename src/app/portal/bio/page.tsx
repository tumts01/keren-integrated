'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PortalFooter from '@/components/PortalFooter';
import PortalHeaderBrand from '@/components/PortalHeaderBrand';
import Swal from 'sweetalert2';
export interface BioSiswa {
  hobi: string;
  citaCita: string;
  mediaSosial: string;
  instagram?: string;
  tiktok?: string;
  noHp: string;
  pesanKesan: string;
  updated_at?: string;
}

const QUICK_HOBIES = [
  '⚽ Futsal / Sepakbola',
  '📚 Membaca Buku',
  '🎨 Menggambar / Desain',
  '🎮 Main Game',
  '💻 Coding / IT',
  '🎵 Musik & Menyanyi',
  '📸 Fotografi',
  '🍳 Memasak',
  '🏸 Bulutangkis',
  '🏊 Berenang'
];

const QUICK_DREAMS = [
  '🩺 Dokter',
  '💻 Programmer / Software Engineer',
  '👨‍🏫 Guru / Dosen',
  '🏢 Pengusaha / Entrepreneur',
  '🏛️ Arsitek',
  '👮 Polisi / TNI',
  '📖 Ustadz / Hafidz Qur\'an',
  '🎬 Content Creator',
  '🎨 Desainer Grafis',
  '✈️ Pilot'
];

export default function PortalBioPage() {
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [bio, setBio] = useState<BioSiswa | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formHobi, setFormHobi] = useState('');
  const [formCitaCita, setFormCitaCita] = useState('');
  const [formInstagram, setFormInstagram] = useState('');
  const [formTiktok, setFormTiktok] = useState('');
  const [formMediaSosial, setFormMediaSosial] = useState('');
  const [formNoHp, setFormNoHp] = useState('');
  const [formPesanKesan, setFormPesanKesan] = useState('');

  useEffect(() => {
    const sessionStr = localStorage.getItem('portal_session');
    if (!sessionStr) {
      router.replace('/portal/login');
      return;
    }

    try {
      const parsed = JSON.parse(sessionStr);
      setStudent(parsed);
      fetchBio(parsed);
    } catch {
      router.replace('/portal/login');
    }
  }, []);

  const fetchBio = async (currentStudent: any) => {
    setLoading(true);
    try {
      const nisn = currentStudent.nisn || '';
      const nis = currentStudent.nis || '';
      const res = await fetch(`/api/portal/bio?nisn=${encodeURIComponent(nisn)}&nis=${encodeURIComponent(nis)}&t=${Date.now()}`, {
        cache: 'no-store'
      });
      const json = await res.json();
      if (json.success && json.bio) {
        setBio(json.bio);
        // Pre-fill form
        setFormHobi(json.bio.hobi || '');
        setFormCitaCita(json.bio.citaCita || '');
        setFormInstagram(json.bio.instagram || '');
        setFormTiktok(json.bio.tiktok || '');
        setFormMediaSosial(json.bio.mediaSosial || '');
        setFormNoHp(json.bio.noHp || currentStudent.noHp || '');
        setFormPesanKesan(json.bio.pesanKesan || '');
      }
    } catch (err) {
      console.error('Gagal mengambil data bio:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = () => {
    if (bio) {
      setFormHobi(bio.hobi || '');
      setFormCitaCita(bio.citaCita || '');
      setFormInstagram(bio.instagram || '');
      setFormTiktok(bio.tiktok || '');
      setFormMediaSosial(bio.mediaSosial || '');
      setFormNoHp(bio.noHp || student?.noHp || '');
      setFormPesanKesan(bio.pesanKesan || '');
    }
    setShowEditModal(true);
  };

  const handleSaveBio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    setSaving(true);
    try {
      const payloadBio: BioSiswa = {
        hobi: formHobi.trim(),
        citaCita: formCitaCita.trim(),
        instagram: formInstagram.trim().replace(/^@/, ''),
        tiktok: formTiktok.trim().replace(/^@/, ''),
        mediaSosial: formMediaSosial.trim(),
        noHp: formNoHp.trim(),
        pesanKesan: formPesanKesan.trim()
      };

      const res = await fetch('/api/portal/bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nisn: student.nisn,
          nis: student.nis,
          supabaseId: student.supabaseId,
          bio: payloadBio
        })
      });
      const json = await res.json();

      if (json.success) {
        setBio(json.bio);
        setShowEditModal(false);

        // Update local session
        const updatedStudent = { ...student, bio: json.bio, noHp: payloadBio.noHp || student.noHp };
        setStudent(updatedStudent);
        localStorage.setItem('portal_session', JSON.stringify(updatedStudent));

        const Toast = Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1800,
          timerProgressBar: false
        });
        Toast.fire({
          icon: 'success',
          title: '✨ Bio keren kamu berhasil disimpan!'
        });
      } else {
        Swal.fire('Gagal', json.error || 'Gagal menyimpan bio', 'error');
      }
    } catch (err: any) {
      console.error('Save bio error:', err);
      Swal.fire('Error', err.message || 'Terjadi kesalahan sistem', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Salin teks bio ke clipboard
  const handleCopyBio = () => {
    if (!bio || !student) return;
    const text = `✨ *MY BIO & VIBE — ${student.nama}* ✨\n` +
      `🏫 MTs Almaarif 01 Singosari (${student.kelas || 'Siswa'})\n` +
      `🎯 Cita-cita: ${bio.citaCita || '-'}\n` +
      `🎨 Hobi: ${bio.hobi || '-'}\n` +
      (bio.instagram ? `📸 Instagram: @${bio.instagram}\n` : '') +
      (bio.tiktok ? `🎵 TikTok: @${bio.tiktok}\n` : '') +
      (bio.mediaSosial ? `🌐 Medsos: ${bio.mediaSosial}\n` : '') +
      (bio.noHp ? `📞 WhatsApp: ${bio.noHp}\n` : '') +
      `💬 Pesan/Kesan: "${bio.pesanKesan || '-'}"`;

    navigator.clipboard.writeText(text);
    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
    Toast.fire({ icon: 'success', title: '📋 Bio berhasil disalin ke clipboard!' });
  };

  if (!student) return null;

  const isBioEmpty = !bio || (!bio.hobi && !bio.citaCita && !bio.noHp && !bio.instagram && !bio.tiktok && !bio.mediaSosial && !bio.pesanKesan);

  return (
    <div className="portal-container" style={{ paddingBottom: '90px' }}>
      <PortalHeaderBrand />

      {/* Header Bar */}
      <div style={{
        background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 50%, #be123c 100%)',
        color: 'white',
        padding: '24px 20px 32px 20px',
        borderRadius: '0 0 24px 24px',
        boxShadow: '0 10px 25px -5px rgba(225, 29, 72, 0.35)',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <button
            onClick={() => router.push('/portal/dashboard')}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: 'white',
              padding: '8px 14px',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              backdropFilter: 'blur(6px)'
            }}
          >
            <i className="fas fa-arrow-left"></i> Kembali
          </button>

          <span style={{
            background: 'rgba(255, 255, 255, 0.25)',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '11.5px',
            fontWeight: 700,
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}>
            ✨ Bio & About Me
          </span>
        </div>

        {/* Profil Mini di Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            border: '3px solid rgba(255, 255, 255, 0.8)',
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {student.foto ? (
              <img src={student.foto} alt={student.nama} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <i className="fas fa-user-astronaut" style={{ fontSize: '28px', color: 'white' }}></i>
            )}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, lineHeight: 1.2 }}>
              {student.nama}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '12.5px', opacity: 0.9 }}>
              <span>{student.kelas || 'Siswa'}</span>
              <span>•</span>
              <span>NISN: {student.nisn || '-'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ padding: '20px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: '#f43f5e', marginBottom: '12px' }}></i>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Memuat profil bio keren kamu...</p>
          </div>
        ) : isBioEmpty ? (
          /* Empty State: Belum Diisi */
          <div style={{
            background: 'white',
            border: '2px dashed #fecdd3',
            borderRadius: '20px',
            padding: '36px 20px',
            textAlign: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)',
              color: '#e11d48',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              margin: '0 auto 16px auto'
            }}>
              <i className="fas fa-magic"></i>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
              Bio Kamu Masih Kosong!
            </h2>
            <p style={{ fontSize: '13.5px', color: '#64748b', margin: '0 auto 24px auto', maxWidth: '320px', lineHeight: 1.5 }}>
              Bikin profilmu makin keren dan kekinian. Tuliskan hobi, cita-cita impian, media sosial, dan motto hidupmu di sini!
            </p>
            <button
              onClick={handleOpenEdit}
              style={{
                background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(225, 29, 72, 0.35)'
              }}
            >
              <i className="fas fa-edit"></i> Isi Bio Keren Sekarang
            </button>
          </div>
        ) : (
          /* Data Bio Terisi: Tampilan Kartu Keren */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Kartu Cita-cita (Menonjol & Bercahaya) */}
            <div style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: 'white',
              borderRadius: '18px',
              padding: '18px 20px',
              boxShadow: '0 6px 16px -2px rgba(79, 70, 229, 0.3)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', right: '-12px', bottom: '-12px', opacity: 0.15, fontSize: '90px' }}>
                <i className="fas fa-rocket"></i>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', opacity: 0.85 }}>
                🚀 Cita-cita / Impian Masa Depan
              </div>
              <div style={{ fontSize: '19px', fontWeight: 800, marginTop: '6px', lineHeight: 1.3 }}>
                {bio.citaCita || 'Belum diisi'}
              </div>
            </div>

            {/* Kartu Hobi */}
            <div style={{
              background: 'white',
              border: '1px solid #f1f5f9',
              borderRadius: '18px',
              padding: '18px 20px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e11d48', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
                <i className="fas fa-palette"></i>
                <span>Hobi & Kegemaran</span>
              </div>
              <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#1e293b', lineHeight: 1.5 }}>
                {bio.hobi || 'Belum diisi'}
              </div>
            </div>

            {/* Kartu Media Sosial */}
            <div style={{
              background: 'white',
              border: '1px solid #f1f5f9',
              borderRadius: '18px',
              padding: '18px 20px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284c7', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '12px' }}>
                <i className="fas fa-share-alt"></i>
                <span>Media Sosial & Kontak</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {bio.instagram && (
                  <a
                    href={`https://instagram.com/${bio.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      textDecoration: 'none',
                      background: '#fdf2f8',
                      color: '#db2777',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      fontSize: '13.5px',
                      fontWeight: 700
                    }}
                  >
                    <i className="fab fa-instagram" style={{ fontSize: '18px' }}></i>
                    <span>@{bio.instagram}</span>
                    <i className="fas fa-external-link-alt" style={{ marginLeft: 'auto', fontSize: '11px', opacity: 0.6 }}></i>
                  </a>
                )}

                {bio.tiktok && (
                  <a
                    href={`https://tiktok.com/@${bio.tiktok}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      textDecoration: 'none',
                      background: '#f1f5f9',
                      color: '#0f172a',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      fontSize: '13.5px',
                      fontWeight: 700
                    }}
                  >
                    <i className="fab fa-tiktok" style={{ fontSize: '18px' }}></i>
                    <span>@{bio.tiktok}</span>
                    <i className="fas fa-external-link-alt" style={{ marginLeft: 'auto', fontSize: '11px', opacity: 0.6 }}></i>
                  </a>
                )}

                {bio.mediaSosial && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: '#f8fafc',
                    color: '#334155',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 600
                  }}>
                    <i className="fas fa-globe" style={{ fontSize: '16px', color: '#64748b' }}></i>
                    <span>{bio.mediaSosial}</span>
                  </div>
                )}

                {bio.noHp && (
                  <a
                    href={`https://wa.me/${bio.noHp.replace(/[^0-9]/g, '').replace(/^0/, '62')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      textDecoration: 'none',
                      background: '#ecfdf5',
                      color: '#047857',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      fontSize: '13.5px',
                      fontWeight: 700
                    }}
                  >
                    <i className="fab fa-whatsapp" style={{ fontSize: '18px' }}></i>
                    <span>{bio.noHp}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '11.5px', background: '#10b981', color: 'white', padding: '2px 8px', borderRadius: '6px' }}>
                      Chat WA
                    </span>
                  </a>
                )}

                {!bio.instagram && !bio.tiktok && !bio.mediaSosial && !bio.noHp && (
                  <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Belum ada kontak media sosial</span>
                )}
              </div>
            </div>

            {/* Kartu Pesan / Kesan / Motto */}
            <div style={{
              background: '#fffbeb',
              border: '1.5px solid #fef3c7',
              borderRadius: '18px',
              padding: '18px 20px',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
                <i className="fas fa-quote-left"></i>
                <span>Pesan, Kesan & Motto</span>
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: '#78350f', fontStyle: 'italic', lineHeight: 1.6, fontWeight: 500 }}>
                "{bio.pesanKesan || 'Belajar tiada henti, berbakti tiada henti bersama MTs Almaarif 01 Singosari!'}"
              </p>
            </div>

            {/* Action Bar (Edit & Copy) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
              <button
                onClick={handleOpenEdit}
                style={{
                  background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 10px rgba(225, 29, 72, 0.3)'
                }}
              >
                <i className="fas fa-edit"></i> Edit Bio
              </button>

              <button
                onClick={handleCopyBio}
                style={{
                  background: 'white',
                  color: '#334155',
                  border: '1.5px solid #cbd5e1',
                  padding: '12px',
                  borderRadius: '12px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <i className="fas fa-copy"></i> Salin Bio
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal / Dialog Edit Bio */}
      {showEditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {/* Header Modal */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#fff1f2'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  background: '#f43f5e',
                  color: 'white',
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '15px'
                }}>
                  <i className="fas fa-sparkles"></i>
                </div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#9f1239' }}>
                  Edit Bio Keren Kamu
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSaveBio} style={{ overflowY: 'auto', padding: '18px 20px', flex: 1 }}>
              {/* Field 1: Cita-cita */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
                  🚀 Cita-cita / Impian Kamu <span style={{ color: '#e11d48' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formCitaCita}
                  onChange={e => setFormCitaCita(e.target.value)}
                  placeholder="Contoh: Dokter Spesialis, Software Engineer, Hafidz Qur'an"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {/* Quick Chips Cita-cita */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {QUICK_DREAMS.slice(0, 5).map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormCitaCita(q.replace(/^[^\s]+\s/, ''))}
                      style={{
                        background: '#f1f5f9',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 2: Hobi */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
                  🎨 Hobi & Kegemaran <span style={{ color: '#e11d48' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formHobi}
                  onChange={e => setFormHobi(e.target.value)}
                  placeholder="Contoh: Futsal, Membaca Komik, Coding, Desain Grafis"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {/* Quick Chips Hobi */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {QUICK_HOBIES.slice(0, 5).map((h, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const clean = h.replace(/^[^\s]+\s/, '');
                        setFormHobi(prev => prev ? `${prev}, ${clean}` : clean);
                      }}
                      style={{
                        background: '#fdf2f8',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#be185d',
                        cursor: 'pointer'
                      }}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 3: Media Sosial (Instagram & TikTok) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
                    <i className="fab fa-instagram" style={{ color: '#e1306c' }}></i> Instagram
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px', fontWeight: 700 }}>@</span>
                    <input
                      type="text"
                      value={formInstagram}
                      onChange={e => setFormInstagram(e.target.value.replace(/^@/, ''))}
                      placeholder="username"
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 26px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
                    <i className="fab fa-tiktok"></i> TikTok
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px', fontWeight: 700 }}>@</span>
                    <input
                      type="text"
                      value={formTiktok}
                      onChange={e => setFormTiktok(e.target.value.replace(/^@/, ''))}
                      placeholder="username"
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 26px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Field 4: No HP / WhatsApp & Medsos Lainnya */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
                    <i className="fab fa-whatsapp" style={{ color: '#10b981' }}></i> No HP / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formNoHp}
                    onChange={e => setFormNoHp(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
                    🌐 Medsos Lainnya
                  </label>
                  <input
                    type="text"
                    value={formMediaSosial}
                    onChange={e => setFormMediaSosial(e.target.value)}
                    placeholder="YouTube / X / dll."
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Field 5: Pesan / Kesan / Motto Hidup */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
                  💬 Pesan / Kesan / Motto Hidup Kamu
                </label>
                <textarea
                  value={formPesanKesan}
                  onChange={e => setFormPesanKesan(e.target.value)}
                  rows={3}
                  placeholder="Tuliskan motto hidup, kesan selama belajar di madrasah, atau pesan semangat untuk teman-teman..."
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'none'
                  }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: '10px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(225, 29, 72, 0.35)'
                  }}
                >
                  {saving ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Menyimpan...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check"></i> Simpan Bio Keren ✨
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PortalFooter />
    </div>
  );
}
