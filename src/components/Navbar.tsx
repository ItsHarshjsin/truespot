import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { DemoAccount } from './WalletModal';
import {
  ChevronLeft,
  HelpCircle,
  Shield,
  PlusCircle,
  Compass,
  FileCheck2,
  Lock,
  Code2,
  Database,
  ShieldCheck,
  Camera,
  Coins,
  Award,
  BarChart3,
  MapPin,
  Settings,
  User,
} from 'lucide-react';

interface NavbarProps {
  title?: string;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  unverifiedCount?: number;
  onBack?: () => void;
  canGoBack?: boolean;
  onOpenWalletModal: () => void;
  onOpenHowItWorks: () => void;
  onOpenSupabaseModal?: () => void;
  isSupabaseConnected?: boolean;
  activeDemoAccount: DemoAccount;
  isUsingDemo: boolean;
  onResetDemoState?: () => void;
  userMode: 'maker' | 'spotter';
  onSelectUserMode: (mode: 'maker' | 'spotter') => void;
  isAdmin?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  unverifiedCount = 0,
  onBack,
  canGoBack,
  onOpenWalletModal,
  onOpenHowItWorks,
  onOpenSupabaseModal,
  activeDemoAccount,
  isUsingDemo,
  setActiveTab,
  userMode,
  onSelectUserMode,
  isAdmin = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { connection } = useConnection();
  const { connected, publicKey, wallet } = useWallet();
  const [realBalance, setRealBalance] = useState<number | null>(null);

  useEffect(() => {
    if (connected && publicKey) {
      let isMounted = true;
      const fetchBal = async () => {
        try {
          const lamports = await connection.getBalance(publicKey, 'confirmed');
          if (isMounted) setRealBalance(lamports / LAMPORTS_PER_SOL);
        } catch (e) {
          console.warn('Could not query Devnet balance:', e);
        }
      };
      fetchBal();
      const interval = setInterval(fetchBal, 10000);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    } else {
      setRealBalance(null);
    }
  }, [connected, publicKey, connection]);

  const isRealWalletActive = connected && !isUsingDemo;
  const displayWalletName = isRealWalletActive
    ? wallet?.adapter.name || 'Phantom'
    : activeDemoAccount.name.split(' ')[0];

  const displayBalance = isRealWalletActive
    ? realBalance !== null
      ? `${realBalance.toFixed(2)} SOL`
      : 'Loading...'
    : `${activeDemoAccount.balanceSol.toFixed(2)} SOL`;

  const isRouteActive = (paths: string[]) => {
    return paths.includes(location.pathname);
  };

  const handleNavigate = (path: string, key: string) => {
    navigate(path);
    if (setActiveTab) setActiveTab(key);
  };

  return (
    <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2 select-none relative z-40">
      <div className="flex items-center justify-between gap-3">
        {/* Left: CoinVex Minimalist Brand Identity */}
        <div className="flex items-center space-x-3 shrink-0">
          {canGoBack && onBack && (
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-full bg-[#101010] border border-white/10 flex items-center justify-center text-white hover:text-[#A8FF00] transition-colors cursor-pointer"
              title="Go back"
            >
              <ChevronLeft className="w-4 h-4 text-zinc-300" />
            </button>
          )}

          <div
            onClick={() => handleNavigate(userMode === 'maker' ? '/bounties' : '/nearby', userMode === 'maker' ? 'bounties' : 'nearby')}
            className="flex items-center space-x-2.5 cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-[#A8FF00] text-black flex items-center justify-center shadow-md shadow-[#A8FF00]/25 group-hover:scale-105 transition-transform">
              <Shield className="w-4 h-4 text-black stroke-[2.5]" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              TrueSpot
            </span>
          </div>
        </div>

        {/* Center: Mode-Restructured Navigation */}
        <nav className="hidden xl:flex items-center bg-[#0D0D0D] p-1 rounded-full border border-white/[0.08] shadow-inner space-x-0.5 shrink-0">
          {userMode === 'maker' ? (
            /* ================= MAKER MODE NAVIGATION ================= */
            <>
              {/* 1. Query Studio */}
              <button
                type="button"
                onClick={() => handleNavigate('/studio', 'studio')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isRouteActive(['/studio'])
                    ? 'border border-[#A8FF00] text-[#A8FF00] bg-black/60 shadow-sm shadow-[#A8FF00]/10 font-bold'
                    : 'text-[#858585] hover:text-white'
                }`}
                title="Create Physical Query & Lock Escrow"
              >
                <PlusCircle className={`w-3.5 h-3.5 ${isRouteActive(['/studio']) ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
                <span>Query Studio</span>
              </button>

              {/* 2. My Bounties */}
              <button
                type="button"
                onClick={() => handleNavigate('/bounties', 'bounties')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isRouteActive(['/bounties', '/dashboard', '/maker', '/'])
                    ? 'border border-[#A8FF00] text-[#A8FF00] bg-black/60 shadow-sm shadow-[#A8FF00]/10 font-bold'
                    : 'text-[#858585] hover:text-white'
                }`}
                title="Manage Created Tasks & Escrow Ledger"
              >
                <FileCheck2 className={`w-3.5 h-3.5 ${isRouteActive(['/bounties', '/dashboard', '/maker', '/']) ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
                <span>My Bounties</span>
              </button>

              {/* 3. Evidence Review */}
              <button
                type="button"
                onClick={() => handleNavigate('/review', 'review')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isRouteActive(['/review', '/explorer'])
                    ? 'border border-[#A8FF00] text-[#A8FF00] bg-black/60 shadow-sm shadow-[#A8FF00]/10 font-bold'
                    : 'text-[#858585] hover:text-white'
                }`}
                title="Review Hardware Evidence & Settle Payouts"
              >
                <ShieldCheck className={`w-3.5 h-3.5 ${isRouteActive(['/review', '/explorer']) ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
                <span>Evidence Review</span>
                {unverifiedCount > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A8FF00] animate-pulse" />
                )}
              </button>

              {/* 4. Truth Records */}
              <button
                type="button"
                onClick={() => handleNavigate('/records', 'records')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isRouteActive(['/records', '/developers'])
                    ? 'border border-[#A8FF00] text-[#A8FF00] bg-black/60 shadow-sm shadow-[#A8FF00]/10 font-bold'
                    : 'text-[#858585] hover:text-white'
                }`}
                title="Open Cryptographic Truth Records & API"
              >
                <Code2 className={`w-3.5 h-3.5 ${isRouteActive(['/records', '/developers']) ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
                <span>Truth Records</span>
              </button>

              {/* 5. Maker Analytics */}
              <button
                type="button"
                onClick={() => handleNavigate('/analytics', 'analytics')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isRouteActive(['/analytics'])
                    ? 'border border-[#A8FF00] text-[#A8FF00] bg-black/60 shadow-sm shadow-[#A8FF00]/10 font-bold'
                    : 'text-[#858585] hover:text-white'
                }`}
                title="Maker Escrow & Verification Analytics"
              >
                <BarChart3 className={`w-3.5 h-3.5 ${isRouteActive(['/analytics']) ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
                <span>Analytics</span>
              </button>
            </>
          ) : (
            /* ================= SPOTTER MODE NAVIGATION ================= */
            <>
              {/* 1. Nearby Bounties */}
              <button
                type="button"
                onClick={() => handleNavigate('/nearby', 'nearby')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isRouteActive(['/nearby', '/radar', '/spotter', '/'])
                    ? 'border border-[#A8FF00] text-[#A8FF00] bg-black/60 shadow-sm shadow-[#A8FF00]/10 font-bold'
                    : 'text-[#858585] hover:text-white'
                }`}
                title="Explore 200m Geofenced Physical Bounties"
              >
                <Compass className={`w-3.5 h-3.5 ${isRouteActive(['/nearby', '/radar', '/spotter', '/']) ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
                <span>Nearby Bounties</span>
                {unverifiedCount > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A8FF00] animate-pulse" />
                )}
              </button>

              {/* 2. Submit Evidence */}
              <button
                type="button"
                onClick={() => handleNavigate('/report', 'report')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isRouteActive(['/report'])
                    ? 'border border-[#A8FF00] text-[#A8FF00] bg-black/60 shadow-sm shadow-[#A8FF00]/10 font-bold'
                    : 'text-[#858585] hover:text-white'
                }`}
                title="Capture Hardware Proof & Submit Evidence"
              >
                <Camera className={`w-3.5 h-3.5 ${isRouteActive(['/report']) ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
                <span>Submit Evidence</span>
              </button>

              {/* 3. My Submissions */}
              <button
                type="button"
                onClick={() => handleNavigate('/submissions', 'submissions')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isRouteActive(['/submissions'])
                    ? 'border border-[#A8FF00] text-[#A8FF00] bg-black/60 shadow-sm shadow-[#A8FF00]/10 font-bold'
                    : 'text-[#858585] hover:text-white'
                }`}
                title="View Submitted Field Proofs & Hardware Stamps"
              >
                <FileCheck2 className={`w-3.5 h-3.5 ${isRouteActive(['/submissions']) ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
                <span>My Submissions</span>
              </button>

              {/* 4. Earnings */}
              <button
                type="button"
                onClick={() => handleNavigate('/earnings', 'earnings')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isRouteActive(['/earnings'])
                    ? 'border border-[#A8FF00] text-[#A8FF00] bg-black/60 shadow-sm shadow-[#A8FF00]/10 font-bold'
                    : 'text-[#858585] hover:text-white'
                }`}
                title="Spotter Payouts & Settled SOL Earnings"
              >
                <Coins className={`w-3.5 h-3.5 ${isRouteActive(['/earnings']) ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
                <span>Earnings</span>
              </button>

              {/* 5. Reputation */}
              <button
                type="button"
                onClick={() => handleNavigate('/reputation', 'reputation')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isRouteActive(['/reputation'])
                    ? 'border border-[#A8FF00] text-[#A8FF00] bg-black/60 shadow-sm shadow-[#A8FF00]/10 font-bold'
                    : 'text-[#858585] hover:text-white'
                }`}
                title="Spotter Hardware Honesty & Gyro Tremor Trust Score"
              >
                <Award className={`w-3.5 h-3.5 ${isRouteActive(['/reputation']) ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
                <span>Reputation</span>
              </button>
            </>
          )}

          {/* Elegant Divider between Mode Nav and Shared Nav */}
          <div className="h-4 w-px bg-white/[0.12] mx-1" />

          {/* ================= SHARED NAVIGATION ================= */}
          {/* Live Reality Map */}
          <button
            type="button"
            onClick={() => handleNavigate('/map', 'map')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              isRouteActive(['/map'])
                ? 'border border-[#A8FF00] text-[#A8FF00] bg-black/60 shadow-sm shadow-[#A8FF00]/10 font-bold'
                : 'text-[#858585] hover:text-white'
            }`}
            title="Interactive OpenStreetMap Reality Map"
          >
            <MapPin className={`w-3.5 h-3.5 ${isRouteActive(['/map']) ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
            <span>Reality Map</span>
          </button>

          {/* Escrow Vault / Wallet */}
          <button
            type="button"
            onClick={() => handleNavigate('/vault', 'vault')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              isRouteActive(['/vault', '/escrow', '/wallets'])
                ? 'border border-[#A8FF00] text-[#A8FF00] bg-black/60 shadow-sm shadow-[#A8FF00]/10 font-bold'
                : 'text-[#858585] hover:text-white'
            }`}
            title="Escrow Vault & Ledger Hub"
          >
            <Lock className={`w-3.5 h-3.5 ${isRouteActive(['/vault', '/escrow', '/wallets']) ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
            <span>Vault</span>
          </button>

          {/* Admin link (visible if admin authorized or currently on admin route) */}
          {(isAdmin || isRouteActive(['/admin'])) && (
            <button
              type="button"
              onClick={() => handleNavigate('/admin', 'admin')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                isRouteActive(['/admin'])
                  ? 'border border-amber-400 text-amber-300 bg-amber-950/40 shadow-sm font-bold'
                  : 'text-amber-400/70 hover:text-amber-300'
              }`}
              title="Protected Admin Diagnostics"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin</span>
            </button>
          )}
        </nav>

        {/* Right Section: Role Switcher Pill + Connected Wallet/Profile + Settings */}
        <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
          {/* Clear Role Switcher Pill (Maker Mode <-> Spotter Mode) */}
          <div className="flex items-center bg-[#0D0D0D] p-0.5 rounded-full border border-white/10 shadow-inner">
            <button
              type="button"
              onClick={() => onSelectUserMode('maker')}
              className={`flex items-center space-x-1 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
                userMode === 'maker'
                  ? 'bg-[#A8FF00] text-black shadow-sm font-bold'
                  : 'text-[#858585] hover:text-white'
              }`}
              title="Switch to Maker Mode (Query Studio, My Bounties, Evidence Review)"
            >
              <PlusCircle className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${userMode === 'maker' ? 'text-black' : 'text-zinc-400'}`} />
              <span>Maker</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectUserMode('spotter')}
              className={`flex items-center space-x-1 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
                userMode === 'spotter'
                  ? 'bg-[#A8FF00] text-black shadow-sm font-bold'
                  : 'text-[#858585] hover:text-white'
              }`}
              title="Switch to Spotter Mode (200m Radar, Submissions, Earnings)"
            >
              <Compass className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${userMode === 'spotter' ? 'text-black' : 'text-zinc-400'}`} />
              <span>Spotter</span>
            </button>
          </div>

          {/* User Greeting & Purple Avatar (Clicking navigates to Profile) */}
          <div
            onClick={() => handleNavigate('/profile', 'profile')}
            className={`flex items-center space-x-2 cursor-pointer hover:opacity-90 transition-opacity p-0.5 rounded-full ${
              isRouteActive(['/profile']) ? 'ring-1 ring-[#A8FF00]' : ''
            }`}
            title="View Profile & Dual-Role Details"
          >
            <span className="text-xs text-zinc-300 font-medium hidden 2xl:inline">
              Hi, {displayWalletName}
            </span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 border border-purple-400/30 flex items-center justify-center text-xs font-bold text-white shadow-sm overflow-hidden">
              <span>{displayWalletName.charAt(0)}</span>
            </div>
          </div>

          {/* Quick Balance Pill (Clicking opens Wallet Modal) */}
          <div
            onClick={onOpenWalletModal}
            className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-[#101010] border border-white/[0.07] text-xs font-mono cursor-pointer hover:border-white/20 transition-colors"
            title="Switch Active Persona or Connect Phantom"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#A8FF00] animate-pulse" />
            <span className="text-[#A8FF00] font-bold">{displayBalance}</span>
          </div>

          {/* Settings Button */}
          <button
            type="button"
            onClick={() => handleNavigate('/settings', 'settings')}
            className={`w-8 h-8 rounded-full bg-[#101010] border flex items-center justify-center transition-colors cursor-pointer ${
              isRouteActive(['/settings'])
                ? 'border-[#A8FF00] text-[#A8FF00]'
                : 'border-white/10 text-zinc-400 hover:text-white'
            }`}
            title="Protocol & Workspace Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* Guide / How It Works */}
          <button
            type="button"
            onClick={onOpenHowItWorks}
            className="w-8 h-8 rounded-full bg-[#101010] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer hidden sm:flex"
            title="Protocol Guide"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

          {/* Supabase PostGIS status */}
          {onOpenSupabaseModal && (
            <button
              type="button"
              onClick={onOpenSupabaseModal}
              className="w-8 h-8 rounded-full bg-[#101010] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer hidden sm:flex"
              title="PostgreSQL / PostGIS Sync"
            >
              <Database className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
