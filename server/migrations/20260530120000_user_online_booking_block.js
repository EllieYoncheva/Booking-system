/**
 * User-level online booking block flags.
 * @param {import("knex").Knex} knex
 */
export async function up(knex) {
  await knex.schema.alterTable("Users", (t) => {
    t.boolean("onlineBookingBlocked").notNullable().defaultTo(false);
    t.dateTime("bookingBlockedAt", { precision: 6 }).nullable();
    t.specificType("bookingBlockedSource", "ENUM('auto_no_show','admin_manual')").nullable();
  });
}

/**
 * @param {import("knex").Knex} knex
 */
export async function down(knex) {
  await knex.schema.alterTable("Users", (t) => {
    t.dropColumn("bookingBlockedSource");
    t.dropColumn("bookingBlockedAt");
    t.dropColumn("onlineBookingBlocked");
  });
}
