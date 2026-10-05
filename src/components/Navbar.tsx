import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { DemoAccount } from './WalletModal';
import {
  ChevronLeft,
  HelpCircle,
  Shield,
  PlusCircle,
  Compass,
  Camera,
  Coins,
  Database,
  Wallet,
  RotateCcw,
  Lock,
} from 'lucide-react';

interface NavbarProps {
  title?: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
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
  activeTab,
  setActiveTab,
  unverifiedCount = 0,
  onBack,
  canGoBack,
  onOpenWalletModal,
  onOpenHowItWorks,
  onOpenSupabaseModal,
  isSupabaseConnected,
  activeDemoAccount,
  isUsingDemo,
  onResetDemoState,
}) => {
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
    ? (wallet?.adapter.name || 'Phantom')
    : activeDemoAccount.name.split(' ')[0];

  const displayBalance = isRealWalletActive
    ? realBalance !== null ? `${realBalance.toFixed(2)} SOL` : 'Loading...'
    : `${activeDemoAccount.balanceSol.toFixed(2)} SOL`;

  const portals = [
    { id: 'maker', label: 'Dashboard', icon: PlusCircle, badge: 0 },
    { id: 'receiver', label: 'Analytics & Radar', icon: Compass, badge: unverifiedCount },
    { id: 'escrow', label: 'Escrow Vault', icon: Lock, badge: 0 },
  ];

  return (
    <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2 select-none relative z-40">
      <div className="flex items-center justify-between gap-4">
        {/* Left: CoinVex Minimalist Brand Identity */}
        <div className="flex items-center space-x-3">
          {canGoBack && onBack && (
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-full bg-[#101010] border border-white/10 flex items-center justify-center text-white hover:text-[#A8FF00] transition-colors"
              title="Go back"
            >
              <ChevronLeft className="w-4 h-4 text-zinc-300" />
            </button>
          )}

          <div
            onClick={() => setActiveTab('maker')}
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

        {/* Center: CoinVex Floating Pill Switcher */}
        <nav className="flex items-center bg-[#0D0D0D] p-1 rounded-full border border-white/[0.08] shadow-inner">
          {portals.map((portal) => {
            const isActive = activeTab === portal.id;
            const Icon = portal.icon;

            return (
              <button
                key={portal.id}
                onClick={() => setActiveTab(portal.id)}
                className={`flex items-center space-x-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all relative ${
                  isActive
                    ? 'border border-[#A8FF00] text-[#A8FF00] bg-black/40 shadow-sm shadow-[#A8FF00]/10'
                    : 'text-[#858585] hover:text-white'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#A8FF00]' : 'text-zinc-400'}`} />
                <span>{portal.label}</span>
                {portal.badge > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A8FF00] animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: CoinVex Avatar, User Greeting & Notification Bell */}
        <div className="flex items-center space-x-3">
          {/* User Greeting & Purple Avatar (CoinVex Signature) */}
          <div
            onClick={onOpenWalletModal}
            className="flex items-center space-x-2.5 cursor-pointer hover:opacity-90 transition-opacity"
            title="Switch User / Persona"
          >
            <span className="text-xs text-zinc-300 font-medium hidden sm:inline">
              Hi, {displayWalletName}
            </span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 border border-purple-400/30 flex items-center justify-center text-xs font-bold text-white shadow-sm overflow-hidden">
              <span>{displayWalletName.charAt(0)}</span>
            </div>
          </div>

          {/* Quick Balance Pill */}
          <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#101010] border border-white/[0.07] text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#A8FF00] animate-pulse" />
            <span className="text-[#A8FF00] font-bold">{displayBalance}</span>
          </div>

          {/* Circular Action/Settings Button (CoinVex Bell Icon) */}
          <button
            onClick={onOpenHowItWorks}
            className="w-8 h-8 rounded-full bg-[#101010] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            title="System Guide & Information"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

          {/* Supabase PostGIS status if available */}
          {onOpenSupabaseModal && (
            <button
              onClick={onOpenSupabaseModal}
              className="w-8 h-8 rounded-full bg-[#101010] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              title="Database Sync Status"
            >
              <Database className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
