import "dotenv/config";

/** @type {import("knex").Knex.Config} */
export default {
  client: "mysql2",
  connection: process.env.DATABASE_URL || "",
  pool: { min: 0, max: 10 },
  migrations: {
    directory: "./migrations",
    extension: "js",
    loadExtensions: [".js"],
  },
  seeds: {
    directory: "./seeds",
    extension: "js",
    loadExtensions: [".js"],
  },
};
