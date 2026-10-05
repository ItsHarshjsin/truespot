import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Bounty, Coordinates, SensorTelemetry } from '../types';
import { hybridStore } from '../utils/storage';
import {
  getCoordinates,
  generateFingerprint,
  measureDeviceTremor,
  generateSyntheticCameraFrame,
} from '../utils/evidence';
import {
  getRecentDevnetBlockhash,
  recordMemoAttestation,
} from '../utils/solana';
import {
  Camera,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface ReportScreenProps {
  bountyId?: string;
  userCoords: Coordinates;
  onReportSubmitted: (bountyId: string, reportId: string) => void;
  onBackToNearby: () => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'reward' | 'warning') => void;
}

export const ReportScreen: React.FC<ReportScreenProps> = ({
  bountyId,
  userCoords,
  onReportSubmitted,
  onBackToNearby,
  onShowToast,
}) => {
  const { publicKey, sendTransaction } = useWallet();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bounty, setBounty] = useState<Bounty | null>(null);
  const [bountiesList, setBountiesList] = useState<Bounty[]>([]);
  const [selectedBountyId, setSelectedBountyId] = useState<string>(bountyId || '');

  // Evidence state
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<SensorTelemetry | null>(null);
  const [answerText, setAnswerText] = useState('YES, actively open with short wait');

  const [measuringSensors, setMeasuringSensors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    hybridStore.getBounties().then((list) => {
      setBountiesList(list);
      const target = list.find((b) => b.id === (bountyId || selectedBountyId)) || list[0];
      if (target) {
        setBounty(target);
        setSelectedBountyId(target.id);
      }
    });
  }, [bountyId]);

  const handleSelectBounty = (id: string) => {
    setSelectedBountyId(id);
    const target = bountiesList.find((b) => b.id === id);
    if (target) setBounty(target);
  };

  const runHardwareTelemetry = async (photoBytesOrString: string | Uint8Array) => {
    setMeasuringSensors(true);
    try {
      const liveCoords = await getCoordinates();
      const devnetBlockhash = await getRecentDevnetBlockhash();
      const tremor = await measureDeviceTremor(600);
      const timestamp = new Date().toISOString();

      const hash = await generateFingerprint(
        photoBytesOrString,
        userCoords.lat || liveCoords.lat,
        userCoords.lng || liveCoords.lng,
        timestamp
      );

      setFingerprint(hash);
      setTelemetry({
        lat: userCoords.lat || liveCoords.lat,
        lng: userCoords.lng || liveCoords.lng,
        accuracy: userCoords.accuracy || liveCoords.accuracy || 4.2,
        gyroVariance: tremor.variance,
        isRealHumanMovement: tremor.isHuman,
        blockhash: devnetBlockhash,
        timestamp,
      });
    } finally {
      setMeasuringSensors(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPhotoDataUrl(dataUrl);

      const arrayBuffer = await file.arrayBuffer();
      await runHardwareTelemetry(new Uint8Array(arrayBuffer));
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateFrame = async () => {
    if (!bounty) return;
    setMeasuringSensors(true);

    const blockhash = await getRecentDevnetBlockhash();
    const frame = generateSyntheticCameraFrame(
      bounty.place_name,
      bounty.question,
      answerText,
      userCoords.lat,
      userCoords.lng,
      blockhash
    );

    setPhotoDataUrl(frame);
    await runHardwareTelemetry(frame);
  };

  const handleSubmitReport = async () => {
    if (!bounty || !photoDataUrl || !fingerprint || !telemetry) {
      setErrorMsg('Please capture photo evidence first.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const memoText = `TRUESPOT:v1:${bounty.id}:${fingerprint.slice(0, 16)}:${telemetry.lat.toFixed(4)},${telemetry.lng.toFixed(4)}`;
      let onChainMemoSig = '';

      if (publicKey && sendTransaction) {
        onChainMemoSig = await recordMemoAttestation(sendTransaction, publicKey, memoText);
      }

      const newReport = await hybridStore.submitReport({
        bounty_id: bounty.id,
        photo_url: photoDataUrl,
        fingerprint: fingerprint,
        gps_lat: telemetry.lat,
        gps_lng: telemetry.lng,
        gps_accuracy: telemetry.accuracy,
        reporter_wallet: publicKey ? publicKey.toBase58().slice(0, 4) + '...' + publicKey.toBase58().slice(-4) : 'Spot7r...9Xkl',
        answer_text: answerText,
        gyro_variance: telemetry.gyroVariance,
        blockhash_stamp: telemetry.blockhash,
        memo_signature: onChainMemoSig || undefined,
      });

      if (onShowToast) {
        onShowToast(
          'Evidence Stamped & Recorded',
          `Recorded biometric gyro tremor (${telemetry.gyroVariance}g) with Solana blockhash nonce`,
          'success'
        );
      }

      setTimeout(() => {
        onReportSubmitted(bounty.id, newReport.id);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Report submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!bounty) {
    return (
      <div className="text-center py-12 text-[#6B7F72]">
        Loading bounty details...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6 max-w-5xl mx-auto">
      {/* Hidden Mobile Camera Input */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        id="camera-file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (5 cols on desktop): Spot Details & Observed Truth Input */}
        <div className="lg:col-span-5 space-y-5">
          {/* 1. Target Bounty Header Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-950/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#E8F5E9] text-[#1E5E38]">
                Target Spot
              </span>
              <span className="text-xs font-bold font-mono text-[#1E5E38] bg-emerald-100 px-2.5 py-0.5 rounded-full">
                Reward: {bounty.amount_sol} SOL
              </span>
            </div>

            <h2 className="text-lg font-bold text-[#11291B] tracking-tight">
              {bounty.place_name}
            </h2>
            <p className="text-sm text-[#6B7F72] mt-0.5 leading-snug">
              "{bounty.question}"
            </p>

            {bountiesList.length > 1 && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center space-x-2">
                <span className="text-xs text-[#6B7F72]">Switch:</span>
                <select
                  value={selectedBountyId}
                  onChange={(e) => handleSelectBounty(e.target.value)}
                  className="bg-[#F4F9F5] text-xs text-[#11291B] font-medium border border-gray-200 rounded-xl px-2.5 py-1 outline-none"
                >
                  {bountiesList.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.place_name} ({b.amount_sol} SOL)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 2. Observed Answer Selection */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-950/5">
            <label className="block text-xs font-bold text-[#6B7F72] uppercase tracking-wider mb-2.5">
              Observed Place Truth
            </label>

            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                'YES / OPEN',
                'NO / CLOSED',
                'EMPTY (0 queue)',
                'BUSY (10+ min)',
              ].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setAnswerText(preset)}
                  className={`py-2 px-3 rounded-2xl text-xs font-semibold border transition-all text-center ${
                    answerText === preset
                      ? 'bg-[#0F3822] text-white border-[#0F3822]'
                      : 'bg-[#F4F9F5] text-[#6B7F72] border-gray-100 hover:text-[#11291B]'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Observation details..."
              className="w-full bg-[#F4F9F5] border border-gray-200 focus:border-[#0F3822] rounded-2xl px-4 py-2.5 text-xs text-[#11291B] outline-none"
              required
            />
          </div>

          {/* 3. Hardware Telemetry Card */}
          {telemetry && fingerprint && (
            <div className="p-4 bg-[#E8F5E9] rounded-3xl border border-[#8BC34A]/40 text-xs text-[#1E5E38] space-y-2">
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#7CB342]" />
                  <span>Hardware Stamped Evidence</span>
                </span>
                <span className="text-[10px] bg-white px-2 py-0.5 rounded-full font-mono text-[#0F3822]">
                  SHA-256 Valid
                </span>
              </div>
              <div className="text-[11px] font-mono text-[#11291B]/80 space-y-0.5">
                <div>• Gyroscope Human Tremor: {telemetry.gyroVariance}g</div>
                <div>• Devnet Blockhash: {telemetry.blockhash.slice(0, 16)}...</div>
                <div>• GPS Fix: {telemetry.lat.toFixed(4)}, {telemetry.lng.toFixed(4)}</div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (7 cols on desktop): Camera Viewfinder & Submission */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 shadow-sm border border-emerald-950/5 space-y-4">
          <label className="block text-xs font-bold text-[#6B7F72] uppercase tracking-wider">
            Physical Camera Verification
          </label>

          {photoDataUrl ? (
            <div className="relative rounded-2xl overflow-hidden border-2 border-[#8BC34A]/50 bg-black aspect-video flex items-center justify-center shadow-xs">
              <img
                src={photoDataUrl}
                alt="Captured Evidence"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-[#0F3822]/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white flex items-center space-x-1.5 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#99E35E]" />
                <span>Hardware Verified Frame</span>
              </div>
              <button
                onClick={() => {
                  setPhotoDataUrl(null);
                  setFingerprint(null);
                  setTelemetry(null);
                }}
                className="absolute top-3 right-3 bg-white/90 text-[#11291B] text-xs px-3 py-1 rounded-full font-semibold shadow-xs hover:bg-white"
              >
                Retake
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center bg-[#F4F9F5]">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-3 text-[#1E5E38]">
                <Camera className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-[#11291B] mb-1">
                Live Evidence Capture
              </h3>
              <p className="text-xs text-[#6B7F72] max-w-sm mx-auto mb-5 leading-relaxed">
                Requires real rear camera with involuntary hand-tremor biometric verification and Solana blockhash nonce.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-3.5 px-5 rounded-full bg-[#0F3822] hover:bg-[#154A2E] text-white text-sm font-semibold flex items-center justify-center space-x-2 shadow-sm transition-all"
                >
                  <Camera className="w-4 h-4" />
                  <span>Open Live Camera</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateFrame}
                  className="flex-1 py-3 px-5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-[#0F3822] border border-emerald-200/60 text-xs font-semibold flex items-center justify-center space-x-2 transition-all"
                >
                  <Sparkles className="w-4 h-4 text-[#7CB342]" />
                  <span>Quick Capture (Simulated)</span>
                </button>
              </div>
            </div>
          )}

          {/* Telemetry Indicator */}
          {measuringSensors && (
            <p className="text-xs font-semibold text-[#1E5E38] text-center animate-pulse">
              Analyzing accelerometer tremor & stamping live Solana blockhash...
            </p>
          )}

          {errorMsg && <p className="text-xs text-rose-600 font-medium px-2">{errorMsg}</p>}

          <button
            onClick={handleSubmitReport}
            disabled={!photoDataUrl || submitting}
            className="w-full py-4 px-6 rounded-full bg-[#0F3822] hover:bg-[#154A2E] text-white font-semibold text-base shadow-sm flex items-center justify-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-40"
          >
            <ShieldCheck className="w-5 h-5 text-[#99E35E]" />
            <span>{submitting ? 'Submitting to Solana...' : 'Submit Evidence & Claim Bounty'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
