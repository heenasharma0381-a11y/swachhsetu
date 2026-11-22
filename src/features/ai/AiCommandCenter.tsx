import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Activity,
  Layers,
  Flame,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Building2,
  HelpCircle,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Complaint, IncidentCluster, WardPerformance } from '../../types/database';
import { geminiClient } from '../../services/gemini/geminiClient';
import { useLanguage } from '../../context/LanguageContext';
import ReactMarkdown from 'react-markdown';
import { useSpeechRecognition } from '../../utils/useSpeechRecognition';

interface AiCommandCenterProps {
  complaints: Complaint[];
  clusters: IncidentCluster[];
  wards: WardPerformance[];
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export const AiCommandCenter: React.FC<AiCommandCenterProps> = ({ complaints, clusters, wards }) => {
  const { language, t } = useLanguage();
  const [voiceLang, setVoiceLang] = useState<'hi-IN' | 'en-IN'>(language === 'hi' ? 'hi-IN' : 'en-IN');
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVoiceLang(language === 'hi' ? 'hi-IN' : 'en-IN');
  }, [language]);

  const welcomeMessage =
    language === 'hi'
      ? `नमस्ते। मैं **स्वच्छसेतु एआई** हूँ, आपका स्वायत्त स्वच्छता आसूचना एजेंट।\n\nमैंने **${complaints.length} नगरपालिका शिकायतों**, **${clusters.length} सक्रिय समस्या क्लस्टरों** और **${wards.length} प्रशासनिक वार्डों** का लाइव डेटा लोड कर लिया है।\n\nआप मुझसे टाइप करके या **माइक (🎙️)** पर बोलकर हॉटस्पॉट, एसएलए जोखिम और सफाई दल तैनाती के बारे में पूछ सकते हैं।`
      : `Hello Commissioner. I am **SwachhSetu AI**, your autonomous sanitation intelligence agent.\n\nI have loaded live telemetry from **${complaints.length} municipal complaints**, **${clusters.length} active incident clusters**, and **${wards.length} Delhi administrative wards**.\n\nAsk me by typing or clicking the **Microphone (माइक)** about critical biohazard hotspots, SLA breach risks, tipper fleet dispatch recommendations, or resource allocation optimizations.`;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-welcome',
      sender: 'ai',
      text: welcomeMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    isListening,
    transcript,
    interimTranscript,
    error: speechError,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    lang: voiceLang,
    continuous: false,
    onTranscript: (liveText, isFinal) => {
      if (liveText) {
        setInputQuery(liveText);
      }
    },
  });

  useEffect(() => {
    if (transcript) {
      setInputQuery(transcript);
    }
  }, [transcript]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeakAiResponse = (msgId: string, text: string) => {
    if (!window.speechSynthesis) return;

    if (playingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setPlayingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`>]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = voiceLang === 'hi-IN' ? 'hi-IN' : 'en-IN';
    utterance.rate = 1.0;
    utterance.onend = () => setPlayingMessageId(null);
    utterance.onerror = () => setPlayingMessageId(null);

    setPlayingMessageId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const handleSendQuery = async (queryText: string) => {
    const q = queryText.trim();
    if (!q || isLoading) return;

    if (isListening) {
      stopListening();
    }

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const databaseSummary = {
        totalComplaints: complaints.length,
        activeComplaints: complaints.filter((c) => c.status !== 'RESOLVED').length,
        resolvedComplaints: complaints.filter((c) => c.status === 'RESOLVED').length,
        criticalCases: complaints.filter((c) => c.severity_score >= 85).map((c) => ({
          id: c.complaint_number,
          category: c.category,
          ward: c.ward,
          severity: c.severity_score,
          address: c.address,
        })),
        activeClusters: clusters.map((cl) => ({
          id: cl.id,
          name: cl.cluster_name,
          ward: cl.ward,
          count: cl.total_complaints,
          risk: cl.risk_score,
        })),
        wardRankings: wards.map((w) => ({
          name: w.ward_name,
          compliance: `${w.sla_compliance_rate}%`,
          grade: w.cleanliness_grade,
        })),
      };

      const promptWithLanguage = language === 'hi' ? `${q} (कृपया उत्तर सरल और स्पष्ट हिन्दी में दें)` : q;

      const res = await geminiClient.askCommandCenter(promptWithLanguage, databaseSummary);

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: language === 'hi' ? `जेमिनी एजेंट से संपर्क में त्रुटि: ${e.message}` : `Error contacting Gemini agent: ${e.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sampleQuestions =
    language === 'hi'
      ? [
          'किन वार्डों में तत्काल स्वच्छता कार्रवाई की आवश्यकता है?',
          'कचरा शिकायतों में सबसे तेजी से वृद्धि किस श्रेणी में हो रही है?',
          'सभी सक्रिय एसएलए उल्लंघन और सफाई दल की सिफारिशें दिखाएं',
          'बार-बार कचरा फेंकने वाले हॉटस्पॉट और रोकथाम उपाय बताएं',
        ]
      : [
          'Which wards need immediate sanitation attention?',
          'What is the fastest increasing category of sanitation complaints?',
          'Show me all active SLA breaches and recommended squad dispatches',
          'Summarize repeat dumping hotspots and preventative measures',
        ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-4 pb-20">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-xs">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
                {t.aiCommandCenterTitle}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                GEMINI 3.7 FLASH
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">{t.aiCommandCenterSubtitle}</p>
          </div>
        </div>

        {/* Language selector for Voice Input */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs text-[11px]">
          <span className="text-slate-400 font-bold px-2 text-[10px] uppercase">{language === 'hi' ? 'आवाज़:' : 'Voice:'}</span>
          <button
            type="button"
            onClick={() => setVoiceLang('en-IN')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
              voiceLang === 'en-IN' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setVoiceLang('hi-IN')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
              voiceLang === 'hi-IN' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            हिन्दी
          </button>
        </div>
      </div>

      {/* Chat Container */}
      <div className="bg-white border border-slate-200 rounded-3xl flex flex-col h-[580px] shadow-2xs overflow-hidden">
        {/* Messages Scroll Area */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/50">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 text-xs leading-relaxed ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'ai' && (
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 space-y-2 relative group ${
                  m.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none shadow-xs font-medium'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-2xs'
                }`}
              >
                <div className={`markdown-body max-w-none text-xs leading-relaxed ${m.sender === 'user' ? 'text-white' : 'text-slate-800'}`}>
                  <ReactMarkdown>{m.text}</ReactMarkdown>
                </div>
                
                <div className="flex items-center justify-between pt-1 border-t border-slate-100/30">
                  {m.sender === 'ai' ? (
                    <button
                      type="button"
                      onClick={() => handleSpeakAiResponse(m.id, m.text)}
                      className={`text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                        playingMessageId === m.id
                          ? 'text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md animate-pulse'
                          : 'text-slate-400 hover:text-indigo-600'
                      }`}
                    >
                      {playingMessageId === m.id ? (
                        <>
                          <VolumeX className="w-3 h-3" />
                          <span>{t.stopVoice}</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3 h-3" />
                          <span>{t.readAloud}</span>
                        </>
                      )}
                    </button>
                  ) : <div />}
                  <span
                    className={`text-[9px] block font-mono ${
                      m.sender === 'user' ? 'text-indigo-200' : 'text-slate-400'
                    }`}
                  >
                    {m.timestamp}
                  </span>
                </div>
              </div>

              {m.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 text-xs justify-start">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-700 flex items-center gap-2 shadow-2xs font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>{t.geminiReasoningDb}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Live Speech Recognition Banner if active */}
        {isListening && (
          <div className="px-4 py-2 bg-rose-50 border-t border-rose-200 flex items-center justify-between text-xs text-rose-700 font-bold animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
              <span>{t.listeningInPrompt} {voiceLang === 'hi-IN' ? 'हिन्दी' : 'English'}...</span>
            </div>
            <button
              type="button"
              onClick={stopListening}
              className="text-[11px] bg-rose-600 text-white px-2.5 py-0.5 rounded-lg hover:bg-rose-700 cursor-pointer font-bold"
            >
              {t.doneSpeaking}
            </button>
          </div>
        )}

        {speechError && (
          <div className="px-4 py-1.5 bg-amber-50 border-t border-amber-200 text-[11px] text-amber-800">
            {speechError}
          </div>
        )}

        {/* Suggested Queries Chips */}
        <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <span className="text-slate-400 font-bold shrink-0 text-[10px] uppercase">{t.suggestedLabel}:</span>
          {sampleQuestions.map((sq, i) => (
            <button
              key={i}
              onClick={() => handleSendQuery(sq)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 shrink-0 transition font-medium cursor-pointer"
            >
              {sq}
            </button>
          ))}
        </div>

        {/* Input Bar with Mic Button */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendQuery(inputQuery);
          }}
          className="p-3 bg-white border-t border-slate-100 flex items-center gap-2"
        >
          {/* Voice Mic Button */}
          <button
            type="button"
            onClick={() => {
              if (isListening) {
                stopListening();
              } else {
                startListening(voiceLang);
              }
            }}
            title={isListening ? t.stopListening : `${t.speakIn} ${voiceLang === 'hi-IN' ? 'Hindi' : 'English'}`}
            className={`p-2.5 rounded-xl border transition cursor-pointer shrink-0 ${
              isListening
                ? 'bg-rose-600 border-rose-600 text-white animate-pulse shadow-md ring-2 ring-rose-200'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={
              isListening
                ? (language === 'hi' ? 'माइक सुन रहा है... बोलिए' : 'Listening... speak now')
                : t.askAiPlaceholder
            }
            className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-medium"
          />
          <button
            type="submit"
            disabled={isLoading || !inputQuery.trim()}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            <span>{t.askAiBtn}</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
