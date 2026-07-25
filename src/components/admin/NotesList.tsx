import type { NoteWithAuthor } from "@/server/notes";

// Generic append-only notes display, shared by leads/customers/orders — no
// edit/delete affordance anywhere, matching the notes table's own
// append-only design. Chronological (oldest first), same order
// getNotesForEntity() already returns.
export default function NotesList({ notes }: { notes: NoteWithAuthor[] }) {
  if (notes.length === 0) {
    return <p className="admin-empty-state">No notes yet.</p>;
  }

  return (
    <>
      {notes.map((note) => (
        <div className="admin-line-item" key={note.id}>
          <p>{note.body}</p>
          <p className="admin-line-item-meta">
            {note.authorDisplayName ?? "Unknown"} · {note.createdAt.toLocaleString("en-US")}
          </p>
        </div>
      ))}
    </>
  );
}
