"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ApiError, apiRequest } from "../lib/api";
import type { AdminUsersResponse, CurrentUser, UserRole } from "../lib/types";
import { useAuth } from "./auth-provider";
import { LogoutButton } from "./logout-button";
import { UserSummary } from "./user-summary";

type RoleFilter = "all" | UserRole;

const roleOptions: RoleFilter[] = ["all", "admin", "teacher", "parent"];

export function AdminUsersPanel() {
  const { token } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<CurrentUser[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const selectedRole = parseRoleFilter(searchParams.get("role"));

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      if (!token) {
        if (!cancelled) {
          setUsers([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const payload = await apiRequest<AdminUsersResponse>(
          buildUsersPath(selectedRole),
          {
            token,
          },
        );

        if (!cancelled) {
          setUsers(payload.users);
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof ApiError) {
            setErrorMessage(error.message);
          } else {
            setErrorMessage("Users could not be loaded.");
          }
          setUsers([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [selectedRole, token]);

  const handleRoleChange = (role: RoleFilter) => {
    const params = new URLSearchParams(searchParams.toString());

    if (role === "all") {
      params.delete("role");
    } else {
      params.set("role", role);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <main className="app-shell">
      <div className="container stack">
        <section className="hero-card stack">
          <div className="row space-between">
            <div className="stack">
              <p className="eyebrow">Admin users</p>
              <h1 className="title">Read the current user directory.</h1>
              <p className="subtitle">
                This slice does one thing well: it calls{" "}
                <code>GET /admin/users</code> on page load, syncs the role
                filter to the URL, and renders the core user fields so the
                admin can inspect the directory before active-status filters and
                creation controls are added.
              </p>
            </div>
            <LogoutButton />
          </div>
        </section>

        <UserSummary />

        <section className="panel stack">
          <div className="row space-between">
            <div className="stack status-stack">
              <h2 className="section-title">Current users</h2>
              <p className="status-note">
                Showing {users.length} user{users.length === 1 ? "" : "s"} for{" "}
                {selectedRole === "all" ? "all roles" : `role: ${selectedRole}`}
                .
              </p>
            </div>

            <label className="filter-field">
              <span className="field-label">Role filter</span>
              <select
                className="field-input filter-select"
                value={selectedRole}
                onChange={(event) =>
                  handleRoleChange(event.target.value as RoleFilter)
                }
                aria-label="Filter users by role"
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role === "all" ? "All roles" : capitalizeRole(role)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {isLoading ? (
            <p className="status-note">
              Loading users from <code>{buildUsersPath(selectedRole)}</code>.
            </p>
          ) : null}

          {errorMessage ? (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {!isLoading && !errorMessage && users.length === 0 ? (
            <p className="status-note">
              No users were returned by the backend.
            </p>
          ) : null}

          {!isLoading && !errorMessage && users.length > 0 ? (
            <div className="data-list" role="table" aria-label="Admin users list">
              <div className="data-list-header" role="row">
                <span className="data-cell-label" role="columnheader">
                  Full name
                </span>
                <span className="data-cell-label" role="columnheader">
                  Email
                </span>
                <span className="data-cell-label" role="columnheader">
                  Role
                </span>
                <span className="data-cell-label" role="columnheader">
                  Active
                </span>
                <span className="data-cell-label" role="columnheader">
                  Created
                </span>
              </div>

              {users.map((user) => (
                <article className="data-row" key={user.id} role="row">
                  <div className="data-cell" role="cell">
                    <span className="data-cell-label">Full name</span>
                    <strong>{user.full_name}</strong>
                  </div>

                  <div className="data-cell" role="cell">
                    <span className="data-cell-label">Email</span>
                    <span>{user.email}</span>
                  </div>

                  <div className="data-cell" role="cell">
                    <span className="data-cell-label">Role</span>
                    <span className="status-chip">{user.role}</span>
                  </div>

                  <div className="data-cell" role="cell">
                    <span className="data-cell-label">Active</span>
                    <span
                      className={
                        user.is_active
                          ? "status-chip status-chip-success"
                          : "status-chip status-chip-muted"
                      }
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="data-cell" role="cell">
                    <span className="data-cell-label">Created</span>
                    <span>{formatUtcTimestamp(user.created_at_utc)}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function formatUtcTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function parseRoleFilter(value: string | null): RoleFilter {
  if (value === "admin" || value === "teacher" || value === "parent") {
    return value;
  }

  return "all";
}

function buildUsersPath(role: RoleFilter) {
  return role === "all" ? "/admin/users" : `/admin/users?role=${role}`;
}

function capitalizeRole(role: UserRole) {
  return `${role.charAt(0).toUpperCase()}${role.slice(1)}`;
}
