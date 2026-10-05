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
      onRefreshData();
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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2 select-none">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
        {/* Left: CoinVex Large Dashboard Title & Date */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#F5F5F5] tracking-tight">
            Dashboard
          </h1>
          <div className="flex items-center space-x-2 text-xs text-[#858585] mt-1 font-medium">
            <span>25 January 2025</span>
            <span>•</span>
            <span className="flex items-center space-x-1.5 text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A8FF00] animate-pulse" />
              <span className="truncate max-w-[220px]">{currentLocationName}</span>
            </span>
          </div>
        </div>

        {/* Right: CoinVex Horizontal Filter Pills */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {/* Active Pill: Real GPS (CoinVex "Grow Stocks" style with green arrow puck) */}
          <button
            onClick={onUseLiveGps}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#0D0D0D] border border-white/[0.08] text-white hover:border-[#A8FF00]/50 transition-all shadow-sm"
            title="Auto-detect real GPS"
          >
            <div className="w-5 h-5 rounded-full bg-[#A8FF00] text-black flex items-center justify-center font-bold text-[10px]">
              ↑
            </div>
            <span>Real GPS</span>
          </button>

          {/* Inactive Pill 1: Custom Coords */}
          <button
            onClick={() => setShowManualInput(!showManualInput)}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#0D0D0D] border border-white/[0.08] text-[#858585] hover:text-white hover:border-white/20 transition-all"
            title="Enter custom coordinates"
          >
            <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
            <span>Custom Coords</span>
          </button>

          {/* Inactive Pill 2: Preset Select Dropdown */}
          <select
            onChange={(e) => {
              if (e.target.value) onSelectPreset(e.target.value);
            }}
            defaultValue=""
            className="bg-[#0D0D0D] text-xs text-[#858585] hover:text-white font-medium border border-white/[0.08] rounded-full px-3.5 py-1.5 outline-none cursor-pointer hover:border-white/20 transition-all"
          >
            <option value="" disabled className="bg-zinc-900 text-zinc-500">Jump to City...</option>
            {JUDGE_PRESETS.map((p) => (
              <option key={p.id} value={p.id} className="bg-zinc-900 text-white">
                {p.name}
              </option>
            ))}
          </select>

          {/* Inactive Pill 3: Airdrop */}
          <button
            onClick={handleAirdrop}
            disabled={airdropping}
            className="flex items-center space-x-1.5 bg-[#0D0D0D] hover:bg-zinc-900 border border-white/[0.08] text-[#A8FF00] font-bold px-3.5 py-1.5 rounded-full text-xs transition-all shadow-sm"
            title="Airdrop 1 Devnet SOL"
          >
            <Coins className="w-3.5 h-3.5 text-[#A8FF00]" />
            <span>{airdropping ? 'Requesting...' : '+1 SOL'}</span>
          </button>

          {/* Circular Refresh Puck */}
          <button
            onClick={onRefreshData}
            className="w-8 h-8 rounded-full bg-[#0D0D0D] border border-white/[0.08] hover:border-white/20 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            title="Refresh oracle data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Manual Coordinates Input Form */}
      {showManualInput && (
        <form onSubmit={handleApplyManual} className="mt-2 p-3.5 bg-[#121212] rounded-2xl border border-zinc-800 shadow-2xl flex flex-wrap gap-2 text-xs items-center">
          <span className="text-[11px] font-bold text-zinc-400 mr-2 tracking-wider">ENTER COORDINATES:</span>
          <input
            type="text"
            placeholder="Latitude (e.g. 27.7172)"
            value={manualLat}
            onChange={(e) => setManualLat(e.target.value)}
            className="bg-[#18181b] border border-zinc-800 px-3.5 py-1.5 rounded-full text-white text-xs w-36 outline-none focus:border-lime-400/60"
          />
          <input
            type="text"
            placeholder="Longitude (e.g. 85.3240)"
            value={manualLng}
            onChange={(e) => setManualLng(e.target.value)}
            className="bg-[#18181b] border border-zinc-800 px-3.5 py-1.5 rounded-full text-white text-xs w-36 outline-none focus:border-lime-400/60"
          />
          <input
            type="text"
            placeholder="Label (e.g. My Location)"
            value={manualLabel}
            onChange={(e) => setManualLabel(e.target.value)}
            className="bg-[#18181b] border border-zinc-800 px-3.5 py-1.5 rounded-full text-white text-xs flex-1 min-w-[140px] outline-none focus:border-lime-400/60"
          />
          <button
            type="submit"
            className="bg-lime-400 hover:bg-lime-300 text-black font-bold px-4 py-1.5 rounded-full transition-colors shadow-sm"
          >
            Apply Location
          </button>
        </form>
      )}

      {statusMsg && (
        <div className="mt-1.5 text-xs text-lime-400 font-semibold text-center animate-fadeIn">
          {statusMsg}
        </div>
      )}
    </div>
  );
};
