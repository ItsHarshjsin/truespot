import React, { useState, useMemo, useEffect } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';

import { Coordinates } from './types';
import { JUDGE_PRESETS } from './utils/mockLocations';
import { getRealDeviceGps } from './utils/evidence';
import { hybridStore } from './utils/storage';

import { JudgeDeck } from './components/JudgeDeck';
import { Navbar } from './components/Navbar';
import { MakerPortal } from './components/MakerPortal';
import { ReceiverPortal } from './components/ReceiverPortal';
import { ThreeWalletsHub } from './components/ThreeWalletsHub';
import { WalletModal, DEMO_ACCOUNTS, DemoAccount } from './components/WalletModal';
import { HowItWorksModal } from './components/HowItWorksModal';
import { SupabaseModal } from './components/SupabaseModal';
import { ToastContainer, ToastMessage } from './components/Toast';

import { Shield, Compass, Camera, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []);
  const wallets = useMemo(() => [], []);

  // Top-level Two-Portal Switcher: 'maker' | 'receiver' | 'escrow'
  const [activeTab, setActiveTab] = useState<string>('maker');
  const [selectedBountyId, setSelectedBountyId] = useState<string | undefined>(undefined);

  // Modals state
  const [walletModalOpen, setWalletModalOpen] = useState<boolean>(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState<boolean>(false);
  const [supabaseModalOpen, setSupabaseModalOpen] = useState<boolean>(false);

  // Dynamic Demo Accounts & Wallet State (persisted to localStorage)
  const savedAccountsStr =
    typeof window !== 'undefined' ? localStorage.getItem('truespot_demo_accounts') : null;
  const initialAccounts: DemoAccount[] = savedAccountsStr
    ? JSON.parse(savedAccountsStr)
    : DEMO_ACCOUNTS;

  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>(initialAccounts);
  const [activeDemoAccount, setActiveDemoAccount] = useState<DemoAccount>(initialAccounts[0]);
  const [isUsingDemo, setIsUsingDemo] = useState<boolean>(true);

  // Toast Notifications State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (
    title: string,
    message: string,
    type: 'success' | 'info' | 'reward' | 'warning' = 'success'
  ) => {
    const id = 'toast_' + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Adjust Wallet Balance Dynamically
  const adjustBalance = (
    amountDelta: number,
    targetRole?: 'asker' | 'spotter' | 'verifier' | 'maker' | 'receiver' | 'escrow'
  ) => {
    setDemoAccounts((prev) => {
      const updated = prev.map((acc) => {
        const isTarget = targetRole
          ? acc.role === targetRole ||
            (targetRole === 'spotter' && acc.role === 'receiver') ||
            (targetRole === 'receiver' && acc.role === 'spotter') ||
            (targetRole === 'asker' && acc.role === 'maker') ||
            (targetRole === 'maker' && acc.role === 'asker') ||
            (targetRole === 'verifier' && acc.role === 'escrow') ||
            (targetRole === 'escrow' && acc.role === 'verifier')
          : acc.id === activeDemoAccount.id;
        if (isTarget) {
          const newBal = Math.max(0, parseFloat((acc.balanceSol + amountDelta).toFixed(3)));
          return { ...acc, balanceSol: newBal };
        }
        return acc;
      });

      try {
        localStorage.setItem('truespot_demo_accounts', JSON.stringify(updated));
      } catch (e) {}

      const currentActive = updated.find((a) => a.id === activeDemoAccount.id) || updated[0];
      setActiveDemoAccount(currentActive);
      return updated;
    });
  };

  // Geolocation state
  const savedCoordsStr =
    typeof window !== 'undefined' ? localStorage.getItem('truespot_locked_coords') : null;
  const initialCoords: Coordinates = savedCoordsStr
    ? JSON.parse(savedCoordsStr)
    : { lat: 27.7172, lng: 85.324, accuracy: 5.0 };

  const [currentCoords, setCurrentCoords] = useState<Coordinates>(initialCoords);
  const [locationName, setLocationName] = useState<string>(
    savedCoordsStr ? 'Saved Device Location' : 'Live Device GPS'
  );
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [unverifiedCount, setUnverifiedCount] = useState<number>(1);

  useEffect(() => {
    fetchDeviceGps(false);
    hybridStore.setupRealtimeChannel();
    const unsubscribe = hybridStore.subscribeToChanges(() => {
      refreshData();
    });
    return () => unsubscribe();
  }, []);

  const fetchDeviceGps = async (isUserInitiated: boolean = false) => {
    setGpsError(null);
    try {
      const fix = await getRealDeviceGps();
      const coords = { lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy };

      setCurrentCoords(coords);
      setLocationName(`Satellite Fix (±${fix.accuracy}m)`);
      setIsSimulated(false);
      setGpsError(null);

      localStorage.setItem('truespot_locked_coords', JSON.stringify(coords));
      hybridStore.seedBountiesAroundUser(fix.lat, fix.lng);
      refreshData();
      showToast('GPS Fix Acquired', `Locked live coordinates: ±${fix.accuracy}m accuracy`, 'info');
    } catch (err: any) {
      console.warn('Real device GPS error:', err.message);
      if (isUserInitiated) {
        setGpsError(err.message || 'Unable to retrieve device GPS');
      }
    }
  };

  const refreshData = async () => {
    const bounties = await hybridStore.getBounties();
    const answered = bounties.filter((b) => b.status === 'ANSWERED').length;
    setUnverifiedCount(answered);
  };

  const handleSetUserLocation = (lat: number, lng: number, name?: string) => {
    const coords = { lat, lng, accuracy: 3.0 };
    setCurrentCoords(coords);
    setLocationName(`📍 ${name || 'Pinned Spot'}`);
    setIsSimulated(false);
    setGpsError(null);

    localStorage.setItem('truespot_locked_coords', JSON.stringify(coords));
    hybridStore.seedBountiesAroundUser(lat, lng);
    refreshData();
  };

  const handleSelectPreset = (presetId: string) => {
    const preset = JUDGE_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      const coords = { lat: preset.lat, lng: preset.lng, accuracy: 4.0 };
      setCurrentCoords(coords);
      setLocationName(preset.name);
      setIsSimulated(true);
      setGpsError(null);
      hybridStore.seedBountiesAroundUser(preset.lat, preset.lng);
      refreshData();
      showToast('Location Jumped', `Simulating physical location in ${preset.name}`, 'info');
    }
  };

  const handleResetDemoState = async () => {
    if (window.confirm('Reset all demo bounties and reports back to 0 for a clean hackathon run?')) {
      await hybridStore.resetStateToZero();
      hybridStore.seedBountiesAroundUser(currentCoords.lat, currentCoords.lng);
      refreshData();
      showToast('Demo State Cleared', 'Reset all test escrows and reports to clean initial state', 'info');
    }
  };

  // Step / Portal information
  const stepMap: { [key: string]: { num: number; title: string; prev?: string } } = {
    maker: { num: 1, title: 'Task Maker Portal', prev: undefined },
    receiver: { num: 2, title: 'Field Receiver Portal', prev: undefined },
    escrow: { num: 3, title: 'Escrow Protocol', prev: undefined },
  };

  const currentStep = stepMap[activeTab] || stepMap.maker;

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {/* Full Web Application Canvas - Inspiration Dark Space Bento Design */}
          <div className="min-h-screen cosmic-atmosphere text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 relative overflow-x-hidden">
            {/* The prominent Top-Left Luminous Cyan Flare Beam from Inspiration UI */}
            <div className="top-left-beam" />
            <div className="top-left-beam-streak" />

            {/* Ambient Cosmic Radial Glows */}
            <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-sky-500/5 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-1/3 right-10 w-[550px] h-[550px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none" />

            {/* Global Floating Toast Notifications */}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />

            {/* 1. Full-Width Web Navbar with brand logo, workflow tabs, and wallet persona */}
            <Navbar
              title={currentStep.title}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              unverifiedCount={unverifiedCount}
              canGoBack={false}
              onOpenWalletModal={() => setWalletModalOpen(true)}
              onOpenHowItWorks={() => setHowItWorksOpen(true)}
              onOpenSupabaseModal={() => setSupabaseModalOpen(true)}
              isSupabaseConnected={hybridStore.isConnectedToSupabase}
              activeDemoAccount={activeDemoAccount}
              isUsingDemo={isUsingDemo}
              onResetDemoState={handleResetDemoState}
            />

            {/* 2. Web Toolbar: Real Device GPS, Preset Jumper, and Devnet Airdrop */}
            <JudgeDeck
              currentLocationName={locationName}
              isSimulated={isSimulated}
              onSelectPreset={handleSelectPreset}
              onUseLiveGps={() => fetchDeviceGps(true)}
              onRefreshData={() => {
                refreshData();
                showToast('Oracle Refreshed', 'Synced state with hybrid storage', 'info');
              }}
              onManualCoords={handleSetUserLocation}
              onAirdropDemo={() => {
                adjustBalance(1.0);
                showToast(
                  'Devnet Airdrop',
                  `Added +1.00 SOL to ${activeDemoAccount.name.split(' ')[0]}`,
                  'reward'
                );
              }}
            />

            {/* Browser Permission Guidance Banner if blocked */}
            {gpsError && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-2">
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-center justify-between shadow-lg backdrop-blur-md">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="font-medium leading-tight">
                      Device location blocked by browser: Click the 🔒 lock icon in your address bar → Allow Location.
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0 ml-3">
                    <button
                      onClick={() => fetchDeviceGps(true)}
                      className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-bold hover:bg-amber-400/30 transition-colors shrink-0"
                    >
                      Retry GPS
                    </button>
                    <button
                      onClick={() => setGpsError(null)}
                      className="w-6 h-6 rounded-full hover:bg-amber-400/20 flex items-center justify-center text-amber-300 transition-colors"
                      title="Dismiss"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Main Web Application Two-Portal Content */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {(activeTab === 'maker' || activeTab === 'ask') && (
                <MakerPortal
                  userCoords={currentCoords}
                  activeAccount={activeDemoAccount}
                  onAdjustBalance={adjustBalance}
                  onShowToast={showToast}
                />
              )}

              {(activeTab === 'receiver' || activeTab === 'nearby' || activeTab === 'report' || activeTab === 'verify' || activeTab === 'state') && (
                <ReceiverPortal
                  userCoords={currentCoords}
                  activeAccount={activeDemoAccount}
                  onSetUserLocation={handleSetUserLocation}
                  onShowToast={showToast}
                />
              )}

              {(activeTab === 'escrow' || activeTab === 'wallets') && (
                <ThreeWalletsHub
                  activeDemoAccount={activeDemoAccount}
                  onSelectDemoAccount={setActiveDemoAccount}
                  demoAccounts={demoAccounts}
                  onAdjustBalance={adjustBalance}
                  onNavigateToReport={() => setActiveTab('receiver')}
                  onNavigateToAsk={() => setActiveTab('maker')}
                  onShowToast={showToast}
                />
              )}
            </main>

            {/* 4. Desktop Web Footer - Dark Glassmorphism */}
            <footer className="w-full bg-slate-950/70 backdrop-blur-xl border-t border-white/10 py-6 mt-12 text-xs text-gray-400 select-none">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                    T
                  </div>
                  <span className="font-bold text-white">TrueSpot Protocol</span>
                  <span>•</span>
                  <span>Physical DePIN Oracle on Solana Devnet</span>
                </div>

                <div className="flex items-center space-x-4 text-[11px] font-medium text-gray-400">
                  <span>Colosseum Hackathon MVP</span>
                  <span>•</span>
                  <span>OpenStreetMap Geofence (200m)</span>
                  <span>•</span>
                  <span className="font-mono text-emerald-400">Escrow: 9WzD...AWWM</span>
                </div>
              </div>
            </footer>

            {/* Mobile Bottom Floating Navigation Bar - Dark Glassmorphism */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-2xl border-t border-white/10 px-4 py-2 flex items-center justify-around select-none">
              {[
                { id: 'maker', label: 'Task Maker', icon: Shield },
                { id: 'receiver', label: 'Field Receiver', icon: Compass },
                { id: 'escrow', label: 'Escrow Vault', icon: Camera },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`relative flex flex-col items-center py-1 px-3 rounded-2xl text-[11px] font-semibold transition-all ${
                      isActive ? 'text-emerald-400 font-bold' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className={`p-1 rounded-full ${isActive ? 'bg-emerald-500/20 text-emerald-300' : ''}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="mt-0.5">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Wallet Modal */}
            <WalletModal
              isOpen={walletModalOpen}
              onClose={() => setWalletModalOpen(false)}
              activeDemoAccount={activeDemoAccount}
              onSelectDemoAccount={setActiveDemoAccount}
              isUsingDemo={isUsingDemo}
              onToggleDemoMode={setIsUsingDemo}
              demoAccounts={demoAccounts}
              onAirdropDemo={() => {
                adjustBalance(1.0);
                showToast(
                  'Devnet Airdrop',
                  `Added +1.00 SOL to ${activeDemoAccount.name.split(' ')[0]}`,
                  'reward'
                );
              }}
            />

            {/* How It Works Modal */}
            <HowItWorksModal
              isOpen={howItWorksOpen}
              onClose={() => setHowItWorksOpen(false)}
              onStartDemo={() => setActiveTab('nearby')}
            />

            {/* Supabase PostgreSQL + PostGIS Configuration Modal */}
            <SupabaseModal
              isOpen={supabaseModalOpen}
              onClose={() => setSupabaseModalOpen(false)}
              onConfigSaved={() => {
                refreshData();
                showToast(
                  'Database Configured',
                  'Live PostgreSQL PostGIS connection verified',
                  'success'
                );
              }}
            />
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default App;
