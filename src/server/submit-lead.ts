"use server";

import { and, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { leads } from "@/db/schema";
import { validateRequiredText, validateEmailShape } from "@/server/validate-website-content";
import { contact } from "@/data/homepage";

// The ONE unauthenticated write path in this codebase's leads system —
// deliberately isolated in its own file, physically separate from
// mutate-lead.ts (every export there independently calls
// requireAdminUser()), so the one place accepting a write from an
// unauthenticated visitor is obvious at a glance, not buried among
// authenticated ones. Mirrors POST /api/orders' level of care: never
// trust client data beyond validation, never leak a raw DB error, never
// log a full payload (only a safe, non-PII identifier on failure).

export type SubmitLeadState = { status: "success" } | { status: "error"; errors: string[] } | null;

// Cooldown window for the same normalized email re-submitting — long
// enough to absorb a rapid bot retry loop or an accidental double-click,
// short enough that a legitimate visitor who submits again minutes later
// (e.g. after realizing they made a typo) isn't confused by a rejection
// that looks like nothing happened the first time either.
const COOLDOWN_MINUTES = 2;

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function submitLeadAction(_prevState: SubmitLeadState, formData: FormData): Promise<SubmitLeadState> {
  // Honeypot — a field real visitors never see or fill in (hidden via CSS
  // in the form itself, not just visually — see ContactFormFields.tsx).
  // A filled honeypot fails SILENTLY from the bot's perspective: no error,
  // no lead created, but also no signal back that anything was detected.
  const honeypot = getString(formData, "website");
  if (honeypot) {
    return { status: "success" };
  }

  const name = getString(formData, "name");
  const emailRaw = getString(formData, "email");
  const phone = getString(formData, "phone");
  const company = getString(formData, "company");
  const requestedService = getString(formData, "service");
  const message = getString(formData, "details");

  const errors: string[] = [];
  const nameError = validateRequiredText(name, contact.form.nameLabel);
  if (nameError) errors.push(nameError);
  const emailError = validateEmailShape(emailRaw, contact.form.emailLabel);
  if (emailError) errors.push(emailError);
  const messageError = validateRequiredText(message, contact.form.detailsLabel);
  if (messageError) errors.push(messageError);

  if (errors.length > 0) {
    return { status: "error", errors };
  }

  const email = emailRaw.toLowerCase();

  try {
    const db = getDb();

    // Same-normalized-email cooldown — a cheap, no-new-dependency spam
    // throttle. Rejection is framed as reassurance, not an error, so it
    // reads correctly whether the second attempt was a bot or a genuine
    // visitor who double-submitted.
    const cooldownThreshold = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000);
    const recent = await db
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.email, email), gt(leads.createdAt, cooldownThreshold)))
      .limit(1);

    if (recent.length > 0) {
      return { status: "error", errors: [contact.form.cooldownMessage] };
    }

    await db.insert(leads).values({
      name,
      email,
      phone: phone || null,
      company: company || null,
      requestedService: requestedService || null,
      message,
      source: "website-contact-form",
      status: "new",
      archivedAt: null,
    });
  } catch (error) {
    // Never log the full submission (name/email/message) — only that an
    // attempt failed. No PII on the Error object here.
    console.error("Lead submission failed");
    void error;
    return { status: "error", errors: [contact.form.genericErrorMessage] };
  }

  return { status: "success" };
}
