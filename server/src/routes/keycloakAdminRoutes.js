import { Router } from "express";
import { verifyKeycloakJwt, requireRole } from "../middleware/keycloakJwt.js";
import { keycloakAdminFetch } from "../services/keycloakAdmin.js";

const router = Router();

router.use(verifyKeycloakJwt(true));
router.use(requireRole("admin"));

router.post("/users", async (req, res) => {
  try {
    const r = await keycloakAdminFetch("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const text = await r.text();
    res.status(r.status).send(text || undefined);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

router.post("/users/:userId/role-mappings/realm", async (req, res) => {
  try {
    const r = await keycloakAdminFetch(
      `/users/${req.params.userId}/role-mappings/realm`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      }
    );
    const text = await r.text();
    res.status(r.status).send(text || undefined);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

router.get("/roles", async (req, res) => {
  try {
    const r = await keycloakAdminFetch("/roles");
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

router.get("/users", async (req, res) => {
  try {
    const email = req.query.email ? `?email=${encodeURIComponent(req.query.email)}` : "";
    const r = await keycloakAdminFetch(`/users${email}`);
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

export default router;
