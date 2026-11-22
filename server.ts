import express from 'express';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Lazy initialize Gemini client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. HEALTH CHECK
app.get('/api/health', (req, res) => {
  const hasGemini = !!getGeminiClient();
  res.json({
    status: 'ok',
    gemini_configured: hasGemini,
    platform: 'SwachhSetu AI Sanitation Operations Platform',
    timestamp: new Date().toISOString(),
  });
});

// 2. GEMINI COMPLAINT MULTIMODAL ANALYSIS
app.post('/api/gemini/analyze-complaint', async (req, res) => {
  try {
    const { description, category, address, ward, imageBase64, imageMimeType } = req.body;

    const ai = getGeminiClient();
    if (!ai) {
      // Fallback deterministic AI estimation if key not configured
      const descLower = (description || '').toLowerCase();
      let estCat = category || 'Garbage';
      let estSubcat = 'General Sanitation Issue';
      let estSeverity = 65;
      let estUrgency = 'Medium';
      let estHealth = 'Medium';
      let estDept = 'Municipal Solid Waste Management Dept';

      if (descLower.includes('sewage') || descLower.includes('drain') || descLower.includes('gutter') || descLower.includes('manhole')) {
        estCat = 'Sewage';
        estSubcat = 'Drainage Blockage & Effluent Spill';
        estSeverity = 88;
        estUrgency = 'Critical';
        estHealth = 'Severe';
        estDept = 'Drainage & Sewerage Operations Board';
      } else if (descLower.includes('dead') || descLower.includes('animal') || descLower.includes('carcass')) {
        estCat = 'Dead animal waste';
        estSubcat = 'Animal Carcass Removal';
        estSeverity = 94;
        estUrgency = 'Critical';
        estHealth = 'Severe';
        estDept = 'Veterinary & Biohazard Sanitation Wing';
      } else if (descLower.includes('toilet') || descLower.includes('urinal') || descLower.includes('restroom')) {
        estCat = 'Public toilet';
        estSubcat = 'Public Restroom Sanitation & Water Supply';
        estSeverity = 78;
        estUrgency = 'High';
        estHealth = 'High';
        estDept = 'Public Restrooms & Community Sanitation Division';
      } else if (descLower.includes('water') || descLower.includes('flood') || descLower.includes('waterlog')) {
        estCat = 'Waterlogging';
        estSubcat = 'Monsoon Stagnation & Grating Choke';
        estSeverity = 75;
        estUrgency = 'High';
        estHealth = 'Medium';
        estDept = 'Municipal Drainage & Road Maintenance Wing';
      } else if (descLower.includes('plastic') || descLower.includes('burning') || descLower.includes('smoke')) {
        estCat = 'Plastic waste';
        estSubcat = 'Plastic Dumping & Air Hazard';
        estSeverity = 82;
        estUrgency = 'High';
        estHealth = 'High';
        estDept = 'Pollution Control & Enforcement Squad';
      } else if (descLower.includes('construction') || descLower.includes('debris') || descLower.includes('malba')) {
        estCat = 'Construction waste';
        estSubcat = 'C&D Debris Encroaching Right-of-Way';
        estSeverity = 62;
        estUrgency = 'Medium';
        estHealth = 'Low';
        estDept = 'Construction & Demolition Waste Unit';
      }

      return res.json({
        success: true,
        is_demo_mode: true,
        analysis: {
          category: estCat,
          subcategory: estSubcat,
          severity: estSeverity,
          urgency: estUrgency,
          healthRisk: estHealth,
          populationImpact: Math.min(100, estSeverity + 5),
          confidence: 0.91,
          recommendedDepartment: estDept,
          recommendedAction: `Dispatch immediate response squad to ${ward || 'locality'} with targeted machinery.`,
          summary: `AI detected ${estCat} issue from citizen description. High municipal attention recommended.`,
          priorityScore: estSeverity,
          priorityBreakdown: {
            severity_factor: +(estSeverity * 0.35).toFixed(1),
            health_factor: +(estSeverity * 0.25).toFixed(1),
            population_factor: +(estSeverity * 0.2).toFixed(1),
            repeat_factor: 8.0,
            time_factor: 7.5,
          },
          detectedObjects: ['Civic waste', 'Public pathway impact', 'Sanitation hazard'],
        },
      });
    }

    // Call Gemini 3.7 Flash with Multimodal inputs
    const parts: any[] = [];

    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: imageMimeType || 'image/jpeg',
          data: cleanBase64,
        },
      });
    }

    const systemPrompt = `You are SwachhSetu AI, an expert municipal sanitation and public health operations classifier for Indian cities.
Analyze the citizen's complaint photo and text description.
Output valid JSON adhering to the specified schema:
- category: One of ['Garbage', 'Overflowing bin', 'Open dumping', 'Sewage', 'Blocked drain', 'Waterlogging', 'Public toilet', 'Construction waste', 'Plastic waste', 'Dead animal waste', 'Other']
- subcategory: Specific granular subcategory (e.g. "Overflowing Community Dumpster", "Blocked Culvert", "Dead Animal Carcass")
- severity: integer from 0 to 100 (90-100 = Critical/Severe risk, 70-89 = High, 45-69 = Medium, 0-44 = Low)
- urgency: "Low" | "Medium" | "High" | "Critical"
- healthRisk: "Low" | "Medium" | "High" | "Severe"
- populationImpact: integer from 0 to 100
- confidence: float between 0.70 and 0.99
- recommendedDepartment: One of ['Municipal Solid Waste Management Dept', 'Drainage & Sewerage Operations Board', 'Public Restrooms & Community Sanitation Division', 'Construction & Demolition Waste Unit', 'Veterinary & Biohazard Sanitation Wing', 'Pollution Control & Enforcement Squad']
- recommendedAction: Concrete municipal intervention (e.g., "Deploy compactor truck & 4 sanitary workers for deep sanitize and lime powder dusting")
- summary: 1-2 sentence executive briefing explaining the physical observation, sanitation breakdown, and public safety impact
- priorityScore: integer 0-100 calculated as (0.35 * severity + 0.25 * healthRiskScore + 0.20 * populationImpact + 0.10 * repeatRisk + 0.10 * urgencyScore)
- detectedObjects: Array of 3-5 detected objects or hazard indicators in the visual/text
`;

    parts.push({
      text: `${systemPrompt}

Citizen Complaint Input:
Description: ${description || 'No description provided'}
Provided Category: ${category || 'Unspecified'}
Address: ${address || 'Unspecified'}
Ward: ${ward || 'Unspecified'}

Return ONLY valid JSON without markdown wrapping.`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    let parsed: any = {};
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      // Clean markdown if any
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    return res.json({
      success: true,
      is_demo_mode: false,
      analysis: parsed,
    });
  } catch (error: any) {
    console.error('Gemini analyze-complaint error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Gemini API failed to process complaint',
    });
  }
});

// 3. GEMINI BEFORE vs AFTER RESOLUTION VERIFICATION
app.post('/api/gemini/verify-resolution', async (req, res) => {
  try {
    const { complaintNumber, category, description, beforeImageUrl, afterImageBase64 } = req.body;
    const ai = getGeminiClient();

    if (!ai || !afterImageBase64) {
      return res.json({
        success: true,
        is_demo_mode: !ai,
        verification: {
          cleanlinessScore: 94,
          isResolved: true,
          debrisRemovalPercentage: 96,
          summary: 'Visual comparison indicates complete debris clearance and sanitized ground surface.',
          advisory: 'Advisory: Regular routine monitoring recommended to prevent re-dumping.',
        },
      });
    }

    const cleanBase64 = afterImageBase64.replace(/^data:image\/\w+;base64,/, '');
    const prompt = `You are SwachhSetu AI resolution auditor.
Compare the reported sanitation issue with the officer's uploaded after-action evidence photo.
Complaint Number: ${complaintNumber}
Category: ${category}
Original Description: ${description}

Analyze the photo to verify:
1. Is the waste/overflow/blockage visibly rectified?
2. Estimate debris removal % (0 to 100)
3. Rate cleanliness improvement score (0 to 100)
4. State whether resolution is verified (true/false)
5. Provide a 2-sentence advisory summary.

Return ONLY JSON:
{
  "cleanlinessScore": 92,
  "isResolved": true,
  "debrisRemovalPercentage": 95,
  "summary": "Visible garbage accumulation appears substantially cleared and sidewalk is accessible.",
  "advisory": "Advisory note: Lime powder dusting and bin placement confirmed."
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      success: true,
      is_demo_mode: false,
      verification: parsed,
    });
  } catch (error: any) {
    console.error('Gemini verify-resolution error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify resolution with Gemini',
    });
  }
});

// 4. GEMINI AI COMMAND CENTER (AGENTIC QUERY WITH REAL DATA)
app.post('/api/gemini/command-center', async (req, res) => {
  try {
    const { question, databaseSummary } = req.body;
    const ai = getGeminiClient();

    const systemPrompt = `You are SwachhSetu AI Chief Operations Officer & Civic Intelligence Agent.
You have real-time access to the municipal sanitation database metrics provided below.
Answer the user's question directly, concisely, and factually based STRICTLY on the provided database data.
Highlight specific wards, complaint IDs, SLA stats, incident clusters, or actionable recommendations.
Keep response professional, structured with markdown bold highlights, and action-oriented for municipal commissioners and sanitation inspectors.`;

    if (!ai) {
      // Intelligent data-driven answers based on provided database summary
      let answer = '';
      const q = (question || '').toLowerCase();
      const stats = databaseSummary || {};

      if (q.includes('immediate attention') || q.includes('critical') || q.includes('highest priority')) {
        answer = `**Immediate Attention Required: Ward 7 (Shahdara & East Delhi) & Ward 5 (Rohini)**\n\n- **Ward 7**: Has a high-density sewage overflow cluster (**INC-1025**) with a 92/100 composite risk score impacting residential lanes.\n- **Ward 5**: Critical biohazard report (**SW-2026-000128**, Animal Carcass) has breached its 6-hour SLA deadline.\n- **Action Item**: Direct immediate dispatch of the Ward 7 super-sucker de-silting unit and the Ward 5 emergency veterinary sanitization van.`;
      } else if (q.includes('fastest') || q.includes('increasing') || q.includes('trend')) {
        answer = `**Fastest Increasing Category: Commercial Garbage & Dumpster Overflow (+64% WoW)**\n\n- **Primary Hotspots**: Ward 2 (Chandni Chowk) and Ward 3 (Karol Bagh).\n- **Root Cause**: Secondary collection tipper schedules are clashing with morning commercial market opening hours.\n- **Recommendation**: Shift primary tipper pickup window to 06:00 AM - 07:30 AM before market footfall peaks.`;
      } else if (q.includes('sla') || q.includes('breach')) {
        answer = `**SLA Compliance & Breach Analysis**:\n\n- **Active SLA Breaches**: 2 complaints currently breached (including **SW-2026-000125** and **SW-2026-000128**).\n- **Average Resolution Time**: 14.8 hours across all resolved categories.\n- **Highest SLA Adherence**: Ward 4 (Lajpat Nagar) at 94.2% compliance.`;
      } else {
        answer = `**SwachhSetu Operational Overview**:\n\n- **Total Monitored Complaints**: ${stats.totalComplaints || 52}\n- **Active / In-Progress**: ${stats.activeComplaints || 28}\n- **Resolved Cases**: ${stats.resolvedComplaints || 24}\n- **Incident Clusters**: ${stats.activeClusters || 3} active clusters tracked across Delhi municipal wards.\n\nAll municipal squads are actively receiving automated AI-prioritized task queues.`;
      }

      return res.json({
        success: true,
        is_demo_mode: true,
        answer,
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: `${systemPrompt}

Current Live Database Metrics & Context:
${JSON.stringify(databaseSummary, null, 2)}

User Question: "${question}"`,
    });

    return res.json({
      success: true,
      is_demo_mode: false,
      answer: response.text || 'No response generated.',
    });
  } catch (error: any) {
    console.error('Gemini command-center error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Gemini Command Center processing error',
    });
  }
});

// 5. GEMINI PREDICTIVE INSIGHTS GENERATOR
app.post('/api/gemini/predictive-insights', async (req, res) => {
  try {
    const { wardData, categoryTrends } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        success: true,
        is_demo_mode: true,
        insights: [
          {
            ward: 'Ward 7 - Shahdara & East Delhi',
            insight_type: 'hotspot_risk',
            insight: 'High-density sewage stagnation risk: 14 reports in 72h with 92/100 composite risk score.',
            severity: 'critical',
            confidence: 0.94,
            action_item: 'Deploy mechanized suction super-sucker tanker and de-silt arterial culvert at Main Gali #4.',
          },
          {
            ward: 'Ward 2 - Chandni Chowk & Old Delhi',
            insight_type: 'trend_increase',
            insight: 'Garbage accumulation complaints increased +64% this week due to missed tipper schedules.',
            severity: 'high',
            confidence: 0.91,
            action_item: 'Reschedule morning dumper placer collection from 10:00 AM to 06:30 AM before market peak hours.',
          },
          {
            ward: 'Ward 3 - Karol Bagh Market Area',
            insight_type: 'sla_risk',
            insight: 'SLA breach velocity alert: 3 commercial waste complaints within 2 hours of SLA deadline.',
            severity: 'high',
            confidence: 0.89,
            action_item: 'Auto-reassign Ward 3 standby secondary tipper squad #B to clear Ajmal Khan Road commercial bins.',
          },
        ],
      });
    }

    const prompt = `You are SwachhSetu AI predictive sanitation analytics engine.
Analyze the following ward performance and complaint distributions:
${JSON.stringify({ wardData, categoryTrends }, null, 2)}

Generate 3-4 structured predictive sanitation insights highlighting:
1. Emerging sanitation hotspots
2. Trend surges
3. SLA breach risks
4. Concrete preventative actions for municipal authorities.

Return JSON array of objects:
[
  {
    "ward": "Ward Name",
    "insight_type": "hotspot_risk" | "trend_increase" | "preventive_action" | "sla_risk",
    "insight": "Description of the predictive pattern",
    "severity": "critical" | "high" | "medium" | "low",
    "confidence": 0.92,
    "action_item": "Specific preventive action"
  }
]`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '[]');
    return res.json({
      success: true,
      is_demo_mode: false,
      insights: parsed,
    });
  } catch (error: any) {
    console.error('Gemini predictive-insights error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate predictive insights',
    });
  }
});

function buildVoiceFallbackResult(spokenText?: string, userWard?: string, preferredLang?: string) {
  const rawText = (spokenText || 'हमारे मोहल्ले में कचरा बहुत फैला हुआ है बदबू आ रही है').trim();
  const textToAnalyze = rawText.toLowerCase();
  let estCategory = 'Garbage';
  let estSubcategory = 'Community Waste Accumulation';
  let estSeverity = 72;
  let estUrgency: 'Low' | 'Medium' | 'High' | 'Critical' = 'High';
  let intent: 'NEW_COMPLAINT' | 'STATUS_QUERY' | 'GENERAL_CIVIC_HELP' = 'NEW_COMPLAINT';

  if (textToAnalyze.includes('स्थिति') || textToAnalyze.includes('status') || textToAnalyze.includes('कहाँ तक पहुँचा') || textToAnalyze.includes('नंबर')) {
    intent = 'STATUS_QUERY';
  } else if (textToAnalyze.includes('नाली') || textToAnalyze.includes('sewage') || textToAnalyze.includes('गंदा पानी') || textToAnalyze.includes('drain')) {
    estCategory = 'Sewage';
    estSubcategory = 'Overflowing Open Drain';
    estSeverity = 88;
    estUrgency = 'Critical';
  } else if (textToAnalyze.includes('शौचालय') || textToAnalyze.includes('toilet') || textToAnalyze.includes('टॉयलेट')) {
    estCategory = 'Public toilet';
    estSubcategory = 'Unsanitary Community Restroom';
    estSeverity = 78;
    estUrgency = 'High';
  } else if (textToAnalyze.includes('जानवर') || textToAnalyze.includes('animal') || textToAnalyze.includes('मरा')) {
    estCategory = 'Dead animal waste';
    estSubcategory = 'Dead Animal Removal';
    estSeverity = 95;
    estUrgency = 'Critical';
  } else if (textToAnalyze.includes('पानी') || textToAnalyze.includes('waterlog') || textToAnalyze.includes('भर गया')) {
    estCategory = 'Waterlogging';
    estSubcategory = 'Roadside Water Stagnation';
    estSeverity = 70;
    estUrgency = 'Medium';
  }

  const responseHindi = intent === 'STATUS_QUERY'
    ? 'आपकी शिकायत पर स्वच्छता दल पहले से सक्रिय है। जल्द ही कार्य पूरा कर आपको सूचित किया जाएगा।'
    : `आपकी शिकायत समझ ली गई है: ${estCategory === 'Garbage' ? 'कचरा' : estCategory === 'Sewage' ? 'नाली' : 'स्वच्छता'} समस्या। क्या हम इसे तुरंत नजदीकी नगर निगम को भेजें?`;

  return {
    intent,
    transcript: rawText,
    translatedEnglish: spokenText ? rawText : 'A lot of garbage is spread in our locality and smelling bad',
    detectedLanguage: /[\u0900-\u097F]/.test(rawText) ? 'hi' : 'en',
    category: estCategory,
    subcategory: estSubcategory,
    address: '',
    ward: userWard || '',
    severity: estSeverity,
    urgency: estUrgency,
    spokenResponse: preferredLang === 'en'
      ? `Your complaint regarding ${estCategory} has been identified. Would you like to confirm submission?`
      : responseHindi,
    audioWavBase64: null,
  };
}

// 6. GEMINI VOICE CITIZEN QUERY & LOCAL LANGUAGE SPEECH PROCESSOR
app.post('/api/gemini/process-voice', async (req, res) => {
  const { audioBase64, audioMimeType, spokenText, userWard, preferredLang } = req.body;
  try {
    const ai = getGeminiClient();

    // Deterministic fallback if Gemini key is not configured or in offline demo
    if (!ai) {
      return res.json({
        success: true,
        is_demo_mode: true,
        result: buildVoiceFallbackResult(spokenText, userWard, preferredLang),
      });
    }

    const contents: any[] = [];

    // If audio is provided, attach as multimodal audio part
    if (audioBase64) {
      const cleanAudio = audioBase64.replace(/^data:audio\/\w+;base64,/, '');
      contents.push({
        inlineData: {
          mimeType: audioMimeType || 'audio/webm',
          data: cleanAudio,
        },
      });
    }

    const systemPrompt = `You are SwachhSetu AI Local Citizen Voice Assistant for municipal sanitation operations across India.
Local citizens (often speaking in Hindi, Hinglish, colloquial local phrasing, or Indian English) speak into their phone/mic to submit a sanitation complaint or query without needing to type.

Carefully transcribe what the citizen said and accurately extract the sanitation problem details.

Output valid JSON strictly with this schema:
{
  "intent": "NEW_COMPLAINT" | "STATUS_QUERY" | "GENERAL_CIVIC_HELP",
  "transcript": string (exact verbatim words spoken by the citizen in their original language, e.g. Hindi Devanagari or English),
  "translatedEnglish": string (accurate English translation of what was spoken),
  "detectedLanguage": "hi" | "en" | "hinglish" | "other",
  "category": "Garbage" | "Overflowing bin" | "Open dumping" | "Sewage" | "Blocked drain" | "Waterlogging" | "Public toilet" | "Construction waste" | "Plastic waste" | "Dead animal waste" | "Other",
  "subcategory": string (specific subcategory, e.g. "Overflowing Community Dumpster", "Blocked Gutter Drain"),
  "detectedLandmarkOrLocation": string (any exact area, campus, landmark, street, market, city, or state mentioned by the citizen, e.g. "IIIT Kota, Ranpur, Rajasthan", or "" if no place was spoken),
  "matchedWard": string (local area, ward, or city/district mentioned, e.g. "Ranpur, Kota, Rajasthan", or use a Delhi Ward name ONLY if a Delhi locality was actually spoken; leave "" if unspecified),
  "severityScore": integer from 30 to 100,
  "urgency": "Low" | "Medium" | "High" | "Critical",
  "spokenResponseHindi": string (warm, simple, respectful 1-2 sentence response in simple everyday Hindi that can be spoken back to an everyday citizen),
  "spokenResponseEnglish": string (warm, simple 1-2 sentence response in English)
}`;

    contents.push({
      text: `${systemPrompt}

User Input:
${spokenText ? `Spoken Transcript provided: "${spokenText}"` : 'Audio recording provided.'}
Context Ward: ${userWard || 'Not specified'}
Citizen Preferred Language: ${preferredLang || 'auto'}

Return ONLY valid JSON without markdown wrapping.`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts: contents },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    let parsed: any = {};
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    const spokenTextOutput = (preferredLang === 'en' && parsed.spokenResponseEnglish)
      ? parsed.spokenResponseEnglish
      : (parsed.spokenResponseHindi || parsed.spokenResponseEnglish || 'आपकी शिकायत समझ ली गई है।');

    // Attempt to synthesize audio response using gemini-3.8-flash-lite-tts
    let audioWavBase64: string | null = null;
    try {
      const ttsResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: spokenTextOutput,
                speechMetadata: {
                  style: 'Warm, respectful, clear Indian civic assistant',
                },
              },
            ],
          },
        ] as any,
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      audioWavBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (ttsErr: any) {
      console.warn('Gemini TTS audio synthesis fallback:', ttsErr?.message || ttsErr);
    }

    return res.json({
      success: true,
      is_demo_mode: false,
      result: {
        intent: parsed.intent || 'NEW_COMPLAINT',
        transcript: parsed.transcript || spokenText || 'शिकायत प्राप्त हुई',
        translatedEnglish: parsed.translatedEnglish || 'Complaint received',
        detectedLanguage: parsed.detectedLanguage || 'hi',
        category: parsed.category || 'Garbage',
        subcategory: parsed.subcategory || 'General Civic Issue',
        address: parsed.detectedLandmarkOrLocation || '',
        ward: parsed.matchedWard || userWard || '',
        severity: parsed.severityScore || 70,
        urgency: parsed.urgency || 'High',
        spokenResponse: spokenTextOutput,
        audioWavBase64,
      },
    });
  } catch (error: any) {
    console.warn('Gemini process-voice fallback triggered:', error?.message || error);
    return res.json({
      success: true,
      is_demo_mode: true,
      result: buildVoiceFallbackResult(spokenText, userWard, preferredLang),
    });
  }
});

// 7. GEMINI TEXT-TO-SPEECH (TTS) ENDPOINT
app.post('/api/gemini/tts', async (req, res) => {
  try {
    const { text, language } = req.body;
    if (!text || text.trim() === '') {
      return res.status(400).json({ success: false, error: 'Text is required for TTS' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        success: true,
        is_demo_mode: true,
        audioWavBase64: null,
      });
    }

    const ttsResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.slice(0, 500),
              speechMetadata: {
                style: language === 'hi' ? 'Warm Indian Hindi municipal assistant' : 'Clear professional civic assistant',
              },
            },
          ],
        },
      ] as any,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const audioWavBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;

    return res.json({
      success: true,
      audioWavBase64,
    });
  } catch (error: any) {
    console.error('Gemini TTS error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'TTS generation failed',
    });
  }
});

// Lightweight TTL caches for instant repeated area lookups
const geoCache = new Map<string, { value: any; expiresAt: number }>();
const centerCache = new Map<string, { value: any; expiresAt: number }>();

function getCache<T>(map: Map<string, { value: T; expiresAt: number }>, key: string): T | null {
  const hit = map.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    map.delete(key);
    return null;
  }
  return hit.value;
}

function setCache<T>(map: Map<string, { value: T; expiresAt: number }>, key: string, value: T, ttlMs: number) {
  if (map.size > 400) {
    const oldest = map.keys().next().value;
    if (oldest) map.delete(oldest);
  }
  map.set(key, { value, expiresAt: Date.now() + ttlMs });
}

// Shared Reverse Geocoding Helper (OSM Nominatim + BigDataCloud fallback + Cache)
async function reverseGeocodeCoordsServer(lat: number, lon: number, language: 'en' | 'hi' = 'en') {
  const geoKey = `${lat.toFixed(4)},${lon.toFixed(4)},${language}`;
  const cachedGeo = getCache<any>(geoCache, geoKey);
  if (cachedGeo) {
    return cachedGeo;
  }

  // Primary: OpenStreetMap Nominatim (zoom 18 = building/street/neighbourhood precision)
  try {
    const acceptLang = language === 'hi' ? 'hi,en' : 'en';
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=18&addressdetails=1&accept-language=${encodeURIComponent(acceptLang)}`;
    const nomRes = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'SwachhSetu-SanitationPortal/1.0 (civic-geolocation)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(3000),
    });

    if (nomRes.ok) {
      const nomData: any = await nomRes.json();
      const addr = nomData?.address || {};

      const poi = addr.amenity || addr.building || addr.shop || addr.tourism || addr.leisure || '';
      const street = [addr.house_number, addr.road || addr.pedestrian || addr.footway || addr.path]
        .filter(Boolean)
        .join(' ')
        .trim();
      const neighbourhood =
        addr.neighbourhood ||
        addr.residential ||
        addr.quarter ||
        addr.hamlet ||
        addr.suburb ||
        addr.village ||
        addr.town ||
        '';
      const areaDistrict =
        addr.suburb ||
        addr.city_district ||
        addr.town ||
        addr.village ||
        addr.county ||
        '';
      const city = addr.city || addr.town || addr.state_district || addr.village || addr.county || '';
      const state = addr.state || '';
      const postcode = addr.postcode || '';

      const rawParts = [poi, street, neighbourhood, areaDistrict, city, postcode]
        .map((p) => (typeof p === 'string' ? p.trim() : ''))
        .filter(Boolean);

      const uniqueParts: string[] = [];
      for (const part of rawParts) {
        if (!uniqueParts.some((existing) => existing.toLowerCase() === part.toLowerCase())) {
          uniqueParts.push(part);
        }
      }

      const exactAddress =
        uniqueParts.slice(0, 5).join(', ') ||
        nomData?.display_name ||
        `${lat.toFixed(5)}, ${lon.toFixed(5)}`;

      const areaNameParts: string[] = [];
      for (const p of [neighbourhood || areaDistrict, city].filter(Boolean)) {
        if (!areaNameParts.some((e) => e.toLowerCase() === p.toLowerCase())) {
          areaNameParts.push(p);
        }
      }
      const areaName = areaNameParts.join(', ') || exactAddress;
      const wardOrLocality =
        [neighbourhood || areaDistrict || city, city && city !== (neighbourhood || areaDistrict) ? city : state]
          .filter(Boolean)
          .join(', ') || areaName;

      const payload = {
        success: true,
        provider: 'nominatim',
        latitude: lat,
        longitude: lon,
        exactAddress,
        areaName,
        wardOrLocality,
        city,
        state,
        postcode,
        displayName: nomData?.display_name || exactAddress,
      };
      setCache(geoCache, geoKey, payload, 15 * 60 * 1000);
      return payload;
    }
  } catch (nomErr) {
    console.warn('Nominatim reverse geocode fallback triggered:', nomErr);
  }

  // Fallback: BigDataCloud free client reverse geocode endpoint
  try {
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=${language}`;
    const bdcRes = await fetch(bdcUrl, {
      signal: AbortSignal.timeout(2500),
    });
    if (bdcRes.ok) {
      const bdc: any = await bdcRes.json();
      const locality = bdc.locality || '';
      const city = bdc.city || '';
      const state = bdc.principalSubdivision || '';
      const postcode = bdc.postcode || '';
      const adminSub =
        Array.isArray(bdc.localityInfo?.administrative)
          ? bdc.localityInfo.administrative
              .slice()
              .reverse()
              .find((a: any) => a?.name && a.name !== state && a.name !== bdc.countryName)?.name || ''
          : '';

      const parts: string[] = [];
      for (const p of [locality, adminSub, city, state, postcode].filter(Boolean)) {
        if (!parts.some((e) => e.toLowerCase() === String(p).toLowerCase())) {
          parts.push(String(p));
        }
      }
      const exactAddress = parts.slice(0, 4).join(', ') || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
      const areaName = [locality || adminSub, city || state].filter(Boolean).join(', ') || exactAddress;

      const payload = {
        success: true,
        provider: 'bigdatacloud',
        latitude: lat,
        longitude: lon,
        exactAddress,
        areaName,
        wardOrLocality: areaName,
        city,
        state,
        postcode,
        displayName: exactAddress,
      };
      setCache(geoCache, geoKey, payload, 15 * 60 * 1000);
      return payload;
    }
  } catch (bdcErr) {
    console.warn('BigDataCloud reverse geocode failed:', bdcErr);
  }

  const coordStr = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  return {
    success: true,
    provider: 'coordinates',
    latitude: lat,
    longitude: lon,
    exactAddress: language === 'hi' ? `जीपीएस निर्देशांक: ${coordStr}` : `GPS Coordinates: ${coordStr}`,
    areaName: coordStr,
    wardOrLocality: `GPS (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
    city: '',
    state: '',
    postcode: '',
    displayName: coordStr,
  };
}

// 8. EXACT AREA REVERSE GEOCODING (OSM Nominatim + BigDataCloud fallback + Cache)
app.post('/api/geocode/reverse', async (req, res) => {
  try {
    const lat = Number(req.body?.latitude ?? req.body?.lat);
    const lon = Number(req.body?.longitude ?? req.body?.lng);
    const language = req.body?.language === 'hi' ? 'hi' : 'en';

    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ success: false, error: 'Valid latitude and longitude are required' });
    }

    const payload = await reverseGeocodeCoordsServer(lat, lon, language);
    return res.json(payload);
  } catch (error: any) {
    console.error('Reverse geocode error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Reverse geocoding failed' });
  }
});

// Helper: Detect if text refers to Delhi / NCR localities
function isDelhiNcrLocationText(text: string): boolean {
  const lower = text.toLowerCase();
  return /\b(delhi|new delhi|ndmc|mcd|chandni chowk|karol bagh|lajpat nagar|rohini|shahdara|dwarka|connaught|saket|mehrauli|janakpuri|uttam nagar|mayur vihar|vasant kunj|green park|noida|gurgaon|gurugram|faridabad|ghaziabad|ncr)\b/i.test(
    lower
  );
}

// Helper: Extract clean landmark label from user query
function formatUserLandmarkLabel(raw: string): string {
  const cleaned = raw.trim();
  if (!cleaned) return '';
  return cleaned
    .split(/\s+/)
    .map((word) => {
      if (/^(iiit|iit|nit|aiims|bits|isbt|aiims|mcd|ndmc)$/i.test(word)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

// Shared helper: Lookup Wikidata P625 coordinate for exact Indian institutions / campuses / municipal bodies
async function fetchWikidataCoordBySearch(query: string): Promise<{
  label: string;
  description: string;
  lat: number;
  lon: number;
  qid: string;
  website?: string | null;
} | null> {
  try {
    const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=en&limit=4&format=json`;
    const sr = await fetch(searchUrl, {
      headers: { 'User-Agent': 'SwachhSetu-SanitationPortal/1.0' },
      signal: AbortSignal.timeout(2500),
    });
    if (!sr.ok) return null;
    const sData: any = await sr.json();
    const hits = Array.isArray(sData?.search) ? sData.search : [];
    if (hits.length === 0) return null;

    const ids = hits.map((h: any) => h.id).filter(Boolean).slice(0, 4).join('|');
    const entUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(ids)}&props=claims|labels|descriptions&languages=en&format=json`;
    const er = await fetch(entUrl, {
      headers: { 'User-Agent': 'SwachhSetu-SanitationPortal/1.0' },
      signal: AbortSignal.timeout(2500),
    });
    if (!er.ok) return null;
    const eData: any = await er.json();
    const entities = eData?.entities || {};

    for (const h of hits) {
      const ent = entities[h.id];
      const p625 = ent?.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
      const lat = Number(p625?.latitude);
      const lon = Number(p625?.longitude);
      const p856 = ent?.claims?.P856?.[0]?.mainsnak?.datavalue?.value || null;
      if (Number.isFinite(lat) && Number.isFinite(lon) && lat >= 6 && lat <= 38 && lon >= 68 && lon <= 98) {
        return {
          label: ent?.labels?.en?.value || h.label || query,
          description: ent?.descriptions?.en?.value || h.description || '',
          lat,
          lon,
          qid: h.id,
          website: typeof p856 === 'string' ? p856 : null,
        };
      }
    }
  } catch {}
  return null;
}

// Shared helper: Lookup official Indian Municipal Corporation / Civic Body name from Wikidata
async function fetchWikidataCivicBodyName(city: string): Promise<{ name: string; website?: string | null; qid?: string } | null> {
  if (!city || city.trim().length < 2) return null;
  const cleanCity = city.trim();
  const candidates = [
    `${cleanCity} Municipal Corporation`,
    `Nagar Nigam ${cleanCity}`,
    `${cleanCity} Municipal Council`,
    `Nagar Parishad ${cleanCity}`,
    `Nagar Palika ${cleanCity}`,
  ];

  for (const term of candidates) {
    try {
      const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(term)}&language=en&limit=4&format=json`;
      const r = await fetch(url, {
        headers: { 'User-Agent': 'SwachhSetu-SanitationPortal/1.0' },
        signal: AbortSignal.timeout(2200),
      });
      if (!r.ok) continue;
      const data: any = await r.json();
      const hits = Array.isArray(data?.search) ? data.search : [];
      const exactHit = hits.find((h: any) => {
        const lbl = String(h?.label || '').toLowerCase();
        const desc = String(h?.description || '').toLowerCase();
        if (desc.includes('area of jurisdiction') || lbl.endsWith(' area') || lbl.includes('election')) return false;
        return (
          lbl.includes(cleanCity.toLowerCase()) &&
          (lbl.includes('municipal') || lbl.includes('nigam') || lbl.includes('parishad') || lbl.includes('palika') || lbl.includes('cantonment'))
        );
      });
      if (exactHit) {
        let website: string | null = null;
        try {
          const er = await fetch(
            `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${exactHit.id}&props=claims&format=json`,
            { headers: { 'User-Agent': 'SwachhSetu-SanitationPortal/1.0' }, signal: AbortSignal.timeout(1800) }
          );
          if (er.ok) {
            const ed: any = await er.json();
            const rawSite = ed?.entities?.[exactHit.id]?.claims?.P856?.[0]?.mainsnak?.datavalue?.value;
            if (typeof rawSite === 'string') website = rawSite;
          }
        } catch {}
        return {
          name: exactHit.label,
          website,
          qid: exactHit.id,
        };
      }
    } catch {}
  }
  return null;
}

// Shared helper: Resolve Indian address / landmark query to coordinates & structured civic area
async function resolveIndianForwardGeocode(rawQuery: string, language: 'en' | 'hi' = 'en') {
  const fwdKey = `fwd:${rawQuery.toLowerCase().replace(/\s+/g, ' ')},${language}`;
  const cachedFwd = getCache<any>(geoCache, fwdKey);
  if (cachedFwd) {
    return cachedFwd;
  }

  const tokens = rawQuery
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const expandAcronyms = (str: string) =>
    str
      .replace(/\biiit\b/gi, 'Indian Institute of Information Technology')
      .replace(/\biit\b/gi, 'Indian Institute of Technology')
      .replace(/\bnit\b/gi, 'National Institute of Technology')
      .replace(/\baiims\b/gi, 'All India Institute of Medical Sciences')
      .replace(/\bbits\b/gi, 'Birla Institute of Technology and Science');

  const stripAcronyms = (str: string) =>
    str
      .replace(/\b(iiit|iit|nit|aiims|bits|gfti|college|university|campus|near|opp|opposite|behind)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const expandedTokens = tokens.map(expandAcronyms);

  const querySet = new Set<string>();
  const addQuery = (q: string) => {
    const cleaned = q.replace(/\s+/g, ' ').trim();
    if (cleaned.length >= 3) querySet.add(cleaned);
  };

  addQuery(tokens.join(', '));
  if (tokens.length >= 2) {
    addQuery(tokens.slice(1).join(', '));
    addQuery(tokens.slice(-2).join(', '));
    const cleanedFirst = stripAcronyms(tokens[0]);
    if (cleanedFirst && cleanedFirst.toLowerCase() !== tokens[0].toLowerCase()) {
      addQuery([tokens.slice(1, -1).join(', '), cleanedFirst, tokens[tokens.length - 1]].filter(Boolean).join(', '));
      addQuery([cleanedFirst, ...tokens.slice(1)].filter(Boolean).join(', '));
    }
    addQuery([...tokens].reverse().join(', '));
  }

  if (expandedTokens.join(', ') !== tokens.join(', ')) {
    addQuery(expandedTokens.join(', '));
    addQuery([...expandedTokens].reverse().join(', '));
  }

  const spaceWords = rawQuery
    .replace(/,/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3);
  if (spaceWords.length >= 2) {
    const cleanedAll = stripAcronyms(rawQuery.replace(/,/g, ' '));
    if (cleanedAll) addQuery(cleanedAll);
    if (tokens.length === 1) {
      addQuery(spaceWords.slice(1).join(' '));
      addQuery(spaceWords[spaceWords.length - 1]);
    }
  }

  const candidateQueries = Array.from(querySet).slice(0, 5);
  const nominatimQueries = candidateQueries.slice(0, 3);
  const acceptLang = language === 'hi' ? 'hi,en' : 'en';

  const fetchSearch = async (q: string, qIdx: number) => {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&addressdetails=1&limit=4&countrycodes=in&accept-language=${encodeURIComponent(acceptLang)}`;
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'SwachhSetu-SanitationPortal/1.0 (civic-forward-geocode)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(3400),
    });
    if (!r.ok) return [];
    const arr: any[] = await r.json();
    return Array.isArray(arr) ? arr.map((item) => ({ item, qIdx, queryUsed: q })) : [];
  };

  const fetchPhotonForward = async (q: string, qIdx: number) => {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=4`;
    const r = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!r.ok) return [];
    const data: any = await r.json();
    const features = Array.isArray(data?.features) ? data.features : [];
    return features
      .map((f: any) => {
        const coords = f?.geometry?.coordinates;
        const p = f?.properties || {};
        if (!Array.isArray(coords) || coords.length < 2) return null;
        if (p.countrycode && String(p.countrycode).toUpperCase() !== 'IN') return null;
        const pLon = Number(coords[0]);
        const pLat = Number(coords[1]);
        if (!Number.isFinite(pLat) || !Number.isFinite(pLon)) return null;
        const displayName = [p.name, p.street, p.district || p.locality, p.city || p.county, p.state, p.country]
          .filter(Boolean)
          .join(', ');
        return {
          qIdx,
          queryUsed: `photon:${q}`,
          item: {
            lat: pLat,
            lon: pLon,
            name: p.name || '',
            display_name: displayName,
            addresstype: p.osm_value || p.type || 'locality',
            type: p.osm_value || p.type || 'locality',
            importance: 0.55,
            address: {
              amenity: p.osm_key === 'amenity' ? p.name : undefined,
              road: p.street || undefined,
              neighbourhood: p.locality || p.district || (p.type === 'locality' || p.type === 'village' ? p.name : ''),
              city: p.city || p.county || '',
              state: p.state || '',
              postcode: p.postcode || '',
            },
          },
        };
      })
      .filter(Boolean) as Array<{ item: any; qIdx: number; queryUsed: string }>;
  };

  // Detect probable landmark/institute token (e.g. "iiit kota", "nit trichy", "iit bombay") for parallel Wikidata coordinate lookup
  const institutionToken =
    tokens.find((t) => /\b(iiit|iit|nit|aiims|bits|university|institute|college|hospital|airport|junction)\b/i.test(t)) ||
    (/\b(iiit|iit|nit|aiims|bits|university|institute|college)\b/i.test(rawQuery) ? rawQuery : '');
  const expandedInstitutionQuery = institutionToken ? expandAcronyms(institutionToken) : '';

  const ai = getGeminiClient();
  const rawWords = rawQuery
    .toLowerCase()
    .split(/[\s,]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3);

  const shouldRaceGemini = Boolean(
    ai && (/\b(iiit|iit|nit|aiims|bits|campus|university|college|institute|sector|phase|block|hospital|station)\b/i.test(rawQuery) || rawWords.length >= 2)
  );

  const geminiPromise = shouldRaceGemini && ai
    ? Promise.race([
        ai.models
          .generateContent({
            model: 'gemini-3.7-flash',
            contents: `Identify the exact Indian locality, city, and state for this place/address query: "${rawQuery}".
Return ONLY strict JSON: {"landmarkName":"string","locality":"string","city":"string","state":"string","nominatimQuery":"string (e.g. Ranpur, Kota, Rajasthan)"}`,
            config: { responseMimeType: 'application/json' },
          })
          .catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2400)),
      ])
    : Promise.resolve(null);

  const wikidataPromise = expandedInstitutionQuery
    ? Promise.race([
        fetchWikidataCoordBySearch(expandedInstitutionQuery),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3200)),
      ])
    : Promise.resolve(null);

  const [settled, aiLoc, wdHit] = await Promise.all([
    Promise.allSettled([
      ...nominatimQueries.map((q, idx) => fetchSearch(q, idx)),
      ...candidateQueries.slice(0, 4).map((q, idx) => fetchPhotonForward(q, idx)),
    ]),
    geminiPromise,
    wikidataPromise,
  ]);

  const candidates: any[] = [];
  const pushCandidate = (item: any, qIdx: number, queryUsed: string, baseBoost = 0) => {
    const lat = Number(item.lat);
    const lon = Number(item.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const displayLower = String(item.display_name || '').toLowerCase();
    const matchCount = rawWords.reduce((acc, w) => (displayLower.includes(w) ? acc + 1 : acc), 0);
    const addrType = String(item.addresstype || item.type || '').toLowerCase();
    const isTooBroad = addrType === 'state' || addrType === 'country' || Number(item.place_rank || 30) <= 8;
    const specificityBonus = isTooBroad ? -18 : 6;
    const score = baseBoost + matchCount * 10 - qIdx * 1.2 + specificityBonus + Number(item.importance || 0);
    candidates.push({ item, lat, lon, score, matchCount, queryUsed });
  };

  for (const entry of settled) {
    if (entry.status !== 'fulfilled') continue;
    for (const { item, qIdx, queryUsed } of entry.value) {
      pushCandidate(item, qIdx, queryUsed);
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const topMatchCount = candidates[0]?.matchCount || 0;
  let landmarkPrefix: string | null = null;

  // If Wikidata resolved an exact campus/landmark coordinate AND it aligns near our OSM area (or no OSM candidate exists), prioritize its exact GPS
  if (wdHit) {
    const revWd = await reverseGeocodeCoordsServer(wdHit.lat, wdHit.lon, language);
    const revText = `${revWd.exactAddress} ${revWd.city} ${revWd.state}`.toLowerCase();
    const compatibleWithQuery =
      candidates.length === 0 ||
      rawWords.some((w) => revText.includes(w) && w.length >= 4) ||
      haversineKm(wdHit.lat, wdHit.lon, candidates[0].lat, candidates[0].lon) < 25;

    if (compatibleWithQuery) {
      const formattedToken = institutionToken ? formatUserLandmarkLabel(institutionToken) : wdHit.label;
      landmarkPrefix = formattedToken;
      const wdMatchCount = rawWords.reduce(
        (acc, w) => (revText.includes(w) || wdHit.label.toLowerCase().includes(w) ? acc + 1 : acc),
        0
      );
      candidates.push({
        item: {
          lat: wdHit.lat,
          lon: wdHit.lon,
          name: formattedToken,
          display_name: `${formattedToken}, ${revWd.exactAddress}`,
          address: {
            amenity: formattedToken,
            neighbourhood: revWd.areaName.split(',')[0]?.trim() || '',
            city: revWd.city,
            state: revWd.state,
            postcode: revWd.postcode,
          },
          addresstype: 'campus',
          importance: 0.9,
        },
        lat: wdHit.lat,
        lon: wdHit.lon,
        score: 80 + wdMatchCount * 10,
        matchCount: wdMatchCount,
        queryUsed: `wikidata:${wdHit.qid}`,
      });
    }
  }

  if (aiLoc && (aiLoc as any).text && (candidates.length === 0 || topMatchCount < rawWords.length)) {
    try {
      const cleanedJson = String((aiLoc as any).text).replace(/```json|```/g, '').trim();
      const parsedLoc = JSON.parse(cleanedJson || '{}');
      const gemQueries = [
        parsedLoc?.nominatimQuery,
        [parsedLoc?.locality, parsedLoc?.city, parsedLoc?.state].filter(Boolean).join(', '),
        [parsedLoc?.city, parsedLoc?.state].filter(Boolean).join(', '),
      ].filter((q): q is string => typeof q === 'string' && q.trim().length >= 3);

      if (gemQueries.length > 0) {
        landmarkPrefix = landmarkPrefix || parsedLoc.landmarkName || formatUserLandmarkLabel(tokens[0] || rawQuery);
        const gemSettled = await Promise.allSettled(
          Array.from(new Set(gemQueries)).slice(0, 2).map((q, idx) => fetchSearch(q, -2 + idx))
        );
        for (const entry of gemSettled) {
          if (entry.status !== 'fulfilled') continue;
          for (const { item, qIdx, queryUsed } of entry.value) {
            pushCandidate(item, qIdx, queryUsed, 35);
          }
        }
      }
    } catch {}
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => b.score - a.score);
  const bestCandidate = candidates[0];
  const best = bestCandidate.item;
  const lat = bestCandidate.lat;
  const lon = bestCandidate.lon;
  const addr = best.address || {};

  // Preserve the user's landmark token (prefer institution/campus token rather than accidentally picking a trailing region!)
  const displayLowerForPoi = String(best.display_name || '').toLowerCase();
  const unmatchedLandmarkToken =
    tokens.find(
      (tok) =>
        tok &&
        /\b(iiit|iit|nit|aiims|bits|campus|university|institute|college|sector|phase|block|gate|market|hostel)\b/i.test(tok) &&
        !displayLowerForPoi.includes(tok.toLowerCase())
    ) || tokens.find((tok) => tok && !displayLowerForPoi.includes(tok.toLowerCase()));
  const leadingLandmark = unmatchedLandmarkToken ? formatUserLandmarkLabel(unmatchedLandmarkToken) : '';

  const poi =
    landmarkPrefix ||
    leadingLandmark ||
    best.name ||
    addr.amenity ||
    addr.building ||
    addr.university ||
    addr.college ||
    (bestCandidate.matchCount < rawWords.length ? formatUserLandmarkLabel(institutionToken || tokens[0] || rawQuery) : '');
  const street = [addr.house_number, addr.road || addr.pedestrian].filter(Boolean).join(' ').trim();
  const neighbourhood =
    addr.neighbourhood || addr.suburb || addr.village || addr.town || addr.hamlet || addr.city_district || '';
  const city = addr.city || addr.town || addr.state_district || addr.county || addr.village || '';
  const state = addr.state || '';
  const postcode = addr.postcode || '';

  const uniqueParts: string[] = [];
  for (const part of [poi, street, neighbourhood, city, state, postcode].filter(Boolean)) {
    const s = String(part).trim();
    if (s && !uniqueParts.some((e) => e.toLowerCase() === s.toLowerCase())) {
      uniqueParts.push(s);
    }
  }

  const exactAddress = uniqueParts.slice(0, 5).join(', ') || best.display_name || rawQuery;
  const areaParts: string[] = [];
  for (const p of [neighbourhood || best.name, city, state].filter(Boolean)) {
    const s = String(p).trim();
    if (s && !areaParts.some((e) => e.toLowerCase() === s.toLowerCase())) {
      areaParts.push(s);
    }
  }
  const areaName = areaParts.slice(0, 3).join(', ') || exactAddress;

  const payload = {
    success: true,
    provider: bestCandidate.queryUsed?.startsWith('wikidata:') ? 'wikidata_osm_forward' : 'nominatim_forward',
    latitude: lat,
    longitude: lon,
    exactAddress,
    areaName,
    wardOrLocality: areaName,
    city,
    state,
    postcode,
    displayName: best.display_name || exactAddress,
  };

  setCache(geoCache, fwdKey, payload, 15 * 60 * 1000);
  return payload;
}

// 8B. EXACT AREA / LANDMARK FORWARD GEOCODING (Typed/Spoken Address -> Exact Coordinates + Locality)
app.post('/api/geocode/forward', async (req, res) => {
  try {
    const rawBodyQuery = req.body?.query ?? req.body?.address;
    const rawQuery = typeof rawBodyQuery === 'string' ? rawBodyQuery.trim() : '';
    const language = req.body?.language === 'hi' ? 'hi' : 'en';

    if (!rawQuery || rawQuery.length < 3) {
      return res.status(400).json({ success: false, error: 'A location query of at least 3 characters is required' });
    }

    const payload = await resolveIndianForwardGeocode(rawQuery, language);
    if (!payload) {
      return res.json({ success: false, error: 'No matching location found' });
    }
    return res.json(payload);
  } catch (error: any) {
    console.error('Forward geocode error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Forward geocoding failed' });
  }
});

// Helper: Haversine distance in kilometers
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Persistent runtime dispatch store in OS temp dir (avoids triggering Vite reload)
const DISPATCH_STORE_PATH = path.join(os.tmpdir(), 'swachhsetu-municipal-dispatches.json');
let memoryDispatches: any[] = [];

async function loadDispatches(): Promise<any[]> {
  try {
    const raw = await fs.readFile(DISPATCH_STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      memoryDispatches = parsed;
      return parsed;
    }
  } catch {}
  return memoryDispatches;
}

async function saveDispatchRecord(record: any): Promise<void> {
  const list = await loadDispatches();
  list.unshift(record);
  memoryDispatches = list.slice(0, 200);
  try {
    await fs.writeFile(DISPATCH_STORE_PATH, JSON.stringify(memoryDispatches, null, 2), 'utf-8');
  } catch {}
}

// 9. REAL NEAREST MUNICIPAL CORPORATION OFFICER CENTER LOOKUP (OSM Nominatim + Photon + Wikidata Civic Entity + City Admin HQ + Cache)
app.post('/api/municipal/nearest-center', async (req, res) => {
  try {
    let lat = Number(req.body?.latitude ?? req.body?.lat);
    let lon = Number(req.body?.longitude ?? req.body?.lng);
    const address = typeof req.body?.address === 'string' ? req.body.address.trim() : '';
    let city = typeof req.body?.city === 'string' ? req.body.city.trim() : '';
    let state = typeof req.body?.state === 'string' ? req.body.state.trim() : '';
    const ward = typeof req.body?.ward === 'string' ? req.body.ward.trim() : '';
    const language = req.body?.language === 'hi' ? 'hi' : 'en';

    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ success: false, error: 'Valid latitude and longitude are required' });
    }

    // Safety guard: if stale Delhi default coords or (0,0) were passed alongside an address, resolve exact spot first
    const locationTextRaw = [address, ward, city, state].filter(Boolean).join(' ');
    const nearDelhiDefault =
      haversineKm(lat, lon, 28.6508, 77.2335) < 1.5 ||
      haversineKm(lat, lon, 28.6315, 77.2167) < 1.5 ||
      (Math.abs(lat) < 0.001 && Math.abs(lon) < 0.001);
    if (nearDelhiDefault && address.length >= 3 && !isDelhiNcrLocationText(locationTextRaw)) {
      const recovered = await resolveIndianForwardGeocode(address, language);
      if (recovered?.success) {
        lat = recovered.latitude;
        lon = recovered.longitude;
        city = recovered.city || city;
        state = recovered.state || state;
      } else {
        const areaFallback = address || ward || 'Local Area';
        return res.json({
          success: true,
          provider: 'civic_authority_derived',
          center: {
            center_name:
              language === 'hi'
                ? `${areaFallback} नगर निगम अधिकारी केंद्र`
                : `${areaFallback} Municipal Corporation Sanitation Center`,
            center_address: [address, state].filter(Boolean).join(', ') || areaFallback,
            center_latitude: undefined,
            center_longitude: undefined,
            distance_km: null,
            authority_type:
              language === 'hi' ? 'क्षेत्रीय स्वच्छता अधिकारी केंद्र' : 'Area Municipal Sanitation Officer Center',
            contact_phone: null,
            website: null,
            helpline: '1969',
            provider: 'civic_authority_derived',
          },
        });
      }
    }

    // If city/state wasn't provided by client, reverse-geocode the exact coordinates once to enrich civic queries
    if ((!city || !state) && (Math.abs(lat) > 0.001 || Math.abs(lon) > 0.001)) {
      const rev = await reverseGeocodeCoordsServer(lat, lon, 'en');
      if (rev?.success) {
        city = city || rev.city || '';
        state = state || rev.state || '';
      }
    }

    const inferredLocationTokens = [address, ward]
      .join(',')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const effectiveLocationText = [city, state, ward, address].filter(Boolean).join(' ').toLowerCase();
    const isActuallyDelhiNcr = isDelhiNcrLocationText(effectiveLocationText);

    const centerKey = `${lat.toFixed(2)},${lon.toFixed(2)},${city.toLowerCase()},${ward.toLowerCase()},${language}`;
    const cachedCenter = getCache<any>(centerCache, centerKey);
    if (cachedCenter) {
      return res.json(cachedCenter);
    }

    const municipalKeywords = [
      'municipal',
      'corporation',
      'nagar',
      'nigam',
      'palika',
      'parishad',
      'panchayat',
      'ward office',
      'mcd',
      'ndmc',
      'bmc',
      'bbmp',
      'pmc',
      'ghmc',
      'kmc',
      'amc',
      'jmc',
      'civic',
      'sanitation',
      'town hall',
      'townhall',
      'development authority',
      'authority',
      'zonal office',
      'zone office',
      'collectorate',
      'tehsil',
      'cantonment board',
    ];

    const excludedVenueKeywords = [
      'marriage',
      'marraige',
      'banquet',
      'wedding',
      'party',
      'resort',
      'hotel',
      'restaurant',
      'cafe',
      'cinema',
      'mall',
      'club',
      'vatika',
      'farmhouse',
      'park',
      'garden',
      'udyan',
      'road',
      'marg',
      'highway',
      'street',
      'lane',
      'gali',
      'circle',
      'chowk',
      'crossing',
      'bus stop',
      'station',
      'hospital',
      'clinic',
      'school',
      'college',
    ];

    const isRelevantCivicCandidate = (
      name: string,
      tagsOrMeta?: { amenity?: string; office?: string; type?: string; category?: string; osmKey?: string; osmValue?: string }
    ) => {
      const lower = name.toLowerCase();
      const cat = String(tagsOrMeta?.category || tagsOrMeta?.osmKey || '').toLowerCase();
      const typ = String(tagsOrMeta?.type || tagsOrMeta?.osmValue || '').toLowerCase();

      // Strictly reject roads, highways, parks, commercial shops, etc. (e.g. "Nagar Nigam Park", "Kota Road")
      if (['highway', 'leisure', 'shop', 'tourism', 'natural', 'landuse', 'railway'].includes(cat)) {
        return false;
      }
      if (['park', 'garden', 'residential', 'tertiary', 'secondary', 'primary', 'trunk', 'unclassified', 'service'].includes(typ)) {
        return false;
      }
      if (excludedVenueKeywords.some((bad) => new RegExp(`\\b${bad}\\b`, 'i').test(lower))) {
        return false;
      }
      if (
        tagsOrMeta?.amenity === 'townhall' ||
        tagsOrMeta?.type === 'townhall' ||
        tagsOrMeta?.osmValue === 'townhall' ||
        tagsOrMeta?.office === 'government' ||
        tagsOrMeta?.office === 'administrative' ||
        tagsOrMeta?.osmKey === 'office'
      ) {
        return true;
      }
      if (municipalKeywords.some((kw) => lower.includes(kw))) {
        return true;
      }
      return false;
    };

    const scoreCandidate = (name: string, tags: any, distKm: number) => {
      const lower = name.toLowerCase();
      let bonus = 0;
      if (tags?.amenity === 'townhall' || tags?.type === 'townhall') bonus += 6;
      if (municipalKeywords.some((kw) => lower.includes(kw))) bonus += 6;
      if (lower.includes('municipal') || lower.includes('nigam') || lower.includes('palika') || lower.includes('parishad')) {
        bonus += 5;
      }
      return distKm - bonus;
    };

    const fetchOverpassCandidates = async () => {
      const overpassQuery = `[out:json][timeout:4];(nwr["amenity"="townhall"](around:30000,${lat},${lon});nwr["office"="government"](around:25000,${lat},${lon}););out center 15;`;
      const ovRes = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'SwachhSetu-SanitationPortal/1.0',
          Accept: 'application/json',
        },
        body: `data=${encodeURIComponent(overpassQuery)}`,
        signal: AbortSignal.timeout(2200),
      });

      if (!ovRes.ok) return [];
      const ovData: any = await ovRes.json();
      const elements = Array.isArray(ovData?.elements) ? ovData.elements : [];

      return elements
        .map((el: any) => {
          const tags = el.tags || {};
          const elLat = el.lat ?? el.center?.lat;
          const elLon = el.lon ?? el.center?.lon;
          const name = tags['name:en'] || tags.name || tags['official_name'] || '';
          if (!Number.isFinite(elLat) || !Number.isFinite(elLon) || !name) return null;
          if (!isRelevantCivicCandidate(name, tags)) return null;
          const distKm = +haversineKm(lat, lon, elLat, elLon).toFixed(2);
          const addrParts = [
            tags['addr:housename'] || tags['addr:housenumber'],
            tags['addr:street'] || tags['addr:road'],
            tags['addr:suburb'] || tags['addr:neighbourhood'] || tags['addr:district'],
            tags['addr:city'] || city,
            tags['addr:state'] || state,
            tags['addr:postcode'],
          ]
            .filter(Boolean)
            .map((s: any) => String(s).trim());

          return {
            rank: scoreCandidate(name, tags, distKm) - 1.5,
            provider: 'osm_overpass',
            center: {
              center_name: name,
              center_address:
                addrParts.length > 0
                  ? addrParts.join(', ')
                  : tags['addr:full'] || [city, state].filter(Boolean).join(', ') || `${elLat.toFixed(4)}, ${elLon.toFixed(4)}`,
              center_latitude: elLat,
              center_longitude: elLon,
              distance_km: distKm,
              authority_type:
                tags.amenity === 'townhall'
                  ? language === 'hi'
                    ? 'नगर निगम / टाउन हॉल कार्यालय'
                    : 'Municipal Corporation / Town Hall'
                  : language === 'hi'
                  ? 'सरकारी एवं नागरिक प्रशासन केंद्र'
                  : 'Civic & Municipal Government Office',
              contact_phone: tags.phone || tags['contact:phone'] || null,
              website: tags.website || tags['contact:website'] || null,
              helpline: '1969',
              provider: 'osm_overpass',
            },
          };
        })
        .filter(Boolean);
    };

    const delta = 0.35; // ~38 km box so city civic offices for outskirts (e.g. Ranpur -> Kota MC) are captured
    const viewbox = `${lon - delta},${lat + delta},${lon + delta},${lat - delta}`;
    const cityOrGuess = city || (inferredLocationTokens.length >= 2 ? inferredLocationTokens[inferredLocationTokens.length - 2] : '');
    const nomQueries = [
      cityOrGuess ? `Municipal Corporation ${cityOrGuess}` : 'Municipal Corporation',
      cityOrGuess ? `Nagar Nigam ${cityOrGuess}` : 'Nagar Nigam',
      cityOrGuess ? `Nagar Parishad ${cityOrGuess}` : 'Nagar Parishad',
      cityOrGuess ? `Collectorate ${cityOrGuess}` : 'Collectorate',
    ];

    const fetchNominatimQuery = async (q: string) => {
      const nomSearchUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&viewbox=${encodeURIComponent(viewbox)}&bounded=1&limit=6&addressdetails=1`;
      const nsRes = await fetch(nomSearchUrl, {
        headers: {
          'User-Agent': 'SwachhSetu-SanitationPortal/1.0 (civic-dispatch)',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(2200),
      });
      if (!nsRes.ok) return [];
      const results: any[] = await nsRes.json();
      if (!Array.isArray(results)) return [];

      return results
        .map((r) => {
          const rLat = Number(r.lat);
          const rLon = Number(r.lon);
          const displayParts = String(r.display_name || '').split(',').map((s) => s.trim());
          const cName = r.name || displayParts[0] || '';
          if (!Number.isFinite(rLat) || !Number.isFinite(rLon) || !cName) return null;
          if (!isRelevantCivicCandidate(cName, { type: r.type, category: r.category })) return null;
          const distKm = +haversineKm(lat, lon, rLat, rLon).toFixed(2);
          return {
            rank: scoreCandidate(cName, { type: r.type }, distKm),
            provider: 'osm_nominatim',
            center: {
              center_name: cName,
              center_address: displayParts.slice(1, 5).join(', ') || r.display_name,
              center_latitude: rLat,
              center_longitude: rLon,
              distance_km: distKm,
              authority_type:
                language === 'hi'
                  ? 'निकटतम नगर निगम अधिकारी केंद्र'
                  : 'Nearest Municipal Corporation Center',
              contact_phone: null,
              website: null,
              helpline: '1969',
              provider: 'osm_nominatim',
            },
          };
        })
        .filter(Boolean);
    };

    const fetchPhotonCivicQuery = async (q: string) => {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&limit=6`;
      const pr = await fetch(url, { signal: AbortSignal.timeout(2200) });
      if (!pr.ok) return [];
      const data: any = await pr.json();
      const features = Array.isArray(data?.features) ? data.features : [];
      return features
        .map((f: any) => {
          const coords = f?.geometry?.coordinates;
          const props = f?.properties || {};
          if (!Array.isArray(coords) || coords.length < 2) return null;
          const rLon = Number(coords[0]);
          const rLat = Number(coords[1]);
          const cName = String(props.name || '').trim();
          if (!Number.isFinite(rLat) || !Number.isFinite(rLon) || !cName) return null;
          if (props.countrycode && String(props.countrycode).toUpperCase() !== 'IN') return null;
          if (!isRelevantCivicCandidate(cName, { osmKey: props.osm_key, osmValue: props.osm_value, type: props.type })) {
            return null;
          }
          const distKm = +haversineKm(lat, lon, rLat, rLon).toFixed(2);
          if (distKm > 45) return null;
          const addrStr = [props.street, props.district, props.city || city, props.state || state, props.postcode]
            .filter(Boolean)
            .join(', ');
          return {
            rank: scoreCandidate(cName, { amenity: props.osm_value }, distKm),
            provider: 'photon_osm',
            center: {
              center_name: cName,
              center_address: addrStr || [city, state].filter(Boolean).join(', '),
              center_latitude: rLat,
              center_longitude: rLon,
              distance_km: distKm,
              authority_type:
                language === 'hi'
                  ? 'निकटतम नगर निगम अधिकारी केंद्र'
                  : 'Nearest Municipal Corporation Center',
              contact_phone: null,
              website: null,
              helpline: '1969',
              provider: 'photon_osm',
            },
          };
        })
        .filter(Boolean);
    };

    // Fetch real City HQ coordinates via Photon + Nominatim in parallel as authoritative civic fallback
    const fetchCityCentroid = async () => {
      if (!cityOrGuess) return null;
      const q = [cityOrGuess, state].filter(Boolean).join(', ');
      const fromPhoton = async () => {
        const pu = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`;
        const pr = await fetch(pu, { signal: AbortSignal.timeout(3000) });
        if (!pr.ok) return null;
        const pdata: any = await pr.json();
        const feat = Array.isArray(pdata?.features) ? pdata.features[0] : null;
        const coords = feat?.geometry?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) return null;
        const cLon = Number(coords[0]);
        const cLat = Number(coords[1]);
        if (!Number.isFinite(cLat) || !Number.isFinite(cLon)) return null;
        const props = feat?.properties || {};
        if (props.countrycode && String(props.countrycode).toUpperCase() !== 'IN') return null;
        return {
          lat: cLat,
          lon: cLon,
          display_name: [props.name || cityOrGuess, props.county, props.state || state, props.postcode]
            .filter(Boolean)
            .join(', '),
          postcode: props.postcode || '',
        };
      };
      const fromNom = async () => {
        const u = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&countrycodes=in&addressdetails=1&limit=1`;
        const r = await fetch(u, {
          headers: { 'User-Agent': 'SwachhSetu-SanitationPortal/1.0 (civic-hq)', Accept: 'application/json' },
          signal: AbortSignal.timeout(3600),
        });
        if (!r.ok) return null;
        const arr: any[] = await r.json();
        const first = Array.isArray(arr) ? arr[0] : null;
        if (!first) return null;
        const cLat = Number(first.lat);
        const cLon = Number(first.lon);
        if (!Number.isFinite(cLat) || !Number.isFinite(cLon)) return null;
        return {
          lat: cLat,
          lon: cLon,
          display_name: first.display_name || q,
          postcode: first.address?.postcode || '',
        };
      };
      const [nomRes, phRes] = await Promise.allSettled([fromNom(), fromPhoton()]);
      if (nomRes.status === 'fulfilled' && nomRes.value) return nomRes.value;
      if (phRes.status === 'fulfilled' && phRes.value) return phRes.value;
      return null;
    };

    const [settled, wdCivic, cityCentroid] = await Promise.all([
      Promise.allSettled([
        fetchOverpassCandidates(),
        ...nomQueries.map((q) => fetchNominatimQuery(q)),
        ...(cityOrGuess
          ? [fetchPhotonCivicQuery(`Municipal Corporation ${cityOrGuess}`), fetchPhotonCivicQuery(`Nagar Nigam ${cityOrGuess}`)]
          : []),
      ]),
      fetchWikidataCivicBodyName(cityOrGuess),
      fetchCityCentroid(),
    ]);

    const allCandidates: any[] = [];
    for (const item of settled) {
      if (item.status === 'fulfilled' && Array.isArray(item.value)) {
        for (const c of item.value) {
          if (c?.center?.distance_km != null && c.center.distance_km > 45) continue;
          const hay = `${c?.center?.center_name || ''} ${c?.center?.center_address || ''}`.toLowerCase();
          if (
            !isActuallyDelhiNcr &&
            /\b(delhi|ndmc|new delhi municipal|municipal corporation of delhi)\b/i.test(hay)
          ) {
            continue;
          }
          allCandidates.push(c);
        }
      }
    }

    if (allCandidates.length > 0) {
      allCandidates.sort((a, b) => a.rank - b.rank);
      const best = allCandidates[0];
      const payload = {
        success: true,
        provider: best.provider,
        center: best.center,
      };
      setCache(centerCache, centerKey, payload, 30 * 60 * 1000);
      return res.json(payload);
    }

    // Secondary: Authoritative Wikidata Municipal Body + Real City Administrative HQ Coordinates from OSM
    const localityLabel =
      city ||
      cityOrGuess ||
      ward ||
      address ||
      `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

    const hqLat = cityCentroid?.lat ?? lat;
    const hqLon = cityCentroid?.lon ?? lon;
    const realDistKm =
      cityCentroid && haversineKm(lat, lon, cityCentroid.lat, cityCentroid.lon) > 0.2
        ? +haversineKm(lat, lon, cityCentroid.lat, cityCentroid.lon).toFixed(2)
        : null;

    const officialCenterName = wdCivic?.name
      ? language === 'hi'
        ? `${wdCivic.name} (स्वच्छता केंद्र)`
        : `${wdCivic.name} — Sanitation Officer Center`
      : language === 'hi'
      ? `${localityLabel} नगर निगम स्वच्छता अधिकारी केंद्र`
      : `${localityLabel} Municipal Corporation Sanitation Center`;

    const fallbackAddrParts: string[] = [];
    for (const part of [cityCentroid?.display_name || '', localityLabel, state]
      .join(',')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)) {
      if (!fallbackAddrParts.some((p) => p.toLowerCase() === part.toLowerCase())) {
        fallbackAddrParts.push(part);
      }
    }

    const fallbackPayload = {
      success: true,
      provider: wdCivic ? 'wikidata_osm_civic' : 'civic_authority_derived',
      center: {
        center_name: officialCenterName,
        center_address: fallbackAddrParts.slice(0, 5).join(', ') || localityLabel,
        center_latitude: hqLat,
        center_longitude: hqLon,
        distance_km: realDistKm,
        authority_type:
          language === 'hi'
            ? 'निकटतम नगर निगम स्वच्छता अधिकारी केंद्र'
            : 'Area Municipal Corporation Officer Center',
        contact_phone: null,
        website: wdCivic?.website || null,
        helpline: '1969',
        provider: wdCivic ? 'wikidata_osm_civic' : 'civic_authority_derived',
      },
    };
    setCache(centerCache, centerKey, fallbackPayload, 15 * 60 * 1000);
    return res.json(fallbackPayload);
  } catch (error: any) {
    console.error('Nearest municipal center lookup error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Municipal center lookup failed' });
  }
});

// 10. DISPATCH REAL COMPLAINT PACKET TO NEAREST MUNICIPAL CORPORATION OFFICER CENTER
app.post('/api/municipal/dispatch', async (req, res) => {
  try {
    const {
      complaintNumber,
      category,
      description,
      severity,
      urgency,
      address,
      ward,
      latitude,
      longitude,
      hasCitizenPhoto,
      center,
    } = req.body || {};

    if (!complaintNumber || !center?.center_name) {
      return res.status(400).json({ success: false, error: 'complaintNumber and municipal center details are required' });
    }

    const dispatchRecord = {
      dispatch_id: `DISP-${Date.now().toString(36).toUpperCase()}`,
      complaint_number: complaintNumber,
      category: category || 'Sanitation',
      description: description || '',
      severity: severity ?? 65,
      urgency: urgency || 'Medium',
      spot_address: address || '',
      ward: ward || '',
      spot_latitude: latitude,
      spot_longitude: longitude,
      has_citizen_photo: Boolean(hasCitizenPhoto),
      center_name: center.center_name,
      center_address: center.center_address || '',
      center_latitude: center.center_latitude,
      center_longitude: center.center_longitude,
      distance_km: center.distance_km ?? null,
      authority_type: center.authority_type || 'Municipal Corporation Officer Center',
      contact_phone: center.contact_phone || null,
      website: center.website || null,
      helpline: center.helpline || '1969',
      provider: center.provider || 'osm',
      dispatched_at: new Date().toISOString(),
      status: 'DISPATCHED_TO_CENTER' as const,
    };

    await saveDispatchRecord(dispatchRecord);

    return res.json({
      success: true,
      dispatch: dispatchRecord,
    });
  } catch (error: any) {
    console.error('Municipal dispatch error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to dispatch to municipal center' });
  }
});

app.get('/api/municipal/dispatches', async (_req, res) => {
  const dispatches = await loadDispatches();
  res.json({ success: true, dispatches });
});

// VITE MIDDLEWARE & SERVER STARTUP
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SwachhSetu AI Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
