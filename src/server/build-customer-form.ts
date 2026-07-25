import "server-only";
import { validateRequiredText, validateEmailShape } from "@/server/validate-website-content";

export type CustomerCandidate = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  company: string | null;
};

export type CustomerFormResult =
  | { ok: true; customer: CustomerCandidate; fromLeadId: string | null }
  | { ok: false; errors: string[] };

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

// A lead has one `name` field; a customer needs `firstName`/`lastName`.
// This is a simple, honest heuristic (first word -> firstName, remainder
// -> lastName), never a silent final answer — the "Create Customer from
// Lead" page always lands the admin on an editable, prefilled form so they
// can correct a name that doesn't split cleanly (e.g. a single word, or a
// business name) before anything is written.
export function splitLeadName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  const firstSpace = trimmed.indexOf(" ");
  if (firstSpace === -1) return { firstName: trimmed, lastName: "" };
  return { firstName: trimmed.slice(0, firstSpace), lastName: trimmed.slice(firstSpace + 1).trim() };
}

// The one untrusted-input boundary for customer create/edit — shape
// parsing and basic field-shape validation only (required first name,
// required valid-looking email). Duplicate-email checking is NOT done
// here — that needs a database read, so it's mutate-customer.ts's job.
// `fromLeadId` is an optional hidden field set only when this form was
// reached via "Create Customer from Lead" — see mutate-customer.ts.
export function buildCustomerFromFormData(formData: FormData): CustomerFormResult {
  const errors: string[] = [];

  const firstName = getString(formData, "firstName");
  const lastName = getString(formData, "lastName");
  const emailRaw = getString(formData, "email");
  const phone = getString(formData, "phone");
  const company = getString(formData, "company");
  const fromLeadId = getString(formData, "fromLeadId");

  const firstNameError = validateRequiredText(firstName, "First name");
  if (firstNameError) errors.push(firstNameError);
  const emailError = validateEmailShape(emailRaw, "Email");
  if (emailError) errors.push(emailError);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    customer: {
      firstName,
      lastName,
      email: emailRaw.toLowerCase(),
      phone: phone || null,
      company: company || null,
    },
    fromLeadId: fromLeadId || null,
  };
}
