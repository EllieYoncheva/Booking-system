/**
 * Service durations and recurring class schedules.
 * @param {import("knex").Knex} knex
 */
export async function up(knex) {
  const hasDuration = await knex.schema.hasColumn("Services", "duration");
  if (!hasDuration) {
    await knex.schema.alterTable("Services", (t) => {
      t.integer("duration").notNullable().defaultTo(60);
    });
    await knex.raw("ALTER TABLE `Services` ADD CONSTRAINT `chk_Services_duration` CHECK (`duration` > 0)");
  }

  const hasScheduleId = await knex.schema.hasColumn("Classes", "scheduleId");
  const needsClassScheduleFk = !hasScheduleId;
  if (!hasScheduleId) {
    await knex.schema.alterTable("Classes", (t) => {
      t.integer("scheduleId").unsigned().nullable();
      t.index(["scheduleId"], "fk_Classes_Schedules_idx");
      t.unique(["scheduleId", "startsAt"], { indexName: "uq_Classes_schedule_start" });
    });
  }

  const hasSchedules = await knex.schema.hasTable("Schedules");
  if (!hasSchedules) {
    await knex.schema.createTable("Schedules", (t) => {
      t.increments("id").primary();
      t.integer("classId").unsigned().notNullable();
      t.string("recurrenceRule", 255).notNullable();
      t.date("startDate").notNullable();
      t.date("endDate").nullable();
      t.json("daysOfWeek").nullable();
      t.time("startTime").notNullable();
      t.foreign("classId", "fk_Schedules_Classes").references("Classes.id").onDelete("CASCADE").onUpdate("CASCADE");
      t.index(["classId"], "fk_Schedules_Classes_idx");
    });
  }

  if (needsClassScheduleFk) {
    await knex.schema.alterTable("Classes", (t) => {
      t.foreign("scheduleId", "fk_Classes_Schedules").references("Schedules.id").onDelete("SET NULL").onUpdate("CASCADE");
    });
  }
}

/**
 * @param {import("knex").Knex} knex
 */
export async function down(knex) {
  const hasScheduleId = await knex.schema.hasColumn("Classes", "scheduleId");
  if (hasScheduleId) {
    await knex.schema.alterTable("Classes", (t) => {
      t.dropForeign(["scheduleId"], "fk_Classes_Schedules");
      t.dropUnique(["scheduleId", "startsAt"], "uq_Classes_schedule_start");
      t.dropIndex(["scheduleId"], "fk_Classes_Schedules_idx");
      t.dropColumn("scheduleId");
    });
  }

  await knex.schema.dropTableIfExists("Schedules");

  const hasDuration = await knex.schema.hasColumn("Services", "duration");
  if (hasDuration) {
    await knex.raw("ALTER TABLE `Services` DROP CHECK `chk_Services_duration`");
    await knex.schema.alterTable("Services", (t) => {
      t.dropColumn("duration");
    });
  }
}
