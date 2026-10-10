import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Query, Observation, PublishedAnswer, TruthBadgeType } from '../types';
import { hybridStore } from '../utils/storage';
import { TruthBadge } from './TruthBadge';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  MapPin,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Coins,
  Send,
  Eye,
  Filter,
} from 'lucide-react';

interface EvidenceExplorerProps {
  onShowToast: (title: string, message: string, type?: 'success' | 'info' | 'reward' | 'warning') => void;
  onAdjustBalance?: (delta: number, targetRole?: any, counterRole?: any) => void;
}

export const EvidenceExplorer: React.FC<EvidenceExplorerProps> = ({
  onShowToast,
  onAdjustBalance,
}) => {
  const navigate = useNavigate();
  const [queries, setQueries] = useState<Query[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [publishedAnswers, setPublishedAnswers] = useState<PublishedAnswer[]>([]);
  const [filterTab, setFilterTab] = useState<'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REFUNDABLE' | 'ALL'>('PENDING');

  // Rejection modal
  const [rejectingObsId, setRejectingObsId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('Outside Designated Geofence');

  // Settle modal / loading
  const [settlingObsId, setSettlingObsId] = useState<string | null>(null);

  const loadData = async () => {
    const q = await hybridStore.getQueries();
    const o = await hybridStore.getObservations();
    const a = await hybridStore.getPublishedAnswers();
    setQueries(q);
    setObservations(o);
    setPublishedAnswers(a);
  };

  useEffect(() => {
    loadData();
    const unsub = hybridStore.subscribeToChanges(() => {
      loadData();
    });
    return () => unsub();
  }, []);

  // Filter observations or queries
  const filteredObservations = observations.filter((obs) => {
    if (filterTab === 'ALL') return true;
    if (filterTab === 'PENDING') return obs.status === 'PENDING';
    if (filterTab === 'ACCEPTED') return obs.status === 'ACCEPTED';
    if (filterTab === 'REJECTED') return obs.status === 'REJECTED';
    return true;
  });

  const expiredRefundableQueries = queries.filter((q) => {
    const isExpired = new Date(q.expiry_timestamp).getTime() < Date.now();
    return isExpired && q.status !== 'RESOLVED' && q.status !== 'CANCELLED';
  });

  // Handle Approve & Settle (97.5% contributor, 2.5% protocol treasury)
  const handleApproveAndSettle = async (obs: Observation) => {
    try {
      setSettlingObsId(obs.id);
      let query = queries.find(
        (q) =>
          q.query_id_hex === obs.query_id_hex ||
          q.id === obs.query_id_hex ||
          q.id === (obs as any).bounty_id ||
          q.query_id_hex === (obs as any).bounty_id
      );

      if (!query) {
        const bList = await hybridStore.getBounties();
        query = bList.find(
          (b) =>
            b.id === obs.query_id_hex ||
            b.query_id_hex === obs.query_id_hex ||
            b.id === (obs as any).bounty_id ||
            b.query_id_hex === (obs as any).bounty_id
        );
      }

      const amountSol = query ? query.amount_sol : ((obs as any).amount_sol || 0.20);
      const feeSol = amountSol * 0.025;
      const payoutSol = amountSol * 0.975;

      onShowToast(
        'Anchor Settle Invocation',
        `Calling settle_query on Devnet. Payout: ${payoutSol.toFixed(3)} SOL, Fee: ${feeSol.toFixed(4)} SOL`,
        'info'
      );

      // Simulate on-chain confirmation latency
      await new Promise((r) => setTimeout(r, 800));

      const txSig =
        '5R3bdfZ' + Array.from({ length: 36 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

      await hybridStore.settleQuery(obs.id, txSig);

      if (onAdjustBalance) {
        onAdjustBalance(payoutSol, 'receiver', 'escrow');
      }

      onShowToast(
        'Query Settled & Funds Released',
        `Transferred 97.5% (${payoutSol.toFixed(3)} SOL) to Contributor. Protocol fee (2.5%) sent to Treasury.`,
        'reward'
      );

      loadData();
    } catch (err: any) {
      console.error('Settlement error:', err);
      onShowToast('Settlement Failed', err.message || 'Error executing settle_query', 'warning');
    } finally {
      setSettlingObsId(null);
    }
  };

  // Handle Reject Observation
  const handleReject = async () => {
    if (!rejectingObsId) return;

    try {
      await hybridStore.rejectObservation(rejectingObsId, rejectionReason);
      onShowToast(
        'Observation Rejected',
        `Flagged as invalid (${rejectionReason}). Query reset to OPEN.`,
        'info'
      );
      setRejectingObsId(null);
      loadData();
    } catch (err: any) {
      console.error('Rejection error:', err);
      onShowToast('Rejection Failed', err.message || 'Error rejecting observation', 'warning');
    }
  };

  // Handle Claim 100% Refund
  const handleClaimRefund = async (query: Query) => {
    try {
      const { refundLamports, tx } = await hybridStore.refundQuery(query.id);
      const refundSol = refundLamports / 1e9;

      if (onAdjustBalance) {
        onAdjustBalance(refundSol, 'maker', 'escrow');
      }

      onShowToast(
        '100% Escrow Refunded',
        `Returned full ${refundSol.toFixed(2)} SOL to creator with 0% fee deducted. Tx: ${tx.slice(0, 10)}...`,
        'success'
      );
      loadData();
    } catch (err: any) {
      console.error('Refund error:', err);
      onShowToast('Refund Failed', err.message || 'Error claiming refund', 'warning');
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-[#00F0FF] text-xs font-mono font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>GROUND TRUTH AUDIT & DISPUTE HUB</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Evidence Explorer
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Audit incoming field observations, review geodesic precision and the 4-Pillar Quality Scorecard, and trigger Anchor escrow settlements with cryptographic SPL Memo commitment.
          </p>
        </div>

        {/* Quick Stats Pill */}
        <div className="flex items-center space-x-3">
          <div className="bg-[#0B0B0B] border border-white/10 rounded-[18px] px-4 py-2 text-center">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold">Pending Audits</span>
            <div className="text-sm font-mono font-bold text-[#00F0FF]">
              {observations.filter((o) => o.status === 'PENDING').length}
            </div>
          </div>
          <div className="bg-[#0B0B0B] border border-white/10 rounded-[18px] px-4 py-2 text-center">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold">Settled Proofs</span>
            <div className="text-sm font-mono font-bold text-[#A8FF00]">
              {observations.filter((o) => o.status === 'ACCEPTED').length}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-white/[0.06] pb-3 overflow-x-auto">
        {[
          { key: 'PENDING', label: 'Pending Review', count: observations.filter((o) => o.status === 'PENDING').length },
          { key: 'ACCEPTED', label: 'Accepted & Settled', count: observations.filter((o) => o.status === 'ACCEPTED').length },
          { key: 'REJECTED', label: 'Rejected', count: observations.filter((o) => o.status === 'REJECTED').length },
          { key: 'REFUNDABLE', label: 'Expired Refunds', count: expiredRefundableQueries.length },
          { key: 'ALL', label: 'All Observations', count: observations.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterTab(tab.key as any)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              filterTab === tab.key
                ? 'bg-[#A8FF00] text-black font-black shadow-md shadow-[#A8FF00]/20'
                : 'bg-[#0B0B0B] text-zinc-400 hover:text-white border border-white/[0.06]'
            }`}
          >
            <span>{tab.label}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Expired Queries Tab View */}
      {filterTab === 'REFUNDABLE' ? (
        <div className="space-y-4">
          {expiredRefundableQueries.length === 0 ? (
            <div className="bg-[#0B0B0B] border border-white/[0.08] rounded-[24px] p-12 text-center text-zinc-400">
              No expired queries eligible for refund. All active queries are within their validity window.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {expiredRefundableQueries.map((q) => (
                <div
                  key={q.id}
                  className="bg-[#0B0B0B] border border-white/[0.08] rounded-[24px] p-6 space-y-4 shadow-xl"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <TruthBadge type="STALE_EXPIRED" size="sm" />
                      <h3 className="text-base font-bold text-white mt-2">{q.question}</h3>
                      <p className="text-xs text-zinc-400 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                        {q.place_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono font-bold text-[#A8FF00]">
                        {q.amount_sol.toFixed(2)} SOL
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">Locked in PDA</span>
                    </div>
                  </div>

                  <div className="p-3 bg-[#101010] rounded-[14px] text-xs font-mono text-zinc-400 space-y-1">
                    <div>Validity Expired: {new Date(q.expiry_timestamp).toLocaleString()}</div>
                    <div className="text-[#00F0FF]">Eligible for 100% zero-fee refund to creator wallet</div>
                  </div>

                  <button
                    onClick={() => handleClaimRefund(q)}
                    className="w-full bg-[#181818] hover:bg-[#252525] border border-white/10 text-white font-bold py-2.5 px-4 rounded-full text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <Coins className="w-4 h-4 text-[#A8FF00]" />
                    <span>Claim 100% Refund ({q.amount_sol.toFixed(2)} SOL)</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Observations Review Queue */
        <div className="space-y-6">
          {filteredObservations.length === 0 ? (
            <div className="bg-[#0B0B0B] border border-white/[0.08] rounded-[24px] p-12 text-center text-zinc-400">
              No observations found matching this filter. Switch to "All Observations" or submit ground proof via the Reality Map.
            </div>
          ) : (
            filteredObservations.map((obs) => {
              const query = queries.find(
                (q) =>
                  q.query_id_hex === obs.query_id_hex ||
                  q.id === obs.query_id_hex ||
                  q.id === (obs as any).bounty_id ||
                  q.query_id_hex === (obs as any).bounty_id
              );
              const bountyAmount = query ? query.amount_sol : ((obs as any).amount_sol || 0.20);
              const netPayoutSol = (bountyAmount * 0.975).toFixed(3);
              const isSettling = settlingObsId === obs.id;

              return (
                <div
                  key={obs.id}
                  className="bg-[#0B0B0B] border border-white/[0.08] rounded-[24px] p-6 space-y-6 shadow-xl"
                >
                  {/* Top Bar: Parent Query & Status */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
                    <div>
                      <div className="flex items-center space-x-2 mb-1.5">
                        <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase">
                          Query ID: {obs.query_id_hex.slice(0, 16)}...
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-[10px] font-mono text-zinc-400">
                          Captured {new Date(obs.client_timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <h2 className="text-base sm:text-lg font-bold text-white">
                        {query?.question || (obs as any).answer_text || 'Physical Query Inquiry'}
                      </h2>
                      <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-[#A8FF00]" />
                        {query?.place_name || 'Designated Coordinates'}
                      </p>
                    </div>

                    {/* Escrow & Observation Status Badge */}
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-500 uppercase font-semibold">
                          Bounty Value
                        </span>
                        <div className="text-sm font-mono font-bold text-[#A8FF00]">
                          {netPayoutSol} SOL
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">Net 97.5%</span>
                      </div>

                      <div className="px-3 py-1 rounded-full text-xs font-mono font-bold border border-white/10 bg-[#121212]">
                        {obs.status === 'ACCEPTED' && (
                          <span className="text-[#A8FF00] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> ACCEPTED
                          </span>
                        )}
                        {obs.status === 'PENDING' && (
                          <span className="text-[#00F0FF] flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> PENDING REVIEW
                          </span>
                        )}
                        {obs.status === 'REJECTED' && (
                          <span className="text-[#FF0055] flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> REJECTED
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle Section: Image Preview & 4-Pillar Scorecard */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Media Photo & Hash (5 cols) */}
                    <div className="lg:col-span-5 space-y-2">
                      <div className="relative rounded-[18px] overflow-hidden border border-white/10 aspect-video bg-black">
                        <img
                          src={obs.media_url}
                          alt="Physical observation evidence"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-3 bg-[#101010] rounded-[14px] border border-white/[0.06] text-[10px] font-mono space-y-1 text-zinc-400">
                        <div className="flex justify-between">
                          <span>SHA-256 Hash:</span>
                          <span className="text-zinc-200 truncate max-w-[180px]">{obs.sha256_hash}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Contributor:</span>
                          <span className="text-[#A8FF00] truncate max-w-[180px]">{obs.contributor_wallet}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Distance:</span>
                          <span className="text-white font-bold">{obs.distance_meters} meters</span>
                        </div>
                      </div>
                    </div>

                    {/* 4-Pillar Quality Scorecard (7 cols) */}
                    <div className="lg:col-span-7 bg-[#101010] border border-white/[0.07] rounded-[20px] p-5 space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                        <div className="flex items-center space-x-2">
                          <FileCheck2 className="w-4 h-4 text-[#A8FF00]" />
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                            Evidence Quality Scorecard
                          </h3>
                        </div>
                        <span
                          className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                            obs.quality_report.overall_verdict === 'QUALIFIED'
                              ? 'bg-[#A8FF00]/15 text-[#A8FF00] border border-[#A8FF00]/30'
                              : 'bg-[#FFB800]/15 text-[#FFB800] border border-[#FFB800]/30'
                          }`}
                        >
                          {obs.quality_report.overall_verdict}
                        </span>
                      </div>

                      {/* 4 Pillars Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {/* 1. Spatial Consistency */}
                        <div className="p-3 rounded-[14px] bg-[#141414] border border-white/[0.06] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-400 font-semibold">1. Spatial Consistency</span>
                            <span className={obs.quality_report.spatial_consistency.passed ? 'text-[#A8FF00]' : 'text-[#FF0055]'}>
                              {obs.quality_report.spatial_consistency.passed ? 'PASSED' : 'FLAGGED'}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-300">
                            {obs.quality_report.spatial_consistency.details}
                          </p>
                        </div>

                        {/* 2. Temporal Integrity */}
                        <div className="p-3 rounded-[14px] bg-[#141414] border border-white/[0.06] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-400 font-semibold">2. Temporal Integrity</span>
                            <span className={obs.quality_report.temporal_integrity.passed ? 'text-[#A8FF00]' : 'text-[#FF0055]'}>
                              {obs.quality_report.temporal_integrity.passed ? 'PASSED' : 'FLAGGED'}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-300">
                            {obs.quality_report.temporal_integrity.details}
                          </p>
                        </div>

                        {/* 3. Duplicate Check */}
                        <div className="p-3 rounded-[14px] bg-[#141414] border border-white/[0.06] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-400 font-semibold">3. Duplicate Integrity</span>
                            <span className={obs.quality_report.duplicate_check.passed ? 'text-[#A8FF00]' : 'text-[#FF0055]'}>
                              {obs.quality_report.duplicate_check.passed ? 'UNIQUE HASH' : 'DUPLICATE'}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-300">
                            Immutable SHA-256 fingerprint checked against registry.
                          </p>
                        </div>

                        {/* 4. Relevance Assessment */}
                        <div className="p-3 rounded-[14px] bg-[#141414] border border-white/[0.06] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-400 font-semibold">4. Relevance Corroboration</span>
                            <span className="text-[#A8FF00] font-mono">
                              {obs.quality_report.relevance_assessment.confidence_score}% Match
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-300">
                            {obs.quality_report.relevance_assessment.summary}
                          </p>
                        </div>
                      </div>

                      {/* Rejection notice if flagged */}
                      {obs.status === 'REJECTED' && obs.rejection_reason && (
                        <div className="p-3 rounded-[14px] bg-[#FF0055]/10 border border-[#FF0055]/30 text-xs text-[#FF0055]">
                          <span className="font-bold">Rejection Reason:</span> {obs.rejection_reason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dual Maker / Auditor Controls */}
                  {obs.status === 'PENDING' && (
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => setRejectingObsId(obs.id)}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-white/10 bg-[#121212] hover:bg-[#1a1a1a] text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer"
                      >
                        Reject Observation
                      </button>

                      <button
                        type="button"
                        disabled={isSettling}
                        onClick={() => handleApproveAndSettle(obs)}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#A8FF00] hover:brightness-110 disabled:opacity-50 text-black text-xs font-black shadow-lg shadow-[#A8FF00]/25 transition-all cursor-pointer flex items-center justify-center space-x-2"
                      >
                        <span>
                          {isSettling
                            ? 'Broadcasting Solana Settlement...'
                            : 'Approve & Settle Payout →'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectingObsId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B0B0B] border border-white/10 rounded-[24px] max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              Reject Observation Submission
            </h3>
            <p className="text-xs text-zinc-400">
              Select an explicit rejection tag. This will flag the submission as invalid and reset the physical query back to OPEN.
            </p>

            <div className="space-y-2">
              {[
                'Outside Designated Geofence',
                'Blurry / Indistinct Subject',
                'Outdated Scene Evidence',
                'Duplicate Media Hash',
                'Incomplete Physical Perspective',
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setRejectionReason(reason)}
                  className={`w-full text-left p-3 rounded-[14px] text-xs transition-colors cursor-pointer ${
                    rejectionReason === reason
                      ? 'bg-[#A8FF00]/15 text-[#A8FF00] border border-[#A8FF00]/40 font-bold'
                      : 'bg-[#121212] text-zinc-300 hover:bg-[#181818] border border-white/[0.06]'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectingObsId(null)}
                className="flex-1 py-2.5 rounded-full border border-white/10 bg-[#121212] text-xs font-semibold text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="flex-1 py-2.5 rounded-full bg-[#FF0055] hover:brightness-110 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
