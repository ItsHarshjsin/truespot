import React from 'react';
import { X, ArrowRight, ShieldCheck, Eye, Zap, Database, Globe } from 'lucide-react';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDemo: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({
  isOpen,
  onClose,
  onStartDemo,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
      <div className="relative w-full max-w-lg bg-[#0B0B0B] border border-white/[0.08] rounded-[28px] p-6 sm:p-7 shadow-2xl text-[#F5F5F5] space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.07]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-[#101010] border border-white/[0.08] flex items-center justify-center text-[#A8FF00]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">The TrueSpot Thesis</h2>
              <p className="text-xs text-[#858585] font-mono">Real-Time DePIN Reality Oracle</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#101010] border border-white/10 flex items-center justify-center text-[#858585] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Core Vision Quote Box */}
        <div className="p-4 bg-gradient-to-br from-[#101010] to-[#0D0D0D] border border-white/[0.08] rounded-[20px] space-y-2">
          <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed">
            <span className="text-[#A8FF00] font-bold">"The internet knows where everything is, but not what's happening right now.</span>{' '}
            AI can search, but it can't stand there and look. TrueSpot pays real people to be the sensor."
          </p>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Anyone nearby can verify reality live with GPS-timestamped evidence — no gatekeeper, no signup. When independent reports agree, Solana pays instantly. And answers stay open as freshness-scored data for apps and AI agents, instead of dying in a chat.
          </p>
        </div>

        {/* 4 Architectural Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-[#101010] border border-white/[0.06] rounded-[16px] space-y-1">
            <div className="flex items-center space-x-1.5 text-[#A8FF00] font-bold">
              <Eye className="w-3.5 h-3.5" />
              <span>1. People as the Sensor</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-normal">
              Ephemeral, permissionless ground spotters. No gatekeeper, no Web2 login friction.
            </p>
          </div>

          <div className="p-3.5 bg-[#101010] border border-white/[0.06] rounded-[16px] space-y-1">
            <div className="flex items-center space-x-1.5 text-[#00F0FF] font-bold">
              <Globe className="w-3.5 h-3.5" />
              <span>2. Cryptographic Proof</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-normal">
              Client-side WebP image compression, SHA-256 fingerprint, and Haversine geofence match.
            </p>
          </div>

          <div className="p-3.5 bg-[#101010] border border-white/[0.06] rounded-[16px] space-y-1">
            <div className="flex items-center space-x-1.5 text-[#FFB800] font-bold">
              <Zap className="w-3.5 h-3.5" />
              <span>3. Instant Solana Settlement</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-normal">
              Escrow PDA transfers 97.5% directly to contributor, 2.5% to treasury, with 0% fee on refund.
            </p>
          </div>

          <div className="p-3.5 bg-[#101010] border border-white/[0.06] rounded-[16px] space-y-1">
            <div className="flex items-center space-x-1.5 text-[#A8FF00] font-bold">
              <Database className="w-3.5 h-3.5" />
              <span>4. Open Truth for AI</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-normal">
              Machine-readable JSON endpoints external applications and autonomous agents can query 24/7.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => {
            onClose();
            onStartDemo();
          }}
          className="w-full py-3.5 px-6 rounded-full bg-[#A8FF00] hover:brightness-110 text-black font-black text-xs shadow-xl shadow-[#A8FF00]/25 flex items-center justify-center space-x-2 transition-all cursor-pointer"
        >
          <span>Explore Live Reality Map</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
        </button>
      </div>
    </div>
  );
};
