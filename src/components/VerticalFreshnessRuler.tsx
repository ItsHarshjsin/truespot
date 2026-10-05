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
    <div className="flex items-center justify-between p-4 bg-white rounded-3xl border border-emerald-950/5 shadow-sm">
      {/* Left: Tactile Vertical Ruler (Reference Screen 2) */}
      <div className="relative w-24 h-40 bg-[#F4F9F5] rounded-2xl border border-emerald-900/10 overflow-hidden flex flex-col justify-between py-2 px-2 select-none">
        {/* Soft Green Left Accent Curve */}
        <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-[#8BC34A]/30 rounded-r-lg" />

        {/* Ruler Ticks */}
        {[0, 10, 20, 30, 40, 50, 60].map((val) => (
          <div key={val} className="flex items-center space-x-1.5 pl-3">
            <div className={`w-3 h-[1.5px] ${val % 20 === 0 ? 'bg-[#0F3822] w-4' : 'bg-[#94A3B8]'}`} />
            <span className="text-[9px] font-mono text-[#6B7F72] font-semibold">{val}m</span>
          </div>
        ))}

        {/* Orange Horizontal Line Indicator */}
        <div
          className="absolute left-0 right-0 h-1 bg-[#E65100] transition-all duration-500 shadow-sm"
          style={{ top: `${Math.min(Math.max(positionPercentage, 5), 90)}%` }}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-[#E65100] -mt-[3px] -ml-1" />
        </div>
      </div>

      {/* Right: Large Numeric Elapsed Time */}
      <div className="flex-1 pl-6">
        <span className="text-xs font-semibold text-[#6B7F72] uppercase tracking-wider block mb-1">
          Observation Freshness
        </span>
        <div className="flex items-baseline space-x-1.5">
          <span className="text-4xl font-extrabold text-[#11291B] tracking-tight">
            {minutesAge}
          </span>
          <span className="text-lg font-bold text-[#6B7F72]">min ago</span>
        </div>

        <div className="mt-2 flex items-center space-x-2">
          <span className="bg-emerald-100 text-[#1E5E38] text-[11px] px-2.5 py-0.5 rounded-full font-semibold">
            {minutesAge <= 10 ? 'Ultra-Fresh' : minutesAge <= 30 ? 'Valid' : 'Aging Out'}
          </span>
          <span className="text-[11px] text-[#6B7F72] font-mono">
            {new Date(observedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};
