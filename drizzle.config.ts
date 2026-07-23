import type { Config } from "drizzle-kit";
import { loadEnvConfig } from "@next/env";

// Drizzle Kit runs as a standalone CLI, outside Next's own request pipeline,
// so it never gets Next's automatic .env.local loading for free. Reusing
// @next/env (already a transitive dependency of next itself, so this adds
// no new package) loads .env files in the exact same precedence order the
// app uses at runtime, instead of introducing a separate dotenv dependency.
loadEnvConfig(process.cwd());

// Used only by the Drizzle Kit CLI (generate/migrate/studio), never by the
// application at runtime (see src/db/index.ts for that). `generate` diffs
// src/db/schema.ts against the local migration history in ./drizzle and
// does not need a live connection; `migrate`/`studio` do.
export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
} satisfies Config;
