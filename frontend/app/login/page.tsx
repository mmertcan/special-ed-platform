import { PublicOnly } from "../../components/public-only";

export default function LoginPage() {
  return (
    <PublicOnly>
      <main className="app-shell">
        <div className="container">
          <section className="hero-card stack">
            <div className="stack">
              <p className="eyebrow">Step 1 completed</p>
              <h1 className="title">Frontend foundation is ready.</h1>
              <p className="subtitle">
                This page exists so unauthenticated users have a stable entry
                point. The actual email and password form is the next build
                step.
              </p>
            </div>

            <div className="panel stack">
              <h2 className="section-title">What already works</h2>
              <ul className="meta-list">
                <li className="meta-item">
                  Session token persistence in <code>localStorage</code>
                </li>
                <li className="meta-item">
                  Session restore via <code>GET /me</code> on refresh
                </li>
                <li className="meta-item">
                  Role-based redirects for admin, teacher, and parent routes
                </li>
                <li className="meta-item">
                  Logout flow through <code>POST /auth/logout</code>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </main>
    </PublicOnly>
  );
}
