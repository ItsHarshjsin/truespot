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
    if (confidencePercent >= 80) return { label: 'High Confidence Truth', text: 'Fantastic! ✨ Physical truth confirmed by consensus.', badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' };
    if (confidencePercent >= 50) return { label: 'Moderate Consensus', text: 'Fairly reliable. Additional verifiers recommended.', badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' };
    return { label: 'Low / Disputed', text: 'Warning: Claim disputed or freshness expired.', badge: 'bg-rose-500/20 text-rose-300 border border-rose-500/30' };
  };

  const status = getStatusLabel();

  return (
    <div className="flex flex-col items-center justify-center py-3 select-none">
      {/* 1. Large Hero Numeric Score */}
      <div className="text-center mb-1">
        <span className="text-5xl font-extrabold tracking-tight text-white font-mono">
          {confidencePercent}%
        </span>
        <div className="mt-1">
          <span className={`text-xs px-3 py-0.5 rounded-full font-semibold ${status.badge}`}>
            {status.label}
          </span>
        </div>
      </div>

      {/* 2. Tactile Multi-Color Spectrum Gradient Bar (Reference Screen 3) */}
      <div className="relative w-full max-w-sm mt-5 px-3">
        {/* The Spectrum Bar */}
        <div className="w-full h-8 rounded-xl bg-gradient-to-r from-sky-400 via-emerald-400 via-amber-300 to-rose-400 shadow-inner overflow-hidden border border-white/20" />

        {/* Vertical Forest Indicator Slider Needle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 transition-all duration-700 ease-out"
          style={{ left: `calc(${sliderPosition}% - 3px)` }}
        >
          <div className="w-2 h-12 rounded-full bg-emerald-400 border-2 border-white shadow-lg -mt-2" />
        </div>
      </div>

      {/* 3. Friendly Reassuring Copy */}
      <div className="text-center mt-6">
        <p className="text-sm font-semibold text-white">
          {status.text}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          Audited by <strong className="text-emerald-300">{agreeCount} of {totalVotes}</strong> independent verifiers
        </p>
      </div>
    </div>
  );
};
