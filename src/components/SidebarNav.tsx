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
  Sparkles,
  Shield,
  Layers,
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

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="lg:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 w-60 xl:w-64 z-40 bg-[#070707] border-r border-white/[0.08] flex flex-col justify-between p-3 select-none transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Upper: Workspace Badge + Navigation Links */}
        <div className="space-y-4">
          
          {/* Active Workspace Header Badge */}
          <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-white/[0.06]">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#A8FF00] animate-pulse" />
              <span className="text-[11px] font-bold tracking-wider uppercase text-zinc-300 font-mono">
                {userMode === 'maker' ? 'Maker Workspace' : 'Spotter Workspace'}
              </span>
            </div>

            {/* Mobile close button */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden w-6 h-6 rounded-md hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Vertical Sub-Tabs List */}
          <nav className="space-y-1">
            {activeItems.map((item) => {
              const Icon = item.icon;
              const isActive = isRouteActive(item.activePaths);

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.path)}
                  className={`w-full group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer text-left relative ${
                    isActive
                      ? 'bg-white/[0.08] text-white border border-[#A8FF00]/40 shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  {/* Left accent indicator line for active state */}
                  {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#A8FF00] shadow-[0_0_8px_#A8FF00]" />
                  )}

                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                        isActive
                          ? 'bg-[#A8FF00]/20 text-[#A8FF00]'
                          : 'bg-[#121212] text-zinc-400 group-hover:text-zinc-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-zinc-300'}`}>
                        {item.label}
                      </span>
                      <span className="text-[10px] text-zinc-500 truncate font-mono">
                        {item.subtitle}
                      </span>
                    </div>
                  </div>

                  {/* Badges / Pulse indicator */}
                  {item.hasBadge && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[#A8FF00]/20 text-[#A8FF00] text-[9px] font-black font-mono border border-[#A8FF00]/40 shrink-0">
                      {item.badgeText}
                    </span>
                  )}
                  {item.hasPulse && !item.hasBadge && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#A8FF00] animate-pulse shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Lower: Telemetry Card + Bottom Status */}
        <div className="space-y-2 pt-3 border-t border-white/[0.06]">
          {/* Telemetry Card */}
          <div className="bg-[#0C0C0C] border border-white/[0.06] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
              <span className="flex items-center space-x-1.5">
                <Radio className="w-3 h-3 text-[#A8FF00] animate-pulse" />
                <span>Solana Devnet</span>
              </span>
              <span className="text-[#A8FF00] font-semibold">Active</span>
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
      </aside>
    </>
  );
};
