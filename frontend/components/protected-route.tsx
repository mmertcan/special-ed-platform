"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRoleHome } from "../lib/routing";
import type { UserRole } from "../lib/types";
import { useAuth } from "./auth-provider";

type ProtectedRouteProps = {
  allowedRoles: UserRole[];
  children: React.ReactNode;
};

export function ProtectedRoute({
  allowedRoles,
  children,
}: ProtectedRouteProps) {
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

    if (!allowedRoles.includes(currentUser.role)) {
      router.replace(getRoleHome(currentUser.role));
    }
  }, [allowedRoles, currentUser, isBooting, router]);

  if (isBooting) {
    return <RouteStatus message="Restoring session from localStorage and verifying token with GET /me." />;
  }

  if (!currentUser) {
    return <RouteStatus message="No active session found. Redirecting to /login." />;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    return <RouteStatus message="Signed in, but this role cannot open this page. Redirecting to the correct area." />;
  }

  return <>{children}</>;
}

type RouteStatusProps = {
  message: string;
};

function RouteStatus({ message }: RouteStatusProps) {
  return (
    <main className="app-shell">
      <div className="container">
        <section className="hero-card stack">
          <p className="eyebrow">Auth guard</p>
          <h1 className="title">Checking access</h1>
          <p className="subtitle">{message}</p>
        </section>
      </div>
    </main>
  );
}
