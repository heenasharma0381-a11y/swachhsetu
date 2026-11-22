import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  X,
  Shield,
  CheckCircle2,
  ArrowRight,
  Send,
  RefreshCw,
  Inbox,
  AlertTriangle,
  KeyRound,
  Sparkles,
  LogOut,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { useAuth, EmailDispatchRecord } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { UserRole } from '../types/database';
import { INITIAL_WARDS } from '../data/initialDemoData';
import {
  DELHI_COMMUNITY_LOCALITIES,
  getExactCurrentPosition,
  reverseGeocodeExactLocation,
} from '../utils/geoUtils';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup' | 'verify';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'signin' }) => {
  const {
    user,
    login,
    signUp,
    verifyEmailCode,
    resendVerificationEmail,
    sendPasswordResetEmail,
    resetPasswordWithCode,
    logout,
    pendingVerification,
    lastDispatchedEmail,
  } = useAuth();
  const { language, t, tWard } = useLanguage();

  const [mode, setMode] = useState<'signin' | 'signup' | 'verify' | 'forgot'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('citizen');
  const [ward, setWard] = useState('');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showEmailInboxPreview, setShowEmailInboxPreview] = useState(true);

  const handleAutoDetectLocation = async () => {
    if (!navigator.geolocation) {
      setFeedbackError(language === 'hi' ? 'ब्राउज़र में जीपीएस समर्थित नहीं है।' : 'Geolocation not supported by browser.');
      return;
    }
    setIsDetectingLocation(true);
    try {
      const pos = await getExactCurrentPosition(8000);
      const resolved = await reverseGeocodeExactLocation(pos.coords.latitude, pos.coords.longitude, language);
      setWard(resolved.ward);
      setFeedbackSuccess(
        language === 'hi'
          ? `📍 आपका सटीक क्षेत्र पहचाना गया: ${resolved.areaName}`
          : `📍 Exact area identified: ${resolved.areaName}`
      );
    } catch {
      setFeedbackError(
        language === 'hi'
          ? 'जीपीएस स्थान प्राप्त नहीं हुआ। कृपया सूची से क्षेत्र चुनें।'
          : 'Could not detect location. Please select from the list.'
      );
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // Sync initial mode
  useEffect(() => {
    if (isOpen) {
      setFeedbackError(null);
      setFeedbackSuccess(null);
      if (pendingVerification) {
        setMode('verify');
        setEmail(pendingVerification.email);
        setVerificationCode(pendingVerification.code);
      } else if (!user) {
        setMode(initialMode);
      }
    }
  }, [isOpen, initialMode, pendingVerification, user]);

  // Resend cooldown timer
  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown((prev) => Math.max(0, prev - 1)), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError(null);
    if (!email.trim()) {
      setFeedbackError(language === 'hi' ? 'कृपया साइन इन करने के लिए अपना ईमेल दर्ज करें।' : 'Please enter your email address to sign in.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await login(email.trim(), role);
      if (res.success) {
        setFeedbackSuccess(language === 'hi' ? 'सफलतापूर्वक साइन इन हुआ!' : 'Signed in successfully!');
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setFeedbackError(res.message || (language === 'hi' ? 'साइन इन करने में असमर्थ। कृपया क्रेडेंशियल जांचें।' : 'Unable to sign in. Please verify your credentials.'));
      }
    } catch (err: any) {
      setFeedbackError(err?.message || (language === 'hi' ? 'प्रमाणीकरण त्रुटि।' : 'Authentication error.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError(null);
    if (!name.trim() || !email.trim()) {
      setFeedbackError(language === 'hi' ? 'कृपया अपना पूरा नाम और वैध ईमेल दर्ज करें।' : 'Please enter your full name and valid email address.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await signUp({ name, email, phone, role, ward });
      if (res.success) {
        setMode('verify');
        setVerificationCode(res.code);
        setResendCooldown(30);
        setFeedbackSuccess(language === 'hi' ? `${email} पर पुष्टि ईमेल भेजा गया!` : `Confirmation email sent to ${email}!`);
      }
    } catch (err: any) {
      setFeedbackError(err?.message || (language === 'hi' ? 'पंजीकरण विफल।' : 'Registration failed.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError(null);
    if (verificationCode.trim().length < 6) {
      setFeedbackError(language === 'hi' ? 'कृपया 6 अंकों का पुष्टि कोड दर्ज करें।' : 'Please enter the 6-digit confirmation code.');
      return;
    }
    setIsSubmitting(true);
    try {
      const targetEmail = pendingVerification?.email || email;
      const res = await verifyEmailCode(targetEmail, verificationCode.trim());
      if (res.success) {
        setFeedbackSuccess(language === 'hi' ? 'ईमेल सत्यापित! स्वच्छसेतु में आपका स्वागत है।' : 'Email confirmed! Welcome to SwachhSetu AI.');
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setFeedbackError(res.message || (language === 'hi' ? 'अमान्य कोड। कृपया पुनः प्रयास करें।' : 'Invalid confirmation code. Please try again.'));
      }
    } catch (err: any) {
      setFeedbackError(err?.message || (language === 'hi' ? 'सत्यापन त्रुटि।' : 'Verification error.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setFeedbackError(null);
    setIsSubmitting(true);
    try {
      const targetEmail = pendingVerification?.email || email;
      const res = await resendVerificationEmail(targetEmail);
      if (res.success) {
        setVerificationCode(res.code);
        setResendCooldown(30);
        setFeedbackSuccess(language === 'hi' ? `${targetEmail} पर नया सत्यापन ईमेल भेजा गया!` : `New verification email sent to ${targetEmail}!`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError(null);
    if (!email.trim()) {
      setFeedbackError(language === 'hi' ? 'पासवर्ड रीसेट लिंक प्राप्त करने के लिए कृपया ईमेल दर्ज करें।' : 'Please enter your email to receive a password reset link.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await sendPasswordResetEmail(email);
      if (res.success) {
        setFeedbackSuccess(language === 'hi' ? `${email} पर पासवर्ड रीसेट कोड भेजा गया!` : `Password reset code sent to ${email}!`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl relative overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-5 shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shadow-2xs">
              {mode === 'verify' ? (
                <Mail className="w-5 h-5" />
              ) : mode === 'forgot' ? (
                <KeyRound className="w-5 h-5" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 font-display tracking-tight">
                {user
                  ? (language === 'hi' ? 'उपयोगकर्ता प्रोफ़ाइल' : 'User Account & Profile')
                  : mode === 'verify'
                  ? (language === 'hi' ? 'अपना ईमेल सत्यापित करें' : 'Confirm Your Email Address')
                  : mode === 'signup'
                  ? t.createAccountTitle
                  : mode === 'forgot'
                  ? (language === 'hi' ? 'पासवर्ड रीसेट करें' : 'Reset Account Password')
                  : t.signInTitle}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {user
                  ? `${language === 'hi' ? 'सक्रिय सत्र:' : 'Active session:'} ${user.name}`
                  : mode === 'verify'
                  ? (language === 'hi' ? 'ईमेल पर भेजा गया 6 अंकों का पुष्टि कोड दर्ज करें' : 'Enter the 6-digit confirmation code sent to your email')
                  : mode === 'signup'
                  ? t.createAccountSubtitle
                  : mode === 'forgot'
                  ? (language === 'hi' ? 'हम आपके पंजीकृत ईमेल पर रीसेट कोड भेजेंगे' : 'We will send a reset code to your registered email')
                  : t.signInSubtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-4">
          {/* Notifications Feedback */}
          {feedbackError && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{feedbackError}</span>
            </div>
          )}

          {feedbackSuccess && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{feedbackSuccess}</span>
            </div>
          )}

          {/* VIEW: LOGGED IN USER PROFILE */}
          {user ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-xs text-slate-500 font-medium">{language === 'hi' ? 'उपयोगकर्ता' : 'Active User'}</span>
                  <span className="text-xs font-bold text-slate-900">{user.name}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-xs text-slate-500 font-medium">{language === 'hi' ? 'ईमेल पता' : 'Email Address'}</span>
                  <span className="text-xs font-semibold text-indigo-700 font-mono">{user.email}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-xs text-slate-500 font-medium">{t.accountRoleLabel}</span>
                  <span className="text-xs font-bold capitalize px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {user.role === 'citizen' ? t.roleCitizen : user.role === 'officer' ? t.roleOfficer : t.roleAdmin}
                  </span>
                </div>
                {user.ward && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">{t.municipalWardLabel}</span>
                    <span className="text-xs text-slate-700 font-semibold">{tWard(user.ward)}</span>
                  </div>
                )}
              </div>

              {/* Sign Out Action */}
              <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                <button
                  onClick={async () => {
                    await logout();
                    setFeedbackSuccess(language === 'hi' ? 'सफलतापूर्वक साइन आउट हुआ।' : 'Signed out successfully.');
                    setTimeout(() => {
                      setMode('signin');
                    }, 400);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span>{t.signOutBtn}</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  {language === 'hi' ? 'संपन्न' : 'Done'}
                </button>
              </div>
            </div>
          ) : mode === 'verify' ? (
            /* VIEW: EMAIL CONFIRMATION DISPATCH & CODE INPUT */
            <div className="space-y-4">
              {/* Sent Confirmation Banner */}
              <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-indigo-600" />
                    {language === 'hi' ? 'सत्यापन ईमेल भेजा गया' : 'Verification Email Dispatched'}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-indigo-700 px-2 py-0.5 rounded-full bg-white border border-indigo-200">
                    {language === 'hi' ? 'लाइव सिमुलेटर' : 'Live Simulator'}
                  </span>
                </div>
                <p className="text-indigo-800 font-medium">
                  {language === 'hi' ? 'हमने 6 अंकों का पुष्टि कोड भेजा है: ' : 'We have sent a 6-digit confirmation code to '}
                  <strong className="text-slate-900 font-bold">{pendingVerification?.email || email}</strong>.
                </p>
              </div>

              {/* Live Email Inbox Simulator Card */}
              {lastDispatchedEmail && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shadow-2xs">
                  <div className="px-3.5 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700">
                      <Inbox className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{language === 'hi' ? 'स्वच्छसेतु मेल गेटवे' : 'Official SwachhSetu Mail Gateway'} ({lastDispatchedEmail.sentAt})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowEmailInboxPreview(!showEmailInboxPreview)}
                      className="text-[10px] text-indigo-600 font-semibold hover:underline cursor-pointer"
                    >
                      {showEmailInboxPreview ? (language === 'hi' ? 'पूर्वावलोकन छिपाएं' : 'Hide Preview') : (language === 'hi' ? 'ईमेल पूर्वावलोकन देखें' : 'Show Email Preview')}
                    </button>
                  </div>

                  {showEmailInboxPreview && (
                    <div className="p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>
                          <strong>{language === 'hi' ? 'प्रेषक:' : 'From:'}</strong> no-reply@swachhsetu.gov.in
                        </span>
                        <span className="font-mono">{lastDispatchedEmail.sentAt}</span>
                      </div>
                      <div className="text-[11px] text-slate-700 font-semibold">
                        <strong>{language === 'hi' ? 'विषय:' : 'Subject:'}</strong> {lastDispatchedEmail.subject}
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-slate-200 text-slate-800 text-[11px] leading-relaxed whitespace-pre-wrap font-sans">
                        {lastDispatchedEmail.previewBody}
                      </div>
                      {lastDispatchedEmail.code && (
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-slate-500 font-medium">
                            {language === 'hi' ? 'पुष्टि कोड:' : 'Confirmation Code:'}{' '}
                            <strong className="font-mono text-indigo-700 font-black text-sm">
                              {lastDispatchedEmail.code}
                            </strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => setVerificationCode(lastDispatchedEmail.code || '')}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] transition cursor-pointer"
                          >
                            {language === 'hi' ? 'स्वतः कोड भरें' : 'Auto-Fill Code'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* OTP Form */}
              <form onSubmit={handleVerifyEmail} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.enterOtpCode}
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full text-center tracking-[0.4em] font-mono text-xl py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-300 focus:outline-none focus:border-indigo-600 shadow-2xs font-bold"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || verificationCode.length < 6}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? t.verifyingCode : t.verifyEmailBtn}</span>
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || isSubmitting}
                    className="text-indigo-600 hover:text-indigo-700 font-bold disabled:text-slate-400 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                    <span>
                      {resendCooldown > 0 ? `${t.resendEmailIn} ${resendCooldown}s` : t.resendConfirmationEmail}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
                  >
                    {t.changeEmailBtn}
                  </button>
                </div>
              </form>
            </div>
          ) : mode === 'signup' ? (
            /* VIEW: SIGN UP (CREATE ACCOUNT) */
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.fullNameLabel}</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={language === 'hi' ? 'उदा. रमेश कुमार' : 'e.g. Ramesh Kumar'}
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.emailAddressLabel}</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs font-medium"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">
                  {language === 'hi' ? 'इस पते पर एक पुष्टिकरण ओटीपी ईमेल भेजा जाएगा।' : 'A verification confirmation email with an OTP code will be sent to this address.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.passwordLabel}</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.phoneOptionalLabel}</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">{t.municipalWardLabel}</label>
                  <button
                    type="button"
                    onClick={handleAutoDetectLocation}
                    disabled={isDetectingLocation}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{isDetectingLocation ? (language === 'hi' ? 'खोज रहे हैं...' : 'Detecting...') : (language === 'hi' ? '📍 मेरा स्थान पता करें' : '📍 Auto-Detect Area')}</span>
                  </button>
                </div>

                {/* Quick 1-Tap Chips */}
                <div className="flex flex-wrap gap-1">
                  {DELHI_COMMUNITY_LOCALITIES.slice(0, 6).map((loc) => (
                    <button
                      key={loc.ward}
                      type="button"
                      onClick={() => setWard(loc.ward)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
                        ward === loc.ward
                          ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {language === 'hi' ? loc.nameHi : loc.nameEn}
                    </button>
                  ))}
                </div>

                <select
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs font-medium cursor-pointer"
                >
                  <option value="">
                    {language === 'hi' ? 'वार्ड / शहर चुनें (वैकल्पिक)' : 'Select Ward / Area (Optional)'}
                  </option>
                  {!INITIAL_WARDS.some((w) => w.name === ward) && ward && (
                    <option value={ward}>{ward}</option>
                  )}
                  {INITIAL_WARDS.map((w) => (
                    <option key={w.id} value={w.name}>
                      {tWard(w.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.accountRoleLabel}</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('citizen')}
                    className={`py-2 px-1 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      role === 'citizen'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {t.roleCitizen}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('officer')}
                    className={`py-2 px-1 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      role === 'officer'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {t.roleOfficer}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`py-2 px-1 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      role === 'admin'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {t.roleAdmin}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition mt-2 cursor-pointer"
              >
                <span>{isSubmitting ? (language === 'hi' ? 'ईमेल भेजा जा रहा है...' : 'Sending Confirmation Email...') : t.sendConfirmationEmailRegister}</span>
                <Send className="w-3.5 h-3.5" />
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-bold cursor-pointer"
                >
                  {t.alreadyHaveAccount}
                </button>
              </div>
            </form>
          ) : mode === 'forgot' ? (
            /* VIEW: FORGOT PASSWORD */
            <form onSubmit={handleForgotPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{language === 'hi' ? 'पंजीकृत ईमेल पता' : 'Registered Email Address'}</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isSubmitting ? (language === 'hi' ? 'रीसेट कोड भेजा जा रहा है...' : 'Sending Reset Code...') : (language === 'hi' ? 'पासवर्ड रीसेट ईमेल भेजें' : 'Send Password Reset Email')}</span>
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-xs text-slate-600 hover:text-slate-900 font-bold cursor-pointer"
                >
                  ← {t.backToSignIn}
                </button>
              </div>
            </form>
          ) : (
            /* VIEW: SIGN IN */
            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.emailAddressLabel}</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">{t.passwordLabel}</label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[11px] text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer"
                  >
                    {language === 'hi' ? 'भूल गए?' : 'Forgot?'}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.signingInAsRole}</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('citizen')}
                    className={`py-2 px-1 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      role === 'citizen'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {t.roleCitizen}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('officer')}
                    className={`py-2 px-1 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      role === 'officer'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {t.roleOfficer}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`py-2 px-1 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      role === 'admin'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {t.roleAdmin}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition mt-2 cursor-pointer"
              >
                <span>{isSubmitting ? (language === 'hi' ? 'साइन इन हो रहा है...' : 'Signing In...') : t.signInAction}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-bold cursor-pointer"
                >
                  {t.dontHaveAccount}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
