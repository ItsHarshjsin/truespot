import React, { useState } from 'react';
import { Database, CheckCircle2, X, Copy, RefreshCw } from 'lucide-react';
import { hybridStore } from '../utils/storage';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const currentConfig = hybridStore.getSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [key, setKey] = useState(currentConfig.anonKey);
  const [testing, setTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setStatusMessage(null);

    try {
      const isOnline = await hybridStore.setSupabaseCredentials(url.trim(), key.trim());
      if (isOnline) {
        setStatusMessage({
          text: 'Successfully connected to live Supabase PostGIS Database',
          type: 'success',
        });
        if (onConfigSaved) onConfigSaved();
      } else {
        setStatusMessage({
          text: 'Credentials saved, but connection could not reach tables. Run schema.sql in Supabase SQL editor.',
          type: 'error',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        text: err.message || 'Connection error. Check URL and Anon Key.',
        type: 'error',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleCopySchemaPath = () => {
    navigator.clipboard.writeText('supabase/schema.sql');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <div className="relative w-full max-w-lg bg-[#0B0B0B] border border-white/[0.08] rounded-[24px] p-6 shadow-2xl text-[#F5F5F5]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.07] mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-full bg-[#101010] text-[#A8FF00] border border-white/[0.08] flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F5F5F5]">Supabase Cloud Database</h2>
              <p className="text-xs text-[#858585]">PostgreSQL + PostGIS 200m Spatial Engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#101010] border border-white/10 flex items-center justify-center text-[#858585] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Connection Status Pill */}
        <div className="mb-4 p-3 rounded-xl bg-[#101010] border border-white/[0.07] flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2 h-2 rounded-full ${
                currentConfig.isConnected ? 'bg-[#A8FF00] animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="font-semibold text-[#F5F5F5]">
              Status: {currentConfig.isConnected ? 'Live Cloud Connected' : 'Hybrid Local Storage (Active)'}
            </span>
          </div>

          <span className="text-[10px] font-mono font-bold text-[#A8FF00]">
            {currentConfig.isConnected ? 'PostgreSQL PostGIS' : 'LocalStorage Cache'}
          </span>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSaveAndTest} className="space-y-3.5">
          <div>
            <label className="block text-[10px] font-bold text-[#858585] uppercase tracking-wider mb-1">
              Project URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full bg-[#101010] border border-white/[0.08] focus:border-[#A8FF00] rounded-xl px-4 py-2.5 text-xs text-[#F5F5F5] placeholder-[#555555] outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#858585] uppercase tracking-wider mb-1">
              Public Anon Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full bg-[#101010] border border-white/[0.08] focus:border-[#A8FF00] rounded-xl px-4 py-2.5 text-xs text-[#F5F5F5] placeholder-[#555555] outline-none font-mono"
            />
          </div>

          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center space-x-2 ${
                statusMessage.type === 'success'
                  ? 'bg-[#A8FF00]/10 text-[#A8FF00] border border-[#A8FF00]/30'
                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[#A8FF00] shrink-0" />
              ) : null}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={testing}
              className="w-full py-3.5 px-6 rounded-full bg-[#A8FF00] hover:bg-[#b8ff24] text-black font-black text-xs shadow-xl shadow-[#A8FF00]/30 flex items-center justify-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-black ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Testing PostGIS Connection...' : 'Save & Connect Supabase'}</span>
            </button>
          </div>
        </form>

        {/* Footer Helper */}
        <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#858585]">
          <div className="flex items-center space-x-1.5">
            <span>SQL Schema:</span>
            <span className="font-mono bg-[#101010] px-2 py-0.5 rounded-md border border-white/[0.07] text-[#F5F5F5]">
              supabase/schema.sql
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopySchemaPath}
            className="flex items-center space-x-1 text-[#A8FF00] hover:text-[#bef264] font-semibold cursor-pointer"
          >
            <Copy className="w-3 h-3" />
            <span>{copied ? 'Copied!' : 'Copy Path'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
