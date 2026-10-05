import React, { useState, useEffect } from 'react';
import { Coordinates, Bounty, Report } from '../types';
import { AskScreen } from './AskScreen';
import { hybridStore } from '../utils/storage';
import { DemoAccount } from './WalletModal';
import {
  PlusCircle,
  FileCheck,
  CheckCircle2,
  Lock,
  ExternalLink,
  Coins,
  Camera,
  MapPin,
  Clock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface MakerPortalProps {
  userCoords: Coordinates;
  activeAccount: DemoAccount;
  onAdjustBalance: (delta: number, role?: 'asker' | 'spotter' | 'verifier') => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'reward' | 'warning') => void;
}

export const MakerPortal: React.FC<MakerPortalProps> = ({
  userCoords,
  activeAccount,
  onAdjustBalance,
  onShowToast,
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
          '🎉 Escrow Released & Settled!',
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
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Maker Account Overview Header - Bento Card */}
      <div className="bento-card p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-300 flex items-center justify-center text-xl font-bold shadow-[0_0_20px_rgba(56,189,248,0.25)]">
            🏗️
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold text-white tracking-tight">Task Maker Control Room</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 font-bold border border-sky-500/30">
                Requester Portal
              </span>
            </div>
            <div className="text-xs font-mono text-slate-400 mt-1">
              Wallet: <span className="text-slate-200 font-bold">{activeAccount.address}</span> • Available: <span className="text-sky-300 font-bold">{activeAccount.balanceSol.toFixed(2)} SOL</span>
            </div>
          </div>
        </div>

        {/* Sub-navigation Switcher Pills (Tactile Keycaps) */}
        <div className="flex items-center bg-black/50 p-1.5 rounded-2xl border border-white/10 shadow-inner self-start md:self-auto space-x-1.5">
          <button
            onClick={() => setSubTab('create')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              subTab === 'create'
                ? 'tactile-keycap-active text-sky-200'
                : 'tactile-keycap text-slate-400 hover:text-white'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create New Task</span>
          </button>
          <button
            onClick={() => setSubTab('dashboard')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
              subTab === 'dashboard'
                ? 'tactile-keycap-active text-sky-200'
                : 'tactile-keycap text-slate-400 hover:text-white'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>My Tasks & Review</span>
            {pendingApprovalBounties.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-sky-400 text-slate-950 text-[10px] font-black animate-pulse shadow-[0_0_10px_rgba(56,189,248,0.8)]">
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
        />
      )}

      {/* Sub-tab 2: Maker Dashboard & Review */}
      {subTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Incoming Submissions Awaiting Approval Bento Card */}
          <div className="bento-card-accent p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-5 h-5 text-sky-400" />
                <h2 className="text-base font-bold text-white tracking-tight">
                  Incoming Evidence Awaiting Approval ({pendingApprovalBounties.length})
                </h2>
              </div>
              <span className="text-xs text-sky-300 font-semibold bg-sky-500/15 px-3 py-1 rounded-full border border-sky-500/30">
                100% Payout on Approval
              </span>
            </div>

            {pendingApprovalBounties.length === 0 ? (
              <div className="p-8 text-center bg-black/40 rounded-2xl border border-dashed border-white/10">
                <p className="text-xs text-slate-400">
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
                      className="p-5 rounded-2xl border border-white/10 bg-black/50 space-y-3 shadow-xl"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate max-w-[200px]">
                          {b.place_name}
                        </span>
                        <span className="text-xs font-mono font-bold text-sky-300 bg-sky-500/15 border border-sky-500/30 px-2.5 py-0.5 rounded-full">
                          {b.amount_sol} SOL Escrowed
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 italic">"{b.question}"</p>

                      {report && (
                        <div className="space-y-2.5 pt-2 border-t border-white/10">
                          {report.photo_url && (
                            <div className="rounded-xl overflow-hidden aspect-video bg-black max-h-44 border border-white/10">
                              <img
                                src={report.photo_url}
                                alt="Worker Evidence"
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}

                          <div className="text-[11px] font-mono bg-black/60 p-3 rounded-xl border border-white/5 space-y-1 text-slate-300">
                            <div>Observed Truth: <strong className="text-sky-300">{report.answer_text}</strong></div>
                            <div>Worker Wallet: <strong className="text-slate-200">{report.reporter_wallet}</strong></div>
                            <div>GPS Fix: {report.gps_lat.toFixed(4)}, {report.gps_lng.toFixed(4)} (±{report.gps_accuracy || 3}m)</div>
                            <div>Biometric Tremor: {report.gyro_variance || 0.046}g</div>
                            <div className="truncate text-slate-400">SHA-256: {report.fingerprint}</div>
                          </div>
                        </div>
                      )}

                      <div className="pt-2">
                        <button
                          onClick={() => handleApproveAndRelease(b.id)}
                          disabled={approvingId === b.id}
                          className="w-full bg-[#0a0e17] hover:bg-[#121927] border border-white/20 text-white rounded-full py-2.5 pl-5 pr-2.5 flex items-center justify-between shadow-[0_10px_30px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.2)] group transition-all active:scale-[0.99] disabled:opacity-50"
                        >
                          <div className="flex items-center space-x-2">
                            <CheckCircle2 className="w-4 h-4 text-sky-400" />
                            <span className="text-xs font-bold text-white">
                              {approvingId === b.id ? 'Releasing Escrow...' : `Approve & Release ${b.amount_sol} SOL`}
                            </span>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-white text-slate-950 flex items-center justify-center font-bold text-xs shadow-md group-hover:scale-105 group-hover:bg-sky-300 transition-transform">
                            ↗
                          </div>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* All Created Tasks History Table */}
          <div className="bento-card p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-base font-bold text-white tracking-tight">
                All Created Bounties & Escrow Ledger ({bounties.length})
              </h2>
              <span className="text-xs text-gray-400 font-mono">
                Total Escrow Locked: <strong className="text-emerald-400">{totalEscrowLocked.toFixed(2)} SOL</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 uppercase font-bold text-[10px]">
                    <th className="py-2.5 px-3">Location & Query</th>
                    <th className="py-2.5 px-3">Escrow Reward</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Escrow Deposit TX</th>
                    <th className="py-2.5 px-3">Payout TX</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                  {bounties.map((b) => (
                    <tr key={b.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 font-sans">
                        <div className="font-bold text-white">{b.place_name}</div>
                        <div className="text-gray-400 truncate max-w-xs">{b.question}</div>
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-400">
                        {b.amount_sol} SOL
                      </td>
                      <td className="py-3 px-3 font-sans">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            b.status === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : b.status === 'ANSWERED'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 animate-pulse'
                              : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                          }`}
                        >
                          {b.status === 'ANSWERED' ? 'PENDING APPROVAL' : b.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-400 truncate max-w-[130px]">
                        {b.escrow_tx || '0x8f2a...locked'}
                      </td>
                      <td className="py-3 px-3 text-gray-400 truncate max-w-[130px]">
                        {b.payout_tx ? (
                          <span className="text-emerald-400 font-bold">{b.payout_tx.slice(0, 12)}...</span>
                        ) : (
                          <span className="text-gray-500">Awaiting Settlement</span>
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
