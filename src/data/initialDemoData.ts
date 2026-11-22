import { Complaint, IncidentCluster, Ward, AIInsight, AppNotification, Profile } from '../types/database';

// Municipal Ward Reference Directory (for dropdown selection; dynamic GPS areas are added automatically)
export const INITIAL_WARDS: Ward[] = [
  { id: 'w-1', name: 'Ward 1 - Connaught Place & Central', city: 'New Delhi', state: 'Delhi', created_at: '2026-01-01T00:00:00Z' },
  { id: 'w-2', name: 'Ward 2 - Chandni Chowk & Old Delhi', city: 'New Delhi', state: 'Delhi', created_at: '2026-01-01T00:00:00Z' },
  { id: 'w-3', name: 'Ward 3 - Karol Bagh Market Area', city: 'New Delhi', state: 'Delhi', created_at: '2026-01-01T00:00:00Z' },
  { id: 'w-4', name: 'Ward 4 - Lajpat Nagar & South Ex', city: 'New Delhi', state: 'Delhi', created_at: '2026-01-01T00:00:00Z' },
  { id: 'w-5', name: 'Ward 5 - Rohini Sector 7 & 8', city: 'New Delhi', state: 'Delhi', created_at: '2026-01-01T00:00:00Z' },
  { id: 'w-6', name: 'Ward 6 - Dwarka Sector 10 & 14', city: 'New Delhi', state: 'Delhi', created_at: '2026-01-01T00:00:00Z' },
  { id: 'w-7', name: 'Ward 7 - Shahdara & East Delhi', city: 'New Delhi', state: 'Delhi', created_at: '2026-01-01T00:00:00Z' },
  { id: 'w-8', name: 'Ward 8 - Saket & Mehrauli Heritage', city: 'New Delhi', state: 'Delhi', created_at: '2026-01-01T00:00:00Z' },
  { id: 'w-9', name: 'Ward 9 - Okhla Industrial Area Phase II', city: 'New Delhi', state: 'Delhi', created_at: '2026-01-01T00:00:00Z' },
  { id: 'w-10', name: 'Ward 10 - Janakpuri & Uttam Nagar', city: 'New Delhi', state: 'Delhi', created_at: '2026-01-01T00:00:00Z' },
  { id: 'w-11', name: 'Ward 11 - Mayur Vihar Phase 1 & 2', city: 'New Delhi', state: 'Delhi', created_at: '2026-01-01T00:00:00Z' },
  { id: 'w-12', name: 'Ward 12 - Vasant Kunj & Green Park', city: 'New Delhi', state: 'Delhi', created_at: '2026-01-01T00:00:00Z' },
];

export const INITIAL_OFFICERS: Profile[] = [];
export const INITIAL_CLUSTERS: IncidentCluster[] = [];
export const INITIAL_INSIGHTS: AIInsight[] = [];
export const INITIAL_COMPLAINTS: Complaint[] = [];
export const ALL_INITIAL_COMPLAINTS: Complaint[] = [];
export const INITIAL_NOTIFICATIONS: AppNotification[] = [];
