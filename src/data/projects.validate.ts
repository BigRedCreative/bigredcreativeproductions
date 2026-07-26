import type { Project } from "./projects";

// Category/status lists are passed in (not imported) so this module has no
// runtime dependency on projects.ts — avoids a circular import since
// projects.ts calls validateProjects() with its own data at module load.
export type ProjectValidationOptions = {
  validCategories: readonly string[];
  validStatuses: readonly string[];
};

function isLocalImagePath(src: string): boolean {
  return !/^https?:\/\//i.test(src);
}

export function collectProjectValidationErrors(
  projects: Project[],
  { validCategories, validStatuses }: ProjectValidationOptions,
): string[] {
  const errors: string[] = [];
  const seenSlugs = new Set<string>();
  const seenTitles = new Set<string>();

  for (const project of projects) {
    const label = project.slug || project.title || "(unnamed project)";

    if (!project.slug?.trim()) {
      errors.push(`${label}: slug is required`);
    } else if (seenSlugs.has(project.slug)) {
      errors.push(`Duplicate project slug: "${project.slug}"`);
    } else {
      seenSlugs.add(project.slug);
    }

    if (!project.title?.trim()) {
      errors.push(`${label}: title must not be empty`);
    } else if (seenTitles.has(project.title)) {
      errors.push(`Duplicate project title: "${project.title}"`);
    } else {
      seenTitles.add(project.title);
    }

    if (typeof project.featured !== "boolean") {
      errors.push(`${label}: featured must be true or false`);
    }

    if (project.status !== undefined && !validStatuses.includes(project.status)) {
      errors.push(
        `${label}: status "${project.status}" must be one of ${validStatuses.join(", ")}`,
      );
    }

    if (!validCategories.includes(project.category)) {
      errors.push(
        `${label}: category "${project.category}" must be one of ${validCategories.join(", ")}`,
      );
    }

    if (!project.seo?.title?.trim()) {
      errors.push(`${label}: seo.title is required`);
    }
    if (!project.seo?.description?.trim()) {
      errors.push(`${label}: seo.description is required`);
    }

    const expectedPrefix = project.slug ? `/images/projects/${project.slug}/` : undefined;
    // Phase 17 — a Media Library selection resolves `src` to a live Blob
    // CDN URL (https://...), not a local path, so the local-path/folder
    // check only applies when there's no mediaAssetId. Exact same
    // exemption already established for products.validate.ts and
    // services.validate.ts.
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

    if (project.thumbnail) checkImagePath(project.thumbnail.src, undefined, "thumbnail.src");
    if (project.heroImage) checkImagePath(project.heroImage.src, project.heroImage.mediaAssetId, "heroImage.src");

    if (project.gallery) {
      const seenGallerySrc = new Set<string>();
      project.gallery.forEach((image, i) => {
        // Phase 19B — structural check only: a "video" item must be a
        // real Media Library reference (no manual/local video path
        // support). Whether that mediaAssetId actually resolves to a
        // real, active, video-type asset is a deeper check requiring a
        // database read — that lives in mutate-portfolio.ts, not here,
        // matching the existing sync-structural/async-real-data split
        // already established for relatedServiceSlug in
        // products.validate.ts / mutate-product.ts.
        if (image.type === "video" && !image.mediaAssetId) {
          errors.push(`${label}: gallery[${i}] is a video but has no mediaAssetId — videos must be selected from the Media Library`);
        }
        // The local-path/folder check is image-path-shaped and doesn't
        // apply to a video item at all (a video's src is always a
        // resolved Media Library CDN URL, never a local path) — skip it
        // entirely for video items rather than exempting it only via the
        // existing mediaAssetId bypass.
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

    if (project.results) {
      project.results.forEach((result, i) => {
        if (!result.label?.trim()) errors.push(`${label}: results[${i}].label is required`);
        if (!result.value?.trim()) errors.push(`${label}: results[${i}].value is required`);
      });
    }

    if (project.credits) {
      project.credits.forEach((credit, i) => {
        if (!credit.role?.trim()) errors.push(`${label}: credits[${i}].role is required`);
        if (!credit.name?.trim()) errors.push(`${label}: credits[${i}].name is required`);
      });
    }
  }

  return errors;
}

// Throws with every problem listed at once (not just the first) so a build
// or dev-server failure is immediately actionable.
export function validateProjects(projects: Project[], options: ProjectValidationOptions): void {
  const errors = collectProjectValidationErrors(projects, options);
  if (errors.length > 0) {
    throw new Error(`Invalid project data in src/data/projects.ts:\n- ${errors.join("\n- ")}`);
  }
}
