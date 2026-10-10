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
    id: 'maker',
    name: '1. Task Maker (Escrow Depositor)',
    role: 'maker',
    address: 'Ask3r...4Wqz',
    balanceSol: 1.00,
  },
  {
    id: 'receiver',
    name: '2. Spotter Earner (Worker)',
    role: 'receiver',
    address: 'Spot7r...9Xkl',
    balanceSol: 1.00,
  },
  {
    id: 'escrow',
    name: '3. Escrow Vault Protocol',
    role: 'escrow',
    address: 'Vault9Wz...AWWM',
    balanceSol: 0.00,
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
      if (isUsingDemo) {
        onToggleDemoMode(false);
      }
    }
  }, [connected, publicKey]);

  if (!isOpen) return null;

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
        text: 'Devnet faucet rate-limited. Added +1.00 SOL locally.',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <div className="relative w-full max-w-md bg-[#0B0B0B] border border-white/[0.08] rounded-[24px] p-6 shadow-2xl text-[#F5F5F5]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.07] mb-5">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-full bg-[#101010] border border-white/[0.08] flex items-center justify-center text-[#A8FF00]">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-[#F5F5F5]">Solana Devnet Wallet</h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#A8FF00]/10 text-[#A8FF00] border border-[#A8FF00]/30">
                  Devnet
                </span>
              </div>
              <p className="text-xs text-[#858585]">
                {connected ? 'Real Phantom / Solana Wallet Connected' : 'Connect Phantom or use Demo Personas'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#101010] border border-white/10 flex items-center justify-center text-[#858585] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SECTION 1: Connected Real Solana Wallet (Phantom / Solflare) */}
        {connected && publicKey ? (
          <div className="mb-5 p-4 rounded-xl bg-[#101010] border border-white/[0.07] space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#A8FF00] animate-pulse" />
                <span className="text-xs font-bold text-[#A8FF00]">
                  {wallet?.adapter.name || 'Phantom'} (Active)
                </span>
              </div>
              <button
                onClick={() => disconnect()}
                className="flex items-center space-x-1 text-xs text-rose-400 hover:text-rose-300 font-semibold transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>

            {/* Address & Solscan Link */}
            <div className="p-2.5 bg-[#050505] rounded-xl border border-white/[0.06] flex items-center justify-between">
              <div className="font-mono text-xs text-zinc-300 font-semibold truncate mr-2">
                {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}
              </div>
              <div className="flex items-center space-x-1 shrink-0">
                <button
                  onClick={handleCopyAddress}
                  className="p-1 rounded-md text-[#858585] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Copy address"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#A8FF00]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href={`https://solscan.io/account/${publicKey.toBase58()}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 rounded-md text-[#858585] hover:text-white hover:bg-white/10 transition-colors"
                  title="View on Solscan Devnet"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Devnet Balance Display */}
            <div className="flex items-center justify-between px-1">
              <div>
                <span className="text-[11px] text-[#858585]">Live Devnet Balance:</span>
                <div className="text-lg font-bold font-mono text-[#A8FF00]">
                  {realBalance !== null ? `${realBalance.toFixed(3)} SOL` : 'Fetching...'}
                </div>
              </div>
              <button
                onClick={fetchRealBalance}
                disabled={isRefreshing}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-[#18181b] border border-white/[0.08] text-xs font-semibold text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Refresh balance from Solana RPC"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        ) : (
          /* When NOT connected: Prominent Phantom / Solflare Connect Button */
          <div className="mb-5 p-4 rounded-xl bg-[#101010] border border-white/[0.07] space-y-3 text-center">
            <div className="flex flex-col items-center justify-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-[#0B0B0B] text-[#A8FF00] flex items-center justify-center border border-white/[0.08] shadow-sm">
                <Wallet className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#F5F5F5]">Connect Solana Wallet</h3>
              <p className="text-xs text-[#858585]">
                Connect Phantom or Solflare to lock escrow, verify tasks, and receive payouts on Devnet.
              </p>
            </div>

            <div className="flex justify-center pt-1" onClick={() => onToggleDemoMode(false)}>
              <WalletMultiButton className="!w-full !justify-center !h-10 !py-0 !px-4 !text-xs !font-extrabold !rounded-full !bg-gradient-to-r !from-[#A8FF00] !to-[#34D399] !text-black !shadow-lg !shadow-[#A8FF00]/20" />
            </div>
          </div>
        )}

        {/* SECTION 2: 1-Click Devnet SOL Faucet */}
        <div className="mb-5">
          <button
            onClick={handleAirdrop}
            disabled={airdropping}
            className="w-full py-3.5 px-4 rounded-full bg-[#A8FF00] hover:bg-[#b8ff24] text-black text-xs font-black flex items-center justify-center space-x-2 transition-all shadow-xl shadow-[#A8FF00]/30 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            <Coins className="w-4 h-4 text-black" />
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
                  ? 'bg-[#A8FF00]/10 text-[#A8FF00] border border-[#A8FF00]/30'
                  : statusMsg.type === 'error'
                  ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                  : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
              }`}
            >
              {statusMsg.text}
            </div>
          )}
        </div>

        {/* SECTION 3: Demo Personas (Collapsible Fallback) */}
        <div className="border-t border-white/[0.07] pt-3">
          <button
            onClick={() => setShowDemoList(!showDemoList)}
            className="w-full flex items-center justify-between text-xs font-semibold text-[#858585] hover:text-white py-1 transition-colors cursor-pointer"
          >
            <span>Or Use Demo Personas (Fast Switching)</span>
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
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#0B0B0B] border-[#A8FF00] shadow-[0_0_12px_rgba(168,255,0,0.15)] text-[#F5F5F5]'
                        : 'bg-[#101010] border-white/[0.07] hover:border-white/15 text-[#858585]'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-[#F5F5F5]">{acc.name}</div>
                      <div className="text-[10px] text-[#858585] font-mono">{acc.address}</div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-[#A8FF00] font-mono">
                        {acc.balanceSol.toFixed(2)} SOL
                      </div>
                      {isSelected && (
                        <span className="text-[9px] font-bold text-[#A8FF00] flex items-center justify-end space-x-0.5">
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
