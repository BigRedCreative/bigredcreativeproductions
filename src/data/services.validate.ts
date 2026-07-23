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
    const checkImagePath = (src: string, field: string) => {
      if (!isLocalImagePath(src)) {
        errors.push(`${label}: ${field} must be a local path, not an external URL ("${src}")`);
        return;
      }
      if (expectedPrefix && !src.startsWith(expectedPrefix)) {
        errors.push(`${label}: ${field} should live under "${expectedPrefix}" (got "${src}")`);
      }
    };

    if (service.heroImage) checkImagePath(service.heroImage.src, "heroImage.src");

    if (service.gallery) {
      const seenGallerySrc = new Set<string>();
      service.gallery.forEach((image, i) => {
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
export function validateServices(services: Service[]): void {
  const errors = collectServiceValidationErrors(services);
  if (errors.length > 0) {
    throw new Error(`Invalid service data in src/data/services.ts:\n- ${errors.join("\n- ")}`);
  }
}
