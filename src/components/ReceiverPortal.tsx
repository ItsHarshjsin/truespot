import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coordinates, Bounty, Report } from '../types';
import { NearbyScreen } from './NearbyScreen';
import { ReportScreen } from './ReportScreen';
import { hybridStore } from '../utils/storage';
import { DemoAccount } from './WalletModal';
import {
  Compass,
  Camera,
  Coins,
  CheckCircle2,
  ShieldCheck,
  FileCheck2,
  Clock,
  ExternalLink,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface ReceiverPortalProps {
  userCoords: Coordinates;
  activeAccount: DemoAccount;
  onSetUserLocation: (lat: number, lng: number, name?: string) => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'reward' | 'warning') => void;
  initialSubTab?: 'radar' | 'report' | 'earnings' | 'submissions';
}

export const ReceiverPortal: React.FC<ReceiverPortalProps> = ({
  userCoords,
  activeAccount,
  onSetUserLocation,
  onShowToast,
  initialSubTab,
}) => {
  const navigate = useNavigate();
  const [subTab, setSubTab] = useState<'radar' | 'report' | 'earnings' | 'submissions'>(initialSubTab || 'radar');
  const [submissionsFilter, setSubmissionsFilter] = useState<'all' | 'pending' | 'paid'>('all');

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [selectedBountyId, setSelectedBountyId] = useState<string | undefined>(undefined);
  const [reports, setReports] = useState<Report[]>([]);
  const [bounties, setBounties] = useState<Bounty[]>([]);

  const loadData = async () => {
    try {
      const bList = await hybridStore.getBounties();
      const rList = await hybridStore.getReports();
      setBounties(bList);
      setReports(rList);
    } catch (e) {
      console.warn('Failed loading receiver data:', e);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = hybridStore.subscribeBountiesRealtime(() => {
      loadData();
    });
    return () => unsub();
  }, []);

  const totalSettledEarnings = bounties
    .filter((b) => b.status === 'PAID')
    .reduce((sum, b) => sum + b.amount_sol, 0);

  const filteredReports = reports.filter((r) => {
    const targetBounty = bounties.find((b) => b.id === r.bounty_id);
    if (submissionsFilter === 'paid') return targetBounty?.status === 'PAID' || r.status === 'ACCEPTED';
    if (submissionsFilter === 'pending') return targetBounty?.status !== 'PAID' && r.status !== 'ACCEPTED';
    return true;
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Clean Status & Workspace Header */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center space-x-2 text-xs text-[#858585] flex-wrap">
          <span className="text-[#F5F5F5] font-semibold">Field Spotter Workspace</span>
          <span>•</span>
          <span>Wallet: <strong className="font-mono text-zinc-300">{activeAccount.address}</strong></span>
          <span>•</span>
          <span>Available: <strong className="text-[#A8FF00] font-mono">{activeAccount.balanceSol.toFixed(2)} SOL</strong></span>
        </div>

        <div className="flex items-center space-x-2 text-xs text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-[#A8FF00] animate-pulse" />
          <span className="font-medium text-zinc-300">200m Verification Radar Active</span>
        </div>
      </div>

      {/* Sub-tab 1: Available Tasks Radar */}
      {subTab === 'radar' && (
        <NearbyScreen
          userCoords={userCoords}
          selectedBountyId={selectedBountyId}
          onSelectBounty={(id) => setSelectedBountyId(id)}
          onSelectReportBounty={(id) => {
            setSelectedBountyId(id);
            setSubTab('report');
            navigate('/report');
          }}
          onSelectStateBounty={(id) => {
            setSelectedBountyId(id);
            setSubTab('earnings');
            navigate('/earnings');
          }}
          onSetUserLocation={onSetUserLocation}
        />
      )}

      {/* Sub-tab 2: Evidence Submission */}
      {subTab === 'report' && (
        <ReportScreen
          bountyId={selectedBountyId}
          userCoords={userCoords}
          activeReporterWallet={activeAccount.address}
          onReportSubmitted={(bId) => {
            setSelectedBountyId(bId);
            setSubTab('submissions');
            navigate('/submissions');
            loadData();
          }}
          onBackToNearby={() => {
            setSubTab('radar');
            navigate('/nearby');
          }}
          onShowToast={onShowToast}
        />
      )}

      {/* Sub-tab 3: Spotter Submissions Gallery */}
      {subTab === 'submissions' && (
        <div className="space-y-5">
          <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
              <div className="flex items-center space-x-2">
                <FileCheck2 className="w-4 h-4 text-[#A8FF00]" />
                <h2 className="text-[15px] font-bold text-[#F5F5F5] tracking-tight">
                  Submitted Ground Proofs & Hardware Nonces ({filteredReports.length})
                </h2>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center bg-[#121212] p-1 rounded-full border border-white/[0.06] space-x-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSubmissionsFilter('all')}
                  className={`px-3 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
                    submissionsFilter === 'all' ? 'bg-[#A8FF00] text-black font-bold' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  All ({reports.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSubmissionsFilter('pending')}
                  className={`px-3 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
                    submissionsFilter === 'pending' ? 'bg-[#A8FF00] text-black font-bold' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Pending ({reports.filter((r) => bounties.find((b) => b.id === r.bounty_id)?.status !== 'PAID').length})
                </button>
                <button
                  type="button"
                  onClick={() => setSubmissionsFilter('paid')}
                  className={`px-3 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
                    submissionsFilter === 'paid' ? 'bg-[#A8FF00] text-black font-bold' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Paid & Settled ({reports.filter((r) => bounties.find((b) => b.id === r.bounty_id)?.status === 'PAID').length})
                </button>
              </div>
            </div>

            {filteredReports.length === 0 ? (
              <div className="p-12 text-center bg-[#101010] rounded-2xl border border-dashed border-white/[0.08] flex flex-col items-center justify-center space-y-3">
                <p className="text-xs text-[#858585] max-w-sm">
                  {submissionsFilter === 'all'
                    ? 'No reports submitted yet. Walk within any 200m geofence and snap verifiable ground proof to earn SOL.'
                    : `No reports matching the ${submissionsFilter} filter.`}
                </p>
                <button
                  onClick={() => {
                    setSubTab('radar');
                    navigate('/nearby');
                  }}
                  className="px-4 py-2 rounded-full bg-[#A8FF00] hover:bg-[#b8ff24] text-black font-black text-xs shadow-md shadow-[#A8FF00]/25 transition-all cursor-pointer"
                >
                  Open 200m Radar →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredReports.map((report) => {
                  const targetBounty = bounties.find((b) => b.id === report.bounty_id);
                  const isPaid = targetBounty?.status === 'PAID' || report.status === 'ACCEPTED';

                  return (
                    <div
                      key={report.id}
                      className="p-4 rounded-xl border border-white/[0.07] bg-[#101010] space-y-3 shadow-md flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#F5F5F5] truncate max-w-[200px]">
                            {targetBounty ? targetBounty.place_name : 'Spot Location'}
                          </span>
                          <span className="text-[10px] font-mono bg-[#0B0B0B] px-2.5 py-0.5 rounded-full border border-white/[0.08] font-bold text-[#A8FF00]">
                            {targetBounty ? `${targetBounty.amount_sol} SOL` : '0.20 SOL'}
                          </span>
                        </div>

                        {report.photo_url && (
                          <div className="rounded-xl overflow-hidden aspect-video bg-black max-h-44 border border-white/[0.06]">
                            <img
                              src={report.photo_url}
                              alt="Captured ground proof"
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}

                        <div className="text-[11px] font-mono space-y-1 bg-[#050505] p-2.5 rounded-xl border border-white/[0.05] text-[#858585]">
                          <div>Answer: <strong className="text-[#A8FF00]">{report.answer_text}</strong></div>
                          <div className="truncate">SHA-256: {report.fingerprint}</div>
                          <div>GPS Fix: {report.gps_lat.toFixed(4)}, {report.gps_lng.toFixed(4)} (±{report.gps_accuracy || 3}m)</div>
                          <div>Biometric Tremor: {report.gyro_variance || 0.046}g</div>
                          <div className="truncate text-zinc-500">Blockhash: {report.blockhash_stamp || '8Zk9jNm...'}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/[0.06]">
                        <span className="text-[#858585]">
                          {new Date(report.observed_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                        <span className={`font-bold flex items-center space-x-1 ${isPaid ? 'text-[#A8FF00]' : 'text-amber-400'}`}>
                          {isPaid ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#A8FF00]" />
                              <span>Paid & Settled ✓</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              <span>Pending Independent Review</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-tab 4: Spotter Earnings & Payout Ledger */}
      {subTab === 'earnings' && (
        <div className="space-y-5">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[18px] p-4 text-center shadow-lg">
              <span className="text-[10px] font-semibold text-[#858585] uppercase tracking-wider block">Total Settled SOL</span>
              <span className="text-xl sm:text-2xl font-extrabold text-[#A8FF00] font-mono">
                {totalSettledEarnings.toFixed(3)} SOL
              </span>
            </div>
            <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[18px] p-4 text-center shadow-lg">
              <span className="text-[10px] font-semibold text-[#858585] uppercase tracking-wider block">Submitted Attestations</span>
              <span className="text-xl sm:text-2xl font-extrabold text-[#F5F5F5] font-mono">
                {reports.length}
              </span>
            </div>
            <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[18px] p-4 text-center shadow-lg">
              <span className="text-[10px] font-semibold text-[#858585] uppercase tracking-wider block">Pending Review</span>
              <span className="text-xl sm:text-2xl font-extrabold text-amber-400 font-mono">
                {reports.filter((r) => bounties.find((b) => b.id === r.bounty_id)?.status !== 'PAID').length}
              </span>
            </div>
          </div>

          {/* Settled Payouts Table */}
          <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center space-x-2">
                <Coins className="w-4 h-4 text-[#A8FF00]" />
                <h2 className="text-[15px] font-bold text-[#F5F5F5] tracking-tight">
                  Settled Payout Ledger & Solana Devnet Receipts
                </h2>
              </div>
              <span className="text-xs text-[#A8FF00] font-mono">Instant Payouts</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] text-zinc-500 uppercase font-bold text-[10px]">
                    <th className="py-2.5 px-3">Location & Query</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Solana Devnet Signature</th>
                    <th className="py-2.5 px-3 text-right">Settled Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] font-mono text-[11px]">
                  {reports.map((report) => {
                    const bounty = bounties.find((b) => b.id === report.bounty_id);
                    const isPaid = bounty?.status === 'PAID' || report.status === 'ACCEPTED';
                    const txSig = bounty?.payout_tx || (report as any).tx_sig;

                    return (
                      <tr key={report.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-3 font-sans">
                          <div className="font-bold text-white truncate max-w-xs">
                            {bounty?.place_name || 'Designated Coordinates'}
                          </div>
                          <div className="text-zinc-400 text-[11px] truncate max-w-xs">
                            {report.answer_text}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-bold text-[#A8FF00]">
                          {bounty ? `${bounty.amount_sol.toFixed(2)} SOL` : '0.20 SOL'}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                              isPaid
                                ? 'bg-[#A8FF00]/15 text-[#A8FF00] border border-[#A8FF00]/30'
                                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {isPaid ? 'PAID ✓' : 'IN REVIEW'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {txSig ? (
                            <a
                              href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#A8FF00] hover:underline flex items-center gap-1 font-mono text-[10px]"
                              title="View Payout Transaction on Solana Devnet Explorer"
                            >
                              <span>{txSig.slice(0, 10)}...</span>
                              <ExternalLink className="w-2.5 h-2.5 text-[#A8FF00]" />
                            </a>
                          ) : (
                            <span className="text-zinc-600 font-mono text-[10px]">Awaiting Settlement</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-zinc-400 font-sans text-[11px]">
                          {new Date(report.observed_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
