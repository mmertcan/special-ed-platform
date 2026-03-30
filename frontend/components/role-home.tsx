import Link from "next/link";
import { LogoutButton } from "./logout-button";
import { UserSummary } from "./user-summary";

type RoleLink = {
  href: string;
  title: string;
  description: string;
};

type RoleHomeProps = {
  areaLabel: string;
  title: string;
  description: string;
  links: RoleLink[];
};

export function RoleHome({
  areaLabel,
  title,
  description,
  links,
}: RoleHomeProps) {
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
          <h2 className="section-title">Next routes</h2>
          <ul className="nav-list">
            {links.map((link) => (
              <li key={link.href}>
                <Link className="nav-link" href={link.href}>
                  <strong>{link.title}</strong>
                  <span className="status-note">{link.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
