import React, { useState, useRef } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  Sparkles,
  Camera,
  Upload,
  Bot,
  Layers,
  ArrowRight,
  UserCheck,
  Send,
  Loader2,
  X,
  Building2,
  Flame,
  ImageOff,
  ExternalLink,
} from 'lucide-react';
import { Complaint, ComplaintStatus } from '../../types/database';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { dbService } from '../../services/supabase/dbService';
import { geminiClient, VerificationResult } from '../../services/gemini/geminiClient';
import { getStatusBadge, getSeverityBadge, formatTimeRemaining, formatDate } from '../../utils/formatters';
import { buildSpotMapUrl } from '../../utils/geoUtils';

interface OfficerPortalProps {
  complaints: Complaint[];
  onRefresh: () => void;
  onOpenTrackModal: (complaintNumber: string) => void;
}

export const OfficerPortal: React.FC<OfficerPortalProps> = ({ complaints, onRefresh, onOpenTrackModal }) => {
  const { user } = useAuth();
  const { language, t, tStatus, tCategory, tWard } = useLanguage();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedWard, setSelectedWard] = useState('All');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [searchQuery, setSearchQuery] = useState('');

  // Resolution modal state
  const [activeResolvingComplaint, setActiveResolvingComplaint] = useState<Complaint | null>(null);
  const [resolutionPhotoBase64, setResolutionPhotoBase64] = useState<string | null>(null);
  const [resolutionRemarks, setResolutionRemarks] = useState('');
  const [isVerifyingWithGemini, setIsVerifyingWithGemini] = useState(false);
  const [geminiVerification, setGeminiVerification] = useState<VerificationResult | null>(null);
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);

  // Filter complaints
  const filteredComplaints = complaints
    .filter((c) => {
      const matchesSearch =
        c.complaint_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.address.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesWard = selectedWard === 'All' || c.ward === selectedWard;

      let matchesStatus = true;
      if (statusFilter === 'active') {
        matchesStatus = ['SUBMITTED', 'AI_ANALYZED', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED', 'REOPENED'].includes(c.status);
      } else if (statusFilter === 'breached') {
        const sla = formatTimeRemaining(c.sla_deadline, language);
        matchesStatus = sla.isBreached && c.status !== 'RESOLVED';
      } else if (statusFilter === 'resolved') {
        matchesStatus = c.status === 'RESOLVED';
      }

      return matchesSearch && matchesWard && matchesStatus;
    })
    .sort((a, b) => b.severity_score - a.severity_score);

  // Handle direct status change
  const handleUpdateStatus = async (complaintId: string, newStatus: ComplaintStatus, remarks: string) => {
    await dbService.updateComplaintStatus(complaintId, newStatus, user?.name || 'Officer Rajesh', remarks);
    const target = complaints.find((c) => c.id === complaintId);
    showToast({
      type: 'info',
      title: language === 'hi' ? 'कार्यवाही अपडेट हुई!' : 'Squad / Status Updated',
      message: language === 'hi'
        ? `${target?.complaint_number || 'शिकायत'} की स्थिति: ${remarks}`
        : `${target?.complaint_number || 'Complaint'} update: ${remarks}`,
      complaintNumber: target?.complaint_number,
      action: target
        ? {
            label: language === 'hi' ? 'जांचें' : 'View',
            onClick: () => onOpenTrackModal(target.complaint_number),
          }
        : undefined,
    });
    onRefresh();
  };

  // Handle Photo selection for resolution
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      setResolutionPhotoBase64(b64);
    };
    reader.readAsDataURL(file);
  };

  // Run Gemini Resolution Audit
  const handleRunGeminiAudit = async () => {
    if (!activeResolvingComplaint || !resolutionPhotoBase64) return;
    setIsVerifyingWithGemini(true);
    try {
      const res = await geminiClient.verifyResolution({
        complaintNumber: activeResolvingComplaint.complaint_number,
        category: activeResolvingComplaint.category,
        description: activeResolvingComplaint.description,
        afterImageBase64: resolutionPhotoBase64,
      });
      setGeminiVerification(res.verification);
    } catch (e: any) {
      alert((language === 'hi' ? 'जेमिनी सत्यापन त्रुटि: ' : 'Gemini verification error: ') + e.message);
    } finally {
      setIsVerifyingWithGemini(false);
    }
  };

  // Submit Final Resolution Evidence
  const handleSubmitResolution = async () => {
    if (!activeResolvingComplaint || !resolutionPhotoBase64) {
      alert(language === 'hi' ? 'कृपया सफाई के बाद की फोटो अपलोड करें।' : 'Please upload an after-action resolution photo.');
      return;
    }
    setIsSubmittingResolution(true);
    try {
      await dbService.submitResolutionEvidence(
        activeResolvingComplaint.id,
        resolutionPhotoBase64,
        resolutionRemarks || (language === 'hi' ? 'सफाई दल द्वारा स्थल की पूर्ण सफाई व कीटाणुशोधन किया गया।' : 'Sanitation squad completed site clearing and sanitization.'),
        user?.name || 'Inspector Rajesh Sharma',
        geminiVerification?.cleanlinessScore || 92
      );

      showToast({
        type: 'success',
        title: language === 'hi' ? 'सफाई प्रमाण फोटो अपलोड हुई!' : 'Cleanup Photo Uploaded!',
        message: language === 'hi'
          ? `शिकायत संख्या #${activeResolvingComplaint.complaint_number} पर सफाई का प्रमाण दर्ज हुआ। नागरिक सत्यापन के लिए सूचित कर दिया गया है।`
          : `Evidence for #${activeResolvingComplaint.complaint_number} submitted. Citizen notified for final cleanliness sign-off.`,
        complaintNumber: activeResolvingComplaint.complaint_number,
        action: {
          label: language === 'hi' ? 'जांचें' : 'View',
          onClick: () => onOpenTrackModal(activeResolvingComplaint.complaint_number),
        },
      });

      setActiveResolvingComplaint(null);
      setResolutionPhotoBase64(null);
      setGeminiVerification(null);
      setResolutionRemarks('');
      onRefresh();
    } catch (err: any) {
      alert((language === 'hi' ? 'सत्यापन प्रस्तुत करने में विफलता: ' : 'Failed to submit resolution: ') + err.message);
    } finally {
      setIsSubmittingResolution(false);
    }
  };

  const breachedCount = complaints.filter(
    (c) => formatTimeRemaining(c.sla_deadline, language).isBreached && c.status !== 'RESOLVED'
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">{t.officerPortalTitle}</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold">
              {t.fieldSquadBadge}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'hi' ? 'लॉग इन अधिकारी: ' : 'Logged in as '}
            <span className="text-indigo-600 font-semibold">{user?.name || (language === 'hi' ? 'निरीक्षक राजेश' : 'Inspector Rajesh')}</span> •{' '}
            {t.assignedWardLabel}: <span className="text-slate-800 font-semibold">{user?.ward ? tWard(user.ward) : (language === 'hi' ? 'आवंटित क्षेत्र' : 'Assigned Jurisdiction')}</span>
          </p>
        </div>

        {/* SLA Breach Alert Pill */}
        {breachedCount > 0 && (
          <div className="px-4 py-2 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 animate-pulse shadow-xs">
            <Flame className="w-4 h-4 text-rose-600" />
            <span>{breachedCount} {t.criticalBreachAlert}</span>
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {t.activeQueueTab} ({complaints.filter((c) => c.status !== 'RESOLVED').length})
          </button>
          <button
            onClick={() => setStatusFilter('breached')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              statusFilter === 'breached'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            {t.slaBreachedTab} ({breachedCount})
          </button>
          <button
            onClick={() => setStatusFilter('resolved')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              statusFilter === 'resolved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {t.resolvedClosedTab} ({complaints.filter((c) => c.status === 'RESOLVED').length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.filterByIdPlaceholder}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
            />
          </div>

          <select
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
          >
            <option value="All">{t.allWardsOption}</option>
            <option value="Ward 1 - Connaught Place & Central">{tWard('Ward 1 - Connaught Place & Central')}</option>
            <option value="Ward 2 - Chandni Chowk & Old Delhi">{tWard('Ward 2 - Chandni Chowk & Old Delhi')}</option>
            <option value="Ward 3 - Karol Bagh Market Area">{tWard('Ward 3 - Karol Bagh Market Area')}</option>
            <option value="Ward 4 - Lajpat Nagar & South Delhi">{tWard('Ward 4 - Lajpat Nagar & South Delhi')}</option>
            <option value="Ward 5 - Rohini Sector 9-15">{tWard('Ward 5 - Rohini Sector 9-15')}</option>
            <option value="Ward 7 - Shahdara & East Delhi">{tWard('Ward 7 - Shahdara & East Delhi')}</option>
          </select>
        </div>
      </div>

      {/* Task Queue Grid */}
      <div className="space-y-3.5">
        {filteredComplaints.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-2 bg-white rounded-3xl border border-slate-200/80 shadow-xs">
            <ShieldCheck className="w-8 h-8 mx-auto text-slate-400" />
            <p className="text-sm">{t.noTasksInQueue}</p>
          </div>
        ) : (
          filteredComplaints.map((c) => {
            const statusBadge = getStatusBadge(c.status, language);
            const sevBadge = getSeverityBadge(c.severity_score, language);
            const sla = formatTimeRemaining(c.sla_deadline, language);

            return (
              <div
                key={c.id}
                className={`p-5 rounded-3xl border transition-all space-y-3 shadow-2xs ${
                  sla.isBreached && c.status !== 'RESOLVED'
                    ? 'bg-white border-rose-300 ring-1 ring-rose-200 shadow-sm'
                    : 'bg-white border-slate-200/80 hover:border-indigo-300 hover:shadow-md'
                }`}
              >
                {/* Header Line */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-extrabold text-slate-900">{c.complaint_number}</span>
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                    >
                      {statusBadge.label}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ring-1 ${sevBadge.bg} ${sevBadge.text} ${sevBadge.ring}`}
                    >
                      {t.aiSeverityLabel}: {c.severity_score}/100
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5 ${
                        sla.isBreached
                          ? 'bg-rose-50 text-rose-700 border border-rose-200 font-mono'
                          : 'bg-slate-50 text-slate-600 border border-slate-200'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {sla.text}
                    </span>

                    <button
                      onClick={() => onOpenTrackModal(c.complaint_number)}
                      className="text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
                    >
                      {t.inspectBtn}
                    </button>
                  </div>
                </div>

                {/* Content Body */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 text-xs">
                  {/* Photo thumbnail (only when citizen uploaded/captured a photo) */}
                  {c.media?.[0]?.file_url ? (
                    <div className="h-24 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                      <img
                        src={c.media[0].file_url}
                        alt="Citizen reported issue"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-24 rounded-2xl bg-slate-50 border border-slate-200 shrink-0 flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                      <ImageOff className="w-5 h-5 mb-1 text-slate-300" />
                      <span className="text-[10px] font-semibold">
                        {language === 'hi' ? 'नागरिक ने फोटो नहीं दी' : 'No Citizen Photo'}
                      </span>
                    </div>
                  )}

                  {/* Description, Exact Spot & Nearest Municipal Officer Center */}
                  <div className="md:col-span-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">{tCategory(c.category)}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-600 font-medium">{c.subcategory || (language === 'hi' ? 'सामान्य स्वच्छता समस्या' : 'General Issue')}</span>
                    </div>
                    <p className="text-slate-700 text-xs leading-relaxed line-clamp-2 font-medium">{c.description}</p>
                    <div className="flex flex-wrap items-center gap-1.5 text-slate-500 text-[11px] pt-1">
                      <MapPin className="w-3 h-3 text-indigo-600 shrink-0" />
                      <span className="truncate">{c.address}</span>
                      <span className="text-slate-300">|</span>
                      <span className="truncate font-medium">{tWard(c.ward)}</span>
                      <a
                        href={buildSpotMapUrl(c.latitude, c.longitude, c.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-indigo-600 font-bold hover:underline ml-1"
                      >
                        <span>{language === 'hi' ? 'स्पॉट मानचित्र' : 'Spot Map'}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    {c.nearest_municipal_center && (
                      <div className="mt-1 px-2.5 py-1.5 rounded-xl bg-indigo-50/80 border border-indigo-200/80 flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-bold text-indigo-900 flex items-center gap-1 truncate">
                          <Building2 className="w-3 h-3 text-indigo-600 shrink-0" />
                          <span className="truncate">{c.nearest_municipal_center.center_name}</span>
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          {c.nearest_municipal_center.distance_km != null && (
                            <span className="font-mono text-[10px] font-bold text-indigo-700">
                              {c.nearest_municipal_center.distance_km} km
                            </span>
                          )}
                          {(c.nearest_municipal_center.center_latitude || c.nearest_municipal_center.center_address) && (
                            <a
                              href={buildSpotMapUrl(
                                c.nearest_municipal_center.center_latitude,
                                c.nearest_municipal_center.center_longitude,
                                c.nearest_municipal_center.center_address
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 text-[10px] text-indigo-700 font-bold hover:underline"
                            >
                              <span>{language === 'hi' ? 'केंद्र' : 'Office'}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Controls */}
                  <div className="flex flex-col justify-between space-y-2 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{t.workflowActions}</span>

                    {c.status === 'SUBMITTED' || c.status === 'AI_ANALYZED' ? (
                      <button
                        onClick={() => handleUpdateStatus(c.id, 'ASSIGNED', language === 'hi' ? 'वार्ड त्वरित प्रतिक्रिया दल को सौंपा गया' : 'Assigned to Ward Quick Response Squad')}
                        className="w-full py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                      >
                        {t.acceptAssignSquad}
                      </button>
                    ) : c.status === 'ASSIGNED' ? (
                      <button
                        onClick={() => handleUpdateStatus(c.id, 'IN_PROGRESS', language === 'hi' ? 'सफाई दल व उपकरण स्थल पर पहुंचे' : 'Squad and machinery reached spot')}
                        className="w-full py-1.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                      >
                        {t.markInProgress}
                      </button>
                    ) : c.status === 'IN_PROGRESS' || c.status === 'REOPENED' || c.status === 'ESCALATED' ? (
                      <button
                        onClick={() => setActiveResolvingComplaint(c)}
                        className="w-full py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-200 transition cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>{t.uploadResolutionPhoto}</span>
                      </button>
                    ) : c.status === 'RESOLUTION_SUBMITTED' ? (
                      <div className="text-[11px] text-orange-600 font-bold text-center">
                        {t.waitingCitizenVerification}
                      </div>
                    ) : (
                      <div className="text-[11px] text-emerald-600 font-bold text-center flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {t.timelineVerifiedClosed}
                      </div>
                    )}

                    {c.status !== 'RESOLVED' && c.status !== 'RESOLUTION_SUBMITTED' && (
                      <button
                        onClick={() => handleUpdateStatus(c.id, 'ESCALATED', language === 'hi' ? 'भारी मशीनरी / अतिरिक्त दल की मांग' : 'Escalated for heavy excavator / additional squad')}
                        className="text-[10px] text-rose-600 hover:text-rose-700 text-center font-medium cursor-pointer"
                      >
                        {t.requestEscalation}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* RESOLUTION EVIDENCE SUBMISSION MODAL */}
      {activeResolvingComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{t.resolutionEvidenceTitle}</h3>
                  <p className="text-xs text-slate-500 font-mono">ID: {activeResolvingComplaint.complaint_number}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveResolvingComplaint(null);
                  setResolutionPhotoBase64(null);
                  setGeminiVerification(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Original Problem Summary */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{t.reportedIssueLabel}</span>
                <p className="text-slate-800 font-medium">{activeResolvingComplaint.description}</p>
                <p className="text-slate-500 text-[11px]">{t.streetLandmarkLabel}: {activeResolvingComplaint.address}</p>
              </div>

              {/* Upload After Photo */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700">{t.uploadAfterPhotoLabel}</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                    resolutionPhotoBase64
                      ? 'border-emerald-500/50 bg-emerald-50/40'
                      : 'border-slate-300 hover:border-indigo-400 bg-slate-50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  {resolutionPhotoBase64 ? (
                    <div className="relative w-full max-h-48 rounded-xl overflow-hidden flex items-center justify-center">
                      <img
                        src={resolutionPhotoBase64}
                        alt="Resolution Preview"
                        className="max-h-48 object-cover rounded-xl"
                      />
                      <span className="absolute bottom-2 right-2 px-2.5 py-1 text-[10px] font-bold bg-slate-900 text-white rounded-lg shadow-sm">
                        {language === 'hi' ? 'फोटो बदलें' : 'Change Photo'}
                      </span>
                    </div>
                  ) : (
                    <>
                      <Camera className="w-6 h-6 text-indigo-600" />
                      <span className="font-bold text-slate-800">{t.clickToUploadAfterPhoto}</span>
                      <span className="text-slate-500 text-[10px]">{t.photoRequirementHint}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Gemini Visual Verification Button */}
              {resolutionPhotoBase64 && !geminiVerification && (
                <button
                  type="button"
                  onClick={handleRunGeminiAudit}
                  disabled={isVerifyingWithGemini}
                  className="w-full py-2.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isVerifyingWithGemini ? 'animate-spin' : 'text-indigo-600'}`} />
                  <span>
                    {isVerifyingWithGemini
                      ? (language === 'hi' ? 'जेमिनी एआई पहले व बाद की तुलना कर रहा है...' : 'Gemini 3.7 Flash Comparing Before vs After...')
                      : (language === 'hi' ? 'जेमिनी एआई दृश्य ऑडिट चलाएं' : 'Run Gemini AI Visual Audit')}
                  </span>
                </button>
              )}

              {/* Gemini Verification Result */}
              {geminiVerification && (
                <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 border border-slate-800 space-y-2 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      {language === 'hi' ? 'जेमिनी दृश्य ऑडिट परिणाम' : 'Gemini Visual Audit Output'}
                    </span>
                    <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/30 font-bold text-xs">
                      {t.cleanlinessScoreLabel}: {geminiVerification.cleanlinessScore}%
                    </span>
                  </div>
                  <p className="text-slate-200 italic">{geminiVerification.summary}</p>
                  <p className="text-[11px] text-indigo-300">{geminiVerification.advisory}</p>
                </div>
              )}

              {/* Officer Remarks */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t.officerRemarksLabel}</label>
                <textarea
                  rows={2}
                  value={resolutionRemarks}
                  onChange={(e) => setResolutionRemarks(e.target.value)}
                  placeholder={t.officerRemarksPlaceholder}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => {
                  setActiveResolvingComplaint(null);
                  setResolutionPhotoBase64(null);
                  setGeminiVerification(null);
                }}
                className="text-slate-500 hover:text-slate-800 font-semibold text-xs cursor-pointer"
              >
                {t.cancelBtn}
              </button>
              <button
                onClick={handleSubmitResolution}
                disabled={isSubmittingResolution || !resolutionPhotoBase64}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-200 transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingResolution ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t.submittingBtn}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{t.submitNotifyCitizen}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
