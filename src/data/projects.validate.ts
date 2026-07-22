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
    const checkImagePath = (src: string, field: string) => {
      if (!isLocalImagePath(src)) {
        errors.push(`${label}: ${field} must be a local path, not an external URL ("${src}")`);
        return;
      }
      if (expectedPrefix && !src.startsWith(expectedPrefix)) {
        errors.push(`${label}: ${field} should live under "${expectedPrefix}" (got "${src}")`);
      }
    };

    if (project.thumbnail) checkImagePath(project.thumbnail.src, "thumbnail.src");
    if (project.heroImage) checkImagePath(project.heroImage.src, "heroImage.src");

    if (project.gallery) {
      const seenGallerySrc = new Set<string>();
      project.gallery.forEach((image, i) => {
        checkImagePath(image.src, `gallery[${i}].src`);
        if (seenGallerySrc.has(image.src)) {
          errors.push(`${label}: duplicate gallery image "${image.src}"`);
        } else {
          seenGallerySrc.add(image.src);
        }
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
