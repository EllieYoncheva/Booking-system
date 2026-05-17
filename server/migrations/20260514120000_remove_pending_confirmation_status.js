/**
 * Fold legacy `pending_confirmation` into `pending` and drop that enum member.
 * @param {import("knex").Knex} knex
 */

/** MySQL DDL + implicit commits must not run inside a Knex migration transaction (can hang). */
export const config = { transaction: false };

export async function up(knex) {
  const r = await knex.raw(
    `SELECT COLUMN_TYPE AS t FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Reservations' AND COLUMN_NAME = 'status'`
  );
  const rows = Array.isArray(r) ? r[0] : r;
  const colType = rows?.[0]?.t ?? "";
  if (typeof colType !== "string" || !colType.includes("pending_confirmation")) {
    return;
  }

  await knex.raw(
    `UPDATE \`Reservations\` SET \`status\` = 'pending' WHERE \`status\` = 'pending_confirmation'`
  );

  const ir = await knex.raw(
    `SELECT 1 FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = 'Reservations' AND index_name = 'uq_Reservations_user_class_active'
     LIMIT 1`
  );
  const idxHit = Array.isArray(ir) ? ir[0] : ir;
  if (Array.isArray(idxHit) && idxHit.length > 0) {
    await knex.raw("ALTER TABLE `Reservations` DROP INDEX `uq_Reservations_user_class_active`");
  }

  if (await knex.schema.hasColumn("Reservations", "activeSlot")) {
    await knex.raw("ALTER TABLE `Reservations` DROP COLUMN `activeSlot`");
  }

  await knex.raw(`
    ALTER TABLE \`Reservations\`
    MODIFY COLUMN \`status\` ENUM(
      'pending',
      'confirmed',
      'cancelled_by_user',
      'cancelled_by_admin',
      'no_show'
    ) NOT NULL DEFAULT 'pending'
  `);

  await knex.raw(`
    ALTER TABLE \`Reservations\`
    ADD COLUMN \`activeSlot\` TINYINT UNSIGNED GENERATED ALWAYS AS (
      CASE WHEN \`status\` IN ('pending', 'confirmed') THEN 1 ELSE NULL END
    ) STORED
  `);

  await knex.raw(`
    ALTER TABLE \`Reservations\`
    ADD UNIQUE KEY \`uq_Reservations_user_class_active\` (\`userId\`, \`classId\`, \`activeSlot\`)
  `);
}

/**
 * @param {import("knex").Knex} knex
 */
export async function down(knex) {
  const ir = await knex.raw(
    `SELECT 1 FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = 'Reservations' AND index_name = 'uq_Reservations_user_class_active'
     LIMIT 1`
  );
  const idxHit = Array.isArray(ir) ? ir[0] : ir;
  if (Array.isArray(idxHit) && idxHit.length > 0) {
    await knex.raw("ALTER TABLE `Reservations` DROP INDEX `uq_Reservations_user_class_active`");
  }
  if (await knex.schema.hasColumn("Reservations", "activeSlot")) {
    await knex.raw("ALTER TABLE `Reservations` DROP COLUMN `activeSlot`");
  }
  await knex.raw(`
    ALTER TABLE \`Reservations\`
    MODIFY COLUMN \`status\` ENUM(
      'pending',
      'confirmed',
      'pending_confirmation',
      'cancelled_by_user',
      'cancelled_by_admin',
      'no_show'
    ) NOT NULL DEFAULT 'pending'
  `);
  await knex.raw(`
    ALTER TABLE \`Reservations\`
    ADD COLUMN \`activeSlot\` TINYINT UNSIGNED GENERATED ALWAYS AS (
      CASE
        WHEN \`status\` IN ('pending', 'confirmed', 'pending_confirmation') THEN 1
        ELSE NULL
      END
    ) STORED
  `);
  await knex.raw(`
    ALTER TABLE \`Reservations\`
    ADD UNIQUE KEY \`uq_Reservations_user_class_active\` (\`userId\`, \`classId\`, \`activeSlot\`)
  `);
}
