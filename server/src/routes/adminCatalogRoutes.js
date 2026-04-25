import { Router } from "express";
import { verifyKeycloakJwt, requireRole } from "../middleware/keycloakJwt.js";
import { attachAppUser } from "../middleware/attachAppUser.js";
import { getPool } from "../db/pool.js";
import * as studioRepository from "../repositories/studioRepository.js";
import * as serviceRepository from "../repositories/serviceRepository.js";
import * as instructorRepository from "../repositories/instructorRepository.js";
import * as classRepository from "../repositories/classRepository.js";
import * as scheduleRepository from "../repositories/scheduleRepository.js";

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
    const duration = Number(req.body.duration);
    if (!Number.isInteger(duration) || duration < 1) {
      return res.status(400).json({ error: "duration must be a positive integer" });
    }
    const id = await serviceRepository.insertService({
      name: name.trim().slice(0, 160),
      description: req.body.description,
      duration,
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
    if (req.body.duration !== undefined) {
      const duration = Number(req.body.duration);
      if (!Number.isInteger(duration) || duration < 1) {
        return res.status(400).json({ error: "duration must be a positive integer" });
      }
      patch.duration = duration;
    }
    await serviceRepository.updateService(id, patch);
    if (patch.duration !== undefined) {
      await classRepository.refreshEndsAtForService(id);
    }
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

function addMinutes(value, minutes) {
  const start = new Date(value);
  const delta = Number(minutes);
  if (Number.isNaN(start.getTime())) {
    throw new Error("INVALID_STARTS_AT");
  }
  if (!Number.isFinite(delta) || delta < 1) {
    throw new Error("INVALID_DURATION");
  }
  const end = new Date(start.getTime() + delta * 60 * 1000);
  if (Number.isNaN(end.getTime())) {
    throw new Error("INVALID_ENDS_AT");
  }
  return end.toISOString();
}

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
    if (Number.isNaN(starts.getTime())) {
      return res.status(400).json({ error: "Invalid startsAt" });
    }
    const svc = await serviceRepository.findServiceById(v.serviceId);
    const stu = await studioRepository.findStudioById(v.studioId);
    const ins = await instructorRepository.findInstructorById(v.instructorId);
    if (!svc || !stu || !ins) {
      return res.status(400).json({ error: "Invalid serviceId, studioId, or instructorId" });
    }
    const durationMin = Number(svc.duration);
    if (!Number.isInteger(durationMin) || durationMin < 1) {
      return res.status(400).json({ error: "Service duration is invalid; set duration on the service" });
    }
    let endsAt;
    try {
      endsAt = addMinutes(v.startsAt, durationMin);
    } catch {
      return res.status(400).json({ error: "Invalid startsAt or duration" });
    }
    const id = await classRepository.insertClass({
      name: v.name,
      description: v.description,
      startsAt: v.startsAt,
      endsAt,
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
    const s = new Date(startsAt);
    if (Number.isNaN(s.getTime())) {
      return res.status(400).json({ error: "Invalid startsAt" });
    }
    let duration = Number(existing.serviceDuration);
    if (patch.serviceId != null) {
      const svc = await serviceRepository.findServiceById(patch.serviceId);
      if (!svc) return res.status(400).json({ error: "Invalid serviceId" });
      duration = Number(svc.duration);
    } else if (!Number.isFinite(duration) || duration < 1) {
      const svc = await serviceRepository.findServiceById(existing.serviceId);
      if (!svc) return res.status(400).json({ error: "Service not found for class" });
      duration = Number(svc.duration);
    }
    if (!Number.isInteger(duration) || duration < 1) {
      return res.status(400).json({ error: "Service duration is invalid; set duration on the service" });
    }
    if (patch.studioId != null) {
      const stu = await studioRepository.findStudioById(patch.studioId);
      if (!stu) return res.status(400).json({ error: "Invalid studioId" });
    }
    if (patch.instructorId != null) {
      const ins = await instructorRepository.findInstructorById(patch.instructorId);
      if (!ins) return res.status(400).json({ error: "Invalid instructorId" });
    }
    try {
      patch.endsAt = addMinutes(startsAt, duration);
    } catch {
      return res.status(400).json({ error: "Invalid startsAt or duration" });
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

router.get("/schedules", async (_req, res, next) => {
  try {
    res.json({ schedules: await scheduleRepository.listSchedules() });
  } catch (e) {
    next(e);
  }
});

function parseScheduleBody(body, partial) {
  const out = {};
  if (!partial || body.classId !== undefined) {
    const classId = Number(body.classId);
    if (!Number.isInteger(classId) || classId < 1) return { error: "classId is required" };
    out.classId = classId;
  }
  if (!partial || body.recurrenceRule !== undefined) {
    if (typeof body.recurrenceRule !== "string" || !body.recurrenceRule.trim()) {
      return { error: "recurrenceRule is required" };
    }
    const recurrenceRule = body.recurrenceRule.trim().slice(0, 255);
    const lower = recurrenceRule.toLowerCase();
    const supported =
      ["daily", "weekly", "monthly"].includes(lower) ||
      lower.includes("freq=daily") ||
      lower.includes("freq=weekly") ||
      lower.includes("freq=monthly");
    if (!supported) return { error: "recurrenceRule must be daily, weekly, monthly, or an iCal FREQ rule" };
    out.recurrenceRule = recurrenceRule;
  }
  if (!partial || body.startDate !== undefined) {
    if (typeof body.startDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.startDate)) {
      return { error: "startDate is required as YYYY-MM-DD" };
    }
    out.startDate = body.startDate;
  }
  if (!partial || body.endDate !== undefined) {
    if (body.endDate == null || body.endDate === "") {
      out.endDate = null;
    } else if (typeof body.endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.endDate)) {
      out.endDate = body.endDate;
    } else {
      return { error: "endDate must be YYYY-MM-DD" };
    }
  }
  if (!partial || body.daysOfWeek !== undefined) {
    const days = Array.isArray(body.daysOfWeek) ? body.daysOfWeek.map(Number) : [];
    if (!days.every((n) => Number.isInteger(n) && n >= 0 && n <= 6)) {
      return { error: "daysOfWeek must contain numbers from 0 to 6" };
    }
    out.daysOfWeek = [...new Set(days)].sort((a, b) => a - b);
  }
  if (!partial || body.startTime !== undefined) {
    if (typeof body.startTime !== "string" || !/^\d{2}:\d{2}$/.test(body.startTime)) {
      return { error: "startTime is required as HH:mm" };
    }
    out.startTime = body.startTime;
  }
  return { value: out };
}

router.post("/schedules", async (req, res, next) => {
  try {
    const parsed = parseScheduleBody(req.body ?? {}, false);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const v = parsed.value;
    const existing = await classRepository.findClassById(v.classId);
    if (!existing) return res.status(400).json({ error: "Invalid classId" });
    const id = await scheduleRepository.insertSchedule(v);
    const generation = await scheduleRepository.generateScheduleInstances(id);
    res.status(201).json({ id, generated: generation?.generated ?? 0, skipped: generation?.skipped ?? 0 });
  } catch (e) {
    next(e);
  }
});

router.patch("/schedules/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Invalid id" });
    const existing = await scheduleRepository.findScheduleById(id);
    if (!existing) return res.status(404).json({ error: "Not found" });
    const parsed = parseScheduleBody(req.body ?? {}, true);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    if (parsed.value.classId != null && !(await classRepository.findClassById(parsed.value.classId))) {
      return res.status(400).json({ error: "Invalid classId" });
    }
    await scheduleRepository.updateSchedule(id, parsed.value);
    const generation = await scheduleRepository.generateScheduleInstances(id);
    res.json({ ok: true, generated: generation?.generated ?? 0, skipped: generation?.skipped ?? 0 });
  } catch (e) {
    next(e);
  }
});

router.post("/schedules/:id/generate", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Invalid id" });
    const generation = await scheduleRepository.generateScheduleInstances(id);
    if (!generation) return res.status(404).json({ error: "Not found" });
    res.json({ generated: generation.generated, skipped: generation.skipped });
  } catch (e) {
    next(e);
  }
});

router.delete("/schedules/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Invalid id" });
    await scheduleRepository.deleteSchedule(id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
