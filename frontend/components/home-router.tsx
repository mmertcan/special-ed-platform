"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRoleHome } from "../lib/routing";
import { useAuth } from "./auth-provider";

export function HomeRouter() {
  const router = useRouter();
  const { currentUser, isBooting } = useAuth();

  useEffect(() => {
    if (isBooting) {
      return;
    }

    if (!currentUser) {
      router.replace("/login");
      return;
    }

    router.replace(getRoleHome(currentUser.role));
  }, [currentUser, isBooting, router]);

  return (
    <main className="app-shell">
      <div className="container">
        <section className="hero-card stack">
          <p className="eyebrow">Role router</p>
          <h1 className="title">Deciding where this user belongs.</h1>
          <p className="subtitle">
            Root route logic is simple: no session goes to <code>/login</code>,
            admin goes to <code>/admin</code>, teacher goes to{" "}
            <code>/teacher</code>, and parent goes to <code>/parent/feed</code>.
          </p>
        </section>
      </div>
    </main>
  );
}
