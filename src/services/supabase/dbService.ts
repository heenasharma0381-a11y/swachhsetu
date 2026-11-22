import { supabase } from './client';
import {
  Complaint,
  ComplaintStatus,
  AIAnalysis,
  IncidentCluster,
  Ward,
  WardPerformance,
  AIInsight,
  AppNotification,
  Profile,
  ResolutionVerification,
  MunicipalCenterDispatch,
} from '../../types/database';
import {
  ALL_INITIAL_COMPLAINTS,
  INITIAL_WARDS,
  INITIAL_CLUSTERS,
  INITIAL_INSIGHTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_OFFICERS,
} from '../../data/initialDemoData';
import {
  findNearestMunicipalCenter,
  dispatchToNearestMunicipalCenter,
  forwardGeocodeLocation,
  haversineDistanceMeters,
  looksLikeDelhiNcrLocation,
} from '../../utils/geoUtils';

const LOCAL_STORAGE_COMPLAINTS = 'swachhsetu_complaints_v2';
const LOCAL_STORAGE_CLUSTERS = 'swachhsetu_clusters_v2';
const LOCAL_STORAGE_NOTIFS = 'swachhsetu_notifs_v2';
const LOCAL_STORAGE_INSIGHTS = 'swachhsetu_insights_v2';

const DELHI_DEFAULT_COORDS = [
  { lat: 28.6508, lon: 77.2335 },
  { lat: 28.6315, lon: 77.2167 },
  { lat: 28.6562, lon: 77.2335 },
];

function isStaleDelhiDefaultCoord(lat: number, lon: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return true;
  if (Math.abs(lat) < 0.001 && Math.abs(lon) < 0.001) return true;
  return DELHI_DEFAULT_COORDS.some((p) => haversineDistanceMeters(lat, lon, p.lat, p.lon) < 1200);
}

// In-memory / localStorage cache initializer (strips legacy Unsplash placeholders and heals stale Delhi/NDMC mismatches)
const getCachedComplaints = (): Complaint[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_COMPLAINTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        let changed = false;
        const normalized = parsed.map((c: Complaint) => {
          const media = Array.isArray(c.media)
            ? c.media.filter((m) => m?.file_url && !m.file_url.includes('images.unsplash.com'))
            : [];
          const resUrl =
            c.resolution_evidence_url && !c.resolution_evidence_url.includes('images.unsplash.com')
              ? c.resolution_evidence_url
              : null;

          const addrText = `${c.address || ''} ${c.ward || ''}`.trim();
          const nonDelhiAddr = addrText.length >= 3 && !looksLikeDelhiNcrLocation(addrText);
          let lat = c.latitude;
          let lon = c.longitude;
          let mc = c.nearest_municipal_center;

          if (nonDelhiAddr && isStaleDelhiDefaultCoord(lat, lon)) {
            lat = 0;
            lon = 0;
            changed = true;
          }

          if (
            nonDelhiAddr &&
            mc &&
            looksLikeDelhiNcrLocation(`${mc.center_name || ''} ${mc.center_address || ''}`)
          ) {
            mc = {
              ...mc,
              center_name: `${c.address || c.ward} Municipal Corporation Sanitation Center`,
              center_address: c.address || c.ward || '',
              center_latitude: undefined,
              center_longitude: undefined,
              distance_km: null,
              provider: 'civic_authority_derived',
            };
            changed = true;
          }

          return {
            ...c,
            latitude: lat,
            longitude: lon,
            nearest_municipal_center: mc,
            media,
            resolution_evidence_url: resUrl,
          };
        });
        if (changed) {
          saveCachedComplaints(normalized);
        }
        return normalized;
      }
    }
  } catch (e) {
    console.warn('LocalStorage read error:', e);
  }
  return ALL_INITIAL_COMPLAINTS;
};

const saveCachedComplaints = (data: Complaint[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_COMPLAINTS, JSON.stringify(data));
  } catch (e) {
    console.warn('LocalStorage write error:', e);
  }
};

// Background healer: upgrades any cached complaint whose coordinates or MC office can be newly resolved via live OSM/Wikidata
let healingInProgress = false;
async function healStaleCachedComplaints(): Promise<void> {
  if (healingInProgress) return;
  const list = getCachedComplaints();
  const candidates = list.filter((c) => {
    const addr = (c.address || '').trim();
    if (addr.length < 4) return false;
    const missingCoords = !Number.isFinite(c.latitude) || (Math.abs(c.latitude) < 0.001 && Math.abs(c.longitude) < 0.001);
    const derivedOrMissingMc =
      !c.nearest_municipal_center ||
      c.nearest_municipal_center.provider === 'civic_authority_derived' ||
      (c.nearest_municipal_center.distance_km == null &&
        c.nearest_municipal_center.center_latitude === c.latitude);
    return missingCoords || derivedOrMissingMc;
  });
  if (candidates.length === 0) return;

  healingInProgress = true;
  try {
    let anyUpdated = false;
    for (const c of candidates.slice(0, 4)) {
      let lat = c.latitude;
      let lon = c.longitude;
      let ward = c.ward;
      let city = '';
      let state = '';

      if (!Number.isFinite(lat) || (Math.abs(lat) < 0.001 && Math.abs(lon) < 0.001)) {
        const fwd = await forwardGeocodeLocation(c.address, 'en');
        if (fwd) {
          lat = fwd.latitude;
          lon = fwd.longitude;
          ward = fwd.ward || ward;
          city = fwd.city;
          state = fwd.state;
        }
      }

      if (Math.abs(lat) > 0.001 || Math.abs(lon) > 0.001) {
        const mc = await findNearestMunicipalCenter({
          latitude: lat,
          longitude: lon,
          address: c.address,
          ward,
          city,
          state,
        });
        if (mc && (lat !== c.latitude || mc.center_name !== c.nearest_municipal_center?.center_name || mc.distance_km !== c.nearest_municipal_center?.distance_km)) {
          const fresh = getCachedComplaints();
          const target = fresh.find((item) => item.id === c.id);
          if (target) {
            target.latitude = lat;
            target.longitude = lon;
            target.ward = ward;
            target.nearest_municipal_center = {
              ...(target.nearest_municipal_center || {}),
              ...mc,
            };
            saveCachedComplaints(fresh);
            anyUpdated = true;
          }
        }
      }
    }
    if (anyUpdated) {
      window.dispatchEvent(new CustomEvent('swachhsetu-complaints-healed'));
    }
  } catch {
  } finally {
    healingInProgress = false;
  }
}

const getCachedClusters = (): IncidentCluster[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CLUSTERS);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return INITIAL_CLUSTERS.map((cl) => ({
    ...cl,
    cluster_name: cl.cluster_number,
    total_complaints: cl.report_count,
    center_latitude: cl.latitude,
    center_longitude: cl.longitude,
    risk_score: cl.severity,
  }));
};

const saveCachedClusters = (data: IncidentCluster[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_CLUSTERS, JSON.stringify(data));
  } catch (e) {}
};

const getCachedNotifs = (): AppNotification[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_NOTIFS);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return INITIAL_NOTIFICATIONS;
};

const saveCachedNotifs = (data: AppNotification[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_NOTIFS, JSON.stringify(data));
  } catch (e) {}
};

const getCachedInsights = (): AIInsight[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_INSIGHTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return INITIAL_INSIGHTS;
};

// Calculate Haversine distance in meters between two lat/lng coordinates
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export const dbService = {
  // COMPLAINTS
  async getComplaints(filters?: {
    status?: ComplaintStatus;
    ward?: string;
    category?: string;
    citizenId?: string;
    officerId?: string;
    search?: string;
  }): Promise<Complaint[]> {
    try {
      let query = supabase
        .from('complaints')
        .select(`
          *,
          media:complaint_media(*),
          ai_analysis:ai_analysis(*),
          status_history:status_history(*),
          verifications:resolution_verifications(*)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.ward) query = query.eq('ward', filters.ward);
      if (filters?.category) query = query.eq('category', filters.category);
      if (filters?.citizenId) query = query.eq('citizen_id', filters.citizenId);
      if (filters?.officerId) query = query.eq('assigned_officer_id', filters.officerId);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data as Complaint[];
      }
    } catch (err) {
      console.warn('Supabase getComplaints fallback:', err);
    }

    // Local / Demo fallback
    let list = getCachedComplaints();
    void healStaleCachedComplaints();
    if (filters?.status) {
      list = list.filter((c) => c.status === filters.status);
    }
    if (filters?.ward && filters.ward !== 'All Wards' && filters.ward !== 'All') {
      list = list.filter((c) => c.ward === filters.ward);
    }
    if (filters?.category && filters.category !== 'All Categories' && filters.category !== 'All') {
      list = list.filter((c) => c.category === filters.category);
    }
    if (filters?.citizenId) {
      list = list.filter((c) => c.citizen_id === filters.citizenId);
    }
    if (filters?.officerId) {
      list = list.filter((c) => c.assigned_officer_id === filters.officerId);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.complaint_number.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q) ||
          c.ward.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q)
      );
    }

    return list;
  },

  async getComplaintByNumber(complaintNumber: string): Promise<Complaint | null> {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select(`
          *,
          media:complaint_media(*),
          ai_analysis:ai_analysis(*),
          status_history:status_history(*),
          verifications:resolution_verifications(*)
        `)
        .eq('complaint_number', complaintNumber)
        .maybeSingle();

      if (!error && data) return data as Complaint;
    } catch (e) {}

    const list = getCachedComplaints();
    return list.find((c) => c.complaint_number.toLowerCase() === complaintNumber.toLowerCase()) || null;
  },

  // NEARBY DUPLICATES & CLUSTER CHECK
  async checkNearbyDuplicates(
    latitude: number,
    longitude: number,
    category: string,
    thresholdMeters = 400
  ): Promise<{ duplicates: Complaint[]; clusterId?: string }> {
    const list = getCachedComplaints();
    const duplicates = list.filter((c) => {
      if (c.status === 'RESOLVED') return false;
      const dist = calculateDistanceMeters(latitude, longitude, c.latitude, c.longitude);
      return dist <= thresholdMeters;
    });

    let clusterId: string | undefined;
    if (duplicates.length > 0) {
      const foundCluster = duplicates.find((d) => d.cluster_id)?.cluster_id;
      clusterId = foundCluster || `INC-${duplicates[0].complaint_number.slice(-4)}`;
    }

    return { duplicates, clusterId };
  },

  // CREATE COMPLAINT
  async createComplaint(payload: {
    citizen_id?: string;
    citizen_name?: string;
    citizen_phone?: string;
    description: string;
    category: string;
    subcategory?: string;
    latitude: number;
    longitude: number;
    address: string;
    ward: string;
    severity_score: number;
    urgency: Complaint['urgency'];
    health_risk: Complaint['health_risk'];
    population_impact: number;
    ai_summary: string;
    ai_confidence: number;
    recommended_department: string;
    media_url?: string;
    ai_analysis_data?: Partial<AIAnalysis>;
    nearest_municipal_center?: MunicipalCenterDispatch;
  }): Promise<Complaint> {
    const nextNum = Math.floor(100000 + Math.random() * 900000);
    const complaintNumber = `SW-2026-${nextNum}`;
    const id = `comp-${Date.now()}`;
    const now = new Date().toISOString();

    // Calculate SLA Hours based on severity
    let slaHours = 24;
    if (payload.severity_score >= 85) slaHours = 6;
    else if (payload.severity_score >= 70) slaHours = 12;
    else if (payload.severity_score >= 45) slaHours = 24;
    else slaHours = 48;

    const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString();

    // Check cluster assignment among real complaints
    const { duplicates, clusterId } = await this.checkNearbyDuplicates(
      payload.latitude,
      payload.longitude,
      payload.category,
      400
    );
    const assignedClusterId = clusterId || (duplicates.length >= 1 ? `INC-${Math.floor(1000 + Math.random() * 9000)}` : null);

    // Resolve nearest municipal center fast (skip lookup if pre-resolved or coords unresolved (0,0), else max 1100ms wait)
    const hasCitizenPhoto = Boolean(payload.media_url && !payload.media_url.includes('images.unsplash.com'));
    const hasValidCoords =
      Number.isFinite(payload.latitude) &&
      Number.isFinite(payload.longitude) &&
      (Math.abs(payload.latitude) > 0.001 || Math.abs(payload.longitude) > 0.001);
    const areaFallbackLabel = payload.ward || payload.address || (hasValidCoords ? `${payload.latitude.toFixed(4)}, ${payload.longitude.toFixed(4)}` : 'Local Area');
    let centerInfo: MunicipalCenterDispatch = payload.nearest_municipal_center || {
      center_name: `${areaFallbackLabel} Municipal Corporation Sanitation Center`,
      center_address: payload.address || areaFallbackLabel,
      center_latitude: hasValidCoords ? payload.latitude : undefined,
      center_longitude: hasValidCoords ? payload.longitude : undefined,
      distance_km: null,
      authority_type: 'Area Municipal Sanitation Officer Center',
      contact_phone: null,
      website: null,
      helpline: '1969',
      provider: 'civic_authority_derived',
    };

    let needsBackgroundCenterUpgrade = false;
    if (!payload.nearest_municipal_center && hasValidCoords) {
      const lookupPromise = findNearestMunicipalCenter({
        latitude: payload.latitude,
        longitude: payload.longitude,
        address: payload.address,
        ward: payload.ward,
      });

      const quickResult = await Promise.race([
        lookupPromise,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2600)),
      ]);

      if (quickResult) {
        centerInfo = quickResult;
      } else {
        needsBackgroundCenterUpgrade = true;
        lookupPromise
          .then(async (realCenter) => {
            const finalized = await dispatchToNearestMunicipalCenter({
              complaintNumber,
              category: payload.category,
              description: payload.description,
              severity: payload.severity_score,
              urgency: payload.urgency,
              address: payload.address,
              ward: payload.ward,
              latitude: payload.latitude,
              longitude: payload.longitude,
              hasCitizenPhoto,
              center: realCenter,
            });
            await this.updateComplaintEnrichment(id, { nearest_municipal_center: finalized });
          })
          .catch(() => {});
      }
    }

    // Dispatch packet immediately (localhost ~3ms, bounded at 450ms so submit is never delayed)
    const dispatchIdFallback = `DISP-${Date.now().toString(36).toUpperCase()}`;
    const dispatchedCenter: MunicipalCenterDispatch = await Promise.race([
      dispatchToNearestMunicipalCenter({
        complaintNumber,
        category: payload.category,
        description: payload.description,
        severity: payload.severity_score,
        urgency: payload.urgency,
        address: payload.address,
        ward: payload.ward,
        latitude: payload.latitude,
        longitude: payload.longitude,
        hasCitizenPhoto,
        center: centerInfo,
      }),
      new Promise<MunicipalCenterDispatch>((resolve) =>
        setTimeout(
          () =>
            resolve({
              ...centerInfo,
              dispatch_id: dispatchIdFallback,
              dispatched_at: now,
              status: 'DISPATCHED_TO_CENTER',
            }),
          450
        )
      ),
    ]);

    const newComplaint: Complaint = {
      id,
      complaint_number: complaintNumber,
      citizen_id: payload.citizen_id || 'citizen-local',
      citizen_name: payload.citizen_name || 'Citizen',
      citizen_phone: payload.citizen_phone || undefined,
      description: payload.description,
      category: payload.category,
      subcategory: payload.subcategory || 'General Civic Sanitation Report',
      latitude: payload.latitude,
      longitude: payload.longitude,
      address: payload.address,
      ward: payload.ward,
      status: 'AI_ANALYZED',
      severity_score: payload.severity_score,
      urgency: payload.urgency,
      health_risk: payload.health_risk,
      population_impact: payload.population_impact,
      ai_summary: payload.ai_summary,
      ai_confidence: payload.ai_confidence,
      recommended_department: payload.recommended_department,
      sla_deadline: slaDeadline,
      cluster_id: assignedClusterId,
      nearest_municipal_center: dispatchedCenter,
      created_at: now,
      updated_at: now,
      media: hasCitizenPhoto && payload.media_url
        ? [
            {
              id: `med-${Date.now()}`,
              complaint_id: id,
              file_url: payload.media_url,
              media_type: 'image',
              uploaded_by: payload.citizen_id || 'citizen',
              created_at: now,
            },
          ]
        : [],
      ai_analysis: payload.ai_analysis_data
        ? ({
            id: `ai-${Date.now()}`,
            complaint_id: id,
            category: payload.category,
            subcategory: payload.subcategory || payload.category,
            severity: payload.severity_score,
            confidence: payload.ai_confidence,
            urgency: payload.urgency,
            health_risk: payload.health_risk,
            population_impact: payload.population_impact,
            duplicate_probability: duplicates.length > 0 ? 0.85 : 0.05,
            recommended_action: payload.ai_analysis_data.recommended_action || 'Immediate field team dispatch',
            recommended_department: payload.recommended_department,
            reasoning_summary: payload.ai_summary,
            priority_score: payload.severity_score,
            created_at: now,
          } as AIAnalysis)
        : undefined,
      status_history: [
        {
          id: `sh-${Date.now()}-1`,
          complaint_id: id,
          status: 'SUBMITTED',
          changed_by: payload.citizen_id || 'citizen',
          changed_by_name: payload.citizen_name || 'Citizen',
          remarks: hasCitizenPhoto
            ? 'Complaint lodged with exact GPS coordinates & citizen-uploaded photo'
            : 'Complaint lodged with exact GPS coordinates (no photo attached)',
          created_at: now,
        },
        {
          id: `sh-${Date.now()}-2`,
          complaint_id: id,
          status: 'AI_ANALYZED',
          changed_by: 'system',
          changed_by_name: 'SwachhSetu AI & Dispatch Router',
          remarks: `${needsBackgroundCenterUpgrade ? 'Routing to' : 'Dispatched to'} nearest municipal center: ${dispatchedCenter.center_name}${
            dispatchedCenter.distance_km != null ? ` (${dispatchedCenter.distance_km} km away)` : ''
          }. Severity: ${payload.severity_score}/100, SLA: ${slaHours}h.`,
          created_at: now,
        },
      ],
    };

    // Save immediately to local cache
    const current = getCachedComplaints();
    current.unshift(newComplaint);
    saveCachedComplaints(current);

    // Fire notifications without blocking UI return
    void Promise.all([
      this.createNotification({
        user_id: payload.citizen_id || 'citizen-local',
        complaint_id: newComplaint.id,
        complaint_number: newComplaint.complaint_number,
        title: 'Dispatched to Nearest Municipal Officer Center',
        message: `${newComplaint.complaint_number} routed to ${dispatchedCenter.center_name}${
          dispatchedCenter.distance_km != null ? ` (${dispatchedCenter.distance_km} km)` : ''
        } for action.`,
        type: 'success',
      }),
      this.createNotification({
        user_id: 'all',
        complaint_id: newComplaint.id,
        complaint_number: newComplaint.complaint_number,
        title: `Action Required: ${dispatchedCenter.center_name}`,
        message: `${payload.category} at ${payload.address} (${payload.severity_score}/100). Dispatch ID: ${dispatchedCenter.dispatch_id || 'ACTIVE'}.`,
        type: payload.severity_score >= 80 ? 'alert' : 'info',
      }),
    ]);

    return newComplaint;
  },

  // UPDATE COMPLAINT ENRICHMENT FIELDS IN BACKGROUND (AI / Center Lookup)
  async updateComplaintEnrichment(
    complaintId: string,
    updates: Partial<
      Pick<
        Complaint,
        | 'category'
        | 'subcategory'
        | 'severity_score'
        | 'urgency'
        | 'health_risk'
        | 'population_impact'
        | 'ai_summary'
        | 'ai_confidence'
        | 'recommended_department'
        | 'nearest_municipal_center'
      >
    >
  ): Promise<Complaint | null> {
    const current = getCachedComplaints();
    const target = current.find((c) => c.id === complaintId);
    if (!target) return null;

    Object.assign(target, updates, { updated_at: new Date().toISOString() });
    saveCachedComplaints(current);
    return target;
  },

  // UPDATE COMPLAINT STATUS
  async updateComplaintStatus(
    complaintId: string,
    status: ComplaintStatus,
    changedByName = 'Officer',
    remarks = '',
    changedBy = 'officer',
    extraFields?: {
      assigned_officer_id?: string;
      assigned_officer_name?: string;
      resolution_evidence_url?: string;
      resolution_notes?: string;
      reopen_reason?: string;
    }
  ): Promise<Complaint | null> {
    const list = getCachedComplaints();
    const index = list.findIndex((c) => c.id === complaintId || c.complaint_number === complaintId);
    if (index === -1) return null;

    const target = list[index];
    const now = new Date().toISOString();

    target.status = status;
    target.updated_at = now;

    if (extraFields?.assigned_officer_id) target.assigned_officer_id = extraFields.assigned_officer_id;
    if (extraFields?.assigned_officer_name) target.assigned_officer_name = extraFields.assigned_officer_name;
    if (extraFields?.resolution_evidence_url) target.resolution_evidence_url = extraFields.resolution_evidence_url;
    if (extraFields?.resolution_notes) target.resolution_notes = extraFields.resolution_notes;
    if (extraFields?.reopen_reason) target.reopen_reason = extraFields.reopen_reason;

    if (!target.status_history) target.status_history = [];
    target.status_history.push({
      id: `sh-${Date.now()}`,
      complaint_id: target.id,
      status,
      changed_by: changedBy,
      changed_by_name: changedByName,
      remarks,
      created_at: now,
    });

    saveCachedComplaints(list);

    // Add relevant notifications
    let notifTitle = `Status updated to ${status}`;
    let notifMsg = `${target.complaint_number}: ${remarks}`;
    let notifType: AppNotification['type'] = 'info';

    if (status === 'IN_PROGRESS') {
      notifTitle = `Work Started on ${target.complaint_number}`;
      notifType = 'info';
    } else if (status === 'RESOLUTION_SUBMITTED') {
      notifTitle = `Resolution Evidence Submitted: ${target.complaint_number}`;
      notifMsg = `Sanitation officer uploaded after-cleaning photos. Please confirm if resolved.`;
      notifType = 'alert';
    } else if (status === 'RESOLVED') {
      notifTitle = `Complaint Successfully Resolved: ${target.complaint_number}`;
      notifType = 'success';
    } else if (status === 'ESCALATED') {
      notifTitle = `CRITICAL ESCALATION: ${target.complaint_number}`;
      notifType = 'alert';
    } else if (status === 'REOPENED') {
      notifTitle = `Complaint Reopened: ${target.complaint_number}`;
      notifType = 'warning';
    }

    await this.createNotification({
      user_id: target.citizen_id,
      complaint_id: target.id,
      complaint_number: target.complaint_number,
      title: notifTitle,
      message: notifMsg,
      type: notifType,
    });

    return target;
  },

  // SUBMIT OFFICER RESOLUTION EVIDENCE
  async submitResolutionEvidence(
    complaintId: string,
    resolutionPhotoBase64: string,
    remarks: string,
    officerName: string,
    cleanlinessScore = 92
  ): Promise<Complaint | null> {
    const list = getCachedComplaints();
    const target = list.find((c) => c.id === complaintId || c.complaint_number === complaintId);
    if (!target) return null;

    return await this.updateComplaintStatus(
      target.id,
      'RESOLUTION_SUBMITTED',
      officerName,
      `Officer submitted resolution evidence (AI Cleanliness Score: ${cleanlinessScore}%). ${remarks}`,
      'officer',
      {
        resolution_evidence_url: resolutionPhotoBase64,
        resolution_notes: remarks,
      }
    );
  },

  // SUBMIT CITIZEN VERIFICATION
  async submitVerification(
    complaintId: string,
    citizenId: string,
    verified: boolean,
    feedback: string,
    rating?: number
  ): Promise<boolean> {
    const list = getCachedComplaints();
    const target = list.find((c) => c.id === complaintId || c.complaint_number === complaintId);
    if (!target) return false;

    const verification: ResolutionVerification = {
      id: `ver-${Date.now()}`,
      complaint_id: target.id,
      citizen_id: citizenId,
      verified,
      feedback,
      rating: rating || 5,
      resolution_media_url: target.resolution_evidence_url || undefined,
      created_at: new Date().toISOString(),
    };

    if (!target.verifications) target.verifications = [];
    target.verifications.push(verification);

    if (verified) {
      await this.updateComplaintStatus(
        target.id,
        'RESOLVED',
        target.citizen_name || 'Citizen',
        `Citizen verified resolution: "${feedback}" (Rating: ${rating || 5}/5)`,
        citizenId
      );
    } else {
      await this.updateComplaintStatus(
        target.id,
        'REOPENED',
        target.citizen_name || 'Citizen',
        `Citizen rejected resolution: "${feedback}". Complaint reopened for priority action.`,
        citizenId,
        { reopen_reason: feedback }
      );
    }

    return true;
  },

  // CLUSTERS (dynamically computed from real nearby complaints within 400m)
  async getIncidentClusters(): Promise<IncidentCluster[]> {
    try {
      const { data, error } = await supabase.from('incident_clusters').select('*').order('report_count', { ascending: false });
      if (!error && data && data.length > 0) {
        return (data as any[]).map((cl) => ({
          ...cl,
          cluster_name: cl.cluster_number,
          total_complaints: cl.report_count,
          center_latitude: cl.latitude,
          center_longitude: cl.longitude,
          risk_score: cl.severity,
        }));
      }
    } catch (e) {}

    const realComplaints = getCachedComplaints().filter((c) => c.status !== 'RESOLVED');
    const clusters: IncidentCluster[] = [];
    const groupedIds = new Set<string>();

    for (const c of realComplaints) {
      if (groupedIds.has(c.id)) continue;
      const nearby = realComplaints.filter(
        (other) => calculateDistanceMeters(c.latitude, c.longitude, other.latitude, other.longitude) <= 400
      );
      if (nearby.length >= 2) {
        nearby.forEach((n) => groupedIds.add(n.id));
        const maxSev = Math.max(...nearby.map((n) => n.severity_score));
        const clusterCode = c.cluster_id || `INC-${clusters.length + 1001}`;
        clusters.push({
          id: `cl-${clusterCode}`,
          cluster_number: clusterCode,
          cluster_name: clusterCode,
          category: c.category,
          latitude: c.latitude,
          longitude: c.longitude,
          center_latitude: c.latitude,
          center_longitude: c.longitude,
          ward: c.ward,
          report_count: nearby.length,
          total_complaints: nearby.length,
          severity: maxSev,
          risk_score: maxSev,
          status: 'ACTIVE',
          summary: `${nearby.length} complaints reported within 400m around ${c.address}`,
          complaint_ids: nearby.map((n) => n.id),
          created_at: c.created_at,
          updated_at: c.updated_at,
        });
      }
    }

    return clusters.length > 0 ? clusters : getCachedClusters();
  },

  // WARDS & PERFORMANCE LEADERBOARD (strictly computed from real complaints)
  async getWards(): Promise<Ward[]> {
    return INITIAL_WARDS;
  },

  async getWardPerformance(): Promise<WardPerformance[]> {
    const allComplaints = getCachedComplaints();

    // Include any real areas/wards from submitted complaints plus reference wards
    const wardNames = Array.from(
      new Set([
        ...allComplaints.map((c) => c.ward).filter(Boolean),
        ...INITIAL_WARDS.map((w) => w.name),
      ])
    );

    return wardNames.map((wardName, idx) => {
      const wardComplaints = allComplaints.filter((c) => c.ward === wardName);
      const total = wardComplaints.length;
      const resolved = wardComplaints.filter((c) => c.status === 'RESOLVED').length;
      const active = total - resolved;
      const resRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

      const resolvedItems = wardComplaints.filter((c) => c.status === 'RESOLVED');
      const avgHours =
        resolvedItems.length > 0
          ? +(
              resolvedItems.reduce(
                (acc, c) =>
                  acc + Math.max(0.5, (new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 3600000),
                0
              ) / resolvedItems.length
            ).toFixed(1)
          : 0;

      const onTimeCount = wardComplaints.filter(
        (c) => c.status === 'RESOLVED' || new Date(c.sla_deadline).getTime() > Date.now()
      ).length;
      const slaRate = total > 0 ? Math.round((onTimeCount / total) * 100) : 100;

      let grade: 'A+' | 'A' | 'B+' | 'B' | 'C' = 'A';
      if (total === 0) grade = 'A';
      else if (resRate >= 75 && slaRate >= 90) grade = 'A+';
      else if (resRate >= 50 && slaRate >= 80) grade = 'A';
      else if (resRate >= 30) grade = 'B+';
      else if (resRate >= 15) grade = 'B';
      else grade = 'C';

      return {
        id: `ward-perf-${idx}`,
        ward_name: wardName,
        total_complaints: total,
        resolved_complaints: resolved,
        active_complaints: active,
        resolution_rate: resRate,
        avg_resolution_hours: avgHours,
        sla_compliance_rate: slaRate,
        cleanliness_grade: grade,
      };
    });
  },

  // OFFICERS
  async getOfficers(): Promise<Profile[]> {
    return INITIAL_OFFICERS;
  },

  // AI INSIGHTS
  async getAIInsights(): Promise<AIInsight[]> {
    try {
      const { data, error } = await supabase.from('ai_insights').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) return data as AIInsight[];
    } catch (e) {}
    return getCachedInsights();
  },

  // NOTIFICATIONS
  async getNotifications(userId?: string): Promise<AppNotification[]> {
    try {
      let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (!error && data && data.length > 0) return data as AppNotification[];
    } catch (e) {}

    const all = getCachedNotifs();
    if (userId && userId !== 'admin') {
      return all.filter((n) => n.user_id === userId || n.user_id === 'all');
    }
    return all;
  },

  async markNotificationRead(id: string): Promise<void> {
    const list = getCachedNotifs();
    const item = list.find((n) => n.id === id);
    if (item) {
      item.read = true;
      saveCachedNotifs(list);
    }
    try {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
    } catch (e) {}
  },

  async createNotification(notif: Omit<AppNotification, 'id' | 'read' | 'created_at'>): Promise<AppNotification> {
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      ...notif,
      read: false,
      created_at: new Date().toISOString(),
    };
    const list = getCachedNotifs();
    list.unshift(newNotif);
    saveCachedNotifs(list);

    try {
      await supabase.from('notifications').insert([newNotif]);
    } catch (e) {}

    return newNotif;
  },

  // Reset/seed demo state
  resetToDemoData() {
    localStorage.setItem(LOCAL_STORAGE_COMPLAINTS, JSON.stringify(ALL_INITIAL_COMPLAINTS));
    localStorage.setItem(LOCAL_STORAGE_CLUSTERS, JSON.stringify(INITIAL_CLUSTERS));
    localStorage.setItem(LOCAL_STORAGE_NOTIFS, JSON.stringify(INITIAL_NOTIFICATIONS));
    localStorage.setItem(LOCAL_STORAGE_INSIGHTS, JSON.stringify(INITIAL_INSIGHTS));
    return {
      complaints: ALL_INITIAL_COMPLAINTS,
      clusters: INITIAL_CLUSTERS,
      insights: INITIAL_INSIGHTS,
      notifs: INITIAL_NOTIFICATIONS,
    };
  },
};
