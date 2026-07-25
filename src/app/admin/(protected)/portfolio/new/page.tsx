import Link from "next/link";
import { getActiveImageAssetsForPicker } from "@/server/queries/media";
import { createPortfolioAction } from "@/server/mutate-portfolio";
import PortfolioForm from "@/components/admin/PortfolioForm";

export default async function NewPortfolioPage() {
  const mediaAssets = await getActiveImageAssetsForPicker();

  return (
    <div>
      <p className="admin-breadcrumb">
        <Link href="/admin/portfolio">← Portfolio</Link>
      </p>
      <h1 className="admin-page-heading">New Project</h1>
      <p className="admin-form-section-help">
        Creates a private draft only — nothing becomes public until you publish it from the project&apos;s detail page.
      </p>
      <PortfolioForm action={createPortfolioAction} mediaAssets={mediaAssets} submitLabel="Create draft" />
    </div>
  );
}
