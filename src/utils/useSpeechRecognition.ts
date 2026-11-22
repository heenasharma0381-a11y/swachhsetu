import { useState, useEffect, useRef, useCallback } from 'react';

// Extend window interface for Web Speech API
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export interface UseSpeechRecognitionOptions {
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  lang?: string; // 'hi-IN', 'en-IN', 'en-US'
  continuous?: boolean;
}

export const useSpeechRecognition = (options: UseSpeechRecognitionOptions = {}) => {
  const { onTranscript, lang = 'hi-IN', continuous = false } = options;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = continuous;
      recognition.interimResults = true;
      recognition.lang = lang;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            currentFinal += res[0].transcript;
          } else {
            currentInterim += res[0].transcript;
          }
        }

        if (currentFinal) {
          setTranscript((prev) => {
            const updated = prev ? `${prev} ${currentFinal}` : currentFinal;
            if (onTranscript) onTranscript(updated, true);
            return updated;
          });
          setInterimTranscript('');
        } else {
          setInterimTranscript(currentInterim);
          if (onTranscript) onTranscript(currentInterim, false);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setError('Microphone permission was denied. Please allow microphone access in your browser settings.');
        } else if (event.error !== 'no-speech') {
          setError(`Voice input notice: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
    } catch (e: any) {
      console.warn('Speech recognition setup failed:', e);
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [lang, continuous, onTranscript]);

  const startListening = useCallback((overrideLang?: string) => {
    if (!recognitionRef.current) {
      const win = window as unknown as IWindow;
      const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
        return;
      }
    }

    try {
      if (overrideLang && recognitionRef.current) {
        recognitionRef.current.lang = overrideLang;
      }
      setError(null);
      setInterimTranscript('');
      recognitionRef.current?.start();
      setIsListening(true);
    } catch (err: any) {
      console.warn('Error starting speech recognition:', err);
      // If already started, stop and restart
      try {
        recognitionRef.current?.stop();
        setTimeout(() => {
          recognitionRef.current?.start();
          setIsListening(true);
        }, 150);
      } catch (re) {}
    }
  }, []);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch (err) {}
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript,
  };
};
