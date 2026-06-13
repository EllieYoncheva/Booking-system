/**
 * @param {import("knex").Knex} knex
 */
export async function up(knex) {
  await knex.schema.createTable("Users", (t) => {
    t.increments("id").primary();
    t.string("firstName", 100).notNullable();
    t.string("lastName", 100).notNullable();
    t.string("email", 255).notNullable();
    t.string("phone", 32).nullable();
    t.string("keycloakSub", 255).nullable();
    t.string("passwordHash", 255).nullable();
    t.specificType("role", "ENUM('admin', 'client')").notNullable().defaultTo("client");
    t.dateTime("createdAt", { precision: 6 }).notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP(6)"));
    t.dateTime("updatedAt", { precision: 6 })
      .notNullable()
      .defaultTo(knex.raw("CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)"));
    t.dateTime("deletedAt", { precision: 6 }).nullable();
    t.unique(["email"], { indexName: "uq_Users_email" });
    t.unique(["phone"], { indexName: "uq_Users_phone" });
    t.unique(["keycloakSub"], { indexName: "uq_Users_keycloakSub" });
  });

  await knex.schema.createTable("Studios", (t) => {
    t.increments("id").primary();
    t.string("name", 160).notNullable();
    t.string("country", 100).nullable();
    t.string("city", 120).nullable();
    t.string("address", 500).nullable();
    t.string("phone", 32).nullable();
    t.string("email", 255).nullable();
    t.dateTime("createdAt", { precision: 6 }).notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP(6)"));
    t.dateTime("updatedAt", { precision: 6 })
      .notNullable()
      .defaultTo(knex.raw("CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)"));
    t.dateTime("deletedAt", { precision: 6 }).nullable();
  });

  await knex.schema.createTable("Services", (t) => {
    t.increments("id").primary();
    t.string("name", 160).notNullable();
    t.string("description", 500).nullable();
    t.dateTime("createdAt", { precision: 6 }).notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP(6)"));
    t.dateTime("updatedAt", { precision: 6 })
      .notNullable()
      .defaultTo(knex.raw("CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)"));
    t.dateTime("deletedAt", { precision: 6 }).nullable();
  });

  await knex.schema.createTable("Instructors", (t) => {
    t.increments("id").primary();
    t.string("firstName", 100).notNullable();
    t.string("lastName", 100).notNullable();
    t.string("phone", 32).nullable();
    t.string("email", 255).nullable();
    t.dateTime("createdAt", { precision: 6 }).notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP(6)"));
    t.dateTime("updatedAt", { precision: 6 })
      .notNullable()
      .defaultTo(knex.raw("CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)"));
    t.dateTime("deletedAt", { precision: 6 }).nullable();
  });

  await knex.schema.createTable("Classes", (t) => {
    t.increments("id").primary();
    t.string("name", 160).nullable();
    t.string("description", 500).nullable();
    t.dateTime("startsAt", { precision: 6 }).notNullable();
    t.dateTime("endsAt", { precision: 6 }).notNullable();
    t.decimal("price", 10, 2).nullable();
    t.integer("capacity").notNullable();
    t.integer("serviceId").unsigned().notNullable();
    t.integer("studioId").unsigned().notNullable();
    t.integer("instructorId").unsigned().notNullable();
    t.string("cancellationReason", 500).nullable();
    t.foreign("serviceId", "fk_Classes_Services").references("Services.id").onDelete("RESTRICT").onUpdate("CASCADE");
    t.foreign("studioId", "fk_Classes_Studios").references("Studios.id").onDelete("RESTRICT").onUpdate("CASCADE");
    t.foreign("instructorId", "fk_Classes_Instructors").references("Instructors.id").onDelete("RESTRICT").onUpdate("CASCADE");
    t.index(["serviceId"], "fk_Classes_Services_idx");
    t.index(["studioId", "startsAt"], "fk_Classes_Studios_idx");
    t.index(["startsAt"], "idx_Classes_startsAt");
    t.index(["instructorId"], "fk_Classes_Instructors_idx");
    t.check(knex.raw("`endsAt` > `startsAt`"), [], "chk_Classes_time");
    t.check(knex.raw("`capacity` > 0"), [], "chk_Classes_capacity");
  });

  await knex.raw(`
    CREATE TABLE \`Reservations\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`cancelledAt\` DATETIME(6) NULL,
      \`status\` ENUM('pending', 'confirmed', 'cancelled_by_user', 'cancelled_by_admin', 'no_show') NOT NULL DEFAULT 'pending',
      \`userId\` INT NOT NULL,
      \`classId\` INT NOT NULL,
      \`activeSlot\` TINYINT UNSIGNED GENERATED ALWAYS AS (
        CASE WHEN \`status\` IN ('pending', 'confirmed') THEN 1 ELSE NULL END
      ) STORED,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_Reservations_user_class_active\` (\`userId\`, \`classId\`, \`activeSlot\`),
      KEY \`fk_Reservations_Users_idx\` (\`userId\`),
      KEY \`fk_Reservations_Classes_idx\` (\`classId\`),
      KEY \`idx_Reservations_user_status\` (\`userId\`, \`status\`),
      KEY \`idx_Reservations_class_status\` (\`classId\`, \`status\`),
      CONSTRAINT \`fk_Reservations_Users\`
        FOREIGN KEY (\`userId\`) REFERENCES \`Users\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`fk_Reservations_Classes\`
        FOREIGN KEY (\`classId\`) REFERENCES \`Classes\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await knex.schema.createTable("Waitlist", (t) => {
    t.increments("id").primary();
    t.integer("position").nullable();
    t.dateTime("notifiedAt", { precision: 6 }).nullable();
    t.integer("userId").unsigned().notNullable();
    t.integer("classId").unsigned().notNullable();
    t.unique(["classId", "userId"], { indexName: "uq_Waitlist_class_user" });
    t.foreign("userId", "fk_Waitlist_Users").references("Users.id").onDelete("RESTRICT").onUpdate("CASCADE");
    t.foreign("classId", "fk_Waitlist_Classes").references("Classes.id").onDelete("CASCADE").onUpdate("CASCADE");
    t.index(["userId"], "fk_Waitlist_Users_idx");
    t.index(["classId"], "fk_Waitlist_Classes_idx");
  });

  await knex.schema.createTable("Notifications", (t) => {
    t.increments("id").primary();
    t.specificType("channel", "ENUM('email', 'sms', 'push')").notNullable().defaultTo("email");
    t.specificType("type", "ENUM('created', 'confirmed', 'cancelled', 'reminder')").notNullable();
    t.specificType("status", "ENUM('pending', 'sent', 'failed')").notNullable().defaultTo("pending");
    t.dateTime("sentAt", { precision: 6 }).nullable();
    t.dateTime("createdAt", { precision: 6 }).notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP(6)"));
    t.integer("userId").unsigned().notNullable();
    t.integer("reservationId").unsigned().nullable();
    t.integer("classId").unsigned().nullable();
    t.unique(["userId", "reservationId", "type"], {
      indexName: "uq_Notifications_user_reservation_type",
    });
    t.foreign("userId", "fk_Notifications_Users").references("Users.id").onDelete("CASCADE").onUpdate("CASCADE");
    t.foreign("reservationId", "fk_Notifications_Reservations").references("Reservations.id").onDelete("SET NULL").onUpdate("CASCADE");
    t.foreign("classId", "fk_Notifications_Classes").references("Classes.id").onDelete("SET NULL").onUpdate("CASCADE");
    t.index(["userId"], "fk_Notifications_Users_idx");
    t.index(["reservationId"], "fk_Notifications_Reservations_idx");
    t.index(["classId"], "fk_Notifications_Classes_idx");
  });

  await knex.schema.createTable("Subscription", (t) => {
    t.increments("id").primary();
    t.integer("totalVisits").nullable();
    t.integer("remaining").nullable();
    t.date("validUntil").nullable();
    t.integer("userId").unsigned().notNullable();
    t.foreign("userId", "fk_Subscription_Users").references("Users.id").onDelete("CASCADE").onUpdate("CASCADE");
    t.index(["userId"], "fk_Subscription_Users_idx");
  });
}

/**
 * @param {import("knex").Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists("Subscription");
  await knex.schema.dropTableIfExists("Notifications");
  await knex.schema.dropTableIfExists("Waitlist");
  await knex.schema.dropTableIfExists("Reservations");
  await knex.schema.dropTableIfExists("Classes");
  await knex.schema.dropTableIfExists("Instructors");
  await knex.schema.dropTableIfExists("Services");
  await knex.schema.dropTableIfExists("Studios");
  await knex.schema.dropTableIfExists("Users");
}
