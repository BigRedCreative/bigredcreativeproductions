import type { ProjectResult } from "@/data/projects";

type ProjectResultsProps = {
  results: ProjectResult[];
};

export default function ProjectResults({ results }: ProjectResultsProps) {
  return (
    <section className="section">
      <span className="kicker">Results</span>
      <div className="project-results-grid">
        {results.map((result) => (
          <div className="project-result" key={result.label}>
            <b>{result.value}</b>
            <span>{result.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
