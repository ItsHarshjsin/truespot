import { JudgeLocationPreset } from '../types';

export const JUDGE_PRESETS: JudgeLocationPreset[] = [
  {
    id: 'financial-hub-sf',
    name: 'Financial District Innovation Hub (SF)',
    description: 'Directly inside the hub (5m from main concourse)',
    lat: 37.7879,
    lng: -122.4075
  },
  {
    id: 'blue-bottle-sf',
    name: 'Blue Bottle Coffee — Mint Plaza (SF)',
    description: 'Standing in line (12m from pickup counter)',
    lat: 37.7825,
    lng: -122.4069
  },
  {
    id: 'tesla-supercharger',
    name: 'Tesla Supercharger — Mission St (SF)',
    description: 'In parking bay 4 (18m from stall #2)',
    lat: 37.7712,
    lng: -122.4132
  },
  {
    id: 'whole-foods',
    name: 'Whole Foods Market — SoMa (SF)',
    description: 'At produce section (25m from entrance)',
    lat: 37.7816,
    lng: -122.4011
  },
  {
    id: 'apple-union-square',
    name: 'Apple Union Square (SF)',
    description: 'Front glass facade (15m from doors)',
    lat: 37.7887,
    lng: -122.4072
  }
];

// Helper to calculate exact Haversine distance in meters
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius of Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
