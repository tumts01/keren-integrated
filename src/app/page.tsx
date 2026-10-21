'use client';
import { useState, useEffect, useRef } from 'react';
import styles from "./page.module.css";
import Link from 'next/link';
import LoadingScreen from '@/components/LoadingScreen';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State Pop-up Editor / Crop Foto Profil Presisi
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImgSrc, setCropImgSrc] = useState<string | null>(null);
  const [cropImgDim, setCropImgDim] = useState<{ w: number; h: number }>({ w: 1, h: 1 });
  const [cropZoom, setCropZoom] = useState<number>(1);
  const [cropPos, setCropPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; startX: number; startY: number }>({
    x: 0,
    y: 0,
    startX: 0,
    startY: 0
  });

  const [tagihanList, setTagihanList] = useState<any[]>([]);
  const [raporInfo, setRaporInfo] = useState<{kelas: string, missing: number, total: number} | null>(null);
  const [susulanInfo, setSusulanInfo] = useState<{kelas: string, total: number, belumSelesai: number, rincian: any[]} | null>(null);
  const [alphaInfo, setAlphaInfo] = useState<any>(null);
  const [showAlphaModal, setShowAlphaModal] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('keren_user_data');
    const portalSession = localStorage.getItem('portal_session');
    const spmbSession = localStorage.getItem('spmb_session');
    const appPref = localStorage.getItem('keren_app_preference');

    if (!storedUser && spmbSession) {
      window.location.replace('/spmb/portal');
      return;
    }
    if (!storedUser && appPref === 'spmb') {
      window.location.replace('/spmb/login');
      return;
    }
    if (!storedUser && portalSession) {
      window.location.replace('/portal/dashboard');
      return;
    }
    if (!storedUser && appPref === 'portal') {
      window.location.replace('/portal/login');
      return;
    }

    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchProfile(parsedUser.nama);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async (nama: string) => {
    try {
      const [resGuru, resSurat, resKelas, resRapor, resSusulan] = await Promise.all([
        fetch('/api/guru'),
        fetch('/api/persuratan'),
        fetch('/api/kelas'),
        fetch('/api/rapor'),
        fetch('/api/perangkat-ujian/susulan/input')
      ]);
      const data = await resGuru.json();
      const surat = await resSurat.json();
      const kelasData = await resKelas.json();
      const raporData = await resRapor.json();
      const susulanData = await resSusulan.json();
      
      let foundProfile = null;
      if (data.success) {
        const found = data.data.find((g: any) => g.nama.toLowerCase().trim() === nama.toLowerCase().trim());
        setProfile(found);
        foundProfile = found;
      }

      if (surat.success && foundProfile) {
        const myName = foundProfile.nama.toLowerCase();
        const myTagihan = surat.suratKeluar.filter((s: any) => 
          !s.fileScan && 
          s.pj && s.pj.toLowerCase().includes(myName)
        );
        setTagihanList(myTagihan);
      }

      // Check wali kelas status (rapor and susulan)
      if (kelasData.success && foundProfile) {
        const myName = foundProfile.nama.toLowerCase().trim();
        const myKelas = kelasData.data.find((k: any) => {
          if (!k.waliKelas) return false;
          const waliName = k.waliKelas.toLowerCase().trim();
          return waliName.includes(myName) || myName.includes(waliName);
        });
        
        if (myKelas) {
          if (raporData.success) {
            const rekapKelas = raporData.rekap?.find((r: any) => r.kelas === myKelas.rombel);
            if (rekapKelas && rekapKelas.missing > 0) {
              setRaporInfo({
                kelas: myKelas.rombel,
                missing: rekapKelas.missing,
                total: rekapKelas.total
              });
            }
          }

          if (susulanData.success && susulanData.data) {
            const classSusulan = susulanData.data.filter((r: any) => r.metadata?.kelas === myKelas.rombel);
            const pendingSusulan = classSusulan.filter((r: any) => !r.metadata?.isSelesai);
            
            if (pendingSusulan.length > 0) {
              const rincian = pendingSusulan.map((r: any) => ({
                nama: r.metadata?.nama,
                mapel: r.metadata?.mapel,
                isSelesai: !!r.metadata?.isSelesai
              }));
              setSusulanInfo({
                kelas: myKelas.rombel,
                total: classSusulan.length,
                belumSelesai: pendingSusulan.length,
                rincian
              });
            }
          }

          // Check pantauan siswa Alpha hari ini (Wali Kelas)
          try {
            const resAlpha = await fetch(`/api/presensi/wali-kelas-alpha?kelas=${encodeURIComponent(myKelas.rombel)}&wali=${encodeURIComponent(foundProfile.nama)}&_t=${Date.now()}`, { cache: 'no-store' });
            const alphaData = await resAlpha.json();
            if (alphaData.success && alphaData.totalAlpha > 0) {
              setAlphaInfo(alphaData);
              const sessionKey = `alpha_dismissed_${alphaData.tanggal}_${myKelas.rombel}_${alphaData.totalAlpha}`;
              if (!sessionStorage.getItem(sessionKey)) {
                setShowAlphaModal(true);
              }
            }
          } catch (errAlpha) {
            console.error('Error fetching alpha data:', errAlpha);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismissModal = () => {
    setShowAlphaModal(false);
    if (alphaInfo) {
      sessionStorage.setItem(`alpha_dismissed_${alphaInfo.tanggal}_${alphaInfo.kelas}_${alphaInfo.totalAlpha}`, '1');
    }
  };

  // Konstanta Bingkai Editor Crop Foto (Rasio 160:210 = 240:315, identik dengan bingkai foto Dashboard)
  const CROP_FRAME_W = 240;
  const CROP_FRAME_H = 315;

  const clampCropOffset = (
    x: number,
    y: number,
    zoom: number,
    dim: { w: number; h: number }
  ) => {
    const baseScale = Math.max(CROP_FRAME_W / (dim.w || 1), CROP_FRAME_H / (dim.h || 1));
    const dispW = dim.w * baseScale * zoom;
    const dispH = dim.h * baseScale * zoom;
    const maxPanX = Math.max(0, (dispW - CROP_FRAME_W) / 2);
    const maxPanY = Math.max(0, (dispH - CROP_FRAME_H) / 2);
    return {
      x: Math.min(maxPanX, Math.max(-maxPanX, x)),
      y: Math.min(maxPanY, Math.max(-maxPanY, y))
    };
  };

  // Saat user memilih file foto, buka Pop-up Editor untuk atur posisi & zoom secara presisi
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    if (!rawFile.type.startsWith('image/')) {
      const Swal = (await import('sweetalert2')).default;
      Swal.fire('Format Tidak Didukung', 'Silakan pilih file gambar (JPG, PNG, WEBP).', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setCropImgSrc(dataUrl);
        setCropImgDim({ w: img.width || 1, h: img.height || 1 });
        setCropZoom(1);
        setCropPos({ x: 0, y: 0 });
        setCropModalOpen(true);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(rawFile);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Putar foto 90 derajat di dalam Pop-up Editor
  const handleRotateCropImage = () => {
    if (!cropImgSrc) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      const rotatedUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCropImgSrc(rotatedUrl);
      setCropImgDim({ w: canvas.width, h: canvas.height });
      setCropZoom(1);
      setCropPos({ x: 0, y: 0 });
    };
    img.src = cropImgSrc;
  };

  const handleCropZoomChange = (newZoom: number) => {
    const clampedZoom = Math.min(3, Math.max(1, newZoom));
    setCropZoom(clampedZoom);
    setCropPos((prev) => clampCropOffset(prev.x, prev.y, clampedZoom, cropImgDim));
  };

  const startCropDrag = (clientX: number, clientY: number) => {
    setIsDraggingCrop(true);
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      startX: cropPos.x,
      startY: cropPos.y
    };
  };

  const moveCropDrag = (clientX: number, clientY: number) => {
    if (!isDraggingCrop) return;
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;
    setCropPos(
      clampCropOffset(
        dragStartRef.current.startX + dx,
        dragStartRef.current.startY + dy,
        cropZoom,
        cropImgDim
      )
    );
  };

  const endCropDrag = () => {
    setIsDraggingCrop(false);
  };

  // Potong sesuai bingkai presisi & unggah ke server
  const handleSaveCroppedPhoto = async () => {
    if (!cropImgSrc) return;
    setUploadingPhoto(true);

    try {
      const croppedFile = await new Promise<File>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const OUT_W = 480;
          const OUT_H = 630;
          const scaleRatio = OUT_W / CROP_FRAME_W; // 2x resolusi tajam

          const baseScale = Math.max(CROP_FRAME_W / img.width, CROP_FRAME_H / img.height);
          const dispW = img.width * baseScale * cropZoom;
          const dispH = img.height * baseScale * cropZoom;
          const left = (CROP_FRAME_W - dispW) / 2 + cropPos.x;
          const top = (CROP_FRAME_H - dispH) / 2 + cropPos.y;

          const canvas = document.createElement('canvas');
          canvas.width = OUT_W;
          canvas.height = OUT_H;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Gagal memproses kanvas gambar'));
            return;
          }

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, OUT_W, OUT_H);
          ctx.drawImage(
            img,
            left * scaleRatio,
            top * scaleRatio,
            dispW * scaleRatio,
            dispH * scaleRatio
          );

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(
                  new File([blob], `profile_${Date.now()}.jpg`, {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                  })
                );
              } else {
                reject(new Error('Gagal menghasilkan gambar hasil crop'));
              }
            },
            'image/jpeg',
            0.9
          );
        };
        img.onerror = () => reject(new Error('Gagal memuat gambar'));
        img.src = cropImgSrc;
      });

      const formData = new FormData();
      formData.append('file', croppedFile);
      formData.append('username', user?.username || '');
      formData.append('nama', profile?.nama || user?.nama || '');

      const res = await fetch('/api/user/photo', {
        method: 'POST',
        body: formData
      });
      const json = await res.json();

      const Swal = (await import('sweetalert2')).default;
      if (json.success) {
        setCropModalOpen(false);
        setCropImgSrc(null);
        // Update tampilan foto di Dashboard secara instan
        setProfile((prev: any) => (prev ? { ...prev, foto: json.foto } : prev));
        setUser((prev: any) => (prev ? { ...prev, foto: json.rawFoto || json.foto } : prev));

        // Update localStorage & beritahu Header agar avatar pojok kanan atas langsung berubah
        try {
          const rawStored = localStorage.getItem('keren_user_data');
          if (rawStored) {
            const parsed = JSON.parse(rawStored);
            parsed.foto = json.rawFoto || json.foto;
            localStorage.setItem('keren_user_data', JSON.stringify(parsed));
            window.dispatchEvent(new Event('keren_user_updated'));
          }
        } catch {}

        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: 'Foto profil Anda telah diperbarui dengan presisi.',
          timer: 1800,
          showConfirmButton: false
        });
      } else {
        Swal.fire('Gagal Mengubah Foto', json.error || 'Terjadi kesalahan saat mengunggah foto', 'error');
      }
    } catch (err: any) {
      const Swal = (await import('sweetalert2')).default;
      Swal.fire('Error', err.message || 'Gagal menghubungi server', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Menyiapkan Dashboard Anda..." />;
  }

  // Jika tidak ditemukan di db_GTK, tampilkan halaman awal standar
  if (!profile) {
    return (
      <div className={styles.container} style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <img src="/logo.png" alt="Logo" style={{ width: '100px', marginBottom: '20px' }} />
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>KEREN Dashboard</h1>
        <p style={{ color: 'var(--text-muted)' }}>Selamat datang, {user?.nama || 'Pengguna'}! Akun Anda aktif namun tidak tertaut ke Database GTK.</p>
      </div>
    );
  }

  const cropBaseScale = Math.max(
    CROP_FRAME_W / (cropImgDim.w || 1),
    CROP_FRAME_H / (cropImgDim.h || 1)
  );
  const cropDispW = cropImgDim.w * cropBaseScale * cropZoom;
  const cropDispH = cropImgDim.h * cropBaseScale * cropZoom;
  const cropLeft = (CROP_FRAME_W - cropDispW) / 2 + cropPos.x;
  const cropTop = (CROP_FRAME_H - cropDispH) / 2 + cropPos.y;

  return (
    <div className={styles.container}>
      {/* Modal Pop-up Editor / Crop Foto Profil Presisi */}
      {cropModalOpen && cropImgSrc && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.78)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px'
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Header Modal Crop */}
            <div
              style={{
                background: 'linear-gradient(135deg, #065f46 0%, #059669 100%)',
                color: 'white',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800, fontSize: '1.02rem' }}>
                <i className="fas fa-crop-alt"></i> Atur Presisi Foto Profil
              </div>
              <button
                type="button"
                disabled={uploadingPhoto}
                onClick={() => {
                  setCropModalOpen(false);
                  setCropImgSrc(null);
                }}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Body Modal Crop */}
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  fontSize: '0.8rem',
                  color: '#475569',
                  textAlign: 'center',
                  background: '#f8fafc',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  width: '100%'
                }}
              >
                <i className="fas fa-hand-paper" style={{ color: '#059669', marginRight: '6px' }}></i>
                Geser foto dengan jari/mouse & atur zoom agar wajah pas di tengah.
              </div>

              {/* Area Bingkai Crop Interaktif (240 x 315) */}
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  startCropDrag(e.clientX, e.clientY);
                }}
                onMouseMove={(e) => moveCropDrag(e.clientX, e.clientY)}
                onMouseUp={endCropDrag}
                onMouseLeave={endCropDrag}
                onTouchStart={(e) => {
                  if (e.touches.length === 1) {
                    startCropDrag(e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
                onTouchMove={(e) => {
                  if (e.touches.length === 1) {
                    moveCropDrag(e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
                onTouchEnd={endCropDrag}
                onWheel={(e) => {
                  e.preventDefault();
                  const delta = e.deltaY < 0 ? 0.08 : -0.08;
                  handleCropZoomChange(cropZoom + delta);
                }}
                style={{
                  width: `${CROP_FRAME_W}px`,
                  height: `${CROP_FRAME_H}px`,
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: '16px',
                  background: '#0f172a',
                  border: '3px solid #059669',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
                  cursor: isDraggingCrop ? 'grabbing' : 'grab',
                  touchAction: 'none',
                  userSelect: 'none'
                }}
              >
                <img
                  src={cropImgSrc}
                  alt="Preview Crop"
                  draggable={false}
                  style={{
                    position: 'absolute',
                    width: `${cropDispW}px`,
                    height: `${cropDispH}px`,
                    left: `${cropLeft}px`,
                    top: `${cropTop}px`,
                    maxWidth: 'none',
                    pointerEvents: 'none',
                    userSelect: 'none'
                  }}
                />

                {/* Garis Bantu Grid & Panduan Tengah Presisi */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    border: '1px solid rgba(255,255,255,0.35)'
                  }}
                >
                  {/* Garis Vertikal Tengah */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: '50%',
                      borderLeft: '1px dashed rgba(255,255,255,0.45)'
                    }}
                  />
                  {/* Garis Horizontal 1/3 Atas (Posisi Mata/Wajah) */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: '38%',
                      borderTop: '1px dashed rgba(255,255,255,0.45)'
                    }}
                  />
                  {/* Lingkaran Panduan Wajah */}
                  <div
                    style={{
                      position: 'absolute',
                      width: '150px',
                      height: '185px',
                      left: '50%',
                      top: '44%',
                      transform: 'translate(-50%, -50%)',
                      borderRadius: '50%',
                      border: '1.5px dashed rgba(255,255,255,0.65)',
                      boxShadow: '0 0 0 999px rgba(15, 23, 42, 0.22)'
                    }}
                  />
                </div>
              </div>

              {/* Kontrol Slider Zoom */}
              <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '0 4px' }}>
                <button
                  type="button"
                  onClick={() => handleCropZoomChange(cropZoom - 0.1)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    color: '#334155',
                    fontWeight: 700
                  }}
                  title="Perkecil"
                >
                  <i className="fas fa-search-minus"></i>
                </button>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.02}
                  value={cropZoom}
                  onChange={(e) => handleCropZoomChange(parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: '#059669', cursor: 'pointer' }}
                />
                <button
                  type="button"
                  onClick={() => handleCropZoomChange(cropZoom + 0.1)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    color: '#334155',
                    fontWeight: 700
                  }}
                  title="Perbesar"
                >
                  <i className="fas fa-search-plus"></i>
                </button>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#059669', minWidth: '42px', textAlign: 'right' }}>
                  {Math.round(cropZoom * 100)}%
                </span>
              </div>

              {/* Tombol Alat Bantu: Putar 90°, Reset Tengah, Ganti File */}
              <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleRotateCropImage}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#334155',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <i className="fas fa-redo"></i> Putar 90°
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCropZoom(1);
                    setCropPos({ x: 0, y: 0 });
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#334155',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <i className="fas fa-compress-arrows-alt"></i> Reset Tengah
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#0284c7',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <i className="fas fa-folder-open"></i> Pilih Foto Lain
                </button>
              </div>
            </div>

            {/* Footer Modal Crop */}
            <div
              style={{
                padding: '14px 20px',
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px'
              }}
            >
              <button
                type="button"
                disabled={uploadingPhoto}
                onClick={() => {
                  setCropModalOpen(false);
                  setCropImgSrc(null);
                }}
                style={{
                  padding: '9px 16px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: 'white',
                  color: '#475569',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={uploadingPhoto}
                onClick={handleSaveCroppedPhoto}
                style={{
                  padding: '9px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: 'white',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: uploadingPhoto ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 10px rgba(5, 150, 105, 0.25)'
                }}
              >
                {uploadingPhoto ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Menyimpan...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check-circle"></i> Simpan & Pasang Foto
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Pop-up Pemberitahuan Siswa Alpha Hari Ini (Wali Kelas) */}
      {showAlphaModal && alphaInfo && alphaInfo.totalAlpha > 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.72)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '18px',
            maxWidth: '580px',
            width: '100%',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            overflow: 'hidden'
          }}>
            {/* Header Modal */}
            <div style={{
              background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
              color: 'white',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.22)',
                  borderRadius: '50%',
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  flexShrink: 0
                }}>
                  <i className="fas fa-bell"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Pemberitahuan Wali Kelas {alphaInfo.kelas}</h3>
                  <div style={{ fontSize: '0.82rem', opacity: 0.92, marginTop: '2px' }}>
                    {alphaInfo.totalAlpha} Siswa Tercatat Alpha (Tidak Masuk) Hari Ini &bull; {alphaInfo.tanggalFormatted}
                  </div>
                </div>
              </div>
              <button
                onClick={handleDismissModal}
                style={{
                  background: 'rgba(255, 255, 255, 0.18)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '1.2rem'
                }}
                title="Tutup Notifikasi"
              >
                &times;
              </button>
            </div>

            {/* Content Body Modal */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              <div style={{
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '16px',
                fontSize: '0.88rem',
                color: '#9f1239',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                lineHeight: '1.5'
              }}>
                <i className="fas fa-heart" style={{ fontSize: '1.2rem', color: '#e11d48', marginTop: '2px', flexShrink: 0 }}></i>
                <div>
                  <strong>Bentuk Kepedulian Wali Kelas:</strong> Ananda di bawah ini belum hadir di madrasah tanpa keterangan. Mari hubungi wali murid untuk menanyakan keadaan ananda dan memastikan kondisinya baik-baik saja.
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {alphaInfo.students.map((s: any, idx: number) => (
                  <div key={idx} style={{
                    border: '1px solid #fecdd3',
                    background: '#ffffff',
                    borderRadius: '12px',
                    padding: '14px',
                    boxShadow: '0 2px 4px rgba(225, 29, 72, 0.04)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.98rem' }}>
                        {idx + 1}. {s.nama}
                      </div>
                      <span style={{
                        fontSize: '0.72rem',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: s.domisili.toLowerCase().includes('rumah') ? '#dcfce7' : '#e0e7ff',
                        color: s.domisili.toLowerCase().includes('rumah') ? '#166534' : '#3730a3',
                        fontWeight: 700,
                        whiteSpace: 'nowrap'
                      }}>
                        <i className={`fas ${s.domisili.toLowerCase().includes('rumah') ? 'fa-home' : 'fa-mosque'}`} style={{ marginRight: '4px' }}></i>
                        {s.domisili}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.83rem', color: '#64748b', marginBottom: '10px', lineHeight: '1.4' }}>
                      <i className="fas fa-book-open" style={{ marginRight: '6px', color: '#e11d48' }}></i>
                      Pelajaran: <strong>{s.mapelList.map((m: any) => `${m.mapel} (Jam ${m.jamKe})`).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).join(', ')}</strong>
                      {s.gurus && s.gurus.length > 0 && (
                        <span style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                          <i className="fas fa-user-edit" style={{ marginRight: '4px' }}></i> Dicatat oleh: {s.gurus.join(', ')}
                        </span>
                      )}
                    </div>

                    {/* WhatsApp Action Buttons */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '8px', borderTop: '1px dashed #fecdd3' }}>
                      {s.ortu.waLinkIbu && (
                        <a 
                          href={s.ortu.waLinkIbu} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#22c55e',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                            boxShadow: '0 2px 4px rgba(34, 197, 94, 0.2)'
                          }}
                          title={`Hubungi Ibu (${s.ortu.ibu || s.ortu.noHpIbu})`}
                        >
                          <i className="fab fa-whatsapp"></i> WA Ibu {s.ortu.ibu ? `(${s.ortu.ibu})` : ''}
                        </a>
                      )}

                      {s.ortu.waLinkAyah && (
                        <a 
                          href={s.ortu.waLinkAyah} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#15803d',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                            boxShadow: '0 2px 4px rgba(21, 128, 61, 0.2)'
                          }}
                          title={`Hubungi Ayah (${s.ortu.ayah || s.ortu.noHpAyah})`}
                        >
                          <i className="fab fa-whatsapp"></i> WA Ayah {s.ortu.ayah ? `(${s.ortu.ayah})` : ''}
                        </a>
                      )}

                      {s.ortu.waLinkWali && !s.ortu.waLinkIbu && !s.ortu.waLinkAyah && (
                        <a 
                          href={s.ortu.waLinkWali} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#0284c7',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            textDecoration: 'none'
                          }}
                        >
                          <i className="fab fa-whatsapp"></i> WA Wali {s.ortu.wali ? `(${s.ortu.wali})` : ''}
                        </a>
                      )}

                      {!s.ortu.waLinkIbu && !s.ortu.waLinkAyah && !s.ortu.waLinkWali && (
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <i className="fas fa-phone-slash"></i> Nomor telepon orang tua belum tercatat di data induk
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Modal */}
            <div style={{
              padding: '14px 20px',
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <a 
                href="/presensi" 
                style={{
                  color: '#0284c7',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className="fas fa-external-link-alt"></i> Buka Menu Presensi Siswa
              </a>

              <button
                onClick={handleDismissModal}
                style={{
                  background: '#e11d48',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 20px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(225, 29, 72, 0.3)'
                }}
              >
                Mengerti & Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kartu Sambutan */}
      <div className={styles.welcomeCard}>
        <div className={styles.welcomeContent}>
          <h1 className={styles.welcomeTitle}>Awali harimu dengan Bismillah <i className="fas fa-praying-hands" style={{ marginLeft: '4px' }}></i></h1>
          <p className={styles.welcomeSubtitle}>Selamat datang kembali di KEREN. Semoga harimu menyenangkan!</p>
        </div>
        <i className="fas fa-sun" style={{ fontSize: '8rem', color: 'rgba(255,255,255,0.2)', position: 'absolute', right: '-20px', bottom: '-20px' }}></i>
      </div>

      {/* Hero Profil (Menindih Kartu Sambutan sedikit) */}
      <div className={styles.profileHero}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          style={{ display: 'none' }}
        />
        <div
          className={styles.photoFrame}
          onClick={() => !uploadingPhoto && fileInputRef.current?.click()}
          title="Klik untuk mengubah foto profil"
          style={{ position: 'relative', cursor: uploadingPhoto ? 'wait' : 'pointer' }}
        >
          {profile.foto ? (
            <img src={profile.foto} alt="Profile" className={styles.photo} referrerPolicy="no-referrer" />
          ) : (
            <i className="fas fa-user-tie" style={{ fontSize: '4rem', color: '#cbd5e1' }}></i>
          )}

          {/* Overlay Tombol Ubah Foto */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!uploadingPhoto) fileInputRef.current?.click();
            }}
            disabled={uploadingPhoto}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: uploadingPhoto ? 'rgba(2, 132, 199, 0.88)' : 'rgba(15, 23, 42, 0.72)',
              backdropFilter: 'blur(4px)',
              color: 'white',
              border: 'none',
              padding: '8px 6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: uploadingPhoto ? 'wait' : 'pointer',
              transition: 'background 0.2s'
            }}
          >
            {uploadingPhoto ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Mengunggah...
              </>
            ) : (
              <>
                <i className="fas fa-camera"></i> Ubah Foto
              </>
            )}
          </button>
        </div>
        
        <div className={styles.heroInfo}>
          <div className={styles.name}>{profile.nama}</div>
          <div className={styles.jabatan}>{profile.jabatan}</div>
          
          <div className={styles.badgeGrid}>
            <span className={styles.badge} style={{ background: profile.status.toLowerCase().includes('aktif') && !profile.status.toLowerCase().includes('non') ? '#dcfce7' : '#fee2e2', color: profile.status.toLowerCase().includes('aktif') && !profile.status.toLowerCase().includes('non') ? '#166534' : '#991b1b', borderColor: profile.status.toLowerCase().includes('aktif') && !profile.status.toLowerCase().includes('non') ? '#bbf7d0' : '#fecaca' }}>
              <i className={`fas ${profile.status.toLowerCase().includes('aktif') && !profile.status.toLowerCase().includes('non') ? 'fa-check-circle' : 'fa-times-circle'}`}></i> {profile.status}
            </span>
            <span className={styles.badge}>
              <i className="fas fa-id-badge"></i> PEG ID: {profile.pegId || '-'}
            </span>
            <span className={styles.badge}>
              <i className="fas fa-fingerprint"></i> NIP: {profile.nip || '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Box Siswa Alpha Hari Ini (Wali Kelas) */}
      {alphaInfo && alphaInfo.totalAlpha > 0 && (
        <div style={{
          background: 'linear-gradient(to right, #fff1f2, #ffe4e6)',
          border: '1.5px solid #fecdd3',
          borderRadius: '14px',
          padding: '22px',
          marginBottom: '24px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(225, 29, 72, 0.08)'
        }}>
          <div style={{ position: 'absolute', top: '-15px', right: '-15px', opacity: 0.08, pointerEvents: 'none' }}>
            <i className="fas fa-heart-pulse" style={{ fontSize: '9rem', color: '#e11d48' }}></i>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px', position: 'relative', zIndex: 1 }}>
            <div style={{
              background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
              color: 'white',
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.6rem',
              flexShrink: 0,
              boxShadow: '0 4px 10px rgba(225, 29, 72, 0.3)'
            }}>
              <i className="fas fa-bell"></i>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                <h3 style={{ margin: 0, color: '#9f1239', fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Pantauan Kehadiran Hari Ini &mdash; Kelas {alphaInfo.kelas}</span>
                  <span style={{ background: '#be123c', color: 'white', fontSize: '0.78rem', padding: '3px 10px', borderRadius: '12px', fontWeight: 700 }}>
                    {alphaInfo.totalAlpha} Siswa Alpha
                  </span>
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#881337', fontWeight: 600 }}>
                  <i className="far fa-calendar-alt" style={{ marginRight: '4px' }}></i>
                  {alphaInfo.tanggalFormatted}
                </span>
              </div>

              <p style={{ margin: '0 0 14px 0', color: '#881337', fontSize: '0.95rem', lineHeight: '1.5' }}>
                Ada <strong>{alphaInfo.totalAlpha} siswa</strong> di kelas Anda yang tercatat <strong>Alpha (tidak masuk tanpa keterangan)</strong> hari ini.
                Sebagai bentuk kepedulian, silakan konfirmasi ke orang tua/wali murid di bawah ini:
              </p>

              {/* Grid Siswa Alpha */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                {alphaInfo.students.map((s: any, idx: number) => (
                  <div key={idx} style={{
                    background: 'white',
                    border: '1px solid #fecdd3',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                          {idx + 1}. {s.nama}
                        </span>
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: s.domisili.toLowerCase().includes('rumah') ? '#ecfdf5' : '#eff6ff',
                          color: s.domisili.toLowerCase().includes('rumah') ? '#047857' : '#1d4ed8',
                          fontWeight: 600
                        }}>
                          {s.domisili}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '6px' }}>
                        <i className="fas fa-clock" style={{ marginRight: '4px', color: '#e11d48' }}></i>
                        Jam {s.jamKeRingkasan} &bull; {s.mapelList.map((m: any) => m.mapel).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).join(', ')}
                      </div>
                    </div>

                    {/* WhatsApp action buttons */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '6px', borderTop: '1px dashed #f1f5f9' }}>
                      {s.ortu.waLinkIbu && (
                        <a 
                          href={s.ortu.waLinkIbu} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#22c55e',
                            color: 'white',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            textDecoration: 'none'
                          }}
                          title={`Kirim WA ke Ibu (${s.ortu.ibu || s.ortu.noHpIbu})`}
                        >
                          <i className="fab fa-whatsapp"></i> WA Ibu {s.ortu.ibu ? `(${s.ortu.ibu})` : ''}
                        </a>
                      )}

                      {s.ortu.waLinkAyah && (
                        <a 
                          href={s.ortu.waLinkAyah} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#15803d',
                            color: 'white',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            textDecoration: 'none'
                          }}
                          title={`Kirim WA ke Ayah (${s.ortu.ayah || s.ortu.noHpAyah})`}
                        >
                          <i className="fab fa-whatsapp"></i> WA Ayah {s.ortu.ayah ? `(${s.ortu.ayah})` : ''}
                        </a>
                      )}

                      {s.ortu.waLinkWali && !s.ortu.waLinkIbu && !s.ortu.waLinkAyah && (
                        <a 
                          href={s.ortu.waLinkWali} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#0284c7',
                            color: 'white',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            textDecoration: 'none'
                          }}
                        >
                          <i className="fab fa-whatsapp"></i> WA Wali {s.ortu.wali ? `(${s.ortu.wali})` : ''}
                        </a>
                      )}

                      {!s.ortu.waLinkIbu && !s.ortu.waLinkAyah && !s.ortu.waLinkWali && (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                          No HP belum tersedia di buku induk
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <a 
                  href="/presensi" 
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#e11d48',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '0.88rem'
                  }}
                >
                  <i className="fas fa-clipboard-check"></i> Buka Menu Presensi Siswa
                </a>

                <button
                  onClick={() => setShowAlphaModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'white',
                    color: '#be123c',
                    border: '1px solid #fca5a5',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer'
                  }}
                >
                  <i className="fas fa-expand"></i> Buka Pop-up Notifikasi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Box Tagihan Arsip */}
      {tagihanList.length > 0 && (
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '12px', padding: '20px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.1 }}>
            <i className="fas fa-exclamation-triangle" style={{ fontSize: '8rem', color: '#ef4444' }}></i>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', position: 'relative', zIndex: 1 }}>
            <div style={{ background: '#ef4444', color: 'white', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
              <i className="fas fa-bell"></i>
            </div>
            <div>
              <h3 style={{ margin: '0 0 4px 0', color: '#991b1b', fontSize: '1.2rem', fontWeight: 700 }}>Perhatian! Ada Tagihan Arsip Surat</h3>
              <p style={{ margin: '0 0 12px 0', color: '#b91c1c', fontSize: '0.95rem' }}>Anda menjadi Pembuat Surat (PJ) pada <strong>{tagihanList.length} surat</strong> yang arsip PDF-nya belum diunggah.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {tagihanList.slice(0, 3).map(s => (
                  <span key={s.id} style={{ background: 'white', color: '#7f1d1d', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', border: '1px solid #fca5a5', fontWeight: 600 }}>
                    {s.noSurat || 'Nomor Surat Kosong'}
                  </span>
                ))}
                {tagihanList.length > 3 && (
                  <span style={{ background: 'transparent', color: '#991b1b', padding: '4px 8px', fontSize: '0.85rem', fontWeight: 600 }}>
                    +{tagihanList.length - 3} lainnya...
                  </span>
                )}
              </div>
              <a href="/persuratan" style={{ display: 'inline-block', marginTop: '16px', background: '#dc2626', color: 'white', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                Buka Menu Persuratan <i className="fas fa-arrow-right" style={{ marginLeft: '4px' }}></i>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Box Rapor Wali Kelas */}
      {raporInfo && (
        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '12px', padding: '20px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.1 }}>
            <i className="fas fa-book-open" style={{ fontSize: '8rem', color: '#f59e0b' }}></i>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', position: 'relative', zIndex: 1 }}>
            <div style={{ background: '#f59e0b', color: 'white', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
              <i className="fas fa-book"></i>
            </div>
            <div>
              <h3 style={{ margin: '0 0 4px 0', color: '#92400e', fontSize: '1.2rem', fontWeight: 700 }}>Laporan Pengembalian Rapor &mdash; Kelas {raporInfo.kelas}</h3>
              <p style={{ margin: '0 0 12px 0', color: '#a16207', fontSize: '0.95rem' }}>
                <strong>{raporInfo.missing}</strong> dari <strong>{raporInfo.total}</strong> siswa di kelas Anda <strong>belum mengembalikan rapor</strong>.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'white', borderRadius: '8px', padding: '8px 14px', border: '1px solid #fde68a' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#d97706' }}>{raporInfo.missing}</span>
                  <span style={{ fontSize: '0.8rem', color: '#92400e', display: 'block' }}>Belum Kembali</span>
                </div>
                <div style={{ background: 'white', borderRadius: '8px', padding: '8px 14px', border: '1px solid #fde68a' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a' }}>{raporInfo.total - raporInfo.missing}</span>
                  <span style={{ fontSize: '0.8rem', color: '#166534', display: 'block' }}>Sudah Kembali</span>
                </div>
              </div>
              <a href="/pengembalian-rapor" style={{ display: 'inline-block', marginTop: '16px', background: '#d97706', color: 'white', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                Lihat Detail Pengembalian <i className="fas fa-arrow-right" style={{ marginLeft: '4px' }}></i>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Box Susulan Wali Kelas */}
      {susulanInfo && (
        <div style={{ background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '12px', padding: '20px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.1 }}>
            <i className="fas fa-clipboard-list" style={{ fontSize: '8rem', color: '#0284c7' }}></i>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', position: 'relative', zIndex: 1 }}>
            <div style={{ background: '#0284c7', color: 'white', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
              <i className="fas fa-edit"></i>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 4px 0', color: '#075985', fontSize: '1.2rem', fontWeight: 700 }}>Info Ujian Susulan &mdash; Kelas {susulanInfo.kelas}</h3>
              <p style={{ margin: '0 0 12px 0', color: '#0369a1', fontSize: '0.95rem' }}>
                Ada <strong>{susulanInfo.total}</strong> mata pelajaran yang diikuti siswa susulan di kelas Anda. 
                <strong>{susulanInfo.belumSelesai}</strong> di antaranya belum selesai.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {susulanInfo.rincian.map((r, i) => (
                  <div key={i} style={{ background: 'white', border: '1px solid #bae6fd', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className={r.isSelesai ? "fas fa-check-circle" : "fas fa-clock"} style={{ color: r.isSelesai ? '#10b981' : '#f59e0b' }}></i>
                    <span><strong>{r.nama}</strong> ({r.mapel})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Data Grid */}
      <div className={styles.detailsGrid}>
        
        {/* Kolom Informasi Pribadi */}
        <div className={styles.detailCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon}>
              <i className="fas fa-user"></i>
            </div>
            Informasi Pribadi
          </div>
          
          <div className={styles.infoList}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Tempat, Tanggal Lahir</span>
              <div className={styles.infoValue}>
                <i className="fas fa-birthday-cake" style={{ color: '#94a3b8' }}></i>
                {profile.tempatLahir || '-'}, {profile.tanggalLahir || '-'}
              </div>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Jenis Kelamin</span>
              <div className={styles.infoValue}>
                <i className={`fas ${profile.jenisKelamin.toLowerCase().includes('laki') ? 'fa-male' : 'fa-female'}`} style={{ color: '#94a3b8' }}></i>
                {profile.jenisKelamin || '-'}
              </div>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Nomor Induk Kependudukan (NIK)</span>
              <div className={styles.infoValue}>
                <i className="fas fa-address-card" style={{ color: '#94a3b8' }}></i>
                {profile.nik || '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Kontak & Alamat */}
        <div className={styles.detailCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon} style={{ background: '#3b82f6' }}>
              <i className="fas fa-address-book"></i>
            </div>
            Kontak & Alamat
          </div>
          
          <div className={styles.infoList}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Nomor WhatsApp</span>
              <div className={styles.infoValue}>
                <i className="fab fa-whatsapp" style={{ color: '#22c55e', fontSize: '1.2rem' }}></i>
                {profile.noHp || '-'}
              </div>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Email</span>
              <div className={styles.infoValue}>
                <i className="fas fa-envelope" style={{ color: '#94a3b8' }}></i>
                {profile.email || '-'}
              </div>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Alamat Rumah</span>
              <div className={styles.infoValue}>
                <i className="fas fa-map-marker-alt" style={{ color: '#ef4444' }}></i>
                {profile.alamat || '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Akses EMIS */}
        <div className={styles.detailCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon} style={{ background: '#10b981' }}>
              <i className="fas fa-key"></i>
            </div>
            Kredensial EMIS
          </div>
          
          <div className={styles.infoList}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>PEG ID</span>
              <div className={styles.infoValue}>
                <i className="fas fa-id-badge" style={{ color: '#94a3b8' }}></i>
                {profile.pegId || '-'}
              </div>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Tanggal SK Awal</span>
              <div className={styles.infoValue}>
                <i className="fas fa-calendar-alt" style={{ color: '#94a3b8' }}></i>
                {profile.tanggalSk || '-'}
              </div>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Password EMIS Hijau</span>
              <div className={styles.infoValue}>
                <i className="fas fa-lock" style={{ color: '#10b981' }}></i>
                {profile.passEmisHijau || '-'}
              </div>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Password EMIS DEV</span>
              <div className={styles.infoValue}>
                <i className="fas fa-shield-alt" style={{ color: '#8b5cf6' }}></i>
                {profile.passEmisDev || '-'}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
