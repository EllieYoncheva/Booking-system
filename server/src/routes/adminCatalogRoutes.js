import { Router } from "express";
import { verifyKeycloakJwt, requireRole } from "../middleware/keycloakJwt.js";
import { attachAppUser } from "../middleware/attachAppUser.js";
import { getPool } from "../db/pool.js";
import * as studioRepository from "../repositories/studioRepository.js";
import * as serviceRepository from "../repositories/serviceRepository.js";
import * as instructorRepository from "../repositories/instructorRepository.js";
import * as classRepository from "../repositories/classRepository.js";

const router = Router();

router.use(verifyKeycloakJwt(true));
router.use(requireRole("admin"));
router.use(attachAppUser());

router.get("/studios", async (_req, res, next) => {
  try {
    res.json({ studios: await studioRepository.listStudios() });
  } catch (e) {
    next(e);
  }
});

router.post("/studios", async (req, res, next) => {
  try {
    const { name } = req.body ?? {};
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "name is required" });
    }
    const id = await studioRepository.insertStudio({
      name: name.trim().slice(0, 160),
      country: req.body.country,
      city: req.body.city,
      address: req.body.address,
      phone: req.body.phone,
      email: req.body.email,
    });
    res.status(201).json({ id });
  } catch (e) {
    next(e);
  }
});

router.patch("/studios/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Invalid id" });
    const row = await studioRepository.findStudioById(id);
    if (!row) return res.status(404).json({ error: "Not found" });
    const patch = {};
    if (req.body.name !== undefined) patch.name = String(req.body.name).trim().slice(0, 160);
    if (req.body.country !== undefined) patch.country = req.body.country;
    if (req.body.city !== undefined) patch.city = req.body.city;
    if (req.body.address !== undefined) patch.address = req.body.address;
    if (req.body.phone !== undefined) patch.phone = req.body.phone;
    if (req.body.email !== undefined) patch.email = req.body.email;
    await studioRepository.updateStudio(id, patch);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.delete("/studios/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Invalid id" });
    await studioRepository.softDeleteStudio(id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get("/services", async (_req, res, next) => {
  try {
    res.json({ services: await serviceRepository.listServices() });
  } catch (e) {
    next(e);
  }
});

router.post("/services", async (req, res, next) => {
  try {
    const { name } = req.body ?? {};
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "name is required" });
    }
    const id = await serviceRepository.insertService({
      name: name.trim().slice(0, 160),
      description: req.body.description,
    });
    res.status(201).json({ id });
  } catch (e) {
    next(e);
  }
});

router.patch("/services/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Invalid id" });
    const row = await serviceRepository.findServiceById(id);
    if (!row) return res.status(404).json({ error: "Not found" });
    const patch = {};
    if (req.body.name !== undefined) patch.name = String(req.body.name).trim().slice(0, 160);
    if (req.body.description !== undefined) patch.description = req.body.description;
    await serviceRepository.updateService(id, patch);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.delete("/services/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Invalid id" });
    await serviceRepository.softDeleteService(id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get("/instructors", async (_req, res, next) => {
  try {
    res.json({ instructors: await instructorRepository.listInstructors() });
  } catch (e) {
    next(e);
  }
});

router.post("/instructors", async (req, res, next) => {
  try {
    const { firstName, lastName } = req.body ?? {};
    if (typeof firstName !== "string" || !firstName.trim() || typeof lastName !== "string" || !lastName.trim()) {
      return res.status(400).json({ error: "firstName and lastName are required" });
    }
    const id = await instructorRepository.insertInstructor({
      firstName: firstName.trim().slice(0, 100),
      lastName: lastName.trim().slice(0, 100),
      phone: req.body.phone,
      email: req.body.email,
    });
    res.status(201).json({ id });
  } catch (e) {
    next(e);
  }
});

router.patch("/instructors/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Invalid id" });
    const row = await instructorRepository.findInstructorById(id);
    if (!row) return res.status(404).json({ error: "Not found" });
    const patch = {};
    if (req.body.firstName !== undefined) patch.firstName = String(req.body.firstName).trim().slice(0, 100);
    if (req.body.lastName !== undefined) patch.lastName = String(req.body.lastName).trim().slice(0, 100);
    if (req.body.phone !== undefined) patch.phone = req.body.phone;
    if (req.body.email !== undefined) patch.email = req.body.email;
    await instructorRepository.updateInstructor(id, patch);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.delete("/instructors/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Invalid id" });
    await instructorRepository.softDeleteInstructor(id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get("/classes", async (_req, res, next) => {
  try {
    res.json({ classes: await classRepository.listAllClasses() });
  } catch (e) {
    next(e);
  }
});

function parseClassBody(body, partial) {
  const out = {};
  if (!partial || body.name !== undefined) out.name = body.name == null ? null : String(body.name).slice(0, 160);
  if (!partial || body.description !== undefined) {
    out.description = body.description == null ? null : String(body.description).slice(0, 500);
  }
  if (!partial || body.startsAt !== undefined) {
    if (typeof body.startsAt !== "string" || !body.startsAt.trim()) return { error: "startsAt is required (ISO string)" };
    out.startsAt = body.startsAt.trim();
  }
  if (!partial || body.endsAt !== undefined) {
    if (typeof body.endsAt !== "string" || !body.endsAt.trim()) return { error: "endsAt is required (ISO string)" };
    out.endsAt = body.endsAt.trim();
  }
  if (!partial || body.price !== undefined) {
    out.price = body.price == null || body.price === "" ? null : Number(body.price);
    if (out.price != null && Number.isNaN(out.price)) return { error: "Invalid price" };
  }
  if (!partial || body.capacity !== undefined) {
    const cap = Number(body.capacity);
    if (!Number.isInteger(cap) || cap < 1) return { error: "capacity must be a positive integer" };
    out.capacity = cap;
  }
  if (!partial || body.serviceId !== undefined) {
    const sid = Number(body.serviceId);
    if (!Number.isInteger(sid) || sid < 1) return { error: "serviceId is required" };
    out.serviceId = sid;
  }
  if (!partial || body.studioId !== undefined) {
    const stid = Number(body.studioId);
    if (!Number.isInteger(stid) || stid < 1) return { error: "studioId is required" };
    out.studioId = stid;
  }
  if (!partial || body.instructorId !== undefined) {
    const iid = Number(body.instructorId);
    if (!Number.isInteger(iid) || iid < 1) return { error: "instructorId is required" };
    out.instructorId = iid;
  }
  if (body.cancellationReason !== undefined) {
    out.cancellationReason = body.cancellationReason == null || body.cancellationReason === ""
      ? null
      : String(body.cancellationReason).slice(0, 500);
  }
  return { value: out };
}

router.post("/classes", async (req, res, next) => {
  try {
    const parsed = parseClassBody(req.body ?? {}, false);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const v = parsed.value;
    const starts = new Date(v.startsAt);
    const ends = new Date(v.endsAt);
    if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime()) || ends <= starts) {
      return res.status(400).json({ error: "endsAt must be after startsAt" });
    }
    const svc = await serviceRepository.findServiceById(v.serviceId);
    const stu = await studioRepository.findStudioById(v.studioId);
    const ins = await instructorRepository.findInstructorById(v.instructorId);
    if (!svc || !stu || !ins) {
      return res.status(400).json({ error: "Invalid serviceId, studioId, or instructorId" });
    }
    const id = await classRepository.insertClass({
      name: v.name,
      description: v.description,
      startsAt: v.startsAt,
      endsAt: v.endsAt,
      price: v.price,
      capacity: v.capacity,
      serviceId: v.serviceId,
      studioId: v.studioId,
      instructorId: v.instructorId,
      cancellationReason: v.cancellationReason ?? null,
    });
    res.status(201).json({ id });
  } catch (e) {
    next(e);
  }
});

router.patch("/classes/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Invalid id" });
    const existing = await classRepository.findClassById(id);
    if (!existing) return res.status(404).json({ error: "Not found" });
    const parsed = parseClassBody(req.body ?? {}, true);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const v = parsed.value;
    const patch = {};
    for (const k of Object.keys(v)) {
      if (v[k] !== undefined) patch[k] = v[k];
    }
    if (Object.keys(patch).length === 0) return res.json({ ok: true });
    const startsAt = patch.startsAt !== undefined ? patch.startsAt : existing.startsAt;
    const endsAt = patch.endsAt !== undefined ? patch.endsAt : existing.endsAt;
    const s = new Date(startsAt);
    const e = new Date(endsAt);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e <= s) {
      return res.status(400).json({ error: "endsAt must be after startsAt" });
    }
    if (patch.serviceId != null) {
      const svc = await serviceRepository.findServiceById(patch.serviceId);
      if (!svc) return res.status(400).json({ error: "Invalid serviceId" });
    }
    if (patch.studioId != null) {
      const stu = await studioRepository.findStudioById(patch.studioId);
      if (!stu) return res.status(400).json({ error: "Invalid studioId" });
    }
    if (patch.instructorId != null) {
      const ins = await instructorRepository.findInstructorById(patch.instructorId);
      if (!ins) return res.status(400).json({ error: "Invalid instructorId" });
    }
    await classRepository.updateClass(id, patch);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.delete("/classes/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Invalid id" });
    const existing = await classRepository.findClassById(id);
    if (!existing) return res.status(404).json({ error: "Not found" });
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: "Database not configured" });
    const conn = await pool.getConnection();
    try {
      const n = await classRepository.countReservationsAnyStatus(conn, id);
      if (n > 0) {
        return res.status(409).json({
          error: "Има резервации за този клас; използвайте отмяна (cancellationReason) вместо изтриване",
        });
      }
      const [result] = await conn.query("DELETE FROM `Classes` WHERE `id` = ?", [id]);
      if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });
    } finally {
      conn.release();
    }
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
