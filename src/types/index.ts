// ==============================================================================
// TRUESPOT: CORE DOMAIN TYPES & ARCHITECTURAL SPECIFICATION
// Decentralized Physical Verification Protocol on Solana
// ==============================================================================

export type TruthBadgeType =
  | 'VERIFIED_ACTIVE'
  | 'EVIDENCE_CORROBORATED'
  | 'CONFLICTING_EVIDENCE'
  | 'STALE_EXPIRED'
  | 'UNRESOLVED';

export interface TruthBadgeConfig {
  type: TruthBadgeType;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

export const TRUTH_BADGES: Record<TruthBadgeType, TruthBadgeConfig> = {
  VERIFIED_ACTIVE: {
    type: 'VERIFIED_ACTIVE',
    label: 'VERIFIED ACTIVE',
    color: '#A8FF00',
    bgColor: 'rgba(168, 255, 0, 0.12)',
    borderColor: 'rgba(168, 255, 0, 0.35)',
    description: 'Fresh observation verified within geofence and validated by quality engine.',
  },
  EVIDENCE_CORROBORATED: {
    type: 'EVIDENCE_CORROBORATED',
    label: 'EVIDENCE CORROBORATED',
    color: '#00F0FF',
    bgColor: 'rgba(0, 240, 255, 0.12)',
    borderColor: 'rgba(0, 240, 255, 0.35)',
    description: 'Multiple independent observations confirm consensus ground truth.',
  },
  CONFLICTING_EVIDENCE: {
    type: 'CONFLICTING_EVIDENCE',
    label: 'CONFLICTING EVIDENCE',
    color: '#FFB800',
    bgColor: 'rgba(255, 184, 0, 0.12)',
    borderColor: 'rgba(255, 184, 0, 0.35)',
    description: 'Submissions contradict each other or quality engine flagged variance.',
  },
  STALE_EXPIRED: {
    type: 'STALE_EXPIRED',
    label: 'STALE / EXPIRED',
    color: '#64748B',
    bgColor: 'rgba(100, 116, 139, 0.12)',
    borderColor: 'rgba(100, 116, 139, 0.35)',
    description: 'Validity window has elapsed without verified resolution.',
  },
  UNRESOLVED: {
    type: 'UNRESOLVED',
    label: 'UNRESOLVED',
    color: '#FF0055',
    bgColor: 'rgba(255, 0, 85, 0.12)',
    borderColor: 'rgba(255, 0, 85, 0.35)',
    description: 'Awaiting sufficient evidence or initial observation submission.',
  },
};

export type QueryStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'EXPIRED' | 'CANCELLED' | 'ANSWERED' | 'PAID';
export type ObservationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
export type AnswerStatus = 'RESOLVED' | 'CONFLICTING' | 'STALE' | 'INCONCLUSIVE';
export type FreshnessState = 'ACTIVE' | 'CORROBORATED' | 'CONFLICTING' | 'STALE' | 'UNRESOLVED';

export interface QualityReport {
  spatial_consistency: {
    passed: boolean;
    distance_meters: number;
    details: string;
  };
  temporal_integrity: {
    passed: boolean;
    age_seconds: number;
    details: string;
  };
  duplicate_check: {
    passed: boolean;
    hash: string;
    is_unique: boolean;
  };
  relevance_assessment: {
    passed: boolean;
    confidence_score: number;
    summary: string;
  };
  overall_verdict: 'QUALIFIED' | 'FLAGGED';
}

export interface AiEvaluation {
  verified: boolean;
  confidence: number;
  summary: string;
}

export interface AiConfidenceResult {
  verified: boolean;
  score: number;
  detected_objects: string[];
  reasoning: string;
}

export type BountyType = 'BOOLEAN' | 'DATA_COLLECTION' | 'AI_VISION';

export interface SensorTelemetry {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number | string;
  gyroVariance?: number;
  isRealHumanMovement?: boolean;
  blockhash?: string;
}

// 1. QUERY: Time-bounded, economically funded request for physical ground truth
export interface Query {
  id: string;
  query_id_hex: string;
  creator_wallet: string;
  question: string;
  place_name: string;
  lat: number;
  lng: number;
  radius_meters: number;
  escrow_lamports: number;
  amount_sol: number; // convenience getter
  validity_seconds: number;
  expiry_timestamp: string;
  reference_media_url?: string;
  status: QueryStatus;
  created_at: string;
  escrow_tx?: string;
  settlement_tx?: string;

  // Backward compatibility fields
  asker_wallet?: string;
  payout_tx?: string;
  expires_at?: string;
  category?: string;
  bounty_type?: string;
  max_spotters?: number;
  rich_instructions?: string;
}

// 2. OBSERVATION: Physical evidence submitted by a field contributor
export interface Observation {
  id: string;
  query_id_hex: string;
  contributor_wallet: string;
  media_url: string;
  sha256_hash: string;
  observed_lat: number;
  observed_lng: number;
  distance_meters: number;
  client_timestamp: string;
  quality_report: QualityReport;
  ai_evaluation?: AiEvaluation | null;
  status: ObservationStatus;
  rejection_reason?: string;
  created_at: string;

  // Backward compatibility fields
  bounty_id?: string;
  reporter_wallet?: string;
  photo_url?: string;
  fingerprint?: string;
  answer_text?: string;
  observed_at?: string;
  memo_signature?: string;
  gyro_variance?: number;
  blockhash_stamp?: string;
  media_type?: 'image' | 'video' | 'audio';
  ai_confidence_score?: AiConfidenceResult | null;
  gps_lat?: number;
  gps_lng?: number;
  gps_accuracy?: number;
}

// 3. PUBLISHED ANSWER: Machine-readable truth state queried by external AI agents & protocols
export interface PublishedAnswer {
  id: string;
  query_id_hex: string;
  status: AnswerStatus;
  verdict: string;
  confidence_score: number;
  freshness_state: FreshnessState;
  summary: string;
  evidence_hashes: string[];
  settlement_signature?: string;
  freshness_expires_at: string;
  published_at: string;
}

export interface Verification {
  id: string;
  report_id: string;
  verifier_wallet: string;
  agreed: boolean;
  stake_sol: number;
  created_at: string;
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

// Backward compatibility aliases with non-undefined fields for legacy UI components
export type Bounty = Query & {
  asker_wallet: string;
  payout_tx: string;
};

export type Report = Observation & {
  bounty_id: string;
  reporter_wallet: string;
  photo_url: string;
  fingerprint: string;
  answer_text: string;
  observed_at: string;
  gps_lat: number;
  gps_lng: number;
  gps_accuracy: number;
};

export type BountyStatus = QueryStatus;

