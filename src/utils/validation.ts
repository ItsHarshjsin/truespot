/**
 * TrueSpot Validation Module
 * Implements strict decentralized physical oracle constraints, hardware telemetry integrity,
 * and Sybil/fraud resistance rules.
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates a new Bounty request before locking escrow on Solana Devnet
 */
export function validateBountyData(
  question: string,
  placeName: string,
  lat: number,
  lng: number,
  amountSol: number,
  expiryMinutes: number
): ValidationResult {
  const errors: string[] = [];

  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) {
    errors.push('Question is required for physical oracle verification.');
  } else if (trimmedQuestion.length < 5) {
    errors.push('Question must be at least 5 characters long.');
  } else if (trimmedQuestion.length > 280) {
    errors.push('Question cannot exceed 280 characters.');
  }

  const trimmedPlace = placeName.trim();
  if (!trimmedPlace) {
    errors.push('Place name or landmark is required.');
  }

  if (isNaN(lat) || lat < -90 || lat > 90) {
    errors.push('Invalid GPS latitude. Must be between -90.0 and +90.0 degrees.');
  }

  if (isNaN(lng) || lng < -180 || lng > 180) {
    errors.push('Invalid GPS longitude. Must be between -180.0 and +180.0 degrees.');
  }

  if (isNaN(amountSol) || amountSol < 0.01) {
    errors.push('Minimum bounty is 0.01 SOL to prevent spam.');
  } else if (amountSol > 10.0) {
    errors.push('Bounty exceeds max single-query test limit of 10 SOL.');
  }

  if (isNaN(expiryMinutes) || expiryMinutes < 5) {
    errors.push('Expiry window must be at least 5 minutes.');
  } else if (expiryMinutes > 1440) {
    errors.push('Expiry window cannot exceed 24 hours (1440 minutes).');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates hardware-attested report submission
 */
export function validateReportData(
  photoDataUrl: string | null,
  fingerprint: string | null,
  lat: number,
  lng: number,
  gyroVariance: number,
  blockhash: string,
  answerText: string
): ValidationResult {
  const errors: string[] = [];

  if (!photoDataUrl || !photoDataUrl.startsWith('data:image/')) {
    errors.push('Physical camera photo evidence is required.');
  }

  if (!fingerprint || fingerprint.length !== 64) {
    errors.push('Invalid SHA-256 biometric fingerprint hash.');
  }

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    errors.push('Hardware GPS coordinates are invalid or missing.');
  }

  // Biometric involuntary human hand tremor test:
  // Still images / static emulators report exactly 0.0 or <0.005g
  if (gyroVariance < 0.005) {
    errors.push('Biometric Tremor Warning: Device too static. Real handheld movement required.');
  }

  if (!blockhash || blockhash.length < 20) {
    errors.push('Valid Solana Devnet blockhash freshness stamp required.');
  }

  if (!answerText.trim()) {
    errors.push('Observed truth answer text is required.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates Schelling-Point verification stake & self-auditing prevention
 */
export function validateVerificationData(
  reporterWallet: string,
  verifierWallet: string,
  stakeSol: number,
  existingVerifiers: string[]
): ValidationResult {
  const errors: string[] = [];

  // 1. Anti-Self-Audit: Reporter cannot audit their own observation!
  if (
    reporterWallet &&
    verifierWallet &&
    reporterWallet.toLowerCase() === verifierWallet.toLowerCase()
  ) {
    errors.push('Security Violation: Reporter cannot audit their own submission.');
  }

  // 2. Minimum stake requirement
  if (isNaN(stakeSol) || stakeSol < 0.01) {
    errors.push('Consensus verification requires a minimum stake of 0.01 SOL.');
  }

  // 3. Double-voting prevention
  if (
    verifierWallet &&
    existingVerifiers.map((v) => v.toLowerCase()).includes(verifierWallet.toLowerCase())
  ) {
    errors.push('You have already cast a staked verification vote on this report.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
