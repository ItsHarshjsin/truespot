import React, { useState, useRef, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Coordinates, BountyType } from '../types';
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
  Compass,
  Sliders,
  ChevronDown,
  ChevronUp,
  Upload,
  Eye,
  Bot,
  Users,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';

interface AskScreenProps {
  userCoords: Coordinates;
  makerWallet?: string;
  onBountyCreated: (bountyId: string) => void;
  onAdjustBalance?: (delta: number, targetRole?: any, counterRole?: any) => void;
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
  const refFileInputRef = useRef<HTMLInputElement>(null);

  const [question, setQuestion] = useState('Is the main entrance open and are there people waiting right now?');
  const [placeName, setPlaceName] = useState('Nearby Venue / Spot');
  const [amountSol, setAmountSol] = useState(0.20);
  const [expiryMinutes, setExpiryMinutes] = useState(30);

  // Advanced Options State (TrueSpot V2 Requirements)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [bountyType, setBountyType] = useState<BountyType>('BOOLEAN');
  const [maxSpotters, setMaxSpotters] = useState<number>(1);
  const [richInstructions, setRichInstructions] = useState<string>(
    '### Verification Instructions\n- Approach within 200m geofence.\n- Ensure current conditions match target prompt.\n- Avoid recording faces or license plates.'
  );
  const [referenceMediaUrl, setReferenceMediaUrl] = useState<string>('');
  const [isUploadingRef, setIsUploadingRef] = useState(false);

  // Flow chart timeframe
  const [chartTimeframe, setChartTimeframe] = useState<'week' | 'month'>('week');

  // Location search & coordinates
  const [targetLat, setTargetLat] = useState(userCoords.lat);
  const [targetLng, setTargetLng] = useState(userCoords.lng);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [searchResults, setSearchResults] = useState<{ name: string; lat: number; lng: number }[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [liveQueries, setLiveQueries] = useState<any[]>([]);
  useEffect(() => {
    hybridStore.getQueries().then(setLiveQueries);
    const unsub = hybridStore.subscribeToChanges(() => {
      hybridStore.getQueries().then(setLiveQueries);
    });
    return () => unsub();
  }, []);

  const totalEscrowedSol = liveQueries.reduce((sum, q) => sum + (q.amount_sol || 0), 0);
  const totalSettledSol = liveQueries.filter((q) => q.status === 'RESOLVED' || q.status === 'PAID').reduce((sum, q) => sum + (q.amount_sol || 0), 0);
  const activeNodesCount = liveQueries.filter((q) => q.status === 'OPEN' || q.status === 'IN_REVIEW').length;

  const QUICK_PROMPTS = [
    { text: '☕ Is the walk-in coffee counter open with a short wait line?', type: 'BOOLEAN' as BountyType, spotters: 1 },
    { text: '⚡ Are EV charging stalls currently free and unoccupied?', type: 'AI_VISION' as BountyType, spotters: 1 },
    { text: '📦 Is this specific product currently on the store shelves?', type: 'DATA_COLLECTION' as BountyType, spotters: 3 },
    { text: '🚗 Is parking space available at this lot right now?', type: 'BOOLEAN' as BountyType, spotters: 2 },
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

  const handleRefImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingRef(true);
    try {
      const result = await hybridStore.uploadMediaFile(file, 'ref_asset');
      setReferenceMediaUrl(result.publicUrl);
      if (onShowToast) {
        onShowToast('Reference Media Loaded', `Uploaded ${file.name} for field spotter comparison`, 'info');
      }
    } catch (err) {
      console.warn('Reference upload error:', err);
    } finally {
      setIsUploadingRef(false);
    }
  };

  const handleLockBounty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      setErrorMsg('Please enter a verification prompt for field workers.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Lock funds into Solana Devnet Escrow Vault
      const txSig = await lockBountyOnChain(sendTransaction, publicKey, amountSol);

      if (onAdjustBalance) {
        onAdjustBalance(-amountSol, 'maker', 'escrow');
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

      // 2. Persist Bounty Record to Supabase / LocalStore with TrueSpot V2 Fields
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
        bounty_type: bountyType,
        max_spotters: maxSpotters,
        rich_instructions: richInstructions.trim() || undefined,
        reference_media_url: referenceMediaUrl || undefined,
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
          <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-6 space-y-4 shadow-none">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-bold text-[#F5F5F5] tracking-tight">Your Escrow Vault</h2>
              <div className="flex items-center space-x-1.5 bg-[#101010] border border-white/[0.07] rounded-full px-2.5 py-1 text-[11px] font-semibold text-[#A8FF00]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A8FF00] animate-pulse" />
                <span>Devnet Live</span>
              </div>
            </div>

            {/* Quick Action Circles Row */}
            <div className="grid grid-cols-3 gap-2.5 pt-1 text-center">
              <div className="flex flex-col items-center space-y-1.5 group cursor-pointer">
                <div className="w-11 h-11 rounded-full bg-[#161616] border border-white/10 text-[#A8FF00] flex items-center justify-center font-extrabold group-hover:border-[#A8FF00]/40 transition-colors">
                  <Coins className="w-4 h-4 text-[#A8FF00]" />
                </div>
                <span className="text-[11px] font-semibold text-[#858585] group-hover:text-white transition-colors">Deposit</span>
              </div>

              <div className="flex flex-col items-center space-y-1.5 group cursor-pointer">
                <div className="w-11 h-11 rounded-full bg-[#161616] border border-white/10 text-white flex items-center justify-center font-extrabold group-hover:border-[#A8FF00]/40 transition-colors">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <span className="text-[11px] font-semibold text-[#858585] group-hover:text-white transition-colors">200m Range</span>
              </div>

              <div className="flex flex-col items-center space-y-1.5 group cursor-pointer">
                <div className="w-11 h-11 rounded-full bg-[#161616] border border-white/10 text-[#A8FF00] flex items-center justify-center font-extrabold group-hover:border-[#A8FF00]/40 transition-colors">
                  <ShieldCheck className="w-4 h-4 text-[#A8FF00]" />
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
                <div className="bg-[#A8FF00] h-full w-3/4 rounded-full" />
                <div className="bg-zinc-800 h-full w-1/4" />
              </div>
            </div>

            {/* Stacked Featured Cards - Minimal Flat Dark Surfaces */}
            <div className="space-y-2.5 pt-1">
              {/* 1. Minimal Flat Dark Card (Worker Payout) */}
              <div className="bg-[#101010] border-l-2 border-[#A8FF00] border-y border-r border-white/[0.08] rounded-2xl p-4 relative overflow-hidden">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-5 h-5 rounded-full bg-[#181818] border border-white/10 flex items-center justify-center font-bold text-[10px] text-[#A8FF00]">
                      ⚡
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">Worker Payout</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-[#181818] border border-[#A8FF00]/30 px-2 py-0.5 rounded-full text-[#A8FF00]">
                    {maxSpotters > 1 ? `Swarm (${maxSpotters})` : '100%'}
                  </span>
                </div>
                <div className="text-2xl font-black tracking-tight my-0.5 text-white font-mono">
                  {amountSol.toFixed(2)} SOL
                </div>
                <div className="flex items-center justify-between text-[10px] font-semibold pt-1">
                  <span className="bg-[#181818] text-[#A8FF00] border border-[#A8FF00]/30 px-2 py-0.5 rounded-full font-mono font-bold">
                    ↗ {maxSpotters > 1 ? `${(amountSol / maxSpotters).toFixed(3)} SOL each` : 'Instant Release'}
                  </span>
                  <span className="text-zinc-400">Upon Consensus</span>
                </div>
              </div>

              {/* 2. Minimal Flat Dark Card (Hardware & Biometrics) */}
              <div className="bg-[#101010] border-l-2 border-[#8B4DFF] border-y border-r border-white/[0.08] rounded-2xl p-4 relative overflow-hidden">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-5 h-5 rounded-full bg-[#181818] border border-white/10 flex items-center justify-center font-bold text-[10px] text-purple-400">
                      🛡️
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">Type: {bountyType}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-[#181818] border border-purple-500/30 px-2 py-0.5 rounded-full text-purple-300">
                    SHA-256
                  </span>
                </div>
                <div className="text-xl font-black tracking-tight my-0.5 text-white">
                  {bountyType === 'AI_VISION' ? 'AI Pre-Check' : bountyType === 'DATA_COLLECTION' ? 'Heavy Media' : 'Boolean Oracle'}
                </div>
                <div className="text-[10px] text-zinc-400 truncate">
                  Physical tremor + Solana devnet blockhash
                </div>
              </div>
            </div>
          </div>

          {/* Quick Idea Prompts Card */}
          <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-6 space-y-3 shadow-none">
            <div className="flex items-center space-x-2 text-[11px] font-bold text-[#858585] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#A8FF00]" />
              <span>1-Click Verification Ideas</span>
            </div>
            <div className="space-y-1.5">
              {QUICK_PROMPTS.map((p, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => {
                    setQuestion(p.text);
                    setBountyType(p.type);
                    setMaxSpotters(p.spotters);
                  }}
                  className="w-full text-left p-2.5 bg-[#101010] hover:bg-[#161616] border border-white/[0.06] hover:border-white/15 text-[11px] text-[#858585] hover:text-[#F5F5F5] rounded-xl transition-all leading-snug font-medium flex items-center justify-between group cursor-pointer"
                >
                  <span className="truncate pr-2">{p.text}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black text-[#A8FF00] border border-[#A8FF00]/30 shrink-0">
                    {p.type.slice(0, 4)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLUMN 2: Activity Flow (Wave Chart) + Analytics Matrix   */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Flowing Dual Wave Ribbon Chart */}
          <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-6 space-y-3 shadow-none">
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
                {totalEscrowedSol.toFixed(2)} SOL <span className="text-xs font-normal text-[#858585]">/ ${(totalEscrowedSol * 192).toFixed(0)}</span>
              </div>
              <div className="flex items-center space-x-1.5 text-[11px] text-[#A8FF00] font-semibold mt-0.5">
                <span>↗ Live Metrics</span>
                <span className="text-[#858585] font-normal">Escrow PDA verified on Devnet</span>
              </div>
            </div>

            {/* Smooth Dual Ribbon Wave SVG Chart */}
            <div className="w-full pt-1">
              <svg viewBox="0 0 400 130" className="w-full h-28 overflow-visible">
                <defs>
                  <linearGradient id="limeRibbon" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A8FF00" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#A8FF00" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="blueRibbon" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4285FF" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#4285FF" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <line x1="0" y1="30" x2="400" y2="30" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                <line x1="0" y1="70" x2="400" y2="70" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                <line x1="0" y1="110" x2="400" y2="110" stroke="rgba(255,255,255,0.04)" />

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

                <circle cx="210" cy="45" r="4.5" fill="#A8FF00" />
                <circle cx="210" cy="45" r="8" fill="#A8FF00" fillOpacity="0.25" />
              </svg>

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
                <div className="font-mono font-bold text-[#F5F5F5]">{totalEscrowedSol.toFixed(2)} SOL</div>
              </div>
              <div className="bg-[#101010] p-2 rounded-xl border border-white/[0.05]">
                <div className="text-[#858585] text-[10px]">Settled to Workers</div>
                <div className="font-mono font-bold text-[#A8FF00]">{totalSettledSol.toFixed(2)} SOL</div>
              </div>
            </div>
          </div>

          {/* Card 2: 7-Day Matrix Heatmap */}
          <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-6 space-y-3 shadow-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-[#A8FF00]" />
                <h3 className="text-[15px] font-bold text-[#F5F5F5] tracking-tight">Verification Velocity</h3>
              </div>
              <span className="text-[10px] font-mono text-[#A8FF00] bg-[#101010] px-2 py-0.5 rounded-full border border-white/[0.07]">
                Live Feed
              </span>
            </div>

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

            <div className="flex items-center justify-between text-[11px] text-[#858585] pt-1 border-t border-white/[0.06]">
              <span>Avg Settle: <strong className="text-[#F5F5F5]">~2.0 min</strong></span>
              <span>Consensus: <strong className="text-[#A8FF00]">100%</strong></span>
              <span>Active: <strong className="text-[#F5F5F5]">{activeNodesCount} Nodes</strong></span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLUMN 3: Field Network Promo + Task Dispatch Form       */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 space-y-4">
          {/* Promo Card: Active Field Network */}
          <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-5 shadow-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
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
                  className="px-3 py-1 rounded-full bg-[#A8FF00] hover:bg-[#bef264] text-black text-[11px] font-bold transition-all shadow-sm flex items-center space-x-1 cursor-pointer"
                >
                  <Compass className="w-3 h-3" />
                  <span>Radar</span>
                </button>
              )}
            </div>
          </div>

          {/* Roomy, Clean Task Dispatch Form Card */}
          <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-6 space-y-4 shadow-none">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-bold text-[#F5F5F5] tracking-tight">
                  Create Verification Query
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#A8FF00]/10 text-[#A8FF00] border border-[#A8FF00]/30">
                  {bountyType}
                </span>
              </div>
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
                      className="absolute right-1 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-[#F5F5F5] text-[10px] font-semibold rounded-full transition-all disabled:opacity-50 cursor-pointer"
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
                          className={`px-2 py-1 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
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

              {/* ========================================================= */}
              {/* ADVANCED BOUNTY CUSTOMIZATION TOGGLE (TrueSpot V2)       */}
              {/* ========================================================= */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full py-2 px-3 rounded-xl bg-[#101010] hover:bg-[#141414] border border-white/[0.08] text-xs font-semibold text-[#858585] hover:text-[#F5F5F5] flex items-center justify-between transition-all cursor-pointer"
                >
                  <span className="flex items-center space-x-2">
                    <Sliders className="w-3.5 h-3.5 text-[#A8FF00]" />
                    <span>Advanced Oracle Parameters</span>
                    {(maxSpotters > 1 || bountyType !== 'BOOLEAN' || referenceMediaUrl) && (
                      <span className="w-2 h-2 rounded-full bg-[#A8FF00]" />
                    )}
                  </span>
                  {showAdvanced ? (
                    <ChevronUp className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  )}
                </button>

                {showAdvanced && (
                  <div className="mt-2.5 p-4 rounded-xl bg-[#0e0e0e] border border-white/[0.08] space-y-3.5 animate-fadeIn">
                    {/* 1. Bounty Types Dropdown */}
                    <div>
                      <label className="block text-[10px] font-bold text-[#858585] uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Bounty Verification Type</span>
                        <span className="text-[#A8FF00] font-mono text-[9px] lowercase">DePIN protocol mode</span>
                      </label>
                      <select
                        value={bountyType}
                        onChange={(e) => setBountyType(e.target.value as BountyType)}
                        className="w-full bg-[#141414] border border-white/[0.08] focus:border-[#A8FF00] rounded-xl px-3 py-2 text-xs font-semibold text-[#F5F5F5] outline-none cursor-pointer"
                      >
                        <option value="BOOLEAN" className="bg-zinc-900 text-white">
                          Boolean Truth (Yes / No physical state)
                        </option>
                        <option value="DATA_COLLECTION" className="bg-zinc-900 text-white">
                          Data Collection (Heavy media & photo required)
                        </option>
                        <option value="AI_VISION" className="bg-zinc-900 text-white">
                          AI Vision Pre-Check (Automated Computer Vision object test)
                        </option>
                      </select>
                      <p className="text-[10px] text-[#666666] mt-1">
                        {bountyType === 'BOOLEAN' && 'Field worker answers with verified binary truth and camera proof.'}
                        {bountyType === 'DATA_COLLECTION' && 'Requires full photo/video evidence stored to truespot_evidence bucket.'}
                        {bountyType === 'AI_VISION' && 'Scans captured image with AI vision API and assigns structured confidence score.'}
                      </p>
                    </div>

                    {/* 2. Swarm Consensus (max_spotters) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-[#858585] uppercase tracking-wider flex items-center space-x-1.5">
                          <Users className="w-3 h-3 text-[#A8FF00]" />
                          <span>Swarm Consensus (Max Spotters)</span>
                        </label>
                        <span className="text-[10px] font-mono font-bold text-[#A8FF00]">
                          {maxSpotters} {maxSpotters === 1 ? 'Worker' : 'Independent Workers'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={maxSpotters}
                          onChange={(e) => setMaxSpotters(parseInt(e.target.value) || 1)}
                          className="w-full accent-[#A8FF00] bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                        />
                        <span className="w-8 text-center text-xs font-mono font-bold text-white bg-[#141414] py-1 rounded border border-white/[0.07]">
                          {maxSpotters}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#666666] mt-1">
                        {maxSpotters === 1
                          ? 'Single worker claim: 100% payout to first valid submitter.'
                          : `Multi-agent quorum: requires ${maxSpotters} independent spotters to submit proof before escrow payout is released proportionally.`}
                      </p>
                    </div>

                    {/* 3. Rich Markdown Instructions */}
                    <div>
                      <label className="block text-[10px] font-bold text-[#858585] uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                        <FileText className="w-3 h-3 text-[#A8FF00]" />
                        <span>Rich Field Instructions (Markdown)</span>
                      </label>
                      <textarea
                        value={richInstructions}
                        onChange={(e) => setRichInstructions(e.target.value)}
                        rows={3}
                        placeholder="Detailed Markdown steps for the field worker..."
                        className="w-full bg-[#141414] border border-white/[0.08] focus:border-[#A8FF00] rounded-xl p-2.5 text-xs font-mono text-[#F5F5F5] outline-none placeholder:text-[#555555]"
                      />
                    </div>

                    {/* 4. Reference Image Upload */}
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        ref={refFileInputRef}
                        onChange={handleRefImageUpload}
                        className="hidden"
                      />
                      <label className="block text-[10px] font-bold text-[#858585] uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                        <ImageIcon className="w-3 h-3 text-[#A8FF00]" />
                        <span>Reference Image / Benchmark Object</span>
                      </label>

                      {referenceMediaUrl ? (
                        <div className="relative rounded-xl overflow-hidden border border-[#A8FF00]/40 aspect-video max-h-36 bg-black flex items-center justify-center">
                          <img
                            src={referenceMediaUrl}
                            alt="Reference Target"
                            className="w-full h-full object-contain"
                          />
                          <button
                            type="button"
                            onClick={() => setReferenceMediaUrl('')}
                            className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/80 text-rose-300 text-[10px] font-bold border border-rose-500/30 hover:bg-black cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => refFileInputRef.current?.click()}
                            disabled={isUploadingRef}
                            className="flex-1 py-2 px-3 rounded-xl bg-[#141414] hover:bg-[#1a1a1a] border border-dashed border-white/[0.1] hover:border-white/20 text-xs font-medium text-zinc-300 flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5 text-[#A8FF00]" />
                            <span>{isUploadingRef ? 'Uploading...' : 'Upload Reference Image'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {errorMsg && (
                <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>
              )}

              {/* Signature Wide Solid Neon Lime Button */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-5 rounded-full bg-[#A8FF00] hover:bg-[#b8ff24] text-black font-extrabold text-xs tracking-wide shadow-none flex items-center justify-center space-x-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
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
