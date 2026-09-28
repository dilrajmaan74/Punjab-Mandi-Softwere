import express from "express";
import http from "http";
import path from "path";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

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

  const distPath = path.join(process.cwd(), "dist");
  const indexPath = path.join(distPath, "index.html");
  let hasDist = fs.existsSync(indexPath);

  // If in production but dist is not present, build it on the fly
  if (!hasDist && process.env.NODE_ENV === "production") {
    try {
      console.log("dist/index.html not found; building static assets on the fly...");
      const { build } = await import("vite");
      await build();
      hasDist = fs.existsSync(indexPath);
      console.log(`On-the-fly build finished, hasDist: ${hasDist}`);
    } catch (buildErr) {
      console.error("On-the-fly build failed, will mount Vite middleware:", buildErr);
    }
  }

  if (hasDist) {
    // Serve pre-built static bundle
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
    // Development mode or fallback: Mount Vite middleware to serve on-the-fly
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

  // Bind primary server to 0.0.0.0 on PORT (required for Cloud Run container ingress)
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Primary server running on http://0.0.0.0:${PORT}`);
  });

  server.on("error", (err: any) => {
    console.error("Primary server error:", err);
  });

  // If Cloud Run assigned a port other than 3000 (e.g. 8080), also try binding 3000 if available
  if (PORT !== 3000) {
    const secondaryServer = http.createServer(app);
    secondaryServer.on("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        console.log("Port 3000 already in use by proxy/container.");
      } else {
        console.error("Secondary server error on port 3000:", err);
      }
    });
    try {
      secondaryServer.listen(3000, "0.0.0.0", () => {
        console.log("Secondary server also listening on http://0.0.0.0:3000");
      });
    } catch {
      // Safe to ignore
    }
  }
}

startServer().catch((err) => {
  console.error("Failed to start application server:", err);
  process.exit(1);
});

