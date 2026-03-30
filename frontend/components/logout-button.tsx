"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";

export function LogoutButton() {
  const router = useRouter();
  const { logout } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await logout();
      router.replace("/login");
    } catch {
      setError("Logout failed. The local session is still being cleared.");
      router.replace("/login");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="stack">
      <button
        className="button-secondary"
        type="button"
        onClick={handleLogout}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Logging out..." : "Log out"}
      </button>
      {error ? <p className="status-note status-danger">{error}</p> : null}
    </div>
  );
}
