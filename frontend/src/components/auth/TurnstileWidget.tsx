import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact' | 'flexible';
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoaded?: () => void;
  }
}

interface TurnstileWidgetProps {
  onSuccess: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  resetSignal?: number;
}

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
  onSuccess,
  onExpire,
  onError,
  theme = 'auto',
  className = '',
  resetSignal = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [siteKey, setSiteKey] = useState<string>('1x00000000000000000000AA');
  const [isScriptLoaded, setIsScriptLoaded] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isDevFallback, setIsDevFallback] = useState<boolean>(false);
  const [verifiedToken, setVerifiedToken] = useState<string | null>(null);

  // 1. Fetch site key from backend config
  useEffect(() => {
    let isMounted = true;
    fetch('/api/auth/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.turnstile_site_key) {
          setSiteKey(data.turnstile_site_key);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch Turnstile sitekey, using fallback:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Load Turnstile script dynamically
  useEffect(() => {
    if (window.turnstile) {
      setIsScriptLoaded(true);
      return;
    }

    const scriptId = 'cloudflare-turnstile-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;

      script.onload = () => {
        setIsScriptLoaded(true);
      };

      script.onerror = () => {
        console.warn('Turnstile script failed to load from Cloudflare CDN');
        setHasError(true);
        setIsDevFallback(true);
      };

      document.head.appendChild(script);
    } else {
      // Script already in DOM, check periodically
      const interval = setInterval(() => {
        if (window.turnstile) {
          setIsScriptLoaded(true);
          clearInterval(interval);
        }
      }, 100);

      // Timeout after 4s
      const timeout = setTimeout(() => {
        clearInterval(interval);
        if (!window.turnstile) {
          setIsDevFallback(true);
        }
      }, 4000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, []);

  // 3. Render Turnstile widget when script is ready
  useEffect(() => {
    if (!isScriptLoaded || !containerRef.current || !window.turnstile) return;

    try {
      // Clear previous widget if exists
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
      containerRef.current.innerHTML = '';

      const widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme,
        size: 'flexible',
        callback: (token: string) => {
          setVerifiedToken(token);
          setHasError(false);
          onSuccess(token);
        },
        'expired-callback': () => {
          setVerifiedToken(null);
          onExpire?.();
        },
        'error-callback': () => {
          console.warn('Turnstile challenge encountered an error');
          setHasError(true);
          onError?.();
        },
      });

      widgetIdRef.current = widgetId;
    } catch (err) {
      console.warn('Error rendering Turnstile widget:', err);
      setIsDevFallback(true);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [isScriptLoaded, siteKey, theme, resetSignal]);

  // Handle explicit reset signal
  useEffect(() => {
    if (resetSignal > 0) {
      setVerifiedToken(null);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch {
          // ignore
        }
      }
    }
  }, [resetSignal]);

  // Fallback for offline or blocked Cloudflare CDN
  if (isDevFallback || hasError) {
    return (
      <div className={`p-3 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/20 text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between gap-3 ${className}`}>
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className={verifiedToken ? "text-emerald-500" : "text-indigo-500"} />
          <div>
            <span className="font-semibold">Security Verification</span>
            <span className="block text-[11px] opacity-75">
              {verifiedToken ? 'Verification confirmed ✓' : 'Cloudflare Turnstile local dev mode'}
            </span>
          </div>
        </div>
        {!verifiedToken ? (
          <button
            type="button"
            onClick={() => {
              const testToken = 'fake-dev-token';
              setVerifiedToken(testToken);
              onSuccess(testToken);
            }}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-sm transition-colors cursor-pointer"
          >
            Verify Dev Mode
          </button>
        ) : (
          <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded font-semibold text-[11px]">
            Passed
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`turnstile-wrapper my-2 min-h-[65px] flex items-center justify-center ${className}`}>
      <div ref={containerRef} className="w-full flex justify-center" />
    </div>
  );
};
