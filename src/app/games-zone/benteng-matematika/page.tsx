'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from './mathFortress.module.css';
import {
  MathGradeId,
  MathTeam,
  MathSectorItem,
  MathLog,
  MathSession,
  MathSaveSlot,
  BlitzQuestion,
  INITIAL_MATH_TEAMS,
  MATH_GRADE_PACKS,
  generateDynamicMathQuestion,
  generateBlitzQuestion,
} from './mathFortressData';
import { sounds } from '../sound';
import Swal from 'sweetalert2';

// Pure safe arithmetic evaluator for the Interactive Math Forge widget (+, -, *, /, parentheses)
function safeEvaluateArithmetic(expr: string): number | null {
  try {
    const cleaned = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\s+/g, '');
    if (!cleaned || !/^[0-9+\-*/().]+$/.test(cleaned)) return null;

    let pos = 0;
    const peek = () => cleaned[pos];
    const consume = () => cleaned[pos++];

    const parseExpr = (): number => {
      let val = parseTerm();
      while (peek() === '+' || peek() === '-') {
        const op = consume();
        const right = parseTerm();
        val = op === '+' ? val + right : val - right;
      }
      return val;
    };

    const parseTerm = (): number => {
      let val = parseFactor();
      while (peek() === '*' || peek() === '/') {
        const op = consume();
        const right = parseFactor();
        if (op === '/') {
          if (right === 0) throw new Error('div0');
          val = val / right;
        } else {
          val = val * right;
        }
      }
      return val;
    };

    const parseFactor = (): number => {
      if (peek() === '(') {
        consume();
        const val = parseExpr();
        if (consume() !== ')') throw new Error('paren');
        return val;
      }
      if (peek() === '-') {
        consume();
        return -parseFactor();
      }
      let numStr = '';
      while (pos < cleaned.length && /[0-9.]/.test(cleaned[pos])) {
        numStr += consume();
      }
      if (!numStr) throw new Error('nan');
      return parseFloat(numStr);
    };

    const result = parseExpr();
    if (pos !== cleaned.length || !Number.isFinite(result)) return null;
    return Math.round(result * 10000) / 10000;
  } catch {
    return null;
  }
}

export default function BentengMatematikaPage() {
  // Core Session State
  const [sessionName, setSessionName] = useState('Turnamen Benteng Matematika MTs (Kelas 7–9)');
  const [selectedGradeId, setSelectedGradeId] = useState<MathGradeId>('kelas-7');
  const [currentTurn, setCurrentTurn] = useState<number>(0);
  const [round, setRound] = useState<number>(1);
  const [teams, setTeams] = useState<MathTeam[]>(INITIAL_MATH_TEAMS);
  const [sectorOwners, setSectorOwners] = useState<Record<string, number>>({});
  const [solvedSectorIds, setSolvedSectorIds] = useState<string[]>([]);
  const [customOverrides, setCustomOverrides] = useState<Record<string, Partial<MathSectorItem>>>({});
  const [logs, setLogs] = useState<MathLog[]>([
    {
      id: 'init-mlog',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      teamName: 'Komando Benteng',
      teamColor: '#38bdf8',
      text: 'Benteng Matematika siap! Pilih tingkat Kelas 7, 8, atau 9 lalu serbu sektor di papan 4x4.',
      type: 'system',
    },
  ]);

  // Display Controls
  const [isTheater, setIsTheater] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<'normal' | 'large' | 'xl'>('normal');

  // Active Challenge State
  const [activeSector, setActiveSector] = useState<MathSectorItem | null>(null);
  const [answeringTeamIdx, setAnsweringTeamIdx] = useState<number>(0);
  const [doubleCannonActive, setDoubleCannonActive] = useState<boolean>(false);
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [keypadValue, setKeypadValue] = useState<string>('');
  const [showHint, setShowHint] = useState<boolean>(false);
  const [answerState, setAnswerState] = useState<'pending' | 'correct' | 'wrong'>('pending');
  const [tacticalDone, setTacticalDone] = useState<boolean>(false);

  // Interactive Math Forge State
  const [forgeTokens, setForgeTokens] = useState<Array<{ label: string; cardIndex?: number }>>([]);

  // Scratchpad Canvas State
  const [showScratchpad, setShowScratchpad] = useState<boolean>(false);
  const [penColor, setPenColor] = useState<string>('#38bdf8');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  // Timer State
  const [timerSeconds, setTimerSeconds] = useState<number>(60);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Blitz 60s Mode State
  const [showBlitzModal, setShowBlitzModal] = useState<boolean>(false);
  const [blitzTeamIdx, setBlitzTeamIdx] = useState<number>(0);
  const [blitzActive, setBlitzActive] = useState<boolean>(false);
  const [blitzTimeLeft, setBlitzTimeLeft] = useState<number>(60);
  const [blitzQuestion, setBlitzQuestion] = useState<BlitzQuestion | null>(null);
  const [blitzScore, setBlitzScore] = useState<number>(0);
  const [blitzSolved, setBlitzSolved] = useState<number>(0);
  const [blitzCombo, setBlitzCombo] = useState<number>(0);
  const [blitzFinished, setBlitzFinished] = useState<boolean>(false);
  const blitzTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Utility Modals State
  const [showTeamModal, setShowTeamModal] = useState<boolean>(false);
  const [showLoadModal, setShowLoadModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showVictoryModal, setShowVictoryModal] = useState<boolean>(false);
  const [savedSlots, setSavedSlots] = useState<MathSaveSlot[]>([]);

  // Edit Custom Sector Form
  const [editSectorId, setEditSectorId] = useState<string>('');
  const [editQuestion, setEditQuestion] = useState<string>('');
  const [editFormula, setEditFormula] = useState<string>('');
  const [editHint, setEditHint] = useState<string>('');
  const [editExplanation, setEditExplanation] = useState<string>('');
  const [editNumericAnswer, setEditNumericAnswer] = useState<string>('');

  // Load saved data on mount
  useEffect(() => {
    setIsMuted(sounds.isMuted());
    loadSavedSlots();
    try {
      const ovStr = localStorage.getItem('gameszone_math_custom_overrides');
      if (ovStr) setCustomOverrides(JSON.parse(ovStr));

      const activeStr = localStorage.getItem('gameszone_math_active_session');
      if (activeStr) {
        const parsed: MathSession = JSON.parse(activeStr);
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
      const session: MathSession = {
        id: 'math_active',
        name: sessionName,
        kelas: selectedGradeId,
        savedAt: new Date().toISOString(),
        selectedGradeId,
        currentTurn,
        round,
        teams,
        sectorOwners,
        solvedSectorIds,
        logs,
      };
      try {
        localStorage.setItem('gameszone_math_active_session', JSON.stringify(session));
      } catch {}
    }
  }, [sessionName, selectedGradeId, currentTurn, round, teams, sectorOwners, solvedSectorIds, logs]);

  // Keyboard Buzzer Shortcut (1-4) inside challenge modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeSector) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (['1', '2', '3', '4'].includes(e.key) && answerState !== 'correct') {
        const idx = Number(e.key) - 1;
        sounds.playChest();
        setAnsweringTeamIdx(idx);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSector, answerState]);

  // Challenge Timer
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
          if (prev <= 10) sounds.playTick();
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  // Blitz 60s Timer
  useEffect(() => {
    if (blitzActive) {
      blitzTimerRef.current = setInterval(() => {
        setBlitzTimeLeft(prev => {
          if (prev <= 1) {
            if (blitzTimerRef.current) clearInterval(blitzTimerRef.current);
            setBlitzActive(false);
            setBlitzFinished(true);
            sounds.playTimeUp();
            return 0;
          }
          if (prev <= 8) sounds.playTick();
          return prev - 1;
        });
      }, 1000);
    } else if (blitzTimerRef.current) {
      clearInterval(blitzTimerRef.current);
    }
    return () => {
      if (blitzTimerRef.current) clearInterval(blitzTimerRef.current);
    };
  }, [blitzActive]);

  const applySession = (s: MathSession) => {
    setSessionName(s.name || 'Turnamen Benteng Matematika');
    setSelectedGradeId(s.selectedGradeId || 'kelas-7');
    setCurrentTurn(s.currentTurn || 0);
    setRound(s.round || 1);
    setTeams(s.teams);
    setSectorOwners(s.sectorOwners || {});
    setSolvedSectorIds(s.solvedSectorIds || []);
    setLogs(s.logs || []);
  };

  const loadSavedSlots = () => {
    try {
      const str = localStorage.getItem('gameszone_math_save_slots');
      if (str) setSavedSlots(JSON.parse(str));
    } catch {}
  };

  const addLog = (
    teamName: string,
    teamColor: string,
    text: string,
    type: MathLog['type'] = 'info'
  ) => {
    const newLog: MathLog = {
      id: `ml-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      teamName,
      teamColor,
      text,
      type,
    };
    setLogs(prev => [newLog, ...prev].slice(0, 60));
  };

  const currentGradePack =
    MATH_GRADE_PACKS.find(g => g.id === selectedGradeId) || MATH_GRADE_PACKS[0];

  const getEffectiveSector = (sector: MathSectorItem): MathSectorItem => {
    const ov = customOverrides[sector.id];
    return ov ? { ...sector, ...ov } : sector;
  };

  const openChallengeModal = (rawSector: MathSectorItem) => {
    const sector = getEffectiveSector(rawSector);
    sounds.playDiceRoll();
    setActiveSector(sector);
    setAnsweringTeamIdx(currentTurn);
    setDoubleCannonActive(false);
    setEliminatedOptions([]);
    setShowOptions(!sector.numericAnswer || sector.type === 'logic');
    setSelectedOption(null);
    setKeypadValue('');
    setForgeTokens([]);
    setShowHint(false);
    setShowScratchpad(false);
    setAnswerState('pending');
    setTacticalDone(false);
    setTimerSeconds(sector.timeLimit || 60);
    setTimerRunning(true);
  };

  const handleOpenRandomSector = () => {
    const available = currentGradePack.sectors.filter(s => !solvedSectorIds.includes(s.id));
    const pool = available.length > 0 ? available : currentGradePack.sectors;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    openChallengeModal(chosen);
  };

  const handleOpenDynamicChallenge = () => {
    const dyn = generateDynamicMathQuestion(selectedGradeId, 300);
    openChallengeModal(dyn);
  };

  // Scratchpad drawing helpers
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasPoint(e);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasPoint(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleCanvasPointerUp = () => {
    isDrawingRef.current = false;
  };

  const handleClearScratchpad = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Tactical Skills
  const handleUseEliminate = () => {
    if (!activeSector || answerState !== 'pending') return;
    const team = teams[answeringTeamIdx];
    if (!team.skills.eliminate2) return;

    const wrongOptions = activeSector.options.filter(opt => opt !== activeSector.answer);
    const toEliminate = wrongOptions.slice(0, 2);

    sounds.playChest();
    setEliminatedOptions(toEliminate);
    setShowHint(true);
    setShowOptions(true);

    setTeams(prev =>
      prev.map((t, idx) =>
        idx === answeringTeamIdx ? { ...t, skills: { ...t.skills, eliminate2: false } } : t
      )
    );
    addLog(team.name, team.color, 'Mengaktifkan ⚡ Eliminasi Aljabar: 2 pengecoh dihapus & Rumus Petunjuk terbuka!', 'info');
  };

  const handleUseShieldBoost = () => {
    if (!activeSector) return;
    const team = teams[answeringTeamIdx];
    if (!team.skills.shieldBoost) return;

    sounds.playChest();
    setTeams(prev =>
      prev.map((t, idx) =>
        idx === answeringTeamIdx
          ? { ...t, shield: t.shield + 250, skills: { ...t.skills, shieldBoost: false } }
          : t
      )
    );
    addLog(team.name, team.color, 'Mengaktifkan 🛡️ Perisai Fibonacci: +250 Shield Benteng!', 'success');
  };

  const handleUseDoubleCannon = () => {
    if (!activeSector || answerState !== 'pending' || doubleCannonActive) return;
    const team = teams[answeringTeamIdx];
    if (!team.skills.doubleCannon) return;

    sounds.playChest();
    setDoubleCannonActive(true);
    setTeams(prev =>
      prev.map((t, idx) =>
        idx === answeringTeamIdx ? { ...t, skills: { ...t.skills, doubleCannon: false } } : t
      )
    );
    addLog(team.name, team.color, 'Mengisi 🔥 Meriam Kuadrat 2x! Poin & Daya Serang digandakan!', 'attack');
  };

  // Award Victory on Active Sector
  const finalizeCorrectAnswer = (customDetail?: string) => {
    if (!activeSector || answerState === 'correct') return;
    setTimerRunning(false);
    sounds.playCorrect();
    setAnswerState('correct');

    const team = teams[answeringTeamIdx];
    const mult = doubleCannonActive ? 2 : 1;
    const streakBonus = team.streak >= 2 ? 50 : 0;
    const earnedPoints = activeSector.points * mult + streakBonus;

    // Claim sector ownership (unless dynamic DYN)
    let newOwners = { ...sectorOwners };
    if (!activeSector.id.startsWith('dyn-')) {
      newOwners[activeSector.id] = answeringTeamIdx;
      setSectorOwners(newOwners);
      if (!solvedSectorIds.includes(activeSector.id)) {
        setSolvedSectorIds(prev => [...prev, activeSector.id]);
      }
    }

    setTeams(prev =>
      prev.map((t, idx) => {
        const ownedCount = Object.values(newOwners).filter(o => o === idx).length;
        if (idx === answeringTeamIdx) {
          return {
            ...t,
            score: t.score + earnedPoints,
            streak: t.streak + 1,
            sectorsOwned: ownedCount,
          };
        }
        return { ...t, sectorsOwned: ownedCount };
      })
    );

    addLog(
      team.name,
      team.color,
      `Berhasil menaklukkan ${activeSector.sectorCode} (${activeSector.title})! +${earnedPoints} Poin${streakBonus > 0 ? ' (Bonus Streak +50)' : ''}${customDetail ? ` — ${customDetail}` : ''}`,
      'success'
    );
  };

  const handleWrongAnswer = (reasonText: string) => {
    if (!activeSector || answerState === 'correct') return;
    sounds.playWrong();
    setAnswerState('wrong');

    const team = teams[answeringTeamIdx];
    setTeams(prev =>
      prev.map((t, idx) => (idx === answeringTeamIdx ? { ...t, streak: 0 } : t))
    );
    addLog(team.name, team.color, `Kurang tepat (${reasonText}). Regu lain bisa Rebutan (Tekan 1–4)!`, 'danger');
  };

  const handleSelectMcqOption = (opt: string) => {
    if (!activeSector || answerState === 'correct') return;
    setSelectedOption(opt);
    if (opt === activeSector.answer) {
      finalizeCorrectAnswer();
    } else {
      handleWrongAnswer(opt);
    }
  };

  const handleCheckNumericAnswer = () => {
    if (!activeSector || !activeSector.numericAnswer || answerState === 'correct') return;
    const cleanedInput = keypadValue.replace(/\./g, '').replace(/,/g, '').trim();
    const cleanedExpected = activeSector.numericAnswer.replace(/\./g, '').replace(/,/g, '').trim();
    if (!cleanedInput) return;

    if (cleanedInput === cleanedExpected) {
      finalizeCorrectAnswer(`Jawaban Keypad: ${keypadValue}`);
    } else {
      handleWrongAnswer(`Keypad: ${keypadValue}`);
    }
  };

  // Interactive Math Forge Expression Evaluation
  const forgeExprString = forgeTokens.map(t => t.label).join(' ');
  const forgeUsedCardIndices = new Set(
    forgeTokens.filter(t => t.cardIndex !== undefined).map(t => t.cardIndex!)
  );
  const forgeEvalValue = safeEvaluateArithmetic(forgeExprString);
  const isForgeSolved =
    activeSector?.type === 'forge' &&
    activeSector.forgeTarget !== undefined &&
    activeSector.forgeNumbers !== undefined &&
    forgeUsedCardIndices.size === activeSector.forgeNumbers.length &&
    forgeEvalValue !== null &&
    Math.abs(forgeEvalValue - activeSector.forgeTarget) < 0.0001;

  const handleClaimForgeSuccess = () => {
    if (!isForgeSolved) return;
    finalizeCorrectAnswer(`Ekspresi Rakitan: ${forgeExprString} = ${activeSector?.forgeTarget}`);
  };

  // Post-Correct Tactical Action: Attack Opponent OR Fortify Self
  const handleCannonAttack = (targetIdx: number) => {
    if (!activeSector || tacticalDone) return;
    const attacker = teams[answeringTeamIdx];
    const target = teams[targetIdx];
    const dmg = activeSector.cannonDamage * (doubleCannonActive ? 2 : 1);

    sounds.playChest();
    setTacticalDone(true);

    setTeams(prev =>
      prev.map((t, idx) => {
        if (idx !== targetIdx) return t;
        const shieldAbsorb = Math.min(t.shield, dmg);
        const remainingDmg = dmg - shieldAbsorb;
        return {
          ...t,
          shield: t.shield - shieldAbsorb,
          hp: Math.max(0, t.hp - remainingDmg),
        };
      })
    );

    addLog(
      attacker.name,
      attacker.color,
      `⚔️ MENEMBAK Meriam Aljabar (${dmg} DMG) ke benteng ${target.name}!`,
      'attack'
    );
    closeModalAndAdvance();
  };

  const handleFortifyOwn = () => {
    if (!activeSector || tacticalDone) return;
    const team = teams[answeringTeamIdx];
    sounds.playChest();
    setTacticalDone(true);

    setTeams(prev =>
      prev.map((t, idx) =>
        idx === answeringTeamIdx
          ? {
              ...t,
              shield: t.shield + 200,
              hp: Math.min(t.maxHp, t.hp + 150),
            }
          : t
      )
    );

    addLog(team.name, team.color, '🏰 Memperkuat Pertahanan Benteng: +200 Shield & +150 HP!', 'success');
    closeModalAndAdvance();
  };

  const closeModalAndAdvance = () => {
    setTimerRunning(false);
    setActiveSector(null);
    const nextTurn = (currentTurn + 1) % 4;
    setCurrentTurn(nextTurn);
    if (nextTurn === 0) setRound(r => r + 1);
  };

  // Manual Score Adjustment
  const handleManualScore = (e: React.MouseEvent, idx: number, delta: number) => {
    e.stopPropagation();
    setTeams(prev => prev.map((t, i) => (i === idx ? { ...t, score: Math.max(0, t.score + delta) } : t)));
  };

  // Blitz 60s Mode Handlers
  const handleOpenBlitzSetup = () => {
    setBlitzTeamIdx(currentTurn);
    setBlitzActive(false);
    setBlitzFinished(false);
    setBlitzTimeLeft(60);
    setBlitzScore(0);
    setBlitzSolved(0);
    setBlitzCombo(0);
    setBlitzQuestion(null);
    setShowBlitzModal(true);
  };

  const handleStartBlitz = () => {
    sounds.playDiceRoll();
    setBlitzTimeLeft(60);
    setBlitzScore(0);
    setBlitzSolved(0);
    setBlitzCombo(0);
    setBlitzFinished(false);
    setBlitzQuestion(generateBlitzQuestion(selectedGradeId));
    setBlitzActive(true);
  };

  const handleBlitzAnswer = (choice: number) => {
    if (!blitzActive || !blitzQuestion) return;
    if (choice === blitzQuestion.answer) {
      sounds.playCorrect();
      const nextCombo = blitzCombo + 1;
      const pts = 50 + (nextCombo >= 3 ? 25 : 0);
      setBlitzCombo(nextCombo);
      setBlitzSolved(s => s + 1);
      setBlitzScore(sc => sc + pts);
    } else {
      sounds.playWrong();
      setBlitzCombo(0);
    }
    setBlitzQuestion(generateBlitzQuestion(selectedGradeId));
  };

  const handleFinishBlitzClaim = () => {
    const team = teams[blitzTeamIdx];
    const shieldGain = blitzSolved * 30;
    sounds.playVictory();
    setTeams(prev =>
      prev.map((t, idx) =>
        idx === blitzTeamIdx
          ? { ...t, score: t.score + blitzScore, shield: t.shield + shieldGain }
          : t
      )
    );
    addLog(
      team.name,
      team.color,
      `⚡ Menyelesaikan Ronde Kilat 60 Detik (${blitzSolved} soal benar): +${blitzScore} Poin & +${shieldGain} Shield!`,
      'success'
    );
    setShowBlitzModal(false);
  };

  // Save / Load / Export / Reset
  const handleSaveSlot = async () => {
    const { value: title } = await Swal.fire({
      title: 'Simpan Progres Benteng Matematika',
      input: 'text',
      inputLabel: 'Nama Sesi / Kelas (misal: Kelas 8A Pertemuan 1)',
      inputValue: sessionName,
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      cancelButtonText: 'Batal',
    });
    if (!title) return;

    const session: MathSession = {
      id: `math_${Date.now()}`,
      name: title,
      kelas: selectedGradeId,
      savedAt: new Date().toISOString(),
      selectedGradeId,
      currentTurn,
      round,
      teams,
      sectorOwners,
      solvedSectorIds,
      logs,
    };
    const slot: MathSaveSlot = {
      id: session.id,
      name: title,
      date: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
      session,
    };

    const nextSlots = [slot, ...savedSlots.filter(s => s.name !== title)].slice(0, 15);
    setSavedSlots(nextSlots);
    localStorage.setItem('gameszone_math_save_slots', JSON.stringify(nextSlots));
    setSessionName(title);
    Swal.fire('Tersimpan!', `Sesi "${title}" berhasil disimpan.`, 'success');
  };

  const handleExportJson = () => {
    const session: MathSession = {
      id: `math_${Date.now()}`,
      name: sessionName,
      kelas: selectedGradeId,
      savedAt: new Date().toISOString(),
      selectedGradeId,
      currentTurn,
      round,
      teams,
      sectorOwners,
      solvedSectorIds,
      logs,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(session, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `BentengMatematika_${selectedGradeId}_${Date.now()}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(String(ev.target?.result || ''));
        if (parsed && Array.isArray(parsed.teams) && parsed.teams.length === 4) {
          applySession(parsed);
          Swal.fire('Berhasil!', `Sesi "${parsed.name}" dimuat.`, 'success');
        } else {
          throw new Error('Format JSON tidak cocok');
        }
      } catch (err: any) {
        Swal.fire('Error', 'File tidak valid: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleResetGame = () => {
    Swal.fire({
      title: 'Mulai Pertempuran Baru?',
      text: 'Semua skor, kepemilikan sektor, dan HP benteng akan kembali ke awal.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Reset Papan!',
      cancelButtonText: 'Batal',
    }).then(res => {
      if (res.isConfirmed) {
        setTeams(INITIAL_MATH_TEAMS.map(t => ({ ...t, skills: { ...t.skills } })));
        setSectorOwners({});
        setSolvedSectorIds([]);
        setCurrentTurn(0);
        setRound(1);
        setLogs([
          {
            id: `reset-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            teamName: 'Komando Benteng',
            teamColor: '#38bdf8',
            text: 'Arena direset! Semua Benteng kembali 1000 HP & 200 Shield.',
            type: 'system',
          },
        ]);
        Swal.fire('Siap!', 'Arena Benteng Matematika dimulai dari awal.', 'success');
      }
    });
  };

  const handleOpenEditSector = () => {
    const first = getEffectiveSector(currentGradePack.sectors[0]);
    setEditSectorId(first.id);
    setEditQuestion(first.question);
    setEditFormula(first.formulaBadge || '');
    setEditHint(first.hint);
    setEditExplanation(first.explanation);
    setEditNumericAnswer(first.numericAnswer || '');
    setShowEditModal(true);
  };

  const handleSelectEditSector = (sectorId: string) => {
    const raw = currentGradePack.sectors.find(s => s.id === sectorId);
    if (!raw) return;
    const eff = getEffectiveSector(raw);
    setEditSectorId(eff.id);
    setEditQuestion(eff.question);
    setEditFormula(eff.formulaBadge || '');
    setEditHint(eff.hint);
    setEditExplanation(eff.explanation);
    setEditNumericAnswer(eff.numericAnswer || '');
  };

  const handleSaveCustomSector = () => {
    if (!editSectorId) return;
    const nextOverrides = {
      ...customOverrides,
      [editSectorId]: {
        question: editQuestion,
        formulaBadge: editFormula,
        hint: editHint,
        explanation: editExplanation,
        numericAnswer: editNumericAnswer.trim() || undefined,
      },
    };
    setCustomOverrides(nextOverrides);
    localStorage.setItem('gameszone_math_custom_overrides', JSON.stringify(nextOverrides));
    setShowEditModal(false);
    Swal.fire('Tersimpan!', 'Soal kustom guru berhasil disimpan untuk sektor tersebut.', 'success');
  };

  const getChallengeTypeBadge = (type: MathSectorItem['type']) => {
    switch (type) {
      case 'forge':
        return { label: '🎯 Target Angka', color: '#fbbf24' };
      case 'equation':
        return { label: '⚖️ Aljabar', color: '#38bdf8' };
      case 'geometry':
        return { label: '📐 Geometri', color: '#34d399' };
      default:
        return { label: '🧠 Logika', color: '#f472b6' };
    }
  };

  const rankedTeams = [...teams].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.hp + b.shield - (a.hp + a.shield);
  });

  const activeTeam = teams[currentTurn] || teams[0];
  const answeringTeam = teams[answeringTeamIdx] || teams[0];

  const zoomClass =
    zoomLevel === 'xl' ? styles.zoomXl : zoomLevel === 'large' ? styles.zoomLarge : '';

  return (
    <div className={`${isTheater ? styles.theaterOverlay : styles.fortressContainer} ${zoomClass}`}>
      {/* TOP BAR */}
      <div className={styles.topBar}>
        <div className={styles.brandBox}>
          <Link href="/games-zone" className={styles.btnTop} title="Kembali ke Lobby Game's Zone">
            <i className="fas fa-arrow-left"></i> Lobby
          </Link>
          <div className={styles.brandLogo}>
            <i className="fas fa-chess-rook"></i>
          </div>
          <div>
            <h1 className={styles.brandTitle}>BENTENG MATEMATIKA: DUEL TAKTIK</h1>
            <div className={styles.brandSubtitle}>
              <span>{sessionName}</span>
              <span>•</span>
              <span style={{ color: '#67e8f9', fontWeight: 700 }}>Putaran {round}</span>
              <span>•</span>
              <span style={{ color: '#34d399', fontWeight: 700 }}>
                {solvedSectorIds.filter(id => currentGradePack.sectors.some(s => s.id === id)).length}/16 Sektor Dikuasai
              </span>
            </div>
          </div>
        </div>

        <div className={styles.controlsRow}>
          <button
            className={styles.btnTop}
            onClick={() => {
              const next = sounds.toggleMute();
              setIsMuted(next);
            }}
            title="Suara Efek Game"
          >
            <i className={`fas ${isMuted ? 'fa-volume-mute' : 'fa-volume-up'}`} style={{ color: isMuted ? '#ef4444' : '#34d399' }}></i>
          </button>

          <button
            className={styles.btnTop}
            onClick={() =>
              setZoomLevel(prev => (prev === 'normal' ? 'large' : prev === 'large' ? 'xl' : 'normal'))
            }
            title="Ukuran Teks Proyektor"
          >
            <i className="fas fa-search-plus" style={{ color: '#38bdf8' }}></i>
            Zoom: {zoomLevel.toUpperCase()}
          </button>

          <button className={styles.btnTop} onClick={() => setIsTheater(!isTheater)}>
            <i className={`fas ${isTheater ? 'fa-compress' : 'fa-expand'}`} style={{ color: '#fde047' }}></i>
            {isTheater ? 'Keluar Proyektor' : 'Mode Proyektor'}
          </button>

          <button className={styles.btnTop} onClick={() => setShowTeamModal(true)}>
            <i className="fas fa-users-cog" style={{ color: '#a5b4fc' }}></i> Regu
          </button>

          <button className={styles.btnTop} onClick={handleSaveSlot}>
            <i className="fas fa-save" style={{ color: '#10b981' }}></i> Simpan
          </button>

          <button className={styles.btnTop} onClick={() => setShowLoadModal(true)}>
            <i className="fas fa-folder-open" style={{ color: '#38bdf8' }}></i> Muat ({savedSlots.length})
          </button>

          <button className={styles.btnTop} onClick={handleResetGame} style={{ borderColor: 'rgba(239,68,68,0.45)' }}>
            <i className="fas fa-redo" style={{ color: '#f87171' }}></i> Reset
          </button>
        </div>
      </div>

      {/* GRADE DIFFICULTY PACK SELECTOR (KELAS 7 - 8 - 9) */}
      <div className={styles.gradeTabsRow}>
        {MATH_GRADE_PACKS.map(pack => {
          const isSelected = pack.id === selectedGradeId;
          const ownedInPack = pack.sectors.filter(s => solvedSectorIds.includes(s.id)).length;
          return (
            <button
              key={pack.id}
              onClick={() => setSelectedGradeId(pack.id)}
              className={`${styles.gradeTab} ${isSelected ? styles.gradeTabActive : ''}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 900, fontSize: '0.96rem', color: isSelected ? '#ffffff' : '#e2e8f0' }}>
                  {pack.name}
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: isSelected ? pack.accentColor : 'rgba(255,255,255,0.1)',
                    color: isSelected ? '#090d16' : '#cbd5e1',
                  }}
                >
                  {pack.badge} • {ownedInPack}/16
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: isSelected ? '#cbd5e1' : '#94a3b8' }}>
                {pack.subtitle}
              </div>
            </button>
          );
        })}
      </div>

      {/* 4 TEAMS FORTRESS HUD */}
      <div className={styles.teamsHudGrid}>
        {teams.map((team, idx) => {
          const isTurn = idx === currentTurn;
          const hpPercent = Math.round((team.hp / team.maxHp) * 100);
          return (
            <div
              key={team.id}
              onClick={() => setCurrentTurn(idx)}
              className={`${styles.teamFortressCard} ${isTurn ? styles.teamFortressActive : ''}`}
              style={{
                borderColor: isTurn ? team.color : 'rgba(148,163,184,0.25)',
                background: isTurn
                  ? `linear-gradient(155deg, ${team.bgLight}, rgba(15,23,42,0.95))`
                  : undefined,
              }}
              title="Klik untuk memindahkan giliran ke regu ini"
            >
              {isTurn && (
                <div className={styles.turnBadge} style={{ background: team.color }}>
                  GILIRAN AKTIF
                </div>
              )}

              <div className={styles.teamHeaderRow}>
                <div
                  className={styles.teamIconCircle}
                  style={{ background: team.bgLight, color: team.color, border: `1.5px solid ${team.color}` }}
                >
                  <i className={`fas ${team.icon}`}></i>
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className={styles.teamName}>{team.name}</div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'flex', gap: 8 }}>
                    <span>🏰 {team.sectorsOwned} Sektor</span>
                    {team.streak >= 2 && (
                      <span style={{ color: '#fbbf24', fontWeight: 800 }}>🔥 Streak {team.streak}x</span>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.scoreRow}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>SKOR POIN</div>
                  <div className={styles.scoreValue} style={{ color: team.color }}>
                    {team.score}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    className={styles.btnSecondary}
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    onClick={e => handleManualScore(e, idx, -50)}
                  >
                    -50
                  </button>
                  <button
                    className={styles.btnSecondary}
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    onClick={e => handleManualScore(e, idx, 50)}
                  >
                    +50
                  </button>
                </div>
              </div>

              {/* HP & Shield Bars */}
              <div style={{ fontSize: '0.74rem', display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                <span>
                  <i className="fas fa-heart" style={{ color: '#f43f5e', marginRight: 4 }}></i>
                  HP: <b>{team.hp}</b>/{team.maxHp}
                </span>
                <span>
                  <i className="fas fa-shield-alt" style={{ color: '#38bdf8', marginRight: 4 }}></i>
                  Shield: <b>{team.shield}</b>
                </span>
              </div>
              <div className={styles.hpBarTrack}>
                <div
                  className={styles.hpBarFill}
                  style={{
                    width: `${hpPercent}%`,
                    background:
                      hpPercent > 50
                        ? 'linear-gradient(90deg, #10b981, #34d399)'
                        : hpPercent > 25
                          ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                          : 'linear-gradient(90deg, #ef4444, #fb7185)',
                  }}
                />
              </div>

              <div className={styles.skillMiniRow}>
                <div className={`${styles.skillChip} ${!team.skills.eliminate2 ? styles.skillChipUsed : ''}`} title="Eliminasi 2 Pengecoh + Hint">
                  ⚡ Elim
                </div>
                <div className={`${styles.skillChip} ${!team.skills.shieldBoost ? styles.skillChipUsed : ''}`} title="+250 Shield Fibonacci">
                  🛡️ +250
                </div>
                <div className={`${styles.skillChip} ${!team.skills.doubleCannon ? styles.skillChipUsed : ''}`} title="Meriam Kuadrat 2x Poin & DMG">
                  🔥 2x DMG
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MAIN BATTLE GRID */}
      <div className={styles.mainBattleGrid}>
        {/* LEFT: 4x4 TACTICAL SECTOR GRID */}
        <div className={styles.boardPanel}>
          <div className={styles.boardActionHeader}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#ffffff' }}>
                <i className="fas fa-th" style={{ color: '#38bdf8', marginRight: 8 }}></i>
                PETA 16 SEKTOR BENTENG ({currentGradePack.badge.toUpperCase()})
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                Klik salah satu sektor untuk menantang! Sektor yang dikuasai bisa direbut kembali atau ditantang ulang.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className={styles.btnPrimary} onClick={handleOpenRandomSector}>
                <i className="fas fa-dice"></i> Acak Sektor
              </button>
              <button className={styles.btnAmber} onClick={handleOpenDynamicChallenge}>
                <i className="fas fa-magic"></i> Soal Dinamis Baru
              </button>
            </div>
          </div>

          <div className={styles.sectorGrid}>
            {currentGradePack.sectors.map(rawSector => {
              const sector = getEffectiveSector(rawSector);
              const ownerIdx = sectorOwners[sector.id];
              const ownerTeam = ownerIdx !== undefined ? teams[ownerIdx] : null;
              const badge = getChallengeTypeBadge(sector.type);

              return (
                <button
                  key={sector.id}
                  onClick={() => openChallengeModal(sector)}
                  className={`${styles.sectorCard} ${sector.isCriticalTower ? styles.sectorCritical : ''}`}
                  style={
                    ownerTeam
                      ? {
                          borderColor: ownerTeam.color,
                          background: `linear-gradient(145deg, ${ownerTeam.bgLight}, #0f172a)`,
                        }
                      : undefined
                  }
                >
                  <div>
                    <div className={styles.sectorTopMeta}>
                      <span className={styles.sectorCode}>{sector.sectorCode}</span>
                      <span className={styles.sectorPoints}>
                        {sector.isCriticalTower ? '🔥 ' : ''}
                        {sector.points} PT
                      </span>
                    </div>
                    <div className={styles.sectorTitle}>{sector.title}</div>
                    <div className={styles.sectorTopic}>{sector.topic}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: badge.color, marginBottom: 6 }}>
                      {badge.label}
                    </div>
                    <div className={styles.sectorFooter}>
                      <span style={{ color: '#fb7185' }}>⚔️ {sector.cannonDamage} DMG</span>
                      {ownerTeam ? (
                        <span style={{ color: ownerTeam.color, fontWeight: 900 }}>
                          🏰 {ownerTeam.name.replace('Regu ', '')}
                        </span>
                      ) : (
                        <span style={{ color: '#64748b' }}>Belum Dikuasai</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT: COMMAND CENTER & BATTLE LOG */}
        <div className={styles.sidePanel}>
          <div className={styles.commandBox}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', fontWeight: 900, color: '#34d399' }}>
              <i className="fas fa-bolt" style={{ marginRight: 8 }}></i>
              AKSI TAKTIS &amp; MODE SPESIAL
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.45 }}>
              Giliran aktif saat ini: <b style={{ color: activeTeam.color }}>{activeTeam.name}</b>. Gunakan mode kilat atau soal dinamis kapan saja untuk bonus poin!
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <button
                className={styles.btnAmber}
                style={{ width: '100%', padding: '12px' }}
                onClick={handleOpenBlitzSetup}
              >
                <i className="fas fa-stopwatch"></i> ⚡ Ronde Kilat 60 Detik (Math Blitz)
              </button>

              <button
                className={styles.btnPrimary}
                style={{ width: '100%' }}
                onClick={handleOpenDynamicChallenge}
              >
                <i className="fas fa-random"></i> 🎲 Generator Soal Tak Terbatas
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button className={styles.btnSecondary} onClick={handleOpenEditSector}>
                  <i className="fas fa-edit" style={{ color: '#fde047' }}></i> Edit Soal
                </button>
                <button
                  className={styles.btnSecondary}
                  onClick={() => {
                    sounds.playVictory();
                    setShowVictoryModal(true);
                  }}
                >
                  <i className="fas fa-trophy" style={{ color: '#fbbf24' }}></i> Podium Akhir
                </button>
              </div>
            </div>
          </div>

          <div className={styles.logBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900, color: '#f8fafc' }}>
                <i className="fas fa-scroll" style={{ color: '#38bdf8', marginRight: 7 }}></i>
                RIWAYAT PERTEMPURAN
              </h3>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{logs.length} log</span>
            </div>

            <div className={styles.logList}>
              {logs.map(log => (
                <div
                  key={log.id}
                  className={styles.logItem}
                  style={{ borderLeftColor: log.teamColor }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: 2 }}>
                    <b style={{ color: log.teamColor }}>{log.teamName}</b>
                    <span style={{ color: '#64748b' }}>{log.timestamp}</span>
                  </div>
                  <div style={{ color: '#e2e8f0' }}>{log.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* MODAL 1: SECTOR CHALLENGE MODAL (FORGE / KEYPAD / MCQ / CANVAS)   */}
      {/* ================================================================= */}
      {activeSector && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ borderColor: answeringTeam.color }}>
            {/* Modal Top Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span className={styles.sectorCode} style={{ fontSize: '0.9rem', padding: '4px 10px' }}>
                  {activeSector.sectorCode}
                </span>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>
                  {activeSector.title}
                </h2>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fde047', background: 'rgba(250,204,21,0.14)', padding: '4px 10px', borderRadius: 999 }}>
                  {activeSector.points * (doubleCannonActive ? 2 : 1)} POIN • ⚔️ {activeSector.cannonDamage * (doubleCannonActive ? 2 : 1)} DMG
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    background: timerSeconds <= 10 ? 'rgba(239,68,68,0.25)' : 'rgba(15,23,42,0.9)',
                    border: `2px solid ${timerSeconds <= 10 ? '#ef4444' : '#38bdf8'}`,
                    padding: '6px 14px',
                    borderRadius: 12,
                    fontWeight: 900,
                    fontSize: '1.15rem',
                    color: timerSeconds <= 10 ? '#fca5a5' : '#67e8f9',
                  }}
                >
                  ⏱️ {timerSeconds}d
                </div>
                <button className={styles.btnSecondary} onClick={() => setTimerRunning(r => !r)} title="Play/Pause Timer">
                  <i className={`fas ${timerRunning ? 'fa-pause' : 'fa-play'}`}></i>
                </button>
                <button className={styles.btnSecondary} onClick={() => setTimerSeconds(s => s + 15)} title="+15 Detik">
                  +15d
                </button>
                <button className={styles.btnDanger} onClick={() => { setTimerRunning(false); setActiveSector(null); }}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            {/* Answering Team Selector + Buzzer Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14, background: 'rgba(2,6,23,0.55)', padding: '10px 14px', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Regu Penjawab (atau tekan 1–4):</span>
                {teams.map((t, idx) => (
                  <button
                    key={t.id}
                    disabled={answerState === 'correct'}
                    onClick={() => {
                      sounds.playChest();
                      setAnsweringTeamIdx(idx);
                    }}
                    style={{
                      background: idx === answeringTeamIdx ? t.color : '#1e293b',
                      color: idx === answeringTeamIdx ? '#090d16' : '#cbd5e1',
                      border: `1.5px solid ${t.color}`,
                      padding: '5px 11px',
                      borderRadius: 9,
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                    }}
                  >
                    [{idx + 1}] {t.name.replace('Regu ', '')}
                  </button>
                ))}
              </div>

              {/* Jurus Taktis */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  className={styles.btnSecondary}
                  disabled={!answeringTeam.skills.eliminate2 || answerState !== 'pending'}
                  onClick={handleUseEliminate}
                  style={{ opacity: answeringTeam.skills.eliminate2 ? 1 : 0.4, fontSize: '0.76rem' }}
                >
                  ⚡ Eliminasi 2
                </button>
                <button
                  className={styles.btnSecondary}
                  disabled={!answeringTeam.skills.shieldBoost}
                  onClick={handleUseShieldBoost}
                  style={{ opacity: answeringTeam.skills.shieldBoost ? 1 : 0.4, fontSize: '0.76rem' }}
                >
                  🛡️ +250 Shield
                </button>
                <button
                  className={styles.btnSecondary}
                  disabled={!answeringTeam.skills.doubleCannon || doubleCannonActive || answerState !== 'pending'}
                  onClick={handleUseDoubleCannon}
                  style={{ opacity: answeringTeam.skills.doubleCannon && !doubleCannonActive ? 1 : 0.4, fontSize: '0.76rem' }}
                >
                  🔥 2x Poin &amp; DMG
                </button>
              </div>
            </div>

            {activeSector.formulaBadge && (
              <div className={styles.formulaBanner}>{activeSector.formulaBadge}</div>
            )}

            <div className={styles.questionText}>{activeSector.question}</div>

            {/* Interactive Math Forge (when type === 'forge') */}
            {activeSector.type === 'forge' && activeSector.forgeNumbers && (
              <div className={styles.forgeBox}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fbbf24', marginBottom: 8 }}>
                  <i className="fas fa-hammer" style={{ marginRight: 6 }}></i>
                  MEJA TEMPA ANGKA INTERAKTIF (Rakit seluruh kartu untuk mencapai Target = {activeSector.forgeTarget})
                </div>
                <div className={styles.forgeDisplay}>
                  <span style={{ color: '#e2e8f0' }}>{forgeExprString || 'Klik kartu angka & operator...'}</span>
                  <span style={{ color: isForgeSolved ? '#34d399' : '#38bdf8' }}>
                    = {forgeEvalValue !== null ? forgeEvalValue : '?'}
                  </span>
                </div>
                <div className={styles.forgeBtnGrid}>
                  {activeSector.forgeNumbers.map((num, idx) => (
                    <button
                      key={idx}
                      className={styles.forgeCardBtn}
                      disabled={forgeUsedCardIndices.has(idx) || answerState === 'correct'}
                      onClick={() => setForgeTokens(prev => [...prev, { label: String(num), cardIndex: idx }])}
                    >
                      {num}
                    </button>
                  ))}
                  {['+', '−', '×', '÷', '(', ')'].map(op => (
                    <button
                      key={op}
                      className={styles.forgeOpBtn}
                      disabled={answerState === 'correct'}
                      onClick={() => setForgeTokens(prev => [...prev, { label: op }])}
                    >
                      {op}
                    </button>
                  ))}
                  <button
                    className={styles.btnSecondary}
                    onClick={() => setForgeTokens(prev => prev.slice(0, -1))}
                    disabled={forgeTokens.length === 0 || answerState === 'correct'}
                  >
                    ⌫
                  </button>
                  <button
                    className={styles.btnDanger}
                    onClick={() => setForgeTokens([])}
                    disabled={forgeTokens.length === 0 || answerState === 'correct'}
                  >
                    Bersihkan
                  </button>
                  {isForgeSolved && answerState !== 'correct' && (
                    <button className={styles.fortifyBtn} onClick={handleClaimForgeSuccess}>
                      ✅ Target {activeSector.forgeTarget} Tercapai! Klaim Benar
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Toggleable Tools: Hint, Scratchpad, Show ABCD */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <button className={styles.btnSecondary} onClick={() => setShowHint(h => !h)}>
                <i className="fas fa-lightbulb" style={{ color: '#fde047' }}></i>
                {showHint ? 'Tutup Rumus Petunjuk' : 'Buka Rumus Petunjuk'}
              </button>
              <button className={styles.btnSecondary} onClick={() => setShowScratchpad(s => !s)}>
                <i className="fas fa-pen-fancy" style={{ color: '#38bdf8' }}></i>
                {showScratchpad ? 'Tutup Papan Coretan' : 'Papan Cakar-Cakaran'}
              </button>
              {!showOptions && (
                <button className={styles.btnPrimary} onClick={() => setShowOptions(true)}>
                  <i className="fas fa-list-ul"></i> Buka Pilihan A-B-C-D
                </button>
              )}
            </div>

            {showHint && (
              <div style={{ background: 'rgba(250,204,21,0.12)', border: '1px solid rgba(250,204,21,0.45)', borderRadius: 12, padding: '10px 14px', marginBottom: 14, fontSize: '0.92rem', color: '#fef08a' }}>
                <b>💡 Petunjuk Rumus:</b> {activeSector.hint}
              </div>
            )}

            {/* Digital Scratchpad Canvas */}
            {showScratchpad && (
              <div className={styles.scratchpadWrapper}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#38bdf8' }}>
                    ✏️ PAPAN CORETAN HITUNGAN PROYEKTOR
                  </span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {['#38bdf8', '#fde047', '#34d399', '#ffffff'].map(c => (
                      <button
                        key={c}
                        onClick={() => setPenColor(c)}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: c,
                          border: penColor === c ? '3px solid #f43f5e' : '1px solid #64748b',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                    <button className={styles.btnDanger} style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={handleClearScratchpad}>
                      Hapus Coretan
                    </button>
                  </div>
                </div>
                <canvas
                  ref={canvasRef}
                  width={820}
                  height={190}
                  className={styles.scratchpadCanvas}
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp}
                  onPointerLeave={handleCanvasPointerUp}
                />
              </div>
            )}

            {/* Virtual Numeric Keypad Mode (before revealing A-B-C-D) */}
            {activeSector.numericAnswer && !showOptions && answerState !== 'correct' && (
              <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #334155', borderRadius: 14, padding: 14, marginBottom: 14 }}>
                <div style={{ textAlign: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 6 }}>
                    MODE JAWAB LANGSUNG (KETIK / KLIK ANGKA TANPA SPOILER PILIHAN GANDA)
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, fontFamily: 'monospace', color: '#38bdf8', background: '#020617', borderRadius: 10, padding: '8px 14px', maxWidth: 320, margin: '0 auto', border: '1.5px solid #38bdf8' }}>
                    {keypadValue || '___'}
                  </div>
                </div>
                <div className={styles.keypadGrid}>
                  {['7', '8', '9', '⌫', '4', '5', '6', '−', '1', '2', '3', 'C'].map(k => (
                    <button
                      key={k}
                      className={styles.keypadBtn}
                      onClick={() => {
                        if (k === '⌫') setKeypadValue(v => v.slice(0, -1));
                        else if (k === 'C') setKeypadValue('');
                        else if (k === '−') setKeypadValue(v => (v.startsWith('-') ? v.slice(1) : '-' + v));
                        else setKeypadValue(v => v + k);
                      }}
                    >
                      {k}
                    </button>
                  ))}
                  <button className={styles.keypadBtn} onClick={() => setKeypadValue(v => v + '0')} style={{ gridColumn: 'span 2' }}>
                    0
                  </button>
                  <button className={styles.btnPrimary} onClick={handleCheckNumericAnswer} style={{ gridColumn: 'span 2' }}>
                    ✅ Cek Jawaban
                  </button>
                </div>
              </div>
            )}

            {/* MCQ Options A-B-C-D */}
            {showOptions && (
              <div className={styles.optionsGrid}>
                {activeSector.options.map((opt, idx) => {
                  const isEliminated = eliminatedOptions.includes(opt);
                  const isCorrectOpt = answerState !== 'pending' && opt === activeSector.answer;
                  const isSelectedWrong = selectedOption === opt && opt !== activeSector.answer;
                  return (
                    <button
                      key={idx}
                      disabled={isEliminated || answerState === 'correct'}
                      onClick={() => handleSelectMcqOption(opt)}
                      className={`${styles.optionBtn} ${isEliminated ? styles.optionEliminated : ''} ${
                        isCorrectOpt ? styles.optionCorrect : ''
                      } ${isSelectedWrong ? styles.optionWrong : ''}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Wrong Feedback */}
            {answerState === 'wrong' && (
              <div style={{ background: 'rgba(239,68,68,0.16)', border: '1px solid #ef4444', borderRadius: 12, padding: '12px 14px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <span style={{ color: '#fecaca', fontWeight: 700 }}>
                  ❌ Kurang tepat! Klik nama regu di atas (atau tekan tombol <b>1, 2, 3, 4</b>) untuk Lempar Rebutan ke regu lain.
                </span>
                <button
                  className={styles.btnSecondary}
                  onClick={() => {
                    setTimerRunning(false);
                    setAnswerState('correct');
                    setTacticalDone(true);
                  }}
                >
                  Lihat Pembahasan &amp; Tutup
                </button>
              </div>
            )}

            {/* Correct Answer + Explanation + Tactical Attack/Fortify Picker */}
            {answerState === 'correct' && (
              <div className={styles.tacticalActionBox}>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#6ee7b7', marginBottom: 6 }}>
                  ✅ JAWABAN TEPAT! ({activeSector.answer})
                </div>
                <div style={{ fontSize: '0.92rem', color: '#e2e8f0', lineHeight: 1.5, marginBottom: 14 }}>
                  <b>Pembahasan:</b> {activeSector.explanation}
                </div>

                {!tacticalDone ? (
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fde047', marginBottom: 8 }}>
                      🎯 PILIH AKSI TAKTIS UNTUK {answeringTeam.name.toUpperCase()}:
                    </div>
                    <div className={styles.attackTargetGrid}>
                      {teams.map((opp, idx) => {
                        if (idx === answeringTeamIdx) return null;
                        const dmg = activeSector.cannonDamage * (doubleCannonActive ? 2 : 1);
                        return (
                          <button
                            key={opp.id}
                            className={styles.attackTargetBtn}
                            onClick={() => handleCannonAttack(idx)}
                          >
                            <div style={{ fontWeight: 900, color: opp.color, marginBottom: 3 }}>
                              ⚔️ Tembak {opp.name.replace('Regu ', '')}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#fda4af' }}>
                              -{dmg} DMG (HP: {opp.hp}, Shield: {opp.shield})
                            </div>
                          </button>
                        );
                      })}

                      <button className={styles.fortifyBtn} onClick={handleFortifyOwn}>
                        🏰 Perkuat Benteng Sendiri (+200 Shield, +150 HP)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'right' }}>
                    <button className={styles.btnPrimary} onClick={closeModalAndAdvance}>
                      Lanjut Giliran Berikutnya <i className="fas fa-arrow-right"></i>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 2: RONDE KILAT 60 DETIK (MATH BLITZ MODE)                   */}
      {/* ================================================================= */}
      {showBlitzModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: 680, borderColor: '#f59e0b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, color: '#fde047', fontSize: '1.3rem', fontWeight: 900 }}>
                <i className="fas fa-bolt" style={{ marginRight: 8 }}></i>
                RONDE KILAT 60 DETIK ({currentGradePack.badge.toUpperCase()})
              </h2>
              <button className={styles.btnDanger} onClick={() => { setBlitzActive(false); setShowBlitzModal(false); }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            {!blitzActive && !blitzFinished && (
              <div>
                <p style={{ color: '#cbd5e1', fontSize: '0.94rem', lineHeight: 1.5 }}>
                  Pilih 1 regu untuk menjawab soal hitung cepat otomatis sebanyak-banyaknya dalam <b>60 detik</b>! Setiap jawaban benar bernilai <b>+50 poin</b> (Kombo 3+ bernilai <b>+75 poin</b>) plus bonus <b>+30 Shield</b> per soal benar.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, margin: '16px 0' }}>
                  {teams.map((t, idx) => (
                    <button
                      key={t.id}
                      onClick={() => setBlitzTeamIdx(idx)}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        border: `2px solid ${t.color}`,
                        background: blitzTeamIdx === idx ? t.bgLight : '#0f172a',
                        color: '#ffffff',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
                <button className={styles.btnAmber} style={{ width: '100%', padding: 14, fontSize: '1.05rem' }} onClick={handleStartBlitz}>
                  <i className="fas fa-play"></i> MULAI HITUNG MUNDUR 60 DETIK!
                </button>
              </div>
            )}

            {blitzActive && blitzQuestion && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, background: '#020617', padding: '12px 16px', borderRadius: 12 }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Regu: </span>
                    <b style={{ color: teams[blitzTeamIdx].color }}>{teams[blitzTeamIdx].name}</b>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: blitzTimeLeft <= 10 ? '#ef4444' : '#fde047' }}>
                    ⏱️ {blitzTimeLeft}d
                  </div>
                  <div style={{ fontWeight: 900, color: '#34d399' }}>
                    +{blitzScore} POIN ({blitzSolved} Benar)
                  </div>
                </div>

                <div className={styles.questionText} style={{ textAlign: 'center', fontSize: '1.65rem' }}>
                  {blitzQuestion.prompt}
                </div>

                <div className={styles.optionsGrid}>
                  {blitzQuestion.choices.map((ch, idx) => (
                    <button
                      key={idx}
                      className={styles.optionBtn}
                      style={{ textAlign: 'center', fontSize: '1.35rem', fontWeight: 900 }}
                      onClick={() => handleBlitzAnswer(ch)}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {blitzFinished && (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: '2.6rem', marginBottom: 8 }}>⚡🏆⚡</div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', color: '#34d399' }}>
                  WAKTU HABIS! HASIL {teams[blitzTeamIdx].name.toUpperCase()}
                </h3>
                <p style={{ color: '#e2e8f0', fontSize: '1.05rem', marginBottom: 18 }}>
                  Berhasil memecahkan <b>{blitzSolved} soal</b> cepat! Mendapat <b>+{blitzScore} Poin</b> dan <b>+{blitzSolved * 30} Shield Benteng</b>.
                </p>
                <button className={styles.btnPrimary} style={{ padding: '12px 24px', fontSize: '1rem' }} onClick={handleFinishBlitzClaim}>
                  ✅ Klaim Poin &amp; Shield ke Benteng!
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 3: KELOLA NAMA REGU                                         */}
      {/* ================================================================= */}
      {showTeamModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>⚙️ Pengaturan Sesi &amp; Nama Regu</h3>
              <button className={styles.btnSecondary} onClick={() => setShowTeamModal(false)}>
                Tutup
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>Judul Turnamen</label>
                <input className={styles.inputDark} value={sessionName} onChange={e => setSessionName(e.target.value)} />
              </div>
              {teams.map((t, idx) => (
                <div key={t.id}>
                  <label style={{ fontSize: '0.82rem', color: t.color, fontWeight: 800, display: 'block', marginBottom: 4 }}>
                    Regu {idx + 1}
                  </label>
                  <input
                    className={styles.inputDark}
                    value={t.name}
                    onChange={e => {
                      const val = e.target.value;
                      setTeams(prev => prev.map((item, i) => (i === idx ? { ...item, name: val } : item)));
                    }}
                  />
                </div>
              ))}
              <button className={styles.btnPrimary} onClick={() => setShowTeamModal(false)}>
                Simpan Pengaturan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 4: SESI TERSIMPAN + EXPORT/IMPORT                           */}
      {/* ================================================================= */}
      {showLoadModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: 640 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>💾 Sesi Benteng Matematika Tersimpan</h3>
              <button className={styles.btnSecondary} onClick={() => setShowLoadModal(false)}>
                Tutup
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <button className={styles.btnPrimary} onClick={handleExportJson}>
                <i className="fas fa-download"></i> Export File JSON
              </button>
              <label className={styles.btnSecondary} style={{ cursor: 'pointer' }}>
                <i className="fas fa-upload"></i> Import File JSON
                <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportJson} />
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
              {savedSlots.length > 0 ? (
                savedSlots.map(slot => (
                  <div
                    key={slot.id}
                    style={{
                      background: '#020617',
                      border: '1px solid #334155',
                      borderRadius: 12,
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800 }}>{slot.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        {slot.date} • {slot.session.selectedGradeId.toUpperCase()} • Putaran {slot.session.round}
                      </div>
                    </div>
                    <button
                      className={styles.btnPrimary}
                      onClick={() => {
                        applySession(slot.session);
                        setShowLoadModal(false);
                        Swal.fire('Dimuat!', `Sesi "${slot.name}" aktif kembali.`, 'success');
                      }}
                    >
                      Muat Sesi
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                  Belum ada sesi tersimpan. Klik tombol &quot;Simpan&quot; di bar atas untuk menyimpan progres kelas.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 5: EDIT SOAL KUSTOM GURU                                    */}
      {/* ================================================================= */}
      {showEditModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: 660 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>✏️ Kustomisasi Soal Sektor ({currentGradePack.badge})</h3>
              <button className={styles.btnSecondary} onClick={() => setShowEditModal(false)}>
                Tutup
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>Pilih Sektor</label>
                <select
                  className={styles.inputDark}
                  value={editSectorId}
                  onChange={e => handleSelectEditSector(e.target.value)}
                >
                  {currentGradePack.sectors.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.sectorCode} — {s.title} ({s.topic})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>Ringkasan Rumus / Badge</label>
                <input className={styles.inputDark} value={editFormula} onChange={e => setEditFormula(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>Teks Soal Matematika</label>
                <textarea rows={3} className={styles.inputDark} value={editQuestion} onChange={e => setEditQuestion(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>Jawaban Angka Pasti (Opsional Keypad)</label>
                  <input className={styles.inputDark} value={editNumericAnswer} onChange={e => setEditNumericAnswer(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>Petunjuk Rumus</label>
                  <input className={styles.inputDark} value={editHint} onChange={e => setEditHint(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>Pembahasan</label>
                <textarea rows={2} className={styles.inputDark} value={editExplanation} onChange={e => setEditExplanation(e.target.value)} />
              </div>
              <button className={styles.btnPrimary} onClick={handleSaveCustomSector}>
                <i className="fas fa-save"></i> Simpan Soal Kustom
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 6: PODIUM JUARA BENTENG MATEMATIKA                          */}
      {/* ================================================================= */}
      {showVictoryModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: 640, textAlign: 'center', borderColor: '#fbbf24' }}>
            <div style={{ fontSize: '3.2rem', marginBottom: 8 }}>🏆🏰🏆</div>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '1.65rem', color: '#fde047', fontWeight: 900 }}>
              KLASEMEN AKHIR BENTENG MATEMATIKA
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: 20 }}>
              Pemenang ditentukan dari perolehan Skor Poin tertinggi dan ketahanan Benteng!
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', marginBottom: 20 }}>
              {rankedTeams.map((t, rank) => (
                <div
                  key={t.id}
                  style={{
                    background: rank === 0 ? `linear-gradient(90deg, ${t.bgLight}, #0f172a)` : '#020617',
                    border: `2px solid ${rank === 0 ? '#fbbf24' : t.color}`,
                    borderRadius: 14,
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '1.35rem', fontWeight: 900, color: rank === 0 ? '#fde047' : '#94a3b8' }}>
                      #{rank + 1}
                    </span>
                    <div>
                      <div style={{ fontWeight: 900, color: t.color, fontSize: '1.05rem' }}>{t.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        🏰 {t.sectorsOwned} Sektor • ❤️ {t.hp} HP • 🛡️ {t.shield} Shield
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ffffff' }}>{t.score} PT</div>
                </div>
              ))}
            </div>

            <button className={styles.btnPrimary} onClick={() => setShowVictoryModal(false)}>
              Tutup Podium
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
