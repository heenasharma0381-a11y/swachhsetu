import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, Copy, Check, Terminal, ExternalLink, X, RefreshCw } from 'lucide-react';
import { checkSupabaseConnection } from '../services/supabase/client';

interface SupabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseSetupModal: React.FC<SupabaseSetupModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<{ connected: boolean; message: string; tableCount?: number } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [copied, setCopied] = useState(false);

  const runCheck = async () => {
    setIsChecking(true);
    const res = await checkSupabaseConnection();
    setStatus(res);
    setIsChecking(false);
  };

  useEffect(() => {
    if (isOpen) {
      runCheck();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sqlSchemaSnippet = `-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/dnoymxrojvbxebevejrk/sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('citizen', 'officer', 'admin')) DEFAULT 'citizen',
  ward TEXT DEFAULT 'Ward 1 - Central',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_number TEXT NOT NULL UNIQUE,
  citizen_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  citizen_name TEXT,
  citizen_phone TEXT,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Garbage',
  subcategory TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT NOT NULL,
  ward TEXT NOT NULL DEFAULT 'Ward 1 - Central',
  status TEXT NOT NULL DEFAULT 'SUBMITTED',
  severity_score INTEGER NOT NULL DEFAULT 50,
  urgency TEXT NOT NULL DEFAULT 'Medium',
  health_risk TEXT NOT NULL DEFAULT 'Medium',
  population_impact INTEGER NOT NULL DEFAULT 50,
  ai_summary TEXT,
  ai_confidence DOUBLE PRECISION DEFAULT 0.90,
  recommended_department TEXT DEFAULT 'Municipal Sanitation Department',
  sla_deadline TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Full schema with RLS & storage buckets is stored in /supabase/schema.sql`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlSchemaSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base font-display">Supabase Database Connection & Schema</h3>
              <p className="text-xs text-slate-500">Project Reference: dnoymxrojvbxebevejrk</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Connection Status Card */}
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3 shadow-2xs ${
              status?.connected
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : 'bg-amber-50/70 border-amber-200 text-amber-900'
            }`}
          >
            {status?.connected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <RefreshCw className={`w-5 h-5 text-amber-600 shrink-0 mt-0.5 ${isChecking ? 'animate-spin' : ''}`} />
            )}
            <div className="flex-1">
              <div className="font-bold text-slate-900 flex items-center justify-between">
                <span>Supabase Live Endpoint Status</span>
                <button
                  onClick={runCheck}
                  disabled={isChecking}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                  Test Now
                </button>
              </div>
              <p className="text-xs text-slate-600 mt-1 font-medium">{status?.message || 'Testing connection to dnoymxrojvbxebevejrk.supabase.co...'}</p>
              <div className="mt-2 text-[11px] font-mono text-slate-500 bg-white/70 px-2.5 py-1 rounded-lg border border-slate-200/60 inline-block">
                URL: https://dnoymxrojvbxebevejrk.supabase.co
              </div>
            </div>
          </div>

          {/* Setup Guide */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-400 text-xs uppercase tracking-wider">
              Setup Instructions for Production Supabase
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200 font-medium">
              <li>
                Open the{' '}
                <a
                  href="https://supabase.com/dashboard/project/dnoymxrojvbxebevejrk/sql"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:underline inline-flex items-center gap-1 font-bold"
                >
                  Supabase SQL Editor <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>Execute the SQL Schema script below to create all 12 tables, RLS policies, indexes, and buckets.</li>
              <li>SwachhSetu AI automatically synchronizes complaints, Gemini analysis, notifications, and officer evidence.</li>
            </ol>
          </div>

          {/* SQL Snippet */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-indigo-600" /> schema.sql
              </span>
              <button
                onClick={handleCopy}
                className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs text-slate-800 flex items-center gap-1 font-bold transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy Schema'}</span>
              </button>
            </div>
            <pre className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-indigo-200 overflow-x-auto max-h-48 leading-relaxed shadow-inner">
              {sqlSchemaSnippet}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Resilient dual-storage with automatic offline cache sync</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
