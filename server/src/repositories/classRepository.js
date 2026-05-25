import { getPool } from "../db/pool.js";
import { toMysqlDateTime } from "../utils/mysqlDateTime.js";

const classColumns = `
    c.id,
    c.name,
    c.description,
    c.startsAt,
    DATE_ADD(c.startsAt, INTERVAL s.duration MINUTE) AS endsAt,
    c.price,
    c.capacity,
    c.serviceId,
    c.studioId,
    c.instructorId,
    c.scheduleId,
    c.cancellationReason
`;

const classSelectJoins = `
  SELECT ${classColumns},
    s.name AS serviceName,
    s.duration AS serviceDuration,
    st.name AS studioName,
    i.firstName AS instructorFirstName,
    i.lastName AS instructorLastName
  FROM \`Classes\` c
  INNER JOIN \`Services\` s ON s.id = c.serviceId AND s.deletedAt IS NULL
  INNER JOIN \`Studios\` st ON st.id = c.studioId AND st.deletedAt IS NULL
  INNER JOIN \`Instructors\` i ON i.id = c.instructorId AND i.deletedAt IS NULL
`;

const spotsSubquery = `
  LEFT JOIN (
    SELECT \`classId\`, COUNT(*) AS taken
    FROM \`Reservations\`
    WHERE \`status\` IN ('pending', 'confirmed', 'pending_confirmation')
    GROUP BY \`classId\`
  ) rc ON rc.classId = c.id
`;

/**
 * @param {{ from?: string, to?: string }} [range]
 */
export async function listPublicClassesWithSpots(range = {}) {
  const pool = getPool();
  if (!pool) return [];
  const conditions = ["c.`cancellationReason` IS NULL", "c.`startsAt` >= NOW(6)"];
  const params = [];
  if (range.from) {
    conditions.push("c.`startsAt` >= ?");
    params.push(range.from);
  }
  if (range.to) {
    conditions.push("c.`startsAt` <= ?");
    params.push(range.to);
  }
  if (range.studioId != null) {
    const studioId = Number(range.studioId);
    if (Number.isInteger(studioId) && studioId > 0) {
      conditions.push("c.`studioId` = ?");
      params.push(studioId);
    }
  }
  const where = conditions.join(" AND ");
  const [rows] = await pool.query(
    `SELECT ${classColumns},
      s.name AS serviceName,
      s.duration AS serviceDuration,
      st.name AS studioName,
      i.firstName AS instructorFirstName,
      i.lastName AS instructorLastName,
      (c.capacity - COALESCE(rc.taken, 0)) AS spotsLeft
    FROM \`Classes\` c
    INNER JOIN \`Services\` s ON s.id = c.serviceId AND s.deletedAt IS NULL
    INNER JOIN \`Studios\` st ON st.id = c.studioId AND st.deletedAt IS NULL
    INNER JOIN \`Instructors\` i ON i.id = c.instructorId AND i.deletedAt IS NULL
    ${spotsSubquery}
    WHERE ${where}
    ORDER BY c.startsAt ASC`,
    params
  );
  return rows;
}

export async function listClasses(range = {}) {
  const pool = getPool();
  if (!pool) return [];
  const conditions = [];
  const params = [];
  if (range.from) {
    conditions.push("c.`startsAt` >= ?");
    params.push(range.from);
  }
  if (range.to) {
    conditions.push("c.`startsAt` <= ?");
    params.push(range.to);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [rows] = await pool.query(`${classSelectJoins} ${where} ORDER BY c.startsAt ASC`, params);
  return rows;
}

export async function listAllClasses() {
  const pool = getPool();
  if (!pool) return [];
  const [rows] = await pool.query(
    `SELECT ${classColumns},
      s.name AS serviceName,
      s.duration AS serviceDuration,
      st.name AS studioName,
      i.firstName AS instructorFirstName,
      i.lastName AS instructorLastName,
      COALESCE(rc.taken, 0) AS taken,
      (c.capacity - COALESCE(rc.taken, 0)) AS spotsLeft
    FROM \`Classes\` c
    INNER JOIN \`Services\` s ON s.id = c.serviceId AND s.deletedAt IS NULL
    INNER JOIN \`Studios\` st ON st.id = c.studioId AND st.deletedAt IS NULL
    INNER JOIN \`Instructors\` i ON i.id = c.instructorId AND i.deletedAt IS NULL
    ${spotsSubquery}
    ORDER BY c.startsAt DESC`
  );
  return rows;
}

export async function findClassById(id) {
  const pool = getPool();
  if (!pool) return null;
  const [rows] = await pool.query(`${classSelectJoins} WHERE c.\`id\` = ? LIMIT 1`, [id]);
  return rows[0] ?? null;
}

export async function insertClass(row) {
  const pool = getPool();
  if (!pool) throw new Error("Database not configured");
  const [result] = await pool.query(
    `INSERT INTO \`Classes\` (\`name\`, \`description\`, \`startsAt\`, \`endsAt\`, \`price\`, \`capacity\`, \`serviceId\`, \`studioId\`, \`instructorId\`, \`scheduleId\`, \`cancellationReason\`)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.name ?? null,
      row.description ?? null,
      toMysqlDateTime(row.startsAt),
      toMysqlDateTime(row.endsAt),
      row.price ?? null,
      row.capacity,
      row.serviceId,
      row.studioId,
      row.instructorId,
      row.scheduleId ?? null,
      row.cancellationReason ?? null,
    ]
  );
  return result.insertId;
}

export async function updateClass(id, patch) {
  const pool = getPool();
  if (!pool) throw new Error("Database not configured");
  const allowed = [
    "name",
    "description",
    "startsAt",
    "endsAt",
    "price",
    "capacity",
    "serviceId",
    "studioId",
    "instructorId",
    "scheduleId",
    "cancellationReason",
  ];
  const keys = allowed.filter((k) => patch[k] !== undefined);
  if (keys.length === 0) return;
  const set = keys.map((k) => `\`${k}\` = ?`).join(", ");
  const values = keys.map((k) =>
    k === "startsAt" || k === "endsAt" ? toMysqlDateTime(patch[k]) : patch[k]
  );
  values.push(id);
  await pool.query(`UPDATE \`Classes\` SET ${set} WHERE \`id\` = ?`, values);
}

export async function refreshEndsAtForService(serviceId) {
  const pool = getPool();
  if (!pool) throw new Error("Database not configured");
  await pool.query(
    `UPDATE \`Classes\` c
     INNER JOIN \`Services\` s ON s.id = c.serviceId
     SET c.\`endsAt\` = DATE_ADD(c.\`startsAt\`, INTERVAL s.\`duration\` MINUTE)
     WHERE c.\`serviceId\` = ?`,
    [serviceId]
  );
}

/**
 * Lock class row for booking (use inside transaction).
 * @param {import("mysql2/promise").PoolConnection} conn
 */
export async function lockClassById(conn, id) {
  const [rows] = await conn.query(
    "SELECT * FROM `Classes` WHERE `id` = ? FOR UPDATE",
    [id]
  );
  return rows[0] ?? null;
}

export async function countReservationsForClass(conn, classId) {
  const [rows] = await conn.query(
    "SELECT COUNT(*) AS cnt FROM `Reservations` WHERE `classId` = ? AND `status` IN ('pending', 'confirmed', 'pending_confirmation')",
    [classId]
  );
  return Number(rows[0]?.cnt ?? 0);
}

/** Active (pending + confirmed) reservations for a class — pool (no transaction). */
export async function countActiveReservationsForClass(classId) {
  const pool = getPool();
  if (!pool) return 0;
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS cnt FROM `Reservations` WHERE `classId` = ? AND `status` IN ('pending', 'confirmed', 'pending_confirmation')",
    [classId]
  );
  return Number(rows[0]?.cnt ?? 0);
}

export async function countReservationsAnyStatus(conn, classId) {
  const [rows] = await conn.query(
    "SELECT COUNT(*) AS cnt FROM `Reservations` WHERE `classId` = ?",
    [classId]
  );
  return Number(rows[0]?.cnt ?? 0);
}
