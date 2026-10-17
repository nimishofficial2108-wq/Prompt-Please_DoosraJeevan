import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = Number(process.env.NEURO_PORT || 3003);

// Body parser for JSON with base64 images
app.use(express.json({ limit: '50mb' }));

// Initialize Gemini SDK lazily / safely
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// AI Model Intracranial Hemorrhage Analysis Endpoint
app.post('/api/analyze-ich', async (req, res) => {
  try {
    const {
      sliceImageBase64,
      metadata,
      currentSlice,
      totalSlices,
      orientation,
      currentWindow,
      detectedHemStats,
    } = req.body;

    const ai = getGeminiClient();

    // If Gemini API Key is available, perform genuine multimodal radiological evaluation
    if (ai) {
      const prompt = `You are an educational image interpretation assistant (not a clinician) reviewing a non-contrast Head CT scan slice for Intracranial Hemorrhage (ICH).

SCAN CONTEXT:
- Active Viewing Plane: ${orientation || 'Axial'}
- Current Slice: ${currentSlice || 1} / ${totalSlices || 1}
- Display Window: ${currentWindow?.name || 'Hemorrhage Window'} (Width: ${currentWindow?.width || 130} HU, Center/Level: ${currentWindow?.level || 50} HU)
- Automated Voxel Scanner Telemetry:
  * High-density / hyperdense voxel cluster count: ${detectedHemStats?.hyperdenseVoxelCount || 0}
  * Approximate bleed volume detected: ${detectedHemStats?.estimatedVolumeMl || 0} mL
  * Peak Hounsfield Unit (HU) recorded: ${detectedHemStats?.peakHU || 'N/A'} HU
  * Bleed region: ${detectedHemStats?.region || 'Intracranial parenchyma / extra-axial space'}

TASK:
Examine this CT slice image for signs of acute intracranial hemorrhage, mass effect, midline shift, and herniation risk.
Provide a structured illustrative radiological observations in valid JSON format only (no markdown fencing, no code blocks, raw JSON).

JSON FORMAT REQUIRED:
{
  "triageStatus": "CRITICAL" | "URGENT" | "CLINICAL_REVIEW" | "NORMAL",
  "hemorrhageDetected": true | false,
  "overallConfidenceScore": number (0 to 100),
  "primaryHemorrhageSubtype": "Epidural Hematoma (EDH)" | "Subdural Hematoma (SDH)" | "Subarachnoid Hemorrhage (SAH)" | "Intraparenchymal Hemorrhage (IPH)" | "Intraventricular Hemorrhage (IVH)" | "None",
  "subtypes": [
    { "name": "Epidural (EDH)", "probability": number (0-100), "present": boolean, "criteria": string },
    { "name": "Subdural (SDH)", "probability": number (0-100), "present": boolean, "criteria": string },
    { "name": "Subarachnoid (SAH)", "probability": number (0-100), "present": boolean, "criteria": string },
    { "name": "Intraparenchymal (IPH)", "probability": number (0-100), "present": boolean, "criteria": string },
    { "name": "Intraventricular (IVH)", "probability": number (0-100), "present": boolean, "criteria": string }
  ],
  "radiologicalFindings": string[],
  "massEffect": {
    "midlineShiftMm": number,
    "ventricleEffacement": boolean,
    "sulcalEffacement": boolean,
    "herniationRisk": "HIGH" | "MODERATE" | "LOW" | "NONE"
  },
  "estimatedVolumeMl": number,
  "anatomicalLocation": string,
  "recommendedEmergencyActions": string[],
  "clinicalImpression": string
}`;

      const contentsPayload: any = [];

      if (sliceImageBase64 && sliceImageBase64.includes(',')) {
        const cleanBase64 = sliceImageBase64.split(',')[1];
        contentsPayload.push({
          inlineData: {
            mimeType: 'image/png',
            data: cleanBase64,
          },
        });
      }

      contentsPayload.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        contents: contentsPayload.length === 1 ? contentsPayload[0].text : { parts: contentsPayload },
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
          systemInstruction: 'You provide unvalidated exploratory observations, never a clinical diagnosis or emergency clearance. Output strict, valid JSON complying with the requested schema.',
        },
      });

      const responseText = response.text || '{}';
      try {
        const parsed = JSON.parse(responseText.trim());
        return res.json({
          success: true,
          source: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
          analysis: parsed,
        });
      } catch (parseErr) {
        console.warn('Failed to parse Gemini JSON, sanitizing:', responseText);
      }
    }

    // Never present fabricated high-confidence predictions as a real AI response.
    if (!ai) {
      return res.status(503).json({success:false,error:'GEMINI_API_KEY not configured. The CT visualizer still works locally, but AI review is unavailable.'});
    }
    return res.status(502).json({success:false,error:'Gemini did not return valid structured JSON; AI review unavailable.'});

  } catch (error: any) {
    console.error('ICH Analysis Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during CT analysis',
    });
  }
});

// Vite middleware & Static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
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
    console.log(`Intracranial Hemorrhage CT Visualizer Server running on port ${PORT}`);
  });
}

startServer();
