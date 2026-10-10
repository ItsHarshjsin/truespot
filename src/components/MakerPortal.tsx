import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import confetti from 'canvas-confetti';
import { Coordinates, Bounty, Report } from '../types';
import { AskScreen } from './AskScreen';
import { hybridStore } from '../utils/storage';
import { settleOraclePayout } from '../utils/solana';
import { DemoAccount } from './WalletModal';
import {
  PlusCircle,
  FileCheck,
  CheckCircle2,
  Users,
  Bot,
  Eye,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

interface MakerPortalProps {
  userCoords: Coordinates;
  activeAccount: DemoAccount;
  onAdjustBalance: (delta: number, targetRole?: any, counterRole?: any) => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'reward' | 'warning') => void;
  onNavigateToRadar?: () => void;
  initialSubTab?: 'create' | 'dashboard';
}

export const MakerPortal: React.FC<MakerPortalProps> = ({
  userCoords,
  activeAccount,
  onAdjustBalance,
  onShowToast,
  onNavigateToRadar,
  initialSubTab,
}) => {
  const { publicKey, sendTransaction } = useWallet();
  const [subTab, setSubTab] = useState<'create' | 'dashboard'>(initialSubTab || 'create');

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

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
    // Strict Quota Protection: unsubscribes and removes channel on unmount
    const unsub = hybridStore.subscribeBountiesRealtime(() => {
      loadData();
    });
    return () => unsub();
  }, []);

  // Bounties awaiting approval: either marked ANSWERED, or has incoming reports and status is OPEN
  const pendingApprovalBounties = bounties.filter(
    (b) => b.status === 'ANSWERED' || (b.status === 'OPEN' && reports.some((r) => r.bounty_id === b.id))
  );

  const totalEscrowLocked = bounties
    .filter((b) => b.status === 'OPEN' || b.status === 'ANSWERED')
    .reduce((sum, b) => sum + b.amount_sol, 0);

  // Requirement 5: Multi-Agent Solana Settlement with SPL Memo & Confetti
  const handleApproveAndRelease = async (bountyId: string) => {
    setApprovingId(bountyId);
    try {
      const targetBounty = bounties.find((b) => b.id === bountyId);
      const amount = targetBounty ? targetBounty.amount_sol : 0.20;
      const bReports = reports.filter((r) => r.bounty_id === bountyId);
      const spotterWallets = bReports.map((r) => r.reporter_wallet);
      const attestationHashes = bReports.map((r) => r.fingerprint);

      // Execute on-chain Solana settlement instruction
      const payoutTxSig = await settleOraclePayout({
        sendTransaction,
        makerPublicKey: publicKey,
        bountyId,
        bountyAmountSol: amount,
        spotterWallets,
        attestationHashes,
      });

      // Update Supabase and local state to PAID with anti-self-verification
      await hybridStore.updateBountyPayout(bountyId, payoutTxSig, activeAccount.address);

      // Distribute Devnet SOL to spotter and debit escrow vault
      onAdjustBalance(amount, 'receiver', 'escrow');

      // Trigger canvas-confetti animation (Requirement 5)
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#A8FF00', '#FFFFFF', '#4285FF', '#34D399'],
        });
      } catch (err) {
        console.warn('Confetti animation error:', err);
      }

      if (onShowToast) {
        onShowToast(
          'Escrow Released & Settled on Solana Devnet',
          `Distributed ${amount} SOL to ${Math.max(spotterWallets.length, 1)} spotters (Tx: ${payoutTxSig.slice(0, 10)}...). Status is now PAID.`,
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
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
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
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all relative cursor-pointer ${
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
                  Worker Evidence Awaiting Approval ({pendingApprovalBounties.length})
                </h2>
              </div>
              <span className="text-[11px] text-[#A8FF00] font-semibold bg-[#101010] px-3 py-1 rounded-full border border-white/[0.07]">
                Multi-Agent Solana Settlement
              </span>
            </div>

            {pendingApprovalBounties.length === 0 ? (
              <div className="p-8 text-center bg-[#101010] rounded-xl border border-dashed border-white/[0.07]">
                <p className="text-xs text-[#858585]">
                  No worker evidence currently awaiting approval. When field spotters submit hardware proofs, they appear here instantly in real-time.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingApprovalBounties.map((b) => {
                  // Group incoming attestations by Bounty ID (Requirement 5)
                  const bountyReports = reports.filter((r) => r.bounty_id === b.id);
                  const requiredSpotters = b.max_spotters || 1;
                  const isConsensusReached = bountyReports.length >= requiredSpotters;
                  const progressRatio = Math.min(bountyReports.length / requiredSpotters, 1);

                  return (
                    <div
                      key={b.id}
                      className="p-5 rounded-xl border border-white/[0.07] bg-[#101010] space-y-3.5 shadow-lg flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        {/* Title & Escrow Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-[#F5F5F5] truncate max-w-[180px]">
                              {b.place_name}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#A8FF00]/10 text-[#A8FF00] border border-[#A8FF00]/25">
                              {b.bounty_type || 'BOOLEAN'}
                            </span>
                          </div>
                          <span className="text-xs font-mono font-bold text-[#A8FF00] bg-[#0B0B0B] border border-white/[0.08] px-3 py-0.5 rounded-full">
                            {b.amount_sol} SOL Escrowed
                          </span>
                        </div>

                        <p className="text-xs text-[#858585] italic">"{b.question}"</p>

                        {/* Swarm Consensus Progress Bar (Requirement 5) */}
                        {requiredSpotters > 1 && (
                          <div className="p-3 rounded-xl bg-[#050505] border border-white/[0.06] space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-zinc-300 flex items-center space-x-1.5">
                                <Users className="w-3.5 h-3.5 text-[#A8FF00]" />
                                <span>Swarm Consensus Quorum</span>
                              </span>
                              <span className="font-mono text-[#A8FF00] font-bold">
                                {isConsensusReached
                                  ? `Consensus Reached: ${bountyReports.length}/${requiredSpotters}`
                                  : `Progress: ${bountyReports.length}/${requiredSpotters} (${Math.round(progressRatio * 100)}%)`}
                              </span>
                            </div>
                            <div className="w-full bg-[#141414] h-2 rounded-full overflow-hidden flex">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isConsensusReached
                                    ? 'bg-[#A8FF00] shadow-[0_0_10px_rgba(168,255,0,0.5)]'
                                    : 'bg-[#4285FF]'
                                }`}
                                style={{ width: `${Math.round(progressRatio * 100)}%` }}
                              />
                            </div>
                            <div className="text-[10px] text-[#666666] flex justify-between">
                              <span>Per-Spotter Share: {(b.amount_sol / requiredSpotters).toFixed(3)} SOL</span>
                              <span>{isConsensusReached ? '✓ Quorum Satisfied' : 'Awaiting Swarm'}</span>
                            </div>
                          </div>
                        )}

                        {/* Benchmark Reference Media (if specified by Maker) */}
                        {b.reference_media_url && (
                          <div className="p-2.5 rounded-xl bg-[#050505] border border-white/[0.06] flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-black shrink-0 border border-white/[0.1]">
                              <img
                                src={b.reference_media_url}
                                alt="Benchmark"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="text-[11px] leading-tight">
                              <span className="text-[#858585] block font-semibold">Reference Target:</span>
                              <span className="text-zinc-300">Target Object Specified by Maker</span>
                            </div>
                          </div>
                        )}

                        {/* List of Participating Spotters and Attestations */}
                        <div className="space-y-2.5 pt-1">
                          {bountyReports.map((report, idx) => (
                            <div
                              key={report.id}
                              className="p-3 rounded-xl bg-[#050505] border border-white/[0.06] space-y-2"
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-zinc-300 flex items-center space-x-1">
                                  <span>Spotter #{idx + 1}:</span>
                                  <strong className="text-zinc-100 font-mono">{report.reporter_wallet}</strong>
                                </span>
                                <span className="text-[10px] text-[#A8FF00] font-mono bg-black px-2 py-0.5 rounded border border-[#A8FF00]/25">
                                  {report.media_type || 'image'}
                                </span>
                              </div>

                              {report.photo_url && (
                                <div className="rounded-lg overflow-hidden aspect-video bg-black max-h-36 border border-white/[0.06]">
                                  {report.media_type === 'video' ? (
                                    <video
                                      src={report.photo_url}
                                      controls
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <img
                                      src={report.photo_url}
                                      alt="Worker Evidence"
                                      className="w-full h-full object-contain"
                                    />
                                  )}
                                </div>
                              )}

                              {/* AI Vision Pre-Check Badge (if report has it) */}
                              {report.ai_confidence_score && (
                                <div className="p-2 rounded-lg bg-purple-950/30 border border-purple-500/30 text-[10px] space-y-1">
                                  <div className="flex items-center justify-between text-purple-300 font-bold">
                                    <span className="flex items-center space-x-1">
                                      <Bot className="w-3 h-3 text-purple-400" />
                                      <span>AI Vision Pre-Check Verified</span>
                                    </span>
                                    <span className="font-mono text-[#A8FF00]">
                                      {report.ai_confidence_score.score}% Match
                                    </span>
                                  </div>
                                  <p className="text-zinc-400 italic">
                                    {report.ai_confidence_score.reasoning}
                                  </p>
                                </div>
                              )}

                              <div className="text-[10px] font-mono text-zinc-400 space-y-0.5">
                                <div>Answer: <strong className="text-[#A8FF00] font-sans">{report.answer_text}</strong></div>
                                <div>GPS: {report.gps_lat.toFixed(4)}, {report.gps_lng.toFixed(4)} (±{report.gps_accuracy || 3}m)</div>
                                <div>Tremor: {report.gyro_variance || 0.046}g • Nonce: {report.blockhash_stamp?.slice(0, 10) || 'Devnet'}</div>
                                <div className="truncate text-zinc-500">SHA-256: {report.fingerprint}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Settlement Action Button with Self-Verification Guard */}
                      {(() => {
                        const hasSelfSubmission = bountyReports.some(
                          (r) => r.reporter_wallet && r.reporter_wallet.trim().toLowerCase() === activeAccount.address.trim().toLowerCase()
                        );

                        return (
                          <div className="pt-2 space-y-2">
                            {hasSelfSubmission && (
                              <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-300 flex items-center space-x-2">
                                <span>⚠️ Self-verification prohibited: You cannot settle a bounty containing your own evidence submission ({activeAccount.address}). An independent verifier must settle.</span>
                              </div>
                            )}
                            <button
                              onClick={() => handleApproveAndRelease(b.id)}
                              disabled={approvingId === b.id || hasSelfSubmission || (!isConsensusReached && requiredSpotters > 1 && bountyReports.length === 0)}
                              className={`w-full py-3.5 px-5 rounded-full text-black font-extrabold text-xs tracking-wide shadow-md flex items-center justify-center space-x-2 transition-all active:scale-[0.99] ${
                                hasSelfSubmission
                                  ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed opacity-50'
                                  : 'bg-gradient-to-r from-[#A8FF00] to-[#34D399] hover:brightness-105 shadow-[#A8FF00]/20 cursor-pointer disabled:opacity-50'
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4 text-black" />
                              <span>
                                {approvingId === b.id
                                  ? 'Executing Solana Batched Settlement...'
                                  : hasSelfSubmission
                                  ? 'Self-Verification Prohibited'
                                  : requiredSpotters > 1
                                  ? `Confirm Truth & Release ${b.amount_sol} SOL Swarm Payout`
                                  : `Confirm Truth & Release ${b.amount_sol} SOL Payout`}
                              </span>
                            </button>
                          </div>
                        );
                      })()}
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
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Reward</th>
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
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#141414] text-zinc-300 border border-white/[0.06]">
                          {b.bounty_type || 'BOOLEAN'}
                          {b.max_spotters && b.max_spotters > 1 ? ` (${b.max_spotters}x)` : ''}
                        </span>
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
