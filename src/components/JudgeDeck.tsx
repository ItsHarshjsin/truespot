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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-1 select-none">
      <div className="bg-[#121212] border border-zinc-800 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-black/40">
        {/* Left: Real Device GPS & Coordinates Trigger */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          <button
            onClick={onUseLiveGps}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-lime-400/10 border border-lime-400/30 text-lime-400 hover:bg-lime-400/20 shrink-0 transition-colors"
            title="Auto-detect real GPS"
          >
            <Navigation className="w-3.5 h-3.5 text-lime-400" />
            <span>Real GPS</span>
          </button>

          <button
            onClick={() => setShowManualInput(!showManualInput)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 shrink-0 transition-colors"
            title="Type coordinates"
          >
            <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
            <span>Custom Coords</span>
          </button>

          <div className="flex items-center space-x-2 text-xs text-zinc-300 font-medium bg-[#0a0a0a] px-3.5 py-1.5 rounded-full border border-zinc-800">
            <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse shadow-[0_0_8px_rgba(163,230,53,0.8)]" />
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
            className="bg-[#18181b] text-xs text-zinc-200 font-medium border border-zinc-800 rounded-full px-3.5 py-1.5 outline-none cursor-pointer hover:border-zinc-700 transition-colors"
          >
            <option value="" disabled className="bg-zinc-900 text-zinc-500">Jump to City...</option>
            {JUDGE_PRESETS.map((p) => (
              <option key={p.id} value={p.id} className="bg-zinc-900 text-white">
                {p.name}
              </option>
            ))}
          </select>

          {/* Quick Airdrop Pill */}
          <button
            onClick={handleAirdrop}
            disabled={airdropping}
            className="flex items-center space-x-1.5 bg-lime-400 hover:bg-lime-300 text-black font-bold px-4 py-1.5 rounded-full text-xs transition-all shadow-[0_0_15px_rgba(163,230,53,0.3)] hover:scale-105 active:scale-95"
            title="Airdrop 1 Devnet SOL"
          >
            <Coins className="w-3.5 h-3.5 text-black" />
            <span>{airdropping ? 'Requesting...' : '+1 Devnet SOL'}</span>
          </button>

          <button
            onClick={onRefreshData}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
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
