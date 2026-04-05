import knexFactory from "knex";
import { config } from "../config.js";

/** @type {import("knex").Knex} */
let instance;

export function getKnex() {
  if (!instance) {
    if (!config.databaseUrl) {
      throw new Error("DATABASE_URL is not set");
    }
    instance = knexFactory({
      client: "mysql2",
      connection: config.databaseUrl,
      pool: { min: 0, max: 10 },
    });
  }
  return instance;
}

export async function destroyKnex() {
  if (instance) {
    await instance.destroy();
    instance = undefined;
  }
}
