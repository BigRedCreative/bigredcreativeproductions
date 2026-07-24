import Link from "next/link";
import { getContactContent } from "@/server/queries/site-content";
import ContactContentForm from "@/components/admin/ContactContentForm";

export default async function AdminWebsiteContactPage() {
  const content = await getContactContent();

  return (
    <div>
      <p className="admin-breadcrumb">
        <Link href="/admin/website">← Website</Link>
      </p>
      <h1 className="admin-page-heading">Contact</h1>
      <ContactContentForm initialContent={content} />
    </div>
  );
}
