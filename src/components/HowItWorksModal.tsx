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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn select-none">
      <div className="relative w-full max-w-sm bg-white border border-emerald-950/10 rounded-3xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-[#E8F5E9] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-[#1E5E38]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#11291B]">How TrueSpot Works</h2>
              <p className="text-xs text-[#6B7F72]">The Solana Physical Oracle</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Simple Steps */}
        <div className="space-y-3 mb-6">
          <div className="p-3 bg-[#F4F9F5] rounded-2xl flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-[#0F3822] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              1
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#11291B]">Asker Locks Bounty</h3>
              <p className="text-xs text-[#6B7F72] mt-0.5 leading-relaxed">
                Deposit micro-bounties in SOL to ask questions about queues, stock, or open status.
              </p>
            </div>
          </div>

          <div className="p-3 bg-[#F4F9F5] rounded-2xl flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-[#0F3822] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              2
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#11291B]">Spotter Snaps Truth</h3>
              <p className="text-xs text-[#6B7F72] mt-0.5 leading-relaxed">
                Nearby users within 200m capture photos stamped with involuntary hand-tremor biometric proof.
              </p>
            </div>
          </div>

          <div className="p-3 bg-[#F4F9F5] rounded-2xl flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-[#0F3822] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              3
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#11291B]">Audit & Split Payout</h3>
              <p className="text-xs text-[#6B7F72] mt-0.5 leading-relaxed">
                Verifiers vote. Confirmed truth triggers automated 80/20 escrow release on Solana Devnet.
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
          className="w-full py-4 px-6 rounded-full bg-[#0F3822] hover:bg-[#154A2E] text-white font-semibold text-base shadow-sm flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
        >
          <span>Start Exploring</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
