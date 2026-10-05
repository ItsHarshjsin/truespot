import React from 'react';
import { X, ArrowRight, ShieldCheck } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <div className="relative w-full max-w-sm bg-[#0B0B0B] border border-white/[0.08] rounded-[24px] p-6 shadow-2xl text-[#F5F5F5]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.07] mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-[#101010] border border-white/[0.08] flex items-center justify-center text-[#A8FF00]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F5F5F5]">How TrueSpot Works</h2>
              <p className="text-xs text-[#858585]">Decentralized Physical Verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#101010] border border-white/10 flex items-center justify-center text-[#858585] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Simple Steps */}
        <div className="space-y-3 mb-6">
          <div className="p-3.5 bg-[#101010] border border-white/[0.07] rounded-xl flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-[#A8FF00] text-black flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
              1
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#F5F5F5]">Maker Locks Escrow</h3>
              <p className="text-xs text-[#858585] mt-0.5 leading-relaxed">
                Deposit micro-bounties in SOL to ask physical questions about wait times, stock, or conditions.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-[#101010] border border-white/[0.07] rounded-xl flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-[#A8FF00] text-black flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
              2
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#F5F5F5]">Worker Captures Truth</h3>
              <p className="text-xs text-[#858585] mt-0.5 leading-relaxed">
                Nearby field workers within 200m snap live photo proof stamped with device sensor telemetry.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-[#101010] border border-white/[0.07] rounded-xl flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-[#A8FF00] text-black flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
              3
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#F5F5F5]">Instant 100% Payout</h3>
              <p className="text-xs text-[#858585] mt-0.5 leading-relaxed">
                Evidence verified triggers instant 100% escrow settlement directly to worker's Solana wallet.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => {
            onClose();
            onStartDemo();
          }}
          className="w-full py-3.5 px-6 rounded-full bg-[#A8FF00] hover:bg-[#b8ff24] text-black font-black text-xs shadow-xl shadow-[#A8FF00]/30 flex items-center justify-center space-x-2 transition-all active:scale-[0.98] cursor-pointer"
        >
          <span>Start Exploring</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
