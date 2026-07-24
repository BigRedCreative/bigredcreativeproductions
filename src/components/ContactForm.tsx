import { sectionAnchors } from "@/config/sections";
import { contact } from "@/data/homepage";
import { getContactContent, getSiteSettings } from "@/server/queries/site-content";
import SectionHeading from "./ui/SectionHeading";
import Button from "./ui/Button";

// Database-backed as of Phase 14 — kicker/heading/description/submit label
// come from contact_content (field-level-fallback-safe against
// src/data/homepage.ts's contact export); the mailto target comes from
// site_settings.contactEmail. The form's own field labels/placeholders and
// service dropdown options stay code-owned this phase, per Phase 14 scope.
export default async function ContactForm() {
  const [content, settings] = await Promise.all([getContactContent(), getSiteSettings()]);
  const { form } = contact;

  return (
    <section className="contact grain" id={sectionAnchors.contact}>
      <SectionHeading
        kicker={content.kicker}
        heading={content.heading}
        description={content.description}
      />
      <form action={`mailto:${settings.contactEmail}`} method="post" encType="text/plain">
        <label>
          {form.nameLabel}
          <input name="name" required placeholder={form.namePlaceholder} />
        </label>
        <label>
          {form.emailLabel}
          <input name="email" type="email" required placeholder={form.emailPlaceholder} />
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
        <Button type="submit">{content.submitLabel}</Button>
      </form>
    </section>
  );
}
