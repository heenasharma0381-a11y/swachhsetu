import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, Profile } from '../types/database';
import { supabase } from '../services/supabase/client';

export interface PendingVerification {
  email: string;
  name: string;
  role: UserRole;
  ward: string;
  phone?: string;
  code: string;
  sentAt: string;
  expiresAt: string;
}

export interface EmailDispatchRecord {
  id: string;
  to: string;
  subject: string;
  type: 'verification' | 'welcome' | 'password_reset' | 'status_alert';
  code?: string;
  sentAt: string;
  previewBody: string;
}

interface AuthContextType {
  user: Profile | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingVerification: PendingVerification | null;
  lastDispatchedEmail: EmailDispatchRecord | null;
  login: (email: string, role?: UserRole) => Promise<{ success: boolean; message?: string }>;
  signUp: (data: { name: string; email: string; phone?: string; role: UserRole; ward?: string }) => Promise<{ success: boolean; code: string }>;
  verifyEmailCode: (email: string, code: string) => Promise<{ success: boolean; message?: string }>;
  resendVerificationEmail: (email: string) => Promise<{ success: boolean; code: string }>;
  sendPasswordResetEmail: (email: string) => Promise<{ success: boolean; code: string }>;
  resetPasswordWithCode: (email: string, code: string, newPass: string) => Promise<{ success: boolean }>;
  logout: () => Promise<void>;
  clearDispatchedEmailNotice: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(() => {
    try {
      const saved = localStorage.getItem('swachhsetu_user');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [pendingVerification, setPendingVerification] = useState<PendingVerification | null>(() => {
    try {
      const saved = localStorage.getItem('swachhsetu_pending_verify');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [lastDispatchedEmail, setLastDispatchedEmail] = useState<EmailDispatchRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Generate 6 digit OTP
  const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  useEffect(() => {
    // Listen to Supabase auth state if available
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
        if (profile) {
          setUser(profile as Profile);
          localStorage.setItem('swachhsetu_user', JSON.stringify(profile));
        }
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, preferredRole: UserRole = 'citizen'): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    try {
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        return { success: false, message: 'Please enter a valid email address.' };
      }

      // Look up custom user if saved in local store
      const customUsers = JSON.parse(localStorage.getItem('swachhsetu_registered_users') || '[]');
      const matched = customUsers.find((u: Profile) => u.email.toLowerCase() === trimmedEmail.toLowerCase());
      const sessionUser: Profile = matched || {
        id: `usr-${Date.now()}`,
        name: trimmedEmail.split('@')[0].replace('.', ' ').replace(/^./, (c) => c.toUpperCase()),
        email: trimmedEmail,
        role: preferredRole,
        ward: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setUser(sessionUser);
      localStorage.setItem('swachhsetu_user', JSON.stringify(sessionUser));
      return { success: true };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (data: {
    name: string;
    email: string;
    phone?: string;
    role: UserRole;
    ward?: string;
  }): Promise<{ success: boolean; code: string }> => {
    setIsLoading(true);
    try {
      const code = generateOtp();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();

      const pending: PendingVerification = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        ward: data.ward || '',
        code,
        sentAt: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        expiresAt,
      };

      setPendingVerification(pending);
      localStorage.setItem('swachhsetu_pending_verify', JSON.stringify(pending));

      // Simulate sending real government email confirmation
      const emailRecord: EmailDispatchRecord = {
        id: `email-${Date.now()}`,
        to: data.email,
        subject: `[SwachhSetu AI] Verify Your Civic Sanitation Account (${code})`,
        type: 'verification',
        code,
        sentAt: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        previewBody: `Dear ${data.name},\n\nThank you for registering with SwachhSetu AI Municipal Operations. Please use your 6-digit confirmation code: ${code} to verify your email address and activate your ${data.role.toUpperCase()} account${data.ward ? ` for ${data.ward}` : ''}. This code is valid for 15 minutes.`,
      };

      setLastDispatchedEmail(emailRecord);
      return { success: true, code };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmailCode = async (email: string, code: string): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    try {
      if (!pendingVerification || pendingVerification.email.toLowerCase() !== email.toLowerCase()) {
        return { success: false, message: 'No pending verification found for this email.' };
      }

      if (pendingVerification.code !== code.trim()) {
        return { success: false, message: 'Invalid 6-digit verification code. Please check your email.' };
      }

      // Successful verification -> create user profile and sign in
      const newProfile: Profile = {
        id: `user-${Date.now()}`,
        name: pendingVerification.name,
        email: pendingVerification.email,
        phone: pendingVerification.phone,
        role: pendingVerification.role,
        ward: pendingVerification.ward,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Store in registered users
      const existing = JSON.parse(localStorage.getItem('swachhsetu_registered_users') || '[]');
      existing.push(newProfile);
      localStorage.setItem('swachhsetu_registered_users', JSON.stringify(existing));

      setUser(newProfile);
      localStorage.setItem('swachhsetu_user', JSON.stringify(newProfile));
      setPendingVerification(null);
      localStorage.removeItem('swachhsetu_pending_verify');

      // Also trigger welcome confirmation email
      const welcomeEmail: EmailDispatchRecord = {
        id: `email-welc-${Date.now()}`,
        to: newProfile.email,
        subject: `Welcome to SwachhSetu AI — Account Activated`,
        type: 'welcome',
        sentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        previewBody: `Dear ${newProfile.name},\n\nYour SwachhSetu AI account is now successfully verified and active. You can report civic sanitation issues, track Gemini AI resolutions, and receive live municipal SLA updates.`,
      };
      setLastDispatchedEmail(welcomeEmail);

      // Attempt Supabase insert in background
      try {
        await supabase.from('profiles').insert([newProfile]);
      } catch {}

      return { success: true };
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerificationEmail = async (email: string): Promise<{ success: boolean; code: string }> => {
    const code = generateOtp();
    const now = new Date();
    if (pendingVerification) {
      const updated: PendingVerification = {
        ...pendingVerification,
        code,
        sentAt: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        expiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
      };
      setPendingVerification(updated);
      localStorage.setItem('swachhsetu_pending_verify', JSON.stringify(updated));
    }

    const emailRecord: EmailDispatchRecord = {
      id: `email-resend-${Date.now()}`,
      to: email,
      subject: `[SwachhSetu AI] New Verification Code: ${code}`,
      type: 'verification',
      code,
      sentAt: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      previewBody: `Your new 6-digit confirmation code for SwachhSetu AI is: ${code}. Please enter this in your browser to complete activation.`,
    };
    setLastDispatchedEmail(emailRecord);
    return { success: true, code };
  };

  const sendPasswordResetEmail = async (email: string): Promise<{ success: boolean; code: string }> => {
    const code = generateOtp();
    const now = new Date();
    const emailRecord: EmailDispatchRecord = {
      id: `email-reset-${Date.now()}`,
      to: email,
      subject: `[SwachhSetu AI] Password Reset Request (${code})`,
      type: 'password_reset',
      code,
      sentAt: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      previewBody: `We received a request to reset your SwachhSetu password. Your password reset verification code is: ${code}. If you did not make this request, you can safely ignore this email.`,
    };
    setLastDispatchedEmail(emailRecord);
    return { success: true, code };
  };

  const resetPasswordWithCode = async (_email: string, _code: string, _newPass: string): Promise<{ success: boolean }> => {
    return { success: true };
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    setUser(null);
    localStorage.removeItem('swachhsetu_user');
  };

  const clearDispatchedEmailNotice = () => {
    setLastDispatchedEmail(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'citizen',
        isAuthenticated: !!user,
        isLoading,
        pendingVerification,
        lastDispatchedEmail,
        login,
        signUp,
        verifyEmailCode,
        resendVerificationEmail,
        sendPasswordResetEmail,
        resetPasswordWithCode,
        logout,
        clearDispatchedEmailNotice,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

