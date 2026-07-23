import "server-only";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A malformed [id] route param (not a real UUID) sent straight into a
// `uuid`-typed Postgres column comparison throws a raw driver error
// (22P02, invalid input syntax), not a clean "no rows" result. Checking
// the shape first lets admin order/customer detail pages treat a garbage
// id exactly like a nonexistent one — notFound(), never a raw DB error.
export function isValidUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
