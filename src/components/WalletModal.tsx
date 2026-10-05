import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { requestDevnetAirdrop } from '../utils/solana';
import { X, Check, Wallet, Zap, Coins } from 'lucide-react';

export interface DemoAccount {
  id: string;
  name: string;
  role: 'spotter' | 'asker' | 'verifier';
  address: string;
  balanceSol: number;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'spotter',
    name: 'Mobile Spotter (Reporter)',
    role: 'spotter',
    address: 'Spot7r...9Xkl',
    balanceSol: 2.45,
  },
  {
    id: 'asker',
    name: 'Place Inquirer (Asker)',
    role: 'asker',
    address: 'Ask3r...4Wqz',
    balanceSol: 1.80,
  },
  {
    id: 'verifier',
    name: 'Consensus Auditor (Verifier)',
    role: 'verifier',
    address: 'V3rif...1Klm',
    balanceSol: 0.95,
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
  const { connected, publicKey } = useWallet();
  const [airdropping, setAirdropping] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const accountsList = demoAccounts || DEMO_ACCOUNTS;

  const handleAirdrop = async () => {
    setAirdropping(true);
    setMsg('Requesting 1 SOL from Solana Devnet faucet...');
    try {
      if (connected && publicKey) {
        await requestDevnetAirdrop(publicKey);
        setMsg('Airdropped 1 SOL to your connected wallet!');
      } else {
        if (onAirdropDemo) {
          onAirdropDemo();
        } else {
          activeDemoAccount.balanceSol += 1.0;
        }
        setMsg('Added +1.00 Devnet SOL to your Demo Wallet!');
      }
    } catch (e) {
      if (onAirdropDemo) {
        onAirdropDemo();
      } else {
        activeDemoAccount.balanceSol += 1.0;
      }
      setMsg('Devnet faucet busy. Added +1.00 SOL to Demo Wallet!');
    } finally {
      setAirdropping(false);
      setTimeout(() => setMsg(null), 3500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn select-none">
      <div className="relative w-full max-w-sm bg-white border border-emerald-950/10 rounded-3xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-[#E8F5E9] flex items-center justify-center">
              <Wallet className="w-4 h-4 text-[#1E5E38]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#11291B]">Solana Wallet</h2>
              <p className="text-xs text-[#6B7F72]">Instant Demo Persona or Phantom</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Instant Demo Personas */}
        <div className="mb-4">
          <span className="text-xs font-semibold text-[#6B7F72] uppercase tracking-wider block mb-2">
            Demo Personas (No Extension Needed)
          </span>

          <div className="space-y-2">
            {accountsList.map((acc) => {
              const isSelected = isUsingDemo && activeDemoAccount.id === acc.id;

              return (
                <button
                  key={acc.id}
                  onClick={() => {
                    onSelectDemoAccount(acc);
                    onToggleDemoMode(true);
                  }}
                  className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-[#E8F5E9] border-[#8BC34A] shadow-xs'
                      : 'bg-[#F4F9F5] border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-[#11291B]">{acc.name}</div>
                    <div className="text-[10px] text-[#6B7F72] font-mono">{acc.address}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-bold text-[#1E5E38] font-mono">{acc.balanceSol.toFixed(2)} SOL</div>
                    {isSelected && (
                      <span className="text-[9px] font-bold text-[#1E5E38] flex items-center justify-end space-x-0.5">
                        <Check className="w-2.5 h-2.5" />
                        <span>ACTIVE</span>
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Browser Extension */}
        <div className="mb-4 pt-3 border-t border-gray-100">
          <span className="text-xs font-semibold text-[#6B7F72] uppercase tracking-wider block mb-2">
            Or Connect Browser Wallet
          </span>
          <div className="flex items-center justify-between bg-[#F4F9F5] p-2.5 rounded-2xl border border-gray-100">
            <span className="text-xs text-[#6B7F72]">Phantom / Solflare</span>
            <div onClick={() => onToggleDemoMode(false)}>
              <WalletMultiButton className="!h-8 !py-0 !px-3 !text-xs !font-semibold !rounded-full" />
            </div>
          </div>
        </div>

        {/* Section 3: Airdrop Button */}
        <div>
          <button
            onClick={handleAirdrop}
            disabled={airdropping}
            className="w-full py-3 px-4 rounded-full bg-[#0F3822] hover:bg-[#154A2E] text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-xs"
          >
            <Coins className="w-3.5 h-3.5 text-[#99E35E]" />
            <span>{airdropping ? 'Requesting...' : 'Request +1.00 Devnet SOL'}</span>
          </button>

          {msg && (
            <p className="mt-2 text-[11px] text-[#1E5E38] font-medium text-center">
              {msg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
