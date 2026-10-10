import React, { useState } from 'react';
import { hybridStore } from '../utils/storage';
import {
  Settings,
  Database,
  Radio,
  MapPin,
  RefreshCw,
  Trash2,
  Check,
  Shield,
  Layers,
  Cpu,
  Lock,
} from 'lucide-react';

interface SettingsViewProps {
  userMode: 'maker' | 'spotter';
  onSwitchMode: (mode: 'maker' | 'spotter') => void;
  onResetDemoState: () => void;
  onShowToast: (title: string, message: string, type?: 'success' | 'info' | 'reward' | 'warning') => void;
  onOpenSupabaseModal?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  userMode,
  onSwitchMode,
  onResetDemoState,
  onShowToast,
  onOpenSupabaseModal,
}) => {
  const [selectedCluster, setSelectedCluster] = useState<string>('devnet');
  const [defaultRole, setDefaultRole] = useState<'maker' | 'spotter'>(userMode);

  const handleSaveCluster = (cluster: string) => {
    setSelectedCluster(cluster);
    onShowToast('Cluster Changed', `RPC updated to Solana ${cluster}`, 'info');
  };

  const handleSaveDefaultRole = (mode: 'maker' | 'spotter') => {
    setDefaultRole(mode);
    localStorage.setItem('truespot_default_mode', mode);
    onSwitchMode(mode);
    onShowToast('Default Mode Saved', `Initial launch workspace set to ${mode} mode`, 'success');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-[#0B0B0B] border border-white/[0.08] rounded-[24px] p-6 sm:p-8 relative shadow-2xl">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#A8FF00]/10 border border-[#A8FF00]/30 flex items-center justify-center text-[#A8FF00]">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Protocol & Workspace Settings
            </h1>
            <p className="text-xs text-zinc-400">
              Manage network connections, default role behavior, database syncing, and demo ledger state.
            </p>
          </div>
        </div>
      </div>

      {/* Setting 1: Default Role Preference */}
      <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[24px] p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div>
            <h2 className="text-sm font-bold text-white">Default Launch Workspace</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Choose which mode TrueSpot opens when you visit the application or refresh.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => handleSaveDefaultRole('maker')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
              defaultRole === 'maker'
                ? 'bg-[#A8FF00]/10 border-[#A8FF00] text-white'
                : 'bg-[#121212] border-white/[0.06] text-zinc-400 hover:text-white'
            }`}
          >
            <div>
              <div className="font-bold text-xs text-white">Maker Mode (Default)</div>
              <div className="text-[11px] text-zinc-400">Query Studio, My Bounties & Review</div>
            </div>
            {defaultRole === 'maker' && <Check className="w-4 h-4 text-[#A8FF00]" />}
          </button>

          <button
            type="button"
            onClick={() => handleSaveDefaultRole('spotter')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
              defaultRole === 'spotter'
                ? 'bg-[#A8FF00]/10 border-[#A8FF00] text-white'
                : 'bg-[#121212] border-white/[0.06] text-zinc-400 hover:text-white'
            }`}
          >
            <div>
              <div className="font-bold text-xs text-white">Spotter Mode (Default)</div>
              <div className="text-[11px] text-zinc-400">200m Radar, Submissions & Earnings</div>
            </div>
            {defaultRole === 'spotter' && <Check className="w-4 h-4 text-[#A8FF00]" />}
          </button>
        </div>
      </div>

      {/* Setting 2: Solana RPC Cluster */}
      <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[24px] p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div>
            <h2 className="text-sm font-bold text-white">Solana RPC Endpoint</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Select the active blockchain cluster for escrow PDAs and SPL Memo settlements.
            </p>
          </div>
          <span className="text-xs font-mono text-[#A8FF00]">Connected</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {[
            { id: 'devnet', label: 'Solana Devnet', url: 'https://api.devnet.solana.com' },
            { id: 'localhost', label: 'Local Validator', url: 'http://127.0.0.1:8899' },
            { id: 'testnet', label: 'Solana Testnet', url: 'https://api.testnet.solana.com' },
          ].map((cluster) => (
            <button
              key={cluster.id}
              type="button"
              onClick={() => handleSaveCluster(cluster.id)}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                selectedCluster === cluster.id
                  ? 'bg-[#A8FF00]/10 border-[#A8FF00]'
                  : 'bg-[#121212] border-white/[0.06] hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{cluster.label}</span>
                {selectedCluster === cluster.id && <Check className="w-3.5 h-3.5 text-[#A8FF00]" />}
              </div>
              <span className="text-[10px] font-mono text-zinc-400 truncate">{cluster.url}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Setting 3: Supabase & Storage Integrity */}
      <div className="bg-[#0B0B0B] border border-white/[0.07] rounded-[24px] p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div>
            <h2 className="text-sm font-bold text-white">PostgreSQL & PostGIS Sync</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Hybrid caching layer automatically synchronizes with Supabase when credentials are provided.
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-300">
            {hybridStore.isConnectedToSupabase ? '🟢 Live PostGIS' : '🟡 In-Memory Local'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="text-xs text-zinc-400">
            Storage bucket: <code className="text-zinc-200 font-mono">truespot_evidence</code>
          </div>
          {onOpenSupabaseModal && (
            <button
              type="button"
              onClick={onOpenSupabaseModal}
              className="py-2 px-4 rounded-full bg-[#161616] hover:bg-[#202020] border border-white/10 text-xs font-semibold text-white transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <Database className="w-3.5 h-3.5 text-[#A8FF00]" />
              <span>Configure Database Sync</span>
            </button>
          )}
        </div>
      </div>

      {/* Setting 4: Reset Demo State & Reset Cache */}
      <div className="bg-[#0B0B0B] border border-red-500/20 rounded-[24px] p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div>
            <h2 className="text-sm font-bold text-red-300">Reset State & Demo Ledger</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Restore sample bounties, reset wallet balances to defaults, and clear local state.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-zinc-400 max-w-md">
            This will restore the 3 default demo accounts (Receiver, Maker, Escrow) and reload baseline location queries.
          </p>
          <button
            type="button"
            onClick={onResetDemoState}
            className="py-2.5 px-4 rounded-full bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-300 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset Demo Ledger</span>
          </button>
        </div>
      </div>
    </div>
  );
};
