import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Coordinates } from '../types';
import { JUDGE_PRESETS } from '../utils/mockLocations';
import { lockBountyOnChain } from '../utils/solana';
import { hybridStore } from '../utils/storage';
import { searchLocationOSM } from '../utils/evidence';
import { Navigation, ShieldCheck, MapPin, Search, Sparkles, ArrowRight } from 'lucide-react';

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
    <div className="space-y-6 pb-6 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (5 cols on desktop): Escrow Vault Details & 100% Payout Model */}
        <div className="lg:col-span-5 space-y-5">
          {/* Hero Escrow Bounty Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-950/5 text-center">
            <span className="text-xs font-bold text-[#6B7F72] uppercase tracking-wider block mb-2">
              Escrow Bounty Deposit
            </span>
            <div className="flex items-baseline justify-center space-x-2">
              <span className="text-6xl font-extrabold text-[#11291B] tracking-tight">
                {amountSol}
              </span>
              <span className="text-2xl font-bold text-[#6B7F72]">SOL</span>
            </div>

            <div className="mt-3 flex items-center justify-center">
              <span className="bg-emerald-100 text-[#1E5E38] text-xs px-3 py-1 rounded-full font-semibold">
                Locked in Solana Devnet Vault
              </span>
            </div>

            {/* 100% Payout Breakdown for Hackathon Simplicity */}
            <div className="mt-5 pt-4 border-t border-gray-100 text-left space-y-2.5 text-xs text-[#6B7F72]">
              <div className="flex items-center justify-between">
                <span>Worker Payout:</span>
                <span className="font-mono font-bold text-[#0F3822]">
                  100% ({amountSol.toFixed(2)} SOL upon approval)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Geofence Radius:</span>
                <span className="font-semibold text-[#11291B]">Strict 200m Physical Radius</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Hardware Proof:</span>
                <span className="font-semibold text-[#1E5E38]">Biometric Gyro + SHA-256</span>
              </div>
            </div>
          </div>

          {/* Quick Idea Prompts */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-950/5 space-y-2.5">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-[#11291B]">
              <Sparkles className="w-4 h-4 text-[#7CB342]" />
              <span>1-Click Prompt Ideas</span>
            </div>
            <div className="space-y-1.5">
              {QUICK_PROMPTS.map((p, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setQuestion(p)}
                  className="w-full text-left p-2.5 rounded-2xl bg-[#F4F9F5] hover:bg-emerald-50 text-xs text-[#11291B] transition-colors leading-snug border border-emerald-950/5 font-medium"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (7 cols on desktop): Free-Form Task Creation Form */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 shadow-sm border border-emerald-950/5">
          <h2 className="text-lg font-bold text-[#11291B] tracking-tight mb-4">
            Create Physical Oracle Query
          </h2>

          <form onSubmit={handleLockBounty} className="space-y-5">
            {/* Free-form Question Textarea */}
            <div>
              <label className="block text-xs font-bold text-[#6B7F72] uppercase tracking-wider mb-2">
                What ground truth do you want verified? (Free-form)
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
                placeholder="Ask any verifiable physical question (e.g. Is the coffee counter open? Are parking spots free? How long is the line?)"
                className="w-full bg-[#F4F9F5] border border-gray-200 focus:border-[#0F3822] focus:bg-white rounded-2xl p-4 text-xs sm:text-sm text-[#11291B] font-medium outline-none transition-all placeholder:text-gray-400"
                required
              />
            </div>

            {/* Target Location Configuration */}
            <div>
              <label className="block text-xs font-bold text-[#6B7F72] uppercase tracking-wider mb-2">
                Target Spot & Coordinates (200m Geofence)
              </label>

              {/* Location Search Bar */}
              <div className="space-y-2">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-emerald-800/60 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={locationSearchQuery}
                    onChange={(e) => setLocationSearchQuery(e.target.value)}
                    placeholder="Search any place or address (e.g. Kathmandu, Tokyo, Coffee Bar)..."
                    className="w-full bg-[#F4F9F5] border border-gray-200 focus:border-[#0F3822] rounded-2xl pl-9 pr-24 py-2.5 text-xs text-[#11291B] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleSearchLocation()}
                    disabled={isSearchingLocation}
                    className="absolute right-1.5 px-3 py-1 bg-[#0F3822] hover:bg-[#154A2E] text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
                  >
                    {isSearchingLocation ? '...' : 'Search'}
                  </button>
                </div>

                {/* Autocomplete Dropdown */}
                {searchResults.length > 0 && (
                  <div className="bg-white border border-emerald-950/10 rounded-2xl shadow-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
                    {searchResults.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSearchResult(item)}
                        className="w-full text-left px-3.5 py-2 hover:bg-[#F4F9F5] text-xs text-[#11291B] flex items-center space-x-2"
                      >
                        <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Place Name and GPS Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B7F72]">Place Name / Title</label>
                    <input
                      type="text"
                      value={placeName}
                      onChange={(e) => setPlaceName(e.target.value)}
                      placeholder="e.g. Starbucks Main Street"
                      className="w-full bg-[#F4F9F5] border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-[#11291B] outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B7F72]">Preset Quick Jumper</label>
                    <select
                      onChange={(e) => {
                        const preset = JUDGE_PRESETS.find((p) => p.id === e.target.value);
                        if (preset) {
                          setTargetLat(preset.lat);
                          setTargetLng(preset.lng);
                          setPlaceName(preset.name);
                        }
                      }}
                      className="w-full bg-[#F4F9F5] border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-[#11291B] outline-none"
                    >
                      <option value="">Select Popular Hub...</option>
                      {JUDGE_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-[#6B7F72] px-1">
                  Selected GPS Pin: <strong>{targetLat.toFixed(5)}, {targetLng.toFixed(5)}</strong>
                </div>
              </div>
            </div>

            {/* Bounty Amount & Expiry */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#6B7F72] uppercase tracking-wider mb-1.5">
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
                    className="w-full bg-[#F4F9F5] border border-gray-200 rounded-2xl px-4 py-2.5 text-xs text-[#11291B] font-mono font-bold outline-none"
                  />
                  <div className="flex space-x-1 shrink-0">
                    {[0.1, 0.25, 0.5].map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setAmountSol(val)}
                        className={`px-2 py-1 rounded-xl text-[11px] font-bold border transition-colors ${
                          amountSol === val
                            ? 'bg-[#0F3822] text-white border-[#0F3822]'
                            : 'bg-white text-[#6B7F72] border-gray-200 hover:text-[#11291B]'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B7F72] uppercase tracking-wider mb-1.5">
                  Time-to-Live Window
                </label>
                <select
                  value={expiryMinutes}
                  onChange={(e) => setExpiryMinutes(parseInt(e.target.value))}
                  className="w-full bg-[#F4F9F5] border border-gray-200 rounded-2xl px-4 py-2.5 text-xs text-[#11291B] font-medium outline-none"
                >
                  <option value={15}>15 Minutes (High Priority)</option>
                  <option value={30}>30 Minutes (Recommended)</option>
                  <option value={60}>1 Hour</option>
                  <option value={120}>2 Hours</option>
                </select>
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-600 font-medium px-1">{errorMsg}</p>
            )}

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-full bg-[#0F3822] hover:bg-[#154A2E] text-white font-semibold text-sm shadow-sm flex items-center justify-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <ShieldCheck className="w-5 h-5 text-[#99E35E]" />
              <span>
                {isSubmitting ? 'Depositing to Solana Escrow...' : `Deposit ${amountSol} SOL & Create Task`}
              </span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
