import http from "http";
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import { createServer as createViteServer } from "vite";
import { config } from "./config.js";
import { verifyKeycloakJwt } from "./middleware/keycloakJwt.js";
import keycloakAdminRoutes from "./routes/keycloakAdminRoutes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const clientRoot = path.join(repoRoot, "client");
const distDir = path.join(clientRoot, "dist");

async function createApp() {
  const app = express();
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "booking-system-api" });
  });

  app.get("/api/me", verifyKeycloakJwt(true), (req, res) => {
    res.json({
      sub: req.user.sub,
      preferredUsername: req.user.preferredUsername,
      email: req.user.email,
      roles: req.user.roles,
    });
  });

  app.use("/api/keycloak-admin", keycloakAdminRoutes);

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  const isProd = config.nodeEnv === "production";
  let httpServer = null;

  if (isProd) {
    const indexHtml = path.join(distDir, "index.html");
    if (!fs.existsSync(indexHtml)) {
      console.warn(
        "client/dist/index.html missing — run: npm run build --prefix client"
      );
    }
    app.use(express.static(distDir));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(indexHtml, (err) => (err ? next(err) : undefined));
    });
  } else {
    httpServer = http.createServer(app);
    const vite = await createViteServer({
      root: clientRoot,
      plugins: [react()],
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return { listenable: httpServer ?? app };
}

createApp()
  .then(({ listenable }) => {
    listenable.listen(config.port, () => {
      const base = `http://localhost:${config.port}`;
      console.log(`App (SPA + API): ${base}`);
      if (config.nodeEnv !== "production") {
        console.log(`Keycloak: Valid redirect URIs + Web origins → ${base}/*`);
      }
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
