import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Local env file is optional; hosted environments can provide DATABASE_URL directly.
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgres://lichao@localhost:5432/yaokao_suji"
  },
  verbose: true,
  strict: true
});
