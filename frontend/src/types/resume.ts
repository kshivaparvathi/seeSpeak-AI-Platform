export type TemplateId =
  | 'ats-professional'
  | 'ats-classic'
  | 'ats-executive'
  | 'ats-one-column'
  | 'software-engineer'
  | 'modern-developer'
  | 'competitive-programmer'
  | 'tech-professional'
  | 'engineering-minimal'
  | 'modern-two-column'
  | 'modern-minimal'
  | 'clean-modern'
  | 'professional-modern'
  | 'contemporary'
  | 'corporate-professional'
  | 'corporate-executive'
  | 'academic-research'
  | 'one-page-compact'
  | 'graduate-compact'
  | 'entry-level-professional';

export type TemplateFilterCategory =
  | 'all'
  | 'ats'
  | 'tech'
  | 'modern'
  | 'corporate'
  | 'academic'
  | 'compact'
  | 'favorites';

export type AccentColor = 'slate' | 'navy' | 'emerald' | 'burgundy' | 'indigo' | 'charcoal';

export type SectionType =
  | 'summary'
  | 'skills'
  | 'experience'
  | 'projects'
  | 'education'
  | 'certifications'
  | 'achievements'
  | 'extracurricular'
  | 'coursework'
  | 'publications';

export interface ResumePersonalInfo {
  fullName: string;
  professionalTitle?: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
}

export interface ResumeEducation {
  degree: string;
  fieldOfStudy?: string;
  institution: string;
  university?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  year?: string;
  gpa?: string;
  coursework?: string;
}

export interface ResumeSkills {
  languages: string[];
  frameworks: string[];
  tools: string[];
  databases: string[];
  cloud: string[];
  other?: string[];
}

export interface ResumeExperience {
  company: string;
  role: string;
  duration?: string;
  startDate?: string;
  endDate?: string;
  employmentType?: string;
  location?: string;
  responsibilities?: string;
  bullets: string[];
}

export interface ResumeProjectItem {
  name: string;
  description?: string;
  technologies: string[];
  link?: string;
  githubLink?: string;
  achievements?: string;
  bullets: string[];
}

export interface ResumeCertification {
  name: string;
  issuer?: string;
  date?: string;
  year?: string;
  link?: string;
}

export interface ResumeAchievement {
  title: string;
  description: string;
  date?: string;
}

export interface ResumeExtracurricular {
  activity: string;
  role?: string;
  description?: string;
}

export interface ResumeData {
  personalInfo: ResumePersonalInfo;
  summary: string;
  education: ResumeEducation[];
  skills: ResumeSkills;
  experience: ResumeExperience[];
  projects: ResumeProjectItem[];
  certifications: ResumeCertification[];
  achievements: ResumeAchievement[];
  extracurricular: ResumeExtracurricular[];
  sectionOrder: SectionType[];
  accentColor?: AccentColor;
}

export interface AtsAnalysisData {
  ats_score?: number;
  keyword_match_percentage?: number;
  matched_keywords: string[];
  missing_keywords: string[];
  strengths: string[];
  formatting_issues: string[];
  actionable_recommendations: string[];
}

export interface ResumeTemplate {
  id: TemplateId;
  name: string;
  category: 'ATS / Professional' | 'Software / Technology' | 'Modern' | 'Corporate' | 'Academic' | 'Compact';
  filterCategory: TemplateFilterCategory;
  description: string;
  atsFriendly: 'Highly compatible' | 'Parser optimized' | 'Standard compatible';
  recommendedLength: string;
  layoutType: 'Single Column' | 'Header Split' | 'Two Column' | 'Compact Single Column' | 'Academic CV';
  bestFor: string;
  tags: string[];
  accentDefault: AccentColor;
}

export interface ResumeProject {
  id: string;
  conversation_id: string;
  title: string;
  template_id: TemplateId;
  target_company?: string;
  target_role?: string;
  job_description?: string;
  resume_data: ResumeData;
  ats_analysis?: AtsAnalysisData;
  created_at: string;
  updated_at: string;
}
