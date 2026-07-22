import { siteConfig } from "@/config/site";
import { sectionAnchors } from "@/config/sections";
import { contact } from "@/data/homepage";
import SectionHeading from "./ui/SectionHeading";
import Button from "./ui/Button";

export default function ContactForm() {
  const { form } = contact;
  return (
    <section className="contact grain" id={sectionAnchors.contact}>
      <SectionHeading
        kicker={contact.kicker}
        heading={contact.heading}
        description={contact.description}
      />
      <form action={`mailto:${siteConfig.email}`} method="post" encType="text/plain">
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
        <Button type="submit">{form.submitLabel}</Button>
      </form>
    </section>
  );
}
