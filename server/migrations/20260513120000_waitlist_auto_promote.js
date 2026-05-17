/**
 * Waitlist FIFO columns + notification types for automated promotions.
 * @param {import("knex").Knex} knex
 */
export async function up(knex) {
  const wlHasStatus = await knex.schema.hasColumn("Waitlist", "status");
  if (!wlHasStatus) {
    await knex.schema.alterTable("Waitlist", (t) => {
      t.specificType("status", "ENUM('waiting','promoted','removed')").notNullable().defaultTo("waiting");
    });
    await knex("Waitlist").update({ status: "waiting" });
  }

  const wlHasCreated = await knex.schema.hasColumn("Waitlist", "createdAt");
  if (!wlHasCreated) {
    await knex.schema.alterTable("Waitlist", (t) => {
      t.dateTime("createdAt", { precision: 6 }).notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP(6)"));
    });
  }

  await knex.raw(`
    ALTER TABLE \`Notifications\`
    MODIFY COLUMN \`type\` ENUM(
      'created',
      'confirmed',
      'cancelled',
      'reminder',
      'waitlist_promoted',
      'admin_pending_action',
      'reservation_rejected'
    ) NOT NULL
  `);
}

/**
 * @param {import("knex").Knex} knex
 */
export async function down(knex) {
  await knex.raw(`
    ALTER TABLE \`Notifications\`
    MODIFY COLUMN \`type\` ENUM('created', 'confirmed', 'cancelled', 'reminder') NOT NULL
  `);

  if (await knex.schema.hasColumn("Waitlist", "createdAt")) {
    await knex.schema.alterTable("Waitlist", (t) => {
      t.dropColumn("createdAt");
    });
  }
  if (await knex.schema.hasColumn("Waitlist", "status")) {
    await knex.schema.alterTable("Waitlist", (t) => {
      t.dropColumn("status");
    });
  }
}
