export type BountyStatus = 'OPEN' | 'ANSWERED' | 'PAID' | 'EXPIRED';

export interface Bounty {
  id: string;
  question: string;
  place_name: string;
  lat: number;
  lng: number;
  amount_sol: number;
  status: BountyStatus;
  asker_wallet: string;
  created_at: string;
  expires_at: string;
  category?: 'queue' | 'stock' | 'open' | 'ev' | 'custom';
  escrow_tx?: string;
  payout_tx?: string;
}

export interface Report {
  id: string;
  bounty_id: string;
  photo_url: string;
  fingerprint: string; // SHA-256
  gps_lat: number;
  gps_lng: number;
  gps_accuracy?: number;
  reporter_wallet: string;
  answer_text: string;
  observed_at: string;
  gyro_variance?: number;
  blockhash_stamp?: string;
  memo_signature?: string;
}

export interface Verification {
  id: string;
  report_id: string;
  verifier_wallet: string;
  agreed: boolean;
  stake_sol: number;
  created_at: string;
}

export interface SensorTelemetry {
  lat: number;
  lng: number;
  accuracy: number;
  altitude?: number | null;
  gyroVariance: number;
  isRealHumanMovement: boolean;
  blockhash: string;
  timestamp: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface JudgeLocationPreset {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
}
