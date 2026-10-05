import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { JUDGE_PRESETS } from '../utils/mockLocations';
import { requestDevnetAirdrop } from '../utils/solana';
import { Navigation, Coins, Edit3, RotateCcw } from 'lucide-react';

interface JudgeDeckProps {
  currentLocationName: string;
  isSimulated: boolean;
  onSelectPreset: (presetId: string) => void;
  onUseLiveGps: () => void;
  onRefreshData: () => void;
  onManualCoords?: (lat: number, lng: number, name: string) => void;
  onAirdropDemo?: () => void;
}

export const JudgeDeck: React.FC<JudgeDeckProps> = ({
  currentLocationName,
  isSimulated,
  onSelectPreset,
  onUseLiveGps,
  onRefreshData,
  onManualCoords,
  onAirdropDemo,
}) => {
  const { publicKey } = useWallet();
  const [airdropping, setAirdropping] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualLat, setManualLat] = useState('27.7172');
  const [manualLng, setManualLng] = useState('85.3240');
  const [manualLabel, setManualLabel] = useState('Kathmandu (Center)');

  const handleAirdrop = async () => {
    if (!publicKey) {
      if (onAirdropDemo) {
        onAirdropDemo();
      }
      setStatusMsg('✓ Airdropped +1.00 Devnet SOL to Demo Wallet');
      setTimeout(() => setStatusMsg(null), 3000);
      return;
    }

    setAirdropping(true);
    setStatusMsg('Requesting 1 Devnet SOL...');
    try {
      const sig = await requestDevnetAirdrop(publicKey);
      setStatusMsg(`Airdropped 1 SOL! TX: ${sig.slice(0, 8)}...`);
    } catch (e: any) {
      if (onAirdropDemo) onAirdropDemo();
      setStatusMsg('Devnet busy: +1.00 SOL credited locally!');
    } finally {
      setAirdropping(false);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  const handleApplyManual = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (!isNaN(lat) && !isNaN(lng) && onManualCoords) {
      onManualCoords(lat, lng, manualLabel);
      setShowManualInput(false);
      setStatusMsg(`Centered on: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-1 select-none">
      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-emerald-950/10 px-4 py-2.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Left: Real Device GPS & Coordinates Trigger */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          <button
            onClick={onUseLiveGps}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#E8F5E9] text-[#1E5E38] border border-[#8BC34A]/40 hover:bg-[#C8E6C9] transition-all shadow-xs shrink-0"
            title="Auto-detect real GPS"
          >
            <Navigation className="w-3.5 h-3.5 text-[#1E5E38]" />
            <span>Real GPS</span>
          </button>

          <button
            onClick={() => setShowManualInput(!showManualInput)}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#F4F9F5] border border-emerald-950/10 text-[#6B7F72] hover:text-[#11291B] hover:bg-[#E8F5E9] transition-colors shrink-0"
            title="Type coordinates"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#1E5E38]" />
            <span>Custom Coords</span>
          </button>

          <div className="flex items-center space-x-1 text-xs text-[#11291B] font-medium bg-[#F4F9F5] px-3 py-1.5 rounded-full border border-gray-100">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7CB342]" />
            <span className="truncate max-w-[200px] sm:max-w-xs">{currentLocationName}</span>
          </div>
        </div>

        {/* Right: Quick Preset Selector & Devnet Airdrop */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Preset Select Dropdown */}
          <select
            onChange={(e) => {
              if (e.target.value) onSelectPreset(e.target.value);
            }}
            defaultValue=""
            className="bg-[#F4F9F5] text-xs text-[#11291B] font-medium border border-emerald-950/10 rounded-full px-3 py-1.5 outline-none cursor-pointer hover:bg-[#E8F5E9] transition-colors"
          >
            <option value="" disabled>Jump to City...</option>
            {JUDGE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Quick Airdrop Pill */}
          <button
            onClick={handleAirdrop}
            disabled={airdropping}
            className="flex items-center space-x-1.5 bg-[#0F3822] hover:bg-[#154A2E] text-white px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs"
            title="Airdrop 1 Devnet SOL"
          >
            <Coins className="w-3.5 h-3.5 text-[#99E35E]" />
            <span>{airdropping ? 'Requesting...' : '+1 Devnet SOL'}</span>
          </button>

          <button
            onClick={onRefreshData}
            className="w-8 h-8 rounded-full bg-[#F4F9F5] border border-emerald-950/10 flex items-center justify-center text-[#6B7F72] hover:text-[#11291B] hover:bg-[#E8F5E9] transition-colors"
            title="Refresh oracle data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Manual Coordinates Input Form */}
      {showManualInput && (
        <form onSubmit={handleApplyManual} className="mt-2 p-3 bg-white rounded-2xl border border-emerald-950/10 shadow-sm flex flex-wrap gap-2 text-xs items-center">
          <span className="text-[11px] font-bold text-[#11291B] mr-2">ENTER COORDINATES:</span>
          <input
            type="text"
            placeholder="Latitude (e.g. 27.7172)"
            value={manualLat}
            onChange={(e) => setManualLat(e.target.value)}
            className="bg-[#F4F9F5] border border-emerald-900/10 px-3 py-1.5 rounded-xl text-[#11291B] text-xs w-36 outline-none"
          />
          <input
            type="text"
            placeholder="Longitude (e.g. 85.3240)"
            value={manualLng}
            onChange={(e) => setManualLng(e.target.value)}
            className="bg-[#F4F9F5] border border-emerald-900/10 px-3 py-1.5 rounded-xl text-[#11291B] text-xs w-36 outline-none"
          />
          <input
            type="text"
            placeholder="Label (e.g. My Location)"
            value={manualLabel}
            onChange={(e) => setManualLabel(e.target.value)}
            className="bg-[#F4F9F5] border border-emerald-900/10 px-3 py-1.5 rounded-xl text-[#11291B] text-xs flex-1 min-w-[140px] outline-none"
          />
          <button
            type="submit"
            className="bg-[#0F3822] text-white font-semibold px-4 py-1.5 rounded-xl hover:bg-[#154A2E] transition-colors"
          >
            Apply Location
          </button>
        </form>
      )}

      {statusMsg && (
        <div className="mt-1.5 text-xs text-[#1E5E38] font-semibold text-center animate-fadeIn">
          {statusMsg}
        </div>
      )}
    </div>
  );
};
