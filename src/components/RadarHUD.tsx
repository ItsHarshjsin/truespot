import React from 'react';
import { Bounty } from '../types';

interface RadarHUDProps {
  bounties: (Bounty & { distance_meters: number; is_within_range: boolean })[];
  onSelectBounty: (bountyId: string) => void;
}

export const RadarHUD: React.FC<RadarHUDProps> = ({ bounties, onSelectBounty }) => {
  return (
    <div className="relative w-full max-w-[340px] aspect-square mx-auto rounded-full bg-[#080D15] border-2 border-cyan-500/30 overflow-hidden shadow-[0_0_50px_rgba(0,245,255,0.08)] flex items-center justify-center p-3 select-none">
      {/* Concentric Range Rings */}
      <div className="absolute inset-0 rounded-full border border-cyan-500/10 pointer-events-none" />
      <div className="absolute w-3/4 h-3/4 rounded-full border border-cyan-500/15 pointer-events-none flex items-start justify-center">
        <span className="text-[9px] font-mono text-cyan-500/40 -mt-2.5 bg-[#080D15] px-1">150m</span>
      </div>
      <div className="absolute w-1/2 h-1/2 rounded-full border border-cyan-500/20 pointer-events-none flex items-start justify-center">
        <span className="text-[9px] font-mono text-cyan-500/50 -mt-2.5 bg-[#080D15] px-1">100m</span>
      </div>
      <div className="absolute w-1/4 h-1/4 rounded-full border border-cyan-500/30 pointer-events-none flex items-start justify-center">
        <span className="text-[9px] font-mono text-cyan-500/60 -mt-2.5 bg-[#080D15] px-1">50m</span>
      </div>

      {/* Axis Crosshairs */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-full h-[1px] bg-cyan-500/15" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="h-full w-[1px] bg-cyan-500/15" />
      </div>

      {/* Rotating Radar Sweep Cone */}
      <div className="absolute inset-0 pointer-events-none animate-radar-sweep origin-center">
        <div 
          className="w-1/2 h-1/2 absolute top-0 right-0 origin-bottom-left"
          style={{
            background: 'conic-gradient(from 180deg at 0% 100%, rgba(0, 245, 255, 0.25) 0deg, rgba(0, 245, 255, 0) 90deg)',
          }}
        />
      </div>

      {/* Center User Dot */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative flex items-center justify-center">
          <span className="absolute w-6 h-6 rounded-full bg-cyan-400/30 animate-ping" />
          <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-white shadow-[0_0_12px_#00F5FF]" />
        </div>
        <span className="text-[9px] font-mono font-bold text-cyan-300 mt-1 uppercase">YOU (GPS)</span>
      </div>

      {/* Bounty Radar Blips */}
      {bounties.slice(0, 8).map((b, idx) => {
        // Map distance (0 to 300m) to radial distance percentage (0 to 45%)
        const maxDisplayMeters = 250;
        const normalizedDist = Math.min(b.distance_meters, maxDisplayMeters) / maxDisplayMeters;
        const radiusPct = normalizedDist * 42; // Up to 42% from center

        // Distribute blips geometrically around the circle
        const angle = (idx * (360 / Math.max(bounties.length, 4)) + 45) * (Math.PI / 180);
        const xOffset = Math.cos(angle) * radiusPct;
        const yOffset = Math.sin(angle) * radiusPct;

        const isEligible = b.is_within_range;

        return (
          <button
            key={b.id}
            onClick={() => onSelectBounty(b.id)}
            style={{
              transform: `translate(${xOffset * 3.4}px, ${yOffset * 3.4}px)`,
            }}
            className="group absolute z-20 transition-transform hover:scale-125 focus:outline-none"
            title={`${b.place_name} (${b.distance_meters}m away)`}
          >
            <div className="relative flex items-center justify-center">
              {isEligible && (
                <span className="absolute w-4 h-4 rounded-full bg-emerald-400/40 animate-ping" />
              )}
              <span
                className={`w-3 h-3 rounded-full border ${
                  isEligible
                    ? 'bg-emerald-400 border-white shadow-[0_0_10px_#00FF66]'
                    : 'bg-slate-600 border-slate-400 opacity-60'
                }`}
              />
            </div>

            {/* Hover Tooltip Card */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center pointer-events-none whitespace-nowrap z-30">
              <div className="bg-[#0E1522] border border-cyan-500/40 text-[10px] px-2 py-1 rounded shadow-lg">
                <span className="font-bold text-white">{b.place_name}</span>
                <span className={`block font-mono text-[9px] ${isEligible ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {b.distance_meters}m • {isEligible ? 'IN 200M RANGE' : 'OUT OF RANGE'}
                </span>
              </div>
            </div>
          </button>
        );
      })}

      {/* Bottom Range Legend */}
      <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
          200M GEOFENCE ACTIVE
        </span>
      </div>
    </div>
  );
};
