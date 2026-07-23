import type { Metadata } from "next";
import "./admin.css";

// Applies to every /admin/* route, including /admin/login and
// /admin/access-denied — this layout does NOT check authorization itself
// (see src/app/admin/(protected)/layout.tsx for that), it only provides
// the admin stylesheet and keeps the whole namespace out of search
// results. Never linked from public navigation — reachable only by its
// direct URL, per the approved architecture.
export const metadata: Metadata = {
  title: "Admin | Big Red Creative Productions",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
