/**
 * Optional reason when a client cancels their reservation.
 * @param {import("knex").Knex} knex
 */
export async function up(knex) {
  await knex.schema.alterTable("Reservations", (t) => {
    t.string("cancelReason", 500).nullable();
  });
}

/**
 * @param {import("knex").Knex} knex
 */
export async function down(knex) {
  await knex.schema.alterTable("Reservations", (t) => {
    t.dropColumn("cancelReason");
  });
}
