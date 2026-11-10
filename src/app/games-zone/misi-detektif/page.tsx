'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from './detektif.module.css';
import {
  EvidenceType,
  DetectiveGadget,
  DetectiveTeam,
  EvidenceFile,
  CaseChapter,
  DetectiveLog,
  DetectiveSession,
  DetectiveSaveSlot,
  INITIAL_GADGETS,
  INITIAL_DETECTIVE_TEAMS,
  CASE_CHAPTERS,
  DEFAULT_EVIDENCE_FILES
} from './detektifData';
import { sounds } from '../sound';
import Swal from 'sweetalert2';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function MisiDetektifPage() {
  // Core Session State
  const [sessionName, setSessionName] = useState('Operasi Detektif Literasi & Sejarah');
  const [kelas, setKelas] = useState('Kelas 8 / 9');
  const [mapel, setMapel] = useState('Sejarah & Literasi Kritis');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('all');
  const [currentTurn, setCurrentTurn] = useState<number>(0);
  const [round, setRound] = useState<number>(1);
  const [teams, setTeams] = useState<DetectiveTeam[]>(INITIAL_DETECTIVE_TEAMS);
  const [solvedEvidenceIds, setSolvedEvidenceIds] = useState<string[]>([]);
  const [customEvidences, setCustomEvidences] = useState<EvidenceFile[]>([]);
  const [logs, setLogs] = useState<DetectiveLog[]>([
    {
      id: 'init-log',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      teamName: 'Markas Besar Detektif',
      teamColor: '#f59e0b',
      text: 'Brankas Arsip Rahasia diaktifkan! Keempat Skuad Detektif siap memulai penyelidikan.',
      type: 'system'
    }
  ]);

  // Projector & UI Controls
  const [isTheater, setIsTheater] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<'normal' | 'large' | 'xl'>('normal');

  // Radar Scanner Animation State
  const [isScanning, setIsScanning] = useState(false);
  const [scanningId, setScanningId] = useState<string | null>(null);

  // Active Forensic Investigation Modal State
  const [activeEvidence, setActiveEvidence] = useState<EvidenceFile | null>(null);
  const [revealedClueStep, setRevealedClueStep] = useState<number>(1);
  const [showUvClue, setShowUvClue] = useState<boolean>(false);
  const [showSolution, setShowSolution] = useState<boolean>(false);
  const [doublePointsActive, setDoublePointsActive] = useState<boolean>(false);
  const [showAlphabetHelper, setShowAlphabetHelper] = useState<boolean>(true);
  const [cipherGuess, setCipherGuess] = useState<string>('');
  const [cipherUnlocked, setCipherUnlocked] = useState<boolean>(false);
  const [stealMode, setStealMode] = useState<boolean>(false);

  // Timer State
  const [timerSeconds, setTimerSeconds] = useState<number>(75);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Modals State
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showSquadModal, setShowSquadModal] = useState(false);
  const [showAddEvidenceModal, setShowAddEvidenceModal] = useState(false);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [savedSlots, setSavedSlots] = useState<DetectiveSaveSlot[]>([]);

  // Custom Evidence Form State
  const [newEvTitle, setNewEvTitle] = useState('');
  const [newEvType, setNewEvType] = useState<EvidenceType>('dokumen');
  const [newEvDifficulty, setNewEvDifficulty] = useState<'Mudah' | 'Sedang' | 'Sulit' | 'Master'>('Sedang');
  const [newEvPoints, setNewEvPoints] = useState(120);
  const [newEvTime, setNewEvTime] = useState(75);
  const [newEvDocHeader, setNewEvDocHeader] = useState('DOKUMEN INVESTIGASI GURU');
  const [newEvDocText, setNewEvDocText] = useState('');
  const [newEvCipherText, setNewEvCipherText] = useState('');
  const [newEvCipherCode, setNewEvCipherCode] = useState('');
  const [newEvQuestion, setNewEvQuestion] = useState('');
  const [newEvClue, setNewEvClue] = useState('');
  const [newEvAnswer, setNewEvAnswer] = useState('');
  const [newEvExplanation, setNewEvExplanation] = useState('');

  // Load saved state on mount
  useEffect(() => {
    setIsMuted(sounds.isMuted());
    loadSlotsFromStorage();
    try {
      const customStr = localStorage.getItem('gameszone_detektif_custom_evidences');
      if (customStr) {
        setCustomEvidences(JSON.parse(customStr));
      }
      const activeStr = localStorage.getItem('gameszone_detektif_active_session');
      if (activeStr) {
        const parsed: DetectiveSession = JSON.parse(activeStr);
        if (parsed && parsed.teams && parsed.teams.length === 4) {
          applySession(parsed);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Auto-save active session
  useEffect(() => {
    if (teams && teams.length === 4) {
      const currentSession: DetectiveSession = {
        id: 'detektif_active',
        name: sessionName,
        kelas,
        mapel,
        savedAt: new Date().toISOString(),
        selectedCaseId,
        currentTurn,
        round,
        teams,
        solvedEvidenceIds,
        customEvidences,
        logs
      };
      try {
        localStorage.setItem('gameszone_detektif_active_session', JSON.stringify(currentSession));
      } catch (e) {}
    }
  }, [sessionName, kelas, mapel, selectedCaseId, currentTurn, round, teams, solvedEvidenceIds, customEvidences, logs]);

  // Countdown Timer Effect
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setTimerRunning(false);
            sounds.playTimeUp();
            return 0;
          }
          if (prev <= 10) {
            sounds.playTick();
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  const loadSlotsFromStorage = () => {
    try {
      const str = localStorage.getItem('gameszone_detektif_save_slots');
      if (str) {
        setSavedSlots(JSON.parse(str));
      }
    } catch (e) {}
  };

  const applySession = (s: DetectiveSession) => {
    setSessionName(s.name || 'Operasi Detektif Literasi & Sejarah');
    setKelas(s.kelas || 'Kelas 8 / 9');
    setMapel(s.mapel || 'Sejarah & Literasi Kritis');
    setSelectedCaseId(s.selectedCaseId || 'all');
    setCurrentTurn(s.currentTurn || 0);
    setRound(s.round || 1);
    setTeams(s.teams);
    setSolvedEvidenceIds(s.solvedEvidenceIds || []);
    if (s.customEvidences && s.customEvidences.length > 0) {
      setCustomEvidences(s.customEvidences);
    }
    setLogs(s.logs || []);
  };

  const addLog = (teamName: string, teamColor: string, text: string, type: DetectiveLog['type'] = 'system') => {
    const newEntry: DetectiveLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      teamName,
      teamColor,
      text,
      type
    };
    setLogs(prev => [newEntry, ...prev.slice(0, 39)]);
  };

  // Filtered Evidence List for current Case Chapter
  const allEvidences: EvidenceFile[] = [...DEFAULT_EVIDENCE_FILES, ...customEvidences];
  const filteredEvidences: EvidenceFile[] =
    selectedCaseId === 'all'
      ? allEvidences
      : allEvidences.filter(ev => ev.caseId === selectedCaseId);

  const currentCase: CaseChapter =
    CASE_CHAPTERS.find(c => c.id === selectedCaseId) || CASE_CHAPTERS[0];

  const solvedInCaseCount = filteredEvidences.filter(ev => solvedEvidenceIds.includes(ev.id)).length;
  const totalInCaseCount = filteredEvidences.length;
  const progressPercent = totalInCaseCount > 0 ? Math.round((solvedInCaseCount / totalInCaseCount) * 100) : 0;

  const activeTeam = teams[currentTurn] || teams[0];

  const getDetectiveRank = (score: number) => {
    if (score >= 600) return '🏆 Komisaris Jenderal Literasi';
    if (score >= 400) return '⭐ Inspektur Utama Forensik';
    if (score >= 220) return '🕵️ Detektif Senior';
    if (score >= 100) return '🔍 Penyidik Muda';
    return '📋 Kadet Detektif';
  };

  const getTypeBadge = (type: EvidenceType) => {
    switch (type) {
      case 'dokumen':
        return { label: 'ANALISIS DOKUMEN', icon: 'fa-scroll', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
      case 'sandi':
        return { label: 'DEKODER SANDI', icon: 'fa-key', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' };
      case 'deduksi':
        return { label: 'DEDUKSI 3 BUKTI', icon: 'fa-project-diagram', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'forensik':
        return { label: 'UJI FORENSIK FAKTA', icon: 'fa-microscope', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' };
    }
  };

  // Open an Evidence File for Investigation
  const openEvidenceInvestigation = (ev: EvidenceFile) => {
    sounds.playChest();
    setActiveEvidence(ev);
    setRevealedClueStep(1);
    setShowUvClue(false);
    setShowSolution(false);
    setDoublePointsActive(false);
    setCipherGuess('');
    setCipherUnlocked(false);
    setStealMode(false);
    setTimerSeconds(ev.timeLimit || 75);
    setTimerRunning(true);
  };

  // Radar Random Scan for Unsolved Evidence
  const handleRadarScan = () => {
    const unsolved = filteredEvidences.filter(ev => !solvedEvidenceIds.includes(ev.id));
    if (unsolved.length === 0) {
      Swal.fire({
        title: '🎉 Semua Bukti di Kasus Ini Telah Terpecahkan!',
        text: 'Anda dapat membuka Brankas Akhir atau memilih Bab Kasus lainnya.',
        icon: 'success',
        confirmButtonColor: '#10b981'
      });
      return;
    }

    setIsScanning(true);
    sounds.playDiceRoll();

    let ticks = 0;
    const maxTicks = 12;
    const interval = setInterval(() => {
      const randomEv = unsolved[Math.floor(Math.random() * unsolved.length)];
      setScanningId(randomEv.id);
      ticks++;
      if (ticks >= maxTicks) {
        clearInterval(interval);
        setIsScanning(false);
        setScanningId(null);
        openEvidenceInvestigation(randomEv);
      }
    }, 110);
  };

  // Activate Forensic Gadget
  const handleUseGadget = (teamIndex: number, gadget: DetectiveGadget) => {
    const targetTeam = teams[teamIndex];
    if (!activeEvidence && gadget.effect !== 'double') {
      Swal.fire({
        title: `🔧 ${gadget.name}`,
        text: `${gadget.desc}. Buka salah satu Berkas Bukti terlebih dahulu untuk mengaktifkan alat ini!`,
        icon: 'info',
        confirmButtonColor: '#f59e0b'
      });
      return;
    }

    sounds.playChest();

    if (gadget.effect === 'clue') {
      setShowUvClue(true);
      if (activeEvidence?.type === 'deduksi') {
        setRevealedClueStep(3);
      }
    } else if (gadget.effect === 'time') {
      setTimerSeconds(prev => prev + 45);
      if (!timerRunning) setTimerRunning(true);
    } else if (gadget.effect === 'double') {
      setDoublePointsActive(true);
    }

    // Remove gadget from team's inventory
    setTeams(prev =>
      prev.map((t, idx) =>
        idx === teamIndex
          ? { ...t, gadgets: t.gadgets.filter(g => g.id !== gadget.id) }
          : t
      )
    );

    addLog(
      targetTeam.name,
      targetTeam.color,
      `Mengaktifkan alat forensik [${gadget.name}]!`,
      'gadget'
    );
  };

  // Check Cipher Code Input
  const handleVerifyCipherCode = () => {
    if (!activeEvidence) return;
    const expected = (activeEvidence.cipherKeyCode || activeEvidence.answer || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    const cleanedGuess = cipherGuess.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (!cleanedGuess) return;

    if (cleanedGuess === expected || expected.includes(cleanedGuess) && cleanedGuess.length >= 5) {
      sounds.playCorrect();
      setCipherUnlocked(true);
      setShowSolution(true);
      setTimerRunning(false);
    } else {
      sounds.playWrong();
      Swal.fire({
        title: '🔒 Kode Sandi Belum Tepat!',
        text: 'Gembok kriptografi masih terkunci. Periksa kembali petunjuk geser huruf/angkanya!',
        icon: 'warning',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  // Advance Turn Helper
  const advanceTurn = () => {
    const nextTurn = (currentTurn + 1) % 4;
    if (nextTurn === 0) {
      setRound(r => r + 1);
    }
    setCurrentTurn(nextTurn);
  };

  // Award Solved Evidence to a Team
  const handleMarkSolved = (winnerTeamIndex: number, isSteal: boolean = false) => {
    if (!activeEvidence) return;
    sounds.playCorrect();
    setTimerRunning(false);

    // Calculate points:
    // If deduksi and solved on step 1 -> +30 bonus, step 2 -> +15 bonus
    let earnedPoints = activeEvidence.points;
    if (activeEvidence.type === 'deduksi') {
      if (revealedClueStep === 1) earnedPoints += 30;
      else if (revealedClueStep === 2) earnedPoints += 15;
    }
    if (doublePointsActive && !isSteal) {
      earnedPoints *= 2;
    }
    if (isSteal) {
      earnedPoints = Math.round(activeEvidence.points * 0.75);
    }

    const winningSquad = teams[winnerTeamIndex];

    setTeams(prev =>
      prev.map((t, idx) =>
        idx === winnerTeamIndex
          ? {
              ...t,
              score: t.score + earnedPoints,
              solvedCount: t.solvedCount + 1
            }
          : t
      )
    );

    const newSolvedIds = solvedEvidenceIds.includes(activeEvidence.id)
      ? solvedEvidenceIds
      : [...solvedEvidenceIds, activeEvidence.id];
    setSolvedEvidenceIds(newSolvedIds);

    addLog(
      winningSquad.name,
      winningSquad.color,
      `${isSteal ? '[REBUTAN BERHASIL] ' : ''}Memecahkan ${activeEvidence.codeNumber}: "${activeEvidence.title}" (+${earnedPoints} Poin Reputasi)`,
      isSteal ? 'steal' : 'solve'
    );

    const closedEvidence = activeEvidence;
    setActiveEvidence(null);

    // Check if all evidences in current case are now solved
    const remainingInCase = filteredEvidences.filter(
      ev => ev.id !== closedEvidence.id && !newSolvedIds.includes(ev.id)
    );

    if (remainingInCase.length === 0) {
      setTimeout(() => {
        sounds.playVictory();
        setShowVictoryModal(true);
      }, 400);
    } else if (!isSteal) {
      advanceTurn();
    }
  };

  // Mark Wrong Answer (Allow Steal or Pass Turn)
  const handleMarkWrong = () => {
    if (!activeEvidence) return;
    sounds.playWrong();
    setTimerRunning(false);

    setTeams(prev =>
      prev.map((t, idx) =>
        idx === currentTurn
          ? {
              ...t,
              wrongCount: t.wrongCount + 1
            }
          : t
      )
    );

    addLog(
      activeTeam.name,
      activeTeam.color,
      `Belum berhasil memecahkan ${activeEvidence.codeNumber}. Kesempatan dilempar ke skuad lain!`,
      'fail'
    );

    setStealMode(true);
  };

  // Save Session to Slot
  const handleSaveProgress = async () => {
    const { value: customTitle } = await Swal.fire({
      title: '💾 Simpan Progres Investigasi Kelas',
      input: 'text',
      inputLabel: 'Nama Sesi Penyimpanan (misal: Kelas 8B - Pertemuan 1)',
      inputValue: `${sessionName} (${kelas})`,
      showCancelButton: true,
      confirmButtonText: 'Simpan Sesi',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#d97706'
    });

    if (!customTitle) return;

    const newSlot: DetectiveSaveSlot = {
      id: 'det-slot-' + Date.now(),
      name: customTitle,
      date: new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      session: {
        id: 'det-' + Date.now(),
        name: customTitle,
        kelas,
        mapel,
        savedAt: new Date().toISOString(),
        selectedCaseId,
        currentTurn,
        round,
        teams,
        solvedEvidenceIds,
        customEvidences,
        logs
      }
    };

    const updated = [newSlot, ...savedSlots.slice(0, 14)];
    setSavedSlots(updated);
    localStorage.setItem('gameszone_detektif_save_slots', JSON.stringify(updated));
    sounds.playCorrect();

    Swal.fire({
      title: 'Berhasil Disimpan!',
      text: 'Progres investigasi kelas telah diamankan dan siap dilanjutkan kapan saja.',
      icon: 'success',
      timer: 1800,
      showConfirmButton: false
    });
  };

  // Reset Game Session
  const handleResetGame = async () => {
    const res = await Swal.fire({
      title: 'Mulai Ulang Investigasi Baru?',
      text: 'Seluruh skor skuad dan status gembok bukti saat ini akan direset ke awal.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Reset Baru',
      cancelButtonText: 'Batal'
    });

    if (res.isConfirmed) {
      setTeams(INITIAL_DETECTIVE_TEAMS.map(t => ({ ...t, gadgets: [...INITIAL_GADGETS] })));
      setSolvedEvidenceIds([]);
      setCurrentTurn(0);
      setRound(1);
      setLogs([
        {
          id: 'reset-' + Date.now(),
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          teamName: 'Markas Besar Detektif',
          teamColor: '#f59e0b',
          text: 'Operasi investigasi baru dimulai! Seluruh berkas bukti disegel kembali.',
          type: 'system'
        }
      ]);
      localStorage.removeItem('gameszone_detektif_active_session');
    }
  };

  // Add Teacher Custom Evidence File
  const handleAddCustomEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvTitle.trim() || !newEvQuestion.trim() || !newEvAnswer.trim()) {
      Swal.fire('Lengkapi Data', 'Judul bukti, pertanyaan investigasi, dan kunci jawaban wajib diisi.', 'warning');
      return;
    }

    const nextNum = allEvidences.length + 1;
    const created: EvidenceFile = {
      id: 'custom-ev-' + Date.now(),
      caseId: selectedCaseId === 'all' ? 'case-literasi' : selectedCaseId,
      codeNumber: `BUKTI #${nextNum < 10 ? '0' + nextNum : nextNum}`,
      title: newEvTitle.trim(),
      type: newEvType,
      difficulty: newEvDifficulty,
      points: Number(newEvPoints) || 120,
      timeLimit: Number(newEvTime) || 75,
      documentHeader: newEvDocHeader.trim() || 'DOKUMEN INVESTIGASI GURU',
      documentSource: `Berkas Kasus ${mapel} • ${kelas}`,
      documentText: newEvDocText.trim() || 'Perhatikan petunjuk dan pertanyaan di bawah ini dengan saksama.',
      cipherText: newEvType === 'sandi' ? newEvCipherText.trim() : undefined,
      cipherKeyCode: newEvType === 'sandi' ? newEvCipherCode.trim().toUpperCase() : undefined,
      progressiveClues:
        newEvType === 'deduksi'
          ? newEvDocText
              .split('\n')
              .map(s => s.trim())
              .filter(Boolean)
          : undefined,
      question: newEvQuestion.trim(),
      clue: newEvClue.trim() || 'Diskusikan bersama anggota skuad detektifmu!',
      answer: newEvAnswer.trim(),
      explanation: newEvExplanation.trim() || newEvAnswer.trim()
    };

    const updatedCustom = [...customEvidences, created];
    setCustomEvidences(updatedCustom);
    localStorage.setItem('gameszone_detektif_custom_evidences', JSON.stringify(updatedCustom));

    setNewEvTitle('');
    setNewEvDocText('');
    setNewEvCipherText('');
    setNewEvCipherCode('');
    setNewEvQuestion('');
    setNewEvClue('');
    setNewEvAnswer('');
    setNewEvExplanation('');
    setShowAddEvidenceModal(false);
    sounds.playCorrect();

    Swal.fire({
      title: 'Berkas Bukti Ditambahkan!',
      text: `${created.codeNumber}: "${created.title}" telah dipasang di Papan Investigasi.`,
      icon: 'success',
      timer: 1800,
      showConfirmButton: false
    });
  };

  // Sorted Leaderboard for Victory Modal
  const sortedLeaderboard = [...teams].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.solvedCount - a.solvedCount;
  });

  const fontSizeMultiplier = zoomLevel === 'xl' ? 1.18 : zoomLevel === 'large' ? 1.08 : 1;

  return (
    <div
      className={isTheater ? styles.theaterOverlay : styles.detektifContainer}
      style={{ fontSize: `${fontSizeMultiplier}rem` }}
    >
      {/* TOP COMMAND BAR */}
      <div className={styles.commandBar}>
        <div className={styles.brandLeft}>
          <Link href="/games-zone" className={styles.btnCommand} title="Kembali ke Lobby Game's Zone">
            <i className="fas fa-arrow-left" style={{ color: '#fbbf24' }}></i>
            <span>Lobby</span>
          </Link>

          <div className={styles.badgeEmblem}>
            <i className="fas fa-user-secret"></i>
          </div>

          <div>
            <h1 className={styles.hqTitle}>MISI DETEKTIF LITERASI &amp; SEJARAH</h1>
            <div className={styles.hqSubtitle}>
              <span>
                <i className="fas fa-folder-open" style={{ color: '#fbbf24', marginRight: 5 }}></i>
                {sessionName}
              </span>
              <span>•</span>
              <span style={{ color: '#38bdf8', fontWeight: 700 }}>{kelas}</span>
              <span>•</span>
              <span style={{ color: '#34d399', fontWeight: 700 }}>{mapel}</span>
              <span>•</span>
              <span>Putaran #{round}</span>
            </div>
          </div>
        </div>

        <div className={styles.topControls}>
          <button
            className={styles.btnCommand}
            onClick={() =>
              setZoomLevel(prev => (prev === 'normal' ? 'large' : prev === 'large' ? 'xl' : 'normal'))
            }
            title="Perbesar Teks Proyektor"
          >
            <i className="fas fa-text-height" style={{ color: '#38bdf8' }}></i>
            <span>{zoomLevel === 'normal' ? '100%' : zoomLevel === 'large' ? '110%' : '125%'}</span>
          </button>

          <button
            className={styles.btnCommand}
            onClick={() => setIsMuted(sounds.toggleMute())}
            title="Suara Efek"
          >
            <i
              className={`fas ${isMuted ? 'fa-volume-mute' : 'fa-volume-up'}`}
              style={{ color: isMuted ? '#ef4444' : '#10b981' }}
            ></i>
          </button>

          <button className={styles.btnCommand} onClick={() => setShowSquadModal(true)}>
            <i className="fas fa-users-cog" style={{ color: '#f59e0b' }}></i>
            <span>Atur Skuad</span>
          </button>

          <button className={styles.btnCommand} onClick={() => setShowAddEvidenceModal(true)}>
            <i className="fas fa-plus-circle" style={{ color: '#10b981' }}></i>
            <span>+ Bukti Guru</span>
          </button>

          <button className={`${styles.btnCommand} ${styles.btnSaveGold}`} onClick={handleSaveProgress}>
            <i className="fas fa-save"></i>
            <span>Simpan Sesi</span>
          </button>

          <button className={styles.btnCommand} onClick={() => setShowLoadModal(true)}>
            <i className="fas fa-folder-open" style={{ color: '#38bdf8' }}></i>
            <span>Muat ({savedSlots.length})</span>
          </button>

          <button className={styles.btnCommand} onClick={handleResetGame} title="Reset Permainan">
            <i className="fas fa-redo" style={{ color: '#f87171' }}></i>
          </button>

          <button
            className={styles.btnCommand}
            style={{
              background: isTheater
                ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
                : 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
              borderColor: isTheater ? '#fca5a5' : '#818cf8',
              color: 'white'
            }}
            onClick={() => setIsTheater(!isTheater)}
          >
            <i className={`fas ${isTheater ? 'fa-compress' : 'fa-expand'}`}></i>
            <span>{isTheater ? 'Keluar Proyektor' : 'Layar Proyektor'}</span>
          </button>
        </div>
      </div>

      {/* CASE CHAPTER SELECTOR TABS */}
      <div className={styles.caseTabsBar}>
        {CASE_CHAPTERS.map(ch => {
          const isSelected = selectedCaseId === ch.id;
          const chEvs = ch.id === 'all' ? allEvidences : allEvidences.filter(e => e.caseId === ch.id);
          const chSolved = chEvs.filter(e => solvedEvidenceIds.includes(e.id)).length;
          return (
            <button
              key={ch.id}
              className={`${styles.caseTab} ${isSelected ? styles.caseTabActive : ''}`}
              onClick={() => setSelectedCaseId(ch.id)}
            >
              <div
                className={styles.caseTabIcon}
                style={{
                  background: isSelected ? ch.accentColor : 'rgba(255,255,255,0.07)',
                  color: isSelected ? '#0c0a09' : ch.accentColor
                }}
              >
                <i className={`fas ${ch.icon}`}></i>
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    color: ch.accentColor,
                    letterSpacing: '0.6px'
                  }}
                >
                  {ch.code} • {chSolved}/{chEvs.length} BUKTI
                </div>
                <div
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {ch.title}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* MASTER ESCAPE VAult & 4 SEALS PROGRESS BANNER */}
      <div className={styles.vaultBanner}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span
              style={{
                background: 'rgba(245, 158, 11, 0.2)',
                border: '1px solid #f59e0b',
                color: '#fbbf24',
                fontSize: '0.74rem',
                fontWeight: 900,
                padding: '3px 10px',
                borderRadius: 20,
                letterSpacing: '0.8px'
              }}
            >
              <i className="fas fa-vault" style={{ marginRight: 5 }}></i>
              BRANKAS UTAMA: {currentCase.vaultCodeWord}
            </span>
            <span style={{ fontSize: '0.82rem', color: '#a8a29e', fontWeight: 600 }}>
              Era: {currentCase.era}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.92rem', color: '#d6d3d1', lineHeight: 1.5 }}>
            {currentCase.briefing}
          </p>
        </div>

        {/* 4 Vault Seals */}
        <div className={styles.vaultLocksRow}>
          {[
            { label: 'SEGEL I: PRASASTI', threshold: 25 },
            { label: 'SEGEL II: KRIPTOGRAFI', threshold: 50 },
            { label: 'SEGEL III: DEDUKSI', threshold: 75 },
            { label: 'SEGEL IV: MASTER', threshold: 100 }
          ].map((seal, idx) => {
            const unlocked = progressPercent >= seal.threshold;
            return (
              <div
                key={idx}
                className={`${styles.vaultSeal} ${
                  unlocked ? styles.vaultSealUnlocked : styles.vaultSealLocked
                }`}
              >
                <i className={`fas ${unlocked ? 'fa-unlock-alt' : 'fa-lock'}`}></i>
                <span>{seal.label}</span>
              </div>
            );
          })}

          <button
            className={styles.btnCommand}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
              borderColor: '#34d399',
              color: 'white',
              padding: '10px 16px'
            }}
            onClick={() => {
              sounds.playVictory();
              setShowVictoryModal(true);
            }}
          >
            <i className="fas fa-trophy"></i>
            <span>Podium &amp; Rekap Kasus</span>
          </button>
        </div>
      </div>

      {/* ACTIVE SQUAD TURN & RADAR SCANNER DECK */}
      <div
        className={styles.scannerDeck}
        style={{
          background: activeTeam.bgLight,
          borderColor: activeTeam.borderColor
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: activeTeam.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              color: '#0c0a09',
              boxShadow: `0 0 20px ${activeTeam.color}`
            }}
          >
            <i className={`fas ${activeTeam.avatarIcon}`}></i>
          </div>

          <div>
            <div
              style={{
                fontSize: '0.8rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: '#fde68a'
              }}
            >
              🕵️ SKUAD PENYIDIK YANG BERTUGAS SAAT INI:
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h2 style={{ margin: '2px 0 0 0', fontSize: '1.65rem', fontWeight: 900, color: '#ffffff' }}>
                {activeTeam.name}
              </h2>
              <span
                style={{
                  background: 'rgba(0,0,0,0.45)',
                  border: `1px solid ${activeTeam.borderColor}`,
                  color: activeTeam.borderColor,
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: '0.8rem',
                  fontWeight: 800
                }}
              >
                {getDetectiveRank(activeTeam.score)}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            className={styles.btnRadarScan}
            onClick={handleRadarScan}
            disabled={isScanning}
          >
            <i className={`fas ${isScanning ? 'fa-satellite-dish fa-spin' : 'fa-crosshairs'}`}></i>
            <span>{isScanning ? 'MEMINDAI BERKAS BUKTI...' : 'PINDAI ACAK BERKAS BUKTI'}</span>
          </button>

          <button
            className={styles.btnCommand}
            onClick={advanceTurn}
            title="Ganti ke Skuad Berikutnya"
            style={{ padding: '13px 16px' }}
          >
            <i className="fas fa-step-forward" style={{ color: '#fbbf24' }}></i>
            <span>Ganti Giliran</span>
          </button>
        </div>
      </div>

      {/* 4 DETECTIVE SQUAD CARDS */}
      <div className={styles.squadsGrid}>
        {teams.map((squad, idx) => {
          const isTurn = currentTurn === idx;
          return (
            <div
              key={squad.id}
              onClick={() => setCurrentTurn(idx)}
              className={`${styles.squadCard} ${isTurn ? styles.squadCardActive : ''}`}
              style={{
                borderColor: isTurn ? squad.borderColor : 'rgba(255,255,255,0.08)',
                background: isTurn
                  ? `linear-gradient(145deg, ${squad.bgLight} 0%, rgba(28, 25, 23, 0.95) 100%)`
                  : 'rgba(28, 25, 23, 0.85)',
                cursor: 'pointer'
              }}
            >
              {isTurn && (
                <div
                  style={{
                    position: 'absolute',
                    top: -11,
                    right: 14,
                    background: squad.color,
                    color: '#0c0a09',
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    padding: '2px 10px',
                    borderRadius: 12,
                    letterSpacing: '0.5px',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.4)'
                  }}
                >
                  GILIRAN AKTIF
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 11,
                      background: squad.color,
                      color: '#0c0a09',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      fontWeight: 900
                    }}
                  >
                    <i className={`fas ${squad.avatarIcon}`}></i>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#ffffff' }}>
                      {squad.name}
                    </h3>
                    <div style={{ fontSize: '0.75rem', color: squad.borderColor, fontWeight: 700 }}>
                      {squad.badgeTitle}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.45)',
                    color: '#fbbf24',
                    padding: '5px 11px',
                    borderRadius: 16,
                    fontWeight: 900,
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                >
                  <i className="fas fa-star"></i>
                  <span>{squad.score}</span>
                </div>
              </div>

              <div
                style={{
                  fontSize: '0.78rem',
                  color: '#a8a29e',
                  marginBottom: 10,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>
                  <i className="fas fa-users" style={{ marginRight: 5 }}></i>
                  {squad.members}
                </span>
                <span style={{ color: '#34d399', fontWeight: 800 }}>
                  <i className="fas fa-check-circle" style={{ marginRight: 4 }}></i>
                  {squad.solvedCount} Bukti
                </span>
              </div>

              {/* Forensic Gadgets Inventory */}
              <div
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  paddingTop: 8,
                  display: 'flex',
                  gap: 6,
                  flexWrap: 'wrap',
                  minHeight: 30
                }}
              >
                {squad.gadgets.length > 0 ? (
                  squad.gadgets.map(g => (
                    <button
                      key={g.id}
                      type="button"
                      className={styles.gadgetPill}
                      title={g.desc}
                      onClick={e => {
                        e.stopPropagation();
                        handleUseGadget(idx, g);
                      }}
                    >
                      <i className={`fas ${g.icon}`} style={{ color: g.color }}></i>
                      <span>{g.name}</span>
                    </button>
                  ))
                ) : (
                  <span style={{ fontSize: '0.73rem', color: '#57534e', fontStyle: 'italic' }}>
                    Semua alat forensik telah digunakan
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* DETECTIVE EVIDENCE CORKBOARD */}
      <div className={styles.corkboardWrapper}>
        <div className={styles.corkboardHeader}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#fef3c7', display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="fas fa-thumbtack" style={{ color: '#ef4444' }}></i>
              <span>PAPAN BARANG BUKTI &amp; BERKAS RAHASIA ({currentCase.title})</span>
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.86rem', color: '#a8a29e' }}>
              Klik langsung pada map berkas bukti di bawah ini atau gunakan tombol <b>Pindai Acak Berkas Bukti</b> di atas untuk membuka meja forensik!
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34d399',
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: '0.88rem',
                fontWeight: 800
              }}
            >
              Terpecahkan: {solvedInCaseCount} / {totalInCaseCount} Berkas ({progressPercent}%)
            </div>
          </div>
        </div>

        <div className={styles.evidenceGrid}>
          {filteredEvidences.map(ev => {
            const isSolved = solvedEvidenceIds.includes(ev.id);
            const isBeingScanned = scanningId === ev.id;
            const badge = getTypeBadge(ev.type);

            return (
              <div
                key={ev.id}
                onClick={() => openEvidenceInvestigation(ev)}
                className={`${styles.evidenceFolder} ${
                  isSolved ? styles.evidenceFolderSolved : ''
                } ${isBeingScanned ? styles.evidenceFolderScanning : ''}`}
              >
                <div className={styles.pinDot}></div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingRight: 18 }}>
                    <span
                      style={{
                        fontSize: '0.76rem',
                        fontWeight: 900,
                        color: isSolved ? '#34d399' : '#fbbf24',
                        letterSpacing: '0.8px'
                      }}
                    >
                      {ev.codeNumber}
                    </span>

                    <span
                      className={styles.stampClassified}
                      style={{
                        color: badge.color,
                        borderColor: badge.color,
                        background: badge.bg
                      }}
                    >
                      <i className={`fas ${badge.icon}`} style={{ marginRight: 4 }}></i>
                      {ev.type.toUpperCase()}
                    </span>
                  </div>

                  <h3
                    style={{
                      margin: '0 0 8px 0',
                      fontSize: '1rem',
                      fontWeight: 800,
                      color: isSolved ? '#a7f3d0' : '#f5f5f4',
                      lineHeight: 1.35
                    }}
                  >
                    {ev.title}
                  </h3>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: '#a8a29e',
                      marginBottom: 10,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    <i className="fas fa-archive" style={{ marginRight: 5, color: '#78716c' }}></i>
                    {ev.documentSource || 'Arsip Rahasia'}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '1px solid rgba(255,255,255,0.08)',
                      paddingTop: 8
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 900,
                        color: '#fbbf24'
                      }}
                    >
                      <i className="fas fa-coins" style={{ marginRight: 4 }}></i>
                      +{ev.points} Poin
                    </span>

                    {isSolved ? (
                      <span
                        style={{
                          background: '#059669',
                          color: 'white',
                          padding: '2px 9px',
                          borderRadius: 8,
                          fontSize: '0.72rem',
                          fontWeight: 900
                        }}
                      >
                        <i className="fas fa-check" style={{ marginRight: 4 }}></i>
                        TERPECAHKAN
                      </span>
                    ) : (
                      <span
                        style={{
                          background: 'rgba(239, 68, 68, 0.18)',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          color: '#fca5a5',
                          padding: '2px 8px',
                          borderRadius: 8,
                          fontSize: '0.7rem',
                          fontWeight: 800
                        }}
                      >
                        <i className="fas fa-lock" style={{ marginRight: 4 }}></i>
                        {ev.difficulty}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* LIVE INVESTIGATION LOG */}
      <div
        style={{
          background: 'rgba(28, 25, 23, 0.75)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 18,
          padding: '16px 20px'
        }}
      >
        <div
          style={{
            fontSize: '0.88rem',
            fontWeight: 800,
            color: '#fbbf24',
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-terminal"></i>
          <span>JURNAL KRONOLOGI PENYELIDIKAN KELAS</span>
        </div>
        <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {logs.map(log => (
            <div
              key={log.id}
              style={{
                fontSize: '0.84rem',
                padding: '5px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                gap: 10,
                alignItems: 'baseline'
              }}
            >
              <span style={{ color: '#78716c', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                [{log.timestamp}]
              </span>
              <span style={{ fontWeight: 800, color: log.teamColor }}>{log.teamName}:</span>
              <span style={{ color: '#e7e5e4' }}>{log.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ==================== FORENSIC INVESTIGATION MODAL ==================== */}
      {activeEvidence && (
        <div className={styles.forensicModalOverlay}>
          <div className={styles.forensicModalCard}>
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: 16,
                marginBottom: 18,
                borderBottom: '1px solid rgba(255,255,255,0.12)',
                flexWrap: 'wrap',
                gap: 12
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span
                  style={{
                    background: '#f59e0b',
                    color: '#0c0a09',
                    padding: '5px 12px',
                    borderRadius: 10,
                    fontWeight: 900,
                    fontSize: '0.88rem'
                  }}
                >
                  {activeEvidence.codeNumber}
                </span>

                <span
                  style={{
                    background: getTypeBadge(activeEvidence.type).bg,
                    color: getTypeBadge(activeEvidence.type).color,
                    border: `1px solid ${getTypeBadge(activeEvidence.type).color}`,
                    padding: '5px 12px',
                    borderRadius: 10,
                    fontWeight: 800,
                    fontSize: '0.84rem'
                  }}
                >
                  <i className={`fas ${getTypeBadge(activeEvidence.type).icon}`} style={{ marginRight: 6 }}></i>
                  {getTypeBadge(activeEvidence.type).label}
                </span>

                <span
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid #10b981',
                    color: '#34d399',
                    padding: '5px 12px',
                    borderRadius: 10,
                    fontWeight: 900,
                    fontSize: '0.88rem'
                  }}
                >
                  +{doublePointsActive ? activeEvidence.points * 2 : activeEvidence.points} Poin Reputasi
                  {doublePointsActive && ' (2x AKTIF!)'}
                </span>
              </div>

              {/* Countdown Timer Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    background: '#090d16',
                    border: `2px solid ${timerSeconds <= 10 ? '#ef4444' : '#fbbf24'}`,
                    color: timerSeconds <= 10 ? '#ef4444' : '#fde68a',
                    padding: '6px 14px',
                    borderRadius: 12,
                    fontFamily: 'monospace',
                    fontSize: '1.45rem',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <i className="fas fa-stopwatch"></i>
                  <span>
                    {Math.floor(timerSeconds / 60)}:{String(timerSeconds % 60).padStart(2, '0')}
                  </span>
                </div>

                <button
                  className={styles.btnCommand}
                  onClick={() => setTimerRunning(!timerRunning)}
                  title={timerRunning ? 'Jeda Timer' : 'Lanjutkan Timer'}
                >
                  <i className={`fas ${timerRunning ? 'fa-pause' : 'fa-play'}`}></i>
                </button>

                <button
                  className={styles.btnCommand}
                  onClick={() => setTimerSeconds(s => s + 30)}
                  title="Tambah Waktu +30 Detik"
                >
                  +30d
                </button>

                <button
                  className={styles.btnCommand}
                  onClick={() => {
                    setTimerRunning(false);
                    setActiveEvidence(null);
                  }}
                  title="Tutup Berkas"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            {/* Active Squad & Quick Gadget Bar */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.85)',
                border: `1px solid ${activeTeam.borderColor}`,
                borderRadius: 14,
                padding: '10px 16px',
                marginBottom: 18,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: activeTeam.color,
                    color: '#0c0a09',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900
                  }}
                >
                  <i className={`fas ${activeTeam.avatarIcon}`}></i>
                </span>
                <span style={{ fontWeight: 800, color: '#ffffff' }}>
                  Penyidik: <span style={{ color: activeTeam.borderColor }}>{activeTeam.name}</span>
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Gunakan Alat Skuad:</span>
                {activeTeam.gadgets.length > 0 ? (
                  activeTeam.gadgets.map(g => (
                    <button
                      key={g.id}
                      type="button"
                      className={styles.gadgetPill}
                      onClick={() => handleUseGadget(currentTurn, g)}
                    >
                      <i className={`fas ${g.icon}`} style={{ color: g.color }}></i>
                      <span>{g.name}</span>
                    </button>
                  ))
                ) : (
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Habis</span>
                )}
              </div>
            </div>

            <h2 style={{ margin: '0 0 14px 0', fontSize: '1.45rem', fontWeight: 900, color: '#fef3c7' }}>
              <i className="fas fa-folder-open" style={{ color: '#f59e0b', marginRight: 10 }}></i>
              {activeEvidence.title}
            </h2>

            {/* DISPLAY BY EVIDENCE TYPE */}
            {/* 1. DOKUMEN / FORENSIK / SANDI INTRO */}
            {activeEvidence.type !== 'deduksi' && (
              <div className={styles.parchmentBox}>
                <div className={styles.parchmentMeta}>
                  <span>
                    <i className="fas fa-file-signature" style={{ marginRight: 6 }}></i>
                    {activeEvidence.documentHeader || 'DOKUMEN BARANG BUKTI'}
                  </span>
                  <span>{activeEvidence.documentSource}</span>
                </div>
                <div className={styles.parchmentContent}>{activeEvidence.documentText}</div>
              </div>
            )}

            {/* 2. CIPHER DECODER CONSOLE */}
            {activeEvidence.type === 'sandi' && (
              <div className={styles.cipherConsole}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                    flexWrap: 'wrap',
                    gap: 8
                  }}
                >
                  <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#38bdf8', letterSpacing: '0.8px' }}>
                    <i className="fas fa-terminal" style={{ marginRight: 6 }}></i>
                    KONSOL DEKODER KRIPTOGRAFI
                  </span>
                  <button
                    type="button"
                    className={styles.btnCommand}
                    style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                    onClick={() => setShowAlphabetHelper(!showAlphabetHelper)}
                  >
                    <i className="fas fa-table"></i>
                    <span>{showAlphabetHelper ? 'Sembunyikan Tabel Abjad' : 'Tampilkan Tabel Abjad A-Z'}</span>
                  </button>
                </div>

                <div className={styles.cipherCodeDisplay}>{activeEvidence.cipherText}</div>

                {activeEvidence.cipherHint && (
                  <div style={{ textAlign: 'center', fontSize: '0.86rem', color: '#7dd3fc', marginBottom: 10 }}>
                    <i className="fas fa-info-circle" style={{ marginRight: 5 }}></i>
                    Petunjuk Pola Sandi: <b>{activeEvidence.cipherHint}</b>
                  </div>
                )}

                {showAlphabetHelper && (
                  <div className={styles.alphabetStrip}>
                    {ALPHABET.map((letter, idx) => (
                      <div key={letter} className={styles.alphaCell}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#fbbf24' }}>{letter}</div>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{idx + 1}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Interactive Cipher Lock Input */}
                <div
                  style={{
                    marginTop: 14,
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                  }}
                >
                  <input
                    type="text"
                    value={cipherGuess}
                    onChange={e => setCipherGuess(e.target.value)}
                    placeholder="Ketik hasil terjemahan sandi di sini..."
                    style={{
                      background: '#0f172a',
                      border: `2px solid ${cipherUnlocked ? '#10b981' : '#38bdf8'}`,
                      color: '#ffffff',
                      padding: '10px 16px',
                      borderRadius: 10,
                      fontSize: '1rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '1.5px',
                      minWidth: 260
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleVerifyCipherCode();
                    }}
                  />
                  <button
                    type="button"
                    className={styles.btnCommand}
                    style={{
                      background: cipherUnlocked ? '#10b981' : '#0284c7',
                      borderColor: '#38bdf8',
                      color: 'white',
                      padding: '10px 18px'
                    }}
                    onClick={handleVerifyCipherCode}
                  >
                    <i className={`fas ${cipherUnlocked ? 'fa-unlock' : 'fa-key'}`}></i>
                    <span>{cipherUnlocked ? 'GEMBOK TERBUKA!' : 'Uji Kode Sandi'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* 3. PROGRESSIVE 3-CLUE DEDUCTION */}
            {activeEvidence.type === 'deduksi' && activeEvidence.progressiveClues && (
              <div className={styles.cluesStack}>
                <div style={{ fontSize: '0.88rem', color: '#fcd34d', fontWeight: 700, marginBottom: 4 }}>
                  <i className="fas fa-lightbulb" style={{ marginRight: 6 }}></i>
                  {activeEvidence.documentText} (Menjawab di Bukti #1 mendapat Bonus +30 Poin, Bukti #2 Bonus +15 Poin!)
                </div>

                {activeEvidence.progressiveClues.map((clueText, cIdx) => {
                  const stepNum = cIdx + 1;
                  const isUnlocked = revealedClueStep >= stepNum;
                  return isUnlocked ? (
                    <div key={cIdx} className={styles.clueStepCard}>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 900,
                          color: '#fbbf24',
                          marginBottom: 4,
                          letterSpacing: '0.6px'
                        }}
                      >
                        <i className="fas fa-folder-open" style={{ marginRight: 6 }}></i>
                        PETUNJUK FORENSIK #{stepNum} TERBUKA
                      </div>
                      <div>{clueText}</div>
                    </div>
                  ) : (
                    <div key={cIdx} className={`${styles.clueStepCard} ${styles.clueStepLocked}`}>
                      <span>
                        <i className="fas fa-lock" style={{ marginRight: 8 }}></i>
                        Petunjuk Forensik #{stepNum} Masih Disegel
                      </span>
                      <button
                        type="button"
                        className={styles.btnCommand}
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => {
                          sounds.playChest();
                          setRevealedClueStep(stepNum);
                        }}
                      >
                        <i className="fas fa-eye" style={{ color: '#fbbf24' }}></i>
                        <span>Buka Petunjuk #{stepNum}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* MAIN INVESTIGATION QUESTION */}
            <div className={styles.questionPrompt}>
              <div
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  color: '#38bdf8',
                  letterSpacing: '0.8px',
                  marginBottom: 6,
                  textTransform: 'uppercase'
                }}
              >
                <i className="fas fa-question-circle" style={{ marginRight: 6 }}></i>
                PERTANYAAN TIM PENYIDIK:
              </div>
              {activeEvidence.question}
            </div>

            {/* UV CLUE BOX */}
            {showUvClue && (
              <div className={styles.uvClueBox}>
                <div style={{ fontWeight: 900, color: '#d8b4fe', marginBottom: 4 }}>
                  <i className="fas fa-search-plus" style={{ marginRight: 6 }}></i>
                  PETUNJUK SINAR UV FORENSIK:
                </div>
                {activeEvidence.clue}
              </div>
            )}

            {/* SOLUTION / FORENSIC EXPLANATION BOX */}
            {showSolution && (
              <div className={styles.solutionBox}>
                <div
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 900,
                    color: '#34d399',
                    letterSpacing: '0.8px',
                    marginBottom: 6,
                    textTransform: 'uppercase'
                  }}
                >
                  <i className="fas fa-check-double" style={{ marginRight: 6 }}></i>
                  KUNCI ANALISIS &amp; KESIMPULAN FORENSIK:
                </div>
                <div style={{ fontSize: '1.18rem', fontWeight: 900, color: '#ffffff', marginBottom: 8 }}>
                  {activeEvidence.answer}
                </div>
                <div style={{ fontSize: '0.95rem', color: '#a7f3d0', lineHeight: 1.55 }}>
                  <b>Penjelasan Lengkap:</b> {activeEvidence.explanation}
                </div>
              </div>
            )}

            {/* STEAL MODE (LEMPAR REBUTAN KE SKUAD LAIN) */}
            {stealMode && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.14)',
                  border: '1.5px solid #ef4444',
                  borderRadius: 16,
                  padding: '16px 20px',
                  marginBottom: 20
                }}
              >
                <div style={{ fontWeight: 900, color: '#fca5a5', marginBottom: 10 }}>
                  <i className="fas fa-bolt" style={{ color: '#fbbf24', marginRight: 6 }}></i>
                  MODE REBUTAN AKTIF! Pilih Skuad Lain yang Berhasil Menjawab (+{Math.round(activeEvidence.points * 0.75)} Poin):
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {teams.map((t, idx) => {
                    if (idx === currentTurn) return null;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        className={styles.btnCommand}
                        style={{
                          background: t.bgLight,
                          borderColor: t.borderColor,
                          color: '#ffffff'
                        }}
                        onClick={() => handleMarkSolved(idx, true)}
                      >
                        <i className={`fas ${t.avatarIcon}`} style={{ color: t.color }}></i>
                        <span>Berikan ke {t.name}</span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    className={styles.btnCommand}
                    onClick={() => {
                      setActiveEvidence(null);
                      advanceTurn();
                    }}
                  >
                    <span>Lewati &amp; Ganti Giliran</span>
                  </button>
                </div>
              </div>
            )}

            {/* MODAL FOOTER EVALUATION BUTTONS */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
                paddingTop: 12,
                borderTop: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={styles.btnCommand}
                  onClick={() => setShowUvClue(!showUvClue)}
                >
                  <i className="fas fa-lightbulb" style={{ color: '#c084fc' }}></i>
                  <span>{showUvClue ? 'Sembunyikan Petunjuk' : 'Buka Petunjuk (Clue)'}</span>
                </button>

                <button
                  type="button"
                  className={styles.btnCommand}
                  style={{ borderColor: '#38bdf8', color: '#7dd3fc' }}
                  onClick={() => {
                    setShowSolution(!showSolution);
                    setTimerRunning(false);
                  }}
                >
                  <i className="fas fa-eye"></i>
                  <span>{showSolution ? 'Sembunyikan Kunci' : 'Tampilkan Kunci Forensik'}</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={styles.btnCommand}
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    borderColor: '#ef4444',
                    color: '#fca5a5',
                    padding: '12px 20px',
                    fontSize: '0.98rem'
                  }}
                  onClick={handleMarkWrong}
                >
                  <i className="fas fa-times-circle"></i>
                  <span>Belum Tepat / Lempar Rebutan</span>
                </button>

                <button
                  type="button"
                  className={styles.btnCommand}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderColor: '#34d399',
                    color: '#ffffff',
                    padding: '12px 24px',
                    fontSize: '1.02rem',
                    fontWeight: 900,
                    boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)'
                  }}
                  onClick={() => handleMarkSolved(currentTurn, false)}
                >
                  <i className="fas fa-check-circle"></i>
                  <span>pecahkan Bukti! (+{doublePointsActive ? activeEvidence.points * 2 : activeEvidence.points} Poin)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== EDIT SQUAD & SESSION MODAL ==================== */}
      {showSquadModal && (
        <div className={styles.forensicModalOverlay}>
          <div className={styles.forensicModalCard} style={{ maxWidth: 680 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#fef3c7' }}>
                <i className="fas fa-users-cog" style={{ color: '#f59e0b', marginRight: 10 }}></i>
                PENGATURAN SKUAD DETEKTIF &amp; IDENTITAS KELAS
              </h2>
              <button className={styles.btnCommand} onClick={() => setShowSquadModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 18 }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#a8a29e', display: 'block', marginBottom: 4 }}>
                  Judul Operasi / Sesi
                </label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={e => setSessionName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: 'white' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#a8a29e', display: 'block', marginBottom: 4 }}>
                  Kelas
                </label>
                <input
                  type="text"
                  value={kelas}
                  onChange={e => setKelas(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: 'white' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#a8a29e', display: 'block', marginBottom: 4 }}>
                  Mata Pelajaran
                </label>
                <input
                  type="text"
                  value={mapel}
                  onChange={e => setMapel(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: 'white' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {teams.map((t, idx) => (
                <div
                  key={t.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: `1px solid ${t.borderColor}`,
                    borderRadius: 12,
                    padding: 12,
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1.4fr 0.8fr auto',
                    gap: 10,
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <label style={{ fontSize: '0.72rem', color: t.borderColor, fontWeight: 800 }}>
                      Nama Skuad #{idx + 1}
                    </label>
                    <input
                      type="text"
                      value={t.name}
                      onChange={e => {
                        const val = e.target.value;
                        setTeams(prev => prev.map((item, i) => (i === idx ? { ...item, name: val } : item)));
                      }}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 8, background: '#1e293b', border: '1px solid #475569', color: 'white' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Anggota Kelompok</label>
                    <input
                      type="text"
                      value={t.members}
                      onChange={e => {
                        const val = e.target.value;
                        setTeams(prev => prev.map((item, i) => (i === idx ? { ...item, members: val } : item)));
                      }}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 8, background: '#1e293b', border: '1px solid #475569', color: 'white' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#fbbf24' }}>Skor Poin</label>
                    <input
                      type="number"
                      value={t.score}
                      onChange={e => {
                        const val = Number(e.target.value) || 0;
                        setTeams(prev => prev.map((item, i) => (i === idx ? { ...item, score: val } : item)));
                      }}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 8, background: '#1e293b', border: '1px solid #475569', color: '#fbbf24', fontWeight: 800 }}
                    />
                  </div>
                  <button
                    type="button"
                    className={styles.btnCommand}
                    style={{ marginTop: 14, padding: '7px 10px', fontSize: '0.75rem' }}
                    title="Isi Ulang 3 Alat Forensik"
                    onClick={() => {
                      setTeams(prev =>
                        prev.map((item, i) => (i === idx ? { ...item, gadgets: [...INITIAL_GADGETS] } : item))
                      );
                    }}
                  >
                    <i className="fas fa-sync-alt" style={{ color: '#38bdf8' }}></i> Alat
                  </button>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'right' }}>
              <button
                className={`${styles.btnCommand} ${styles.btnSaveGold}`}
                onClick={() => setShowSquadModal(false)}
              >
                <i className="fas fa-check"></i> Selesai &amp; Terapkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ADD CUSTOM TEACHER EVIDENCE MODAL ==================== */}
      {showAddEvidenceModal && (
        <div className={styles.forensicModalOverlay}>
          <div className={styles.forensicModalCard} style={{ maxWidth: 680 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#fef3c7' }}>
                <i className="fas fa-file-medical" style={{ color: '#10b981', marginRight: 10 }}></i>
                TAMBAH BERKAS BUKTI INVESTIGASI GURU
              </h2>
              <button className={styles.btnCommand} onClick={() => setShowAddEvidenceModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleAddCustomEvidence} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#a8a29e' }}>Judul Berkas Bukti *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Misteri Prasasti Ciaruteun"
                    value={newEvTitle}
                    onChange={e => setNewEvTitle(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: 'white', marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#a8a29e' }}>Tipe Investigasi</label>
                  <select
                    value={newEvType}
                    onChange={e => setNewEvType(e.target.value as EvidenceType)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: 'white', marginTop: 4 }}
                  >
                    <option value="dokumen">Analisis Dokumen</option>
                    <option value="sandi">Dekoder Sandi</option>
                    <option value="deduksi">Deduksi Bertahap</option>
                    <option value="forensik">Uji Forensik Fakta</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#a8a29e' }}>Poin Hadiah</label>
                  <input
                    type="number"
                    value={newEvPoints}
                    onChange={e => setNewEvPoints(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#fbbf24', fontWeight: 800, marginTop: 4 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#a8a29e' }}>
                  {newEvType === 'deduksi'
                    ? 'Isi 3 Petunjuk Bertahap (Pisahkan dengan baris baru / Enter)'
                    : 'Kutipan Teks Dokumen / Pengantar Kasus *'}
                </label>
                <textarea
                  rows={3}
                  placeholder={
                    newEvType === 'deduksi'
                      ? 'Bukti #1: ...\nBukti #2: ...\nBukti #3: ...'
                      : 'Tuliskan teks wacana, kutipan sejarah, atau klaim yang akan dianalisis siswa...'
                  }
                  value={newEvDocText}
                  onChange={e => setNewEvDocText(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: 'white', marginTop: 4 }}
                />
              </div>

              {newEvType === 'sandi' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#38bdf8' }}>Teks Sandi (Ditampilkan di Konsol)</label>
                    <input
                      type="text"
                      placeholder="Contoh: 20 - 1 - 18 - 21 - 13 - 1"
                      value={newEvCipherText}
                      onChange={e => setNewEvCipherText(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #38bdf8', color: 'white', marginTop: 4 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#38bdf8' }}>Kata Kunci Pembuka Gembok</label>
                    <input
                      type="text"
                      placeholder="Contoh: TARUMA"
                      value={newEvCipherCode}
                      onChange={e => setNewEvCipherCode(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #38bdf8', color: 'white', marginTop: 4 }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.78rem', color: '#a8a29e' }}>Pertanyaan Investigasi Utama *</label>
                <input
                  type="text"
                  required
                  placeholder="Tuliskan pertanyaan yang harus dijawab oleh Skuad Detektif..."
                  value={newEvQuestion}
                  onChange={e => setNewEvQuestion(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: 'white', marginTop: 4 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#a8a29e' }}>Petunjuk Bantuan (Clue Senter UV)</label>
                  <input
                    type="text"
                    placeholder="Petunjuk singkat jika tim kesulitan..."
                    value={newEvClue}
                    onChange={e => setNewEvClue(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: 'white', marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#34d399' }}>Kunci Jawaban Singkat *</label>
                  <input
                    type="text"
                    required
                    placeholder="Jawaban yang benar..."
                    value={newEvAnswer}
                    onChange={e => setNewEvAnswer(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #10b981', color: 'white', marginTop: 4 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className={styles.btnCommand} onClick={() => setShowAddEvidenceModal(false)}>
                  Batal
                </button>
                <button type="submit" className={`${styles.btnCommand} ${styles.btnSaveGold}`}>
                  <i className="fas fa-plus-circle"></i> Pasang di Papan Bukti
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== LOAD SAVED SESSIONS MODAL ==================== */}
      {showLoadModal && (
        <div className={styles.forensicModalOverlay}>
          <div className={styles.forensicModalCard} style={{ maxWidth: 620 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#fef3c7' }}>
                <i className="fas fa-folder-open" style={{ color: '#38bdf8', marginRight: 10 }}></i>
                MUAT SESI INVESTIGASI TERSIMPAN
              </h2>
              <button className={styles.btnCommand} onClick={() => setShowLoadModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {savedSlots.length > 0 ? (
                savedSlots.map(slot => (
                  <div
                    key={slot.id}
                    style={{
                      background: '#0f172a',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      borderRadius: 12,
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 10
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, color: '#ffffff' }}>{slot.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 3 }}>
                        Disimpan: {slot.date} • {slot.session.solvedEvidenceIds?.length || 0} Bukti Terpecahkan
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className={`${styles.btnCommand} ${styles.btnSaveGold}`}
                        onClick={() => {
                          applySession(slot.session);
                          setShowLoadModal(false);
                          sounds.playCorrect();
                        }}
                      >
                        <i className="fas fa-play"></i> Buka
                      </button>
                      <button
                        className={styles.btnCommand}
                        onClick={() => {
                          const filtered = savedSlots.filter(s => s.id !== slot.id);
                          setSavedSlots(filtered);
                          localStorage.setItem('gameszone_detektif_save_slots', JSON.stringify(filtered));
                        }}
                      >
                        <i className="fas fa-trash" style={{ color: '#ef4444' }}></i>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>
                  Belum ada sesi investigasi yang disimpan.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== CASE CLOSED / VICTORY PODIUM MODAL ==================== */}
      {showVictoryModal && (
        <div className={styles.forensicModalOverlay}>
          <div className={styles.forensicModalCard} style={{ maxWidth: 680, textAlign: 'center' }}>
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
                border: '3px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 40,
                color: '#0c0a09',
                margin: '0 auto 14px auto',
                boxShadow: '0 0 35px rgba(245, 158, 11, 0.6)'
              }}
            >
              <i className="fas fa-award"></i>
            </div>

            <div
              style={{
                display: 'inline-block',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid #10b981',
                color: '#34d399',
                fontSize: '0.78rem',
                fontWeight: 900,
                padding: '4px 14px',
                borderRadius: 20,
                letterSpacing: '1px',
                marginBottom: 8
              }}
            >
              BRANKAS ARSIP BERHASIL DIBUKA • CASE CLOSED!
            </div>

            <h2 style={{ margin: '0 0 6px 0', fontSize: '1.8rem', fontWeight: 900, color: '#fef3c7' }}>
              LAPORAN KEHORMATAN DETEKTIF MADRASAH
            </h2>
            <p style={{ color: '#a8a29e', fontSize: '0.92rem', marginBottom: 22 }}>
              {sessionName} • {kelas} ({solvedInCaseCount}/{totalInCaseCount} Berkas Bukti Terpecahkan)
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24, textAlign: 'left' }}>
              {sortedLeaderboard.map((sq, rankIdx) => (
                <div
                  key={sq.id}
                  style={{
                    background: rankIdx === 0 ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.22) 0%, rgba(28, 25, 23, 0.95) 100%)' : 'rgba(15, 23, 42, 0.85)',
                    border: `2px solid ${rankIdx === 0 ? '#fbbf24' : sq.borderColor}`,
                    borderRadius: 16,
                    padding: '14px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        background: rankIdx === 0 ? '#fbbf24' : '#1e293b',
                        color: rankIdx === 0 ? '#0c0a09' : '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '1.2rem'
                      }}
                    >
                      #{rankIdx + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#ffffff' }}>
                        {sq.name} {rankIdx === 0 && '👑'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: sq.borderColor, fontWeight: 700 }}>
                        {getDetectiveRank(sq.score)} • {sq.solvedCount} Bukti Terpecahkan
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fbbf24' }}>
                    {sq.score} <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>POIN</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button className={styles.btnCommand} onClick={() => setShowVictoryModal(false)}>
                Kembali ke Papan Bukti
              </button>
              <button className={`${styles.btnCommand} ${styles.btnSaveGold}`} onClick={handleSaveProgress}>
                <i className="fas fa-save"></i> Simpan Rekap Sesi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
