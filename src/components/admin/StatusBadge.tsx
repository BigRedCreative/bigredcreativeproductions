export default function StatusBadge({ status }: { status: string }) {
  return <span className={`admin-badge admin-badge-${status}`}>{status.replace("-", " ")}</span>;
}
