import React, { useState, useEffect } from 'react';
import {
  Activity,
  Layers,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  TrendingUp,
  ShieldAlert,
  Flame,
  Users,
  Filter,
  Eye,
  Sparkles,
  Zap,
  Database,
  ImageOff,
  ExternalLink,
} from 'lucide-react';
import { Complaint, IncidentCluster, WardPerformance } from '../../types/database';
import { useLanguage } from '../../context/LanguageContext';
import { dbService } from '../../services/supabase/dbService';
import { formatTimeRemaining, getStatusBadge, getSeverityBadge, formatDate } from '../../utils/formatters';
import { buildGoogleMapsUrl, buildOsmEmbedUrl, buildSpotMapUrl } from '../../utils/geoUtils';

interface CommandCenterProps {
  complaints: Complaint[];
  clusters: IncidentCluster[];
  wards: WardPerformance[];
  onOpenTrackModal: (complaintNumber: string) => void;
  onRefresh: () => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  complaints,
  clusters,
  wards,
  onOpenTrackModal,
  onRefresh,
}) => {
  const { language, t, tWard, tCategory } = useLanguage();
  const [selectedWardFilter, setSelectedWardFilter] = useState('All');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState('All');
  const [selectedCluster, setSelectedCluster] = useState<IncidentCluster | null>(null);
  const [selectedMarkerComplaint, setSelectedMarkerComplaint] = useState<Complaint | null>(null);

  // Map layer toggles
  const [showClusters, setShowClusters] = useState(true);
  const [showActiveMarkers, setShowActiveMarkers] = useState(true);
  const [showResolvedMarkers, setShowResolvedMarkers] = useState(false);

  // Filter complaints for Map and Table
  const filteredComplaints = complaints.filter((c) => {
    const matchesWard = selectedWardFilter === 'All' || c.ward === selectedWardFilter;
    const matchesCategory = selectedCategoryFilter === 'All' || c.category === selectedCategoryFilter;

    let matchesSeverity = true;
    if (selectedSeverityFilter === 'critical') matchesSeverity = c.severity_score >= 85;
    else if (selectedSeverityFilter === 'high') matchesSeverity = c.severity_score >= 70 && c.severity_score < 85;
    else if (selectedSeverityFilter === 'medium') matchesSeverity = c.severity_score < 70;

    return matchesWard && matchesCategory && matchesSeverity;
  });

  // Dynamic map projection bounds centered on active points
  const validGeoPoints = [
    ...filteredComplaints
      .filter(
        (c) =>
          Number.isFinite(c.latitude) &&
          Number.isFinite(c.longitude) &&
          (Math.abs(c.latitude) > 0.001 || Math.abs(c.longitude) > 0.001)
      )
      .map((c) => ({ lat: c.latitude, lon: c.longitude })),
    ...clusters
      .filter(
        (cl) =>
          Number.isFinite(cl.center_latitude) &&
          Number.isFinite(cl.center_longitude) &&
          (Math.abs(cl.center_latitude) > 0.001 || Math.abs(cl.center_longitude) > 0.001)
      )
      .map((cl) => ({ lat: cl.center_latitude, lon: cl.center_longitude })),
  ];

  const computeBounds = () => {
    if (validGeoPoints.length === 0) {
      return { minLat: 28.52, latSpan: 0.22, minLon: 77.1, lonSpan: 0.22, centerLat: 28.6139, centerLon: 77.209, hasRealPoints: false };
    }
    const lats = validGeoPoints.map((p) => p.lat);
    const lons = validGeoPoints.map((p) => p.lon);
    const rawMinLat = Math.min(...lats);
    const rawMaxLat = Math.max(...lats);
    const rawMinLon = Math.min(...lons);
    const rawMaxLon = Math.max(...lons);
    const midLat = (rawMinLat + rawMaxLat) / 2;
    const midLon = (rawMinLon + rawMaxLon) / 2;
    const latSpan = Math.max(0.08, (rawMaxLat - rawMinLat) * 1.45);
    const lonSpan = Math.max(0.08, (rawMaxLon - rawMinLon) * 1.45);
    return {
      minLat: midLat - latSpan / 2,
      latSpan,
      minLon: midLon - lonSpan / 2,
      lonSpan,
      centerLat: midLat,
      centerLon: midLon,
      hasRealPoints: true,
    };
  };

  const mapBounds = computeBounds();
  const focusComplaint =
    selectedMarkerComplaint ||
    filteredComplaints.find(
      (c) =>
        Number.isFinite(c.latitude) &&
        Number.isFinite(c.longitude) &&
        (Math.abs(c.latitude) > 0.001 || Math.abs(c.longitude) > 0.001)
    ) ||
    null;
  const focusLat = focusComplaint?.latitude || mapBounds.centerLat;
  const focusLon = focusComplaint?.longitude || mapBounds.centerLon;
  const focusAddress = focusComplaint?.address || filteredComplaints[0]?.address || '';
  const liveOsmEmbedUrl = mapBounds.hasRealPoints ? buildOsmEmbedUrl(focusLat, focusLon, 0.015) : null;

  // Calculate high level metrics
  const total = complaints.length;
  const resolved = complaints.filter((c) => c.status === 'RESOLVED').length;
  const activeCount = total - resolved;
  const critical = complaints.filter((c) => c.severity_score >= 85 && c.status !== 'RESOLVED').length;
  const breachedCount = complaints.filter(
    (c) => formatTimeRemaining(c.sla_deadline, language).isBreached && c.status !== 'RESOLVED'
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-20">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
              {t.commandCenterTitle}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold">
              {t.superintendentBadge}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t.commandCenterSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-indigo-600" />
            <span>{t.refreshTelemetry}</span>
          </button>
        </div>
      </div>

      {/* Top Stat Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{t.activeIncidentsStat}</span>
          <div className="text-2xl font-black text-slate-900 font-display mt-1">{activeCount}</div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">{language === 'hi' ? '12 क्षेत्रों में' : 'Across 12 zones'}</span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{t.activeClustersStat}</span>
          <div className="text-2xl font-black text-indigo-600 font-display mt-1">{clusters.length}</div>
          <span className="text-[10px] text-indigo-600/90 font-medium mt-0.5 block">{language === 'hi' ? 'स्थानिक समूहीकरण (400मी)' : 'Spatial grouping (400m)'}</span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{t.criticalBiohazardsStat}</span>
          <div className="text-2xl font-black text-rose-600 font-display mt-1">{critical}</div>
          <span className="text-[10px] text-rose-600 font-medium mt-0.5 block">{t.aiSeverityLabel} &gt; 85</span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{t.slaBreachedStat}</span>
          <div className="text-2xl font-black text-amber-600 font-display mt-1">{breachedCount}</div>
          <span className="text-[10px] text-amber-600 font-medium mt-0.5 block">{language === 'hi' ? 'तत्काल उच्चीकरण' : 'Immediate escalation'}</span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{t.resolutionRateStat}</span>
          <div className="text-2xl font-black text-emerald-600 font-display mt-1">
            {Math.round((resolved / (total || 1)) * 100)}%
          </div>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">{language === 'hi' ? 'नागरिकों द्वारा सत्यापित' : 'Verified by citizens'}</span>
        </div>
      </div>

      {/* INTERACTIVE SANITATION OPERATIONS MAP */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3.5">
        {/* Map Header & Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">{t.geospatialMapTitle}</h3>
            <span className="text-[11px] text-slate-500">({filteredComplaints.length} {language === 'hi' ? 'स्थल प्रदर्शित' : 'points plotted'})</span>
          </div>

          {/* Layer toggles */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={() => setShowClusters(!showClusters)}
              className={`px-3 py-1 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                showClusters
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {t.incidentClustersLayer} ({clusters.length})
            </button>
            <button
              onClick={() => setShowActiveMarkers(!showActiveMarkers)}
              className={`px-3 py-1 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                showActiveMarkers
                  ? 'bg-rose-50 border-rose-200 text-rose-700 font-bold'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {t.activeHotspotsLayer}
            </button>
            <button
              onClick={() => setShowResolvedMarkers(!showResolvedMarkers)}
              className={`px-3 py-1 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                showResolvedMarkers
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {t.resolvedPointsLayer}
            </button>
          </div>
        </div>

        {/* Interactive Live Geospatial Map */}
        <div className="relative w-full h-96 sm:h-[450px] bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-inner">
          {liveOsmEmbedUrl ? (
            <iframe
              key={`${focusLat.toFixed(4)},${focusLon.toFixed(4)}`}
              title="SwachhSetu Live Civic Operations Map"
              src={liveOsmEmbedUrl}
              className="w-full h-full border-0"
              loading="lazy"
            />
          ) : (
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `radial-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
              }}
            />
          )}

          {/* Dynamic Active Spot Coordinate Header */}
          <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 z-10 pointer-events-none">
            <div className="px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-100 pointer-events-auto shadow-md max-w-md truncate">
              {mapBounds.hasRealPoints
                ? `${focusAddress ? `${focusAddress} • ` : ''}${focusLat.toFixed(4)}° N, ${focusLon.toFixed(4)}° E`
                : language === 'hi'
                ? 'मानचित्र केंद्र: कोई सक्रिय निर्देशांक नहीं'
                : 'Map Focus: Waiting for reported complaint coordinates'}
            </div>
            {(mapBounds.hasRealPoints || focusAddress) && (
              <div className="flex items-center gap-1.5 pointer-events-auto">
                <a
                  href={buildSpotMapUrl(focusLat, focusLon, focusAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shadow-md transition"
                >
                  <MapPin className="w-3 h-3" />
                  <span>{language === 'hi' ? 'स्पॉट मानचित्र खोलें' : 'Open Spot Map'}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href={buildGoogleMapsUrl(focusLat, focusLon, focusAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-md transition"
                >
                  <span>Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Active Incident Cluster Rings */}
          {showClusters &&
            clusters.map((cl) => {
              const top = `${Math.min(88, Math.max(12, (1 - (cl.center_latitude - mapBounds.minLat) / mapBounds.latSpan) * 100))}%`;
              const left = `${Math.min(88, Math.max(12, ((cl.center_longitude - mapBounds.minLon) / mapBounds.lonSpan) * 100))}%`;

              return (
                <div
                  key={cl.id}
                  onClick={() => setSelectedCluster(cl)}
                  style={{ top, left }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20"
                >
                  <div className="relative flex items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-indigo-400 opacity-30" />
                    <div className="relative px-3 py-1 rounded-full bg-slate-900 border-2 border-indigo-400 text-indigo-200 font-bold text-xs shadow-xl flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                      <span>{cl.cluster_name}</span>
                      <span className="ml-1 px-1.5 py-0.2 bg-indigo-500/30 rounded-full text-[10px] text-indigo-200 font-mono">
                        {cl.total_complaints}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

          {/* Overlay pins only when OSM live map isn't active (so native OSM pin stays unobscured) */}
          {!liveOsmEmbedUrl &&
            filteredComplaints.map((c) => {
              if (!showResolvedMarkers && c.status === 'RESOLVED') return null;
              if (!showActiveMarkers && c.status !== 'RESOLVED') return null;
              if (!Number.isFinite(c.latitude) || !Number.isFinite(c.longitude) || (Math.abs(c.latitude) < 0.001 && Math.abs(c.longitude) < 0.001)) {
                return null;
              }

              const top = `${Math.min(88, Math.max(12, (1 - (c.latitude - mapBounds.minLat) / mapBounds.latSpan) * 100))}%`;
              const left = `${Math.min(88, Math.max(12, ((c.longitude - mapBounds.minLon) / mapBounds.lonSpan) * 100))}%`;

              const isCritical = c.severity_score >= 85;
              const isHigh = c.severity_score >= 70 && c.severity_score < 85;
              const isResolved = c.status === 'RESOLVED';

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedMarkerComplaint(c)}
                  style={{ top, left }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 hover:scale-125 transition"
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full border-2 shadow-lg flex items-center justify-center ${
                      isResolved
                        ? 'bg-emerald-500 border-emerald-300 shadow-emerald-500/30'
                        : isCritical
                        ? 'bg-rose-500 border-rose-200 animate-pulse shadow-rose-500/40'
                        : isHigh
                        ? 'bg-amber-500 border-amber-200 shadow-amber-500/30'
                        : 'bg-indigo-500 border-indigo-200 shadow-indigo-500/30'
                    }`}
                    title={`${c.complaint_number} - ${c.category} (${c.address})`}
                  />
                </div>
              );
            })}

          {/* Map Spot Selector / Legend Bar */}
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 z-20 pointer-events-none">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 text-[11px] backdrop-blur-sm shadow-md pointer-events-auto flex items-center gap-3">
              <div className="flex items-center gap-1 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>{t.legendCritical}</span>
              </div>
              <div className="flex items-center gap-1 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>{t.legendHigh}</span>
              </div>
              <div className="flex items-center gap-1 text-indigo-400">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span>{t.legendMedium}</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>{t.legendResolved}</span>
              </div>
            </div>

            {filteredComplaints.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pointer-events-auto bg-slate-900/90 border border-slate-800 rounded-xl p-1.5 shadow-md">
                {filteredComplaints.slice(0, 5).map((c) => {
                  const isActiveFocus = focusComplaint?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedMarkerComplaint(c)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold truncate max-w-[160px] transition cursor-pointer ${
                        isActiveFocus
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {c.complaint_number}: {c.address}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Selected Cluster Info Box (If Clicked) */}
        {selectedCluster && (
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">{selectedCluster.cluster_name}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold">
                  {selectedCluster.total_complaints} {language === 'hi' ? 'समूहीकृत घटनाएं' : 'Grouped Incidents'}
                </span>
                <span className="text-xs font-mono text-rose-600 font-bold">
                  {t.clusterRiskIndex}: {selectedCluster.risk_score}/100
                </span>
              </div>
              <p className="text-xs text-slate-600">
                {t.category}: <span className="font-semibold text-slate-900">{tCategory(selectedCluster.category)}</span> • {t.streetLandmarkLabel}:{' '}
                {tWard(selectedCluster.ward)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={buildSpotMapUrl(selectedCluster.center_latitude, selectedCluster.center_longitude, selectedCluster.ward)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-indigo-700 px-3 py-1 rounded-xl bg-white border border-indigo-200 hover:bg-indigo-50 transition font-bold"
              >
                <span>{language === 'hi' ? 'स्पॉट मानचित्र' : 'Open Spot Map'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={() => setSelectedCluster(null)}
                className="text-xs text-slate-600 hover:text-slate-900 px-3 py-1 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition cursor-pointer shadow-2xs font-semibold"
              >
                {language === 'hi' ? 'बंद करें' : 'Dismiss'}
              </button>
            </div>
          </div>
        )}

        {/* Selected Marker Detail Card (If Clicked) */}
        {selectedMarkerComplaint && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              {selectedMarkerComplaint.media?.[0]?.file_url ? (
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                  <img
                    src={selectedMarkerComplaint.media[0].file_url}
                    alt="Issue"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shrink-0 flex items-center justify-center text-slate-400">
                  <ImageOff className="w-4 h-4 text-slate-300" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-indigo-600 text-xs">
                    {selectedMarkerComplaint.complaint_number}
                  </span>
                  <span className="text-xs text-slate-700 font-semibold">{tCategory(selectedMarkerComplaint.category)}</span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{selectedMarkerComplaint.description}</p>
                <p className="text-[11px] text-slate-400">{selectedMarkerComplaint.address}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={buildSpotMapUrl(
                  selectedMarkerComplaint.latitude,
                  selectedMarkerComplaint.longitude,
                  selectedMarkerComplaint.address
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs inline-flex items-center gap-1 transition"
              >
                <span>{language === 'hi' ? 'स्पॉट मानचित्र' : 'Spot Map'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={() => onOpenTrackModal(selectedMarkerComplaint.complaint_number)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                {t.inspectTrackBtn}
              </button>
              <button
                onClick={() => setSelectedMarkerComplaint(null)}
                className="px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
              >
                {t.cancelBtn}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* WARD PERFORMANCE & COMPLIANCE LEADERBOARD */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              {t.wardLeaderboardTitle}
            </h3>
            <p className="text-xs text-slate-500">{t.wardLeaderboardSubtitle}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">{t.thWardName}</th>
                <th className="py-3.5 px-4">{t.thTotalComplaints}</th>
                <th className="py-3.5 px-4">{t.thResolvedPercent}</th>
                <th className="py-3.5 px-4">{t.thAvgResolution}</th>
                <th className="py-3.5 px-4">{t.thSlaCompliance}</th>
                <th className="py-3.5 px-4">{t.thSanitationGrade}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {wards.map((w) => (
                <tr key={w.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{tWard(w.ward_name)}</td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">{w.total_complaints}</td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${w.resolution_rate}%` }}
                        />
                      </div>
                      <span className="font-mono text-emerald-600 font-bold">{w.resolution_rate}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600 font-medium">
                    {w.avg_resolution_hours} {language === 'hi' ? 'घंटे' : 'Hours'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`font-bold font-mono ${
                        w.sla_compliance_rate >= 90
                          ? 'text-emerald-600'
                          : w.sla_compliance_rate >= 80
                          ? 'text-amber-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {w.sla_compliance_rate}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                        w.cleanliness_grade === 'A+'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : w.cleanliness_grade === 'A'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {w.cleanliness_grade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
