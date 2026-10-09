import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Query, Observation, PublishedAnswer, Coordinates, TruthBadgeType } from '../types';
import { hybridStore } from '../utils/storage';
import { TruthBadge } from './TruthBadge';
import {
  MapPin,
  Compass,
  Clock,
  Layers,
  ExternalLink,
  ChevronRight,
  Plus,
  Radio,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  Upload,
  X,
  Navigation,
} from 'lucide-react';
import { compressImageToWebP, generateSHA256, uploadToEvidenceBucket } from '../services/mediaPipeline';
import { evaluateEvidenceWithAI, buildQualityReport } from '../services/evidenceEngine';

interface LiveRealityMapProps {
  userCoords: Coordinates;
  onSetUserLocation: (lat: number, lng: number, name?: string) => void;
  onShowToast: (title: string, message: string, type?: 'success' | 'info' | 'reward' | 'warning') => void;
  contributorWallet?: string;
}

export const LiveRealityMap: React.FC<LiveRealityMapProps> = ({
  userCoords,
  onSetUserLocation,
  onShowToast,
  contributorWallet = 'Spot7rX9kL2p1M4w7zVbNdqE5uT8yR3sF',
}) => {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const circlesLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const [queries, setQueries] = useState<Query[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
  const [selectedObs, setSelectedObs] = useState<Observation | null>(null);
  const [publishedAnswer, setPublishedAnswer] = useState<PublishedAnswer | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Observation submission modal inside map drawer
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [isSubmittingProof, setIsSubmittingProof] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const loadData = async () => {
    const qList = await hybridStore.getQueries();
    const obsList = await hybridStore.getObservations();
    setQueries(qList);
    setObservations(obsList);

    if (selectedQuery) {
      const updated = qList.find((q) => q.id === selectedQuery.id);
      if (updated) setSelectedQuery(updated);
      const obs = obsList.find((o) => o.query_id_hex === (updated?.query_id_hex || selectedQuery.query_id_hex));
      setSelectedObs(obs || null);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = hybridStore.subscribeToChanges(() => {
      loadData();
    });
    return () => unsub();
  }, []);

  // Filtered queries
  const filteredQueries = useMemo(() => {
    if (filterStatus === 'ALL') return queries;
    return queries.filter((q) => q.status === filterStatus);
  }, [queries, filterStatus]);

  // Determine truth badge for query
  const getBadgeTypeForQuery = (query: Query, latestObs?: Observation | null): TruthBadgeType => {
    if (query.status === 'RESOLVED') return 'VERIFIED_ACTIVE';
    if (query.status === 'EXPIRED') return 'STALE_EXPIRED';
    if (latestObs) {
      if (latestObs.quality_report.overall_verdict === 'FLAGGED') return 'CONFLICTING_EVIDENCE';
      return 'EVIDENCE_CORROBORATED';
    }
    return 'UNRESOLVED';
  };

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [userCoords.lat, userCoords.lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      className: 'dark-leaflet-tiles',
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    circlesLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);

    map.on('click', (e) => {
      onSetUserLocation(
        parseFloat(e.latlng.lat.toFixed(6)),
        parseFloat(e.latlng.lng.toFixed(6)),
        `Pinned (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`
      );
    });

    mapInstanceRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
  }, []);

  // 2. Update User Location Pin
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const userIcon = L.divIcon({
      className: 'truespot-user-pin',
      html: `
        <div style="display:flex; flex-direction:column; align-items:center; cursor:grab;">
          <div style="background:#050505; color:#A8FF00; font-size:9px; font-family:monospace; font-weight:800; padding:2px 8px; border-radius:9999px; border:1px solid #A8FF00; box-shadow:0 0 10px rgba(168,255,0,0.4); margin-bottom:4px;">
            YOU (GPS)
          </div>
          <div style="position:relative; width:22px; height:22px; display:flex; align-items:center; justify-content:center;">
            <div style="position:absolute; width:22px; height:22px; border-radius:50%; background:rgba(168,255,0,0.25); animation:ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></div>
            <div style="width:12px; height:12px; border-radius:50%; background:#A8FF00; border:2px solid #050505; box-shadow:0 0 12px #A8FF00;"></div>
          </div>
        </div>
      `,
      iconSize: [80, 48],
      iconAnchor: [40, 36],
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userCoords.lat, userCoords.lng]);
    } else {
      userMarkerRef.current = L.marker([userCoords.lat, userCoords.lng], {
        icon: userIcon,
        zIndexOffset: 1000,
      }).addTo(map);
    }
  }, [userCoords]);

  // 3. Render Query Pins & Geofence Rings
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !markersLayerRef.current || !circlesLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    circlesLayerRef.current.clearLayers();

    filteredQueries.forEach((q) => {
      const qObs = observations.filter((o) => o.query_id_hex === q.query_id_hex);
      const latest = qObs[0] || null;
      const badgeType = getBadgeTypeForQuery(q, latest);

      // Color scheme based on status
      const colorMap: Record<string, string> = {
        OPEN: '#A8FF00',
        IN_REVIEW: '#00F0FF',
        RESOLVED: '#A8FF00',
        EXPIRED: '#64748B',
        CANCELLED: '#FF0055',
      };
      const pinColor = colorMap[q.status] || '#A8FF00';

      // 200m SVG Geofence Radius Indicator
      const radiusCircle = L.circle([q.lat, q.lng], {
        radius: q.radius_meters || 200,
        color: pinColor,
        fillColor: pinColor,
        fillOpacity: q.status === 'RESOLVED' ? 0.08 : 0.05,
        weight: 1.5,
        dashArray: q.status === 'OPEN' ? '4, 6' : undefined,
      });
      radiusCircle.addTo(circlesLayerRef.current!);

      // Custom CoinVex Pin
      const isSelected = selectedQuery?.id === q.id;
      const pinHtml = `
        <div style="display:flex; flex-direction:column; align-items:center; cursor:pointer;">
          <div style="background:#0B0B0B; border:1px solid ${isSelected ? '#FFFFFF' : pinColor}; color:${pinColor}; font-size:10px; font-weight:900; font-family:monospace; padding:3px 8px; border-radius:9999px; box-shadow:0 4px 14px rgba(0,0,0,0.8); display:flex; align-items:center; gap:4px; transform:${isSelected ? 'scale(1.1)' : 'scale(1)'}; transition:all 0.15s ease;">
            <span>${q.amount_sol.toFixed(2)} SOL</span>
          </div>
          <div style="width:2px; height:8px; background:${pinColor};"></div>
          <div style="width:8px; height:8px; border-radius:50%; background:${pinColor}; box-shadow:0 0 10px ${pinColor};"></div>
        </div>
      `;

      const markerIcon = L.divIcon({
        className: 'truespot-query-pin',
        html: pinHtml,
        iconSize: [90, 46],
        iconAnchor: [45, 42],
      });

      const marker = L.marker([q.lat, q.lng], { icon: markerIcon });
      marker.on('click', () => {
        setSelectedQuery(q);
        setSelectedObs(latest);
        hybridStore.getPublishedAnswer(q.query_id_hex).then((ans) => {
          setPublishedAnswer(ans || null);
        });
        map.panTo([q.lat, q.lng], { animate: true });
      });

      marker.addTo(markersLayerRef.current!);
    });
  }, [filteredQueries, observations, selectedQuery]);

  const handleCenterOnUser = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([userCoords.lat, userCoords.lng], 16, { animate: true });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmitProof = async () => {
    if (!selectedQuery || !selectedFile) {
      onShowToast('Missing Photo', 'Please attach field observation evidence', 'warning');
      return;
    }

    try {
      setIsSubmittingProof(true);
      onShowToast('Compressing Media', 'Converting image to WebP (<400KB)...', 'info');

      // 1. Client-side WebP compression (<400KB)
      const compressedBlob = await compressImageToWebP(selectedFile);
      const sha256 = await generateSHA256(compressedBlob);

      onShowToast('Hashing & Uploading', `SHA-256: ${sha256.slice(0, 8)}...`, 'info');
      const mediaUrl = await uploadToEvidenceBucket(compressedBlob);

      // 2. AI Vision non-blocking evaluation
      onShowToast('AI Vision Pre-Check', 'Analyzing spatial scene...', 'info');
      const aiEval = await evaluateEvidenceWithAI(mediaUrl, selectedQuery.question);

      // 3. 4-Pillar Quality Report
      const qualityReport = buildQualityReport({
        targetLat: selectedQuery.lat,
        targetLng: selectedQuery.lng,
        radiusMeters: selectedQuery.radius_meters,
        observedLat: userCoords.lat,
        observedLng: userCoords.lng,
        clientTimestamp: new Date().toISOString(),
        queryCreatedAt: selectedQuery.created_at,
        queryExpiresAt: selectedQuery.expiry_timestamp,
        sha256Hash: sha256,
        existingHashes: observations.map((o) => o.sha256_hash),
        aiEval,
      });

      // 4. Save Observation
      const distanceMeters = qualityReport.spatial_consistency.distance_meters;
      const newObs = await hybridStore.submitObservation({
        query_id_hex: selectedQuery.query_id_hex,
        contributor_wallet: contributorWallet,
        media_url: mediaUrl,
        sha256_hash: sha256,
        observed_lat: userCoords.lat,
        observed_lng: userCoords.lng,
        distance_meters: distanceMeters,
        client_timestamp: new Date().toISOString(),
        quality_report: qualityReport,
        ai_evaluation: aiEval,
        status: 'PENDING',
      });

      setSelectedObs(newObs);
      setShowSubmitModal(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      onShowToast('Evidence Submitted!', 'Observation recorded and ready for Maker audit in Explorer', 'success');
      loadData();
    } catch (err: any) {
      console.error('Evidence submission failed:', err);
      onShowToast('Submission Failed', err.message || 'Error uploading evidence', 'warning');
    } finally {
      setIsSubmittingProof(false);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[640px] bg-[#050505] overflow-hidden rounded-[24px] border border-white/[0.08] shadow-2xl flex">
      {/* 1. Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* 2. Top-Left Floating Controls & Status Filters */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 max-w-xl pointer-events-auto">
        <div className="bg-[#0B0B0B]/90 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 flex items-center space-x-2 text-xs">
          <Radio className="w-3.5 h-3.5 text-[#A8FF00] animate-pulse" />
          <span className="font-bold text-white tracking-tight">Reality Map</span>
          <span className="text-zinc-500">•</span>
          <span className="text-[#A8FF00] font-mono font-bold">{queries.length} Queries</span>
        </div>

        {/* Filter Pills */}
        <div className="bg-[#0B0B0B]/90 backdrop-blur-md border border-white/10 rounded-full p-1 flex items-center space-x-1 text-xs">
          {['ALL', 'OPEN', 'IN_REVIEW', 'RESOLVED', 'EXPIRED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                filterStatus === status
                  ? 'bg-[#A8FF00] text-black font-black shadow-sm shadow-[#A8FF00]/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Top-Right CTAs */}
      <div className="absolute top-4 right-4 z-20 flex items-center space-x-2 pointer-events-auto">
        <button
          onClick={handleCenterOnUser}
          className="bg-[#0B0B0B]/90 backdrop-blur-md hover:bg-[#151515] text-zinc-300 hover:text-white border border-white/10 px-3.5 py-2 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-lg cursor-pointer"
          title="Recenter on device location"
        >
          <Navigation className="w-3.5 h-3.5 text-[#A8FF00]" />
          <span>My GPS</span>
        </button>

        <button
          onClick={() => navigate('/studio')}
          className="bg-[#A8FF00] hover:brightness-110 text-black font-black px-4 py-2 rounded-full text-xs flex items-center space-x-1.5 transition-all shadow-lg shadow-[#A8FF00]/25 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>+ Create Query</span>
        </button>
      </div>

      {/* 4. Interactive Pin Drawer (CoinVex Dark Card) */}
      {selectedQuery && (
        <div className="absolute bottom-4 right-4 z-30 w-full max-w-md bg-[#0B0B0B]/95 backdrop-blur-xl border border-white/10 rounded-[20px] p-5 shadow-2xl transition-all pointer-events-auto max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/[0.08]">
            <div>
              <div className="flex items-center space-x-2 mb-1.5">
                <TruthBadge type={getBadgeTypeForQuery(selectedQuery, selectedObs)} size="sm" />
                <span className="text-[10px] text-zinc-400 font-mono">
                  {selectedQuery.radius_meters}m geofence
                </span>
              </div>
              <h3 className="text-base font-bold text-white leading-tight">
                {selectedQuery.question}
              </h3>
              <p className="text-xs text-zinc-400 flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3 text-[#A8FF00]" />
                {selectedQuery.place_name}
              </p>
            </div>
            <button
              onClick={() => setSelectedQuery(null)}
              className="w-7 h-7 rounded-full bg-[#151515] hover:bg-[#202020] text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Escrow & Tokenomics Bar */}
          <div className="grid grid-cols-2 gap-2 my-3.5 p-3 rounded-[14px] bg-[#101010] border border-white/[0.06]">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                Locked Escrow
              </span>
              <div className="text-sm font-mono font-bold text-[#A8FF00] mt-0.5">
                {selectedQuery.amount_sol.toFixed(2)} SOL
              </div>
              <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                97.5% net payout
              </div>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                Time Remaining
              </span>
              <div className="text-sm font-mono font-bold text-zinc-200 mt-0.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                {Math.max(
                  0,
                  Math.round(
                    (new Date(selectedQuery.expiry_timestamp).getTime() - Date.now()) / 60000
                  )
                )}{' '}
                mins
              </div>
              <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                Status: {selectedQuery.status}
              </div>
            </div>
          </div>

          {/* Latest Evidence Section */}
          {selectedObs ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300">Latest Ground Observation</span>
                <span className="text-[10px] font-mono text-[#00F0FF]">
                  {selectedObs.distance_meters}m from center
                </span>
              </div>

              {/* Photo Preview */}
              <div className="relative rounded-[14px] overflow-hidden border border-white/10 aspect-video bg-black">
                <img
                  src={selectedObs.media_url}
                  alt="Physical ground observation proof"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 right-2 bg-black/75 backdrop-blur-md rounded-lg p-2 text-[10px] font-mono border border-white/10 flex justify-between items-center text-zinc-300">
                  <span className="truncate max-w-[200px]">SHA-256: {selectedObs.sha256_hash.slice(0, 16)}...</span>
                  <span className="text-[#A8FF00]">WebP Verified</span>
                </div>
              </div>

              {/* 4-Pillar Quality Summary */}
              <div className="p-3 rounded-[14px] bg-[#101010] border border-white/[0.06] text-xs space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400">Quality Engine Verdict:</span>
                  <span
                    className={`font-bold font-mono ${
                      selectedObs.quality_report.overall_verdict === 'QUALIFIED'
                        ? 'text-[#A8FF00]'
                        : 'text-[#FFB800]'
                    }`}
                  >
                    {selectedObs.quality_report.overall_verdict}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 italic">
                  "{selectedObs.quality_report.relevance_assessment.summary}"
                </p>
                <div className="text-[10px] text-zinc-500 font-mono truncate">
                  Contributor: {selectedObs.contributor_wallet}
                </div>
              </div>
            </div>
          ) : selectedQuery.reference_media_url ? (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-400">Query Reference Subject</span>
              <div className="rounded-[14px] overflow-hidden border border-white/10 aspect-video bg-black">
                <img
                  src={selectedQuery.reference_media_url}
                  alt="Reference location"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-[14px] bg-[#101010] border border-white/[0.06] text-center text-xs text-zinc-400">
              No field evidence submitted yet. Be the first ground contributor!
            </div>
          )}

          {/* Bottom Actions */}
          <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center gap-2">
            {selectedQuery.status === 'OPEN' || selectedQuery.status === 'IN_REVIEW' ? (
              <button
                onClick={() => setShowSubmitModal(true)}
                className="flex-1 bg-[#A8FF00] hover:brightness-110 text-black font-black py-2.5 px-3 rounded-full text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-[#A8FF00]/20 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Submit Ground Proof</span>
              </button>
            ) : null}

            <button
              onClick={() => navigate('/explorer')}
              className="bg-[#141414] hover:bg-[#1e1e1e] text-zinc-200 border border-white/10 py-2.5 px-4 rounded-full text-xs font-semibold flex items-center justify-center space-x-1 transition-all cursor-pointer"
            >
              <span>Audit Hub</span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>
        </div>
      )}

      {/* 5. Observation Submission Modal */}
      {showSubmitModal && selectedQuery && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B0B0B] border border-white/10 rounded-[24px] max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#A8FF00] uppercase tracking-wider">
                  Contribute Ground Truth
                </span>
                <h3 className="text-base font-bold text-white mt-1">
                  {selectedQuery.question}
                </h3>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="w-8 h-8 rounded-full bg-[#141414] text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Geodesic Location Card */}
            <div className="p-3 bg-[#101010] border border-white/[0.07] rounded-[16px] text-xs space-y-1 font-mono">
              <div className="text-zinc-400 flex items-center justify-between">
                <span>Target Geofence:</span>
                <span className="text-white font-bold">{selectedQuery.radius_meters}m</span>
              </div>
              <div className="text-zinc-400 flex items-center justify-between">
                <span>Your Device Fix:</span>
                <span className="text-[#A8FF00] font-bold">
                  {userCoords.lat.toFixed(5)}, {userCoords.lng.toFixed(5)}
                </span>
              </div>
              <div className="text-zinc-400 flex items-center justify-between">
                <span>Net Bounty (97.5%):</span>
                <span className="text-[#A8FF00] font-bold">
                  {(selectedQuery.amount_sol * 0.975).toFixed(3)} SOL
                </span>
              </div>
            </div>

            {/* File Upload / Camera Input */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Physical Evidence Photo
              </label>
              <div className="border-2 border-dashed border-white/15 hover:border-[#A8FF00]/50 rounded-[18px] p-4 text-center cursor-pointer transition-colors relative bg-[#101010]/60">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                {previewUrl ? (
                  <div className="space-y-2">
                    <img
                      src={previewUrl}
                      alt="Captured evidence"
                      className="max-h-48 mx-auto rounded-lg object-contain"
                    />
                    <p className="text-[11px] text-[#A8FF00] font-mono">
                      {selectedFile?.name} (Click to change)
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 py-4">
                    <Upload className="w-7 h-7 mx-auto text-zinc-500" />
                    <p className="text-xs text-zinc-300 font-medium">
                      Drop evidence photo or snap camera
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      Auto-compressed to WebP (&lt;400KB) with SHA-256 fingerprint
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2.5 rounded-full border border-white/10 bg-[#121212] text-xs font-semibold text-zinc-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedFile || isSubmittingProof}
                onClick={handleSubmitProof}
                className="flex-1 py-2.5 rounded-full bg-[#A8FF00] hover:brightness-110 disabled:opacity-40 text-black text-xs font-black shadow-lg shadow-[#A8FF00]/25 transition-all cursor-pointer"
              >
                {isSubmittingProof ? 'Compressing & Submitting...' : 'Upload & Commit Proof'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
