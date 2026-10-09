import React, { useState, useMemo, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
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

import { Shield, Compass, Lock, AlertCircle } from 'lucide-react';

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
    const unsub = hybridStore.subscribeBountiesRealtime(() => {
      refreshData();
    });
    return () => unsub();
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
    if (window.confirm('Reset all active tasks and reports to a clean initial state?')) {
      await hybridStore.resetStateToZero();
      hybridStore.seedBountiesAroundUser(currentCoords.lat, currentCoords.lng);
      refreshData();
      showToast('State Cleared', 'Reset all test tasks and reports to clean initial state', 'info');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F5] flex flex-col font-sans selection:bg-[#A8FF00] selection:text-black relative overflow-x-hidden">
      {/* Subtle Ambient Radial Glow */}
      <div className="ambient-glow" />

      {/* Global Floating Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* 1. Full-Width Web Navbar with hard route toggle */}
      <Navbar
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
                className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-bold hover:bg-amber-400/30 transition-colors shrink-0 cursor-pointer"
              >
                Retry GPS
              </button>
              <button
                onClick={() => setGpsError(null)}
                className="w-6 h-6 rounded-full hover:bg-amber-400/20 flex items-center justify-center text-amber-300 transition-colors cursor-pointer"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Web Application Content with Isolated React Router Endpoints */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          {/* Route 1: /maker (Task Creator) */}
          <Route
            path="/maker"
            element={
              <MakerPortal
                userCoords={currentCoords}
                activeAccount={activeDemoAccount}
                onAdjustBalance={adjustBalance}
                onShowToast={showToast}
                onNavigateToRadar={() => navigate('/spotter')}
              />
            }
          />

          {/* Route 2: /spotter (Field Earner) */}
          <Route
            path="/spotter"
            element={
              <ReceiverPortal
                userCoords={currentCoords}
                activeAccount={activeDemoAccount}
                onSetUserLocation={handleSetUserLocation}
                onShowToast={showToast}
              />
            }
          />

          {/* Route 3: /vault (Consensus/Escrow) */}
          <Route
            path="/vault"
            element={
              <ThreeWalletsHub
                activeDemoAccount={activeDemoAccount}
                onSelectDemoAccount={setActiveDemoAccount}
                demoAccounts={demoAccounts}
                onAdjustBalance={adjustBalance}
                onNavigateToReport={() => navigate('/spotter')}
                onNavigateToAsk={() => navigate('/maker')}
                onShowToast={showToast}
              />
            }
          />

          {/* Fallback & Redirects */}
          <Route path="/" element={<Navigate to="/maker" replace />} />
          <Route path="*" element={<Navigate to="/maker" replace />} />
        </Routes>
      </main>

      {/* 4. Desktop Web Footer - Benchmark Dark Mode */}
      <footer className="w-full bg-[#0B0B0B] border-t border-white/[0.07] py-6 mt-12 text-xs text-[#858585] select-none relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 rounded-full bg-[#A8FF00] text-black flex items-center justify-center font-black text-xs shadow-sm">
              T
            </div>
            <span className="font-bold text-[#F5F5F5] tracking-tight">TrueSpot V2 Protocol</span>
            <span>•</span>
            <span className="text-[#858585]">Physical Verification Network on Solana Devnet</span>
          </div>

          <div className="flex items-center space-x-4 text-[11px] font-medium text-[#858585]">
            <span>Decentralized Escrow</span>
            <span>•</span>
            <span>200m Proximity Geofence</span>
            <span>•</span>
            <span className="font-mono text-[#A8FF00] font-semibold">Vault: 9WzD...AWWM</span>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Floating Navigation Bar - Hard React Router Links */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#121212]/95 backdrop-blur-2xl border-t border-zinc-800 px-4 py-2 flex items-center justify-around select-none">
        {[
          { path: '/maker', label: 'Maker', icon: Shield },
          { path: '/spotter', label: 'Spotter', icon: Compass },
          { path: '/vault', label: 'Vault', icon: Lock },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative flex flex-col items-center py-1 px-3 rounded-2xl text-[11px] font-semibold transition-all cursor-pointer ${
                isActive ? 'text-[#A8FF00] font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <div className={`p-1.5 rounded-full ${isActive ? 'bg-[#A8FF00]/20 text-[#A8FF00] shadow-sm' : ''}`}>
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
        onStartDemo={() => navigate('/spotter')}
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
  );
};

export const App: React.FC = () => {
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []);
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default App;
