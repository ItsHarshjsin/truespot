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

  const displayShortAddress = isRealWalletActive && publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : activeDemoAccount.address;

  const displayBalance = isRealWalletActive
    ? realBalance !== null
      ? `${realBalance.toFixed(2)} SOL`
      : '...'
    : `${activeDemoAccount.balanceSol.toFixed(2)} SOL`;

  const isRouteActive = (paths: string[]) => {
    return paths.includes(location.pathname);
  };

  const handleNavigate = (path: string, key: string) => {
    navigate(path);
    if (setActiveTab) setActiveTab(key);
  };

  return (
    <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-2 select-none relative z-40">
      <div className="flex items-center justify-between gap-2 xl:gap-3 w-full">
        
        {/* ================= 1. LEFT ZONE: BRAND & ROLE SWITCHER ================= */}
        <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
          {canGoBack && onBack && (
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-full bg-[#101010] border border-white/10 flex items-center justify-center text-white hover:text-[#A8FF00] transition-colors cursor-pointer"
              title="Go back"
            >
              <ChevronLeft className="w-4 h-4 text-zinc-300" />
            </button>
          )}

          {/* Logo */}
          <div
            onClick={() => handleNavigate(userMode === 'maker' ? '/bounties' : '/nearby', userMode === 'maker' ? 'bounties' : 'nearby')}
            className="flex items-center space-x-2 cursor-pointer group shrink-0"
          >
            <div className="w-7 h-7 rounded-lg bg-[#A8FF00] text-black flex items-center justify-center shadow-md shadow-[#A8FF00]/25 group-hover:scale-105 transition-transform">
              <Shield className="w-4 h-4 text-black stroke-[2.5]" />
            </div>
            <span className="text-base font-bold text-white tracking-tight hidden sm:inline">
              TrueSpot
            </span>
          </div>

          {/* Segmented Role Switcher (Maker <-> Spotter) */}
          <div className="flex items-center bg-[#101010] p-1 rounded-full border border-white/[0.08] shadow-inner h-9">
            <button
              type="button"
              onClick={() => onSelectUserMode('maker')}
              className={`flex items-center space-x-1 px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer h-7 ${
                userMode === 'maker'
                  ? 'bg-[#A8FF00] text-black shadow-sm font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Maker Mode (Query Studio, My Bounties, Evidence Review)"
            >
              <PlusCircle className={`w-3.5 h-3.5 ${userMode === 'maker' ? 'text-black' : 'text-zinc-400'}`} />
              <span>Maker</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectUserMode('spotter')}
              className={`flex items-center space-x-1 px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer h-7 ${
                userMode === 'spotter'
                  ? 'bg-[#A8FF00] text-black shadow-sm font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Spotter Mode (Nearby Radar, Submissions, Earnings)"
            >
              <Compass className={`w-3.5 h-3.5 ${userMode === 'spotter' ? 'text-black' : 'text-zinc-400'}`} />
              <span>Spotter</span>
            </button>
          </div>
        </div>

        {/* ================= 2. CENTER ZONE: ACTIVE MODE NAVIGATION ================= */}
        <nav className="hidden lg:flex items-center bg-[#0D0D0D] p-1 rounded-full border border-white/[0.08] shadow-inner space-x-0.5 shrink-0 h-9">
          {userMode === 'maker' ? (
            /* ================= MAKER LINKS ================= */
            <>
              <button
                type="button"
                onClick={() => handleNavigate('/studio', 'studio')}
                className={`flex items-center space-x-1.5 px-2.5 xl:px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer h-7 ${
                  isRouteActive(['/studio'])
                    ? 'bg-white/[0.12] text-white font-semibold border border-white/10 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <PlusCircle className={`w-3.5 h-3.5 ${isRouteActive(['/studio']) ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
                <span>Query Studio</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavigate('/bounties', 'bounties')}
                className={`flex items-center space-x-1.5 px-2.5 xl:px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer h-7 ${
                  isRouteActive(['/bounties', '/dashboard', '/maker', '/'])
                    ? 'bg-white/[0.12] text-white font-semibold border border-white/10 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <FileCheck2 className={`w-3.5 h-3.5 ${isRouteActive(['/bounties', '/dashboard', '/maker', '/']) ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
                <span>My Bounties</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavigate('/review', 'review')}
                className={`flex items-center space-x-1.5 px-2.5 xl:px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer relative h-7 ${
                  isRouteActive(['/review', '/explorer'])
                    ? 'bg-white/[0.12] text-white font-semibold border border-white/10 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <ShieldCheck className={`w-3.5 h-3.5 ${isRouteActive(['/review', '/explorer']) ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
                <span>Evidence Review</span>
                {unverifiedCount > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A8FF00] animate-pulse ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleNavigate('/records', 'records')}
                className={`flex items-center space-x-1.5 px-2.5 xl:px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer h-7 ${
                  isRouteActive(['/records', '/developers'])
                    ? 'bg-white/[0.12] text-white font-semibold border border-white/10 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Code2 className={`w-3.5 h-3.5 ${isRouteActive(['/records', '/developers']) ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
                <span>Truth Records</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavigate('/analytics', 'analytics')}
                className={`flex items-center space-x-1.5 px-2.5 xl:px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer h-7 ${
                  isRouteActive(['/analytics'])
                    ? 'bg-white/[0.12] text-white font-semibold border border-white/10 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <BarChart3 className={`w-3.5 h-3.5 ${isRouteActive(['/analytics']) ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
                <span>Analytics</span>
              </button>
            </>
          ) : (
            /* ================= SPOTTER LINKS ================= */
            <>
              <button
                type="button"
                onClick={() => handleNavigate('/nearby', 'nearby')}
                className={`flex items-center space-x-1.5 px-2.5 xl:px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer relative h-7 ${
                  isRouteActive(['/nearby', '/radar', '/spotter', '/'])
                    ? 'bg-white/[0.12] text-white font-semibold border border-white/10 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Compass className={`w-3.5 h-3.5 ${isRouteActive(['/nearby', '/radar', '/spotter', '/']) ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
                <span>Nearby Bounties</span>
                {unverifiedCount > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A8FF00] animate-pulse ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleNavigate('/report', 'report')}
                className={`flex items-center space-x-1.5 px-2.5 xl:px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer h-7 ${
                  isRouteActive(['/report'])
                    ? 'bg-white/[0.12] text-white font-semibold border border-white/10 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Camera className={`w-3.5 h-3.5 ${isRouteActive(['/report']) ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
                <span>Submit Evidence</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavigate('/submissions', 'submissions')}
                className={`flex items-center space-x-1.5 px-2.5 xl:px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer h-7 ${
                  isRouteActive(['/submissions'])
                    ? 'bg-white/[0.12] text-white font-semibold border border-white/10 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <FileCheck2 className={`w-3.5 h-3.5 ${isRouteActive(['/submissions']) ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
                <span>My Submissions</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavigate('/earnings', 'earnings')}
                className={`flex items-center space-x-1.5 px-2.5 xl:px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer h-7 ${
                  isRouteActive(['/earnings'])
                    ? 'bg-white/[0.12] text-white font-semibold border border-white/10 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Coins className={`w-3.5 h-3.5 ${isRouteActive(['/earnings']) ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
                <span>Earnings</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavigate('/reputation', 'reputation')}
                className={`flex items-center space-x-1.5 px-2.5 xl:px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer h-7 ${
                  isRouteActive(['/reputation'])
                    ? 'bg-white/[0.12] text-white font-semibold border border-white/10 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Award className={`w-3.5 h-3.5 ${isRouteActive(['/reputation']) ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
                <span>Reputation</span>
              </button>
            </>
          )}
        </nav>

        {/* ================= 3. RIGHT ZONE: SHARED VIEWS + WALLET + UTILITIES ================= */}
        <div className="flex items-center space-x-2 shrink-0">
          
          {/* Shared Views Pill (Map & Vault & Admin) */}
          <div className="hidden md:flex items-center bg-[#101010] p-1 rounded-full border border-white/[0.08] shadow-inner space-x-0.5 h-9">
            <button
              type="button"
              onClick={() => handleNavigate('/map', 'map')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer h-7 ${
                isRouteActive(['/map'])
                  ? 'bg-white/[0.12] text-white font-semibold border border-white/10 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
              title="Live Reality Map"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Map</span>
            </button>

            <button
              type="button"
              onClick={() => handleNavigate('/vault', 'vault')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer h-7 ${
                isRouteActive(['/vault', '/escrow', '/wallets'])
                  ? 'bg-white/[0.12] text-white font-semibold border border-white/10 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
              title="Escrow Vault & Multi-Party Ledger"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Vault</span>
            </button>

            {(isAdmin || isRouteActive(['/admin'])) && (
              <button
                type="button"
                onClick={() => handleNavigate('/admin', 'admin')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer h-7 ${
                  isRouteActive(['/admin'])
                    ? 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
                    : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-950/30'
                }`}
                title="Admin Diagnostics Panel"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden xl:inline">Admin</span>
              </button>
            )}
          </div>

          {/* Unified Web3 Wallet Badge */}
          <div
            onClick={onOpenWalletModal}
            className="flex items-center space-x-2 bg-[#101010] hover:bg-[#161616] border border-white/[0.08] hover:border-white/20 px-2.5 sm:px-3 py-1 rounded-full cursor-pointer transition-all shadow-inner h-9"
            title="Wallet Account & Switcher"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
              {displayWalletName.charAt(0)}
            </div>
            <span className="text-xs font-mono text-zinc-300 font-medium hidden xl:inline">
              {displayShortAddress}
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20 hidden xl:inline" />
            <span className="text-xs font-mono font-bold text-[#A8FF00]">
              {displayBalance}
            </span>
          </div>

          {/* Unified Utilities Capsule (Profile, Settings, Help, DB Sync) */}
          <div className="flex items-center bg-[#101010] p-1 rounded-full border border-white/[0.08] shadow-inner space-x-0.5 h-9">
            <button
              type="button"
              onClick={() => handleNavigate('/profile', 'profile')}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isRouteActive(['/profile'])
                  ? 'bg-white/[0.12] text-[#A8FF00]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
              }`}
              title="Identity & Profile"
            >
              <User className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => handleNavigate('/settings', 'settings')}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isRouteActive(['/settings'])
                  ? 'bg-white/[0.12] text-[#A8FF00]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
              }`}
              title="Settings & RPC Configuration"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onOpenHowItWorks}
              className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer hidden md:flex"
              title="Protocol Guide"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>

            {onOpenSupabaseModal && (
              <button
                type="button"
                onClick={onOpenSupabaseModal}
                className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer hidden md:flex"
                title="PostgreSQL / PostGIS Sync Status"
              >
                <Database className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
