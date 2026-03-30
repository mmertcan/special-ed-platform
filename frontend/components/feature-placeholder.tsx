import { LogoutButton } from "./logout-button";
import { UserSummary } from "./user-summary";

type FeaturePlaceholderProps = {
  areaLabel: string;
  title: string;
  description: string;
};

export function FeaturePlaceholder({
  areaLabel,
  title,
  description,
}: FeaturePlaceholderProps) {
  return (
    <main className="app-shell">
      <div className="container stack">
        <section className="hero-card stack">
          <div className="row space-between">
            <div className="stack">
              <p className="eyebrow">{areaLabel}</p>
              <h1 className="title">{title}</h1>
              <p className="subtitle">{description}</p>
            </div>
            <LogoutButton />
          </div>
        </section>

        <UserSummary />

        <section className="panel stack">
          <h2 className="section-title">Why this page exists already</h2>
          <ul className="meta-list">
            <li className="meta-item">
              The route itself is now real, so navigation does not break.
            </li>
            <li className="meta-item">
              The auth guard already blocks the wrong role before page-specific
              data fetching is added.
            </li>
            <li className="meta-item">
              The next implementation step can focus only on API calls and UI
              state, not on app-shell plumbing.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
