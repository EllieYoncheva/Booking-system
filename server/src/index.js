import http from "http";
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import { createServer as createViteServer } from "vite";
import { config } from "./config.js";
import { checkDatabaseConnection } from "./db/pool.js";
import { verifyKeycloakJwt } from "./middleware/keycloakJwt.js";
import keycloakAdminRoutes from "./routes/keycloakAdminRoutes.js";
import clientBookingRoutes from "./routes/clientBookingRoutes.js";
import adminCatalogRoutes from "./routes/adminCatalogRoutes.js";
import adminOperationsRoutes from "./routes/adminOperationsRoutes.js";
import { ensureAppUser } from "./services/userSyncService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const clientRoot = path.join(repoRoot, "client");
const distDir = path.join(clientRoot, "dist");

async function createApp() {
  const app = express();
  app.use(express.json());

  app.get("/api/health", async (_req, res) => {
    const database = await checkDatabaseConnection();
    res.json({
      ok: true,
      service: "booking-system-api",
      database,
    });
  });

  app.get("/api/me", verifyKeycloakJwt(true), async (req, res, next) => {
    try {
      const appUser = await ensureAppUser(req.user);
      res.json({
        sub: req.user.sub,
        preferredUsername: req.user.preferredUsername,
        email: req.user.email,
        roles: req.user.roles,
        appUser,
      });
    } catch (err) {
      next(err);
    }
  });

  app.use("/api/keycloak-admin", keycloakAdminRoutes);
  // Register `/api/admin` before `/api` so `/api/admin/*` is not handled by the client booking router
  // (mounted at `/api`), which would otherwise leave `/admin/...` unmatched and fall through to 404.
  app.use("/api/admin", adminCatalogRoutes);
  app.use("/api/admin", adminOperationsRoutes);
  app.use("/api", clientBookingRoutes);

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
