import Link from "next/link";
import Image from "next/image";
import { listMediaAssets } from "@/server/queries/media";
import MediaFilterBar from "@/components/admin/MediaFilterBar";
import MediaUploadForm from "@/components/admin/MediaUploadForm";
import AdminPagination from "@/components/admin/AdminPagination";
import StatusBadge from "@/components/admin/StatusBadge";

type MediaPageProps = {
  searchParams: Promise<{ page?: string; status?: string; type?: string; q?: string }>;
};

function formatBytes(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(0)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function AdminMediaPage({ searchParams }: MediaPageProps) {
  const { page: pageParam, status, type, q } = await searchParams;
  const page = Number(pageParam) > 0 ? Number(pageParam) : 1;

  const { rows, totalCount, pageCount } = await listMediaAssets({ page, status, type, search: q });

  return (
    <div>
      <h1 className="admin-page-heading">Media</h1>

      <div className="admin-form-section">
        <h2>Upload</h2>
        <MediaUploadForm />
      </div>

      <MediaFilterBar status={status} type={type} search={q} />

      {rows.length === 0 ? (
        <p className="admin-empty-state">
          {totalCount === 0 && !status && !type && !q
            ? "No media uploaded yet. Use the upload form above to add the first one."
            : "No media matches this search/filter."}
        </p>
      ) : (
        <>
          <div className="admin-media-grid">
            {rows.map((asset) => (
              <Link key={asset.id} href={`/admin/media/${asset.id}`} className="admin-media-card">
                <div className="admin-media-card-thumb">
                  {asset.type === "image" ? (
                    <Image src={asset.url} alt={asset.alt} fill sizes="200px" />
                  ) : (
                    <span className="admin-media-card-video-label">Video</span>
                  )}
                </div>
                <div className="admin-media-card-meta">
                  <p className="admin-media-card-filename">{asset.filename}</p>
                  <p className="admin-media-card-detail">
                    {asset.width && asset.height ? `${asset.width}×${asset.height} · ` : ""}
                    {formatBytes(asset.sizeBytes)}
                  </p>
                  <StatusBadge status={asset.status} />
                </div>
              </Link>
            ))}
          </div>
          <AdminPagination page={page} pageCount={pageCount} baseHref="/admin/media" baseParams={{ status, type, q }} />
        </>
      )}
    </div>
  );
}
