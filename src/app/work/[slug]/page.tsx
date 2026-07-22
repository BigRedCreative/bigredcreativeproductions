import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProjectHero from "@/components/ProjectHero";
import ProjectDetails from "@/components/ProjectDetails";
import ProjectGallery from "@/components/ProjectGallery";
import ProjectResults from "@/components/ProjectResults";
import ProjectNavigation from "@/components/ProjectNavigation";
import { getPublishedProjects, getProjectBySlug, getAdjacentProjects } from "@/data/projects";

// Only the slugs returned by generateStaticParams are valid — anything else
// 404s instead of attempting an on-demand render. Draft projects are
// excluded here, so their slugs never generate a public route.
export const dynamicParams = false;

type ProjectPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getPublishedProjects().map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
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
  const project = getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const { previous, next } = getAdjacentProjects(slug);

  return (
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
  );
}
