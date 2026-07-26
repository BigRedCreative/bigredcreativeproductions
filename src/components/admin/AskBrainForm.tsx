"use client";

import { useActionState, useState } from "react";
import { requestBrainAnswerAction } from "@/server/mutate-brain";
import type { BrainRequestType } from "@/data/brain";

// Phase 20A — the only client component in this whole feature. Submitting
// this form is the ONLY thing in /admin/brain that ever calls the
// provider — the page itself (a server component) renders with zero AI
// calls, and clicking a preset button only fills the textarea, it does
// not submit anything on its own.
type Preset = { requestType: BrainRequestType; label: string; question: string };

const PRESETS: Preset[] = [
  { requestType: "dashboard_question", label: "What should I focus on today?", question: "What should I focus on today?" },
  { requestType: "recommend_website", label: "How can I improve the website?", question: "How can I improve the website?" },
  { requestType: "recommend_motion", label: "Review my current motion setup.", question: "Review my current motion setup and suggest anything worth changing." },
  { requestType: "recommend_caption", label: "Give me a marketing idea.", question: "Give me a marketing idea I could use this week." },
  { requestType: "creative_direction", label: "Prepare a branding-video concept.", question: "Prepare a branding-video concept for this business." },
];

export default function AskBrainForm() {
  const [state, formAction, isPending] = useActionState(requestBrainAnswerAction, null);
  const [requestType, setRequestType] = useState<BrainRequestType>("dashboard_question");
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
        {PRESETS.map((preset) => (
          <button key={preset.label} type="button" className="admin-secondary-button" onClick={() => applyPreset(preset)}>
            {preset.label}
          </button>
        ))}
      </div>

      <form action={formAction} className="admin-form">
        <input type="hidden" name="requestType" value={requestType} />
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
