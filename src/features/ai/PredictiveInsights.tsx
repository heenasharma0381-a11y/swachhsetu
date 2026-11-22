import React, { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Flame,
  ShieldCheck,
  RefreshCw,
  Building2,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { Complaint, WardPerformance } from '../../types/database';
import { useLanguage } from '../../context/LanguageContext';
import { geminiClient } from '../../services/gemini/geminiClient';

interface PredictiveInsightsProps {
  complaints: Complaint[];
  wards: WardPerformance[];
}

export const PredictiveInsights: React.FC<PredictiveInsightsProps> = ({ complaints, wards }) => {
  const { language, t, tWard } = useLanguage();

  const buildRealInsightsFromComplaints = React.useCallback(() => {
    const active = complaints.filter((c) => c.status !== 'RESOLVED');
    if (active.length === 0) return [];

    // Group active real complaints by ward/area
    const byWard = new Map<string, Complaint[]>();
    for (const c of active) {
      const list = byWard.get(c.ward) || [];
      list.push(c);
      byWard.set(c.ward, list);
    }

    return Array.from(byWard.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3)
      .map(([wardName, items]) => {
        const maxSev = Math.max(...items.map((i) => i.severity_score));
        const topCat = items[0]?.category || 'Sanitation';
        const centerName = items[0]?.nearest_municipal_center?.center_name;
        return {
          ward: wardName,
          insight_type: maxSev >= 85 ? 'hotspot_risk' : 'trend_increase',
          insight:
            language === 'hi'
              ? `${items.length} सक्रिय वास्तविक शिकायतें (${topCat}), अधिकतम गंभीरता ${maxSev}/100।`
              : `${items.length} active real report(s) (${topCat}) with peak severity ${maxSev}/100.`,
          severity: maxSev >= 85 ? 'critical' : maxSev >= 70 ? 'high' : 'medium',
          confidence: 0.92,
          action_item:
            language === 'hi'
              ? `${centerName ? centerName + ' द्वारा ' : ''}${items[0]?.address || wardName} पर तत्काल सफाई दल भेजें।`
              : `Dispatch action squad${centerName ? ` via ${centerName}` : ''} to ${items[0]?.address || wardName}.`,
        };
      });
  }, [complaints, language]);

  const [insights, setInsights] = useState<any[]>(() => buildRealInsightsFromComplaints());
  const [isGenerating, setIsGenerating] = useState(false);

  React.useEffect(() => {
    setInsights(buildRealInsightsFromComplaints());
  }, [buildRealInsightsFromComplaints]);

  const handleGenerateNew = async () => {
    setIsGenerating(true);
    try {
      const activeCats = Array.from(new Set(complaints.map((c) => c.category))).filter(Boolean);
      const res = await geminiClient.getPredictiveInsights(wards, {
        totalComplaints: complaints.length,
        categories: activeCats.length > 0 ? activeCats : ['Garbage', 'Sewage', 'Waterlogging'],
      });
      if (res.insights && res.insights.length > 0) {
        setInsights(res.insights);
      }
    } catch (e: any) {
      alert((language === 'hi' ? 'पूर्वानुमान उत्पन्न करने में त्रुटि: ' : 'Failed to generate insights: ') + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
              {language === 'hi' ? 'पूर्वानुमानित स्वच्छता विश्लेषण व प्रारंभिक चेतावनी' : 'Predictive Sanitation Analytics & Early Warning'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold">
              {language === 'hi' ? 'सक्रिय इंजन' : 'PROACTIVE ENGINE'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {language === 'hi' ? 'नागरिक शिकायत बढ़ने से पहले कचरा संचय का स्वतः पता लगाने वाला मशीन इंटेलिजेंस मॉडल' : 'Machine intelligence models detecting emerging waste accumulation before citizen escalation'}
          </p>
        </div>

        <button
          onClick={handleGenerateNew}
          disabled={isGenerating}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition disabled:opacity-50 cursor-pointer"
        >
          <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : 'text-white'}`} />
          <span>{isGenerating ? (language === 'hi' ? 'जेमिनी पैटर्न विश्लेषण कर रहा है...' : 'Analyzing Patterns with Gemini...') : (language === 'hi' ? 'नया एआई पूर्वानुमान बनाएं' : 'Generate New AI Forecasts')}</span>
        </button>
      </div>

      {/* Grid of AI Forecast Cards */}
      {insights.length === 0 ? (
        <div className="p-10 rounded-3xl bg-white border border-slate-200 text-center space-y-2 shadow-2xs">
          <p className="text-sm font-bold text-slate-700">
            {language === 'hi'
              ? 'अभी कोई सक्रिय शिकायत डेटा उपलब्ध नहीं है'
              : 'No active real complaints to analyze yet'}
          </p>
          <p className="text-xs text-slate-500">
            {language === 'hi'
              ? 'शिकायत दर्ज होने के बाद यहां वास्तविक क्षेत्र-वार जोखिम और चेतावनी दिखाई जाएगी।'
              : 'Once citizens submit complaints, real area risk insights appear here or via Gemini Forecasts.'}
          </p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insights.map((item, idx) => (
          <div
            key={idx}
            className="p-5 rounded-3xl bg-white border border-slate-200 flex flex-col justify-between space-y-4 shadow-2xs relative overflow-hidden group hover:border-indigo-300 transition"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    item.severity === 'critical'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : item.severity === 'high'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  }`}
                >
                  {item.severity === 'critical' ? (language === 'hi' ? 'गंभीर' : 'Critical') : item.severity === 'high' ? (language === 'hi' ? 'उच्च' : 'High') : (language === 'hi' ? 'मध्यम' : 'Medium')} {language === 'hi' ? 'तीव्रता' : 'Severity'}
                </span>
                <span className="text-[11px] font-mono text-indigo-600 font-bold">
                  {Math.round((item.confidence || 0.92) * 100)}% {language === 'hi' ? 'सटीकता' : 'Confidence'}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 font-display">
                  <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{tWard(item.ward)}</span>
                </h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">{item.insight}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs shadow-2xs">
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                {language === 'hi' ? 'अनुशंसित निवारक कार्रवाई' : 'Recommended Preventive Action'}
              </span>
              <p className="text-slate-700 text-xs font-medium leading-relaxed">{item.action_item}</p>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
};

