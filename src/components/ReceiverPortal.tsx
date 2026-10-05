import React, { useState, useEffect } from 'react';
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
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  MapPin,
  Clock,
} from 'lucide-react';

interface ReceiverPortalProps {
  userCoords: Coordinates;
  activeAccount: DemoAccount;
  onSetUserLocation: (lat: number, lng: number, name?: string) => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'reward' | 'warning') => void;
}

export const ReceiverPortal: React.FC<ReceiverPortalProps> = ({
  userCoords,
  activeAccount,
  onSetUserLocation,
  onShowToast,
}) => {
  const [subTab, setSubTab] = useState<'radar' | 'report' | 'earnings'>('radar');
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
    const unsub = hybridStore.subscribeToChanges(() => {
      loadData();
    });
    return () => unsub();
  }, []);

  const totalSettledEarnings = bounties
    .filter((b) => b.status === 'PAID')
    .reduce((sum, b) => sum + b.amount_sol, 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Receiver Account Overview Header - Bento Card */}
      <div className="bg-[#121212] border border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl shadow-black/40">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-lime-400/10 text-lime-400 border border-lime-400/30 flex items-center justify-center text-xl font-bold shadow-[0_0_20px_rgba(163,230,53,0.2)]">
            📸
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold text-white tracking-tight">Task Receiver / Field Earner Hub</h1>
              <span className="text-xs px-3 py-0.5 rounded-full bg-lime-400/10 text-lime-400 font-bold border border-lime-400/30">
                Worker Portal
              </span>
            </div>
            <div className="text-xs font-mono text-zinc-400 mt-1">
              Wallet: <span className="text-zinc-200 font-bold">{activeAccount.address}</span> • Available: <span className="text-lime-400 font-bold">{activeAccount.balanceSol.toFixed(2)} SOL</span>
            </div>
          </div>
        </div>

        {/* Sub-navigation Switcher Pills */}
        <div className="flex items-center bg-[#0a0a0a] p-1.5 rounded-full border border-zinc-800 self-start md:self-auto space-x-1.5">
          <button
            onClick={() => setSubTab('radar')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              subTab === 'radar'
                ? 'bg-lime-400 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>200m Radar</span>
          </button>
          <button
            onClick={() => setSubTab('report')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              subTab === 'report'
                ? 'bg-lime-400 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Submit Evidence</span>
          </button>
          <button
            onClick={() => setSubTab('earnings')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              subTab === 'earnings'
                ? 'bg-lime-400 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>My Earnings</span>
          </button>
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
          }}
          onSelectStateBounty={(id) => {
            setSelectedBountyId(id);
            setSubTab('earnings');
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
            setSubTab('earnings');
            loadData();
          }}
          onBackToNearby={() => setSubTab('radar')}
          onShowToast={onShowToast}
        />
      )}

      {/* Sub-tab 3: Receiver Earnings & Submitted Proofs */}
      {subTab === 'earnings' && (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#121212] border border-zinc-800 rounded-3xl p-5 text-center shadow-lg shadow-black/30">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Total Settled SOL</span>
              <span className="text-2xl font-extrabold text-lime-400 font-mono">
                {totalSettledEarnings.toFixed(2)} SOL
              </span>
            </div>
            <div className="bg-[#121212] border border-zinc-800 rounded-3xl p-5 text-center shadow-lg shadow-black/30">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Submitted Attestations</span>
              <span className="text-2xl font-extrabold text-white font-mono">
                {reports.length}
              </span>
            </div>
            <div className="bg-[#121212] border border-zinc-800 rounded-3xl p-5 text-center shadow-lg shadow-black/30">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Pending Review</span>
              <span className="text-2xl font-extrabold text-purple-400 font-mono">
                {bounties.filter((b) => b.status === 'ANSWERED').length}
              </span>
            </div>
          </div>

          {/* Submitted Evidence Gallery & Proofs */}
          <div className="bg-[#121212] border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl shadow-black/40">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-lime-400" />
                <h2 className="text-base font-bold text-white tracking-tight">
                  My Submitted Field Proofs & Hardware Stamps ({reports.length})
                </h2>
              </div>
              <span className="text-xs text-lime-400 font-mono">Cryptographic Verification</span>
            </div>

            {reports.length === 0 ? (
              <div className="p-8 text-center bg-[#18181b]/50 rounded-2xl border border-dashed border-zinc-800">
                <p className="text-xs text-zinc-400">
                  No reports submitted yet. Switch to the 200m Radar tab, walk into geofence range, and snap photo evidence to earn SOL!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reports.map((report) => {
                  const targetBounty = bounties.find((b) => b.id === report.bounty_id);

                  return (
                    <div
                      key={report.id}
                      className="p-5 rounded-2xl border border-zinc-800 bg-[#18181b] space-y-3 shadow-lg"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">
                          {targetBounty ? targetBounty.place_name : 'Spot Location'}
                        </span>
                        <span className="text-[10px] font-mono bg-lime-400/10 px-3 py-0.5 rounded-full border border-lime-400/30 font-bold text-lime-400">
                          {targetBounty ? `${targetBounty.amount_sol} SOL` : '0.20 SOL'}
                        </span>
                      </div>

                      {report.photo_url && (
                        <div className="rounded-xl overflow-hidden aspect-video bg-black max-h-40 border border-zinc-800">
                          <img
                            src={report.photo_url}
                            alt="Captured proof"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}

                      <div className="text-[11px] font-mono space-y-1 bg-[#0a0a0a] p-3 rounded-xl border border-zinc-800/80 text-zinc-300">
                        <div>Answer: <strong className="text-lime-400">{report.answer_text}</strong></div>
                        <div className="truncate">SHA-256: {report.fingerprint}</div>
                        <div>GPS Fix: {report.gps_lat.toFixed(4)}, {report.gps_lng.toFixed(4)} (±{report.gps_accuracy || 3}m)</div>
                        <div>Biometric Tremor: {report.gyro_variance || 0.046}g</div>
                        <div className="truncate text-zinc-500">Blockhash: {report.blockhash_stamp || '8Zk9jNm...'}</div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-zinc-500">
                          {new Date(report.observed_at).toLocaleString()}
                        </span>
                        <span className="font-bold text-lime-400 flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" />
                          <span>
                            {targetBounty?.status === 'PAID'
                              ? 'Paid & Settled ✓'
                              : 'Pending Approval (Escrow Locked)'}
                          </span>
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
    </div>
  );
};
