export type UserRole = 'citizen' | 'officer' | 'admin';

export type ComplaintStatus =
  | 'SUBMITTED'
  | 'AI_ANALYZED'
  | 'AI_VERIFIED'
  | 'PRIORITIZED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLUTION_SUBMITTED'
  | 'CITIZEN_VERIFICATION'
  | 'RESOLVED'
  | 'REOPENED'
  | 'ESCALATED';

export type UrgencyLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type HealthRiskLevel = 'Low' | 'Medium' | 'High' | 'Severe';

export interface Profile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  ward?: string;
  created_at: string;
  updated_at: string;
}

export interface ComplaintMedia {
  id: string;
  complaint_id: string;
  file_url: string;
  media_type: 'image' | 'video';
  uploaded_by: string;
  caption?: string;
  created_at: string;
}

export interface AIAnalysis {
  id: string;
  complaint_id: string;
  category: string;
  subcategory: string;
  severity: number; // 0 to 100
  confidence: number; // 0 to 1
  urgency: UrgencyLevel;
  health_risk: HealthRiskLevel;
  population_impact: number; // 0 to 100
  duplicate_probability?: number; // 0 to 1
  recommended_action: string;
  recommended_department: string;
  reasoning_summary: string;
  priority_score: number; // 0 to 100
  priority_breakdown?: {
    severity_factor: number;
    health_factor: number;
    population_factor: number;
    repeat_factor: number;
    time_factor: number;
  };
  detected_objects?: string[];
  created_at: string;
}

export interface Assignment {
  id: string;
  complaint_id: string;
  officer_id: string;
  officer_name?: string;
  assigned_at: string;
  accepted_at?: string | null;
  completed_at?: string | null;
  notes?: string;
}

export interface StatusHistory {
  id: string;
  complaint_id: string;
  status: ComplaintStatus;
  changed_by: string;
  changed_by_name?: string;
  remarks?: string;
  created_at: string;
}

export interface IncidentCluster {
  id: string;
  cluster_number: string;
  cluster_name?: string;
  category: string;
  latitude: number;
  longitude: number;
  center_latitude?: number;
  center_longitude?: number;
  ward: string;
  report_count: number;
  total_complaints?: number;
  severity: number;
  risk_score?: number;
  status: 'ACTIVE' | 'INVESTIGATING' | 'DISPATCHED' | 'RESOLVED';
  summary?: string;
  complaint_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface ClusterComplaint {
  id: string;
  cluster_id: string;
  complaint_id: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  complaint_id?: string;
  complaint_number?: string;
  title: string;
  message: string;
  read: boolean;
  type?: 'info' | 'warning' | 'alert' | 'success';
  created_at: string;
}

export interface Ward {
  id: string;
  name: string;
  city: string;
  state: string;
  officer_in_charge?: string;
  contact_phone?: string;
  boundary_data?: any;
  created_at: string;
}

export interface WardPerformance {
  id: string;
  ward_name: string;
  total_complaints: number;
  resolved_complaints: number;
  active_complaints: number;
  resolution_rate: number;
  avg_resolution_hours: number;
  sla_compliance_rate: number;
  cleanliness_grade: 'A+' | 'A' | 'B+' | 'B' | 'C';
}

export interface AIInsight {
  id: string;
  ward: string;
  insight_type: 'hotspot_risk' | 'trend_increase' | 'preventive_action' | 'sla_risk';
  insight: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence?: number;
  action_item?: string;
  created_at: string;
}

export interface ResolutionVerification {
  id: string;
  complaint_id: string;
  citizen_id: string;
  verified: boolean;
  feedback?: string;
  rating?: number;
  resolution_media_url?: string;
  ai_verification_summary?: string;
  created_at: string;
}

export interface MunicipalCenterDispatch {
  dispatch_id?: string;
  center_name: string;
  center_address: string;
  center_latitude?: number;
  center_longitude?: number;
  distance_km?: number | null;
  authority_type?: string;
  contact_phone?: string | null;
  website?: string | null;
  helpline?: string;
  provider?: string;
  dispatched_at?: string;
  status?: 'DISPATCHED_TO_CENTER' | 'ACKNOWLEDGED' | 'ACTION_IN_PROGRESS';
}

export interface Complaint {
  id: string;
  complaint_number: string;
  citizen_id: string;
  citizen_name?: string;
  citizen_phone?: string;
  description: string;
  category: string;
  subcategory?: string;
  latitude: number;
  longitude: number;
  address: string;
  ward: string;
  status: ComplaintStatus;
  severity_score: number;
  urgency: UrgencyLevel;
  health_risk: HealthRiskLevel;
  population_impact: number;
  ai_summary: string;
  ai_confidence: number;
  recommended_department: string;
  sla_deadline: string; // ISO date string
  cluster_id?: string | null;
  assigned_officer_id?: string | null;
  assigned_officer_name?: string | null;
  resolution_evidence_url?: string | null;
  resolution_notes?: string | null;
  reopen_reason?: string | null;
  nearest_municipal_center?: MunicipalCenterDispatch;
  created_at: string;
  updated_at: string;

  // Joined relations
  media?: ComplaintMedia[];
  ai_analysis?: AIAnalysis;
  status_history?: StatusHistory[];
  assignment?: Assignment;
  verifications?: ResolutionVerification[];
}
