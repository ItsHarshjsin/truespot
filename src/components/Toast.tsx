import React from 'react';
import { CheckCircle2, Coins, Info, AlertTriangle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type?: 'success' | 'info' | 'reward' | 'warning';
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none select-none">
      {toasts.map((toast) => {
        const isReward = toast.type === 'reward';
        const isWarning = toast.type === 'warning';
        const isInfo = toast.type === 'info';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto transform transition-all duration-300 ease-out translate-y-0 opacity-100 p-4 rounded-2xl shadow-xl border flex items-start space-x-3 ${
              isReward
                ? 'bg-[#0F3822] text-white border-[#8BC34A]/40 ring-2 ring-[#99E35E]/30'
                : isWarning
                ? 'bg-amber-50 text-amber-900 border-amber-200'
                : isInfo
                ? 'bg-white text-[#11291B] border-emerald-950/10'
                : 'bg-[#0F3822] text-white border-emerald-800'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isReward && <Coins className="w-5 h-5 text-[#99E35E] animate-bounce" />}
              {isWarning && <AlertTriangle className="w-5 h-5 text-amber-500" />}
              {isInfo && <Info className="w-5 h-5 text-[#1E5E38]" />}
              {!isReward && !isWarning && !isInfo && (
                <CheckCircle2 className="w-5 h-5 text-[#99E35E]" />
              )}
            </div>

            <div className="flex-1 pr-2">
              <h4 className="text-xs font-bold leading-tight tracking-tight">
                {toast.title}
              </h4>
              <p
                className={`text-[11px] mt-0.5 leading-snug ${
                  isReward || !isWarning && !isInfo ? 'text-emerald-100/90' : 'text-[#6B7F72]'
                }`}
              >
                {toast.message}
              </p>
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
