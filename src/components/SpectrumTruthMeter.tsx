import React from 'react';

interface SpectrumTruthMeterProps {
  confidencePercent: number;
  agreeCount: number;
  totalVotes: number;
}

export const SpectrumTruthMeter: React.FC<SpectrumTruthMeterProps> = ({
  confidencePercent,
  agreeCount,
  totalVotes,
}) => {
  // Clamp slider between 5% and 95%
  const sliderPosition = Math.min(Math.max(confidencePercent, 5), 95);

  const getStatusLabel = () => {
    if (confidencePercent >= 80) return { label: 'High Confidence Truth', text: 'Fantastic! ✨ Physical truth confirmed by consensus.', badge: 'bg-[#A8FF00]/10 text-[#A8FF00] border border-[#A8FF00]/30' };
    if (confidencePercent >= 50) return { label: 'Moderate Consensus', text: 'Fairly reliable. Additional verifiers recommended.', badge: 'bg-amber-400/10 text-amber-300 border border-amber-400/30' };
    return { label: 'Low / Disputed', text: 'Warning: Claim disputed or freshness expired.', badge: 'bg-rose-500/10 text-rose-300 border border-rose-500/30' };
  };

  const status = getStatusLabel();

  return (
    <div className="flex flex-col items-center justify-center py-2 select-none">
      {/* 1. Large Hero Numeric Score */}
      <div className="text-center mb-1">
        <span className="text-5xl font-black tracking-tight text-[#A8FF00] font-mono">
          {confidencePercent}%
        </span>
        <div className="mt-2">
          <span className={`text-xs px-3.5 py-1 rounded-full font-bold font-mono ${status.badge}`}>
            {status.label}
          </span>
        </div>
      </div>

      {/* 2. Tactile Spectrum Gradient Bar */}
      <div className="relative w-full max-w-sm mt-5 px-3">
        {/* The Spectrum Bar: Rose to Amber to Neon Lime */}
        <div className="w-full h-7 rounded-xl bg-gradient-to-r from-rose-500 via-amber-400 to-[#A8FF00] shadow-inner overflow-hidden border border-white/10" />

        {/* Vertical Indicator Slider Needle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 transition-all duration-700 ease-out"
          style={{ left: `calc(${sliderPosition}% - 4px)` }}
        >
          <div className="w-2.5 h-11 rounded-full bg-white border-2 border-black shadow-lg -mt-2" />
        </div>
      </div>

      {/* 3. Friendly Reassuring Copy */}
      <div className="text-center mt-5">
        <p className="text-xs font-semibold text-[#F5F5F5]">
          {status.text}
        </p>
        <p className="text-[11px] text-[#858585] mt-0.5">
          Audited by <strong className="text-[#A8FF00] font-bold">{agreeCount} of {totalVotes}</strong> independent verifiers
        </p>
      </div>
    </div>
  );
};
