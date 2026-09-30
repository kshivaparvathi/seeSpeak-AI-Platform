import React from 'react';
import { Zap, Wifi } from 'lucide-react';

interface LatencyBadgeProps {
  latencyMs: number | null;
  isConnected: boolean;
  voiceMode?: string;
}

export const LatencyBadge: React.FC<LatencyBadgeProps> = ({
  latencyMs,
  isConnected,
  voiceMode = 'gemini',
}) => {
  return (
    <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs shadow-inner">
      {/* Connection Indicator */}
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
          }`}
        />
        <span className="text-slate-400 font-mono text-[11px]">
          {isConnected ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>

      {/* Latency Display */}
      {latencyMs !== null && (
        <>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1 text-indigo-300 font-mono font-medium">
            <Zap size={12} className="text-amber-400" />
            <span>{latencyMs} ms</span>
          </div>
        </>
      )}

      {/* Mode Tag */}
      {voiceMode === 'mock' && (
        <>
          <span className="text-slate-700">|</span>
          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] uppercase font-semibold">
            Mock Mode
          </span>
        </>
      )}
    </div>
  );
};
