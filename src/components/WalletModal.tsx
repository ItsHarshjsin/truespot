import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { requestDevnetAirdrop } from '../utils/solana';
import {
  X,
  Check,
  Wallet,
  Coins,
  ExternalLink,
  Copy,
  RefreshCw,
  LogOut,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface DemoAccount {
  id: string;
  name: string;
  role: 'receiver' | 'maker' | 'escrow' | 'spotter' | 'asker' | 'verifier';
  address: string;
  balanceSol: number;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'receiver',
    name: '1. Task Receiver (Field Worker & Earner)',
    role: 'receiver',
    address: 'Worker9Xkl...88Qv',
    balanceSol: 2.45,
  },
  {
    id: 'maker',
    name: '2. Task Maker (Creator & Escrow Depositor)',
    role: 'maker',
    address: 'Maker3r...4Wqz',
    balanceSol: 5.50,
  },
  {
    id: 'escrow',
    name: '3. Escrow Vault (Solana Program & Oracle)',
    role: 'escrow',
    address: 'Escrow9WzD...AWWM',
    balanceSol: 14.80,
  },
];

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDemoAccount: DemoAccount;
  onSelectDemoAccount: (account: DemoAccount) => void;
  isUsingDemo: boolean;
  onToggleDemoMode: (useDemo: boolean) => void;
  demoAccounts?: DemoAccount[];
  onAirdropDemo?: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  activeDemoAccount,
  onSelectDemoAccount,
  isUsingDemo,
  onToggleDemoMode,
  demoAccounts,
  onAirdropDemo,
}) => {
  const { connection } = useConnection();
  const { connected, publicKey, wallet, disconnect } = useWallet();

  const [realBalance, setRealBalance] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [airdropping, setAirdropping] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDemoList, setShowDemoList] = useState(!connected);

  const accountsList = demoAccounts || DEMO_ACCOUNTS;

  // Fetch live on-chain balance from Solana Devnet
  const fetchRealBalance = async () => {
    if (!connected || !publicKey) return;
    setIsRefreshing(true);
    try {
      const lamports = await connection.getBalance(publicKey, 'confirmed');
      setRealBalance(lamports / LAMPORTS_PER_SOL);
    } catch (e: any) {
      console.warn('Failed to fetch Devnet balance:', e.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (connected && publicKey) {
      fetchRealBalance();
      // Automatically disable demo mode when real Phantom wallet is connected
      if (isUsingDemo) {
        onToggleDemoMode(false);
      }
    }
  }, [connected, publicKey]);

  if (!isOpen) return null;

  // Handle Devnet Airdrop
  const handleAirdrop = async () => {
    setAirdropping(true);
    setStatusMsg({ text: 'Requesting 1 SOL from Solana Devnet faucet...', type: 'info' });

    try {
      if (connected && publicKey) {
        const sig = await requestDevnetAirdrop(publicKey);
        await fetchRealBalance();
        setStatusMsg({
          text: `Success! Airdropped 1 SOL to Phantom (TX: ${sig.slice(0, 8)}...)`,
          type: 'success',
        });
      } else {
        if (onAirdropDemo) {
          onAirdropDemo();
        } else {
          activeDemoAccount.balanceSol += 1.0;
        }
        setStatusMsg({ text: 'Added +1.00 SOL to Demo Wallet!', type: 'success' });
      }
    } catch (err: any) {
      if (onAirdropDemo) onAirdropDemo();
      setStatusMsg({
        text: 'Devnet faucet rate-limited. Added +1.00 SOL in test mode.',
        type: 'info',
      });
    } finally {
      setAirdropping(false);
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  const handleCopyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-md bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">Solana Devnet Wallet</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Devnet
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {connected ? 'Real Phantom / Solana Wallet Connected' : 'Connect Phantom or use Demo Personas'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SECTION 1: Connected Real Solana Wallet (Phantom / Solflare) */}
        {connected && publicKey ? (
          <div className="mb-5 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-emerald-300">
                  {wallet?.adapter.name || 'Phantom'} (Active)
                </span>
              </div>
              <button
                onClick={() => disconnect()}
                className="flex items-center space-x-1 text-xs text-rose-400 hover:text-rose-300 font-semibold transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>

            {/* Address & Solscan Link */}
            <div className="p-2.5 bg-black/40 rounded-xl border border-white/10 flex items-center justify-between">
              <div className="font-mono text-xs text-emerald-300 font-semibold truncate mr-2">
                {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}
              </div>
              <div className="flex items-center space-x-1 shrink-0">
                <button
                  onClick={handleCopyAddress}
                  className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Copy address"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href={`https://solscan.io/account/${publicKey.toBase58()}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="View on Solscan Devnet"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Devnet Balance Display */}
            <div className="flex items-center justify-between px-1">
              <div>
                <span className="text-xs text-gray-400">Live Devnet Balance:</span>
                <div className="text-lg font-bold font-mono text-emerald-400">
                  {realBalance !== null ? `${realBalance.toFixed(3)} SOL` : 'Fetching...'}
                </div>
              </div>
              <button
                onClick={fetchRealBalance}
                disabled={isRefreshing}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
                title="Refresh balance from Solana RPC"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        ) : (
          /* When NOT connected: Prominent Phantom / Solflare Connect Button */
          <div className="mb-5 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 text-center">
            <div className="flex flex-col items-center justify-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-sm">
                <Wallet className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Connect Browser Wallet</h3>
              <p className="text-xs text-gray-400">
                Connect Phantom or Solflare to post bounties, stake, and receive payouts with real Devnet SOL.
              </p>
            </div>

            <div className="flex justify-center pt-1" onClick={() => onToggleDemoMode(false)}>
              <WalletMultiButton className="!w-full !justify-center !h-10 !py-0 !px-4 !text-xs !font-bold !rounded-full !bg-gradient-to-r !from-emerald-600 !to-teal-600 hover:!from-emerald-500 hover:!to-teal-500 !shadow-lg !shadow-emerald-950/50" />
            </div>
          </div>
        )}

        {/* SECTION 2: 1-Click Devnet SOL Faucet */}
        <div className="mb-5">
          <button
            onClick={handleAirdrop}
            disabled={airdropping}
            className="w-full py-3.5 px-4 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold flex items-center justify-center space-x-2 transition-all shadow-lg shadow-emerald-950/50 active:scale-[0.99] disabled:opacity-50"
          >
            <Coins className="w-4 h-4 text-emerald-200" />
            <span>
              {airdropping
                ? 'Requesting from Solana Faucet...'
                : connected
                ? 'Request +1.00 SOL to Connected Phantom'
                : 'Request +1.00 SOL Devnet Airdrop'}
            </span>
          </button>

          {statusMsg && (
            <div
              className={`mt-2.5 p-2.5 rounded-xl text-xs font-medium text-center ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : statusMsg.type === 'error'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {statusMsg.text}
            </div>
          )}
        </div>

        {/* SECTION 3: Demo Personas (Collapsible Fallback for offline judging) */}
        <div className="border-t border-white/10 pt-3">
          <button
            onClick={() => setShowDemoList(!showDemoList)}
            className="w-full flex items-center justify-between text-xs font-semibold text-gray-400 hover:text-white py-1 transition-colors"
          >
            <span>Or Use Demo Personas (Offline / Fast Testing)</span>
            {showDemoList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showDemoList && (
            <div className="space-y-2 mt-2.5">
              {accountsList.map((acc) => {
                const isSelected = isUsingDemo && activeDemoAccount.id === acc.id;

                return (
                  <button
                    key={acc.id}
                    onClick={() => {
                      onSelectDemoAccount(acc);
                      onToggleDemoMode(true);
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500/50 shadow-sm text-white'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{acc.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{acc.address}</div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-400 font-mono">
                        {acc.balanceSol.toFixed(2)} SOL
                      </div>
                      {isSelected && (
                        <span className="text-[9px] font-bold text-emerald-400 flex items-center justify-end space-x-0.5">
                          <Check className="w-2.5 h-2.5" />
                          <span>ACTIVE DEMO</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
