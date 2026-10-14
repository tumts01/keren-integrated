'use client';
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true); // default true until mounted check

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] SW registration failed:', err);
        });
    }

    // 2. Check standalone display mode (already installed)
    const standaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    setIsStandalone(standaloneMode);
    if (standaloneMode) return;

    // 3. Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    // 4. Check if dismissed recently in this session
    const dismissedSession = sessionStorage.getItem('keren_pwa_dismissed');
    if (dismissedSession) {
      setIsDismissed(true);
    } else {
      setIsDismissed(false);
    }

    // 5. Capture beforeinstallprompt for Android Chrome / Chromium
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsDismissed(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 6. Listen to appinstalled event
    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      Swal.fire({
        icon: 'success',
        title: 'Aplikasi Terpasang!',
        text: 'KEREN kini telah ditambahkan ke Layar Utama HP Anda.',
        timer: 3000,
        showConfirmButton: false
      });
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsDismissed(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      Swal.fire({
        title: '📲 Pasang di Layar Utama iPhone',
        html: `
          <div style="text-align: left; font-size: 13.5px; line-height: 1.6; color: #334155;">
            <p style="margin: 0 0 10px 0;">Untuk memasang aplikasi KEREN di iPhone / iPad:</p>
            <ol style="padding-left: 20px; margin: 0 0 14px 0;">
              <li style="margin-bottom: 8px;">Ketuk tombol <b>Bagikan (Share)</b> <i class="fas fa-share-square" style="color: #0284c7;"></i> di bilah bawah Safari.</li>
              <li style="margin-bottom: 8px;">Gulir ke bawah dan pilih menu <b>"Tambahkan ke Layar Utama"</b> (<i>Add to Home Screen</i>) ➕.</li>
              <li>Ketuk <b>"Tambah"</b> (<i>Add</i>) di sudut kanan atas.</li>
            </ol>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px; font-size: 12px; color: #166534;">
              <i class="fas fa-check-circle"></i> Ikon KEREN akan langsung muncul di Layar Utama HP Anda seperti aplikasi biasa!
            </div>
          </div>
        `,
        confirmButtonColor: '#0284c7',
        confirmButtonText: 'Saya Mengerti'
      });
    } else {
      // Android browser where prompt hasn't triggered yet
      Swal.fire({
        title: '📲 Pasang Aplikasi',
        html: `
          <div style="text-align: left; font-size: 13px; line-height: 1.6; color: #334155;">
            <p>Jika dialog otomatis belum muncul, Anda dapat memasangnya secara manual:</p>
            <ol style="padding-left: 20px; margin: 0 0 10px 0;">
              <li>Ketuk <b>menu titik tiga (⋮)</b> di sudut kanan atas browser Anda.</li>
              <li>Pilih menu <b>"Pasang Aplikasi"</b> (<i>Install App</i>) atau <b>"Tambahkan ke Layar Utama"</b> (<i>Add to Home Screen</i>).</li>
            </ol>
          </div>
        `,
        confirmButtonColor: '#0284c7',
        confirmButtonText: 'Baik, Mengerti'
      });
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('keren_pwa_dismissed', 'true');
  };

  // If running standalone or dismissed, don't show
  if (isStandalone || isDismissed) {
    return null;
  }

  return (
    <aside 
      aria-label="Pemasangan Aplikasi"
      className="no-print" 
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '460px',
        zIndex: 99999,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#ffffff',
        borderRadius: '16px',
        padding: '12px 14px',
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.35), 0 4px 10px rgba(0, 0, 0, 0.15)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        animation: 'fadeInUp 0.3s ease-out'
      }}
    >
      {/* App Icon */}
      <img 
        src="/logo.png" 
        alt="KEREN Logo" 
        style={{ 
          width: '38px', 
          height: '38px', 
          borderRadius: '10px', 
          background: '#ffffff', 
          padding: '4px',
          flexShrink: 0,
          objectFit: 'contain'
        }} 
      />

      {/* Text Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
          Pasang Aplikasi KEREN
        </div>
        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Akses lebih cepat langsung dari layar HP
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleInstallClick}
        style={{
          background: 'linear-gradient(135deg, #0284c7, #0369a1)',
          color: '#ffffff',
          border: 'none',
          padding: '8px 14px',
          borderRadius: '10px',
          fontSize: '12px',
          fontWeight: 700,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 2px 6px rgba(2, 132, 199, 0.4)'
        }}
      >
        <i className="fas fa-download"></i> Pasang
      </button>

      {/* Dismiss Button */}
      <button
        onClick={handleDismiss}
        title="Tutup"
        style={{
          background: 'none',
          border: 'none',
          color: '#64748b',
          fontSize: '16px',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <i className="fas fa-times"></i>
      </button>
    </aside>
  );
}
