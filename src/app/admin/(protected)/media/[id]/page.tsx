import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getMediaAssetById, findProductsReferencingMediaAsset } from "@/server/queries/media";
import { productHref } from "@/data/products";
import StatusBadge from "@/components/admin/StatusBadge";
import MediaEditForm from "@/components/admin/MediaEditForm";
import MediaStatusToggle from "@/components/admin/MediaStatusToggle";
import MediaReplaceForm from "@/components/admin/MediaReplaceForm";

type MediaDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatBytes(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(0)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function AdminMediaDetailPage({ params }: MediaDetailPageProps) {
  const { id } = await params;
  const asset = await getMediaAssetById(id);

  if (!asset) {
    notFound();
  }

  const usageRefs = await findProductsReferencingMediaAsset(id);

  return (
    <div>
      <p className="admin-breadcrumb">
        <Link href="/admin/media">← Media</Link>
      </p>
      <div className="admin-page-heading-row">
        <h1 className="admin-page-heading">
          {asset.filename} <StatusBadge status={asset.status} />
        </h1>
        <MediaStatusToggle id={asset.id} status={asset.status} />
      </div>

      <div className="admin-detail-grid">
        <div>
          <div className="admin-detail-block">
            <h2>Preview</h2>
            {asset.type === "image" ? (
              <div className="admin-media-preview">
                <Image src={asset.url} alt={asset.alt} fill sizes="480px" />
              </div>
            ) : (
              <p className="admin-empty-state">Video preview isn&apos;t supported yet.</p>
            )}
          </div>

          <div className="admin-detail-block">
            <h2>Alt text &amp; caption</h2>
            <MediaEditForm id={asset.id} alt={asset.alt} caption={asset.caption} />
          </div>

          <div className="admin-detail-block">
            <h2>Replace file</h2>
            <MediaReplaceForm id={asset.id} />
          </div>

          <div className="admin-detail-block">
            <h2>Used by</h2>
            {usageRefs.length === 0 ? (
              <p className="admin-empty-state">Not currently used by any product.</p>
            ) : (
              usageRefs.map((ref) => (
                <div className="admin-line-item" key={ref.productId}>
                  <p className="admin-line-item-title">{ref.productTitle}</p>
                  <p className="admin-line-item-meta">
                    <Link href={`/admin/products/${ref.productId}`}>Edit in admin</Link>
                    {" · "}
                    <Link href={productHref(ref.productSlug)}>View on store</Link>
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="admin-detail-block">
            <h2>Details</h2>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Type</span>
              <span>{asset.type}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Format</span>
              <span>{asset.mimeType}</span>
            </div>
            {asset.width && asset.height && (
              <div className="admin-detail-row">
                <span className="admin-detail-label">Dimensions</span>
                <span>
                  {asset.width}×{asset.height}
                </span>
              </div>
            )}
            <div className="admin-detail-row">
              <span className="admin-detail-label">File size</span>
              <span>{formatBytes(asset.sizeBytes)}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Original filename</span>
              <span>{asset.originalFilename}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Uploaded</span>
              <span>{asset.createdAt.toLocaleDateString("en-US")}</span>
            </div>
          </div>

          <div className="admin-detail-block">
            <h2>Identity</h2>
            <div className="admin-detail-row">
              <span className="admin-detail-label">Asset ID</span>
              <span>{asset.id}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
