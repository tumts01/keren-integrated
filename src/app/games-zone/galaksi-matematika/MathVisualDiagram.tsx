'use client';

import React from 'react';
import { VisualConfig } from './galaxyMathData';

interface MathVisualDiagramProps {
  config: VisualConfig;
}

export default function MathVisualDiagram({ config }: MathVisualDiagramProps) {
  const viewWidth = 360;
  const viewHeight = 250;

  return (
    <div
      style={{
        background: 'radial-gradient(circle at 50% 45%, #0b1630 0%, #030712 100%)',
        border: '1.5px solid rgba(56, 189, 248, 0.45)',
        borderRadius: 16,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          fontSize: '0.72rem',
          fontWeight: 800,
          letterSpacing: '0.8px',
          color: '#38bdf8',
          marginBottom: 6,
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#10b981',
            display: 'inline-block',
            boxShadow: '0 0 8px #10b981',
          }}
        />
        Hologram Radar Visual
      </div>

      <svg
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        style={{ width: '100%', maxWidth: 360, height: 'auto', display: 'block' }}
      >
        <defs>
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <pattern id="radarGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(56, 189, 248, 0.1)" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Background Grid */}
        <rect width={viewWidth} height={viewHeight} fill="url(#radarGrid)" rx="10" />

        {/* 1. BALANCE SCALE (NERACA ALJABAR) */}
        {config.type === 'balance_scale' && (
          <g>
            {/* Base */}
            <polygon points="150,225 210,225 190,195 170,195" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
            <rect x="176" y="75" width="8" height="122" fill="#334155" stroke="#38bdf8" strokeWidth="1.5" />
            <circle cx="180" cy="75" r="7" fill="#fbbf24" filter="url(#neonGlow)" />

            {/* Oscillating Balance Beam */}
            <g>
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="-2 180 75; 2 180 75; -2 180 75"
                dur="4s"
                repeatCount="indefinite"
              />
              <line x1="65" y1="75" x2="295" y2="75" stroke="#67e8f9" strokeWidth="5" strokeLinecap="round" filter="url(#neonGlow)" />

              {/* Left Pan */}
              <line x1="80" y1="75" x2="60" y2="135" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="80" y1="75" x2="100" y2="135" stroke="#94a3b8" strokeWidth="1.5" />
              <path d="M 42 135 Q 80 155 118 135 Z" fill="#0ea5e9" opacity="0.85" stroke="#bae6fd" strokeWidth="1.5" />
              <rect x="34" y="96" width="92" height="36" rx="8" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
              <text x="80" y="119" textAnchor="middle" fill="#67e8f9" fontSize="14" fontWeight="900">
                {config.leftPan || 'x'}
              </text>

              {/* Equals Sign */}
              <circle cx="180" cy="120" r="16" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
              <text x="180" y="126" textAnchor="middle" fill="#34d399" fontSize="18" fontWeight="900">
                =
              </text>

              {/* Right Pan */}
              <line x1="280" y1="75" x2="260" y2="135" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="280" y1="75" x2="300" y2="135" stroke="#94a3b8" strokeWidth="1.5" />
              <path d="M 242 135 Q 280 155 318 135 Z" fill="#10b981" opacity="0.85" stroke="#a7f3d0" strokeWidth="1.5" />
              <rect x="234" y="96" width="92" height="36" rx="8" fill="#0f172a" stroke="#34d399" strokeWidth="2" />
              <text x="280" y="119" textAnchor="middle" fill="#a7f3d0" fontSize="14" fontWeight="900">
                {config.rightPan || '0'}
              </text>
            </g>

            <text x="180" y="242" textAnchor="middle" fill="#fde047" fontSize="11.5" fontWeight="800">
              {config.scaleCaption || 'Kondisi Seimbang'}
            </text>
          </g>
        )}

        {/* 2. RIGHT TRIANGLE (PYTHAGORAS & KESEBANGUNAN) */}
        {config.type === 'right_triangle' && (
          <g>
            {/* Triangle Fill */}
            <polygon
              points="75,195 275,195 75,55"
              fill="rgba(16, 185, 129, 0.16)"
              stroke="#34d399"
              strokeWidth="3"
              filter="url(#neonGlow)"
            />
            {/* Right Angle Marker */}
            <polyline points="75,175 95,175 95,195" fill="none" stroke="#fde047" strokeWidth="2" />
            <text x="103" y="185" fill="#fde047" fontSize="11" fontWeight="800">
              {config.angleLabel || '90°'}
            </text>

            {/* Animated Laser Scan Beam along Hypotenuse */}
            <circle r="5" fill="#fbbf24" filter="url(#neonGlow)">
              <animateMotion dur="2.8s" repeatCount="indefinite" path="M 75 55 L 275 195 L 75 55" />
            </circle>

            {/* Side Labels */}
            <rect x="130" y="204" width="110" height="24" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
            <text x="185" y="220" textAnchor="middle" fill="#67e8f9" fontSize="12" fontWeight="900">
              {config.sideA || 'a'}
            </text>

            <rect x="10" y="112" width="102" height="24" rx="6" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
            <text x="61" y="128" textAnchor="middle" fill="#6ee7b7" fontSize="11.5" fontWeight="900">
              {config.sideB || 'b'}
            </text>

            <rect x="172" y="88" width="126" height="26" rx="7" fill="#0f172a" stroke="#fbbf24" strokeWidth="2" />
            <text x="235" y="105" textAnchor="middle" fill="#fde047" fontSize="12.5" fontWeight="900">
              {config.sideC || 'c = ?'}
            </text>
          </g>
        )}

        {/* 3. CARTESIAN RADAR & PARABOLA */}
        {config.type === 'cartesian' && (() => {
          const cx = 180;
          const cy = 135;
          const scaleX = 16;
          const scaleY = 12;

          // Build parabola SVG path if present
          let parabolaPath = '';
          if (config.drawParabola) {
            const { a, b, c } = config.drawParabola;
            const pts: string[] = [];
            // Auto scale Y slightly if parabola values reach > 10 (e.g. rocket h=32)
            const vertexX = -b / (2 * a);
            const vertexY = a * vertexX * vertexX + b * vertexX + c;
            const maxAbsY = Math.max(8, Math.abs(vertexY), Math.abs(c));
            const dynScaleY = maxAbsY > 12 ? 85 / maxAbsY : scaleY;

            for (let x = -8; x <= 10; x += 0.25) {
              const y = a * x * x + b * x + c;
              const px = cx + x * scaleX;
              const py = cy - y * dynScaleY;
              if (py >= -20 && py <= 270 && px >= 10 && px <= 350) {
                pts.push(`${pts.length === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`);
              }
            }
            parabolaPath = pts.join(' ');
          }

          return (
            <g>
              {/* Axes */}
              <line x1="20" y1={cy} x2="340" y2={cy} stroke="#64748b" strokeWidth="1.5" />
              <line x1={cx} y1="15" x2={cx} y2="235" stroke="#64748b" strokeWidth="1.5" />
              <text x="332" y={cy - 6} fill="#94a3b8" fontSize="11" fontWeight="800">
                X
              </text>
              <text x={cx + 6} y="24" fill="#94a3b8" fontSize="11" fontWeight="800">
                Y
              </text>

              {/* Line connecting 2 points */}
              {config.drawLine && config.points && config.points.length >= 2 && (() => {
                const p1 = config.points[0];
                const p2 = config.points[1];
                const maxCoord = Math.max(
                  6,
                  ...config.points.map(p => Math.max(Math.abs(p.x), Math.abs(p.y)))
                );
                const sX = maxCoord > 8 ? 110 / maxCoord : scaleX;
                const sY = maxCoord > 8 ? 85 / maxCoord : scaleY;
                return (
                  <line
                    x1={cx + p1.x * sX}
                    y1={cy - p1.y * sY}
                    x2={cx + p2.x * sX}
                    y2={cy - p2.y * sY}
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    strokeDasharray="6 3"
                    filter="url(#neonGlow)"
                  />
                );
              })()}

              {/* Parabola Curve */}
              {parabolaPath && (
                <path
                  d={parabolaPath}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2.8"
                  filter="url(#neonGlow)"
                />
              )}

              {/* Plotted Points */}
              {config.points?.map((pt, idx) => {
                const maxCoord = Math.max(
                  6,
                  ...(config.points || []).map(p => Math.max(Math.abs(p.x), Math.abs(p.y)))
                );
                const sX = maxCoord > 8 ? 110 / maxCoord : scaleX;
                const sY = maxCoord > 8 ? 85 / maxCoord : scaleY;
                const px = Math.max(30, Math.min(330, cx + pt.x * sX));
                const py = Math.max(25, Math.min(225, cy - pt.y * sY));
                const col = pt.color || '#38bdf8';
                return (
                  <g key={idx}>
                    <circle cx={px} cy={py} r="8" fill={col} opacity="0.25">
                      <animate attributeName="r" values="6;12;6" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={px} cy={py} r="4.5" fill={col} stroke="#ffffff" strokeWidth="1.5" />
                    <rect x={px - 40} y={py - 26} width="80" height="18" rx="5" fill="rgba(2,6,23,0.88)" stroke={col} strokeWidth="1" />
                    <text x={px} y={py - 14} textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="800">
                      {pt.label}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })()}

        {/* 4. CIRCLE SECTOR (JURING, BUSUR & SUDUT) */}
        {config.type === 'circle_sector' && (() => {
          const cx = 180;
          const cy = 120;
          const r = 74;
          const deg = config.angleDeg ?? 90;
          const rad = (deg * Math.PI) / 180;
          const x2 = cx + r * Math.cos(-rad);
          const y2 = cy + r * Math.sin(-rad);
          const largeArc = deg > 180 ? 1 : 0;
          const sectorPath = `M ${cx} ${cy} L ${cx + r} ${cy} A ${r} ${r} 0 ${largeArc} 0 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`;

          return (
            <g>
              <circle cx={cx} cy={cy} r={r} fill="rgba(56, 189, 248, 0.08)" stroke="#475569" strokeWidth="2" strokeDasharray="5 4" />
              <path d={sectorPath} fill="rgba(6, 182, 212, 0.34)" stroke="#22d3ee" strokeWidth="3" filter="url(#neonGlow)" />
              <circle cx={cx} cy={cy} r="4" fill="#fde047" />
              <text x={cx + 22} y={cy - 12} fill="#fde047" fontSize="13" fontWeight="900">
                {deg}°
              </text>

              {/* Radius Badge */}
              <rect x="195" y="128" width="90" height="22" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="240" y="143" textAnchor="middle" fill="#67e8f9" fontSize="11.5" fontWeight="900">
                {config.radiusLabel || 'r'}
              </text>

              <text x="180" y="230" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="900">
                {config.sectorLabel || `Sudut Pusat ${deg}°`}
              </text>
            </g>
          );
        })()}

        {/* 5. SOLID 3D HOLOGRAM (TABUNG, KERUCUT, BOLA, BALOK, LIMAS) */}
        {config.type === 'solid_3d' && (
          <g>
            {config.shape3d === 'cylinder' && (
              <g>
                <ellipse cx="180" cy="60" rx="56" ry="18" fill="rgba(6,182,212,0.22)" stroke="#22d3ee" strokeWidth="2.5" />
                <line x1="124" y1="60" x2="124" y2="175" stroke="#22d3ee" strokeWidth="2.5" />
                <line x1="236" y1="60" x2="236" y2="175" stroke="#22d3ee" strokeWidth="2.5" />
                <ellipse cx="180" cy="175" rx="56" ry="18" fill="rgba(6,182,212,0.16)" stroke="#22d3ee" strokeWidth="2.5" />
                <line x1="180" y1="175" x2="236" y2="175" stroke="#fde047" strokeWidth="2" strokeDasharray="4 3" />
                <text x="208" y="170" fill="#fde047" fontSize="11" fontWeight="900">{config.dim1 || 'r'}</text>
                <line x1="252" y1="60" x2="252" y2="175" stroke="#34d399" strokeWidth="2" />
                <text x="260" y="122" fill="#34d399" fontSize="11.5" fontWeight="900">{config.dim2 || 't'}</text>
              </g>
            )}

            {config.shape3d === 'cone' && (
              <g>
                <polygon points="180,38 118,175 242,175" fill="rgba(245,158,11,0.15)" stroke="#fbbf24" strokeWidth="2.5" />
                <ellipse cx="180" cy="175" rx="62" ry="18" fill="rgba(245,158,11,0.22)" stroke="#fbbf24" strokeWidth="2.5" />
                <line x1="180" y1="38" x2="180" y2="175" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 3" />
                <line x1="180" y1="175" x2="242" y2="175" stroke="#34d399" strokeWidth="2" />
                <text x="210" y="195" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="900">{config.dim1 || 'r'}</text>
                <text x="150" y="118" textAnchor="middle" fill="#67e8f9" fontSize="11" fontWeight="900">{config.dim2 || 't'}</text>
                {config.dim3 && (
                  <text x="242" y="108" fill="#fb7185" fontSize="11" fontWeight="900">{config.dim3}</text>
                )}
              </g>
            )}

            {config.shape3d === 'sphere' && (
              <g>
                <circle cx="180" cy="122" r="70" fill="rgba(16,185,129,0.16)" stroke="#34d399" strokeWidth="3" filter="url(#neonGlow)" />
                <ellipse cx="180" cy="122" rx="70" ry="22" fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeDasharray="5 4" />
                <ellipse cx="180" cy="122" rx="22" ry="70" fill="none" stroke="#38bdf8" strokeWidth="1.4" strokeDasharray="4 4" />
                <circle cx="180" cy="122" r="4" fill="#fde047" />
                <line x1="180" y1="122" x2="250" y2="122" stroke="#fde047" strokeWidth="2.5" />
                <text x="215" y="114" textAnchor="middle" fill="#fde047" fontSize="12" fontWeight="900">{config.dim1 || 'r'}</text>
              </g>
            )}

            {config.shape3d === 'cuboid' && (
              <g>
                {/* Back face */}
                <rect x="135" y="55" width="120" height="90" fill="rgba(56,189,248,0.08)" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="4 3" />
                {/* Front face */}
                <rect x="95" y="90" width="120" height="90" fill="rgba(56,189,248,0.18)" stroke="#38bdf8" strokeWidth="2.5" />
                {/* Connectors */}
                <line x1="95" y1="90" x2="135" y2="55" stroke="#38bdf8" strokeWidth="2" />
                <line x1="215" y1="90" x2="255" y2="55" stroke="#38bdf8" strokeWidth="2" />
                <line x1="215" y1="180" x2="255" y2="145" stroke="#38bdf8" strokeWidth="2" />
                <line x1="95" y1="180" x2="135" y2="145" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="4 3" />
                <text x="155" y="202" textAnchor="middle" fill="#67e8f9" fontSize="11.5" fontWeight="900">{config.dim1 || 'p'}</text>
                <text x="252" y="170" fill="#fde047" fontSize="11.5" fontWeight="900">{config.dim2 || 'l'}</text>
                <text x="58" y="140" fill="#34d399" fontSize="11.5" fontWeight="900">{config.dim3 || 't'}</text>
              </g>
            )}

            {config.shape3d === 'pyramid' && (
              <g>
                <polygon points="100,175 215,175 255,140 140,140" fill="rgba(244,63,94,0.16)" stroke="#fb7185" strokeWidth="2" />
                <line x1="180" y1="45" x2="100" y2="175" stroke="#fbbf24" strokeWidth="2.5" />
                <line x1="180" y1="45" x2="215" y2="175" stroke="#fbbf24" strokeWidth="2.5" />
                <line x1="180" y1="45" x2="255" y2="140" stroke="#fbbf24" strokeWidth="2.5" />
                <line x1="180" y1="45" x2="140" y2="140" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4 3" />
                <line x1="180" y1="45" x2="180" y2="158" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 3" />
                <text x="158" y="198" textAnchor="middle" fill="#fda4af" fontSize="11.5" fontWeight="900">{config.dim1 || 's'}</text>
                <text x="208" y="112" fill="#67e8f9" fontSize="11.5" fontWeight="900">{config.dim2 || 't'}</text>
              </g>
            )}
          </g>
        )}

        {/* 6. VENN DIAGRAM (HIMPUNAN) */}
        {config.type === 'venn_set' && (
          <g>
            <rect x="24" y="24" width="312" height="196" rx="14" fill="rgba(15,23,42,0.75)" stroke="#64748b" strokeWidth="2" />
            <text x="36" y="46" fill="#fde047" fontSize="12" fontWeight="900">
              S = {config.totalVal || '?'}
            </text>

            {/* Left Circle A */}
            <circle cx="142" cy="126" r="64" fill="rgba(6,182,212,0.24)" stroke="#22d3ee" strokeWidth="2.5" />
            <text x="106" y="84" textAnchor="middle" fill="#67e8f9" fontSize="12" fontWeight="900">
              {config.setA?.label || 'A'} ({config.setA?.val || '?'})
            </text>

            {/* Right Circle B */}
            <circle cx="218" cy="126" r="64" fill="rgba(16,185,129,0.24)" stroke="#34d399" strokeWidth="2.5" />
            <text x="254" y="84" textAnchor="middle" fill="#6ee7b7" fontSize="12" fontWeight="900">
              {config.setB?.label || 'B'} ({config.setB?.val || '?'})
            </text>

            {/* Intersection Center */}
            <circle cx="180" cy="128" r="20" fill="#090d16" stroke="#fde047" strokeWidth="2" />
            <text x="180" y="133" textAnchor="middle" fill="#fde047" fontSize="14" fontWeight="900">
              {config.intersectionVal || '?'}
            </text>

            {/* Outside Box */}
            <rect x="248" y="182" width="76" height="26" rx="6" fill="#020617" stroke="#f43f5e" strokeWidth="1.5" />
            <text x="286" y="199" textAnchor="middle" fill="#fda4af" fontSize="11" fontWeight="800">
              Luar: {config.outsideVal || '0'}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
