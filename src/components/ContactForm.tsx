import { siteConfig } from "@/config/site";
import SectionHeading from "./ui/SectionHeading";
import Button from "./ui/Button";

export default function ContactForm() {
  return (
    <section className="contact grain" id="contact">
      <SectionHeading
        kicker="Start a project"
        heading="Let’s make noise."
        description="Tell us what you’re building and where you need creative support."
      />
      <form action={`mailto:${siteConfig.email}`} method="post" encType="text/plain">
        <label>
          Your name
          <input name="name" required placeholder="Name or company" />
        </label>
        <label>
          Email
          <input name="email" type="email" required placeholder="you@company.com" />
        </label>
        <label>
          Service
          <select name="service" defaultValue="">
            <option value="" disabled>
              Select a service
            </option>
            <option>Branding</option>
            <option>Packaging & Labels</option>
            <option>Print Production</option>
            <option>Promotions</option>
            <option>Event Management</option>
            <option>Website</option>
            <option>Multiple Services</option>
          </select>
        </label>
        <label>
          Project details
          <textarea
            name="details"
            required
            placeholder="Tell us about the vision, timing and budget."
          />
        </label>
        <Button type="submit">Send the vision ↗</Button>
      </form>
    </section>
  );
}
