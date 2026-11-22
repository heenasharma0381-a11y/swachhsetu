import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Sparkles,
  Bell,
  User,
  LogOut,
  MapPin,
  Database,
  Bot,
  Activity,
  Layers,
  ChevronDown,
  Compass,
  CheckCircle2,
  AlertTriangle,
  LogIn,
  UserPlus,
  Globe,
  Languages,
  Mic,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { UserRole, AppNotification } from '../types/database';
import { dbService } from '../services/supabase/dbService';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenReportModal: () => void;
  onOpenAuthModal: () => void;
  onOpenTrackModal: () => void;
  onOpenVoiceModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenReportModal,
  onOpenAuthModal,
  onOpenTrackModal,
  onOpenVoiceModal,
}) => {
  const { user, logout } = useAuth();
  const { language, setLanguage, toggleLanguage, t } = useLanguage();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);

  useEffect(() => {
    const fetchNotifs = async () => {
      const data = await dbService.getNotifications(user?.id);
      setNotifications(data);
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    for (const n of notifications) {
      if (!n.read) await dbService.markNotificationRead(n.id);
    }
    const updated = await dbService.getNotifications(user?.id);
    setNotifications(updated);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs text-slate-800 w-full max-w-full">
      {/* Top Status & Telemetry Bar */}
      <div className="bg-slate-50/90 border-b border-slate-200/80 px-3 sm:px-6 lg:px-8 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2 max-w-full overflow-hidden">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 truncate min-w-0">
          <span className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse shrink-0" />
          <span className="text-slate-800 truncate">{t.tagline}</span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span className="text-slate-500 hidden sm:inline">{language === 'hi' ? 'नागरिक सेवा केंद्र' : 'National Sanitation Portal'}</span>
        </div>
        <div className="flex items-center gap-2.5 sm:gap-3 text-xs shrink-0">
          {/* Language Selector in Top Bar */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
            <button
              onClick={() => setLanguage('en')}
              className={`px-2 py-0.5 text-[10px] font-bold rounded transition cursor-pointer ${
                language === 'en'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('hi')}
              className={`px-2 py-0.5 text-[10px] font-bold rounded transition cursor-pointer ${
                language === 'hi'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              हिन्दी
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-slate-600 font-semibold text-[11px]">
            <Bot className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Gemini 3.7 AI</span>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer shrink-0" onClick={() => onSelectTab('landing')}>
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-sm">
              SS
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 font-display">
                  {t.appTitle.split(' ')[0]} <span className="text-indigo-600">{t.appTitle.split(' ')[1] || 'AI'}</span>
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/80 rounded-md">
                  CIVIC
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block tracking-wide">
                {t.appSubtitle}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1 text-xs font-semibold">
            <button
              onClick={() => onSelectTab('landing')}
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'landing'
                  ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {currentTab === 'landing' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
              {t.home}
            </button>
            <button
              onClick={() => onSelectTab('citizen')}
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'citizen'
                  ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {currentTab === 'citizen' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
              {t.citizenPortal}
            </button>
            <button
              onClick={() => onSelectTab('officer')}
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'officer'
                  ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {currentTab === 'officer' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
              {t.officerCenter}
            </button>
            <button
              onClick={() => onSelectTab('admin')}
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'admin'
                  ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {currentTab === 'admin' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
              {t.commandCenter}
            </button>
            <button
              onClick={() => onSelectTab('ai-command')}
              className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                currentTab === 'ai-command'
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200'
                  : 'text-indigo-600 bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-100'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${currentTab === 'ai-command' ? 'text-white' : 'text-indigo-600'}`} />
              <span>{t.askAiAgent}</span>
            </button>
            <button
              onClick={() => onSelectTab('predictive')}
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'predictive'
                  ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {currentTab === 'predictive' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
              {t.predictiveInsights}
            </button>
          </nav>

          {/* Right Action Icons & Role/Auth Switcher */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
            {/* Quick Track Button */}
            <button
              onClick={onOpenTrackModal}
              className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Compass className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="hidden sm:inline">{t.trackId}</span>
            </button>

            {/* AI Voice Assistant Button (Accessible for local community) */}
            {onOpenVoiceModal && (
              <button
                onClick={onOpenVoiceModal}
                className="px-2.5 sm:px-3.5 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm shadow-emerald-200 transition flex items-center gap-1.5 cursor-pointer shrink-0"
                title={language === 'hi' ? 'बोलकर शिकायत दर्ज करें' : 'Voice Assistant: Speak to report'}
              >
                <Mic className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{language === 'hi' ? 'बोलकर बताएं' : 'Voice AI'}</span>
                <span className="sm:hidden">{language === 'hi' ? 'बोलें' : 'Voice'}</span>
              </button>
            )}

            {/* Quick Report Button */}
            <button
              onClick={onOpenReportModal}
              className="px-3 sm:px-3.5 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200/50 transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline">{t.reportProblem}</span>
              <span className="xs:hidden">{t.reportProblem}</span>
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifDropdown(!showNotifDropdown);
                  setShowUserDropdown(false);
                }}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition relative shadow-2xs cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[9px] font-bold bg-rose-600 text-white rounded-full animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-72 sm:w-88 bg-white border border-slate-200 rounded-2xl shadow-xl p-3.5 z-50">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-indigo-600" /> {t.notifications} ({notifications.length})
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer"
                      >
                        {t.markAllRead}
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 mt-2">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">{t.noNotifications}</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`py-2.5 px-2 rounded-xl cursor-pointer transition text-xs ${
                            n.read ? 'opacity-70 hover:bg-slate-50' : 'bg-indigo-50/40 font-medium hover:bg-indigo-50/70'
                          }`}
                          onClick={() => {
                            dbService.markNotificationRead(n.id);
                            if (user?.role === 'officer') onSelectTab('officer');
                            else if (user?.role === 'admin') onSelectTab('admin');
                            else onSelectTab('citizen');
                            setShowNotifDropdown(false);
                          }}
                        >
                          <div className="flex items-center justify-between text-slate-800">
                            <span className="font-bold">{n.title}</span>
                            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                          </div>
                          <p className="text-slate-500 text-[11px] mt-0.5 line-clamp-2">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Authentication / User Pill & Dropdown */}
            <div className="relative">
              {user ? (
                <div>
                  <button
                    onClick={() => {
                      setShowUserDropdown(!showUserDropdown);
                      setShowNotifDropdown(false);
                    }}
                    className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 text-indigo-800 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {user.name.charAt(0)}
                    </div>
                    <span className="text-xs font-bold hidden md:inline truncate max-w-[100px]">
                      {user.name.split(' ')[0]}
                    </span>
                    <ChevronDown className="w-3 h-3 text-indigo-600 hidden sm:inline" />
                  </button>

                  {showUserDropdown && (
                    <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-3.5 z-50 space-y-3">
                      <div className="border-b border-slate-100 pb-2.5">
                        <p className="text-xs font-bold text-slate-900">{user.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono truncate">{user.email}</p>
                        <div className="mt-1.5 flex items-center gap-1">
                          <span className="text-[10px] font-bold capitalize px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {user.role}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate max-w-[130px]">{user.ward}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <button
                          onClick={() => {
                            onOpenAuthModal();
                            setShowUserDropdown(false);
                          }}
                          className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2 cursor-pointer font-medium"
                        >
                          <User className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{t.account}</span>
                        </button>
                        <button
                          onClick={async () => {
                            await logout();
                            setShowUserDropdown(false);
                          }}
                          className="w-full text-left px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 cursor-pointer font-bold"
                        >
                          <LogOut className="w-3.5 h-3.5 text-rose-600" />
                          <span>{t.signOut}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={onOpenAuthModal}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  >
                    <LogIn className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{t.signIn}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Tab Navigation Bar */}
      <div className="lg:hidden border-t border-slate-200 px-2 py-1.5 flex items-center justify-between bg-white max-w-full overflow-x-auto text-[11px] gap-1 scrollbar-none">
        <button
          onClick={() => onSelectTab('landing')}
          className={`px-2.5 py-1 rounded-lg shrink-0 transition font-medium ${
            currentTab === 'landing' ? 'text-indigo-700 font-bold bg-indigo-50 border border-indigo-200' : 'text-slate-600'
          }`}
        >
          {t.home}
        </button>
        <button
          onClick={() => onSelectTab('citizen')}
          className={`px-2.5 py-1 rounded-lg shrink-0 transition font-medium ${
            currentTab === 'citizen' ? 'text-indigo-700 font-bold bg-indigo-50 border border-indigo-200' : 'text-slate-600'
          }`}
        >
          {t.citizenPortal}
        </button>
        <button
          onClick={() => onSelectTab('officer')}
          className={`px-2.5 py-1 rounded-lg shrink-0 transition font-medium ${
            currentTab === 'officer' ? 'text-indigo-700 font-bold bg-indigo-50 border border-indigo-200' : 'text-slate-600'
          }`}
        >
          {t.officerCenter}
        </button>
        <button
          onClick={() => onSelectTab('admin')}
          className={`px-2.5 py-1 rounded-lg shrink-0 transition font-medium ${
            currentTab === 'admin' ? 'text-indigo-700 font-bold bg-indigo-50 border border-indigo-200' : 'text-slate-600'
          }`}
        >
          {t.commandCenter}
        </button>
        <button
          onClick={() => onSelectTab('ai-command')}
          className={`px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1 transition font-bold ${
            currentTab === 'ai-command' ? 'text-white bg-indigo-600' : 'text-indigo-600 bg-indigo-50'
          }`}
        >
          <Sparkles className="w-3 h-3" />
          <span>{t.askAiAgent}</span>
        </button>
        <button
          onClick={() => onSelectTab('predictive')}
          className={`px-2.5 py-1 rounded-lg shrink-0 transition font-medium ${
            currentTab === 'predictive' ? 'text-indigo-700 font-bold bg-indigo-50 border border-indigo-200' : 'text-slate-600'
          }`}
        >
          {t.predictiveInsights}
        </button>
      </div>
    </header>
  );
};
