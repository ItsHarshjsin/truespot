import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Coordinates } from '../types';
import { JUDGE_PRESETS } from '../utils/mockLocations';
import { lockBountyOnChain } from '../utils/solana';
import { hybridStore } from '../utils/storage';
import { searchLocationOSM } from '../utils/evidence';
import {
  ShieldCheck,
  MapPin,
  Search,
  Sparkles,
  Coins,
  TrendingUp,
  Activity,
  Users,
  Compass,
} from 'lucide-react';

interface AskScreenProps {
  userCoords: Coordinates;
  makerWallet?: string;
  onBountyCreated: (bountyId: string) => void;
  onAdjustBalance?: (delta: number, role?: 'asker' | 'spotter' | 'verifier') => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'reward' | 'warning') => void;
  onNavigateToRadar?: () => void;
}

export const AskScreen: React.FC<AskScreenProps> = ({
  userCoords,
  makerWallet,
  onBountyCreated,
  onAdjustBalance,
  onShowToast,
  onNavigateToRadar,
}) => {
  const { publicKey, sendTransaction } = useWallet();

  const [question, setQuestion] = useState('Is the main entrance open and are there people waiting right now?');
  const [placeName, setPlaceName] = useState('Nearby Venue / Spot');
  const [amountSol, setAmountSol] = useState(0.20);
  const [expiryMinutes, setExpiryMinutes] = useState(30);

  // Flow chart timeframe
  const [chartTimeframe, setChartTimeframe] = useState<'week' | 'month'>('week');

  // Location search & coordinates
  const [targetLat, setTargetLat] = useState(userCoords.lat);
  const [targetLng, setTargetLng] = useState(userCoords.lng);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [searchResults, setSearchResults] = useState<{ name: string; lat: number; lng: number }[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const QUICK_PROMPTS = [
    '☕ Is the walk-in coffee counter open with a short wait line?',
    '⚡ Are EV charging stalls currently free and unoccupied?',
    '📦 Is this specific product currently on the store shelves?',
    '🚗 Is parking space available at this lot right now?',
  ];

  const handleSearchLocation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!locationSearchQuery.trim()) return;
    setIsSearchingLocation(true);
    try {
      const results = await searchLocationOSM(locationSearchQuery.trim());
      setSearchResults(results);
    } catch (err) {
      console.warn('Location search error:', err);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handleSelectSearchResult = (res: { name: string; lat: number; lng: number }) => {
    setTargetLat(res.lat);
    setTargetLng(res.lng);
    setPlaceName(res.name.split(',')[0]);
    setSearchResults([]);
    setLocationSearchQuery(res.name.split(',')[0]);
  };

  const handleLockBounty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      setErrorMsg('Please enter a verification prompt for field workers.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setTxSignature(null);

    try {
      // 1. Lock funds into Solana Devnet Escrow Vault
      const txSig = await lockBountyOnChain(sendTransaction, publicKey, amountSol);
      setTxSignature(txSig);

      if (onAdjustBalance) {
        onAdjustBalance(-amountSol, 'asker');
      }

      if (onShowToast) {
        onShowToast(
          'Escrow Vault Funded',
          `Locked ${amountSol} SOL in Escrow Vault (${txSig.slice(0, 10)}...)`,
          'success'
        );
      }

      const expiresAt = new Date(Date.now() + expiryMinutes * 60000).toISOString();
      const creatorAddress = publicKey
        ? publicKey.toBase58().slice(0, 4) + '...' + publicKey.toBase58().slice(-4)
        : makerWallet || 'Maker3r...4Wqz';

      // 2. Persist Bounty Record to Supabase / LocalStore
      const newBounty = await hybridStore.createBounty({
        question: question.trim(),
        place_name: placeName.trim() || 'Physical Location',
        lat: targetLat,
        lng: targetLng,
        amount_sol: amountSol,
        status: 'OPEN',
        asker_wallet: creatorAddress,
        expires_at: expiresAt,
        escrow_tx: txSig,
      });

      setTimeout(() => {
        onBountyCreated(newBounty.id);
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Escrow deposit failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-6 w-full">
      {/* 3-Column Structured Layout (Desktop-First Benchmark) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ========================================================= */}
        {/* COLUMN 1: Your Escrow Vault + Action Pucks + Gradients    */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 space-y-4">
          {/* Main Portfolio Panel */}
          <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-5 space-y-4 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-bold text-[#F5F5F5] tracking-tight">Your Escrow Vault</h2>
              <div className="flex items-center space-x-1.5 bg-[#101010] border border-white/[0.07] rounded-full px-2.5 py-1 text-[11px] font-semibold text-[#A8FF00]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A8FF00] animate-pulse" />
                <span>Devnet Live</span>
              </div>
            </div>

            {/* Quick Action Circles Row (CoinVex Signature: 3 White Circular Pucks) */}
            <div className="grid grid-cols-3 gap-2.5 pt-1 text-center">
              <div className="flex flex-col items-center space-y-1.5 group cursor-pointer">
                <div className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center font-extrabold shadow-md group-hover:scale-105 transition-transform">
                  <Coins className="w-4 h-4 text-black" />
                </div>
                <span className="text-[11px] font-semibold text-[#858585] group-hover:text-white transition-colors">Deposit</span>
              </div>

              <div className="flex flex-col items-center space-y-1.5 group cursor-pointer">
                <div className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center font-extrabold shadow-md group-hover:scale-105 transition-transform">
                  <MapPin className="w-4 h-4 text-black" />
                </div>
                <span className="text-[11px] font-semibold text-[#858585] group-hover:text-white transition-colors">200m Range</span>
              </div>

              <div className="flex flex-col items-center space-y-1.5 group cursor-pointer">
                <div className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center font-extrabold shadow-md group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-4 h-4 text-black" />
                </div>
                <span className="text-[11px] font-semibold text-[#858585] group-hover:text-white transition-colors">Biometric</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5 pt-1 border-t border-white/[0.06]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#858585] font-medium">Escrow Allocation</span>
                <span className="font-mono text-[#858585]">Target: <strong className="text-[#F5F5F5] font-bold">{amountSol.toFixed(2)} SOL</strong></span>
              </div>
              <div className="w-full bg-[#141414] h-2 rounded-full overflow-hidden flex">
                <div className="bg-[#A8FF00] h-full w-3/4 rounded-full shadow-[0_0_10px_rgba(168,255,0,0.5)]" />
                <div className="bg-zinc-800 h-full w-1/4" />
              </div>
            </div>

            {/* Stacked Featured Cards (EXACT CoinVex Crypto & Stocks style) */}
            <div className="space-y-2.5 pt-1">
              {/* 1. Neon Green Gradient Card (Worker Payout) */}
              <div className="fintech-card-green p-4 relative overflow-hidden">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center font-bold text-[10px]">
                      ⚡
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-black/90">Worker Payout</span>
                  </div>
                  <span className="text-[10px] font-mono font-extrabold bg-black/15 px-2 py-0.5 rounded-full text-black">
                    100%
                  </span>
                </div>
                <div className="text-2xl font-black tracking-tight my-0.5 text-black">
                  {amountSol.toFixed(2)} SOL
                </div>
                <div className="flex items-center justify-between text-[10px] font-semibold pt-1">
                  <span className="bg-black text-[#A8FF00] px-2 py-0.5 rounded-full font-mono font-bold">
                    ↗ Instant Release
                  </span>
                  <span className="text-black/75">Upon Approval</span>
                </div>
              </div>

              {/* 2. Vibrant Purple Gradient Card (Hardware & Biometrics) */}
              <div className="fintech-card-purple p-4 relative overflow-hidden">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-bold text-[10px]">
                      🛡️
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-100">Verification Proof</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-white/20 px-2 py-0.5 rounded-full text-white">
                    SHA-256
                  </span>
                </div>
                <div className="text-xl font-black tracking-tight my-0.5 text-white">
                  Biometric Gyro
                </div>
                <div className="text-[10px] text-purple-200 truncate">
                  Physical tremor + Solana devnet blockhash
                </div>
              </div>
            </div>
          </div>

          {/* Quick Idea Prompts Card */}
          <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-5 space-y-2.5 shadow-xl">
            <div className="flex items-center space-x-2 text-[11px] font-bold text-[#858585] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#A8FF00]" />
              <span>1-Click Verification Ideas</span>
            </div>
            <div className="space-y-1.5">
              {QUICK_PROMPTS.map((p, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setQuestion(p)}
                  className="w-full text-left p-2.5 bg-[#101010] hover:bg-[#161616] border border-white/[0.06] hover:border-white/15 text-[11px] text-[#858585] hover:text-[#F5F5F5] rounded-xl transition-all leading-snug font-medium"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLUMN 2: Activity Flow (Wave Chart) + Analytics Matrix   */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Flowing Dual Wave Ribbon Chart (CoinVex Cashflow) */}
          <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-[#A8FF00]" />
                <h3 className="text-[15px] font-bold text-[#F5F5F5] tracking-tight">Activity Flow</h3>
              </div>
              <div className="flex items-center bg-[#101010] p-0.5 rounded-full border border-white/[0.07] text-[10px]">
                <button
                  type="button"
                  onClick={() => setChartTimeframe('week')}
                  className={`px-2.5 py-1 rounded-full font-bold transition-all ${
                    chartTimeframe === 'week' ? 'bg-[#0B0B0B] text-[#A8FF00] border border-[#A8FF00]/40 shadow-sm' : 'text-[#858585]'
                  }`}
                >
                  Week
                </button>
                <button
                  type="button"
                  onClick={() => setChartTimeframe('month')}
                  className={`px-2.5 py-1 rounded-full font-bold transition-all ${
                    chartTimeframe === 'month' ? 'bg-[#0B0B0B] text-[#A8FF00] border border-[#A8FF00]/40 shadow-sm' : 'text-[#858585]'
                  }`}
                >
                  Month
                </button>
              </div>
            </div>

            {/* Metric Display */}
            <div>
              <div className="text-2xl font-black text-[#F5F5F5] tracking-tight">
                82.40 SOL <span className="text-xs font-normal text-[#858585]">/ $15,820</span>
              </div>
              <div className="flex items-center space-x-1.5 text-[11px] text-[#A8FF00] font-semibold mt-0.5">
                <span>↗ +14.2%</span>
                <span className="text-[#858585] font-normal">velocity vs last cycle</span>
              </div>
            </div>

            {/* Smooth Dual Ribbon Wave SVG Chart */}
            <div className="w-full pt-1">
              <svg viewBox="0 0 400 130" className="w-full h-28 overflow-visible">
                <defs>
                  {/* Neon Lime Gradient */}
                  <linearGradient id="limeRibbon" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A8FF00" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#A8FF00" stopOpacity="0.0" />
                  </linearGradient>
                  {/* Cyan Blue Gradient */}
                  <linearGradient id="blueRibbon" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4285FF" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#4285FF" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Subtle horizontal grid lines */}
                <line x1="0" y1="30" x2="400" y2="30" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                <line x1="0" y1="70" x2="400" y2="70" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                <line x1="0" y1="110" x2="400" y2="110" stroke="rgba(255,255,255,0.04)" />

                {/* Curve 1: Blue Ribbon Wave */}
                <path
                  d="M 0 95 C 60 115, 120 40, 200 65 C 280 90, 330 35, 400 50 L 400 110 L 0 110 Z"
                  fill="url(#blueRibbon)"
                />
                <path
                  d="M 0 95 C 60 115, 120 40, 200 65 C 280 90, 330 35, 400 50"
                  fill="none"
                  stroke="#4285FF"
                  strokeWidth="2"
                  strokeOpacity="0.7"
                />

                {/* Curve 2: Lime Green Ribbon Wave */}
                <path
                  d="M 0 80 C 70 50, 130 100, 210 45 C 280 15, 340 70, 400 30 L 400 110 L 0 110 Z"
                  fill="url(#limeRibbon)"
                />
                <path
                  d="M 0 80 C 70 50, 130 100, 210 45 C 280 15, 340 70, 400 30"
                  fill="none"
                  stroke="#A8FF00"
                  strokeWidth="2.5"
                />

                {/* Highlight Point on Lime Curve */}
                <circle cx="210" cy="45" r="4.5" fill="#A8FF00" />
                <circle cx="210" cy="45" r="8" fill="#A8FF00" fillOpacity="0.25" />
              </svg>

              {/* Day Labels */}
              <div className="flex justify-between text-[10px] text-[#858585] font-mono px-1 pt-1">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
            </div>

            {/* Bottom Metrics Pill Strip */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06] text-[11px]">
              <div className="bg-[#101010] p-2 rounded-xl border border-white/[0.05]">
                <div className="text-[#858585] text-[10px]">Escrowed Volume</div>
                <div className="font-mono font-bold text-[#F5F5F5]">48.20 SOL</div>
              </div>
              <div className="bg-[#101010] p-2 rounded-xl border border-white/[0.05]">
                <div className="text-[#858585] text-[10px]">Settled to Workers</div>
                <div className="font-mono font-bold text-[#A8FF00]">34.20 SOL</div>
              </div>
            </div>
          </div>

          {/* Card 2: 7-Day Matrix Heatmap (CoinVex Weekly Analytics) */}
          <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-[#A8FF00]" />
                <h3 className="text-[15px] font-bold text-[#F5F5F5] tracking-tight">Verification Velocity</h3>
              </div>
              <span className="text-[10px] font-mono text-[#A8FF00] bg-[#101010] px-2 py-0.5 rounded-full border border-white/[0.07]">
                Live Feed
              </span>
            </div>

            {/* 7 Columns Matrix with Rounded Capsules */}
            <div className="grid grid-cols-7 gap-1.5 pt-2">
              {[
                { day: 'Mon', caps: ['bg-[#4285FF]', 'bg-[#A8FF00]', 'bg-[#18181b]'] },
                { day: 'Tue', caps: ['bg-[#A8FF00]', 'bg-[#8B4DFF]', 'bg-[#4285FF]'] },
                { day: 'Wed', caps: ['bg-[#8B4DFF]', 'bg-[#A8FF00]', 'bg-[#A8FF00]'] },
                { day: 'Thu', caps: ['bg-[#A8FF00]', 'bg-[#4285FF]', 'bg-[#8B4DFF]'] },
                { day: 'Fri', caps: ['bg-[#34D399]', 'bg-[#A8FF00]', 'bg-[#4285FF]'] },
                { day: 'Sat', caps: ['bg-[#A8FF00]', 'bg-[#A8FF00]', 'bg-[#34D399]'] },
                { day: 'Sun', caps: ['bg-[#4285FF]', 'bg-[#A8FF00]', 'bg-[#18181b]'] },
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center space-y-1.5">
                  <div className="w-full flex flex-col space-y-1 items-center bg-[#101010] p-1 rounded-xl border border-white/[0.04]">
                    {item.caps.map((color, cIdx) => (
                      <div
                        key={cIdx}
                        className={`w-full ${color} rounded-full transition-all ${
                          cIdx === 1 ? 'h-5' : cIdx === 0 ? 'h-3.5' : 'h-4'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-[#858585] font-mono">{item.day}</span>
                </div>
              ))}
            </div>

            {/* Summary Micro-Strip */}
            <div className="flex items-center justify-between text-[11px] text-[#858585] pt-1 border-t border-white/[0.06]">
              <span>Avg Settle: <strong className="text-[#F5F5F5]">3.4 min</strong></span>
              <span>Consensus: <strong className="text-[#A8FF00]">99.4%</strong></span>
              <span>Active: <strong className="text-[#F5F5F5]">142 Nodes</strong></span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLUMN 3: Field Network Promo + Task Dispatch Form       */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 space-y-4">
          {/* Promo Card: Active Field Network */}
          <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                {/* Overlapping Avatar Circles Stack */}
                <div className="flex -space-x-2 overflow-hidden">
                  <div className="w-7 h-7 rounded-full bg-[#8B4DFF] text-white flex items-center justify-center text-[10px] font-bold border-2 border-[#0B0B0B]">
                    S1
                  </div>
                  <div className="w-7 h-7 rounded-full bg-[#4285FF] text-white flex items-center justify-center text-[10px] font-bold border-2 border-[#0B0B0B]">
                    S2
                  </div>
                  <div className="w-7 h-7 rounded-full bg-[#A8FF00] text-black flex items-center justify-center text-[10px] font-bold border-2 border-[#0B0B0B]">
                    S3
                  </div>
                  <div className="w-7 h-7 rounded-full bg-[#EC4899] text-white flex items-center justify-center text-[10px] font-bold border-2 border-[#0B0B0B]">
                    +142
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#F5F5F5] leading-tight">Field Network</div>
                  <div className="text-[10px] text-[#858585]">142 active in 200m range</div>
                </div>
              </div>

              {onNavigateToRadar && (
                <button
                  type="button"
                  onClick={onNavigateToRadar}
                  className="px-3 py-1 rounded-full bg-[#A8FF00] hover:bg-[#bef264] text-black text-[11px] font-bold transition-all shadow-sm flex items-center space-x-1"
                >
                  <Compass className="w-3 h-3" />
                  <span>Radar</span>
                </button>
              )}
            </div>
          </div>

          {/* Roomy, Clean CoinVex Task Dispatch Form Card */}
          <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-5 space-y-4 shadow-xl">
            <div>
              <h2 className="text-[16px] font-bold text-[#F5F5F5] tracking-tight">
                Create Verification Query
              </h2>
              <p className="text-[11px] text-[#858585] mt-0.5">
                Lock escrow on Solana Devnet to request verifiable physical proof
              </p>
            </div>

            <form onSubmit={handleLockBounty} className="space-y-3.5">
              {/* Free-form Question Textarea */}
              <div>
                <label className="block text-[10px] font-bold text-[#858585] uppercase tracking-wider mb-1.5">
                  Verification Prompt (Free-form)
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={2}
                  placeholder="Ask any verifiable physical question (e.g. Is the coffee counter open?)"
                  className="w-full bg-[#101010] border border-white/[0.08] focus:border-[#A8FF00] rounded-xl p-3 text-xs text-[#F5F5F5] font-medium outline-none transition-all placeholder:text-[#555555]"
                  required
                />
              </div>

              {/* Target Location Configuration */}
              <div>
                <label className="block text-[10px] font-bold text-[#858585] uppercase tracking-wider mb-1.5">
                  Target Spot (200m Geofence)
                </label>

                {/* Location Search Bar */}
                <div className="space-y-2">
                  <div className="relative flex items-center">
                    <Search className="w-3.5 h-3.5 text-[#555555] absolute left-3.5 pointer-events-none" />
                    <input
                      type="text"
                      value={locationSearchQuery}
                      onChange={(e) => setLocationSearchQuery(e.target.value)}
                      placeholder="Search any place or address..."
                      className="w-full bg-[#101010] border border-white/[0.08] focus:border-[#A8FF00] rounded-full pl-9 pr-20 py-2 text-xs text-[#F5F5F5] placeholder-[#555555] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSearchLocation()}
                      disabled={isSearchingLocation}
                      className="absolute right-1 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-[#F5F5F5] text-[10px] font-semibold rounded-full transition-all disabled:opacity-50"
                    >
                      {isSearchingLocation ? '...' : 'Search'}
                    </button>
                  </div>

                  {/* Autocomplete Dropdown */}
                  {searchResults.length > 0 && (
                    <div className="bg-[#101010] border border-white/[0.08] rounded-xl shadow-2xl max-h-40 overflow-y-auto divide-y divide-zinc-800">
                      {searchResults.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectSearchResult(item)}
                          className="w-full text-left px-3 py-2 hover:bg-zinc-800 text-xs text-zinc-200 flex items-center space-x-2"
                        >
                          <MapPin className="w-3 h-3 text-[#A8FF00] shrink-0" />
                          <span className="truncate">{item.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Place Name and Hub Jumper */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                    <div>
                      <input
                        type="text"
                        value={placeName}
                        onChange={(e) => setPlaceName(e.target.value)}
                        placeholder="e.g. Starbucks Main St"
                        className="w-full bg-[#101010] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs font-medium text-[#F5F5F5] placeholder-[#555555] outline-none focus:border-[#A8FF00]"
                        required
                      />
                    </div>
                    <div>
                      <select
                        onChange={(e) => {
                          const preset = JUDGE_PRESETS.find((p) => p.id === e.target.value);
                          if (preset) {
                            setTargetLat(preset.lat);
                            setTargetLng(preset.lng);
                            setPlaceName(preset.name);
                          }
                        }}
                        className="w-full bg-[#101010] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs font-medium text-[#858585] hover:text-[#F5F5F5] outline-none cursor-pointer focus:border-[#A8FF00]"
                      >
                        <option value="" className="bg-zinc-900 text-zinc-500">Popular Hubs...</option>
                        {JUDGE_PRESETS.map((p) => (
                          <option key={p.id} value={p.id} className="bg-zinc-900 text-white">{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bounty Amount & Expiry */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                <div>
                  <label className="block text-[10px] font-bold text-[#858585] uppercase tracking-wider mb-1">
                    Bounty (SOL)
                  </label>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="number"
                      step="0.05"
                      min="0.05"
                      max="10.0"
                      value={amountSol}
                      onChange={(e) => setAmountSol(parseFloat(e.target.value) || 0.1)}
                      className="w-full bg-[#101010] border border-white/[0.08] rounded-full px-3 py-1.5 text-xs text-[#A8FF00] font-mono font-bold outline-none focus:border-[#A8FF00]"
                    />
                    <div className="flex space-x-1 shrink-0">
                      {[0.1, 0.25, 0.5].map((val) => (
                        <button
                          type="button"
                          key={val}
                          onClick={() => setAmountSol(val)}
                          className={`px-2 py-1 rounded-full text-[10px] font-bold transition-colors ${
                            amountSol === val
                              ? 'bg-[#A8FF00] text-black font-extrabold shadow-sm'
                              : 'bg-[#101010] text-[#858585] hover:text-white border border-white/[0.06]'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#858585] uppercase tracking-wider mb-1">
                    Time Window
                  </label>
                  <select
                    value={expiryMinutes}
                    onChange={(e) => setExpiryMinutes(parseInt(e.target.value))}
                    className="w-full bg-[#101010] border border-white/[0.08] rounded-full px-3 py-1.5 text-xs text-[#F5F5F5] font-medium outline-none cursor-pointer focus:border-[#A8FF00]"
                  >
                    <option value={15} className="bg-zinc-900 text-white">15 Min (High Priority)</option>
                    <option value={30} className="bg-zinc-900 text-white">30 Min (Recommended)</option>
                    <option value={60} className="bg-zinc-900 text-white">1 Hour</option>
                  </select>
                </div>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>
              )}

              {/* Signature CoinVex Wide Neon Pill Button */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-5 rounded-full bg-gradient-to-r from-[#A8FF00] to-[#34D399] hover:brightness-105 text-black font-extrabold text-xs tracking-wide shadow-xl shadow-[#A8FF00]/25 flex items-center justify-center space-x-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  <span className="text-base">⇄</span>
                  <span>
                    {isSubmitting ? 'Locking in Escrow...' : `Lock in Escrow: ${amountSol} SOL & Publish Task`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};
