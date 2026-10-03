import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, RotateCw } from 'lucide-react';

interface VisualCaptchaProps {
  captchaId: string;
  captchaCode: string;
  onCaptchaChange: (code: string) => void;
  onCaptchaIdChange: (id: string) => void;
  resetSignal?: number;
  disabled?: boolean;
}

export const VisualCaptcha: React.FC<VisualCaptchaProps> = ({
  captchaId,
  captchaCode,
  onCaptchaChange,
  onCaptchaIdChange,
  resetSignal = 0,
  disabled = false,
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  const fetchNewChallenge = useCallback(async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      onCaptchaChange('');

      const res = await fetch('/api/auth/captcha', {
        headers: { 'Accept': 'application/json' },
      });

      if (!res.ok) {
        throw new Error('Failed to load CAPTCHA');
      }

      const data = await res.json();
      if (data.captcha_id && data.captcha_image) {
        setImageUrl(data.captcha_image);
        onCaptchaIdChange(data.captcha_id);
      } else {
        throw new Error('Invalid CAPTCHA payload');
      }
    } catch (err) {
      console.error('Error fetching CAPTCHA challenge:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [onCaptchaChange, onCaptchaIdChange]);

  // Initial load
  useEffect(() => {
    fetchNewChallenge();
  }, [fetchNewChallenge]);

  // Re-fetch when parent sends a reset signal (e.g. on submission failure or tab switch)
  useEffect(() => {
    if (resetSignal > 0) {
      fetchNewChallenge();
    }
  }, [resetSignal, fetchNewChallenge]);

  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 mb-1">
        <ShieldCheck size={14} className="text-slate-600" />
        <span>CAPTCHA</span>
        <span className="text-rose-500">*</span>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Left: Distorted Visual Image Challenge Box */}
        <div 
          onClick={!disabled ? fetchNewChallenge : undefined}
          title="Click to generate a new CAPTCHA"
          className="relative w-36 h-10 rounded-xl overflow-hidden bg-slate-50 border border-[#e2e8f0] shrink-0 flex items-center justify-center select-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] cursor-pointer group"
        >
          {isLoading ? (
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <RotateCw size={13} className="animate-spin text-indigo-500" />
              <span>Loading...</span>
            </div>
          ) : hasError ? (
            <button
              type="button"
              onClick={fetchNewChallenge}
              className="text-[11px] font-medium text-indigo-600 hover:underline"
            >
              Retry
            </button>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt="Visual CAPTCHA Security Code"
              className="w-full h-full object-cover select-none pointer-events-none transition-transform group-hover:scale-[1.02]"
              draggable={false}
            />
          ) : null}
        </div>

        {/* Right: Enter the code shown input box with embedded refresh icon */}
        <div className="relative flex-1">
          <input
            type="text"
            required
            disabled={disabled}
            value={captchaCode}
            onChange={(e) => onCaptchaChange(e.target.value.toUpperCase())}
            placeholder="Enter the code shown"
            maxLength={10}
            autoComplete="off"
            spellCheck={false}
            className="w-full h-10 bg-white border border-[#e2e8f0] text-slate-800 placeholder-slate-400 rounded-xl pl-3.5 pr-8 text-xs font-mono uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
          />
          <button
            type="button"
            onClick={fetchNewChallenge}
            disabled={isLoading || disabled}
            title="Generate a new CAPTCHA code"
            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-indigo-600 transition-colors p-0.5 rounded cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCw size={14} className={isLoading ? "animate-spin text-indigo-600" : ""} />
          </button>
        </div>
      </div>
    </div>
  );
};
