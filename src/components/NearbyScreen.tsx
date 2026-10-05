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
          {/* 1. Tactile Skeuomorphic Analog Proximity Gauge Card (Reference Screen 1) */}
          <div className="bento-card p-6">
            <AnalogProximityDial
              distanceMeters={selectedBounty ? selectedBounty.distance_meters : 25}
              placeName={selectedBounty ? selectedBounty.place_name : 'Nearby Location'}
            />
          </div>

          {/* 2. Segmented Filter Pills & Header */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Nearby Truth Tasks
            </span>

            <div className="bg-black/50 border border-white/10 rounded-2xl p-1 shadow-inner flex space-x-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                  filter === 'all'
                    ? 'tactile-keycap-active text-sky-200'
                    : 'tactile-keycap text-slate-400 hover:text-white'
                }`}
              >
                All ({bounties.length})
              </button>
              <button
                onClick={() => setFilter('in_range')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                  filter === 'in_range'
                    ? 'tactile-keycap-active text-sky-200'
                    : 'tactile-keycap text-slate-400 hover:text-white'
                }`}
              >
                In 200m ({inRangeCount})
              </button>
              <button
                onClick={() => setFilter('open')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                  filter === 'open'
                    ? 'tactile-keycap-active text-sky-200'
                    : 'tactile-keycap text-slate-400 hover:text-white'
                }`}
              >
                Open
              </button>
            </div>
          </div>

          {/* 3. Bento Glass Bounties Cards List */}
          <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
            {filteredBounties.map((bounty) => {
              const isEligible = bounty.is_within_range;
              const isOpen = bounty.status === 'OPEN';
              const isSelected = selectedBountyId === bounty.id;

              return (
                <div
                  key={bounty.id}
                  onClick={() => handleSelectBountyInternal(bounty.id)}
                  className={`p-5 bento-card cursor-pointer flex flex-col gap-3 ${
                    isSelected
                      ? 'border-sky-400/80 shadow-[0_0_30px_rgba(56,189,248,0.25)]'
                      : ''
                  }`}
                >
                  {/* Top Row: Distance Pill & SOL Reward Badge */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center space-x-1.5 ${
                        isEligible
                          ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                          : 'bg-white/5 text-slate-400 border border-white/10'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isEligible ? 'bg-sky-400 animate-pulse' : 'bg-gray-500'
                        }`}
                      />
                      <span>{bounty.distance_meters}m away</span>
                    </span>

                    <div className="flex items-center space-x-1 bg-sky-500/15 text-sky-300 border border-sky-500/30 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
                      <Coins className="w-3.5 h-3.5 text-sky-400" />
                      <span>{bounty.amount_sol} SOL</span>
                    </div>
                  </div>

                  {/* Title & Question */}
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      {bounty.place_name}
                    </h3>
                    <p className="text-sm text-slate-400 mt-0.5 leading-snug">
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
                      className="text-[11px] px-2.5 py-1 rounded-xl font-semibold tactile-keycap text-sky-300 hover:text-white transition-colors flex items-center space-x-1"
                      title="Move your GPS pin to test physical proximity verification"
                    >
                      <span>📍</span>
                      <span>Walk Inside Geofence (15m)</span>
                    </button>

                    <span className="text-[11px] font-mono text-slate-400">
                      Status: <strong className={isEligible ? 'text-sky-300' : 'text-gray-500'}>{isEligible ? 'In Range' : 'Out of Range'}</strong>
                    </span>
                  </div>

                  {/* CTA Button (Inspiration Capsule with circular puck) */}
                  {isOpen ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectBountyInternal(bounty.id);
                        onSelectReportBounty(bounty.id);
                      }}
                      className={`w-full rounded-full py-2.5 pl-6 pr-2.5 flex items-center justify-between border transition-all active:scale-[0.99] group ${
                        isEligible
                          ? 'bg-[#0a0e17] hover:bg-[#121927] border-white/20 text-white shadow-[0_10px_30px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.2)]'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                      }`}
                    >
                      <span className="text-xs font-bold text-white">
                        {isEligible ? 'Snap Photo & Earn SOL' : 'View Details (Out of 200m)'}
                      </span>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-md transition-transform group-hover:scale-105 ${
                        isEligible ? 'bg-white text-slate-950 group-hover:bg-sky-300' : 'bg-white/10 text-white'
                      }`}>
                        ↗
                      </div>
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectBountyInternal(bounty.id);
                        onSelectStateBounty(bounty.id);
                      }}
                      className="w-full py-3 px-5 rounded-full font-semibold text-xs bg-white/5 hover:bg-white/10 text-sky-300 border border-white/10 flex items-center justify-center space-x-2 transition-all"
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
          <div className="bento-card p-5">
            <div className="flex items-center justify-between px-1 pb-3">
              <div className="flex items-center space-x-2 text-sm font-bold text-white">
                <Navigation className="w-4 h-4 text-sky-400" />
                <span>OpenStreetMap 200m Geofence Radar</span>
              </div>
              <span className="text-xs font-semibold text-sky-300 bg-sky-500/10 border border-sky-500/25 px-3 py-1 rounded-full">
                {inRangeCount} bounties inside 200m range
              </span>
            </div>

            {/* Professional Location Search Bar */}
            <div className="relative mb-3">
              <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search any city or address (e.g. Kathmandu, Tokyo, London)..."
                  className="w-full bg-[#070b13]/80 text-xs text-white font-medium pl-10 pr-24 py-2.5 rounded-2xl border border-white/10 focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400/50 placeholder:text-slate-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="absolute right-1.5 px-3.5 py-1.5 tactile-keycap-active text-sky-300 text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </form>

              {/* Autocomplete / Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bento-card border border-white/15 overflow-hidden max-h-56 overflow-y-auto">
                  <div className="px-3.5 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between text-[11px] text-sky-300 font-bold">
                    <span>Matching Locations</span>
                    <button
                      type="button"
                      onClick={() => setSearchResults([])}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  {searchResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handlePickSearchResult(item)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-white/5 text-xs text-slate-200 border-b border-white/5 last:border-b-0 flex items-start space-x-2 transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
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
            <div className="bento-card p-4 text-center">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Bounties</span>
              <span className="text-xl font-extrabold text-white">{bounties.length}</span>
            </div>
            <div className="bento-card p-4 text-center">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">In 200m Range</span>
              <span className="text-xl font-extrabold text-sky-300">{inRangeCount}</span>
            </div>
            <div className="bento-card p-4 text-center">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Escrow Pool</span>
              <span className="text-xl font-extrabold text-sky-300 font-mono">
                {bounties.reduce((acc, b) => acc + b.amount_sol, 0).toFixed(2)} SOL
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
