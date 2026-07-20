import { defineConfig } from "drizzle-kit";

// Migrations for the app-store only. The warehouse and the mocked Salesforce schema are the
// customer's systems, managed by lib/warehouse/schema.sql, not by Drizzle.
export default defineConfig({
  schema: "./lib/appstore/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.APPSTORE_DATABASE_URL ?? "postgres://postgres@localhost:5432/appstore_dev",
  },
});
