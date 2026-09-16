import express from "express";
import http from "http";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoints for Cloud Run and container monitoring
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

  // Vite middleware for development vs static serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: "0.0.0.0",
        port: 3000,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Bind to primary port 3000 on 0.0.0.0 (required for container ingress & Nginx reverse proxy)
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Application server running on http://0.0.0.0:${PORT}`);
  });

  // Support direct Cloud Run invocations if deployed in a standalone container without Nginx
  const rawPort = process.env.PORT;
  if (rawPort) {
    const envPort = parseInt(rawPort, 10);
    if (!isNaN(envPort) && envPort !== PORT) {
      const altServer = http.createServer(app);
      altServer.on("error", (err: any) => {
        if (err.code === "EADDRINUSE") {
          console.log(`Port ${envPort} in use by reverse proxy, app active on port ${PORT}`);
        } else {
          console.error(`Alt server error on port ${envPort}:`, err);
        }
      });
      try {
        altServer.listen(envPort, "0.0.0.0", () => {
          console.log(`Application also listening on PORT ${envPort}`);
        });
      } catch {
        // Safe to ignore if reverse proxy binds to this port
      }
    }
  }
}

startServer().catch((err) => {
  console.error("Failed to start application server:", err);
  process.exit(1);
});
