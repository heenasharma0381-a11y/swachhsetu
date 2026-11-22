import React from 'react';
import {
  ShieldAlert,
  Compass,
  Sparkles,
  Bot,
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  MapPin,
  Building2,
  Users,
  Activity,
  Cpu,
  Mic,
} from 'lucide-react';
import { Complaint } from '../../types/database';
import { getStatusBadge, getSeverityBadge, formatTimeRemaining, formatDate } from '../../utils/formatters';
import { useLanguage } from '../../context/LanguageContext';

interface LandingPageProps {
  complaints: Complaint[];
  onOpenReportModal: () => void;
  onOpenTrackModal: (complaintNumber?: string) => void;
  onSelectTab: (tab: string) => void;
  onOpenVoiceModal?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  complaints,
  onOpenReportModal,
  onOpenTrackModal,
  onSelectTab,
  onOpenVoiceModal,
}) => {
  const { language, t, tWard } = useLanguage();
  const totalComplaints = complaints.length;
  const resolvedItems = complaints.filter((c) => c.status === 'RESOLVED');
  const resolvedCount = resolvedItems.length;
  const criticalCount = complaints.filter((c) => c.severity_score >= 85).length;
  const avgResolutionText =
    resolvedCount > 0
      ? `${(
          resolvedItems.reduce(
            (acc, c) =>
              acc + Math.max(0.5, (new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 3600000),
            0
          ) / resolvedCount
        ).toFixed(1)}h`
      : '--';

  const recentReports = complaints.slice(0, 4);

  return (
    <div className="space-y-12 sm:space-y-16 pb-20 w-full max-w-full overflow-hidden">
      {/* HERO SECTION */}
      <section className="relative pt-8 sm:pt-16 pb-8 sm:pb-12 overflow-hidden w-full">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-[500px] h-72 sm:h-[500px] bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center px-4 space-y-5 sm:space-y-6 relative z-10 w-full">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold shadow-2xs max-w-full truncate">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="truncate">{t.heroBadge}</span>
          </div>

          {/* Hero Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 font-display leading-[1.15] break-words">
            {t.heroTitlePrefix} <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-800 bg-clip-text text-transparent">
              {t.heroTitleHighlight}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base lg:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal px-2">
            {t.heroSubtitle}
          </p>

          {/* Action CTAs */}
          <div className="pt-2 sm:pt-4 flex flex-wrap items-center justify-center gap-2.5 sm:gap-4">
            {onOpenVoiceModal && (
              <button
                onClick={onOpenVoiceModal}
                className="px-5 sm:px-8 py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-200/70 transition transform hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer ring-2 ring-emerald-300/40"
              >
                <Mic className="w-4 h-4 text-emerald-100 animate-pulse" />
                <span>{language === 'hi' ? '🎙️ बोलकर शिकायत दर्ज करें (स्थानीय भाषा)' : '🎙️ Speak to Report (Local Voice)'}</span>
              </button>
            )}

            <button
              onClick={onOpenReportModal}
              className="px-5 sm:px-8 py-3 sm:py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-200/60 transition transform hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{t.heroCtaReport}</span>
            </button>

            <button
              onClick={() => onOpenTrackModal(recentReports[0]?.complaint_number || '')}
              className="px-5 sm:px-8 py-3 sm:py-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs sm:text-sm transition flex items-center gap-2 shadow-2xs cursor-pointer"
            >
              <Compass className="w-4 h-4 text-indigo-600" />
              <span>{t.heroCtaTrack}</span>
            </button>

            <button
              onClick={() => onSelectTab('admin')}
              className="px-5 sm:px-8 py-3 sm:py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Activity className="w-4 h-4 text-indigo-400" />
              <span>{t.heroCtaExplore}</span>
            </button>
          </div>

          {/* Live Operational KPIs */}
          <div className="pt-6 sm:pt-10 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 max-w-4xl mx-auto w-full">
            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 text-left shadow-xs min-w-0">
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-widest truncate">{t.totalReports}</span>
              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-display mt-1 block">
                {totalComplaints}
              </span>
              <span className="text-[10px] sm:text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1 truncate">
                <CheckCircle2 className="w-3 h-3 shrink-0" /> {t.databaseStatus}
              </span>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 text-left shadow-xs min-w-0">
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-widest truncate">{t.verifiedClean}</span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-display mt-1 block">
                {resolvedCount}
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-500 mt-1 block font-medium truncate">{t.verifiedSignOff}</span>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 text-left shadow-xs min-w-0">
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-widest truncate">{t.criticalHotspots}</span>
              <span className="text-2xl sm:text-3xl font-black text-rose-600 font-display mt-1 block">
                {criticalCount}
              </span>
              <span className="text-[10px] sm:text-[11px] text-rose-600 mt-1 block font-semibold truncate">{t.underSlaTimer}</span>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 text-left shadow-xs min-w-0">
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-widest truncate">{t.avgResolution}</span>
              <span className="text-2xl sm:text-3xl font-black text-indigo-600 font-display mt-1 block">
                {avgResolutionText}
              </span>
              <span className="text-[10px] sm:text-[11px] text-indigo-600 mt-1 block font-semibold truncate">{t.resolutionEfficiency}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5-STEP AGENTIC OPERATIONS WORKFLOW */}
      <section className="max-w-6xl mx-auto px-4 w-full">
        <div className="text-center space-y-2 mb-8 sm:mb-10">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
            {language === 'hi' ? 'स्वच्छसेतु इंटेलिजेंस' : 'SWACHHSETU INTELLIGENCE'}
          </span>
          <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 font-display">
            {t.workflowTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mx-auto">
            {t.workflowSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-3.5">
          {/* Step 1 */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 relative space-y-2 hover:border-indigo-300 hover:shadow-md transition-all">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-bold text-xs font-mono">
              01
            </div>
            <h3 className="font-bold text-slate-900 text-sm">{t.stepObserve}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t.stepObserveDesc}
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 relative space-y-2 hover:border-indigo-300 hover:shadow-md transition-all">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-bold text-xs font-mono">
              02
            </div>
            <h3 className="font-bold text-slate-900 text-sm">{t.stepReason}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t.stepReasonDesc}
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 relative space-y-2 hover:border-indigo-300 hover:shadow-md transition-all">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-bold text-xs font-mono">
              03
            </div>
            <h3 className="font-bold text-slate-900 text-sm">{t.stepDecide}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t.stepDecideDesc}
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 relative space-y-2 hover:border-indigo-300 hover:shadow-md transition-all">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-bold text-xs font-mono">
              04
            </div>
            <h3 className="font-bold text-slate-900 text-sm">{t.stepAct}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t.stepActDesc}
            </p>
          </div>

          {/* Step 5 */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 relative space-y-2 hover:border-indigo-300 hover:shadow-md transition-all">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-bold text-xs font-mono">
              05
            </div>
            <h3 className="font-bold text-slate-900 text-sm">{t.stepVerify}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t.stepVerifyDesc}
            </p>
          </div>
        </div>
      </section>

      {/* LIVE COMPLAINTS TICKER */}
      <section className="max-w-6xl mx-auto px-4 space-y-4 w-full">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-display flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              {t.recentIncidents}
            </h2>
            <p className="text-xs text-slate-500">{t.recentIncidentsDesc}</p>
          </div>
          <button
            onClick={() => onSelectTab('citizen')}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>{t.viewAll}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentReports.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white border border-slate-200/80 text-center space-y-2 shadow-2xs">
            <p className="text-sm font-bold text-slate-700">
              {language === 'hi'
                ? 'अभी तक कोई लाइव शिकायत दर्ज नहीं की गई है'
                : 'No live complaints submitted yet'}
            </p>
            <p className="text-xs text-slate-500">
              {language === 'hi'
                ? 'सटीक जीपीएस स्थान और निकटतम नगर निगम केंद्र को सीधे सूचित करने के लिए ऊपर दिए गए बटन से शिकायत दर्ज करें।'
                : 'Submit a sanitation report with exact GPS or voice to dispatch directly to your nearest Municipal Corporation Officer Center.'}
            </p>
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
          {recentReports.map((c) => {
            const statusBadge = getStatusBadge(c.status, language);
            const sevBadge = getSeverityBadge(c.severity_score, language);
            const sla = formatTimeRemaining(c.sla_deadline, language);
            return (
              <div
                key={c.id}
                onClick={() => onOpenTrackModal(c.complaint_number)}
                className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between space-y-3 group shadow-2xs min-w-0"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold font-mono text-indigo-600 truncate">{c.complaint_number}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                    >
                      {statusBadge.label}
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 line-clamp-2 leading-relaxed font-semibold">{c.description}</p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 text-[11px]">
                  <div className="flex items-center justify-between text-slate-500 gap-2">
                    <span className="truncate flex items-center gap-1 min-w-0">
                      <MapPin className="w-3 h-3 text-indigo-600 shrink-0" />
                      <span className="truncate">{tWard(c.ward)}</span>
                    </span>
                    <span className={`font-bold shrink-0 ${sevBadge.text}`}>{t.score}: {c.severity_score}</span>
                  </div>

                  <div className="flex items-center justify-between text-[10px]">
                    <span
                      className={`flex items-center gap-1 font-semibold truncate ${
                        sla.isBreached ? 'text-rose-600' : 'text-slate-500'
                      }`}
                    >
                      <Clock className="w-3 h-3 shrink-0" />
                      <span className="truncate">{sla.text}</span>
                    </span>
                    <span className="text-indigo-600 font-semibold group-hover:underline shrink-0">{t.trackAction}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </section>
    </div>
  );
};
