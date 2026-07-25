import Link from "next/link";
import { notFound } from "next/navigation";
import { getPortfolioEntityForAdmin } from "@/server/queries/portfolio";
import { getActiveImageAssetsForPicker } from "@/server/queries/media";
import { savePortfolioDraftAction } from "@/server/mutate-portfolio";
import PortfolioForm from "@/components/admin/PortfolioForm";

type EditPortfolioPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPortfolioPage({ params }: EditPortfolioPageProps) {
  const { id } = await params;
  const [project, mediaAssets] = await Promise.all([getPortfolioEntityForAdmin(id), getActiveImageAssetsForPicker()]);

  if (!project) {
    notFound();
  }

  const boundAction = savePortfolioDraftAction.bind(null, id);

  return (
    <div>
      <p className="admin-breadcrumb">
        <Link href={`/admin/portfolio/${id}`}>← {project.draft.title}</Link>
      </p>
      <h1 className="admin-page-heading">Edit draft</h1>
      <p className="admin-form-section-help">
        {project.published
          ? "Editing this draft never changes the live public page — publish it separately when you're ready."
          : "This project has never been published — nothing here is public yet."}
      </p>
      <PortfolioForm action={boundAction} initialProject={project.draft} mediaAssets={mediaAssets} submitLabel="Save draft" />
    </div>
  );
}
