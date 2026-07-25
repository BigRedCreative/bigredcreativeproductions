// Lead funnel-stage statuses — plain data, deliberately NOT in
// server/queries/leads.ts (which is server-only) since client components
// (LeadStatusForm, LeadsFilterBar) need this list for their <select>
// options. Mirrors ORDER_STATUSES's exact placement in src/data/orders.ts
// for the same reason.
export const LEAD_STATUSES = ["new", "contacted", "qualified", "won", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
