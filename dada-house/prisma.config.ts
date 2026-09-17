import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // Schema pushes/migrations need a session-mode (non-pgbouncer) connection —
    // DDL and Prisma's migration engine don't work reliably through the
    // transaction-mode pooler that DATABASE_URL uses at runtime. Falls back to
    // DATABASE_URL if DIRECT_URL isn't set (e.g. a fresh local checkout).
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
