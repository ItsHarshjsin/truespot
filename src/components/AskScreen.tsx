import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Coordinates } from '../types';
import { JUDGE_PRESETS } from '../utils/mockLocations';
import { lockBountyOnChain } from '../utils/solana';
import { hybridStore } from '../utils/storage';
import { Navigation, CheckCircle2 } from 'lucide-react';

interface AskScreenProps {
  userCoords: Coordinates;
  onBountyCreated: (bountyId: string) => void;
  onAdjustBalance?: (delta: number, role?: 'asker' | 'spotter' | 'verifier') => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'reward' | 'warning') => void;
}

export const AskScreen: React.FC<AskScreenProps> = ({
  userCoords,
  onBountyCreated,
  onAdjustBalance,
  onShowToast,
}) => {
  const { publicKey, sendTransaction } = useWallet();

  const [category, setCategory] = useState<'queue' | 'stock' | 'open' | 'ev' | 'custom'>('queue');
  const [question, setQuestion] = useState('How long is the walk-in coffee line right now?');
  const [locationType, setLocationType] = useState<'current_gps' | string>('current_gps');
  const [customPlaceName, setCustomPlaceName] = useState('Nearby Spot at My Location');
  const [amountSol, setAmountSol] = useState(0.15);
  const [expiryMinutes, setExpiryMinutes] = useState(30);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCategoryChange = (cat: 'queue' | 'stock' | 'open' | 'ev' | 'custom') => {
    setCategory(cat);
    switch (cat) {
      case 'queue':
        setQuestion('How long is the line right now?');
        break;
      case 'stock':
        setQuestion('Is the specific product in stock on shelves?');
        break;
      case 'open':
        setQuestion('Is the entrance open and actively operating?');
        break;
      case 'ev':
        setQuestion('Are there any free parking or charging stalls?');
        break;
      case 'custom':
        setQuestion('');
        break;
    }
  };

  const handleLockBounty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      setErrorMsg('Please enter a question for the physical oracle.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setTxSignature(null);

    let targetLat = userCoords.lat;
    let targetLng = userCoords.lng;
    let placeName = customPlaceName;

    if (locationType !== 'current_gps') {
      const preset = JUDGE_PRESETS.find((p) => p.id === locationType);
      if (preset) {
        targetLat = preset.lat;
        targetLng = preset.lng;
        placeName = preset.name;
      }
    }

    try {
      const txSig = await lockBountyOnChain(sendTransaction, publicKey, amountSol);
      setTxSignature(txSig);

      if (onAdjustBalance) {
        onAdjustBalance(-amountSol, 'asker');
      }

      if (onShowToast) {
        onShowToast(
          'Escrow Deposited',
          `Locked ${amountSol} SOL into Physical Oracle Escrow Vault (${txSig.slice(0, 10)}...)`,
          'success'
        );
      }

      const expiresAt = new Date(Date.now() + expiryMinutes * 60000).toISOString();
      const newBounty = await hybridStore.createBounty({
        question: question.trim(),
        place_name: placeName,
        lat: targetLat,
        lng: targetLng,
        amount_sol: amountSol,
        status: 'OPEN',
        asker_wallet: publicKey ? publicKey.toBase58().slice(0, 4) + '...' + publicKey.toBase58().slice(-4) : 'Asker_Demo',
        expires_at: expiresAt,
        category: category,
        escrow_tx: txSig,
      });

      setTimeout(() => {
        onBountyCreated(newBounty.id);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Escrow transfer failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-6 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (5 cols on desktop): Hero Bounty Numeric Display & Protocol Perks */}
        <div className="lg:col-span-5 space-y-5">
          {/* 1. Large Hero Numeric Display for Escrow Bounty (Reference Style) */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-950/5 text-center">
            <span className="text-xs font-bold text-[#6B7F72] uppercase tracking-wider block mb-2">
              Deposit Micro-Bounty
            </span>
            <div className="flex items-baseline justify-center space-x-2">
              <span className="text-6xl font-extrabold text-[#11291B] tracking-tight">
                {amountSol}
              </span>
              <span className="text-2xl font-bold text-[#6B7F72]">SOL</span>
            </div>

            <div className="mt-3 flex items-center justify-center">
              <span className="bg-emerald-100 text-[#1E5E38] text-xs px-3 py-1 rounded-full font-semibold">
                Solana Devnet Escrow Vault
              </span>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100 text-left space-y-2 text-xs text-[#6B7F72]">
              <div className="flex items-center justify-between">
                <span>Spotter Reward (80%):</span>
                <span className="font-mono font-bold text-[#0F3822]">{(amountSol * 0.8).toFixed(3)} SOL</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Verifier Consensus Yield (20%):</span>
                <span className="font-mono font-bold text-[#1E5E38]">{(amountSol * 0.2).toFixed(3)} SOL</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Settlement Speed:</span>
                <span className="font-semibold text-[#11291B]">~400ms Sub-Second</span>
              </div>
            </div>
          </div>

          {/* 2. Category Selector Pills */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-950/5">
            <label className="block text-xs font-bold text-[#6B7F72] uppercase tracking-wider mb-2.5">
              Select Question Type
            </label>
            <div className="grid grid-cols-2 gap-2 bg-[#F4F9F5] p-2 rounded-2xl border border-gray-100">
              {[
                { id: 'queue', label: '☕ Queue Length' },
                { id: 'stock', label: '📦 Shelf Stock' },
                { id: 'open', label: '🚪 Open Status' },
                { id: 'ev', label: '⚡ EV Chargers' },
                { id: 'custom', label: '✍️ Custom Place' },
              ].map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id as any)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold text-center transition-all ${
                    category === cat.id
                      ? 'bg-[#0F3822] text-white shadow-xs'
                      : 'text-[#6B7F72] hover:text-[#11291B]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (7 cols on desktop): Clean Form Card */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 shadow-sm border border-emerald-950/5">
          <h2 className="text-base font-bold text-[#11291B] tracking-tight mb-4">
            Place Truth Request
          </h2>

          <form onSubmit={handleLockBounty} className="space-y-4">
            {/* Question Input */}
            <div>
              <label className="block text-xs font-semibold text-[#6B7F72] uppercase tracking-wider mb-1.5">
                Your Question for Spotters
              </label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. How long is the walk-in coffee line right now?"
                className="w-full bg-[#F4F9F5] border border-gray-200 focus:border-[#0F3822] rounded-2xl px-4 py-3 text-sm text-[#11291B] outline-none transition-colors"
                required
              />
            </div>

            {/* Location Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#6B7F72] uppercase tracking-wider mb-1.5">
                Target Spot (200m Geofence Radius)
              </label>
              <div className="space-y-2">
                <div className="relative">
                  <Navigation className="absolute left-3.5 top-3.5 w-4 h-4 text-[#1E5E38]" />
                  <select
                    value={locationType}
                    onChange={(e) => setLocationType(e.target.value)}
                    className="w-full bg-[#F4F9F5] border border-gray-200 focus:border-[#0F3822] rounded-2xl pl-10 pr-4 py-3 text-xs text-[#11291B] font-medium outline-none cursor-pointer"
                  >
                    <option value="current_gps">
                      📍 My Device GPS ({userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)})
                    </option>
                    <optgroup label="Popular Hubs">
                      {JUDGE_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {locationType === 'current_gps' && (
                  <input
                    type="text"
                    value={customPlaceName}
                    onChange={(e) => setCustomPlaceName(e.target.value)}
                    placeholder="Name this place (e.g. Corner Bakery, EV Bay)"
                    className="w-full bg-[#F4F9F5] border border-gray-200 focus:border-[#0F3822] rounded-2xl px-4 py-2.5 text-xs text-[#11291B] outline-none"
                  />
                )}
              </div>
            </div>

            {/* Bounty Slider / Numeric Adjustment */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#6B7F72] uppercase tracking-wider mb-1.5">
                  Reward (SOL)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.01"
                  max="5"
                  value={amountSol}
                  onChange={(e) => setAmountSol(parseFloat(e.target.value) || 0.1)}
                  className="w-full bg-[#F4F9F5] border border-gray-200 focus:border-[#0F3822] rounded-2xl px-4 py-2.5 text-xs font-bold text-[#11291B] font-mono outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B7F72] uppercase tracking-wider mb-1.5">
                  Expiry Window
                </label>
                <select
                  value={expiryMinutes}
                  onChange={(e) => setExpiryMinutes(parseInt(e.target.value))}
                  className="w-full bg-[#F4F9F5] border border-gray-200 focus:border-[#0F3822] rounded-2xl px-4 py-2.5 text-xs text-[#11291B] outline-none cursor-pointer"
                >
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={60}>60 Minutes</option>
                </select>
              </div>
            </div>

            {/* Success Status */}
            {txSignature && (
              <div className="p-3 bg-[#E8F5E9] border border-[#8BC34A]/40 rounded-2xl text-xs text-[#1E5E38] font-medium flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-[#7CB342] shrink-0" />
                <span>Bounty locked in Devnet Escrow! Returning to Radar...</span>
              </div>
            )}

            {errorMsg && (
              <p className="text-xs text-rose-600 font-medium">
                {errorMsg}
              </p>
            )}

            {/* Primary Action Button (Reference Deep Forest Green) */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-full bg-[#0F3822] hover:bg-[#154A2E] text-white font-semibold text-base shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
            >
              {isSubmitting ? 'Locking Escrow on Solana...' : `Lock ${amountSol} SOL in Escrow`}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
