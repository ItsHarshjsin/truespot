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
  ShieldCheck,
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
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Compact Mode Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center space-x-2 text-xs text-[#858585] flex-wrap">
          <span className="text-[#F5F5F5] font-semibold">Field Earner Radar</span>
          <span>•</span>
          <span>Wallet: <strong className="font-mono text-zinc-300">{activeAccount.address}</strong></span>
          <span>•</span>
          <span>Available: <strong className="text-[#A8FF00] font-mono">{activeAccount.balanceSol.toFixed(2)} SOL</strong></span>
        </div>

        {/* Sub-navigation Switcher Pills */}
        <div className="flex items-center bg-[#0D0D0D] p-1 rounded-full border border-white/[0.08] shadow-inner space-x-1 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setSubTab('radar')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              subTab === 'radar'
                ? 'bg-[#A8FF00] text-black shadow-sm'
                : 'text-[#858585] hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>200m Radar</span>
          </button>
          <button
            onClick={() => setSubTab('report')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              subTab === 'report'
                ? 'bg-[#A8FF00] text-black shadow-sm'
                : 'text-[#858585] hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Submit Evidence</span>
          </button>
          <button
            onClick={() => setSubTab('earnings')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              subTab === 'earnings'
                ? 'bg-[#A8FF00] text-black shadow-sm'
                : 'text-[#858585] hover:text-white'
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
        <div className="space-y-5">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[18px] p-4 text-center shadow-lg">
              <span className="text-[10px] font-semibold text-[#858585] uppercase tracking-wider block">Total Settled SOL</span>
              <span className="text-xl font-extrabold text-[#A8FF00] font-mono">
                {totalSettledEarnings.toFixed(2)} SOL
              </span>
            </div>
            <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[18px] p-4 text-center shadow-lg">
              <span className="text-[10px] font-semibold text-[#858585] uppercase tracking-wider block">Submitted Attestations</span>
              <span className="text-xl font-extrabold text-[#F5F5F5] font-mono">
                {reports.length}
              </span>
            </div>
            <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[18px] p-4 text-center shadow-lg">
              <span className="text-[10px] font-semibold text-[#858585] uppercase tracking-wider block">Pending Review</span>
              <span className="text-xl font-extrabold text-amber-400 font-mono">
                {bounties.filter((b) => b.status === 'ANSWERED').length}
              </span>
            </div>
          </div>

          {/* Submitted Evidence Gallery & Proofs */}
          <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-[#A8FF00]" />
                <h2 className="text-[15px] font-bold text-[#F5F5F5] tracking-tight">
                  My Submitted Field Proofs & Hardware Stamps ({reports.length})
                </h2>
              </div>
              <span className="text-xs text-[#A8FF00] font-mono">Cryptographic Verification</span>
            </div>

            {reports.length === 0 ? (
              <div className="p-8 text-center bg-[#101010] rounded-2xl border border-dashed border-white/[0.08] flex flex-col items-center justify-center space-y-2">
                <p className="text-xs text-[#858585]">
                  No reports submitted yet. Walk into any active 200m geofence and snap photo evidence to earn SOL!
                </p>
                <button
                  onClick={() => setSubTab('radar')}
                  className="mt-1 px-4 py-2 rounded-full bg-[#A8FF00] hover:bg-[#b8ff24] text-black font-black text-xs shadow-md shadow-[#A8FF00]/25 transition-all cursor-pointer"
                >
                  Open 200m Radar →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reports.map((report) => {
                  const targetBounty = bounties.find((b) => b.id === report.bounty_id);

                  return (
                    <div
                      key={report.id}
                      className="p-4 rounded-xl border border-white/[0.07] bg-[#101010] space-y-3 shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#F5F5F5]">
                          {targetBounty ? targetBounty.place_name : 'Spot Location'}
                        </span>
                        <span className="text-[10px] font-mono bg-[#0B0B0B] px-2.5 py-0.5 rounded-full border border-white/[0.08] font-bold text-[#A8FF00]">
                          {targetBounty ? `${targetBounty.amount_sol} SOL` : '0.20 SOL'}
                        </span>
                      </div>

                      {report.photo_url && (
                        <div className="rounded-xl overflow-hidden aspect-video bg-black max-h-40 border border-white/[0.06]">
                          <img
                            src={report.photo_url}
                            alt="Captured proof"
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

                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-[#858585]">
                          {new Date(report.observed_at).toLocaleString()}
                        </span>
                        <span className="font-bold text-[#A8FF00] flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#A8FF00]" />
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
