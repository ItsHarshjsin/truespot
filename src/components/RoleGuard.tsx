import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, AlertCircle } from 'lucide-react';

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

  // Seamlessly synchronize userMode if route requires a specific mode without blocking popups
  useEffect(() => {
    if (requiredMode && requiredMode !== 'admin' && requiredMode !== currentMode) {
      onSwitchMode(requiredMode);
    }
  }, [requiredMode, currentMode, onSwitchMode]);

  // If no mode or standard maker/spotter role, render children seamlessly without blocking popups
  if (!requiredMode || requiredMode !== 'admin') {
    return <>{children}</>;
  }

  // Admin access gate (preserves protected authentication for protocol admin diagnostics)
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
    <div className="max-w-xl mx-auto my-12 bg-[#0B0B0B] border border-white/[0.08] rounded-[24px] p-6 sm:p-8 space-y-6 shadow-none text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#141414] border border-white/10 flex items-center justify-center mx-auto text-[#A8FF00]">
        <Lock className="w-6 h-6" />
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
            className="flex-1 py-2.5 px-4 rounded-full bg-[#A8FF00] hover:bg-[#b8ff24] text-black font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center space-x-1.5"
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
};
