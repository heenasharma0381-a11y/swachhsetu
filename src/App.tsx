import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './features/landing/LandingPage';
import { CitizenDashboard } from './features/citizen/CitizenDashboard';
import { OfficerPortal } from './features/officer/OfficerPortal';
import { CommandCenter } from './features/admin/CommandCenter';
import { AiCommandCenter } from './features/ai/AiCommandCenter';
import { PredictiveInsights } from './features/ai/PredictiveInsights';
import { CitizenReportModal } from './features/citizen/CitizenReportModal';
import { ComplaintTrackerModal } from './features/tracking/ComplaintTrackerModal';
import { VoiceAssistantModal } from './features/voice/VoiceAssistantModal';
import { AuthModal } from './components/AuthModal';
import { dbService } from './services/supabase/dbService';
import { Complaint, IncidentCluster, WardPerformance } from './types/database';
import { INITIAL_COMPLAINTS, INITIAL_CLUSTERS, INITIAL_WARDS } from './data/initialDemoData';

function MainAppContent() {
  const { role } = useAuth();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [clusters, setClusters] = useState<IncidentCluster[]>([]);
  const [wards, setWards] = useState<WardPerformance[]>(() => {
    return INITIAL_WARDS.map((w) => ({
      id: w.id,
      ward_name: w.name,
      total_complaints: 0,
      resolved_complaints: 0,
      active_complaints: 0,
      resolution_rate: 0,
      avg_resolution_hours: 0,
      sla_compliance_rate: 100,
      cleanliness_grade: 'A',
    }));
  });

  // Modals state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('');

  // Load real data from dbService
  const refreshData = async () => {
    try {
      const [compData, clustData, wardData] = await Promise.all([
        dbService.getComplaints(),
        dbService.getIncidentClusters(),
        dbService.getWardPerformance(),
      ]);
      if (Array.isArray(compData)) setComplaints(compData);
      if (Array.isArray(clustData)) setClusters(clustData);
      if (Array.isArray(wardData)) setWards(wardData);
    } catch (e) {
      console.error('Data load error:', e);
    }
  };

  useEffect(() => {
    refreshData();
    const onHealed = () => {
      void refreshData();
    };
    window.addEventListener('swachhsetu-complaints-healed', onHealed);
    const interval = setInterval(refreshData, 15000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('swachhsetu-complaints-healed', onHealed);
    };
  }, []);

  const handleOpenTrackModal = (complaintNumber?: string) => {
    setSelectedTrackId(complaintNumber || complaints[0]?.complaint_number || '');
    setIsTrackModalOpen(true);
  };

  const handleComplaintCreated = (newComplaint: Complaint) => {
    setComplaints((prev) => [newComplaint, ...prev]);
    setSelectedTrackId(newComplaint.complaint_number);
    setIsReportModalOpen(false);
    setIsTrackModalOpen(true);
    refreshData();

    const centerName = newComplaint.nearest_municipal_center?.center_name;
    const distLabel =
      newComplaint.nearest_municipal_center?.distance_km != null
        ? ` (${newComplaint.nearest_municipal_center.distance_km} km)`
        : '';

    // Trigger instant toast alert with real nearest municipal corporation officer center
    showToast({
      type: 'success',
      title: language === 'hi' ? 'शिकायत सफलतापूर्वक दर्ज हुई!' : 'Complaint Lodged Successfully!',
      message: language === 'hi'
        ? `शिकायत #${newComplaint.complaint_number} दर्ज होकर निकटतम केंद्र "${centerName || newComplaint.ward}"${distLabel} को भेज दी गई है।`
        : `Complaint #${newComplaint.complaint_number} registered and sent to nearest municipal center: ${centerName || newComplaint.ward}${distLabel}.`,
      complaintNumber: newComplaint.complaint_number,
      action: {
        label: language === 'hi' ? 'स्थिति देखें' : 'Track Status',
        onClick: () => handleOpenTrackModal(newComplaint.complaint_number),
      },
    });
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#F8FAFC] text-slate-900 flex flex-col selection:bg-indigo-600 selection:text-white font-sans antialiased">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenTrackModal={() => handleOpenTrackModal()}
        onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
      />

      {/* Main Tab Views */}
      <main className="flex-1">
        {currentTab === 'landing' && (
          <LandingPage
            complaints={complaints}
            onOpenReportModal={() => setIsReportModalOpen(true)}
            onOpenTrackModal={handleOpenTrackModal}
            onSelectTab={setCurrentTab}
            onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
          />
        )}

        {currentTab === 'citizen' && (
          <CitizenDashboard
            complaints={complaints}
            onOpenReportModal={() => setIsReportModalOpen(true)}
            onOpenTrackModal={handleOpenTrackModal}
            onRefresh={refreshData}
            onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
          />
        )}

        {currentTab === 'officer' && (
          <OfficerPortal
            complaints={complaints}
            onRefresh={refreshData}
            onOpenTrackModal={handleOpenTrackModal}
          />
        )}

        {currentTab === 'admin' && (
          <CommandCenter
            complaints={complaints}
            clusters={clusters}
            wards={wards}
            onOpenTrackModal={handleOpenTrackModal}
            onRefresh={refreshData}
          />
        )}

        {currentTab === 'ai-command' && (
          <AiCommandCenter
            complaints={complaints}
            clusters={clusters}
            wards={wards}
          />
        )}

        {currentTab === 'predictive' && (
          <PredictiveInsights complaints={complaints} wards={wards} />
        )}
      </main>

      {/* Civic Community Footer */}
      <footer className="py-4 bg-slate-900 text-slate-400 text-xs font-medium flex flex-col sm:flex-row items-center justify-between px-6 sm:px-12 border-t border-slate-800 gap-3 z-20">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"></span>
          <span className="text-slate-300 font-semibold">SwachhSetu — जन स्वच्छता सेतु</span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-slate-400 hidden sm:inline">सामुदायिक स्वच्छता एवं जन शिकायत समाधान</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <span>स्वच्छ भारत मिशन (Urban)</span>
          <span className="text-slate-700">|</span>
          <span className="text-indigo-300 font-medium">हेल्पलाइन: 1969 (Toll Free)</span>
        </div>
      </footer>

      {/* Global Modals */}
      <CitizenReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSuccess={handleComplaintCreated}
      />

      <VoiceAssistantModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSuccessComplaint={handleComplaintCreated}
        onOpenTrackModal={handleOpenTrackModal}
      />

      <ComplaintTrackerModal
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
        initialComplaintNumber={selectedTrackId}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ToastProvider>
          <MainAppContent />
        </ToastProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
