import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  PlusCircle,
  Compass,
  FileCheck2,
  ShieldCheck,
  Code2,
  BarChart3,
  Camera,
  Coins,
  Award,
  Radio,
  X,
} from 'lucide-react';

interface SidebarNavProps {
  userMode: 'maker' | 'spotter';
  unverifiedCount?: number;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  id: string;
  path: string;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  activePaths: string[];
  hasBadge?: boolean;
  badgeText?: string;
  hasPulse?: boolean;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  userMode,
  unverifiedCount = 0,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isRouteActive = (paths: string[]) => {
    return paths.includes(location.pathname);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    if (onCloseMobile) onCloseMobile();
  };

  const makerNavItems: NavItem[] = [
    {
      id: 'studio',
      path: '/studio',
      label: 'Query Studio',
      subtitle: 'Create task & lock escrow',
      icon: PlusCircle,
      activePaths: ['/studio'],
    },
    {
      id: 'bounties',
      path: '/bounties',
      label: 'My Bounties',
      subtitle: 'Manage tasks & ledger',
      icon: FileCheck2,
      activePaths: ['/bounties', '/dashboard', '/maker', '/'],
    },
    {
      id: 'review',
      path: '/review',
      label: 'Evidence Review',
      subtitle: 'Judge proofs & payouts',
      icon: ShieldCheck,
      activePaths: ['/review', '/explorer'],
      hasBadge: unverifiedCount > 0,
      badgeText: unverifiedCount > 0 ? '1 PENDING' : undefined,
    },
    {
      id: 'records',
      path: '/records',
      label: 'Truth Records',
      subtitle: 'Open Truth REST API v2',
      icon: Code2,
      activePaths: ['/records', '/developers'],
    },
    {
      id: 'analytics',
      path: '/analytics',
      label: 'Maker Analytics',
      subtitle: 'Protocol TVL & slot feed',
      icon: BarChart3,
      activePaths: ['/analytics'],
    },
  ];

  const spotterNavItems: NavItem[] = [
    {
      id: 'nearby',
      path: '/nearby',
      label: 'Nearby Bounties',
      subtitle: '200m physical radar HUD',
      icon: Compass,
      activePaths: ['/nearby', '/radar', '/spotter', '/'],
      hasPulse: true,
    },
    {
      id: 'report',
      path: '/report',
      label: 'Submit Evidence',
      subtitle: 'Hardware sensor capture',
      icon: Camera,
      activePaths: ['/report'],
    },
    {
      id: 'submissions',
      path: '/submissions',
      label: 'My Submissions',
      subtitle: 'Field reports ledger',
      icon: FileCheck2,
      activePaths: ['/submissions'],
    },
    {
      id: 'earnings',
      path: '/earnings',
      label: 'Earnings Ledger',
      subtitle: 'Settled SOL payouts',
      icon: Coins,
      activePaths: ['/earnings'],
    },
    {
      id: 'reputation',
      path: '/reputation',
      label: 'Reputation Radar',
      subtitle: 'Sensor honesty score',
      icon: Award,
      activePaths: ['/reputation'],
    },
  ];

  const activeItems = userMode === 'maker' ? makerNavItems : spotterNavItems;

  const renderContent = (isMobileView = false) => (
    <>
      {/* Upper: Workspace Badge + Navigation Links */}
      <div className="space-y-4">
        {/* Active Workspace Header Badge */}
        <div className="flex items-center justify-between px-2 pt-1 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#A8FF00]" />
            <span className="text-[11px] font-bold tracking-wider uppercase text-zinc-300 font-mono">
              {userMode === 'maker' ? 'Maker Workspace' : 'Spotter Workspace'}
            </span>
          </div>

          {isMobileView && onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="w-6 h-6 rounded-md hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Vertical Sub-Tabs List - Flat Web3 Aesthetic */}
        <nav className="space-y-1">
          {activeItems.map((item) => {
            const Icon = item.icon;
            const isActive = isRouteActive(item.activePaths);

            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                className={`w-full group flex items-center justify-between pl-3 pr-2.5 py-2.5 rounded-r-xl rounded-l-none transition-all cursor-pointer text-left relative ${
                  isActive
                    ? 'bg-[#101010] text-white border-l-2 border-[#A8FF00]'
                    : 'border-l-2 border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                      isActive
                        ? 'bg-[#181818] text-[#A8FF00] border border-[#A8FF00]/30'
                        : 'bg-[#111111] text-zinc-500 group-hover:text-zinc-300 border border-white/[0.05]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span
                      className={`text-xs font-semibold truncate ${
                        isActive ? 'text-white' : 'text-zinc-300'
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className="text-[10px] text-zinc-500 truncate font-mono">
                      {item.subtitle}
                    </span>
                  </div>
                </div>

                {/* Subtle Badges / Indicators */}
                {item.hasBadge && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded bg-[#141414] text-[#A8FF00] text-[9px] font-bold font-mono border border-[#A8FF00]/30 shrink-0">
                    {item.badgeText}
                  </span>
                )}
                {item.hasPulse && !item.hasBadge && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A8FF00] shrink-0 ml-1.5" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Lower: Telemetry Card */}
      <div className="pt-3 border-t border-white/[0.06]">
        <div className="bg-[#0B0B0B] border border-white/[0.06] rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
            <span className="flex items-center space-x-1.5">
              <Radio className="w-3 h-3 text-[#A8FF00]" />
              <span>Solana Devnet</span>
            </span>
            <span className="text-[#A8FF00] font-semibold text-[10px]">Active</span>
          </div>

          <p className="text-[11px] text-zinc-400 leading-snug">
            {userMode === 'maker'
              ? 'Escrow contracts locked under 2.5% protocol fee.'
              : '200m geofence active with gyroscopic verification.'}
          </p>

          <div className="pt-1 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
            <span>Truth Engine</span>
            <span className="text-zinc-300">v2.0.0</span>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Drawer (Visible when mobile hamburger is open) */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
          />
          <aside className="relative w-64 max-w-[80vw] h-full bg-[#080808] border-r border-white/[0.08] p-4 flex flex-col justify-between z-10 select-none">
            {renderContent(true)}
          </aside>
        </div>
      )}

      {/* Desktop In-Flow Sticky Sidebar: Aligned strictly with TopNavbar container */}
      <aside className="hidden lg:flex flex-col w-56 xl:w-60 shrink-0 border-r border-white/[0.08] pr-4 py-6 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto justify-between select-none">
        {renderContent(false)}
      </aside>
    </>
  );
};
