'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

interface TapResult {
  actionType: 'MASUK' | 'PULANG' | 'SUDAH_MASUK' | 'ERROR';
  message: string;
  data: {
    nama: string;
    kelas: string;
    nisn: string;
    nis?: string;
    foto?: string;
    jamMasuk?: string | null;
    jamPulang?: string | null;
    statusMasuk?: string;
    tanggal?: string;
  };
}

interface PresensiItem {
  id: number;
  tanggal: string;
  kelas: string;
  nisn: string;
  nama: string;
  kehadiran: string;
  jamMasuk: string;
  jamPulang: string;
  statusMasuk: string;
  sumber: string;
}

export default function PresensiGatePage() {
  const router = useRouter();

  // Tab State: 'kiosk' | 'mapping'
  const [activeTab, setActiveTab] = useState<'kiosk' | 'mapping'>('kiosk');

  // Time & Clock
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  // Gate Scan Mode: 'auto' | 'masuk' | 'pulang'
  const [scanMode, setScanMode] = useState<'auto' | 'masuk' | 'pulang'>('auto');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Input & Focus Management
  const [scanInput, setScanInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Popup Last Scan Result
  const [lastScan, setLastScan] = useState<TapResult | null>(null);
  const [scanErrorMsg, setScanErrorMsg] = useState('');

  // Daily Stats & Live Feed
  const [stats, setStats] = useState({
    totalHadir: 0,
    tepatWaktu: 0,
    terlambat: 0,
    sudahPulang: 0
  });
  const [historyList, setHistoryList] = useState<PresensiItem[]>([]);

  // Mapping Tab State
  const [selectedKelas, setSelectedKelas] = useState('7A');
  const [mappingList, setMappingList] = useState<any[]>([]);
  const [loadingMapping, setLoadingMapping] = useState(false);
  const [searchMapping, setSearchMapping] = useState('');
  const [pairingStudent, setPairingStudent] = useState<any | null>(null);
  const [pairingUid, setPairingUid] = useState('');
  const [savingPairing, setSavingPairing] = useState(false);
  const pairingInputRef = useRef<HTMLInputElement>(null);

  // List of all classes 7A-7I, 8A-8I, 9A-9I
  const ALL_KELAS = [
    '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H', '7I',
    '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H', '8I',
    '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'
  ];

  // Digital Clock Updater (WIB)
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB');
      setCurrentDate(now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Live Feed & Stats
  const fetchGateData = async () => {
    try {
      const res = await fetch('/api/presensi-gate');
      const json = await res.json();
      if (json.success) {
        setStats(json.stats || { totalHadir: 0, tepatWaktu: 0, terlambat: 0, sudahPulang: 0 });
        setHistoryList(json.data || []);
      }
    } catch (err) {
      console.error('Fetch gate data error:', err);
    }
  };

  useEffect(() => {
    fetchGateData();
    const timer = setInterval(fetchGateData, 10000); // refresh feed every 10s
    return () => clearInterval(timer);
  }, []);

  // Keep input focused constantly in Kiosk mode
  useEffect(() => {
    if (activeTab === 'kiosk' && !pairingStudent) {
      const focusInterval = setInterval(() => {
        if (inputRef.current && document.activeElement !== inputRef.current) {
          inputRef.current.focus();
        }
      }, 500);
      return () => clearInterval(focusInterval);
    }
  }, [activeTab, pairingStudent]);

  // Text-To-Speech Audio Voice Output
  const speakGreeting = (text: string) => {
    if (!soundEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('Speech error:', e);
    }
  };

  // Handle Scan Submit (from barcode scanner or RFID reader)
  const handleScanSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = scanInput.trim();
    if (!code || isProcessing) return;

    setIsProcessing(true);
    setScanErrorMsg('');

    try {
      const res = await fetch('/api/presensi-gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, mode: scanMode })
      });

      const json = await res.json();

      if (json.success) {
        setLastScan(json);
        setScanErrorMsg('');

        // Audio Voice Announcement
        const st = json.data;
        if (json.actionType === 'MASUK') {
          if (st.statusMasuk === 'Terlambat') {
            speakGreeting(`${st.nama}, Terlambat! Jam masuk tercatat.`);
          } else {
            speakGreeting(`${st.nama}, Kelas ${st.kelas}, Hadir!`);
          }
        } else if (json.actionType === 'PULANG') {
          speakGreeting(`Hati-hati di jalan, ${st.nama}. Check out pulang berhasil.`);
        } else if (json.actionType === 'SUDAH_MASUK') {
          speakGreeting(`${st.nama}, sudah tercatat masuk hari ini.`);
        }

        // Refresh feed & stats
        fetchGateData();
      } else {
        setLastScan(null);
        setScanErrorMsg(json.error || 'Kartu atau kode barcode tidak terdaftar');
        speakGreeting('Kartu belum terdaftar!');
      }
    } catch (err: any) {
      setLastScan(null);
      setScanErrorMsg('Terjadi gangguan jaringan atau server');
    } finally {
      setScanInput('');
      setIsProcessing(false);
      if (inputRef.current) inputRef.current.focus();
    }
  };

  // Fullscreen Helper
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Fetch Mapping Students
  const fetchMapping = async (kelas: string) => {
    setLoadingMapping(true);
    try {
      const res = await fetch(`/api/presensi-gate/mapping?kelas=${encodeURIComponent(kelas)}`);
      const json = await res.json();
      if (json.success) {
        setMappingList(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMapping(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'mapping') {
      fetchMapping(selectedKelas);
    }
  }, [activeTab, selectedKelas]);

  // Open Pairing Modal
  const openPairingModal = (student: any) => {
    setPairingStudent(student);
    setPairingUid('');
    setTimeout(() => {
      if (pairingInputRef.current) pairingInputRef.current.focus();
    }, 200);
  };

  // Save Pairing RFID
  const handleSavePairing = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pairingStudent || !pairingUid.trim()) return;

    setSavingPairing(true);
    try {
      const res = await fetch('/api/presensi-gate/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: pairingStudent.id,
          rfidUid: pairingUid.trim()
        })
      });
      const json = await res.json();

      if (json.success) {
        Swal.fire({
          icon: 'success',
          title: 'Kartu Berhasil Ditautkan!',
          text: json.message,
          timer: 1600,
          showConfirmButton: false
        });
        setPairingStudent(null);
        setPairingUid('');
        fetchMapping(selectedKelas);
      } else {
        Swal.fire('Gagal Menautkan Kartu', json.error, 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setSavingPairing(false);
    }
  };

  // Delete / Unpair RFID
  const handleDeletePairing = async (student: any) => {
    const confirm = await Swal.fire({
      title: 'Hapus Tautan Kartu?',
      text: `Cabut kartu RFID dari ${student.nama}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Cabut Kartu'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await fetch('/api/presensi-gate/mapping', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId: student.id })
        });
        const json = await res.json();
        if (json.success) {
          Swal.fire('Terhapus', 'Tautan kartu berhasil dicabut.', 'success');
          fetchMapping(selectedKelas);
        } else {
          Swal.fire('Gagal', json.error, 'error');
        }
      } catch (e: any) {
        Swal.fire('Error', e.message, 'error');
      }
    }
  };

  // Filtered Mapping List
  const filteredMappingList = useMemo(() => {
    if (!searchMapping.trim()) return mappingList;
    const q = searchMapping.toLowerCase();
    return mappingList.filter(s => 
      s.nama.toLowerCase().includes(q) || 
      s.nisn.toLowerCase().includes(q) ||
      s.rfidUid.toLowerCase().includes(q)
    );
  }, [mappingList, searchMapping]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
      color: '#f8fafc',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Top Navbar */}
      <header style={{
        padding: '14px 24px',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => router.push('/')}
            style={{
              background: '#334155',
              border: 'none',
              color: 'white',
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '15px'
            }}
            title="Kembali ke Dashboard Utama"
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#0284c7',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)'
            }}>
              <i className="fas fa-id-card-alt"></i>
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.3px', color: '#ffffff' }}>
                Presensi Gerbang MTs Almaarif 01
              </h1>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Check-Clock Presensi Siswa (Tap RFID / Barcode Scanner)</span>
            </div>
          </div>
        </div>

        {/* Center Clock */}
        <div style={{
          textAlign: 'center',
          background: 'rgba(30, 41, 59, 0.7)',
          padding: '6px 18px',
          borderRadius: '12px',
          border: '1px solid #334155'
        }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#38bdf8', letterSpacing: '1px', fontFamily: 'monospace' }}>
            {currentTime || '00:00:00 WIB'}
          </div>
          <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
            {currentDate}
          </div>
        </div>

        {/* Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Tab Selector */}
          <div style={{ display: 'flex', background: '#334155', padding: '3px', borderRadius: '10px', gap: '3px' }}>
            <button
              onClick={() => setActiveTab('kiosk')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'kiosk' ? '#0284c7' : 'transparent',
                color: activeTab === 'kiosk' ? 'white' : '#94a3b8',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <i className="fas fa-desktop"></i> Kiosk Gerbang
            </button>
            <button
              onClick={() => setActiveTab('mapping')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'mapping' ? '#0284c7' : 'transparent',
                color: activeTab === 'mapping' ? 'white' : '#94a3b8',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <i className="fas fa-user-tag"></i> Pasang Kartu RFID
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: soundEnabled ? '#059669' : '#475569',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title={soundEnabled ? 'Suara Aktif' : 'Suara Muted'}
          >
            <i className={`fas ${soundEnabled ? 'fa-volume-up' : 'fa-volume-mute'}`}></i>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: '#334155',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '13px'
            }}
            title="Layar Penuh (Fullscreen)"
          >
            <i className="fas fa-expand"></i>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div style={{ flex: 1, padding: '24px', maxWidth: '1400px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        
        {/* ========================================================================= */}
        {/* TAB 1: KIOSK PRESENSI GERBANG */}
        {/* ========================================================================= */}
        {activeTab === 'kiosk' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '24px' }}>
            
            {/* Left Column: Scanner Station & Tap Result */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Scan Station Box */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.65)',
                border: '1.5px solid #334155',
                borderRadius: '20px',
                padding: '24px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Header Scanner & Mode Selector */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      display: 'inline-block',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: '#10b981',
                      boxShadow: '0 0 10px #10b981',
                      animation: 'pulse 1.5s infinite'
                    }}></span>
                    <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.5px', color: '#10b981', textTransform: 'uppercase' }}>
                      SCANNER SIAP (READY TO TAP)
                    </span>
                  </div>

                  {/* Mode Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Mode:</span>
                    <select
                      value={scanMode}
                      onChange={(e) => setScanMode(e.target.value as any)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: '#1e293b',
                        color: '#f8fafc',
                        border: '1px solid #475569',
                        fontSize: '12px',
                        fontWeight: 700,
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="auto">⚡ Otomatis (Masuk Pagi / Pulang Siang)</option>
                      <option value="masuk">🟢 Khusus Masuk (Check-In)</option>
                      <option value="pulang">🔵 Khusus Pulang (Check-Out)</option>
                    </select>
                  </div>
                </div>

                {/* Animated Scanner Radar & Hidden Input Form */}
                <form onSubmit={handleScanSubmit} style={{ position: 'relative', textAlign: 'center', padding: '16px 0' }}>
                  {/* Invisible / Auto-focused Input */}
                  <input
                    ref={inputRef}
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder="Tempelkan kartu RFID atau scan barcode..."
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '16px 20px',
                      borderRadius: '14px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '2px solid #0284c7',
                      color: '#ffffff',
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      textAlign: 'center',
                      outline: 'none',
                      boxShadow: '0 0 20px rgba(2, 132, 199, 0.25)',
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '10px' }}>
                    <i className="fas fa-info-circle" style={{ marginRight: '6px', color: '#38bdf8' }}></i>
                    Kursor selalu aktif otomatis. Silakan tempelkan kartu RFID atau sorot barcode kartu ke scanner.
                  </div>
                </form>

                {/* Loading Indicator */}
                {isProcessing && (
                  <div style={{
                    marginTop: '12px',
                    padding: '10px',
                    borderRadius: '10px',
                    background: '#0284c7',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 700,
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}>
                    <i className="fas fa-spinner fa-spin"></i> Memproses catatan presensi...
                  </div>
                )}

                {/* Scan Error Alert */}
                {scanErrorMsg && (
                  <div style={{
                    marginTop: '14px',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    background: '#ef444420',
                    border: '1.5px solid #ef4444',
                    color: '#fca5a5',
                    fontSize: '13.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <i className="fas fa-exclamation-triangle" style={{ fontSize: '20px', color: '#ef4444' }}></i>
                    <div>
                      <div style={{ fontWeight: 800 }}>Kartu Belum Terdaftar!</div>
                      <div style={{ fontSize: '12px', marginTop: '2px' }}>{scanErrorMsg}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Live Tap Result Card (Hero Card) */}
              {lastScan && lastScan.data && (
                <div style={{
                  background: lastScan.actionType === 'PULANG' 
                    ? 'linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%)' 
                    : lastScan.data.statusMasuk === 'Terlambat'
                    ? 'linear-gradient(135deg, #78350f 0%, #451a03 100%)'
                    : 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)',
                  borderRadius: '20px',
                  border: `2px solid ${
                    lastScan.actionType === 'PULANG' ? '#3b82f6' : lastScan.data.statusMasuk === 'Terlambat' ? '#f59e0b' : '#10b981'
                  }`,
                  padding: '24px',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '24px',
                  animation: 'fadeIn 0.3s ease-out'
                }}>
                  {/* Student Photo */}
                  <div style={{
                    width: '100px',
                    height: '130px',
                    borderRadius: '14px',
                    background: '#0f172a',
                    border: '3px solid white',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {lastScan.data.foto ? (
                      <img
                        src={lastScan.data.foto}
                        alt={lastScan.data.nama}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <i className="fas fa-user-graduate" style={{ fontSize: '40px', color: '#64748b' }}></i>
                    )}
                  </div>

                  {/* Student Details */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        background: lastScan.actionType === 'PULANG' ? '#3b82f6' : lastScan.data.statusMasuk === 'Terlambat' ? '#f59e0b' : '#10b981',
                        color: 'white'
                      }}>
                        {lastScan.actionType === 'PULANG' ? 'CHECK-OUT PULANG' : lastScan.data.statusMasuk === 'Terlambat' ? 'TERLAMBAT' : 'TEPAT WAKTU'}
                      </span>
                      <span style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 700 }}>
                        Kelas {lastScan.data.kelas}
                      </span>
                    </div>

                    <h2 style={{ margin: '0 0 6px 0', fontSize: '1.5rem', fontWeight: 900, color: '#ffffff' }}>
                      {lastScan.data.nama}
                    </h2>

                    <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '12px' }}>
                      NISN: <b>{lastScan.data.nisn}</b>
                    </div>

                    {/* Time Logged Grid */}
                    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Jam Masuk</div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8' }}>
                          {lastScan.data.jamMasuk ? `${lastScan.data.jamMasuk} WIB` : '-'}
                        </div>
                      </div>

                      {lastScan.data.jamPulang && (
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Jam Pulang</div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#a78bfa' }}>
                            {lastScan.data.jamPulang} WIB
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Right Column: Live Feed & Summary Counter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Counter Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid #334155', borderRadius: '14px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>TOTAL HADIR</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#38bdf8' }}>{stats.totalHadir}</div>
                </div>
                <div style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid #334155', borderRadius: '14px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>TEPAT WAKTU</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#34d399' }}>{stats.tepatWaktu}</div>
                </div>
                <div style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid #334155', borderRadius: '14px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>TERLAMBAT</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fbbf24' }}>{stats.terlambat}</div>
                </div>
                <div style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid #334155', borderRadius: '14px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>SUDAH PULANG</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#a78bfa' }}>{stats.sudahPulang}</div>
                </div>
              </div>

              {/* Live Feed Table */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.65)',
                border: '1.5px solid #334155',
                borderRadius: '20px',
                padding: '20px',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                minHeight: '400px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 800, color: '#f8fafc' }}>
                    <i className="fas fa-history" style={{ color: '#0284c7' }}></i>
                    Riwayat Tap Hari Ini
                  </div>
                  <button
                    onClick={fetchGateData}
                    style={{ background: '#334155', border: 'none', color: '#cbd5e1', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    <i className="fas fa-sync-alt"></i> Refresh
                  </button>
                </div>

                <div style={{ overflowY: 'auto', flex: 1, maxHeight: '480px' }}>
                  {historyList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                      <i className="fas fa-id-badge" style={{ fontSize: '2.5rem', marginBottom: '12px' }}></i>
                      <p style={{ margin: 0, fontWeight: 600 }}>Belum ada siswa yang tap kartu hari ini.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {historyList.slice(0, 30).map((item) => (
                        <div
                          key={item.id}
                          style={{
                            background: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '10px',
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px'
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 800, fontSize: '13px', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.nama}
                              </span>
                              <span style={{ background: '#334155', color: '#93c5fd', fontSize: '10px', fontWeight: 800, padding: '1px 6px', borderRadius: '4px' }}>
                                {item.kelas}
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                              NISN: {item.nisn}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ fontSize: '12.5px', fontWeight: 800, color: item.statusMasuk === 'Terlambat' ? '#fbbf24' : '#34d399' }}>
                              {item.jamMasuk ? `${item.jamMasuk} WIB` : '-'}
                            </div>
                            {item.jamPulang ? (
                              <div style={{ fontSize: '10.5px', color: '#a78bfa', fontWeight: 600 }}>
                                Pulang: {item.jamPulang}
                              </div>
                            ) : (
                              <div style={{ fontSize: '10px', color: item.statusMasuk === 'Terlambat' ? '#fbbf24' : '#6ee7b7' }}>
                                {item.statusMasuk}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: DAFTARKAN / MAPPING KARTU RFID SISWA */}
        {/* ========================================================================= */}
        {activeTab === 'mapping' && (
          <div style={{
            background: 'rgba(30, 41, 59, 0.75)',
            border: '1.5px solid #334155',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                  <i className="fas fa-link" style={{ color: '#0284c7', marginRight: '8px' }}></i>
                  Pemasangan / Registrasi Kartu RFID Siswa
                </h2>
                <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                  Hubungkan nomor chip kartu RFID atau stiker RFID ke masing-masing siswa per kelas.
                </p>
              </div>

              {/* Class Selector & Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#cbd5e1' }}>Pilih Kelas:</span>
                  <select
                    value={selectedKelas}
                    onChange={(e) => setSelectedKelas(e.target.value)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      background: '#1e293b',
                      color: 'white',
                      border: '1.5px solid #475569',
                      fontSize: '13px',
                      fontWeight: 800,
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {ALL_KELAS.map(k => (
                      <option key={k} value={k}>Kelas {k}</option>
                    ))}
                  </select>
                </div>

                <input
                  type="text"
                  placeholder="Cari nama / NISN..."
                  value={searchMapping}
                  onChange={(e) => setSearchMapping(e.target.value)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: '#1e293b',
                    color: 'white',
                    border: '1.5px solid #475569',
                    fontSize: '13px',
                    outline: 'none',
                    width: '200px'
                  }}
                />
              </div>
            </div>

            {/* Students Table */}
            {loadingMapping ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0284c7', marginBottom: '12px' }}></i>
                <div>Memuat data siswa kelas {selectedKelas}...</div>
              </div>
            ) : filteredMappingList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                <i className="fas fa-users-slash" style={{ fontSize: '2.5rem', marginBottom: '12px' }}></i>
                <div>Tidak ada siswa ditemukan di kelas ini.</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#1e293b', borderBottom: '2px solid #334155', color: '#94a3b8', textAlign: 'left' }}>
                      <th style={{ padding: '12px 14px', width: '50px' }}>No</th>
                      <th style={{ padding: '12px 14px' }}>Nama Lengkap Siswa</th>
                      <th style={{ padding: '12px 14px' }}>NISN / NIS</th>
                      <th style={{ padding: '12px 14px' }}>Status Kartu RFID</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Aksi Pemasangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMappingList.map((st, idx) => (
                      <tr key={st.id} style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '12px 14px', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#f8fafc' }}>
                          {st.nama}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#cbd5e1' }}>
                          <div>NISN: {st.nisn || '-'}</div>
                          {st.nis && <div style={{ fontSize: '11px', color: '#64748b' }}>NIS: {st.nis}</div>}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {st.rfidUid ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: '#064e3b',
                              color: '#34d399',
                              border: '1px solid #059669',
                              padding: '3px 10px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: 800,
                              fontFamily: 'monospace'
                            }}>
                              <i className="fas fa-check-circle"></i> {st.rfidUid}
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: '#47556940',
                              color: '#94a3b8',
                              border: '1px dashed #475569',
                              padding: '3px 10px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: 600
                            }}>
                              <i className="fas fa-times-circle"></i> Belum ada kartu
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => openPairingModal(st)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                background: st.rfidUid ? '#3b82f6' : '#10b981',
                                color: 'white',
                                border: 'none',
                                fontWeight: 700,
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <i className="fas fa-wifi"></i>
                              {st.rfidUid ? 'Ganti Kartu' : 'Pasang Kartu'}
                            </button>

                            {st.rfidUid && (
                              <button
                                onClick={() => handleDeletePairing(st)}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '8px',
                                  background: '#ef444420',
                                  color: '#f87171',
                                  border: '1px solid #ef4444',
                                  fontSize: '12px',
                                  cursor: 'pointer'
                                }}
                                title="Cabut Kartu"
                              >
                                <i className="fas fa-trash-alt"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modal Pairing / Scan Kartu RFID Baru */}
      {pairingStudent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#1e293b',
            border: '2px solid #0284c7',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '460px',
            padding: '26px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#0284c720',
              border: '2px solid #0284c7',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              margin: '0 auto 16px auto'
            }}>
              <i className="fas fa-id-card"></i>
            </div>

            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 800, color: 'white' }}>
              Tempelkan Kartu RFID
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#94a3b8' }}>
              Memasangkan kartu ke siswa: <b style={{ color: '#38bdf8' }}>{pairingStudent.nama}</b> ({selectedKelas})
            </p>

            <form onSubmit={handleSavePairing}>
              <input
                ref={pairingInputRef}
                type="text"
                value={pairingUid}
                onChange={(e) => setPairingUid(e.target.value)}
                placeholder="Tempelkan kartu RFID sekarang..."
                autoFocus
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  background: '#0f172a',
                  border: '2px solid #38bdf8',
                  color: 'white',
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  textAlign: 'center',
                  fontFamily: 'monospace',
                  outline: 'none',
                  boxSizing: 'border-box',
                  marginBottom: '16px'
                }}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setPairingStudent(null)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    background: '#334155',
                    color: '#cbd5e1',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingPairing || !pairingUid.trim()}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    fontWeight: 700,
                    cursor: savingPairing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  {savingPairing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                  Simpan Kartu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
