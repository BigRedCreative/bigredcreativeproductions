"use client";

import { useState } from "react";
import type { ProjectExternalLink } from "@/data/projects";

// Single optional {label, url} pair — not repeatable, matching
// Project.externalLink's shape exactly. URL safety is enforced
// server-side by validateHref() (mutate-portfolio.ts), the same
// established pattern already used for every other admin-editable href
// in this codebase — this field only handles shape/UX, not the security
// boundary.
export default function PortfolioExternalLinkField({
  name,
  initialLink,
}: {
  name: string;
  initialLink: ProjectExternalLink | undefined;
}) {
  const [link, setLink] = useState<ProjectExternalLink>(initialLink ?? { label: "", url: "" });

  return (
    <div className="admin-form-row">
      <input type="hidden" name={name} value={JSON.stringify(link)} />
      <p className="admin-form-label-standalone">External link</p>
      <p className="admin-form-section-help">Optional — e.g. a link to the live event page or product site.</p>
      <div className="admin-form-row admin-form-row-split">
        <label>
          Label
          <input type="text" value={link.label} onChange={(e) => setLink({ ...link, label: e.target.value })} />
        </label>
        <label>
          URL
          <input type="text" value={link.url} onChange={(e) => setLink({ ...link, url: e.target.value })} placeholder="https://..." />
        </label>
      </div>
    </div>
  );
}
