/**
 * Backfill auto online-booking blocks for clients that already have 3+ no-shows.
 * @param {import("knex").Knex} knex
 */
export async function up(knex) {
  await knex.raw(`
    UPDATE \`Users\` u
    INNER JOIN (
      SELECT \`userId\`, COUNT(*) AS noShowCount
      FROM \`Reservations\`
      WHERE \`status\` = 'no_show'
      GROUP BY \`userId\`
      HAVING noShowCount >= 3
    ) ns ON ns.\`userId\` = u.\`id\`
    SET u.\`onlineBookingBlocked\` = 1,
        u.\`bookingBlockedAt\` = COALESCE(u.\`bookingBlockedAt\`, CURRENT_TIMESTAMP(6)),
        u.\`bookingBlockedSource\` = COALESCE(u.\`bookingBlockedSource\`, 'auto_no_show')
    WHERE u.\`deletedAt\` IS NULL
      AND u.\`role\` = 'client'
      AND u.\`onlineBookingBlocked\` = 0
  `);
}

/**
 * Audit history stays intact; do not automatically unblock users on rollback.
 * @param {import("knex").Knex} knex
 */
export async function down(_knex) {}
