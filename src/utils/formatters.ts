import { ComplaintStatus } from '../types/database';
import { getLocalizedStatus, Language } from '../context/LanguageContext';

export function formatTimeRemaining(deadlineIso: string, lang: Language = 'en'): { text: string; isBreached: boolean; hours: number } {
  const deadline = new Date(deadlineIso).getTime();
  const now = Date.now();
  const diffMs = deadline - now;

  if (diffMs <= 0) {
    const passedHours = Math.abs(Math.floor(diffMs / (1000 * 60 * 60)));
    if (lang === 'hi') {
      return {
        text: passedHours > 0 ? `समय सीमा पार (${passedHours} घंटे पूर्व)` : 'समय सीमा समाप्त',
        isBreached: true,
        hours: -passedHours,
      };
    }
    return {
      text: passedHours > 0 ? `SLA BREACHED (${passedHours}h ago)` : 'SLA BREACHED',
      isBreached: true,
      hours: -passedHours,
    };
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (lang === 'hi') {
    return {
      text: `${hours.toString().padStart(2, '0')} घंटे ${minutes.toString().padStart(2, '0')} मिनट शेष`,
      isBreached: false,
      hours,
    };
  }

  return {
    text: `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m remaining`,
    isBreached: false,
    hours,
  };
}

export function getStatusBadge(status: ComplaintStatus, lang: Language = 'en'): { label: string; bg: string; text: string; border: string } {
  const localizedLabel = getLocalizedStatus(status, lang);
  switch (status) {
    case 'SUBMITTED':
      return { label: localizedLabel, bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' };
    case 'AI_ANALYZED':
      return { label: localizedLabel, bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' };
    case 'AI_VERIFIED':
      return { label: localizedLabel, bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' };
    case 'PRIORITIZED':
      return { label: localizedLabel, bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
    case 'ASSIGNED':
      return { label: localizedLabel, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    case 'IN_PROGRESS':
      return { label: localizedLabel, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    case 'RESOLUTION_SUBMITTED':
      return { label: localizedLabel, bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' };
    case 'CITIZEN_VERIFICATION':
      return { label: localizedLabel, bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' };
    case 'RESOLVED':
      return { label: localizedLabel, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    case 'REOPENED':
      return { label: localizedLabel, bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' };
    case 'ESCALATED':
      return { label: localizedLabel, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
    default:
      return { label: localizedLabel, bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' };
  }
}

export function getSeverityBadge(score: number, lang: Language = 'en'): { label: string; bg: string; text: string; ring: string } {
  if (score >= 85) {
    return {
      label: lang === 'hi' ? `${score}/100 अति गंभीर` : `${score}/100 Critical`,
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      ring: 'ring-rose-200',
    };
  }
  if (score >= 70) {
    return {
      label: lang === 'hi' ? `${score}/100 उच्च जोखिम` : `${score}/100 High`,
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      ring: 'ring-amber-200',
    };
  }
  if (score >= 45) {
    return {
      label: lang === 'hi' ? `${score}/100 मध्यम` : `${score}/100 Medium`,
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      ring: 'ring-blue-200',
    };
  }
  return {
    label: lang === 'hi' ? `${score}/100 सामान्य` : `${score}/100 Low`,
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    ring: 'ring-slate-200',
  };
}

export function formatDate(isoDate: string, lang: Language = 'en'): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoDate;
  }
}
