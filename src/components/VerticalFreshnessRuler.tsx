import React from 'react';

interface VerticalFreshnessRulerProps {
  minutesAge: number;
  observedAt: string;
}

export const VerticalFreshnessRuler: React.FC<VerticalFreshnessRulerProps> = ({
  minutesAge,
  observedAt,
}) => {
  // Clamp ruler indicator position between 0 and 60 minutes
  const clampedAge = Math.min(Math.max(minutesAge, 0), 60);
  const positionPercentage = (clampedAge / 60) * 100;

  return (
    <div className="flex items-center justify-between p-4 bg-slate-900/60 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl">
      {/* Left: Tactile Vertical Ruler (Reference Screen 2) */}
      <div className="relative w-24 h-40 bg-black/40 rounded-2xl border border-white/10 overflow-hidden flex flex-col justify-between py-2 px-2 select-none shadow-inner">
        {/* Soft Green Left Accent Curve */}
        <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-emerald-500/30 rounded-r-lg" />

        {/* Ruler Ticks */}
        {[0, 10, 20, 30, 40, 50, 60].map((val) => (
          <div key={val} className="flex items-center space-x-1.5 pl-3">
            <div className={`w-3 h-[1.5px] ${val % 20 === 0 ? 'bg-emerald-400 w-4' : 'bg-gray-600'}`} />
            <span className="text-[9px] font-mono text-gray-400 font-semibold">{val}m</span>
          </div>
        ))}

        {/* Emerald Horizontal Line Indicator */}
        <div
          className="absolute left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 shadow-md shadow-emerald-500/50"
          style={{ top: `${Math.min(Math.max(positionPercentage, 5), 90)}%` }}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 -mt-[3px] -ml-1 shadow-sm" />
        </div>
      </div>

      {/* Right: Large Numeric Elapsed Time */}
      <div className="flex-1 pl-6">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
          Observation Freshness
        </span>
        <div className="flex items-baseline space-x-1.5">
          <span className="text-4xl font-extrabold text-white font-mono tracking-tight">
            {minutesAge}
          </span>
          <span className="text-lg font-bold text-gray-400">min ago</span>
        </div>

        <div className="mt-2 flex items-center space-x-2">
          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] px-2.5 py-0.5 rounded-full font-semibold">
            {minutesAge <= 10 ? 'Ultra-Fresh' : minutesAge <= 30 ? 'Valid' : 'Aging Out'}
          </span>
          <span className="text-[11px] text-gray-400 font-mono">
            {new Date(observedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};
