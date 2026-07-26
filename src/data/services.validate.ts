import type { Service } from "./services";

function isLocalImagePath(src: string): boolean {
  return !/^https?:\/\//i.test(src);
}

export function collectServiceValidationErrors(services: Service[]): string[] {
  const errors: string[] = [];
  const seenSlugs = new Set<string>();
  const seenTitles = new Set<string>();
  const seenNumbers = new Set<string>();

  for (const service of services) {
    const label = service.slug || service.title || "(unnamed service)";

    if (!service.slug?.trim()) {
      errors.push(`${label}: slug is required`);
    } else if (seenSlugs.has(service.slug)) {
      errors.push(`Duplicate service slug: "${service.slug}"`);
    } else {
      seenSlugs.add(service.slug);
    }

    if (!service.title?.trim()) {
      errors.push(`${label}: title must not be empty`);
    } else if (seenTitles.has(service.title)) {
      errors.push(`Duplicate service title: "${service.title}"`);
    } else {
      seenTitles.add(service.title);
    }

    if (!service.summary?.trim()) {
      errors.push(`${label}: summary must not be empty`);
    }

    if (!service.serviceNumber?.trim()) {
      errors.push(`${label}: serviceNumber is required`);
    } else if (seenNumbers.has(service.serviceNumber)) {
      errors.push(`Duplicate service number: "${service.serviceNumber}"`);
    } else {
      seenNumbers.add(service.serviceNumber);
    }

    if (!service.seo?.title?.trim()) {
      errors.push(`${label}: seo.title is required`);
    }
    if (!service.seo?.description?.trim()) {
      errors.push(`${label}: seo.description is required`);
    }

    const expectedPrefix = service.slug ? `/images/services/${service.slug}/` : undefined;
    // Phase 17 — a Media Library selection resolves `src` to a live Blob
    // CDN URL (https://...), not a local path, so the local-path/folder
    // check only applies when there's no mediaAssetId. Exact same
    // exemption already established for products.validate.ts.
    const checkImagePath = (src: string, mediaAssetId: string | undefined, field: string) => {
      if (mediaAssetId) return;
      if (!isLocalImagePath(src)) {
        errors.push(`${label}: ${field} must be a local path, not an external URL ("${src}")`);
        return;
      }
      if (expectedPrefix && !src.startsWith(expectedPrefix)) {
        errors.push(`${label}: ${field} should live under "${expectedPrefix}" (got "${src}")`);
      }
    };

    if (service.heroImage) checkImagePath(service.heroImage.src, service.heroImage.mediaAssetId, "heroImage.src");

    if (service.gallery) {
      const seenGallerySrc = new Set<string>();
      service.gallery.forEach((image, i) => {
        // Phase 19C — structural check only: a "video" item must be a
        // real Media Library reference (no manual/local video path
        // support). Whether that mediaAssetId actually resolves to a
        // real, active, video-type asset is a deeper check requiring a
        // database read — that lives in mutate-service.ts, not here,
        // mirroring the exact sync-structural/async-real-data split
        // projects.validate.ts/mutate-portfolio.ts already established.
        if (image.type === "video" && !image.mediaAssetId) {
          errors.push(`${label}: gallery[${i}] is a video but has no mediaAssetId — videos must be selected from the Media Library`);
        }
        // The local-path/folder check is image-path-shaped and doesn't
        // apply to a video item at all (a video's src is always a
        // resolved Media Library CDN URL, never a local path) — skip it
        // entirely for video items, mirroring projects.validate.ts.
        if (image.type !== "video") {
          checkImagePath(image.src, image.mediaAssetId, `gallery[${i}].src`);
        }
        if (seenGallerySrc.has(image.src)) {
          errors.push(`${label}: duplicate gallery image "${image.src}"`);
        } else {
          seenGallerySrc.add(image.src);
        }
      });
    }

    if (service.process) {
      service.process.forEach((step, i) => {
        if (!step.title?.trim()) errors.push(`${label}: process[${i}].title is required`);
        if (!step.description?.trim()) errors.push(`${label}: process[${i}].description is required`);
      });
    }
  }

  return errors;
}

// Throws with every problem listed at once (not just the first) so a build
// or dev-server failure is immediately actionable.
export function validateServices(services: Service[]): void {
  const errors = collectServiceValidationErrors(services);
  if (errors.length > 0) {
    throw new Error(`Invalid service data in src/data/services.ts:\n- ${errors.join("\n- ")}`);
  }
}
