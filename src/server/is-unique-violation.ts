import "server-only";

type PgErrorShape = { code?: string; constraint?: string; message?: string; cause?: unknown };

function asPgErrorShape(value: unknown): PgErrorShape | null {
  if (!value || typeof value !== "object") return null;
  return value as PgErrorShape;
}

// Postgres SQLSTATE 23505 = unique_violation. Constraint name is checked
// too so this only matches the specific constraint being guarded against,
// not any unrelated unique violation. Shared by every mutation that needs
// to turn a database-level uniqueness conflict into a clean, specific
// error message (src/server/create-order.ts's clientRequestId race
// recovery, src/server/mutate-product.ts's slug-already-in-use case).
//
// Checked at both the top level and under `.cause`: this drizzle-orm
// version (^0.45) wraps the real node-postgres/neon-serverless driver
// error inside a DrizzleQueryError whose own top-level `code`/`constraint`
// are undefined — the real Postgres error (with the real `code`/
// `constraint`) lives on `.cause`. Checking only the top level meant this
// function silently never matched a real unique violation from this
// driver, discovered via Phase 21C-1's genuine-concurrency testing (the
// order clientRequestId race recovery in create-order.ts never actually
// recovered under a real concurrent race). Top level is still checked
// first for backward compatibility with any error shape that isn't
// wrapped this way.
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  const top = asPgErrorShape(error);
  if (!top) return false;
  const cause = asPgErrorShape(top.cause);
  for (const candidate of [top, cause]) {
    if (!candidate || candidate.code !== "23505") continue;
    if (candidate.constraint === constraint || (candidate.message?.includes(constraint) ?? false)) {
      return true;
    }
  }
  return false;
}
