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
import { NearbyScreen } from './components/NearbyScreen';
import { AskScreen } from './components/AskScreen';
import { ReportScreen } from './components/ReportScreen';
import { VerifyScreen } from './components/VerifyScreen';
import { StateScreen } from './components/StateScreen';
import { ThreeWalletsHub } from './components/ThreeWalletsHub';
import { WalletModal, DEMO_ACCOUNTS, DemoAccount } from './components/WalletModal';
import { HowItWorksModal } from './components/HowItWorksModal';
import { SupabaseModal } from './components/SupabaseModal';
import { ToastContainer, ToastMessage } from './components/Toast';

import { PlusCircle, Compass, Camera, CheckSquare, Coins, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []);
  const wallets = useMemo(() => [], []);

  // Navigation state (5 steps)
  const [activeTab, setActiveTab] = useState<string>('nearby');
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

  // Step information
  const stepMap: { [key: string]: { num: number; title: string; prev?: string } } = {
    ask: { num: 1, title: 'Deposit Bounty', prev: 'nearby' },
    nearby: { num: 2, title: 'Nearby Truth', prev: undefined },
    report: { num: 3, title: 'Capture Evidence', prev: 'nearby' },
    verify: { num: 4, title: 'Audit Consensus', prev: 'report' },
    state: { num: 5, title: 'Oracle Settlement', prev: 'verify' },
  };

  const currentStep = stepMap[activeTab] || stepMap.nearby;

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {/* Full Web Application Canvas (Soft Tinted Mint-White #F4F9F5) */}
          <div className="min-h-screen bg-[#F4F9F5] text-[#11291B] flex flex-col selection:bg-[#99E35E] selection:text-black">
            {/* Global Floating Toast Notifications */}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />

            {/* 1. Full-Width Web Navbar with brand logo, workflow tabs, and wallet persona */}
            <Navbar
              title={currentStep.title}
              stepNumber={currentStep.num}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              unverifiedCount={unverifiedCount}
              canGoBack={!!currentStep.prev}
              onBack={() => {
                if (currentStep.prev) setActiveTab(currentStep.prev);
              }}
              onOpenWalletModal={() => setWalletModalOpen(true)}
              onOpenHowItWorks={() => setHowItWorksOpen(true)}
              onOpenSupabaseModal={() => setSupabaseModalOpen(true)}
              isSupabaseConnected={hybridStore.isConnectedToSupabase}
              activeDemoAccount={activeDemoAccount}
              isUsingDemo={isUsingDemo}
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
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between shadow-xs">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="font-medium leading-tight">
                      Device location blocked by browser: Click the 🔒 lock icon in your address bar → Allow Location.
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0 ml-3">
                    <button
                      onClick={() => fetchDeviceGps(true)}
                      className="px-3 py-1 rounded-full bg-amber-200 text-amber-900 text-xs font-bold hover:bg-amber-300 transition-colors shrink-0"
                    >
                      Retry GPS
                    </button>
                    <button
                      onClick={() => setGpsError(null)}
                      className="w-6 h-6 rounded-full hover:bg-amber-200/60 flex items-center justify-center text-amber-800 transition-colors"
                      title="Dismiss"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Main Web Application Screen Content */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {activeTab === 'ask' && (
                <AskScreen
                  userCoords={currentCoords}
                  onBountyCreated={(id) => {
                    setSelectedBountyId(id);
                    refreshData();
                    setActiveTab('nearby');
                  }}
                  onAdjustBalance={adjustBalance}
                  onShowToast={showToast}
                />
              )}

              {activeTab === 'nearby' && (
                <NearbyScreen
                  userCoords={currentCoords}
                  selectedBountyId={selectedBountyId}
                  onSelectBounty={(id) => setSelectedBountyId(id)}
                  onSelectReportBounty={(id) => {
                    setSelectedBountyId(id);
                    setActiveTab('report');
                  }}
                  onSelectStateBounty={(id) => {
                    setSelectedBountyId(id);
                    setActiveTab('state');
                  }}
                  onSetUserLocation={handleSetUserLocation}
                />
              )}

              {activeTab === 'report' && (
                <ReportScreen
                  bountyId={selectedBountyId}
                  userCoords={currentCoords}
                  activeReporterWallet={activeDemoAccount.address}
                  onReportSubmitted={(bId) => {
                    setSelectedBountyId(bId);
                    refreshData();
                    setActiveTab('verify');
                  }}
                  onBackToNearby={() => setActiveTab('nearby')}
                  onShowToast={showToast}
                />
              )}

              {activeTab === 'verify' && (
                <VerifyScreen
                  bountyId={selectedBountyId}
                  onSelectBounty={(id) => setSelectedBountyId(id)}
                  onVerificationComplete={(bId) => {
                    setSelectedBountyId(bId);
                    refreshData();
                    setActiveTab('state');
                  }}
                  onAdjustBalance={adjustBalance}
                  onShowToast={showToast}
                />
              )}

              {activeTab === 'state' && (
                <StateScreen
                  bountyId={selectedBountyId}
                  onSelectBounty={(id) => setSelectedBountyId(id)}
                  onAdjustBalance={adjustBalance}
                  onShowToast={showToast}
                />
              )}

              {activeTab === 'wallets' && (
                <ThreeWalletsHub
                  activeDemoAccount={activeDemoAccount}
                  onSelectDemoAccount={setActiveDemoAccount}
                  demoAccounts={demoAccounts}
                  onAdjustBalance={adjustBalance}
                  onNavigateToReport={(bId) => {
                    setSelectedBountyId(bId);
                    setActiveTab('report');
                  }}
                  onNavigateToAsk={() => setActiveTab('ask')}
                  onShowToast={showToast}
                />
              )}
            </main>

            {/* 4. Desktop Web Footer */}
            <footer className="w-full bg-white border-t border-emerald-950/10 py-6 mt-12 text-xs text-[#6B7F72] select-none">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-[#0F3822] text-[#99E35E] flex items-center justify-center font-bold text-xs">
                    T
                  </div>
                  <span className="font-bold text-[#11291B]">TrueSpot Protocol</span>
                  <span>•</span>
                  <span>Physical DePIN Oracle on Solana Devnet</span>
                </div>

                <div className="flex items-center space-x-4 text-[11px] font-medium">
                  <span>Colosseum Hackathon MVP</span>
                  <span>•</span>
                  <span>OpenStreetMap Geofence (200m)</span>
                  <span>•</span>
                  <span className="font-mono text-[#0F3822]">Escrow: 9WzD...AWWM</span>
                </div>
              </div>
            </footer>

            {/* Mobile Bottom Floating Navigation Bar (Only on mobile screens) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-emerald-950/10 px-4 py-2 flex items-center justify-around select-none">
              {[
                { id: 'ask', label: 'Ask', icon: PlusCircle },
                { id: 'nearby', label: 'Radar', icon: Compass },
                { id: 'report', label: 'Report', icon: Camera },
                { id: 'verify', label: 'Verify', icon: CheckSquare, badge: unverifiedCount },
                { id: 'state', label: 'State', icon: Coins },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`relative flex flex-col items-center py-1 px-3 rounded-2xl text-[11px] font-semibold transition-all ${
                      isActive ? 'text-[#0F3822] font-bold' : 'text-[#6B7F72] hover:text-[#11291B]'
                    }`}
                  >
                    <div className={`p-1 rounded-full ${isActive ? 'bg-[#E8F5E9]' : ''}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="mt-0.5">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-[#7CB342]" />
                    )}
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
