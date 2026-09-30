import React, { useState, useId } from 'react';

export type AIOrbState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'processing' | 'error';

interface AIOrbProps {
  state?: AIOrbState;
  audioLevel?: number; // 0.0 to 1.0 (real mic or playback volume)
  size?: 'sm' | 'md' | 'lg' | 'hero';
  onClick?: () => void;
  interactive?: boolean;
  label?: string;
}

export const AIOrb: React.FC<AIOrbProps> = ({
  state = 'idle',
  audioLevel = 0,
  size = 'hero',
  onClick,
  interactive = true,
  label,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const filterId = useId();

  // Dynamic scale from real audio level
  const audioMultiplier = Math.min(0.35, (audioLevel || 0) * 0.45);
  const baseScale = state === 'speaking' || state === 'listening' ? 1 + audioMultiplier : 1;
  const hoverScale = isHovered && interactive ? 1.03 : 1;
  const currentScale = baseScale * hoverScale;

  // Responsive dimensions
  const dimensions = {
    sm: { box: 72, radius: 28 },
    md: { box: 140, radius: 56 },
    lg: { box: 210, radius: 88 },
    hero: { box: 290, radius: 118 },
  }[size];

  // Palette by state — restrained, deep, elegant (no cheap neon)
  const getTheme = () => {
    switch (state) {
      case 'speaking':
        return {
          coreGradient: ['#22d3ee', '#6366f1', '#4338ca', '#0f172a'],
          glowColor: 'rgba(99, 102, 241, 0.22)',
          ringColor: 'rgba(34, 211, 238, 0.35)',
          pulseSpeed: '2.4s',
          label: 'AI Speaking',
        };
      case 'listening':
        return {
          coreGradient: ['#34d399', '#0d9488', '#1e3a5f', '#020617'],
          glowColor: 'rgba(20, 184, 166, 0.24)',
          ringColor: 'rgba(52, 211, 153, 0.35)',
          pulseSpeed: '2s',
          label: 'Listening',
        };
      case 'thinking':
      case 'processing':
        return {
          coreGradient: ['#a855f7', '#6366f1', '#312e81', '#050714'],
          glowColor: 'rgba(168, 85, 247, 0.22)',
          ringColor: 'rgba(168, 85, 247, 0.35)',
          pulseSpeed: '1.6s',
          label: 'Processing',
        };
      case 'error':
        return {
          coreGradient: ['#f43f5e', '#b91c1c', '#450a0a', '#050505'],
          glowColor: 'rgba(244, 63, 94, 0.22)',
          ringColor: 'rgba(244, 63, 94, 0.35)',
          pulseSpeed: '2s',
          label: 'Attention Needed',
        };
      case 'idle':
      default:
        return {
          coreGradient: ['#818cf8', '#4f46e5', '#1e1b4b', '#030712'],
          glowColor: 'rgba(99, 102, 241, 0.16)',
          ringColor: 'rgba(129, 140, 248, 0.22)',
          pulseSpeed: '4.5s',
          label: 'Ready',
        };
    }
  };

  const theme = getTheme();
  const boxSize = dimensions.box;
  const radius = dimensions.radius;
  const center = boxSize / 2;

  return (
    <div className="flex flex-col items-center justify-center select-none">
      <div
        className={`relative flex items-center justify-center ${interactive ? 'cursor-pointer' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
        style={{
          width: boxSize * 1.35,
          height: boxSize * 1.35,
        }}
      >
        {/* Ambient Atmospheric Glow */}
        <div
          className="absolute rounded-full pointer-events-none transition-all duration-700 ease-out"
          style={{
            width: boxSize * 1.25,
            height: boxSize * 1.25,
            backgroundColor: theme.glowColor,
            filter: 'blur(52px)',
            transform: `scale(${currentScale * 1.1})`,
          }}
        />

        {/* 3D Orb SVG Layer */}
        <svg
          width={boxSize}
          height={boxSize}
          viewBox={`0 0 ${boxSize} ${boxSize}`}
          className="relative transition-transform duration-300 ease-out"
          style={{
            transform: `scale(${currentScale})`,
          }}
        >
          <defs>
            {/* Core Volumetric Gradient */}
            <radialGradient id={`core_${filterId}`} cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor={theme.coreGradient[0]} stopOpacity="0.9" />
              <stop offset="40%" stopColor={theme.coreGradient[1]} stopOpacity="0.8" />
              <stop offset="75%" stopColor={theme.coreGradient[2]} stopOpacity="0.7" />
              <stop offset="100%" stopColor={theme.coreGradient[3]} stopOpacity="0.95" />
            </radialGradient>

            {/* Specular Highlight Gradient */}
            <linearGradient id={`specular_${filterId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
            </linearGradient>

            {/* Translucent Glass Rim Gradient */}
            <radialGradient id={`rim_${filterId}`} cx="50%" cy="50%" r="50%">
              <stop offset="85%" stopColor="transparent" />
              <stop offset="96%" stopColor={theme.ringColor} stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.25" />
            </radialGradient>

            {/* Soft Shadow Filter */}
            <filter id={`shadow_${filterId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="16" stdDeviation="20" floodColor="#000000" floodOpacity="0.75" />
            </filter>
          </defs>

          {/* Outer Translucent Orbital Ring 1 */}
          <ellipse
            cx={center}
            cy={center}
            rx={radius * 1.28}
            ry={radius * 0.45}
            fill="none"
            stroke={theme.ringColor}
            strokeWidth="0.9"
            strokeDasharray="4 6"
            className="opacity-40"
            style={{
              transformOrigin: `${center}px ${center}px`,
              transform: `rotate(${isHovered ? 28 : 18}deg)`,
              transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />

          {/* Outer Translucent Orbital Ring 2 (Cross Tilt) */}
          <ellipse
            cx={center}
            cy={center}
            rx={radius * 1.2}
            ry={radius * 0.38}
            fill="none"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="0.8"
            style={{
              transformOrigin: `${center}px ${center}px`,
              transform: `rotate(${isHovered ? -35 : -22}deg)`,
              transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />

          {/* Micro Orbit Particle Dust */}
          <circle
            cx={center + radius * 1.15 * Math.cos(isHovered ? 0.8 : 0.4)}
            cy={center + radius * 0.4 * Math.sin(isHovered ? 0.8 : 0.4)}
            r={1.8}
            fill="#ffffff"
            className="opacity-80 animate-pulse"
          />
          <circle
            cx={center - radius * 0.95 * Math.cos(isHovered ? 1.6 : 1.2)}
            cy={center - radius * 0.32 * Math.sin(isHovered ? 1.6 : 1.2)}
            r={1.2}
            fill="#a5b4fc"
            className="opacity-70 animate-pulse"
          />

          {/* Core Sphere Body */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill={`url(#core_${filterId})`}
            filter={`url(#shadow_${filterId})`}
          />

          {/* Inner Light Core Pulse */}
          <circle
            cx={center}
            cy={center}
            r={radius * (0.45 + (state === 'speaking' || state === 'listening' ? audioMultiplier * 0.6 : 0))}
            fill={theme.coreGradient[0]}
            className="opacity-25 blur-sm"
          />

          {/* Center Soundwave / Intelligence Waveform Bar */}
          <g className="opacity-90">
            <line
              x1={center - 14}
              y1={center - (state === 'speaking' || state === 'listening' ? 12 : 5)}
              x2={center - 14}
              y2={center + (state === 'speaking' || state === 'listening' ? 12 : 5)}
              stroke="#ffffff"
              strokeWidth="2.2"
              strokeLinecap="round"
              className={state === 'speaking' || state === 'listening' ? 'animate-pulse' : ''}
            />
            <line
              x1={center}
              y1={center - (state === 'speaking' || state === 'listening' ? 20 : 10)}
              x2={center}
              y2={center + (state === 'speaking' || state === 'listening' ? 20 : 10)}
              stroke="#ffffff"
              strokeWidth="2.6"
              strokeLinecap="round"
              className={state === 'speaking' || state === 'listening' ? 'animate-pulse' : ''}
              style={{ animationDelay: '150ms' }}
            />
            <line
              x1={center + 14}
              y1={center - (state === 'speaking' || state === 'listening' ? 12 : 5)}
              x2={center + 14}
              y2={center + (state === 'speaking' || state === 'listening' ? 12 : 5)}
              stroke="#ffffff"
              strokeWidth="2.2"
              strokeLinecap="round"
              className={state === 'speaking' || state === 'listening' ? 'animate-pulse' : ''}
              style={{ animationDelay: '300ms' }}
            />
          </g>

          {/* Glass Specular Reflection Highlight */}
          <ellipse
            cx={center - radius * 0.32}
            cy={center - radius * 0.38}
            rx={radius * 0.42}
            ry={radius * 0.22}
            fill={`url(#specular_${filterId})`}
            transform={`rotate(-28 ${center - radius * 0.32} ${center - radius * 0.38})`}
            className="pointer-events-none"
          />

          {/* Outer Glass Rim */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill={`url(#rim_${filterId})`}
            className="pointer-events-none"
          />
        </svg>
      </div>

      {label && (
        <span className="mt-3 text-[11px] font-medium tracking-widest uppercase text-slate-400 font-mono">
          {label}
        </span>
      )}
    </div>
  );
};
