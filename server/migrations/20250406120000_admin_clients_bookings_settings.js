/**
 * Admin client profiles, reservation cancel reasons, global booking settings.
 * @param {import("knex").Knex} knex
 */
export async function up(knex) {
  await knex.schema.alterTable("Users", (t) => {
    t.text("notes").nullable();
    t.text("internalNotes").nullable();
  });

  await knex.schema.alterTable("Reservations", (t) => {
    t.string("adminCancelReason", 500).nullable();
  });

  await knex.schema.createTable("AppSettings", (t) => {
    t.string("key", 64).primary();
    t.text("value").notNullable();
  });

  await knex("AppSettings").insert({
    key: "booking.autoConfirm",
    value: "false",
  });
}

/**
 * @param {import("knex").Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists("AppSettings");
  await knex.schema.alterTable("Reservations", (t) => {
    t.dropColumn("adminCancelReason");
  });
  await knex.schema.alterTable("Users", (t) => {
    t.dropColumn("internalNotes");
    t.dropColumn("notes");
  });
}
