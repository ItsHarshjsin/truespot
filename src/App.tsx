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

import { Navbar } from './components/Navbar';
import { LiveRealityMap } from './components/LiveRealityMap';
import { QueryStudio } from './components/QueryStudio';
import { EvidenceExplorer } from './components/EvidenceExplorer';
import { ProtocolExplorer } from './components/ProtocolExplorer';
import { JudgeDeck } from './components/JudgeDeck';
import { WalletModal, DEMO_ACCOUNTS, DemoAccount } from './components/WalletModal';
import { HowItWorksModal } from './components/HowItWorksModal';
import { SupabaseModal } from './components/SupabaseModal';
import { ToastContainer, ToastMessage } from './components/Toast';

import { Radio, PlusCircle, FileCheck2, Code2, AlertCircle } from 'lucide-react';

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
  const adjustBalance = (amountDelta: number) => {
    setDemoAccounts((prev) => {
      const updated = prev.map((acc) => {
        if (acc.id === activeDemoAccount.id) {
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
    : { lat: 37.7785, lng: -122.3999, accuracy: 5.0 };

  const [currentCoords, setCurrentCoords] = useState<Coordinates>(initialCoords);
  const [locationName, setLocationName] = useState<string>(
    savedCoordsStr ? 'Saved Device Location' : 'San Francisco Ground Station'
  );
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);

  useEffect(() => {
    fetchDeviceGps(false);
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

      try {
        localStorage.setItem('truespot_locked_coords', JSON.stringify(coords));
      } catch (e) {}

      if (isUserInitiated) {
        showToast('Real GPS Acquired', `Location calibrated (±${fix.accuracy}m)`, 'success');
      }
    } catch (err: any) {
      if (isUserInitiated) {
        setGpsError(err.message);
        showToast('GPS Signal Warning', err.message, 'warning');
      }
    }
  };

  const handleSetUserLocation = (lat: number, lng: number, name?: string) => {
    const coords: Coordinates = { lat, lng, accuracy: 5.0 };
    setCurrentCoords(coords);
    setLocationName(name || `Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    setIsSimulated(true);

    try {
      localStorage.setItem('truespot_locked_coords', JSON.stringify(coords));
    } catch (e) {}

    showToast('GPS Relocated', `Calibrated to ${name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}`, 'info');
  };

  const handleSelectJudgePreset = (presetId: string) => {
    const preset = JUDGE_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      handleSetUserLocation(preset.lat, preset.lng, preset.name);
      hybridStore.resetToCoordinates(preset.lat, preset.lng);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F5] font-sans flex flex-col relative selection:bg-[#A8FF00] selection:text-black">
      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* 1. Header Navigation with 4 Core Protocol Hubs */}
      <Navbar
        unverifiedCount={1}
        onOpenWalletModal={() => setWalletModalOpen(true)}
        onOpenHowItWorks={() => setHowItWorksOpen(true)}
        onOpenSupabaseModal={() => setSupabaseModalOpen(true)}
        isSupabaseConnected={hybridStore.isConnectedToSupabase}
        activeDemoAccount={activeDemoAccount}
        isUsingDemo={isUsingDemo}
      />

      {/* Judge Location Simulation Ribbon */}
      <JudgeDeck
        currentLocationName={locationName}
        isSimulated={isSimulated}
        onSelectPreset={handleSelectJudgePreset}
        onUseLiveGps={() => fetchDeviceGps(true)}
        onRefreshData={() => {}}
      />

      {/* GPS Error Alert */}
      {gpsError && (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2">
          <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-medium leading-tight">
                Device location: Click the 🔒 lock icon in your address bar → Allow Location.
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

      {/* 2. Main Protocol Content with the Four Dedicated Routes */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          {/* Hub 1: /map — Live Reality Map */}
          <Route
            path="/map"
            element={
              <LiveRealityMap
                userCoords={currentCoords}
                onSetUserLocation={handleSetUserLocation}
                onShowToast={showToast}
                contributorWallet={activeDemoAccount.address}
              />
            }
          />

          {/* Hub 2: /studio — Query Studio (Creation & Escrow) */}
          <Route
            path="/studio"
            element={
              <QueryStudio
                userCoords={currentCoords}
                creatorWallet={activeDemoAccount.address}
                creatorBalanceSol={activeDemoAccount.balanceSol}
                onAdjustBalance={adjustBalance}
                onShowToast={showToast}
              />
            }
          />

          {/* Hub 3: /explorer — Evidence Explorer (Maker Review & Audit Hub) */}
          <Route
            path="/explorer"
            element={
              <EvidenceExplorer
                onShowToast={showToast}
                onAdjustBalance={adjustBalance}
              />
            }
          />

          {/* Hub 4: /developers — Protocol Explorer & Open API */}
          <Route
            path="/developers"
            element={
              <ProtocolExplorer
                onShowToast={showToast}
              />
            }
          />

          {/* Backward compatibility aliases */}
          <Route path="/maker" element={<Navigate to="/studio" replace />} />
          <Route path="/spotter" element={<Navigate to="/map" replace />} />
          <Route path="/vault" element={<Navigate to="/developers" replace />} />

          {/* Fallback & Root */}
          <Route path="/" element={<Navigate to="/map" replace />} />
          <Route path="*" element={<Navigate to="/map" replace />} />
        </Routes>
      </main>

      {/* 3. Desktop Web Footer */}
      <footer className="w-full bg-[#0B0B0B] border-t border-white/[0.07] py-6 mt-12 text-xs text-[#858585] select-none relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 rounded-full bg-[#A8FF00] text-black flex items-center justify-center font-black text-xs shadow-sm">
              T
            </div>
            <span className="font-bold text-[#F5F5F5] tracking-tight">TrueSpot V2 Protocol</span>
            <span>•</span>
            <span className="text-[#858585]">Decentralized Physical Verification Oracle on Solana Devnet</span>
          </div>

          <div className="flex items-center space-x-4 text-[11px] font-medium text-[#858585]">
            <span>97.5% Contributor / 2.5% Treasury</span>
            <span>•</span>
            <span>Anchor PDA Escrow</span>
            <span>•</span>
            <span className="font-mono text-[#A8FF00] font-semibold">TrUEspot...1111</span>
          </div>
        </div>
      </footer>

      {/* 4. Mobile Bottom Floating Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B0B0B]/95 backdrop-blur-2xl border-t border-white/10 px-4 py-2 flex items-center justify-around select-none">
        {[
          { path: '/map', label: 'Map', icon: Radio },
          { path: '/studio', label: 'Studio', icon: PlusCircle },
          { path: '/explorer', label: 'Explorer', icon: FileCheck2 },
          { path: '/developers', label: 'API', icon: Code2 },
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
        onStartDemo={() => navigate('/map')}
      />

      {/* Supabase PostgreSQL + PostGIS Configuration Modal */}
      <SupabaseModal
        isOpen={supabaseModalOpen}
        onClose={() => setSupabaseModalOpen(false)}
        onConfigSaved={() => {
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
