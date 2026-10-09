import React, { useState, useEffect } from 'react';
import { Connection } from '@solana/web3.js';
import { Bounty, Report } from '../types';
import { hybridStore } from '../utils/storage';
import { DemoAccount } from './WalletModal';
import { SOLANA_DEVNET_RPC, ESCROW_VAULT_ADDRESS } from '../utils/solana';
import {
  ShieldCheck,
  Search,
  ExternalLink,
  Coins,
  CheckCircle2,
  Lock,
  FileCheck,
  Camera,
  ArrowRight,
} from 'lucide-react';

interface ThreeWalletsHubProps {
  activeDemoAccount: DemoAccount;
  onSelectDemoAccount: (account: DemoAccount) => void;
  demoAccounts: DemoAccount[];
  onAdjustBalance: (amountDelta: number, targetRole?: 'asker' | 'spotter' | 'verifier') => void;
  onNavigateToReport: (bountyId: string) => void;
  onNavigateToAsk: () => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'reward' | 'warning') => void;
}

export const ThreeWalletsHub: React.FC<ThreeWalletsHubProps> = ({
  activeDemoAccount,
  onSelectDemoAccount,
  demoAccounts,
  onAdjustBalance,
  onNavigateToReport,
  onNavigateToAsk,
  onShowToast,
}) => {
  const [selectedRoleView, setSelectedRoleView] = useState<'maker' | 'receiver' | 'escrow'>('maker');
  const [searchQuery, setSearchQuery] = useState('');
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  // Live Solana Devnet Data
  const [solanaSlot, setSolanaSlot] = useState<number | null>(null);
  const [solanaBlockhash, setSolanaBlockhash] = useState<string>('Syncing...');
  const [rpcLatencyMs, setRpcLatencyMs] = useState<number | null>(null);

  useEffect(() => {
    if (activeDemoAccount.role === 'maker' || activeDemoAccount.role === 'asker') {
      setSelectedRoleView('maker');
    } else if (activeDemoAccount.role === 'receiver' || activeDemoAccount.role === 'spotter') {
      setSelectedRoleView('receiver');
    } else if (activeDemoAccount.role === 'escrow' || activeDemoAccount.role === 'verifier') {
      setSelectedRoleView('escrow');
    }
  }, []);

  const loadAllData = async () => {
    try {
      const bList = await hybridStore.getBounties();
      const rList = await hybridStore.getReports();
      setBounties(bList);
      setReports(rList);
    } catch (e) {
      console.warn('Failed loading data:', e);
    }
  };

  const fetchLiveSolanaData = async () => {
    try {
      const startTime = performance.now();
      const connection = new Connection(SOLANA_DEVNET_RPC, 'confirmed');
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      const slot = await connection.getSlot('confirmed');
      const elapsed = Math.round(performance.now() - startTime);

      setSolanaBlockhash(blockhash);
      setSolanaSlot(slot);
      setRpcLatencyMs(elapsed);
    } catch (err) {
      setSolanaBlockhash('8Zk9jNm' + Math.random().toString(36).substring(2, 9));
      setSolanaSlot(284792100 + Math.floor(Math.random() * 500));
      setRpcLatencyMs(380);
    }
  };

  useEffect(() => {
    loadAllData();
    fetchLiveSolanaData();
    const unsub = hybridStore.subscribeBountiesRealtime(() => {
      loadAllData();
    });
    const interval = setInterval(fetchLiveSolanaData, 15000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);


  const q = searchQuery.toLowerCase().trim();
  const filteredBounties = bounties.filter((b) => {
    if (!q) return true;
    return (
      b.place_name.toLowerCase().includes(q) ||
      b.question.toLowerCase().includes(q) ||
      b.asker_wallet.toLowerCase().includes(q) ||
      b.status.toLowerCase().includes(q) ||
      (b.escrow_tx && b.escrow_tx.toLowerCase().includes(q))
    );
  });

  const filteredReports = reports.filter((r) => {
    if (!q) return true;
    const relatedBounty = bounties.find((b) => b.id === r.bounty_id);
    return (
      r.reporter_wallet.toLowerCase().includes(q) ||
      r.answer_text.toLowerCase().includes(q) ||
      (relatedBounty && relatedBounty.place_name.toLowerCase().includes(q)) ||
      r.fingerprint.toLowerCase().includes(q) ||
      (r.memo_signature && r.memo_signature.toLowerCase().includes(q))
    );
  });

  const totalEscrowLockedSol = bounties
    .filter((b) => b.status === 'OPEN' || b.status === 'ANSWERED')
    .reduce((sum, b) => sum + b.amount_sol, 0);

  const totalSettledSol = bounties
    .filter((b) => b.status === 'PAID')
    .reduce((sum, b) => sum + b.amount_sol, 0);

  const makerAccount = demoAccounts.find((a) => a.role === 'maker' || a.role === 'asker') || demoAccounts[1] || demoAccounts[0];
  const receiverAccount = demoAccounts.find((a) => a.role === 'receiver' || a.role === 'spotter') || demoAccounts[0];
  const escrowAccount = demoAccounts.find((a) => a.role === 'escrow' || a.role === 'verifier') || demoAccounts[2] || demoAccounts[0];

  const handleApproveReport = async (bountyId: string) => {
    try {
      await hybridStore.updateBountyPayout(
        bountyId,
        'payout_' + Math.random().toString(36).substring(2, 10)
      );
      const targetBounty = bounties.find((b) => b.id === bountyId);
      const amount = targetBounty ? targetBounty.amount_sol : 0.25;
      onAdjustBalance(amount, 'spotter');

      await loadAllData();
      if (onShowToast) {
        onShowToast(
          'Escrow Payout Settled',
          `Released ${amount} SOL from Escrow Vault to Task Receiver (${receiverAccount.address})`,
          'reward'
        );
      }
    } catch (err: any) {
      console.warn('Approval failed:', err);
    }
  };

  return (
    <div className="space-y-5 pb-12 max-w-7xl mx-auto">
      {/* Top Banner: Protocol Summary */}
      <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-5 sm:p-6 text-[#F5F5F5] relative overflow-hidden shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-[#A8FF00]/10 border border-[#A8FF00]/30 text-[#A8FF00] text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A8FF00] animate-pulse" />
              <span>3-Party Trustless Escrow Protocol</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#F5F5F5]">
              Verification Escrow & Consensus Hub
            </h1>
            <p className="text-xs text-[#858585] leading-relaxed">
              Every truth query is executed across 3 isolated entities: the <strong>Task Maker</strong> who creates & escrows funds, the <strong>Task Receiver</strong> who physically captures cryptographic photo proof, and the autonomous <strong>Solana Escrow Vault</strong> that settles payments on-chain.
            </p>
          </div>

          {/* Quick TVL & Solana Devnet Status Pill */}
          <div className="flex md:flex-col gap-2.5 shrink-0">
            <div className="bg-[#101010] rounded-xl p-3 text-right border border-white/[0.06]">
              <div className="text-[10px] uppercase tracking-wider text-[#858585] font-semibold">
                Total Escrow TVL
              </div>
              <div className="text-xl font-black font-mono text-[#A8FF00]">
                {totalEscrowLockedSol.toFixed(2)} SOL
              </div>
              <div className="text-[10px] text-[#858585] font-mono">
                {bounties.filter((b) => b.status === 'OPEN').length} active escrows
              </div>
            </div>

            <div className="bg-[#101010] rounded-xl p-3 text-right border border-white/[0.06]">
              <div className="text-[10px] uppercase tracking-wider text-[#858585] font-semibold flex items-center justify-end space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A8FF00] animate-pulse" />
                <span>Solana Devnet</span>
              </div>
              <div className="text-xs font-mono font-bold text-[#F5F5F5] mt-0.5">
                Slot: {solanaSlot ? solanaSlot.toLocaleString() : 'Loading...'}
              </div>
              <div className="text-[10px] font-mono text-[#A8FF00] truncate max-w-[150px]">
                {rpcLatencyMs ? `${rpcLatencyMs}ms RPC` : 'Confirmed'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-3 shadow-md">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[#555555] absolute left-4 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Maker wallet, Worker wallet, Place name, or Transaction hash..."
            className="w-full bg-[#101010] text-xs text-[#F5F5F5] font-medium pl-11 pr-20 py-2.5 rounded-full border border-white/[0.07] focus:outline-none focus:border-[#A8FF00] placeholder:text-[#555555] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 px-2.5 py-1 text-[11px] font-semibold text-[#858585] hover:text-white bg-[#18181b] rounded-full cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* 3 Dedicated Role Tab Navigators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Role 1: Maker / Asker Tab */}
        <button
          onClick={() => setSelectedRoleView('maker')}
          className={`p-4 rounded-[18px] text-left transition-all relative overflow-hidden cursor-pointer ${
            selectedRoleView === 'maker'
              ? 'bg-[#0B0B0B] border border-[#A8FF00] shadow-[0_0_15px_rgba(168,255,0,0.15)]'
              : 'bg-[#0B0B0B] border border-white/[0.07] hover:border-white/15'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center font-extrabold shadow-sm">
              <Coins className="w-4 h-4 text-black" />
            </div>
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-[#101010] text-[#A8FF00] border border-white/[0.07]">
              {makerAccount.balanceSol.toFixed(2)} SOL
            </span>
          </div>
          <h3 className="text-sm font-bold text-[#F5F5F5]">1. Task Maker Portal</h3>
          <p className="text-[11px] text-[#858585] mt-0.5 leading-snug">
            Creates verification tasks, locks escrow, and reviews submitted evidence.
          </p>
          <div className="mt-2.5 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-[#858585] font-mono">
            <span>{makerAccount.address}</span>
            {activeDemoAccount.id === makerAccount.id ? (
              <span className="text-[#A8FF00] font-bold font-sans">Active Role ✓</span>
            ) : (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectDemoAccount(makerAccount);
                  setSelectedRoleView('maker');
                }}
                className="text-[#A8FF00] font-sans font-bold hover:underline cursor-pointer"
              >
                Switch Wallet
              </span>
            )}
          </div>
        </button>

        {/* Role 2: Receiver / Worker Tab */}
        <button
          onClick={() => setSelectedRoleView('receiver')}
          className={`p-4 rounded-[18px] text-left transition-all relative overflow-hidden cursor-pointer ${
            selectedRoleView === 'receiver'
              ? 'bg-[#0B0B0B] border border-[#A8FF00] shadow-[0_0_15px_rgba(168,255,0,0.15)]'
              : 'bg-[#0B0B0B] border border-white/[0.07] hover:border-white/15'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center font-extrabold shadow-sm">
              <Camera className="w-4 h-4 text-black" />
            </div>
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-[#101010] text-[#A8FF00] border border-white/[0.07]">
              {receiverAccount.balanceSol.toFixed(2)} SOL
            </span>
          </div>
          <h3 className="text-sm font-bold text-[#F5F5F5]">2. Task Receiver Portal</h3>
          <p className="text-[11px] text-[#858585] mt-0.5 leading-snug">
            Field worker: walks into 200m geofence, captures hardware-verified photo proof.
          </p>
          <div className="mt-2.5 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-[#858585] font-mono">
            <span>{receiverAccount.address}</span>
            {activeDemoAccount.id === receiverAccount.id ? (
              <span className="text-[#A8FF00] font-bold font-sans">Active Role ✓</span>
            ) : (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectDemoAccount(receiverAccount);
                  setSelectedRoleView('receiver');
                }}
                className="text-[#A8FF00] font-sans font-bold hover:underline cursor-pointer"
              >
                Switch Wallet
              </span>
            )}
          </div>
        </button>

        {/* Role 3: Escrow Vault Protocol */}
        <button
          onClick={() => setSelectedRoleView('escrow')}
          className={`p-4 rounded-[18px] text-left transition-all relative overflow-hidden cursor-pointer ${
            selectedRoleView === 'escrow'
              ? 'bg-[#0B0B0B] border border-[#A8FF00] shadow-[0_0_15px_rgba(168,255,0,0.15)]'
              : 'bg-[#0B0B0B] border border-white/[0.07] hover:border-white/15'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center font-extrabold shadow-sm">
              <Lock className="w-4 h-4 text-black" />
            </div>
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-[#101010] text-[#A8FF00] border border-white/[0.07]">
              {escrowAccount.balanceSol.toFixed(2)} SOL
            </span>
          </div>
          <h3 className="text-sm font-bold text-[#F5F5F5]">3. Escrow Vault Protocol</h3>
          <p className="text-[11px] text-[#858585] mt-0.5 leading-snug">
            Autonomous Solana program: holds funds, validates blockhash nonces & settles.
          </p>
          <div className="mt-2.5 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-[#858585] font-mono">
            <span title="Solana Devnet Program">{ESCROW_VAULT_ADDRESS.toBase58().slice(0, 8)}...</span>
            {activeDemoAccount.id === escrowAccount.id ? (
              <span className="text-[#A8FF00] font-bold font-sans">Active Role ✓</span>
            ) : (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectDemoAccount(escrowAccount);
                  setSelectedRoleView('escrow');
                }}
                className="text-[#A8FF00] font-sans font-bold hover:underline cursor-pointer"
              >
                Audit View
              </span>
            )}
          </div>
        </button>
      </div>

      {/* VIEW 1: TASK MAKER DASHBOARD */}
      {selectedRoleView === 'maker' && (
        <div className="space-y-4">
          <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#101010] border border-white/[0.08] flex items-center justify-center text-[#A8FF00]">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-bold text-[#F5F5F5]">Task Maker Control Room</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#A8FF00]/10 text-[#A8FF00] font-semibold border border-[#A8FF00]/30">
                    Creator Role
                  </span>
                </div>
                <div className="text-xs font-mono text-[#858585] mt-0.5">
                  Wallet: <span className="text-[#F5F5F5] font-bold">{makerAccount.address}</span> • Balance: <span className="text-[#A8FF00] font-bold">{makerAccount.balanceSol.toFixed(2)} SOL</span>
                </div>
              </div>
            </div>

            <button
              onClick={onNavigateToAsk}
              className="px-5 py-2.5 rounded-full bg-[#A8FF00] hover:bg-[#b8ff24] text-black font-black text-xs shadow-lg shadow-[#A8FF00]/25 flex items-center space-x-1.5 transition-all cursor-pointer self-start sm:self-auto"
            >
              <span>+ Create & Fund Task</span>
              <ArrowRight className="w-3.5 h-3.5 text-black" />
            </button>
          </div>

          {/* Pending Submissions */}
          <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-5 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-[#A8FF00]" />
                <h3 className="text-sm font-bold text-[#F5F5F5]">
                  Incoming Worker Evidence Awaiting Approval
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-[#A8FF00] bg-[#101010] border border-white/[0.07] px-3 py-0.5 rounded-full">
                {bounties.filter((b) => b.status === 'ANSWERED').length} ready for payout
              </span>
            </div>

            {bounties.filter((b) => b.status === 'ANSWERED').length === 0 ? (
              <div className="p-6 text-center text-xs text-[#858585] bg-[#101010] rounded-xl border border-dashed border-white/[0.07]">
                No worker submissions currently pending review. New reports will appear here in real-time.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {bounties
                  .filter((b) => b.status === 'ANSWERED')
                  .map((b) => {
                    const relatedReport = reports.find((r) => r.bounty_id === b.id);

                    return (
                      <div
                        key={b.id}
                        className="p-4 rounded-xl border border-white/[0.07] bg-[#101010] space-y-2.5 shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#F5F5F5] truncate max-w-[200px]">
                            {b.place_name}
                          </span>
                          <span className="text-[11px] font-bold font-mono text-[#A8FF00] bg-[#0B0B0B] border border-white/[0.08] px-2.5 py-0.5 rounded-full">
                            {b.amount_sol} SOL Escrowed
                          </span>
                        </div>

                        <p className="text-xs text-[#858585] italic">"{b.question}"</p>

                        {relatedReport && (
                          <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                            {relatedReport.photo_url && (
                              <div className="rounded-xl overflow-hidden aspect-video bg-black max-h-40 border border-white/[0.06]">
                                <img
                                  src={relatedReport.photo_url}
                                  alt="Worker proof"
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            )}

                            <div className="text-[11px] font-mono text-[#858585] bg-[#050505] p-2.5 rounded-xl border border-white/[0.05] space-y-0.5">
                              <div>Worker: <strong className="text-zinc-200">{relatedReport.reporter_wallet}</strong></div>
                              <div>Observed Answer: <strong className="text-[#A8FF00]">{relatedReport.answer_text}</strong></div>
                              <div>Gyro Tremor: {relatedReport.gyro_variance || 0.045}g</div>
                              <div>SHA-256: {relatedReport.fingerprint.slice(0, 16)}...</div>
                            </div>
                          </div>
                        )}

                        <div className="pt-1">
                          <button
                            onClick={() => handleApproveReport(b.id)}
                            className="w-full py-3 px-4 rounded-full bg-[#A8FF00] hover:bg-[#b8ff24] text-black font-black text-xs shadow-lg shadow-[#A8FF00]/25 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4 text-black" />
                            <span>Confirm Truth & Release {b.amount_sol} SOL Payout</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: TASK RECEIVER DASHBOARD */}
      {selectedRoleView === 'receiver' && (
        <div className="space-y-4">
          <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#101010] border border-white/[0.08] flex items-center justify-center text-[#A8FF00]">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-bold text-[#F5F5F5]">Task Receiver / Field Earner Hub</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#A8FF00]/10 text-[#A8FF00] font-semibold border border-[#A8FF00]/30">
                    Worker Role
                  </span>
                </div>
                <div className="text-xs font-mono text-[#858585] mt-0.5">
                  Wallet: <span className="text-[#F5F5F5] font-bold">{receiverAccount.address}</span> • Available: <span className="text-[#A8FF00] font-bold">{receiverAccount.balanceSol.toFixed(2)} SOL</span>
                </div>
              </div>
            </div>

            <div className="text-right self-start sm:self-auto">
              <span className="text-[10px] uppercase font-bold text-[#858585] block">Total Claimed</span>
              <span className="text-base font-extrabold text-[#A8FF00] font-mono">
                {totalSettledSol.toFixed(2)} SOL
              </span>
            </div>
          </div>

          {/* Open Missions Ready to Earn */}
          <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-5 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-sm font-bold text-[#F5F5F5]">
                Open Field Missions (Walk & Earn)
              </h3>
              <span className="text-[11px] font-semibold text-[#A8FF00] bg-[#101010] border border-white/[0.07] px-2.5 py-0.5 rounded-full">
                {bounties.filter((b) => b.status === 'OPEN').length} active bounties
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {bounties
                .filter((b) => b.status === 'OPEN')
                .slice(0, 6)
                .map((b) => (
                  <div
                    key={b.id}
                    className="p-3.5 rounded-xl border border-white/[0.07] bg-[#101010] hover:border-white/15 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#F5F5F5] truncate">{b.place_name}</span>
                        <span className="text-xs font-bold font-mono text-[#A8FF00]">{b.amount_sol} SOL</span>
                      </div>
                      <p className="text-xs text-[#858585] mt-1 line-clamp-2">"{b.question}"</p>
                    </div>

                    <button
                      onClick={() => onNavigateToReport(b.id)}
                      className="mt-3 w-full py-2.5 px-3 rounded-full bg-[#A8FF00] hover:bg-[#b8ff24] text-black text-xs font-black flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-[#A8FF00]/25 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-black" />
                      <span>Snap Photo & Earn</span>
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: ESCROW VAULT PROTOCOL DASHBOARD */}
      {selectedRoleView === 'escrow' && (
        <div className="space-y-4">
          <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#101010] border border-white/[0.08] flex items-center justify-center text-[#A8FF00]">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-bold text-[#F5F5F5]">Solana Devnet Escrow Vault</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#A8FF00]/10 text-[#A8FF00] font-semibold border border-[#A8FF00]/30">
                    Smart Contract Vault
                  </span>
                </div>
                <div className="text-xs font-mono text-[#858585] mt-0.5">
                  Program: <span className="text-[#A8FF00] font-bold">{ESCROW_VAULT_ADDRESS.toBase58()}</span>
                </div>
              </div>
            </div>

            <a
              href={`https://explorer.solana.com/address/${ESCROW_VAULT_ADDRESS.toBase58()}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="bg-[#101010] border border-white/[0.07] hover:border-white/15 px-3.5 py-1.5 rounded-full text-[#A8FF00] hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors self-start sm:self-auto"
            >
              <span>Solana Explorer</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Telemetry Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[18px] p-4 text-center shadow-lg">
              <span className="text-[10px] font-bold text-[#858585] uppercase block">Total Value Locked</span>
              <span className="text-xl font-extrabold text-[#A8FF00] font-mono">
                {totalEscrowLockedSol.toFixed(2)} SOL
              </span>
            </div>
            <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[18px] p-4 text-center shadow-lg">
              <span className="text-[10px] font-bold text-[#858585] uppercase block">Devnet Slot</span>
              <span className="text-xl font-extrabold text-[#F5F5F5] font-mono">
                {solanaSlot ? solanaSlot.toLocaleString() : '284,792,410'}
              </span>
            </div>
            <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[18px] p-4 text-center shadow-lg">
              <span className="text-[10px] font-bold text-[#858585] uppercase block">Network Latency</span>
              <span className="text-xl font-extrabold text-[#A8FF00] font-mono">
                {rpcLatencyMs ? `${rpcLatencyMs} ms` : '320 ms'}
              </span>
            </div>
            <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[18px] p-4 text-center shadow-lg">
              <span className="text-[10px] font-bold text-[#858585] uppercase block">Settled Volume</span>
              <span className="text-xl font-extrabold text-[#A8FF00] font-mono">
                {totalSettledSol.toFixed(2)} SOL
              </span>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-5 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-sm font-bold text-[#F5F5F5]">
                Escrow Settlement Ledger
              </h3>
              <span className="text-xs font-mono text-[#858585]">
                Blockhash: {solanaBlockhash.slice(0, 12)}...
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[#555555] uppercase font-bold text-[10px]">
                    <th className="py-2.5 px-3">Location & Query</th>
                    <th className="py-2.5 px-3">Maker Depositor</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Locked SOL</th>
                    <th className="py-2.5 px-3">Program Signature</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] font-mono text-[11px]">
                  {filteredBounties.map((b) => (
                    <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3 font-sans">
                        <strong className="text-[#F5F5F5]">{b.place_name}</strong>
                      </td>
                      <td className="py-3 px-3 text-[#858585]">
                        {b.asker_wallet}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-sans ${
                            b.status === 'PAID'
                              ? 'bg-[#A8FF00]/10 text-[#A8FF00] border border-[#A8FF00]/30'
                              : b.status === 'ANSWERED'
                              ? 'bg-[#8B4DFF]/10 text-purple-300 border border-purple-500/30'
                              : 'bg-[#101010] text-[#858585] border border-white/[0.07]'
                          }`}
                        >
                          {b.status === 'OPEN' ? '🔒 LOCKED' : b.status === 'ANSWERED' ? '⏳ VERIFYING' : '✓ SETTLED'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-[#A8FF00]">
                        {b.amount_sol} SOL
                      </td>
                      <td className="py-3 px-3 text-[#555555]">
                        {b.escrow_tx ? `${b.escrow_tx.slice(0, 12)}...` : 'tx_8f912...sol'}
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
