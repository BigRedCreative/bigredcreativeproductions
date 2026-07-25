"use client";

import { useActionState } from "react";
import { submitLeadAction } from "@/server/submit-lead";
import type { contact } from "@/data/homepage";
import Button from "./ui/Button";

type ContactFormFieldsProps = {
  form: (typeof contact)["form"];
  submitLabel: string;
  contactEmail: string;
};

// The interactive half of the Contact section — ContactForm.tsx (server)
// fetches content/settings from Neon, this client component owns the
// actual <form>, submission state, and honest success/error messaging.
// Primary submission now goes through submitLeadAction (Neon-backed, see
// src/server/submit-lead.ts); the original mailto: link is kept as an
// always-visible SECONDARY fallback, mirroring Checkout's exact
// established "Prefer email?" pattern.
export default function ContactFormFields({ form, submitLabel, contactEmail }: ContactFormFieldsProps) {
  const [state, formAction, isPending] = useActionState(submitLeadAction, null);

  if (state?.status === "success") {
    return (
      <div className="contact-success" role="status">
        <p>{form.successMessage}</p>
      </div>
    );
  }

  return (
    <>
      <form action={formAction}>
        {state?.status === "error" && state.errors.length > 0 && (
          <div role="alert" aria-live="assertive">
            {state.errors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        )}

        {/* Honeypot — hidden from real visitors via inline styling (not
            just visually via CSS class, to avoid depending on globals.css
            for something security-relevant), never via `display:none` or
            `type="hidden"` alone, both of which some bots skip filling for
            different reasons; a real off-screen text input is a more
            reliable trap. Real users never see or reach it via keyboard. */}
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }} aria-hidden="true">
          <label>
            Website
            <input type="text" name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        <label>
          {form.nameLabel}
          <input name="name" required placeholder={form.namePlaceholder} />
        </label>
        <label>
          {form.emailLabel}
          <input name="email" type="email" required placeholder={form.emailPlaceholder} />
        </label>
        <label>
          {form.phoneLabel}
          <input name="phone" type="tel" placeholder={form.phonePlaceholder} />
        </label>
        <label>
          {form.companyLabel}
          <input name="company" placeholder={form.companyPlaceholder} />
        </label>
        <label>
          {form.serviceLabel}
          <select name="service" defaultValue="">
            <option value="" disabled>
              {form.servicePlaceholder}
            </option>
            {form.serviceOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label>
          {form.detailsLabel}
          <textarea name="details" required placeholder={form.detailsPlaceholder} />
        </label>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Sending…" : submitLabel}
        </Button>
      </form>
      <p className="contact-fallback-note">
        {form.fallbackLabel} <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
      </p>
    </>
  );
}
