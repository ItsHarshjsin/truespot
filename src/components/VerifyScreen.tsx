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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (5 cols on desktop): Audit Selector & Consensus Stats */}
        <div className="lg:col-span-5 space-y-5">
          {/* 1. Audit Selector Header Card */}
          <div className="bento-card p-6 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                Staked Consensus Audit
              </span>
              <span className="text-xs font-semibold text-sky-300 bg-sky-500/15 border border-sky-500/30 px-2.5 py-0.5 rounded-full font-mono">
                Stake: 0.01 SOL
              </span>
            </div>

            <h2 className="text-lg font-bold text-white tracking-tight">
              Audit Place Truth
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Verify submitted photos against the claim. Voters who agree with consensus split 20% yield.
            </p>

            {bounties.length > 1 && (
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center space-x-2">
                <span className="text-xs text-slate-400">Audit:</span>
                <select
                  value={selectedBounty?.id || ''}
                  onChange={(e) => handleSelectBounty(e.target.value)}
                  className="bg-[#070b13] text-xs text-white font-medium border border-white/10 rounded-xl px-2.5 py-1.5 outline-none flex-1 truncate"
                >
                  {bounties.map((b) => (
                    <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                      {b.place_name} ({b.status})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 2. Consensus Progress Bar Card */}
          <div className="bento-card p-6 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400">Community Consensus:</span>
              <span className="text-sky-300 font-bold">{agreeRatio}% Agree ({totalVotes} votes)</span>
            </div>
            <div className="w-full h-3 bg-black/60 border border-white/10 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${agreeRatio}%` }}
                className="bg-gradient-to-r from-sky-500 to-cyan-400 shadow-[0_0_12px_rgba(56,189,248,0.5)] transition-all duration-500"
              />
              <div
                style={{ width: `${100 - agreeRatio}%` }}
                className="bg-rose-500 transition-all duration-500"
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 pt-1">
              <span>{agreeCount} Agreed</span>
              <span>{totalVotes - agreeCount} Disagreed</span>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols on desktop): Photo Evidence & Audit Actions */}
        <div className="lg:col-span-7 space-y-4">
          {latestReport && selectedBounty ? (
            <div className="bento-card p-6 space-y-5">
              {/* Floating Thumbnail with rounded-2xl corners */}
              <div className="rounded-2xl overflow-hidden border-2 border-sky-400/40 bg-black aspect-video flex items-center justify-center shadow-lg">
                <img
                  src={latestReport.photo_url}
                  alt="Report Evidence"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Claim Details */}
              <div className="p-4 bg-black/40 border border-white/10 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400 uppercase">Target Question:</span>
                  <span className="font-bold text-white">{selectedBounty.place_name}</span>
                </div>
                <p className="text-sm font-semibold text-sky-200">
                  "{selectedBounty.question}"
                </p>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <span className="font-semibold text-slate-400">Reporter Claim:</span>
                  <span className="px-3 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold">
                    {latestReport.answer_text}
                  </span>
                </div>
              </div>

              {/* Large Action Buttons */}
              <div className="space-y-3">
                {/* Inspiration Tactile Capsule Button */}
                <button
                  onClick={() => handleVote(true)}
                  disabled={isVoting}
                  className="w-full bg-[#0a0e17] hover:bg-[#121927] border border-white/20 text-white rounded-full py-2.5 pl-6 pr-3 flex items-center justify-between shadow-2xl transition-all duration-300 group hover:border-sky-400/50 hover:shadow-[0_0_30px_rgba(56,189,248,0.2)] disabled:opacity-40"
                >
                  <span className="font-semibold text-sm flex items-center space-x-2">
                    <ThumbsUp className="w-4 h-4 text-sky-400" />
                    <span>Agree (Verify as Truth)</span>
                  </span>
                  <div className="w-9 h-9 rounded-full bg-white text-slate-950 font-bold flex items-center justify-center text-sm shadow-md group-hover:scale-105 group-hover:bg-sky-400 group-hover:text-black transition-all">
                    ↗
                  </div>
                </button>

                <button
                  onClick={() => handleVote(false)}
                  disabled={isVoting}
                  className="w-full py-3 px-6 rounded-full tactile-keycap text-rose-300 hover:text-rose-100 font-semibold text-xs flex items-center justify-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <ThumbsDown className="w-3.5 h-3.5 text-rose-400" />
                  <span>Disagree (Flag as Fraud)</span>
                </button>
              </div>

              {votedSuccess !== null && (
                <div className="p-3 bg-sky-500/15 border border-sky-500/30 rounded-2xl text-xs text-sky-300 font-semibold text-center animate-fadeIn">
                  ✓ Vote recorded! Navigating to State & Settlement...
                </div>
              )}
            </div>
          ) : (
            <div className="bento-card p-12 text-center text-slate-400">
              <p className="text-base font-semibold text-white">No evidence report submitted for this spot yet.</p>
              <p className="text-xs mt-1">Submit a report from the Radar tab first to audit.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
