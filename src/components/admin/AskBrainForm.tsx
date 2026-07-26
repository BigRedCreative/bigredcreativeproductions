"use client";

import { useActionState, useState } from "react";
import { requestBrainAnswerAction } from "@/server/mutate-brain";
import type { BrainRequestType, BrainRequestSource, BrainRelatedEntityType } from "@/data/brain";

// Phase 20A/20B — the ONE client component this entire feature ever needs.
// Submitting this form is the ONLY thing that ever calls the provider —
// the page rendering it (always a server component) makes zero AI calls,
// and clicking a preset button only fills the textarea, it does not
// submit anything on its own. Reused, unmodified in structure, by
// /admin/brain (the dashboard, no entity props) and all five entity
// detail pages (customer/order/portfolio/service/media, each passing its
// own requestSource/relatedEntityType/relatedEntityId/presets) — this is
// the "one shared component, entity-specific config" pattern already
// established by NoteForm.tsx/NotesList.tsx in Phase 18B, not five
// independent Brain forms.
//
// The three hidden fields below (requestSource/relatedEntityType/
// relatedEntityId) are the ONLY entity information this component ever
// sends — never a context object, never an entity label, never anything
// resembling business content. The server independently re-fetches and
// verifies the real entity from relatedEntityId before building any
// context — see handle-request.ts's own extensive comment on this.
export type Preset = { requestType: BrainRequestType; label: string; question: string };

const DEFAULT_PRESETS: Preset[] = [
  { requestType: "dashboard_question", label: "What should I focus on today?", question: "What should I focus on today?" },
  { requestType: "recommend_website", label: "How can I improve the website?", question: "How can I improve the website?" },
  { requestType: "recommend_motion", label: "Review my current motion setup.", question: "Review my current motion setup and suggest anything worth changing." },
  { requestType: "recommend_caption", label: "Give me a marketing idea.", question: "Give me a marketing idea I could use this week." },
  { requestType: "creative_direction", label: "Prepare a branding-video concept.", question: "Prepare a branding-video concept for this business." },
];

type AskBrainFormProps = {
  requestSource?: BrainRequestSource;
  relatedEntityType?: BrainRelatedEntityType;
  relatedEntityId?: string;
  presets?: Preset[];
};

export default function AskBrainForm({
  requestSource = "brain_dashboard",
  relatedEntityType,
  relatedEntityId,
  presets = DEFAULT_PRESETS,
}: AskBrainFormProps) {
  const [state, formAction, isPending] = useActionState(requestBrainAnswerAction, null);
  const [requestType, setRequestType] = useState<BrainRequestType>(presets[0]?.requestType ?? "dashboard_question");
  const [question, setQuestion] = useState("");

  function applyPreset(preset: Preset) {
    setRequestType(preset.requestType);
    setQuestion(preset.question);
  }

  return (
    <div className="admin-form-section">
      <h2>Ask Big Red Brain</h2>
      <p className="admin-form-section-help">
        Only clicking Submit sends anything to the AI provider — choosing a preset just fills in the question below.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        {presets.map((preset) => (
          <button key={preset.label} type="button" className="admin-secondary-button" onClick={() => applyPreset(preset)}>
            {preset.label}
          </button>
        ))}
      </div>

      <form action={formAction} className="admin-form">
        <input type="hidden" name="requestType" value={requestType} />
        <input type="hidden" name="requestSource" value={requestSource} />
        {relatedEntityType && <input type="hidden" name="relatedEntityType" value={relatedEntityType} />}
        {relatedEntityId && <input type="hidden" name="relatedEntityId" value={relatedEntityId} />}
        <div className="admin-form-row">
          <label>
            Your question
            <textarea
              name="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={500}
              required
              rows={3}
            />
          </label>
        </div>

        {state && "errors" in state && state.errors.length > 0 && (
          <div className="admin-form-errors" role="alert" aria-live="assertive">
            <ul>
              {state.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="admin-form-actions">
          <button type="submit" className="admin-signout-button" disabled={isPending}>
            {isPending ? "Asking…" : "Submit"}
          </button>
        </div>
      </form>

      {state && "success" in state && state.success && (
        <div className="admin-detail-block">
          <h3>Big Red Brain</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{state.answer}</p>
        </div>
      )}
    </div>
  );
}
