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
      <div className="bg-slate-900/60 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Physical Oracle Settlement
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full inline-flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE CLOCK: {minutesAge}m {secondsAge}s ago</span>
            </span>
          </div>

          <h2 className="text-xl font-bold text-white tracking-tight">
            {selectedBounty ? selectedBounty.place_name : 'Oracle State'}
          </h2>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {bounties.length > 1 && (
            <select
              value={selectedBounty?.id || ''}
              onChange={(e) => handleSelectBounty(e.target.value)}
              className="bg-black/40 text-xs text-white font-medium border border-white/10 rounded-full px-3 py-1.5 outline-none max-w-[200px] truncate"
            >
              {bounties.map((b) => (
                <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                  {b.place_name} ({b.status})
                </option>
              ))}
            </select>
          )}

          {selectedBounty && (
            <span
              className={`text-xs px-3.5 py-1.5 rounded-full font-bold ${
                selectedBounty.status === 'PAID'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : selectedBounty.status === 'ANSWERED'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {selectedBounty.status}
            </span>
          )}
        </div>
      </div>

      {selectedBounty && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (6 cols on desktop): Tactile Skeuomorphic Truth & Freshness Gauges */}
          <div className="lg:col-span-6 space-y-5">
            {/* Tactile Spectrum Truth Gauge Card (Reference Screen 3) */}
            <div className="bento-card p-6">
              <SpectrumTruthMeter
                confidencePercent={confidenceScore}
                agreeCount={agreeCount}
                totalVotes={totalVotes}
              />
            </div>

            {/* Tactile Vertical Freshness Ruler (Reference Screen 2) */}
            {report && (
              <VerticalFreshnessRuler
                minutesAge={minutesAge}
                observedAt={report.observed_at}
              />
            )}
          </div>

          {/* Right Column (6 cols on desktop): Observation Evidence & Settlement Execution */}
          <div className="lg:col-span-6 space-y-5">
            {/* Evidence Thumbnail Card */}
            {report && (
              <div className="bento-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase">
                    Verified Observation
                  </span>
                  <span className="text-xs font-bold font-mono text-sky-300 bg-sky-500/15 border border-sky-500/30 px-2.5 py-0.5 rounded-full">
                    {selectedBounty.amount_sol} SOL Escrowed
                  </span>
                </div>

                <div className="rounded-2xl overflow-hidden border border-white/10 bg-black aspect-video flex items-center justify-center">
                  <img
                    src={report.photo_url}
                    alt="Physical Evidence"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="p-3.5 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Confirmed Claim:</span>
                  <span className="text-xs font-bold text-sky-300 bg-sky-500/15 px-3 py-1 rounded-full border border-sky-500/30">
                    {report.answer_text}
                  </span>
                </div>
              </div>
            )}

            {/* Payout Receipt */}
            {payoutSig && (
              <div className="p-5 bg-sky-950/25 rounded-3xl border border-sky-500/30 text-xs text-sky-300 space-y-3 shadow-inner">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-sky-400" />
                    <span className="text-sm text-white">Solana Devnet Escrow Settled</span>
                  </span>
                  <a
                    href={`https://solscan.io/tx/${payoutSig}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline flex items-center space-x-1 text-sky-400 hover:text-sky-300 font-semibold"
                  >
                    <span>Solscan</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="text-xs space-y-1 pt-1 text-slate-300 font-mono">
                  <div>• Spotter Payout (80%): +{(selectedBounty.amount_sol * 0.8).toFixed(3)} SOL</div>
                  <div>• Consensus Verifiers (20%): +{(selectedBounty.amount_sol * 0.2).toFixed(3)} SOL Split</div>
                </div>
              </div>
            )}

            {/* Primary Action Button (Inspiration Capsule) */}
            {selectedBounty.status === 'ANSWERED' && (
              <button
                onClick={handleExecutePayout}
                disabled={isPayingOut}
                className="w-full bg-[#0a0e17] hover:bg-[#121927] border border-white/20 text-white rounded-full py-2.5 pl-6 pr-3 flex items-center justify-between shadow-2xl transition-all duration-300 group hover:border-sky-400/50 hover:shadow-[0_0_30px_rgba(56,189,248,0.2)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="font-semibold text-sm flex items-center space-x-2">
                  <Send className="w-4 h-4 text-sky-400" />
                  <span>{isPayingOut ? 'Settling on Solana Devnet...' : `Execute Payout (${selectedBounty.amount_sol} SOL)`}</span>
                </span>
                <div className="w-9 h-9 rounded-full bg-white text-slate-950 font-bold flex items-center justify-center text-sm shadow-md group-hover:scale-105 group-hover:bg-sky-400 group-hover:text-black transition-all">
                  ↗
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Physical Oracle Consumer API & Solana CPI Integration Panel */}
        <div className="mt-8 bento-card p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-white/10 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Cpu className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-white">Physical Oracle Consumer Gateway</h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    Anchor CPI Ready
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Query verified real-world ground truth directly from Solana smart contracts, AI agents, or REST API.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOracleDrawerOpen(!isOracleDrawerOpen)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full border border-white/15 text-xs font-semibold text-sky-300 hover:bg-white/5 transition-colors self-start sm:self-auto"
            >
              <span>{isOracleDrawerOpen ? 'Collapse Integration' : 'View Code & Payload'}</span>
              {isOracleDrawerOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {isOracleDrawerOpen && (
            <div className="mt-5 space-y-4">
              {/* Navigation Tabs */}
              <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
                <button
                  onClick={() => setOracleTab('rust')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    oracleTab === 'rust'
                      ? 'tactile-keycap-active text-sky-200'
                      : 'tactile-keycap text-slate-400'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Solana Anchor CPI (Rust)</span>
                </button>

                <button
                  onClick={() => setOracleTab('ts')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    oracleTab === 'ts'
                      ? 'tactile-keycap-active text-sky-200'
                      : 'tactile-keycap text-slate-400'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>TypeScript Web3 SDK</span>
                </button>

                <button
                  onClick={() => setOracleTab('rest')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    oracleTab === 'rest'
                      ? 'tactile-keycap-active text-sky-200'
                      : 'tactile-keycap text-slate-400'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Supabase REST & PostGIS</span>
                </button>

                <button
                  onClick={() => setOracleTab('payload')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    oracleTab === 'payload'
                      ? 'tactile-keycap-active text-sky-200'
                      : 'tactile-keycap text-slate-400'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Live Oracle Feed (JSON)</span>
                </button>
              </div>

              {/* Code Snippet Box */}
              <div className="relative rounded-2xl bg-[#060911] p-4 font-mono text-xs text-sky-100 overflow-x-auto shadow-inner border border-white/10">
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10 text-[11px] text-sky-300">
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
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-900/50 hover:bg-emerald-900/80 text-emerald-300 transition-colors"
                  >
                    {copiedSnippet === oracleTab ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
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

                <pre className="text-emerald-200 leading-relaxed overflow-x-auto text-[11px]">
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
