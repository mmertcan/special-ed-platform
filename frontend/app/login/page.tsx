import { PublicOnly } from "../../components/public-only";
import { LoginForm } from "../../components/login-form";

export default function LoginPage() {
  return (
    <PublicOnly>
      <main className="app-shell">
        <div className="container">
          <section className="hero-card stack">
            <div className="stack">
              <p className="eyebrow">Login</p>
              <h1 className="title">Sign in to the school portal.</h1>
              <p className="subtitle">
                First principle: this page takes credentials, sends them to{" "}
                <code>POST /auth/login</code>, stores the returned token, and
                then routes the user by role.
              </p>
            </div>

            <div className="login-grid">
              <LoginForm />

              <aside className="panel stack">
                <h2 className="section-title">What happens after submit</h2>
                <ul className="meta-list">
                  <li className="meta-item">
                    Valid credentials return a session token and current user.
                  </li>
                  <li className="meta-item">
                    The token is stored in <code>localStorage</code>.
                  </li>
                  <li className="meta-item">
                    Admin goes to <code>/admin</code>, teacher goes to{" "}
                    <code>/teacher</code>, and parent goes to{" "}
                    <code>/parent/feed</code>.
                  </li>
                  <li className="meta-item">
                    Invalid credentials stay on this page and show the backend
                    error text.
                  </li>
                </ul>
              </aside>
            </div>
          </section>
        </div>
      </main>
    </PublicOnly>
  );
}
