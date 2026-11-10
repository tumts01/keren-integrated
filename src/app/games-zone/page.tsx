'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './games-zone.module.css';
import { SaveSlot } from './types';
import { DetectiveSaveSlot } from './misi-detektif/detektifData';
import Swal from 'sweetalert2';

export default function GamesZoneLobbyPage() {
  const router = useRouter();
  const [savedSlots, setSavedSlots] = useState<SaveSlot[]>([]);
  const [detektifSlots, setDetektifSlots] = useState<DetectiveSaveSlot[]>([]);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showDetektifLoadModal, setShowDetektifLoadModal] = useState(false);

  useEffect(() => {
    try {
      const slotsStr = localStorage.getItem('gameszone_save_slots');
      if (slotsStr) {
        setSavedSlots(JSON.parse(slotsStr));
      }
      const detStr = localStorage.getItem('gameszone_detektif_save_slots');
      if (detStr) {
        setDetektifSlots(JSON.parse(detStr));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleOpenSavedSlot = (slot: SaveSlot) => {
    try {
      localStorage.setItem('gameszone_active_session', JSON.stringify(slot.session));
      router.push('/games-zone/ekspedisi-pulau-misteri');
    } catch (e: any) {
      Swal.fire('Error', 'Gagal memuat sesi: ' + e.message, 'error');
    }
  };

  const handleOpenDetektifSlot = (slot: DetectiveSaveSlot) => {
    try {
      localStorage.setItem('gameszone_detektif_active_session', JSON.stringify(slot.session));
      router.push('/games-zone/misi-detektif');
    } catch (e: any) {
      Swal.fire('Error', 'Gagal memuat sesi detektif: ' + e.message, 'error');
    }
  };

  const handleShowDetektifRules = () => {
    Swal.fire({
      title: '🕵️ PANDUAN MISI DETEKTIF LITERASI & SEJARAH',
      html: `
        <div style="text-align: left; font-size: 0.95rem; line-height: 1.6; color: #334155;">
          <h4 style="color: #b45309; margin-bottom: 6px;">1. Pembagian 4 Skuad Detektif:</h4>
          <p style="margin-top: 0;">Bagi kelas menjadi <b>4 Skuad Penyidik</b> (Rajawali Emas, Serigala Siber, Harimau Kencana, Garuda Merah). Tiap skuad dibekali 3 Alat Forensik (Lensa Pembesar, Senter UV +45d, Lencana Emas 2x).</p>
          
          <h4 style="color: #b45309; margin-bottom: 6px;">2. 4 Tipe Berkas Investigasi:</h4>
          <p style="margin-top: 0;">Klik map bukti di Papan Investigasi atau tekan <b>"Pindai Acak Berkas Bukti"</b>: ada <b>Analisis Dokumen</b>, <b>Dekoder Sandi Kriptografi</b>, <b>Deduksi 3 Petunjuk Bertahap</b>, dan <b>Uji Forensik Fakta vs Hoaks</b>.</p>
          
          <h4 style="color: #b45309; margin-bottom: 6px;">3. Mode Lempar Rebutan & Bank Bukti Guru:</h4>
          <p style="margin-top: 0;">Jika skuad utama belum tepat menjawab, aktifkan <b>Mode Rebutan</b> untuk skuad lain! Guru juga dapat menambahkan berkas soal sendiri melalui tombol <b>"+ Bukti Guru"</b>.</p>
        </div>
      `,
      confirmButtonText: 'Siap Menyelidiki!',
      confirmButtonColor: '#d97706',
      width: '620px'
    });
  };

  const handleShowRules = () => {
    Swal.fire({
      title: '📖 PANDUAN EKSPEDISI PULAU MISTERI',
      html: `
        <div style="text-align: left; font-size: 0.95rem; line-height: 1.6; color: #334155;">
          <h4 style="color: #047857; margin-bottom: 6px;">1. Pembagian Tim di Kelas:</h4>
          <p style="margin-top: 0;">Bagi seluruh siswa ke dalam <b>4 Tim</b> (Garuda, Elang, Harimau, Naga). Tiap tim menunjuk 1 juru bicara bergantian.</p>
          
          <h4 style="color: #047857; margin-bottom: 6px;">2. Giliran & Diskusi:</h4>
          <p style="margin-top: 0;">Tim yang mendapat giliran mengocok dadu (1–6). Saat tiba di petak tantangan, layar proyektor menampilkan soal nalar dan timer countdown (60–120 detik). Tim saling berdiskusi, menulis cakar-cakaran, lalu menjawab.</p>
          
          <h4 style="color: #047857; margin-bottom: 6px;">3. Peti Harta & Kartu Bantuan:</h4>
          <p style="margin-top: 0;">Ada kartu perisai, sepatu lompat, jam pasir ekstra waktu, dan kristal pengganda koin yang bisa disimpan tim untuk giliran berikutnya.</p>

          <h4 style="color: #047857; margin-bottom: 6px;">4. Penyimpanan Sesi:</h4>
          <p style="margin-top: 0;">Jika jam pelajaran usai, guru cukup klik <b>"Simpan Progres"</b>. Permainan bisa dilanjutkan kembali di pertemuan minggu depan tanpa mengulang dari awal!</p>
        </div>
      `,
      confirmButtonText: 'Siap Bermain!',
      confirmButtonColor: '#10b981',
      width: '600px'
    });
  };

  return (
    <div className={styles.container}>
      
      {/* Hero Banner */}
      <div className={styles.lobbyHero}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 800, marginBottom: 14 }}>
          <i className="fas fa-gamepad"></i> WAHANA GAME PEMBELAJARAN DIGITAL
        </div>
        <h1 className={styles.lobbyTitle}>GAME&apos;S ZONE MADRASAH</h1>
        <p className={styles.lobbyDesc}>
          Platform game edukasi interaktif berbasis proyektor untuk pembelajaran aktif, kolaboratif, dan berkelanjutan. 
          Dirancang untuk melatih nalar kritis, kerja sama kelompok, dan suasana kelas yang seru!
        </p>

        <div className={styles.lobbyBadges}>
          <div className={styles.lobbyBadge}>
            <i className="fas fa-tv" style={{ color: '#38bdf8' }}></i> Tampilan Khusus Proyektor
          </div>
          <div className={styles.lobbyBadge}>
            <i className="fas fa-users" style={{ color: '#f59e0b' }}></i> Kolaborasi 4 Tim
          </div>
          <div className={styles.lobbyBadge}>
            <i className="fas fa-save" style={{ color: '#10b981' }}></i> Simpan &amp; Lanjutkan (Multi-Pertemuan)
          </div>
          <div className={styles.lobbyBadge}>
            <i className="fas fa-brain" style={{ color: '#ec4899' }}></i> Asah Nalar &amp; Problem Solving
          </div>
        </div>
      </div>

      {/* Main Games Catalog Section */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <i className="fas fa-play-circle" style={{ color: '#10b981' }}></i>
          PILIH GAME PEMBELAJARAN
        </h2>
        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
          Tersedia 2 Game Aktif • 1 Game Dalam Pengembangan
        </span>
      </div>

      <div className={styles.gamesGrid}>
        
        {/* GAME 1: EKSPEDISI PULAU MISTERI (ACTIVE!) */}
        <div className={styles.gameCardFeatured}>
          <div>
            <div className={styles.gameThumbnailBox} style={{ background: 'linear-gradient(135deg, #065f46 0%, #047857 50%, #0f766e 100%)' }}>
              <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 5, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: '1px solid #6ee7b7', color: 'white', fontSize: '0.73rem', fontWeight: 900, padding: '5px 12px', borderRadius: 20, letterSpacing: '0.5px', textTransform: 'uppercase', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.45)' }}>
                <i className="fas fa-star" style={{ marginRight: 5 }}></i> SIAP DIMAINKAN
              </div>
              <i className={`fas fa-map-marked-alt ${styles.gameThumbIcon}`}></i>
              <div style={{ position: 'absolute', bottom: 10, left: 14, background: 'rgba(0,0,0,0.6)', padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem', color: '#a7f3d0', fontWeight: 700 }}>
                40 Petak Papan • Sains &amp; Nalar
              </div>
            </div>

            <h3 className={styles.gameCardTitle}>EKSPEDISI PULAU MISTERI</h3>
            <p className={styles.gameCardDescription}>
              Petualangan board-game 4 kelompok melintasi 4 zona rintangan: Pantai Pendaratan, Rawa Logika, Tebing Kristal, hingga Puncak Kuil Kebijaksanaan. Dilengkapi dadu interaktif, peti harta karun, petak duel, dan timer diskusi nalar.
            </p>

            <div className={styles.gameTags}>
              <span className={styles.gameTag}><i className="fas fa-users" style={{ color: '#38bdf8', marginRight: 4 }}></i> 4 Kelompok</span>
              <span className={styles.gameTag}><i className="fas fa-chess-board" style={{ color: '#fbbf24', marginRight: 4 }}></i> 40 Petak</span>
              <span className={styles.gameTag}><i className="fas fa-stopwatch" style={{ color: '#ec4899', marginRight: 4 }}></i> Timer Nalar</span>
              <span className={styles.gameTag}><i className="fas fa-save" style={{ color: '#34d399', marginRight: 4 }}></i> Save &amp; Resume</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link href="/games-zone/ekspedisi-pulau-misteri" className={styles.btnPlayLarge}>
              <i className="fas fa-play"></i> MAINKAN SEKARANG (BUKA GAME)
            </Link>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button 
                className={styles.btnAction} 
                onClick={() => setShowLoadModal(true)}
                style={{ justifyContent: 'center', fontSize: '0.85rem' }}
              >
                <i className="fas fa-folder-open" style={{ color: '#38bdf8' }}></i> Sesi Tersimpan ({savedSlots.length})
              </button>

              <button 
                className={styles.btnAction} 
                onClick={handleShowRules}
                style={{ justifyContent: 'center', fontSize: '0.85rem' }}
              >
                <i className="fas fa-book-open" style={{ color: '#fbbf24' }}></i> Aturan Main
              </button>
            </div>
          </div>
        </div>

        {/* GAME 2: MISI DETEKTIF LITERASI & SEJARAH (ACTIVE!) */}
        <div
          className={styles.gameCardFeatured}
          style={{
            borderColor: '#f59e0b',
            boxShadow: '0 15px 35px -10px rgba(245, 158, 11, 0.28)'
          }}
        >
          <div>
            <div className={styles.gameThumbnailBox} style={{ background: 'linear-gradient(135deg, #451a03 0%, #92400e 50%, #78350f 100%)' }}>
              <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 5, background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', border: '1px solid #fde68a', color: '#fffbeb', fontSize: '0.73rem', fontWeight: 900, padding: '5px 12px', borderRadius: 20, letterSpacing: '0.5px', textTransform: 'uppercase', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.45)' }}>
                <i className="fas fa-user-secret" style={{ marginRight: 5 }}></i> SIAP DIMAINKAN
              </div>
              <i className={`fas fa-user-secret ${styles.gameThumbIcon}`} style={{ color: '#fef3c7' }}></i>
              <div style={{ position: 'absolute', bottom: 10, left: 14, background: 'rgba(0,0,0,0.65)', padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem', color: '#fde68a', fontWeight: 700 }}>
                4 Bab Kasus • 20 Berkas Bukti &amp; Sandi
              </div>
            </div>

            <h3 className={styles.gameCardTitle}>MISI DETEKTIF LITERASI &amp; SEJARAH</h3>
            <p className={styles.gameCardDescription}>
              Petualangan pemecahan sandi kriptografi, deduksi 3 petunjuk bertahap, uji forensik hoaks, dan analisis dokumen sejarah Nusantara &amp; Peradaban Islam dalam format Digital Escape Room kelas.
            </p>

            <div className={styles.gameTags}>
              <span className={styles.gameTag}><i className="fas fa-scroll" style={{ color: '#fbbf24', marginRight: 4 }}></i> Analisis Dokumen</span>
              <span className={styles.gameTag}><i className="fas fa-key" style={{ color: '#38bdf8', marginRight: 4 }}></i> Dekoder Sandi</span>
              <span className={styles.gameTag}><i className="fas fa-microscope" style={{ color: '#ec4899', marginRight: 4 }}></i> Forensik Hoaks</span>
              <span className={styles.gameTag}><i className="fas fa-plus-circle" style={{ color: '#34d399', marginRight: 4 }}></i> Bank Bukti Guru</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link
              href="/games-zone/misi-detektif"
              className={styles.btnPlayLarge}
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#0c0a09',
                boxShadow: '0 8px 20px rgba(245, 158, 11, 0.35)'
              }}
            >
              <i className="fas fa-search"></i> MAINKAN SEKARANG (BUKA MARKAS)
            </Link>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button 
                className={styles.btnAction} 
                onClick={() => setShowDetektifLoadModal(true)}
                style={{ justifyContent: 'center', fontSize: '0.85rem' }}
              >
                <i className="fas fa-folder-open" style={{ color: '#fbbf24' }}></i> Sesi Tersimpan ({detektifSlots.length})
              </button>

              <button 
                className={styles.btnAction} 
                onClick={handleShowDetektifRules}
                style={{ justifyContent: 'center', fontSize: '0.85rem' }}
              >
                <i className="fas fa-book-open" style={{ color: '#38bdf8' }}></i> Aturan Main
              </button>
            </div>
          </div>
        </div>

        {/* GAME 3: JEOPARDY / CEPAT TANGKAS (COMING SOON) */}
        <div className={styles.gameCardUpcoming}>
          <div>
            <div className={styles.gameThumbnailBox} style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)' }}>
              <i className={`fas fa-th-large ${styles.gameThumbIcon}`} style={{ opacity: 0.6 }}></i>
              <div style={{ position: 'absolute', top: 12, right: 12, background: '#334155', color: '#94a3b8', fontSize: '0.7rem', fontWeight: 800, padding: '3px 8px', borderRadius: 6 }}>
                SEGERA HADIR
              </div>
            </div>

            <h3 className={styles.gameCardTitle} style={{ color: '#94a3b8' }}>ARENA CEPAT TANGKAS (JEOPARDY)</h3>
            <p className={styles.gameCardDescription}>
              Papan matriks kuis kategori nilai poin (100–500) gaya turnamen televisi. 4 tim beradu cepat memencet tombol bel virtual untuk menjawab soal evaluasi bab.
            </p>

            <div className={styles.gameTags}>
              <span className={styles.gameTag}>Semua Mapel</span>
              <span className={styles.gameTag}>Bel Rebutan</span>
              <span className={styles.gameTag}>Matriks Soal</span>
            </div>
          </div>

          <button className={styles.btnAction} disabled style={{ width: '100%', justifyContent: 'center', opacity: 0.5 }}>
            <i className="fas fa-lock"></i> Sedang Disiapkan
          </button>
        </div>

      </div>

      {/* SAVED SESSIONS MODAL */}
      {showLoadModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: 640 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem' }}>
                <i className="fas fa-folder-open" style={{ color: '#0ea5e9', marginRight: 10 }}></i>
                SESI KELAS TERSIMPAN
              </h2>
              <button className={styles.btnAction} onClick={() => setShowLoadModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: 15 }}>
              Pilih sesi kelas yang ingin dilanjutkan hari ini. Permainan akan otomatis membuka di titik terakhir Anda menyimpan:
            </p>

            <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {savedSlots.length > 0 ? (
                savedSlots.map(slot => (
                  <div 
                    key={slot.id}
                    style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 18px', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#f1f5f9' }}>{slot.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>
                        Tersimpan pada: {slot.date} • Putaran {slot.session.round}
                      </div>
                    </div>
                    <button 
                      className={styles.btnAction}
                      style={{ background: '#10b981', color: 'white' }}
                      onClick={() => handleOpenSavedSlot(slot)}
                    >
                      <i className="fas fa-play"></i> Lanjutkan Sesi
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>
                  <i className="fas fa-inbox" style={{ fontSize: '2rem', marginBottom: 10, display: 'block' }}></i>
                  Belum ada sesi tersimpan. Mulai game baru dan klik &quot;Simpan Progres&quot; saat jam pelajaran berakhir.
                </div>
              )}
            </div>

            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <Link href="/games-zone/ekspedisi-pulau-misteri" className={styles.btnPlayLarge}>
                <i className="fas fa-plus-circle"></i> Mulai Game Baru dari Awal
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* SAVED SESSIONS MODAL FOR MISI DETEKTIF */}
      {showDetektifLoadModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: 640, borderColor: 'rgba(245, 158, 11, 0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#fef3c7' }}>
                <i className="fas fa-user-secret" style={{ color: '#f59e0b', marginRight: 10 }}></i>
                SESI MISI DETEKTIF TERSIMPAN
              </h2>
              <button className={styles.btnAction} onClick={() => setShowDetektifLoadModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: 15 }}>
              Pilih sesi investigasi kelas yang ingin dilanjutkan:
            </p>

            <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {detektifSlots.length > 0 ? (
                detektifSlots.map(slot => (
                  <div 
                    key={slot.id}
                    style={{ background: '#0f172a', border: '1px solid rgba(245,158,11,0.25)', padding: '14px 18px', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#f1f5f9' }}>{slot.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>
                        Disimpan: {slot.date} • {slot.session.solvedEvidenceIds?.length || 0} Bukti Terpecahkan
                      </div>
                    </div>
                    <button 
                      className={styles.btnAction}
                      style={{ background: '#d97706', color: 'white' }}
                      onClick={() => handleOpenDetektifSlot(slot)}
                    >
                      <i className="fas fa-play"></i> Lanjutkan
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>
                  <i className="fas fa-inbox" style={{ fontSize: '2rem', marginBottom: 10, display: 'block' }}></i>
                  Belum ada sesi investigasi detektif yang disimpan.
                </div>
              )}
            </div>

            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <Link
                href="/games-zone/misi-detektif"
                className={styles.btnPlayLarge}
                style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#0c0a09' }}
              >
                <i className="fas fa-search"></i> Buka Markas Detektif Baru
              </Link>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
