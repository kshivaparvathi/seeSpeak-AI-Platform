'use client';

import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  if (!content) return null;

  // Split content into code blocks and normal text
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 leading-relaxed text-sm md:text-base break-words">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // Code block
          const firstLineEnd = part.indexOf('\n');
          const language = firstLineEnd !== -1 ? part.slice(3, firstLineEnd).trim() : '';
          const code = firstLineEnd !== -1 ? part.slice(firstLineEnd + 1, -3) : part.slice(3, -3);

          return <CodeBlock key={index} code={code} language={language} />;
        }

        // Parse tables, headers, lists, blockquotes in normal text
        return <FormattedText key={index} text={part} />;
      })}
    </div>
  );
};

const CodeBlock: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-700/60 bg-slate-950 shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-xs font-mono text-slate-400">
        <span>{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs md:text-sm font-mono text-slate-200 whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (tableRows.length > 0) {
      elements.push(
        <div key={`table-${elements.length}`} className="my-3 overflow-x-auto rounded-xl border border-slate-700/60">
          <table className="min-w-full text-left text-xs md:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-slate-200">
                {tableRows[0]?.map((col, idx) => (
                  <th key={idx} className="px-3 py-2 border-b border-slate-700 font-semibold">
                    {col.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {tableRows.slice(1).map((row, rIdx) => (
                <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900/10'}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-2 text-slate-300">
                      {cell.trim()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect markdown table line
    if (line.includes('|')) {
      const cells = line.split('|').filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
      // Skip separator rows like |---|---|
      if (line.match(/^\|?\s*[-:]+[-| :]*\|?$/)) {
        continue;
      }
      if (cells.length > 0) {
        inTable = true;
        tableRows.push(cells);
        continue;
      }
    } else if (inTable) {
      flushTable();
    }

    // Headers
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-base md:text-lg font-bold text-indigo-300 dark:text-indigo-400 mt-4 mb-2 flex items-center gap-2">
          {renderInline(line.slice(4))}
        </h3>
      );
      continue;
    }
    if (line.startsWith('#### ')) {
      elements.push(
        <h4 key={i} className="text-sm md:text-base font-semibold text-slate-200 mt-3 mb-1">
          {renderInline(line.slice(5))}
        </h4>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-lg md:text-xl font-bold text-indigo-200 mt-5 mb-2">
          {renderInline(line.slice(3))}
        </h2>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={i} className="border-l-4 border-indigo-500 bg-indigo-950/30 px-3 py-2 rounded-r-lg my-2 text-indigo-200 text-xs md:text-sm italic">
          {renderInline(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Bullet points
    if (line.startsWith('* ') || line.startsWith('- ')) {
      elements.push(
        <li key={i} className="ml-5 list-disc text-slate-300 my-0.5">
          {renderInline(line.slice(2))}
        </li>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+\.)\s(.*)/);
      if (match) {
        elements.push(
          <li key={i} className="ml-5 list-decimal text-slate-300 my-0.5">
            {renderInline(match[2])}
          </li>
        );
        continue;
      }
    }

    // Horizontal rule
    if (line.trim() === '---' || line.trim() === '***') {
      elements.push(<hr key={i} className="my-4 border-slate-700/60" />);
      continue;
    }

    // Blank line
    if (!line.trim()) {
      elements.push(<div key={i} className="h-1.5" />);
      continue;
    }

    // Paragraph
    elements.push(
      <p key={i} className="text-slate-200 dark:text-slate-300 leading-relaxed">
        {renderInline(line)}
      </p>
    );
  }

  if (inTable) {
    flushTable();
  }

  return <>{elements}</>;
};

// Helper for bold, italic, inline code
function renderInline(text: string): React.ReactNode {
  // Inline code `code`
  const codeParts = text.split(/(`[^`]+`)/g);

  return codeParts.map((cPart, cIdx) => {
    if (cPart.startsWith('`') && cPart.endsWith('`')) {
      return (
        <code key={cIdx} className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-xs border border-slate-700">
          {cPart.slice(1, -1)}
        </code>
      );
    }

    // Bold **text**
    const boldParts = cPart.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((bPart, bIdx) => {
      if (bPart.startsWith('**') && bPart.endsWith('**')) {
        return (
          <strong key={bIdx} className="font-semibold text-white">
            {bPart.slice(2, -2)}
          </strong>
        );
      }
      return bPart;
    });
  });
}
