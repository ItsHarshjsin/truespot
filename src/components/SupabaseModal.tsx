import React, { useState } from 'react';
import { Database, CheckCircle2, X, AlertCircle, Copy, ExternalLink, RefreshCw } from 'lucide-react';
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
          text: '✓ Successfully connected to live Supabase PostGIS Database!',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn select-none">
      <div className="relative w-full max-w-lg bg-white border border-emerald-950/10 rounded-3xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#0F3822] text-[#99E35E] flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#11291B]">Supabase Cloud Database</h2>
              <p className="text-xs text-[#6B7F72]">PostgreSQL + PostGIS 200m Spatial Engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Connection Status Pill */}
        <div className="mb-4 p-3.5 rounded-2xl bg-[#F4F9F5] border border-emerald-950/10 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                currentConfig.isConnected ? 'bg-[#7CB342] animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="font-semibold text-[#11291B]">
              Status: {currentConfig.isConnected ? 'Live Cloud Connected' : 'Hybrid Local Storage (Active)'}
            </span>
          </div>

          <span className="text-[11px] font-mono font-medium text-[#6B7F72]">
            {currentConfig.isConnected ? 'PostgreSQL PostGIS' : 'LocalStorage Cache'}
          </span>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSaveAndTest} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-[#6B7F72] uppercase tracking-wider mb-1">
              Project URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full bg-[#F4F9F5] border border-gray-200 focus:border-[#0F3822] rounded-2xl px-4 py-2.5 text-xs text-[#11291B] outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#6B7F72] uppercase tracking-wider mb-1">
              Public Anon Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full bg-[#F4F9F5] border border-gray-200 focus:border-[#0F3822] rounded-2xl px-4 py-2.5 text-xs text-[#11291B] outline-none font-mono"
            />
          </div>

          {statusMessage && (
            <div
              className={`p-3 rounded-2xl text-xs font-medium flex items-center space-x-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-[#1E5E38] border border-[#8BC34A]/40'
                  : 'bg-amber-50 text-amber-900 border border-amber-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[#7CB342] shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <div className="pt-2 flex items-center space-x-2">
            <button
              type="submit"
              disabled={testing}
              className="flex-1 py-3 px-5 rounded-full bg-[#0F3822] hover:bg-[#154A2E] text-white text-xs font-semibold flex items-center justify-center space-x-2 transition-all shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#99E35E] ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Testing Connection...' : 'Save & Connect Supabase'}</span>
            </button>
          </div>
        </form>

        {/* Database Migration Instructions Footer */}
        <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-[#6B7F72]">
          <div className="flex items-center space-x-1.5">
            <span>SQL Schema:</span>
            <code className="bg-[#F4F9F5] px-2 py-0.5 rounded-lg border border-gray-200 font-mono text-[11px] text-[#11291B]">
              supabase/schema.sql
            </code>
          </div>

          <button
            onClick={handleCopySchemaPath}
            className="flex items-center space-x-1 text-[#0F3822] font-semibold hover:underline"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? 'Copied!' : 'Copy Path'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
