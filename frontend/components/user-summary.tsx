"use client";

import { useAuth } from "./auth-provider";

export function UserSummary() {
  const { currentUser, token } = useAuth();

  if (!currentUser) {
    return null;
  }

  return (
    <section className="panel stack">
      <h2 className="section-title">Current session</h2>
      <ul className="meta-list">
        <li className="meta-item">
          <span className="meta-label">Full name</span>
          {currentUser.full_name}
        </li>
        <li className="meta-item">
          <span className="meta-label">Email</span>
          {currentUser.email}
        </li>
        <li className="meta-item">
          <span className="meta-label">Role</span>
          {currentUser.role}
        </li>
        <li className="meta-item">
          <span className="meta-label">Token state</span>
          {token ? "present in localStorage and memory" : "missing"}
        </li>
      </ul>
    </section>
  );
}
