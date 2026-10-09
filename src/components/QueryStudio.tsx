import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Query, Coordinates } from '../types';
import { hybridStore } from '../utils/storage';
import { searchLocationOSM } from '../utils/evidence';
import { getQueryPDA, stringToQueryIdBytes } from '../solana/truespotProgram';
import { compressImageToWebP, uploadToEvidenceBucket } from '../services/mediaPipeline';
import {
  Search,
  MapPin,
  Clock,
  Shield,
  Layers,
  Upload,
  Sparkles,
  Info,
  DollarSign,
  ArrowRight,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface QueryStudioProps {
  userCoords: Coordinates;
  creatorWallet?: string;
  creatorBalanceSol?: number;
  onAdjustBalance?: (delta: number) => void;
  onShowToast: (title: string, message: string, type?: 'success' | 'info' | 'reward' | 'warning') => void;
}

const TEMPLATES = [
  {
    title: 'EV Charger Vacancy',
    prompt: 'Is EV fast-charger stall #4 currently vacant and unobstructed?',
    place: 'Whole Foods Market SOMA — EV Hub',
    lat: 37.778519,
    lng: -122.39994,
    radius: 150,
    sol: 0.25,
    validity: 3600,
  },
  {
    title: 'Crosswalk & Ramp Transit',
    prompt: 'Is the pedestrian crosswalk and accessible curb ramp clear and open?',
    place: '4th St & Mission Intersection',
    lat: 37.7858,
    lng: -122.401,
    radius: 200,
    sol: 0.15,
    validity: 7200,
  },
  {
    title: 'Store Front Operating State',
    prompt: 'Are the main customer double doors unlocked and open for business?',
    place: 'Ferry Building Marketplace Entrance',
    lat: 37.7955,
    lng: -122.3937,
    radius: 250,
    sol: 0.35,
    validity: 14400,
  },
  {
    title: 'Essential Stock Check',
    prompt: 'Is the front shelf stocked with rapid health screening test kits?',
    place: 'Civic Center Community Pharmacy',
    lat: 37.779,
    lng: -122.418,
    radius: 100,
    sol: 0.20,
    validity: 3600,
  },
];

export const QueryStudio: React.FC<QueryStudioProps> = ({
  userCoords,
  creatorWallet = 'Ask7rX9kL2p1M4w7zVbNdqE5uT8yR3sF',
  creatorBalanceSol = 4.25,
  onAdjustBalance,
  onShowToast,
}) => {
  const navigate = useNavigate();

  // Form State
  const [question, setQuestion] = useState('');
  const [placeName, setPlaceName] = useState('San Francisco Downtown');
  const [targetLat, setTargetLat] = useState(userCoords.lat);
  const [targetLng, setTargetLng] = useState(userCoords.lng);
  const [radiusMeters, setRadiusMeters] = useState(200);
  const [validitySeconds, setValiditySeconds] = useState(3600); // 1 hour
  const [escrowSol, setEscrowSol] = useState('0.25');

  // Reference Media
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);

  // Address Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ name: string; lat: number; lng: number }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Loading
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fee calculation (strictly 97.5% contributor, 2.5% protocol fee)
  const numericSol = parseFloat(escrowSol) || 0;
  const treasuryFee = (numericSol * 0.025);
  const contributorNet = (numericSol * 0.975);

  // Search OSM Nominatim
  const handleSearchOSM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      const results = await searchLocationOSM(searchQuery);
      setSearchResults(results);
      if (results.length === 0) {
        onShowToast('Location Not Found', 'Try a broader street or landmark name', 'info');
      }
    } catch (err) {
      console.warn('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (res: { name: string; lat: number; lng: number }) => {
    setTargetLat(res.lat);
    setTargetLng(res.lng);
    setPlaceName(res.name.split(',')[0]);
    setSearchResults([]);
    setSearchQuery('');
    onShowToast('Geofence Locked', `Set coordinates to ${res.lat.toFixed(4)}, ${res.lng.toFixed(4)}`, 'success');
  };

  const handleApplyTemplate = (tmpl: (typeof TEMPLATES)[0]) => {
    setQuestion(tmpl.prompt);
    setPlaceName(tmpl.place);
    setTargetLat(tmpl.lat);
    setTargetLng(tmpl.lng);
    setRadiusMeters(tmpl.radius);
    setEscrowSol(tmpl.sol.toString());
    setValiditySeconds(tmpl.validity);
    onShowToast('Template Loaded', tmpl.title, 'info');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReferenceFile(file);
      setReferencePreview(URL.createObjectURL(file));
    }
  };

  const handleCreateAndLockEscrow = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) {
      onShowToast('Prompt Required', 'Please enter a clear verification prompt', 'warning');
      return;
    }

    if (numericSol <= 0) {
      onShowToast('Escrow Required', 'Escrow budget must be greater than 0 SOL', 'warning');
      return;
    }

    if (creatorBalanceSol < numericSol) {
      onShowToast('Insufficient Balance', 'You do not have enough SOL in your wallet', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Optional Reference Media upload
      let referenceMediaUrl: string | undefined = undefined;
      if (referenceFile) {
        onShowToast('Processing Media', 'Compressing reference target to WebP...', 'info');
        const compressed = await compressImageToWebP(referenceFile);
        referenceMediaUrl = await uploadToEvidenceBucket(compressed);
      }

      // 2. Generate Deterministic Query ID (16 bytes = 32 hex chars)
      const rawHex = Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      const queryIdBytes = stringToQueryIdBytes(rawHex);
      const [pda] = getQueryPDA(queryIdBytes);

      onShowToast('Solana Anchor Escrow', `Deriving PDA: ${pda.toBase58().slice(0, 8)}...`, 'info');

      // 3. Compute timestamps
      const now = new Date();
      const expiresAt = new Date(now.getTime() + validitySeconds * 1000).toISOString();
      const escrowLamports = Math.round(numericSol * 1e9);

      // 4. Create Query in Store
      const newQuery = await hybridStore.createQuery({
        query_id_hex: rawHex,
        creator_wallet: creatorWallet,
        question: question.trim(),
        place_name: placeName.trim(),
        lat: targetLat,
        lng: targetLng,
        radius_meters: radiusMeters,
        escrow_lamports: escrowLamports,
        amount_sol: numericSol,
        validity_seconds: validitySeconds,
        expiry_timestamp: expiresAt,
        reference_media_url: referenceMediaUrl,
        status: 'OPEN',
        escrow_tx: 'tx_' + Array.from({ length: 44 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      });

      // 5. Debit Creator Balance
      if (onAdjustBalance) {
        onAdjustBalance(-numericSol);
      }

      onShowToast(
        'Query Escrow Funded!',
        `Locked ${numericSol} SOL into PDA. Broadcasted to field contributors.`,
        'success'
      );

      navigate('/explorer');
    } catch (err: any) {
      console.error('Failed creating query:', err);
      onShowToast('Escrow Failed', err.message || 'Error funding query escrow', 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 select-none">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#A8FF00]/10 border border-[#A8FF00]/30 text-[#A8FF00] text-xs font-mono font-bold mb-2">
            <Lock className="w-3.5 h-3.5" />
            <span>TIME-BOUNDED SOLANA ESCROW</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Query Studio
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Fund an economically incentivized request for physical reality. Set a precise geographic geofence, strict validity deadline, and lock SOL in a deterministic Anchor PDA.
          </p>
        </div>

        {/* Balance Card */}
        <div className="bg-[#0B0B0B] border border-white/10 rounded-[20px] p-4 flex items-center space-x-4 min-w-[220px]">
          <div className="w-10 h-10 rounded-full bg-[#151515] flex items-center justify-center text-[#A8FF00] border border-white/10 font-bold font-mono">
            ◎
          </div>
          <div>
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
              Available Devnet SOL
            </span>
            <div className="text-lg font-mono font-bold text-white">
              {creatorBalanceSol.toFixed(2)} SOL
            </div>
          </div>
        </div>
      </div>

      {/* Quick Physical Query Presets */}
      <div>
        <div className="flex items-center space-x-2 mb-3">
          <Sparkles className="w-4 h-4 text-[#A8FF00]" />
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
            Quick Physical Presets
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.title}
              type="button"
              onClick={() => handleApplyTemplate(tmpl)}
              className="text-left bg-[#0B0B0B] hover:bg-[#121212] border border-white/[0.07] hover:border-[#A8FF00]/40 rounded-[18px] p-3.5 transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white group-hover:text-[#A8FF00] transition-colors">
                  {tmpl.title}
                </span>
                <span className="text-[10px] font-mono font-bold text-[#A8FF00]">
                  {tmpl.sol} SOL
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                {tmpl.prompt}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Studio Grid */}
      <form onSubmit={handleCreateAndLockEscrow} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Geographic & Verification Parameters (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Structured Verification Prompt */}
          <div className="bg-[#0B0B0B] border border-white/[0.08] rounded-[24px] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#121212] border border-white/10 text-xs font-mono font-bold flex items-center justify-center text-[#A8FF00]">
                  1
                </span>
                Structured Verification Question
              </h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Exact Question for Field Contributors
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. Is EV stall #4 currently open and unobstructed at Whole Foods SOMA?"
                rows={3}
                className="w-full bg-[#101010] border border-white/10 rounded-[16px] px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#A8FF00] transition-colors"
                required
              />
              <span className="text-[10px] text-zinc-500 mt-1 block">
                Must be an objective, photo-verifiable physical state inquiry.
              </span>
            </div>

            {/* Optional Reference Media */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Optional Reference Media (Subject Image)
              </label>
              <div className="border border-dashed border-white/15 hover:border-white/30 rounded-[16px] p-3 text-center cursor-pointer relative bg-[#101010]/50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                {referencePreview ? (
                  <div className="flex items-center space-x-3 p-1">
                    <img
                      src={referencePreview}
                      alt="Reference preview"
                      className="w-16 h-16 rounded-lg object-cover border border-white/10"
                    />
                    <div className="text-left">
                      <span className="text-xs font-semibold text-[#A8FF00]">
                        Reference Image Attached
                      </span>
                      <p className="text-[10px] text-zinc-400">Click to replace file</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2 py-2 text-xs text-zinc-400">
                    <Upload className="w-4 h-4 text-zinc-500" />
                    <span>Upload sample photo or schematics (stored in Supabase)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Geocoded Location & Precision Radius */}
          <div className="bg-[#0B0B0B] border border-white/[0.08] rounded-[24px] p-6 space-y-5 shadow-xl">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#121212] border border-white/10 text-xs font-mono font-bold flex items-center justify-center text-[#A8FF00]">
                2
              </span>
              Target Location & Precision Geofence
            </h2>

            {/* OSM Nominatim Search */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Search Address or Landmark (OpenStreetMap Nominatim)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. Ferry Building, SOMA Whole Foods, Mission & 4th..."
                    className="w-full bg-[#101010] border border-white/10 rounded-full pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#A8FF00]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearchOSM}
                  disabled={isSearching}
                  className="bg-[#141414] hover:bg-[#202020] text-zinc-200 border border-white/10 px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer"
                >
                  {isSearching ? 'Searching...' : 'Locate'}
                </button>
              </div>

              {/* Search dropdown */}
              {searchResults.length > 0 && (
                <div className="mt-2 bg-[#101010] border border-white/10 rounded-[16px] divide-y divide-white/[0.06] overflow-hidden shadow-2xl">
                  {searchResults.map((res, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectSearchResult(res)}
                      className="w-full text-left p-3 hover:bg-[#181818] text-xs text-zinc-300 flex items-center space-x-2 transition-colors cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-[#A8FF00] shrink-0" />
                      <span className="truncate">{res.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Place Name and Lat/Lng Display */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Place Name
                </label>
                <input
                  type="text"
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  className="w-full bg-[#101010] border border-white/10 rounded-[14px] px-3 py-2 text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Latitude (°N)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={targetLat}
                  onChange={(e) => setTargetLat(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#101010] border border-white/10 rounded-[14px] px-3 py-2 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Longitude (°E)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={targetLng}
                  onChange={(e) => setTargetLng(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#101010] border border-white/10 rounded-[14px] px-3 py-2 text-xs font-mono text-white"
                />
              </div>
            </div>

            {/* Precision Radius Slider (50m to 500m) */}
            <div className="p-4 bg-[#101010] rounded-[18px] border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-300">Precision Geofence Radius</span>
                <span className="font-mono font-bold text-[#A8FF00] text-sm">
                  {radiusMeters} meters
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="500"
                step="25"
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(parseInt(e.target.value))}
                className="w-full accent-[#A8FF00] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>50m (Store aisle)</span>
                <span>200m (Standard)</span>
                <span>500m (Campus)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Escrow Economics & Validity Window (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 3: Validity Window & Escrow Budget */}
          <div className="bg-[#0B0B0B] border border-white/[0.08] rounded-[24px] p-6 space-y-6 shadow-xl">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#121212] border border-white/10 text-xs font-mono font-bold flex items-center justify-center text-[#A8FF00]">
                3
              </span>
              Escrow Economics & Settlement
            </h2>

            {/* Validity Window Selector */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Validity Window (Freshness Expiration)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: '15 min', seconds: 900 },
                  { label: '1 hour', seconds: 3600 },
                  { label: '6 hours', seconds: 21600 },
                  { label: '24 hours', seconds: 86400 },
                ].map((item) => (
                  <button
                    key={item.seconds}
                    type="button"
                    onClick={() => setValiditySeconds(item.seconds)}
                    className={`py-2 px-3 rounded-[14px] text-xs font-mono font-semibold transition-all cursor-pointer ${
                      validitySeconds === item.seconds
                        ? 'bg-[#A8FF00] text-black font-black shadow-md shadow-[#A8FF00]/20'
                        : 'bg-[#101010] text-zinc-400 border border-white/[0.08] hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-zinc-500 mt-1.5 block">
                Unanswered queries become eligible for 100% permissionless refund after expiration.
              </span>
            </div>

            {/* Escrow Input */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Escrow Bounty Deposit (SOL)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.05"
                  value={escrowSol}
                  onChange={(e) => setEscrowSol(e.target.value)}
                  className="w-full bg-[#101010] border border-white/10 rounded-[18px] px-4 py-3 text-lg font-mono font-bold text-white focus:outline-none focus:border-[#A8FF00]"
                  required
                />
                <span className="absolute right-4 top-3 text-xs font-mono font-bold text-zinc-400">
                  SOL
                </span>
              </div>
            </div>

            {/* Tokenomics Fee Breakdown Table */}
            <div className="p-4 bg-[#101010] border border-white/[0.06] rounded-[18px] space-y-2.5 text-xs font-mono">
              <div className="flex justify-between items-center text-zinc-400">
                <span>Gross Escrow Locked:</span>
                <span className="text-white font-bold">{numericSol.toFixed(3)} SOL</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span className="flex items-center gap-1">
                  Contributor Reward (97.5%):
                </span>
                <span className="text-[#A8FF00] font-bold">
                  {contributorNet.toFixed(4)} SOL
                </span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>Protocol Treasury Fee (2.5%):</span>
                <span className="text-zinc-300">{treasuryFee.toFixed(4)} SOL</span>
              </div>
              <div className="pt-2 border-t border-white/[0.08] flex justify-between items-center text-[11px] text-zinc-500">
                <span>Refund Policy:</span>
                <span className="text-[#00F0FF] font-semibold">100% Refund (0% Fee) on Expiry</span>
              </div>
            </div>

            {/* PDA Derivation Commitment */}
            <div className="p-3 bg-black/60 border border-white/[0.06] rounded-[14px] text-[10px] font-mono text-zinc-400 space-y-1">
              <div className="flex items-center justify-between">
                <span>Program ID:</span>
                <span className="text-zinc-300">TrUEspot...1111</span>
              </div>
              <div className="flex items-center justify-between">
                <span>PDA Seeds:</span>
                <span className="text-[#A8FF00]">[b"query", query_id]</span>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={isSubmitting || numericSol <= 0}
              className="w-full bg-[#A8FF00] hover:brightness-110 disabled:opacity-40 text-black font-black py-4 px-6 rounded-full text-sm flex items-center justify-center space-x-2 shadow-xl shadow-[#A8FF00]/25 transition-all cursor-pointer"
            >
              <Lock className="w-4 h-4 stroke-[2.5]" />
              <span>
                {isSubmitting
                  ? 'Locking Escrow on Devnet...'
                  : `+ Fund Query & Lock Escrow (${numericSol.toFixed(2)} SOL)`}
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
