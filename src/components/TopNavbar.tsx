import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { DemoAccount } from './WalletModal';
import {
  Shield,
  PlusCircle,
  Compass,
  MapPin,
  Lock,
  ShieldCheck,
  Menu,
  ChevronDown,
  User,
  Settings,
  HelpCircle,
  Database,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface TopNavbarProps {
  userMode: 'maker' | 'spotter';
  onSelectUserMode: (mode: 'maker' | 'spotter') => void;
  onOpenWalletModal: () => void;
  onOpenHowItWorks: () => void;
  onOpenSupabaseModal?: () => void;
  isSupabaseConnected?: boolean;
  activeDemoAccount: DemoAccount;
  isUsingDemo: boolean;
  onResetDemoState?: () => void;
  isAdmin?: boolean;
  onToggleMobileSidebar: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  userMode,
  onSelectUserMode,
  onOpenWalletModal,
  onOpenHowItWorks,
  onOpenSupabaseModal,
  isSupabaseConnected = false,
  activeDemoAccount,
  isUsingDemo,
  onResetDemoState,
  isAdmin = false,
  onToggleMobileSidebar,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { connection } = useConnection();
  const { connected, publicKey, wallet } = useWallet();
  const [realBalance, setRealBalance] = useState<number | null>(null);
  const [utilitiesOpen, setUtilitiesOpen] = useState(false);
  const utilitiesRef = useRef<HTMLDivElement>(null);

  // Close utilities dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (utilitiesRef.current && !utilitiesRef.current.contains(e.target as Node)) {
        setUtilitiesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch real devnet balance
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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-[#050505]/95 backdrop-blur-2xl border-b border-white/[0.08] select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full h-full flex items-center justify-between">
        {/* Left: Mobile Menu Toggle + Brand Identity + Role Switcher */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Mobile Sidebar Hamburger Toggle */}
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden w-9 h-9 rounded-xl bg-[#111111] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white hover:border-[#A8FF00]/40 transition-colors cursor-pointer"
            title="Toggle Navigation Menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Brand Logo */}
          <div
            onClick={() => navigate(userMode === 'maker' ? '/bounties' : '/nearby')}
            className="flex items-center space-x-2.5 cursor-pointer group shrink-0"
          >
            <div className="w-8 h-8 rounded-xl bg-[#A8FF00] text-black flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
              <Shield className="w-4.5 h-4.5 text-black stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold text-white tracking-tight leading-tight">
                TrueSpot
              </span>
              <span className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase leading-none hidden sm:block">
                DePIN Oracle
              </span>
            </div>
          </div>

          {/* Role Switcher Toggle (Maker <-> Spotter) - Refined Flat Dark Style */}
          <div className="flex items-center bg-[#111111] p-1 rounded-full border border-white/[0.08] shadow-inner h-9 ml-1 sm:ml-2">
            <button
              type="button"
              onClick={() => onSelectUserMode('maker')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer h-7 ${
                userMode === 'maker'
                  ? 'bg-[#181818] text-[#A8FF00] border border-[#A8FF00]/40 shadow-none'
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
              title="Maker Mode: Create queries, review evidence & settle payouts"
            >
              <PlusCircle className={`w-3.5 h-3.5 ${userMode === 'maker' ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
              <span>Maker</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectUserMode('spotter')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer h-7 ${
                userMode === 'spotter'
                  ? 'bg-[#181818] text-[#A8FF00] border border-[#A8FF00]/40 shadow-none'
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
              title="Spotter Mode: Explore 200m radar, submit proofs & earn SOL"
            >
              <Compass className={`w-3.5 h-3.5 ${userMode === 'spotter' ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
              <span>Spotter</span>
            </button>
          </div>
        </div>

      {/* Right: Shared Nav Links (Map & Vault) + Wallet Button + Utilities Dropdown */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        
        {/* Shared Primary Views Capsule: Reality Map & Escrow Vault */}
        <div className="hidden md:flex items-center bg-[#111111] p-1 rounded-full border border-white/[0.08] shadow-inner space-x-0.5 h-9">
          <button
            type="button"
            onClick={() => navigate('/map')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer h-7 ${
              isRouteActive(['/map'])
                ? 'bg-white/[0.12] text-white font-semibold border border-white/10 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
            title="Live Reality Map"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Reality Map</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/vault')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer h-7 ${
              isRouteActive(['/vault', '/escrow', '/wallets'])
                ? 'bg-white/[0.12] text-white font-semibold border border-white/10 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
            title="Multi-Party Escrow Vault & Settlement Ledger"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Escrow Vault</span>
          </button>

          {(isAdmin || isRouteActive(['/admin'])) && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer h-7 ${
                isRouteActive(['/admin'])
                  ? 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
                  : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-950/30'
              }`}
              title="Protected Admin Diagnostics Panel"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin</span>
            </button>
          )}
        </div>

        {/* Unified Web3 Wallet Badge */}
        <div
          onClick={onOpenWalletModal}
          className="flex items-center space-x-2 bg-[#111111] hover:bg-[#181818] border border-white/[0.08] hover:border-white/20 px-3 py-1 rounded-full cursor-pointer transition-all shadow-inner h-9"
          title="Connected Persona & Wallet Switcher"
        >
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
            {displayWalletName.charAt(0)}
          </div>
          <span className="text-xs font-mono text-zinc-300 font-medium hidden sm:inline">
            {displayShortAddress}
          </span>
          <span className="w-1 h-1 rounded-full bg-white/20 hidden sm:inline" />
          <span className="text-xs font-mono font-bold text-[#A8FF00]">
            {displayBalance}
          </span>
        </div>

        {/* Combined Utilities Dropdown Menu */}
        <div className="relative" ref={utilitiesRef}>
          <button
            type="button"
            onClick={() => setUtilitiesOpen(!utilitiesOpen)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-full bg-[#111111] border transition-all cursor-pointer h-9 shadow-inner ${
              utilitiesOpen || isRouteActive(['/profile', '/settings'])
                ? 'border-[#A8FF00]/40 text-[#A8FF00] bg-white/[0.05]'
                : 'border-white/[0.08] text-zinc-300 hover:text-white hover:border-white/20'
            }`}
            title="Utilities & System Configuration"
          >
            <Settings className="w-4 h-4" />
            <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${utilitiesOpen ? 'rotate-180 text-[#A8FF00]' : ''}`} />
          </button>

          {/* Dropdown Menu Overlay Card */}
          {utilitiesOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-[#0B0B0B] border border-white/[0.1] rounded-2xl p-2 shadow-2xl backdrop-blur-2xl z-50 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Utilities & Settings
                </p>
                <p className="text-xs text-zinc-300 font-mono truncate mt-0.5">
                  {displayWalletName} • {displayBalance}
                </p>
              </div>

              {/* 1. Account Profile */}
              <button
                type="button"
                onClick={() => {
                  setUtilitiesOpen(false);
                  navigate('/profile');
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  isRouteActive(['/profile'])
                    ? 'bg-white/[0.1] text-[#A8FF00] font-semibold'
                    : 'text-zinc-300 hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <User className="w-4 h-4 text-zinc-400" />
                  <span>Account Profile</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">/profile</span>
              </button>

              {/* 2. Workspace & RPC Settings */}
              <button
                type="button"
                onClick={() => {
                  setUtilitiesOpen(false);
                  navigate('/settings');
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  isRouteActive(['/settings'])
                    ? 'bg-white/[0.1] text-[#A8FF00] font-semibold'
                    : 'text-zinc-300 hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Settings className="w-4 h-4 text-zinc-400" />
                  <span>RPC & Workspace Settings</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">/settings</span>
              </button>

              {/* 3. Protocol Guide */}
              <button
                type="button"
                onClick={() => {
                  setUtilitiesOpen(false);
                  onOpenHowItWorks();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:bg-white/[0.05] hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <HelpCircle className="w-4 h-4 text-zinc-400" />
                  <span>Protocol Guide</span>
                </div>
                <span className="text-[10px] text-[#A8FF00]">Help</span>
              </button>

              {/* 4. PostgreSQL / PostGIS Cloud Sync */}
              {onOpenSupabaseModal && (
                <button
                  type="button"
                  onClick={() => {
                    setUtilitiesOpen(false);
                    onOpenSupabaseModal();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:bg-white/[0.05] hover:text-white transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-2.5">
                    <Database className="w-4 h-4 text-zinc-400" />
                    <span>Database & Storage Sync</span>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${isSupabaseConnected ? 'bg-[#A8FF00]' : 'bg-amber-400'}`} />
                </button>
              )}

              {/* 5. Reset Demo State */}
              {onResetDemoState && (
                <div className="pt-1 mt-1 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => {
                      setUtilitiesOpen(false);
                      onResetDemoState();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5">
                      <RotateCcw className="w-4 h-4" />
                      <span>Reset Demo Environment</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    </header>
  );
};
