'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './games-zone.module.css';
import { Team, Tile, Question, PowerUpItem, GameLog, GameSession, SaveSlot } from './types';
import { BOARD_TILES, DEFAULT_QUESTIONS, POWER_UP_POOL } from './defaultQuestions';
import { sounds } from './sound';
import Swal from 'sweetalert2';

const INITIAL_TEAMS: Team[] = [
  {
    id: 'team1',
    name: 'Garuda Merah',
    color: '#ef4444',
    bgLight: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#f87171',
    avatarIcon: 'fa-dove',
    position: 0,
    score: 0,
    items: [],
    correctCount: 0,
    wrongCount: 0,
    members: 'Kelompok 1'
  },
  {
    id: 'team2',
    name: 'Elang Samudra',
    color: '#3b82f6',
    bgLight: 'rgba(59, 130, 246, 0.15)',
    borderColor: '#60a5fa',
    avatarIcon: 'fa-feather-alt',
    position: 0,
    score: 0,
    items: [],
    correctCount: 0,
    wrongCount: 0,
    members: 'Kelompok 2'
  },
  {
    id: 'team3',
    name: 'Harimau Rimba',
    color: '#10b981',
    bgLight: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#34d399',
    avatarIcon: 'fa-paw',
    position: 0,
    score: 0,
    items: [],
    correctCount: 0,
    wrongCount: 0,
    members: 'Kelompok 3'
  },
  {
    id: 'team4',
    name: 'Naga Emas',
    color: '#f59e0b',
    bgLight: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#fbbf24',
    avatarIcon: 'fa-dragon',
    position: 0,
    score: 0,
    items: [],
    correctCount: 0,
    wrongCount: 0,
    members: 'Kelompok 4'
  }
];

export default function GamesZonePage() {
  // Main Game State
  const [sessionName, setSessionName] = useState('Ekspedisi Sains & Nalar - Kelas 8');
  const [kelas, setKelas] = useState('Kelas 8A');
  const [mapel, setMapel] = useState('IPA & Logika Terapan');
  const [currentTurn, setCurrentTurn] = useState<number>(0);
  const [round, setRound] = useState<number>(1);
  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  const [gameLog, setGameLog] = useState<GameLog[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      teamId: 'system',
      teamName: 'Pemandu Ekspedisi',
      teamColor: '#10b981',
      text: 'Selamat datang di Ekspedisi Pulau Misteri! Keempat tim bersiap di Pantai Pendaratan.',
      type: 'move'
    }
  ]);
  const [usedQuestionIds, setUsedQuestionIds] = useState<string[]>([]);
  const [customQuestions, setCustomQuestions] = useState<Question[]>([]);
  const [winnerTeam, setWinnerTeam] = useState<Team | null>(null);

  // Classroom Projector Tools
  const [isTheater, setIsTheater] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<'normal' | 'large' | 'xl'>('normal');

  // Dice State
  const [diceNumber, setDiceNumber] = useState<number>(1);
  const [isRolling, setIsRolling] = useState(false);
  const [canRoll, setCanRoll] = useState(true);

  // Active Challenge Modal State
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [activeTile, setActiveTile] = useState<Tile | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showClue, setShowClue] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(60);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Modal Screens
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showTeamEditModal, setShowTeamEditModal] = useState(false);
  const [showQuestionBankModal, setShowQuestionBankModal] = useState(false);
  const [savedSlots, setSavedSlots] = useState<SaveSlot[]>([]);

  // Sound sync on mount
  useEffect(() => {
    setIsMuted(sounds.isMuted());
    loadSavedSlotsFromStorage();
    // Auto-restore active session if exists
    const autoActive = localStorage.getItem('gameszone_active_session');
    if (autoActive) {
      try {
        const parsed = JSON.parse(autoActive);
        if (parsed && parsed.teams && parsed.teams.length === 4) {
          applySession(parsed);
        }
      } catch (e) {}
    }
  }, []);

  // Auto-save on significant game state changes
  useEffect(() => {
    if (teams && teams.length === 4) {
      const currentSession: GameSession = {
        id: 'active_session',
        name: sessionName,
        mapel,
        kelas,
        savedAt: new Date().toISOString(),
        currentTurn,
        round,
        teams,
        gameLog,
        usedQuestionIds,
        winnerTeamId: winnerTeam ? winnerTeam.id : undefined
      };
      localStorage.setItem('gameszone_active_session', JSON.stringify(currentSession));
    }
  }, [teams, currentTurn, round, gameLog, usedQuestionIds, sessionName, kelas, mapel, winnerTeam]);

  // Timer Tick Engine
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
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

  const loadSavedSlotsFromStorage = () => {
    try {
      const slotsStr = localStorage.getItem('gameszone_save_slots');
      if (slotsStr) {
        setSavedSlots(JSON.parse(slotsStr));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const applySession = (session: GameSession) => {
    setSessionName(session.name || 'Ekspedisi Kelas');
    setKelas(session.kelas || 'Kelas');
    setMapel(session.mapel || 'IPA & Logika Terapan');
    setCurrentTurn(session.currentTurn ?? 0);
    setRound(session.round ?? 1);
    setTeams(session.teams || INITIAL_TEAMS);
    setGameLog(session.gameLog || []);
    setUsedQuestionIds(session.usedQuestionIds || []);
    if (session.winnerTeamId) {
      const win = session.teams.find(t => t.id === session.winnerTeamId) || null;
      setWinnerTeam(win);
    } else {
      setWinnerTeam(null);
    }
  };

  const addLog = (team: Team, text: string, type: GameLog['type'] = 'move') => {
    const newEntry: GameLog = {
      id: 'log-' + Date.now() + '-' + Math.random(),
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
      text,
      type
    };
    setGameLog(prev => [newEntry, ...prev.slice(0, 30)]);
  };

  // Roll Dice Engine
  const handleRollDice = (customRoll?: number) => {
    if (!canRoll || isRolling || winnerTeam) return;

    setIsRolling(true);
    setCanRoll(false);
    sounds.playDiceRoll();

    let rollSteps = 0;
    const interval = setInterval(() => {
      setDiceNumber(Math.floor(Math.random() * 6) + 1);
      rollSteps++;
      if (rollSteps >= 10) {
        clearInterval(interval);
        const finalDice = customRoll ? customRoll : Math.floor(Math.random() * 6) + 1;
        setDiceNumber(finalDice);
        setIsRolling(false);
        moveCurrentTeam(finalDice);
      }
    }, 60);
  };

  // Move Team on Board
  const moveCurrentTeam = (steps: number) => {
    const currentTeam = teams[currentTurn];
    const oldPos = currentTeam.position;
    let newPos = oldPos + steps;

    // Check if team has speed boost item active
    if (currentTeam.items.some(i => i.type === 'boost')) {
      newPos += 2;
      // remove boost
      currentTeam.items = currentTeam.items.filter(i => i.type !== 'boost');
      addLog(currentTeam, `Mengaktifkan Sepatu Merkurius! Melompat ekstra +2 petak!`, 'item');
    }

    if (newPos >= 40) {
      newPos = 40;
    }

    const updatedTeams = [...teams];
    updatedTeams[currentTurn] = {
      ...currentTeam,
      position: newPos
    };
    setTeams(updatedTeams);

    const destTile = BOARD_TILES.find(t => t.id === newPos) || BOARD_TILES[0];
    addLog(currentTeam, `Melempar dadu angka ${steps}, melangkah dari petak ${oldPos} ke petak ${newPos} (${destTile.title}).`);

    // Check Win Condition
    if (newPos === 40) {
      triggerVictory(currentTeam);
      return;
    }

    // Trigger Tile Event after short delay
    setTimeout(() => {
      triggerTileEvent(destTile, updatedTeams[currentTurn]);
    }, 700);
  };

  // Trigger Tile Event
  const triggerTileEvent = (tile: Tile, team: Team) => {
    setActiveTile(tile);
    setShowAnswer(false);
    setShowClue(false);
    setTimerRunning(false);
    setTimerSeconds(60);

    if (tile.type === 'chest') {
      sounds.playChest();
      // Grant random power-up
      const randomItem = POWER_UP_POOL[Math.floor(Math.random() * POWER_UP_POOL.length)];
      const updatedTeams = teams.map(t => {
        if (t.id === team.id) {
          return {
            ...t,
            items: [...t.items, randomItem],
            score: t.score + 50
          };
        }
        return t;
      });
      setTeams(updatedTeams);
      addLog(team, `Membuka Peti Harta Karun! Mendapatkan kartu "${randomItem.name}" dan +50 Koin!`, 'item');

      Swal.fire({
        title: '🎁 PETI HARTA KARUN TERBUKA!',
        html: `
          <div style="font-size: 3rem; margin: 10px 0;"><i class="fas ${randomItem.icon}" style="color: #f59e0b;"></i></div>
          <h3 style="color: #f59e0b; margin: 0 0 8px 0;">${randomItem.name}</h3>
          <p style="color: #475569; font-size: 0.95rem;">${randomItem.description}</p>
          <div style="margin-top: 15px; font-weight: 800; color: #10b981;">Bonus +50 Koin Energi!</div>
        `,
        confirmButtonText: 'Ambil Hadiah & Lanjut',
        confirmButtonColor: '#10b981'
      }).then(() => {
        nextTurn();
      });
      return;
    }

    if (tile.type === 'hazard') {
      // Check shield
      const hasShield = team.items.some(i => i.type === 'shield');
      if (hasShield) {
        sounds.playChest();
        const updatedTeams = teams.map(t => {
          if (t.id === team.id) {
            return {
              ...t,
              items: t.items.filter(i => i.type !== 'shield')
            };
          }
          return t;
        });
        setTeams(updatedTeams);
        addLog(team, `🛡️ Perisai Kebijaksanaan melindungi dari petak jebakan!`, 'item');
        Swal.fire('Terlindungi!', 'Perisai Kebijaksanaan menyelamatkan tim dari jebakan!', 'success').then(() => {
          nextTurn();
        });
        return;
      }
    }

    // Question selection
    const allQuestions = [...customQuestions, ...DEFAULT_QUESTIONS];
    let pool = allQuestions.filter(q => !usedQuestionIds.includes(q.id));
    if (pool.length === 0) {
      pool = allQuestions; // Reset pool if exhausted
    }

    let selectedQ: Question;
    if (tile.type === 'gatekeeper') {
      const bossPool = pool.filter(q => q.difficulty === 'Boss Gatekeeper');
      selectedQ = bossPool.length > 0 ? bossPool[Math.floor(Math.random() * bossPool.length)] : pool[0];
    } else if (tile.type === 'duel') {
      const duelPool = pool.filter(q => q.id.startsWith('duel'));
      selectedQ = duelPool.length > 0 ? duelPool[Math.floor(Math.random() * duelPool.length)] : pool[0];
    } else {
      const regularPool = pool.filter(q => q.difficulty !== 'Boss Gatekeeper' && !q.id.startsWith('duel'));
      selectedQ = regularPool.length > 0 ? regularPool[Math.floor(Math.random() * regularPool.length)] : pool[0];
    }

    setActiveQuestion(selectedQ);
    setUsedQuestionIds(prev => [...prev, selectedQ.id]);

    // Check time power-up
    if (team.items.some(i => i.type === 'time')) {
      setTimerSeconds(120);
    }
  };

  // Turn Evaluation: Correct
  const handleAnswerCorrect = (targetTeamId?: string) => {
    sounds.playCorrect();
    const winningTeamId = targetTeamId || teams[currentTurn].id;
    const team = teams.find(t => t.id === winningTeamId)!;
    const pts = activeQuestion ? activeQuestion.points : 100;
    const bonus = activeQuestion?.bonusSteps || 0;

    const hasMultiplier = team.items.some(i => i.type === 'multiplier');
    const finalPts = hasMultiplier ? pts * 2 : pts;

    const updatedTeams = teams.map(t => {
      if (t.id === winningTeamId) {
        let newPos = t.position + bonus;
        if (newPos > 40) newPos = 40;
        return {
          ...t,
          score: t.score + finalPts,
          position: newPos,
          correctCount: t.correctCount + 1,
          items: t.items.filter(i => i.type !== 'multiplier')
        };
      }
      return t;
    });

    setTeams(updatedTeams);
    addLog(team, `✅ Berhasil memecahkan tantangan! Memperoleh +${finalPts} Koin${bonus > 0 ? ` dan bonus maju +${bonus} petak` : ''}!`, 'correct');

    Swal.fire({
      icon: 'success',
      title: 'LUAR BIASA! JAWABAN BENAR!',
      html: `
        <p style="font-size: 1.1rem; color: #047857;"><b>${team.name}</b> berhasil memecahkan tantangan dengan nalar tepat!</p>
        <div style="font-size: 1.25rem; font-weight: 800; color: #10b981; margin-top: 10px;">
          +${finalPts} Koin Energi ${bonus > 0 ? ` | Maju +${bonus} Langkah` : ''}
        </div>
      `,
      confirmButtonColor: '#10b981',
      confirmButtonText: 'Selesai & Lanjut Giliran'
    }).then(() => {
      closeChallengeModal();
      nextTurn();
    });
  };

  // Turn Evaluation: Wrong
  const handleAnswerWrong = () => {
    sounds.playWrong();
    const currentTeam = teams[currentTurn];
    const isHazard = activeTile?.type === 'hazard';

    let penaltyStep = isHazard ? 1 : 0;
    const updatedTeams = teams.map(t => {
      if (t.id === currentTeam.id) {
        return {
          ...t,
          position: Math.max(0, t.position - penaltyStep),
          wrongCount: t.wrongCount + 1
        };
      }
      return t;
    });
    setTeams(updatedTeams);

    addLog(currentTeam, `❌ Jawaban belum tepat${penaltyStep > 0 ? ', mundur 1 petak karena jebakan' : ''}.`, 'wrong');

    Swal.fire({
      icon: 'error',
      title: 'JAWABAN KURANG TEPAT!',
      text: isHazard ? `${currentTeam.name} terkena efek jebakan dan mundur 1 petak.` : `Kesempatan belum berhasil. Jangan patah semangat, tetap kompak!`,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Lanjut Giliran'
    }).then(() => {
      closeChallengeModal();
      nextTurn();
    });
  };

  const closeChallengeModal = () => {
    setActiveQuestion(null);
    setActiveTile(null);
    setTimerRunning(false);
  };

  const nextTurn = () => {
    setCanRoll(true);
    setCurrentTurn(prev => {
      const next = (prev + 1) % 4;
      if (next === 0) {
        setRound(r => r + 1);
      }
      return next;
    });
  };

  // Victory Handler
  const triggerVictory = (team: Team) => {
    sounds.playVictory();
    setWinnerTeam(team);
    addLog(team, `👑 JUARA EKSPEDISI SEJATI! ${team.name} telah mencapai Puncak Kebijaksanaan!`, 'win');

    Swal.fire({
      title: '🏆 SANG JUARA EKSPEDISI!',
      html: `
        <div style="font-size: 3.5rem; margin: 15px 0;">👑</div>
        <h2 style="color: #eab308; font-weight: 900; margin: 0 0 10px 0;">SELAMAT KEPADA ${team.name.toUpperCase()}!</h2>
        <p style="font-size: 1.1rem; color: #475569;">Berhasil menembus seluruh rintangan dan mencapai Puncak Kebijaksanaan dengan skor <b>${team.score} Koin</b>!</p>
      `,
      confirmButtonColor: '#eab308',
      confirmButtonText: 'Beri Tepuk Tangan Meriah!'
    });
  };

  // SAVE GAME TO SLOT
  const handleSaveToSlot = () => {
    const slotName = prompt('Beri nama sesi penyimpanan (contoh: Kelas 8A - Pertemuan 1):', sessionName);
    if (!slotName) return;

    const sessionData: GameSession = {
      id: 'session_' + Date.now(),
      name: slotName,
      mapel,
      kelas,
      savedAt: new Date().toLocaleString('id-ID'),
      currentTurn,
      round,
      teams,
      gameLog,
      usedQuestionIds,
      winnerTeamId: winnerTeam ? winnerTeam.id : undefined
    };

    const newSlot: SaveSlot = {
      id: sessionData.id,
      name: slotName,
      kelas,
      mapel,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      session: sessionData
    };

    const updatedSlots = [newSlot, ...savedSlots.filter(s => s.name !== slotName)];
    setSavedSlots(updatedSlots);
    localStorage.setItem('gameszone_save_slots', JSON.stringify(updatedSlots));
    setSessionName(slotName);

    Swal.fire({
      icon: 'success',
      title: 'Tersimpan!',
      text: `Sesi "${slotName}" berhasil disimpan di slot browser. Anda bisa melanjutkannya kapan saja!`,
      confirmButtonColor: '#10b981'
    });
  };

  // EXPORT SAVE TO JSON FILE
  const handleExportJSON = () => {
    const sessionData: GameSession = {
      id: 'export_' + Date.now(),
      name: sessionName,
      mapel,
      kelas,
      savedAt: new Date().toLocaleString('id-ID'),
      currentTurn,
      round,
      teams,
      gameLog,
      usedQuestionIds,
      winnerTeamId: winnerTeam ? winnerTeam.id : undefined
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessionData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `gameszone-${kelas.replace(/\s+/g, '_')}-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    Swal.fire({
      icon: 'success',
      title: 'File Save Berhasil Diunduh!',
      text: 'File JSON tersimpan di laptop. Anda bisa mengimpornya di pertemuan berikutnya atau di komputer proyektor lain.',
      confirmButtonColor: '#0ea5e9'
    });
  };

  // IMPORT SAVE FROM JSON FILE
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && parsed.teams && parsed.teams.length === 4) {
            applySession(parsed);
            setShowLoadModal(false);
            Swal.fire({
              icon: 'success',
              title: 'Berhasil Melanjutkan Sesi!',
              text: `Sesi "${parsed.name || 'Game'}" berhasil dipulihkan! Posisi dan skor kembali persis seperti pertemuan sebelumnya.`,
              confirmButtonColor: '#10b981'
            });
          } else {
            throw new Error('Format file game tidak sesuai');
          }
        } catch (err: any) {
          Swal.fire('Gagal!', 'File save tidak valid: ' + err.message, 'error');
        }
      };
    }
  };

  // Reset Game
  const handleResetGame = () => {
    Swal.fire({
      title: 'Mulai Game Baru?',
      text: 'Posisi papan, giliran, dan skor akan di-reset dari awal. Pastikan Anda sudah menyimpan sesi sebelumnya jika ingin melanjutkannya nanti.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Game Baru',
      cancelButtonText: 'Batal'
    }).then(result => {
      if (result.isConfirmed) {
        setTeams(INITIAL_TEAMS);
        setCurrentTurn(0);
        setRound(1);
        setDiceNumber(1);
        setCanRoll(true);
        setWinnerTeam(null);
        setUsedQuestionIds([]);
        setGameLog([
          {
            id: 'init-reset',
            timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            teamId: 'system',
            teamName: 'Pemandu Ekspedisi',
            teamColor: '#10b981',
            text: 'Game baru dimulai kembali dari Pantai Pendaratan!',
            type: 'move'
          }
        ]);
        Swal.fire('Game Baru!', 'Ekspedisi telah di-reset ke garis awal.', 'success');
      }
    });
  };

  const currentTeam = teams[currentTurn] || teams[0];

  return (
    <div className={`${styles.container} ${isTheater ? styles.theaterMode : ''}`}>
      
      {/* Top Navbar */}
      <div className={styles.topNav}>
        <div className={styles.brandGroup}>
          <div className={styles.gameLogo}>
            <i className="fas fa-gamepad"></i>
          </div>
          <div>
            <h1 className={styles.gameTitle}>GAME&apos;S ZONE: EKSPEDISI PULAU MISTERI</h1>
            <p className={styles.gameSubtitle}>
              Media Pembelajaran Nalar & Sains Interaktif Proyektor | {kelas} • {mapel}
            </p>
          </div>
        </div>

        <div className={styles.controlGroup}>
          <button 
            className={`${styles.btnAction} ${styles.btnSave}`} 
            onClick={handleSaveToSlot}
            title="Simpan sesi saat ini agar bisa dilanjutkan di pertemuan selanjutnya"
          >
            <i className="fas fa-save"></i> SIMPAN PROGRES
          </button>

          <button 
            className={styles.btnAction} 
            onClick={() => setShowLoadModal(true)}
            title="Buka sesi yang tersimpan sebelumnya"
          >
            <i className="fas fa-folder-open"></i> BUKA SESI / LOAD
          </button>

          <button 
            className={styles.btnAction} 
            onClick={() => setShowTeamEditModal(true)}
            title="Atur Nama & Anggota Kelompok"
          >
            <i className="fas fa-users-cog"></i> ATUR 4 TIM
          </button>

          <button 
            className={styles.btnAction} 
            onClick={() => {
              const muted = sounds.toggleMute();
              setIsMuted(muted);
            }}
            title={isMuted ? 'Nyalakan Efek Suara' : 'Matikan Suara'}
          >
            <i className={`fas fa-volume-${isMuted ? 'mute' : 'up'}`} style={{ color: isMuted ? '#ef4444' : '#10b981' }}></i>
          </button>

          <button 
            className={`${styles.btnAction} ${styles.btnTheater}`} 
            onClick={() => setIsTheater(!isTheater)}
            title="Layar Penuh Proyektor (Bebas Gangguan)"
          >
            <i className={`fas fa-${isTheater ? 'compress' : 'expand'}`}></i> {isTheater ? 'TUTUP PROYEKTOR' : 'MODE PROYEKTOR'}
          </button>

          <button 
            className={styles.btnAction} 
            onClick={handleResetGame}
            title="Reset Game ke Garis Start"
            style={{ color: '#f87171' }}
          >
            <i className="fas fa-redo-alt"></i> RESET
          </button>
        </div>
      </div>

      {/* Turn Indicator Banner */}
      <div 
        className={styles.turnBanner} 
        style={{ 
          background: `linear-gradient(135deg, ${currentTeam.bgLight} 0%, rgba(30, 41, 59, 0.95) 100%)`,
          borderColor: currentTeam.borderColor
        }}
      >
        <div className={styles.turnLeft}>
          <div className={styles.turnIconBox} style={{ background: currentTeam.color }}>
            <i className={`fas ${currentTeam.avatarIcon}`}></i>
          </div>
          <div>
            <div className={styles.turnHeading} style={{ color: currentTeam.borderColor }}>
              GILIRAN BERMAIN SEKARANG • PUTARAN KE-{round}
            </div>
            <div className={styles.turnTeamName} style={{ color: currentTeam.color }}>
              {currentTeam.name} <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 600 }}>({currentTeam.members})</span>
            </div>
          </div>
        </div>

        <div className={styles.turnRight}>
          <div style={{ textAlign: 'right', marginRight: 10 }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>POSISI DI PAPAN</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#38bdf8' }}>
              Petak {currentTeam.position} / 40
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>KOIN ENERGI</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fbbf24' }}>
              💰 {currentTeam.score}
            </div>
          </div>
        </div>
      </div>

      {/* 4 Teams Scoreboard Cards */}
      <div className={styles.teamsGrid}>
        {teams.map((t, idx) => {
          const isTurn = idx === currentTurn;
          return (
            <div 
              key={t.id} 
              className={`${styles.teamCard} ${isTurn ? styles.teamCardActive : ''}`}
              style={{ borderColor: isTurn ? t.color : 'rgba(255,255,255,0.08)' }}
            >
              <div className={styles.teamCardHeader}>
                <div className={styles.teamAvatar} style={{ background: t.color }}>
                  <i className={`fas ${t.avatarIcon}`}></i>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div className={styles.teamTileBadge}>
                    📍 Petak {t.position}
                  </div>
                  <div className={styles.teamScoreBadge}>
                    <i className="fas fa-coins"></i> {t.score}
                  </div>
                </div>
              </div>

              <div className={styles.teamNameTitle} style={{ color: t.color }}>
                {t.name}
              </div>

              <div className={styles.teamMembersDesc}>
                {t.members || 'Anggota Kelompok'}
              </div>

              <div className={styles.teamInventory}>
                {t.items.length > 0 ? (
                  t.items.map((item, itemIdx) => (
                    <div 
                      key={`${item.id}_${itemIdx}`} 
                      className={styles.itemPill} 
                      title={`${item.name}: ${item.description}`}
                      onClick={() => Swal.fire(item.name, item.description, 'info')}
                    >
                      <i className={`fas ${item.icon}`} style={{ color: '#38bdf8' }}></i>
                      <span>{item.name}</span>
                    </div>
                  ))
                ) : (
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                    Belum ada kartu bantuan
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dice & Action Center */}
      <div className={styles.actionCenter}>
        <div 
          className={`${styles.diceBox} ${isRolling ? styles.diceRolling : ''}`}
          onClick={() => handleRollDice()}
          title="Klik untuk kocok dadu!"
        >
          {isRolling ? '?' : diceNumber}
        </div>

        <button 
          className={styles.btnRollLarge}
          onClick={() => handleRollDice()}
          disabled={!canRoll || isRolling || !!winnerTeam}
        >
          <i className="fas fa-dice"></i>
          <span>{isRolling ? 'MENGOCOR DADU...' : `KOCOK DADU (${currentTeam.name.toUpperCase()})`}</span>
        </button>

        <button 
          className={styles.btnAction} 
          onClick={() => {
            const manual = prompt('Masukkan angka dadu fisik manual (1 - 6):', '3');
            if (manual) {
              const num = parseInt(manual);
              if (num >= 1 && num <= 6) {
                handleRollDice(num);
              }
            }
          }}
          disabled={!canRoll || isRolling || !!winnerTeam}
        >
          <i className="fas fa-keyboard"></i> INPUT MANUAL DADU
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Tampilan Proyektor:</span>
          <button 
            className={styles.btnAction}
            onClick={() => setZoomLevel(zoomLevel === 'normal' ? 'large' : zoomLevel === 'large' ? 'xl' : 'normal')}
          >
            <i className="fas fa-search-plus"></i> Ukuran Teks: {zoomLevel.toUpperCase()}
          </button>
        </div>
      </div>

      {/* Interactive 40-Tile Board Grid */}
      <div className={styles.boardContainer}>
        <div className={styles.boardHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>PETA EKSPEDISI 40 PETAK</h2>
            <span style={{ fontSize: '0.8rem', background: '#334155', padding: '3px 10px', borderRadius: '12px', color: '#94a3b8' }}>
              Zona 1: Pesisir • Zona 2: Sungai Logika • Zona 3: Tebing Kristal • Zona 4: Puncak Nalar
            </span>
          </div>

          <div style={{ display: 'flex', gap: 15, fontSize: '0.8rem', color: '#94a3b8', flexWrap: 'wrap' }}>
            <span><i className="fas fa-flag-checkered" style={{ color: '#10b981', marginRight: 4 }}></i> Start</span>
            <span><i className="fas fa-brain" style={{ color: '#0ea5e9', marginRight: 4 }}></i> Tantangan</span>
            <span><i className="fas fa-gift" style={{ color: '#f59e0b', marginRight: 4 }}></i> Peti Harta</span>
            <span><i className="fas fa-bolt" style={{ color: '#f97316', marginRight: 4 }}></i> Duel Rebutan</span>
            <span><i className="fas fa-exclamation-triangle" style={{ color: '#ef4444', marginRight: 4 }}></i> Jebakan</span>
            <span><i className="fas fa-dungeon" style={{ color: '#8b5cf6', marginRight: 4 }}></i> Gatekeeper</span>
            <span><i className="fas fa-crown" style={{ color: '#eab308', marginRight: 4 }}></i> Finish</span>
          </div>
        </div>

        <div className={styles.boardGrid}>
          {BOARD_TILES.map(tile => {
            // Find which teams are currently on this tile
            const teamsOnThisTile = teams.filter(t => t.position === tile.id);

            return (
              <div 
                key={tile.id} 
                className={styles.tile} 
                style={{ 
                  borderColor: tile.id === currentTeam.position ? currentTeam.color : 'rgba(255,255,255,0.1)',
                  background: tile.id === 40 ? 'rgba(234, 179, 8, 0.12)' : tile.id === 0 ? 'rgba(16, 185, 129, 0.12)' : '#1e293b'
                }}
                onClick={() => {
                  Swal.fire({
                    title: `Petak #${tile.id}: ${tile.title}`,
                    html: `
                      <p><b>Zona:</b> ${tile.zoneName}</p>
                      <p><b>Kategori:</b> ${tile.description}</p>
                      <p><b>Tim di Petak Ini:</b> ${teamsOnThisTile.length > 0 ? teamsOnThisTile.map(t => t.name).join(', ') : 'Belum ada'}</p>
                    `,
                    icon: 'info'
                  });
                }}
              >
                {/* Team Pins Standing on this tile */}
                {teamsOnThisTile.length > 0 && (
                  <div className={styles.pinsWrapper}>
                    {teamsOnThisTile.map(t => (
                      <div 
                        key={t.id} 
                        className={styles.teamPin} 
                        style={{ background: t.color }}
                        title={`${t.name} (Petak ${tile.id})`}
                      >
                        <i className={`fas ${t.avatarIcon}`}></i>
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.tileNum}>
                  <span>#{tile.id}</span>
                  <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>Z{tile.zone}</span>
                </div>

                <div className={styles.tileIcon} style={{ color: tile.color }}>
                  <i className={`fas ${tile.icon}`}></i>
                </div>

                <div className={styles.tileLabel}>
                  {tile.title}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Log / History Feed */}
      <div className={styles.logContainer}>
        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#94a3b8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="fas fa-history"></i> CATATAN RIWAYAT EKSPEDISI
        </div>
        {gameLog.map(log => (
          <div key={log.id} className={styles.logItem}>
            <span style={{ color: '#64748b', fontSize: '0.75rem', fontFamily: 'monospace' }}>[{log.timestamp}]</span>
            <span style={{ color: log.teamColor, fontWeight: 700 }}>{log.teamName}:</span>
            <span style={{ color: '#e2e8f0' }}>{log.text}</span>
          </div>
        ))}
      </div>

      {/* CHALLENGE MODAL (SOAL NALAR KELOMPOK) */}
      {activeQuestion && activeTile && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ fontSize: zoomLevel === 'large' ? '1.1rem' : zoomLevel === 'xl' ? '1.25rem' : '1rem' }}>
            
            {/* Header */}
            <div className={styles.challengeHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={styles.challengeCategoryBadge}>
                  <i className="fas fa-tag" style={{ marginRight: 6 }}></i>
                  {activeQuestion.category} • {activeQuestion.difficulty}
                </span>
                <span style={{ background: '#334155', padding: '6px 12px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, color: '#fbbf24' }}>
                  💰 +{activeQuestion.points} Koin
                </span>
                {activeQuestion.bonusSteps > 0 && (
                  <span style={{ background: '#334155', padding: '6px 12px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>
                    🚀 Maju +{activeQuestion.bonusSteps} Petak
                  </span>
                )}
              </div>

              {/* Countdown Timer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className={`${styles.timerBox} ${timerSeconds <= 10 ? styles.timerWarning : ''}`}>
                  <i className="fas fa-stopwatch" style={{ fontSize: '1.2rem', color: timerSeconds <= 10 ? '#ef4444' : '#38bdf8' }}></i>
                  <span>{timerSeconds}s</span>
                </div>

                <button 
                  className={styles.btnAction} 
                  onClick={() => setTimerRunning(!timerRunning)}
                  style={{ background: timerRunning ? '#ef4444' : '#10b981', color: 'white', padding: '8px 12px' }}
                >
                  <i className={`fas fa-${timerRunning ? 'pause' : 'play'}`}></i>
                </button>

                <button 
                  className={styles.btnAction} 
                  onClick={() => setTimerSeconds(prev => prev + 30)}
                  title="Tambah Waktu Diskusi +30 Detik"
                  style={{ padding: '8px 12px' }}
                >
                  +30s
                </button>
              </div>
            </div>

            {/* Target Team Banner */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, background: currentTeam.bgLight, padding: '10px 16px', borderRadius: '12px', border: `1.5px solid ${currentTeam.borderColor}` }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: currentTeam.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <i className={`fas ${currentTeam.avatarIcon}`}></i>
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 700 }}>GILIRAN TIM MENJAWAB: </span>
                <b style={{ color: currentTeam.color, fontSize: '1.05rem' }}>{currentTeam.name}</b>
              </div>
            </div>

            {/* Question Text */}
            <div className={styles.challengeQuestion}>
              <div style={{ fontSize: '0.9rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6, fontWeight: 800 }}>
                {activeTile.title} (#{activeTile.id}):
              </div>
              {activeQuestion.question}
            </div>

            {/* Clue Section */}
            {activeQuestion.contextClue && (
              <div>
                {showClue ? (
                  <div className={styles.clueBox}>
                    <i className="fas fa-lightbulb" style={{ marginRight: 8, color: '#f59e0b' }}></i>
                    <b>Petunjuk Nalar:</b> {activeQuestion.contextClue}
                  </div>
                ) : (
                  <button 
                    className={styles.btnAction} 
                    onClick={() => setShowClue(true)}
                    style={{ marginBottom: 15, background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', border: '1px dashed #f59e0b' }}
                  >
                    <i className="fas fa-compass"></i> Buka Petunjuk Diskusi (Clue)
                  </button>
                )}
              </div>
            )}

            {/* Answer Section */}
            {showAnswer ? (
              <div className={styles.answerBox}>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#10b981', marginBottom: 6 }}>
                  <i className="fas fa-check-circle" style={{ marginRight: 8 }}></i>
                  KUNCI JAWABAN BENAR:
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: 10 }}>
                  {activeQuestion.correctAnswer}
                </div>
                <div style={{ fontSize: '0.95rem', color: '#cbd5e1', lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
                  <b>Penjelasan Ilmiah / Nalar:</b> {activeQuestion.explanation}
                </div>
              </div>
            ) : (
              <button 
                className={styles.btnAction} 
                onClick={() => setShowAnswer(true)}
                style={{ marginBottom: 20, background: '#334155', color: '#38bdf8' }}
              >
                <i className="fas fa-eye"></i> Tampilkan Kunci Jawaban & Penjelasan Nalar (Untuk Guru)
              </button>
            )}

            {/* Guru Evaluation Buttons */}
            <div className={styles.btnGroupEval}>
              {/* Option to award to other team in duel */}
              {activeTile.type === 'duel' && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', marginBottom: 10, background: '#0f172a', padding: '10px 15px', borderRadius: 10 }}>
                  <span style={{ fontSize: '0.85rem', color: '#f97316', fontWeight: 800 }}>⚡ TIM PEMENANG DUEL REBUTAN:</span>
                  {teams.map(t => (
                    <button 
                      key={t.id} 
                      className={styles.btnAction} 
                      onClick={() => handleAnswerCorrect(t.id)}
                      style={{ background: t.color, color: 'white', padding: '5px 10px', fontSize: '0.8rem' }}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}

              <button className={styles.btnWrong} onClick={handleAnswerWrong}>
                <i className="fas fa-times-circle"></i> Jawaban Kurang Tepat
              </button>

              <button className={styles.btnCorrect} onClick={() => handleAnswerCorrect()}>
                <i className="fas fa-check-circle"></i> Jawaban Benar (+Poin & Maju)
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: SIMPAN SESI / SLOTS */}
      {showLoadModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: 650 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>
                <i className="fas fa-folder-open" style={{ color: '#0ea5e9', marginRight: 10 }}></i>
                PILIH SESI PERMAINAN TERSIMPAN
              </h2>
              <button className={styles.btnAction} onClick={() => setShowLoadModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: 15 }}>
              Pilih sesi kelas yang ingin dilanjutkan di pertemuan hari ini, atau unggah file save JSON.
            </p>

            {/* Upload File JSON */}
            <div style={{ background: '#0f172a', border: '1.5px dashed #38bdf8', padding: 18, borderRadius: 14, textAlign: 'center', marginBottom: 20 }}>
              <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, color: '#38bdf8', fontWeight: 700 }}>
                <i className="fas fa-file-import" style={{ fontSize: '1.3rem' }}></i>
                <span>Unggah File Save Game (.json) dari Laptop / Flashdisk</span>
                <input type="file" accept=".json" onChange={handleImportJSON} style={{ display: 'none' }} />
              </label>
            </div>

            {/* List of saved slots in LocalStorage */}
            <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {savedSlots.length > 0 ? (
                savedSlots.map(slot => (
                  <div 
                    key={slot.id} 
                    style={{ 
                      background: '#0f172a', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      padding: '14px 18px', 
                      borderRadius: 12, 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center' 
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f1f5f9' }}>{slot.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>
                        Tersimpan pada: {slot.date} • Putaran {slot.session.round}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        className={styles.btnAction} 
                        style={{ background: '#10b981', color: 'white' }}
                        onClick={() => {
                          applySession(slot.session);
                          setShowLoadModal(false);
                          Swal.fire('Sukses', `Sesi "${slot.name}" berhasil dimuat!`, 'success');
                        }}
                      >
                        <i className="fas fa-play"></i> Lanjutkan
                      </button>
                      <button 
                        className={styles.btnAction} 
                        style={{ background: '#ef4444', color: 'white', padding: '8px 12px' }}
                        onClick={() => {
                          const updated = savedSlots.filter(s => s.id !== slot.id);
                          setSavedSlots(updated);
                          localStorage.setItem('gameszone_save_slots', JSON.stringify(updated));
                        }}
                        title="Hapus Slot"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>
                  <i className="fas fa-inbox" style={{ fontSize: '2rem', marginBottom: 10, display: 'block' }}></i>
                  Belum ada sesi tersimpan di browser ini. Gunakan tombol &quot;Simpan Progres&quot; saat kelas berakhir.
                </div>
              )}
            </div>

            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <button className={styles.btnAction} onClick={handleExportJSON} style={{ background: '#334155' }}>
                <i className="fas fa-download"></i> Unduh Cadangan JSON Sesi Saat Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT TEAMS */}
      {showTeamEditModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: 680 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem' }}>
                <i className="fas fa-users-cog" style={{ color: '#f59e0b', marginRight: 10 }}></i>
                PENGATURAN 4 TIM EKSPEDISI
              </h2>
              <button className={styles.btnAction} onClick={() => setShowTeamEditModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 700 }}>Nama Kelas:</label>
                <input 
                  type="text" 
                  value={kelas} 
                  onChange={e => setKelas(e.target.value)} 
                  style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: 'white', marginTop: 5 }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 700 }}>Mata Pelajaran / Bab:</label>
                <input 
                  type="text" 
                  value={mapel} 
                  onChange={e => setMapel(e.target.value)} 
                  style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: 'white', marginTop: 5 }} 
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {teams.map((t, idx) => (
                <div key={t.id} style={{ background: '#0f172a', border: `1.5px solid ${t.color}`, padding: 14, borderRadius: 12 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13 }}>
                      <i className={`fas ${t.avatarIcon}`}></i>
                    </div>
                    <input 
                      type="text" 
                      value={t.name} 
                      onChange={e => {
                        const updated = [...teams];
                        updated[idx].name = e.target.value;
                        setTeams(updated);
                      }}
                      placeholder={`Nama Tim ${idx + 1}`}
                      style={{ flex: 1, padding: '7px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: 'white', fontWeight: 700 }}
                    />
                  </div>
                  <input 
                    type="text" 
                    value={t.members} 
                    onChange={e => {
                      const updated = [...teams];
                      updated[idx].members = e.target.value;
                      setTeams(updated);
                    }}
                    placeholder="Nama anggota kelompok (contoh: Ahmad, Budi, Siti, Rina...)"
                    style={{ width: '100%', padding: '7px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#94a3b8', fontSize: '0.85rem' }}
                  />
                </div>
              ))}
            </div>

            <div style={{ marginTop: 25, textAlign: 'right' }}>
              <button 
                className={styles.btnAction} 
                onClick={() => {
                  setShowTeamEditModal(false);
                  Swal.fire('Tersimpan', 'Profil 4 Tim berhasil diperbarui!', 'success');
                }}
                style={{ background: '#10b981', color: 'white', padding: '10px 24px' }}
              >
                <i className="fas fa-check"></i> Selesai
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
