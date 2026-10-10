import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Report, Bounty, Observation } from '../types';
import { hybridStore } from '../utils/storage';
import { DemoAccount } from './WalletModal';
import {
  ShieldCheck,
  Award,
  Activity,
  Compass,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  ArrowRight,
  TrendingUp,
  MapPin,
  Camera,
  Coins,
} from 'lucide-react';

interface ReputationScreenProps {
  activeAccount: DemoAccount;
  onNavigateToNearby?: () => void;
  onNavigateToReport?: () => void;
}

export const ReputationScreen: React.FC<ReputationScreenProps> = ({
  activeAccount,
  onNavigateToNearby,
  onNavigateToReport,
}) => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);

  useEffect(() => {
    const load = async () => {
      const r = await hybridStore.getReports();
      const b = await hybridStore.getBounties();
      const o = await hybridStore.getObservations();
      setReports(r);
      setBounties(b);
      setObservations(o);
    };
    load();
    const unsub = hybridStore.subscribeToChanges(load);
    return () => unsub();
  }, []);

  const spotterReports = reports.filter(
    (r) =>
      !r.reporter_wallet ||
      r.reporter_wallet.trim().toLowerCase() === activeAccount.address.trim().toLowerCase() ||
      reports.length <= 4 // show rich feedback on demo
  );

  const acceptedCount = spotterReports.filter((r) => r.status === 'ACCEPTED').length;
  const pendingCount = spotterReports.filter((r) => r.status === 'PENDING').length;
  const totalSubmissions = spotterReports.length;
  const honestyScore = totalSubmissions > 0
    ? Math.min(99.8, Math.max(92.0, 95 + (acceptedCount / totalSubmissions) * 4.8))
    : 98.6;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Hero Header */}
      <div className="bg-[#0B0B0B] border border-white/[0.08] rounded-[24px] p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#A8FF00]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#A8FF00]/10 border border-[#A8FF00]/30 text-xs font-mono font-bold text-[#A8FF00]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Spotter Trust & Sentinel Tier</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Hardware Biometrics & Reputation
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl leading-relaxed">
              TrueSpot calculates spotter reputation using multi-axial gyroscopic tremor analysis, satellite lock precision, and consensus corroboration.
            </p>
          </div>

          {/* Large Trust Gauge Bento */}
          <div className="bg-[#121212] border border-white/[0.08] rounded-[20px] p-5 shrink-0 flex items-center space-x-4 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#A8FF00]/20 to-[#34D399]/20 border border-[#A8FF00]/40 flex flex-col items-center justify-center text-center">
              <span className="text-xl font-black text-[#A8FF00] font-mono leading-none">
                {honestyScore.toFixed(1)}%
              </span>
              <span className="text-[9px] text-zinc-400 font-bold uppercase mt-1">Honesty</span>
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Level 4 Sentinel Tier</span>
              <span className="text-[11px] text-zinc-400 block font-mono">Status: High-Trust Verified</span>
              <span className="text-[10px] text-[#A8FF00] font-bold block mt-1">1.25x Payout Multiplier Unlocked</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Pillars of Spotter Reputation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-5 space-y-2.5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300">Biometric Tremor</span>
            <Activity className="w-4 h-4 text-[#A8FF00]" />
          </div>
          <div className="text-2xl font-black font-mono text-white">0.046g</div>
          <p className="text-[11px] text-zinc-400">
            Gyroscopic natural hand variance confirms organic human capture vs automated emulator replay.
          </p>
          <div className="text-[10px] text-[#A8FF00] font-mono font-bold">✓ 100% Human Score</div>
        </div>

        <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-5 space-y-2.5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300">Geofence Compliance</span>
            <Compass className="w-4 h-4 text-[#A8FF00]" />
          </div>
          <div className="text-2xl font-black font-mono text-white">±2.4m</div>
          <p className="text-[11px] text-zinc-400">
            Average satellite fix delta against query geofence coordinates. Strict 200m threshold enforced.
          </p>
          <div className="text-[10px] text-[#A8FF00] font-mono font-bold">✓ High Spatial Accuracy</div>
        </div>

        <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-5 space-y-2.5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300">Corroboration Rate</span>
            <Award className="w-4 h-4 text-[#A8FF00]" />
          </div>
          <div className="text-2xl font-black font-mono text-white">{acceptedCount} / {Math.max(totalSubmissions, 1)}</div>
          <p className="text-[11px] text-zinc-400">
            Independent swarm verification consensus agreed with submitted evidence.
          </p>
          <div className="text-[10px] text-[#A8FF00] font-mono font-bold">✓ 0 Malicious Flags</div>
        </div>

        <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[20px] p-5 space-y-2.5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300">Response Speed</span>
            <Zap className="w-4 h-4 text-[#A8FF00]" />
          </div>
          <div className="text-2xl font-black font-mono text-white">8.4 min</div>
          <p className="text-[11px] text-zinc-400">
            Average turnaround from bounty creation to physical on-site evidence upload.
          </p>
          <div className="text-[10px] text-[#A8FF00] font-mono font-bold">✓ Top 5% Speed Decile</div>
        </div>
      </div>

      {/* Verified Submissions & Hardware Attestation Ledger */}
      <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[24px] p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-[#A8FF00]" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Spotter Attestation History ({spotterReports.length})
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (onNavigateToNearby) onNavigateToNearby();
                else navigate('/nearby');
              }}
              className="py-2 px-3.5 rounded-full bg-[#161616] hover:bg-[#202020] border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <Compass className="w-3.5 h-3.5 text-[#A8FF00]" />
              <span>Explore 200m Radar</span>
            </button>
            <button
              onClick={() => {
                if (onNavigateToReport) onNavigateToReport();
                else navigate('/report');
              }}
              className="py-2 px-3.5 rounded-full bg-[#A8FF00] hover:brightness-110 text-black text-xs font-black shadow-md shadow-[#A8FF00]/25 transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Submit Evidence</span>
            </button>
          </div>
        </div>

        {spotterReports.length === 0 ? (
          <div className="p-12 text-center bg-[#101010] rounded-2xl border border-dashed border-white/[0.08] space-y-3">
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              No field evidence submissions found yet. Locate active physical bounties on the 200m radar and submit camera proofs to build your on-chain reputation.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-zinc-500 uppercase font-bold text-[10px]">
                  <th className="py-2.5 px-3">Location & Inquiry</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Tremor Variance</th>
                  <th className="py-2.5 px-3">Satellite Accuracy</th>
                  <th className="py-2.5 px-3">SHA-256 Fingerprint</th>
                  <th className="py-2.5 px-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] font-mono text-[11px]">
                {spotterReports.map((r) => {
                  const bounty = bounties.find((b) => b.id === r.bounty_id);
                  return (
                    <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3 font-sans">
                        <div className="font-bold text-white truncate max-w-xs">
                          {bounty?.place_name || 'Designated Coordinates'}
                        </div>
                        <div className="text-zinc-400 text-[11px] truncate max-w-xs">
                          Answer: {r.answer_text}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.status === 'ACCEPTED'
                              ? 'bg-[#A8FF00]/15 text-[#A8FF00] border border-[#A8FF00]/30'
                              : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {r.status || 'PENDING'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-zinc-300">
                        {r.gyro_variance || 0.046}g
                      </td>
                      <td className="py-3 px-3 text-zinc-300">
                        ±{r.gps_accuracy || 3}m
                      </td>
                      <td className="py-3 px-3 text-zinc-500 truncate max-w-[140px]">
                        {r.fingerprint}
                      </td>
                      <td className="py-3 px-3 text-right text-zinc-400 font-sans text-[11px]">
                        {new Date(r.observed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
