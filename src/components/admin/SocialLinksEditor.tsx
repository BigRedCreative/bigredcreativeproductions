"use client";

import { useState } from "react";

type SocialLink = { platform: string; url: string };

function emptyLink(): SocialLink {
  return { platform: "", url: "" };
}

// Repeatable platform/URL pairs — mirrors ProductOptionsEditor's add/
// remove/serialize-to-hidden-field pattern. Reserved content: nothing
// public renders social links yet (see CLAUDE.md), so this only needs to
// let an admin keep the list accurate for whenever that changes.
export default function SocialLinksEditor({ initialLinks }: { initialLinks: SocialLink[] }) {
  const [links, setLinks] = useState<SocialLink[]>(initialLinks);

  function updateLink(index: number, patch: Partial<SocialLink>) {
    setLinks((prev) => prev.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  }

  function addLink() {
    setLinks((prev) => [...prev, emptyLink()]);
  }

  function removeLink(index: number) {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div>
      <input type="hidden" name="socialLinksJson" value={JSON.stringify(links)} />
      {links.map((link, index) => (
        <div className="admin-form-row admin-form-row-split admin-repeatable-subrow" key={index}>
          <label>
            Platform
            <input
              type="text"
              value={link.platform}
              placeholder="Instagram"
              onChange={(e) => updateLink(index, { platform: e.target.value })}
            />
          </label>
          <label>
            URL
            <input
              type="text"
              value={link.url}
              placeholder="https://instagram.com/..."
              onChange={(e) => updateLink(index, { url: e.target.value })}
            />
          </label>
          <button type="button" className="admin-remove-button" onClick={() => removeLink(index)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="admin-add-button admin-repeatable-subrow" onClick={addLink}>
        + Add social link
      </button>
    </div>
  );
}
