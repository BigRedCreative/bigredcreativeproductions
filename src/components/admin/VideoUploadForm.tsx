"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import type { FormEvent } from "react";
import { upload } from "@vercel/blob/client";
import { confirmVideoUploadAction } from "@/server/mutate-media";
import { ALLOWED_VIDEO_CONTENT_TYPES, MAX_VIDEO_UPLOAD_BYTES } from "@/data/media";

function maxVideoSizeErrorMessage(): string {
  return `Videos must be ${MAX_VIDEO_UPLOAD_BYTES / (1024 * 1024)} MB or smaller.`;
}

// Video's upload flow is genuinely different from MediaUploadForm.tsx's
// image path: the file goes straight from this browser to Vercel Blob
// via upload() (authorized by a short-lived token from
// /api/media/video-upload-token — see that route for why), never through
// a Server Action request body. Once upload() resolves, this dispatches
// confirmVideoUploadAction manually inside startTransition — a
// documented, supported way to call a useActionState action outside a
// native <form action> submission — passing only the resulting blob
// URL/pathname, never the file bytes.
export default function VideoUploadForm() {
  const [state, formAction, isPending] = useActionState(confirmVideoUploadAction, null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const altInputRef = useRef<HTMLInputElement>(null);
  const captionInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadError(null);

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadError("Choose a video file to upload.");
      return;
    }
    if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
      setUploadError(maxVideoSizeErrorMessage());
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
      formData.set("alt", altInputRef.current?.value ?? "");
      formData.set("caption", captionInputRef.current?.value ?? "");

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
    <form onSubmit={handleSubmit} className="admin-upload-form">
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

      <div className="admin-upload-row">
        <label>
          Video file
          <span className="admin-form-help">
            MP4 or WebM — {MAX_VIDEO_UPLOAD_BYTES / (1024 * 1024)} MB max.
          </span>
          <input type="file" accept={ALLOWED_VIDEO_CONTENT_TYPES.join(",")} ref={fileInputRef} required />
        </label>
        <label>
          Alt text
          <span className="admin-form-optional"> (encouraged — describes what the video shows)</span>
          <input type="text" ref={altInputRef} placeholder="Describe the video" />
        </label>
        <label>
          Caption
          <span className="admin-form-optional"> (optional)</span>
          <input type="text" ref={captionInputRef} />
        </label>
        <button type="submit" className="admin-signout-button" disabled={busy}>
          {isUploading ? "Uploading…" : isPending ? "Saving…" : "Upload"}
        </button>
      </div>
    </form>
  );
}
