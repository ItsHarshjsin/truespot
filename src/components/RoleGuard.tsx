import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  ArrowRight,
  Lock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Compass,
} from 'lucide-react';

interface RoleGuardProps {
  requiredMode?: 'maker' | 'spotter' | 'admin';
  currentMode: 'maker' | 'spotter';
  onSwitchMode: (mode: 'maker' | 'spotter') => void;
  isAdmin?: boolean;
  onAuthorizeAdmin?: () => void;
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  requiredMode,
  currentMode,
  onSwitchMode,
  isAdmin = false,
  onAuthorizeAdmin,
  children,
}) => {
  const navigate = useNavigate();
  const [adminPasskey, setAdminPasskey] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);

  // If no specific mode required or mode matches, render directly
  if (!requiredMode) {
    return <>{children}</>;
  }

  // Admin access check
  if (requiredMode === 'admin') {
    const isSessionAdmin =
      isAdmin ||
      (typeof window !== 'undefined' &&
        (localStorage.getItem('truespot_admin_auth') === 'true' ||
          sessionStorage.getItem('truespot_admin_auth') === 'true'));

    if (isSessionAdmin) {
      return <>{children}</>;
    }

    const handleUnlockAdmin = (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      // Accepts protocol admin key or demo bypass
      if (
        adminPasskey.trim().toLowerCase() === 'truespot-admin-2025' ||
        adminPasskey.trim().toLowerCase() === 'admin' ||
        adminPasskey.trim() === ''
      ) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('truespot_admin_auth', 'true');
        }
        if (onAuthorizeAdmin) onAuthorizeAdmin();
        setAdminError(null);
      } else {
        setAdminError('Invalid administrator passkey. Use: truespot-admin-2025');
      }
    };

    return (
      <div className="max-w-xl mx-auto my-12 bg-[#0B0B0B] border border-white/[0.08] rounded-[24px] p-6 sm:p-8 space-y-6 shadow-2xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-500/10">
          <Lock className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white tracking-tight">
            Restricted Administrator Portal
          </h2>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
            This verification panel contains low-level diagnostic controls, RPC telemetry, and database integrity audits. Authorized access only.
          </p>
        </div>

        <form onSubmit={handleUnlockAdmin} className="space-y-4 max-w-sm mx-auto text-left">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-zinc-300 block">
              Administrator Passkey
            </label>
            <input
              type="password"
              value={adminPasskey}
              onChange={(e) => {
                setAdminPasskey(e.target.value);
                setAdminError(null);
              }}
              placeholder="Enter admin passkey (or leave empty for demo)"
              className="w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#A8FF00] transition-colors font-mono"
            />
            {adminError && (
              <p className="text-[11px] text-red-400 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{adminError}</span>
              </p>
            )}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-full bg-[#A8FF00] hover:brightness-110 text-black font-extrabold text-xs shadow-md shadow-[#A8FF00]/25 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <span>Unlock Admin Panel</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/bounties')}
              className="py-2.5 px-4 rounded-full bg-[#161616] hover:bg-[#202020] border border-white/10 text-zinc-300 text-xs font-semibold transition-all cursor-pointer"
            >
              Back to App
            </button>
          </div>
        </form>

        <div className="pt-3 border-t border-white/[0.06] text-[10px] text-zinc-500">
          Devnet Test Key: <code className="text-zinc-400 font-mono">truespot-admin-2025</code>
        </div>
      </div>
    );
  }

  // Maker vs Spotter Mode mismatch guard
  if (requiredMode !== currentMode) {
    const isTargetMaker = requiredMode === 'maker';
    const TargetIcon = isTargetMaker ? PlusCircle : Compass;
    const targetTitle = isTargetMaker ? 'Maker Mode Required' : 'Spotter Mode Required';
    const targetDesc = isTargetMaker
      ? 'This workspace (Query Studio, My Bounties & Review) is configured for Task Makers. Switch to Maker Mode to access these creator tools without changing your wallet.'
      : 'This workspace (200m Radar, Evidence Capture & Earnings) is configured for Field Spotters. Switch to Spotter Mode to view nearby bounties and submit physical proofs.';

    return (
      <div className="max-w-xl mx-auto my-12 bg-[#0B0B0B] border border-white/[0.08] rounded-[24px] p-6 sm:p-8 space-y-6 shadow-2xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#A8FF00]/10 border border-[#A8FF00]/30 flex items-center justify-center mx-auto text-[#A8FF00] shadow-lg shadow-[#A8FF00]/10">
          <TargetIcon className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[11px] font-mono text-zinc-300">
            <span>Current: <strong className="text-white capitalize">{currentMode} Mode</strong></span>
            <span>•</span>
            <span>Target: <strong className="text-[#A8FF00] capitalize">{requiredMode} Mode</strong></span>
          </div>

          <h2 className="text-xl font-bold text-white tracking-tight">
            {targetTitle}
          </h2>
          <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
            {targetDesc}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onSwitchMode(requiredMode)}
            className="w-full sm:w-auto py-3 px-6 rounded-full bg-[#A8FF00] hover:brightness-110 text-black font-extrabold text-xs shadow-md shadow-[#A8FF00]/25 transition-all cursor-pointer flex items-center justify-center space-x-2"
          >
            <span>Switch to {isTargetMaker ? 'Maker' : 'Spotter'} Mode & Continue</span>
            <ArrowRight className="w-3.5 h-3.5 text-black" />
          </button>

          <button
            type="button"
            onClick={() => navigate(currentMode === 'maker' ? '/bounties' : '/nearby')}
            className="w-full sm:w-auto py-3 px-5 rounded-full bg-[#161616] hover:bg-[#202020] border border-white/10 text-zinc-300 text-xs font-semibold transition-all cursor-pointer"
          >
            Return to {currentMode === 'maker' ? 'My Bounties' : 'Nearby Radar'}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
