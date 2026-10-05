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
    <div className="flex items-center justify-between p-5 bg-[#0B0B0B] border border-white/[0.07] rounded-[24px] shadow-xl">
      {/* Left: Tactile Vertical Ruler */}
      <div className="relative w-24 h-40 bg-[#050505] rounded-xl border border-white/[0.07] overflow-hidden flex flex-col justify-between py-2 px-2 select-none shadow-inner">
        {/* Soft Green Left Accent Curve */}
        <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-[#A8FF00]/20 rounded-r-lg" />

        {/* Ruler Ticks */}
        {[0, 10, 20, 30, 40, 50, 60].map((val) => (
          <div key={val} className="flex items-center space-x-1.5 pl-3">
            <div className={`w-3 h-[1.5px] ${val % 20 === 0 ? 'bg-[#A8FF00] w-4' : 'bg-zinc-700'}`} />
            <span className="text-[9px] font-mono text-[#858585] font-semibold">{val}m</span>
          </div>
        ))}

        {/* Neon Horizontal Line Indicator */}
        <div
          className="absolute left-0 right-0 h-1 bg-[#A8FF00] transition-all duration-500 shadow-[0_0_8px_rgba(168,255,0,0.6)]"
          style={{ top: `${Math.min(Math.max(positionPercentage, 5), 90)}%` }}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-[#A8FF00] -mt-[3px] -ml-1 shadow-sm" />
        </div>
      </div>

      {/* Right: Large Numeric Elapsed Time */}
      <div className="flex-1 pl-6">
        <span className="text-[10px] font-bold text-[#858585] uppercase tracking-wider block mb-1">
          Observation Freshness
        </span>
        <div className="flex items-baseline space-x-1.5">
          <span className="text-4xl font-black text-[#F5F5F5] font-mono tracking-tight">
            {minutesAge}
          </span>
          <span className="text-sm font-semibold text-[#858585]">min ago</span>
        </div>

        <div className="mt-2 flex items-center space-x-2">
          <span className="bg-[#A8FF00]/10 text-[#A8FF00] border border-[#A8FF00]/30 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full">
            {minutesAge <= 10 ? 'Ultra-Fresh' : minutesAge <= 30 ? 'Valid' : 'Aging Out'}
          </span>
          <span className="text-[11px] text-[#858585] font-mono">
            {new Date(observedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};
