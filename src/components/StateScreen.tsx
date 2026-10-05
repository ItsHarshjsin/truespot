import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Bounty, Report, Verification } from '../types';
import { hybridStore } from '../utils/storage';
import { calculateConfidence } from '../utils/solana';
import { SpectrumTruthMeter } from './SpectrumTruthMeter';
import { VerticalFreshnessRuler } from './VerticalFreshnessRuler';
import {
  CheckCircle2,
  ExternalLink,
  Send,
  Code2,
  Copy,
  Check,
  Cpu,
  Database,
  ChevronDown,
  ChevronUp,
  Radio,
} from 'lucide-react';
import { CONSUMER_INTEGRATION_CODE } from '../solana/truespotProgram';

interface StateScreenProps {
  bountyId?: string;
  onSelectBounty?: (bountyId: string) => void;
  onAdjustBalance?: (delta: number, role?: 'asker' | 'spotter' | 'verifier') => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'reward' | 'warning') => void;
}

export const StateScreen: React.FC<StateScreenProps> = ({
  bountyId,
  onSelectBounty,
  onAdjustBalance,
  onShowToast,
}) => {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [selectedBounty, setSelectedBounty] = useState<Bounty | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [verifications, setVerifications] = useState<Verification[]>([]);

  const [isPayingOut, setIsPayingOut] = useState(false);
  const [payoutSig, setPayoutSig] = useState<string | null>(null);

  // Developer Oracle Consumer Drawer State
  const [isOracleDrawerOpen, setIsOracleDrawerOpen] = useState(true);
  const [oracleTab, setOracleTab] = useState<'rust' | 'ts' | 'rest' | 'payload'>('rust');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  // Dynamic Real-Time 1-second interval ticker
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadData();
  }, [bountyId]);

  const loadData = async () => {
    const list = await hybridStore.getBounties();
    setBounties(list);

    const target =
      (bountyId ? list.find((b) => b.id === bountyId) : null) ||
      list.find((b) => b.status === 'PAID') ||
      list.find((b) => b.status === 'ANSWERED') ||
      list[0];

    if (target) {
      setSelectedBounty(target);
      const rep = await hybridStore.getLatestReportForBounty(target.id);
      setReport(rep || null);
      if (rep) {
        const vers = await hybridStore.getVerifications(rep.id);
        setVerifications(vers);
      } else {
        setVerifications([]);
      }
      if (target.payout_tx) {
        setPayoutSig(target.payout_tx);
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
    setReport(rep || null);
    if (rep) {
      const vers = await hybridStore.getVerifications(rep.id);
      setVerifications(vers);
    } else {
      setVerifications([]);
    }
    setPayoutSig(target.payout_tx || null);
  };

  const agreeCount = verifications.filter((v) => v.agreed).length;
  const totalVotes = verifications.length;

  // Real-time elapsed age with 1-second dynamic accuracy
  const elapsedSeconds = report
    ? Math.max(0, Math.floor((now - new Date(report.observed_at).getTime()) / 1000))
    : 0;
  const minutesAge = Math.floor(elapsedSeconds / 60);
  const secondsAge = elapsedSeconds % 60;

  // Real-time Bayesian consensus with continuous freshness decay
  const baseConsensus = totalVotes > 0 ? (agreeCount / totalVotes) * 100 : 96;
  const decayFactor = Math.max(0.2, Math.exp(-elapsedSeconds / 3600)); // 1-hour half-life
  const confidenceScore = report ? Math.round(baseConsensus * decayFactor) : 0;

  const handleExecutePayout = async () => {
    if (!selectedBounty) return;

    setIsPayingOut(true);
    try {
      const mockPayoutSig =
        'payout_' + Array.from({ length: 56 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

      await hybridStore.updateBountyPayout(selectedBounty.id, mockPayoutSig);
      setPayoutSig(mockPayoutSig);
      setSelectedBounty({ ...selectedBounty, status: 'PAID', payout_tx: mockPayoutSig });

      const spotterReward = selectedBounty.amount_sol * 0.8;
      const verifiersYield = selectedBounty.amount_sol * 0.2;

      if (onAdjustBalance) {
        onAdjustBalance(spotterReward, 'spotter');
        onAdjustBalance(verifiersYield, 'verifier');
      }

      if (onShowToast) {
        onShowToast(
          '🎉 Payout Distributed on Solana Devnet',
          `Credited +${spotterReward.toFixed(3)} SOL to Spotter and +${verifiersYield.toFixed(3)} SOL to Consensus Verifiers`,
          'reward'
        );
      }

      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#0F3822', '#8BC34A', '#99E35E', '#FFFFFF'],
        });
      } catch (e) {}
    } finally {
      setIsPayingOut(false);
    }
  };

  return (
    <div className="space-y-6 pb-6 max-w-5xl mx-auto">
      {/* 1. Header Card with Live Ticker & Quick Bounty Switcher */}
      <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[24px] p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] font-bold text-[#858585] uppercase tracking-wider">
              Physical Oracle Settlement
            </span>
            <span className="text-[10px] font-mono text-[#A8FF00] bg-[#A8FF00]/10 border border-[#A8FF00]/30 px-2 py-0.5 rounded-full inline-flex items-center space-x-1 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A8FF00] animate-pulse" />
              <span>LIVE CLOCK: {minutesAge}m {secondsAge}s ago</span>
            </span>
          </div>

          <h2 className="text-xl font-extrabold text-[#F5F5F5] tracking-tight">
            {selectedBounty ? selectedBounty.place_name : 'Oracle State'}
          </h2>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {bounties.length > 1 && (
            <select
              value={selectedBounty?.id || ''}
              onChange={(e) => handleSelectBounty(e.target.value)}
              className="bg-[#101010] text-xs text-[#F5F5F5] font-medium border border-white/[0.08] focus:border-[#A8FF00] rounded-full px-3 py-1.5 outline-none max-w-[200px] truncate transition-colors"
            >
              {bounties.map((b) => (
                <option key={b.id} value={b.id} className="bg-[#101010] text-white">
                  {b.place_name} ({b.status})
                </option>
              ))}
            </select>
          )}

          {selectedBounty && (
            <span
              className={`text-xs px-3.5 py-1.5 rounded-full font-bold font-mono ${
                selectedBounty.status === 'PAID'
                  ? 'bg-[#A8FF00]/10 text-[#A8FF00] border border-[#A8FF00]/30'
                  : selectedBounty.status === 'ANSWERED'
                  ? 'bg-amber-400/10 text-amber-300 border border-amber-400/30'
                  : 'bg-[#101010] text-[#858585] border border-white/[0.08]'
              }`}
            >
              {selectedBounty.status}
            </span>
          )}
        </div>
      </div>

      {selectedBounty && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column (6 cols on desktop): Tactile Skeuomorphic Truth & Freshness Gauges */}
          <div className="lg:col-span-6 space-y-4">
            {/* Tactile Spectrum Truth Gauge Card */}
            <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[24px] p-6 shadow-xl">
              <SpectrumTruthMeter
                confidencePercent={confidenceScore}
                agreeCount={agreeCount}
                totalVotes={totalVotes}
              />
            </div>

            {/* Tactile Vertical Freshness Ruler */}
            {report && (
              <VerticalFreshnessRuler
                minutesAge={minutesAge}
                observedAt={report.observed_at}
              />
            )}
          </div>

          {/* Right Column (6 cols on desktop): Observation Evidence & Settlement Execution */}
          <div className="lg:col-span-6 space-y-4">
            {/* Evidence Thumbnail Card */}
            {report && (
              <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[24px] p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#858585] uppercase tracking-wider">
                    Verified Observation
                  </span>
                  <span className="text-xs font-bold font-mono text-[#A8FF00] bg-[#101010] border border-white/[0.08] px-3 py-0.5 rounded-full">
                    {selectedBounty.amount_sol} SOL Escrowed
                  </span>
                </div>

                <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-black aspect-video flex items-center justify-center">
                  <img
                    src={report.photo_url}
                    alt="Physical Evidence"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="p-3.5 bg-[#101010] border border-white/[0.06] rounded-2xl flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#858585]">Confirmed Claim:</span>
                  <span className="text-xs font-bold text-[#A8FF00] bg-[#0B0B0B] px-3 py-1 rounded-full border border-white/[0.08] font-mono">
                    {report.answer_text}
                  </span>
                </div>
              </div>
            )}

            {/* Payout Receipt */}
            {payoutSig && (
              <div className="p-5 bg-[#101010] rounded-[24px] border border-[#A8FF00]/30 text-xs text-[#A8FF00] space-y-3 shadow-inner">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#A8FF00]" />
                    <span className="text-sm text-[#F5F5F5]">Solana Devnet Escrow Settled</span>
                  </span>
                  <a
                    href={`https://solscan.io/tx/${payoutSig}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline flex items-center space-x-1 text-[#A8FF00] hover:text-[#b8ff24] font-semibold"
                  >
                    <span>Solscan</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="text-xs space-y-1 pt-1 text-zinc-300 font-mono">
                  <div>• Spotter Payout (80%): +{(selectedBounty.amount_sol * 0.8).toFixed(3)} SOL</div>
                  <div>• Consensus Verifiers (20%): +{(selectedBounty.amount_sol * 0.2).toFixed(3)} SOL Split</div>
                </div>
              </div>
            )}

            {/* Primary Action Button */}
            {selectedBounty.status === 'ANSWERED' && (
              <button
                onClick={handleExecutePayout}
                disabled={isPayingOut}
                className="w-full py-3.5 px-6 rounded-full bg-[#A8FF00] hover:bg-[#b8ff24] text-black font-black text-sm shadow-xl shadow-[#A8FF00]/30 flex items-center justify-center space-x-2 transition-all active:scale-[0.99] disabled:opacity-40 cursor-pointer"
              >
                <Send className="w-4 h-4 text-black stroke-[2.5]" />
                <span>{isPayingOut ? 'Settling on Solana Devnet...' : `Execute Payout (${selectedBounty.amount_sol} SOL)`}</span>
                <span className="font-mono text-xs bg-black/15 px-2 py-0.5 rounded-full ml-1 font-black">↗</span>
              </button>
            )}
          </div>
        </div>

        {/* Physical Oracle Consumer API & Solana CPI Integration Panel */}
        <div className="mt-8 bg-[#0B0B0B] border border-white/[0.07] rounded-[24px] p-6 sm:p-7 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-white/[0.06] gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#101010] border border-white/[0.08] flex items-center justify-center text-[#A8FF00]">
                <Cpu className="w-5 h-5 text-[#A8FF00]" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-[#F5F5F5]">Physical Oracle Consumer Gateway</h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-[#A8FF00]/10 text-[#A8FF00] border border-[#A8FF00]/30 font-mono">
                    Anchor CPI Ready
                  </span>
                </div>
                <p className="text-xs text-[#858585]">
                  Query verified real-world ground truth directly from Solana smart contracts, AI agents, or REST API.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOracleDrawerOpen(!isOracleDrawerOpen)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-[#101010] border border-white/[0.08] text-xs font-semibold text-[#858585] hover:text-white hover:border-white/20 transition-all self-start sm:self-auto cursor-pointer"
            >
              <span>{isOracleDrawerOpen ? 'Collapse Integration' : 'View Code & Payload'}</span>
              {isOracleDrawerOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {isOracleDrawerOpen && (
            <div className="mt-5 space-y-4">
              {/* Navigation Tabs */}
              <div className="flex flex-wrap gap-2 border-b border-white/[0.06] pb-3">
                {[
                  { id: 'rust', label: 'Solana Anchor CPI (Rust)', icon: Cpu },
                  { id: 'ts', label: 'TypeScript Web3 SDK', icon: Code2 },
                  { id: 'rest', label: 'Supabase REST & PostGIS', icon: Database },
                  { id: 'payload', label: 'Live Oracle Feed (JSON)', icon: Radio },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = oracleTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setOracleTab(item.id as any)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#101010] text-[#A8FF00] border border-[#A8FF00]/40 shadow-sm'
                          : 'bg-[#0B0B0B] text-[#858585] border border-white/[0.06] hover:text-white'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Code Snippet Box */}
              <div className="relative rounded-2xl bg-[#050505] p-4 font-mono text-xs text-[#F5F5F5] overflow-x-auto shadow-inner border border-white/[0.08]">
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/[0.06] text-[11px] text-[#858585]">
                  <span>
                    {oracleTab === 'rust' && 'programs/client/src/consume_oracle.rs'}
                    {oracleTab === 'ts' && 'src/services/oracleClient.ts'}
                    {oracleTab === 'rest' && 'curl -X GET (Supabase PostGIS)'}
                    {oracleTab === 'payload' && `Physical Oracle Feed: Bounty #${selectedBounty.id.slice(0, 8)}`}
                  </span>

                  <button
                    onClick={() => {
                      let text = '';
                      if (oracleTab === 'rust') text = CONSUMER_INTEGRATION_CODE.rustCpi;
                      else if (oracleTab === 'ts') text = CONSUMER_INTEGRATION_CODE.typeScriptSdk;
                      else if (oracleTab === 'rest') text = CONSUMER_INTEGRATION_CODE.restApi;
                      else {
                        text = JSON.stringify(
                          {
                            oracle_version: '1.0.0',
                            program_id: 'TrUEspot11111111111111111111111111111111111',
                            bounty_id: selectedBounty.id,
                            question: selectedBounty.question,
                            status: selectedBounty.status,
                            truth_confidence_percent: confidenceScore,
                            agreed_votes: agreeCount,
                            total_votes: totalVotes,
                            geo_coordinates: [selectedBounty.lat, selectedBounty.lng],
                            verified_answer: report?.answer_text || null,
                            evidence_sha256: report?.fingerprint || null,
                            solana_settlement_tx: payoutSig || selectedBounty.payout_tx || null,
                            solscan_link: payoutSig ? `https://solscan.io/tx/${payoutSig}?cluster=devnet` : null,
                            updated_at: new Date().toISOString(),
                          },
                          null,
                          2
                        );
                      }

                      navigator.clipboard.writeText(text);
                      setCopiedSnippet(oracleTab);
                      if (onShowToast) onShowToast('Copied to Clipboard', 'Integration snippet copied successfully', 'info');
                      setTimeout(() => setCopiedSnippet(null), 2500);
                    }}
                    className="flex items-center space-x-1 px-3 py-1 rounded-full bg-[#101010] hover:bg-[#181818] border border-white/[0.08] text-[#A8FF00] font-semibold text-xs transition-colors cursor-pointer"
                  >
                    {copiedSnippet === oracleTab ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#A8FF00]" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="text-[#A8FF00]/90 leading-relaxed overflow-x-auto text-[11px]">
                  {oracleTab === 'rust' && CONSUMER_INTEGRATION_CODE.rustCpi}
                  {oracleTab === 'ts' && CONSUMER_INTEGRATION_CODE.typeScriptSdk}
                  {oracleTab === 'rest' && CONSUMER_INTEGRATION_CODE.restApi}
                  {oracleTab === 'payload' &&
                    JSON.stringify(
                      {
                        oracle_version: '1.0.0',
                        program_id: 'TrUEspot11111111111111111111111111111111111',
                        bounty_id: selectedBounty.id,
                        question: selectedBounty.question,
                        status: selectedBounty.status,
                        truth_confidence_percent: confidenceScore,
                        agreed_votes: agreeCount,
                        total_votes: totalVotes,
                        geo_coordinates: [selectedBounty.lat, selectedBounty.lng],
                        verified_answer: report?.answer_text || null,
                        evidence_sha256: report?.fingerprint || null,
                        solana_settlement_tx: payoutSig || selectedBounty.payout_tx || null,
                        solscan_link: payoutSig ? `https://solscan.io/tx/${payoutSig}?cluster=devnet` : null,
                        updated_at: new Date().toISOString(),
                      },
                      null,
                      2
                    )}
                </pre>
              </div>
            </div>
          )}
        </div>
        </>
      )}
    </div>
  );
};
