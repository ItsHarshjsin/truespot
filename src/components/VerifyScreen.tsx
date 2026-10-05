import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Bounty, Report, Verification } from '../types';
import { hybridStore } from '../utils/storage';
import {
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';

interface VerifyScreenProps {
  bountyId?: string;
  onSelectBounty?: (bountyId: string) => void;
  onVerificationComplete: (bountyId: string) => void;
  onAdjustBalance?: (delta: number, role?: 'asker' | 'spotter' | 'verifier') => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'reward' | 'warning') => void;
}

export const VerifyScreen: React.FC<VerifyScreenProps> = ({
  bountyId,
  onSelectBounty,
  onVerificationComplete,
  onAdjustBalance,
  onShowToast,
}) => {
  const { publicKey } = useWallet();

  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [selectedBounty, setSelectedBounty] = useState<Bounty | null>(null);
  const [latestReport, setLatestReport] = useState<Report | null>(null);
  const [verifications, setVerifications] = useState<Verification[]>([]);

  const [isVoting, setIsVoting] = useState(false);
  const [votedSuccess, setVotedSuccess] = useState<boolean | null>(null);

  useEffect(() => {
    loadData();
  }, [bountyId]);

  const loadData = async () => {
    const list = await hybridStore.getBounties();
    setBounties(list);

    const target =
      (bountyId ? list.find((b) => b.id === bountyId) : null) ||
      list.find((b) => b.status === 'ANSWERED') ||
      list[0];

    if (target) {
      setSelectedBounty(target);
      const rep = await hybridStore.getLatestReportForBounty(target.id);
      if (rep) {
        setLatestReport(rep);
        const vers = await hybridStore.getVerifications(rep.id);
        setVerifications(vers);
      } else {
        setLatestReport(null);
        setVerifications([]);
      }
    }
  };

  const handleSelectBounty = async (bId: string) => {
    const target = bounties.find((b) => b.id === bId);
    if (!target) return;
    setSelectedBounty(target);
    if (onSelectBounty) {
      onSelectBounty(bId);
    }
    const rep = await hybridStore.getLatestReportForBounty(target.id);
    setLatestReport(rep || null);
    if (rep) {
      const vers = await hybridStore.getVerifications(rep.id);
      setVerifications(vers);
    } else {
      setVerifications([]);
    }
    setVotedSuccess(null);
  };

  const handleVote = async (agreed: boolean) => {
    if (!latestReport || !selectedBounty) return;

    setIsVoting(true);
    try {
      const verifierAddr = publicKey
        ? publicKey.toBase58().slice(0, 4) + '...' + publicKey.toBase58().slice(-4)
        : 'Verifier_Aud';

      await hybridStore.submitVerification({
        report_id: latestReport.id,
        verifier_wallet: verifierAddr,
        agreed,
        stake_sol: 0.01,
      });

      if (onAdjustBalance) {
        onAdjustBalance(-0.01, 'verifier');
      }

      if (onShowToast) {
        onShowToast(
          'Consensus Audit Staked',
          `Staked 0.01 SOL on ${agreed ? 'AGREE' : 'DISAGREE'} (Entitled to 20% consensus yield)`,
          'reward'
        );
      }

      const updated = await hybridStore.getVerifications(latestReport.id);
      setVerifications(updated);
      setVotedSuccess(agreed);

      setTimeout(() => {
        onVerificationComplete(selectedBounty.id);
      }, 1500);
    } finally {
      setIsVoting(false);
    }
  };

  const agreeCount = verifications.filter((v) => v.agreed).length;
  const totalVotes = verifications.length;
  const agreeRatio = totalVotes === 0 ? 100 : Math.round((agreeCount / totalVotes) * 100);

  return (
    <div className="space-y-6 pb-6 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column (5 cols on desktop): Audit Selector & Consensus Stats */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. Audit Selector Header Card */}
          <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[24px] p-6 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#A8FF00]/10 text-[#A8FF00] border border-[#A8FF00]/30 font-mono">
                Staked Consensus Audit
              </span>
              <span className="text-[11px] font-bold text-[#A8FF00] bg-[#101010] border border-white/[0.07] px-2.5 py-0.5 rounded-full font-mono">
                Stake: 0.01 SOL
              </span>
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-[#F5F5F5] tracking-tight">
                Audit Place Truth
              </h2>
              <p className="text-xs text-[#858585] mt-1 leading-relaxed">
                Verify submitted field photos against the question. Auditors agreeing with consensus split 20% protocol escrow yield.
              </p>
            </div>

            {bounties.length > 1 && (
              <div className="pt-3 border-t border-white/[0.06] flex items-center space-x-2">
                <span className="text-xs text-[#858585] font-medium shrink-0">Bounty:</span>
                <select
                  value={selectedBounty?.id || ''}
                  onChange={(e) => handleSelectBounty(e.target.value)}
                  className="bg-[#101010] text-xs text-[#F5F5F5] font-medium border border-white/[0.08] focus:border-[#A8FF00] rounded-xl px-3 py-2 outline-none flex-1 truncate transition-colors"
                >
                  {bounties.map((b) => (
                    <option key={b.id} value={b.id} className="bg-[#101010] text-white">
                      {b.place_name} ({b.status})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 2. Consensus Progress Bar Card */}
          <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[24px] p-6 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-[#858585]">Community Consensus:</span>
              <span className="text-[#A8FF00] font-black font-mono">{agreeRatio}% Agree ({totalVotes} votes)</span>
            </div>
            <div className="w-full h-3 bg-[#101010] border border-white/[0.07] rounded-full overflow-hidden flex">
              <div
                style={{ width: `${agreeRatio}%` }}
                className="bg-[#A8FF00] shadow-[0_0_12px_rgba(168,255,0,0.5)] transition-all duration-500"
              />
              <div
                style={{ width: `${100 - agreeRatio}%` }}
                className="bg-rose-500 transition-all duration-500"
              />
            </div>
            <div className="flex justify-between text-[11px] text-[#858585] font-mono pt-1">
              <span className="text-[#A8FF00] font-bold">{agreeCount} Agreed</span>
              <span className="text-rose-400 font-bold">{totalVotes - agreeCount} Disagreed</span>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols on desktop): Photo Evidence & Audit Actions */}
        <div className="lg:col-span-7 space-y-4">
          {latestReport && selectedBounty ? (
            <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[24px] p-6 space-y-5 shadow-xl">
              {/* Floating Thumbnail with rounded-2xl corners */}
              <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-black aspect-video flex items-center justify-center shadow-lg relative">
                <img
                  src={latestReport.photo_url}
                  alt="Report Evidence"
                  className="w-full h-full object-contain"
                />
                <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-mono text-[#A8FF00] font-bold">
                  SHA-256: {latestReport.fingerprint.slice(0, 10)}...
                </div>
              </div>

              {/* Claim Details */}
              <div className="p-4 bg-[#101010] border border-white/[0.06] rounded-2xl space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#858585] uppercase tracking-wider text-[10px]">Location:</span>
                  <span className="font-bold text-[#F5F5F5]">{selectedBounty.place_name}</span>
                </div>
                <p className="text-sm font-semibold text-white">
                  "{selectedBounty.question}"
                </p>

                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="font-semibold text-[#858585]">Reporter's Stamped Claim:</span>
                  <span className="px-3 py-1 rounded-full bg-[#A8FF00]/10 text-[#A8FF00] border border-[#A8FF00]/30 font-bold font-mono">
                    {latestReport.answer_text}
                  </span>
                </div>
              </div>

              {/* Large Action Buttons */}
              <div className="space-y-3">
                {/* CoinVex Solid Neon Green Button */}
                <button
                  onClick={() => handleVote(true)}
                  disabled={isVoting}
                  className="w-full py-3.5 px-6 rounded-full bg-[#A8FF00] hover:bg-[#b8ff24] text-black font-black text-sm shadow-xl shadow-[#A8FF00]/25 flex items-center justify-between transition-all group cursor-pointer disabled:opacity-50"
                >
                  <span className="flex items-center space-x-2">
                    <ThumbsUp className="w-4 h-4 text-black stroke-[2.5]" />
                    <span>Agree (Verify as Truth)</span>
                  </span>
                  <div className="w-8 h-8 rounded-full bg-black text-[#A8FF00] font-black flex items-center justify-center text-sm shadow-sm group-hover:scale-105 transition-transform">
                    ↗
                  </div>
                </button>

                <button
                  onClick={() => handleVote(false)}
                  disabled={isVoting}
                  className="w-full py-3 px-6 rounded-full bg-[#101010] hover:bg-rose-500/10 border border-white/[0.08] hover:border-rose-500/30 text-rose-400 font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <ThumbsDown className="w-3.5 h-3.5 text-rose-400" />
                  <span>Disagree (Flag as Inaccurate)</span>
                </button>
              </div>

              {votedSuccess !== null && (
                <div className="p-3 bg-[#A8FF00]/10 border border-[#A8FF00]/30 rounded-2xl text-xs text-[#A8FF00] font-bold text-center animate-fadeIn">
                  ✓ Vote recorded! Navigating to State & Settlement...
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[24px] p-12 text-center text-[#858585]">
              <p className="text-base font-bold text-[#F5F5F5]">No evidence report submitted for this spot yet.</p>
              <p className="text-xs mt-1">Submit a report from the Radar tab first to audit.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
