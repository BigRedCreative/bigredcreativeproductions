import "server-only";

// Postgres SQLSTATE 23505 = unique_violation. Constraint name is checked
// too so this only matches the specific constraint being guarded against,
// not any unrelated unique violation. Shared by every mutation that needs
// to turn a database-level uniqueness conflict into a clean, specific
// error message (src/server/create-order.ts's clientRequestId race
// recovery, src/server/mutate-product.ts's slug-already-in-use case).
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; constraint?: string; message?: string };
  if (candidate.code !== "23505") return false;
  return candidate.constraint === constraint || (candidate.message?.includes(constraint) ?? false);
}
