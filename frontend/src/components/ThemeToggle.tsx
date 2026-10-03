import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabel = false }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`p-2 rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer ${
        isDark
          ? 'bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 shadow-sm'
          : 'bg-slate-100 hover:bg-slate-200 text-indigo-600 border border-slate-200 shadow-sm'
      } ${className}`}
      title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
      aria-label="Toggle color theme"
    >
      {isDark ? (
        <Sun size={15} className="text-amber-400 rotate-0 transition-transform duration-300" />
      ) : (
        <Moon size={15} className="text-indigo-600 rotate-0 transition-transform duration-300" />
      )}
      {showLabel && (
        <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
};
