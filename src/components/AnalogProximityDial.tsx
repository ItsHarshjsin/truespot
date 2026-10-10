import React from 'react';
import { Sparkles, Navigation } from 'lucide-react';

interface AnalogProximityDialProps {
  distanceMeters: number;
  placeName: string;
  onRelocateToBounty?: () => void;
  onSpawnNearbyBounties?: () => void;
}

export const AnalogProximityDial: React.FC<AnalogProximityDialProps> = ({
  distanceMeters,
  placeName,
  onRelocateToBounty,
  onSpawnNearbyBounties,
}) => {
  // Clamp distance between 0 and 200 meters for rotation angle (-50deg to +50deg)
  const clampedDist = Math.min(Math.max(distanceMeters, 0), 200);
  const needleRotation = -50 + (clampedDist / 200) * 100;
  const isWithinGeofence = distanceMeters <= 200;

  // Format large distances cleanly
  const isKm = distanceMeters >= 1000;
  const formattedDistance = isKm
    ? (distanceMeters / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })
    : Math.round(distanceMeters).toLocaleString();
  const unitLabel = isKm ? 'km' : 'meters';

  return (
    <div className="flex flex-col items-center justify-center py-2 select-none">
      {/* Tactile Skeuomorphic Scale Dial (CoinVex Radar Style) */}
      <div className="relative w-56 h-32 flex items-center justify-center">
        {/* Outer Mint Curved Bezel */}
        <div className="absolute inset-0 rounded-t-[50px] rounded-b-[30px] bg-slate-900/90 border-2 border-emerald-500/30 shadow-2xl flex items-center justify-center overflow-hidden">
          {/* Inner Cream Face */}
          <div className="w-[86%] h-[84%] rounded-t-[40px] rounded-b-[20px] bg-black/60 border border-white/10 relative flex flex-col items-center justify-start pt-2">
            {/* Scale Tick Marks */}
            <div className="w-full flex justify-between px-5 text-[10px] font-mono text-emerald-400/80 font-semibold">
              <span>0m</span>
              <span>50m</span>
              <span>100m</span>
              <span>150m</span>
              <span>200m</span>
            </div>

            {/* Scale Tick Lines */}
            <div className="w-full flex justify-between px-6 pt-1">
              {[0, 25, 50, 75, 100, 125, 150, 175, 200].map((val, idx) => (
                <div
                  key={val}
                  className={`w-[1.5px] rounded-full ${
                    idx % 2 === 0 ? 'h-3 bg-emerald-400/80' : 'h-1.5 bg-white/20'
                  }`}
                />
              ))}
            </div>

            {/* Rotating Needle */}
            <div
              className="absolute bottom-1 left-1/2 w-1 h-16 origin-bottom -translate-x-1/2 transition-transform duration-700 ease-out"
              style={{
                transform: `translateX(-50%) rotate(${needleRotation}deg)`,
              }}
            >
              <div className="w-1 h-full bg-gradient-to-t from-emerald-500 to-teal-300 rounded-t-full shadow-lg shadow-emerald-500/50" />
            </div>

            {/* Center Pivot Cap */}
            <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-emerald-500 border-2 border-black shadow-lg z-10" />

            {/* Metric Unit Selector Pill */}
            <div className="absolute bottom-3 bg-white/10 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/15 text-[10px] font-semibold text-emerald-300 shadow-sm flex items-center space-x-1 font-mono">
              <span>200m RADIUS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Large Numeric Display */}
      <div className="text-center mt-3 w-full">
        <div className="flex items-baseline justify-center space-x-2">
          <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white font-mono">
            {formattedDistance}
          </span>
          <span className="text-lg sm:text-xl font-bold text-gray-400">{unitLabel}</span>
        </div>

        {/* Status Pill */}
        <div className="mt-1 flex items-center justify-center">
          <span
            className={`text-xs px-3 py-1 rounded-full font-semibold inline-flex items-center space-x-1.5 ${
              isWithinGeofence
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isWithinGeofence ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>
              {isWithinGeofence
                ? 'WITHIN 200M GEOFENCE'
                : isKm
                ? `OUTSIDE ZONE (${formattedDistance} km)`
                : 'OUTSIDE 200M ZONE'}
            </span>
          </span>
        </div>

        <p className="text-xs text-gray-400 mt-1 truncate max-w-xs mx-auto px-2">
          Nearest spot: <strong className="text-white">{placeName}</strong>
        </p>

        {/* Quick Proximity Helper Actions if Outside Zone */}
        {!isWithinGeofence && (onSpawnNearbyBounties || onRelocateToBounty) && (
          <div className="mt-3 pt-3 border-t border-white/[0.08] flex items-center justify-center gap-2 px-2">
            {onSpawnNearbyBounties && (
              <button
                type="button"
                onClick={onSpawnNearbyBounties}
                className="py-1.5 px-3 rounded-full bg-[#A8FF00]/15 hover:bg-[#A8FF00]/25 text-[#A8FF00] border border-[#A8FF00]/30 text-[11px] font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer shadow-sm"
                title="Spawn test bounties near your device GPS"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Spawn at My GPS</span>
              </button>
            )}
            {onRelocateToBounty && (
              <button
                type="button"
                onClick={onRelocateToBounty}
                className="py-1.5 px-3 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 text-[11px] font-semibold flex items-center justify-center space-x-1 transition-all cursor-pointer shadow-sm"
                title="Jump directly inside 200m geofence"
              >
                <Navigation className="w-3.5 h-3.5 text-[#00F0FF]" />
                <span>Jump Inside (15m)</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
