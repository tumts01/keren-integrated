'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import styles from './gate.module.css';

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

  // Tab State: 'kiosk' | 'audit' | 'mapping'
  const [activeTab, setActiveTab] = useState<'kiosk' | 'audit' | 'mapping'>('kiosk');

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
    sudahPulang: 0,
    dibatalkan: 0
  });
  const [historyList, setHistoryList] = useState<PresensiItem[]>([]);
  const [auditList, setAuditList] = useState<any[]>([]);
  const [auditDate, setAuditDate] = useState(() => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wib = new Date(utc + (7 * 3600000));
    return `${wib.getFullYear()}-${String(wib.getMonth() + 1).padStart(2, '0')}-${String(wib.getDate()).padStart(2, '0')}`;
  });
  const [loadingAudit, setLoadingAudit] = useState(false);

  // In-Memory Directory Cache untuk 0ms Instant Tap Lookup di Kiosk
  const directoryMapRef = useRef<Map<string, any>>(new Map());
  const recentTapsRef = useRef<Record<string, { jamMasuk: string; jamPulang: string | null; statusMasuk: string }>>({});

  const indexDirectoryItems = (items: any[]) => {
    const map = directoryMapRef.current;
    for (const item of items) {
      if (!item) continue;
      if (item.rfidUid) {
        map.set(String(item.rfidUid).trim().toLowerCase(), item);
      }
      if (item.nisn && item.nisn !== '-') {
        const n = String(item.nisn).trim().toLowerCase();
        map.set(n, item);
        const nClean = n.replace(/^0+/, '');
        if (nClean) map.set(nClean, item);
      }
      if (item.nis) {
        const s = String(item.nis).trim().toLowerCase();
        map.set(s, item);
        const sClean = s.replace(/^0+/, '');
        if (sClean) map.set(sClean, item);
      }
    }
  };

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
        const list: PresensiItem[] = json.data || [];
        setStats(json.stats || { totalHadir: 0, tepatWaktu: 0, terlambat: 0, sudahPulang: 0, dibatalkan: 0 });
        setHistoryList(list);
        if (Array.isArray(json.auditList)) {
          setAuditList(json.auditList);
        }

        // Sinkronkan riwayat tap hari ini ke memori lokal untuk deteksi masuk/pulang 0ms
        const taps: Record<string, { jamMasuk: string; jamPulang: string | null; statusMasuk: string }> = {};
        // 1. Masukkan data presensi GTK dari menu Absensi GTK (HP/Web) agar jika pagi absen di menu Absensi GTK,
        //    sore tap di gerbang langsung terdeteksi sebagai PULANG
        if (json.gtkTaps && typeof json.gtkTaps === 'object') {
          for (const [gtkKey, val] of Object.entries(json.gtkTaps as Record<string, any>)) {
            if (gtkKey && val?.jamMasuk) {
              taps[gtkKey] = {
                jamMasuk: val.jamMasuk,
                jamPulang: val.jamPulang || null,
                statusMasuk: val.statusMasuk || 'Tepat Waktu'
              };
            }
          }
        }
        // 2. Masukkan/gabungkan data dari feed gerbang
        for (const item of list) {
          const key = (item.nama || '').trim().toLowerCase();
          if (key) {
            taps[key] = {
              jamMasuk: item.jamMasuk || taps[key]?.jamMasuk || '',
              jamPulang: item.jamPulang || taps[key]?.jamPulang || null,
              statusMasuk: item.statusMasuk || taps[key]?.statusMasuk || 'Tepat Waktu'
            };
          }
        }
        recentTapsRef.current = taps;
      }
    } catch (err) {
      console.error('Fetch gate data error:', err);
    }
  };

  // Preload kamus kartu RFID & Siswa ke RAM browser agar saat tap kartu 0ms (tanpa loading)
  const preloadDirectory = async () => {
    try {
      // Tahap 1: Muat semua kartu RFID aktif + Guru (<100ms)
      const resFast = await fetch('/api/presensi-gate?directory=rfid');
      const jsonFast = await resFast.json();
      if (jsonFast.success && Array.isArray(jsonFast.directory)) {
        indexDirectoryItems(jsonFast.directory);
      }

      // Tahap 2: Muat seluruh kamus barcode NISN/NIS di background
      const resFull = await fetch('/api/presensi-gate?directory=full');
      const jsonFull = await resFull.json();
      if (jsonFull.success && Array.isArray(jsonFull.directory)) {
        indexDirectoryItems(jsonFull.directory);
      }
    } catch (e) {
      console.error('Preload directory error:', e);
    }
  };

  useEffect(() => {
    fetchGateData();
    preloadDirectory();
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

  // Text-To-Speech Audio Voice Output (Suara Perempuan Natural Google + Preload 0ms)
  const audioCacheRef = useRef<Map<string, string>>(new Map());
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const femaleVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Preload kalimat singkat dengan suara perempuan Google yang jernih ke RAM browser
    const PHRASES = [
      'Selamat datang, presensi berhasil',
      'Terlambat, presensi masuk tercatat',
      'Presensi pulang berhasil, hati-hati di jalan',
      'Sudah tercatat masuk hari ini',
      'Kartu belum terdaftar',
      'Presensi dibatalkan, tercatat alpha di kelas'
    ];
    PHRASES.forEach((phrase) => {
      fetch(`/api/presensi-gate/tts?q=${encodeURIComponent(phrase)}`)
        .then(r => (r.ok ? r.blob() : null))
        .then(blob => {
          if (blob) {
            audioCacheRef.current.set(phrase, URL.createObjectURL(blob));
          }
        })
        .catch(() => {});
    });

    // 2. Kunci pilhan suara perempuan pada Web Speech API (hindari suara laki-laki 'Microsoft Andika')
    if ('speechSynthesis' in window) {
      const pickFemaleIndonesianVoice = () => {
        const voices = window.speechSynthesis.getVoices() || [];
        const idVoices = voices.filter(v => v.lang.toLowerCase().startsWith('id'));
        const bestFemale =
          idVoices.find(v => /gadis|google|female|perempuan|wanita|damayanti/i.test(v.name)) ||
          idVoices.find(v => !/andika|ardi|male|pria/i.test(v.name)) ||
          idVoices[0] ||
          null;
        if (bestFemale) femaleVoiceRef.current = bestFemale;
      };
      pickFemaleIndonesianVoice();
      window.speechSynthesis.onvoiceschanged = pickFemaleIndonesianVoice;
    }
  }, []);

  const speakGreeting = (text: string) => {
    if (!soundEnabled || typeof window === 'undefined') return;

    // Hentikan audio sebelumnya agar tap beruntun langsung responsif
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch {}
    }
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }

    // Prioritas 1: Putar Audio Suara Perempuan Google yang sudah di-cache di RAM (0ms, konsisten jernih)
    const cachedUrl = audioCacheRef.current.get(text) || `/api/presensi-gate/tts?q=${encodeURIComponent(text)}`;
    try {
      const audio = new Audio(cachedUrl);
      audio.playbackRate = 1.08;
      currentAudioRef.current = audio;
      audio.play().catch(() => {
        // Fallback ke Web Speech API dengan mengunci voice perempuan jika offline
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'id-ID';
          if (femaleVoiceRef.current) utterance.voice = femaleVoiceRef.current;
          utterance.rate = 1.05;
          utterance.pitch = 1.1;
          window.speechSynthesis.speak(utterance);
        }
      });
    } catch (e) {
      console.error('Speech error:', e);
    }
  };

  // Helper pengucapan suara singkat tanpa menyebut nama (agar antrean tap cepat)
  const announceScanResult = (actionType: string, st: any, _isGuru?: boolean) => {
    if (actionType === 'MASUK') {
      if (st?.statusMasuk === 'DIBATALKAN') {
        speakGreeting('Presensi dibatalkan, tercatat alpha di kelas');
      } else if (st?.statusMasuk === 'Terlambat') {
        speakGreeting('Terlambat, presensi masuk tercatat');
      } else {
        speakGreeting('Selamat datang, presensi berhasil');
      }
    } else if (actionType === 'PULANG') {
      speakGreeting('Presensi pulang berhasil, hati-hati di jalan');
    } else if (actionType === 'SUDAH_MASUK') {
      speakGreeting('Sudah tercatat masuk hari ini');
    }
  };

  // Handle Scan Submit (from barcode scanner or RFID reader)
  const handleScanSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = scanInput.trim();
    if (!code) return;

    // Instant clear input field so subsequent rapid scans/multi-readers are never blocked
    setScanInput('');
    setScanErrorMsg('');
    if (inputRef.current) inputRef.current.focus();

    const rawKey = code.toLowerCase();
    const cleanKey = code.replace(/^0+/, '').toLowerCase();
    const matched = directoryMapRef.current.get(rawKey) || (cleanKey ? directoryMapRef.current.get(cleanKey) : null);

    // =========================================================================
    // JALUR KILAT 0ms (INSTANT IN-MEMORY MATCH - TANPA TUNGGU LOADING SERVER)
    // =========================================================================
    if (matched) {
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const wib = new Date(utc + (7 * 3600000));
      const yyyy = wib.getFullYear();
      const mm = String(wib.getMonth() + 1).padStart(2, '0');
      const dd = String(wib.getDate()).padStart(2, '0');
      const tanggal = `${yyyy}-${mm}-${dd}`;
      const hh = String(wib.getHours()).padStart(2, '0');
      const min = String(wib.getMinutes()).padStart(2, '0');
      const ss = String(wib.getSeconds()).padStart(2, '0');
      const jam = `${hh}:${min}:${ss}`;

      const personKey = (matched.nama || '').trim().toLowerCase();
      const prevTap = recentTapsRef.current[personKey];
      const isGuru = matched.role === 'GURU' || matched.kelas === 'GURU / GTK';

      let actionType: 'MASUK' | 'PULANG' | 'SUDAH_MASUK' = 'MASUK';
      let jamMasuk = jam;
      let jamPulang: string | null = null;
      let statusMasuk = isGuru ? 'Tepat Waktu' : (jam > '06:45:00' ? 'Terlambat' : 'Tepat Waktu');
      let message = '';

      if (!prevTap || !prevTap.jamMasuk) {
        actionType = 'MASUK';
        jamMasuk = jam;
        jamPulang = null;
        message = isGuru
          ? `Check-in Guru Berhasil: ${matched.nama}`
          : (statusMasuk === 'Terlambat' ? 'Check-in Berhasil (Terlambat)' : 'Check-in Berhasil (Tepat Waktu)');

        recentTapsRef.current[personKey] = { jamMasuk, jamPulang: null, statusMasuk };

        // Update Live Feed & Stats secara instan (Optimistic UI)
        const newFeedItem: PresensiItem = {
          id: Date.now(),
          tanggal,
          kelas: isGuru ? 'GTK' : matched.kelas,
          nisn: matched.nisn || '-',
          nama: matched.nama,
          kehadiran: 'H',
          jamMasuk,
          jamPulang: '',
          statusMasuk,
          sumber: 'GATE'
        };
        setHistoryList(prev => [newFeedItem, ...prev.filter(x => (x.nama || '').toLowerCase() !== personKey)]);
        setStats(prev => ({
          ...prev,
          totalHadir: prev.totalHadir + 1,
          tepatWaktu: statusMasuk === 'Tepat Waktu' ? prev.tepatWaktu + 1 : prev.tepatWaktu,
          terlambat: statusMasuk === 'Terlambat' ? prev.terlambat + 1 : prev.terlambat
        }));
      } else {
        jamMasuk = prevTap.jamMasuk;
        statusMasuk = prevTap.statusMasuk || 'Tepat Waktu';

        // Cek selisih menit sejak jam masuk untuk cegah double-tap tidak sengaja (< 3 menit)
        const parts = jamMasuk.replace('.', ':').split(':').map(Number);
        const totalDetikMasuk = ((parts[0] || 0) * 3600) + ((parts[1] || 0) * 60) + (parts[2] || 0);
        const totalDetikNow = (Number(hh) * 3600) + (Number(min) * 60) + Number(ss);
        const selisihMenit = (totalDetikNow - totalDetikMasuk) / 60;

        if (!prevTap.jamPulang && selisihMenit < 3 && scanMode === 'auto') {
          actionType = 'SUDAH_MASUK';
          jamPulang = null;
          message = `${isGuru ? 'Bapak/Ibu' : 'Siswa'} ${matched.nama} sudah tercatat masuk pada pukul ${jamMasuk} WIB`;
        } else {
          actionType = 'PULANG';
          jamPulang = jam;
          message = isGuru ? `Check-out Pulang Guru Berhasil: ${matched.nama}` : 'Check-out Pulang Berhasil';
          const hadPulangBefore = Boolean(prevTap.jamPulang);
          recentTapsRef.current[personKey] = { jamMasuk, jamPulang, statusMasuk };

          setHistoryList(prev => {
            const existsInFeed = prev.some(x => (x.nama || '').toLowerCase() === personKey);
            if (existsInFeed) {
              return prev.map(x =>
                (x.nama || '').toLowerCase() === personKey ? { ...x, jamPulang: jam } : x
              );
            }
            const newPulangFeedItem: PresensiItem = {
              id: Date.now(),
              tanggal,
              kelas: isGuru ? 'GTK' : matched.kelas,
              nisn: matched.nisn || '-',
              nama: matched.nama,
              kehadiran: 'H',
              jamMasuk,
              jamPulang: jam,
              statusMasuk,
              sumber: 'GATE'
            };
            return [newPulangFeedItem, ...prev];
          });
          if (!hadPulangBefore) {
            setStats(prev => ({ ...prev, sudahPulang: prev.sudahPulang + 1 }));
          }
        }
      }

      const instantScanResult: TapResult = {
        actionType,
        message,
        data: {
          ...matched,
          jamMasuk,
          jamPulang,
          statusMasuk,
          tanggal
        }
      };

      // Tampilkan Kartu Profil & Bunyikan Suara DETIK ITU JUGA (0ms)
      setLastScan(instantScanResult);
      announceScanResult(actionType, instantScanResult.data, isGuru);

      // Simpan ke database Supabase di background tanpa menahan antrean tap berikutnya
      if (actionType !== 'SUDAH_MASUK') {
        fetch('/api/presensi-gate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, mode: scanMode, preMatched: matched })
        })
          .then(r => r.json())
          .then(srvJson => {
            // Jika status di server berbeda dengan prediksi memori lokal (misal baru saja absen di HP <10 detik lalu),
            // otomatis sesuaikan tampilan & suara dengan status sebenarnya dari server
            if (srvJson?.success && srvJson.actionType && srvJson.actionType !== actionType) {
              setLastScan(srvJson);
              announceScanResult(srvJson.actionType, srvJson.data, srvJson.isGuru);
              fetchGateData();
            }
          })
          .catch(err => console.error('Background sync gate error:', err));
      }

      return;
    }

    // =========================================================================
    // FALLBACK SERVER (~150ms): Jika kartu baru didaftarkan & belum ada di RAM
    // =========================================================================
    setIsProcessing(true);
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
        // Simpan ke kamus lokal agar tap berikutnya 0ms
        if (json.data) {
          indexDirectoryItems([{ ...json.data, rfidUid: json.data.rfidUid || code }]);
        }
        announceScanResult(json.actionType, json.data, json.isGuru);
        fetchGateData();
      } else {
        setLastScan(null);
        setScanErrorMsg(json.error || 'Kartu atau kode barcode tidak terdaftar');
        speakGreeting('Kartu belum terdaftar');
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

  // Fetch Audit Data by Date
  const fetchAuditByDate = async (tgl: string) => {
    setLoadingAudit(true);
    try {
      const res = await fetch(`/api/presensi-gate?tanggal=${encodeURIComponent(tgl)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.auditList)) {
        setAuditList(json.auditList);
      }
    } catch (e) {
      console.error('Fetch audit error:', e);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditByDate(auditDate);
    }
  }, [activeTab, auditDate]);

  // Pulihkan Presensi (jika ternyata bukan titip kartu, misal izin UKS / dipanggil guru)
  const handleRestoreAudit = async (item: any) => {
    const { value: alasan, isConfirmed } = await Swal.fire({
      title: `Pulihkan Presensi ${item.nama}?`,
      input: 'text',
      inputLabel: 'Alasan Pemulihan (misal: Sedang di UKS / Dipanggil BK / Salah Input Guru)',
      inputPlaceholder: 'Ketik alasan pemulihan...',
      inputValue: 'Konfirmasi hadir (Sedang izin keluar kelas / salah klik)',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      confirmButtonText: 'Ya, Pulihkan Hadir',
      cancelButtonText: 'Batal'
    });

    if (!isConfirmed) return;

    try {
      const res = await fetch('/api/presensi-gate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, action: 'pulihkan', catatan: alasan })
      });
      const json = await res.json();
      if (json.success) {
        Swal.fire('Berhasil Dipulihkan', json.message, 'success');
        fetchAuditByDate(auditDate);
        fetchGateData();
      } else {
        Swal.fire('Gagal', json.error, 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  // Kelola / Tetapkan Sanksi Pelanggaran RFID
  const handleUpdateSanksi = async (item: any) => {
    const buddyInfo = Array.isArray(item.terdugaPembawa) && item.terdugaPembawa.length > 0
      ? item.terdugaPembawa.map((b: any) => `${b.nama} (${b.kelas}) - selisih ${b.selisihDetik} dtk`).join(', ')
      : 'Tidak terlacak';

    const { value: formValues, isConfirmed } = await Swal.fire({
      title: `Penetapan Sanksi RFID`,
      html: `
        <div style="text-align:left;font-size:13px;">
          <div style="background:#fef2f2;border:1px solid #fecaca;padding:10px;border-radius:8px;margin-bottom:12px;color:#991b1b;">
            <b>Pelanggar:</b> ${item.nama} (Kelas ${item.kelas})<br/>
            <b>Tap Gerbang:</b> ${item.jamMasuk} WIB vs <b>Kelas Jam-${item.auditJamKe}:</b> ${item.auditStatusKelas}<br/>
            <b>Terduga Pembawa Kartu:</b> ${buddyInfo}
          </div>
          <label style="font-weight:700;display:block;margin-bottom:4px;color:#334155;">Jenis Sanksi:</label>
          <select id="swal-sanksi" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid #cbd5e1;margin-bottom:10px;font-size:13px;">
            <option value="Presensi RFID Dibatalkan & Pembinaan Ketertiban/BK" ${item.auditSanksi?.includes('Pembinaan') ? 'selected' : ''}>Presensi RFID Dibatalkan & Pembinaan Ketertiban/BK</option>
            <option value="Presensi RFID Dibatalkan & Kartu Disita Sementara" ${item.auditSanksi?.includes('Disita') ? 'selected' : ''}>Presensi RFID Dibatalkan & Kartu Disita Sementara</option>
            <option value="Presensi RFID Dibatalkan & Sanksi Poin Pelanggaran Disiplin" ${item.auditSanksi?.includes('Poin') ? 'selected' : ''}>Presensi RFID Dibatalkan & Sanksi Poin Pelanggaran Disiplin</option>
            <option value="Presensi RFID Dibatalkan & Panggilan Orang Tua / Wali" ${item.auditSanksi?.includes('Orang Tua') ? 'selected' : ''}>Presensi RFID Dibatalkan & Panggilan Orang Tua / Wali</option>
          </select>
          <label style="font-weight:700;display:block;margin-bottom:4px;color:#334155;">Catatan Tindak Lanjut / Petugas:</label>
          <input id="swal-catatan" type="text" value="${item.auditCatatan || ''}" placeholder="Misal: Sudah dipanggil ke ruang BK..." style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid #cbd5e1;margin-bottom:12px;font-size:13px;box-sizing:border-box;" />
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:700;color:#b91c1c;">
            <input id="swal-pembawa" type="checkbox" ${item.pembawaKenaSanksi ? 'checked' : ''} style="width:16px;height:16px;" />
            Beri sanksi juga kepada Terduga Pembawa Kartu
          </label>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Simpan & Terapkan Sanksi',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const sanksi = (document.getElementById('swal-sanksi') as HTMLSelectElement)?.value;
        const catatan = (document.getElementById('swal-catatan') as HTMLInputElement)?.value;
        const pembawaKenaSanksi = (document.getElementById('swal-pembawa') as HTMLInputElement)?.checked;
        return { sanksi, catatan, pembawaKenaSanksi };
      }
    });

    if (!isConfirmed || !formValues) return;

    try {
      const res = await fetch('/api/presensi-gate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          action: 'sanksi',
          sanksi: formValues.sanksi,
          catatan: formValues.catatan,
          pembawaKenaSanksi: formValues.pembawaKenaSanksi
        })
      });
      const json = await res.json();
      if (json.success) {
        Swal.fire('Tersimpan', json.message, 'success');
        fetchAuditByDate(auditDate);
        fetchGateData();
      } else {
        Swal.fire('Gagal', json.error, 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
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
          rfidUid: pairingUid.trim(),
          role: pairingStudent.role || (selectedKelas === 'GURU' ? 'GURU' : 'SISWA')
        })
      });
      const json = await res.json();

      if (json.success) {
        const savedUid = pairingUid.trim();
        const targetId = pairingStudent.id;
        // Tambahkan langsung ke kamus memori lokal Kiosk agar siap di-tap detik itu juga
        indexDirectoryItems([{ ...pairingStudent, rfidUid: savedUid }]);
        Swal.fire({
          icon: 'success',
          title: 'Kartu Berhasil Ditautkan!',
          text: json.message,
          timer: 1600,
          showConfirmButton: false
        });
        setPairingStudent(null);
        setPairingUid('');
        // Update state lokal langsung agar tabel langsung berubah tanpa menunggu refresh
        setMappingList(prev => prev.map(item => {
          if (item.id === targetId) {
            return { ...item, rfidUid: savedUid };
          }
          return item;
        }));
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
          body: JSON.stringify({ 
            studentId: student.id,
            role: student.role || (selectedKelas === 'GURU' ? 'GURU' : 'SISWA')
          })
        });
        const json = await res.json();
        if (json.success) {
          const targetId = student.id;
          if (student.rfidUid) {
            directoryMapRef.current.delete(String(student.rfidUid).trim().toLowerCase());
          }
          Swal.fire('Terhapus', 'Tautan kartu berhasil dicabut.', 'success');
          setMappingList(prev => prev.map(item => {
            if (item.id === targetId) {
              return { ...item, rfidUid: '' };
            }
            return item;
          }));
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
      (s.nama || '').toLowerCase().includes(q) || 
      (s.nisn || '').toLowerCase().includes(q) ||
      (s.nis || '').toLowerCase().includes(q) ||
      (s.rfidUid || '').toLowerCase().includes(q)
    );
  }, [mappingList, searchMapping]);

  return (
    <div className={styles.gateWrapper}>
      {/* Top Navbar */}
      <header className={styles.gateHeader}>
        <div className={styles.headerLeft}>
          <button
            onClick={() => router.push('/')}
            className={styles.btnBack}
            title="Kembali ke Dashboard Utama"
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          <div className={styles.brandInfo}>
            <div className={styles.brandIcon}>
              <i className="fas fa-id-card-alt"></i>
            </div>
            <div>
              <h1 className={styles.brandTitle}>
                Presensi Gerbang MTs Almaarif 01
              </h1>
              <span className={styles.brandSubtitle}>Check-Clock Siswa (Tap RFID / Barcode Scanner)</span>
            </div>
          </div>
        </div>

        {/* Center Clock */}
        <div className={styles.clockBox}>
          <div className={styles.clockTime}>
            {currentTime || '00:00:00 WIB'}
          </div>
          <div className={styles.clockDate}>
            {currentDate}
          </div>
        </div>

        {/* Right Controls */}
        <div className={styles.headerControls}>
          {/* Tab Selector */}
          <div className={styles.tabPills}>
            <button
              onClick={() => setActiveTab('kiosk')}
              className={`${styles.tabBtn} ${activeTab === 'kiosk' ? styles.tabBtnActive : ''}`}
            >
              <i className="fas fa-desktop"></i> Kiosk Gerbang
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`${styles.tabBtn} ${activeTab === 'audit' ? styles.tabBtnActive : ''}`}
              style={{ position: 'relative' }}
            >
              <i className="fas fa-shield-alt" style={{ color: stats.dibatalkan > 0 ? '#f87171' : undefined }}></i> Audit & Sanksi
              {stats.dibatalkan > 0 && (
                <span style={{
                  marginLeft: '6px',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 900,
                  padding: '1px 6px',
                  borderRadius: '999px',
                  boxShadow: '0 0 8px rgba(239,68,68,0.8)'
                }}>
                  {stats.dibatalkan}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('mapping')}
              className={`${styles.tabBtn} ${activeTab === 'mapping' ? styles.tabBtnActive : ''}`}
            >
              <i className="fas fa-user-tag"></i> Pasang Kartu RFID
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={styles.iconBtn}
            style={{ background: soundEnabled ? '#059669' : '#475569' }}
            title={soundEnabled ? 'Suara Aktif' : 'Suara Muted'}
          >
            <i className={`fas ${soundEnabled ? 'fa-volume-up' : 'fa-volume-mute'}`}></i>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className={styles.iconBtn}
            style={{ background: '#334155' }}
            title="Layar Penuh (Fullscreen)"
          >
            <i className="fas fa-expand"></i>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className={styles.mainContainer}>
        
        {/* ========================================================================= */}
        {/* TAB 1: KIOSK PRESENSI GERBANG */}
        {/* ========================================================================= */}
        {activeTab === 'kiosk' && (
          <div className={styles.kioskLayout}>
            
            {/* Left Column: Scanner Station & Tap Result */}
            <div className={styles.columnLeft}>
              
              {/* Scan Station Box */}
              <div className={styles.scanCard}>
                {/* Header Scanner & Mode Selector */}
                <div className={styles.scanHeader}>
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
                  <div className={styles.modeSelectWrapper}>
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
                <form onSubmit={handleScanSubmit} style={{ position: 'relative', textAlign: 'center', padding: '10px 0' }}>
                  {/* Auto-focused Input */}
                  <input
                    ref={inputRef}
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder="Tempelkan kartu RFID atau scan barcode..."
                    autoFocus
                    className={styles.scanInput}
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
                <div 
                  className={styles.heroCard}
                  style={{
                    background: lastScan.actionType === 'PULANG' 
                      ? 'linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%)' 
                      : lastScan.data.statusMasuk === 'Terlambat'
                      ? 'linear-gradient(135deg, #78350f 0%, #451a03 100%)'
                      : 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)',
                    border: `2px solid ${
                      lastScan.actionType === 'PULANG' ? '#3b82f6' : lastScan.data.statusMasuk === 'Terlambat' ? '#f59e0b' : '#10b981'
                    }`
                  }}
                >
                  {/* Student Photo */}
                  <div className={styles.heroPhoto}>
                    {lastScan.data.foto ? (
                      <img
                        src={lastScan.data.foto}
                        alt={lastScan.data.nama}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <i className="fas fa-user-graduate" style={{ fontSize: '32px', color: '#64748b' }}></i>
                    )}
                  </div>

                  {/* Student Details */}
                  <div className={styles.heroDetails}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
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

                    <h2 className={styles.heroName}>
                      {lastScan.data.nama}
                    </h2>

                    <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '10px' }}>
                      NISN: <b>{lastScan.data.nisn}</b>
                    </div>

                    {/* Time Logged Grid */}
                    <div className={styles.heroTimeGrid}>
                      <div className={styles.timeBadge}>
                        <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Jam Masuk</div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8' }}>
                          {lastScan.data.jamMasuk ? `${lastScan.data.jamMasuk} WIB` : '-'}
                        </div>
                      </div>

                      {lastScan.data.jamPulang && (
                        <div className={styles.timeBadge}>
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
            <div className={styles.columnRight}>
              
              {/* Counter Grid */}
              <div className={styles.counterGrid}>
                <div className={styles.counterBox}>
                  <div className={styles.counterLabel}>TOTAL HADIR</div>
                  <div className={styles.counterNum} style={{ color: '#38bdf8' }}>{stats.totalHadir}</div>
                </div>
                <div className={styles.counterBox}>
                  <div className={styles.counterLabel}>TEPAT WAKTU</div>
                  <div className={styles.counterNum} style={{ color: '#34d399' }}>{stats.tepatWaktu}</div>
                </div>
                <div className={styles.counterBox}>
                  <div className={styles.counterLabel}>TERLAMBAT</div>
                  <div className={styles.counterNum} style={{ color: '#fbbf24' }}>{stats.terlambat}</div>
                </div>
                <div className={styles.counterBox}>
                  <div className={styles.counterLabel}>SUDAH PULANG</div>
                  <div className={styles.counterNum} style={{ color: '#a78bfa' }}>{stats.sudahPulang}</div>
                </div>
              </div>

              {/* Banner Peringatan Audit Anomali Titip Kartu */}
              {stats.dibatalkan > 0 && (
                <div
                  onClick={() => setActiveTab('audit')}
                  style={{
                    background: 'linear-gradient(90deg, rgba(153,27,27,0.85) 0%, rgba(127,29,29,0.95) 100%)',
                    border: '1.5px solid #ef4444',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(239,68,68,0.25)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fas fa-exclamation-triangle" style={{ color: '#fca5a5', fontSize: '18px' }}></i>
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#ffffff' }}>
                        🚨 {stats.dibatalkan} Presensi RFID Dibatalkan Otomatis (Indikasi Titip Kartu / Alpha Jam-1)
                      </div>
                      <div style={{ fontSize: '11px', color: '#fecaca' }}>
                        Klik untuk melihat detail pelanggar & hasil pelacakan Terduga Pembawa Kartu.
                      </div>
                    </div>
                  </div>
                  <span style={{ background: '#ef4444', color: 'white', fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                    Cek Audit <i className="fas fa-arrow-right"></i>
                  </span>
                </div>
              )}

              {/* Live Feed Table */}
              <div className={styles.feedCard}>
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

                <div className={styles.feedScroll}>
                  {historyList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                      <i className="fas fa-id-badge" style={{ fontSize: '2.5rem', marginBottom: '12px' }}></i>
                      <p style={{ margin: 0, fontWeight: 600 }}>Belum ada siswa yang tap kartu hari ini.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {historyList.slice(0, 30).map((item) => {
                        const isCancelled = item.statusMasuk === 'DIBATALKAN';
                        return (
                          <div
                            key={item.id}
                            style={{
                              background: isCancelled ? 'rgba(127, 29, 29, 0.35)' : '#1e293b',
                              border: isCancelled ? '1.5px solid #ef4444' : '1px solid #334155',
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
                                <span style={{
                                  fontWeight: 800,
                                  fontSize: '13px',
                                  color: isCancelled ? '#fca5a5' : '#ffffff',
                                  textDecoration: isCancelled ? 'line-through' : 'none',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {item.nama}
                                </span>
                                <span style={{ background: '#334155', color: '#93c5fd', fontSize: '10px', fontWeight: 800, padding: '1px 6px', borderRadius: '4px' }}>
                                  {item.kelas}
                                </span>
                              </div>
                              <div style={{ fontSize: '11px', color: isCancelled ? '#f87171' : '#94a3b8', marginTop: '2px' }}>
                                {isCancelled ? '🚫 DIBATALKAN (Alpha di Kelas Jam Ke-1 — Kena Sanksi)' : `NISN: ${item.nisn}`}
                              </div>
                            </div>

                            <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <div style={{ fontSize: '12.5px', fontWeight: 800, color: isCancelled ? '#f87171' : item.statusMasuk === 'Terlambat' ? '#fbbf24' : '#34d399' }}>
                                {item.jamMasuk ? `${item.jamMasuk} WIB` : '-'}
                              </div>
                              {isCancelled ? (
                                <div style={{ fontSize: '10px', color: '#ffffff', background: '#dc2626', padding: '1px 6px', borderRadius: '4px', fontWeight: 800, display: 'inline-block', marginTop: '2px' }}>
                                  BATAL & SANKSI
                                </div>
                              ) : item.jamPulang ? (
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
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB AUDIT & SANKSI PELANGGARAN RFID (DETEKSI TITIP KARTU) */}
        {/* ========================================================================= */}
        {activeTab === 'audit' && (
          <div className={styles.mappingCard}>
            <div className={styles.mappingHeader}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fas fa-shield-alt" style={{ color: '#ef4444' }}></i>
                  Audit Silang RFID & Pelacak Titip Kartu (Gerbang vs Jam Pertama Kelas)
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                  Otomatis membatalkan presensi RFID siswa yang tercatat Tap di Gerbang namun diinput <b>Alpha (A)</b> oleh Guru pada Jam Ke-1 / Piket, sekaligus melacak <b>Terduga Pembawa Kartu</b> dari jeda detik tap berurutan.
                </p>
              </div>

              <div className={styles.mappingFilters}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 700 }}>Tanggal Audit:</span>
                  <input
                    type="date"
                    value={auditDate}
                    onChange={(e) => setAuditDate(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: '#1e293b',
                      color: 'white',
                      border: '1.5px solid #475569',
                      fontSize: '13px',
                      fontWeight: 700,
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={() => fetchAuditByDate(auditDate)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      background: '#0284c7',
                      color: 'white',
                      border: 'none',
                      fontSize: '12.5px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    <i className="fas fa-sync-alt"></i> Cek Audit
                  </button>
                </div>
              </div>
            </div>

            {/* Ringkasan Audit */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '18px' }}>
              <div style={{ background: 'rgba(127,29,29,0.35)', border: '1px solid #ef4444', borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ fontSize: '11px', color: '#fca5a5', fontWeight: 800, textTransform: 'uppercase' }}>Presensi RFID Dibatalkan & Sanksi</div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#f87171', marginTop: '4px' }}>
                  {auditList.filter(a => a.auditStatus === 'DIBATALKAN').length} <span style={{ fontSize: '13px', fontWeight: 600 }}>Siswa</span>
                </div>
              </div>
              <div style={{ background: 'rgba(120,53,15,0.35)', border: '1px solid #f59e0b', borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ fontSize: '11px', color: '#fde68a', fontWeight: 800, textTransform: 'uppercase' }}>Terduga Pembawa Kartu Terlacak (≤10 dtk)</div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#fbbf24', marginTop: '4px' }}>
                  {auditList.filter(a => a.auditStatus === 'DIBATALKAN' && Array.isArray(a.terdugaPembawa) && a.terdugaPembawa.some((b: any) => b.selisihDetik <= 10)).length} <span style={{ fontSize: '13px', fontWeight: 600 }}>Kasus</span>
                </div>
              </div>
              <div style={{ background: 'rgba(6,78,59,0.35)', border: '1px solid #10b981', borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ fontSize: '11px', color: '#a7f3d0', fontWeight: 800, textTransform: 'uppercase' }}>Presensi Dipulihkan (Valid / Izin UKS)</div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#34d399', marginTop: '4px' }}>
                  {auditList.filter(a => a.auditStatus === 'DIPULIHKAN').length} <span style={{ fontSize: '13px', fontWeight: 600 }}>Siswa</span>
                </div>
              </div>
            </div>

            {loadingAudit ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#ef4444', marginBottom: '12px' }}></i>
                <div>Memeriksa sinkronisasi Tap Gerbang vs Presensi Kelas Jam Ke-1...</div>
              </div>
            ) : auditList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8', background: '#0f172a', borderRadius: '12px', border: '1px dashed #334155' }}>
                <i className="fas fa-check-circle" style={{ fontSize: '2.8rem', color: '#10b981', marginBottom: '12px' }}></i>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc' }}>Bersih! Tidak Ada Anomali / Titip Kartu RFID pada Tanggal Ini</div>
                <div style={{ fontSize: '12.5px', marginTop: '4px' }}>
                  Semua siswa yang melakukan tap di gerbang sesuai dengan kehadiran di kelas pada jam pertama.
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#1e293b', borderBottom: '2px solid #334155', color: '#94a3b8', textAlign: 'left' }}>
                      <th style={{ padding: '12px 14px', width: '45px' }}>No</th>
                      <th style={{ padding: '12px 14px' }}>Siswa (Pemilik Kartu)</th>
                      <th style={{ padding: '12px 14px' }}>Waktu Tap vs Bukti Kelas</th>
                      <th style={{ padding: '12px 14px' }}>🕵️ Terduga Pembawa Kartu (Tap Berurutan)</th>
                      <th style={{ padding: '12px 14px' }}>Status & Sanksi</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Tindakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditList.map((item, idx) => {
                      const isCancelled = item.auditStatus === 'DIBATALKAN';
                      const buddies = Array.isArray(item.terdugaPembawa) ? item.terdugaPembawa : [];
                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid #1e293b', background: isCancelled ? 'rgba(127,29,29,0.15)' : 'transparent' }}>
                          <td style={{ padding: '14px', color: '#64748b', fontWeight: 700 }}>{idx + 1}</td>
                          <td style={{ padding: '14px' }}>
                            <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '14px' }}>{item.nama}</div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                              <span style={{ background: '#334155', color: '#93c5fd', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                                Kelas {item.kelas}
                              </span>
                              <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>NISN: {item.nisn || '-'}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px' }}>
                            <div style={{ color: '#38bdf8', fontWeight: 800, fontSize: '12.5px' }}>
                              <i className="fas fa-id-card"></i> Tap Gerbang: {item.jamMasuk} WIB
                            </div>
                            <div style={{ color: '#f87171', fontWeight: 700, fontSize: '12px', marginTop: '4px' }}>
                              <i className="fas fa-chalkboard-teacher"></i> Kelas Jam-{item.auditJamKe}: Status <b>{item.auditStatusKelas}</b> ({item.auditMapel})
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>
                              Diinput oleh: {item.auditGuru}
                            </div>
                          </td>
                          <td style={{ padding: '14px' }}>
                            {buddies.length === 0 ? (
                              <span style={{ fontSize: '11.5px', color: '#64748b', fontStyle: 'italic' }}>
                                Tidak ada tap siswa lain dalam jeda ±25 detik
                              </span>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {buddies.map((b: any, bIdx: number) => {
                                  const isStrong = b.selisihDetik <= 6;
                                  return (
                                    <div
                                      key={bIdx}
                                      style={{
                                        background: isStrong ? 'rgba(245, 158, 11, 0.18)' : '#1e293b',
                                        border: isStrong ? '1px solid #f59e0b' : '1px solid #334155',
                                        borderRadius: '8px',
                                        padding: '6px 10px',
                                        fontSize: '11.5px'
                                      }}
                                    >
                                      <div style={{ fontWeight: 800, color: isStrong ? '#fde68a' : '#e2e8f0' }}>
                                        {isStrong ? '🔥 ' : '👤 '}{b.nama} <span style={{ color: '#38bdf8' }}>({b.kelas})</span>
                                      </div>
                                      <div style={{ color: '#cbd5e1', fontSize: '11px', marginTop: '2px' }}>
                                        Tap pukul <b>{b.jamMasuk}</b> — <b style={{ color: isStrong ? '#fbbf24' : '#94a3b8' }}>Selisih {b.selisihDetik} detik ({b.arah})</b>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '14px' }}>
                            {isCancelled ? (
                              <div>
                                <span style={{ background: '#dc2626', color: 'white', fontSize: '10.5px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', display: 'inline-block' }}>
                                  🚫 PRESENSI BATAL & SANKSI
                                </span>
                                <div style={{ fontSize: '11.5px', color: '#fca5a5', fontWeight: 700, marginTop: '5px' }}>
                                  {item.auditSanksi}
                                </div>
                                {item.pembawaKenaSanksi && (
                                  <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 700, marginTop: '2px' }}>
                                    ⚠️ Pembawa kartu juga dikenai sanksi
                                  </div>
                                )}
                                {item.auditCatatan && (
                                  <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '3px', fontStyle: 'italic' }}>
                                    Catatan: "{item.auditCatatan}"
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>
                                <span style={{ background: '#059669', color: 'white', fontSize: '10.5px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', display: 'inline-block' }}>
                                  ✅ DIPULIHKAN (HADIR)
                                </span>
                                {item.auditCatatan && (
                                  <div style={{ fontSize: '11px', color: '#a7f3d0', marginTop: '4px' }}>
                                    Alasan: "{item.auditCatatan}"
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => handleUpdateSanksi(item)}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  background: '#dc2626',
                                  color: 'white',
                                  border: 'none',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                                title="Atur / Tetapkan Sanksi"
                              >
                                <i className="fas fa-gavel"></i> Sanksi
                              </button>
                              {isCancelled && (
                                <button
                                  onClick={() => handleRestoreAudit(item)}
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    background: '#334155',
                                    color: '#cbd5e1',
                                    border: '1px solid #475569',
                                    fontSize: '11.5px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                  title="Pulihkan jika bukan titip kartu (misal izin UKS / BK)"
                                >
                                  <i className="fas fa-undo"></i> Pulihkan
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: DAFTARKAN / MAPPING KARTU RFID SISWA */}
        {/* ========================================================================= */}
        {activeTab === 'mapping' && (
          <div className={styles.mappingCard}>
            <div className={styles.mappingHeader}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                  <i className="fas fa-link" style={{ color: '#0284c7', marginRight: '8px' }}></i>
                  {selectedKelas === 'GURU' ? 'Pemasangan / Registrasi Kartu RFID Guru & GTK' : 'Pemasangan / Registrasi Kartu RFID Siswa'}
                </h2>
                <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                  {selectedKelas === 'GURU'
                    ? 'Hubungkan nomor chip kartu RFID atau stiker RFID ke masing-masing Guru & Karyawan (GTK).'
                    : 'Hubungkan nomor chip kartu RFID atau stiker RFID ke masing-masing siswa per kelas.'}
                </p>
              </div>

              {/* Class Selector & Search */}
              <div className={styles.mappingFilters}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#cbd5e1' }}>Pilih Kategori:</span>
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
                    <option value="GURU" style={{ fontWeight: 800, color: '#38bdf8' }}>👨‍🏫 Guru & Karyawan (GTK)</option>
                    <optgroup label="Siswa per Kelas">
                      {ALL_KELAS.map(k => (
                        <option key={k} value={k}>Kelas {k}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <input
                  type="text"
                  placeholder={selectedKelas === 'GURU' ? "Cari nama / NIP / PegID..." : "Cari nama / NISN..."}
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

            {/* Students / GTK Table */}
            {loadingMapping ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0284c7', marginBottom: '12px' }}></i>
                <div>Memuat data {selectedKelas === 'GURU' ? 'Guru & Karyawan (GTK)' : `siswa kelas ${selectedKelas}`}...</div>
              </div>
            ) : filteredMappingList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                <i className="fas fa-users-slash" style={{ fontSize: '2.5rem', marginBottom: '12px' }}></i>
                <div>Tidak ada data {selectedKelas === 'GURU' ? 'guru / GTK' : 'siswa'} ditemukan.</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#1e293b', borderBottom: '2px solid #334155', color: '#94a3b8', textAlign: 'left' }}>
                      <th style={{ padding: '12px 14px', width: '50px' }}>No</th>
                      <th style={{ padding: '12px 14px' }}>{selectedKelas === 'GURU' ? 'Nama Guru / GTK' : 'Nama Lengkap Siswa'}</th>
                      <th style={{ padding: '12px 14px' }}>{selectedKelas === 'GURU' ? 'NIP / PegID' : 'NISN / NIS'}</th>
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
                          <div>{selectedKelas === 'GURU' ? 'NIP' : 'NISN'}: {st.nisn || '-'}</div>
                          {st.nis && <div style={{ fontSize: '11px', color: '#64748b' }}>{selectedKelas === 'GURU' ? 'PegID' : 'NIS'}: {st.nis}</div>}
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
              Memasangkan kartu ke {selectedKelas === 'GURU' ? 'Guru / GTK' : 'siswa'}: <b style={{ color: '#38bdf8' }}>{pairingStudent.nama}</b> ({selectedKelas === 'GURU' ? 'GTK' : `Kelas ${selectedKelas}`})
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
