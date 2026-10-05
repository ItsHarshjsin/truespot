import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Coordinates } from '../types';
import { JUDGE_PRESETS } from '../utils/mockLocations';
import { lockBountyOnChain } from '../utils/solana';
import { hybridStore } from '../utils/storage';
import { searchLocationOSM } from '../utils/evidence';
import { Navigation, ShieldCheck, MapPin, Search, Sparkles, ArrowRight, Coins } from 'lucide-react';

interface AskScreenProps {
  userCoords: Coordinates;
  makerWallet?: string;
  onBountyCreated: (bountyId: string) => void;
  onAdjustBalance?: (delta: number, role?: 'asker' | 'spotter' | 'verifier') => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'reward' | 'warning') => void;
}

export const AskScreen: React.FC<AskScreenProps> = ({
  userCoords,
  makerWallet,
  onBountyCreated,
  onAdjustBalance,
  onShowToast,
}) => {
  const { publicKey, sendTransaction } = useWallet();

  const [question, setQuestion] = useState('Is the main entrance open and are there people waiting right now?');
  const [placeName, setPlaceName] = useState('Nearby Venue / Spot');
  const [amountSol, setAmountSol] = useState(0.20);
  const [expiryMinutes, setExpiryMinutes] = useState(30);

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
      setErrorMsg('Please enter a verification prompt for the physical oracle.');
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
          'Escrow Funded on Solana Devnet',
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
    <div className="space-y-6 pb-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (5 cols on desktop): CoinVex "Your Portfolio" Style Escrow Card */}
        <div className="lg:col-span-5 space-y-5">
          {/* Main Portfolio Panel */}
          <div className="bg-[#121212] border border-zinc-800/90 rounded-[28px] p-6 space-y-5 shadow-2xl shadow-black/50">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white tracking-tight">Your Escrow Vault</h2>
              <div className="flex items-center space-x-1.5 bg-[#18181b] border border-zinc-800 rounded-full px-3 py-1 text-xs font-semibold text-lime-400">
                <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
                <span>Devnet Live</span>
              </div>
            </div>

            {/* Quick Action Circles Row (CoinVex Signature: Receive, Send, Trade pucks) */}
            <div className="grid grid-cols-3 gap-3 pt-1 text-center">
              <div className="flex flex-col items-center space-y-1.5">
                <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center font-extrabold shadow-md hover:scale-105 transition-transform">
                  <Coins className="w-5 h-5 text-black" />
                </div>
                <span className="text-[11px] font-semibold text-zinc-300">Deposit</span>
              </div>

              <div className="flex flex-col items-center space-y-1.5">
                <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center font-extrabold shadow-md hover:scale-105 transition-transform">
                  <MapPin className="w-5 h-5 text-black" />
                </div>
                <span className="text-[11px] font-semibold text-zinc-300">200m Range</span>
              </div>

              <div className="flex flex-col items-center space-y-1.5">
                <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center font-extrabold shadow-md hover:scale-105 transition-transform">
                  <ShieldCheck className="w-5 h-5 text-black" />
                </div>
                <span className="text-[11px] font-semibold text-zinc-300">Biometric</span>
              </div>
            </div>

            {/* Balance Indicator & Progress Bar */}
            <div className="space-y-2 pt-2 border-t border-zinc-800/80">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-medium">Bounty Lock:</span>
                <span className="font-mono text-zinc-300">Target: <strong className="text-white font-bold">{amountSol.toFixed(2)} SOL</strong></span>
              </div>
              <div className="w-full bg-zinc-800/80 h-2.5 rounded-full overflow-hidden flex">
                <div className="bg-lime-400 h-full w-3/4 rounded-full shadow-[0_0_12px_rgba(163,230,53,0.8)]" />
                <div className="bg-zinc-700/50 h-full w-1/4" />
              </div>
            </div>

            {/* Stacked Featured Cards (EXACT CoinVex Crypto & Stocks style) */}
            <div className="space-y-3 pt-1">
              {/* 1. Neon Green Gradient Card (Worker Payout) */}
              <div className="bg-gradient-to-r from-lime-400 to-emerald-400 text-black rounded-2xl p-5 shadow-lg shadow-lime-400/15 relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center font-bold text-xs">
                      ⚡
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider">Worker Payout</span>
                  </div>
                  <span className="text-[11px] font-mono font-extrabold bg-black/15 px-2 py-0.5 rounded-full">
                    100%
                  </span>
                </div>
                <div className="text-3xl font-black tracking-tight my-1">
                  {amountSol.toFixed(2)} SOL
                </div>
                <div className="flex items-center justify-between text-[11px] font-semibold pt-1">
                  <span className="bg-black text-lime-400 px-2.5 py-0.5 rounded-full font-mono font-bold">
                    ↗ Instant Release
                  </span>
                  <span className="text-black/75">Upon Approval</span>
                </div>
              </div>

              {/* 2. Vibrant Purple Gradient Card (Hardware & Biometrics) */}
              <div className="bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-2xl p-5 shadow-lg shadow-purple-500/20 relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                      🛡️
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-100">DePIN Proof</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold bg-white/20 px-2 py-0.5 rounded-full">
                    SHA-256
                  </span>
                </div>
                <div className="text-2xl font-black tracking-tight my-1">
                  Biometric Gyro
                </div>
                <div className="text-[11px] text-purple-200">
                  Physical tremor + Solana devnet blockhash nonce
                </div>
              </div>
            </div>
          </div>

          {/* Quick Idea Prompts Card */}
          <div className="bg-[#121212] border border-zinc-800/90 rounded-[28px] p-6 space-y-3 shadow-xl shadow-black/40">
            <div className="flex items-center space-x-2 text-xs font-bold text-white uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-lime-400" />
              <span>1-Click Prompt Ideas</span>
            </div>
            <div className="space-y-2">
              {QUICK_PROMPTS.map((p, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setQuestion(p)}
                  className="w-full text-left p-3.5 bg-[#18181b] hover:bg-zinc-800 border border-zinc-800/80 hover:border-zinc-700 text-xs text-zinc-300 hover:text-white rounded-2xl transition-all leading-snug font-medium"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (7 cols on desktop): Roomy, Clean CoinVex Form Card */}
        <div className="lg:col-span-7 bg-[#121212] border border-zinc-800/90 rounded-[28px] p-7 sm:p-8 space-y-6 shadow-2xl shadow-black/50">
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Create Physical Oracle Query
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Dispatch a verifiable ground truth request backed by Solana Devnet escrow
            </p>
          </div>

          <form onSubmit={handleLockBounty} className="space-y-5">
            {/* Free-form Question Textarea */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                What ground truth do you want verified? (Free-form)
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
                placeholder="Ask any verifiable physical question (e.g. Is the coffee counter open? Are parking spots free? How long is the line?)"
                className="w-full bg-[#18181b] border border-zinc-800 focus:border-lime-400 rounded-2xl p-4 text-xs sm:text-sm text-white font-medium outline-none transition-all placeholder:text-zinc-500"
                required
              />
            </div>

            {/* Target Location Configuration */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Target Spot & Coordinates (200m Geofence)
              </label>

              {/* Location Search Bar */}
              <div className="space-y-2.5">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-4 pointer-events-none" />
                  <input
                    type="text"
                    value={locationSearchQuery}
                    onChange={(e) => setLocationSearchQuery(e.target.value)}
                    placeholder="Search any place or address (e.g. Kathmandu, Tokyo, Coffee Bar)..."
                    className="w-full bg-[#18181b] border border-zinc-800 focus:border-lime-400 rounded-full pl-11 pr-24 py-3 text-xs text-white placeholder-zinc-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleSearchLocation()}
                    disabled={isSearchingLocation}
                    className="absolute right-2 px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-full transition-all disabled:opacity-50"
                  >
                    {isSearchingLocation ? '...' : 'Search'}
                  </button>
                </div>

                {/* Autocomplete Dropdown */}
                {searchResults.length > 0 && (
                  <div className="bg-[#18181b] border border-zinc-800 rounded-2xl shadow-2xl max-h-48 overflow-y-auto divide-y divide-zinc-800">
                    {searchResults.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSearchResult(item)}
                        className="w-full text-left px-4 py-2.5 hover:bg-zinc-800 text-xs text-zinc-200 flex items-center space-x-2"
                      >
                        <MapPin className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Place Name and GPS Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400">Place Name / Title</label>
                    <input
                      type="text"
                      value={placeName}
                      onChange={(e) => setPlaceName(e.target.value)}
                      placeholder="e.g. Starbucks Main Street"
                      className="w-full bg-[#18181b] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-medium text-white placeholder-zinc-500 outline-none focus:border-lime-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400">Preset Quick Jumper</label>
                    <select
                      onChange={(e) => {
                        const preset = JUDGE_PRESETS.find((p) => p.id === e.target.value);
                        if (preset) {
                          setTargetLat(preset.lat);
                          setTargetLng(preset.lng);
                          setPlaceName(preset.name);
                        }
                      }}
                      className="w-full bg-[#18181b] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-medium text-white outline-none cursor-pointer focus:border-lime-400"
                    >
                      <option value="" className="bg-zinc-900 text-zinc-500">Select Popular Hub...</option>
                      {JUDGE_PRESETS.map((p) => (
                        <option key={p.id} value={p.id} className="bg-zinc-900 text-white">{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-zinc-400 px-1 pt-1">
                  Target Pin: <strong className="text-lime-400 font-bold">{targetLat.toFixed(5)}, {targetLng.toFixed(5)}</strong>
                </div>
              </div>
            </div>

            {/* Bounty Amount & Expiry */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Bounty Amount (SOL)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.05"
                    min="0.05"
                    max="10.0"
                    value={amountSol}
                    onChange={(e) => setAmountSol(parseFloat(e.target.value) || 0.1)}
                    className="w-full bg-[#18181b] border border-zinc-800 rounded-full px-4 py-2.5 text-xs text-lime-400 font-mono font-bold outline-none focus:border-lime-400"
                  />
                  <div className="flex space-x-1 shrink-0">
                    {[0.1, 0.25, 0.5].map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setAmountSol(val)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
                          amountSol === val
                            ? 'bg-lime-400 text-black font-extrabold shadow-sm'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Time-to-Live Window
                </label>
                <select
                  value={expiryMinutes}
                  onChange={(e) => setExpiryMinutes(parseInt(e.target.value))}
                  className="w-full bg-[#18181b] border border-zinc-800 rounded-full px-4 py-2.5 text-xs text-white font-medium outline-none cursor-pointer focus:border-lime-400"
                >
                  <option value={15} className="bg-zinc-900 text-white">15 Minutes (High Priority)</option>
                  <option value={30} className="bg-zinc-900 text-white">30 Minutes (Recommended)</option>
                  <option value={60} className="bg-zinc-900 text-white">1 Hour</option>
                  <option value={120} className="bg-zinc-900 text-white">2 Hours</option>
                </select>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>
            )}

            {/* CoinVex Neon Transfer Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 rounded-full bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 text-black font-extrabold text-sm tracking-wide shadow-xl shadow-lime-400/25 flex items-center justify-center space-x-2 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                <span className="text-lg">⇄</span>
                <span>
                  {isSubmitting ? 'Depositing to Solana Escrow...' : `Lock in Escrow: Deposit ${amountSol} SOL & Publish Task`}
                </span>
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};
