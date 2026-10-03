import React, { useState } from 'react';
import { 
  ResumeData, 
  SectionType, 
  AccentColor, 
  ResumeExperience, 
  ResumeProjectItem, 
  ResumeEducation, 
  ResumeCertification, 
  ResumeAchievement, 
  ResumeExtracurricular 
} from '../../types/resume';
import { 
  User, 
  GraduationCap, 
  Code2, 
  Briefcase, 
  FolderGit2, 
  Award, 
  Trophy, 
  Compass, 
  Sparkles, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  FileText, 
  Palette, 
  Wand2, 
  Check, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';

interface ResumeEditorFormProps {
  resumeData: ResumeData;
  onChange: (updated: ResumeData) => void;
  onPolishSection: (section: 'summary' | 'experience' | 'projects' | 'bullet', content: any) => Promise<any>;
  onGenerateSummary: () => Promise<void>;
  isGeneratingSummary?: boolean;
  isImprovingSection?: string | null;
}

export const ResumeEditorForm: React.FC<ResumeEditorFormProps> = ({
  resumeData,
  onChange,
  onPolishSection,
  onGenerateSummary,
  isGeneratingSummary = false,
  isImprovingSection = null,
}) => {
  // Collapsible section state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleCollapse = (sec: string) => {
    setCollapsedSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  // Helper to update personal info
  const handleUpdatePersonalInfo = (key: keyof ResumeData['personalInfo'], val: string) => {
    onChange({
      ...resumeData,
      personalInfo: { ...resumeData.personalInfo, [key]: val },
    });
  };

  // Helper to update skills
  const handleUpdateSkills = (category: keyof ResumeData['skills'], rawText: string) => {
    const list = rawText.split(',').map((s) => s.trim()).filter(Boolean);
    onChange({
      ...resumeData,
      skills: { ...resumeData.skills, [category]: list },
    });
  };

  // Accent color selector
  const accentColors: { id: AccentColor; label: string; bg: string }[] = [
    { id: 'slate', label: 'Classic Slate', bg: 'bg-slate-900' },
    { id: 'navy', label: 'Royal Navy', bg: 'bg-blue-900' },
    { id: 'emerald', label: 'Forest Emerald', bg: 'bg-emerald-800' },
    { id: 'burgundy', label: 'Executive Burgundy', bg: 'bg-rose-900' },
    { id: 'indigo', label: 'Modern Indigo', bg: 'bg-indigo-900' },
    { id: 'charcoal', label: 'Graphite Charcoal', bg: 'bg-zinc-800' },
  ];

  // Section Ordering Helpers
  const moveSection = (index: number, direction: 'up' | 'down') => {
    const order = [...(resumeData.sectionOrder || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= order.length) return;
    const temp = order[index];
    order[index] = order[targetIndex];
    order[targetIndex] = temp;
    onChange({ ...resumeData, sectionOrder: order });
  };

  const removeSection = (sec: SectionType) => {
    const order = (resumeData.sectionOrder || []).filter((s) => s !== sec);
    onChange({ ...resumeData, sectionOrder: order });
  };

  const addSection = (sec: SectionType) => {
    if (!resumeData.sectionOrder.includes(sec)) {
      onChange({ ...resumeData, sectionOrder: [...resumeData.sectionOrder, sec] });
    }
  };

  const allAvailableSections: { id: SectionType; label: string }[] = [
    { id: 'summary', label: 'Professional Summary' },
    { id: 'skills', label: 'Technical Skills' },
    { id: 'experience', label: 'Experience' },
    { id: 'projects', label: 'Projects' },
    { id: 'education', label: 'Education' },
    { id: 'certifications', label: 'Certifications' },
    { id: 'achievements', label: 'Achievements' },
    { id: 'extracurricular', label: 'Leadership & Extracurricular' },
  ];

  // Improve single bullet helper
  const handleImproveBullet = async (
    type: 'experience' | 'projects',
    itemIndex: number,
    bulletIndex: number,
    currentBullet: string
  ) => {
    if (!currentBullet.trim()) return;
    try {
      const res = await onPolishSection('bullet', { bullet: currentBullet });
      if (res && res.improved_bullet) {
        if (type === 'experience') {
          const updatedExp = [...resumeData.experience];
          updatedExp[itemIndex].bullets[bulletIndex] = res.improved_bullet;
          onChange({ ...resumeData, experience: updatedExp });
        } else {
          const updatedProj = [...resumeData.projects];
          updatedProj[itemIndex].bullets[bulletIndex] = res.improved_bullet;
          onChange({ ...resumeData, projects: updatedProj });
        }
      }
    } catch (e) {
      console.error('Failed to improve bullet:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Accent Color Palette Selector */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Palette size={14} className="text-emerald-500" />
            <span>Document Accent Color</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Subtle & Machine-Readable</span>
        </div>
        <div className="flex items-center gap-2">
          {accentColors.map((color) => (
            <button
              key={color.id}
              onClick={() => onChange({ ...resumeData, accentColor: color.id })}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                (resumeData.accentColor || 'slate') === color.id
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-white'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <span className={`w-3 h-3 rounded-full ${color.bg} shrink-0`}></span>
              <span className="hidden sm:inline text-[11px]">{color.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* SECTION ORDER & MANAGEMENT BAR */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono uppercase">
            Section Arrangement ({resumeData.sectionOrder.length})
          </span>
          <span className="text-[10px] text-slate-500">Reorder with arrows to customize hierarchy</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {resumeData.sectionOrder.map((sec, index) => {
            const label = allAvailableSections.find((s) => s.id === sec)?.label || sec;
            return (
              <div
                key={sec}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xs"
              >
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">{label}</span>
                <div className="flex items-center gap-0.5 ml-1 border-l border-slate-200 dark:border-slate-700 pl-1">
                  <button
                    disabled={index === 0}
                    onClick={() => moveSection(index, 'up')}
                    className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                    title="Move up"
                  >
                    <ArrowUp size={11} />
                  </button>
                  <button
                    disabled={index === resumeData.sectionOrder.length - 1}
                    onClick={() => moveSection(index, 'down')}
                    className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                    title="Move down"
                  >
                    <ArrowDown size={11} />
                  </button>
                  <button
                    onClick={() => removeSection(sec)}
                    className="p-0.5 text-slate-400 hover:text-rose-500 cursor-pointer ml-0.5"
                    title="Remove section"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Missing Section */}
        {allAvailableSections.some((s) => !resumeData.sectionOrder.includes(s.id)) && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">+ Add Section:</span>
            {allAvailableSections
              .filter((s) => !resumeData.sectionOrder.includes(s.id))
              .map((s) => (
                <button
                  key={s.id}
                  onClick={() => addSection(s.id)}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 cursor-pointer"
                >
                  + {s.label}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* 1. PERSONAL INFORMATION */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase text-slate-800 dark:text-slate-200">
            <User size={14} className="text-emerald-500" />
            <span>Personal Information</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Always on header</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-slate-500">Full Name *</label>
            <input
              type="text"
              value={resumeData.personalInfo.fullName}
              onChange={(e) => handleUpdatePersonalInfo('fullName', e.target.value)}
              placeholder="e.g. Shiva Parvathi"
              className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500">Professional Title *</label>
            <input
              type="text"
              value={resumeData.personalInfo.professionalTitle || ''}
              onChange={(e) => handleUpdatePersonalInfo('professionalTitle', e.target.value)}
              placeholder="e.g. Software Engineer, AI/ML Engineer, Student"
              className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500">Email Address</label>
            <input
              type="email"
              value={resumeData.personalInfo.email}
              onChange={(e) => handleUpdatePersonalInfo('email', e.target.value)}
              placeholder="e.g. shiva@example.com"
              className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500">Phone Number</label>
            <input
              type="text"
              value={resumeData.personalInfo.phone}
              onChange={(e) => handleUpdatePersonalInfo('phone', e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500">Location</label>
            <input
              type="text"
              value={resumeData.personalInfo.location}
              onChange={(e) => handleUpdatePersonalInfo('location', e.target.value)}
              placeholder="e.g. Hyderabad, India"
              className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500">LinkedIn Profile</label>
            <input
              type="text"
              value={resumeData.personalInfo.linkedin}
              onChange={(e) => handleUpdatePersonalInfo('linkedin', e.target.value)}
              placeholder="e.g. linkedin.com/in/shivaparvathi"
              className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500">GitHub Profile</label>
            <input
              type="text"
              value={resumeData.personalInfo.github}
              onChange={(e) => handleUpdatePersonalInfo('github', e.target.value)}
              placeholder="e.g. github.com/shivaparvathi"
              className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500">Portfolio / Website</label>
            <input
              type="text"
              value={resumeData.personalInfo.portfolio}
              onChange={(e) => handleUpdatePersonalInfo('portfolio', e.target.value)}
              placeholder="e.g. shivaparvathi.dev"
              className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>
      </div>

      {/* 2. PROFESSIONAL SUMMARY */}
      {resumeData.sectionOrder.includes('summary') && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase text-slate-800 dark:text-slate-200">
              <FileText size={14} className="text-emerald-500" />
              <span>Professional Summary</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onGenerateSummary}
                disabled={isGeneratingSummary}
                className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer disabled:opacity-50"
                title="Synthesize summary based strictly on your education, skills, and projects"
              >
                <Wand2 size={12} />
                <span>{isGeneratingSummary ? 'Synthesizing...' : 'Generate from Credentials'}</span>
              </button>
              <button
                onClick={() => onPolishSection('summary', resumeData.summary)}
                disabled={isImprovingSection === 'summary'}
                className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer disabled:opacity-50"
              >
                <Sparkles size={12} />
                <span>{isImprovingSection === 'summary' ? 'Polishing...' : 'AI Polish'}</span>
              </button>
            </div>
          </div>
          <textarea
            rows={3}
            value={resumeData.summary}
            onChange={(e) => onChange({ ...resumeData, summary: e.target.value })}
            placeholder="A concise, high-impact summary highlighting your background, core technical strengths, and problem-solving passion..."
            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      )}

      {/* 3. TECHNICAL SKILLS */}
      {resumeData.sectionOrder.includes('skills') && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase text-slate-800 dark:text-slate-200">
              <Code2 size={14} className="text-emerald-500" />
              <span>Technical Skills (Categorized, Comma-Separated)</span>
            </div>
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="text-[11px] font-medium text-slate-500">Programming Languages</label>
              <input
                type="text"
                value={resumeData.skills.languages?.join(', ') || ''}
                onChange={(e) => handleUpdateSkills('languages', e.target.value)}
                placeholder="Python, Java, SQL, JavaScript, C++"
                className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-500">Frameworks & Libraries</label>
              <input
                type="text"
                value={resumeData.skills.frameworks?.join(', ') || ''}
                onChange={(e) => handleUpdateSkills('frameworks', e.target.value)}
                placeholder="React, Node.js, Express, FastAPI, Tailwind CSS"
                className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-500">Databases</label>
                <input
                  type="text"
                  value={resumeData.skills.databases?.join(', ') || ''}
                  onChange={(e) => handleUpdateSkills('databases', e.target.value)}
                  placeholder="MySQL, PostgreSQL, MongoDB, Redis"
                  className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500">Cloud & Infrastructure</label>
                <input
                  type="text"
                  value={resumeData.skills.cloud?.join(', ') || ''}
                  onChange={(e) => handleUpdateSkills('cloud', e.target.value)}
                  placeholder="AWS, Docker, GCP, Vercel"
                  className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-500">Developer Tools</label>
                <input
                  type="text"
                  value={resumeData.skills.tools?.join(', ') || ''}
                  onChange={(e) => handleUpdateSkills('tools', e.target.value)}
                  placeholder="Git, GitHub, Linux, Postman, VS Code"
                  className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500">Other Skills & Concepts</label>
                <input
                  type="text"
                  value={resumeData.skills.other?.join(', ') || ''}
                  onChange={(e) => handleUpdateSkills('other', e.target.value)}
                  placeholder="REST APIs, System Design, Data Structures"
                  className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. WORK EXPERIENCE */}
      {resumeData.sectionOrder.includes('experience') && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase text-slate-800 dark:text-slate-200">
              <Briefcase size={14} className="text-emerald-500" />
              <span>Work Experience</span>
            </div>
            <button
              onClick={() => {
                const newExp: ResumeExperience = {
                  company: '',
                  role: '',
                  duration: '',
                  location: '',
                  bullets: [''],
                };
                onChange({ ...resumeData, experience: [...resumeData.experience, newExp] });
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
            >
              <Plus size={12} />
              <span>Add Role</span>
            </button>
          </div>

          <div className="space-y-4">
            {resumeData.experience.map((exp, i) => (
              <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                    Experience #{i + 1}
                  </span>
                  <button
                    onClick={() => {
                      const updated = resumeData.experience.filter((_, idx) => idx !== i);
                      onChange({ ...resumeData, experience: updated });
                    }}
                    className="text-slate-400 hover:text-rose-500 cursor-pointer p-1"
                    title="Delete role"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={exp.role}
                    placeholder="Job Title / Role (e.g. Software Engineer)"
                    onChange={(e) => {
                      const newExp = [...resumeData.experience];
                      newExp[i].role = e.target.value;
                      onChange({ ...resumeData, experience: newExp });
                    }}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold"
                  />
                  <input
                    type="text"
                    value={exp.company}
                    placeholder="Company Name"
                    onChange={(e) => {
                      const newExp = [...resumeData.experience];
                      newExp[i].company = e.target.value;
                      onChange({ ...resumeData, experience: newExp });
                    }}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={exp.duration || ''}
                    placeholder="Dates (e.g. May 2024 - Present)"
                    onChange={(e) => {
                      const newExp = [...resumeData.experience];
                      newExp[i].duration = e.target.value;
                      onChange({ ...resumeData, experience: newExp });
                    }}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono"
                  />
                  <input
                    type="text"
                    value={exp.location || ''}
                    placeholder="Location (e.g. Hyderabad, India)"
                    onChange={(e) => {
                      const newExp = [...resumeData.experience];
                      newExp[i].location = e.target.value;
                      onChange({ ...resumeData, experience: newExp });
                    }}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>

                {/* Bullets with AI improve for each */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono text-slate-500 uppercase">
                      Accomplishments / Bullet Points
                    </label>
                    <button
                      onClick={() => {
                        const newExp = [...resumeData.experience];
                        newExp[i].bullets.push('');
                        onChange({ ...resumeData, experience: newExp });
                      }}
                      className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      + Add Bullet
                    </button>
                  </div>

                  {exp.bullets.map((bullet, bi) => (
                    <div key={bi} className="flex items-start gap-1.5">
                      <textarea
                        rows={2}
                        value={bullet}
                        placeholder="Action verb + achievement + technical scope..."
                        onChange={(e) => {
                          const newExp = [...resumeData.experience];
                          newExp[i].bullets[bi] = e.target.value;
                          onChange({ ...resumeData, experience: newExp });
                        }}
                        className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 leading-relaxed"
                      />
                      <div className="flex flex-col gap-1 pt-1">
                        <button
                          onClick={() => handleImproveBullet('experience', i, bi, bullet)}
                          className="p-1 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                          title="Improve this bullet with strong action verbs & clear impact (no fake numbers)"
                        >
                          <Sparkles size={11} />
                        </button>
                        {exp.bullets.length > 1 && (
                          <button
                            onClick={() => {
                              const newExp = [...resumeData.experience];
                              newExp[i].bullets = newExp[i].bullets.filter((_, bidx) => bidx !== bi);
                              onChange({ ...resumeData, experience: newExp });
                            }}
                            className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. TECHNICAL PROJECTS */}
      {resumeData.sectionOrder.includes('projects') && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase text-slate-800 dark:text-slate-200">
              <FolderGit2 size={14} className="text-emerald-500" />
              <span>Flagship Projects</span>
            </div>
            <button
              onClick={() => {
                const newProj: ResumeProjectItem = {
                  name: '',
                  description: '',
                  technologies: [],
                  bullets: [''],
                };
                onChange({ ...resumeData, projects: [...resumeData.projects, newProj] });
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
            >
              <Plus size={12} />
              <span>Add Project</span>
            </button>
          </div>

          <div className="space-y-4">
            {resumeData.projects.map((proj, i) => (
              <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                    Project #{i + 1}
                  </span>
                  <button
                    onClick={() => {
                      const updated = resumeData.projects.filter((_, idx) => idx !== i);
                      onChange({ ...resumeData, projects: updated });
                    }}
                    className="text-slate-400 hover:text-rose-500 cursor-pointer p-1"
                    title="Delete project"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={proj.name}
                    placeholder="Project Name (e.g. Online Voting System)"
                    onChange={(e) => {
                      const newProj = [...resumeData.projects];
                      newProj[i].name = e.target.value;
                      onChange({ ...resumeData, projects: newProj });
                    }}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-bold"
                  />
                  <input
                    type="text"
                    value={proj.technologies?.join(', ') || ''}
                    placeholder="Technologies (e.g. Node.js, Express, MySQL)"
                    onChange={(e) => {
                      const newProj = [...resumeData.projects];
                      newProj[i].technologies = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                      onChange({ ...resumeData, projects: newProj });
                    }}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={proj.link || ''}
                    placeholder="Live URL / Demo Link"
                    onChange={(e) => {
                      const newProj = [...resumeData.projects];
                      newProj[i].link = e.target.value;
                      onChange({ ...resumeData, projects: newProj });
                    }}
                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono"
                  />
                  <input
                    type="text"
                    value={proj.githubLink || ''}
                    placeholder="GitHub Repo Link"
                    onChange={(e) => {
                      const newProj = [...resumeData.projects];
                      newProj[i].githubLink = e.target.value;
                      onChange({ ...resumeData, projects: newProj });
                    }}
                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono"
                  />
                </div>

                <textarea
                  rows={2}
                  value={proj.description || ''}
                  placeholder="One-sentence description of the project problem and system architecture..."
                  onChange={(e) => {
                    const newProj = [...resumeData.projects];
                    newProj[i].description = e.target.value;
                    onChange({ ...resumeData, projects: newProj });
                  }}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 leading-relaxed"
                />

                {/* Bullets with AI improve */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono text-slate-500 uppercase">
                      Technical Impact & Bullets
                    </label>
                    <button
                      onClick={() => {
                        const newProj = [...resumeData.projects];
                        newProj[i].bullets.push('');
                        onChange({ ...resumeData, projects: newProj });
                      }}
                      className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      + Add Bullet
                    </button>
                  </div>

                  {proj.bullets.map((bullet, bi) => (
                    <div key={bi} className="flex items-start gap-1.5">
                      <textarea
                        rows={2}
                        value={bullet}
                        placeholder="Architected / Implemented / Optimized..."
                        onChange={(e) => {
                          const newProj = [...resumeData.projects];
                          newProj[i].bullets[bi] = e.target.value;
                          onChange({ ...resumeData, projects: newProj });
                        }}
                        className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 leading-relaxed"
                      />
                      <div className="flex flex-col gap-1 pt-1">
                        <button
                          onClick={() => handleImproveBullet('projects', i, bi, bullet)}
                          className="p-1 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                          title="Improve this bullet with strong action verbs & clear impact"
                        >
                          <Sparkles size={11} />
                        </button>
                        {proj.bullets.length > 1 && (
                          <button
                            onClick={() => {
                              const newProj = [...resumeData.projects];
                              newProj[i].bullets = newProj[i].bullets.filter((_, bidx) => bidx !== bi);
                              onChange({ ...resumeData, projects: newProj });
                            }}
                            className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. EDUCATION */}
      {resumeData.sectionOrder.includes('education') && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase text-slate-800 dark:text-slate-200">
              <GraduationCap size={14} className="text-emerald-500" />
              <span>Education</span>
            </div>
            <button
              onClick={() => {
                const newEdu: ResumeEducation = {
                  degree: '',
                  institution: '',
                  year: '',
                  gpa: '',
                };
                onChange({ ...resumeData, education: [...resumeData.education, newEdu] });
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
            >
              <Plus size={12} />
              <span>Add Degree</span>
            </button>
          </div>

          <div className="space-y-4">
            {resumeData.education.map((edu, i) => (
              <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                    Credential #{i + 1}
                  </span>
                  <button
                    onClick={() => {
                      const updated = resumeData.education.filter((_, idx) => idx !== i);
                      onChange({ ...resumeData, education: updated });
                    }}
                    className="text-slate-400 hover:text-rose-500 cursor-pointer p-1"
                    title="Delete degree"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={edu.degree}
                    placeholder="Degree (e.g. B.Tech in CSE)"
                    onChange={(e) => {
                      const newEdu = [...resumeData.education];
                      newEdu[i].degree = e.target.value;
                      onChange({ ...resumeData, education: newEdu });
                    }}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold"
                  />
                  <input
                    type="text"
                    value={edu.institution}
                    placeholder="Institution / College (e.g. CBIT)"
                    onChange={(e) => {
                      const newEdu = [...resumeData.education];
                      newEdu[i].institution = e.target.value;
                      onChange({ ...resumeData, education: newEdu });
                    }}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={edu.year || ''}
                    placeholder="Years (e.g. 2021 - 2025)"
                    onChange={(e) => {
                      const newEdu = [...resumeData.education];
                      newEdu[i].year = e.target.value;
                      onChange({ ...resumeData, education: newEdu });
                    }}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono"
                  />
                  <input
                    type="text"
                    value={edu.gpa || ''}
                    placeholder="CGPA / Marks (e.g. 9.63 / 10)"
                    onChange={(e) => {
                      const newEdu = [...resumeData.education];
                      newEdu[i].gpa = e.target.value;
                      onChange({ ...resumeData, education: newEdu });
                    }}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                  <input
                    type="text"
                    value={edu.location || ''}
                    placeholder="City, Country"
                    onChange={(e) => {
                      const newEdu = [...resumeData.education];
                      newEdu[i].location = e.target.value;
                      onChange({ ...resumeData, education: newEdu });
                    }}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <input
                  type="text"
                  value={edu.coursework || ''}
                  placeholder="Relevant Coursework (e.g. Algorithms, DBMS, Operating Systems)"
                  onChange={(e) => {
                    const newEdu = [...resumeData.education];
                    newEdu[i].coursework = e.target.value;
                    onChange({ ...resumeData, education: newEdu });
                  }}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. CERTIFICATIONS */}
      {resumeData.sectionOrder.includes('certifications') && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase text-slate-800 dark:text-slate-200">
              <Award size={14} className="text-emerald-500" />
              <span>Certifications</span>
            </div>
            <button
              onClick={() => {
                const newCert: ResumeCertification = { name: '', issuer: '', year: '' };
                onChange({ ...resumeData, certifications: [...resumeData.certifications, newCert] });
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
            >
              <Plus size={12} />
              <span>Add Certification</span>
            </button>
          </div>

          <div className="space-y-3">
            {resumeData.certifications.map((cert, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={cert.name}
                  placeholder="Certification Name"
                  onChange={(e) => {
                    const newCert = [...resumeData.certifications];
                    newCert[i].name = e.target.value;
                    onChange({ ...resumeData, certifications: newCert });
                  }}
                  className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold"
                />
                <input
                  type="text"
                  value={cert.issuer || ''}
                  placeholder="Issuer (e.g. AWS)"
                  onChange={(e) => {
                    const newCert = [...resumeData.certifications];
                    newCert[i].issuer = e.target.value;
                    onChange({ ...resumeData, certifications: newCert });
                  }}
                  className="w-32 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                />
                <input
                  type="text"
                  value={cert.year || ''}
                  placeholder="Year"
                  onChange={(e) => {
                    const newCert = [...resumeData.certifications];
                    newCert[i].year = e.target.value;
                    onChange({ ...resumeData, certifications: newCert });
                  }}
                  className="w-20 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono"
                />
                <button
                  onClick={() => {
                    const updated = resumeData.certifications.filter((_, idx) => idx !== i);
                    onChange({ ...resumeData, certifications: updated });
                  }}
                  className="text-slate-400 hover:text-rose-500 cursor-pointer p-1"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. ACHIEVEMENTS */}
      {resumeData.sectionOrder.includes('achievements') && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase text-slate-800 dark:text-slate-200">
              <Trophy size={14} className="text-emerald-500" />
              <span>Honors & Achievements</span>
            </div>
            <button
              onClick={() => {
                const newAch: ResumeAchievement = { title: '', description: '' };
                onChange({ ...resumeData, achievements: [...resumeData.achievements, newAch] });
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
            >
              <Plus size={12} />
              <span>Add Achievement</span>
            </button>
          </div>

          <div className="space-y-3">
            {resumeData.achievements.map((ach, i) => (
              <div key={i} className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={ach.title}
                    placeholder="Achievement Title (e.g. Smart India Hackathon Finalist)"
                    onChange={(e) => {
                      const newAch = [...resumeData.achievements];
                      newAch[i].title = e.target.value;
                      onChange({ ...resumeData, achievements: newAch });
                    }}
                    className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                  />
                  <input
                    type="text"
                    value={ach.date || ''}
                    placeholder="Date / Year"
                    onChange={(e) => {
                      const newAch = [...resumeData.achievements];
                      newAch[i].date = e.target.value;
                      onChange({ ...resumeData, achievements: newAch });
                    }}
                    className="w-24 px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                  <button
                    onClick={() => {
                      const updated = resumeData.achievements.filter((_, idx) => idx !== i);
                      onChange({ ...resumeData, achievements: updated });
                    }}
                    className="text-slate-400 hover:text-rose-500 cursor-pointer p-1"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={ach.description}
                  placeholder="Brief factual context about the honor..."
                  onChange={(e) => {
                    const newAch = [...resumeData.achievements];
                    newAch[i].description = e.target.value;
                    onChange({ ...resumeData, achievements: newAch });
                  }}
                  className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 9. EXTRACURRICULAR */}
      {resumeData.sectionOrder.includes('extracurricular') && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase text-slate-800 dark:text-slate-200">
              <Compass size={14} className="text-emerald-500" />
              <span>Leadership & Extracurricular Activities</span>
            </div>
            <button
              onClick={() => {
                const newExt: ResumeExtracurricular = { activity: '', role: '', description: '' };
                onChange({ ...resumeData, extracurricular: [...resumeData.extracurricular, newExt] });
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
            >
              <Plus size={12} />
              <span>Add Activity</span>
            </button>
          </div>

          <div className="space-y-3">
            {resumeData.extracurricular.map((act, i) => (
              <div key={i} className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={act.activity}
                    placeholder="Club / Organization (e.g. CBIT Coding Club)"
                    onChange={(e) => {
                      const newExt = [...resumeData.extracurricular];
                      newExt[i].activity = e.target.value;
                      onChange({ ...resumeData, extracurricular: newExt });
                    }}
                    className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                  />
                  <input
                    type="text"
                    value={act.role || ''}
                    placeholder="Role (e.g. Tech Lead)"
                    onChange={(e) => {
                      const newExt = [...resumeData.extracurricular];
                      newExt[i].role = e.target.value;
                      onChange({ ...resumeData, extracurricular: newExt });
                    }}
                    className="w-32 px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <button
                    onClick={() => {
                      const updated = resumeData.extracurricular.filter((_, idx) => idx !== i);
                      onChange({ ...resumeData, extracurricular: updated });
                    }}
                    className="text-slate-400 hover:text-rose-500 cursor-pointer p-1"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={act.description || ''}
                  placeholder="Details of mentorship, leadership, or events coordinated..."
                  onChange={(e) => {
                    const newExt = [...resumeData.extracurricular];
                    newExt[i].description = e.target.value;
                    onChange({ ...resumeData, extracurricular: newExt });
                  }}
                  className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
