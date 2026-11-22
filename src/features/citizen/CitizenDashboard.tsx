import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  Sparkles,
  Camera,
  ThumbsUp,
  RotateCcw,
  Eye,
  Plus,
  Mic,
  ImageOff,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { Complaint, ComplaintStatus } from '../../types/database';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getStatusBadge, getSeverityBadge, formatTimeRemaining, formatDate } from '../../utils/formatters';
import { buildSpotMapUrl } from '../../utils/geoUtils';

interface CitizenDashboardProps {
  complaints: Complaint[];
  onOpenReportModal: () => void;
  onOpenTrackModal: (complaintNumber: string) => void;
  onRefresh: () => void;
  onOpenVoiceModal?: () => void;
}

export const CitizenDashboard: React.FC<CitizenDashboardProps> = ({
  complaints,
  onOpenReportModal,
  onOpenTrackModal,
  onRefresh,
  onOpenVoiceModal,
}) => {
  const { user } = useAuth();
  const { language, t, tCategory, tWard } = useLanguage();
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'verification' | 'resolved' | 'reopened'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Filter complaints
  const filtered = complaints.filter((c) => {
    const matchesSearch =
      c.complaint_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.address.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;

    if (!matchesSearch || !matchesCategory) return false;

    if (activeTab === 'active') {
      return ['SUBMITTED', 'AI_ANALYZED', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED'].includes(c.status);
    }
    if (activeTab === 'verification') {
      return ['RESOLUTION_SUBMITTED', 'CITIZEN_VERIFICATION'].includes(c.status);
    }
    if (activeTab === 'resolved') {
      return c.status === 'RESOLVED';
    }
    if (activeTab === 'reopened') {
      return c.status === 'REOPENED';
    }
    return true;
  });

  const verificationRequiredCount = complaints.filter(
    (c) => c.status === 'RESOLUTION_SUBMITTED' || c.status === 'CITIZEN_VERIFICATION'
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">{t.citizenDashboardTitle}</h1>
          <p className="text-xs text-slate-500 mt-1">
            {user ? (
              <>
                {language === 'hi' ? 'लॉग इन उपयोगकर्ता: ' : 'Logged in as '}
                <span className="text-indigo-600 font-semibold">{user.name}</span>
                {user.ward ? ` (${tWard(user.ward)})` : ''}
              </>
            ) : (
              <span>{t.citizenDashboardSubtitle}</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onOpenVoiceModal && (
            <button
              onClick={onOpenVoiceModal}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-200/50 transition cursor-pointer"
            >
              <Mic className="w-4 h-4 text-emerald-100 animate-pulse" />
              <span>{language === 'hi' ? '🎙️ बोलकर शिकायत करें' : '🎙️ Speak to Report'}</span>
            </button>
          )}

          <button
            onClick={onOpenReportModal}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-200/50 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t.reportNewIssue}</span>
          </button>
        </div>
      </div>

      {/* Verification Required Banner (If any) */}
      {verificationRequiredCount > 0 && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50/80 border border-amber-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-700 border border-amber-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {verificationRequiredCount} {t.awaitingVerificationBanner}
              </h3>
              <p className="text-xs text-slate-600">
                {t.awaitingVerificationDesc}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('verification')}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-sm shadow-amber-600/20 cursor-pointer"
          >
            {t.reviewEvidenceNow}
          </button>
        </div>
      )}

      {/* Tabs and Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.allReportsTab} ({complaints.length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
              activeTab === 'active'
                ? 'bg-amber-600 text-white font-bold shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.activeEnrouteTab} (
            {complaints.filter((c) => ['SUBMITTED', 'AI_ANALYZED', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED'].includes(c.status)).length}
            )
          </button>
          <button
            onClick={() => setActiveTab('verification')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
              activeTab === 'verification'
                ? 'bg-orange-600 text-white font-bold shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.verifyCleanlinessTab} ({verificationRequiredCount})
          </button>
          <button
            onClick={() => setActiveTab('resolved')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
              activeTab === 'resolved'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.resolvedClosedTab} ({complaints.filter((c) => c.status === 'RESOLVED').length})
          </button>
          <button
            onClick={() => setActiveTab('reopened')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
              activeTab === 'reopened'
                ? 'bg-rose-600 text-white font-bold shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.reopenedTab} ({complaints.filter((c) => c.status === 'REOPENED').length})
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
          >
            <option value="All">{t.allCategories}</option>
            <option value="Garbage">{tCategory('Garbage')}</option>
            <option value="Sewage">{tCategory('Sewage')}</option>
            <option value="Waterlogging">{tCategory('Waterlogging')}</option>
            <option value="Public toilet">{tCategory('Public toilet')}</option>
            <option value="Construction waste">{language === 'hi' ? 'निर्माण मलबा' : 'Construction Waste'}</option>
            <option value="Plastic waste">{language === 'hi' ? 'प्लास्टिक कचरा' : 'Plastic Waste'}</option>
            <option value="Dead animal waste">{tCategory('Dead animal')}</option>
          </select>
        </div>
      </div>

      {/* Complaints Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-slate-500 space-y-3 bg-white rounded-3xl border border-slate-200/80 shadow-xs">
          <ShieldAlert className="w-8 h-8 mx-auto text-slate-400" />
          <p className="text-sm">{t.noComplaintsFound}</p>
          <button
            onClick={onOpenReportModal}
            className="text-xs text-indigo-600 hover:underline font-bold cursor-pointer"
          >
            + {t.reportNewIssue}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const statusBadge = getStatusBadge(c.status, language);
            const sevBadge = getSeverityBadge(c.severity_score, language);
            const sla = formatTimeRemaining(c.sla_deadline, language);

            return (
              <div
                key={c.id}
                className="p-5 rounded-3xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between space-y-3 shadow-2xs"
              >
                <div className="space-y-2.5">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-extrabold text-indigo-600">{c.complaint_number}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                    >
                      {statusBadge.label}
                    </span>
                  </div>

                  {/* Thumbnail (only if user uploaded/captured a photo) & Description */}
                  <div className="flex items-start gap-3">
                    {c.media?.[0]?.file_url ? (
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                        <img
                          src={c.media[0].file_url}
                          alt="Submitted issue"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 shrink-0 flex flex-col items-center justify-center text-slate-400 p-1 text-center">
                        <ImageOff className="w-4 h-4 mb-0.5 text-slate-300" />
                        <span className="text-[9px] font-semibold leading-tight">
                          {language === 'hi' ? 'बिना फोटो' : 'No Photo'}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wide">{tCategory(c.category)}</span>
                      <p className="text-xs text-slate-900 font-semibold line-clamp-2 mt-0.5 leading-relaxed">{c.description}</p>
                    </div>
                  </div>

                  {/* AI Diagnostic Snippet */}
                  <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-[11px] text-indigo-950 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-indigo-700 font-medium truncate">
                      <Sparkles className="w-3 h-3 shrink-0 text-indigo-600" />
                      {c.ai_summary ? c.ai_summary.slice(0, 48) + '...' : (language === 'hi' ? 'जेमिनी एआई प्राथमिकता विश्लेषित' : 'Gemini AI Priority Analyzed')}
                    </span>
                    <span className={`font-bold shrink-0 ${sevBadge.text}`}>{c.severity_score}/100</span>
                  </div>
                </div>

                {/* Bottom Metadata & Action */}
                <div className="space-y-2 pt-2 border-t border-slate-100 text-[11px]">
                  <div className="flex items-center justify-between gap-2 text-slate-500">
                    <span className="truncate flex items-center gap-1 min-w-0">
                      <MapPin className="w-3 h-3 text-indigo-600 shrink-0" />
                      {c.address}
                    </span>
                    <a
                      href={buildSpotMapUrl(c.latitude, c.longitude, c.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-[10px] text-indigo-600 font-bold hover:underline shrink-0"
                    >
                      <span>{language === 'hi' ? 'स्पॉट मानचित्र' : 'Spot Map'}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>

                  {c.nearest_municipal_center && (
                    <div className="flex items-center gap-1 text-[10px] text-indigo-700 font-semibold truncate">
                      <Building2 className="w-3 h-3 shrink-0 text-indigo-600" />
                      <span className="truncate">
                        {c.nearest_municipal_center.center_name}
                        {c.nearest_municipal_center.distance_km != null ? ` (${c.nearest_municipal_center.distance_km} km)` : ''}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span
                      className={`flex items-center gap-1 font-semibold text-[10px] ${
                        sla.isBreached ? 'text-rose-600 font-bold' : 'text-slate-500'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      {sla.text}
                    </span>

                    <button
                      onClick={() => onOpenTrackModal(c.complaint_number)}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:text-indigo-700 font-bold text-xs transition cursor-pointer shadow-2xs"
                    >
                      {t.viewDetails} →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
