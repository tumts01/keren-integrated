'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from './galaxyMath.module.css';
import MathVisualDiagram from './MathVisualDiagram';
import {
  GalaxyGradeId,
  GalaxyTeam,
  GalaxyMissionItem,
  GalaxyLog,
  GalaxySession,
  GalaxySaveSlot,
  INITIAL_GALAXY_TEAMS,
  GALAXY_GRADE_PACKS,
  generateDynamicVisualMission,
} from './galaxyMathData';
import { sounds } from '../sound';
import Swal from 'sweetalert2';

interface Projectile {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  cx: number;
  cy: number;
  progress: number;
  speed: number;
  color: string;
  targetIdx: number | 'meteor';
  impactText: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

const SHIP_COORDS: Array<{ x: number; y: number; facing: 1 | -1 }> = [
  { x: 120, y: 86, facing: 1 },
  { x: 120, y: 234, facing: 1 },
  { x: 800, y: 86, facing: -1 },
  { x: 800, y: 234, facing: -1 },
];
const METEOR_POS = { x: 460, y: 160 };

export default function GalaksiMatematikaPage() {
  // Core Session State
  const [sessionName, setSessionName] = useState('Misi Galaksi Matematika MTs (Kelas 7–9)');
  const [selectedGradeId, setSelectedGradeId] = useState<GalaxyGradeId>('kelas-7');
  const [currentTurn, setCurrentTurn] = useState<number>(0);
  const [round, setRound] = useState<number>(1);
  const [teams, setTeams] = useState<GalaxyTeam[]>(INITIAL_GALAXY_TEAMS);
  const [solvedMissionIds, setSolvedMissionIds] = useState<string[]>([]);
  const [logs, setLogs] = useState<GalaxyLog[]>([
    {
      id: 'init-glog',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      teamName: 'Pusat Radar Galaksi',
      teamColor: '#38bdf8',
      text: 'Empat Kapal Induk Matematika mengorbit! Selesaikan misi hologram visual untuk menembakkan Meriam Laser!',
      type: 'system',
    },
  ]);

  // Display Controls
  const [isTheater, setIsTheater] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<'normal' | 'large' | 'xl'>('normal');

  // Active Visual Mission Modal State
  const [activeMission, setActiveMission] = useState<GalaxyMissionItem | null>(null);
  const [answeringTeamIdx, setAnsweringTeamIdx] = useState<number>(0);
  const [nova2xActive, setNova2xActive] = useState<boolean>(false);
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [keypadValue, setKeypadValue] = useState<string>('');
  const [showHint, setShowHint] = useState<boolean>(false);
  const [answerState, setAnswerState] = useState<'pending' | 'correct' | 'wrong'>('pending');
  const [tacticalDone, setTacticalDone] = useState<boolean>(false);

  // Countdown Timer
  const [timerSeconds, setTimerSeconds] = useState<number>(60);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Interactive Trajectory Aiming Simulator State
  const [showAimModal, setShowAimModal] = useState<boolean>(false);
  const [aimMode, setAimMode] = useState<'linear' | 'parabola'>('linear');
  const [aimTarget, setAimTarget] = useState<{ x: number; y: number }>({ x: 6, y: 6 });
  const [sliderM, setSliderM] = useState<number>(1);
  const [sliderC, setSliderC] = useState<number>(0);
  const [aimFeedback, setAimFeedback] = useState<string>('');
  const [aimShotProgress, setAimShotProgress] = useState<number | null>(null);
  const aimCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Utility Modals
  const [showTeamModal, setShowTeamModal] = useState<boolean>(false);
  const [showLoadModal, setShowLoadModal] = useState<boolean>(false);
  const [showVictoryModal, setShowVictoryModal] = useState<boolean>(false);
  const [savedSlots, setSavedSlots] = useState<GalaxySaveSlot[]>([]);

  // 60 FPS Canvas Refs
  const spaceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const teamsRef = useRef<GalaxyTeam[]>(teams);
  const currentTurnRef = useRef<number>(currentTurn);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const shakeFramesRef = useRef<number>(0);
  const hitFlashRef = useRef<Record<string, number>>({});

  useEffect(() => {
    teamsRef.current = teams;
  }, [teams]);

  useEffect(() => {
    currentTurnRef.current = currentTurn;
  }, [currentTurn]);

  // Load saved session & slots
  useEffect(() => {
    setIsMuted(sounds.isMuted());
    loadSavedSlots();
    try {
      const str = localStorage.getItem('gameszone_galaxy_active_session');
      if (str) {
        const parsed: GalaxySession = JSON.parse(str);
        if (parsed && Array.isArray(parsed.teams) && parsed.teams.length === 4) {
          applySession(parsed);
        }
      }
    } catch {}
  }, []);

  // Auto-save active session
  useEffect(() => {
    if (teams && teams.length === 4) {
      const session: GalaxySession = {
        id: 'galaxy_active',
        name: sessionName,
        savedAt: new Date().toISOString(),
        selectedGradeId,
        currentTurn,
        round,
        teams,
        solvedMissionIds,
        logs,
      };
      try {
        localStorage.setItem('gameszone_galaxy_active_session', JSON.stringify(session));
      } catch {}
    }
  }, [sessionName, selectedGradeId, currentTurn, round, teams, solvedMissionIds, logs]);

  // Trigger Animated Laser / Plasma Shot on 60 FPS Space Canvas
  const triggerCanvasLaserStrike = (
    fromTeamIdx: number,
    targetIdxOrMeteor: number | 'meteor',
    impactText: string,
    colorOverride?: string
  ) => {
    const src = SHIP_COORDS[fromTeamIdx] || SHIP_COORDS[0];
    const dst = targetIdxOrMeteor === 'meteor' ? METEOR_POS : SHIP_COORDS[targetIdxOrMeteor];
    const teamColor = colorOverride || teamsRef.current[fromTeamIdx]?.color || '#38bdf8';

    // Control point creates a crisp sweeping parabolic arc across the canvas
    const midX = (src.x + dst.x) / 2;
    const midY = Math.min(src.y, dst.y) - 65;

    projectilesRef.current.push({
      sx: src.x,
      sy: src.y,
      tx: dst.x,
      ty: dst.y,
      cx: midX,
      cy: midY,
      progress: 0,
      speed: 0.028,
      color: teamColor,
      targetIdx: targetIdxOrMeteor,
      impactText,
    });
  };

  // 60 FPS Main Space Battle Canvas Loop
  useEffect(() => {
    const canvas = spaceCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const stars = Array.from({ length: 75 }, () => ({
      x: Math.random() * 920,
      y: Math.random() * 320,
      r: Math.random() * 1.8 + 0.5,
      speed: Math.random() * 0.45 + 0.15,
      alpha: Math.random() * 0.6 + 0.3,
    }));

    let animId = 0;
    let frame = 0;

    const drawShip = (
      x: number,
      y: number,
      facing: 1 | -1,
      team: GalaxyTeam,
      idx: number,
      isActive: boolean
    ) => {
      const hoverY = Math.sin(frame * 0.05 + idx * 1.6) * 5;
      const sx = x;
      const sy = y + hoverY;
      const isFlashing = (hitFlashRef.current[String(idx)] || 0) > 0;

      ctx.save();
      ctx.translate(sx, sy);

      // Active turn rotating target lock ring
      if (isActive) {
        ctx.save();
        ctx.rotate(frame * 0.025);
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, 44, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Glowing Shield Bubble
      if (team.shield > 0) {
        ctx.strokeStyle = isFlashing ? '#ef4444' : team.color;
        ctx.globalAlpha = isFlashing ? 0.85 : 0.32 + Math.sin(frame * 0.08 + idx) * 0.1;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 36, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Thruster flame animation
      const flameLen = 14 + Math.sin(frame * 0.45 + idx) * 6;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(-facing * 24, -6);
      ctx.lineTo(-facing * (24 + flameLen), 0);
      ctx.lineTo(-facing * 24, 6);
      ctx.closePath();
      ctx.fill();

      // Ship hull
      ctx.shadowBlur = 14;
      ctx.shadowColor = isFlashing ? '#ffffff' : team.color;
      ctx.fillStyle = isFlashing ? '#ffffff' : team.color;
      ctx.beginPath();
      ctx.moveTo(facing * 32, 0);
      ctx.lineTo(-facing * 18, -19);
      ctx.lineTo(-facing * 11, -7);
      ctx.lineTo(-facing * 24, 0);
      ctx.lineTo(-facing * 11, 7);
      ctx.lineTo(-facing * 18, 19);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Cockpit visor
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(facing * 6, 0, 9, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Nameplate & mini HP bar above ship
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(team.name.replace('Skuad ', ''), 0, -28);

      // Mini HP Track
      const hpRatio = Math.max(0, Math.min(1, team.hp / team.maxHp));
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(-30, 26, 60, 5);
      ctx.fillStyle = hpRatio > 0.5 ? '#10b981' : hpRatio > 0.25 ? '#f59e0b' : '#ef4444';
      ctx.fillRect(-30, 26, 60 * hpRatio, 5);

      ctx.restore();
    };

    const drawCenterMeteor = () => {
      const mx = METEOR_POS.x;
      const my = METEOR_POS.y + Math.sin(frame * 0.04) * 4;
      const flash = (hitFlashRef.current['meteor'] || 0) > 0;

      ctx.save();
      ctx.translate(mx, my);

      // Radar rings around meteor
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 54 + Math.sin(frame * 0.05) * 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.rotate(frame * 0.009);
      ctx.fillStyle = flash ? '#fef08a' : '#334155';
      ctx.strokeStyle = flash ? '#ffffff' : '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#f59e0b';

      const pts = 9;
      ctx.beginPath();
      for (let i = 0; i < pts; i++) {
        const ang = (i / pts) * Math.PI * 2;
        const rad = i % 2 === 0 ? 32 : 24;
        const px = Math.cos(ang) * rad;
        const py = Math.sin(ang) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.restore();

      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fde047';
      ctx.fillText('METEOR TARGET INTI', mx, my + 48);
    };

    const renderLoop = () => {
      frame++;
      ctx.save();

      // Subtle screen shake on impact
      if (shakeFramesRef.current > 0) {
        shakeFramesRef.current--;
        const mag = shakeFramesRef.current * 0.55;
        ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
      }

      // Deep Space Background
      ctx.fillStyle = '#030816';
      ctx.fillRect(0, 0, 920, 320);

      // Radar grid lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.07)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx <= 920; gx += 46) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, 320);
        ctx.stroke();
      }
      for (let gy = 0; gy <= 320; gy += 40) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(920, gy);
        ctx.stroke();
      }

      // Parallax Moving Stars
      for (const s of stars) {
        s.x -= s.speed;
        if (s.x < 0) s.x = 920;
        ctx.fillStyle = `rgba(226, 232, 240, ${s.alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Decay hit flashes
      Object.keys(hitFlashRef.current).forEach(k => {
        if (hitFlashRef.current[k] > 0) hitFlashRef.current[k]--;
      });

      // Draw Center Target & 4 Ships
      drawCenterMeteor();
      teamsRef.current.forEach((team, idx) => {
        const pos = SHIP_COORDS[idx];
        drawShip(pos.x, pos.y, pos.facing, team, idx, idx === currentTurnRef.current);
      });

      // Update & Draw Projectiles along Quadratic Bezier Curves
      const activeProjs: Projectile[] = [];
      for (const p of projectilesRef.current) {
        p.progress += p.speed;
        const t = Math.min(1, p.progress);
        const inv = 1 - t;
        const px = inv * inv * p.sx + 2 * inv * t * p.cx + t * t * p.tx;
        const py = inv * inv * p.sy + 2 * inv * t * p.cy + t * t * p.ty;

        // Spawn trail particle
        particlesRef.current.push({
          x: px,
          y: py,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2,
          life: 16,
          maxLife: 16,
          size: 3.2,
          color: p.color,
        });

        // Draw plasma orb head
        ctx.save();
        ctx.shadowBlur = 16;
        ctx.shadowColor = p.color;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (p.progress >= 1) {
          // Impact Explosion!
          shakeFramesRef.current = 12;
          hitFlashRef.current[String(p.targetIdx)] = 16;
          shockwavesRef.current.push({
            x: p.tx,
            y: p.ty,
            radius: 6,
            maxRadius: 72,
            color: p.color,
            alpha: 1,
          });
          for (let i = 0; i < 28; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = Math.random() * 4.2 + 1.2;
            particlesRef.current.push({
              x: p.tx,
              y: p.ty,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              life: 28 + Math.random() * 14,
              maxLife: 42,
              size: Math.random() * 3.5 + 1.5,
              color: i % 2 === 0 ? p.color : '#fde047',
            });
          }
          floatingTextsRef.current.push({
            x: p.tx,
            y: p.ty - 24,
            text: p.impactText,
            color: '#fde047',
            life: 65,
          });
        } else {
          activeProjs.push(p);
        }
      }
      projectilesRef.current = activeProjs;

      // Update & Draw Shockwaves
      const nextWaves: Shockwave[] = [];
      for (const w of shockwavesRef.current) {
        w.radius += 3.2;
        w.alpha = Math.max(0, 1 - w.radius / w.maxRadius);
        ctx.save();
        ctx.globalAlpha = w.alpha;
        ctx.strokeStyle = w.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        if (w.radius < w.maxRadius) nextWaves.push(w);
      }
      shockwavesRef.current = nextWaves;

      // Update & Draw Particles
      const nextParts: Particle[] = [];
      for (const pt of particlesRef.current) {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life -= 1;
        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (pt.life > 0) nextParts.push(pt);
      }
      particlesRef.current = nextParts;

      // Update & Draw Floating Texts
      const nextTexts: FloatingText[] = [];
      for (const ft of floatingTextsRef.current) {
        ft.y -= 0.7;
        ft.life -= 1;
        ctx.save();
        ctx.globalAlpha = Math.min(1, ft.life / 25);
        ctx.font = '900 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = ft.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#000000';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
        if (ft.life > 0) nextTexts.push(ft);
      }
      floatingTextsRef.current = nextTexts;

      ctx.restore();
      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Render Interactive Trajectory Aiming Simulator Canvas
  useEffect(() => {
    if (!showAimModal) return;
    const canvas = aimCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const originX = 48;
    const originY = H - 38;
    const unitPx = 38; // x: 0..10, y: 0..7

    const toPx = (gx: number, gy: number) => ({
      x: originX + gx * unitPx,
      y: originY - gy * unitPx,
    });

    ctx.fillStyle = '#030816';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= 10; gx++) {
      const p = toPx(gx, 0);
      ctx.beginPath();
      ctx.moveTo(p.x, 12);
      ctx.lineTo(p.x, originY + 8);
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(gx), p.x, originY + 22);
    }
    for (let gy = 0; gy <= 7; gy++) {
      const p = toPx(0, gy);
      ctx.beginPath();
      ctx.moveTo(originX - 8, p.y);
      ctx.lineTo(W - 14, p.y);
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(String(gy), originX - 12, p.y + 4);
    }

    // Main Axes
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(originX, 12);
    ctx.lineTo(originX, originY);
    ctx.lineTo(W - 12, originY);
    ctx.stroke();

    // Eval Trajectory Function
    const evalY = (x: number) => {
      if (aimMode === 'linear') {
        return sliderM * x + sliderC;
      }
      // Parabola: y = -0.25*(x - sliderM)^2 + sliderC
      return -0.25 * Math.pow(x - sliderM, 2) + sliderC;
    };

    // Predicted Calibration Curve
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    let started = false;
    for (let gx = 0; gx <= 10; gx += 0.1) {
      const gy = evalY(gx);
      const pt = toPx(gx, gy);
      if (pt.y >= -40 && pt.y <= H + 40) {
        if (!started) {
          ctx.moveTo(pt.x, pt.y);
          started = true;
        } else {
          ctx.lineTo(pt.x, pt.y);
        }
      }
    }
    ctx.stroke();
    ctx.restore();

    // Target Meteor
    const tPx = toPx(aimTarget.x, aimTarget.y);
    ctx.save();
    ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';
    ctx.strokeStyle = '#fb7185';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(tPx.x, tPx.y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`☄️ (${aimTarget.x}, ${aimTarget.y})`, tPx.x, tPx.y - 24);
    ctx.restore();

    // Animated Shot Orb along trajectory
    if (aimShotProgress !== null) {
      const gx = aimShotProgress * 10;
      const gy = evalY(gx);
      const pt = toPx(gx, gy);
      ctx.save();
      ctx.shadowBlur = 16;
      ctx.shadowColor = '#fde047';
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }, [showAimModal, aimMode, aimTarget, sliderM, sliderC, aimShotProgress]);

  // Animate Trajectory Simulator Projectile
  useEffect(() => {
    if (aimShotProgress === null) return;
    if (aimShotProgress >= 1) {
      const yAtTarget =
        aimMode === 'linear'
          ? sliderM * aimTarget.x + sliderC
          : -0.25 * Math.pow(aimTarget.x - sliderM, 2) + sliderC;
      const hit = Math.abs(yAtTarget - aimTarget.y) <= 0.35;

      if (hit) {
        sounds.playVictory();
        const team = teams[currentTurn];
        setAimFeedback(
          `🎯 TEPAT SASARAN! Kurva melewati (${aimTarget.x}, ${aimTarget.y})! ${team.name} meraih +250 Poin & +150 Shield!`
        );
        setTeams(prev =>
          prev.map((t, idx) =>
            idx === currentTurn ? { ...t, score: t.score + 250, shield: t.shield + 150 } : t
          )
        );
        triggerCanvasLaserStrike(currentTurn, 'meteor', '🎯 BIDIKAN AKURAT +250 PT!', '#34d399');
        addLog(
          team.name,
          team.color,
          `🎯 Menghancurkan Meteor di (${aimTarget.x}, ${aimTarget.y}) lewat Simulator Koordinat (+250 PT, +150 Shield)!`,
          'success'
        );
      } else {
        sounds.playWrong();
        setAimFeedback(
          `💨 Melenceng! Saat x = ${aimTarget.x}, ketinggian peluru y = ${yAtTarget.toFixed(2)} (target y = ${aimTarget.y}). Atur ulang slider lalu tembak lagi!`
        );
      }
      setAimShotProgress(null);
      return;
    }

    const timer = setTimeout(() => {
      setAimShotProgress(p => (p === null ? null : Math.min(1, p + 0.04)));
    }, 18);
    return () => clearTimeout(timer);
  }, [aimShotProgress]);

  // Keyboard 1-4 Buzzer in Mission Modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!activeMission) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (['1', '2', '3', '4'].includes(e.key) && answerState !== 'correct') {
        sounds.playChest();
        setAnsweringTeamIdx(Number(e.key) - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeMission, answerState]);

  // Countdown Timer in Mission Modal
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

  const applySession = (s: GalaxySession) => {
    setSessionName(s.name || 'Misi Galaksi Matematika');
    setSelectedGradeId(s.selectedGradeId || 'kelas-7');
    setCurrentTurn(s.currentTurn || 0);
    setRound(s.round || 1);
    setTeams(s.teams);
    setSolvedMissionIds(s.solvedMissionIds || []);
    setLogs(s.logs || []);
  };

  const loadSavedSlots = () => {
    try {
      const str = localStorage.getItem('gameszone_galaxy_save_slots');
      if (str) setSavedSlots(JSON.parse(str));
    } catch {}
  };

  const addLog = (
    teamName: string,
    teamColor: string,
    text: string,
    type: GalaxyLog['type'] = 'info'
  ) => {
    setLogs(prev =>
      [
        {
          id: `gl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          teamName,
          teamColor,
          text,
          type,
        },
        ...prev,
      ].slice(0, 60)
    );
  };

  const currentGradePack =
    GALAXY_GRADE_PACKS.find(g => g.id === selectedGradeId) || GALAXY_GRADE_PACKS[0];

  const openMissionModal = (mission: GalaxyMissionItem) => {
    sounds.playDiceRoll();
    setActiveMission(mission);
    setAnsweringTeamIdx(currentTurn);
    setNova2xActive(false);
    setEliminatedOptions([]);
    setShowOptions(!mission.numericAnswer);
    setSelectedOption(null);
    setKeypadValue('');
    setShowHint(false);
    setAnswerState('pending');
    setTacticalDone(false);
    setTimerSeconds(mission.timeLimit || 60);
    setTimerRunning(true);
  };

  const handleOpenAimSimulator = () => {
    const mode: 'linear' | 'parabola' = selectedGradeId === 'kelas-9' ? 'parabola' : 'linear';
    setAimMode(mode);
    if (mode === 'linear') {
      const tx = [4, 6, 8][Math.floor(Math.random() * 3)];
      const ty = [4, 5, 6, 7][Math.floor(Math.random() * 4)];
      setAimTarget({ x: tx, y: ty });
      setSliderM(0.5);
      setSliderC(0);
    } else {
      const tx = [4, 5, 6][Math.floor(Math.random() * 3)];
      const ty = [4, 5, 6][Math.floor(Math.random() * 3)];
      setAimTarget({ x: tx, y: ty });
      setSliderM(3);
      setSliderC(3);
    }
    setAimFeedback('');
    setAimShotProgress(null);
    setShowAimModal(true);
  };

  // Skills
  const handleUseEliminate = () => {
    if (!activeMission || answerState !== 'pending') return;
    const team = teams[answeringTeamIdx];
    if (!team.skills.eliminate2) return;
    const toElim = activeMission.options.filter(o => o !== activeMission.answer).slice(0, 2);
    sounds.playChest();
    setEliminatedOptions(toElim);
    setShowHint(true);
    setShowOptions(true);
    setTeams(prev =>
      prev.map((t, idx) =>
        idx === answeringTeamIdx ? { ...t, skills: { ...t.skills, eliminate2: false } } : t
      )
    );
    addLog(team.name, team.color, '⚡ Mengaktifkan Radar Eliminasi 2 & Membuka Petunjuk!', 'info');
  };

  const handleUseShield = () => {
    if (!activeMission) return;
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
    addLog(team.name, team.color, '🛡️ Mengaktifkan Perisai Plasma +250 Shield!', 'success');
  };

  const handleUseNova2x = () => {
    if (!activeMission || nova2xActive || answerState !== 'pending') return;
    const team = teams[answeringTeamIdx];
    if (!team.skills.nova2x) return;
    sounds.playChest();
    setNova2xActive(true);
    setTeams(prev =>
      prev.map((t, idx) =>
        idx === answeringTeamIdx ? { ...t, skills: { ...t.skills, nova2x: false } } : t
      )
    );
    addLog(team.name, team.color, '☄️ Mengisi Meriam Nova 2x! Poin & Laser DMG digandakan!', 'attack');
  };

  const finalizeCorrect = () => {
    if (!activeMission || answerState === 'correct') return;
    setTimerRunning(false);
    sounds.playCorrect();
    setAnswerState('correct');

    const team = teams[answeringTeamIdx];
    const mult = nova2xActive ? 2 : 1;
    const pts = activeMission.points * mult + (team.streak >= 2 ? 50 : 0);

    if (!activeMission.id.startsWith('vdyn-') && !solvedMissionIds.includes(activeMission.id)) {
      setSolvedMissionIds(prev => [...prev, activeMission.id]);
    }
    setTeams(prev =>
      prev.map((t, idx) =>
        idx === answeringTeamIdx ? { ...t, score: t.score + pts, streak: t.streak + 1 } : t
      )
    );
    addLog(
      team.name,
      team.color,
      `Memecahkan ${activeMission.code} (${activeMission.title})! +${pts} Poin!`,
      'success'
    );
  };

  const handleWrong = (detail: string) => {
    if (!activeMission || answerState === 'correct') return;
    sounds.playWrong();
    setAnswerState('wrong');
    const team = teams[answeringTeamIdx];
    setTeams(prev => prev.map((t, i) => (i === answeringTeamIdx ? { ...t, streak: 0 } : t)));
    addLog(team.name, team.color, `Belum tepat (${detail}). Regu lain boleh Rebutan (tekan 1–4)!`, 'danger');
  };

  const handleSelectOption = (opt: string) => {
    if (!activeMission || answerState === 'correct') return;
    setSelectedOption(opt);
    if (opt === activeMission.answer) finalizeCorrect();
    else handleWrong(opt);
  };

  const handleCheckKeypad = () => {
    if (!activeMission?.numericAnswer || answerState === 'correct') return;
    const cleanedIn = keypadValue.replace(/\./g, '').replace(/,/g, '').trim();
    const cleanedExp = activeMission.numericAnswer.replace(/\./g, '').replace(/,/g, '').trim();
    if (!cleanedIn) return;
    if (cleanedIn === cleanedExp) finalizeCorrect();
    else handleWrong(`Keypad ${keypadValue}`);
  };

  const handleFireAtOpponent = (targetIdx: number) => {
    if (!activeMission || tacticalDone) return;
    const attacker = teams[answeringTeamIdx];
    const target = teams[targetIdx];
    const dmg = activeMission.laserDamage * (nova2xActive ? 2 : 1);

    sounds.playChest();
    setTacticalDone(true);

    setTeams(prev =>
      prev.map((t, idx) => {
        if (idx !== targetIdx) return t;
        const absorb = Math.min(t.shield, dmg);
        const rem = dmg - absorb;
        return { ...t, shield: t.shield - absorb, hp: Math.max(0, t.hp - rem) };
      })
    );

    triggerCanvasLaserStrike(answeringTeamIdx, targetIdx, `-${dmg} DMG!`, attacker.color);
    addLog(attacker.name, attacker.color, `🚀 Menembak Laser Plasma (${dmg} DMG) ke ${target.name}!`, 'attack');
    closeAndNextTurn();
  };

  const handleFireAtMeteorBonus = () => {
    if (!activeMission || tacticalDone) return;
    const team = teams[answeringTeamIdx];
    sounds.playChest();
    setTacticalDone(true);

    setTeams(prev =>
      prev.map((t, idx) =>
        idx === answeringTeamIdx
          ? { ...t, score: t.score + 100, shield: t.shield + 150 }
          : t
      )
    );
    triggerCanvasLaserStrike(answeringTeamIdx, 'meteor', '+100 PT & +150 🛡️!', team.color);
    addLog(team.name, team.color, '☄️ Menghantam Meteor Inti: Bonus +100 Poin & +150 Shield!', 'success');
    closeAndNextTurn();
  };

  const closeAndNextTurn = () => {
    setTimerRunning(false);
    setActiveMission(null);
    const next = (currentTurn + 1) % 4;
    setCurrentTurn(next);
    if (next === 0) setRound(r => r + 1);
  };

  const handleSaveSlot = async () => {
    const { value: title } = await Swal.fire({
      title: 'Simpan Progres Galaksi Matematika',
      input: 'text',
      inputLabel: 'Nama Sesi / Kelas',
      inputValue: sessionName,
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      cancelButtonText: 'Batal',
    });
    if (!title) return;
    const session: GalaxySession = {
      id: `gal_${Date.now()}`,
      name: title,
      savedAt: new Date().toISOString(),
      selectedGradeId,
      currentTurn,
      round,
      teams,
      solvedMissionIds,
      logs,
    };
    const slot: GalaxySaveSlot = {
      id: session.id,
      name: title,
      date: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
      session,
    };
    const nextSlots = [slot, ...savedSlots.filter(s => s.name !== title)].slice(0, 15);
    setSavedSlots(nextSlots);
    localStorage.setItem('gameszone_galaxy_save_slots', JSON.stringify(nextSlots));
    setSessionName(title);
    Swal.fire('Tersimpan!', `Sesi "${title}" tersimpan di browser.`, 'success');
  };

  const handleResetGame = () => {
    Swal.fire({
      title: 'Reset Arena Galaksi?',
      text: 'Skor, HP kapal, dan misi akan dikembalikan ke awal.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Reset!',
      cancelButtonText: 'Batal',
    }).then(res => {
      if (res.isConfirmed) {
        setTeams(INITIAL_GALAXY_TEAMS.map(t => ({ ...t, skills: { ...t.skills } })));
        setSolvedMissionIds([]);
        setCurrentTurn(0);
        setRound(1);
        setLogs([
          {
            id: `rst-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            teamName: 'Pusat Radar',
            teamColor: '#38bdf8',
            text: 'Arena Galaksi direset! Semua Kapal Induk kembali 1000 HP & 200 Shield.',
            type: 'system',
          },
        ]);
      }
    });
  };

  const activeTeam = teams[currentTurn] || teams[0];
  const answeringTeam = teams[answeringTeamIdx] || teams[0];
  const rankedTeams = [...teams].sort((a, b) => b.score + b.hp - (a.score + a.hp));

  const getVisualTypeTag = (type: GalaxyMissionItem['visualConfig']['type']) => {
    switch (type) {
      case 'balance_scale':
        return '⚖️ Neraca Aljabar';
      case 'right_triangle':
        return '📐 Radar Segitiga';
      case 'cartesian':
        return '📈 Papan Kartesius';
      case 'circle_sector':
        return '⭕ Juring Lingkaran';
      case 'solid_3d':
        return '🧊 Hologram 3D';
      case 'venn_set':
        return '🟣 Diagram Venn';
    }
  };

  const zoomClass =
    zoomLevel === 'xl' ? styles.zoomXl : zoomLevel === 'large' ? styles.zoomLarge : '';

  return (
    <div className={`${isTheater ? styles.theaterOverlay : styles.galaxyContainer} ${zoomClass}`}>
      {/* TOP BAR */}
      <div className={styles.topBar}>
        <div className={styles.brandBox}>
          <Link href="/games-zone" className={styles.btnTop}>
            <i className="fas fa-arrow-left"></i> Lobby
          </Link>
          <div className={styles.brandLogo}>
            <i className="fas fa-rocket"></i>
          </div>
          <div>
            <h1 className={styles.brandTitle}>GALAKSI MATEMATIKA (VISUAL &amp; ANIMASI 60 FPS)</h1>
            <div className={styles.brandSubtitle}>
              <span>{sessionName}</span>
              <span>•</span>
              <span style={{ color: '#67e8f9', fontWeight: 700 }}>Putaran {round}</span>
              <span>•</span>
              <span style={{ color: '#34d399', fontWeight: 700 }}>100% Client-Side (0% Beban Server)</span>
            </div>
          </div>
        </div>

        <div className={styles.controlsRow}>
          <button
            className={styles.btnTop}
            onClick={() => setIsMuted(sounds.toggleMute())}
            title="Suara Efek Game"
          >
            <i className={`fas ${isMuted ? 'fa-volume-mute' : 'fa-volume-up'}`} style={{ color: isMuted ? '#ef4444' : '#34d399' }}></i>
          </button>
          <button
            className={styles.btnTop}
            onClick={() => setZoomLevel(z => (z === 'normal' ? 'large' : z === 'large' ? 'xl' : 'normal'))}
          >
            <i className="fas fa-search-plus" style={{ color: '#38bdf8' }}></i> Zoom: {zoomLevel.toUpperCase()}
          </button>
          <button className={styles.btnTop} onClick={() => setIsTheater(t => !t)}>
            <i className={`fas ${isTheater ? 'fa-compress' : 'fa-expand'}`} style={{ color: '#fde047' }}></i>
            {isTheater ? 'Keluar Proyektor' : 'Mode Proyektor'}
          </button>
          <button className={styles.btnTop} onClick={() => setShowTeamModal(true)}>
            <i className="fas fa-users-cog" style={{ color: '#c084fc' }}></i> Skuad
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

      {/* 60 FPS ANIMATED SPACE ARENA CANVAS */}
      <div className={styles.canvasArenaCard}>
        <div className={styles.canvasArenaHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 900, fontSize: '0.98rem', color: '#67e8f9' }}>
              <i className="fas fa-satellite-dish" style={{ marginRight: 6 }}></i>
              ARENA PERTEMPURAN VISUAL 60 FPS
            </span>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Giliran aktif: <b style={{ color: activeTeam.color }}>{activeTeam.name}</b>
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className={styles.btnSecondary}
              onClick={() => {
                sounds.playChest();
                triggerCanvasLaserStrike(currentTurn, 'meteor', '⚡ TEST LASER!', activeTeam.color);
              }}
            >
              <i className="fas fa-crosshairs" style={{ color: '#fde047' }}></i> Uji Animasi Tembakan
            </button>
            <button className={styles.btnAmber} onClick={handleOpenAimSimulator}>
              <i className="fas fa-sliders-h"></i> 🎯 Simulator Bidikan Koordinat
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

        <canvas ref={spaceCanvasRef} width={920} height={320} className={styles.spaceCanvas} />
      </div>

      {/* GRADE PACK TABS (KELAS 7 / 8 / 9) */}
      <div className={styles.gradeTabsRow}>
        {GALAXY_GRADE_PACKS.map(pack => {
          const isSel = pack.id === selectedGradeId;
          const solvedCount = pack.missions.filter(m => solvedMissionIds.includes(m.id)).length;
          return (
            <button
              key={pack.id}
              onClick={() => setSelectedGradeId(pack.id)}
              className={`${styles.gradeTab} ${isSel ? styles.gradeTabActive : ''}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontWeight: 900, fontSize: '0.96rem', color: isSel ? '#ffffff' : '#e2e8f0' }}>
                  {pack.name}
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    padding: '3px 8px',
                    borderRadius: 999,
                    background: isSel ? pack.accentColor : 'rgba(255,255,255,0.1)',
                    color: isSel ? '#020617' : '#cbd5e1',
                  }}
                >
                  {pack.badge} • {solvedCount}/12
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: isSel ? '#cbd5e1' : '#94a3b8' }}>
                {pack.subtitle}
              </div>
            </button>
          );
        })}
      </div>

      {/* 4 SQUADS HUD */}
      <div className={styles.teamsRow}>
        {teams.map((t, idx) => {
          const isTurn = idx === currentTurn;
          return (
            <div
              key={t.id}
              onClick={() => setCurrentTurn(idx)}
              className={`${styles.teamCard} ${isTurn ? styles.teamCardActive : ''}`}
              style={{
                borderColor: isTurn ? t.color : 'rgba(148,163,184,0.25)',
                background: isTurn ? `linear-gradient(155deg, ${t.bgLight}, #0f172a)` : undefined,
              }}
            >
              {isTurn && (
                <div className={styles.turnPill} style={{ background: t.color }}>
                  GILIRAN AKTIF
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: t.bgLight,
                    border: `1.5px solid ${t.color}`,
                    color: t.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <i className={`fas ${t.icon}`}></i>
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.94rem' }}>{t.name}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: t.color }}>{t.score} PT</span>
                <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                  ❤️ <b>{t.hp}</b> • 🛡️ <b>{t.shield}</b>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MISSIONS GRID + LOG */}
      <div className={styles.mainGrid}>
        <div className={styles.missionsPanel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 900 }}>
                <i className="fas fa-radar" style={{ color: '#38bdf8', marginRight: 7 }}></i>
                12 MISI HOLOGRAM VISUAL ({currentGradePack.badge.toUpperCase()})
              </h2>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Setiap misi menampilkan diagram SVG interaktif! Jawaban benar meluncurkan tembakan laser animasi.
              </p>
            </div>
            <button
              className={styles.btnPrimary}
              onClick={() => openMissionModal(generateDynamicVisualMission(selectedGradeId))}
            >
              <i className="fas fa-magic"></i> 🎲 Soal Visual Dinamis Baru
            </button>
          </div>

          <div className={styles.missionGrid}>
            {currentGradePack.missions.map(m => {
              const solved = solvedMissionIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => openMissionModal(m)}
                  className={`${styles.missionCard} ${solved ? styles.missionSolved : ''} ${
                    m.isBossMeteor ? styles.missionBoss : ''
                  }`}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 900, background: 'rgba(255,255,255,0.1)', padding: '2px 7px', borderRadius: 6 }}>
                        {m.code}
                      </span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#fde047' }}>
                        {m.isBossMeteor ? '☄️ ' : ''}
                        {m.points} PT
                      </span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', marginBottom: 4 }}>{m.title}</div>
                    <div style={{ fontSize: '0.73rem', color: '#94a3b8' }}>{m.topic}</div>
                  </div>
                  <div style={{ marginTop: 10, paddingTop: 7, borderTop: '1px dashed rgba(255,255,255,0.12)', display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 800 }}>
                    <span style={{ color: '#67e8f9' }}>{getVisualTypeTag(m.visualConfig.type)}</span>
                    {solved && <span style={{ color: '#34d399' }}>✅</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* BATTLE LOG SIDEBAR */}
        <div className={styles.missionsPanel} style={{ maxHeight: 480, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '0.96rem', fontWeight: 900 }}>
            <i className="fas fa-terminal" style={{ color: '#38bdf8', marginRight: 7 }}></i>
            LOG RADAR GALAKSI
          </h3>
          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {logs.map(log => (
              <div
                key={log.id}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  borderLeft: `3px solid ${log.teamColor}`,
                  borderRadius: 8,
                  padding: '8px 10px',
                  fontSize: '0.79rem',
                }}
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

      {/* ================================================================= */}
      {/* MODAL 1: VISUAL MISSION MODAL (SVG DIAGRAM + CONTROLS)            */}
      {/* ================================================================= */}
      {activeMission && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ borderColor: answeringTeam.color }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(56,189,248,0.18)', color: '#67e8f9', padding: '4px 10px', borderRadius: 8, fontWeight: 900 }}>
                  {activeMission.code}
                </span>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>{activeMission.title}</h2>
                <span style={{ color: '#fde047', fontWeight: 800, fontSize: '0.84rem' }}>
                  {activeMission.points * (nova2xActive ? 2 : 1)} PT • ⚔️ {activeMission.laserDamage * (nova2xActive ? 2 : 1)} DMG
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    background: '#020617',
                    border: `2px solid ${timerSeconds <= 10 ? '#ef4444' : '#38bdf8'}`,
                    padding: '5px 12px',
                    borderRadius: 10,
                    fontWeight: 900,
                    color: timerSeconds <= 10 ? '#fca5a5' : '#67e8f9',
                  }}
                >
                  ⏱️ {timerSeconds}d
                </div>
                <button className={styles.btnSecondary} onClick={() => setTimerRunning(r => !r)}>
                  <i className={`fas ${timerRunning ? 'fa-pause' : 'fa-play'}`}></i>
                </button>
                <button className={styles.btnDanger} onClick={() => { setTimerRunning(false); setActiveMission(null); }}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            {/* Squad Buzzer + Skills */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 14, background: 'rgba(2,6,23,0.6)', padding: '9px 12px', borderRadius: 12 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>Skuad Penjawab (1–4):</span>
                {teams.map((t, idx) => (
                  <button
                    key={t.id}
                    disabled={answerState === 'correct'}
                    onClick={() => { sounds.playChest(); setAnsweringTeamIdx(idx); }}
                    style={{
                      background: idx === answeringTeamIdx ? t.color : '#1e293b',
                      color: idx === answeringTeamIdx ? '#020617' : '#cbd5e1',
                      border: `1.5px solid ${t.color}`,
                      padding: '4px 10px',
                      borderRadius: 8,
                      fontWeight: 800,
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                    }}
                  >
                    [{idx + 1}] {t.name.replace('Skuad ', '')}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className={styles.btnSecondary} disabled={!answeringTeam.skills.eliminate2 || answerState !== 'pending'} onClick={handleUseEliminate} style={{ fontSize: '0.75rem', opacity: answeringTeam.skills.eliminate2 ? 1 : 0.4 }}>
                  ⚡ Elim 2
                </button>
                <button className={styles.btnSecondary} disabled={!answeringTeam.skills.shieldBoost} onClick={handleUseShield} style={{ fontSize: '0.75rem', opacity: answeringTeam.skills.shieldBoost ? 1 : 0.4 }}>
                  🛡️ +250 Shield
                </button>
                <button className={styles.btnSecondary} disabled={!answeringTeam.skills.nova2x || nova2xActive || answerState !== 'pending'} onClick={handleUseNova2x} style={{ fontSize: '0.75rem', opacity: answeringTeam.skills.nova2x ? 1 : 0.4 }}>
                  ☄️ Nova 2x
                </button>
              </div>
            </div>

            {/* SPLIT BODY: HOLOGRAM SVG DIAGRAM (LEFT) + QUESTION/CONTROLS (RIGHT) */}
            <div className={styles.splitMissionBody}>
              <div>
                <MathVisualDiagram config={activeMission.visualConfig} />
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className={styles.btnSecondary} style={{ flex: 1 }} onClick={() => setShowHint(h => !h)}>
                    <i className="fas fa-lightbulb" style={{ color: '#fde047' }}></i> {showHint ? 'Tutup Hint' : 'Buka Hint Rumus'}
                  </button>
                  {!showOptions && (
                    <button className={styles.btnPrimary} style={{ flex: 1 }} onClick={() => setShowOptions(true)}>
                      <i className="fas fa-list"></i> Opsi A-B-C-D
                    </button>
                  )}
                </div>
                {showHint && (
                  <div style={{ marginTop: 10, background: 'rgba(250,204,21,0.12)', border: '1px solid rgba(250,204,21,0.45)', borderRadius: 10, padding: 10, fontSize: '0.86rem', color: '#fef08a' }}>
                    <b>💡 Petunjuk:</b> {activeMission.hint}
                  </div>
                )}
              </div>

              <div>
                <div className={styles.questionText}>{activeMission.question}</div>

                {/* Numeric Keypad (Before Options Shown) */}
                {activeMission.numericAnswer && !showOptions && answerState !== 'correct' && (
                  <div style={{ background: 'rgba(2,6,23,0.6)', borderRadius: 14, padding: 12, border: '1px solid #334155' }}>
                    <div style={{ textAlign: 'center', fontSize: '1.45rem', fontWeight: 900, fontFamily: 'monospace', color: '#38bdf8', background: '#020617', padding: '7px 12px', borderRadius: 9, border: '1.5px solid #38bdf8', maxWidth: 280, margin: '0 auto 10px' }}>
                      {keypadValue || '___'}
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
                      <button className={styles.btnPrimary} onClick={handleCheckKeypad} style={{ gridColumn: 'span 2' }}>
                        ✅ Cek Angka
                      </button>
                    </div>
                  </div>
                )}

                {/* MCQ Options */}
                {showOptions && (
                  <div className={styles.optionsGrid}>
                    {activeMission.options.map((opt, idx) => {
                      const isElim = eliminatedOptions.includes(opt);
                      const isRight = answerState !== 'pending' && opt === activeMission.answer;
                      const isWrongSel = selectedOption === opt && opt !== activeMission.answer;
                      return (
                        <button
                          key={idx}
                          disabled={isElim || answerState === 'correct'}
                          onClick={() => handleSelectOption(opt)}
                          className={`${styles.optionBtn} ${isElim ? styles.optionEliminated : ''} ${
                            isRight ? styles.optionCorrect : ''
                          } ${isWrongSel ? styles.optionWrong : ''}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}

                {answerState === 'wrong' && (
                  <div style={{ background: 'rgba(239,68,68,0.16)', border: '1px solid #ef4444', borderRadius: 12, padding: 11, fontSize: '0.88rem', color: '#fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <span>❌ Belum tepat! Tekan <b>1–4</b> untuk rebutan regu lain.</span>
                    <button
                      className={styles.btnSecondary}
                      onClick={() => {
                        setTimerRunning(false);
                        setAnswerState('correct');
                        setTacticalDone(true);
                      }}
                    >
                      Lihat Pembahasan
                    </button>
                  </div>
                )}

                {answerState === 'correct' && (
                  <div style={{ background: 'rgba(16,185,129,0.16)', border: '2px solid #10b981', borderRadius: 14, padding: 14, marginTop: 10 }}>
                    <div style={{ fontWeight: 900, color: '#6ee7b7', marginBottom: 4 }}>
                      ✅ JAWABAN BENAR! ({activeMission.answer})
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#e2e8f0', marginBottom: 12 }}>
                      <b>Pembahasan:</b> {activeMission.explanation}
                    </div>

                    {!tacticalDone ? (
                      <div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 900, color: '#fde047', marginBottom: 8 }}>
                          🚀 LUNCURKAN ANIMASI TEMBAKAN LASER {answeringTeam.name.toUpperCase()}:
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
                          {teams.map((opp, idx) => {
                            if (idx === answeringTeamIdx) return null;
                            const dmg = activeMission.laserDamage * (nova2xActive ? 2 : 1);
                            return (
                              <button
                                key={opp.id}
                                onClick={() => handleFireAtOpponent(idx)}
                                style={{
                                  background: '#1e293b',
                                  border: `1.5px solid ${opp.color}`,
                                  borderRadius: 10,
                                  padding: '8px 10px',
                                  color: '#ffffff',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                              >
                                <div style={{ fontWeight: 800, color: opp.color, fontSize: '0.82rem' }}>
                                  ⚔️ Tembak {opp.name.replace('Skuad ', '')}
                                </div>
                                <div style={{ fontSize: '0.73rem', color: '#fda4af' }}>-{dmg} Laser DMG</div>
                              </button>
                            );
                          })}
                          <button
                            onClick={handleFireAtMeteorBonus}
                            style={{
                              background: 'linear-gradient(135deg, #059669, #0d9488)',
                              border: '1.5px solid #5eead4',
                              borderRadius: 10,
                              padding: '8px 10px',
                              color: '#ffffff',
                              fontWeight: 800,
                              fontSize: '0.82rem',
                              cursor: 'pointer',
                            }}
                          >
                            ☄️ Tembak Meteor Inti (+100 PT &amp; +150 🛡️)
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'right' }}>
                        <button className={styles.btnPrimary} onClick={closeAndNextTurn}>
                          Lanjut Giliran <i className="fas fa-arrow-right"></i>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 2: INTERACTIVE TRAJECTORY AIMING SIMULATOR                  */}
      {/* ================================================================= */}
      {showAimModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: 820, borderColor: '#f59e0b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={{ margin: 0, color: '#fde047', fontSize: '1.25rem', fontWeight: 900 }}>
                  🎯 SIMULATOR KALIBRASI MERIAM KOORDINAT
                </h2>
                <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                  Atur kurva lintasan meriam agar peluru menabrak Meteor <b>({aimTarget.x}, {aimTarget.y})</b>!
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className={aimMode === 'linear' ? styles.btnPrimary : styles.btnSecondary}
                  onClick={() => { setAimMode('linear'); setSliderM(1); setSliderC(0); setAimFeedback(''); }}
                >
                  Garis Lurus (y = mx + c)
                </button>
                <button
                  className={aimMode === 'parabola' ? styles.btnPrimary : styles.btnSecondary}
                  onClick={() => { setAimMode('parabola'); setSliderM(3); setSliderC(3); setAimFeedback(''); }}
                >
                  Parabola Kuadrat
                </button>
                <button className={styles.btnDanger} onClick={() => setShowAimModal(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 270px', gap: 16, alignItems: 'start' }}>
              <canvas
                ref={aimCanvasRef}
                width={470}
                height={330}
                style={{ width: '100%', height: 'auto', borderRadius: 14, border: '1.5px solid #38bdf8', background: '#030816' }}
              />

              <div style={{ background: '#020617', border: '1px solid #334155', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: 'rgba(56,189,248,0.14)', borderRadius: 10, padding: 10, textAlign: 'center', fontFamily: 'monospace', fontWeight: 900, color: '#67e8f9', fontSize: '0.96rem' }}>
                  {aimMode === 'linear'
                    ? `y = ${sliderM}x ${sliderC >= 0 ? `+ ${sliderC}` : `− ${Math.abs(sliderC)}`}`
                    : `y = −0.25(x − ${sliderM})² + ${sliderC}`}
                </div>

                <div>
                  <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 800, marginBottom: 4 }}>
                    <span>{aimMode === 'linear' ? 'Gradien (m)' : 'Sumbu Simetri (h)'}</span>
                    <span style={{ color: '#fde047' }}>{sliderM}</span>
                  </label>
                  <input
                    type="range"
                    min={aimMode === 'linear' ? -2 : 1}
                    max={aimMode === 'linear' ? 3 : 9}
                    step={0.5}
                    value={sliderM}
                    onChange={e => setSliderM(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 800, marginBottom: 4 }}>
                    <span>{aimMode === 'linear' ? 'Konstanta Y (c)' : 'Tinggi Puncak (k)'}</span>
                    <span style={{ color: '#34d399' }}>{sliderC}</span>
                  </label>
                  <input
                    type="range"
                    min={aimMode === 'linear' ? -4 : 1}
                    max={8}
                    step={0.5}
                    value={sliderC}
                    onChange={e => setSliderC(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <button
                  className={styles.btnAmber}
                  disabled={aimShotProgress !== null}
                  onClick={() => {
                    sounds.playDiceRoll();
                    setAimFeedback('');
                    setAimShotProgress(0);
                  }}
                >
                  🔥 LUNCURKAN PLASMA!
                </button>

                <button className={styles.btnSecondary} onClick={handleOpenAimSimulator}>
                  🎲 Acak Posisi Meteor Baru
                </button>
              </div>
            </div>

            {aimFeedback && (
              <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: aimFeedback.includes('TEPAT') ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', border: `1px solid ${aimFeedback.includes('TEPAT') ? '#10b981' : '#ef4444'}`, fontWeight: 800 }}>
                {aimFeedback}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT SQUAD NAMES */}
      {showTeamModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>⚙️ Pengaturan Nama Skuad</h3>
              <button className={styles.btnSecondary} onClick={() => setShowTeamModal(false)}>Tutup</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input className={styles.inputDark} value={sessionName} onChange={e => setSessionName(e.target.value)} />
              {teams.map((t, idx) => (
                <input
                  key={t.id}
                  className={styles.inputDark}
                  value={t.name}
                  onChange={e => {
                    const val = e.target.value;
                    setTeams(prev => prev.map((it, i) => (i === idx ? { ...it, name: val } : it)));
                  }}
                />
              ))}
              <button className={styles.btnPrimary} onClick={() => setShowTeamModal(false)}>Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: LOAD SAVED SLOTS */}
      {showLoadModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: 600 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>💾 Sesi Galaksi Tersimpan</h3>
              <button className={styles.btnSecondary} onClick={() => setShowLoadModal(false)}>Tutup</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
              {savedSlots.length > 0 ? (
                savedSlots.map(slot => (
                  <div key={slot.id} style={{ background: '#020617', border: '1px solid #334155', borderRadius: 12, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>{slot.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        {slot.date} • {slot.session.selectedGradeId.toUpperCase()}
                      </div>
                    </div>
                    <button
                      className={styles.btnPrimary}
                      onClick={() => {
                        applySession(slot.session);
                        setShowLoadModal(false);
                      }}
                    >
                      Muat
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>Belum ada sesi tersimpan.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: VICTORY PODIUM */}
      {showVictoryModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: 600, textAlign: 'center', borderColor: '#fbbf24' }}>
            <div style={{ fontSize: '3rem', marginBottom: 8 }}>🚀🏆🚀</div>
            <h2 style={{ margin: '0 0 12px 0', color: '#fde047', fontWeight: 900 }}>KLASEMEN GALAKSI MATEMATIKA</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', marginBottom: 16 }}>
              {rankedTeams.map((t, rank) => (
                <div key={t.id} style={{ background: '#020617', border: `2px solid ${t.color}`, borderRadius: 12, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <b style={{ color: t.color }}>#{rank + 1} {t.name}</b>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>❤️ {t.hp} HP • 🛡️ {t.shield} Shield</div>
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900 }}>{t.score} PT</div>
                </div>
              ))}
            </div>
            <button className={styles.btnPrimary} onClick={() => setShowVictoryModal(false)}>Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}
