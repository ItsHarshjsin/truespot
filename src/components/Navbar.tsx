import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { DemoAccount } from './WalletModal';
import { ChevronLeft, HelpCircle, Shield, PlusCircle, Compass, Camera, CheckSquare, Coins, Database, Wallet } from 'lucide-react';

interface NavbarProps {
  title: string;
  stepNumber: number; // 1 to 5
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unverifiedCount: number;
  onBack: () => void;
  canGoBack: boolean;
  onOpenWalletModal: () => void;
  onOpenHowItWorks: () => void;
  onOpenSupabaseModal?: () => void;
  isSupabaseConnected?: boolean;
  activeDemoAccount: DemoAccount;
  isUsingDemo: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  title,
  stepNumber,
  activeTab,
  setActiveTab,
  unverifiedCount,
  onBack,
  canGoBack,
  onOpenWalletModal,
  onOpenHowItWorks,
  onOpenSupabaseModal,
  isSupabaseConnected,
  activeDemoAccount,
  isUsingDemo,
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

  const tabs = [
    { id: 'ask', label: 'Ask', icon: PlusCircle, step: 1 },
    { id: 'nearby', label: 'Radar', icon: Compass, step: 2 },
    { id: 'report', label: 'Report', icon: Camera, step: 3 },
    { id: 'verify', label: 'Verify', icon: CheckSquare, step: 4, badge: unverifiedCount },
    { id: 'state', label: 'State', icon: Coins, step: 5 },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-emerald-950/10 shadow-xs select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4 py-3">
        {/* Left: Brand Identity & Back Control */}
        <div className="flex items-center space-x-3">
          {canGoBack && (
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-full bg-[#F4F9F5] border border-emerald-950/10 flex items-center justify-center text-[#11291B] hover:bg-[#E8F5E9] transition-colors shadow-xs"
              title="Go back"
            >
              <ChevronLeft className="w-5 h-5 text-[#11291B]" />
            </button>
          )}

          <div
            onClick={() => setActiveTab('nearby')}
            className="flex items-center space-x-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#0F3822] text-[#99E35E] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-extrabold text-[#11291B] tracking-tight">
                  TrueSpot
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F5E9] text-[#1E5E38] border border-[#8BC34A]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7CB342] animate-pulse mr-1" />
                  Devnet
                </span>
              </div>
              <p className="text-[11px] text-[#6B7F72] hidden sm:block font-medium">
                Physical DePIN Oracle on Solana
              </p>
            </div>
          </div>
        </div>

        {/* Center: Segmented Organic Workflow Pills */}
        <nav className="hidden md:flex items-center bg-[#F4F9F5] p-1 rounded-full border border-emerald-950/10 shadow-xs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all relative ${
                  isActive
                    ? 'bg-[#0F3822] text-white shadow-sm font-bold'
                    : 'text-[#6B7F72] hover:text-[#11291B]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="ml-1 w-2 h-2 rounded-full bg-[#8BC34A] animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Wallet Balance & Help Guide */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Supabase Status Button */}
          {onOpenSupabaseModal && (
            <button
              onClick={onOpenSupabaseModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white border border-emerald-950/10 text-xs font-semibold text-[#11291B] hover:bg-[#E8F5E9] transition-colors shadow-xs"
              title="Configure Supabase PostgreSQL + PostGIS Cloud"
            >
              <Database className="w-3.5 h-3.5 text-[#1E5E38]" />
              <span className="hidden sm:inline">Supabase</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isSupabaseConnected ? 'bg-[#7CB342] animate-pulse' : 'bg-amber-400'
                }`}
              />
            </button>
          )}

          {/* How It Works Button */}
          <button
            onClick={onOpenHowItWorks}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-white border border-emerald-950/10 text-xs font-semibold text-[#11291B] hover:bg-[#E8F5E9] transition-colors shadow-xs"
            title="How TrueSpot works"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#1E5E38]" />
            <span className="hidden sm:inline">Guide</span>
          </button>

          {/* Active Wallet Persona Pill */}
          <button
            onClick={onOpenWalletModal}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white border border-emerald-950/15 text-xs font-bold text-[#11291B] shadow-xs hover:border-[#8BC34A] transition-all"
            title="Manage Solana Wallet / Demo Personas"
          >
            <span className="w-2 h-2 rounded-full bg-[#7CB342] animate-pulse" />
            <span className="hidden sm:inline text-[#6B7F72] font-medium font-sans">
              {displayWalletName}:
            </span>
            <span className="font-mono text-[#0F3822]">{displayBalance}</span>
          </button>

          {/* Mobile Step Counter */}
          <span className="md:hidden text-xs font-mono font-bold text-[#6B7F72] px-2.5 py-1 rounded-full bg-emerald-900/5">
            {stepNumber}/5
          </span>
        </div>
      </div>
    </header>
  );
};
