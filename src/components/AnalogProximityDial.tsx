import React from 'react';

interface AnalogProximityDialProps {
  distanceMeters: number;
  placeName: string;
}

export const AnalogProximityDial: React.FC<AnalogProximityDialProps> = ({
  distanceMeters,
  placeName,
}) => {
  // Clamp distance between 0 and 250 meters for rotation angle (-60deg to +60deg)
  const clampedDist = Math.min(Math.max(distanceMeters, 0), 200);
  const needleRotation = -50 + (clampedDist / 200) * 100;
  const isWithinGeofence = distanceMeters <= 200;

  return (
    <div className="flex flex-col items-center justify-center py-2 select-none">
      {/* Tactile Skeuomorphic Scale Dial (Reference Screen 1) */}
      <div className="relative w-56 h-32 flex items-center justify-center">
        {/* Outer Mint Curved Bezel */}
        <div className="absolute inset-0 rounded-t-[50px] rounded-b-[30px] bg-[#E2F0E7] border-4 border-[#7CB342]/70 shadow-sm flex items-center justify-center overflow-hidden">
          {/* Inner Cream Face */}
          <div className="w-[86%] h-[84%] rounded-t-[40px] rounded-b-[20px] bg-[#FAFCF9] border border-emerald-900/10 relative flex flex-col items-center justify-start pt-2">
            
            {/* Scale Tick Marks */}
            <div className="w-full flex justify-between px-5 text-[10px] font-mono text-[#6B7F72] font-semibold">
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
                    idx % 2 === 0 ? 'h-3 bg-[#6B7F72]' : 'h-1.5 bg-[#CBD5E1]'
                  }`}
                />
              ))}
            </div>

            {/* Rotating Orange Needle */}
            <div
              className="absolute bottom-1 left-1/2 w-1 h-16 origin-bottom -translate-x-1/2 transition-transform duration-700 ease-out"
              style={{
                transform: `translateX(-50%) rotate(${needleRotation}deg)`,
              }}
            >
              <div className="w-1 h-full bg-[#E65100] rounded-t-full shadow-sm" />
            </div>

            {/* Center Pivot Cap */}
            <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#0F3822] border-2 border-white shadow-sm z-10" />

            {/* Metric Unit Selector Pill */}
            <div className="absolute bottom-3 bg-white/95 px-2.5 py-0.5 rounded-full border border-gray-200 text-[10px] font-semibold text-[#11291B] shadow-xs flex items-center space-x-1">
              <span>200m RADIUS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Large Numeric Display */}
      <div className="text-center mt-3">
        <div className="flex items-baseline justify-center space-x-2">
          <span className="text-5xl font-extrabold tracking-tight text-[#11291B]">
            {distanceMeters}
          </span>
          <span className="text-xl font-bold text-[#6B7F72]">meters</span>
        </div>

        {/* Status Pill */}
        <div className="mt-1 flex items-center justify-center">
          <span
            className={`text-xs px-3 py-1 rounded-full font-semibold inline-flex items-center space-x-1.5 ${
              isWithinGeofence
                ? 'bg-[#E8F5E9] text-[#1E5E38] border border-[#8BC34A]/40'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isWithinGeofence ? 'bg-[#7CB342] animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span>{isWithinGeofence ? 'WITHIN 200M GEOFENCE' : 'OUTSIDE 200M ZONE'}</span>
          </span>
        </div>

        <p className="text-xs text-[#6B7F72] mt-1 truncate max-w-xs mx-auto">
          Nearest spot: <strong className="text-[#11291B]">{placeName}</strong>
        </p>
      </div>
    </div>
  );
};
