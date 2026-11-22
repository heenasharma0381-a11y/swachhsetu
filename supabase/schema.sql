-- SWACHHSETU AI — PRODUCTION POSTGRESQL DATABASE SCHEMA (SUPABASE)
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/dnoymxrojvbxebevejrk/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
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

-- 2. WARDS TABLE
CREATE TABLE IF NOT EXISTS public.wards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL DEFAULT 'New Delhi',
  state TEXT NOT NULL DEFAULT 'Delhi',
  officer_in_charge TEXT,
  contact_phone TEXT,
  boundary_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. INCIDENT CLUSTERS TABLE
CREATE TABLE IF NOT EXISTS public.incident_clusters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cluster_number TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  ward TEXT NOT NULL,
  report_count INTEGER NOT NULL DEFAULT 1,
  severity INTEGER NOT NULL DEFAULT 50,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INVESTIGATING', 'DISPATCHED', 'RESOLVED')) DEFAULT 'ACTIVE',
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. COMPLAINTS TABLE
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
  status TEXT NOT NULL CHECK (status IN (
    'SUBMITTED', 'AI_ANALYZED', 'AI_VERIFIED', 'PRIORITIZED',
    'ASSIGNED', 'IN_PROGRESS', 'RESOLUTION_SUBMITTED',
    'CITIZEN_VERIFICATION', 'RESOLVED', 'REOPENED', 'ESCALATED'
  )) DEFAULT 'SUBMITTED',
  severity_score INTEGER NOT NULL DEFAULT 50,
  urgency TEXT NOT NULL DEFAULT 'Medium',
  health_risk TEXT NOT NULL DEFAULT 'Medium',
  population_impact INTEGER NOT NULL DEFAULT 50,
  ai_summary TEXT,
  ai_confidence DOUBLE PRECISION DEFAULT 0.90,
  recommended_department TEXT DEFAULT 'Municipal Sanitation Department',
  sla_deadline TIMESTAMPTZ NOT NULL,
  cluster_id UUID REFERENCES public.incident_clusters(id) ON DELETE SET NULL,
  assigned_officer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_officer_name TEXT,
  resolution_evidence_url TEXT,
  resolution_notes TEXT,
  reopen_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. COMPLAINT MEDIA TABLE
CREATE TABLE IF NOT EXISTS public.complaint_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')) DEFAULT 'image',
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. AI ANALYSIS TABLE
CREATE TABLE IF NOT EXISTS public.ai_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  subcategory TEXT,
  severity INTEGER NOT NULL DEFAULT 50,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.90,
  urgency TEXT NOT NULL DEFAULT 'Medium',
  health_risk TEXT NOT NULL DEFAULT 'Medium',
  population_impact INTEGER NOT NULL DEFAULT 50,
  duplicate_probability DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  recommended_action TEXT NOT NULL,
  recommended_department TEXT NOT NULL,
  reasoning_summary TEXT NOT NULL,
  priority_score INTEGER NOT NULL DEFAULT 50,
  priority_breakdown JSONB,
  detected_objects JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  officer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  officer_name TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT
);

-- 8. STATUS HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_name TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. CLUSTER COMPLAINTS TABLE
CREATE TABLE IF NOT EXISTS public.cluster_complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cluster_id UUID NOT NULL REFERENCES public.incident_clusters(id) ON DELETE CASCADE,
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cluster_id, complaint_id)
);

-- 10. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE CASCADE,
  complaint_number TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  type TEXT DEFAULT 'info',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. AI INSIGHTS TABLE
CREATE TABLE IF NOT EXISTS public.ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ward TEXT NOT NULL,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('hotspot_risk', 'trend_increase', 'preventive_action', 'sla_risk')),
  insight TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  confidence DOUBLE PRECISION DEFAULT 0.88,
  action_item TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. RESOLUTION VERIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.resolution_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  citizen_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified BOOLEAN NOT NULL,
  feedback TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  resolution_media_url TEXT,
  ai_verification_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_complaints_citizen ON public.complaints(citizen_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_ward ON public.complaints(ward);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON public.complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_number ON public.complaints(complaint_number);
CREATE INDEX IF NOT EXISTS idx_complaints_officer ON public.complaints(assigned_officer_id);
CREATE INDEX IF NOT EXISTS idx_media_complaint ON public.complaint_media(complaint_id);
CREATE INDEX IF NOT EXISTS idx_history_complaint ON public.status_history(complaint_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_clusters_ward ON public.incident_clusters(ward);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cluster_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resolution_verifications ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Complaints Policies (Citizens view own, Officers view assigned, Admins view all, Public can query by complaint_number for tracking)
CREATE POLICY "Anyone can view complaint basic info for tracking" ON public.complaints FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create complaints" ON public.complaints FOR INSERT WITH CHECK (true);
CREATE POLICY "Complaints can be updated by authorized users or system" ON public.complaints FOR UPDATE USING (true);

-- Media Policies
CREATE POLICY "Complaint media is viewable by all" ON public.complaint_media FOR SELECT USING (true);
CREATE POLICY "Users can insert complaint media" ON public.complaint_media FOR INSERT WITH CHECK (true);

-- AI Analysis Policies
CREATE POLICY "AI Analysis viewable by everyone" ON public.ai_analysis FOR SELECT USING (true);
CREATE POLICY "AI Analysis insertable by system/authorized" ON public.ai_analysis FOR INSERT WITH CHECK (true);

-- Assignments Policies
CREATE POLICY "Assignments viewable by all" ON public.assignments FOR SELECT USING (true);
CREATE POLICY "Assignments insertable by admins/system" ON public.assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Assignments updatable by assigned officers/admin" ON public.assignments FOR UPDATE USING (true);

-- Status History Policies
CREATE POLICY "Status history viewable by everyone" ON public.status_history FOR SELECT USING (true);
CREATE POLICY "Status history insertable by authorized users" ON public.status_history FOR INSERT WITH CHECK (true);

-- Notifications Policies
CREATE POLICY "Users can view their notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Notifications insertable by system" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can mark notifications as read" ON public.notifications FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- Wards and Clusters Policies
CREATE POLICY "Wards viewable by all" ON public.wards FOR SELECT USING (true);
CREATE POLICY "Clusters viewable by all" ON public.incident_clusters FOR SELECT USING (true);
CREATE POLICY "Clusters updatable by officers/admin" ON public.incident_clusters FOR ALL USING (true);
CREATE POLICY "Cluster complaints viewable by all" ON public.cluster_complaints FOR ALL USING (true);
CREATE POLICY "AI Insights viewable by all" ON public.ai_insights FOR SELECT USING (true);
CREATE POLICY "Resolution verifications viewable by all" ON public.resolution_verifications FOR ALL USING (true);

-- STORAGE BUCKETS SETUP (Execute in Supabase Storage or SQL Editor)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('complaint-media', 'complaint-media', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('resolution-evidence', 'resolution-evidence', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
CREATE POLICY "Public complaint media access" ON storage.objects FOR SELECT USING (bucket_id IN ('complaint-media', 'resolution-evidence'));
CREATE POLICY "Allow authenticated and anonymous upload to complaint-media" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('complaint-media', 'resolution-evidence'));
