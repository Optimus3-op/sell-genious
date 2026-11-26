import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { initializeSchema } from "./schema";
import { seedDatabaseIfEmpty } from "./seed";

const globalForDb = globalThis as unknown as {
  __sellgeniusDb?: DatabaseSync;
};

export function getDb(): DatabaseSync {
  if (globalForDb.__sellgeniusDb) {
    return globalForDb.__sellgeniusDb;
  }

  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, "sellgenius.db");
  const db = new DatabaseSync(dbPath);
  initializeSchema(db);
  seedDatabaseIfEmpty(db);

  globalForDb.__sellgeniusDb = db;
  return db;
}
