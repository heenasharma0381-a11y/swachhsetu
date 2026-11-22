import React, { createContext, useContext, useState, useEffect } from 'react';
import { ComplaintStatus } from '../types/database';

export type Language = 'en' | 'hi';

export interface Translations {
  // Navigation & Header
  appTitle: string;
  appSubtitle: string;
  tagline: string;
  portalName: string;
  home: string;
  citizenPortal: string;
  officerCenter: string;
  commandCenter: string;
  askAiAgent: string;
  predictiveInsights: string;
  reportProblem: string;
  trackComplaint: string;
  trackId: string;
  signIn: string;
  signUp: string;
  signOut: string;
  account: string;
  notifications: string;
  noNotifications: string;
  markAllRead: string;
  
  // Hero & Landing
  heroBadge: string;
  heroTitlePrefix: string;
  heroTitleHighlight: string;
  heroSubtitle: string;
  heroCtaReport: string;
  heroCtaTrack: string;
  heroCtaExplore: string;
  
  // KPI Metrics
  totalReports: string;
  verifiedClean: string;
  criticalHotspots: string;
  avgResolution: string;
  databaseStatus: string;
  verifiedSignOff: string;
  underSlaTimer: string;
  resolutionEfficiency: string;

  // Workflow Steps
  workflowTitle: string;
  workflowSubtitle: string;
  stepObserve: string;
  stepObserveDesc: string;
  stepReason: string;
  stepReasonDesc: string;
  stepDecide: string;
  stepDecideDesc: string;
  stepAct: string;
  stepActDesc: string;
  stepVerify: string;
  stepVerifyDesc: string;

  // Incidents & Live list
  recentIncidents: string;
  recentIncidentsDesc: string;
  viewAll: string;
  trackAction: string;
  score: string;

  // Citizen Dashboard
  citizenDashboardTitle: string;
  citizenDashboardSubtitle: string;
  reportNewIssue: string;
  awaitingVerificationBanner: string;
  awaitingVerificationDesc: string;
  reviewEvidenceNow: string;
  allReportsTab: string;
  activeEnrouteTab: string;
  verifyCleanlinessTab: string;
  resolvedClosedTab: string;
  reopenedTab: string;
  searchPlaceholder: string;
  allCategories: string;
  noComplaintsFound: string;
  noComplaintsFoundDesc: string;
  lodgedOn: string;
  viewDetails: string;
  verifyCleanAction: string;
  reopenAction: string;

  // Modals & Report Form
  reportModalTitle: string;
  reportModalSubtitle: string;
  voiceAssistantTitle: string;
  voiceAssistantDesc: string;
  voiceMicStart: string;
  voiceMicListening: string;
  voiceMicStop: string;
  voiceListeningPrompt: string;
  listenToRecording: string;
  stopVoiceAudio: string;
  problemDescription: string;
  problemPlaceholder: string;
  clearText: string;
  garbagePhotoTitle: string;
  photoOptionalBadge: string;
  takePhotoCamera: string;
  takePhotoSubtext: string;
  uploadFromGallery: string;
  uploadFromGallerySubtext: string;
  snapPhoto: string;
  retakePhoto: string;
  removePhoto: string;
  photoAttachedBadge: string;
  flipCamera: string;
  streetLandmarkLabel: string;
  useMyGps: string;
  locating: string;
  streetPlaceholder: string;
  wardLabel: string;
  possibleDuplicateTitle: string;
  possibleDuplicateDesc: string;
  previewAiDiagnostic: string;
  analyzingWithAi: string;
  aiDiagnosticTitle: string;
  aiSeverityLabel: string;
  categoryLabel: string;
  healthRiskLabel: string;
  routingLabel: string;
  submitComplaintBtn: string;
  submittingBtn: string;
  complaintSuccessTitle: string;
  complaintIdLabel: string;
  returnDashboard: string;
  slaTargetActive: string;
  aiVerifiedEnqueued: string;

  // Complaint Tracker Modal
  trackerTitle: string;
  trackerSubtitle: string;
  trackerModalTitle: string;
  trackerModalSubtitle: string;
  enterComplaintIdPlaceholder: string;
  trackButton: string;
  trackBtn: string;
  quickDemos: string;
  searchingComplaint: string;
  queryingDatabase: string;
  complaintNotFound: string;
  lodgedDate: string;
  lodgedOnLabel: string;
  assignedSquad: string;
  aiTriageDiagnostic: string;
  cleanlinessVerificationTitle: string;
  cleanlinessVerificationSubtitle: string;
  feedbackPlaceholder: string;
  confirmCleanBtn: string;
  verifyCleanBtn: string;
  rejectNotCleanBtn: string;
  verifyNotCleanBtn: string;
  verificationLoggedMsg: string;
  verificationSuccessMsg: string;
  severityBadgePrefix: string;
  liveStatusProgression: string;
  aiConfidenceLabel: string;
  assignedDeptLabel: string;
  assignedOfficerLabel: string;
  beforePhotoLabel: string;
  afterPhotoLabel: string;
  workInProgress: string;
  officerEvidencePending: string;
  verifySatisfactionQuestion: string;
  auditTrailLogs: string;
  closeBtn: string;
  timelineLodged: string;
  timelineAiAnalyzed: string;
  timelineAssigned: string;
  timelineInProgress: string;
  timelineEvidenceUploaded: string;
  timelineVerifiedClosed: string;

  // Officer Portal
  officerPortalTitle: string;
  officerPortalSubtitle: string;
  fieldSquadBadge: string;
  assignedWardLabel: string;
  criticalBreachAlert: string;
  filterByIdPlaceholder: string;
  allWardsOption: string;
  noTasksInQueue: string;
  inspectBtn: string;
  workflowActions: string;
  acceptAssignSquad: string;
  markInProgress: string;
  markInProgressBtn: string;
  uploadResolutionPhoto: string;
  uploadEvidenceBtn: string;
  waitingCitizenVerification: string;
  requestEscalation: string;
  resolutionEvidenceTitle: string;
  reportedIssueLabel: string;
  uploadAfterPhotoLabel: string;
  clickToUploadAfterPhoto: string;
  photoRequirementHint: string;
  cleanlinessScoreLabel: string;
  cancelBtn: string;
  submitNotifyCitizen: string;
  activeQueueTab: string;
  slaBreachedTab: string;
  resolvedTasksTab: string;
  dispatchSquadBtn: string;
  resolutionModalTitle: string;
  resolutionModalSubtitle: string;
  afterCleanupPhotoLabel: string;
  runAiVisualAudit: string;
  analyzingEvidence: string;
  visualAuditPassed: string;
  visualAuditFailed: string;
  officerRemarksLabel: string;
  officerRemarksPlaceholder: string;
  submitFinalResolutionBtn: string;

  // Municipal Command Center
  commandCenterTitle: string;
  commandCenterSubtitle: string;
  superintendentView: string;
  superintendentBadge: string;
  refreshTelemetry: string;
  databaseSchemaAdmin: string;
  activeIncidentsKpi: string;
  activeIncidentsStat: string;
  activeClustersKpi: string;
  activeClustersStat: string;
  criticalBiohazardsKpi: string;
  criticalBiohazardsStat: string;
  slaBreachedKpi: string;
  slaBreachedStat: string;
  resolutionRateKpi: string;
  resolutionRateStat: string;
  incidentHotspotsMapTitle: string;
  incidentHotspotsMapSubtitle: string;
  geospatialMapTitle: string;
  incidentClustersLayer: string;
  activeHotspotsLayer: string;
  resolvedPointsLayer: string;
  mapLegend: string;
  legendCritical: string;
  legendHigh: string;
  legendMedium: string;
  legendResolved: string;
  clusterRiskIndex: string;
  category: string;
  inspectTrackBtn: string;
  wardLeaderboardTitle: string;
  wardLeaderboardSubtitle: string;
  thWardName: string;
  thTotalComplaints: string;
  thResolvedPercent: string;
  thAvgResolution: string;
  thSlaCompliance: string;
  thSanitationGrade: string;
  spatialGroupingDesc: string;
  wardRankingsTitle: string;
  wardRankingsSubtitle: string;
  liveDispatchQueueTitle: string;
  liveDispatchQueueSubtitle: string;

  // SwachhSetu AI Executive Agent
  aiCommandCenterTitle: string;
  aiCommandCenterSubtitle: string;
  welcomeAiGreeting: string;
  suggestedPromptsLabel: string;
  suggestedLabel: string;
  askAiInputPlaceholder: string;
  askAiPlaceholder: string;
  askAiSubmitBtn: string;
  askAiBtn: string;
  readAloudBtn: string;
  readAloud: string;
  stopVoiceBtn: string;
  stopListening: string;
  listeningInPrompt: string;
  doneSpeaking: string;
  speakIn: string;
  aiReasoningLoader: string;
  geminiReasoningDb: string;

  // Predictive Insights
  predictiveTitle: string;
  predictiveSubtitle: string;
  generateNewForecasts: string;
  generatingForecasts: string;
  recommendedPreventiveAction: string;
  confidenceLabel: string;

  // Auth & Roles
  roleCitizen: string;
  roleOfficer: string;
  roleAdmin: string;
  switchPersona: string;
  authModalSignInTitle: string;
  authModalSignUpTitle: string;
  authModalVerifyTitle: string;
  authModalSubtitle: string;
  createAccountTitle: string;
  createAccountSubtitle: string;
  signInTitle: string;
  signInSubtitle: string;
  accountRoleLabel: string;
  municipalWardLabel: string;
  signOutBtn: string;
  enterOtpCode: string;
  verifyingCode: string;
  verifyEmailBtn: string;
  resendEmailIn: string;
  resendConfirmationEmail: string;
  changeEmailBtn: string;
  emailAddressLabel: string;
  passwordLabel: string;
  phoneOptionalLabel: string;
  fullNameLabel: string;
  emailLabel: string;
  phoneLabel: string;
  roleLabel: string;
  jurisdictionWardLabel: string;
  enterCodeLabel: string;
  signInBtn: string;
  signUpBtn: string;
  verifyBtn: string;
  dontHaveAccount: string;
  alreadyHaveAccount: string;
  demoAccountsTitle: string;
  demoAccountsDesc: string;

  // Footer & Statuses
  govCivicNetworkActive: string;
  ministryCivicAuthority: string;
  geminiAiLive: string;

  // Toast Notifications
  toastNewComplaint: string;
  toastStatusUpdated: string;
  toastVerified: string;
  toastView: string;
  detectLocationBtn: string;
  locationDetectedSuccess: string;
  sendConfirmationEmailRegister: string;
  backToSignIn: string;
  signingInAsRole: string;
  signInAction: string;
  stopVoice: string;
}

const enTranslations: Translations = {
  // Navigation & Header
  appTitle: 'SwachhSetu AI',
  appSubtitle: 'Observe • Reason • Decide • Act',
  tagline: 'Autonomous Civic Sanitation Operations',
  portalName: 'National Sanitation Portal',
  home: 'Home',
  citizenPortal: 'Citizen Portal',
  officerCenter: 'Officer Center',
  commandCenter: 'Command Center',
  askAiAgent: 'Ask AI Agent',
  predictiveInsights: 'Predictive Insights',
  reportProblem: 'Report Problem',
  trackComplaint: 'Track Complaint',
  trackId: 'Track ID',
  signIn: 'Sign In',
  signUp: 'Register',
  signOut: 'Sign Out',
  account: 'Account Details',
  notifications: 'Realtime Alerts',
  noNotifications: 'No notifications yet.',
  markAllRead: 'Mark all read',

  // Hero & Landing
  heroBadge: 'National Civic Sanitation Operations • Official Public Portal',
  heroTitlePrefix: 'Turn Every Sanitation Complaint',
  heroTitleHighlight: 'Into Intelligent Action.',
  heroSubtitle: 'SwachhSetu AI uses agentic AI to analyze sanitation issues, calculate severity, route tasks to municipal squads, and verify resolution in real time.',
  heroCtaReport: 'REPORT A PROBLEM',
  heroCtaTrack: 'TRACK COMPLAINT',
  heroCtaExplore: 'EXPLORE DASHBOARD',

  // KPI Metrics
  totalReports: 'Total Reports',
  verifiedClean: 'Verified Clean',
  criticalHotspots: 'Critical Hotspots',
  avgResolution: 'Avg Resolution',
  databaseStatus: 'Active Municipal Database',
  verifiedSignOff: 'Citizen verified sign-off',
  underSlaTimer: 'Under SLA timer',
  resolutionEfficiency: '-54% vs manual triage',

  // Workflow Steps
  workflowTitle: 'How SwachhSetu AI Transforms Civic Sanitation',
  workflowSubtitle: 'From raw citizen photos to verified resolution without bureaucratic bottlenecks.',
  stepObserve: 'OBSERVE',
  stepObserveDesc: 'Citizen captures photo, video and GPS pin. Multimodal input sent directly to municipal portal.',
  stepReason: 'REASON',
  stepReasonDesc: 'Gemini 3.7 Flash analyzes waste volume, biohazard risk, checks nearby duplicates, and updates clusters.',
  stepDecide: 'DECIDE',
  stepDecideDesc: 'Calculates 0-100 priority score, sets strict 6h-48h SLA deadline, and auto-routes to municipal department.',
  stepAct: 'ACT & MONITOR',
  stepActDesc: 'Sanitation squad dispatched with machinery. SLA countdown monitored with automated escalation triggers.',
  stepVerify: 'VERIFY',
  stepVerifyDesc: 'Officer uploads after-cleanup evidence. Gemini visual audit compares state and citizen gives final sign-off.',

  // Incidents & Live list
  recentIncidents: 'Live Civic Sanitation Incidents',
  recentIncidentsDesc: 'Real-time reports being prioritized and processed across municipal wards',
  viewAll: 'View All',
  trackAction: 'Track →',
  score: 'Score',

  // Citizen Dashboard
  citizenDashboardTitle: 'Citizen Sanitation Portal',
  citizenDashboardSubtitle: 'Civic Sanitation Grievance Redressal & Live Municipal Operations',
  reportNewIssue: 'Report New Sanitation Issue',
  awaitingVerificationBanner: 'Complaint(s) Awaiting Your Final Verification',
  awaitingVerificationDesc: 'Municipal officers have submitted resolution photos. Please confirm if the spot is clean!',
  reviewEvidenceNow: 'Review Evidence Now',
  allReportsTab: 'All Reports',
  activeEnrouteTab: 'Active & Enroute',
  verifyCleanlinessTab: 'Verify Cleanliness',
  resolvedClosedTab: 'Resolved & Closed',
  reopenedTab: 'Reopened',
  searchPlaceholder: 'Search by ID, location, or description...',
  allCategories: 'All Categories',
  noComplaintsFound: 'No complaints found',
  noComplaintsFoundDesc: 'Try adjusting your search criteria or report a new issue.',
  lodgedOn: 'Lodged on',
  viewDetails: 'View Details',
  verifyCleanAction: 'Verify Clean',
  reopenAction: 'Reopen',

  // Modals & Report Form
  reportModalTitle: 'Report Sanitation Issue',
  reportModalSubtitle: 'Live Camera, Mic Voice Recording & Agentic AI Triage',
  voiceAssistantTitle: 'Voice Recording Assistant',
  voiceAssistantDesc: 'Speak into microphone — describe the garbage or sanitation problem (No typing needed)',
  voiceMicStart: 'Tap to Speak (English)',
  voiceMicListening: 'Listening... Click here when done speaking',
  voiceMicStop: 'Done Speaking',
  voiceListeningPrompt: 'Listening... speak now (describe location and waste volume)',
  listenToRecording: 'Listen to recorded description',
  stopVoiceAudio: 'Stop audio',
  problemDescription: 'Problem Description',
  problemPlaceholder: 'Speak or type: e.g. "Heavy overflow of garbage near market entrance for 3 days causing foul smell"...',
  clearText: 'Clear',
  garbagePhotoTitle: 'Garbage Area Photo',
  photoOptionalBadge: 'Optional (You can submit without photo)',
  takePhotoCamera: 'Take Live Photo (Camera)',
  takePhotoSubtext: 'Capture photo of waste area',
  uploadFromGallery: 'Upload Photo (Files)',
  uploadFromGallerySubtext: 'From Gallery / Device',
  snapPhoto: 'Snap Photo',
  retakePhoto: 'Retake Photo',
  removePhoto: 'Remove Photo',
  photoAttachedBadge: 'Photo Attached',
  flipCamera: 'Flip Camera',
  streetLandmarkLabel: 'Street / Landmark',
  useMyGps: 'Detect GPS Location',
  locating: 'Locating...',
  streetPlaceholder: 'e.g. Near Gate 3, Chandni Chowk Metro Station',
  wardLabel: 'Municipal Ward',
  possibleDuplicateTitle: 'Possible Existing Incident Nearby',
  possibleDuplicateDesc: 'similar complaints were reported within 400m of this spot. SwachhSetu will automatically link your report.',
  previewAiDiagnostic: 'Preview Gemini AI Diagnostic',
  analyzingWithAi: 'Gemini 3.7 Flash Analyzing Image & Voice...',
  aiDiagnosticTitle: 'Gemini 3.7 Flash Analysis Output',
  aiSeverityLabel: 'Severity',
  categoryLabel: 'Category',
  healthRiskLabel: 'Health Risk',
  routingLabel: 'Department Routing',
  submitComplaintBtn: 'SUBMIT COMPLAINT',
  submittingBtn: 'Submitting Complaint...',
  complaintSuccessTitle: 'Complaint Lodged Successfully!',
  complaintIdLabel: 'Complaint Tracking Number',
  returnDashboard: 'Return to Dashboard',
  slaTargetActive: '6-48 Hours Countdown Active',
  aiVerifiedEnqueued: 'AI Verified & Enqueued',

  // Complaint Tracker Modal
  trackerTitle: 'Complaint Tracking & Citizen Verification',
  trackerSubtitle: 'Real-time status progression, Gemini multimodal diagnostic, and SLA countdown',
  trackerModalTitle: 'Complaint Tracking & Citizen Verification',
  trackerModalSubtitle: 'Real-time status progression, Gemini multimodal diagnostic, and SLA countdown',
  enterComplaintIdPlaceholder: 'Enter complaint ID (e.g. SW-2026-000124)',
  trackButton: 'Track Status',
  trackBtn: 'Track',
  quickDemos: 'Quick Demos',
  searchingComplaint: 'Querying municipal database...',
  queryingDatabase: 'Querying municipal database...',
  complaintNotFound: 'No complaint found matching this tracking ID.',
  lodgedDate: 'Lodged Date',
  lodgedOnLabel: 'Lodged On',
  assignedSquad: 'Assigned Sanitation Squad',
  aiTriageDiagnostic: 'Gemini Multimodal Triage Diagnostic',
  cleanlinessVerificationTitle: 'Citizen Cleanliness Verification',
  cleanlinessVerificationSubtitle: 'Review the after-cleanup evidence photo submitted by municipal field squad',
  feedbackPlaceholder: 'Optional feedback for municipal field squad...',
  confirmCleanBtn: 'Confirm Clean (Approve)',
  verifyCleanBtn: 'Confirm Clean (Approve)',
  rejectNotCleanBtn: 'Still Dirty (Reopen Task)',
  verifyNotCleanBtn: 'Still Dirty (Reopen Task)',
  verificationLoggedMsg: 'Your cleanliness verification has been submitted successfully!',
  verificationSuccessMsg: 'Your cleanliness verification has been submitted successfully!',
  severityBadgePrefix: 'Severity',
  liveStatusProgression: 'Live Status Progression',
  aiConfidenceLabel: 'AI Confidence',
  assignedDeptLabel: 'Assigned Dept',
  assignedOfficerLabel: 'Assigned Officer',
  beforePhotoLabel: 'Before Cleanup',
  afterPhotoLabel: 'After Cleanup (Field Evidence)',
  workInProgress: 'Work In Progress',
  officerEvidencePending: 'Sanitation squad enroute with machinery. Cleanup evidence pending.',
  verifySatisfactionQuestion: 'Has the spot been cleaned to your satisfaction?',
  auditTrailLogs: 'Immutable Audit Trail Logs',
  closeBtn: 'Close',
  timelineLodged: 'Lodged',
  timelineAiAnalyzed: 'AI Analyzed',
  timelineAssigned: 'Assigned',
  timelineInProgress: 'In Progress',
  timelineEvidenceUploaded: 'Evidence Uploaded',
  timelineVerifiedClosed: 'Verified & Closed',

  // Officer Portal
  officerPortalTitle: 'Sanitation Officer Field Operations',
  officerPortalSubtitle: 'Squad dispatch, SLA countdown monitoring, and AI visual cleanup audit',
  fieldSquadBadge: 'FIELD OPERATIONS DISPATCH',
  assignedWardLabel: 'Assigned Ward',
  criticalBreachAlert: 'SLA Breached - Immediate Action Required',
  filterByIdPlaceholder: 'Filter by ID, description, or street...',
  allWardsOption: 'All Delhi Wards',
  noTasksInQueue: 'No pending sanitation tasks in this queue.',
  inspectBtn: 'Inspect & Track',
  workflowActions: 'Workflow Actions',
  acceptAssignSquad: 'Dispatch Squad',
  markInProgress: 'Mark In Progress',
  markInProgressBtn: 'Mark In Progress',
  uploadResolutionPhoto: 'Upload Cleanup Photo',
  uploadEvidenceBtn: 'Upload Cleanup Evidence',
  waitingCitizenVerification: 'Waiting Citizen Verification',
  requestEscalation: 'Request Machine Escalation',
  resolutionEvidenceTitle: 'Submit Resolution Evidence Photo',
  reportedIssueLabel: 'Reported Issue Summary',
  uploadAfterPhotoLabel: 'After-Cleanup Photo',
  clickToUploadAfterPhoto: 'Click to upload after-cleanup photo',
  photoRequirementHint: 'Clear photo showing the garbage spot sanitized',
  cleanlinessScoreLabel: 'Cleanliness Score',
  cancelBtn: 'Cancel',
  submitNotifyCitizen: 'Submit & Notify Citizen',
  activeQueueTab: 'Active Queue',
  slaBreachedTab: 'SLA Breached',
  resolvedTasksTab: 'Resolved Tasks',
  dispatchSquadBtn: 'Dispatch Squad',
  resolutionModalTitle: 'Submit Cleanup Photo',
  resolutionModalSubtitle: 'Attach after-cleanup photo for Gemini visual audit and citizen review',
  afterCleanupPhotoLabel: 'After-Cleanup Photo',
  runAiVisualAudit: 'Run Gemini Visual Cleanliness Audit',
  analyzingEvidence: 'Auditing cleanup quality...',
  visualAuditPassed: 'Visual Audit Passed: Site Cleared',
  visualAuditFailed: 'Visual Audit Incomplete: Residue Detected',
  officerRemarksLabel: 'Officer Remarks & Machinery Used',
  officerRemarksPlaceholder: 'e.g. 2 tipper trucks cleared 4.2 tons of solid waste and sanitized the area.',
  submitFinalResolutionBtn: 'Submit Resolution to Citizen',

  // Municipal Command Center
  commandCenterTitle: 'Municipal Operations Center',
  commandCenterSubtitle: 'Real-time telemetry, spatial incident clustering, and automated multi-ward dispatch monitoring',
  superintendentView: 'SUPERINTENDENT VIEW',
  superintendentBadge: 'SUPERINTENDENT VIEW',
  refreshTelemetry: 'Refresh Telemetry',
  databaseSchemaAdmin: 'Operations Status',
  activeIncidentsKpi: 'Active Incidents',
  activeIncidentsStat: 'Active Incidents',
  activeClustersKpi: 'Active Clusters',
  activeClustersStat: 'Active Clusters',
  criticalBiohazardsKpi: 'Critical Biohazards',
  criticalBiohazardsStat: 'Critical Biohazards',
  slaBreachedKpi: 'SLA Breached',
  slaBreachedStat: 'SLA Breached',
  resolutionRateKpi: 'Resolution Rate',
  resolutionRateStat: 'Resolution Rate',
  incidentHotspotsMapTitle: 'Spatial Incident Hotspots & Ward Clusters',
  incidentHotspotsMapSubtitle: 'Geographic distribution and automated density clusters across Delhi NCR',
  geospatialMapTitle: 'Geospatial Incident & Hotspot Map',
  incidentClustersLayer: 'Density Clusters',
  activeHotspotsLayer: 'Active Hotspots',
  resolvedPointsLayer: 'Cleaned Spots',
  mapLegend: 'Map Legend',
  legendCritical: 'Critical',
  legendHigh: 'High',
  legendMedium: 'Medium',
  legendResolved: 'Cleaned',
  clusterRiskIndex: 'Cluster Risk Index',
  category: 'Category',
  inspectTrackBtn: 'Inspect & Track',
  wardLeaderboardTitle: 'Ward Cleanliness & SLA Compliance Leaderboard',
  wardLeaderboardSubtitle: 'Real-time municipal performance ranking based on SLA turnaround & citizen sign-off',
  thWardName: 'Ward Name',
  thTotalComplaints: 'Total Complaints',
  thResolvedPercent: 'Resolved %',
  thAvgResolution: 'Avg Resolution',
  thSlaCompliance: 'SLA Compliance',
  thSanitationGrade: 'Sanitation Grade',
  spatialGroupingDesc: 'Spatial grouping (400m)',
  wardRankingsTitle: 'Ward Cleanliness & SLA Compliance Performance',
  wardRankingsSubtitle: 'Real-time municipal performance ranking based on SLA turnaround & citizen sign-off',
  liveDispatchQueueTitle: 'Live Dispatch Operations Queue',
  liveDispatchQueueSubtitle: 'Continuous stream of prioritized sanitation tasks',

  // SwachhSetu AI Executive Agent
  aiCommandCenterTitle: 'SwachhSetu AI Operations Copilot',
  aiCommandCenterSubtitle: 'Autonomous Sanitation Operations & Policy Copilot with Voice Support',
  welcomeAiGreeting: 'Hello Commissioner. I am **SwachhSetu AI**, your autonomous sanitation intelligence agent.\n\nI have loaded live telemetry from Delhi administrative wards.\n\nAsk me by typing or clicking the **Microphone** about critical biohazard hotspots, SLA breach risks, tipper fleet dispatch recommendations, or resource allocation optimizations.',
  suggestedPromptsLabel: 'Suggested:',
  suggestedLabel: 'Suggested',
  askAiInputPlaceholder: 'Type or click mic to ask about municipal sanitation operations, trends, or squad allocation...',
  askAiPlaceholder: 'Type or click mic to ask about municipal sanitation operations...',
  askAiSubmitBtn: 'Ask AI',
  askAiBtn: 'Ask AI',
  readAloudBtn: 'Read Aloud',
  readAloud: 'Read Aloud',
  stopVoiceBtn: 'Stop Voice',
  stopListening: 'Stop Listening',
  listeningInPrompt: 'Listening in',
  doneSpeaking: 'Done Speaking',
  speakIn: 'Speak in',
  aiReasoningLoader: 'Gemini 3.7 Flash reasoning over live municipal data...',
  geminiReasoningDb: 'Gemini reasoning over live municipal operations data...',

  // Predictive Insights
  predictiveTitle: 'Predictive Sanitation Analytics & Early Warning',
  predictiveSubtitle: 'Machine intelligence models detecting emerging waste accumulation before citizen escalation',
  generateNewForecasts: 'Generate New AI Forecasts',
  generatingForecasts: 'Analyzing Patterns with Gemini...',
  recommendedPreventiveAction: 'Recommended Preventive Action',
  confidenceLabel: 'Confidence',

  // Auth & Roles
  roleCitizen: 'Citizen',
  roleOfficer: 'Officer',
  roleAdmin: 'Admin',
  switchPersona: 'Switch Active Persona',
  authModalSignInTitle: 'Sign In to SwachhSetu',
  authModalSignUpTitle: 'Create SwachhSetu Account',
  authModalVerifyTitle: 'Verify Your Email Address',
  authModalSubtitle: 'Civic Sanitation Grievance Redressal & Operations',
  createAccountTitle: 'Create Citizen Account',
  createAccountSubtitle: 'Join your local community to report and resolve sanitation issues',
  signInTitle: 'Sign In to SwachhSetu',
  signInSubtitle: 'Enter your registered email to continue',
  accountRoleLabel: 'Account Role',
  municipalWardLabel: 'Your Locality / Ward',
  signOutBtn: 'Sign Out',
  enterOtpCode: 'Enter 6-Digit Confirmation Code',
  verifyingCode: 'Verifying code...',
  verifyEmailBtn: 'Confirm & Sign In',
  resendEmailIn: 'Resend in',
  resendConfirmationEmail: 'Resend Confirmation Code',
  changeEmailBtn: 'Change email',
  emailAddressLabel: 'Email Address',
  passwordLabel: 'Password',
  phoneOptionalLabel: 'Mobile Number (Optional)',
  fullNameLabel: 'Full Name',
  emailLabel: 'Email Address',
  phoneLabel: 'Mobile Number',
  roleLabel: 'User Role / Persona',
  jurisdictionWardLabel: 'Assigned Ward / Jurisdiction',
  enterCodeLabel: '6-Digit Verification Code',
  signInBtn: 'Sign In',
  signUpBtn: 'Create Account',
  verifyBtn: 'Verify Code',
  dontHaveAccount: "Don't have an account? Register",
  alreadyHaveAccount: 'Already have an account? Sign In',
  demoAccountsTitle: 'Quick Demo Personas',
  demoAccountsDesc: 'Switch effortlessly between Citizen, Field Officer, and Municipal Admin roles.',

  // Footer & Statuses
  govCivicNetworkActive: 'Government Civic Network Active',
  ministryCivicAuthority: 'Ministry of Housing & Urban Affairs',
  geminiAiLive: 'Gemini 3.7 AI Live',

  // Toast Notifications
  toastNewComplaint: 'New complaint lodged successfully!',
  toastStatusUpdated: 'Complaint status updated!',
  toastVerified: 'Cleanliness verification confirmed!',
  toastView: 'Track',
  detectLocationBtn: 'Auto-Detect My Location',
  locationDetectedSuccess: 'Location detected successfully!',
  sendConfirmationEmailRegister: 'Create Account & Send Code',
  backToSignIn: 'Back to Sign In',
  signingInAsRole: 'Sign In As',
  signInAction: 'Sign In',
  stopVoice: 'Stop Voice',
};

const hiTranslations: Translations = {
  // Navigation & Header
  appTitle: 'स्वच्छसेतु AI',
  appSubtitle: 'निरीक्षण • विश्लेषण • निर्णय • कार्यवाही',
  tagline: 'स्वायत्त नागरिक स्वच्छता संचालन प्रणाली',
  portalName: 'राष्ट्रीय स्वच्छता पोर्टल',
  home: 'होम',
  citizenPortal: 'नागरिक पोर्टल',
  officerCenter: 'अधिकारी केंद्र',
  commandCenter: 'कमांड सेंटर',
  askAiAgent: 'एआई सहायक',
  predictiveInsights: 'पूर्वानुमान विश्लेषण',
  reportProblem: 'समस्या दर्ज करें',
  trackComplaint: 'शिकायत ट्रैक करें',
  trackId: 'ट्रैक आईडी',
  signIn: 'साइन इन',
  signUp: 'पंजीकरण',
  signOut: 'लॉग आउट',
  account: 'खाता विवरण',
  notifications: 'सूचनाएं',
  noNotifications: 'कोई नई सूचना नहीं है।',
  markAllRead: 'सभी को पढ़ा हुआ चिह्नित करें',

  // Hero & Landing
  heroBadge: 'राष्ट्रीय नागरिक स्वच्छता अभियान • आधिकारिक सार्वजनिक पोर्टल',
  heroTitlePrefix: 'हर स्वच्छता समस्या का',
  heroTitleHighlight: 'त्वरित एवं सटीक समाधान।',
  heroSubtitle: 'स्वच्छसेतु AI नागरिक शिकायतों का विश्लेषण करता है, प्राथमिकता तय करता है, संबंधित विभाग को निर्देशित करता है और वास्तविक समय में समाधान सुनिश्चित करता है।',
  heroCtaReport: 'समस्या दर्ज करें',
  heroCtaTrack: 'शिकायत ट्रैक करें',
  heroCtaExplore: 'डैशबोर्ड देखें',

  // KPI Metrics
  totalReports: 'कुल शिकायतें',
  verifiedClean: 'सत्यापित स्वच्छ',
  criticalHotspots: 'संवेदनशील क्षेत्र',
  avgResolution: 'औसत समाधान समय',
  databaseStatus: 'सक्रिय नगर निगम डेटाबेस',
  verifiedSignOff: 'नागरिक द्वारा सत्यापित समाधान',
  underSlaTimer: 'समय सीमा के भीतर',
  resolutionEfficiency: 'पारंपरिक प्रणाली से 54% तेज',

  // Workflow Steps
  workflowTitle: 'स्वच्छसेतु AI कैसे कार्य करता है',
  workflowSubtitle: 'नागरिक द्वारा फोटो अपलोड करने से लेकर सत्यापित समाधान तक की पूरी प्रक्रिया।',
  stepObserve: 'निरीक्षण',
  stepObserveDesc: 'नागरिक फोटो, वीडियो और जीपीएस लोकेशन दर्ज करते हैं। मल्टीमॉडल इनपुट सीधे नगर निगम को भेजा जाता है।',
  stepReason: 'विश्लेषण',
  stepReasonDesc: 'जेमिनी AI कचरे की मात्रा, जैविक खतरे और डुप्लीकेट शिकायतों का सटीक आकलन करता है।',
  stepDecide: 'निर्णय',
  stepDecideDesc: '0-100 का प्राथमिकता स्कोर और 6-48 घंटे की समय सीमा तय कर विभाग को भेजा जाता है।',
  stepAct: 'कार्यवाही एवं निगरानी',
  stepActDesc: 'स्वच्छता दल मौके पर भेजा जाता है और समय सीमा की स्वचालित निगरानी की जाती है।',
  stepVerify: 'सत्यापन',
  stepVerifyDesc: 'सफाई के बाद की फोटो अपलोड की जाती है और नागरिक द्वारा अंतिम सत्यापन होता है।',

  // Incidents & Live list
  recentIncidents: 'हाल ही में दर्ज स्वच्छता समस्याएं',
  recentIncidentsDesc: 'सभी वार्डों में वास्तविक समय में संसाधित की जा रही शिकायतें',
  viewAll: 'सभी देखें',
  trackAction: 'ट्रैक करें →',
  score: 'स्कोर',

  // Citizen Dashboard
  citizenDashboardTitle: 'नागरिक स्वच्छता पोर्टल',
  citizenDashboardSubtitle: 'नागरिक स्वच्छता शिकायत निवारण एवं लाइव नगर निगम संचालन',
  reportNewIssue: 'नई स्वच्छता समस्या दर्ज करें',
  awaitingVerificationBanner: 'शिकायतें आपके अंतिम सत्यापन की प्रतीक्षा कर रही हैं',
  awaitingVerificationDesc: 'नगर निगम अधिकारियों ने सफाई की फोटो अपलोड की है। कृपया पुष्टि करें कि स्थल साफ हुआ या नहीं!',
  reviewEvidenceNow: 'सफाई की पुष्टि करें',
  allReportsTab: 'सभी शिकायतें',
  activeEnrouteTab: 'प्रगति पर व सक्रिय',
  verifyCleanlinessTab: 'सफाई सत्यापन',
  resolvedClosedTab: 'हल की गई व सत्यापित',
  reopenedTab: 'पुनः खोली गई',
  searchPlaceholder: 'शिकायत नंबर, स्थान या विवरण से खोजें...',
  allCategories: 'सभी श्रेणियां',
  noComplaintsFound: 'कोई शिकायत नहीं मिली',
  noComplaintsFoundDesc: 'कृपया खोज मापदंड बदलें या नई शिकायत दर्ज करें।',
  lodgedOn: 'दर्ज करने की तिथि',
  viewDetails: 'विवरण देखें',
  verifyCleanAction: 'पुष्टि करें',
  reopenAction: 'पुनः खोलें',

  // Modals & Report Form
  reportModalTitle: 'स्वच्छता समस्या दर्ज करें',
  reportModalSubtitle: 'लाइव कैमरा, माइक से बोलकर रिकॉर्डिंग एवं एआई प्राथमिकता निर्धारण',
  voiceAssistantTitle: 'बोलकर शिकायत दर्ज करने का सहायक',
  voiceAssistantDesc: 'माइक दबाकर बोलें — कचरे या गंदगी की समस्या बताएं (टाइप करने की आवश्यकता नहीं)',
  voiceMicStart: 'माइक चालू करें (हिन्दी)',
  voiceMicListening: 'सुन रहे हैं... बोलने के बाद यहाँ क्लिक करें',
  voiceMicStop: 'बोलना समाप्त',
  voiceListeningPrompt: 'सुन रहे हैं... बोलिए (कचरा कहाँ है, कितना बड़ा ढेर है)',
  listenToRecording: 'दर्ज किया गया विवरण सुनें',
  stopVoiceAudio: 'आवाज रोकें',
  problemDescription: 'समस्या का विवरण',
  problemPlaceholder: 'बोलें या लिखें: जैसे "मुख्य बाजार गेट के पास 3 दिन से कचरे का बड़ा ढेर लगा है और भारी दुर्गंध आ रही है"...',
  clearText: 'हटाएं',
  garbagePhotoTitle: 'कचरे के स्थान की फोटो',
  photoOptionalBadge: 'ऐच्छिक (बिना फोटो के भी शिकायत दर्ज कर सकते हैं)',
  takePhotoCamera: 'लाइव फोटो खींचें (कैमरा)',
  takePhotoSubtext: 'कचरे के स्थान की तुरंत फोटो लें',
  uploadFromGallery: 'फोटो अपलोड करें (गैलरी)',
  uploadFromGallerySubtext: 'डिवाइस या गैलरी से चुनें',
  snapPhoto: 'फोटो खींचें',
  retakePhoto: 'दोबारा फोटो लें',
  removePhoto: 'फोटो हटाएं',
  photoAttachedBadge: 'फोटो संलग्न है',
  flipCamera: 'कैमरा बदलें',
  streetLandmarkLabel: 'सड़क / मुख्य स्थल (स्थान)',
  useMyGps: 'जीपीएस लोकेशन प्राप्त करें',
  locating: 'स्थान प्राप्त किया जा रहा है...',
  streetPlaceholder: 'उदा. गेट नंबर 3 के पास, चांदनी चौक मेट्रो स्टेशन',
  wardLabel: 'नगर निगम वार्ड / क्षेत्र',
  possibleDuplicateTitle: 'आसपास पहले से दर्ज समस्या मिली',
  possibleDuplicateDesc: 'इस स्थान के 400 मीटर के भीतर समान शिकायतें पहले से दर्ज हैं। स्वच्छसेतु आपकी शिकायत को इससे जोड़ देगा।',
  previewAiDiagnostic: 'एआई प्रारंभिक विश्लेषण देखें',
  analyzingWithAi: 'जेमिनी एआई द्वारा फोटो व आवाज का विश्लेषण जारी...',
  aiDiagnosticTitle: 'जेमिनी 3.7 फ्लैश विश्लेषण परिणाम',
  aiSeverityLabel: 'गंभीरता स्तर',
  categoryLabel: 'श्रेणी',
  healthRiskLabel: 'स्वास्थ्य जोखिम',
  routingLabel: 'संबंधित विभाग',
  submitComplaintBtn: 'शिकायत दर्ज करें',
  submittingBtn: 'शिकायत भेजी जा रही है...',
  complaintSuccessTitle: 'शिकायत सफलतापूर्वक दर्ज हुई!',
  complaintIdLabel: 'शिकायत ट्रैकिंग नंबर',
  returnDashboard: 'डैशबोर्ड पर वापस जाएं',
  slaTargetActive: '6-48 घंटे की समय सीमा सक्रिय',
  aiVerifiedEnqueued: 'एआई द्वारा सत्यापित व अग्रसारित',

  // Complaint Tracker Modal
  trackerTitle: 'शिकायत ट्रैकिंग एवं सत्यापन',
  trackerSubtitle: 'वास्तविक समय स्थिति, जेमिनी विश्लेषण एवं समय सीमा निगरानी',
  trackerModalTitle: 'शिकायत ट्रैकिंग एवं सत्यापन',
  trackerModalSubtitle: 'वास्तविक समय स्थिति, जेमिनी विश्लेषण एवं समय सीमा निगरानी',
  enterComplaintIdPlaceholder: 'शिकायत नंबर दर्ज करें (उदा. SW-2026-000124)',
  trackButton: 'स्थिति जांचें',
  trackBtn: 'जांचें',
  quickDemos: 'त्वरित डेमो',
  searchingComplaint: 'डेटाबेस में खोज जारी है...',
  queryingDatabase: 'डेटाबेस में खोज जारी है...',
  complaintNotFound: 'इस नंबर से कोई शिकायत नहीं मिली।',
  lodgedDate: 'दर्ज करने की तिथि',
  lodgedOnLabel: 'दर्ज करने की तिथि',
  assignedSquad: 'तैनात स्वच्छता दल',
  aiTriageDiagnostic: 'जेमिनी एआई मल्टीमॉडल विश्लेषण',
  cleanlinessVerificationTitle: 'नागरिक स्वच्छता सत्यापन',
  cleanlinessVerificationSubtitle: 'सफाई दल द्वारा अपलोड की गई सफाई की फोटो की समीक्षा करें',
  feedbackPlaceholder: 'स्वच्छता दल के लिए प्रतिक्रिया (वैकल्पिक)...',
  confirmCleanBtn: 'सफाई की पुष्टि करें (स्वीकृत)',
  verifyCleanBtn: 'सफाई की पुष्टि करें (स्वीकृत)',
  rejectNotCleanBtn: 'अभी भी गंदगी है (पुनः खोलें)',
  verifyNotCleanBtn: 'अभी भी गंदगी है (पुनः खोलें)',
  verificationLoggedMsg: 'आपकी सत्यापन प्रतिक्रिया सफलतापूर्वक दर्ज कर ली गई है!',
  verificationSuccessMsg: 'आपकी सत्यापन प्रतिक्रिया सफलतापूर्वक दर्ज कर ली गई है!',
  severityBadgePrefix: 'गंभीरता',
  liveStatusProgression: 'वास्तविक समय स्थिति प्रगति',
  aiConfidenceLabel: 'एआई विश्वसनीयता',
  assignedDeptLabel: 'संबंधित विभाग',
  assignedOfficerLabel: 'नियुक्त अधिकारी',
  beforePhotoLabel: 'सफाई से पहले की फोटो',
  afterPhotoLabel: 'सफाई के बाद की फोटो (प्रमाण)',
  workInProgress: 'कार्य प्रगति पर है',
  officerEvidencePending: 'स्वच्छता दल मशीनरी के साथ मौके पर है। सफाई प्रमाण प्रतीक्षित है।',
  verifySatisfactionQuestion: 'क्या स्थान आपकी संतुष्टि के अनुसार साफ हो चुका है?',
  auditTrailLogs: 'ऑडिट ट्रेल व कार्य इतिहास',
  closeBtn: 'बंद करें',
  timelineLodged: 'दर्ज हुई',
  timelineAiAnalyzed: 'एआई विश्लेषित',
  timelineAssigned: 'दल नियुक्त',
  timelineInProgress: 'प्रगति पर',
  timelineEvidenceUploaded: 'प्रमाण अपलोड',
  timelineVerifiedClosed: 'सत्यापित व हल',

  // Officer Portal
  officerPortalTitle: 'स्वच्छता अधिकारी संचालन केंद्र',
  officerPortalSubtitle: 'सफाई दलों की तैनाती, समय सीमा निगरानी एवं एआई सफाई सत्यापन',
  fieldSquadBadge: 'फील्ड स्वच्छता दल संचालन',
  assignedWardLabel: 'आवंटित वार्ड',
  criticalBreachAlert: 'समय सीमा पार - तत्काल कार्यवाही आवश्यक',
  filterByIdPlaceholder: 'आईडी, स्थान या विवरण से खोजें...',
  allWardsOption: 'दिल्ली के सभी वार्ड',
  noTasksInQueue: 'इस कतार में कोई लंबित कार्य नहीं है।',
  inspectBtn: 'जांचें व ट्रैक करें',
  workflowActions: 'कार्यवाही विकल्प',
  acceptAssignSquad: 'सफाई दल भेजें',
  markInProgress: 'प्रगति पर दर्ज करें',
  markInProgressBtn: 'प्रगति पर दर्ज करें',
  uploadResolutionPhoto: 'सफाई की फोटो अपलोड करें',
  uploadEvidenceBtn: 'सफाई प्रमाण फोटो अपलोड करें',
  waitingCitizenVerification: 'नागरिक सत्यापन की प्रतीक्षा',
  requestEscalation: 'अतिरिक्त मशीनरी का अनुरोध करें',
  resolutionEvidenceTitle: 'सफाई प्रमाण फोटो अपलोड करें',
  reportedIssueLabel: 'दर्ज समस्या का विवरण',
  uploadAfterPhotoLabel: 'सफाई के बाद की फोटो',
  clickToUploadAfterPhoto: 'सफाई के बाद की फोटो अपलोड करने के लिए क्लिक करें',
  photoRequirementHint: 'स्पष्ट फोटो जिसमें साफ हुआ स्थल दिखाई दे',
  cleanlinessScoreLabel: 'सफाई स्कोर',
  cancelBtn: 'रद्द करें',
  submitNotifyCitizen: 'नागरिक को सूचित करें',
  activeQueueTab: 'सक्रिय कार्य',
  slaBreachedTab: 'समय सीमा पार',
  resolvedTasksTab: 'हल किए गए कार्य',
  dispatchSquadBtn: 'सफाई दल भेजें',
  resolutionModalTitle: 'सफाई प्रमाण फोटो अपलोड करें',
  resolutionModalSubtitle: 'जेमिनी एआई विजुअल ऑडिट के लिए सफाई के बाद की फोटो संलग्न करें',
  afterCleanupPhotoLabel: 'सफाई के बाद की फोटो',
  runAiVisualAudit: 'जेमिनी एआई सफाई गुणवत्ता जांचें',
  analyzingEvidence: 'सफाई गुणवत्ता जांची जा रही है...',
  visualAuditPassed: 'एआई ऑडिट सफल: कचरा पूरी तरह साफ हुआ',
  visualAuditFailed: 'एआई ऑडिट अधूरा: अवशेष पाए गए',
  officerRemarksLabel: 'अधिकारी टिप्पणी व प्रयुक्त वाहन',
  officerRemarksPlaceholder: 'उदा. 2 टिपर ट्रकों द्वारा 4.2 टन कचरा उठाया गया और कीटाणुशोधन किया गया।',
  submitFinalResolutionBtn: 'नागरिक को अंतिम रिपोर्ट भेजें',

  // Municipal Command Center
  commandCenterTitle: 'नगर निगम कमांड एवं संचालन केंद्र',
  commandCenterSubtitle: 'वास्तविक समय टेलीमेट्री, स्थानिक क्लस्टरिंग एवं स्वचालित वार्ड-स्तरीय निगरानी',
  superintendentView: 'अधीक्षक दृश्य',
  superintendentBadge: 'अधीक्षक दृश्य',
  refreshTelemetry: 'डेटा रिफ्रेश करें',
  databaseSchemaAdmin: 'संचालन स्थिति',
  activeIncidentsKpi: 'सक्रिय मामले',
  activeIncidentsStat: 'सक्रिय मामले',
  activeClustersKpi: 'सक्रिय क्लस्टर',
  activeClustersStat: 'सक्रिय क्लस्टर',
  criticalBiohazardsKpi: 'गंभीर जैव जोखिम',
  criticalBiohazardsStat: 'गंभीर जैव जोखिम',
  slaBreachedKpi: 'समय सीमा पार',
  slaBreachedStat: 'समय सीमा पार',
  resolutionRateKpi: 'समाधान दर',
  resolutionRateStat: 'समाधान दर',
  incidentHotspotsMapTitle: 'स्थानिक हॉटस्पॉट एवं वार्ड क्लस्टर मानचित्र',
  incidentHotspotsMapSubtitle: 'दिल्ली एनसीआर में कचरा जमाव का भौगोलिक वितरण और घनत्व क्लस्टर',
  geospatialMapTitle: 'भू-स्थानिक घटना व हॉटस्पॉट मानचित्र',
  incidentClustersLayer: 'घनत्व क्लस्टर',
  activeHotspotsLayer: 'सक्रिय हॉटस्पॉट',
  resolvedPointsLayer: 'सफाई स्थल',
  mapLegend: 'मानचित्र संकेतिका',
  legendCritical: 'गंभीर',
  legendHigh: 'उच्च',
  legendMedium: 'मध्यम',
  legendResolved: 'स्वच्छ',
  clusterRiskIndex: 'क्लस्टर जोखिम सूचकांक',
  category: 'श्रेणी',
  inspectTrackBtn: 'जांचें व ट्रैक करें',
  wardLeaderboardTitle: 'वार्ड स्वच्छता एवं समय सीमा अनुपालन रैंकिंग',
  wardLeaderboardSubtitle: 'त्वरित समाधान और नागरिक प्रतिक्रिया पर आधारित प्रदर्शन रैंकिंग',
  thWardName: 'वार्ड का नाम',
  thTotalComplaints: 'कुल शिकायतें',
  thResolvedPercent: 'हल प्रतिशत',
  thAvgResolution: 'औसत समय',
  thSlaCompliance: 'समय सीमा अनुपालन',
  thSanitationGrade: 'स्वच्छता ग्रेड',
  spatialGroupingDesc: 'स्थानिक समूह (400 मी.)',
  wardRankingsTitle: 'वार्ड स्वच्छता एवं समय सीमा अनुपालन रैंकिंग',
  wardRankingsSubtitle: 'त्वरित समाधान और नागरिक प्रतिक्रिया पर आधारित प्रदर्शन रैंकिंग',
  liveDispatchQueueTitle: 'लाइव संचालन एवं कार्य कतार',
  liveDispatchQueueSubtitle: 'प्राथमिकता के अनुसार स्वच्छता कार्यों की निरंतर सूची',

  // SwachhSetu AI Executive Agent
  aiCommandCenterTitle: 'स्वच्छसेतु AI सहायक',
  aiCommandCenterSubtitle: 'आवाज समर्थन के साथ स्वायत्त स्वच्छता संचालन एवं नीति सलाहकार',
  welcomeAiGreeting: 'नमस्ते। मैं **स्वच्छसेतु AI** हूँ, आपका स्वायत्त स्वच्छता सहायक।\n\nमैंने नगर निगम वार्डों का लाइव डेटा लोड कर लिया है।\n\nआप मुझसे बोलकर या टाइप करके कचरा हॉटस्पॉट, समय सीमा जोखिम या गाड़ियों की तैनाती के बारे में पूछ सकते हैं।',
  suggestedPromptsLabel: 'सुझाए गए प्रश्न:',
  suggestedLabel: 'सुझाए गए',
  askAiInputPlaceholder: 'टाइप करें या माइक दबाकर स्वच्छता संचालन, प्रवृत्तियों या कर्मचारियों की तैनाती के बारे में पूछें...',
  askAiPlaceholder: 'टाइप करें या माइक दबाकर स्वच्छता से संबंधित प्रश्न पूछें...',
  askAiSubmitBtn: 'पूछें',
  askAiBtn: 'पूछें',
  readAloudBtn: 'बोलकर सुनाएं',
  readAloud: 'बोलकर सुनाएं',
  stopVoiceBtn: 'आवाज रोकें',
  stopListening: 'सुनना बंद करें',
  listeningInPrompt: 'सुन रहे हैं',
  doneSpeaking: 'बोलना संपन्न',
  speakIn: 'बोलें',
  aiReasoningLoader: 'जेमिनी लाइव नगर निगम डेटा का विश्लेषण कर रहा है...',
  geminiReasoningDb: 'जेमिनी लाइव संचालन डेटा का विश्लेषण कर रहा है...',

  // Predictive Insights
  predictiveTitle: 'पूर्वानुमान स्वच्छता विश्लेषण एवं चेतावनी प्रणाली',
  predictiveSubtitle: 'नागरिक शिकायत से पहले ही कचरा जमाव के जोखिम की पहचान करने वाले एआई मॉडल',
  generateNewForecasts: 'नए एआई पूर्वानुमान तैयार करें',
  generatingForecasts: 'जेमिनी द्वारा पैटर्न का विश्लेषण जारी...',
  recommendedPreventiveAction: 'अनुशंसित निवारक कार्यवाही',
  confidenceLabel: 'सटीकता स्तर',

  // Auth & Roles
  roleCitizen: 'नागरिक',
  roleOfficer: 'अधिकारी',
  roleAdmin: 'प्रशासक',
  switchPersona: 'उपयोगकर्ता प्रोफाइल बदलें',
  authModalSignInTitle: 'स्वच्छसेतु में साइन इन करें',
  authModalSignUpTitle: 'नया खाता बनाएं',
  authModalVerifyTitle: 'ईमेल सत्यापित करें',
  authModalSubtitle: 'नागरिक स्वच्छता शिकायत निवारण एवं संचालन प्रणाली',
  createAccountTitle: 'नागरिक खाता बनाएं',
  createAccountSubtitle: 'स्वच्छता समस्याओं के समाधान के लिए अपने स्थानीय क्षेत्र से जुड़ें',
  signInTitle: 'स्वच्छसेतु में साइन इन करें',
  signInSubtitle: 'आगे बढ़ने के लिए अपना ईमेल दर्ज करें',
  accountRoleLabel: 'उपयोगकर्ता भूमिका',
  municipalWardLabel: 'आपका स्थानीय क्षेत्र / वार्ड',
  signOutBtn: 'लॉग आउट',
  enterOtpCode: '6 अंकों का सत्यापन कोड दर्ज करें',
  verifyingCode: 'कोड सत्यापित किया जा रहा है...',
  verifyEmailBtn: 'पुष्टि करें और साइन इन करें',
  resendEmailIn: 'पुनः भेजें',
  resendConfirmationEmail: 'पुष्टि कोड पुनः भेजें',
  changeEmailBtn: 'ईमेल बदलें',
  emailAddressLabel: 'ईमेल पता',
  passwordLabel: 'पासवर्ड',
  phoneOptionalLabel: 'मोबाइल नंबर (वैकल्पिक)',
  fullNameLabel: 'पूरा नाम',
  emailLabel: 'ईमेल पता',
  phoneLabel: 'मोबाइल नंबर',
  roleLabel: 'उपयोगकर्ता भूमिका',
  jurisdictionWardLabel: 'संबंधित वार्ड / कार्यक्षेत्र',
  enterCodeLabel: '6 अंकों का सत्यापन कोड',
  signInBtn: 'साइन इन करें',
  signUpBtn: 'खाता बनाएं',
  verifyBtn: 'कोड सत्यापित करें',
  dontHaveAccount: 'खाता नहीं है? पंजीकरण करें',
  alreadyHaveAccount: 'पहले से खाता है? साइन इन करें',
  demoAccountsTitle: 'डेमो प्रोफाइल',
  demoAccountsDesc: 'नागरिक, फील्ड अधिकारी और नगर निगम प्रशासक के बीच आसानी से स्विच करें।',

  // Footer & Statuses
  govCivicNetworkActive: 'सरकारी नागरिक नेटवर्क सक्रिय',
  ministryCivicAuthority: 'आवासन और शहरी कार्य मंत्रालय',
  geminiAiLive: 'जेमिनी 3.7 AI लाइव',

  // Toast Notifications
  toastNewComplaint: 'शिकायत सफलतापूर्वक दर्ज हुई!',
  toastStatusUpdated: 'शिकायत की स्थिति अपडेट हुई!',
  toastVerified: 'सफाई सत्यापन की पुष्टि दर्ज की गई!',
  toastView: 'देखें',
  detectLocationBtn: 'मेरा वर्तमान स्थान पता करें',
  locationDetectedSuccess: 'स्थान का पता सफलतापूर्वक लगाया गया!',
  sendConfirmationEmailRegister: 'खाता बनाएं व कोड भेजें',
  backToSignIn: 'साइन इन पर वापस जाएं',
  signingInAsRole: 'भूमिका के रूप में साइन इन करें',
  signInAction: 'साइन इन करें',
  stopVoice: 'आवाज रोकें',
};

// Helper translation functions for dynamic data (Status, Category, Ward)
export function getLocalizedStatus(status: ComplaintStatus, lang: Language): string {
  if (lang === 'hi') {
    switch (status) {
      case 'SUBMITTED':
        return 'दर्ज हुई';
      case 'AI_ANALYZED':
        return 'एआई विश्लेषित';
      case 'AI_VERIFIED':
        return 'एआई सत्यापित';
      case 'PRIORITIZED':
        return 'प्राथमिकता तय';
      case 'ASSIGNED':
        return 'दल नियुक्त';
      case 'IN_PROGRESS':
        return 'प्रगति पर';
      case 'RESOLUTION_SUBMITTED':
        return 'सत्यापन प्रतीक्षित';
      case 'CITIZEN_VERIFICATION':
        return 'नागरिक सत्यापन';
      case 'RESOLVED':
        return 'सत्यापित व हल';
      case 'REOPENED':
        return 'पुनः खोली गई';
      case 'ESCALATED':
        return 'उच्चाधिकारी प्रेषित';
      default:
        return status;
    }
  }

  switch (status) {
    case 'SUBMITTED':
      return 'Submitted';
    case 'AI_ANALYZED':
      return 'AI Analyzed';
    case 'AI_VERIFIED':
      return 'AI Verified';
    case 'PRIORITIZED':
      return 'Prioritized';
    case 'ASSIGNED':
      return 'Assigned';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'RESOLUTION_SUBMITTED':
      return 'Awaiting Verification';
    case 'CITIZEN_VERIFICATION':
      return 'Citizen Verification';
    case 'RESOLVED':
      return 'Resolved & Verified';
    case 'REOPENED':
      return 'Reopened';
    case 'ESCALATED':
      return 'Escalated';
    default:
      return status;
  }
}

export function getLocalizedCategory(category: string, lang: Language): string {
  if (lang === 'hi') {
    const map: Record<string, string> = {
      'Garbage': 'कचरा ढेर (ठोस कचरा)',
      'Sewage': 'नाली / सीवर जाम',
      'Waterlogging': 'गंदा पानी / जलभराव',
      'Public toilet': 'सार्वजनिक शौचालय सफाई',
      'Dead animal': 'मृत पशु निस्तारण',
      'All': 'सभी श्रेणियां',
    };
    return map[category] || category;
  }
  return category;
}

export function getLocalizedWard(ward: string, lang: Language): string {
  if (lang === 'hi') {
    return ward
      .replace('Ward 1 - Connaught Place & Central', 'कनॉट प्लेस व सेंट्रल (वार्ड 1)')
      .replace('Ward 2 - Chandni Chowk & Old Delhi', 'चांदनी चौक व पुरानी दिल्ली (वार्ड 2)')
      .replace('Ward 3 - Karol Bagh Market Area', 'करोल बाग मार्केट क्षेत्र (वार्ड 3)')
      .replace('Ward 4 - Lajpat Nagar & South Delhi', 'लाजपत नगर व दक्षिण दिल्ली (वार्ड 4)')
      .replace('Ward 5 - Rohini Sector 7 & North', 'रोहिणी सेक्टर 7 (वार्ड 5)')
      .replace('Ward 6 - Dwarka Sector 10 & West', 'द्वारका सेक्टर 10 (वार्ड 6)')
      .replace('Ward 7 - Shahdara & East Delhi', 'शाहदरा व पूर्व दिल्ली (वार्ड 7)')
      .replace('Ward 8 - Saket & Mehrauli', 'साकेत व महरौली (वार्ड 8)')
      .replace('Ward 9 - Pitampura & Rani Bagh', 'पीतमपुरा व रानी बाग (वार्ड 9)')
      .replace('Ward 10 - Janakpuri & Uttam Nagar', 'जनकपुरी व उत्तम नगर (वार्ड 10)')
      .replace('Ward 11 - Mayur Vihar Phase 1', 'मयूर विहार (वार्ड 11)')
      .replace('Ward 12 - Vasant Kunj & Mahipalpur', 'वसंत कुंज (वार्ड 12)');
  }
  return ward;
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: Translations;
  tStatus: (status: ComplaintStatus) => string;
  tCategory: (category: string) => string;
  tWard: (ward: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('swachhsetu_language');
      if (saved === 'hi' || saved === 'en') return saved;
    } catch {}
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('swachhsetu_language', lang);
    } catch {}
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'hi' : 'en');
  };

  const t = language === 'hi' ? hiTranslations : enTranslations;
  const tStatus = (status: ComplaintStatus) => getLocalizedStatus(status, language);
  const tCategory = (category: string) => getLocalizedCategory(category, language);
  const tWard = (ward: string) => getLocalizedWard(ward, language);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        tStatus,
        tCategory,
        tWard,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
