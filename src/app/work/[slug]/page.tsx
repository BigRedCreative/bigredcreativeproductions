import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BrandTokens from "@/components/BrandTokens";
import ProjectHero from "@/components/ProjectHero";
import ProjectDetails from "@/components/ProjectDetails";
import ProjectGallery from "@/components/ProjectGallery";
import ProjectResults from "@/components/ProjectResults";
import ProjectNavigation from "@/components/ProjectNavigation";
import { getPublishedProjects, getProjectBySlug, getAdjacentProjects } from "@/server/queries/portfolio";

// Published slugs known at build time are pre-rendered; anything else (a
// project published since the last build) renders on demand instead of
// 404ing — publishing must not require a redeploy. See CLAUDE.md "Services
// + Portfolio Admin". Was `false` pre-cutover, when this route was still
// backed by the static projects.ts array. Draft/archived projects are
// still excluded, now via the entity `status = 'published'` filter in
// src/server/queries/portfolio.ts rather than an array .filter().
export const dynamicParams = true;

// Time-based fallback only, matching Store/Product's exact established
// pattern — no admin mutation UI exists yet to call revalidatePath()
// directly, so this is what picks up any future content change until that
// admin UI ships.
export const revalidate = 3600;

type ProjectPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const projects = await getPublishedProjects();
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) {
    return {};
  }
  return {
    title: project.seo.title,
    description: project.seo.description,
    openGraph: {
      title: project.title,
      description: project.seo.description,
      type: "article",
    },
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const { previous, next } = await getAdjacentProjects(slug);

  return (
    <BrandTokens>
      <main>
        <Header />
        <ProjectHero project={project} />
        <ProjectDetails project={project} />
        {project.gallery && project.gallery.length > 0 && (
          <ProjectGallery images={project.gallery} />
        )}
        {project.results && project.results.length > 0 && (
          <ProjectResults results={project.results} />
        )}
        <ProjectNavigation previous={previous} next={next} />
        <Footer />
      </main>
    </BrandTokens>
  );
}
