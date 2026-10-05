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
        <div className="lg:col-span-5 space-y-5">
          {/* 1. Proximity Gauge Card */}
          <div className="bg-[#121212] border border-zinc-800 rounded-3xl p-6 shadow-xl shadow-black/40">
            <AnalogProximityDial
              distanceMeters={selectedBounty ? selectedBounty.distance_meters : 25}
              placeName={selectedBounty ? selectedBounty.place_name : 'Nearby Location'}
            />
          </div>

          {/* 2. Segmented Filter Pills & Header */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Nearby Truth Tasks
            </span>

            <div className="bg-[#0a0a0a] border border-zinc-800 rounded-full p-1 shadow-inner flex space-x-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  filter === 'all'
                    ? 'bg-lime-400 text-black font-bold shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                All ({bounties.length})
              </button>
              <button
                onClick={() => setFilter('in_range')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  filter === 'in_range'
                    ? 'bg-lime-400 text-black font-bold shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                In 200m ({inRangeCount})
              </button>
              <button
                onClick={() => setFilter('open')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  filter === 'open'
                    ? 'bg-lime-400 text-black font-bold shadow-md'
                    : 'text-zinc-400 hover:text-white'
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
                  className={`p-5 rounded-2xl bg-[#18181b] border cursor-pointer flex flex-col gap-3 transition-all ${
                    isSelected
                      ? 'border-lime-400 shadow-[0_0_20px_rgba(163,230,53,0.2)]'
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {/* Top Row: Distance Pill & SOL Reward Badge */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold px-3 py-0.5 rounded-full inline-flex items-center space-x-1.5 ${
                        isEligible
                          ? 'bg-lime-400/10 text-lime-400 border border-lime-400/30'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isEligible ? 'bg-lime-400 animate-pulse' : 'bg-zinc-500'
                        }`}
                      />
                      <span>{bounty.distance_meters}m away</span>
                    </span>

                    <div className="flex items-center space-x-1 bg-lime-400/10 text-lime-400 border border-lime-400/30 px-3 py-0.5 rounded-full text-xs font-bold font-mono">
                      <Coins className="w-3.5 h-3.5 text-lime-400" />
                      <span>{bounty.amount_sol} SOL</span>
                    </div>
                  </div>

                  {/* Title & Question */}
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      {bounty.place_name}
                    </h3>
                    <p className="text-sm text-zinc-400 mt-0.5 leading-snug">
                      "{bounty.question}"
                    </p>
                  </div>

                  {/* Quick Teleport Jumper to Test 200m Verification */}
                  <div className="pt-1 flex items-center justify-between">
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
                      className="text-[11px] px-3 py-1 rounded-full font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors flex items-center space-x-1"
                      title="Move your GPS pin to test physical proximity verification"
                    >
                      <span>📍</span>
                      <span>Walk Inside Geofence (15m)</span>
                    </button>

                    <span className="text-[11px] font-mono text-zinc-400">
                      Status: <strong className={isEligible ? 'text-lime-400' : 'text-zinc-500'}>{isEligible ? 'In Range' : 'Out of Range'}</strong>
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
                      className={`w-full rounded-full py-3 px-5 flex items-center justify-center space-x-2 transition-all active:scale-[0.99] font-bold text-xs ${
                        isEligible
                          ? 'bg-lime-400 hover:bg-lime-300 text-black shadow-lg shadow-lime-400/20'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
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
                      className="w-full py-3 px-5 rounded-full font-semibold text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 flex items-center justify-center space-x-2 transition-all"
                    >
                      <span>View Oracle Settlement</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (7 cols on desktop): Wide Interactive OpenSourceMap */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#121212] border border-zinc-800 rounded-3xl p-5 shadow-xl shadow-black/40">
            <div className="flex items-center justify-between px-1 pb-3">
              <div className="flex items-center space-x-2 text-sm font-bold text-white">
                <Navigation className="w-4 h-4 text-lime-400" />
                <span>OpenStreetMap 200m Geofence Radar</span>
              </div>
              <span className="text-xs font-semibold text-lime-400 bg-lime-400/10 border border-lime-400/30 px-3 py-1 rounded-full">
                {inRangeCount} bounties inside 200m range
              </span>
            </div>

            {/* Professional Location Search Bar */}
            <div className="relative mb-3">
              <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search any city or address (e.g. Kathmandu, Tokyo, London)..."
                  className="w-full bg-[#18181b] text-xs text-white font-medium pl-10 pr-24 py-2.5 rounded-full border border-zinc-800 focus:outline-none focus:border-lime-400/60 placeholder:text-zinc-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="absolute right-1.5 px-3.5 py-1.5 bg-lime-400 hover:bg-lime-300 text-black text-xs font-bold rounded-full transition-all disabled:opacity-50"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </form>

              {/* Autocomplete / Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-[#18181b] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
                  <div className="px-3.5 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-[11px] text-lime-400 font-bold">
                    <span>Matching Locations</span>
                    <button
                      type="button"
                      onClick={() => setSearchResults([])}
                      className="text-zinc-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  {searchResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handlePickSearchResult(item)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-zinc-800 text-xs text-zinc-200 border-b border-zinc-800 last:border-b-0 flex items-start space-x-2 transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5 text-lime-400 shrink-0 mt-0.5" />
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

          {/* Quick Oracle Stats Strip */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-4 text-center shadow-lg shadow-black/30">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">Total Bounties</span>
              <span className="text-xl font-extrabold text-white">{bounties.length}</span>
            </div>
            <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-4 text-center shadow-lg shadow-black/30">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">In 200m Range</span>
              <span className="text-xl font-extrabold text-lime-400">{inRangeCount}</span>
            </div>
            <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-4 text-center shadow-lg shadow-black/30">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">Escrow Pool</span>
              <span className="text-xl font-extrabold text-lime-400 font-mono">
                {bounties.reduce((acc, b) => acc + b.amount_sol, 0).toFixed(2)} SOL
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
