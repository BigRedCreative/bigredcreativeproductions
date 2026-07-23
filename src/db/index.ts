import "server-only";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

// drizzle-orm/neon-serverless (a real WebSocket-backed Pool/session), not
// drizzle-orm/neon-http, is used deliberately: order creation requires a
// genuine multi-statement transaction (customer + order + order lines
// created atomically), and Neon's plain HTTP driver does not support
// transactions — each call is a single, stateless request. See CLAUDE.md
// "Backend + database foundation" for the full reasoning.
neonConfig.webSocketConstructor = ws;

type Database = ReturnType<typeof drizzle<typeof schema>>;

let cachedDb: Database | undefined;

// Lazy on purpose: this throws if DATABASE_URL is missing, but only when a
// request actually needs the database — never at module import/build
// time. That keeps `next build` (and every route that doesn't touch the
// database) working with zero database configured.
export function getDb(): Database {
  if (cachedDb) {
    return cachedDb;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Create a Neon project and populate .env.local " +
        "(copy .env.example) — see CLAUDE.md → \"Backend + database foundation\" → " +
        "\"Local development setup\" for the exact steps.",
    );
  }

  const pool = new Pool({ connectionString });
  cachedDb = drizzle(pool, { schema });
  return cachedDb;
}
