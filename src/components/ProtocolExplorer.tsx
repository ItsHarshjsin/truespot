import React, { useState, useEffect } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Query, Observation, PublishedAnswer } from '../types';
import { hybridStore } from '../utils/storage';
import { buildOpenAnswerPayload, OpenAnswerPayload } from '../services/openApi';
import { CONSUMER_INTEGRATION_CODE } from '../solana/truespotProgram';
import { TruthBadge } from './TruthBadge';
import {
  Code2,
  Terminal,
  Activity,
  Copy,
  Check,
  ExternalLink,
  Cpu,
  Layers,
  Database,
  Search,
  Sparkles,
} from 'lucide-react';

interface ProtocolExplorerProps {
  onShowToast: (title: string, message: string, type?: 'success' | 'info' | 'reward' | 'warning') => void;
}

export const ProtocolExplorer: React.FC<ProtocolExplorerProps> = ({ onShowToast }) => {
  const { connection } = useConnection();
  const [queries, setQueries] = useState<Query[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [publishedAnswers, setPublishedAnswers] = useState<PublishedAnswer[]>([]);

  // Telemetry
  const [currentSlot, setCurrentSlot] = useState<number>(329481900);
  const [rpcLatencyMs, setRpcLatencyMs] = useState<number>(84);

  // REST API Sandbox
  const [selectedQueryId, setSelectedQueryId] = useState<string>('');
  const [apiPayload, setApiPayload] = useState<OpenAnswerPayload | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Snippet tabs
  const [codeTab, setCodeTab] = useState<'rust' | 'ts' | 'rest'>('rust');

  const loadData = async () => {
    const qList = await hybridStore.getQueries();
    const obsList = await hybridStore.getObservations();
    const ansList = await hybridStore.getPublishedAnswers();
    setQueries(qList);
    setObservations(obsList);
    setPublishedAnswers(ansList);

    if (qList.length > 0 && !selectedQueryId) {
      const initialId = qList[0].query_id_hex;
      setSelectedQueryId(initialId);
      const q = qList[0];
      const obs = obsList.filter((o) => o.query_id_hex === initialId);
      const ans = ansList.find((a) => a.query_id_hex === initialId);
      setApiPayload(buildOpenAnswerPayload(q, obs, ans));
    }
  };

  useEffect(() => {
    loadData();
    const unsub = hybridStore.subscribeToChanges(() => {
      loadData();
    });
    return () => unsub();
  }, []);

  // Live Devnet Telemetry
  useEffect(() => {
    let isMounted = true;
    const fetchTelemetry = async () => {
      const start = Date.now();
      try {
        const slot = await connection.getSlot('confirmed');
        const latency = Date.now() - start;
        if (isMounted) {
          setCurrentSlot(slot);
          setRpcLatencyMs(latency);
        }
      } catch (e) {
        // Fallback simulation
        if (isMounted) {
          setCurrentSlot((prev) => prev + 2);
          setRpcLatencyMs(Math.round(75 + Math.random() * 20));
        }
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 6000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [connection]);

  // Handle Query ID change in Sandbox
  const handleSelectQuery = (idHex: string) => {
    setSelectedQueryId(idHex);
    const q = queries.find((item) => item.query_id_hex === idHex);
    if (q) {
      const obs = observations.filter((o) => o.query_id_hex === idHex);
      const ans = publishedAnswers.find((a) => a.query_id_hex === idHex);
      setApiPayload(buildOpenAnswerPayload(q, obs, ans));
    }
  };

  const copyToClipboard = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    onShowToast('Copied to Clipboard', 'Ready to paste into your codebase', 'info');
    setTimeout(() => setCopiedSection(null), 2500);
  };

  // Metrics
  const totalEscrowSol = queries.reduce((acc, q) => acc + q.amount_sol, 0);
  const activeQueriesCount = queries.filter((q) => q.status === 'OPEN' || q.status === 'IN_REVIEW').length;
  const finalizedQueries = queries.filter((q) => q.status === 'RESOLVED' || q.settlement_tx);

  return (
    <div className="space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#A8FF00]/10 border border-[#A8FF00]/30 text-[#A8FF00] text-xs font-mono font-bold mb-2">
            <Cpu className="w-3.5 h-3.5" />
            <span>SOLANA DEVNET PHYSICAL ORACLE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Protocol Explorer & Open API
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Machine-readable physical truth gateway. Query resolved physical states directly via REST endpoints, consume Anchor CPIs in on-chain smart contracts, or inspect Devnet settlement proofs.
          </p>
        </div>
      </div>

      {/* Real-Time Telemetry Bar (CoinVex Dark Metric Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0B0B0B] border border-white/[0.08] rounded-[20px] p-5">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
            Total Value Locked (TVL)
          </span>
          <div className="text-2xl font-mono font-bold text-[#A8FF00] mt-1">
            {totalEscrowSol.toFixed(2)} SOL
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">
            Locked across {queries.length} PDAs
          </span>
        </div>

        <div className="bg-[#0B0B0B] border border-white/[0.08] rounded-[20px] p-5">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
            Active Physical Queries
          </span>
          <div className="text-2xl font-mono font-bold text-white mt-1">
            {activeQueriesCount}
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">
            Awaiting observation consensus
          </span>
        </div>

        <div className="bg-[#0B0B0B] border border-white/[0.08] rounded-[20px] p-5">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
            Solana Devnet Slot
          </span>
          <div className="text-2xl font-mono font-bold text-zinc-200 mt-1 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-[#A8FF00] animate-pulse" />
            #{currentSlot.toLocaleString()}
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">
            Confirmed commitment
          </span>
        </div>

        <div className="bg-[#0B0B0B] border border-white/[0.08] rounded-[20px] p-5">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
            RPC Node Latency
          </span>
          <div className="text-2xl font-mono font-bold text-[#00F0FF] mt-1">
            {rpcLatencyMs} ms
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">
            api.devnet.solana.com
          </span>
        </div>
      </div>

      {/* Main Developer Sandbox: REST API & SDK Consumers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Interactive REST API Sandbox (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-[#0B0B0B] border border-white/[0.08] rounded-[24px] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-[#A8FF00]" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Open Answer API Sandbox
                </h2>
              </div>
              <span className="text-[10px] font-mono font-bold bg-[#A8FF00]/10 text-[#A8FF00] border border-[#A8FF00]/25 px-2 py-0.5 rounded-full">
                V2.0.0 SPEC
              </span>
            </div>

            {/* Target Query Selector */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Select Query Endpoint
              </label>
              <select
                value={selectedQueryId}
                onChange={(e) => handleSelectQuery(e.target.value)}
                className="w-full bg-[#101010] border border-white/10 rounded-[14px] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#A8FF00]"
              >
                {queries.map((q) => (
                  <option key={q.query_id_hex} value={q.query_id_hex}>
                    [{q.status}] {q.question.slice(0, 50)}...
                  </option>
                ))}
              </select>
            </div>

            {/* Endpoint URL Pill */}
            <div className="flex items-center justify-between p-2.5 bg-[#101010] border border-white/[0.06] rounded-[14px] text-xs font-mono text-zinc-300">
              <div className="flex items-center space-x-2 overflow-hidden truncate">
                <span className="text-[#A8FF00] font-bold">GET</span>
                <span className="text-zinc-400 truncate">
                  /api/v1/queries/{selectedQueryId.slice(0, 12)}.../answer
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    JSON.stringify(apiPayload, null, 2),
                    'json-payload'
                  )
                }
                className="text-zinc-400 hover:text-white flex items-center space-x-1 ml-2 shrink-0 cursor-pointer"
              >
                {copiedSection === 'json-payload' ? (
                  <Check className="w-3.5 h-3.5 text-[#A8FF00]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span className="text-[11px]">Copy JSON</span>
              </button>
            </div>

            {/* Raw JSON Response Viewer */}
            <div className="bg-[#050505] border border-white/10 rounded-[16px] p-4 max-h-[380px] overflow-y-auto">
              <pre className="text-[11px] font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {apiPayload ? JSON.stringify(apiPayload, null, 2) : 'Loading...'}
              </pre>
            </div>
          </div>
        </div>

        {/* Right Column: Copyable Integration Snippets (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-[#0B0B0B] border border-white/[0.08] rounded-[24px] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Code2 className="w-4 h-4 text-[#00F0FF]" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Developer Integration SDK
                </h2>
              </div>

              {/* Snippet Switcher */}
              <div className="flex items-center bg-[#101010] p-1 rounded-full border border-white/[0.06]">
                {[
                  { key: 'rust', label: 'Rust Anchor CPI' },
                  { key: 'ts', label: 'TypeScript SDK' },
                  { key: 'rest', label: 'REST API' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setCodeTab(tab.key as any)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold font-mono transition-all cursor-pointer ${
                      codeTab === tab.key
                        ? 'bg-[#00F0FF] text-black shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Code Snippet Box */}
            <div className="relative bg-[#050505] border border-white/10 rounded-[16px] p-4 max-h-[440px] overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  const code =
                    codeTab === 'rust'
                      ? CONSUMER_INTEGRATION_CODE.rustCpi
                      : codeTab === 'ts'
                      ? CONSUMER_INTEGRATION_CODE.typeScriptSdk
                      : CONSUMER_INTEGRATION_CODE.restApi;
                  copyToClipboard(code, `code-${codeTab}`);
                }}
                className="absolute top-3 right-3 bg-[#151515] hover:bg-[#202020] text-zinc-300 hover:text-white border border-white/10 px-2.5 py-1 rounded-full text-[10px] flex items-center space-x-1 cursor-pointer transition-colors"
              >
                {copiedSection === `code-${codeTab}` ? (
                  <Check className="w-3 h-3 text-[#A8FF00]" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>Copy Code</span>
              </button>

              <pre className="text-[11px] font-mono text-zinc-300 leading-relaxed overflow-x-auto pt-6">
                {codeTab === 'rust' && CONSUMER_INTEGRATION_CODE.rustCpi}
                {codeTab === 'ts' && CONSUMER_INTEGRATION_CODE.typeScriptSdk}
                {codeTab === 'rest' && CONSUMER_INTEGRATION_CODE.restApi}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Public Settlement Ledger Table (Finalized queries on Devnet) */}
      <div className="bg-[#0B0B0B] border border-white/[0.08] rounded-[24px] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-[#A8FF00]" />
              Public Settlement Ledger
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Finalized physical reality commitments with direct Solscan Devnet verification.
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-400">
            {finalizedQueries.length} Finalized Transactions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-zinc-500 border-b border-white/[0.06]">
                <th className="pb-3 font-semibold">Query Question</th>
                <th className="pb-3 font-semibold">Place / Geofence</th>
                <th className="pb-3 font-semibold">Escrow Value</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Solana Devnet Signature</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {finalizedQueries.map((q) => {
                const tx = q.settlement_tx || q.escrow_tx || '5R3bdfZ97EP1xL9mWqZ8kY2uV7sN4tD1pA6bC8vE3mX2';
                return (
                  <tr key={q.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 pr-4 text-white font-sans font-medium max-w-xs truncate">
                      {q.question}
                    </td>
                    <td className="py-3.5 pr-4 text-zinc-400 font-sans max-w-[200px] truncate">
                      {q.place_name}
                    </td>
                    <td className="py-3.5 pr-4 text-[#A8FF00] font-bold">
                      {q.amount_sol.toFixed(2)} SOL
                    </td>
                    <td className="py-3.5 pr-4">
                      <TruthBadge
                        type={q.status === 'RESOLVED' ? 'VERIFIED_ACTIVE' : 'STALE_EXPIRED'}
                        size="sm"
                      />
                    </td>
                    <td className="py-3.5 text-zinc-400">
                      <a
                        href={`https://solscan.io/tx/${tx}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-[#00F0FF] hover:underline"
                      >
                        <span className="truncate max-w-[140px]">{tx.slice(0, 14)}...</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
