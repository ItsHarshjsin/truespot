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

import { TopNavbar } from './components/TopNavbar';
import { SidebarNav } from './components/SidebarNav';
import { MakerPortal } from './components/MakerPortal';
import { ReceiverPortal } from './components/ReceiverPortal';
import { ThreeWalletsHub } from './components/ThreeWalletsHub';
import { EvidenceExplorer } from './components/EvidenceExplorer';
import { ProtocolExplorer } from './components/ProtocolExplorer';
import { AdminVerificationPanel } from './components/AdminVerificationPanel';
import { JudgeDeck } from './components/JudgeDeck';
import { LiveRealityMap } from './components/LiveRealityMap';
import { ReputationScreen } from './components/ReputationScreen';
import { ProfileView } from './components/ProfileView';
import { SettingsView } from './components/SettingsView';
import { RoleGuard } from './components/RoleGuard';
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
  Camera,
  Coins,
  Award,
  BarChart3,
  MapPin,
  User,
  Settings,
} from 'lucide-react';

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Modals state
  const [walletModalOpen, setWalletModalOpen] = useState<boolean>(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState<boolean>(false);
  const [supabaseModalOpen, setSupabaseModalOpen] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // Active User Mode: 'maker' | 'spotter' (persisted to localStorage across page refreshes)
  const savedModeStr =
    typeof window !== 'undefined'
      ? (localStorage.getItem('truespot_active_mode') as 'maker' | 'spotter') ||
        (localStorage.getItem('truespot_default_mode') as 'maker' | 'spotter')
      : null;
  const [userMode, setUserMode] = useState<'maker' | 'spotter'>(savedModeStr || 'maker');

  // Admin access state (persisted)
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('truespot_admin_auth') === 'true' ||
        sessionStorage.getItem('truespot_admin_auth') === 'true'
      );
    }
    return false;
  });

  // Dynamic Demo Accounts & Wallet State (persisted to localStorage)
  const initialAccounts: DemoAccount[] = (() => {
    if (typeof window !== 'undefined') {
      const version = localStorage.getItem('truespot_version');
      if (version === 'v2.1.0') {
        const saved = localStorage.getItem('truespot_demo_accounts');
        if (saved) {
          try {
            return JSON.parse(saved);
          } catch (e) {}
        }
      }
    }
    return DEMO_ACCOUNTS;
  })();

  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>(initialAccounts);
  const [activeDemoAccount, setActiveDemoAccount] = useState<DemoAccount>(initialAccounts[0]);
  const [isUsingDemo, setIsUsingDemo] = useState<boolean>(true);

  // Dynamic count of pending submissions for sidebar badge
  const [unverifiedCount, setUnverifiedCount] = useState(0);

  useEffect(() => {
    const updatePending = async () => {
      try {
        const obs = await hybridStore.getObservations();
        const pending = obs.filter((o) => o.status === 'PENDING').length;
        setUnverifiedCount(pending);
      } catch (e) {}
    };
    updatePending();
    const unsub = hybridStore.subscribeToChanges(updatePending);
    return () => unsub();
  }, []);

  // Active Tab synchronized with routes
  const [activeTab, setActiveTab] = useState<string>('bounties');

  useEffect(() => {
    const p = location.pathname;
    if (p === '/studio') setActiveTab('studio');
    else if (p === '/bounties' || p === '/dashboard' || p === '/maker') setActiveTab('bounties');
    else if (p === '/review' || p === '/explorer') setActiveTab('review');
    else if (p === '/records' || p === '/developers') setActiveTab('records');
    else if (p === '/analytics') setActiveTab('analytics');
    else if (p === '/nearby' || p === '/radar' || p === '/spotter') setActiveTab('nearby');
    else if (p === '/report') setActiveTab('report');
    else if (p === '/submissions') setActiveTab('submissions');
    else if (p === '/earnings') setActiveTab('earnings');
    else if (p === '/reputation') setActiveTab('reputation');
    else if (p === '/map') setActiveTab('map');
    else if (p === '/vault' || p === '/escrow' || p === '/wallets') setActiveTab('vault');
    else if (p === '/profile') setActiveTab('profile');
    else if (p === '/settings') setActiveTab('settings');
    else if (p === '/admin') setActiveTab('admin');

    // Synchronize mode if user directly loads a role-specific route
    const makerPaths = ['/studio', '/bounties', '/dashboard', '/maker', '/review', '/explorer', '/records', '/developers', '/analytics'];
    const spotterPaths = ['/nearby', '/radar', '/spotter', '/report', '/submissions', '/earnings', '/reputation'];
    if (makerPaths.includes(p) && userMode !== 'maker') {
      setUserMode('maker');
      try { localStorage.setItem('truespot_active_mode', 'maker'); } catch (e) {}
    } else if (spotterPaths.includes(p) && userMode !== 'spotter') {
      setUserMode('spotter');
      try { localStorage.setItem('truespot_active_mode', 'spotter'); } catch (e) {}
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
   * Mode Switcher Handler:
   * Instantly changes active workspace without disconnecting wallet or changing account.
   * Persists active mode to localStorage.
   */
  const handleSelectUserMode = (mode: 'maker' | 'spotter', redirect = true) => {
    setUserMode(mode);
    try {
      localStorage.setItem('truespot_active_mode', mode);
    } catch (e) {}

    // Match active demo account with role
    if (isUsingDemo) {
      const targetRole = mode === 'maker' ? 'maker' : 'receiver';
      const targetAcc = demoAccounts.find((a) => a.role === targetRole);
      if (targetAcc) {
        setActiveDemoAccount(targetAcc);
      }
    }

    showToast(
      `${mode === 'maker' ? 'Maker' : 'Spotter'} Mode Activated`,
      mode === 'maker'
        ? 'Switched to Maker workspace: Query Studio, Escrow Bounties & Review.'
        : 'Switched to Spotter workspace: 200m Radar, Submissions & Earnings.',
      'info'
    );

    if (redirect) {
      if (mode === 'maker') {
        navigate('/bounties');
        setActiveTab('bounties');
      } else {
        navigate('/nearby');
        setActiveTab('nearby');
      }
    }
  };

  const handleResetDemoState = async () => {
    try {
      localStorage.clear();
      localStorage.setItem('truespot_version', 'v2.1.0');
    } catch (e) {}
    setDemoAccounts(DEMO_ACCOUNTS);
    setActiveDemoAccount(DEMO_ACCOUNTS[0]);
    setIsAdmin(false);
    await hybridStore.wipeAllData();
    showToast('Clean Slate Initialized', 'Wiped all protocol state, initialized 1.00 SOL wallets and zeroed metrics', 'info');
  };

  /**
   * Universal Multi-Role Fund Ledger
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
      case 'studio':
        return 'Query Studio';
      case 'bounties':
      case 'dashboard':
        return 'My Bounties';
      case 'review':
      case 'explorer':
        return 'Evidence Review';
      case 'records':
      case 'developers':
        return 'Truth Records';
      case 'analytics':
        return 'Maker Analytics';
      case 'nearby':
      case 'radar':
        return 'Nearby Bounties';
      case 'report':
        return 'Submit Evidence';
      case 'submissions':
        return 'My Submissions';
      case 'earnings':
        return 'Spotter Earnings';
      case 'reputation':
        return 'Reputation & Honesty';
      case 'map':
        return 'Live Reality Map';
      case 'vault':
        return 'Escrow Vault';
      case 'profile':
        return 'Account Profile';
      case 'settings':
        return 'Settings';
      case 'admin':
        return 'Admin Diagnostics';
      default:
        return userMode === 'maker' ? 'My Bounties' : 'Nearby Bounties';
    }
  };

  const isLocationView = ['studio', 'nearby', 'radar', 'map'].includes(activeTab);

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F5] font-sans flex flex-col relative selection:bg-[#A8FF00] selection:text-black">
      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* 1. Fixed Global Top Header */}
      <TopNavbar
        userMode={userMode}
        onSelectUserMode={handleSelectUserMode}
        onOpenWalletModal={() => setWalletModalOpen(true)}
        onOpenHowItWorks={() => setHowItWorksOpen(true)}
        onOpenSupabaseModal={() => setSupabaseModalOpen(true)}
        isSupabaseConnected={hybridStore.isConnectedToSupabase}
        activeDemoAccount={activeDemoAccount}
        isUsingDemo={isUsingDemo}
        onResetDemoState={handleResetDemoState}
        isAdmin={isAdmin}
        onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
      />

      {/* 2. Global Layout Container with Vertical Left Sidebar & Content */}
      <div className="pt-16 min-h-screen bg-[#050505] flex flex-col">
        <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex">
          {/* Left Vertical Sidebar */}
          <SidebarNav
            userMode={userMode}
            unverifiedCount={unverifiedCount}
            mobileOpen={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
          />

          {/* Content Area aligned with sidebar and top navbar */}
          <div className="flex-1 min-w-0 pl-0 lg:pl-8 xl:pl-10 py-6 flex flex-col justify-between">
            <div>
              {/* 2. Subheader Toolbar: Real Device GPS, Preset Jumper & Devnet +1 SOL Airdrop */}
              {isLocationView && (
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
              {gpsError && isLocationView && (
                <div className="w-full mb-4">
                  <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between text-xs text-amber-200">
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
              <main className="flex-1 w-full">
        <Routes>
          {/* ================= MAKER MODE ROUTES ================= */}
          {/* 1. Query Studio */}
          <Route
            path="/studio"
            element={
              <RoleGuard requiredMode="maker" currentMode={userMode} onSwitchMode={handleSelectUserMode}>
                <MakerPortal
                  userCoords={currentCoords}
                  activeAccount={activeDemoAccount}
                  onAdjustBalance={adjustBalance}
                  onShowToast={showToast}
                  onNavigateToRadar={() => {
                    handleSelectUserMode('spotter', false);
                    navigate('/nearby');
                    setActiveTab('nearby');
                  }}
                  initialSubTab="create"
                />
              </RoleGuard>
            }
          />

          {/* 2. My Bounties (and legacy dashboard aliases) */}
          <Route
            path="/bounties"
            element={
              <RoleGuard requiredMode="maker" currentMode={userMode} onSwitchMode={handleSelectUserMode}>
                <MakerPortal
                  userCoords={currentCoords}
                  activeAccount={activeDemoAccount}
                  onAdjustBalance={adjustBalance}
                  onShowToast={showToast}
                  onNavigateToRadar={() => {
                    handleSelectUserMode('spotter', false);
                    navigate('/nearby');
                    setActiveTab('nearby');
                  }}
                  initialSubTab="dashboard"
                />
              </RoleGuard>
            }
          />
          <Route path="/dashboard" element={<Navigate to="/bounties" replace />} />
          <Route path="/maker" element={<Navigate to="/bounties" replace />} />

          {/* 3. Evidence Review */}
          <Route
            path="/review"
            element={
              <RoleGuard requiredMode="maker" currentMode={userMode} onSwitchMode={handleSelectUserMode}>
                <EvidenceExplorer
                  onShowToast={showToast}
                  onAdjustBalance={adjustBalance}
                  activeAccount={activeDemoAccount}
                />
              </RoleGuard>
            }
          />
          <Route path="/explorer" element={<Navigate to="/review" replace />} />

          {/* 4. Truth Records */}
          <Route
            path="/records"
            element={
              <RoleGuard requiredMode="maker" currentMode={userMode} onSwitchMode={handleSelectUserMode}>
                <ProtocolExplorer onShowToast={showToast} />
              </RoleGuard>
            }
          />
          <Route path="/developers" element={<Navigate to="/records" replace />} />

          {/* 5. Maker Analytics */}
          <Route
            path="/analytics"
            element={
              <RoleGuard requiredMode="maker" currentMode={userMode} onSwitchMode={handleSelectUserMode}>
                <ThreeWalletsHub
                  activeDemoAccount={activeDemoAccount}
                  onSelectDemoAccount={setActiveDemoAccount}
                  demoAccounts={demoAccounts}
                  onAdjustBalance={adjustBalance}
                  onNavigateToReport={() => {
                    handleSelectUserMode('spotter', false);
                    navigate('/report');
                    setActiveTab('report');
                  }}
                  onNavigateToAsk={() => {
                    navigate('/studio');
                    setActiveTab('studio');
                  }}
                  onShowToast={showToast}
                  initialRoleView="maker"
                />
              </RoleGuard>
            }
          />

          {/* ================= SPOTTER MODE ROUTES ================= */}
          {/* 1. Nearby Bounties */}
          <Route
            path="/nearby"
            element={
              <RoleGuard requiredMode="spotter" currentMode={userMode} onSwitchMode={handleSelectUserMode}>
                <ReceiverPortal
                  userCoords={currentCoords}
                  activeAccount={activeDemoAccount}
                  onSetUserLocation={handleSetUserLocation}
                  onShowToast={showToast}
                  initialSubTab="radar"
                />
              </RoleGuard>
            }
          />
          <Route path="/radar" element={<Navigate to="/nearby" replace />} />
          <Route path="/spotter" element={<Navigate to="/nearby" replace />} />

          {/* 2. Submit Evidence */}
          <Route
            path="/report"
            element={
              <RoleGuard requiredMode="spotter" currentMode={userMode} onSwitchMode={handleSelectUserMode}>
                <ReceiverPortal
                  userCoords={currentCoords}
                  activeAccount={activeDemoAccount}
                  onSetUserLocation={handleSetUserLocation}
                  onShowToast={showToast}
                  initialSubTab="report"
                />
              </RoleGuard>
            }
          />

          {/* 3. My Submissions */}
          <Route
            path="/submissions"
            element={
              <RoleGuard requiredMode="spotter" currentMode={userMode} onSwitchMode={handleSelectUserMode}>
                <ReceiverPortal
                  userCoords={currentCoords}
                  activeAccount={activeDemoAccount}
                  onSetUserLocation={handleSetUserLocation}
                  onShowToast={showToast}
                  initialSubTab="submissions"
                />
              </RoleGuard>
            }
          />

          {/* 4. Spotter Earnings */}
          <Route
            path="/earnings"
            element={
              <RoleGuard requiredMode="spotter" currentMode={userMode} onSwitchMode={handleSelectUserMode}>
                <ReceiverPortal
                  userCoords={currentCoords}
                  activeAccount={activeDemoAccount}
                  onSetUserLocation={handleSetUserLocation}
                  onShowToast={showToast}
                  initialSubTab="earnings"
                />
              </RoleGuard>
            }
          />

          {/* 5. Spotter Reputation */}
          <Route
            path="/reputation"
            element={
              <RoleGuard requiredMode="spotter" currentMode={userMode} onSwitchMode={handleSelectUserMode}>
                <ReputationScreen
                  activeAccount={activeDemoAccount}
                  onNavigateToNearby={() => {
                    navigate('/nearby');
                    setActiveTab('nearby');
                  }}
                  onNavigateToReport={() => {
                    navigate('/report');
                    setActiveTab('report');
                  }}
                />
              </RoleGuard>
            }
          />

          {/* ================= SHARED ROUTES ================= */}
          {/* Live Reality Map */}
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

          {/* Escrow Vault */}
          <Route
            path="/vault"
            element={
              <ThreeWalletsHub
                activeDemoAccount={activeDemoAccount}
                onSelectDemoAccount={setActiveDemoAccount}
                demoAccounts={demoAccounts}
                onAdjustBalance={adjustBalance}
                onNavigateToReport={() => {
                  handleSelectUserMode('spotter', false);
                  navigate('/report');
                  setActiveTab('report');
                }}
                onNavigateToAsk={() => {
                  handleSelectUserMode('maker', false);
                  navigate('/studio');
                  setActiveTab('studio');
                }}
                onShowToast={showToast}
                initialRoleView="escrow"
              />
            }
          />
          <Route path="/escrow" element={<Navigate to="/vault" replace />} />
          <Route path="/wallets" element={<Navigate to="/vault" replace />} />

          {/* Profile */}
          <Route
            path="/profile"
            element={
              <ProfileView
                activeAccount={activeDemoAccount}
                userMode={userMode}
                onSwitchMode={handleSelectUserMode}
                onOpenWalletModal={() => setWalletModalOpen(true)}
                onShowToast={showToast}
              />
            }
          />

          {/* Settings */}
          <Route
            path="/settings"
            element={
              <SettingsView
                userMode={userMode}
                onSwitchMode={handleSelectUserMode}
                onResetDemoState={handleResetDemoState}
                onShowToast={showToast}
                onOpenSupabaseModal={() => setSupabaseModalOpen(true)}
              />
            }
          />

          {/* ================= ADMIN PROTECTED ROUTE ================= */}
          <Route
            path="/admin"
            element={
              <RoleGuard
                requiredMode="admin"
                currentMode={userMode}
                onSwitchMode={handleSelectUserMode}
                isAdmin={isAdmin}
                onAuthorizeAdmin={() => setIsAdmin(true)}
              >
                <AdminVerificationPanel />
              </RoleGuard>
            }
          />

          {/* Root Fallback */}
          <Route path="/" element={<Navigate to={userMode === 'maker' ? '/bounties' : '/nearby'} replace />} />
          <Route path="*" element={<Navigate to={userMode === 'maker' ? '/bounties' : '/nearby'} replace />} />
        </Routes>
              </main>
            </div>

            {/* 4. Desktop Web Footer */}
            <footer className="w-full bg-[#0B0B0B] border border-white/[0.07] rounded-2xl p-5 mt-12 text-xs text-[#858585] select-none">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-full bg-[#A8FF00] text-black flex items-center justify-center font-black text-xs">
                    T
                  </div>
                  <span className="font-bold text-[#F5F5F5] tracking-tight">TrueSpot Protocol</span>
                  <span>•</span>
                  <span className="text-[#858585]">
                    Active Workspace: <strong className="text-white capitalize">{userMode} Mode</strong>
                  </span>
                </div>

                <div className="flex items-center space-x-4 text-[11px] font-medium text-[#858585]">
                  <button
                    onClick={() => handleSelectUserMode(userMode === 'maker' ? 'spotter' : 'maker')}
                    className="text-[#A8FF00] hover:underline cursor-pointer"
                  >
                    Switch to {userMode === 'maker' ? 'Spotter' : 'Maker'} Mode
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => {
                      navigate('/admin');
                      setActiveTab('admin');
                    }}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Admin Access
                  </button>
                  <span>•</span>
                  <span className="font-mono text-[#A8FF00] font-semibold">Vault: TrUEspot...1111</span>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </div>

      {/* 5. Mobile Bottom Floating Navigation Bar - Mode Specific */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B0B0B]/95 backdrop-blur-2xl border-t border-white/10 px-2 py-1.5 flex items-center justify-around select-none">
        {(userMode === 'maker'
          ? [
              { id: 'studio', path: '/studio', label: 'Studio', icon: PlusCircle },
              { id: 'bounties', path: '/bounties', label: 'Bounties', icon: FileCheck2 },
              { id: 'review', path: '/review', label: 'Review', icon: ShieldCheck },
              { id: 'map', path: '/map', label: 'Map', icon: MapPin },
              { id: 'vault', path: '/vault', label: 'Vault', icon: Lock },
              { id: 'profile', path: '/profile', label: 'Profile', icon: User },
            ]
          : [
              { id: 'nearby', path: '/nearby', label: 'Nearby', icon: Compass },
              { id: 'report', path: '/report', label: 'Submit', icon: Camera },
              { id: 'earnings', path: '/earnings', label: 'Earnings', icon: Coins },
              { id: 'reputation', path: '/reputation', label: 'Reputation', icon: Award },
              { id: 'map', path: '/map', label: 'Map', icon: MapPin },
              { id: 'profile', path: '/profile', label: 'Profile', icon: User },
            ]
        ).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                navigate(item.path);
                setActiveTab(item.id);
              }}
              className={`relative flex flex-col items-center py-1 px-2 rounded-2xl text-[10px] font-semibold transition-all ${
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
              <span className="mt-0.5 truncate max-w-[50px]">{item.label}</span>
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
            `Credited +1.00 SOL to ${activeDemoAccount.name.split(' ')[0]}`,
            'reward'
          );
        }}
      />

      {/* How It Works Protocol Guide Modal */}
      <HowItWorksModal
        isOpen={howItWorksOpen}
        onClose={() => setHowItWorksOpen(false)}
        onStartDemo={() => {
          setHowItWorksOpen(false);
          navigate(userMode === 'maker' ? '/studio' : '/nearby');
        }}
      />

      {/* Supabase PostGIS Credentials Configuration Modal */}
      <SupabaseModal
        isOpen={supabaseModalOpen}
        onClose={() => setSupabaseModalOpen(false)}
        onConfigSaved={() => {
          showToast('Database Synchronized', 'Supabase credentials verified', 'success');
        }}
      />
    </div>
  );
};

export const App: React.FC = () => {
  const network = 'devnet';
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
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
