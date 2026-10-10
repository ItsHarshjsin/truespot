import React, { useState, useEffect } from 'react';
import { DemoAccount } from './WalletModal';
import { Bounty, Report } from '../types';
import { hybridStore } from '../utils/storage';
import {
  User,
  Shield,
  Coins,
  Copy,
  Check,
  ExternalLink,
  PlusCircle,
  Compass,
  ArrowRight,
  Award,
  Layers,
  Lock,
} from 'lucide-react';

interface ProfileViewProps {
  activeAccount: DemoAccount;
  userMode: 'maker' | 'spotter';
  onSwitchMode: (mode: 'maker' | 'spotter') => void;
  onOpenWalletModal: () => void;
  onShowToast: (title: string, message: string, type?: 'success' | 'info' | 'reward' | 'warning') => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  activeAccount,
  userMode,
  onSwitchMode,
  onOpenWalletModal,
  onShowToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    const load = async () => {
      const b = await hybridStore.getBounties();
      const r = await hybridStore.getReports();
      setBounties(b);
      setReports(r);
    };
    load();
    const unsub = hybridStore.subscribeToChanges(load);
    return () => unsub();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(activeAccount.address);
    setCopied(true);
    onShowToast('Address Copied', 'Public key copied to clipboard', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const totalEscrowDeposited = bounties.reduce((sum, b) => sum + b.amount_sol, 0);
  const totalSettledPaid = bounties.filter((b) => b.status === 'PAID').reduce((sum, b) => sum + b.amount_sol, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Profile Identity Card */}
      <div className="bg-[#0B0B0B] border border-white/[0.08] rounded-[24px] p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 border border-purple-400/40 flex items-center justify-center text-xl font-black text-white shadow-lg overflow-hidden shrink-0">
              <span>{activeAccount.name.charAt(0)}</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {activeAccount.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#A8FF00]/15 text-[#A8FF00] border border-[#A8FF00]/30 uppercase">
                  {userMode} Active
                </span>
              </div>

              {/* Address with copy */}
              <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400">
                <span className="bg-[#121212] px-2.5 py-1 rounded-lg border border-white/[0.06] select-all">
                  {activeAccount.address}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Copy full address"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#A8FF00]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href={`https://explorer.solana.com/address/${activeAccount.address}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                  title="View on Solana Devnet Explorer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Quick Balance & Persona Switcher */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 border-white/[0.06] pt-4 sm:pt-0">
            <div className="text-right">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                Available Devnet Balance
              </span>
              <span className="text-xl sm:text-2xl font-black text-[#A8FF00] font-mono">
                {activeAccount.balanceSol.toFixed(3)} SOL
              </span>
            </div>

            <button
              type="button"
              onClick={onOpenWalletModal}
              className="py-1.5 px-3.5 rounded-full bg-[#161616] hover:bg-[#202020] border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer"
            >
              Switch Persona / Wallet
            </button>
          </div>
        </div>
      </div>

      {/* Role Switcher Bento Card */}
      <div className="bg-[#0B0B0B] border border-white/[0.08] rounded-[24px] p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Active Operation Mode</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Switch seamlessly between Task Maker and Field Spotter without disconnecting your wallet.
            </p>
          </div>
          <span className="text-xs text-zinc-500 font-mono hidden sm:inline">Persisted to Storage</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Option 1: Maker Mode */}
          <div
            onClick={() => onSwitchMode('maker')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
              userMode === 'maker'
                ? 'bg-[#A8FF00]/5 border-[#A8FF00] shadow-lg shadow-[#A8FF00]/10'
                : 'bg-[#121212] border-white/[0.07] hover:border-white/20'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <PlusCircle className={`w-4 h-4 ${userMode === 'maker' ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
                  <span className="text-sm font-bold text-white">Maker Mode</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Commission real-world verifications, lock SOL into escrow PDAs, and approve worker evidence.
                </p>
              </div>
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                userMode === 'maker' ? 'border-[#A8FF00] bg-[#A8FF00] text-black' : 'border-white/20'
              }`}>
                {userMode === 'maker' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>

            <div className="text-[11px] font-mono text-zinc-400 space-y-1 border-t border-white/[0.06] pt-3">
              <div>Workspace: Query Studio, My Bounties, Review</div>
              <div>Settlement: Authorize payouts & escrow refunds</div>
            </div>
          </div>

          {/* Option 2: Spotter Mode */}
          <div
            onClick={() => onSwitchMode('spotter')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
              userMode === 'spotter'
                ? 'bg-[#A8FF00]/5 border-[#A8FF00] shadow-lg shadow-[#A8FF00]/10'
                : 'bg-[#121212] border-white/[0.07] hover:border-white/20'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Compass className={`w-4 h-4 ${userMode === 'spotter' ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
                  <span className="text-sm font-bold text-white">Spotter Mode</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Discover physical queries within 200m, capture hardware-stamped photos, and earn instant SOL payouts.
                </p>
              </div>
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                userMode === 'spotter' ? 'border-[#A8FF00] bg-[#A8FF00] text-black' : 'border-white/20'
              }`}>
                {userMode === 'spotter' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>

            <div className="text-[11px] font-mono text-zinc-400 space-y-1 border-t border-white/[0.06] pt-3">
              <div>Workspace: 200m Radar, Submissions, Earnings</div>
              <div>Telemetry: Gyroscopic tremor & satellite lock</div>
            </div>
          </div>
        </div>
      </div>

      {/* Dual Role Activity Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Maker Activity Summary */}
        <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-5 space-y-4 shadow-lg">
          <div className="flex items-center space-x-2 pb-2 border-b border-white/[0.06]">
            <PlusCircle className="w-4 h-4 text-[#A8FF00]" />
            <h3 className="text-sm font-bold text-white">Maker Profile Stats</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-[#121212] p-3 rounded-xl border border-white/[0.05]">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Total Bounties</span>
              <span className="text-lg font-black font-mono text-white">{bounties.length}</span>
            </div>
            <div className="bg-[#121212] p-3 rounded-xl border border-white/[0.05]">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Escrow Deposited</span>
              <span className="text-lg font-black font-mono text-[#A8FF00]">{totalEscrowDeposited.toFixed(2)} SOL</span>
            </div>
          </div>
        </div>

        {/* Spotter Activity Summary */}
        <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-5 space-y-4 shadow-lg">
          <div className="flex items-center space-x-2 pb-2 border-b border-white/[0.06]">
            <Compass className="w-4 h-4 text-[#A8FF00]" />
            <h3 className="text-sm font-bold text-white">Spotter Profile Stats</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-[#121212] p-3 rounded-xl border border-white/[0.05]">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Submissions</span>
              <span className="text-lg font-black font-mono text-white">{reports.length}</span>
            </div>
            <div className="bg-[#121212] p-3 rounded-xl border border-white/[0.05]">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Settled Payouts</span>
              <span className="text-lg font-black font-mono text-[#A8FF00]">{totalSettledPaid.toFixed(2)} SOL</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
