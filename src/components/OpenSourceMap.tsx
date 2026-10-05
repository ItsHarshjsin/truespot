import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Bounty, Coordinates } from '../types';
import { searchLocationOSM } from '../utils/evidence';
import { Search, MapPin, Move } from 'lucide-react';

interface OpenSourceMapProps {
  userCoords: Coordinates;
  bounties: (Bounty & { distance_meters: number; is_within_range: boolean })[];
  selectedBountyId?: string;
  onSelectBounty: (bountyId: string) => void;
  onSetUserLocation: (lat: number, lng: number, name?: string) => void;
}

export const OpenSourceMap: React.FC<OpenSourceMapProps> = ({
  userCoords,
  bounties,
  selectedBountyId,
  onSelectBounty,
  onSetUserLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userCircleRef = useRef<L.Circle | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{ name: string; lat: number; lng: number }[]>([]);

  // 1. Initialize Leaflet Map only once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [userCoords.lat, userCoords.lng],
      zoom: 16,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);

    // Click on map to relocate marker
    map.on('click', (e) => {
      onSetUserLocation(
        parseFloat(e.latlng.lat.toFixed(6)),
        parseFloat(e.latlng.lng.toFixed(6)),
        `Pinned (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`
      );
    });

    mapInstanceRef.current = map;

    setTimeout(() => map.invalidateSize(), 150);
  }, []);

  // 2. Update user pin and geofence circle only when coordinates meaningfully change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const prev = lastCoordsRef.current;
    const hasMoved = !prev || Math.abs(prev.lat - userCoords.lat) > 0.00005 || Math.abs(prev.lng - userCoords.lng) > 0.00005;

    if (hasMoved) {
      lastCoordsRef.current = { lat: userCoords.lat, lng: userCoords.lng };
      map.setView([userCoords.lat, userCoords.lng], map.getZoom(), { animate: false });
    }

    // Draggable User GPS Marker
    const userIcon = L.divIcon({
      className: 'osm-user-pin',
      html: `
        <div style="position:relative; display:flex; flex-direction:column; align-items:center; cursor:grab;">
          <div style="background:#0F3822; color:#FFFFFF; font-size:9px; font-family:monospace; font-weight:bold; padding:2px 6px; border-radius:4px; box-shadow:0 2px 8px rgba(0,0,0,0.4); white-space:nowrap; margin-bottom:3px; border:1px solid #7CB342;">
            DEVICE GPS
          </div>
          <div style="position:relative; display:flex; align-items:center; justify-content:center; width:28px; height:28px;">
            <div style="position:absolute; width:28px; height:28px; border-radius:50%; background:rgba(124,179,66,0.35); animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
            <div style="width:16px; height:16px; border-radius:50%; background:#0F3822; border:3px solid #7CB342; box-shadow:0 0 16px rgba(124,179,66,0.8);"></div>
          </div>
        </div>
      `,
      iconSize: [120, 50],
      iconAnchor: [60, 40],
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userCoords.lat, userCoords.lng]);
    } else {
      const marker = L.marker([userCoords.lat, userCoords.lng], {
        icon: userIcon,
        draggable: true,
        zIndexOffset: 1000,
      }).addTo(map);

      marker.on('dragend', (e) => {
        const pos = (e.target as L.Marker).getLatLng();
        onSetUserLocation(
          parseFloat(pos.lat.toFixed(6)),
          parseFloat(pos.lng.toFixed(6)),
          `Exact Pin (${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)})`
        );
      });

      userMarkerRef.current = marker;
    }

    // Update 200m Geofence Circle
    if (userCircleRef.current) {
      userCircleRef.current.setLatLng([userCoords.lat, userCoords.lng]);
    } else {
      userCircleRef.current = L.circle([userCoords.lat, userCoords.lng], {
        radius: 200,
        color: '#0F3822',
        weight: 2,
        opacity: 0.8,
        fillColor: '#8BC34A',
        fillOpacity: 0.12,
        dashArray: '6, 8',
      }).addTo(map);
    }
  }, [userCoords.lat, userCoords.lng]);

  // 3. Render Bounty Pins
  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    bounties.forEach((b) => {
      const isSelected = selectedBountyId === b.id;
      const isInRange = b.is_within_range;

      const pinBg = isSelected
        ? '#0F3822'
        : isInRange
        ? '#E8F5E9'
        : '#F1F5F9';
      const pinTextColor = isSelected ? '#FFFFFF' : '#0F3822';
      const pinBorder = isSelected
        ? '2px solid #7CB342'
        : isInRange
        ? '1.5px solid #8BC34A'
        : '1px solid #CBD5E1';

      const pinHtml = `
        <div style="cursor:pointer; transform:scale(1); transition:transform 0.15s ease;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
          <div style="display:flex; align-items:center; gap:5px; background:${pinBg}; color:${pinTextColor}; border:${pinBorder}; padding:3px 8px; border-radius:12px; font-family:monospace; font-size:11px; font-weight:bold; box-shadow:0 3px 8px rgba(0,0,0,0.15); white-space:nowrap;">
            <span style="width:7px; height:7px; border-radius:50%; background:${isInRange ? '#7CB342' : '#94A3B8'};"></span>
            <span>${b.amount_sol} SOL</span>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'osm-bounty-pin',
        html: pinHtml,
        iconSize: [80, 26],
        iconAnchor: [40, 13],
      });

      const marker = L.marker([b.lat, b.lng], { icon });

      marker.on('click', () => {
        onSelectBounty(b.id);
      });

      marker.bindPopup(`
        <div style="font-family:sans-serif; padding:4px; color:#11291B;">
          <b style="font-size:13px;">${b.place_name}</b>
          <p style="margin:4px 0; font-size:11px; color:#6B7F72;">"${b.question}"</p>
          <div style="font-size:11px; font-weight:bold; color:#1E5E38;">Bounty: ${b.amount_sol} SOL • ${b.distance_meters}m away</div>
        </div>
      `);

      markersLayerRef.current?.addLayer(marker);
    });
  }, [bounties, selectedBountyId]);

  // Handle Search Submission
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    const results = await searchLocationOSM(searchQuery);
    setSearchResults(results);
    setIsSearching(false);

    if (results.length > 0) {
      const first = results[0];
      onSetUserLocation(first.lat, first.lng, first.name.split(',')[0]);
      setSearchResults([]);
      setSearchQuery('');
    }
  };

  const handleSelectSearchResult = (res: { name: string; lat: number; lng: number }) => {
    onSetUserLocation(res.lat, res.lng, res.name.split(',')[0]);
    setSearchResults([]);
    setSearchQuery('');
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-slate-950">

      {/* Responsive Height Container for Leaflet */}
      <div
        ref={mapContainerRef}
        style={{ width: '100%', height: '560px', zIndex: 1 }}
      />

      {/* Floating Instruction Banner at Bottom */}
      <div className="absolute bottom-3.5 left-3.5 right-3.5 z-10 pointer-events-none flex flex-wrap items-center justify-between gap-2">
        <div className="bg-slate-900/90 backdrop-blur-md border border-white/15 px-3.5 py-1.5 rounded-full text-xs font-semibold text-emerald-300 flex items-center space-x-2 shadow-xl">
          <Move className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>Drag the green pin or click anywhere to pinpoint your exact spot</span>
        </div>
      </div>
    </div>
  );
};
