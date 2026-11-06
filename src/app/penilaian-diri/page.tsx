'use client';
import React, { useState, useEffect } from 'react';
import styles from '@/app/presensi/presensi.module.css';
import InlineLoading from '@/components/InlineLoading';
import SearchableSelect from '@/components/SearchableSelect';
import Swal from 'sweetalert2';

const TRAITS = [
  { id: 'religius', label: 'Religius', desc: 'sikap/perilaku yang bersifat keagamaan' },
  { id: 'disiplin', label: 'Disiplin' },
  { id: 'demokratis', label: 'Demokratis', desc: 'cara berpikir, bersikap yang mengakui kesetaraan hak' },
  { id: 'kreatif', label: 'Kreatif', desc: 'kemampuan menciptakan ide baru serta menemukan solusi inovatif' },
  { id: 'mandiri', label: 'Mandiri', desc: 'kemampuan berdiri sendiri tanpa bergantung pada orang lain' },
  { id: 'kritis', label: 'Kritis', desc: 'kemampuan untuk berpikir secara rasional, objektif, dan mendalam dalam menganalisis serta mengevaluasi informasi atau masalah' },
  { id: 'responsif', label: 'Responsif', desc: 'sikap cepat dan bijaksana dalam menanggapi situasi, kebutuhan, atau permintaan dengan sigap' },
  { id: 'nasionalis', label: 'Nasionalis', desc: 'memiliki rasa cinta, bangga, dan kesetiaan terhadap tanah airnya' },
  { id: 'toleran', label: 'Toleran', desc: 'sikap menghargai, membiarkan, atau membolehkan pendirian, pendapat, yang berbeda atau bertentangan dengan diri sendiri' },
  { id: 'peduli', label: 'Peduli', desc: 'sikap memperhatikan dan menghiraukan kondisi atau keadaan orang lain dan lingkungan sekitar, sering kali ditandai dengan simpati, empati, dan tindakan proaktif untuk membantu' },
  { id: 'leadership', label: 'Leadership', desc: 'berjiwa pemimpin' },
  { id: 'jujur', label: 'Jujur' }
];

export default function PenilaianDiriPage() {
  const [activeTab, setActiveTab] = useState<'form' | 'monitoring' | 'rekap'>('form');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [userRole, setUserRole] = useState('');
  const [userNisn, setUserNisn] = useState('');
  const [userName, setUserName] = useState('');
  const [userRombel, setUserRombel] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [periode, setPeriode] = useState('');
  
  const [siswaData, setSiswaData] = useState<any[]>([]);
  const [temanSekelas, setTemanSekelas] = useState<any[]>([]);
  
  const [dataDiri, setDataDiri] = useState<any>({});
  const [dataTeman, setDataTeman] = useState<any>({});
  const [dataGuru, setDataGuru] = useState<any>({});
  const [halBaik, setHalBaik] = useState('');
  const [halDiperbaiki, setHalDiperbaiki] = useState('');

  // Draft auto-save state
  const [lastDraftSaved, setLastDraftSaved] = useState<string>('');
  const [isDraftRestored, setIsDraftRestored] = useState<boolean>(false);

  // Lock 1x per periode states
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const [rekapData, setRekapData] = useState<any[]>([]);

  // Monitoring states
  const [monitoringData, setMonitoringData] = useState<{
    summary: { totalSiswa: number; sudahMengisi: number; belumMengisi: number; persentase: number };
    rombelSummary: Array<{ rombel: string; total: number; sudah: number; belum: number; persentase: number }>;
    students: Array<{ id: string; nisn: string; nis: string; nama: string; rombel: string; jk: string; status: 'sudah' | 'belum'; submittedAt: string | null; submissionId: string | null }>;
  } | null>(null);
  const [loadingMonitoring, setLoadingMonitoring] = useState(false);
  const [monitorRombel, setMonitorRombel] = useState('semua');
  const [monitorStatus, setMonitorStatus] = useState<'semua' | 'sudah' | 'belum'>('semua');
  const [monitorSearch, setMonitorSearch] = useState('');

  const isPortalRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/portal');
  const isSiswa = isPortalRoute || (userRole || '').toLowerCase().includes('siswa');

  useEffect(() => {
    // Current period (e.g. "Oktober 2026")
    const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const d = new Date();
    setPeriode(`${months[d.getMonth()]} ${d.getFullYear()}`);

    const isPortal = typeof window !== 'undefined' && window.location.pathname.startsWith('/portal');
    const portalStr = typeof window !== 'undefined' ? localStorage.getItem('portal_session') : null;
    const str = typeof window !== 'undefined' ? localStorage.getItem('keren_user_data') : null;

    if (isPortal && !portalStr) {
      window.location.href = '/portal/login';
      return;
    }

    let sessionUser: any = null;
    let isStudentSession = false;

    // Prioritize portal_session when on /portal or when portal_session exists
    if (isPortal && portalStr) {
      try {
        sessionUser = JSON.parse(portalStr);
        isStudentSession = true;
      } catch (e) {}
    } else if (str) {
      try {
        sessionUser = JSON.parse(str);
        if ((sessionUser.role || '').toLowerCase().includes('siswa')) {
          isStudentSession = true;
        }
      } catch (e) {}
    } else if (portalStr) {
      try {
        sessionUser = JSON.parse(portalStr);
        isStudentSession = true;
      } catch (e) {}
    }

    if (sessionUser) {
      const role = (sessionUser.role || (isStudentSession ? 'siswa' : '')).toLowerCase();
      setUserRole(role);
      const studentId = sessionUser.nisn || sessionUser.nis || sessionUser.username || '';
      setUserNisn(studentId);
      setUserName(sessionUser.nama || sessionUser.username || '');
      // In portal_session, class is stored in 'kelas', while in user_data it could be 'rombel' or 'kelas'
      const rombel = sessionUser.kelas || sessionUser.rombel || sessionUser.rombel_nama || '';
      setUserRombel(rombel);
      setIsAdmin(role.includes('admin') || role.includes('super'));
    }

    fetchSiswa();
  }, []);

  const fetchSiswa = async () => {
    try {
      const res = await fetch('/api/siswa');
      const json = await res.json();
      if (json.success && json.data) {
        const aktif = json.data.filter((s: any) => (s.status || '').toLowerCase().includes('aktif') && s.isLatest);
        setSiswaData(aktif);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSiswa && siswaData.length > 0) {
      const clean = (val: any) => String(val || '').trim().replace(/^0+/, '');
      const norm = (r: string) => String(r || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

      // Locate student in siswaData if possible to obtain canonical rombel
      const myRecord = siswaData.find(s => 
        (clean(s.nisn) && clean(s.nisn) === clean(userNisn)) ||
        (clean(s.nis) && clean(s.nis) === clean(userNisn)) ||
        (s.nama && userName && s.nama.trim().toLowerCase() === userName.trim().toLowerCase())
      );

      const targetRombel = (myRecord?.rombel || userRombel || '').trim();
      const targetNorm = norm(targetRombel);

      const isMe = (s: any) => {
        if (clean(s.nisn) && clean(s.nisn) === clean(userNisn)) return true;
        if (clean(s.nis) && clean(s.nis) === clean(userNisn)) return true;
        if (s.nama && userName && s.nama.trim().toLowerCase() === userName.trim().toLowerCase()) return true;
        return false;
      };

      let classmates: any[] = [];
      if (targetNorm) {
        classmates = siswaData.filter(s => norm(s.rombel) === targetNorm && !isMe(s));
      }

      // If classmates is empty, try partial matching
      if (classmates.length === 0 && targetNorm) {
        classmates = siswaData.filter(s => {
          const sNorm = norm(s.rombel);
          return (sNorm.includes(targetNorm) || targetNorm.includes(sNorm)) && !isMe(s);
        });
      }

      // Fallback: show all active students except self so dropdown is never stuck empty
      if (classmates.length === 0) {
        classmates = siswaData.filter(s => !isMe(s));
      }

      // Sort alphabetically by name
      classmates.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

      setTemanSekelas(classmates);

      if (!userRombel && targetRombel) {
        setUserRombel(targetRombel);
      }
    }
  }, [isSiswa, userRombel, siswaData, userNisn, userName]);

  // Check submission status whenever period or user changes
  useEffect(() => {
    const penilaiId = isSiswa ? userNisn : (userNisn || userName);
    if (periode && penilaiId) {
      checkSubmissionStatus(periode, penilaiId);
    }
  }, [periode, userRole, userNisn, userName, isSiswa]);

  const checkSubmissionStatus = async (p: string, id: string) => {
    if (!p || !id) return;
    try {
      setCheckingStatus(true);
      const res = await fetch(`/api/penilaian-karakter?periode=${encodeURIComponent(p)}&penilai_id=${encodeURIComponent(id)}`);
      const json = await res.json();
      if (json.success && json.alreadySubmitted) {
        setAlreadySubmitted(true);
        setSubmittedData(json.data);
        // Pre-fill so the user can review their submitted answers
        if (json.data?.data_diri) {
          const { halBaik: hb, halDiperbaiki: hd, ...restDiri } = json.data.data_diri;
          setDataDiri(restDiri || {});
          setHalBaik(hb || '');
          setHalDiperbaiki(hd || '');
        }
        if (json.data?.data_teman) {
          setDataTeman(json.data.data_teman || {});
        }
        if (json.data?.data_guru) {
          setDataGuru(json.data.data_guru || {});
        }
      } else {
        setAlreadySubmitted(false);
        setSubmittedData(null);

        // Pulihkan draf lokal jika siswa sebelumnya sedang mengisi dan halaman ter-refresh
        try {
          const draftKey = `penilaian_karakter_draft_${id}_${p}`;
          const savedDraft = typeof window !== 'undefined' ? localStorage.getItem(draftKey) : null;
          if (savedDraft) {
            const parsed = JSON.parse(savedDraft);
            if (parsed) {
              if (parsed.dataDiri) setDataDiri(parsed.dataDiri);
              if (parsed.dataTeman) setDataTeman(parsed.dataTeman);
              if (parsed.dataGuru) setDataGuru(parsed.dataGuru);
              if (parsed.halBaik) setHalBaik(parsed.halBaik);
              if (parsed.halDiperbaiki) setHalDiperbaiki(parsed.halDiperbaiki);
              if (parsed.lastSaved) setLastDraftSaved(parsed.lastSaved);
              setIsDraftRestored(true);
            }
          }
        } catch (err) {
          console.error('Error restoring draft:', err);
        }
      }
    } catch (e) {
      console.error('Error checking submission status:', e);
    } finally {
      setCheckingStatus(false);
    }
  };

  // Efek Auto-save Draf ke LocalStorage setiap ada perubahan isian
  useEffect(() => {
    if (checkingStatus || alreadySubmitted) return;
    const penilaiId = isSiswa ? userNisn : (userNisn || userName);
    if (!penilaiId || !periode || typeof window === 'undefined') return;

    const hasContent = 
      Object.keys(dataDiri).length > 0 || 
      Object.keys(dataTeman).length > 0 || 
      Object.keys(dataGuru).length > 0 || 
      Boolean(halBaik) || 
      Boolean(halDiperbaiki);

    if (!hasContent) return;

    const draftKey = `penilaian_karakter_draft_${penilaiId}_${periode}`;
    const timer = setTimeout(() => {
      try {
        const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        localStorage.setItem(draftKey, JSON.stringify({
          dataDiri,
          dataTeman,
          dataGuru,
          halBaik,
          halDiperbaiki,
          lastSaved: nowStr
        }));
        setLastDraftSaved(nowStr);
      } catch (err) {
        console.error('Error saving draft:', err);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [dataDiri, dataTeman, dataGuru, halBaik, halDiperbaiki, alreadySubmitted, checkingStatus, userNisn, userName, periode, isSiswa]);

  // Peringatan jika siswa mencoba reload/tutup halaman saat sedang mengisi
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!alreadySubmitted && (Object.keys(dataDiri).length > 0 || Object.keys(dataTeman).length > 0 || Boolean(halBaik))) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [alreadySubmitted, dataDiri, dataTeman, halBaik]);

  const handleClearDraft = () => {
    Swal.fire({
      title: 'Kosongkan Draf Isian?',
      text: 'Semua isian penilaian yang sedang Anda ketik di perangkat ini akan dikosongkan.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Kosongkan',
      cancelButtonText: 'Batal'
    }).then(res => {
      if (res.isConfirmed) {
        const penilaiId = isSiswa ? userNisn : (userNisn || userName);
        const draftKey = `penilaian_karakter_draft_${penilaiId}_${periode}`;
        if (typeof window !== 'undefined') localStorage.removeItem(draftKey);
        setDataDiri({});
        setDataTeman({});
        setDataGuru({});
        setHalBaik('');
        setHalDiperbaiki('');
        setLastDraftSaved('');
        setIsDraftRestored(false);
        Swal.fire('Draf Dikosongkan', 'Formulir telah di-reset ke kondisi awal.', 'info');
      }
    });
  };

  const loadRekap = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/penilaian-karakter/rekap?periode=${encodeURIComponent(periode)}`);
      const json = await res.json();
      if (json.success) {
        setRekapData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadMonitoring = async (p = periode) => {
    if (!p) return;
    try {
      setLoadingMonitoring(true);
      const res = await fetch(`/api/penilaian-karakter/monitoring?periode=${encodeURIComponent(p)}`);
      const json = await res.json();
      if (json.success) {
        setMonitoringData(json);
      } else {
        Swal.fire('Error', json.error || 'Gagal memuat data monitoring', 'error');
      }
    } catch (e: any) {
      console.error(e);
      Swal.fire('Error', 'Gagal memuat monitoring: ' + e.message, 'error');
    } finally {
      setLoadingMonitoring(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'monitoring') {
      loadMonitoring(periode);
    }
  }, [activeTab, periode]);

  useEffect(() => {
    if (activeTab === 'rekap') {
      if (isAdmin) {
        loadRekap();
      } else {
        setActiveTab('form');
      }
    }
  }, [activeTab, periode, isAdmin]);

  const handleCopyBelumMengisi = () => {
    if (!monitoringData) return;
    const listBelum = (monitoringData.students || []).filter((s: any) => {
      if (s.status !== 'belum') return false;
      if (monitorRombel !== 'semua' && s.rombel !== monitorRombel) return false;
      return true;
    });

    if (listBelum.length === 0) {
      return Swal.fire('Hebat!', 'Seluruh siswa pada filter kelas ini sudah mengisi penilaian.', 'success');
    }

    const rombelTitle = monitorRombel === 'semua' ? 'Semua Kelas' : `Kelas ${monitorRombel}`;
    const listText = listBelum.map((s: any, idx: number) => `${idx + 1}. ${s.nama} (${s.rombel})`).join('\n');
    const textToCopy = `📢 *MONITORING PENILAIAN DIRI & KARAKTER*\nPeriode: *${periode}*\nTarget: *${rombelTitle}*\nStatus: *${listBelum.length} siswa belum mengisi*\n\nBerikut daftar siswa yang *BELUM* mengisi:\n${listText}\n\n_Mohon segera login ke Portal Siswa (menu Penilaian Diri & Karakter) dan menyelesaikan pengisian formulir. Terima kasih._`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      Swal.fire({
        icon: 'success',
        title: 'Berhasil Disalin!',
        text: `Daftar ${listBelum.length} siswa belum mengisi berhasil disalin ke clipboard untuk pesan WhatsApp.`,
        timer: 2500,
        showConfirmButton: false
      });
    }).catch(() => {
      Swal.fire('Gagal', 'Tidak dapat menyalin ke clipboard', 'error');
    });
  };

  const handleExportExcel = async () => {
    if (!monitoringData) return;
    try {
      const XLSX = await import('xlsx');
      const dataToExport = filteredMonitoringStudents.map((s: any, idx: number) => ({
        'No': idx + 1,
        'NISN': s.nisn || '-',
        'NIS': s.nis || '-',
        'Nama Siswa': s.nama,
        'Kelas': s.rombel,
        'L/P': s.jk || '-',
        'Status': s.status === 'sudah' ? 'Sudah Mengisi' : 'Belum Mengisi',
        'Waktu Pengisian': s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }) + ' ' + new Date(s.submittedAt).toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit'
        }) + ' WIB' : '-'
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Monitoring');
      const safePeriode = (periode || '').replace(/\s+/g, '_');
      const safeRombel = monitorRombel === 'semua' ? 'Semua_Kelas' : `Kelas_${monitorRombel}`;
      XLSX.writeFile(wb, `Monitoring_Penilaian_Karakter_${safePeriode}_${safeRombel}.xlsx`);
    } catch (err: any) {
      Swal.fire('Error', 'Gagal mengekspor file Excel: ' + err.message, 'error');
    }
  };

  const handleResetStudentFromMonitor = async (student: any) => {
    const confirm = await Swal.fire({
      title: 'Reset Pengisian Siswa?',
      html: `Yakin ingin mereset pengisian untuk <b>${student.nama}</b> (${student.rombel}) pada periode <b>${periode}</b>?<br/><span style="font-size:0.85rem; color:#ef4444">Siswa akan dapat mengisi ulang kembali formulir ini.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Reset',
      cancelButtonText: 'Batal'
    });

    if (confirm.isConfirmed) {
      try {
        const studentId = student.nisn || student.nis || student.id;
        const res = await fetch(`/api/penilaian-karakter?periode=${encodeURIComponent(periode)}&penilai_id=${encodeURIComponent(studentId)}`, {
          method: 'DELETE'
        });
        const json = await res.json();
        if (json.success) {
          Swal.fire('Berhasil', `Pengisian untuk ${student.nama} telah direset.`, 'success');
          loadMonitoring(periode);
        } else {
          Swal.fire('Gagal', json.error, 'error');
        }
      } catch (e: any) {
        Swal.fire('Error', e.message, 'error');
      }
    }
  };

  const filteredMonitoringStudents = (monitoringData?.students || []).filter((s: any) => {
    if (monitorRombel !== 'semua' && s.rombel !== monitorRombel) return false;
    if (monitorStatus !== 'semua' && s.status !== monitorStatus) return false;
    if (monitorSearch.trim()) {
      const q = monitorSearch.toLowerCase();
      const matchNama = (s.nama || '').toLowerCase().includes(q);
      const matchNisn = (s.nisn || '').includes(q);
      const matchNis = (s.nis || '').includes(q);
      const matchRombel = (s.rombel || '').toLowerCase().includes(q);
      if (!matchNama && !matchNisn && !matchNis && !matchRombel) return false;
    }
    return true;
  });

  const handleSave = async () => {
    if (alreadySubmitted) {
      Swal.fire('Informasi', 'Anda sudah pernah mengisi penilaian untuk periode ini (hanya 1x pengisian per periode).', 'info');
      return;
    }

    try {
      setSaving(true);

      // Validation
      for (const t of TRAITS) {
        if (isSiswa) {
          if (!dataDiri[t.id]?.jawaban) {
            const el = document.getElementById(`card_diri_${t.id}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return Swal.fire({
              icon: 'warning',
              title: 'Belum Lengkap!',
              text: `Pilihan penilaian diri untuk sikap "${t.label}" belum dipilih. Silakan pilih salah satu opsi.`,
              confirmButtonColor: '#047857'
            });
          }
          if (!dataTeman[t.id]?.nisn) {
            const el = document.getElementById(`card_teman_${t.id}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return Swal.fire({
              icon: 'warning',
              title: 'Belum Lengkap!',
              text: `Teman sekelas untuk sikap "${t.label}" belum dipilih. Silakan pilih teman dari daftar.`,
              confirmButtonColor: '#047857'
            });
          }
        } else {
          // Guru / Pimpinan / GTK / Staf
          if (!dataGuru[t.id]?.nisn) {
            const el = document.getElementById(`card_guru_${t.id}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return Swal.fire({
              icon: 'warning',
              title: 'Belum Lengkap!',
              text: `Murid untuk sikap "${t.label}" belum dipilih.`,
              confirmButtonColor: '#047857'
            });
          }
        }
      }

      const penilai_id = (isSiswa ? userNisn : (userNisn || userName)) || userNisn || userName;
      if (!penilai_id) {
        return Swal.fire('Error!', 'Sesi login tidak terdeteksi. Silakan muat ulang halaman atau login kembali.', 'error');
      }

      const body = {
        periode,
        penilai_id,
        penilai_nama: userName,
        penilai_role: userRole || (isSiswa ? 'siswa' : 'guru'),
        data_diri: isSiswa ? { ...dataDiri, halBaik, halDiperbaiki } : null,
        data_teman: isSiswa ? dataTeman : null,
        data_guru: !isSiswa ? dataGuru : null
      };

      const res = await fetch('/api/penilaian-karakter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (json.success) {
        // Hapus draf lokal karena isian sudah resmi terkirim dan tersimpan di server
        const penilai_id = (isSiswa ? userNisn : (userNisn || userName)) || userNisn || userName;
        const draftKey = `penilaian_karakter_draft_${penilai_id}_${periode}`;
        if (typeof window !== 'undefined') localStorage.removeItem(draftKey);
        setLastDraftSaved('');
        setIsDraftRestored(false);

        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: 'Penilaian karakter berhasil disimpan dan telah dikunci untuk periode ini.',
          confirmButtonColor: '#047857'
        });
        setAlreadySubmitted(true);
        setSubmittedData(json.data);
      } else {
        Swal.fire('Gagal!', json.error || 'Gagal menyimpan penilaian', 'error');
      }
    } catch (e: any) {
      Swal.fire('Error!', 'Terjadi kesalahan: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAdminReset = async () => {
    const penilaiId = isSiswa ? userNisn : (userNisn || userName);
    const confirm = await Swal.fire({
      title: 'Reset Pengisian?',
      text: `Yakin ingin mereset pengisian untuk "${userName}" pada periode "${periode}"? Formulir akan dapat diisi ulang kembali.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Reset',
      cancelButtonText: 'Batal'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await fetch(`/api/penilaian-karakter?periode=${encodeURIComponent(periode)}&penilai_id=${encodeURIComponent(penilaiId)}`, {
          method: 'DELETE'
        });
        const json = await res.json();
        if (json.success) {
          const draftKey = `penilaian_karakter_draft_${penilaiId}_${periode}`;
          if (typeof window !== 'undefined') localStorage.removeItem(draftKey);
          setLastDraftSaved('');
          setIsDraftRestored(false);
          Swal.fire('Berhasil', 'Pengisian telah direset. Formulir dapat diisi kembali.', 'success');
          setAlreadySubmitted(false);
          setSubmittedData(null);
          setDataDiri({});
          setDataTeman({});
          setDataGuru({});
          setHalBaik('');
          setHalDiperbaiki('');
        } else {
          Swal.fire('Gagal', json.error, 'error');
        }
      } catch (e: any) {
        Swal.fire('Error', 'Gagal mereset: ' + e.message, 'error');
      }
    }
  };

  if (loading && activeTab === 'form') return <div style={{padding: 40}}><InlineLoading message="Memuat data siswa..." /></div>;

  return (
    <div className={styles.container}>
      {/* HEADER STICKY (FROZEN KETIKA DI-SCROLL) */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#f8fafc',
        paddingTop: isSiswa ? '8px' : '0',
        paddingBottom: '8px',
        marginBottom: '16px'
      }}>
        {isSiswa && (
          <button onClick={() => window.location.href = '/portal/dashboard'} 
            style={{ 
              background: '#1e293b', 
              color: 'white', 
              border: 'none',
              padding: '10px 20px', 
              borderRadius: '10px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              fontWeight: 'bold', 
              marginBottom: '10px', 
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)',
              fontSize: '0.92rem',
              width: '100%',
              transition: 'background 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = '#0f172a'}
            onMouseOut={e => e.currentTarget.style.background = '#1e293b'}
          >
            <i className="fas fa-arrow-left"></i> KEMBALI KE DASHBOARD
          </button>
        )}

        <div style={{ 
          background: 'linear-gradient(135deg, var(--primary) 0%, #047857 100%)', 
          color: 'white', 
          padding: '16px 20px', 
          borderRadius: '14px', 
          textAlign: 'center', 
          boxShadow: '0 8px 16px -3px rgba(16, 185, 129, 0.2)' 
        }}>
          <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
            Penilaian Diri &amp; Karakter
          </h1>
          <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '0.85rem' }}>
            Formulir evaluasi sikap dan karakter antar siswa dan guru
          </p>
        </div>
      </div>
      
      <div className={styles.tabsContainer} style={{ maxWidth: 650, margin: "0 auto 20px auto" }}>
        <div className={styles.tabsWrapper}>
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${activeTab === 'form' ? styles.activeTab : ''}`} onClick={() => setActiveTab('form')}>
              <i className="fas fa-clipboard-list"></i> Formulir Penilaian
            </button>
            <button className={`${styles.tab} ${activeTab === 'monitoring' ? styles.activeTab : ''}`} onClick={() => setActiveTab('monitoring')}>
              <i className="fas fa-tasks"></i> Monitoring Pengisian
            </button>
            {isAdmin && (
              <button className={`${styles.tab} ${activeTab === 'rekap' ? styles.activeTab : ''}`} onClick={() => setActiveTab('rekap')}>
                <i className="fas fa-chart-bar"></i> Rekapitulasi Poin
              </button>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'form' && (
        <div className={styles.card} style={{ maxWidth: '900px', margin: '20px auto', padding: '30px' }}>
          
          {/* Header Periode */}
          <div style={{ marginBottom: 25, display: 'flex', alignItems: 'center', gap: '15px', background: '#f8fafc', padding: '15px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            <label style={{ fontWeight: 'bold', color: '#1e293b', margin: 0, whiteSpace: 'nowrap' }}>
              <i className="fas fa-calendar-alt" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
              Periode Penilaian:
            </label>
            <select className={styles.inputField} style={{ margin: 0, flex: 1, maxWidth: '250px', cursor: 'pointer', fontWeight: 'bold', color: 'var(--primary)' }} value={periode} onChange={e => setPeriode(e.target.value)}>
              {Array.from({length: 12}).map((_, i) => {
                 const d = new Date();
                 d.setMonth(d.getMonth() - i);
                 const val = d.toLocaleString('id-ID', {month: 'long'}) + ' ' + d.getFullYear();
                 return <option key={val} value={val}>{val}</option>
              })}
            </select>

            <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
              Penilai: <b style={{ color: '#0f172a' }}>{userName || 'User'}</b> {isSiswa ? (userRombel ? `(Kelas ${userRombel})` : '(Siswa)') : `(${userRole || 'Umum'})`}
            </span>
          </div>

          {/* Loading Indicator when checking status */}
          {checkingStatus && (
            <div style={{ marginBottom: 20 }}>
              <InlineLoading message="Memeriksa riwayat pengisian..." />
            </div>
          )}

          {/* Banner Sudah Mengisi */}
          {!checkingStatus && alreadySubmitted && (
            <div style={{
              background: '#ecfdf5',
              border: '1.5px solid #a7f3d0',
              borderRadius: '14px',
              padding: '18px 22px',
              marginBottom: '25px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.08)'
            }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                <i className="fas fa-check-double"></i>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#065f46' }}>
                  Anda Telah Menyelesaikan Penilaian Karakter untuk Periode Ini
                </div>
                <div style={{ fontSize: '0.85rem', color: '#047857', marginTop: '3px', lineHeight: 1.5 }}>
                  {submittedData?.created_at && (
                    <span>Terkirim pada: <b>{new Date(submittedData.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB</b>. </span>
                  )}
                  Penilaian karakter dibatasi <b>1 kali pengisian per periode</b>. Isian Anda di bawah telah dikunci dan tersimpan dengan aman.
                </div>
              </div>
            </div>
          )}

          {/* Banner Draf Tersimpan Otomatis */}
          {!checkingStatus && !alreadySubmitted && lastDraftSaved && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '12px',
              padding: '12px 18px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              fontSize: '0.86rem',
              color: '#15803d',
              boxShadow: '0 2px 4px rgba(16,185,129,0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="fas fa-save" style={{ color: '#16a34a', fontSize: '0.9rem' }}></i>
                </div>
                <div>
                  <span style={{ fontWeight: 700 }}>Draf isian tersimpan otomatis</span> di perangkat ini (terakhir pukul {lastDraftSaved}). Jika halaman ter-refresh atau kendala jaringan, isian tidak akan hilang.
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearDraft}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#dc2626',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  textDecoration: 'underline',
                  whiteSpace: 'nowrap'
                }}
                title="Kosongkan draf yang sedang diketik"
              >
                Kosongkan Draf
              </button>
            </div>
          )}

          {/* FORM SISWA */}
          {isSiswa && (
            <>
              <h2 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 10, marginTop: 10 }}>A. Penilaian Diri</h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>Nilailah dirimu sendiri secara objektif untuk karakter-karakter di bawah ini.</p>
              
              {TRAITS.map((t, idx) => (
                <div key={t.id} id={`card_diri_${t.id}`} style={{ marginBottom: 25, padding: 15, background: '#f8fafc', borderRadius: 8, opacity: alreadySubmitted ? 0.85 : 1 }}>
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ fontWeight: 'bold', margin: '0 0 4px 0', fontSize: '0.98rem', color: '#1e293b' }}>
                      {idx + 1}. Saya anak yang <span style={{ color: '#047857' }}>{t.label}</span>...
                    </p>
                    {t.desc && (
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic', lineHeight: 1.4 }}>
                        <i className="fas fa-info-circle" style={{ marginRight: 6, color: '#10b981', fontSize: '0.8rem' }}></i>
                        {t.desc}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 15 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: alreadySubmitted ? 'default' : 'pointer' }}>
                      <input 
                        type="radio" 
                        name={`diri_${t.id}`} 
                        disabled={alreadySubmitted}
                        checked={dataDiri[t.id]?.jawaban === 'A'} 
                        onChange={() => setDataDiri({ ...dataDiri, [t.id]: { ...dataDiri[t.id], jawaban: 'A' } })} 
                      />
                      <span>{t.label} (Sangat/Selalu)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: alreadySubmitted ? 'default' : 'pointer' }}>
                      <input 
                        type="radio" 
                        name={`diri_${t.id}`} 
                        disabled={alreadySubmitted}
                        checked={dataDiri[t.id]?.jawaban === 'B'} 
                        onChange={() => setDataDiri({ ...dataDiri, [t.id]: { ...dataDiri[t.id], jawaban: 'B' } })} 
                      />
                      <span>Biasa (Kadang-kadang)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: alreadySubmitted ? 'default' : 'pointer' }}>
                      <input 
                        type="radio" 
                        name={`diri_${t.id}`} 
                        disabled={alreadySubmitted}
                        checked={dataDiri[t.id]?.jawaban === 'C'} 
                        onChange={() => setDataDiri({ ...dataDiri, [t.id]: { ...dataDiri[t.id], jawaban: 'C' } })} 
                      />
                      <span>{t.id === 'leadership' ? 'Tidak/Kurang mempunyai leadership' : `Tidak/Kurang ${t.label.toLowerCase()}`}</span>
                    </label>
                  </div>
                  <input 
                    type="text" 
                    className={styles.inputField} 
                    style={{ width: '100%', boxSizing: 'border-box' }} 
                    placeholder="Tuliskan alasannya... (Opsional)" 
                    disabled={alreadySubmitted}
                    value={dataDiri[t.id]?.alasan || ''} 
                    onChange={e => setDataDiri({ ...dataDiri, [t.id]: { ...dataDiri[t.id], alasan: e.target.value } })} 
                  />
                </div>
              ))}

              <div style={{ marginBottom: 25, opacity: alreadySubmitted ? 0.85 : 1 }}>
                <p style={{ fontWeight: 'bold' }}>13. Selama bulan ini, hal baik yang sudah saya lakukan di madrasah adalah...</p>
                <textarea 
                  className={styles.inputField} 
                  style={{ height: 80, resize: 'vertical' }} 
                  disabled={alreadySubmitted}
                  value={halBaik} 
                  onChange={e => setHalBaik(e.target.value)}
                ></textarea>
              </div>
              <div style={{ marginBottom: 25, opacity: alreadySubmitted ? 0.85 : 1 }}>
                <p style={{ fontWeight: 'bold' }}>14. Yang perlu saya perbaiki dari diri saya adalah...</p>
                <textarea 
                  className={styles.inputField} 
                  style={{ height: 80, resize: 'vertical' }} 
                  disabled={alreadySubmitted}
                  value={halDiperbaiki} 
                  onChange={e => setHalDiperbaiki(e.target.value)}
                ></textarea>
              </div>

              <h2 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 10, marginTop: 40 }}>B. Penilaian Teman</h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>Pilih teman sekelas yang paling mewakili karakter di bawah ini, dan tulis alasannya.</p>

              {TRAITS.map((t, idx) => (
                <div key={`teman_${t.id}`} id={`card_teman_${t.id}`} style={{ marginBottom: 25, padding: 15, background: '#f8fafc', borderRadius: 8, opacity: alreadySubmitted ? 0.85 : 1 }}>
                  <p style={{ fontWeight: 'bold', margin: '0 0 4px 0', fontSize: '0.98rem', color: '#1e293b' }}>
                    {idx + 1}. Teman saya yang paling {t.id === 'leadership' ? 'berjiwa pemimpin (leadership)' : t.label.toLowerCase()} adalah:
                  </p>
                  {t.desc && (
                    <p style={{ margin: '0 0 10px 0', fontSize: '0.84rem', color: '#64748b', fontStyle: 'italic', lineHeight: 1.4 }}>
                      <i className="fas fa-info-circle" style={{ marginRight: 6, color: '#10b981', fontSize: '0.8rem' }}></i>
                      {t.desc}
                    </p>
                  )}
                  {alreadySubmitted ? (
                    <div style={{ padding: '9px 12px', background: '#e2e8f0', borderRadius: '8px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                      {temanSekelas.find(s => (s.nisn && s.nisn === dataTeman[t.id]?.nisn) || (s.nis && s.nis === dataTeman[t.id]?.nisn))?.nama ||
                       siswaData.find(s => (s.nisn && s.nisn === dataTeman[t.id]?.nisn) || (s.nis && s.nis === dataTeman[t.id]?.nisn))?.nama ||
                       dataTeman[t.id]?.nisn || '-'}
                    </div>
                  ) : (
                    <SearchableSelect 
                      options={temanSekelas.map(s => ({ 
                        value: s.nisn || s.nis, 
                        label: s.nama,
                        subLabel: s.rombel ? `Kelas ${s.rombel}` : undefined
                      }))} 
                      value={dataTeman[t.id]?.nisn || ''} 
                      onChange={val => setDataTeman({ ...dataTeman, [t.id]: { ...dataTeman[t.id], nisn: val } })} 
                      placeholder="-- Cari Teman Sekelas --" 
                    />
                  )}
                  <input 
                    type="text" 
                    className={styles.inputField} 
                    style={{ width: '100%', boxSizing: 'border-box' }} 
                    placeholder="Karena..." 
                    disabled={alreadySubmitted}
                    value={dataTeman[t.id]?.alasan || ''} 
                    onChange={e => setDataTeman({ ...dataTeman, [t.id]: { ...dataTeman[t.id], alasan: e.target.value } })} 
                  />
                </div>
              ))}
            </>
          )}

          {/* FORM GURU / PIMPINAN / GTK / STAF */}
          {!isSiswa && (userRole || userName) && (
            <>
              <h2 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 10, marginTop: 10 }}>
                Penilaian Karakter Murid oleh Guru / Pimpinan / Staf
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>
                Pilih murid (dari kelas berapapun) yang paling mewakili karakter di bawah ini. Alasan bersifat opsional.
              </p>

              {TRAITS.map((t, idx) => (
                <div key={`guru_${t.id}`} id={`card_guru_${t.id}`} style={{ marginBottom: 25, padding: 15, background: '#f8fafc', borderRadius: 8, opacity: alreadySubmitted ? 0.85 : 1 }}>
                  <p style={{ fontWeight: 'bold', margin: '0 0 4px 0', fontSize: '0.98rem', color: '#1e293b' }}>
                    {idx + 1}. Murid yang paling {t.id === 'leadership' ? 'berjiwa pemimpin (leadership)' : t.label.toLowerCase()} adalah:
                  </p>
                  {t.desc && (
                    <p style={{ margin: '0 0 10px 0', fontSize: '0.84rem', color: '#64748b', fontStyle: 'italic', lineHeight: 1.4 }}>
                      <i className="fas fa-info-circle" style={{ marginRight: 6, color: '#10b981', fontSize: '0.8rem' }}></i>
                      {t.desc}
                    </p>
                  )}
                  
                  {alreadySubmitted ? (
                    <div style={{ padding: '9px 12px', background: '#e2e8f0', borderRadius: '8px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                      {(() => {
                        const s = siswaData.find(st => (st.nisn && st.nisn === dataGuru[t.id]?.nisn) || (st.nis && st.nis === dataGuru[t.id]?.nisn));
                        return s ? `${s.nama}${s.rombel ? ` (Kelas ${s.rombel})` : ''}` : (dataGuru[t.id]?.nisn || '-');
                      })()}
                    </div>
                  ) : (
                    <SearchableSelect 
                      options={siswaData.map(s => ({ 
                        value: s.nisn || s.nis || String(s.id), 
                        label: s.nama, 
                        subLabel: s.rombel ? 'Kelas ' + s.rombel : undefined 
                      }))} 
                      value={dataGuru[t.id]?.nisn || ''} 
                      onChange={val => setDataGuru({ ...dataGuru, [t.id]: { ...dataGuru[t.id], nisn: val } })} 
                      placeholder="-- Cari Nama Siswa --" 
                    />
                  )}

                  <input 
                    type="text" 
                    className={styles.inputField} 
                    style={{ width: '100%', boxSizing: 'border-box' }} 
                    placeholder="Karena... (Opsional)" 
                    disabled={alreadySubmitted}
                    value={dataGuru[t.id]?.alasan || ''} 
                    onChange={e => setDataGuru({ ...dataGuru, [t.id]: { ...dataGuru[t.id], alasan: e.target.value } })} 
                  />
                </div>
              ))}
            </>
          )}

          {/* Not logged in */}
          {!userRole && !userName && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-user-lock" style={{ fontSize: '3rem', marginBottom: '15px', color: '#cbd5e1' }}></i>
              <h3>Silakan Login</h3>
              <p>Silakan login terlebih dahulu ke Portal Siswa atau Akun Madrasah untuk mengakses formulir ini.</p>
            </div>
          )}
          
          {/* Action Footer */}
          {(userRole || userName) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, borderTop: '2px dashed #e2e8f0', paddingTop: 25, flexWrap: 'wrap', gap: '15px' }}>
              {alreadySubmitted ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{
                    background: '#ecfdf5',
                    color: '#047857',
                    border: '1px solid #a7f3d0',
                    padding: '10px 18px',
                    borderRadius: '50px',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <i className="fas fa-check-circle" style={{ color: '#10b981' }}></i> Pengisian Sudah Selesai (Terkunci)
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={handleAdminReset}
                      style={{
                        background: '#fee2e2',
                        color: '#ef4444',
                        border: 'none',
                        padding: '9px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      title="Reset pengisian untuk akun ini"
                    >
                      <i className="fas fa-undo"></i> Reset Pengisian (Admin)
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: '6px', color: 'var(--primary)' }}></i>
                  Penilaian hanya dapat dikirim <b>1 kali</b> per periode. Pastikan semua data sudah terisi dengan benar.
                </div>
              )}

              {!alreadySubmitted && (
                <button 
                  onClick={handleSave} 
                  disabled={saving}
                  style={{ 
                    background: 'linear-gradient(135deg, var(--primary) 0%, #047857 100%)', 
                    color: 'white', 
                    padding: '14px 32px', 
                    fontSize: '1.05rem', 
                    fontWeight: 'bold',
                    border: 'none',
                    borderRadius: '50px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)',
                    transition: 'all 0.3s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    opacity: saving ? 0.7 : 1
                  }}
                  onMouseOver={e => { if(!saving) e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseOut={e => { if(!saving) e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>} 
                  {saving ? 'Sedang Menyimpan...' : 'Kirim Penilaian Sekarang'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'monitoring' && (
        <div className={styles.card} style={{ maxWidth: '100%', width: '96%', margin: '20px auto', padding: '24px' }}>
          {/* Top Bar Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h2 style={{ margin: '0 0 6px 0', fontSize: '1.35rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fas fa-tasks" style={{ color: 'var(--primary)' }}></i>
                Monitoring Pengisian Penilaian Karakter
              </h2>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
                Pantau progres pengisian siswa di setiap rombongan belajar / kelas secara real-time.
              </p>
            </div>

            {/* Toolbar Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '6px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                  <i className="fas fa-calendar-alt" style={{ marginRight: '6px', color: 'var(--primary)' }}></i> Periode:
                </label>
                <select
                  style={{ border: 'none', background: 'transparent', fontWeight: 700, color: 'var(--primary)', cursor: 'pointer', outline: 'none', fontSize: '0.9rem' }}
                  value={periode}
                  onChange={e => setPeriode(e.target.value)}
                >
                  {Array.from({length: 12}).map((_, i) => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    const val = d.toLocaleString('id-ID', {month: 'long'}) + ' ' + d.getFullYear();
                    return <option key={val} value={val}>{val}</option>;
                  })}
                </select>
              </div>

              <button
                type="button"
                onClick={handleCopyBelumMengisi}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '9px 16px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
                  transition: 'all 0.2s'
                }}
                title="Salin daftar nama siswa yang belum mengisi untuk dibagikan ke WhatsApp kelas"
              >
                <i className="fab fa-whatsapp" style={{ fontSize: '1.1rem' }}></i> Salin Belum Mengisi (WA)
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                style={{
                  background: '#0284c7',
                  color: 'white',
                  border: 'none',
                  padding: '9px 16px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                  transition: 'all 0.2s'
                }}
                title="Unduh data monitoring ke Excel"
              >
                <i className="fas fa-file-excel"></i> Export Excel
              </button>

              <button
                type="button"
                className={styles.btn}
                onClick={() => loadMonitoring(periode)}
                disabled={loadingMonitoring}
                style={{ padding: '9px 14px', fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <i className={`fas fa-sync-alt ${loadingMonitoring ? 'fa-spin' : ''}`}></i> Segarkan
              </button>
            </div>
          </div>

          {loadingMonitoring ? (
            <div style={{ padding: '50px 0' }}>
              <InlineLoading message="Memuat dan menghitung progres pengisian..." />
            </div>
          ) : !monitoringData ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <p>Belum ada data monitoring untuk periode ini.</p>
              <button className={styles.btn} onClick={() => loadMonitoring(periode)}>Muat Data</button>
            </div>
          ) : (
            <>
              {/* KPI Summary Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
              }}>
                {/* Total Siswa */}
                <div style={{
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  borderRadius: '14px',
                  padding: '18px 20px',
                  border: '1.5px solid #bae6fd',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#0284c7', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                    <i className="fas fa-users"></i>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Siswa Aktif</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0c4a6e', lineHeight: 1.2 }}>
                      {monitoringData.summary.totalSiswa} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0284c7' }}>Siswa</span>
                    </div>
                  </div>
                </div>

                {/* Sudah Mengisi */}
                <div style={{
                  background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                  borderRadius: '14px',
                  padding: '18px 20px',
                  border: '1.5px solid #a7f3d0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                    <i className="fas fa-check-circle"></i>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sudah Mengisi</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#064e3b', lineHeight: 1.2 }}>
                      {monitoringData.summary.sudahMengisi} <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669' }}>({monitoringData.summary.persentase}%)</span>
                    </div>
                  </div>
                </div>

                {/* Belum Mengisi */}
                <div style={{
                  background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                  borderRadius: '14px',
                  padding: '18px 20px',
                  border: '1.5px solid #fde68a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f59e0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                    <i className="fas fa-hourglass-half"></i>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Belum Mengisi</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#78350f', lineHeight: 1.2 }}>
                      {monitoringData.summary.belumMengisi} <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#d97706' }}>
                        ({monitoringData.summary.totalSiswa > 0 ? (100 - monitoringData.summary.persentase).toFixed(1) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar Madrasah */}
                <div style={{
                  background: '#f8fafc',
                  borderRadius: '14px',
                  padding: '18px 20px',
                  border: '1.5px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Kelengkapan Madrasah</span>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#047857' }}>{monitoringData.summary.persentase}%</span>
                  </div>
                  <div style={{ width: '100%', height: '10px', background: '#e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ width: `${monitoringData.summary.persentase}%`, height: '100%', background: 'linear-gradient(90deg, #10b981 0%, #047857 100%)', borderRadius: '8px', transition: 'width 0.5s ease' }}></div>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px' }}>
                    {monitoringData.summary.sudahMengisi} dari {monitoringData.summary.totalSiswa} siswa terdata
                  </div>
                </div>
              </div>

              {/* Rombel Summary Grid (Kartu Rombel Cepat) */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                    <i className="fas fa-layer-group" style={{ marginRight: '8px', color: 'var(--primary)' }}></i>
                    Ringkasan Tiap Kelas (Klik untuk filter):
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Menampilkan {monitoringData.rombelSummary.length} Rombongan Belajar</span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                  gap: '10px'
                }}>
                  {/* Tombol Semua Kelas */}
                  <div
                    onClick={() => setMonitorRombel('semua')}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background: monitorRombel === 'semua' ? '#ecfdf5' : '#ffffff',
                      border: monitorRombel === 'semua' ? '2px solid #10b981' : '1px solid #e2e8f0',
                      boxShadow: monitorRombel === 'semua' ? '0 4px 10px rgba(16, 185, 129, 0.2)' : '0 1px 3px rgba(0,0,0,0.03)',
                      transition: 'all 0.2s',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: monitorRombel === 'semua' ? '#047857' : '#0f172a' }}>
                      Semua Kelas
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '3px' }}>
                      <b>{monitoringData.summary.sudahMengisi}</b> / {monitoringData.summary.totalSiswa} Siswa
                    </div>
                    <div style={{
                      marginTop: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: monitoringData.summary.persentase >= 80 ? '#059669' : monitoringData.summary.persentase >= 50 ? '#d97706' : '#dc2626'
                    }}>
                      {monitoringData.summary.persentase}% Selesai
                    </div>
                  </div>

                  {/* Daftar Tiap Rombel */}
                  {monitoringData.rombelSummary.map((rb: any) => {
                    const isSelected = monitorRombel === rb.rombel;
                    const isHigh = rb.persentase >= 80;
                    const isMed = rb.persentase >= 50 && rb.persentase < 80;
                    return (
                      <div
                        key={rb.rombel}
                        onClick={() => setMonitorRombel(rb.rombel)}
                        style={{
                          padding: '12px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          background: isSelected ? '#ecfdf5' : '#ffffff',
                          border: isSelected ? '2px solid #10b981' : '1px solid #e2e8f0',
                          boxShadow: isSelected ? '0 4px 10px rgba(16, 185, 129, 0.2)' : '0 1px 3px rgba(0,0,0,0.03)',
                          transition: 'all 0.2s',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: isSelected ? '#047857' : '#1e293b' }}>
                            Kelas {rb.rombel}
                          </span>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: isHigh ? '#dcfce7' : isMed ? '#fef3c7' : '#fee2e2',
                            color: isHigh ? '#15803d' : isMed ? '#b45309' : '#b91c1c'
                          }}>
                            {rb.persentase}%
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                          <b style={{ color: '#047857' }}>{rb.sudah}</b> / {rb.total} Mengisi
                        </div>
                        <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginTop: '6px' }}>
                          <div style={{
                            width: `${rb.persentase}%`,
                            height: '100%',
                            background: isHigh ? '#10b981' : isMed ? '#f59e0b' : '#ef4444'
                          }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Filter Toolbar (Kelas, Status, Cari) */}
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '14px',
                padding: '16px',
                marginBottom: '20px',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}>
                {/* Select Kelas */}
                <div style={{ minWidth: '160px', flex: '1 1 180px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Pilih Kelas:
                  </label>
                  <select
                    value={monitorRombel}
                    onChange={e => setMonitorRombel(e.target.value)}
                    className={styles.inputField}
                    style={{ width: '100%', margin: 0, padding: '8px 12px', fontSize: '0.9rem', fontWeight: 600 }}
                  >
                    <option value="semua">Semua Kelas ({monitoringData.summary.totalSiswa})</option>
                    {monitoringData.rombelSummary.map((rb: any) => (
                      <option key={rb.rombel} value={rb.rombel}>
                        Kelas {rb.rombel} ({rb.sudah}/{rb.total} • {rb.persentase}%)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Status */}
                <div style={{ minWidth: '160px', flex: '1 1 180px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Status Pengisian:
                  </label>
                  <select
                    value={monitorStatus}
                    onChange={e => setMonitorStatus(e.target.value as any)}
                    className={styles.inputField}
                    style={{ width: '100%', margin: 0, padding: '8px 12px', fontSize: '0.9rem', fontWeight: 600 }}
                  >
                    <option value="semua">Semua Status</option>
                    <option value="sudah">✅ Sudah Mengisi Saja</option>
                    <option value="belum">⏳ Belum Mengisi Saja</option>
                  </select>
                </div>

                {/* Input Cari */}
                <div style={{ minWidth: '220px', flex: '2 1 250px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Cari Nama Siswa / NISN:
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={monitorSearch}
                      onChange={e => setMonitorSearch(e.target.value)}
                      placeholder="Ketik nama atau NISN siswa..."
                      className={styles.inputField}
                      style={{ width: '100%', margin: 0, padding: '8px 36px 8px 12px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                    />
                    {monitorSearch && (
                      <button
                        onClick={() => setMonitorSearch('')}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                      >
                        <i className="fas fa-times-circle"></i>
                      </button>
                    )}
                  </div>
                </div>

                {/* Summary hasil filter */}
                <div style={{ marginLeft: 'auto', alignSelf: 'flex-end', paddingBottom: '4px' }}>
                  <span style={{ fontSize: '0.88rem', color: '#334155', fontWeight: 600 }}>
                    Menampilkan <b>{filteredMonitoringStudents.length}</b> siswa
                  </span>
                </div>
              </div>

              {/* Tabel Siswa */}
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '50px', textAlign: 'center' }}>No</th>
                      <th style={{ width: '120px' }}>NISN / NIS</th>
                      <th>Nama Siswa</th>
                      <th style={{ width: '60px', textAlign: 'center' }}>L/P</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>Kelas</th>
                      <th style={{ width: '160px', textAlign: 'center' }}>Status</th>
                      <th style={{ width: '180px' }}>Waktu Kirim</th>
                      {isAdmin && <th style={{ width: '90px', textAlign: 'center' }}>Aksi</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMonitoringStudents.map((st: any, idx: number) => {
                      const isSudah = st.status === 'sudah';
                      return (
                        <tr key={st.id || idx} style={{ background: isSudah ? 'transparent' : '#fffdfa' }}>
                          <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{st.nisn || '-'}</div>
                            {st.nis && st.nis !== st.nisn && (
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>NIS: {st.nis}</div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{st.nama}</div>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: '#475569' }}>
                            {st.jk || '-'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              background: '#f1f5f9',
                              color: '#334155',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontWeight: 700,
                              fontSize: '0.85rem'
                            }}>
                              {st.rombel}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {isSudah ? (
                              <span style={{
                                background: '#dcfce7',
                                color: '#15803d',
                                border: '1px solid #bbf7d0',
                                padding: '4px 12px',
                                borderRadius: '50px',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}>
                                <i className="fas fa-check-circle" style={{ color: '#16a34a' }}></i> Sudah Mengisi
                              </span>
                            ) : (
                              <span style={{
                                background: '#fef3c7',
                                color: '#b45309',
                                border: '1px solid #fde68a',
                                padding: '4px 12px',
                                borderRadius: '50px',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}>
                                <i className="fas fa-clock" style={{ color: '#d97706' }}></i> Belum Mengisi
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.85rem', color: '#475569' }}>
                            {st.submittedAt ? (
                              <div>
                                <i className="fas fa-calendar-check" style={{ marginRight: '6px', color: '#10b981' }}></i>
                                {new Date(st.submittedAt).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })},{' '}
                                {new Date(st.submittedAt).toLocaleTimeString('id-ID', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })} WIB
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Belum ada kiriman</span>
                            )}
                          </td>
                          {isAdmin && (
                            <td style={{ textAlign: 'center' }}>
                              {isSudah && (
                                <button
                                  type="button"
                                  onClick={() => handleResetStudentFromMonitor(st)}
                                  style={{
                                    background: '#fee2e2',
                                    color: '#ef4444',
                                    border: 'none',
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                  title="Reset pengisian siswa ini agar dapat mengisi ulang"
                                >
                                  <i className="fas fa-undo"></i> Reset
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}

                    {filteredMonitoringStudents.length === 0 && (
                      <tr>
                        <td colSpan={isAdmin ? 8 : 7} style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                          <i className="fas fa-search" style={{ fontSize: '2rem', color: '#cbd5e1', marginBottom: '10px', display: 'block' }}></i>
                          <b>Tidak ada data siswa yang cocok dengan filter.</b>
                          <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>Coba ubah filter kelas, status, atau kata kunci pencarian.</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'rekap' && isAdmin && (
        <div className={styles.card} style={{ maxWidth: '100%', width: '95%', margin: '20px auto', padding: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ margin: 0 }}><i className="fas fa-trophy"></i> Rekapitulasi Poin Karakter ({periode})</h2>
            <button className={styles.btn} onClick={loadRekap} style={{ padding: '8px 16px' }}><i className="fas fa-sync-alt"></i> Segarkan</button>
          </div>
          
          {loading ? (
            <InlineLoading message="Menghitung poin rekapitulasi..." />
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Kelas</th>
                    <th>Nama Siswa</th>
                    {TRAITS.map(t => <th key={t.id} style={{ fontSize: '0.8rem', textAlign: 'center' }}>{t.label}</th>)}
                    <th>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {rekapData
                    .sort((a, b) => b.total - a.total || (a.kelas || '').localeCompare(b.kelas || '') || (a.nama || '').localeCompare(b.nama || ''))
                    .map((r, idx) => (
                    <tr key={r.nisn}>
                      <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ textAlign: 'center' }}>{r.kelas}</td>
                      <td>{r.nama}</td>
                      {TRAITS.map(t => (
                        <td key={t.id} style={{ textAlign: 'center', background: r.scores[t.id] > 0 ? '#ecfdf5' : 'transparent', fontWeight: r.scores[t.id] > 0 ? 'bold' : 'normal', color: r.scores[t.id] > 0 ? '#10b981' : '#94a3b8' }}>
                          {r.scores[t.id]}
                        </td>
                      ))}
                      <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}>{r.total}</td>
                    </tr>
                  ))}
                  {rekapData.length === 0 && (
                    <tr>
                      <td colSpan={16} style={{ textAlign: 'center', padding: 20 }}>Belum ada data penilaian di periode ini.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
