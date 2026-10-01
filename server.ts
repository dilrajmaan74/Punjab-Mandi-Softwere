import express from "express";
import path from "path";
import fs from "fs";
import {
  parseMandiVoiceTranscript,
  generateWhatsAppVoiceScript,
  generateDailyMunimSummary
} from "./server/aiService.ts";

async function startServer() {
  const app = express();
  const isProduction = process.env.NODE_ENV === "production";
  const PORT = isProduction ? Number(process.env.PORT) || 3000 : 3000;

  app.use(express.json());

  // Health check endpoints for monitoring
  const healthHandler = (_req: express.Request, res: express.Response) => {
    res.status(200).json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  };

  app.get("/health", healthHandler);
  app.get("/healthz", healthHandler);
  app.get("/api/health", healthHandler);
  app.get("/api/healthz", healthHandler);

  // -------------------------------------------------------------
  // AI Endpoints (Feature 1, 3, 6): Gemini AI Integration
  // -------------------------------------------------------------

  // Feature 1: AI Punjabi Voice Weighment Parser
  app.post("/api/ai/parse-voice", async (req, res) => {
    try {
      const { transcript, farmersList } = req.body;
      if (!transcript) {
        return res.status(400).json({ success: false, error: "Missing transcript" });
      }
      const result = await parseMandiVoiceTranscript(transcript, farmersList || []);
      return res.status(200).json(result);
    } catch (err: any) {
      console.error("AI parse-voice error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Feature 3: AI WhatsApp Voice-Note & Script Generator
  app.post("/api/ai/voice-whatsapp-note", async (req, res) => {
    try {
      const { type, data, farmer, firm } = req.body;
      const result = await generateWhatsAppVoiceScript({ type, data, farmer, firm });
      return res.status(200).json(result);
    } catch (err: any) {
      console.error("AI voice-whatsapp-note error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Feature 6: Daily AI Munim Evening Summary (ਮੁਨੀਮੀ ਰੋਜ਼ਨਾਮਚਾ)
  app.post("/api/ai/daily-munim-summary", async (req, res) => {
    try {
      const params = req.body;
      const result = await generateDailyMunimSummary(params);
      return res.status(200).json(result);
    } catch (err: any) {
      console.error("AI daily-munim-summary error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  const distPath = path.join(process.cwd(), "dist");
  const indexPath = path.join(distPath, "index.html");

  if (isProduction && fs.existsSync(indexPath)) {
    // Serve pre-built static bundle in production
    app.use(express.static(distPath));
    app.get("*", (_req, res, next) => {
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath, (err) => {
          if (err) next(err);
        });
      } else {
        next();
      }
    });
  } else {
    // Development mode: Mount Vite middleware to serve on-the-fly
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: "0.0.0.0",
        port: 3000,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  server.on("error", (err: any) => {
    console.error("Server error:", err);
  });
}

startServer().catch((err) => {
  console.error("Failed to start application server:", err);
  process.exit(1);
});
