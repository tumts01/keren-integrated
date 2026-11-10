'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from './jeopardy.module.css';
import {
  JeopardyTeam,
  JeopardyItem,
  JeopardyCategory,
  JeopardyPack,
  JeopardyLog,
  JeopardySession,
  JeopardySaveSlot,
  INITIAL_JEOPARDY_TEAMS,
  JEOPARDY_PACKS
} from './jeopardyData';
import { sounds } from '../sound';
import Swal from 'sweetalert2';

export default function ArenaCepatTangkasPage() {
  // Core Game State
  const [sessionName, setSessionName] = useState('Turnamen Cepat Tangkas MTs - Kelas 7/8/9');
  const [kelas, setKelas] = useState('Kelas 7 - 9');
  const [mapel, setMapel] = useState('Lintas Mapel Ceria');
  const [selectedPackId, setSelectedPackId] = useState<string>('pack-umum');
  const [currentTurn, setCurrentTurn] = useState<number>(0);
  const [round, setRound] = useState<number>(1);
  const [teams, setTeams] = useState<JeopardyTeam[]>(INITIAL_JEOPARDY_TEAMS);
  const [answeredCellIds, setAnsweredCellIds] = useState<string[]>([]);
  const [dailyDoubleIds, setDailyDoubleIds] = useState<string[]>(['u-sains-300', 'u-nus-400', 'u-mat-300']);
  const [customOverrides, setCustomOverrides] = useState<Record<string, Partial<JeopardyItem>>>({});
  const [logs, setLogs] = useState<JeopardyLog[]>([
    {
      id: 'init-jlog',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      teamName: 'Studio Cepat Tangkas',
      teamColor: '#fde047',
      text: 'Papan Matriks Kuis 100–500 Poin telah menyala! Keempat Regu siap beradu cepat dan tepat.',
      type: 'system'
    }
  ]);

  // Projector & UI Controls
  const [isTheater, setIsTheater] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<'normal' | 'large' | 'xl'>('normal');

  // Active Question Modal State
  const [activeCategory, setActiveCategory] = useState<JeopardyCategory | null>(null);
  const [activeItem, setActiveItem] = useState<JeopardyItem | null>(null);
  const [answeringTeamIdx, setAnsweringTeamIdx] = useState<number>(0);
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [stealPhase, setStealPhase] = useState<boolean>(false);

  // Timer State
  const [timerSeconds, setTimerSeconds] = useState<number>(45);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Modals State
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showEditCellModal, setShowEditCellModal] = useState(false);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [savedSlots, setSavedSlots] = useState<JeopardySaveSlot[]>([]);

  // Custom Edit Question State
  const [editTargetId, setEditTargetId] = useState<string>('');
  const [editQuestionText, setEditQuestionText] = useState<string>('');
  const [editHintText, setEditHintText] = useState<string>('');
  const [editAnswerText, setEditAnswerText] = useState<string>('');

  // Load saved session & slots on mount
  useEffect(() => {
    setIsMuted(sounds.isMuted());
    loadSavedSlots();
    try {
      const overridesStr = localStorage.getItem('gameszone_jeopardy_overrides');
      if (overridesStr) {
        setCustomOverrides(JSON.parse(overridesStr));
      }
      const activeStr = localStorage.getItem('gameszone_jeopardy_active_session');
      if (activeStr) {
        const parsed: JeopardySession = JSON.parse(activeStr);
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
      const session: JeopardySession = {
        id: 'jeopardy_active',
        name: sessionName,
        kelas,
        mapel,
        savedAt: new Date().toISOString(),
        selectedPackId,
        currentTurn,
        round,
        teams,
        answeredCellIds,
        dailyDoubleIds,
        logs
      };
      try {
        localStorage.setItem('gameszone_jeopardy_active_session', JSON.stringify(session));
      } catch (e) {}
    }
  }, [sessionName, kelas, mapel, selectedPackId, currentTurn, round, teams, answeredCellIds, dailyDoubleIds, logs]);

  // Keyboard Buzzer Shortcut (Keys 1, 2, 3, 4 when Question Modal is open)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeItem) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = Number(e.key) - 1;
        sounds.playChest();
        setAnsweringTeamIdx(idx);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeItem]);

  // Countdown Timer
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

  const loadSavedSlots = () => {
    try {
      const str = localStorage.getItem('gameszone_jeopardy_save_slots');
      if (str) {
        setSavedSlots(JSON.parse(str));
      }
    } catch (e) {}
  };

  const applySession = (s: JeopardySession) => {
    setSessionName(s.name || 'Turnamen Cepat Tangkas MTs');
    setKelas(s.kelas || 'Kelas 7 - 9');
    setMapel(s.mapel || 'Lintas Mapel Ceria');
    setSelectedPackId(s.selectedPackId || 'pack-umum');
    setCurrentTurn(s.currentTurn || 0);
    setRound(s.round || 1);
    setTeams(s.teams);
    setAnsweredCellIds(s.answeredCellIds || []);
    if (s.dailyDoubleIds && s.dailyDoubleIds.length > 0) {
      setDailyDoubleIds(s.dailyDoubleIds);
    }
    setLogs(s.logs || []);
  };

  const addLog = (teamName: string, teamColor: string, text: string, type: JeopardyLog['type'] = 'system') => {
    const entry: JeopardyLog = {
      id: 'jlog-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      teamName,
      teamColor,
      text,
      type
    };
    setLogs(prev => [entry, ...prev.slice(0, 39)]);
  };

  // Current Pack & Categories
  const currentPack: JeopardyPack =
    JEOPARDY_PACKS.find(p => p.id === selectedPackId) || JEOPARDY_PACKS[0];

  const allPackItemIds = currentPack.categories.flatMap(c => c.items.map(i => i.id));
  const answeredInPackCount = allPackItemIds.filter(id => answeredCellIds.includes(id)).length;
  const totalInPackCount = allPackItemIds.length;

  const activeTeam = teams[currentTurn] || teams[0];
  const buzzerTeam = teams[answeringTeamIdx] || activeTeam;

  // Randomize 3 Daily Double cells when switching packs
  const randomizeDailyDoubles = (pack: JeopardyPack) => {
    const eligibleIds = pack.categories.flatMap(c =>
      c.items.filter(i => i.points >= 200).map(i => i.id)
    );
    const shuffled = [...eligibleIds].sort(() => Math.random() - 0.5);
    setDailyDoubleIds(shuffled.slice(0, 3));
  };

  const handleSelectPack = (packId: string) => {
    setSelectedPackId(packId);
    const found = JEOPARDY_PACKS.find(p => p.id === packId);
    if (found) {
      randomizeDailyDoubles(found);
    }
  };

  // Open a Matrix Point Cell
  const handleOpenCell = (cat: JeopardyCategory, rawItem: JeopardyItem) => {
    const override = customOverrides[rawItem.id] || {};
    const mergedItem: JeopardyItem = {
      ...rawItem,
      ...override,
      isDailyDouble: dailyDoubleIds.includes(rawItem.id)
    };

    if (mergedItem.isDailyDouble) {
      sounds.playVictory();
    } else {
      sounds.playChest();
    }

    setActiveCategory(cat);
    setActiveItem(mergedItem);
    setAnsweringTeamIdx(currentTurn);
    setShowOptions(false);
    setSelectedOption(null);
    setShowHint(false);
    setShowAnswer(false);
    setStealPhase(false);
    setTimerSeconds(45);
    setTimerRunning(true);
  };

  // Pick a random unanswered box ("Acak Kotak Keberuntungan")
  const handlePickRandomCell = () => {
    const unanswered: { cat: JeopardyCategory; item: JeopardyItem }[] = [];
    currentPack.categories.forEach(cat => {
      cat.items.forEach(item => {
        if (!answeredCellIds.includes(item.id)) {
          unanswered.push({ cat, item });
        }
      });
    });

    if (unanswered.length === 0) {
      Swal.fire({
        title: '🎉 Semua Kotak di Paket Ini Sudah Terjawab!',
        text: 'Silakan buka Podium Juara atau pilih Paket Soal lainnya.',
        icon: 'success',
        confirmButtonColor: '#6366f1'
      });
      return;
    }

    sounds.playDiceRoll();
    const chosen = unanswered[Math.floor(Math.random() * unanswered.length)];
    handleOpenCell(chosen.cat, chosen.item);
  };

  // Use Team Lifeline
  const handleUseLifeline = (teamIdx: number, kind: 'fiftyFiftyHint' | 'extraTime' | 'shieldNoPenalty') => {
    const target = teams[teamIdx];
    if (!activeItem) {
      Swal.fire({
        title: '💡 Gunakan Saat Kotak Soal Terbuka',
        text: 'Pilih salah satu kotak nilai poin (100–500) terlebih dahulu untuk mengaktifkan bantuan ini!',
        icon: 'info',
        confirmButtonColor: '#6366f1'
      });
      return;
    }

    sounds.playChest();
    if (kind === 'fiftyFiftyHint') {
      setShowOptions(true);
      setShowHint(true);
    } else if (kind === 'extraTime') {
      setTimerSeconds(prev => prev + 30);
      if (!timerRunning) setTimerRunning(true);
    }

    setTeams(prev =>
      prev.map((t, i) =>
        i === teamIdx
          ? { ...t, lifelines: { ...t.lifelines, [kind]: false } }
          : t
      )
    );

    const labelMap = {
      fiftyFiftyHint: 'Bantuan Pilihan & Clue',
      extraTime: 'Tambah Waktu +30 Detik',
      shieldNoPenalty: 'Perisai Poin Aman'
    };

    addLog(target.name, target.color, `Menggunakan kartu bantuan [${labelMap[kind]}]!`, 'bonus');
  };

  // Advance Turn
  const advanceTurn = () => {
    const next = (currentTurn + 1) % 4;
    if (next === 0) setRound(r => r + 1);
    setCurrentTurn(next);
  };

  // Mark Answer Correct
  const handleMarkCorrect = (winnerIdx: number) => {
    if (!activeItem || !activeCategory) return;
    sounds.playCorrect();
    setTimerRunning(false);

    const isDaily = activeItem.isDailyDouble;
    const earned = isDaily ? activeItem.points * 2 : activeItem.points;
    const winner = teams[winnerIdx];

    setTeams(prev =>
      prev.map((t, i) =>
        i === winnerIdx
          ? {
              ...t,
              score: t.score + earned,
              correctCount: t.correctCount + 1
            }
          : t
      )
    );

    const updatedAnswered = answeredCellIds.includes(activeItem.id)
      ? answeredCellIds
      : [...answeredCellIds, activeItem.id];
    setAnsweredCellIds(updatedAnswered);

    addLog(
      winner.name,
      winner.color,
      `${stealPhase ? '[REBUTAN CEPAT] ' : ''}${isDaily ? '[🌟 BINTANG GANDA 2x] ' : ''}Menjawab benar kategori ${activeCategory.title} (${activeItem.points}) -> +${earned} Poin!`,
      stealPhase ? 'steal' : 'correct'
    );

    const closedId = activeItem.id;
    setActiveItem(null);
    setActiveCategory(null);

    // Check if board is complete
    const remaining = allPackItemIds.filter(id => id !== closedId && !updatedAnswered.includes(id));
    if (remaining.length === 0) {
      setTimeout(() => {
        sounds.playVictory();
        setShowVictoryModal(true);
      }, 350);
    } else {
      // In Jeopardy, the team that answers correctly gets to pick next, or rotate turn
      setCurrentTurn((winnerIdx + 1) % 4);
    }
  };

  // Mark Answer Wrong -> Trigger Buzzer Steal Phase
  const handleMarkWrong = () => {
    if (!activeItem || !activeCategory) return;
    sounds.playWrong();
    setTimerRunning(false);

    const currentResponder = teams[answeringTeamIdx];
    setTeams(prev =>
      prev.map((t, i) =>
        i === answeringTeamIdx ? { ...t, wrongCount: t.wrongCount + 1 } : t
      )
    );

    addLog(
      currentResponder.name,
      currentResponder.color,
      `Belum tepat pada kategori ${activeCategory.title} (${activeItem.points} Poin). Bel Rebutan dibuka untuk regu lain!`,
      'wrong'
    );

    setStealPhase(true);
  };

  // Open Edit Modal for Current Active Question
  const handleOpenEditCurrentQuestion = () => {
    if (!activeItem) return;
    setEditTargetId(activeItem.id);
    setEditQuestionText(activeItem.question);
    setEditHintText(activeItem.hint);
    setEditAnswerText(activeItem.answer);
    setShowEditCellModal(true);
  };

  const handleSaveEditedQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTargetId || !editQuestionText.trim() || !editAnswerText.trim()) return;

    const updated = {
      ...customOverrides,
      [editTargetId]: {
        question: editQuestionText.trim(),
        hint: editHintText.trim(),
        answer: editAnswerText.trim()
      }
    };
    setCustomOverrides(updated);
    localStorage.setItem('gameszone_jeopardy_overrides', JSON.stringify(updated));

    if (activeItem && activeItem.id === editTargetId) {
      setActiveItem({
        ...activeItem,
        question: editQuestionText.trim(),
        hint: editHintText.trim(),
        answer: editAnswerText.trim()
      });
    }

    setShowEditCellModal(false);
    sounds.playCorrect();
  };

  // Save Session
  const handleSaveProgress = async () => {
    const { value: title } = await Swal.fire({
      title: '💾 Simpan Sesi Arena Cepat Tangkas',
      input: 'text',
      inputLabel: 'Nama Sesi Kelas (contoh: Kelas 7A - Bab Semester 1)',
      inputValue: `${sessionName} (${kelas})`,
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#6366f1'
    });

    if (!title) return;

    const slot: JeopardySaveSlot = {
      id: 'jeop-slot-' + Date.now(),
      name: title,
      date: new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      session: {
        id: 'jeop-' + Date.now(),
        name: title,
        kelas,
        mapel,
        savedAt: new Date().toISOString(),
        selectedPackId,
        currentTurn,
        round,
        teams,
        answeredCellIds,
        dailyDoubleIds,
        logs
      }
    };

    const updated = [slot, ...savedSlots.slice(0, 14)];
    setSavedSlots(updated);
    localStorage.setItem('gameszone_jeopardy_save_slots', JSON.stringify(updated));
    sounds.playCorrect();

    Swal.fire({
      title: 'Sesi Tersimpan!',
      text: 'Progres turnamen Cepat Tangkas berhasil disimpan.',
      icon: 'success',
      timer: 1600,
      showConfirmButton: false
    });
  };

  // Reset Board
  const handleResetGame = async () => {
    const res = await Swal.fire({
      title: 'Reset Papan & Skor Turnamen?',
      text: 'Seluruh kotak poin 100–500 akan dibuka kembali dan skor regu kembali ke 0.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Reset Baru',
      cancelButtonText: 'Batal'
    });

    if (res.isConfirmed) {
      setTeams(
        INITIAL_JEOPARDY_TEAMS.map(t => ({
          ...t,
          score: 0,
          correctCount: 0,
          wrongCount: 0,
          lifelines: { fiftyFiftyHint: true, extraTime: true, shieldNoPenalty: true }
        }))
      );
      setAnsweredCellIds([]);
      setCurrentTurn(0);
      setRound(1);
      randomizeDailyDoubles(currentPack);
      localStorage.removeItem('gameszone_jeopardy_active_session');
      sounds.playChest();
    }
  };

  const sortedTeams = [...teams].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.correctCount - a.correctCount;
  });

  const fontScale = zoomLevel === 'xl' ? 1.18 : zoomLevel === 'large' ? 1.08 : 1;

  return (
    <div
      className={isTheater ? styles.theaterOverlay : styles.jeopardyContainer}
      style={{ fontSize: `${fontScale}rem` }}
    >
      {/* TOP STUDIO BAR */}
      <div className={styles.studioBar}>
        <div className={styles.studioBrand}>
          <Link href="/games-zone" className={styles.btnStudio}>
            <i className="fas fa-arrow-left" style={{ color: '#fde047' }}></i>
            <span>Lobby</span>
          </Link>

          <div className={styles.studioLogo}>
            <i className="fas fa-th-large"></i>
          </div>

          <div>
            <h1 className={styles.studioTitle}>ARENA CEPAT TANGKAS (JEOPARDY MTs)</h1>
            <div className={styles.studioSubtitle}>
              <span>
                <i className="fas fa-tv" style={{ color: '#38bdf8', marginRight: 5 }}></i>
                {sessionName}
              </span>
              <span>•</span>
              <span style={{ color: '#fde047', fontWeight: 700 }}>{kelas}</span>
              <span>•</span>
              <span style={{ color: '#34d399', fontWeight: 700 }}>
                Terjawab: {answeredInPackCount}/{totalInPackCount} Kotak
              </span>
            </div>
          </div>
        </div>

        <div className={styles.studioControls}>
          <button
            className={styles.btnStudio}
            onClick={() =>
              setZoomLevel(prev => (prev === 'normal' ? 'large' : prev === 'large' ? 'xl' : 'normal'))
            }
            title="Perbesar Teks Proyektor"
          >
            <i className="fas fa-text-height" style={{ color: '#38bdf8' }}></i>
            <span>{zoomLevel === 'normal' ? '100%' : zoomLevel === 'large' ? '110%' : '125%'}</span>
          </button>

          <button className={styles.btnStudio} onClick={() => setIsMuted(sounds.toggleMute())}>
            <i
              className={`fas ${isMuted ? 'fa-volume-mute' : 'fa-volume-up'}`}
              style={{ color: isMuted ? '#ef4444' : '#10b981' }}
            ></i>
          </button>

          <button className={styles.btnStudio} onClick={() => setShowTeamModal(true)}>
            <i className="fas fa-users-cog" style={{ color: '#fde047' }}></i>
            <span>Atur Regu</span>
          </button>

          <button
            className={styles.btnStudio}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderColor: '#6ee7b7',
              color: 'white'
            }}
            onClick={handleSaveProgress}
          >
            <i className="fas fa-save"></i>
            <span>Simpan Sesi</span>
          </button>

          <button className={styles.btnStudio} onClick={() => setShowLoadModal(true)}>
            <i className="fas fa-folder-open" style={{ color: '#38bdf8' }}></i>
            <span>Muat ({savedSlots.length})</span>
          </button>

          <button
            className={styles.btnStudio}
            onClick={() => {
              sounds.playVictory();
              setShowVictoryModal(true);
            }}
          >
            <i className="fas fa-trophy" style={{ color: '#fde047' }}></i>
            <span>Podium</span>
          </button>

          <button className={styles.btnStudio} onClick={handleResetGame} title="Reset Papan">
            <i className="fas fa-redo" style={{ color: '#f87171' }}></i>
          </button>

          <button
            className={styles.btnStudio}
            style={{
              background: isTheater
                ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
                : 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
              borderColor: '#a5b4fc',
              color: 'white'
            }}
            onClick={() => setIsTheater(!isTheater)}
          >
            <i className={`fas ${isTheater ? 'fa-compress' : 'fa-expand'}`}></i>
            <span>{isTheater ? 'Keluar Proyektor' : 'Layar Proyektor'}</span>
          </button>
        </div>
      </div>

      {/* QUESTION PACK SELECTOR BAR (3 PACKS FOR KELAS 7-9) */}
      <div className={styles.packTabsRow}>
        {JEOPARDY_PACKS.map(pack => {
          const isSelected = selectedPackId === pack.id;
          const packIds = pack.categories.flatMap(c => c.items.map(i => i.id));
          const packDone = packIds.filter(id => answeredCellIds.includes(id)).length;
          return (
            <button
              key={pack.id}
              className={`${styles.packTab} ${isSelected ? styles.packTabActive : ''}`}
              onClick={() => handleSelectPack(pack.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    color: isSelected ? '#fde047' : '#38bdf8',
                    letterSpacing: '0.6px'
                  }}
                >
                  {pack.badge}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 800 }}>
                  {packDone}/{packIds.length} Terbuka
                </span>
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#ffffff' }}>{pack.name}</div>
              <div style={{ fontSize: '0.76rem', color: '#cbd5e1', marginTop: 2 }}>{pack.subtitle}</div>
            </button>
          );
        })}
      </div>

      {/* ACTIVE TURN & RANDOM PICKER STAGE BANNER */}
      <div
        className={styles.stageBanner}
        style={{
          background: activeTeam.bgLight,
          borderColor: activeTeam.borderColor
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              background: activeTeam.color,
              color: '#090d16',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 900,
              boxShadow: `0 0 20px ${activeTeam.color}`
            }}
          >
            <i className={`fas ${activeTeam.avatarIcon}`}></i>
          </div>

          <div>
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: '#fde047'
              }}
            >
              🎯 GILIRAN MEMILIH KOTAK KATEGORI &amp; POIN:
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ margin: '2px 0 0 0', fontSize: '1.6rem', fontWeight: 900, color: '#ffffff' }}>
                {activeTeam.name}
              </h2>
              <span
                style={{
                  background: 'rgba(0,0,0,0.45)',
                  border: `1px solid ${activeTeam.borderColor}`,
                  color: activeTeam.borderColor,
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: '0.78rem',
                  fontWeight: 800
                }}
              >
                Tombol Bel Cepat: [{activeTeam.keyShortcut}] • {activeTeam.motto}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            className={styles.btnStudio}
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              borderColor: '#fde047',
              color: '#090d16',
              padding: '13px 22px',
              fontSize: '1rem',
              fontWeight: 900,
              boxShadow: '0 0 25px rgba(245, 158, 11, 0.4)'
            }}
            onClick={handlePickRandomCell}
          >
            <i className="fas fa-random"></i>
            <span>ACAK KOTAK KEBERUNTUNGAN</span>
          </button>

          <button className={styles.btnStudio} onClick={advanceTurn} style={{ padding: '13px 16px' }}>
            <i className="fas fa-step-forward" style={{ color: '#fde047' }}></i>
            <span>Ganti Regu</span>
          </button>
        </div>
      </div>

      {/* 4 TEAMS SCOREBOARD */}
      <div className={styles.teamsGrid}>
        {teams.map((t, idx) => {
          const isTurn = currentTurn === idx;
          return (
            <div
              key={t.id}
              onClick={() => setCurrentTurn(idx)}
              className={`${styles.teamBox} ${isTurn ? styles.teamBoxActive : ''}`}
              style={{
                borderColor: isTurn ? t.borderColor : 'rgba(255,255,255,0.1)',
                background: isTurn
                  ? `linear-gradient(145deg, ${t.bgLight} 0%, rgba(15, 23, 42, 0.95) 100%)`
                  : 'rgba(15, 23, 42, 0.88)',
                cursor: 'pointer'
              }}
            >
              {isTurn && (
                <div
                  style={{
                    position: 'absolute',
                    top: -11,
                    right: 14,
                    background: t.color,
                    color: '#090d16',
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    padding: '2px 10px',
                    borderRadius: 12,
                    letterSpacing: '0.5px'
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
                      background: t.color,
                      color: '#090d16',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      fontWeight: 900
                    }}
                  >
                    <i className={`fas ${t.avatarIcon}`}></i>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 900, color: '#ffffff' }}>
                      {t.name}
                    </h3>
                    <div style={{ fontSize: '0.74rem', color: t.borderColor, fontWeight: 700 }}>
                      Bel [Tombol {t.keyShortcut}] • {t.members}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(250, 204, 21, 0.15)',
                    border: '1.5px solid #fde047',
                    color: '#fde047',
                    padding: '5px 12px',
                    borderRadius: 16,
                    fontWeight: 900,
                    fontSize: '1.1rem'
                  }}
                >
                  {t.score}
                </div>
              </div>

              {/* Lifelines Row */}
              <div
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  paddingTop: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 6,
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className={styles.lifelineBtn}
                    disabled={!t.lifelines.fiftyFiftyHint}
                    title="Buka Pilihan Ganda A-B-C-D & Petunjuk"
                    onClick={e => {
                      e.stopPropagation();
                      handleUseLifeline(idx, 'fiftyFiftyHint');
                    }}
                  >
                    <i className="fas fa-list-ul" style={{ color: '#38bdf8' }}></i>
                    <span>Opsi A-D</span>
                  </button>

                  <button
                    type="button"
                    className={styles.lifelineBtn}
                    disabled={!t.lifelines.extraTime}
                    title="Tambah Waktu +30 Detik"
                    onClick={e => {
                      e.stopPropagation();
                      handleUseLifeline(idx, 'extraTime');
                    }}
                  >
                    <i className="fas fa-clock" style={{ color: '#fde047' }}></i>
                    <span>+30d</span>
                  </button>
                </div>

                <span style={{ fontSize: '0.76rem', color: '#34d399', fontWeight: 800 }}>
                  ✓ {t.correctCount} Benar
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ==================== 5x5 JEOPARDY MATRIX BOARD ==================== */}
      <div className={styles.matrixStage}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: '1px solid rgba(255,255,255,0.12)',
            flexWrap: 'wrap',
            gap: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)',
                color: 'white',
                fontSize: '0.76rem',
                fontWeight: 900,
                padding: '4px 12px',
                borderRadius: 20
              }}
            >
              <i className="fas fa-star" style={{ marginRight: 5 }}></i>
              TERDAPAT 3 KOTAK BINTANG GANDA (2X POIN) TERSEMBUNYI!
            </span>
          </div>

          <span style={{ fontSize: '0.84rem', color: '#cbd5e1' }}>
            Klik angka poin (<b>100 s.d. 500</b>) di bawah kategori yang diinginkan:
          </span>
        </div>

        <div className={styles.matrixGrid}>
          {currentPack.categories.map(cat => (
            <div key={cat.id} className={styles.categoryColumn}>
              {/* Category Header */}
              <div className={styles.categoryHeader} style={{ background: cat.bgHeader }}>
                <i className={`fas ${cat.icon}`} style={{ fontSize: '1.35rem', marginBottom: 6 }}></i>
                <span>{cat.title}</span>
              </div>

              {/* 5 Point Cells (100 - 500) */}
              {cat.items.map(item => {
                const isAnswered = answeredCellIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleOpenCell(cat, item)}
                    className={`${styles.pointCell} ${isAnswered ? styles.pointCellAnswered : ''}`}
                  >
                    {isAnswered ? (
                      <>
                        <i className="fas fa-check-circle" style={{ fontSize: '1.5rem', color: '#10b981', marginBottom: 4 }}></i>
                        <div className={styles.pointNumber}>SELESAI</div>
                      </>
                    ) : (
                      <>
                        <div className={styles.pointNumber}>{item.points}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginTop: 4 }}>
                          POIN
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* LIVE ACTIVITY LOG */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.78)',
          border: '1px solid rgba(129, 140, 248, 0.25)',
          borderRadius: 18,
          padding: '16px 20px'
        }}
      >
        <div
          style={{
            fontSize: '0.88rem',
            fontWeight: 900,
            color: '#fde047',
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-broadcast-tower"></i>
          <span>KOMENTATOR ARENA CEPAT TANGKAS</span>
        </div>
        <div style={{ maxHeight: 140, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {logs.map(log => (
            <div
              key={log.id}
              style={{
                fontSize: '0.84rem',
                padding: '4px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                gap: 10,
                alignItems: 'baseline'
              }}
            >
              <span style={{ color: '#64748b', fontFamily: 'monospace', fontSize: '0.76rem' }}>
                [{log.timestamp}]
              </span>
              <span style={{ fontWeight: 800, color: log.teamColor }}>{log.teamName}:</span>
              <span style={{ color: '#e2e8f0' }}>{log.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ==================== QUESTION SHOW MODAL ==================== */}
      {activeItem && activeCategory && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            {/* Daily Double Celebration Banner */}
            {activeItem.isDailyDouble && (
              <div className={styles.dailyDoubleBanner}>
                <i className="fas fa-star fa-spin"></i>
                <span>KEJUTAN BINTANG KEBERUNTUNGAN! NILAI KOTAK INI GANDA 2X LIPAT ({activeItem.points * 2} POIN)!</span>
                <i className="fas fa-star fa-spin"></i>
              </div>
            )}

            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: 14,
                marginBottom: 16,
                borderBottom: '1px solid rgba(255,255,255,0.12)',
                flexWrap: 'wrap',
                gap: 12
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span
                  style={{
                    background: activeCategory.bgHeader,
                    color: 'white',
                    padding: '6px 14px',
                    borderRadius: 12,
                    fontWeight: 900,
                    fontSize: '0.9rem'
                  }}
                >
                  <i className={`fas ${activeCategory.icon}`} style={{ marginRight: 6 }}></i>
                  {activeCategory.title}
                </span>

                <span
                  style={{
                    background: 'rgba(250, 204, 21, 0.18)',
                    border: '1.5px solid #fde047',
                    color: '#fde047',
                    padding: '6px 14px',
                    borderRadius: 12,
                    fontWeight: 900,
                    fontSize: '0.95rem'
                  }}
                >
                  +{activeItem.isDailyDouble ? activeItem.points * 2 : activeItem.points} POIN
                </span>
              </div>

              {/* Timer & Edit Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    background: '#090d16',
                    border: `2px solid ${timerSeconds <= 10 ? '#ef4444' : '#38bdf8'}`,
                    color: timerSeconds <= 10 ? '#ef4444' : '#38bdf8',
                    padding: '6px 14px',
                    borderRadius: 12,
                    fontFamily: 'monospace',
                    fontSize: '1.4rem',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <i className="fas fa-stopwatch"></i>
                  <span>0:{String(timerSeconds).padStart(2, '0')}</span>
                </div>

                <button
                  className={styles.btnStudio}
                  onClick={() => setTimerRunning(!timerRunning)}
                  title={timerRunning ? 'Jeda Timer' : 'Lanjutkan'}
                >
                  <i className={`fas ${timerRunning ? 'fa-pause' : 'fa-play'}`}></i>
                </button>

                <button
                  className={styles.btnStudio}
                  onClick={handleOpenEditCurrentQuestion}
                  title="Edit Soal Ini (Khusus Guru)"
                >
                  <i className="fas fa-edit" style={{ color: '#fde047' }}></i>
                </button>

                <button
                  className={styles.btnStudio}
                  onClick={() => {
                    setTimerRunning(false);
                    setActiveItem(null);
                    setActiveCategory(null);
                  }}
                  title="Tutup"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            {/* VIRTUAL BUZZER BAR (4 TEAMS) */}
            <div style={{ marginBottom: 8, fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 700 }}>
              <i className="fas fa-bell" style={{ color: '#fde047', marginRight: 6 }}></i>
              PILIH REGU YANG MENJAWAB (Klik tombol di bawah atau tekan angka <b>1, 2, 3, 4</b> di keyboard):
            </div>
            <div className={styles.buzzerBar}>
              {teams.map((t, idx) => {
                const isSelectedResponder = answeringTeamIdx === idx;
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={styles.buzzerBtn}
                    style={{
                      background: isSelectedResponder ? t.color : 'rgba(15, 23, 42, 0.85)',
                      borderColor: isSelectedResponder ? '#ffffff' : t.borderColor,
                      color: isSelectedResponder ? '#090d16' : '#ffffff',
                      boxShadow: isSelectedResponder ? `0 0 20px ${t.color}` : 'none'
                    }}
                    onClick={() => {
                      sounds.playChest();
                      setAnsweringTeamIdx(idx);
                    }}
                  >
                    <i className={`fas ${t.avatarIcon}`}></i>
                    <span>
                      [{t.keyShortcut}] {t.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* MAIN QUESTION STAGE */}
            <div className={styles.questionStageBox}>{activeItem.question}</div>

            {/* OPTIONAL MULTIPLE-CHOICE HELPER (A, B, C, D) */}
            {showOptions && activeItem.options && activeItem.options.length > 0 && (
              <div className={styles.optionsGrid}>
                {activeItem.options.map((opt, oIdx) => {
                  const letter = ['A', 'B', 'C', 'D'][oIdx] || '•';
                  const isPicked = selectedOption === opt;
                  return (
                    <button
                      key={oIdx}
                      type="button"
                      className={styles.optionCard}
                      style={{
                        borderColor: isPicked ? '#fde047' : 'rgba(148, 163, 184, 0.3)',
                        background: isPicked ? 'rgba(250, 204, 21, 0.18)' : 'rgba(30, 41, 59, 0.9)'
                      }}
                      onClick={() => {
                        setSelectedOption(opt);
                        sounds.playTick();
                      }}
                    >
                      <span className={styles.optionLetter}>{letter}</span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* HINT BOX */}
            {showHint && (
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1.5px dashed #fbbf24',
                  borderRadius: 14,
                  padding: '12px 18px',
                  marginBottom: 18,
                  color: '#fde68a',
                  fontSize: '0.98rem'
                }}
              >
                <i className="fas fa-lightbulb" style={{ marginRight: 8 }}></i>
                <b>Petunjuk (Clue):</b> {activeItem.hint}
              </div>
            )}

            {/* ANSWER BOX */}
            {showAnswer && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '2px solid #10b981',
                  borderRadius: 16,
                  padding: '18px 22px',
                  marginBottom: 18,
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#6ee7b7', letterSpacing: '1px', marginBottom: 4 }}>
                  ✅ KUNCI JAWABAN RESMI:
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ffffff' }}>
                  {activeItem.answer}
                </div>
              </div>
            )}

            {/* STEAL BANNER IF WRONG */}
            {stealPhase && (
              <div
                style={{
                  background: 'rgba(236, 72, 153, 0.18)',
                  border: '1.5px solid #ec4899',
                  borderRadius: 14,
                  padding: '12px 18px',
                  marginBottom: 18,
                  color: '#fbcfe8',
                  fontWeight: 800,
                  textAlign: 'center'
                }}
              >
                🔔 <b>BEL REBUTAN TERBUKA!</b> Klik nama Regu di atas yang mengangkat tangan paling cepat lalu klik tombol <b>&quot;Benar!&quot;</b>
              </div>
            )}

            {/* MODAL FOOTER CONTROLS */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
                paddingTop: 12,
                borderTop: '1px solid rgba(255,255,255,0.12)'
              }}
            >
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {activeItem.options && activeItem.options.length > 0 && (
                  <button
                    type="button"
                    className={styles.btnStudio}
                    style={{ borderColor: '#38bdf8', color: '#7dd3fc' }}
                    onClick={() => setShowOptions(!showOptions)}
                  >
                    <i className="fas fa-list-ol"></i>
                    <span>{showOptions ? 'Sembunyikan Pilihan A-D' : 'Buka Pilihan A-B-C-D'}</span>
                  </button>
                )}

                <button
                  type="button"
                  className={styles.btnStudio}
                  onClick={() => setShowHint(!showHint)}
                >
                  <i className="fas fa-lightbulb" style={{ color: '#fde047' }}></i>
                  <span>{showHint ? 'Tutup Clue' : 'Buka Clue'}</span>
                </button>

                <button
                  type="button"
                  className={styles.btnStudio}
                  style={{ borderColor: '#a5b4fc', color: '#c7d2fe' }}
                  onClick={() => {
                    setShowAnswer(!showAnswer);
                    setTimerRunning(false);
                  }}
                >
                  <i className="fas fa-eye"></i>
                  <span>{showAnswer ? 'Sembunyikan Kunci' : 'Lihat Kunci Jawaban'}</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={styles.btnStudio}
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    borderColor: '#ef4444',
                    color: '#fca5a5',
                    padding: '12px 18px'
                  }}
                  onClick={handleMarkWrong}
                >
                  <i className="fas fa-times-circle"></i>
                  <span>Kurang Tepat (Lempar Bel)</span>
                </button>

                <button
                  type="button"
                  className={styles.btnStudio}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderColor: '#6ee7b7',
                    color: '#ffffff',
                    padding: '12px 22px',
                    fontSize: '1rem',
                    fontWeight: 900,
                    boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)'
                  }}
                  onClick={() => handleMarkCorrect(answeringTeamIdx)}
                >
                  <i className="fas fa-check-circle"></i>
                  <span>
                    Benar untuk {buzzerTeam.name}! (+
                    {activeItem.isDailyDouble ? activeItem.points * 2 : activeItem.points})
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== EDIT QUESTION MODAL (TEACHER) ==================== */}
      {showEditCellModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: 600 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#fde047' }}>
                <i className="fas fa-edit" style={{ marginRight: 8 }}></i>
                UBAH SOAL KOTAK INI (KHUSUS GURU)
              </h2>
              <button className={styles.btnStudio} onClick={() => setShowEditCellModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSaveEditedQuestion} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Pertanyaan *</label>
                <textarea
                  rows={3}
                  required
                  value={editQuestionText}
                  onChange={e => setEditQuestionText(e.target.value)}
                  style={{ width: '100%', padding: 10, borderRadius: 10, background: '#090d16', border: '1px solid #475569', color: 'white', marginTop: 4 }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#fde047' }}>Petunjuk / Clue</label>
                <input
                  type="text"
                  value={editHintText}
                  onChange={e => setEditHintText(e.target.value)}
                  style={{ width: '100%', padding: 10, borderRadius: 10, background: '#090d16', border: '1px solid #475569', color: 'white', marginTop: 4 }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#34d399' }}>Kunci Jawaban *</label>
                <input
                  type="text"
                  required
                  value={editAnswerText}
                  onChange={e => setEditAnswerText(e.target.value)}
                  style={{ width: '100%', padding: 10, borderRadius: 10, background: '#090d16', border: '1px solid #10b981', color: 'white', marginTop: 4 }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className={styles.btnStudio} onClick={() => setShowEditCellModal(false)}>
                  Batal
                </button>
                <button
                  type="submit"
                  className={styles.btnStudio}
                  style={{ background: '#10b981', color: 'white', borderColor: '#34d399' }}
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== TEAM SETTINGS MODAL ==================== */}
      {showTeamModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: 660 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#fde047' }}>
                <i className="fas fa-users-cog" style={{ marginRight: 8 }}></i>
                ATUR NAMA REGU &amp; POIN KELAS
              </h2>
              <button className={styles.btnStudio} onClick={() => setShowTeamModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Nama Sesi Turnamen</label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={e => setSessionName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: '#090d16', border: '1px solid #475569', color: 'white', marginTop: 4 }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Kelas</label>
                <input
                  type="text"
                  value={kelas}
                  onChange={e => setKelas(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: '#090d16', border: '1px solid #475569', color: 'white', marginTop: 4 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              {teams.map((t, idx) => (
                <div
                  key={t.id}
                  style={{
                    background: 'rgba(9, 13, 22, 0.8)',
                    border: `1px solid ${t.borderColor}`,
                    borderRadius: 12,
                    padding: 12,
                    display: 'grid',
                    gridTemplateColumns: '1.3fr 1.3fr 0.8fr',
                    gap: 10
                  }}
                >
                  <div>
                    <label style={{ fontSize: '0.72rem', color: t.borderColor, fontWeight: 800 }}>
                      Nama Regu #{idx + 1}
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
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Anggota</label>
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
                    <label style={{ fontSize: '0.72rem', color: '#fde047' }}>Skor Poin</label>
                    <input
                      type="number"
                      value={t.score}
                      onChange={e => {
                        const val = Number(e.target.value) || 0;
                        setTeams(prev => prev.map((item, i) => (i === idx ? { ...item, score: val } : item)));
                      }}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 8, background: '#1e293b', border: '1px solid #475569', color: '#fde047', fontWeight: 800 }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'right' }}>
              <button
                className={styles.btnStudio}
                style={{ background: '#10b981', color: 'white' }}
                onClick={() => setShowTeamModal(false)}
              >
                <i className="fas fa-check"></i> Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== LOAD SAVED SESSIONS MODAL ==================== */}
      {showLoadModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: 620 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#fde047' }}>
                <i className="fas fa-folder-open" style={{ marginRight: 8 }}></i>
                MUAT SESI ARENA CEPAT TANGKAS
              </h2>
              <button className={styles.btnStudio} onClick={() => setShowLoadModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {savedSlots.length > 0 ? (
                savedSlots.map(slot => (
                  <div
                    key={slot.id}
                    style={{
                      background: '#090d16',
                      border: '1px solid rgba(129, 140, 248, 0.35)',
                      borderRadius: 12,
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, color: '#ffffff' }}>{slot.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 3 }}>
                        {slot.date} • {slot.session.answeredCellIds?.length || 0} Kotak Terjawab
                      </div>
                    </div>
                    <button
                      className={styles.btnStudio}
                      style={{ background: '#10b981', color: 'white' }}
                      onClick={() => {
                        applySession(slot.session);
                        setShowLoadModal(false);
                        sounds.playCorrect();
                      }}
                    >
                      <i className="fas fa-play"></i> Lanjutkan
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>
                  Belum ada sesi tersimpan.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== VICTORY PODIUM MODAL ==================== */}
      {showVictoryModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: 660, textAlign: 'center' }}>
            <div
              style={{
                width: 82,
                height: 82,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #fde047 0%, #f59e0b 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 40,
                color: '#090d16',
                margin: '0 auto 14px auto',
                boxShadow: '0 0 35px rgba(250, 204, 21, 0.6)'
              }}
            >
              <i className="fas fa-trophy"></i>
            </div>

            <h2 style={{ margin: '0 0 6px 0', fontSize: '1.8rem', fontWeight: 900, color: '#fde047' }}>
              KLASEMEN JUARA ARENA CEPAT TANGKAS
            </h2>
            <p style={{ color: '#cbd5e1', fontSize: '0.92rem', marginBottom: 20 }}>
              {sessionName} • {kelas}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24, textAlign: 'left' }}>
              {sortedTeams.map((t, rIdx) => (
                <div
                  key={t.id}
                  style={{
                    background: rIdx === 0 ? 'rgba(250, 204, 21, 0.16)' : 'rgba(9, 13, 22, 0.85)',
                    border: `2px solid ${rIdx === 0 ? '#fde047' : t.borderColor}`,
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
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: rIdx === 0 ? '#fde047' : '#1e293b',
                        color: rIdx === 0 ? '#090d16' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '1.15rem'
                      }}
                    >
                      #{rIdx + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#ffffff' }}>
                        {t.name} {rIdx === 0 && '👑'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: t.borderColor, fontWeight: 700 }}>
                        {t.members} • {t.correctCount} Soal Dijawab Benar
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fde047' }}>
                    {t.score} <span style={{ fontSize: '0.8rem' }}>POIN</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button className={styles.btnStudio} onClick={() => setShowVictoryModal(false)}>
                Kembali ke Papan Matriks
              </button>
              <button
                className={styles.btnStudio}
                style={{ background: '#10b981', color: 'white' }}
                onClick={handleSaveProgress}
              >
                <i className="fas fa-save"></i> Simpan Skor Akhir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
