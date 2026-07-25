import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BrandTokens from "@/components/BrandTokens";
import ProjectHero from "@/components/ProjectHero";
import ProjectDetails from "@/components/ProjectDetails";
import ProjectGallery from "@/components/ProjectGallery";
import ProjectResults from "@/components/ProjectResults";
import { getPortfolioEntityForAdmin } from "@/server/queries/portfolio";

type PortfolioPreviewPageProps = {
  params: Promise<{ id: string }>;
};

// Admin-authenticated preview only — reuses the real public content
// components the live /work/[slug] page renders, passed the DRAFT
// project. ProjectNavigation (prev/next) is deliberately omitted: it's
// tied to the PUBLISHED list's order, not meaningful for previewing a
// single draft's content in isolation — every other content component is
// reused, matching "reuse the real public components wherever practical."
export default async function AdminPortfolioPreviewPage({ params }: PortfolioPreviewPageProps) {
  const { id } = await params;
  const project = await getPortfolioEntityForAdmin(id);

  if (!project) {
    notFound();
  }

  return (
    <div>
      <div className="admin-preview-banner">
        <Link href={`/admin/portfolio/${id}`}>← Back to admin</Link>
        <span>Previewing this project&apos;s private draft — not a public URL</span>
      </div>
      <BrandTokens>
        <main>
          <Header />
          <ProjectHero project={project.draft} />
          <ProjectDetails project={project.draft} />
          {project.draft.gallery && project.draft.gallery.length > 0 && <ProjectGallery images={project.draft.gallery} />}
          {project.draft.results && project.draft.results.length > 0 && <ProjectResults results={project.draft.results} />}
          <Footer />
        </main>
      </BrandTokens>
    </div>
  );
}
