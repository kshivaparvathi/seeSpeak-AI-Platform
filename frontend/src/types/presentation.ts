export type SlideLayoutType =
  | 'title'
  | 'bullets'
  | 'two-column'
  | 'process'
  | 'timeline'
  | 'table'
  | 'stats'
  | 'diagram'
  | 'comparison'
  | 'conclusion'
  | 'section'
  | 'steps'
  | 'qa';

export type PresentationThemeId =
  | 'modern-professional'
  | 'academic'
  | 'corporate'
  | 'minimal'
  | 'technology'
  | 'dark-professional'
  | 'clean-business'
  | 'creative';

export type PresentationAudience =
  | 'School'
  | 'College'
  | 'University'
  | 'Professional'
  | 'Technical'
  | 'General';

export type PresentationLevel =
  | 'Simple'
  | 'Moderate'
  | 'Detailed'
  | 'Advanced';

export type PresentationTone =
  | 'Academic'
  | 'Professional'
  | 'Corporate'
  | 'Technical'
  | 'Simple / Student-friendly';

export interface SlideColumn {
  heading: string;
  bullets: string[];
  badge?: string;
}

export interface SlideStep {
  step: number;
  title: string;
  description: string;
}

export interface SlideTableData {
  headers: string[];
  rows: string[][];
}

export interface SlideStatItem {
  value: string;
  label: string;
  description?: string;
}

export interface SlideItem {
  id: string;
  slide_number: number;
  title: string;
  subtitle?: string;
  layout: SlideLayoutType;
  content?: string;
  bullet_points?: string[];
  columns?: SlideColumn[];
  steps?: SlideStep[];
  table_data?: SlideTableData;
  stats?: SlideStatItem[];
  speaker_notes?: string;
  visual_hint?: string;
}

export interface PresentationProject {
  id: string;
  conversation_id: string;
  title: string;
  theme_id: PresentationThemeId;
  topic: string;
  slide_count: number;
  audience: PresentationAudience;
  level: PresentationLevel;
  tone: PresentationTone;
  language: string;
  slides: SlideItem[];
  outline: { slide_number: number; title: string; layout: SlideLayoutType }[];
  created_at: string;
  updated_at: string;
}

export interface ThemeConfig {
  id: PresentationThemeId;
  name: string;
  description: string;
  canvasBg: string;
  titleColor: string;
  subtitleColor: string;
  bodyColor: string;
  accentBg: string;
  accentText: string;
  cardBg: string;
  cardBorder: string;
  headerBarBg: string;
  badgeBg: string;
  fontFamily: string;
}

export const PRESENTATION_THEMES: Record<PresentationThemeId, ThemeConfig> = {
  'modern-professional': {
    id: 'modern-professional',
    name: 'Modern Professional',
    description: 'Clean white canvas with deep slate headers and vibrant emerald accents.',
    canvasBg: 'bg-white',
    titleColor: 'text-slate-900',
    subtitleColor: 'text-slate-500',
    bodyColor: 'text-slate-700',
    accentBg: 'bg-emerald-600',
    accentText: 'text-emerald-600',
    cardBg: 'bg-slate-50',
    cardBorder: 'border-slate-200',
    headerBarBg: 'bg-emerald-600',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    fontFamily: 'font-sans',
  },
  'corporate': {
    id: 'corporate',
    name: 'Corporate Executive',
    description: 'Authoritative deep navy canvas with sky blue highlights and crisp borders.',
    canvasBg: 'bg-white',
    titleColor: 'text-blue-950',
    subtitleColor: 'text-blue-700',
    bodyColor: 'text-slate-700',
    accentBg: 'bg-blue-900',
    accentText: 'text-blue-800',
    cardBg: 'bg-blue-50/50',
    cardBorder: 'border-blue-200',
    headerBarBg: 'bg-blue-900',
    badgeBg: 'bg-blue-100 text-blue-900 border-blue-300',
    fontFamily: 'font-sans',
  },
  'academic': {
    id: 'academic',
    name: 'Academic & Research',
    description: 'Scholarly cream background with deep burgundy serif typography.',
    canvasBg: 'bg-[#faf8f5]',
    titleColor: 'text-rose-950',
    subtitleColor: 'text-rose-800',
    bodyColor: 'text-stone-700',
    accentBg: 'bg-rose-900',
    accentText: 'text-rose-900',
    cardBg: 'bg-[#f4efe9]',
    cardBorder: 'border-rose-200',
    headerBarBg: 'bg-rose-900',
    badgeBg: 'bg-rose-100 text-rose-900 border-rose-300',
    fontFamily: 'font-serif',
  },
  'technology': {
    id: 'technology',
    name: 'Technology & Code',
    description: 'Dark terminal slate with luminous cyan accents and monospace touches.',
    canvasBg: 'bg-slate-900',
    titleColor: 'text-white',
    subtitleColor: 'text-cyan-400',
    bodyColor: 'text-slate-300',
    accentBg: 'bg-cyan-500',
    accentText: 'text-cyan-400',
    cardBg: 'bg-slate-800/80',
    cardBorder: 'border-slate-700',
    headerBarBg: 'bg-cyan-500',
    badgeBg: 'bg-cyan-950 text-cyan-300 border-cyan-800',
    fontFamily: 'font-mono',
  },
  'minimal': {
    id: 'minimal',
    name: 'Clean Minimalist',
    description: 'High-contrast charcoal & black with generous whitespace and modern typography.',
    canvasBg: 'bg-white',
    titleColor: 'text-zinc-950',
    subtitleColor: 'text-zinc-500',
    bodyColor: 'text-zinc-700',
    accentBg: 'bg-zinc-900',
    accentText: 'text-zinc-900',
    cardBg: 'bg-zinc-50',
    cardBorder: 'border-zinc-200',
    headerBarBg: 'bg-zinc-900',
    badgeBg: 'bg-zinc-100 text-zinc-900 border-zinc-300',
    fontFamily: 'font-sans',
  },
  'dark-professional': {
    id: 'dark-professional',
    name: 'Dark Professional',
    description: 'Midnight canvas with high-contrast amber and white elements for dim rooms.',
    canvasBg: 'bg-zinc-950',
    titleColor: 'text-white',
    subtitleColor: 'text-amber-400',
    bodyColor: 'text-zinc-300',
    accentBg: 'bg-amber-500',
    accentText: 'text-amber-400',
    cardBg: 'bg-zinc-900',
    cardBorder: 'border-zinc-800',
    headerBarBg: 'bg-amber-500',
    badgeBg: 'bg-amber-950 text-amber-300 border-amber-800',
    fontFamily: 'font-sans',
  },
  'clean-business': {
    id: 'clean-business',
    name: 'Clean Business',
    description: 'Fresh royal blue and slate with structured cards for business pitches.',
    canvasBg: 'bg-white',
    titleColor: 'text-sky-950',
    subtitleColor: 'text-sky-700',
    bodyColor: 'text-slate-700',
    accentBg: 'bg-sky-600',
    accentText: 'text-sky-600',
    cardBg: 'bg-sky-50/60',
    cardBorder: 'border-sky-200',
    headerBarBg: 'bg-sky-600',
    badgeBg: 'bg-sky-100 text-sky-900 border-sky-300',
    fontFamily: 'font-sans',
  },
  'creative': {
    id: 'creative',
    name: 'Creative & Vibrant',
    description: 'Rich purple canvas with vibrant pink and coral highlights for creative pitches.',
    canvasBg: 'bg-white',
    titleColor: 'text-purple-950',
    subtitleColor: 'text-pink-600',
    bodyColor: 'text-slate-700',
    accentBg: 'bg-purple-600',
    accentText: 'text-purple-600',
    cardBg: 'bg-pink-50/40',
    cardBorder: 'border-pink-200',
    headerBarBg: 'bg-purple-600',
    badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
    fontFamily: 'font-sans',
  },
};
