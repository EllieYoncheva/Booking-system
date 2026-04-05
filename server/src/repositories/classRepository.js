import { getPool } from "../db/pool.js";
import { toMysqlDateTime } from "../utils/mysqlDateTime.js";

const classSelectJoins = `
  SELECT c.*,
    s.name AS serviceName,
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
    WHERE \`status\` IN ('pending', 'confirmed')
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
  const where = conditions.join(" AND ");
  const [rows] = await pool.query(
    `SELECT c.*,
      s.name AS serviceName,
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

export async function listAllClasses() {
  const pool = getPool();
  if (!pool) return [];
  const [rows] = await pool.query(
    `${classSelectJoins} ORDER BY c.startsAt DESC`
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
    `INSERT INTO \`Classes\` (\`name\`, \`description\`, \`startsAt\`, \`endsAt\`, \`price\`, \`capacity\`, \`serviceId\`, \`studioId\`, \`instructorId\`, \`cancellationReason\`)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    "SELECT COUNT(*) AS cnt FROM `Reservations` WHERE `classId` = ? AND `status` IN ('pending', 'confirmed')",
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
