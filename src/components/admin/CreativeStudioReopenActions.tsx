"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  saveToMediaLibraryAction,
  discardGenerationAction,
  restoreGenerationAction,
} from "@/server/mutate-creative-studio";
import type { SaveToMediaState, DiscardState, RestoreState } from "@/server/mutate-creative-studio";

// Phase 20C-2 — Reopen's interactive bits, extracted into their own small
// client component so /admin/creative-studio/[id]/page.tsx itself stays a
// plain server component. Reuses the EXACT SAME Server Actions the create
// flow's preview step already calls — nothing new was added to the
// mutation layer's authorization/re-verification behavior, only new call
// sites. None of these three actions ever imports or calls an
// ImageProvider — Save/Discard/Restore are pure database writes.
//
// `state` is computed server-side (page.tsx) from the real row and drives
// which action is even offered — this is a UX convenience only; the real
// enforcement is server-side inside each action (a saved job rejects
// Discard/Restore regardless of what this component chooses to render).
export default function CreativeStudioReopenActions({
  jobId,
  defaultAlt,
  state,
}: {
  jobId: string;
  defaultAlt: string;
  state: "unsaved" | "saved" | "discarded" | "failed";
}) {
  const router = useRouter();
  const [filename, setFilename] = useState("");
  const [alt, setAlt] = useState(defaultAlt);
  const [caption, setCaption] = useState("");

  const [saveState, setSaveState] = useState<SaveToMediaState>(null);
  const [savePending, setSavePending] = useState(false);
  const [discardState, setDiscardState] = useState<DiscardState>(null);
  const [discardPending, setDiscardPending] = useState(false);
  const [restoreState, setRestoreState] = useState<RestoreState>(null);
  const [restorePending, setRestorePending] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSavePending(true);
    const formData = new FormData();
    formData.set("filename", filename);
    formData.set("alt", alt);
    formData.set("caption", caption);
    const result = await saveToMediaLibraryAction(jobId, null, formData);
    setSavePending(false);
    setSaveState(result);
    if (result && "success" in result) router.refresh();
  }

  async function handleDiscard() {
    setDiscardPending(true);
    const result = await discardGenerationAction(jobId, null, new FormData());
    setDiscardPending(false);
    setDiscardState(result);
    if (result && "success" in result) router.refresh();
  }

  async function handleRestore() {
    setRestorePending(true);
    const result = await restoreGenerationAction(jobId, null, new FormData());
    setRestorePending(false);
    setRestoreState(result);
    if (result && "success" in result) router.refresh();
  }

  if (state === "saved" || state === "failed") {
    // Nothing actionable here — a saved job already shows its Media
    // Library link elsewhere on the page; a failed job has no output to
    // act on at all.
    return null;
  }

  if (state === "discarded") {
    return (
      <div className="admin-form-actions">
        {restoreState && "errors" in restoreState && restoreState.errors.length > 0 && (
          <div className="admin-form-errors" role="alert" aria-live="assertive">
            <ul>
              {restoreState.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        <button type="button" className="admin-secondary-button" onClick={handleRestore} disabled={restorePending}>
          {restorePending ? "Restoring…" : "Restore"}
        </button>
      </div>
    );
  }

  // state === "unsaved"
  if (discardState && "success" in discardState) {
    return <p className="admin-inline-success">Discarded. Reload this page to restore it, if you change your mind.</p>;
  }

  return (
    <div>
      <form onSubmit={handleSave} className="admin-form">
        <h2>Save to Media Library</h2>
        <div className="admin-form-row">
          <label>
            Filename
            <span className="admin-form-optional"> (optional — leave blank for the default)</span>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="big-red-creative-productions-branding-visual"
            />
          </label>
        </div>
        <div className="admin-form-row">
          <label>
            Alt text
            <input type="text" value={alt} onChange={(e) => setAlt(e.target.value)} />
          </label>
        </div>
        <div className="admin-form-row">
          <label>
            Caption
            <span className="admin-form-optional"> (optional)</span>
            <input type="text" value={caption} onChange={(e) => setCaption(e.target.value)} />
          </label>
        </div>

        {saveState && "errors" in saveState && saveState.errors.length > 0 && (
          <div className="admin-form-errors" role="alert" aria-live="assertive">
            <ul>
              {saveState.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        {saveState && "success" in saveState && (
          <p className="admin-inline-success">
            Saved — <Link href={`/admin/media/${saveState.mediaAssetId}`}>view asset</Link>.
          </p>
        )}

        <div className="admin-form-actions">
          <button type="submit" className="admin-signout-button" disabled={savePending}>
            {savePending ? "Saving…" : "Save to Media Library"}
          </button>
          <button type="button" className="admin-remove-button" onClick={handleDiscard} disabled={discardPending}>
            {discardPending ? "Discarding…" : "Discard"}
          </button>
        </div>
      </form>
    </div>
  );
}
