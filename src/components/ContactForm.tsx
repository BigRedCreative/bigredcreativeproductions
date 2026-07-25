import { sectionAnchors } from "@/config/sections";
import { contact } from "@/data/homepage";
import { getContactContent, getSiteSettings } from "@/server/queries/site-content";
import SectionHeading from "./ui/SectionHeading";
import ContactFormFields from "./ContactFormFields";

// Database-backed as of Phase 14 — kicker/heading/description/submit label
// come from contact_content (field-level-fallback-safe against
// src/data/homepage.ts's contact export); the mailto target (still used as
// the secondary fallback link as of Phase 18A) comes from
// site_settings.contactEmail. The form's own field labels/placeholders and
// service dropdown options stay code-owned, per Phase 14 scope. As of
// Phase 18A, the primary submission path is Neon-backed (see
// ContactFormFields.tsx / src/server/submit-lead.ts) instead of mailto:.
export default async function ContactForm() {
  const [content, settings] = await Promise.all([getContactContent(), getSiteSettings()]);

  return (
    <section className="contact grain" id={sectionAnchors.contact}>
      <SectionHeading
        kicker={content.kicker}
        heading={content.heading}
        description={content.description}
      />
      <ContactFormFields form={contact.form} submitLabel={content.submitLabel} contactEmail={settings.contactEmail} />
    </section>
  );
}
