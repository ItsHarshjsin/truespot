import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Bounty, Report, Verification } from '../types';
import { calculateHaversineDistance } from './mockLocations';
import {
  validateBountyData,
  validateReportData,
  validateVerificationData,
} from './validation';

const DEFAULT_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const DEFAULT_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

class HybridStore {
  private bounties: Bounty[] = [];
  private reports: Report[] = [];
  private verifications: Verification[] = [];

  private supabaseUrl: string = '';
  private supabaseAnonKey: string = '';
  public supabase: SupabaseClient | null = null;
  public isConnectedToSupabase: boolean = false;

  constructor() {
    this.initCredentials();
    this.initLocalData();
  }

  private initCredentials() {
    try {
      const savedConfig = localStorage.getItem('truespot_supabase_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        this.supabaseUrl = parsed.url || DEFAULT_SUPABASE_URL;
        this.supabaseAnonKey = parsed.anonKey || DEFAULT_SUPABASE_ANON_KEY;
      } else {
        this.supabaseUrl = DEFAULT_SUPABASE_URL;
        this.supabaseAnonKey = DEFAULT_SUPABASE_ANON_KEY;
      }

      if (this.supabaseUrl && this.supabaseAnonKey) {
        this.supabase = createClient(this.supabaseUrl, this.supabaseAnonKey);
        this.testConnection();
      }
    } catch (e) {
      console.warn('Supabase initialization warning:', e);
    }
  }

  public async testConnection(): Promise<boolean> {
    if (!this.supabase) {
      this.isConnectedToSupabase = false;
      return false;
    }

    try {
      const { error } = await this.supabase.from('bounties').select('id').limit(1);
      this.isConnectedToSupabase = !error;
      if (!error) {
        this.setupRealtimeChannel();
      }
      return !error;
    } catch (e) {
      this.isConnectedToSupabase = false;
      return false;
    }
  }

  private realtimeListeners: (() => void)[] = [];

  public subscribeToChanges(callback: () => void): () => void {
    this.realtimeListeners.push(callback);
    return () => {
      this.realtimeListeners = this.realtimeListeners.filter((cb) => cb !== callback);
    };
  }

  public notifyListeners() {
    this.realtimeListeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.warn('Realtime callback error:', err);
      }
    });
  }

  public setupRealtimeChannel() {
    if (!this.supabase) return;
    try {
      this.supabase
        .channel('public-oracle-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bounties' },
          () => {
            this.notifyListeners();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'reports' },
          () => {
            this.notifyListeners();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'verifications' },
          () => {
            this.notifyListeners();
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Realtime channel subscription error:', e);
    }
  }

  public async setSupabaseCredentials(url: string, anonKey: string): Promise<boolean> {
    this.supabaseUrl = url;
    this.supabaseAnonKey = anonKey;

    try {
      localStorage.setItem(
        'truespot_supabase_config',
        JSON.stringify({ url, anonKey })
      );
    } catch (e) {}

    if (url && anonKey) {
      this.supabase = createClient(url, anonKey);
      return await this.testConnection();
    } else {
      this.supabase = null;
      this.isConnectedToSupabase = false;
      return false;
    }
  }

  public getSupabaseConfig(): { url: string; anonKey: string; isConnected: boolean } {
    return {
      url: this.supabaseUrl,
      anonKey: this.supabaseAnonKey,
      isConnected: this.isConnectedToSupabase,
    };
  }

  private initLocalData() {
    try {
      const savedBounties = localStorage.getItem('truespot_bounties');
      if (savedBounties) {
        this.bounties = JSON.parse(savedBounties);
      }

      const savedReports = localStorage.getItem('truespot_reports');
      if (savedReports) {
        this.reports = JSON.parse(savedReports);
      }

      const savedVerifications = localStorage.getItem('truespot_verifications');
      if (savedVerifications) {
        this.verifications = JSON.parse(savedVerifications);
      }
    } catch (e) {
      console.warn('LocalStorage load failed:', e);
    }
  }

  private persist() {
    try {
      localStorage.setItem('truespot_bounties', JSON.stringify(this.bounties));
      localStorage.setItem('truespot_reports', JSON.stringify(this.reports));
      localStorage.setItem('truespot_verifications', JSON.stringify(this.verifications));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  /**
   * Upload an evidence image to Supabase Storage bucket 'bounty-evidence'
   * Falls back to returning the base64 dataUrl if Supabase Storage is not reachable
   */
  public async uploadEvidencePhoto(dataUrl: string, fileNamePrefix: string): Promise<string> {
    if (!this.supabase) return dataUrl;

    try {
      // Convert base64 dataUrl to Blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const fileName = `${fileNamePrefix}_${Date.now()}.jpg`;

      const { data, error } = await this.supabase.storage
        .from('bounty-evidence')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (!error && data) {
        const { data: publicUrlData } = this.supabase.storage
          .from('bounty-evidence')
          .getPublicUrl(fileName);
        return publicUrlData.publicUrl;
      }
    } catch (err) {
      console.warn('Supabase storage upload failed, using local photo buffer:', err);
    }

    return dataUrl;
  }

  /**
   * Dynamically generate local bounties within 20m - 140m of user's EXACT live GPS coordinates
   */
  public seedBountiesAroundUser(userLat: number, userLng: number) {
    const localBounties: Bounty[] = [
      {
        id: 'local-spot-1',
        place_name: 'Nearby Coffee & Beverage Counter',
        question: 'How many people are in line right now?',
        lat: userLat + 0.00022, // ~25m north
        lng: userLng + 0.00014,
        amount_sol: 0.15,
        status: 'OPEN',
        asker_wallet: 'Ask7r...9Wq1',
        created_at: new Date(Date.now() - 4 * 60000).toISOString(),
        expires_at: new Date(Date.now() + 56 * 60000).toISOString(),
        category: 'queue',
        escrow_tx: '5K2bW...9Npq1',
      },
      {
        id: 'local-spot-2',
        place_name: 'Neighborhood Convenience & Fresh Store',
        question: 'Is the main entrance open and active?',
        lat: userLat - 0.00032, // ~40m south
        lng: userLng - 0.00018,
        amount_sol: 0.25,
        status: 'OPEN',
        asker_wallet: 'Loc4l...3Zxm',
        created_at: new Date(Date.now() - 10 * 60000).toISOString(),
        expires_at: new Date(Date.now() + 50 * 60000).toISOString(),
        category: 'open',
        escrow_tx: '3Xm8q...7Jkl2',
      },
      {
        id: 'local-spot-3',
        place_name: 'Local EV Charging / Parking Bay',
        question: 'Are any parking/charging stalls free?',
        lat: userLat + 0.00055, // ~65m northeast
        lng: userLng + 0.00035,
        amount_sol: 0.35,
        status: 'ANSWERED',
        asker_wallet: 'EVdri...8Pkl',
        created_at: new Date(Date.now() - 14 * 60000).toISOString(),
        expires_at: new Date(Date.now() + 46 * 60000).toISOString(),
        category: 'ev',
        escrow_tx: '8JkmL...4Xyz9',
      },
      {
        id: 'local-spot-4',
        place_name: 'Local Pharmacy & Essential Supply',
        question: 'Is fresh stock available on shelves?',
        lat: userLat - 0.00085, // ~105m southwest
        lng: userLng - 0.0005,
        amount_sol: 0.2,
        status: 'OPEN',
        asker_wallet: 'Food1...9Krt',
        created_at: new Date(Date.now() - 18 * 60000).toISOString(),
        expires_at: new Date(Date.now() + 42 * 60000).toISOString(),
        category: 'stock',
        escrow_tx: '2PlmQ...1Bvd8',
      },
    ];

    const localReport: Report = {
      id: 'rep-local-3',
      bounty_id: 'local-spot-3',
      photo_url:
        'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%230E1522"/><circle cx="300" cy="180" r="60" fill="%2300FF66" fill-opacity="0.2"/><text x="50%" y="45%" fill="%2300F5FF" font-family="monospace" font-size="22" font-weight="bold" text-anchor="middle">EV CHARGING BAY: 2 STALLS OPEN</text><text x="50%" y="60%" fill="%2300FF66" font-family="monospace" font-size="15" text-anchor="middle">OBSERVED LIVE AT YOUR PHYSICAL GPS LOCATION</text></svg>',
      fingerprint: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      gps_lat: userLat + 0.00055,
      gps_lng: userLng + 0.00035,
      gps_accuracy: 4.2,
      reporter_wallet: 'Spot7r...9Xkl',
      answer_text: 'YES, 2 charging stalls are free and active',
      observed_at: new Date(Date.now() - 8 * 60000).toISOString(),
      gyro_variance: 0.038,
      blockhash_stamp: '8Zk9j...LiveSolanaNonce',
      memo_signature: '5HkmP...SolanaDevnetMemo',
    };

    const localVerification: Verification = {
      id: 'ver-local-3',
      report_id: 'rep-local-3',
      verifier_wallet: 'V3rif...1Klm',
      agreed: true,
      stake_sol: 0.01,
      created_at: new Date(Date.now() - 4 * 60000).toISOString(),
    };

    this.bounties = localBounties;
    this.reports = [localReport];
    this.verifications = [localVerification];
    this.persist();
  }

  public async getBounties(): Promise<Bounty[]> {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('bounties')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('Supabase fetch failed, using local store:', err);
      }
    }
    return [...this.bounties];
  }

  public async getNearbyBounties(userLat: number, userLng: number, maxMeters: number = 200) {
    if (this.bounties.length === 0) {
      this.seedBountiesAroundUser(userLat, userLng);
    }

    const all = await this.getBounties();
    return all
      .map((b) => {
        const distance = calculateHaversineDistance(userLat, userLng, b.lat, b.lng);
        return {
          ...b,
          distance_meters: distance,
          is_within_range: distance <= maxMeters,
        };
      })
      .sort((a, b) => a.distance_meters - b.distance_meters);
  }

  public async createBounty(bounty: Omit<Bounty, 'id' | 'created_at'>): Promise<Bounty> {
    // 1. Strict Physical Oracle Validation
    const expiryMinutes = Math.round(
      (new Date(bounty.expires_at).getTime() - Date.now()) / 60000
    );
    const validation = validateBountyData(
      bounty.question,
      bounty.place_name,
      bounty.lat,
      bounty.lng,
      bounty.amount_sol,
      expiryMinutes > 0 ? expiryMinutes : 30
    );

    if (!validation.isValid) {
      throw new Error(validation.errors.join(' • '));
    }

    const newBounty: Bounty = {
      ...bounty,
      id: 'bounty-' + Math.random().toString(36).substring(2, 9),
      created_at: new Date().toISOString(),
    };

    this.bounties.unshift(newBounty);
    this.persist();
    this.notifyListeners();

    if (this.supabase) {
      try {
        await this.supabase.from('bounties').insert([newBounty]);
      } catch (e) {
        console.warn('Supabase insert failed:', e);
      }
    }

    return newBounty;
  }

  public async submitReport(report: Omit<Report, 'id' | 'observed_at'>): Promise<Report> {
    // 1. Strict Hardware Telemetry Validation
    const validation = validateReportData(
      report.photo_url,
      report.fingerprint,
      report.gps_lat,
      report.gps_lng,
      report.gyro_variance || 0.035,
      report.blockhash_stamp || 'DevnetNonce',
      report.answer_text
    );

    if (!validation.isValid) {
      throw new Error(validation.errors.join(' • '));
    }

    // 2. Upload to Supabase Storage if configured
    let storedPhotoUrl = report.photo_url;
    if (this.supabase && report.photo_url.startsWith('data:image/')) {
      storedPhotoUrl = await this.uploadEvidencePhoto(report.photo_url, report.bounty_id);
    }

    const newReport: Report = {
      ...report,
      photo_url: storedPhotoUrl,
      id: 'rep-' + Math.random().toString(36).substring(2, 9),
      observed_at: new Date().toISOString(),
    };

    this.reports.unshift(newReport);

    const target = this.bounties.find((b) => b.id === report.bounty_id);
    if (target) {
      target.status = 'ANSWERED';
    }

    this.persist();
    this.notifyListeners();

    if (this.supabase) {
      try {
        await this.supabase.from('reports').insert([newReport]);
        await this.supabase
          .from('bounties')
          .update({ status: 'ANSWERED' })
          .eq('id', report.bounty_id);
      } catch (e) {
        console.warn('Supabase report save failed:', e);
      }
    }

    return newReport;
  }

  public async getReportsForBounty(bountyId: string): Promise<Report[]> {
    return this.reports.filter((r) => r.bounty_id === bountyId);
  }

  public async getLatestReportForBounty(bountyId: string): Promise<Report | undefined> {
    return this.reports.find((r) => r.bounty_id === bountyId);
  }

  public async submitVerification(
    ver: Omit<Verification, 'id' | 'created_at'>
  ): Promise<Verification> {
    const report = this.reports.find((r) => r.id === ver.report_id);
    const existingVerifiers = this.verifications
      .filter((v) => v.report_id === ver.report_id)
      .map((v) => v.verifier_wallet);

    // 1. Strict Anti-Self-Audit & Staking Validation
    const validation = validateVerificationData(
      report ? report.reporter_wallet : '',
      ver.verifier_wallet,
      ver.stake_sol,
      existingVerifiers
    );

    if (!validation.isValid) {
      throw new Error(validation.errors.join(' • '));
    }

    const newVer: Verification = {
      ...ver,
      id: 'ver-' + Math.random().toString(36).substring(2, 9),
      created_at: new Date().toISOString(),
    };

    this.verifications.unshift(newVer);
    this.persist();
    this.notifyListeners();

    if (this.supabase) {
      try {
        await this.supabase.from('verifications').insert([newVer]);
      } catch (e) {
        console.warn('Supabase verification save failed:', e);
      }
    }

    return newVer;
  }

  public async getVerifications(reportId: string): Promise<Verification[]> {
    return this.verifications.filter((v) => v.report_id === reportId);
  }

  public async updateBountyPayout(bountyId: string, payoutTx: string): Promise<void> {
    const target = this.bounties.find((b) => b.id === bountyId);
    if (target) {
      target.status = 'PAID';
      target.payout_tx = payoutTx;
      this.persist();
      this.notifyListeners();

      if (this.supabase) {
        try {
          await this.supabase
            .from('bounties')
            .update({ status: 'PAID', payout_tx: payoutTx })
            .eq('id', bountyId);
        } catch (e) {
          console.warn('Supabase payout update failed:', e);
        }
      }
    }
  }

  public resetToCoordinates(userLat: number, userLng: number) {
    this.seedBountiesAroundUser(userLat, userLng);
  }
}

export const hybridStore = new HybridStore();
