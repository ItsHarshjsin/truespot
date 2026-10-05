import React, { useState, useEffect } from 'react';
import { Coordinates, Bounty, Report } from '../types';
import { AskScreen } from './AskScreen';
import { hybridStore } from '../utils/storage';
import { DemoAccount } from './WalletModal';
import {
  PlusCircle,
  FileCheck,
  CheckCircle2,
} from 'lucide-react';

interface MakerPortalProps {
  userCoords: Coordinates;
  activeAccount: DemoAccount;
  onAdjustBalance: (delta: number, role?: 'asker' | 'spotter' | 'verifier') => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'reward' | 'warning') => void;
  onNavigateToRadar?: () => void;
}

export const MakerPortal: React.FC<MakerPortalProps> = ({
  userCoords,
  activeAccount,
  onAdjustBalance,
  onShowToast,
  onNavigateToRadar,
}) => {
  const [subTab, setSubTab] = useState<'create' | 'dashboard'>('create');
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const bList = await hybridStore.getBounties();
      const rList = await hybridStore.getReports();
      setBounties(bList);
      setReports(rList);
    } catch (e) {
      console.warn('Failed loading maker data:', e);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = hybridStore.subscribeToChanges(() => {
      loadData();
    });
    return () => unsub();
  }, []);

  const pendingApprovalBounties = bounties.filter((b) => b.status === 'ANSWERED');

  const totalEscrowLocked = bounties
    .filter((b) => b.status === 'OPEN' || b.status === 'ANSWERED')
    .reduce((sum, b) => sum + b.amount_sol, 0);

  // 1-Click Action: Maker Approves Evidence and Releases Escrow 100% to Worker
  const handleApproveAndRelease = async (bountyId: string) => {
    setApprovingId(bountyId);
    try {
      const targetBounty = bounties.find((b) => b.id === bountyId);
      const amount = targetBounty ? targetBounty.amount_sol : 0.20;
      const payoutTxSig = 'payout_' + Array.from({ length: 48 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

      await hybridStore.updateBountyPayout(bountyId, payoutTxSig);

      // 100% payout to worker/spotter
      onAdjustBalance(amount, 'spotter');

      if (onShowToast) {
        onShowToast(
          'Escrow Released & Settled',
          `Transferred 100% payout (${amount} SOL) to field worker. Status is now PAID.`,
          'reward'
        );
      }
      await loadData();
    } catch (err: any) {
      console.warn('Approval failed:', err);
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Compact Mode Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center space-x-2 text-xs text-[#858585] flex-wrap">
          <span className="text-[#F5F5F5] font-semibold">Verification Dispatch</span>
          <span>•</span>
          <span>Wallet: <strong className="font-mono text-zinc-300">{activeAccount.address}</strong></span>
          <span>•</span>
          <span>Available: <strong className="text-[#A8FF00] font-mono">{activeAccount.balanceSol.toFixed(2)} SOL</strong></span>
        </div>

        {/* Sub-navigation Switcher Pills */}
        <div className="flex items-center bg-[#0D0D0D] p-1 rounded-full border border-white/[0.08] shadow-inner space-x-1 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setSubTab('create')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              subTab === 'create'
                ? 'bg-[#A8FF00] text-black shadow-sm'
                : 'text-[#858585] hover:text-white'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Task Query</span>
          </button>
          <button
            onClick={() => setSubTab('dashboard')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all relative ${
              subTab === 'dashboard'
                ? 'bg-[#A8FF00] text-black shadow-sm'
                : 'text-[#858585] hover:text-white'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>My Tasks ({bounties.length})</span>
            {pendingApprovalBounties.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-black text-[#A8FF00] text-[10px] font-black border border-[#A8FF00] animate-pulse">
                {pendingApprovalBounties.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Sub-tab 1: Create Task */}
      {subTab === 'create' && (
        <AskScreen
          userCoords={userCoords}
          makerWallet={activeAccount.address}
          onBountyCreated={() => {
            setSubTab('dashboard');
            loadData();
          }}
          onAdjustBalance={onAdjustBalance}
          onShowToast={onShowToast}
          onNavigateToRadar={onNavigateToRadar}
        />
      )}

      {/* Sub-tab 2: Maker Dashboard & Review */}
      {subTab === 'dashboard' && (
        <div className="space-y-5">
          {/* Incoming Submissions Awaiting Approval Bento Card */}
          <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-[#A8FF00]" />
                <h2 className="text-[15px] font-bold text-[#F5F5F5] tracking-tight">
                  Incoming Evidence Awaiting Approval ({pendingApprovalBounties.length})
                </h2>
              </div>
              <span className="text-[11px] text-[#A8FF00] font-semibold bg-[#101010] px-3 py-1 rounded-full border border-white/[0.07]">
                100% Payout on Approval
              </span>
            </div>

            {pendingApprovalBounties.length === 0 ? (
              <div className="p-8 text-center bg-[#101010] rounded-xl border border-dashed border-white/[0.07]">
                <p className="text-xs text-[#858585]">
                  No submissions currently waiting for your review. When a field worker snaps photo evidence, it will appear here instantly for 1-click payout approval.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingApprovalBounties.map((b) => {
                  const report = reports.find((r) => r.bounty_id === b.id);

                  return (
                    <div
                      key={b.id}
                      className="p-5 rounded-xl border border-white/[0.07] bg-[#101010] space-y-3 shadow-lg"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#F5F5F5] truncate max-w-[200px]">
                          {b.place_name}
                        </span>
                        <span className="text-xs font-mono font-bold text-[#A8FF00] bg-[#0B0B0B] border border-white/[0.08] px-3 py-0.5 rounded-full">
                          {b.amount_sol} SOL Escrowed
                        </span>
                      </div>

                      <p className="text-xs text-[#858585] italic">"{b.question}"</p>

                      {report && (
                        <div className="space-y-2.5 pt-2 border-t border-white/[0.06]">
                          {report.photo_url && (
                            <div className="rounded-xl overflow-hidden aspect-video bg-black max-h-44 border border-white/[0.06]">
                              <img
                                src={report.photo_url}
                                alt="Worker Evidence"
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}

                          <div className="text-[11px] font-mono bg-[#050505] p-3 rounded-xl border border-white/[0.06] space-y-1 text-zinc-300">
                            <div>Observed Truth: <strong className="text-[#A8FF00]">{report.answer_text}</strong></div>
                            <div>Worker Wallet: <strong className="text-zinc-200">{report.reporter_wallet}</strong></div>
                            <div>GPS Fix: {report.gps_lat.toFixed(4)}, {report.gps_lng.toFixed(4)} (±{report.gps_accuracy || 3}m)</div>
                            <div>Biometric Tremor: {report.gyro_variance || 0.046}g</div>
                            <div className="truncate text-zinc-500">SHA-256: {report.fingerprint}</div>
                          </div>
                        </div>
                      )}

                      <div className="pt-2">
                        <button
                          onClick={() => handleApproveAndRelease(b.id)}
                          disabled={approvingId === b.id}
                          className="w-full py-3 px-5 rounded-full bg-gradient-to-r from-[#A8FF00] to-[#34D399] hover:brightness-105 text-black font-extrabold text-xs tracking-wide shadow-md shadow-[#A8FF00]/20 flex items-center justify-center space-x-2 transition-all active:scale-[0.99] disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4 text-black" />
                          <span>
                            {approvingId === b.id ? 'Releasing Escrow...' : `Approve & Release ${b.amount_sol} SOL 100% Payout`}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* All Created Tasks History Table */}
          <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h2 className="text-[15px] font-bold text-[#F5F5F5] tracking-tight">
                All Created Tasks & Escrow Ledger ({bounties.length})
              </h2>
              <span className="text-xs text-[#858585] font-mono">
                Total Escrow Locked: <strong className="text-[#A8FF00]">{totalEscrowLocked.toFixed(2)} SOL</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[#555555] uppercase font-bold text-[10px]">
                    <th className="py-2.5 px-3">Location & Query</th>
                    <th className="py-2.5 px-3">Escrow Reward</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Escrow Deposit TX</th>
                    <th className="py-2.5 px-3">Payout TX</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] font-mono text-[11px]">
                  {bounties.map((b) => (
                    <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3 font-sans">
                        <div className="font-bold text-[#F5F5F5]">{b.place_name}</div>
                        <div className="text-[#858585] truncate max-w-xs">{b.question}</div>
                      </td>
                      <td className="py-3 px-3 font-bold text-[#A8FF00]">
                        {b.amount_sol} SOL
                      </td>
                      <td className="py-3 px-3 font-sans">
                        <span
                          className={`px-3 py-0.5 rounded-full text-[10px] font-bold border ${
                            b.status === 'PAID'
                              ? 'bg-[#A8FF00]/10 text-[#A8FF00] border-[#A8FF00]/30'
                              : b.status === 'ANSWERED'
                              ? 'bg-[#8B4DFF]/10 text-purple-300 border-purple-500/30 animate-pulse'
                              : 'bg-[#101010] text-[#858585] border-white/[0.07]'
                          }`}
                        >
                          {b.status === 'ANSWERED' ? 'PENDING APPROVAL' : b.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#555555] truncate max-w-[130px]">
                        {b.escrow_tx || '0x8f2a...locked'}
                      </td>
                      <td className="py-3 px-3 text-[#555555] truncate max-w-[130px]">
                        {b.payout_tx ? (
                          <span className="text-[#A8FF00] font-bold">{b.payout_tx.slice(0, 12)}...</span>
                        ) : (
                          <span className="text-zinc-600">Awaiting Settlement</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
