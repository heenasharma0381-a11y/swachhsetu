import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  MapPin,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
  ArrowRight,
  Navigation,
  Mic,
  MicOff,
  Volume2,
  RefreshCw,
  Image as ImageIcon,
  SwitchCamera,
  Check,
  Radio,
  VolumeX,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { geminiClient, GeminiAnalysisResult } from '../../services/gemini/geminiClient';
import { dbService } from '../../services/supabase/dbService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { INITIAL_WARDS } from '../../data/initialDemoData';
import { Complaint } from '../../types/database';
import { useSpeechRecognition } from '../../utils/useSpeechRecognition';
import {
  buildGoogleMapsUrl,
  buildOsmEmbedUrl,
  buildSpotMapUrl,
  DELHI_COMMUNITY_LOCALITIES,
  extractExifGpsFromFile,
  findNearestMunicipalCenter,
  forwardGeocodeLocation,
  getExactCurrentPosition,
  looksLikeDelhiNcrLocation,
  MunicipalOfficerCenter,
  reverseGeocodeExactLocation,
} from '../../utils/geoUtils';

interface CitizenReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (complaint: Complaint) => void;
}

export const CitizenReportModal: React.FC<CitizenReportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { language, t, tWard } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [ward, setWard] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);
  const [hasResolvedCoords, setHasResolvedCoords] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [locationSource, setLocationSource] = useState<
    'default' | 'camera_gps' | 'photo_exif' | 'live_gps' | 'manual'
  >('default');
  const locationSourceRef = useRef(locationSource);
  locationSourceRef.current = locationSource;
  const addressRef = useRef(address);
  addressRef.current = address;
  const [isResolvingPhotoLocation, setIsResolvingPhotoLocation] = useState(false);
  const [isResolvingTypedAddress, setIsResolvingTypedAddress] = useState(false);
  const [matchedTypedPlace, setMatchedTypedPlace] = useState<string | null>(null);
  const lastForwardResolvedRef = useRef<string>('');
  const [nearestCenter, setNearestCenter] = useState<MunicipalOfficerCenter | null>(null);
  const [isLoadingCenter, setIsLoadingCenter] = useState(false);
  const [liveGpsStatus, setLiveGpsStatus] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  } | null>(null);

  const liveGpsRef = useRef<{
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  } | null>(null);
  const geoWatchIdRef = useRef<number | null>(null);

  // Media state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mediaMode, setMediaMode] = useState<'upload' | 'camera'>('upload');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Speech Recognition state - sync default with active app language
  const [voiceLang, setVoiceLang] = useState<'hi-IN' | 'en-IN'>(language === 'hi' ? 'hi-IN' : 'en-IN');
  const [isSpeakingBack, setIsSpeakingBack] = useState(false);

  useEffect(() => {
    setVoiceLang(language === 'hi' ? 'hi-IN' : 'en-IN');
  }, [language]);

  const {
    isListening,
    transcript,
    interimTranscript,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    lang: voiceLang,
    continuous: true,
    onTranscript: (liveTranscript) => {
      if (liveTranscript) {
        setDescription(liveTranscript);
      }
    },
  });

  const [isLocating, setIsLocating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiVoiceProcessing, setIsAiVoiceProcessing] = useState(false);

  const [aiAnalysis, setAiAnalysis] = useState<GeminiAnalysisResult | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{ count: number; clusterId?: string } | null>(null);
  const [submittedComplaint, setSubmittedComplaint] = useState<Complaint | null>(null);

  const stopGpsWatcher = React.useCallback(() => {
    if (geoWatchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(geoWatchIdRef.current);
      geoWatchIdRef.current = null;
    }
  }, []);

  // Stop camera helper defined with useCallback before useEffect
  const stopCameraStream = React.useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    stopGpsWatcher();
    setIsCameraActive(false);
  }, [stopGpsWatcher]);

  // Sync speech transcript into description
  useEffect(() => {
    if (transcript) {
      setDescription(transcript);
    }
  }, [transcript]);

  // Clean up camera stream & GPS watch and reset form cleanly when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      setSubmittedComplaint(null);
      setAiAnalysis(null);
      setDuplicateWarning(null);
      setDescription('');
      setCategory('');
      setAddress('');
      setWard('');
      setLatitude(0);
      setLongitude(0);
      setHasResolvedCoords(false);
      setLocationSource('default');
      setMatchedTypedPlace(null);
      setNearestCenter(null);
      lastForwardResolvedRef.current = '';
      setImagePreview(null);
      setImageBase64(null);
      return;
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen, stopCameraStream]);

  // Lookup real nearest Municipal Corporation Officer Center for any coordinate
  const lookupNearestCenter = async (
    lat: number,
    lon: number,
    addr: string,
    wardVal: string,
    cityVal?: string,
    stateVal?: string
  ) => {
    setIsLoadingCenter(true);
    try {
      const center = await findNearestMunicipalCenter({
        latitude: lat,
        longitude: lon,
        address: addr,
        ward: wardVal,
        city: cityVal,
        state: stateVal,
        language,
      });
      // Guard against stale async lookup overwriting if user edited to a non-Delhi address
      const latestAddr = addressRef.current.trim();
      if (latestAddr && !looksLikeDelhiNcrLocation(latestAddr) && looksLikeDelhiNcrLocation(`${center.center_name} ${center.center_address}`)) {
        return null;
      }
      setNearestCenter(center);
      return center;
    } finally {
      setIsLoadingCenter(false);
    }
  };

  // Forward-geocode a typed address/place (e.g. "iiit kota,ranpur,rajasthan") to exact coordinates + area municipal center
  const resolveTypedAddressLocation = async (queryText: string) => {
    const cleaned = queryText.trim();
    if (cleaned.length < 3) return null;

    setIsResolvingTypedAddress(true);
    try {
      const resolved = await forwardGeocodeLocation(cleaned, language);
      // Skip applying stale results if user already edited address significantly
      if (addressRef.current.trim().toLowerCase() !== cleaned.toLowerCase()) {
        return null;
      }
      if (resolved) {
        lastForwardResolvedRef.current = cleaned.toLowerCase();
        setLatitude(resolved.latitude);
        setLongitude(resolved.longitude);
        setHasResolvedCoords(true);
        setWard(resolved.ward);
        setGpsAccuracy(null);
        setMatchedTypedPlace(resolved.exactAddress);
        const center = await lookupNearestCenter(
          resolved.latitude,
          resolved.longitude,
          resolved.exactAddress,
          resolved.ward,
          resolved.city,
          resolved.state
        );
        return { resolved, center };
      }
      if (!looksLikeDelhiNcrLocation(cleaned)) {
        setHasResolvedCoords(false);
        setNearestCenter({
          center_name: `${cleaned} Municipal Corporation Sanitation Center`,
          center_address: cleaned,
          distance_km: null,
          authority_type: language === 'hi' ? 'क्षेत्रीय नगर निगम स्वच्छता केंद्र' : 'Area Municipal Sanitation Officer Center',
          contact_phone: null,
          website: null,
          helpline: '1969',
          provider: 'civic_authority_derived',
        });
      }
      return null;
    } finally {
      setIsResolvingTypedAddress(false);
    }
  };

  // Automatically pinpoint typed address after short pause (450ms) when user types manually
  useEffect(() => {
    if (!isOpen || locationSource !== 'manual') return;
    const cleaned = address.trim();
    if (cleaned.length < 4 || cleaned.toLowerCase() === lastForwardResolvedRef.current) return;

    const timer = setTimeout(() => {
      void resolveTypedAddressLocation(cleaned);
    }, 450);

    return () => clearTimeout(timer);
  }, [address, locationSource, isOpen]);

  // Resolve exact area address and ward from coordinates
  const resolveExactAreaFromCoordinates = async (
    lat: number,
    lon: number,
    source: 'camera_gps' | 'photo_exif' | 'live_gps',
    accuracy?: number
  ) => {
    setIsResolvingPhotoLocation(true);
    setLatitude(lat);
    setLongitude(lon);
    setHasResolvedCoords(true);
    setGpsAccuracy(typeof accuracy === 'number' ? Math.round(accuracy) : null);
    setLocationSource(source);
    setMatchedTypedPlace(null);

    try {
      const resolved = await reverseGeocodeExactLocation(lat, lon, language);
      setAddress(resolved.exactAddress);
      lastForwardResolvedRef.current = resolved.exactAddress.toLowerCase();
      setWard(resolved.ward);
      await Promise.all([
        checkDuplicates(lat, lon, category || 'Garbage'),
        lookupNearestCenter(lat, lon, resolved.exactAddress, resolved.ward, resolved.city, resolved.state),
      ]);
    } finally {
      setIsResolvingPhotoLocation(false);
    }
  };

  // Start pre-warming high-accuracy GPS while user aims the camera
  const startCameraGpsPrewarm = () => {
    if (!navigator.geolocation) return;
    stopGpsWatcher();

    try {
      geoWatchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const nextFix = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: Date.now(),
          };
          const prev = liveGpsRef.current;
          // Prefer fresher fix or tighter accuracy
          if (!prev || nextFix.accuracy <= prev.accuracy || nextFix.timestamp - prev.timestamp > 4000) {
            liveGpsRef.current = nextFix;
            setLiveGpsStatus(nextFix);
          }
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
    } catch {}
  };

  // Camera Management
  const startCamera = async (facing: 'environment' | 'user' = cameraFacingMode) => {
    setCameraError(null);
    setIsCameraActive(true);
    setMediaMode('camera');
    startCameraGpsPrewarm();

    try {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera access failed:', err);
      setCameraError(
        language === 'hi'
          ? 'कैमरा खोलने में असमर्थ। कृपया कैमरा अनुमति दें या डिवाइस से फोटो चुनें।'
          : 'Unable to access camera. Please allow camera permissions or upload an image from your device.'
      );
      setIsCameraActive(false);
      stopGpsWatcher();
    }
  };

  const flipCamera = () => {
    const nextFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setImagePreview(dataUrl);
    setImageBase64(dataUrl);

    // Grab the pre-warmed high-accuracy GPS snapshot BEFORE stopping watcher
    const warmFix = liveGpsRef.current;
    stopCameraStream();
    setMediaMode('upload');

    // Only auto-lock GPS if the citizen has NOT manually entered a specific address
    const hasManualTyped = locationSourceRef.current === 'manual' && addressRef.current.trim().length >= 3;
    if (hasManualTyped) {
      return;
    }

    // Immediately resolve the exact area location of the captured photo
    setIsLocating(true);
    setIsResolvingPhotoLocation(true);
    try {
      const isWarmFixFresh = warmFix && Date.now() - warmFix.timestamp < 20000 && warmFix.accuracy <= 100;
      if (isWarmFixFresh && warmFix) {
        await resolveExactAreaFromCoordinates(warmFix.latitude, warmFix.longitude, 'camera_gps', warmFix.accuracy);
      } else {
        const pos = await getExactCurrentPosition(12000);
        await resolveExactAreaFromCoordinates(
          pos.coords.latitude,
          pos.coords.longitude,
          'camera_gps',
          pos.coords.accuracy
        );
      }
    } catch {
      if (warmFix) {
        await resolveExactAreaFromCoordinates(warmFix.latitude, warmFix.longitude, 'camera_gps', warmFix.accuracy);
      }
    } finally {
      setIsLocating(false);
      setIsResolvingPhotoLocation(false);
    }
  };

  const removePhoto = () => {
    setImagePreview(null);
    setImageBase64(null);
    stopCameraStream();
  };

  // Text to Speech playback for voice accessibility
  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    if (isSpeakingBack) {
      setIsSpeakingBack(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceLang === 'hi-IN' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeakingBack(false);
    utterance.onerror = () => setIsSpeakingBack(false);

    setIsSpeakingBack(true);
    window.speechSynthesis.speak(utterance);
  };

  // Handle Manual High-Accuracy Geolocation
  const handleGetLocation = async () => {
    if (!navigator.geolocation) {
      alert(language === 'hi' ? 'ब्राउज़र में जीपीएस लोकेशन समर्थित नहीं है।' : 'Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    try {
      const pos = await getExactCurrentPosition(12000);
      await resolveExactAreaFromCoordinates(
        pos.coords.latitude,
        pos.coords.longitude,
        'live_gps',
        pos.coords.accuracy
      );
    } catch {
      alert(
        language === 'hi'
          ? 'जीपीएस स्थान प्राप्त नहीं हो सका। कृपया स्थान अनुमति (Location Permission) चालू करें या नीचे क्षेत्र चुनें।'
          : 'Could not retrieve exact GPS location. Please allow Location Permission or select your locality below.'
      );
    } finally {
      setIsLocating(false);
    }
  };

  // Fast client-side JPEG compression for large camera roll uploads (>250KB or >1280px)
  const compressImageDataUrl = (rawDataUrl: string): Promise<string> =>
    new Promise((resolve) => {
      if (rawDataUrl.length < 280_000) {
        resolve(rawDataUrl);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const maxDim = 1280;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const offCanvas = document.createElement('canvas');
        offCanvas.width = width;
        offCanvas.height = height;
        const ctx = offCanvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(offCanvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => resolve(rawDataUrl);
      img.src = rawDataUrl;
    });

  // Handle Image Upload from disk (extracts embedded EXIF GPS first, else auto-locks live GPS)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert(language === 'hi' ? 'फाइल बहुत बड़ी है। कृपया 15MB से कम की फोटो चुनें।' : 'File is too large. Please upload an image under 15MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawB64 = event.target?.result as string;
      const optimized = await compressImageDataUrl(rawB64);
      setImagePreview(optimized);
      setImageBase64(optimized);
    };
    reader.readAsDataURL(file);

    // Extract exact EXIF GPS coordinates from the photo if available; only use device GPS if user hasn't manually typed an address
    const hasManualTyped = locationSourceRef.current === 'manual' && addressRef.current.trim().length >= 3;
    setIsResolvingPhotoLocation(true);
    setIsLocating(true);
    try {
      const exifGps = await extractExifGpsFromFile(file);
      if (exifGps) {
        await resolveExactAreaFromCoordinates(exifGps.latitude, exifGps.longitude, 'photo_exif');
      } else if (!hasManualTyped) {
        const pos = await getExactCurrentPosition(6000);
        await resolveExactAreaFromCoordinates(
          pos.coords.latitude,
          pos.coords.longitude,
          'live_gps',
          pos.coords.accuracy
        );
      }
    } catch {
      // Permission denied or unavailable; leave user able to enter/select manually
    } finally {
      setIsLocating(false);
      setIsResolvingPhotoLocation(false);
    }
  };

  // Run AI Diagnostic Preview
  const handleRunAiAnalysis = async () => {
    if (!description.trim() && !imageBase64) {
      alert(language === 'hi' ? 'कृपया समस्या का विवरण बोलें/लिखें या फोटो संलग्न करें।' : 'Please speak or type a brief problem description or upload/capture a photo.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const res = await geminiClient.analyzeComplaint({
        description: description || (language === 'hi' ? 'नागरिक पोर्टल द्वारा दर्ज की गई स्वच्छता समस्या' : 'Sanitation garbage issue reported via citizen portal'),
        category,
        address,
        ward,
        imageBase64: imageBase64 || undefined,
      });

      setAiAnalysis(res.analysis);
      if (res.analysis.category && !category) {
        setCategory(res.analysis.category);
      }

      await checkDuplicates(latitude, longitude, res.analysis.category || category || 'Garbage');
    } catch (e: any) {
      console.error(e);
      alert((language === 'hi' ? 'एआई विश्लेषण त्रुटि: ' : 'AI Analysis failed: ') + e.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Check duplicate complaints in 400m
  const checkDuplicates = async (lat: number, lng: number, cat: string) => {
    try {
      const { duplicates, clusterId } = await dbService.checkNearbyDuplicates(lat, lng, cat, 400);
      if (duplicates.length > 0) {
        setDuplicateWarning({ count: duplicates.length, clusterId });
      } else {
        setDuplicateWarning(null);
      }
    } catch (e) {}
  };

  // AI Voice Auto-Fill & Local Language Understanding
  const handleVoiceAutoFill = async () => {
    const textToProcess = description || transcript;
    if (!textToProcess || !textToProcess.trim()) {
      alert(language === 'hi' ? 'कृपया पहले माइक चालू करके बोलें।' : 'Please speak into the microphone first.');
      return;
    }
    setIsAiVoiceProcessing(true);
    try {
      const { result } = await geminiClient.processVoice({
        spokenText: textToProcess,
        userWard: ward,
        preferredLang: language,
      });

      if (result.category) {
        setCategory(result.category);
      }
      const hasLockedOrManual =
        locationSourceRef.current === 'camera_gps' ||
        locationSourceRef.current === 'photo_exif' ||
        locationSourceRef.current === 'live_gps' ||
        (locationSourceRef.current === 'manual' && addressRef.current.trim().length >= 3);
      if (!hasLockedOrManual) {
        if (result.address && result.address !== 'Current Resident Locality') {
          setAddress(result.address);
          setLocationSource('manual');
        }
        if (result.ward) {
          setWard(result.ward);
        }
      }
      if (result.spokenResponse) {
        speakText(result.spokenResponse);
      }
    } catch (err: any) {
      console.warn('Voice auto-fill error:', err);
    } finally {
      setIsAiVoiceProcessing(false);
    }
  };

  // Instant baseline triage helper so submit finishes immediately while Gemini refines in background
  const buildImmediateBaselineAnalysis = (desc: string, selectedCat: string) => {
    const text = `${selectedCat} ${desc}`.toLowerCase();
    let severity = 68;
    let urgency: Complaint['urgency'] = 'High';
    let healthRisk: Complaint['health_risk'] = 'Medium';
    let dept = language === 'hi' ? 'नगर निगम ठोस अपशिष्ट प्रबंधन विभाग' : 'Municipal Solid Waste Management Dept';

    if (text.includes('dead animal') || text.includes('मृत') || text.includes('carcass')) {
      severity = 92;
      urgency = 'Critical';
      healthRisk = 'Severe';
      dept = 'Municipal Veterinary & Bio-Sanitation Squad';
    } else if (text.includes('sewage') || text.includes('नाली') || text.includes('drain') || text.includes('overflow')) {
      severity = 84;
      urgency = 'Critical';
      healthRisk = 'High';
      dept = 'Municipal Drainage & Sewerage Wing';
    } else if (text.includes('waterlog') || text.includes('पानी')) {
      severity = 76;
      urgency = 'High';
      healthRisk = 'High';
      dept = 'Stormwater & Pumping Operations Dept';
    } else if (text.includes('toilet') || text.includes('शौचालय')) {
      severity = 74;
      urgency = 'High';
      healthRisk = 'High';
      dept = 'Public Conveniences Maintenance Wing';
    }

    return {
      severity,
      urgency,
      healthRisk,
      dept,
    };
  };

  // Submit Complaint Workflow (Instant submission; Gemini & OSM enrichment run without delaying the citizen)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() && !imageBase64) {
      alert(language === 'hi' ? 'कृपया माइक में बोलें या समस्या का विवरण लिखें।' : 'Please speak into the microphone or type your problem description.');
      return;
    }

    const finalDescription = description.trim() || (language === 'hi' ? 'नागरिक द्वारा जीपीएस लोकेशन के साथ दर्ज की गई कचरा समस्या।' : 'Sanitation and garbage pile reported by citizen with GPS location.');
    const baseline = buildImmediateBaselineAnalysis(finalDescription, category);

    setIsSubmitting(true);
    try {
      const analysisData = aiAnalysis;
      let submitLat = latitude;
      let submitLon = longitude;
      let submitWard = ward;
      let submitCenter = nearestCenter;

      // If user typed a custom place/address (e.g. "iiit kota,ranpur,rajasthan"), resolve it cleanly first
      const cleanedAddr = address.trim();
      const needsTypedResolve =
        (locationSource === 'manual' || locationSource === 'default') &&
        cleanedAddr.length >= 3 &&
        (!hasResolvedCoords || cleanedAddr.toLowerCase() !== lastForwardResolvedRef.current);

      if (needsTypedResolve) {
        submitCenter = null;
        const quickResolve = await Promise.race([
          resolveTypedAddressLocation(cleanedAddr),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 6500)),
        ]);
        if (quickResolve) {
          submitLat = quickResolve.resolved.latitude;
          submitLon = quickResolve.resolved.longitude;
          submitWard = quickResolve.resolved.ward;
          submitCenter = quickResolve.center || null;
        } else {
          if (!looksLikeDelhiNcrLocation(cleanedAddr)) {
            submitLat = 0;
            submitLon = 0;
            if (!submitWard || submitWard.includes('Ward ') || looksLikeDelhiNcrLocation(submitWard)) {
              submitWard = cleanedAddr;
            }
            submitCenter = {
              center_name: `${cleanedAddr} Municipal Corporation Sanitation Center`,
              center_address: cleanedAddr,
              authority_type: language === 'hi' ? 'क्षेत्रीय नगर निगम स्वच्छता केंद्र' : 'Area Municipal Sanitation Officer Center',
              contact_phone: null,
              website: null,
              helpline: '1969',
              provider: 'civic_authority_derived',
            };
          }
        }
      } else {
        if (!submitWard || (!looksLikeDelhiNcrLocation(cleanedAddr) && (submitWard.includes('Ward ') || looksLikeDelhiNcrLocation(submitWard)))) {
          submitWard = cleanedAddr;
        }
        if (
          cleanedAddr.length >= 3 &&
          !looksLikeDelhiNcrLocation(cleanedAddr) &&
          submitCenter &&
          looksLikeDelhiNcrLocation(`${submitCenter.center_name} ${submitCenter.center_address || ''}`)
        ) {
          submitCenter = null;
        }
      }

      const created = await dbService.createComplaint({
        citizen_id: user?.id || 'citizen-local',
        citizen_name: user?.name || (language === 'hi' ? 'नागरिक' : 'Citizen'),
        citizen_phone: user?.phone || undefined,
        description: finalDescription,
        category: analysisData?.category || category || 'Garbage',
        subcategory: analysisData?.subcategory,
        latitude: submitLat,
        longitude: submitLon,
        address: cleanedAddr || submitWard,
        ward: submitWard,
        severity_score: analysisData?.severity || baseline.severity,
        urgency: analysisData?.urgency || baseline.urgency,
        health_risk: analysisData?.healthRisk || baseline.healthRisk,
        population_impact: analysisData?.populationImpact || 65,
        ai_summary: analysisData?.summary || (language === 'hi' ? 'सटीक जीपीएस व स्थानीय केंद्र विवरण के साथ दर्ज।' : 'Submitted with exact GPS location & routed to nearest municipal center.'),
        ai_confidence: analysisData?.confidence || 0.9,
        recommended_department: analysisData?.recommendedDepartment || baseline.dept,
        media_url: imagePreview || undefined,
        nearest_municipal_center: submitCenter || undefined,
        ai_analysis_data: {
          recommended_action: analysisData?.recommendedAction,
        },
      });

      setSubmittedComplaint(created);
      onSuccess(created);

      // If Gemini analysis wasn't pre-run manually, enrich quietly in background without making the user wait
      if (!analysisData) {
        geminiClient
          .analyzeComplaint({
            description: finalDescription,
            category,
            address,
            ward,
            imageBase64: imageBase64 || undefined,
          })
          .then(async (res) => {
            if (!res?.analysis) return;
            const enriched = await dbService.updateComplaintEnrichment(created.id, {
              category: res.analysis.category || created.category,
              subcategory: res.analysis.subcategory || created.subcategory,
              severity_score: res.analysis.severity || created.severity_score,
              urgency: res.analysis.urgency || created.urgency,
              health_risk: res.analysis.healthRisk || created.health_risk,
              population_impact: res.analysis.populationImpact || created.population_impact,
              ai_summary: res.analysis.summary || created.ai_summary,
              ai_confidence: res.analysis.confidence || created.ai_confidence,
              recommended_department: res.analysis.recommendedDepartment || created.recommended_department,
            });
            if (enriched) {
              setSubmittedComplaint((prev) => (prev && prev.id === created.id ? { ...enriched } : prev));
            }
          })
          .catch(() => {});
      }
    } catch (err: any) {
      alert((language === 'hi' ? 'शिकायत दर्ज करने में त्रुटि: ' : 'Error submitting complaint: ') + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Hidden Canvas for Camera Frame Capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-2xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-base font-display">
                  {t.reportModalTitle}
                </h3>
              </div>
              <p className="text-xs text-slate-500">{t.reportModalSubtitle}</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-sm">
          {submittedComplaint ? (
            /* Success View */
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 font-display">{t.complaintSuccessTitle}</h3>
                <p className="text-sm text-indigo-600 font-mono font-bold mt-1">
                  {t.complaintIdLabel}: {submittedComplaint.complaint_number}
                </p>
                <p className="text-xs text-slate-600 max-w-md mx-auto mt-2 font-medium">
                  {language === 'hi' ? 'जेमिनी एआई ने गंभीरता ' : 'Gemini evaluated severity as '}
                  <span className="font-bold text-slate-900">{submittedComplaint.severity_score}/100</span>
                  {language === 'hi' ? ' आंकी है। संबंधित विभाग: ' : '. Routed to '}
                  <span className="font-semibold text-slate-900">{submittedComplaint.recommended_department}</span>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2 max-w-md mx-auto shadow-2xs">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">{t.wardLabel}</span>
                  <span className="text-slate-900 font-bold text-right">{tWard(submittedComplaint.ward)}</span>
                </div>
                <div className="flex justify-between gap-2 items-start">
                  <span className="text-slate-500 shrink-0">{t.streetLandmarkLabel}</span>
                  <div className="text-right space-y-1">
                    <span className="text-slate-800 font-semibold block">{submittedComplaint.address}</span>
                    <a
                      href={buildSpotMapUrl(
                        submittedComplaint.latitude,
                        submittedComplaint.longitude,
                        submittedComplaint.address
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline"
                    >
                      <MapPin className="w-3 h-3" />
                      <span>{language === 'hi' ? 'स्पॉट मानचित्र खोलें' : 'Open Spot Map'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">SLA</span>
                  <span className="text-emerald-600 font-bold">{t.slaTargetActive}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">{t.categoryLabel}</span>
                  <span className="text-indigo-600 font-bold">{t.aiVerifiedEnqueued}</span>
                </div>
              </div>

              {submittedComplaint.nearest_municipal_center && (
                <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-left text-xs space-y-1.5 max-w-md mx-auto shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      {language === 'hi'
                        ? 'निकटतम नगर निगम अधिकारी केंद्र को भेजा गया'
                        : 'Dispatched to Nearest Municipal Officer Center'}
                    </span>
                    {submittedComplaint.nearest_municipal_center.distance_km != null && (
                      <span className="px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-700 font-mono text-[10px] font-bold">
                        {submittedComplaint.nearest_municipal_center.distance_km} km
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-slate-900">
                    {submittedComplaint.nearest_municipal_center.center_name}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    {submittedComplaint.nearest_municipal_center.center_address}
                  </p>
                  <div className="flex items-center justify-between pt-1 text-[10px] text-indigo-700 font-semibold">
                    <span>
                      {language === 'hi' ? 'डिस्पैच आईडी: ' : 'Dispatch ID: '}
                      <span className="font-mono">{submittedComplaint.nearest_municipal_center.dispatch_id}</span>
                    </span>
                    {(submittedComplaint.nearest_municipal_center.center_latitude ||
                      submittedComplaint.nearest_municipal_center.center_address) && (
                      <a
                        href={buildSpotMapUrl(
                          submittedComplaint.nearest_municipal_center.center_latitude,
                          submittedComplaint.nearest_municipal_center.center_longitude,
                          submittedComplaint.nearest_municipal_center.center_address
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        <span>{language === 'hi' ? 'केंद्र मानचित्र देखें' : 'View Office'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    stopCameraStream();
                    onClose();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  {t.returnDashboard}
                </button>
              </div>
            </div>
          ) : (
            /* Submission Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* ACCESSIBLE VOICE RECORDING ASSISTANT (FOR ILLITERATE / NON-TYPING USERS) */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-violet-50/60 to-slate-50 border-2 border-indigo-200/90 shadow-2xs space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl text-white ${isListening ? 'bg-rose-600 animate-pulse' : 'bg-indigo-600'}`}>
                      <Mic className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <span>{t.voiceAssistantTitle}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                          Voice Mic
                        </span>
                      </span>
                      <p className="text-[11px] text-slate-500">
                        {t.voiceAssistantDesc}
                      </p>
                    </div>
                  </div>

                  {/* Language Selector for Speech */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs text-[11px]">
                    <button
                      type="button"
                      onClick={() => setVoiceLang('hi-IN')}
                      className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                        voiceLang === 'hi-IN' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      हिन्दी
                    </button>
                    <button
                      type="button"
                      onClick={() => setVoiceLang('en-IN')}
                      className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                        voiceLang === 'en-IN' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      English
                    </button>
                  </div>
                </div>

                {/* Big Voice Button Bar */}
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (isListening) {
                        stopListening();
                      } else {
                        startListening(voiceLang);
                      }
                    }}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition cursor-pointer shadow-xs ${
                      isListening
                        ? 'bg-rose-600 hover:bg-rose-700 text-white ring-4 ring-rose-200 animate-pulse'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-4 h-4" />
                        <span>{t.voiceMicListening}</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4" />
                        <span>{voiceLang === 'hi-IN' ? '🎙️ माइक चालू करें (हिन्दी)' : '🎙️ Tap to Speak (English)'}</span>
                      </>
                    )}
                  </button>

                  {description && (
                    <button
                      type="button"
                      onClick={() => speakText(description)}
                      title={t.listenToRecording}
                      className={`p-3 rounded-xl border font-bold transition cursor-pointer shrink-0 ${
                        isSpeakingBack
                          ? 'bg-amber-100 border-amber-300 text-amber-800 animate-pulse'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {isSpeakingBack ? <VolumeX className="w-4 h-4 text-amber-700" /> : <Volume2 className="w-4 h-4 text-indigo-600" />}
                    </button>
                  )}
                </div>

                {/* AI Voice Auto-Fill Button */}
                {description && (
                  <button
                    type="button"
                    onClick={handleVoiceAutoFill}
                    disabled={isAiVoiceProcessing}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-2xs"
                  >
                    {isAiVoiceProcessing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    <span>
                      {isAiVoiceProcessing
                        ? (language === 'hi' ? 'एआई आवाज समझ रहा है...' : 'AI Processing Voice...')
                        : (language === 'hi' ? '✨ आवाज से श्रेणी व स्थान स्वतः भरें (AI Auto-Fill)' : '✨ AI Auto-Fill Category & Location From Voice')}
                    </span>
                  </button>
                )}

                {/* Speech status & Live feedback */}
                {isListening && (
                  <div className="flex items-center gap-2 text-xs text-rose-700 font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-200 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                    <span>{t.voiceListeningPrompt}</span>
                    {interimTranscript && <span className="font-normal italic text-slate-700 truncate">"{interimTranscript}"</span>}
                  </div>
                )}

                {speechError && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200 font-medium">
                    {speechError}
                  </p>
                )}
              </div>

              {/* Problem Description (Populated by voice or keyboard) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span>{t.problemDescription}</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  {description && (
                    <button
                      type="button"
                      onClick={() => {
                        setDescription('');
                        resetTranscript();
                      }}
                      className="text-[10px] text-slate-400 hover:text-slate-600 font-bold"
                    >
                      {t.clearText}
                    </button>
                  )}
                </div>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.problemPlaceholder}
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs font-medium"
                />
              </div>

              {/* MEDIA CAPTURE & UPLOAD (TAKE PHOTO OF GARBAGE AREA OR UPLOAD) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span>{t.garbagePhotoTitle}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-bold">
                      {t.photoOptionalBadge}
                    </span>
                  </label>
                </div>

                {/* Media Actions Selector */}
                {!imagePreview && !isCameraActive && (
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Live Camera Option */}
                    <button
                      type="button"
                      onClick={() => startCamera('environment')}
                      className="p-3.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100/80 border-2 border-indigo-200 text-indigo-900 flex flex-col items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs group"
                    >
                      <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs group-hover:scale-105 transition">
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold">{t.takePhotoCamera}</span>
                      <span className="text-[10px] text-indigo-600 font-medium">{t.takePhotoSubtext}</span>
                    </button>

                    {/* File Upload Option */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-300 text-slate-700 flex flex-col items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs group"
                    >
                      <div className="p-2 rounded-xl bg-white text-slate-700 border border-slate-200 shadow-2xs group-hover:scale-105 transition">
                        <Upload className="w-5 h-5 text-indigo-600" />
                      </div>
                      <span className="text-xs font-bold">{t.uploadFromGallery}</span>
                      <span className="text-[10px] text-slate-500 font-medium">{t.uploadFromGallerySubtext}</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                )}

                {/* Live Camera Viewfinder */}
                {isCameraActive && (
                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 border-2 border-indigo-500 p-2 shadow-lg">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-56 sm:h-64 object-cover rounded-xl bg-black"
                    />

                    {/* Live GPS Lock Indicator on Camera Viewfinder */}
                    <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-xs border border-white/15 text-[10px] font-bold text-white shadow-sm">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          liveGpsStatus ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'
                        }`}
                      />
                      <span>
                        {liveGpsStatus
                          ? language === 'hi'
                            ? `सटीक GPS तैयार (±${Math.round(liveGpsStatus.accuracy)}m)`
                            : `Exact GPS Ready (±${Math.round(liveGpsStatus.accuracy)}m)`
                          : language === 'hi'
                          ? 'सटीक क्षेत्र GPS खोज रहे हैं...'
                          : 'Locking Exact Area GPS...'}
                      </span>
                    </div>

                    {/* Viewfinder Target Grid Overlay */}
                    <div className="absolute inset-4 pointer-events-none border border-white/20 rounded-xl flex items-center justify-center">
                      <div className="w-16 h-16 border-2 border-dashed border-white/60 rounded-xl" />
                    </div>

                    {/* Camera Control Bar */}
                    <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-3 px-4">
                      <button
                        type="button"
                        onClick={flipCamera}
                        title={t.flipCamera}
                        className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-xs border border-white/20 transition cursor-pointer"
                      >
                        <SwitchCamera className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg ring-4 ring-indigo-400/50 transition cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        <span>{t.snapPhoto}</span>
                      </button>

                      <button
                        type="button"
                        onClick={stopCameraStream}
                        className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-slate-300 hover:text-white backdrop-blur-xs border border-white/20 transition cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Camera Error Message */}
                {cameraError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
                    <span>{cameraError}</span>
                    <button
                      type="button"
                      onClick={() => setCameraError(null)}
                      className="text-rose-600 font-bold hover:underline"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Captured / Uploaded Image Preview + Exact Photo Location Status */}
                {imagePreview && (
                  <div className="space-y-2">
                    <div className="relative rounded-2xl overflow-hidden border-2 border-indigo-300 bg-slate-900">
                      <img src={imagePreview} alt="Captured garbage preview" className="w-full max-h-52 object-cover rounded-2xl" />
                      <div className="absolute bottom-2 right-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startCamera('environment')}
                          className="px-3 py-1 text-[11px] font-bold bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl backdrop-blur-xs border border-white/20 transition cursor-pointer flex items-center gap-1"
                        >
                          <Camera className="w-3 h-3 text-indigo-400" />
                          <span>{t.retakePhoto}</span>
                        </button>
                        <button
                          type="button"
                          onClick={removePhoto}
                          className="px-3 py-1 text-[11px] font-bold bg-rose-900/80 hover:bg-rose-900 text-white rounded-xl backdrop-blur-xs border border-white/20 transition cursor-pointer flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          <span>{t.removePhoto}</span>
                        </button>
                      </div>
                      <span className="absolute top-2 left-2 px-2.5 py-1 text-[10px] font-bold bg-emerald-600 text-white rounded-lg shadow-sm flex items-center gap-1">
                        <Check className="w-3 h-3" /> {t.photoAttachedBadge}
                      </span>
                    </div>

                    {/* Exact Area Location Locked Banner after Photo Capture/Upload */}
                    {isResolvingPhotoLocation ? (
                      <div className="px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 shrink-0" />
                        <span>
                          {language === 'hi'
                            ? 'फोटो के स्थान का सटीक पता और क्षेत्र निकाला जा रहा है...'
                            : 'Pinpointing exact area address from photo GPS...'}
                        </span>
                      </div>
                    ) : (locationSource === 'camera_gps' || locationSource === 'photo_exif' || locationSource === 'live_gps') ? (
                      <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <div className="font-bold flex items-center gap-1.5 flex-wrap">
                              <span>
                                {locationSource === 'photo_exif'
                                  ? language === 'hi'
                                    ? 'फोटो EXIF GPS से सटीक क्षेत्र लॉक'
                                    : 'Exact Area from Photo GPS'
                                  : language === 'hi'
                                  ? 'फोटो लेते समय सटीक क्षेत्र लॉक'
                                  : 'Exact Area Locked on Photo'}
                              </span>
                              {gpsAccuracy !== null && (
                                <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-mono">
                                  ±{gpsAccuracy}m
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-emerald-800 font-medium truncate mt-0.5">
                              {address}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-700 shrink-0 pt-0.5">
                          {latitude.toFixed(4)}, {longitude.toFixed(4)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Location Controls - Simple, Community-Friendly */}
              <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                {/* Prominent Auto-Detect Spot Banner */}
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isLocating}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-indigo-200 transition cursor-pointer disabled:opacity-50"
                >
                  <Navigation className={`w-4 h-4 text-white ${isLocating ? 'animate-spin' : ''}`} />
                  <span>
                    {isLocating
                      ? (language === 'hi' ? 'जीपीएस द्वारा स्थान खोजा जा रहा है...' : 'Detecting your GPS location...')
                      : (language === 'hi' ? '📍 मेरा वर्तमान स्थान स्वतः लें (जीपीएस)' : '📍 Auto-Detect My Location (GPS)')}
                  </span>
                </button>

                {/* 1-Tap Quick Locality Chips */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    {language === 'hi' ? 'या अपना क्षेत्र चुनें (1-क्लिक):' : 'Or Select Your Locality (1-Tap):'}
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {DELHI_COMMUNITY_LOCALITIES.slice(0, 8).map((loc) => {
                      const isSelected = ward === loc.ward;
                      return (
                        <button
                          key={loc.ward}
                          type="button"
                          onClick={() => {
                            const addrText = language === 'hi' ? loc.defaultLandmarkHi : loc.defaultLandmarkEn;
                            setWard(loc.ward);
                            setLatitude(loc.latitude);
                            setLongitude(loc.longitude);
                            setHasResolvedCoords(true);
                            setAddress(addrText);
                            lastForwardResolvedRef.current = addrText.toLowerCase();
                            setMatchedTypedPlace(null);
                            setLocationSource('manual');
                            setGpsAccuracy(null);
                            void lookupNearestCenter(loc.latitude, loc.longitude, addrText, loc.ward);
                          }}
                          className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {language === 'hi' ? loc.nameHi : loc.nameEn}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/60">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      {t.streetLandmarkLabel}
                    </label>
                    <div className="relative flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          value={address}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAddress(val);
                            setLocationSource('manual');
                            setHasResolvedCoords(false);
                            setMatchedTypedPlace(null);
                            lastForwardResolvedRef.current = '';
                            setNearestCenter(null);
                            if (
                              val.trim().length >= 3 &&
                              (ward.includes('Ward ') || looksLikeDelhiNcrLocation(ward))
                            ) {
                              setWard(val.trim());
                            }
                          }}
                          placeholder={
                            language === 'hi'
                              ? 'उदा. रणपुर, IIIT कोटा, राजस्थान या गली/स्थान'
                              : 'e.g. Ranpur, IIIT Kota, Rajasthan / Street'
                          }
                          className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs font-medium"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={isResolvingTypedAddress || address.trim().length < 3}
                        onClick={() => void resolveTypedAddressLocation(address)}
                        title={language === 'hi' ? 'सटीक स्थान खोजें' : 'Pinpoint typed location'}
                        className="px-2.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[11px] font-bold shrink-0 transition cursor-pointer disabled:opacity-40"
                      >
                        {isResolvingTypedAddress ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <span>{language === 'hi' ? 'खोजें' : 'Locate'}</span>
                        )}
                      </button>
                    </div>
                    {(matchedTypedPlace || address.trim().length >= 3) && (
                      <div className="mt-1 flex items-center justify-between gap-2 text-[10px]">
                        {matchedTypedPlace ? (
                          <p className="text-emerald-700 font-semibold flex items-center gap-1 min-w-0">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="truncate">
                              {matchedTypedPlace} ({latitude.toFixed(4)}, {longitude.toFixed(4)})
                            </span>
                          </p>
                        ) : (
                          <span className="text-slate-500 truncate">
                            {isResolvingTypedAddress
                              ? language === 'hi'
                                ? 'स्थान खोजा जा रहा है...'
                                : 'Resolving exact area coordinates...'
                              : address}
                          </span>
                        )}
                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={buildSpotMapUrl(
                              hasResolvedCoords ? latitude : null,
                              hasResolvedCoords ? longitude : null,
                              matchedTypedPlace || address
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-indigo-600 font-bold hover:underline"
                          >
                            <span>{language === 'hi' ? 'स्पॉट मानचित्र' : 'Open Spot Map'}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                          <a
                            href={buildGoogleMapsUrl(
                              hasResolvedCoords ? latitude : null,
                              hasResolvedCoords ? longitude : null,
                              matchedTypedPlace || address
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-emerald-700 font-bold hover:underline"
                          >
                            <span>Google Maps</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t.wardLabel}</label>
                    <select
                      value={ward}
                      onChange={(e) => {
                        setWard(e.target.value);
                        setLocationSource('manual');
                        setGpsAccuracy(null);
                        const matched = DELHI_COMMUNITY_LOCALITIES.find((l) => l.ward === e.target.value);
                        if (matched) {
                          const addrText = language === 'hi' ? matched.defaultLandmarkHi : matched.defaultLandmarkEn;
                          setAddress(addrText);
                          lastForwardResolvedRef.current = addrText.toLowerCase();
                          setMatchedTypedPlace(null);
                          setLatitude(matched.latitude);
                          setLongitude(matched.longitude);
                          setHasResolvedCoords(true);
                          void lookupNearestCenter(matched.latitude, matched.longitude, addrText, matched.ward);
                        }
                      }}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs font-medium cursor-pointer"
                    >
                      {!ward && (
                        <option value="">
                          {language === 'hi' ? '— अपना क्षेत्र टाइप करें या चुनें —' : '— Type location or choose area —'}
                        </option>
                      )}
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
                </div>

                {/* Live Spot Map Preview once exact spot coordinates are resolved */}
                {(() => {
                  const spotEmbedUrl = hasResolvedCoords ? buildOsmEmbedUrl(latitude, longitude, 0.008) : null;
                  if (!spotEmbedUrl) return null;
                  return (
                    <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                      <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span className="truncate">
                            {matchedTypedPlace || address} ({latitude.toFixed(4)}, {longitude.toFixed(4)})
                          </span>
                        </span>
                        <a
                          href={buildSpotMapUrl(latitude, longitude, matchedTypedPlace || address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 font-bold hover:underline inline-flex items-center gap-0.5 shrink-0"
                        >
                          <span>{language === 'hi' ? 'बड़ा मानचित्र' : 'Full Map'}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                      <iframe
                        title="Live Resolved Spot Map"
                        src={spotEmbedUrl}
                        className="w-full h-36 border-0"
                        loading="lazy"
                      />
                    </div>
                  );
                })()}

                {/* Real Nearest Municipal Corporation Officer Center Preview */}
                {(isLoadingCenter || nearestCenter) && (
                  <div className="p-3 rounded-xl bg-white border border-indigo-200/80 text-xs space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        {isLoadingCenter
                          ? language === 'hi'
                            ? 'निकटतम नगर निगम अधिकारी केंद्र खोजा जा रहा है...'
                            : 'Locating nearest Municipal Corporation Officer Center...'
                          : language === 'hi'
                          ? 'कार्रवाई हेतु निकटतम नगर निगम केंद्र:'
                          : 'Nearest Municipal Corporation Officer Center:'}
                      </span>
                      {nearestCenter?.distance_km != null && !isLoadingCenter && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold">
                          {nearestCenter.distance_km} km
                        </span>
                      )}
                    </div>
                    {nearestCenter && !isLoadingCenter && (
                      <>
                        <p className="font-bold text-slate-900 text-[11px]">{nearestCenter.center_name}</p>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] text-slate-500 truncate">{nearestCenter.center_address}</p>
                          {(nearestCenter.center_latitude || nearestCenter.center_address) && (
                            <a
                              href={buildSpotMapUrl(
                                nearestCenter.center_latitude,
                                nearestCenter.center_longitude,
                                nearestCenter.center_address
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-600 hover:underline shrink-0"
                            >
                              <span>{language === 'hi' ? 'केंद्र मानचित्र' : 'Center Map'}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Duplicate Detection Alert */}
              {duplicateWarning && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 shadow-2xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-900">{t.possibleDuplicateTitle}</span>
                    <p className="text-[11px] text-amber-800 mt-0.5 font-medium">
                      {duplicateWarning.count} {t.possibleDuplicateDesc} {duplicateWarning.clusterId ? `(${duplicateWarning.clusterId})` : ''}
                    </p>
                  </div>
                </div>
              )}

              {/* AI Diagnostic Trigger Button */}
              {!aiAnalysis && (
                <button
                  type="button"
                  onClick={handleRunAiAnalysis}
                  disabled={isAnalyzing}
                  className="w-full py-2.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : 'text-indigo-600'}`} />
                  <span>{isAnalyzing ? t.analyzingWithAi : t.previewAiDiagnostic}</span>
                </button>
              )}

              {/* Live Gemini AI Analysis Preview Card */}
              {aiAnalysis && (
                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      {t.aiDiagnosticTitle}
                    </span>
                    <span className="text-[11px] font-mono text-indigo-700 bg-white px-2 py-0.5 rounded-lg border border-indigo-200 font-bold">
                      {t.aiSeverityLabel}: {aiAnalysis.severity}/100
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 italic bg-white p-2.5 rounded-xl border border-indigo-100 font-medium">
                    "{aiAnalysis.summary}"
                  </p>

                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-white border border-indigo-100">
                      <span className="text-slate-400 block font-bold text-[10px] uppercase">{t.categoryLabel}</span>
                      <span className="font-bold text-slate-800">{aiAnalysis.category}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-indigo-100">
                      <span className="text-slate-400 block font-bold text-[10px] uppercase">{t.healthRiskLabel}</span>
                      <span className="font-bold text-amber-700">{aiAnalysis.healthRisk}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-indigo-100">
                      <span className="text-slate-400 block font-bold text-[10px] uppercase">{t.routingLabel}</span>
                      <span className="font-bold text-indigo-700 truncate block">
                        {aiAnalysis.recommendedDepartment}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                  {language === 'hi' ? 'एसएलए समय सीमा के भीतर सफाई दल की स्वचालित तैनाती' : 'Auto-prioritizes & dispatches squad under SLA timer'}
                </span>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-7 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-200/50 transition cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t.submittingBtn}</span>
                    </>
                  ) : (
                    <>
                      <span>{t.submitComplaintBtn}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
