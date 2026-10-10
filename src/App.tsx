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
import { MakerPortal } from './components/MakerPortal';
import { ReceiverPortal } from './components/ReceiverPortal';
import { ThreeWalletsHub } from './components/ThreeWalletsHub';
import { EvidenceExplorer } from './components/EvidenceExplorer';
import { ProtocolExplorer } from './components/ProtocolExplorer';
import { AdminVerificationPanel } from './components/AdminVerificationPanel';
import { JudgeDeck } from './components/JudgeDeck';
import { WalletModal, DEMO_ACCOUNTS, DemoAccount } from './components/WalletModal';
import { HowItWorksModal } from './components/HowItWorksModal';
import { SupabaseModal } from './components/SupabaseModal';
import { ToastContainer, ToastMessage } from './components/Toast';

import {
  PlusCircle,
  Compass,
  FileCheck2,
  Lock,
  Code2,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

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

  // Active Tab synchronized with routes
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  useEffect(() => {
    const p = location.pathname;
    if (p === '/' || p === '/dashboard' || p === '/maker' || p === '/studio') {
      setActiveTab('dashboard');
    } else if (p === '/radar' || p === '/nearby' || p === '/map' || p === '/spotter') {
      setActiveTab('radar');
    } else if (p === '/explorer') {
      setActiveTab('explorer');
    } else if (p === '/vault' || p === '/escrow' || p === '/wallets') {
      setActiveTab('vault');
    } else if (p === '/developers') {
      setActiveTab('developers');
    } else if (p === '/admin') {
      setActiveTab('admin');
    }
  }, [location.pathname]);

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

  /**
   * Universal Multi-Role Fund Ledger
   * Handles:
   * 1. Balance Subtractions (e.g. Maker locks escrow: -0.20 SOL from Maker, +0.20 SOL into Escrow)
   * 2. Balance Additions (e.g. Settlement: +0.20 SOL to Spotter, -0.20 SOL from Escrow)
   * 3. Balance Refunds (e.g. Expiry: +0.20 SOL to Maker, -0.20 SOL from Escrow)
   * 4. Direct Airdrops (e.g. +1.00 SOL to active wallet)
   */
  const adjustBalance = (
    amountDelta: number,
    targetRole?: 'asker' | 'spotter' | 'verifier' | 'maker' | 'receiver' | 'escrow',
    counterRole?: 'asker' | 'spotter' | 'verifier' | 'maker' | 'receiver' | 'escrow'
  ) => {
    setDemoAccounts((prev) => {
      const matchRole = (role: string, target?: string) => {
        if (!target) return false;
        if (role === target) return true;
        if (target === 'maker' && (role === 'asker' || role === 'maker')) return true;
        if (target === 'asker' && (role === 'maker' || role === 'asker')) return true;
        if (target === 'receiver' && (role === 'spotter' || role === 'receiver')) return true;
        if (target === 'spotter' && (role === 'receiver' || role === 'spotter')) return true;
        if (target === 'escrow' && (role === 'verifier' || role === 'escrow')) return true;
        if (target === 'verifier' && (role === 'escrow' || role === 'verifier')) return true;
        return false;
      };

      const updated = prev.map((acc) => {
        const isTarget = targetRole
          ? matchRole(acc.role, targetRole)
          : acc.id === activeDemoAccount.id;

        const isCounter = counterRole
          ? matchRole(acc.role, counterRole)
          : false;

        if (isTarget) {
          const newBal = Math.max(0, parseFloat((acc.balanceSol + amountDelta).toFixed(3)));
          return { ...acc, balanceSol: newBal };
        }
        if (isCounter) {
          // Counterparty receives opposite delta (e.g., escrow decreases when spotter receives payout)
          const newBal = Math.max(0, parseFloat((acc.balanceSol - amountDelta).toFixed(3)));
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

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard';
      case 'radar':
        return 'Analytics & Radar';
      case 'vault':
        return 'Escrow Vault';
      case 'explorer':
        return 'Evidence Explorer';
      case 'developers':
        return 'Protocol & API';
      case 'admin':
        return 'Admin Diagnostics';
      default:
        return 'Dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F5] font-sans flex flex-col relative selection:bg-[#A8FF00] selection:text-black">
      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* 1. CoinVex Global Header with Navigation Pills */}
      <Navbar
        unverifiedCount={1}
        onOpenWalletModal={() => setWalletModalOpen(true)}
        onOpenHowItWorks={() => setHowItWorksOpen(true)}
        onOpenSupabaseModal={() => setSupabaseModalOpen(true)}
        isSupabaseConnected={hybridStore.isConnectedToSupabase}
        activeDemoAccount={activeDemoAccount}
        isUsingDemo={isUsingDemo}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* 2. Subheader Toolbar: Real Device GPS, Preset Jumper & Devnet +1 SOL Airdrop (Only on location-based portals: Dashboard & Radar) */}
      {(activeTab === 'dashboard' || activeTab === 'radar') && (
        <JudgeDeck
          pageTitle={getPageTitle()}
          currentLocationName={locationName}
          isSimulated={isSimulated}
          onSelectPreset={handleSelectJudgePreset}
          onUseLiveGps={() => fetchDeviceGps(true)}
          onRefreshData={() => {
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
      )}

      {/* GPS Error Guidance Banner */}
      {gpsError && (activeTab === 'dashboard' || activeTab === 'radar') && (
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

      {/* 3. Main Workspace Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          {/* Portal 1: Dashboard / Task Maker (Screenshot 1 Layout) */}
          <Route
            path="/dashboard"
            element={
              <MakerPortal
                userCoords={currentCoords}
                activeAccount={activeDemoAccount}
                onAdjustBalance={adjustBalance}
                onShowToast={showToast}
                onNavigateToRadar={() => {
                  navigate('/radar');
                  setActiveTab('radar');
                }}
              />
            }
          />
          <Route path="/maker" element={<Navigate to="/dashboard" replace />} />
          <Route path="/studio" element={<Navigate to="/dashboard" replace />} />

          {/* Portal 2: Analytics & Radar / Field Earner (Screenshot 2 & 3 Layout) */}
          <Route
            path="/radar"
            element={
              <ReceiverPortal
                userCoords={currentCoords}
                activeAccount={activeDemoAccount}
                onSetUserLocation={handleSetUserLocation}
                onShowToast={showToast}
              />
            }
          />
          <Route path="/nearby" element={<Navigate to="/radar" replace />} />
          <Route path="/map" element={<Navigate to="/radar" replace />} />
          <Route path="/spotter" element={<Navigate to="/radar" replace />} />

          {/* Portal 3: Evidence Explorer (Independent Review & Consensus Audit) */}
          <Route
            path="/explorer"
            element={
              <EvidenceExplorer
                onShowToast={showToast}
                onAdjustBalance={adjustBalance}
              />
            }
          />

          {/* Portal 4: Escrow Vault & Three Wallets Hub */}
          <Route
            path="/vault"
            element={
              <ThreeWalletsHub
                activeDemoAccount={activeDemoAccount}
                onSelectDemoAccount={setActiveDemoAccount}
                demoAccounts={demoAccounts}
                onAdjustBalance={adjustBalance}
                onNavigateToReport={() => {
                  navigate('/radar');
                  setActiveTab('radar');
                }}
                onNavigateToAsk={() => {
                  navigate('/dashboard');
                  setActiveTab('dashboard');
                }}
                onShowToast={showToast}
              />
            }
          />
          <Route path="/escrow" element={<Navigate to="/vault" replace />} />
          <Route path="/wallets" element={<Navigate to="/vault" replace />} />

          {/* Portal 5: Developers & Open Truth API */}
          <Route
            path="/developers"
            element={
              <ProtocolExplorer
                onShowToast={showToast}
              />
            }
          />

          {/* Portal 6: Admin System Verification Panel */}
          <Route
            path="/admin"
            element={
              <AdminVerificationPanel />
            }
          />

          {/* Fallback & Root -> defaults to Dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>

      {/* 4. Desktop Web Footer */}
      <footer className="w-full bg-[#0B0B0B] border-t border-white/[0.07] py-6 mt-12 text-xs text-[#858585] select-none relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 rounded-full bg-[#A8FF00] text-black flex items-center justify-center font-black text-xs shadow-sm">
              T
            </div>
            <span className="font-bold text-[#F5F5F5] tracking-tight">TrueSpot Protocol</span>
            <span>•</span>
            <span className="text-[#858585]">Physical Verification Network on Solana Devnet</span>
          </div>

          <div className="flex items-center space-x-4 text-[11px] font-medium text-[#858585]">
            <span>Decentralized Escrow</span>
            <span>•</span>
            <span>200m Proximity Geofence</span>
            <span>•</span>
            <span className="font-mono text-[#A8FF00] font-semibold">Vault: TrUEspot...1111</span>
          </div>
        </div>
      </footer>

      {/* 5. Mobile Bottom Floating Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B0B0B]/95 backdrop-blur-2xl border-t border-white/10 px-4 py-2 flex items-center justify-around select-none">
        {[
          { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: PlusCircle },
          { id: 'radar', path: '/radar', label: 'Radar', icon: Compass },
          { id: 'explorer', path: '/explorer', label: 'Explorer', icon: FileCheck2 },
          { id: 'vault', path: '/vault', label: 'Vault', icon: Lock },
          { id: 'admin', path: '/admin', label: 'Admin', icon: ShieldCheck },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                navigate(item.path);
                setActiveTab(item.id);
              }}
              className={`relative flex flex-col items-center py-1 px-3 rounded-2xl text-[11px] font-semibold transition-all ${
                isActive ? 'text-[#A8FF00] font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <div
                className={`p-1.5 rounded-full ${
                  isActive ? 'bg-[#A8FF00]/20 text-[#A8FF00] shadow-sm' : ''
                }`}
              >
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
        onStartDemo={() => {
          navigate('/radar');
          setActiveTab('radar');
        }}
      />

      {/* Supabase Modal */}
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

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
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
