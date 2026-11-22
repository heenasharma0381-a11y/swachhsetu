import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  Bell,
  X,
  Compass,
  Sparkles,
} from 'lucide-react';

export type ToastType = 'success' | 'info' | 'warning' | 'alert';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  complaintNumber?: string;
  duration?: number;
  action?: ToastAction;
  timestamp: string;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id' | 'timestamp'>) => void;
  dismissToast: (id: string) => void;
  playNotificationSound: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Web Audio API gentle notification ping
function playGentlePing() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Pleasant dual chime
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.08);

    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start();
    osc2.start(ctx.currentTime + 0.08);
    osc1.stop(ctx.currentTime + 0.45);
    osc2.stop(ctx.currentTime + 0.45);
  } catch {
    // Ignore audio autoplay restrictions gracefully
  }
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toastData: Omit<ToastItem, 'id' | 'timestamp'>) => {
      const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newToast: ToastItem = {
        ...toastData,
        id,
        timestamp,
        duration: toastData.duration ?? 5000,
      };

      setToasts((prev) => [newToast, ...prev.slice(0, 4)]);
      playGentlePing();

      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, newToast.duration);
      }
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        dismissToast,
        playNotificationSound: playGentlePing,
      }}
    >
      {children}

      {/* Floating Toast Container */}
      <div
        aria-live="polite"
        className="fixed top-4 right-3 sm:right-6 z-[9999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none select-none"
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isAlert = toast.type === 'alert' || toast.type === 'warning';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto transform transition-all duration-300 ease-out translate-y-0 opacity-100 flex flex-col p-4 rounded-2xl bg-white/95 backdrop-blur-md border shadow-2xl ${
                isSuccess
                  ? 'border-emerald-300 ring-2 ring-emerald-500/10'
                  : isAlert
                  ? 'border-rose-300 ring-2 ring-rose-500/10'
                  : 'border-indigo-300 ring-2 ring-indigo-500/10'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Icon Badge */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                    isSuccess
                      ? 'bg-emerald-100 text-emerald-700'
                      : isAlert
                      ? 'bg-rose-100 text-rose-700 animate-pulse'
                      : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  {isSuccess ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : isAlert ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <Bell className="w-5 h-5" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-bold text-slate-900 leading-tight truncate">
                      {toast.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {toast.timestamp}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-0.5 leading-snug line-clamp-2 font-medium">
                    {toast.message}
                  </p>

                  {/* Optional Action Button / Complaint ID */}
                  {(toast.complaintNumber || toast.action) && (
                    <div className="flex items-center gap-2 mt-2 pt-1 border-t border-slate-100">
                      {toast.complaintNumber && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                          {toast.complaintNumber}
                        </span>
                      )}
                      {toast.action && (
                        <button
                          onClick={() => {
                            toast.action?.onClick();
                            dismissToast(toast.id);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                        >
                          <Compass className="w-3 h-3" />
                          <span>{toast.action.label}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Dismiss Button */}
                <button
                  onClick={() => dismissToast(toast.id)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  aria-label="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
