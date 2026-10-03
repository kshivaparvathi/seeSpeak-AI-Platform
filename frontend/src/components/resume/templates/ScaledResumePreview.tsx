import React, { useRef, useState, useEffect } from 'react';
import { ResumeData, TemplateId, AccentColor } from '../../../types/resume';
import { ResumeRenderer } from './ResumeRenderer';
import { getSampleDataForTemplate } from './sampleProfiles';

interface ScaledResumePreviewProps {
  templateId: TemplateId;
  accentColor?: AccentColor;
  resumeData?: ResumeData;
  className?: string;
}

/**
 * ScaledResumePreview renders the EXACT same ResumeRenderer component as the editor,
 * dynamically scaled using CSS transform into a standard A4 portrait container.
 * This guarantees 100% pixel fidelity with zero mockup divergence.
 */
export const ScaledResumePreview: React.FC<ScaledResumePreviewProps> = ({
  templateId,
  accentColor,
  resumeData,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(0.45);

  const previewData = resumeData || getSampleDataForTemplate(templateId);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateScale = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        if (width > 0) {
          // ResumeRenderer standard width is 800px
          setScale(width / 800);
        }
      }
    };

    updateScale();

    const resizeObserver = new ResizeObserver(() => {
      updateScale();
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-[210/297] bg-white rounded-[3px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-slate-200/90 dark:border-slate-800 overflow-hidden select-none ${className}`}
    >
      <div
        className="absolute top-0 left-0 pointer-events-none origin-top-left"
        style={{
          width: '800px',
          minHeight: '1130px',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <ResumeRenderer
          resumeData={previewData}
          templateId={templateId}
          accentColor={accentColor}
          zoom={1}
          className="shadow-none !max-w-none !min-h-0 bg-white"
        />
      </div>
    </div>
  );
};
