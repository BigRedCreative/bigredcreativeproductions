import Link from "next/link";
import { getBrandSettingsRowForAdmin } from "@/server/queries/brand";
import { getActiveImageAssetsForPicker } from "@/server/queries/media";
import { getSiteSettings } from "@/server/queries/site-content";
import BrandForm from "@/components/admin/BrandForm";
import PublishBrandButton from "@/components/admin/PublishBrandButton";

export default async function AdminBrandingPage() {
  const [draftRow, publishedRow, mediaAssets, settings] = await Promise.all([
    getBrandSettingsRowForAdmin("draft"),
    getBrandSettingsRowForAdmin("published"),
    getActiveImageAssetsForPicker(),
    getSiteSettings(),
  ]);

  return (
    <div>
      <p className="admin-breadcrumb">
        <Link href="/admin/website">← Website</Link>
      </p>
      <div className="admin-page-heading-row">
        <h1 className="admin-page-heading">Branding</h1>
        <Link href="/admin/website/branding/preview" className="admin-secondary-button">
          Preview draft
        </Link>
      </div>

      {publishedRow && (
        <div className="admin-detail-block">
          <h2>Currently live</h2>
          <div className="admin-detail-row">
            <span className="admin-detail-label">Primary color</span>
            <span>{publishedRow.primaryColor}</span>
          </div>
          <div className="admin-detail-row">
            <span className="admin-detail-label">Accent color</span>
            <span>{publishedRow.accentColor}</span>
          </div>
          <div className="admin-detail-row">
            <span className="admin-detail-label">Button background</span>
            <span>{publishedRow.buttonBackground}</span>
          </div>
        </div>
      )}

      {draftRow && (
        <BrandForm
          initialValues={{
            primaryColor: draftRow.primaryColor,
            accentColor: draftRow.accentColor,
            backgroundColor: draftRow.backgroundColor,
            surfaceColor: draftRow.surfaceColor,
            textColor: draftRow.textColor,
            mutedTextColor: draftRow.mutedTextColor,
            borderColor: draftRow.borderColor,
            buttonBackground: draftRow.buttonBackground,
            buttonText: draftRow.buttonText,
            buttonHoverBackground: draftRow.buttonHoverBackground,
          }}
          initialLogoHorizontalMediaAssetId={draftRow.logoHorizontalMediaAssetId}
          initialLogoWhiteMediaAssetId={draftRow.logoWhiteMediaAssetId}
          mediaAssets={mediaAssets}
          fallbackLogoHorizontalSrc={settings.logoHorizontalSrc}
          fallbackLogoWhiteSrc={settings.logoWhiteSrc}
        />
      )}

      <div className="admin-form-section">
        <h2>Publish</h2>
        <p className="admin-form-note">
          Publishing makes the saved draft above live on the public site immediately. Save your draft and preview it
          first.
        </p>
        <PublishBrandButton />
      </div>
    </div>
  );
}
