import http from "http";
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import { createServer as createViteServer } from "vite";
import { config } from "./config.js";
import { httpErrorHandler } from "./errors/httpErrorHandler.js";
import { loadAppUser } from "./middleware/loadAppUser.js";
import { verifyKeycloakJwt, requireRole } from "./middleware/keycloakJwt.js";
import adminRoutes from "./routes/adminRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import classRoutes from "./routes/classRoutes.js";
import keycloakAdminRoutes from "./routes/keycloakAdminRoutes.js";
import meRoutes from "./routes/meRoutes.js";

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
      givenName: req.user.givenName,
      familyName: req.user.familyName,
      roles: req.user.roles,
    });
  });

  app.use("/api/classes", classRoutes);

  app.use("/api/me", verifyKeycloakJwt(true), loadAppUser(), meRoutes);

  app.use("/api", verifyKeycloakJwt(true), loadAppUser(), bookingRoutes);

  app.use("/api/admin", verifyKeycloakJwt(true), requireRole("admin"), loadAppUser(), adminRoutes);

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

  app.use(httpErrorHandler);

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
