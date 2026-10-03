import React from 'react';

interface FeatureVisualProps {
  featureId: string;
  size?: number; // size in px, defaults to 36
  className?: string;
}

export const FeatureVisual: React.FC<FeatureVisualProps> = ({
  featureId,
  size = 36,
  className = '',
}) => {
  const norm = (featureId || '').toLowerCase().replace('feature/', '');

  switch (norm) {
    case 'document-analysis':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <defs>
            <linearGradient id="doc_grad_bg" x1="8" y1="4" x2="36" y2="44" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6" />
              <stop offset="1" stopColor="#1D4ED8" />
            </linearGradient>
            <linearGradient id="doc_page_grad" x1="12" y1="6" x2="34" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFFFFF" />
              <stop offset="1" stopColor="#EFF6FF" />
            </linearGradient>
            <linearGradient id="doc_lens_grad" x1="26" y1="24" x2="42" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#60A5FA" />
              <stop offset="1" stopColor="#2563EB" />
            </linearGradient>
            <filter id="doc_glow" x="4" y="2" width="40" height="44" filterUnits="userSpaceOnUse">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#2563EB" floodOpacity="0.25" />
            </filter>
          </defs>
          <g filter="url(#doc_glow)">
            {/* Back page shadow layer */}
            <rect x="14" y="5" width="22" height="34" rx="4" fill="#93C5FD" opacity="0.5" />
            {/* Main Document Body */}
            <rect x="10" y="8" width="24" height="32" rx="4" fill="url(#doc_page_grad)" stroke="#BFDBFE" strokeWidth="1.5" />
            {/* Folded Top Right Corner */}
            <path d="M28 8L34 14H30C28.8954 14 28 13.1046 28 12V8Z" fill="#DBEAFE" />
            {/* Content text lines */}
            <rect x="14" y="16" width="12" height="2" rx="1" fill="#3B82F6" />
            <rect x="14" y="21" width="16" height="2" rx="1" fill="#93C5FD" />
            <rect x="14" y="26" width="14" height="2" rx="1" fill="#93C5FD" />
            <rect x="14" y="31" width="10" height="2" rx="1" fill="#93C5FD" />
            {/* Grounding Intelligent Magnifier Badge */}
            <circle cx="33" cy="31" r="7" fill="url(#doc_lens_grad)" stroke="#FFFFFF" strokeWidth="1.5" />
            <circle cx="33" cy="31" r="4.5" fill="#1E40AF" opacity="0.2" />
            <path d="M38 36L42 40" stroke="#1D4ED8" strokeWidth="2.5" strokeLinecap="round" />
            {/* Sparkle on Lens */}
            <circle cx="31.5" cy="29.5" r="1" fill="#FFFFFF" />
          </g>
        </svg>
      );

    case 'visual-intelligence':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <defs>
            <linearGradient id="vis_frame_grad" x1="6" y1="8" x2="42" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#10B981" />
              <stop offset="1" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="vis_canvas_grad" x1="10" y1="12" x2="38" y2="36" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ECFDF5" />
              <stop offset="1" stopColor="#D1FAE5" />
            </linearGradient>
            <linearGradient id="vis_lens_grad" x1="16" y1="16" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#34D399" />
              <stop offset="1" stopColor="#047857" />
            </linearGradient>
            <filter id="vis_glow" x="4" y="6" width="40" height="38" filterUnits="userSpaceOnUse">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#059669" floodOpacity="0.25" />
            </filter>
          </defs>
          <g filter="url(#vis_glow)">
            {/* Visual Canvas Card */}
            <rect x="8" y="10" width="32" height="28" rx="6" fill="url(#vis_canvas_grad)" stroke="#A7F3D0" strokeWidth="1.5" />
            {/* Sun circle */}
            <circle cx="16" cy="18" r="3" fill="#FBBF24" />
            {/* Landscape Mountains */}
            <path d="M10 32L18 22L26 30L32 25L38 32H10Z" fill="#10B981" opacity="0.6" />
            <path d="M16 34L23 26L31 34H16Z" fill="#047857" opacity="0.8" />
            {/* Precision Optical Aperture Reticle */}
            <circle cx="31" cy="20" r="7" fill="url(#vis_lens_grad)" stroke="#FFFFFF" strokeWidth="1.5" />
            <circle cx="31" cy="20" r="3.5" fill="#064E3B" opacity="0.4" />
            <line x1="31" y1="11" x2="31" y2="15" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="31" y1="25" x2="31" y2="29" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="22" y1="20" x2="26" y2="20" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="36" y1="20" x2="40" y2="20" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        </svg>
      );

    case 'video-audio-review':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <defs>
            <linearGradient id="media_bg" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F43F5E" />
              <stop offset="1" stopColor="#E11D48" />
            </linearGradient>
            <linearGradient id="media_wave" x1="12" y1="16" x2="36" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFE4E6" />
              <stop offset="1" stopColor="#FECDD3" />
            </linearGradient>
            <filter id="media_glow" x="4" y="6" width="40" height="38" filterUnits="userSpaceOnUse">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#E11D48" floodOpacity="0.25" />
            </filter>
          </defs>
          <g filter="url(#media_glow)">
            {/* Screen / Media Frame */}
            <rect x="8" y="10" width="32" height="28" rx="6" fill="#FFF1F2" stroke="#FECDD3" strokeWidth="1.5" />
            {/* Film perforation line */}
            <rect x="8" y="10" width="32" height="5" rx="2" fill="#F43F5E" opacity="0.15" />
            {/* Play Badge Icon */}
            <circle cx="24" cy="22" r="7.5" fill="url(#media_bg)" stroke="#FFFFFF" strokeWidth="1.5" />
            <polygon points="22,18 28,22 22,26" fill="#FFFFFF" />
            {/* Waveform Equalizer frequency bars at bottom */}
            <rect x="13" y="32" width="2" height="4" rx="1" fill="#F43F5E" />
            <rect x="17" y="30" width="2" height="6" rx="1" fill="#FB7185" />
            <rect x="21" y="29" width="2" height="7" rx="1" fill="#F43F5E" />
            <rect x="25" y="31" width="2" height="5" rx="1" fill="#FB7185" />
            <rect x="29" y="28" width="2" height="8" rx="1" fill="#F43F5E" />
            <rect x="33" y="32" width="2" height="4" rx="1" fill="#FB7185" />
          </g>
        </svg>
      );

    case 'data-study':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <defs>
            <linearGradient id="data_bg" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0D9488" />
              <stop offset="1" stopColor="#0F766E" />
            </linearGradient>
            <linearGradient id="bar_grad_1" x1="12" y1="34" x2="16" y2="24" gradientUnits="userSpaceOnUse">
              <stop stopColor="#2DD4BF" />
              <stop offset="1" stopColor="#0D9488" />
            </linearGradient>
            <linearGradient id="bar_grad_2" x1="19" y1="34" x2="23" y2="18" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38BDF8" />
              <stop offset="1" stopColor="#0284C7" />
            </linearGradient>
            <linearGradient id="bar_grad_3" x1="26" y1="34" x2="30" y2="12" gradientUnits="userSpaceOnUse">
              <stop stopColor="#A855F7" />
              <stop offset="1" stopColor="#7E22CE" />
            </linearGradient>
            <filter id="data_glow" x="4" y="6" width="40" height="38" filterUnits="userSpaceOnUse">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0D9488" floodOpacity="0.25" />
            </filter>
          </defs>
          <g filter="url(#data_glow)">
            {/* Sheet / Table Background Card */}
            <rect x="8" y="10" width="32" height="28" rx="6" fill="#F0FDFA" stroke="#CCFBF1" strokeWidth="1.5" />
            {/* Grid Lines */}
            <line x1="8" y1="18" x2="40" y2="18" stroke="#E6FFFA" strokeWidth="1" />
            <line x1="8" y1="26" x2="40" y2="26" stroke="#E6FFFA" strokeWidth="1" />
            {/* Ascending Metric Bars */}
            <rect x="13" y="24" width="4" height="10" rx="1.5" fill="url(#bar_grad_1)" />
            <rect x="20" y="18" width="4" height="16" rx="1.5" fill="url(#bar_grad_2)" />
            <rect x="27" y="13" width="4" height="21" rx="1.5" fill="url(#bar_grad_3)" />
            {/* Trendline Curve with glowing nodes */}
            <path d="M15 24L22 17L29 13L35 10" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1 1" />
            <circle cx="15" cy="24" r="1.5" fill="#0D9488" />
            <circle cx="22" cy="17" r="1.5" fill="#0284C7" />
            <circle cx="29" cy="13" r="1.5" fill="#7E22CE" />
            {/* Sigma / Analytics mini pill */}
            <rect x="30" y="26" width="6" height="6" rx="1.5" fill="#14B8A6" opacity="0.2" />
            <text x="33" y="30.5" fontSize="5" fontWeight="bold" fill="#0D9488" textAnchor="middle">∑</text>
          </g>
        </svg>
      );

    case 'customer-support':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <defs>
            <linearGradient id="supp_grad" x1="10" y1="8" x2="38" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#10B981" />
              <stop offset="1" stopColor="#047857" />
            </linearGradient>
            <filter id="supp_glow" x="4" y="6" width="40" height="38" filterUnits="userSpaceOnUse">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#10B981" floodOpacity="0.25" />
            </filter>
          </defs>
          <g filter="url(#supp_glow)">
            {/* Circular Lifebuoy Body */}
            <circle cx="24" cy="24" r="15" fill="#ECFDF5" stroke="#A7F3D0" strokeWidth="2" />
            <circle cx="24" cy="24" r="7.5" fill="#FFFFFF" stroke="#059669" strokeWidth="1.5" />
            {/* Lifebuoy red/emerald segments */}
            <path d="M24 9V16.5" stroke="#059669" strokeWidth="3" strokeLinecap="round" />
            <path d="M24 31.5V39" stroke="#059669" strokeWidth="3" strokeLinecap="round" />
            <path d="M9 24H16.5" stroke="#059669" strokeWidth="3" strokeLinecap="round" />
            <path d="M31.5 24H39" stroke="#059669" strokeWidth="3" strokeLinecap="round" />
            {/* Headset Arc */}
            <path d="M15 22C15 17.0294 19.0294 13 24 13C28.9706 13 33 17.0294 33 22V26" stroke="#047857" strokeWidth="1.8" strokeLinecap="round" />
            <rect x="13.5" y="21" width="3" height="6" rx="1.5" fill="#047857" />
            <rect x="31.5" y="21" width="3" height="6" rx="1.5" fill="#047857" />
            {/* Pulse heart in center */}
            <circle cx="24" cy="24" r="2.5" fill="#10B981" />
          </g>
        </svg>
      );

    case 'ai-resume-builder':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <defs>
            <linearGradient id="res_bg" x1="10" y1="6" x2="38" y2="42" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0284C7" />
              <stop offset="1" stopColor="#0369A1" />
            </linearGradient>
            <filter id="res_glow" x="4" y="4" width="40" height="42" filterUnits="userSpaceOnUse">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0284C7" floodOpacity="0.25" />
            </filter>
          </defs>
          <g filter="url(#res_glow)">
            {/* Clean Resume Sheet */}
            <rect x="11" y="7" width="26" height="34" rx="4" fill="#F0F9FF" stroke="#BAE6FD" strokeWidth="1.5" />
            {/* Candidate Avatar Photo Badge */}
            <circle cx="19" cy="15" r="4" fill="#38BDF8" />
            {/* Name and Title Lines */}
            <rect x="25" y="13" width="9" height="2" rx="1" fill="#0284C7" />
            <rect x="25" y="16.5" width="6" height="1.5" rx="0.75" fill="#7DD3FC" />
            {/* Section Divider */}
            <line x1="15" y1="21" x2="33" y2="21" stroke="#E0F2FE" strokeWidth="1.2" />
            {/* Experience / Skills Sections */}
            <rect x="15" y="24" width="10" height="1.5" rx="0.75" fill="#0284C7" />
            <rect x="15" y="27.5" width="16" height="1.5" rx="0.75" fill="#7DD3FC" />
            <rect x="15" y="30.5" width="14" height="1.5" rx="0.75" fill="#BAE6FD" />
            <rect x="15" y="34.5" width="8" height="1.5" rx="0.75" fill="#0284C7" />
            <rect x="15" y="37.5" width="12" height="1.5" rx="0.75" fill="#7DD3FC" />
            {/* ATS Verified Star Badge */}
            <circle cx="32" cy="33" r="5" fill="#0284C7" stroke="#FFFFFF" strokeWidth="1.2" />
            <path d="M30 33L31.5 34.5L34.5 31.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </svg>
      );

    case 'ai-presentation-maker':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <defs>
            <linearGradient id="pres_grad" x1="8" y1="10" x2="40" y2="38" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8B5CF6" />
              <stop offset="1" stopColor="#6D28D9" />
            </linearGradient>
            <filter id="pres_glow" x="4" y="6" width="40" height="38" filterUnits="userSpaceOnUse">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#8B5CF6" floodOpacity="0.25" />
            </filter>
          </defs>
          <g filter="url(#pres_glow)">
            {/* Presentation 16:9 Screen */}
            <rect x="8" y="11" width="32" height="24" rx="4" fill="#F5F3FF" stroke="#DDD6FE" strokeWidth="1.5" />
            {/* Presentation Header Bar */}
            <rect x="8" y="11" width="32" height="5" rx="2" fill="url(#pres_grad)" />
            {/* Slide Title */}
            <rect x="12" y="19" width="12" height="2" rx="1" fill="#7C3AED" />
            {/* Slide Columns */}
            <rect x="12" y="23" width="11" height="8" rx="2" fill="#EDE9FE" />
            <rect x="25" y="23" width="11" height="8" rx="2" fill="#EDE9FE" />
            {/* Mini Chart Bars in column */}
            <rect x="14" y="27" width="2" height="3" rx="0.5" fill="#8B5CF6" />
            <rect x="17" y="25" width="2" height="5" rx="0.5" fill="#7C3AED" />
            <rect x="20" y="24" width="2" height="6" rx="0.5" fill="#6D28D9" />
            {/* Stand / Projector Base */}
            <path d="M21 35L19 39H29L27 35H21Z" fill="#C4B5FD" />
            {/* Presentation Badge */}
            <circle cx="33" cy="27" r="4.5" fill="#7C3AED" stroke="#FFFFFF" strokeWidth="1" />
            <polygon points="32,25 35,27 32,29" fill="#FFFFFF" />
          </g>
        </svg>
      );

    case 'ai-interview':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <defs>
            <linearGradient id="int_grad" x1="10" y1="8" x2="38" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#A855F7" />
              <stop offset="1" stopColor="#7E22CE" />
            </linearGradient>
            <filter id="int_glow" x="4" y="6" width="40" height="38" filterUnits="userSpaceOnUse">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#A855F7" floodOpacity="0.25" />
            </filter>
          </defs>
          <g filter="url(#int_glow)">
            {/* Interviewer Persona Card */}
            <rect x="8" y="10" width="32" height="28" rx="6" fill="#FAF5FF" stroke="#E9D5FF" strokeWidth="1.5" />
            {/* Professional Persona Avatar */}
            <circle cx="24" cy="19" r="5" fill="url(#int_grad)" />
            <path d="M17 31C17 27.5 20 26 24 26C28 26 31 27.5 31 31" fill="#9333EA" opacity="0.7" />
            {/* Dialogue / Speech Resonance Wave */}
            <path d="M31 16C33 17 34 19 34 21" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M34 14C37 16 38 19 38 22" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
            <path d="M17 16C15 17 14 19 14 21" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round" />
            {/* Evaluation Verified Ribbon */}
            <circle cx="32" cy="30" r="4.5" fill="#7E22CE" stroke="#FFFFFF" strokeWidth="1" />
            <polygon points="32,27 33,29 35,29.5 33.5,31 34,33 32,32 30,33 30.5,31 29,29.5 31,29" fill="#FFFFFF" />
          </g>
        </svg>
      );

    case 'ai-screen-assistant':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <defs>
            <linearGradient id="scr_grad" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#06B6D4" />
              <stop offset="1" stopColor="#0891B2" />
            </linearGradient>
            <filter id="scr_glow" x="4" y="6" width="40" height="38" filterUnits="userSpaceOnUse">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0891B2" floodOpacity="0.25" />
            </filter>
          </defs>
          <g filter="url(#scr_glow)">
            {/* Ultra-wide Monitor Frame */}
            <rect x="7" y="10" width="34" height="23" rx="4" fill="#ECFEFF" stroke="#A5F3FC" strokeWidth="1.5" />
            {/* Screen Stand */}
            <rect x="22" y="33" width="4" height="4" fill="#0891B2" opacity="0.6" />
            <rect x="17" y="37" width="14" height="2" rx="1" fill="#0891B2" />
            {/* Window titlebar with 3 dots */}
            <rect x="7" y="10" width="34" height="5" rx="2" fill="#06B6D4" opacity="0.2" />
            <circle cx="10.5" cy="12.5" r="1" fill="#0891B2" />
            <circle cx="13.5" cy="12.5" r="1" fill="#0891B2" />
            <circle cx="16.5" cy="12.5" r="1" fill="#0891B2" />
            {/* Application Content Grid */}
            <rect x="11" y="18" width="14" height="11" rx="2" fill="#CFFAFE" />
            <rect x="28" y="18" width="9" height="11" rx="2" fill="#E0F2FE" />
            {/* AI Guidance Cursor Compass */}
            <path d="M22 23L27 27L24 28L25.5 31L24 31.5L22.5 28.5L20.5 30.5L22 23Z" fill="#0891B2" stroke="#FFFFFF" strokeWidth="0.8" />
            <circle cx="23" cy="24" r="1" fill="#22D3EE" />
          </g>
        </svg>
      );

    case 'ai-image-generator':
    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <defs>
            <linearGradient id="def_grad" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366F1" />
              <stop offset="1" stopColor="#4F46E5" />
            </linearGradient>
            <filter id="def_glow" x="4" y="6" width="40" height="38" filterUnits="userSpaceOnUse">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#6366F1" floodOpacity="0.25" />
            </filter>
          </defs>
          <g filter="url(#def_glow)">
            <rect x="8" y="10" width="32" height="28" rx="6" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="1.5" />
            <path d="M24 14L26 20L32 22L26 24L24 30L22 24L16 22L22 20L24 14Z" fill="url(#def_grad)" />
            <circle cx="33" cy="16" r="2" fill="#818CF8" />
            <circle cx="15" cy="31" r="1.5" fill="#818CF8" />
          </g>
        </svg>
      );
  }
};
