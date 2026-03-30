"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRoleHome } from "../lib/routing";
import { useAuth } from "./auth-provider";

type PublicOnlyProps = {
  children: React.ReactNode;
};

export function PublicOnly({ children }: PublicOnlyProps) {
  const router = useRouter();
  const { currentUser, isBooting } = useAuth();

  useEffect(() => {
    if (isBooting || !currentUser) {
      return;
    }

    router.replace(getRoleHome(currentUser.role));
  }, [currentUser, isBooting, router]);

  if (isBooting) {
    return (
      <main className="app-shell">
        <div className="container">
          <section className="hero-card stack">
            <p className="eyebrow">Auth boot</p>
            <h1 className="title">Restoring session</h1>
            <p className="subtitle">
              The app is checking whether a saved token still maps to a valid user.
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (currentUser) {
    return (
      <main className="app-shell">
        <div className="container">
          <section className="hero-card stack">
            <p className="eyebrow">Redirecting</p>
            <h1 className="title">You already have a session.</h1>
            <p className="subtitle">
              Public pages like <code>/login</code> are skipped for authenticated users.
            </p>
          </section>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
