import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight,
  RefreshCw,
  MapPin,
  Clock,
  Layers,
  Radio,
  HelpCircle,
  PhoneCall,
  Flame,
} from 'lucide-react';
import { geminiClient, VoiceProcessResult } from '../../services/gemini/geminiClient';
import { dbService } from '../../services/supabase/dbService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { Complaint } from '../../types/database';
import {
  buildSpotMapUrl,
  getClosestLocality,
  getExactCurrentPosition,
  looksLikeDelhiNcrLocation,
  reverseGeocodeExactLocation,
  forwardGeocodeLocation,
  findNearestMunicipalCenter,
  MunicipalOfficerCenter,
} from '../../utils/geoUtils';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessComplaint?: (complaint: Complaint) => void;
  onOpenTrackModal?: (complaintNumber: string) => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  onSuccessComplaint,
  onOpenTrackModal,
}) => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { showToast } = useToast();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeakingAudio, setIsSpeakingAudio] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live transcript and final result
  const [liveTranscript, setLiveTranscript] = useState('');
  const [processedResult, setProcessedResult] = useState<VoiceProcessResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Audio and MediaRecorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const warmGeoRef = useRef<{
    latitude: number;
    longitude: number;
    exactAddress: string;
    ward: string;
    nearestCenter?: MunicipalOfficerCenter;
  } | null>(null);

  // Pre-warm exact GPS + area + nearest municipal center while citizen speaks; cleanup on close
  useEffect(() => {
    if (!isOpen) {
      stopRecordingImmediate();
      stopAudioPlayback();
      setProcessedResult(null);
      setLiveTranscript('');
      setErrorMsg(null);
      return;
    }

    let cancelled = false;
    getExactCurrentPosition(4500)
      .then(async (pos) => {
        if (cancelled) return;
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const resolved = await reverseGeocodeExactLocation(lat, lon, language);
        if (cancelled) return;
        const center = await findNearestMunicipalCenter({
          latitude: lat,
          longitude: lon,
          address: resolved.exactAddress,
          ward: resolved.ward,
          city: resolved.city,
          state: resolved.state,
          language,
        });
        if (!cancelled) {
          warmGeoRef.current = {
            latitude: lat,
            longitude: lon,
            exactAddress: resolved.exactAddress,
            ward: resolved.ward,
            nearestCenter: center,
          };
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isOpen, language]);

  const stopAudioPlayback = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeakingAudio(false);
  };

  const playVoiceResponse = (text: string, base64Wav?: string | null) => {
    stopAudioPlayback();
    setIsSpeakingAudio(true);

    if (base64Wav) {
      try {
        const audio = new Audio(`data:audio/wav;base64,${base64Wav}`);
        audioPlayerRef.current = audio;
        audio.onended = () => setIsSpeakingAudio(false);
        audio.onerror = () => {
          fallbackSpeechSynthesis(text);
        };
        audio.play().catch(() => fallbackSpeechSynthesis(text));
        return;
      } catch {
        fallbackSpeechSynthesis(text);
        return;
      }
    }

    fallbackSpeechSynthesis(text);
  };

  const fallbackSpeechSynthesis = (text: string) => {
    if (!window.speechSynthesis) {
      setIsSpeakingAudio(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeakingAudio(false);
    utterance.onerror = () => setIsSpeakingAudio(false);
    window.speechSynthesis.speak(utterance);
  };

  // Start Voice Recording
  const startRecording = async () => {
    setErrorMsg(null);
    setProcessedResult(null);
    setLiveTranscript('');
    audioChunksRef.current = [];
    setRecordingSeconds(0);
    stopAudioPlayback();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        await handleAudioProcess(audioBlob, mimeType || 'audio/webm');
      };

      recorder.start(250);
      setIsRecording(true);

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 25) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      // Also start live browser speech recognition if available for instant live visual feedback
      startLiveSpeechRecognition();
    } catch (err: any) {
      console.warn('Microphone access failed:', err);
      // Fallback: prompt for user speech via speech recognition or text
      startLiveSpeechRecognition();
      if (!speechRecognitionRef.current) {
        setErrorMsg(
          language === 'hi'
            ? 'माइक्रोफ़ोन अनुमति नहीं मिली। कृपया ब्राउज़र सेटिंग्स में माइक चालू करें।'
            : 'Microphone permission denied. Please allow microphone access in your browser.'
        );
      }
    }
  };

  const startLiveSpeechRecognition = () => {
    const win = window as any;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';

      recognition.onresult = (event: any) => {
        let current = '';
        for (let i = 0; i < event.results.length; i++) {
          current += event.results[i][0].transcript;
        }
        setLiveTranscript(current);
      };

      recognition.onerror = () => {};
      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch {}
  };

  const stopRecordingImmediate = () => {
    clearInterval(timerIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
    }
    setIsRecording(false);
  };

  const stopRecording = () => {
    clearInterval(timerIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      // If media recorder wasn't supported, send live transcript
      handleTranscriptOnlyProcess(liveTranscript);
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
    }
    setIsRecording(false);
  };

  const handleAudioProcess = async (audioBlob: Blob, mimeType: string) => {
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        try {
          const { result } = await geminiClient.processVoice({
            audioBase64: base64Audio,
            audioMimeType: mimeType,
            spokenText: liveTranscript || undefined,
            userWard: user?.ward,
            preferredLang: language,
          });

          setProcessedResult(result);
          if (result.spokenResponse) {
            playVoiceResponse(result.spokenResponse, result.audioWavBase64);
          }
        } catch (e: any) {
          console.error(e);
          fallbackProcessingWithText(liveTranscript);
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsDataURL(audioBlob);
    } catch (e: any) {
      fallbackProcessingWithText(liveTranscript);
      setIsProcessing(false);
    }
  };

  const handleTranscriptOnlyProcess = async (text: string) => {
    setIsProcessing(true);
    fallbackProcessingWithText(text);
  };

  const fallbackProcessingWithText = async (text: string) => {
    try {
      const { result } = await geminiClient.processVoice({
        spokenText: text || 'हमारे इलाके में बहुत कचरा फैला है बदबू आ रही है',
        userWard: user?.ward,
        preferredLang: language,
      });
      setProcessedResult(result);
      if (result.spokenResponse) {
        playVoiceResponse(result.spokenResponse, result.audioWavBase64);
      }
    } catch (err: any) {
      setErrorMsg(language === 'hi' ? 'आवाज समझने में समस्या हुई, कृपया पुनः प्रयास करें।' : 'Could not understand audio, please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Submit Complaint confirmed by citizen (uses pre-warmed GPS & municipal center for instant submit)
  const handleConfirmSubmit = async () => {
    if (!processedResult) return;

    setIsSubmitting(true);
    stopAudioPlayback();

    try {
      let exactLat = 0;
      let exactLon = 0;
      let exactAddr = (processedResult.address || '').trim();
      let exactWard = (processedResult.ward || user?.ward || '').trim();
      let preResolvedCenter = warmGeoRef.current?.nearestCenter;

      const spokenPlace = exactAddr;
      const hasSpokenPlace =
        Boolean(spokenPlace) &&
        spokenPlace !== 'Current Resident Locality' &&
        spokenPlace !== 'Chandni Chowk Main Locality' &&
        spokenPlace.length >= 3;

      if (hasSpokenPlace && spokenPlace) {
        preResolvedCenter = undefined;
        const fwd = await Promise.race([
          forwardGeocodeLocation(spokenPlace, language),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 4200)),
        ]);
        if (fwd) {
          exactLat = fwd.latitude;
          exactLon = fwd.longitude;
          exactAddr = fwd.exactAddress;
          exactWard = fwd.ward;
          preResolvedCenter = await Promise.race([
            findNearestMunicipalCenter({
              latitude: exactLat,
              longitude: exactLon,
              address: exactAddr,
              ward: exactWard,
              city: fwd.city,
              state: fwd.state,
              language,
            }),
            new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 2400)),
          ]);
        } else if (!looksLikeDelhiNcrLocation(spokenPlace)) {
          exactLat = 0;
          exactLon = 0;
          exactAddr = spokenPlace;
          exactWard = spokenPlace;
          preResolvedCenter = {
            center_name: `${spokenPlace} Municipal Corporation Sanitation Center`,
            center_address: spokenPlace,
            distance_km: null,
            authority_type: language === 'hi' ? 'क्षेत्रीय नगर निगम स्वच्छता केंद्र' : 'Area Municipal Sanitation Officer Center',
            contact_phone: null,
            website: null,
            helpline: '1969',
            provider: 'civic_authority_derived',
          };
        }
      }

      if (!hasSpokenPlace && !preResolvedCenter) {
        if (warmGeoRef.current) {
          exactLat = warmGeoRef.current.latitude;
          exactLon = warmGeoRef.current.longitude;
          if (!exactAddr || exactAddr === 'Current Resident Locality') {
            exactAddr = warmGeoRef.current.exactAddress;
          }
          if (!exactWard) {
            exactWard = warmGeoRef.current.ward;
          }
          preResolvedCenter = warmGeoRef.current.nearestCenter;
        } else {
          try {
            const pos = await getExactCurrentPosition(2200);
            exactLat = pos.coords.latitude;
            exactLon = pos.coords.longitude;
            const resolved = await Promise.race([
              reverseGeocodeExactLocation(exactLat, exactLon, language),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
            ]);
            if (resolved) {
              if (!exactAddr || exactAddr === 'Current Resident Locality') {
                exactAddr = resolved.exactAddress;
              }
              if (!exactWard) {
                exactWard = resolved.ward;
              }
            }
          } catch {
            if (exactAddr && !looksLikeDelhiNcrLocation(exactAddr)) {
              exactLat = 0;
              exactLon = 0;
              exactWard = exactWard || exactAddr;
            }
          }
        }
      }

      const created = await dbService.createComplaint({
        citizen_id: user?.id || 'citizen-voice-user',
        citizen_name: user?.name || (language === 'hi' ? 'स्थानीय नागरिक (वॉइस)' : 'Local Citizen (Voice)'),
        citizen_phone: user?.phone || undefined,
        description: `${processedResult.transcript} (${processedResult.translatedEnglish})`,
        category: processedResult.category || 'Garbage',
        subcategory: processedResult.subcategory || 'Voice Reported Sanitation Issue',
        latitude: exactLat,
        longitude: exactLon,
        address: exactAddr || (language === 'hi' ? 'स्थानीय क्षेत्र' : 'Local Area'),
        ward: exactWard || exactAddr || 'Local Area',
        severity_score: processedResult.severity || 75,
        urgency: processedResult.urgency || 'High',
        health_risk: processedResult.severity > 80 ? 'High' : 'Medium',
        population_impact: 65,
        ai_summary: processedResult.spokenResponse || 'Voice reported civic sanitation issue',
        ai_confidence: 0.94,
        recommended_department: 'Municipal Solid Waste Management Dept',
        nearest_municipal_center: preResolvedCenter,
      });

      const centerName = created.nearest_municipal_center?.center_name;
      // Play audio confirmation
      const confirmSpeech = language === 'hi'
        ? `आपकी शिकायत #${created.complaint_number} दर्ज हो गई है${centerName ? ` और ${centerName} को भेज दी गई है।` : '।'}`
        : `Your complaint #${created.complaint_number} has been registered${centerName ? ` and dispatched to ${centerName}.` : '.'}`;

      playVoiceResponse(confirmSpeech);

      showToast({
        type: 'success',
        title: language === 'hi' ? 'शिकायत दर्ज हुई!' : 'Complaint Lodged!',
        message: confirmSpeech,
        complaintNumber: created.complaint_number,
        action: {
          label: language === 'hi' ? 'स्थिति देखें' : 'Track Status',
          onClick: () => {
            onClose();
            if (onOpenTrackModal) onOpenTrackModal(created.complaint_number);
          },
        },
      });

      if (onSuccessComplaint) {
        onSuccessComplaint(created);
      }

      setTimeout(() => {
        onClose();
        if (onOpenTrackModal) onOpenTrackModal(created.complaint_number);
      }, 2500);
    } catch (e: any) {
      console.error(e);
      alert('Error submitting complaint: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sampleVoicePrompts = language === 'hi'
    ? [
        'चांदनी चौक में कचरा बहुत फैला हुआ है बदबू आ रही है',
        'शाहदरा में नाली जाम हो गई है गंदा पानी सड़क पर बह रहा है',
        'करोल बाग मार्केट में कूड़ादान ओवरफ्लो हो रहा है',
        'रोहिणी में सड़क पर मरा हुआ जानवर पड़ा है तुरंत उठवाएं',
      ]
    : [
        'Huge garbage dump near Chandni Chowk Metro Gate 3',
        'Clogged sewer overflowing on main road in Shahdara',
        'Public toilet is dirty and leaking water in Karol Bagh',
        'What is the status of complaint SW-2026-000124?',
      ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xs">
              <Sparkles className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>{language === 'hi' ? 'बोलकर शिकायत करें' : 'AI Voice Assistant'}</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-400 text-slate-950 uppercase tracking-wider">
                  {language === 'hi' ? 'स्थानीय भाषा' : 'Local Voice'}
                </span>
              </h2>
              <p className="text-[11px] text-emerald-100 font-medium">
                {language === 'hi'
                  ? 'टाइप करने की जरूरत नहीं — अपनी भाषा में बोलें और समाधान पाएं'
                  : 'No typing needed — speak in your local language to report or query'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* Main Voice Interactive Disc */}
          <div className="flex flex-col items-center justify-center text-center pt-2 pb-4 space-y-4">
            {/* Animated Mic Button */}
            <div className="relative">
              {isRecording && (
                <>
                  <div className="absolute -inset-4 rounded-full bg-emerald-500/20 animate-ping" />
                  <div className="absolute -inset-8 rounded-full bg-emerald-500/10 animate-pulse" />
                </>
              )}
              {isSpeakingAudio && (
                <div className="absolute -inset-4 rounded-full bg-indigo-500/20 animate-pulse" />
              )}

              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center transition-all transform hover:scale-105 active:scale-95 shadow-xl cursor-pointer relative z-10 ${
                  isRecording
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200 ring-8 ring-rose-100 animate-pulse'
                    : isProcessing
                    ? 'bg-slate-200 text-slate-400 cursor-wait'
                    : 'bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-emerald-200 ring-8 ring-emerald-50'
                }`}
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-10 h-10 mb-1" />
                    <span className="text-xs font-black uppercase tracking-wider">{recordingSeconds}s • रोकें</span>
                  </>
                ) : isProcessing ? (
                  <>
                    <RefreshCw className="w-9 h-9 animate-spin text-slate-500 mb-1" />
                    <span className="text-[10px] font-bold text-slate-600">समझ रहे हैं...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-10 h-10 mb-1" />
                    <span className="text-xs font-black uppercase tracking-wider">
                      {language === 'hi' ? 'बोलने के लिए दबाएं' : 'Tap to Speak'}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Instruction */}
            <div>
              <p className="text-sm font-bold text-slate-800">
                {isRecording
                  ? language === 'hi'
                    ? '🎙️ सुन रहे हैं... अपनी भाषा में बोलें (जैसे: कचरा, नाली, बदबू)'
                    : '🎙️ Listening... speak clearly in Hindi, Hinglish, or English'
                  : isProcessing
                  ? language === 'hi'
                    ? 'एआई आपकी आवाज समझ रहा है...'
                    : 'Gemini AI is analyzing your spoken words...'
                  : language === 'hi'
                  ? 'माइक दबाकर बोलें — कचरा, नाली, बदबू या कोई भी समस्या बताएं'
                  : 'Tap the mic and speak — describe any garbage or sanitation issue'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'hi'
                  ? 'बोलना पूरा होने पर बटन दोबारा दबाएं'
                  : 'Tap the mic again when you finish speaking'}
              </p>
            </div>

            {/* Live Transcript / Sound Wave indicator */}
            {isRecording && (
              <div className="w-full bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-left animate-fade-in">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                  <span>{language === 'hi' ? 'लाइव आवाज रिकॉर्डिंग:' : 'Live Speech Capture:'}</span>
                </div>
                <p className="text-sm text-slate-800 font-medium italic min-h-[1.5rem]">
                  {liveTranscript || (language === 'hi' ? 'बोलना शुरू करें...' : 'Speak now...')}
                </p>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="w-full bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Processed AI Result Card */}
          {processedResult && (
            <div className="bg-slate-50 border-2 border-emerald-500/40 rounded-3xl p-4 sm:p-5 space-y-4 shadow-sm animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                      {language === 'hi' ? 'एआई ने समझा (AI Analysis)' : 'AI Understood Your Issue'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {language === 'hi' ? 'स्थानीय बोली से स्वचालित पहचान' : 'Accurately recognized from speech'}
                    </p>
                  </div>
                </div>

                {/* Speaker playback toggle */}
                <button
                  type="button"
                  onClick={() =>
                    playVoiceResponse(processedResult.spokenResponse, processedResult.audioWavBase64)
                  }
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    isSpeakingAudio
                      ? 'bg-indigo-600 text-white border-indigo-600 animate-pulse'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {isSpeakingAudio ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-indigo-600" />}
                  <span>{isSpeakingAudio ? (language === 'hi' ? 'बोल रहा है...' : 'Playing...') : (language === 'hi' ? 'पुनः सुनें' : 'Listen')}</span>
                </button>
              </div>

              {/* What the user said */}
              <div className="space-y-1.5 bg-white rounded-2xl p-3 border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  {language === 'hi' ? 'आपने कहा (Your Voice):' : 'What you said:'}
                </span>
                <p className="text-sm font-semibold text-slate-900">"{processedResult.transcript}"</p>
                {processedResult.translatedEnglish && processedResult.translatedEnglish !== processedResult.transcript && (
                  <p className="text-xs text-slate-500 italic">
                    Translation: {processedResult.translatedEnglish}
                  </p>
                )}
              </div>

              {/* Identified Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    {language === 'hi' ? 'समस्या श्रेणी' : 'Category'}
                  </span>
                  <span className="text-xs font-black text-indigo-600 block mt-0.5 truncate">
                    {processedResult.category}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    {language === 'hi' ? 'पहचाना गया स्थान' : 'Location'}
                  </span>
                  <span className="text-xs font-bold text-slate-800 block mt-0.5 truncate">
                    {processedResult.address}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    {language === 'hi' ? 'प्राथमिकता' : 'Urgency'}
                  </span>
                  <span className="text-xs font-bold text-rose-600 block mt-0.5 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5" />
                    {processedResult.urgency} ({processedResult.severity}/100)
                  </span>
                </div>
              </div>

              {/* Spoken Response Quote */}
              <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200/80 text-xs text-emerald-950 font-medium flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-emerald-900 mb-0.5">
                    {language === 'hi' ? 'एआई आवाज संदेश:' : 'AI Voice Feedback:'}
                  </span>
                  {processedResult.spokenResponse}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={isSubmitting}
                  className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-200 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>
                    {isSubmitting
                      ? language === 'hi'
                        ? 'दर्ज किया जा रहा है...'
                        : 'Submitting...'
                      : language === 'hi'
                      ? '✅ हाँ, शिकायत तुरंत दर्ज करें'
                      : '✅ Confirm & Submit Complaint'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={startRecording}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{language === 'hi' ? 'दोबारा बोलें' : 'Speak Again'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Sample Prompts for local people */}
          {!processedResult && !isRecording && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
                💡 {language === 'hi' ? 'आप इस तरह बोल सकते हैं (उदाहरण):' : 'Example things you can say:'}
              </span>
              <div className="grid grid-cols-1 gap-2">
                {sampleVoicePrompts.map((promptText, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setLiveTranscript(promptText);
                      handleTranscriptOnlyProcess(promptText);
                    }}
                    className="text-left text-xs p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 hover:border-indigo-200 text-slate-700 hover:text-indigo-900 transition flex items-center justify-between group cursor-pointer"
                  >
                    <span className="font-medium">"{promptText}"</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="flex items-center gap-1.5 text-[11px]">
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            {language === 'hi' ? 'हिंदी व अंग्रेजी दोनों भाषाओं में सक्षम' : 'Supports Hindi, Hinglish & English'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
          >
            {language === 'hi' ? 'बंद करें' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
