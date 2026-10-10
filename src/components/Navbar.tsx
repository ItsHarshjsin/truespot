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

  const isHubActive = (hubKey: string) => {
    const p = location.pathname;
    if (hubKey === 'dashboard') return p === '/' || p === '/dashboard' || p === '/maker' || p === '/studio';
    if (hubKey === 'radar') return p === '/radar' || p === '/nearby' || p === '/map' || p === '/spotter';
    if (hubKey === 'vault') return p === '/vault' || p === '/escrow' || p === '/wallets';
    if (hubKey === 'explorer') return p === '/explorer';
    if (hubKey === 'developers') return p === '/developers';
    if (hubKey === 'admin') return p === '/admin';
    return false;
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
            onClick={() => handleNavigate('/dashboard', 'dashboard')}
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

        {/* Center: Structured CoinVex Navigation (Primary Workspaces + Protocol Tools) */}
        <nav className="hidden md:flex items-center bg-[#0D0D0D] p-1 rounded-full border border-white/[0.08] shadow-inner space-x-1">
          {/* Primary Workspaces (from screenshots) */}
          <button
            onClick={() => handleNavigate('/dashboard', 'dashboard')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all relative cursor-pointer ${
              isHubActive('dashboard')
                ? 'border border-[#A8FF00] text-[#A8FF00] bg-black/60 shadow-sm shadow-[#A8FF00]/10'
                : 'text-[#858585] hover:text-white'
            }`}
          >
            <PlusCircle className={`w-3.5 h-3.5 ${isHubActive('dashboard') ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => handleNavigate('/radar', 'radar')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all relative cursor-pointer ${
              isHubActive('radar')
                ? 'border border-[#A8FF00] text-[#A8FF00] bg-black/60 shadow-sm shadow-[#A8FF00]/10'
                : 'text-[#858585] hover:text-white'
            }`}
          >
            <Compass className={`w-3.5 h-3.5 ${isHubActive('radar') ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
            <span>Analytics &amp; Radar</span>
            {unverifiedCount > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#A8FF00] animate-pulse" />
            )}
          </button>

          <button
            onClick={() => handleNavigate('/vault', 'vault')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all relative cursor-pointer ${
              isHubActive('vault')
                ? 'border border-[#A8FF00] text-[#A8FF00] bg-black/60 shadow-sm shadow-[#A8FF00]/10'
                : 'text-[#858585] hover:text-white'
            }`}
          >
            <Lock className={`w-3.5 h-3.5 ${isHubActive('vault') ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
            <span>Escrow Vault</span>
          </button>

          {/* Elegant Divider between Workspaces and Protocol Tools */}
          <div className="h-4 w-px bg-white/[0.12] mx-0.5" />

          {/* Protocol Verification & Tools */}
          <button
            onClick={() => handleNavigate('/explorer', 'explorer')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all relative cursor-pointer ${
              isHubActive('explorer')
                ? 'border border-[#A8FF00] text-[#A8FF00] bg-black/60 shadow-sm shadow-[#A8FF00]/10'
                : 'text-[#858585] hover:text-white'
            }`}
            title="Verifier Review Queue"
          >
            <FileCheck2 className={`w-3.5 h-3.5 ${isHubActive('explorer') ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
            <span>Explorer</span>
          </button>

          <button
            onClick={() => handleNavigate('/developers', 'developers')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all relative cursor-pointer ${
              isHubActive('developers')
                ? 'border border-[#A8FF00] text-[#A8FF00] bg-black/60 shadow-sm shadow-[#A8FF00]/10'
                : 'text-[#858585] hover:text-white'
            }`}
            title="Open API & Documentation"
          >
            <Code2 className={`w-3.5 h-3.5 ${isHubActive('developers') ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
            <span>Developers</span>
          </button>

          <button
            onClick={() => handleNavigate('/admin', 'admin')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all relative cursor-pointer ${
              isHubActive('admin')
                ? 'border border-[#A8FF00] text-[#A8FF00] bg-black/60 shadow-sm shadow-[#A8FF00]/10'
                : 'text-[#858585] hover:text-white'
            }`}
            title="System Diagnostics & Verification"
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${isHubActive('admin') ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
            <span>Admin</span>
          </button>
        </nav>

        {/* Right: User Greeting, Purple Avatar, Balance Pill & Modals */}
        <div className="flex items-center space-x-2.5 shrink-0">
          {/* User Greeting & Purple Avatar (CoinVex Signature from Screenshot) */}
          <div
            onClick={onOpenWalletModal}
            className="flex items-center space-x-2 cursor-pointer hover:opacity-90 transition-opacity"
            title="Switch User / Persona"
          >
            <span className="text-xs text-zinc-300 font-medium hidden xl:inline">
              Hi, {displayWalletName}
            </span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 border border-purple-400/30 flex items-center justify-center text-xs font-bold text-white shadow-sm overflow-hidden">
              <span>{displayWalletName.charAt(0)}</span>
            </div>
          </div>

          {/* Quick Balance Pill (from Screenshot: • 4.58 SOL) */}
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#101010] border border-white/[0.07] text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#A8FF00] animate-pulse" />
            <span className="text-[#A8FF00] font-bold">{displayBalance}</span>
          </div>

          {/* Guide / How It Works */}
          <button
            onClick={onOpenHowItWorks}
            className="w-8 h-8 rounded-full bg-[#101010] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Protocol Guide"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

          {/* Supabase PostGIS status */}
          {onOpenSupabaseModal && (
            <button
              onClick={onOpenSupabaseModal}
              className="w-8 h-8 rounded-full bg-[#101010] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
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
