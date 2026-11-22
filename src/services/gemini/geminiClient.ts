export interface GeminiAnalysisResult {
  category: string;
  subcategory: string;
  severity: number;
  urgency: 'Low' | 'Medium' | 'High' | 'Critical';
  healthRisk: 'Low' | 'Medium' | 'High' | 'Severe';
  populationImpact: number;
  confidence: number;
  recommendedDepartment: string;
  recommendedAction: string;
  summary: string;
  priorityScore: number;
  priorityBreakdown?: {
    severity_factor: number;
    health_factor: number;
    population_factor: number;
    repeat_factor: number;
    time_factor: number;
  };
  detectedObjects?: string[];
}

export interface VerificationResult {
  cleanlinessScore: number;
  isResolved: boolean;
  debrisRemovalPercentage: number;
  summary: string;
  advisory: string;
}

export interface VoiceProcessResult {
  intent: 'NEW_COMPLAINT' | 'STATUS_QUERY' | 'GENERAL_CIVIC_HELP';
  transcript: string;
  translatedEnglish: string;
  detectedLanguage: string;
  category: string;
  subcategory: string;
  address: string;
  ward: string;
  severity: number;
  urgency: 'Low' | 'Medium' | 'High' | 'Critical';
  spokenResponse: string;
  audioWavBase64?: string | null;
}

export const geminiClient = {
  async processVoice(payload: {
    audioBase64?: string;
    audioMimeType?: string;
    spokenText?: string;
    userWard?: string;
    preferredLang?: string;
  }): Promise<{ result: VoiceProcessResult; isDemoMode: boolean }> {
    const res = await fetch('/api/gemini/process-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Voice processing failed with status ${res.status}`);
    }

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to process voice query');
    }

    return {
      result: data.result,
      isDemoMode: data.is_demo_mode,
    };
  },

  async textToSpeech(text: string, language: string = 'hi'): Promise<string | null> {
    try {
      const res = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.audioWavBase64 || null;
    } catch {
      return null;
    }
  },

  async analyzeComplaint(payload: {
    description: string;
    category?: string;
    address?: string;
    ward?: string;
    imageBase64?: string;
    imageMimeType?: string;
  }): Promise<{ analysis: GeminiAnalysisResult; isDemoMode: boolean }> {
    const res = await fetch('/api/gemini/analyze-complaint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`AI Analysis failed with status ${res.status}`);
    }

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to analyze complaint');
    }

    return {
      analysis: data.analysis,
      isDemoMode: data.is_demo_mode,
    };
  },

  async verifyResolution(payload: {
    complaintNumber: string;
    category: string;
    description: string;
    beforeImageUrl?: string;
    afterImageBase64: string;
  }): Promise<{ verification: VerificationResult; isDemoMode: boolean }> {
    const res = await fetch('/api/gemini/verify-resolution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`AI Verification failed with status ${res.status}`);
    }

    const data = await res.json();
    return {
      verification: data.verification,
      isDemoMode: data.is_demo_mode,
    };
  },

  async askCommandCenter(
    question: string,
    databaseSummary: any
  ): Promise<{ answer: string; isDemoMode: boolean }> {
    const res = await fetch('/api/gemini/command-center', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, databaseSummary }),
    });

    if (!res.ok) {
      throw new Error(`AI Command Center failed with status ${res.status}`);
    }

    const data = await res.json();
    return {
      answer: data.answer,
      isDemoMode: data.is_demo_mode,
    };
  },

  async getPredictiveInsights(
    wardData: any,
    categoryTrends: any
  ): Promise<{ insights: any[]; isDemoMode: boolean }> {
    const res = await fetch('/api/gemini/predictive-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wardData, categoryTrends }),
    });

    if (!res.ok) {
      throw new Error(`AI Insights failed with status ${res.status}`);
    }

    const data = await res.json();
    return {
      insights: data.insights,
      isDemoMode: data.is_demo_mode,
    };
  },
};
