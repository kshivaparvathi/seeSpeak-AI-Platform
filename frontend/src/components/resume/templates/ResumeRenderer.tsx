import React, { forwardRef } from 'react';
import { ResumeData, TemplateId, AccentColor, SectionType } from '../../../types/resume';

interface ResumeRendererProps {
  resumeData: ResumeData;
  templateId: TemplateId;
  accentColor?: AccentColor;
  zoom?: number;
  className?: string;
  isPrintMode?: boolean;
}

export const ResumeRenderer = forwardRef<HTMLDivElement, ResumeRendererProps>(({
  resumeData,
  templateId,
  accentColor = 'slate',
  zoom = 1,
  className = '',
  isPrintMode = false,
}, ref) => {
  const {
    personalInfo,
    summary,
    education = [],
    skills = { languages: [], frameworks: [], tools: [], databases: [], cloud: [] },
    experience = [],
    projects = [],
    certifications = [],
    achievements = [],
    extracurricular = [],
    sectionOrder = ['summary', 'skills', 'experience', 'projects', 'education', 'certifications', 'achievements', 'extracurricular'],
  } = resumeData;

  // Resolve accent colors
  const getThemePalette = () => {
    switch (accentColor) {
      case 'navy':
        return {
          primaryText: 'text-blue-950',
          headingText: 'text-blue-900',
          accentBorder: 'border-blue-900',
          accentBg: 'bg-blue-900',
          pillBg: 'bg-blue-50 text-blue-900 border-blue-200',
          subtleText: 'text-blue-700',
          linkText: 'text-blue-600',
        };
      case 'emerald':
        return {
          primaryText: 'text-emerald-950',
          headingText: 'text-emerald-900',
          accentBorder: 'border-emerald-800',
          accentBg: 'bg-emerald-800',
          pillBg: 'bg-emerald-50 text-emerald-900 border-emerald-200',
          subtleText: 'text-emerald-700',
          linkText: 'text-emerald-600',
        };
      case 'burgundy':
        return {
          primaryText: 'text-rose-950',
          headingText: 'text-rose-900',
          accentBorder: 'border-rose-900',
          accentBg: 'bg-rose-900',
          pillBg: 'bg-rose-50 text-rose-900 border-rose-200',
          subtleText: 'text-rose-700',
          linkText: 'text-rose-600',
        };
      case 'indigo':
        return {
          primaryText: 'text-indigo-950',
          headingText: 'text-indigo-900',
          accentBorder: 'border-indigo-800',
          accentBg: 'bg-indigo-900',
          pillBg: 'bg-indigo-50 text-indigo-900 border-indigo-200',
          subtleText: 'text-indigo-700',
          linkText: 'text-indigo-600',
        };
      case 'charcoal':
        return {
          primaryText: 'text-zinc-950',
          headingText: 'text-zinc-900',
          accentBorder: 'border-zinc-800',
          accentBg: 'bg-zinc-800',
          pillBg: 'bg-zinc-100 text-zinc-900 border-zinc-300',
          subtleText: 'text-zinc-700',
          linkText: 'text-zinc-600',
        };
      case 'slate':
      default:
        return {
          primaryText: 'text-slate-950',
          headingText: 'text-slate-900',
          accentBorder: 'border-slate-900',
          accentBg: 'bg-slate-900',
          pillBg: 'bg-slate-100 text-slate-800 border-slate-300',
          subtleText: 'text-slate-700',
          linkText: 'text-slate-600',
        };
    }
  };

  const palette = getThemePalette();

  // Helper for contact lines
  const renderContactList = (separator = '•', contactClass = 'text-xs text-slate-600') => {
    const items = [
      personalInfo.location,
      personalInfo.phone,
      personalInfo.email,
      personalInfo.linkedin,
      personalInfo.github,
      personalInfo.portfolio,
    ].filter(Boolean);

    return (
      <div className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-1 ${contactClass}`}>
        {items.map((item, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <span className="opacity-50 select-none">{separator}</span>}
            <span className="font-medium">{item}</span>
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Helper for skills category items
  const renderSkills = (styleType: 'lines' | 'pills' | 'grid' | 'inline' | 'mono') => {
    const categories = [
      { label: 'Languages', items: skills.languages },
      { label: 'Frameworks & Libraries', items: skills.frameworks },
      { label: 'Developer Tools', items: skills.tools },
      { label: 'Databases', items: skills.databases },
      { label: 'Cloud & Infrastructure', items: skills.cloud },
      { label: 'Other Proficiencies', items: skills.other },
    ].filter((c) => c.items && c.items.length > 0);

    if (categories.length === 0) return null;

    if (styleType === 'pills') {
      return (
        <div className="space-y-2 mt-1">
          {categories.map((cat, i) => (
            <div key={i} className="text-xs">
              <span className="font-bold text-slate-900 mr-2">{cat.label}:</span>
              <div className="inline-flex flex-wrap gap-1 mt-0.5">
                {cat.items.map((item, ii) => (
                  <span key={ii} className={`px-2 py-0.5 rounded text-[11px] font-medium border ${palette.pillBg}`}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (styleType === 'mono') {
      return (
        <div className="space-y-1.5 mt-1 font-mono text-xs">
          {categories.map((cat, i) => (
            <div key={i} className="flex items-baseline">
              <span className="font-bold text-slate-800 w-32 shrink-0">{cat.label}:</span>
              <span className="text-slate-700">{cat.items.join(' • ')}</span>
            </div>
          ))}
        </div>
      );
    }

    if (styleType === 'grid') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-1 text-xs">
          {categories.map((cat, i) => (
            <div key={i}>
              <span className="font-bold text-slate-900">{cat.label}: </span>
              <span className="text-slate-700">{cat.items.join(', ')}</span>
            </div>
          ))}
        </div>
      );
    }

    if (styleType === 'inline') {
      const allSkills = categories.flatMap((c) => c.items);
      return (
        <div className="text-xs text-slate-700 leading-relaxed mt-1">
          {allSkills.join(' • ')}
        </div>
      );
    }

    // Default 'lines'
    return (
      <div className="space-y-1 mt-1 text-xs text-slate-700">
        {categories.map((cat, i) => (
          <div key={i} className="leading-snug">
            <span className="font-bold text-slate-900">{cat.label}: </span>
            <span>{cat.items.join(', ')}</span>
          </div>
        ))}
      </div>
    );
  };

  // Section Renderers
  const renderSummarySection = (headingClass: string, dividerClass?: string) => {
    if (!summary) return null;
    return (
      <section className="mb-3.5 print:mb-2 break-inside-avoid">
        <div className={dividerClass}>
          <h2 className={headingClass}>Professional Summary</h2>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed text-justify mt-1">{summary}</p>
      </section>
    );
  };

  const renderEducationSection = (headingClass: string, dividerClass?: string) => {
    if (education.length === 0) return null;
    return (
      <section className="mb-3.5 print:mb-2 break-inside-avoid">
        <div className={dividerClass}>
          <h2 className={headingClass}>Education</h2>
        </div>
        <div className="space-y-2 mt-1">
          {education.map((edu, i) => (
            <div key={i} className="text-xs">
              <div className="flex justify-between items-baseline font-bold text-slate-900">
                <span>{edu.degree}{edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}</span>
                <span className="font-mono text-[11px] text-slate-600 font-normal">{edu.year || `${edu.startDate || ''} - ${edu.endDate || ''}`}</span>
              </div>
              <div className="flex justify-between items-baseline text-slate-700">
                <span className="font-medium">{edu.institution}{edu.university ? ` (${edu.university})` : ''}</span>
                {edu.location && <span className="text-[11px] text-slate-500 italic">{edu.location}</span>}
              </div>
              {edu.gpa && (
                <div className="text-[11px] text-slate-600 mt-0.5">
                  <span className="font-semibold text-slate-800">CGPA / Percentage:</span> {edu.gpa}
                </div>
              )}
              {edu.coursework && (
                <div className="text-[11px] text-slate-600 mt-0.5">
                  <span className="font-semibold text-slate-800">Relevant Coursework:</span> {edu.coursework}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderExperienceSection = (headingClass: string, dividerClass?: string) => {
    if (experience.length === 0) return null;
    return (
      <section className="mb-3.5 print:mb-2 break-inside-avoid">
        <div className={dividerClass}>
          <h2 className={headingClass}>Professional Experience</h2>
        </div>
        <div className="space-y-3 mt-1.5">
          {experience.map((exp, i) => (
            <div key={i} className="text-xs">
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-slate-900">{exp.role} <span className="font-semibold text-slate-700">— {exp.company}</span></span>
                <span className="font-mono text-[11px] text-slate-600">{exp.duration || `${exp.startDate || ''} - ${exp.endDate || ''}`}</span>
              </div>
              <div className="flex justify-between items-baseline text-[11px] text-slate-500 italic mb-1">
                {exp.employmentType && <span>{exp.employmentType}</span>}
                {exp.location && <span>{exp.location}</span>}
              </div>
              {exp.responsibilities && (
                <p className="text-xs text-slate-700 mb-1">{exp.responsibilities}</p>
              )}
              {exp.bullets && exp.bullets.length > 0 && (
                <ul className="list-disc list-outside ml-4 text-xs text-slate-700 space-y-1">
                  {exp.bullets.map((b, bi) => b.trim() && <li key={bi} className="leading-snug">{b.trim()}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderProjectsSection = (headingClass: string, dividerClass?: string, showStackPill = false) => {
    if (projects.length === 0) return null;
    return (
      <section className="mb-3.5 print:mb-2 break-inside-avoid">
        <div className={dividerClass}>
          <h2 className={headingClass}>Technical Projects</h2>
        </div>
        <div className="space-y-3 mt-1.5">
          {projects.map((proj, i) => (
            <div key={i} className="text-xs">
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-slate-900">{proj.name}</span>
                <div className="text-[10px] space-x-2 font-mono">
                  {proj.link && <span className={`${palette.linkText} hover:underline`}>{proj.link}</span>}
                  {proj.githubLink && <span className="text-slate-500">{proj.githubLink}</span>}
                </div>
              </div>
              {proj.technologies && proj.technologies.length > 0 && (
                showStackPill ? (
                  <div className="flex flex-wrap gap-1 my-1">
                    {proj.technologies.map((t, ti) => (
                      <span key={ti} className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${palette.pillBg}`}>
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-600 italic mb-0.5">
                    Technologies: {proj.technologies.join(', ')}
                  </div>
                )
              )}
              {proj.description && (
                <p className="text-xs text-slate-700 leading-snug mb-1">{proj.description}</p>
              )}
              {proj.bullets && proj.bullets.length > 0 && (
                <ul className="list-disc list-outside ml-4 text-xs text-slate-700 space-y-0.5">
                  {proj.bullets.map((b, bi) => b.trim() && <li key={bi} className="leading-snug">{b.trim()}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderCertificationsSection = (headingClass: string, dividerClass?: string) => {
    if (certifications.length === 0) return null;
    return (
      <section className="mb-3 print:mb-2 break-inside-avoid">
        <div className={dividerClass}>
          <h2 className={headingClass}>Certifications & Licenses</h2>
        </div>
        <ul className="list-disc list-outside ml-4 text-xs text-slate-700 space-y-1 mt-1">
          {certifications.map((cert, i) => (
            <li key={i} className="leading-snug">
              <span className="font-bold text-slate-900">{cert.name}</span>
              {cert.issuer && <span className="text-slate-700"> — {cert.issuer}</span>}
              {(cert.date || cert.year) && <span className="text-slate-500 font-mono text-[11px]"> ({cert.date || cert.year})</span>}
              {cert.link && <span className={`text-[10px] ml-2 ${palette.linkText}`}>[{cert.link}]</span>}
            </li>
          ))}
        </ul>
      </section>
    );
  };

  const renderAchievementsSection = (headingClass: string, dividerClass?: string) => {
    if (achievements.length === 0) return null;
    return (
      <section className="mb-3 print:mb-2 break-inside-avoid">
        <div className={dividerClass}>
          <h2 className={headingClass}>Key Honors & Achievements</h2>
        </div>
        <ul className="list-disc list-outside ml-4 text-xs text-slate-700 space-y-1 mt-1">
          {achievements.map((ach, i) => (
            <li key={i} className="leading-snug">
              <span className="font-bold text-slate-900">{ach.title}</span>
              {ach.date && <span className="text-slate-500 font-mono text-[11px]"> ({ach.date})</span>}
              {ach.description && <span className="text-slate-700 block mt-0.5">{ach.description}</span>}
            </li>
          ))}
        </ul>
      </section>
    );
  };

  const renderExtracurricularSection = (headingClass: string, dividerClass?: string) => {
    if (extracurricular.length === 0) return null;
    return (
      <section className="mb-3 print:mb-2 break-inside-avoid">
        <div className={dividerClass}>
          <h2 className={headingClass}>Leadership & Extracurricular Activities</h2>
        </div>
        <div className="space-y-1.5 mt-1 text-xs text-slate-700">
          {extracurricular.map((act, i) => (
            <div key={i} className="leading-snug">
              <span className="font-bold text-slate-900">{act.activity}</span>
              {act.role && <span className="font-semibold text-slate-700"> — {act.role}</span>}
              {act.description && <p className="text-slate-600 mt-0.5">{act.description}</p>}
            </div>
          ))}
        </div>
      </section>
    );
  };

  // Section dispatcher supporting flexible custom sectionOrder
  const renderOrderedSections = (
    headingClass: string,
    dividerClass?: string,
    skillStyle: 'lines' | 'pills' | 'grid' | 'inline' | 'mono' = 'lines',
    projectPill = false
  ) => {
    return sectionOrder.map((sectionKey) => {
      switch (sectionKey) {
        case 'summary':
          return <React.Fragment key="summary">{renderSummarySection(headingClass, dividerClass)}</React.Fragment>;
        case 'skills':
          return (
            <section key="skills" className="mb-3.5 print:mb-2 break-inside-avoid">
              <div className={dividerClass}>
                <h2 className={headingClass}>Technical Skills</h2>
              </div>
              {renderSkills(skillStyle)}
            </section>
          );
        case 'experience':
          return <React.Fragment key="experience">{renderExperienceSection(headingClass, dividerClass)}</React.Fragment>;
        case 'projects':
          return <React.Fragment key="projects">{renderProjectsSection(headingClass, dividerClass, projectPill)}</React.Fragment>;
        case 'education':
          return <React.Fragment key="education">{renderEducationSection(headingClass, dividerClass)}</React.Fragment>;
        case 'certifications':
          return <React.Fragment key="certifications">{renderCertificationsSection(headingClass, dividerClass)}</React.Fragment>;
        case 'achievements':
          return <React.Fragment key="achievements">{renderAchievementsSection(headingClass, dividerClass)}</React.Fragment>;
        case 'extracurricular':
          return <React.Fragment key="extracurricular">{renderExtracurricularSection(headingClass, dividerClass)}</React.Fragment>;
        default:
          return null;
      }
    });
  };

  // -------------------------------------------------------------
  // TEMPLATE SPECIFIC RENDERERS
  // -------------------------------------------------------------

  const zoomStyle = !isPrintMode ? { transform: `scale(${zoom})`, transformOrigin: 'top center' } : {};

  // Standard document container wrapping
  const baseContainer = `w-full max-w-[800px] min-h-[1050px] bg-white text-slate-800 shadow-2xl rounded-sm transition-all print:shadow-none print:w-full print:max-w-none print:m-0 print:border-none print:p-0 ${className}`;

  // 1. ATS PROFESSIONAL
  if (templateId === 'ats-professional') {
    return (
      <div id="resume-preview-document" ref={ref} style={zoomStyle} className={`${baseContainer} p-10 font-sans`}>
        <header className="text-center pb-2 mb-3 border-b-2 border-slate-900">
          <h1 className="text-3xl font-extrabold uppercase tracking-wide text-slate-950">
            {personalInfo.fullName || 'Candidate Name'}
          </h1>
          {personalInfo.professionalTitle && (
            <div className="text-sm font-semibold tracking-wider text-slate-700 uppercase mt-0.5">
              {personalInfo.professionalTitle}
            </div>
          )}
          <div className="mt-1.5">
            {renderContactList('|', 'text-xs text-slate-600')}
          </div>
        </header>

        {renderOrderedSections(
          'text-xs font-bold uppercase tracking-wider text-slate-950',
          'border-b border-slate-900 pb-0.5 mb-1.5 mt-3',
          'lines'
        )}
      </div>
    );
  }

  // 2. ATS CLASSIC
  if (templateId === 'ats-classic') {
    return (
      <div id="resume-preview-document" ref={ref} style={zoomStyle} className={`${baseContainer} p-10 font-serif bg-[#fdfdfb]`}>
        <header className="text-center py-2 mb-4 border-t-2 border-b-2 border-slate-800">
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-widest text-slate-950">
            {personalInfo.fullName || 'Candidate Name'}
          </h1>
          {personalInfo.professionalTitle && (
            <div className="text-xs font-medium tracking-wide text-slate-700 uppercase mt-0.5">
              {personalInfo.professionalTitle}
            </div>
          )}
          <div className="mt-1.5">
            {renderContactList('•', 'text-xs text-slate-600 italic')}
          </div>
        </header>

        {renderOrderedSections(
          'text-xs font-bold uppercase tracking-widest text-slate-900 text-center',
          'border-b border-slate-400 pb-1 mb-2 mt-4',
          'lines'
        )}
      </div>
    );
  }

  // 3. ATS EXECUTIVE
  if (templateId === 'ats-executive') {
    return (
      <div id="resume-preview-document" ref={ref} style={zoomStyle} className={`${baseContainer} p-10 font-sans`}>
        <header className="flex justify-between items-baseline pb-2 mb-4 border-b-2 border-slate-900">
          <div>
            <h1 className="text-3xl font-extrabold uppercase tracking-tight text-slate-950">
              {personalInfo.fullName || 'Candidate Name'}
            </h1>
            {personalInfo.professionalTitle && (
              <div className={`text-sm font-bold tracking-wide uppercase mt-0.5 ${palette.subtleText}`}>
                {personalInfo.professionalTitle}
              </div>
            )}
          </div>
          <div className="text-right text-xs text-slate-600">
            {personalInfo.location && <div>{personalInfo.location}</div>}
            {personalInfo.phone && <div>{personalInfo.phone}</div>}
            {personalInfo.email && <div>{personalInfo.email}</div>}
          </div>
        </header>

        {renderOrderedSections(
          'text-xs font-extrabold uppercase tracking-wider text-slate-950 flex items-center gap-2',
          `border-b-2 ${palette.accentBorder} pb-0.5 mb-2 mt-4`,
          'lines'
        )}
      </div>
    );
  }

  // 4. ATS ONE COLUMN
  if (templateId === 'ats-one-column') {
    return (
      <div id="resume-preview-document" ref={ref} style={zoomStyle} className={`${baseContainer} p-8 font-sans text-xs`}>
        <header className="text-center pb-2 mb-3 border-b border-slate-400">
          <h1 className="text-2xl font-bold uppercase text-slate-950">
            {personalInfo.fullName || 'Candidate Name'}
          </h1>
          {personalInfo.professionalTitle && (
            <div className="text-xs font-semibold text-slate-700 uppercase">{personalInfo.professionalTitle}</div>
          )}
          <div className="mt-1">
            {renderContactList('|', 'text-[11px] text-slate-600')}
          </div>
        </header>

        {renderOrderedSections(
          'text-xs font-bold uppercase text-slate-900',
          'border-b border-slate-400 pb-0.5 mb-1.5 mt-3',
          'lines'
        )}
      </div>
    );
  }

  // 5. SOFTWARE ENGINEER
  if (templateId === 'software-engineer') {
    return (
      <div id="resume-preview-document" ref={ref} style={zoomStyle} className={`${baseContainer} p-9 font-sans`}>
        <header className="flex justify-between items-start pb-3 mb-4 border-b border-slate-300">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 font-mono">
              {personalInfo.fullName || 'Candidate Name'}
            </h1>
            <div className="text-xs font-mono font-bold text-emerald-700 mt-0.5">
              &gt; {personalInfo.professionalTitle || 'Software Engineer'}
            </div>
          </div>
          <div className="text-right text-xs font-mono text-slate-600 space-y-0.5">
            {personalInfo.email && <div>{personalInfo.email}</div>}
            {personalInfo.github && <div className="text-indigo-600 font-semibold">{personalInfo.github}</div>}
            {personalInfo.portfolio && <div>{personalInfo.portfolio}</div>}
            {personalInfo.location && <div>{personalInfo.location}</div>}
          </div>
        </header>

        {renderOrderedSections(
          'text-xs font-bold font-mono uppercase tracking-wider text-slate-900',
          'border-b border-slate-300 pb-1 mb-2 mt-4',
          'pills',
          true
        )}
      </div>
    );
  }

  // 6. MODERN DEVELOPER
  if (templateId === 'modern-developer') {
    return (
      <div id="resume-preview-document" ref={ref} style={zoomStyle} className={`${baseContainer} p-9 font-mono`}>
        <header className="pb-3 mb-4 border-b-2 border-slate-800">
          <div className="flex justify-between items-baseline">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-950">
              <span className="text-emerald-600">const</span> developer = "{personalInfo.fullName || 'Candidate Name'}";
            </h1>
            <span className="text-xs text-slate-500 font-bold">// RESUME.DEV</span>
          </div>
          {personalInfo.professionalTitle && (
            <div className="text-xs text-slate-600 mt-1">
              $ target_role: <span className="text-emerald-700 font-bold">{personalInfo.professionalTitle}</span>
            </div>
          )}
          <div className="mt-2 text-xs">
            {renderContactList('::', 'text-xs text-slate-600 font-mono')}
          </div>
        </header>

        {renderOrderedSections(
          'text-xs font-bold text-slate-900 uppercase tracking-widest',
          'border-b border-slate-700 pb-0.5 mb-2 mt-4',
          'mono',
          true
        )}
      </div>
    );
  }

  // 6b. COMPETITIVE PROGRAMMER
  if (templateId === 'competitive-programmer') {
    return (
      <div id="resume-preview-document" ref={ref} style={zoomStyle} className={`${baseContainer} p-8 font-mono text-xs leading-relaxed`}>
        <header className="pb-3 mb-3 border-b-2 border-slate-900 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-950 font-mono">
              {personalInfo.fullName || 'Candidate Name'}
            </h1>
            <div className="text-xs font-bold text-emerald-700 uppercase tracking-wide mt-0.5">
              &gt; {personalInfo.professionalTitle || 'Competitive Programmer & Systems Engineer'}
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-600 space-y-0.5">
            {renderContactList('•', 'text-[11px] text-slate-600 justify-end')}
          </div>
        </header>

        {/* Contest Ratings & Badges Highlight Bar */}
        {(certifications.length > 0 || achievements.length > 0) && (
          <div className="mb-3 p-2.5 bg-slate-900 text-white rounded-xs border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>⚡ ALGORITHMIC PROFILE:</span>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px]">
              {certifications.map((c, i) => (
                <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                  🏆 {c.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {renderOrderedSections(
          'text-xs font-bold font-mono uppercase tracking-wider text-slate-950 flex items-center gap-1.5',
          'border-b border-slate-800 pb-0.5 mb-1.5 mt-3',
          'mono',
          true
        )}
      </div>
    );
  }

  // 7. TECH PROFESSIONAL
  if (templateId === 'tech-professional') {
    return (
      <div id="resume-preview-document" ref={ref} style={zoomStyle} className={`${baseContainer} p-9 font-sans`}>
        <header className="border-l-4 border-blue-600 pl-3 pb-1 mb-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
            {personalInfo.fullName || 'Candidate Name'}
          </h1>
          <div className="text-sm font-semibold text-blue-700 mt-0.5">
            {personalInfo.professionalTitle || 'Senior Technology Professional'}
          </div>
          <div className="mt-1.5">
            {renderContactList('•', 'text-xs text-slate-600 justify-start')}
          </div>
        </header>

        {renderOrderedSections(
          'text-xs font-bold uppercase tracking-wider text-blue-950',
          'border-b border-blue-200 pb-1 mb-2 mt-4',
          'pills',
          true
        )}
      </div>
    );
  }

  // 8. ENGINEERING MINIMAL
  if (templateId === 'engineering-minimal') {
    return (
      <div id="resume-preview-document" ref={ref} style={zoomStyle} className={`${baseContainer} p-8 font-sans text-xs`}>
        <header className="flex justify-between items-baseline border-b border-slate-900 pb-2 mb-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              {personalInfo.fullName || 'Candidate Name'}
            </h1>
            <div className="text-xs font-semibold text-slate-700 mt-0.5">
              {personalInfo.professionalTitle}
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-600">
            {renderContactList('|', 'text-[11px] text-slate-600 justify-end')}
          </div>
        </header>

        {renderOrderedSections(
          'text-xs font-bold uppercase tracking-wider text-slate-900',
          'border-b border-slate-300 pb-0.5 mb-1.5 mt-3',
          'grid',
          false
        )}
      </div>
    );
  }

  // 8b. MODERN TWO-COLUMN (Iconic Overleaf 2-column sidebar layout)
  if (templateId === 'modern-two-column') {
    return (
      <div id="resume-preview-document" ref={ref} style={zoomStyle} className={`${baseContainer} !p-0 flex flex-row font-sans text-xs overflow-hidden`}>
        {/* Left Sidebar */}
        <aside className="w-[34%] bg-slate-50 border-r border-slate-200 p-6 flex flex-col justify-between shrink-0 space-y-4">
          <div>
            <div className="mb-4">
              <h1 className="text-xl font-extrabold text-slate-950 tracking-tight leading-tight">
                {personalInfo.fullName || 'Candidate Name'}
              </h1>
              {personalInfo.professionalTitle && (
                <div className={`text-xs font-semibold mt-1 ${palette.subtleText}`}>
                  {personalInfo.professionalTitle}
                </div>
              )}
            </div>

            {/* Contact Details */}
            <div className="space-y-1.5 text-[11px] text-slate-600 pb-3 mb-3 border-b border-slate-200">
              {personalInfo.location && <div>📍 {personalInfo.location}</div>}
              {personalInfo.email && <div className="break-all">✉️ {personalInfo.email}</div>}
              {personalInfo.phone && <div>📞 {personalInfo.phone}</div>}
              {personalInfo.github && <div className="break-all font-mono text-[10px]">🐙 {personalInfo.github}</div>}
              {personalInfo.linkedin && <div className="break-all">🔗 {personalInfo.linkedin}</div>}
              {personalInfo.portfolio && <div className="break-all">🌐 {personalInfo.portfolio}</div>}
            </div>

            {/* Education in sidebar */}
            {education.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
                  Education
                </h3>
                <div className="space-y-2">
                  {education.map((edu, i) => (
                    <div key={i} className="text-[11px]">
                      <div className="font-bold text-slate-900">{edu.degree}</div>
                      <div className="text-slate-700">{edu.institution}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{edu.year || `${edu.startDate || ''} - ${edu.endDate || ''}`}</div>
                      {edu.gpa && <div className="text-[10px] font-semibold text-slate-700">GPA: {edu.gpa}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Skills in sidebar */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
                Core Skills
              </h3>
              {renderSkills('pills')}
            </div>
          </div>

          {/* Certifications in sidebar footer */}
          {certifications.length > 0 && (
            <div className="pt-2 border-t border-slate-200">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 mb-1">
                Certifications
              </h3>
              <ul className="text-[10px] text-slate-600 space-y-1">
                {certifications.map((c, i) => (
                  <li key={i} className="leading-tight">
                    <span className="font-medium text-slate-800">{c.name}</span>
                    {c.issuer && <span className="block text-slate-500">{c.issuer}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        {/* Right Main Column */}
        <main className="w-[66%] p-7 space-y-4">
          {summary && (
            <section className="break-inside-avoid">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-1.5">
                Executive Profile
              </h2>
              <p className="text-xs text-slate-700 leading-relaxed text-justify">{summary}</p>
            </section>
          )}

          {experience.length > 0 && (
            <section className="break-inside-avoid">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
                Professional Experience
              </h2>
              <div className="space-y-3">
                {experience.map((exp, i) => (
                  <div key={i} className="text-xs">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-slate-900">{exp.role}</span>
                      <span className="font-mono text-[10px] text-slate-500">{exp.duration || `${exp.startDate || ''} - ${exp.endDate || ''}`}</span>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-600 mb-1">{exp.company} {exp.location ? `• ${exp.location}` : ''}</div>
                    {exp.bullets && exp.bullets.length > 0 && (
                      <ul className="list-disc list-outside ml-3.5 space-y-1 text-slate-700">
                        {exp.bullets.map((b, bi) => b.trim() && <li key={bi} className="leading-snug">{b.trim()}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {projects.length > 0 && (
            <section className="break-inside-avoid">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
                Featured Projects
              </h2>
              <div className="space-y-2.5">
                {projects.map((proj, i) => (
                  <div key={i} className="text-xs">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-slate-900">{proj.name}</span>
                      {proj.link && <span className="text-[10px] font-mono text-indigo-600">{proj.link}</span>}
                    </div>
                    {proj.description && <p className="text-slate-600 text-[11px] mb-1 leading-snug">{proj.description}</p>}
                    {proj.bullets && proj.bullets.length > 0 && (
                      <ul className="list-disc list-outside ml-3.5 space-y-0.5 text-slate-700">
                        {proj.bullets.map((b, bi) => b.trim() && <li key={bi} className="leading-snug">{b.trim()}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {achievements.length > 0 && (
            <section className="break-inside-avoid">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-1.5">
                Honors & Key Milestones
              </h2>
              <ul className="list-disc list-outside ml-3.5 text-xs text-slate-700 space-y-1">
                {achievements.map((ach, i) => (
                  <li key={i} className="leading-snug">
                    <span className="font-bold text-slate-900">{ach.title}</span>
                    {ach.date && <span className="text-slate-500 font-mono text-[10px]"> ({ach.date})</span>}
                    {ach.description && <p className="text-slate-600 text-[11px] mt-0.5">{ach.description}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>
      </div>
    );
  }

  // 9. MODERN MINIMAL
  if (templateId === 'modern-minimal') {
    return (
      <div id="resume-preview-document" ref={ref} style={zoomStyle} className={`${baseContainer} p-10 font-sans`}>
        <header className="pb-3 mb-4 border-b border-indigo-200">
          <h1 className="text-3xl font-black tracking-tight text-indigo-950">
            {personalInfo.fullName || 'Candidate Name'}
          </h1>
          {personalInfo.professionalTitle && (
            <div className="text-sm font-semibold tracking-wide text-indigo-700 mt-0.5">
              {personalInfo.professionalTitle}
            </div>
          )}
          <div className="mt-2">
            {renderContactList('•', 'text-xs text-indigo-900/70 justify-start')}
          </div>
        </header>

        {renderOrderedSections(
          'text-xs font-bold uppercase tracking-widest text-indigo-950',
          'border-b border-indigo-200 pb-1 mb-2 mt-4',
          'lines',
          false
        )}
      </div>
    );
  }

  // 10. CLEAN MODERN
  if (templateId === 'clean-modern') {
    return (
      <div id="resume-preview-document" ref={ref} style={zoomStyle} className={`${baseContainer} p-9 font-sans`}>
        <header className="flex justify-between items-start pb-3 mb-4 border-b border-emerald-200">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              {personalInfo.fullName || 'Candidate Name'}
            </h1>
            <div className="text-sm font-semibold text-emerald-700 mt-0.5">
              {personalInfo.professionalTitle}
            </div>
          </div>
          <div className="text-right text-xs text-slate-600">
            {personalInfo.email && <div>{personalInfo.email}</div>}
            {personalInfo.phone && <div>{personalInfo.phone}</div>}
            {personalInfo.location && <div>{personalInfo.location}</div>}
          </div>
        </header>

        {renderOrderedSections(
          'text-xs font-bold uppercase tracking-wider text-slate-900 pl-2.5 border-l-4 border-emerald-600 inline-block',
          'mb-2 mt-4',
          'pills',
          false
        )}
      </div>
    );
  }

  // 11. PROFESSIONAL MODERN
  if (templateId === 'professional-modern') {
    return (
      <div id="resume-preview-document" ref={ref} style={zoomStyle} className={`${baseContainer} p-9 font-sans`}>
        <header className="p-3 bg-slate-50 border border-slate-200 rounded-sm mb-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-950">
              {personalInfo.fullName || 'Candidate Name'}
            </h1>
            <div className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
              {personalInfo.professionalTitle}
            </div>
          </div>
          <div className="text-right text-xs text-slate-600">
            {renderContactList('•', 'text-xs text-slate-600 justify-end')}
          </div>
        </header>

        {renderOrderedSections(
          'text-xs font-bold uppercase tracking-wide text-slate-900',
          'border-b border-slate-300 pb-1 mb-2 mt-3.5',
          'lines'
        )}
      </div>
    );
  }

  // 12. CONTEMPORARY
  if (templateId === 'contemporary') {
    return (
      <div id="resume-preview-document" ref={ref} style={zoomStyle} className={`${baseContainer} p-9 font-sans bg-[#fcfcfc]`}>
        <header className="pb-3 mb-4 border-b-2 border-zinc-900">
          <h1 className="text-3xl font-black uppercase tracking-tight text-zinc-950">
            {personalInfo.fullName || 'Candidate Name'}
          </h1>
          <div className="text-xs font-bold uppercase tracking-widest text-zinc-600 mt-0.5">
            {personalInfo.professionalTitle}
          </div>
          <div className="mt-2">
            {renderContactList('/', 'text-xs text-zinc-600')}
          </div>
        </header>

        {renderOrderedSections(
          'text-xs font-black uppercase tracking-wider text-zinc-900',
          'border-b border-zinc-300 pb-1 mb-2 mt-4',
          'pills'
        )}
      </div>
    );
  }

  // 13. CORPORATE PROFESSIONAL
  if (templateId === 'corporate-professional') {
    return (
      <div id="resume-preview-document" ref={ref} style={zoomStyle} className={`${baseContainer} overflow-hidden font-sans`}>
        <header className="bg-slate-900 text-white p-7 mb-4">
          <h1 className="text-3xl font-bold uppercase tracking-wider text-white">
            {personalInfo.fullName || 'Candidate Name'}
          </h1>
          {personalInfo.professionalTitle && (
            <div className="text-sm font-medium tracking-wide text-slate-300 uppercase mt-0.5">
              {personalInfo.professionalTitle}
            </div>
          )}
          <div className="mt-2 text-xs text-slate-300">
            {renderContactList('•', 'text-xs text-slate-300 justify-start')}
          </div>
        </header>

        <div className="px-8 pb-8">
          {renderOrderedSections(
            'text-xs font-bold uppercase tracking-wider text-slate-950',
            'border-b-2 border-slate-800 pb-0.5 mb-2 mt-4',
            'lines'
          )}
        </div>
      </div>
    );
  }

  // 14. CORPORATE EXECUTIVE
  if (templateId === 'corporate-executive') {
    return (
      <div id="resume-preview-document" ref={ref} style={zoomStyle} className={`${baseContainer} p-10 font-serif bg-[#faf9f8]`}>
        <header className="text-center pb-2 mb-4">
          <h1 className="text-3xl font-bold uppercase tracking-widest text-rose-950">
            {personalInfo.fullName || 'Candidate Name'}
          </h1>
          {personalInfo.professionalTitle && (
            <div className="text-xs font-semibold text-rose-900 italic tracking-wider uppercase mt-0.5">
              {personalInfo.professionalTitle}
            </div>
          )}
          <div className="w-full h-[2px] bg-rose-900 my-2"></div>
          <div>
            {renderContactList('•', 'text-xs text-slate-700 italic')}
          </div>
        </header>

        {renderOrderedSections(
          'text-xs font-bold uppercase tracking-widest text-rose-950 text-center',
          'border-b border-rose-900/40 pb-1 mb-2 mt-4',
          'lines'
        )}
      </div>
    );
  }

  // 15. ACADEMIC / RESEARCH
  if (templateId === 'academic-research') {
    return (
      <div id="resume-preview-document" ref={ref} style={zoomStyle} className={`${baseContainer} p-10 font-serif bg-[#fefefe]`}>
        <header className="text-center pb-3 mb-4 border-b border-slate-500">
          <h1 className="text-3xl font-semibold text-slate-950">
            {personalInfo.fullName || 'Candidate Name'}
          </h1>
          {personalInfo.professionalTitle && (
            <div className="text-xs text-slate-700 italic mt-0.5">
              {personalInfo.professionalTitle}
            </div>
          )}
          <div className="mt-2">
            {renderContactList('•', 'text-xs text-slate-700')}
          </div>
        </header>

        {renderOrderedSections(
          'text-xs font-bold uppercase tracking-wider text-slate-900',
          'border-b border-slate-300 pb-1 mb-2 mt-4',
          'lines'
        )}
      </div>
    );
  }

  // 16. ONE PAGE COMPACT
  if (templateId === 'one-page-compact') {
    return (
      <div id="resume-preview-document" ref={ref} style={zoomStyle} className={`${baseContainer} p-6 font-sans text-xs leading-tight`}>
        <header className="flex justify-between items-baseline border-b border-slate-900 pb-1 mb-2">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-tight text-slate-950">
              {personalInfo.fullName || 'Candidate Name'}
            </h1>
            <div className="text-[11px] font-semibold text-slate-700">{personalInfo.professionalTitle}</div>
          </div>
          <div className="text-right text-[10px] text-slate-600">
            {renderContactList('|', 'text-[10px] text-slate-600 justify-end')}
          </div>
        </header>

        {renderOrderedSections(
          'text-[11px] font-bold uppercase text-slate-950',
          'border-b border-slate-400 pb-0.5 mb-1 mt-2.5',
          'grid'
        )}
      </div>
    );
  }

  // 17. GRADUATE COMPACT
  if (templateId === 'graduate-compact') {
    return (
      <div id="resume-preview-document" ref={ref} style={zoomStyle} className={`${baseContainer} p-8 font-sans text-xs`}>
        <header className="text-center pb-2 mb-3 border-b-2 border-blue-900">
          <h1 className="text-2xl md:text-3xl font-extrabold uppercase tracking-wide text-blue-950">
            {personalInfo.fullName || 'Candidate Name'}
          </h1>
          <div className="text-xs font-bold text-blue-800 uppercase mt-0.5">
            {personalInfo.professionalTitle || 'Graduate Candidate'}
          </div>
          <div className="mt-1">
            {renderContactList('•', 'text-[11px] text-slate-600')}
          </div>
        </header>

        {renderOrderedSections(
          'text-xs font-bold uppercase tracking-wider text-blue-950',
          'border-b border-blue-300 pb-0.5 mb-1.5 mt-3',
          'pills'
        )}
      </div>
    );
  }

  // 18. ENTRY-LEVEL PROFESSIONAL
  return (
    <div id="resume-preview-document" ref={ref} style={zoomStyle} className={`${baseContainer} p-8 font-sans text-xs`}>
      <header className="pb-2 mb-3 border-b-2 border-emerald-600">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-950">
          {personalInfo.fullName || 'Candidate Name'}
        </h1>
        <div className="text-xs font-bold text-emerald-800 uppercase mt-0.5">
          {personalInfo.professionalTitle || 'Entry-Level Professional'}
        </div>
        <div className="mt-1">
          {renderContactList('•', 'text-[11px] text-slate-600 justify-start')}
        </div>
      </header>

      {renderOrderedSections(
        'text-xs font-bold uppercase tracking-wider text-slate-950',
        'border-b border-emerald-300 pb-0.5 mb-1.5 mt-3',
        'lines'
      )}
    </div>
  );
});

ResumeRenderer.displayName = 'ResumeRenderer';
