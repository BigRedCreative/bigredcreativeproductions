import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  getMediaAssetById,
  findProductsReferencingMediaAsset,
  findServicesReferencingMediaAsset,
  findProjectsReferencingMediaAsset,
  findAssetsUsingAsPoster,
  findHeroMediaUsage,
  getActiveMediaAssetsForPicker,
  getMediaAssetsByIds,
} from "@/server/queries/media";
import { productHref } from "@/data/products";
import { serviceHref } from "@/data/services";
import { projectHref } from "@/data/projects";
import StatusBadge from "@/components/admin/StatusBadge";
import MediaEditForm from "@/components/admin/MediaEditForm";
import MediaStatusToggle from "@/components/admin/MediaStatusToggle";
import MediaReplaceForm from "@/components/admin/MediaReplaceForm";
import VideoReplaceForm from "@/components/admin/VideoReplaceForm";
import MediaPosterField from "@/components/admin/MediaPosterField";

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

  const isVideo = asset.type === "video";

  const [productRefs, serviceRefs, projectRefs, heroRefs, posterUsageRefs, posterPickerAssets, currentPosterMap] = await Promise.all([
    findProductsReferencingMediaAsset(id),
    findServicesReferencingMediaAsset(id),
    findProjectsReferencingMediaAsset(id),
    findHeroMediaUsage(id),
    asset.type === "image" ? findAssetsUsingAsPoster(id) : Promise.resolve([]),
    isVideo ? getActiveMediaAssetsForPicker(["image"]) : Promise.resolve([]),
    isVideo && asset.posterMediaAssetId ? getMediaAssetsByIds([asset.posterMediaAssetId]) : Promise.resolve(new Map()),
  ]);
  const totalUsageCount = productRefs.length + serviceRefs.length + projectRefs.length + heroRefs.length + posterUsageRefs.length;
  const currentPoster = asset.posterMediaAssetId ? (currentPosterMap.get(asset.posterMediaAssetId) ?? null) : null;

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
              // No autoplay — an admin previewing a file presses play
              // themselves. playsInline + preload="metadata" match the
              // same defaults the public VideoMedia component will use.
              <video
                className="admin-media-video-preview"
                src={asset.url}
                poster={currentPoster?.url}
                controls
                playsInline
                preload="metadata"
              >
                Your browser doesn&apos;t support video playback.
              </video>
            )}
          </div>

          <div className="admin-detail-block">
            <h2>Alt text &amp; caption</h2>
            <MediaEditForm id={asset.id} alt={asset.alt} caption={asset.caption} />
          </div>

          {isVideo && (
            <div className="admin-detail-block">
              <h2>Poster image</h2>
              <p className="admin-form-section-help">
                Shown in the Media Library grid and used as the video&apos;s still frame before playback. Only
                active images from your library can be selected.
              </p>
              <MediaPosterField
                videoId={asset.id}
                currentPoster={currentPoster}
                imageAssets={posterPickerAssets.map((a) => ({
                  id: a.id,
                  url: a.url,
                  alt: a.alt,
                  filename: a.filename,
                  width: a.width,
                  height: a.height,
                }))}
              />
            </div>
          )}

          <div className="admin-detail-block">
            <h2>Replace file</h2>
            {isVideo ? <VideoReplaceForm id={asset.id} /> : <MediaReplaceForm id={asset.id} />}
          </div>

          <div className="admin-detail-block">
            <h2>Used by</h2>
            {totalUsageCount === 0 ? (
              <p className="admin-empty-state">
                Not currently used by any product, service, portfolio project, homepage hero, or video poster.
              </p>
            ) : (
              <>
                {heroRefs.map((ref) => (
                  <div className="admin-line-item" key={`hero-${ref.versionType}`}>
                    <p className="admin-line-item-title">Homepage Hero</p>
                    <p className="admin-line-item-meta">
                      {ref.versionType === "published" ? (
                        <>
                          Homepage Hero (published) · <Link href="/">View on site</Link>
                        </>
                      ) : (
                        "Homepage Hero (private draft — not public yet)"
                      )}
                    </p>
                  </div>
                ))}
                {productRefs.map((ref) => (
                  <div className="admin-line-item" key={`product-${ref.productId}`}>
                    <p className="admin-line-item-title">{ref.productTitle}</p>
                    <p className="admin-line-item-meta">
                      Product · <Link href={`/admin/products/${ref.productId}`}>Edit in admin</Link>
                      {" · "}
                      <Link href={productHref(ref.productSlug)}>View on store</Link>
                    </p>
                  </div>
                ))}
                {serviceRefs.map((ref) => (
                  <div className="admin-line-item" key={`service-${ref.serviceId}-${ref.versionType}`}>
                    <p className="admin-line-item-title">{ref.serviceTitle}</p>
                    <p className="admin-line-item-meta">
                      {ref.versionType === "published" ? (
                        <>
                          Service (published) · <Link href={serviceHref(ref.serviceSlug)}>View on site</Link>
                        </>
                      ) : (
                        "Service (private draft — not public yet)"
                      )}
                    </p>
                  </div>
                ))}
                {projectRefs.map((ref) => (
                  <div className="admin-line-item" key={`project-${ref.projectId}-${ref.versionType}`}>
                    <p className="admin-line-item-title">{ref.projectTitle}</p>
                    <p className="admin-line-item-meta">
                      {ref.versionType === "published" ? (
                        <>
                          Portfolio (published) · <Link href={projectHref(ref.projectSlug)}>View on site</Link>
                        </>
                      ) : (
                        "Portfolio (private draft — not public yet)"
                      )}
                    </p>
                  </div>
                ))}
                {posterUsageRefs.map((ref) => (
                  <div className="admin-line-item" key={`poster-${ref.videoAssetId}`}>
                    <p className="admin-line-item-title">{ref.videoFilename}</p>
                    <p className="admin-line-item-meta">
                      Poster for video · <Link href={`/admin/media/${ref.videoAssetId}`}>View video asset</Link>
                    </p>
                  </div>
                ))}
              </>
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
