import React, { useState, useEffect } from 'react';
import { Bounty, Coordinates } from '../types';
import { hybridStore } from '../utils/storage';
import { searchLocationOSM } from '../utils/evidence';
import { OpenSourceMap } from './OpenSourceMap';
import { AnalogProximityDial } from './AnalogProximityDial';
import { Coins, ArrowRight, Navigation, Search, MapPin } from 'lucide-react';

interface NearbyScreenProps {
  userCoords: Coordinates;
  selectedBountyId?: string;
  onSelectBounty?: (bountyId: string) => void;
  onSelectReportBounty: (bountyId: string) => void;
  onSelectStateBounty: (bountyId: string) => void;
  onSetUserLocation: (lat: number, lng: number, name?: string) => void;
}

export const NearbyScreen: React.FC<NearbyScreenProps> = ({
  userCoords,
  selectedBountyId: externalSelectedBountyId,
  onSelectBounty,
  onSelectReportBounty,
  onSelectStateBounty,
  onSetUserLocation,
}) => {
  const [bounties, setBounties] = useState<
    (Bounty & { distance_meters: number; is_within_range: boolean })[]
  >([]);
  const [internalSelectedBountyId, setInternalSelectedBountyId] = useState<string | undefined>(
    externalSelectedBountyId
  );
  const [filter, setFilter] = useState<'all' | 'in_range' | 'open'>('all');

  // Location search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{ name: string; lat: number; lng: number }[]>([]);

  const selectedBountyId = externalSelectedBountyId || internalSelectedBountyId;

  const handleSelectBountyInternal = (id: string) => {
    setInternalSelectedBountyId(id);
    if (onSelectBounty) {
      onSelectBounty(id);
    }
  };

  const fetchNearby = async () => {
    const nearby = await hybridStore.getNearbyBounties(userCoords.lat, userCoords.lng, 200);
    setBounties(nearby);
    if (nearby.length > 0 && !selectedBountyId) {
      handleSelectBountyInternal(nearby[0].id);
    }
  };

  useEffect(() => {
    fetchNearby();
  }, [userCoords.lat, userCoords.lng]);

  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchLocationOSM(searchQuery.trim());
      setSearchResults(results);
    } catch (err) {
      console.warn('OSM search failed', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePickSearchResult = (item: { name: string; lat: number; lng: number }) => {
    onSetUserLocation(item.lat, item.lng, item.name.split(',')[0]);
    setSearchResults([]);
    setSearchQuery(item.name.split(',')[0]);
  };

  const filteredBounties = bounties.filter((b) => {
    if (filter === 'in_range') return b.is_within_range;
    if (filter === 'open') return b.status === 'OPEN';
    return true;
  });

  const selectedBounty = bounties.find((b) => b.id === selectedBountyId) || bounties[0];
  const inRangeCount = bounties.filter((b) => b.is_within_range).length;

  return (
    <div className="space-y-6 pb-6">
      {/* 2-Column Responsive Desktop Web Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (5 cols on desktop): Tactile Dial & Bounties Feed */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. Proximity Gauge Card */}
          <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-5 shadow-xl">
            <AnalogProximityDial
              distanceMeters={selectedBounty ? selectedBounty.distance_meters : 25}
              placeName={selectedBounty ? selectedBounty.place_name : 'Nearby Location'}
            />
          </div>

          {/* 2. Segmented Filter Pills & Header */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-[#858585] uppercase tracking-wider">
              Nearby Truth Tasks
            </span>

            <div className="bg-[#101010] border border-white/[0.07] rounded-full p-1 shadow-inner flex space-x-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  filter === 'all'
                    ? 'bg-[#A8FF00] text-black font-extrabold shadow-sm'
                    : 'text-[#858585] hover:text-white'
                }`}
              >
                All ({bounties.length})
              </button>
              <button
                onClick={() => setFilter('in_range')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  filter === 'in_range'
                    ? 'bg-[#A8FF00] text-black font-extrabold shadow-sm'
                    : 'text-[#858585] hover:text-white'
                }`}
              >
                In 200m ({inRangeCount})
              </button>
              <button
                onClick={() => setFilter('open')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  filter === 'open'
                    ? 'bg-[#A8FF00] text-black font-extrabold shadow-sm'
                    : 'text-[#858585] hover:text-white'
                }`}
              >
                Open
              </button>
            </div>
          </div>

          {/* 3. Bounties Cards List */}
          <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
            {filteredBounties.map((bounty) => {
              const isEligible = bounty.is_within_range;
              const isOpen = bounty.status === 'OPEN';
              const isSelected = selectedBountyId === bounty.id;

              return (
                <div
                  key={bounty.id}
                  onClick={() => handleSelectBountyInternal(bounty.id)}
                  className={`p-4 rounded-xl bg-[#101010] border cursor-pointer flex flex-col gap-2.5 transition-all ${
                    isSelected
                      ? 'border-[#A8FF00] shadow-[0_0_15px_rgba(168,255,0,0.15)]'
                      : 'border-white/[0.07] hover:border-white/15'
                  }`}
                >
                  {/* Top Row: Distance Pill & SOL Reward Badge */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center space-x-1.5 ${
                        isEligible
                          ? 'bg-[#A8FF00]/10 text-[#A8FF00] border border-[#A8FF00]/30'
                          : 'bg-[#18181b] text-[#858585] border border-white/[0.07]'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isEligible ? 'bg-[#A8FF00] animate-pulse' : 'bg-zinc-500'
                        }`}
                      />
                      <span>{bounty.distance_meters}m away</span>
                    </span>

                    <div className="flex items-center space-x-1 bg-[#A8FF00]/10 text-[#A8FF00] border border-[#A8FF00]/30 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
                      <Coins className="w-3.5 h-3.5 text-[#A8FF00]" />
                      <span>{bounty.amount_sol} SOL</span>
                    </div>
                  </div>

                  {/* Title & Question */}
                  <div>
                    <h3 className="text-[14px] font-bold text-[#F5F5F5] tracking-tight">
                      {bounty.place_name}
                    </h3>
                    <p className="text-xs text-[#858585] mt-0.5 leading-snug">
                      "{bounty.question}"
                    </p>
                  </div>

                  {/* Quick Teleport Jumper to Test 200m Verification */}
                  <div className="pt-0.5 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectBountyInternal(bounty.id);
                        onSetUserLocation(
                          bounty.lat + 0.0001,
                          bounty.lng + 0.0001,
                          `${bounty.place_name} (15m Geofence)`
                        );
                      }}
                      className="text-[10px] px-2.5 py-1 rounded-full font-semibold bg-[#18181b] hover:bg-zinc-800 text-[#858585] hover:text-white transition-colors flex items-center space-x-1 border border-white/[0.06]"
                      title="Move your GPS pin to test physical proximity verification"
                    >
                      <span>📍</span>
                      <span>Walk Inside Geofence (15m)</span>
                    </button>

                    <span className="text-[10px] font-mono text-[#858585]">
                      Status: <strong className={isEligible ? 'text-[#A8FF00]' : 'text-zinc-500'}>{isEligible ? 'In Range' : 'Out of Range'}</strong>
                    </span>
                  </div>

                  {/* CTA Button */}
                  {isOpen ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectBountyInternal(bounty.id);
                        onSelectReportBounty(bounty.id);
                      }}
                      className={`w-full rounded-full py-2.5 px-4 flex items-center justify-center space-x-2 transition-all active:scale-[0.99] font-extrabold text-xs cursor-pointer ${
                        isEligible
                          ? 'bg-gradient-to-r from-[#A8FF00] to-[#34D399] hover:brightness-105 text-black shadow-md shadow-[#A8FF00]/20'
                          : 'bg-[#18181b] hover:bg-zinc-800 text-[#858585] hover:text-white border border-white/[0.07]'
                      }`}
                    >
                      <span>
                        {isEligible ? 'Snap Photo & Earn SOL' : 'View Details (Out of 200m)'}
                      </span>
                      <span className="font-mono">↗</span>
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectBountyInternal(bounty.id);
                        onSelectStateBounty(bounty.id);
                      }}
                      className="w-full py-2.5 px-4 rounded-full font-semibold text-xs bg-[#18181b] hover:bg-zinc-800 text-[#858585] hover:text-white border border-white/[0.07] flex items-center justify-center space-x-2 transition-all cursor-pointer"
                    >
                      <span>View Verification Settlement</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (7 cols on desktop): Wide Interactive OpenSourceMap */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-5 shadow-xl">
            <div className="flex items-center justify-between px-1 pb-3">
              <div className="flex items-center space-x-2 text-sm font-bold text-[#F5F5F5]">
                <Navigation className="w-4 h-4 text-[#A8FF00]" />
                <span>200m Proximity Radar</span>
              </div>
              <span className="text-[11px] font-semibold text-[#A8FF00] bg-[#101010] border border-white/[0.07] px-3 py-1 rounded-full">
                {inRangeCount} bounties inside 200m range
              </span>
            </div>

            {/* Professional Location Search Bar */}
            <div className="relative mb-3">
              <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                <Search className="w-4 h-4 text-[#555555] absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search any city or address (e.g. Kathmandu, Tokyo, London)..."
                  className="w-full bg-[#101010] text-xs text-[#F5F5F5] font-medium pl-10 pr-24 py-2.5 rounded-full border border-white/[0.08] focus:outline-none focus:border-[#A8FF00]/60 placeholder:text-[#555555] transition-all"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="absolute right-1.5 px-3.5 py-1.5 bg-[#A8FF00] hover:bg-[#bef264] text-black text-xs font-bold rounded-full transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </form>

              {/* Autocomplete / Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-[#101010] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
                  <div className="px-3.5 py-2 bg-[#18181b] border-b border-white/[0.06] flex items-center justify-between text-[11px] text-[#A8FF00] font-bold">
                    <span>Matching Locations</span>
                    <button
                      type="button"
                      onClick={() => setSearchResults([])}
                      className="text-[#858585] hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  {searchResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handlePickSearchResult(item)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-zinc-800 text-xs text-zinc-200 border-b border-white/[0.05] last:border-b-0 flex items-start space-x-2 transition-colors cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-[#A8FF00] shrink-0 mt-0.5" />
                      <span className="truncate">{item.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <OpenSourceMap
              userCoords={userCoords}
              bounties={bounties}
              selectedBountyId={selectedBountyId}
              onSelectBounty={(bId) => handleSelectBountyInternal(bId)}
              onSetUserLocation={onSetUserLocation}
            />
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[18px] p-4 text-center shadow-lg">
              <span className="text-[10px] font-semibold text-[#858585] uppercase tracking-wider block">Total Tasks</span>
              <span className="text-xl font-extrabold text-[#F5F5F5]">{bounties.length}</span>
            </div>
            <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[18px] p-4 text-center shadow-lg">
              <span className="text-[10px] font-semibold text-[#858585] uppercase tracking-wider block">In 200m Range</span>
              <span className="text-xl font-extrabold text-[#A8FF00]">{inRangeCount}</span>
            </div>
            <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[18px] p-4 text-center shadow-lg">
              <span className="text-[10px] font-semibold text-[#858585] uppercase tracking-wider block">Escrow Pool</span>
              <span className="text-xl font-extrabold text-[#A8FF00] font-mono">
                {bounties.reduce((acc, b) => acc + b.amount_sol, 0).toFixed(2)} SOL
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
