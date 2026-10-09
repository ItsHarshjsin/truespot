import { Query, Observation, PublishedAnswer } from '../types';
import { getQueryPDA } from '../solana/truespotProgram';

export interface OpenAnswerPayload {
  protocol: 'TrueSpot';
  version: '2.0.0';
  query_id: string;
  claim: {
    question: string;
    place_name: string;
    target_location: {
      latitude: number;
      longitude: number;
      radius_meters: number;
    };
    created_at: string;
    freshness_expires_at: string;
  };
  answer: {
    status: 'RESOLVED' | 'CONFLICTING' | 'STALE' | 'INCONCLUSIVE';
    verdict: string;
    confidence_score: number;
    freshness_state: 'ACTIVE' | 'CORROBORATED' | 'CONFLICTING' | 'STALE' | 'UNRESOLVED';
    summary: string;
    evidence_references: Array<{
      contributor_wallet: string;
      sha256_hash: string;
      media_url: string;
      distance_meters: number;
      recorded_at: string;
    }>;
  };
  settlement: {
    network: 'solana-devnet';
    escrow_pda: string;
    settlement_tx: string | null;
    bounty_paid_lamports: number;
    fee_collected_lamports: number;
  };
}

/**
 * Derives machine-readable truth state conforming to the TrueSpot Physical Oracle V2 specification
 */
export function buildOpenAnswerPayload(
  query: Query,
  observations: Observation[] = [],
  publishedAnswer?: PublishedAnswer | null
): OpenAnswerPayload {
  let escrowPda = 'Unknown';
  try {
    const rawId = query.query_id_hex.replace(/-/g, '').slice(0, 32);
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      bytes[i] = parseInt(rawId.substr(i * 2, 2), 16) || 0;
    }
    const [pda] = getQueryPDA(bytes);
    escrowPda = pda.toBase58();
  } catch {
    escrowPda = '11111111111111111111111111111111';
  }

  const feeCollected = Math.round((query.escrow_lamports * 250) / 10000);
  const contributorPayout = query.escrow_lamports - feeCollected;

  const validEvidence = observations.map((obs) => ({
    contributor_wallet: obs.contributor_wallet,
    sha256_hash: obs.sha256_hash,
    media_url: obs.media_url,
    distance_meters: obs.distance_meters,
    recorded_at: obs.client_timestamp,
  }));

  const isResolved = query.status === 'RESOLVED';
  const isExpired = new Date(query.expiry_timestamp).getTime() < Date.now();

  let answerStatus: 'RESOLVED' | 'CONFLICTING' | 'STALE' | 'INCONCLUSIVE' = 'INCONCLUSIVE';
  let freshnessState: 'ACTIVE' | 'CORROBORATED' | 'CONFLICTING' | 'STALE' | 'UNRESOLVED' = 'UNRESOLVED';

  if (publishedAnswer) {
    answerStatus = publishedAnswer.status;
    freshnessState = publishedAnswer.freshness_state;
  } else if (isResolved) {
    answerStatus = 'RESOLVED';
    freshnessState = observations.length > 1 ? 'CORROBORATED' : 'ACTIVE';
  } else if (isExpired) {
    answerStatus = 'STALE';
    freshnessState = 'STALE';
  }

  const verdict = publishedAnswer?.verdict || (isResolved ? 'VERIFIED_PHYSICAL_GROUND_TRUTH' : isExpired ? 'UNANSWERED_EXPIRED' : 'PENDING_CONSENSUS');
  const confidence = publishedAnswer?.confidence_score || (isResolved ? 0.94 : 0.0);
  const summary = publishedAnswer?.summary || (isResolved ? `Ground truth affirmed by validated physical evidence for "${query.question}".` : 'Awaiting physical evidence submission within validity window.');

  return {
    protocol: 'TrueSpot',
    version: '2.0.0',
    query_id: query.query_id_hex,
    claim: {
      question: query.question,
      place_name: query.place_name,
      target_location: {
        latitude: query.lat,
        longitude: query.lng,
        radius_meters: query.radius_meters,
      },
      created_at: query.created_at,
      freshness_expires_at: query.expiry_timestamp,
    },
    answer: {
      status: answerStatus,
      verdict,
      confidence_score: confidence,
      freshness_state: freshnessState,
      summary,
      evidence_references: validEvidence,
    },
    settlement: {
      network: 'solana-devnet',
      escrow_pda: escrowPda,
      settlement_tx: query.settlement_tx || null,
      bounty_paid_lamports: isResolved ? contributorPayout : 0,
      fee_collected_lamports: isResolved ? feeCollected : 0,
    },
  };
}
