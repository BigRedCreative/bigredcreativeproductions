"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import type { FormEvent } from "react";
import { upload } from "@vercel/blob/client";
import { confirmVideoReplaceAction } from "@/server/mutate-media";
import { ALLOWED_VIDEO_CONTENT_TYPES, MAX_VIDEO_UPLOAD_BYTES } from "@/data/media";

// Same client-direct-upload flow as VideoUploadForm.tsx, bound to
// confirmVideoReplaceAction(id) instead of the create action. Preserves
// the same permanent media_assets.id — only the underlying storage
// key/URL and file metadata change, exactly like the existing image
// replace path.
export default function VideoReplaceForm({ id }: { id: string }) {
  const [state, formAction, isPending] = useActionState(confirmVideoReplaceAction.bind(null, id), null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadError(null);

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadError("Choose a replacement video file.");
      return;
    }
    if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
      setUploadError(`Videos must be ${MAX_VIDEO_UPLOAD_BYTES / (1024 * 1024)} MB or smaller.`);
      return;
    }

    setIsUploading(true);
    try {
      const blob = await upload(`media/video/${crypto.randomUUID()}`, file, {
        access: "public",
        handleUploadUrl: "/api/media/video-upload-token",
        contentType: file.type,
      });

      const formData = new FormData();
      formData.set("blobUrl", blob.url);
      formData.set("blobPathname", blob.pathname);
      formData.set("originalFilename", file.name);

      startTransition(() => {
        formAction(formData);
      });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "We couldn't upload this file. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  const busy = isUploading || isPending;

  return (
    <form onSubmit={handleSubmit} className="admin-form">
      {uploadError && (
        <div className="admin-form-errors" role="alert" aria-live="assertive">
          <ul>
            <li>{uploadError}</li>
          </ul>
        </div>
      )}
      {state && "errors" in state && state.errors.length > 0 && (
        <div className="admin-form-errors" role="alert" aria-live="assertive">
          <p>Please fix the following:</p>
          <ul>
            {state.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {state && "success" in state && state.success && (
        <p className="admin-inline-success">Replaced — this asset now points at the new file everywhere it&apos;s used.</p>
      )}

      <div className="admin-form-row">
        <label>
          Replacement video file
          <span className="admin-form-help">
            MP4 or WebM — {MAX_VIDEO_UPLOAD_BYTES / (1024 * 1024)} MB max. The previous file is kept, not deleted.
          </span>
          <input type="file" accept={ALLOWED_VIDEO_CONTENT_TYPES.join(",")} ref={fileInputRef} required />
        </label>
      </div>
      <div className="admin-form-actions">
        <button type="submit" className="admin-secondary-button" disabled={busy}>
          {isUploading ? "Uploading…" : isPending ? "Saving…" : "Replace file"}
        </button>
      </div>
    </form>
  );
}
