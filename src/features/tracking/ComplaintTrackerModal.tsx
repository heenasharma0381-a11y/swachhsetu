import React, { useState, useEffect } from 'react';
import {
  Compass,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  MapPin,
  Bot,
  Layers,
  Sparkles,
  ArrowRight,
  ThumbsUp,
  RotateCcw,
  X,
  ShieldCheck,
  Eye,
  Check,
  ExternalLink,
} from 'lucide-react';
import { dbService } from '../../services/supabase/dbService';
import { Complaint, ComplaintStatus } from '../../types/database';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { formatTimeRemaining, getStatusBadge, getSeverityBadge, formatDate } from '../../utils/formatters';
import { buildGoogleMapsUrl, buildOsmEmbedUrl, buildSpotMapUrl } from '../../utils/geoUtils';

interface ComplaintTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialComplaintNumber?: string;
  onViewOnMap?: (complaint: Complaint) => void;
}

export const ComplaintTrackerModal: React.FC<ComplaintTrackerModalProps> = ({
  isOpen,
  onClose,
  initialComplaintNumber = '',
  onViewOnMap,
}) => {
  const { language, t, tStatus, tCategory, tWard } = useLanguage();
  const { showToast } = useToast();
  const [searchId, setSearchId] = useState(initialComplaintNumber);
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [recentComplaints, setRecentComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [verificationFeedback, setVerificationFeedback] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [verificationDone, setVerificationDone] = useState(false);

  const fetchComplaint = async (id: string) => {
    if (!id.trim()) {
      setComplaint(null);
      setErrorMsg('');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await dbService.getComplaintByNumber(id.trim());
      if (data) {
        setComplaint(data);
      } else {
        setErrorMsg(
          language === 'hi'
            ? `आईडी "${id}" के साथ कोई शिकायत नहीं मिली। कृपया सही शिकायत संख्या दर्ज करें।`
            : `No complaint found with identifier "${id}". Please verify your complaint number.`
        );
        setComplaint(null);
      }
    } catch (e: any) {
      setErrorMsg(e.message || (language === 'hi' ? 'डेटाबेस क्वेरी विफल रही।' : 'Failed to query database.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      dbService.getComplaints().then((list) => {
        setRecentComplaints(list.slice(0, 3));
        const targetId = initialComplaintNumber || list[0]?.complaint_number || '';
        setSearchId(targetId);
        if (targetId) {
          fetchComplaint(targetId);
        } else {
          setComplaint(null);
          setErrorMsg('');
        }
      });
    }
  }, [isOpen, initialComplaintNumber]);

  if (!isOpen) return null;

  const handleVerify = async (isApproved: boolean) => {
    if (!complaint) return;
    setIsSubmittingFeedback(true);
    try {
      await dbService.submitVerification(
        complaint.id,
        complaint.citizen_id,
        isApproved,
        verificationFeedback ||
          (isApproved
            ? language === 'hi'
              ? 'नागरिक ने स्वच्छता सत्यापित की।'
              : 'Citizen verified clean.'
            : language === 'hi'
            ? 'अभी भी कचरा/गंदगी मौजूद है।'
            : 'Still blocked / not clean.'),
        5
      );
      setVerificationDone(true);
      await fetchComplaint(complaint.complaint_number);

      showToast({
        type: isApproved ? 'success' : 'alert',
        title: isApproved
          ? (language === 'hi' ? 'सफाई सत्यापन स्वीकृत!' : 'Cleanliness Verified!')
          : (language === 'hi' ? 'कार्य पुनः खोला गया!' : 'Task Reopened!'),
        message: isApproved
          ? (language === 'hi'
              ? `शिकायत संख्या #${complaint.complaint_number} को नागरिकों द्वारा 'सत्यापित व हल' चिह्नित किया गया है।`
              : `Complaint #${complaint.complaint_number} verified clean by citizen and officially closed.`)
          : (language === 'hi'
              ? `शिकायत संख्या #${complaint.complaint_number} पर अतिरिक्त सफाई दल रवाना करने हेतु कार्य पुनः खोला गया।`
              : `Complaint #${complaint.complaint_number} reopened for immediate squad re-dispatch.`),
        complaintNumber: complaint.complaint_number,
      });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const statusBadge = complaint ? getStatusBadge(complaint.status, language) : null;
  const slaInfo = complaint ? formatTimeRemaining(complaint.sla_deadline, language) : null;
  const sevBadge = complaint ? getSeverityBadge(complaint.severity_score, language) : null;

  const timelineSteps: { key: ComplaintStatus; label: string }[] = [
    { key: 'SUBMITTED', label: t.timelineLodged },
    { key: 'AI_ANALYZED', label: t.timelineAiAnalyzed },
    { key: 'ASSIGNED', label: t.timelineAssigned },
    { key: 'IN_PROGRESS', label: t.timelineInProgress },
    { key: 'RESOLUTION_SUBMITTED', label: t.timelineEvidenceUploaded },
    { key: 'RESOLVED', label: t.timelineVerifiedClosed },
  ];

  const currentStepIndex = complaint
    ? timelineSteps.findIndex((s) => s.key === complaint.status) !== -1
      ? timelineSteps.findIndex((s) => s.key === complaint.status)
      : complaint.status === 'CITIZEN_VERIFICATION'
      ? 4
      : complaint.status === 'REOPENED' || complaint.status === 'ESCALATED'
      ? 3
      : 2
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base font-display">{t.trackerModalTitle}</h3>
              <p className="text-xs text-slate-500">{t.trackerModalSubtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-slate-50/60 border-b border-slate-100">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchComplaint(searchId);
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder={t.enterComplaintIdPlaceholder}
                className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{t.trackBtn}</span>
            </button>
          </form>

          {/* Real Recent Complaints Quick-Select */}
          {recentComplaints.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-500 font-medium">
              <span>{language === 'hi' ? 'हाल की शिकायतें:' : 'Recent reports:'}</span>
              {recentComplaints.map((rc) => (
                <button
                  key={rc.id}
                  onClick={() => {
                    setSearchId(rc.complaint_number);
                    fetchComplaint(rc.complaint_number);
                  }}
                  className="text-indigo-600 hover:underline font-mono font-semibold cursor-pointer"
                >
                  {rc.complaint_number} ({tCategory(rc.category)})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {isLoading && (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">{t.queryingDatabase}</p>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {errorMsg}
            </div>
          )}

          {!isLoading && complaint && (
            <>
              {/* Primary Header Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-base font-extrabold text-slate-900">{complaint.complaint_number}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusBadge?.bg} ${statusBadge?.text} ${statusBadge?.border}`}
                    >
                      {statusBadge?.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-xs font-bold ring-1 ${sevBadge?.bg} ${sevBadge?.text} ${sevBadge?.ring}`}
                    >
                      {t.severityBadgePrefix}: {complaint.severity_score}/100
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-xs font-bold flex items-center gap-1 ${
                        slaInfo?.isBreached
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      {slaInfo?.text}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed font-medium">{complaint.description}</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-slate-500 border-t border-slate-200">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="truncate font-semibold text-slate-700">{complaint.address}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={buildSpotMapUrl(complaint.latitude, complaint.longitude, complaint.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-[11px] font-bold text-indigo-600 hover:underline"
                      >
                        <span>{language === 'hi' ? 'स्पॉट मानचित्र' : 'Open Spot Map'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{tWard(complaint.ward)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{t.lodgedOnLabel}: {formatDate(complaint.created_at, language)}</span>
                  </div>
                </div>

                {/* Live Interactive Spot Map Preview */}
                {(() => {
                  const embedUrl = buildOsmEmbedUrl(complaint.latitude, complaint.longitude, 0.008);
                  if (!embedUrl) return null;
                  return (
                    <div className="mt-2 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                      <div className="px-3 py-1.5 bg-white border-b border-slate-200 flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span className="truncate">
                            {complaint.address} ({complaint.latitude.toFixed(4)}, {complaint.longitude.toFixed(4)})
                          </span>
                        </span>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <a
                            href={buildSpotMapUrl(complaint.latitude, complaint.longitude, complaint.address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 font-bold hover:underline inline-flex items-center gap-0.5"
                          >
                            <span>OSM</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                          <a
                            href={buildGoogleMapsUrl(complaint.latitude, complaint.longitude, complaint.address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-0.5"
                          >
                            <span>Google Maps</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                      <iframe
                        title={`Spot Map - ${complaint.complaint_number}`}
                        src={embedUrl}
                        className="w-full h-44 border-0"
                        loading="lazy"
                      />
                    </div>
                  );
                })()}
              </div>

              {/* Status Timeline */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.liveStatusProgression}</h4>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs">
                  <div className="grid grid-cols-6 gap-1 relative">
                    {timelineSteps.map((step, idx) => {
                      const isCompleted = idx <= currentStepIndex;
                      const isCurrent = idx === currentStepIndex;
                      return (
                        <div key={step.key} className="flex flex-col items-center text-center">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                              isCurrent
                                ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-sm'
                                : isCompleted
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white text-slate-400 border border-slate-200'
                            }`}
                          >
                            {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                          </div>
                          <span
                            className={`text-[10px] mt-1 font-medium leading-tight ${
                              isCurrent ? 'text-indigo-600 font-bold' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Gemini AI Diagnostics Card */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    {language === 'hi' ? 'जेमिनी 3.7 मल्टीमॉडल निदान' : 'Gemini 3.7 Flash Multimodal Diagnostic'}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-lg border border-indigo-200">
                    {t.aiConfidenceLabel}: {Math.round((complaint.ai_confidence || 0.93) * 100)}%
                  </span>
                </div>

                <p className="text-xs text-slate-700 italic bg-white/80 p-3 rounded-xl border border-indigo-100 leading-relaxed font-medium">
                  "{complaint.ai_summary || (language === 'hi' ? 'जेमिनी ने नागरिक स्वच्छता समस्या सत्यापित की।' : 'Gemini verified civic sanitation breakdown requiring targeted machinery dispatch.')}"
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white border border-indigo-100">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">{t.categoryLabel}</span>
                    <span className="font-bold text-slate-800">{tCategory(complaint.category)}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-indigo-100">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">{t.healthRiskLabel}</span>
                    <span className="font-bold text-amber-700">{complaint.health_risk || 'Medium'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-indigo-100">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">{t.assignedDeptLabel}</span>
                    <span className="font-bold text-indigo-700 truncate block">
                      {complaint.recommended_department || (language === 'hi' ? 'स्वच्छता विभाग' : 'Sanitation Dept')}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-indigo-100">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">{t.assignedOfficerLabel}</span>
                    <span className="font-bold text-emerald-700 truncate block">
                      {complaint.assigned_officer_name ||
                        (language === 'hi' ? 'अधिकारी केंद्र को भेजा गया' : 'Pending Officer Pickup')}
                    </span>
                  </div>
                </div>

                {/* Nearest Municipal Corporation Officer Center Card */}
                {complaint.nearest_municipal_center && (
                  <div className="p-3 rounded-xl bg-white border border-indigo-200/80 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        {language === 'hi'
                          ? 'संबंधित निकटतम नगर निगम अधिकारी केंद्र'
                          : 'Assigned Nearest Municipal Corporation Officer Center'}
                      </span>
                      {complaint.nearest_municipal_center.distance_km != null && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold">
                          {complaint.nearest_municipal_center.distance_km} km
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-slate-900">{complaint.nearest_municipal_center.center_name}</p>
                    <p className="text-[11px] text-slate-600">{complaint.nearest_municipal_center.center_address}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10px] text-slate-500">
                      <span>
                        {language === 'hi' ? 'हेल्पलाइन: ' : 'Civic Helpline: '}
                        <strong className="text-slate-800">{complaint.nearest_municipal_center.helpline || '1969'}</strong>
                        {complaint.nearest_municipal_center.contact_phone && (
                          <> • {complaint.nearest_municipal_center.contact_phone}</>
                        )}
                      </span>
                      {(complaint.nearest_municipal_center.center_latitude ||
                        complaint.nearest_municipal_center.center_address) && (
                        <a
                          href={buildSpotMapUrl(
                            complaint.nearest_municipal_center.center_latitude,
                            complaint.nearest_municipal_center.center_longitude,
                            complaint.nearest_municipal_center.center_address
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-600 font-bold hover:underline"
                        >
                          <span>{language === 'hi' ? 'केंद्र का स्थान देखें' : 'Open Center Map'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Real Uploaded Photos (rendered ONLY when citizen or field officer uploaded an image) */}
              {(complaint.media?.[0]?.file_url || complaint.resolution_evidence_url) && (
                <div
                  className={`grid grid-cols-1 ${
                    complaint.media?.[0]?.file_url && complaint.resolution_evidence_url ? 'sm:grid-cols-2' : ''
                  } gap-3`}
                >
                  {complaint.media?.[0]?.file_url && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-rose-500" /> {t.beforePhotoLabel}
                      </span>
                      <div className="h-44 rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 relative flex items-center justify-center p-2">
                        <img
                          src={complaint.media[0].file_url}
                          alt="Citizen uploaded issue"
                          className="w-full h-full object-cover rounded-xl"
                        />
                      </div>
                    </div>
                  )}

                  {complaint.resolution_evidence_url && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> {t.afterPhotoLabel}
                      </span>
                      <div className="h-44 rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 relative flex items-center justify-center p-2">
                        <img
                          src={complaint.resolution_evidence_url}
                          alt="After sanitation resolution"
                          className="w-full h-full object-cover rounded-xl"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Citizen Verification Section (Interactive) */}
              {complaint.status === 'RESOLUTION_SUBMITTED' && !verificationDone && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                    {t.verifySatisfactionQuestion}
                  </div>

                  <input
                    type="text"
                    value={verificationFeedback}
                    onChange={(e) => setVerificationFeedback(e.target.value)}
                    placeholder={t.feedbackPlaceholder}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
                  />

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={() => handleVerify(true)}
                      disabled={isSubmittingFeedback}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-200 transition cursor-pointer"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{t.verifyCleanBtn}</span>
                    </button>
                    <button
                      onClick={() => handleVerify(false)}
                      disabled={isSubmittingFeedback}
                      className="flex-1 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{t.verifyNotCleanBtn}</span>
                    </button>
                  </div>
                </div>
              )}

              {verificationDone && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {t.verificationSuccessMsg}
                </div>
              )}

              {/* Status History Log */}
              {complaint.status_history && complaint.status_history.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {t.auditTrailLogs}
                  </h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {complaint.status_history.map((sh) => (
                      <div
                        key={sh.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-start justify-between gap-2"
                      >
                        <div>
                          <span className="font-bold text-slate-900">{tStatus(sh.status)}</span>
                          <span className="text-slate-500 text-[11px]"> • {sh.changed_by_name || sh.changed_by}</span>
                          <p className="text-slate-600 text-[11px] mt-0.5">{sh.remarks}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">{formatDate(sh.created_at, language)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            {language === 'hi' ? 'स्थिति: लाइव डेटाबेस कनेक्टेड' : 'Status: Connected to Database'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer shadow-2xs"
          >
            {t.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
