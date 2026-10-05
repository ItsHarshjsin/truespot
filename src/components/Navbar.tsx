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
    { id: 'maker', label: '🏗️ Task Maker', icon: PlusCircle, badge: 0 },
    { id: 'receiver', label: '📸 Field Receiver', icon: Compass, badge: unverifiedCount },
    { id: 'escrow', label: '🔒 Escrow Vault', icon: Lock, badge: 0 },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#050811]/90 backdrop-blur-2xl border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.8)] select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4 py-3">
        {/* Left: Brand Identity & Back Control */}
        <div className="flex items-center space-x-3">
          {canGoBack && onBack && (
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-full tactile-keycap flex items-center justify-center text-white hover:text-sky-300 transition-colors shadow-sm"
              title="Go back"
            >
              <ChevronLeft className="w-5 h-5 text-slate-300" />
            </button>
          )}

          <div
            onClick={() => setActiveTab('maker')}
            className="flex items-center space-x-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.4)] group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-extrabold text-white tracking-tight">
                  TrueSpot
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-300 border border-sky-500/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse mr-1" />
                  Solana Devnet
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block font-medium">
                Physical DePIN Oracle
              </p>
            </div>
          </div>
        </div>

        {/* Center: Clean Two-Portal Switcher (Maker vs Receiver) */}
        <nav className="flex items-center bg-[#070b14] p-1.5 rounded-full border border-white/10 shadow-inner">
          {portals.map((portal) => {
            const isActive = activeTab === portal.id;

            return (
              <button
                key={portal.id}
                onClick={() => setActiveTab(portal.id)}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all relative ${
                  isActive
                    ? 'tactile-keycap-active text-sky-200'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>{portal.label}</span>
                {portal.badge > 0 && (
                  <span className="ml-1 w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Actions, Reset Engine & Wallet */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          {/* Hackathon Reset Demo Engine */}
          {onResetDemoState && (
            <button
              onClick={onResetDemoState}
              className="tactile-keycap flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-rose-300 border-rose-500/30 hover:border-rose-400/60 transition-colors shadow-sm"
              title="Reset All State to 0 for Clean Hackathon Demo"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Reset Demo</span>
            </button>
          )}

          {/* Supabase Status Button */}
          {onOpenSupabaseModal && (
            <button
              onClick={onOpenSupabaseModal}
              className="tactile-keycap hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white transition-colors shadow-sm"
              title="Configure Supabase PostgreSQL + PostGIS Cloud"
            >
              <Database className="w-3.5 h-3.5 text-sky-400" />
              <span>PostGIS</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isSupabaseConnected ? 'bg-sky-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
            </button>
          )}

          {/* How It Works Button */}
          <button
            onClick={onOpenHowItWorks}
            className="tactile-keycap flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white transition-colors shadow-sm"
            title="How TrueSpot works"
          >
            <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Guide</span>
          </button>

          {/* Active Wallet Persona Pill */}
          <button
            onClick={onOpenWalletModal}
            className="tactile-keycap flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-bold text-white hover:border-sky-400/50 transition-all"
            title="Manage Solana Wallet / Demo Personas"
          >
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            <span className="hidden sm:inline text-slate-400 font-medium font-sans">
              {displayWalletName}:
            </span>
            <span className="font-mono text-sky-300">{displayBalance}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
