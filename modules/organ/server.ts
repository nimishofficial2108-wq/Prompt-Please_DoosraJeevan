import express from "express";
import path from "path";
import { runOrganDonationAgent, evaluateWithMistral, sendResendEmail, sendTelegramAlert, getAgentConfigStatus, getTelegramBotInfo, getLatestTelegramChatId } from "./src/services/organDonationAgent";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.ORGAN_PORT || 3002);

  // JSON Body Parser Middleware
  app.use(express.json());

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "NOTTO Agentic AI Orchestrator" });
  });

  // System Configuration & Real API Status
  app.get("/api/agent/system-status", (req, res) => {
    res.json({
      status: "online",
      timestamp: new Date().toISOString(),
      agents: getAgentConfigStatus()
    });
  });

  // Telegram Bot Info
  app.get("/api/agent/telegram-bot-info", async (req, res) => {
    const info = await getTelegramBotInfo();
    res.json(info);
  });

  // Telegram Latest Active Chat Auto-Detection
  app.get("/api/agent/telegram-latest-chat", async (req, res) => {
    const chat = await getLatestTelegramChatId();
    res.json(chat);
  });

  /**
   * Main Agentic AI Workflow Endpoint: POST /api/agent/run-organ-donation
   * Evaluates donor viability with Mistral AI and triggers Resend & Telegram downstream tools.
   */
  app.post("/api/agent/run-organ-donation", async (req, res) => {
    try {
      const donorData = req.body;
      if (!donorData || !donorData.organ || !donorData.bloodGroup) {
        return res.status(400).json({
          success: false,
          error: "Missing required donor fields (organ, bloodGroup, age, fullName)"
        });
      }

      console.log(`[API Route] Received Agentic AI request for donor: ${donorData.fullName || 'Anonymous'}`);
      const report = await runOrganDonationAgent(donorData);
      
      return res.status(200).json(report);
    } catch (error: any) {
      console.error("[API Route Error] Agent execution failed:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Internal server error during agent execution"
      });
    }
  });

  /**
   * Modular API Endpoint for Standalone Mistral Evaluation
   */
  app.post("/api/agent/evaluate-viability", async (req, res) => {
    try {
      const donorData = req.body;
      const evaluation = await evaluateWithMistral(donorData);
      return res.status(200).json({ success: true, evaluation });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * Modular API Endpoint for Hospital Emergency Email
   */
  app.post("/api/agent/send-email", async (req, res) => {
    try {
      const { donorData, evaluation } = req.body;
      const result = await sendResendEmail(donorData, evaluation);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * Modular API Endpoint for Admin Telegram Alert
   */
  app.post("/api/agent/send-telegram", async (req, res) => {
    try {
      const { donorData, evaluation } = req.body;
      const result = await sendTelegramAlert(donorData, evaluation);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * NeuroScan AI Interconnection Endpoints
   * Connects Doosra Jeevan with NeuroScan Backend (:8000) and Frontend (:8080)
   */

  // Health and connection status of NeuroScan services
  app.get("/api/neuroscan/status", async (req, res) => {
    let backendStatus = "offline";
    let backendDetails: any = null;
    let frontendStatus = "offline";
    let blockchainStatus = "offline";
    let blockchainBlocks = 0;

    // Check NeuroScan FastAPI Backend
    try {
      const bRes = await fetch("http://127.0.0.1:3003/api/health", { signal: AbortSignal.timeout(2500) });
      if (bRes.ok) {
        backendStatus = "online";
        backendDetails = await bRes.json();
      }
    } catch {
      backendStatus = "offline";
    }

    // Check NeuroScan Frontend
    try {
      const fRes = await fetch("http://127.0.0.1:3003/modules/neuro/", { signal: AbortSignal.timeout(2500) });
      if (fRes.ok || fRes.status === 200 || fRes.status === 304) {
        frontendStatus = "online";
      }
    } catch {
      frontendStatus = "offline";
    }

    // Check Blockchain Bridge (port 4000)
    try {
      const bcRes = await fetch("http://localhost:4000/api/ledger", { signal: AbortSignal.timeout(8000) });
      if (bcRes.ok) {
        const bcData = await bcRes.json();
        blockchainStatus = bcData.mode === "onchain" ? (bcData.network === "hardhat-local" ? "Hardhat local chain" : "testnet") : "offline";
        blockchainBlocks = bcData.blocks?.length || 0;
      }
    } catch {
      blockchainStatus = "offline";
    }

    res.json({
      success: true,
      neuroscanBackend: {
        status: backendStatus,
        url: "/modules/neuro/",
        docsUrl: "/modules/neuro/",
        service: backendDetails?.service || "NeuroScan ICH Detection API"
      },
      neuroscanFrontend: {
        status: frontendStatus,
        url: "/modules/neuro/",
        scannerUrl: "/modules/neuro/"
      },
      blockchain: {
        status: blockchainStatus,
        url: "http://localhost:4000",
        blocks: blockchainBlocks,
        network: "Hardhat local chain (chain ID 31337)",
        contracts: {
          // No fabricated contract addresses: only return values explicitly configured by deployer.
          ledger: process.env.LEDGER_CONTRACT_ADDRESS || null,
          patientNFT: process.env.PATIENT_NFT_CONTRACT_ADDRESS || null
        }
      }
    });
  });

  // Uploaded NeuroScan is a browser-side visualizer, not the original FastAPI case service.
  app.get('/api/neuroscan/cases', (_req,res) => res.json({success:true,cases:[],notice:'NeuroScan cases are loaded directly in its workstation. The separate FastAPI case server was not included in this ZIP.'}));
  app.post('/api/neuroscan/analyze/:caseId', (_req,res) => res.status(501).json({success:false,error:'Case-ID analysis requires a separate FastAPI backend that was not included. Open NeuroScan workstation to review local CT inputs.'}));

  // Explicitly disabled: brain-death certification is a legal/clinical process, not an AI output.
  app.post('/api/neuroscan/certify-brain-death', (_req, res) => {
    res.status(501).json({ success: false, error: 'Brain-death certification cannot be generated by this demo. It requires the legally designated medical board and official clinical procedures.' });
  });


// This portal is plain HTML/CSS/JS, not a React Vite SPA.
// Serve its public assets explicitly at the exact nested prefix used by the homepage.
// The previous Vite middleware returned index.html/404 for styles.css and app.js.
const publicDir = path.join(process.cwd(), 'public');
// IMPORTANT: Express matches '/modules/organ' with a trailing slash as well.
// A redirect from '/modules/organ' to '/modules/organ/' therefore loops forever.
// Disable automatic directory redirects and serve the document at both URLs.
app.use('/modules/organ', express.static(publicDir, { index: false, redirect: false }));
app.get(['/modules/organ', '/modules/organ/'], (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(process.cwd(), 'index.html'));
});

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] NOTTO Organ Twin + Agentic AI Backend running on http://localhost:${PORT}`);
  });
}

startServer();
