"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ApiError, apiRequest } from "../lib/api";
import type {
  AdminCreateUserRequest,
  AdminCreateUserResponse,
  AdminUsersResponse,
  CurrentUser,
  UserRole,
} from "../lib/types";
import { useAuth } from "./auth-provider";
import { LogoutButton } from "./logout-button";
import { UserSummary } from "./user-summary";

type RoleFilter = "all" | UserRole;
type ActiveFilter = "all" | "active" | "inactive";

const roleOptions: RoleFilter[] = ["all", "admin", "teacher", "parent"];
const activeOptions: ActiveFilter[] = ["all", "active", "inactive"];

const initialCreateForm: AdminCreateUserRequest = {
  full_name: "",
  email: "",
  password: "",
  role: "teacher",
  is_active: true,
};

export function AdminUsersPanel() {
  const { token } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<CurrentUser[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [createForm, setCreateForm] =
    useState<AdminCreateUserRequest>(initialCreateForm);
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(
    null,
  );
  const [createSuccessMessage, setCreateSuccessMessage] = useState<string | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const selectedRole = parseRoleFilter(searchParams.get("role"));
  const selectedActive = parseActiveFilter(searchParams.get("is_active"));

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
          buildUsersPath(selectedRole, selectedActive),
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
  }, [refreshKey, selectedActive, selectedRole, token]);

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

  const handleActiveChange = (active: ActiveFilter) => {
    const params = new URLSearchParams(searchParams.toString());

    if (active === "all") {
      params.delete("is_active");
    } else {
      params.set("is_active", active === "active" ? "true" : "false");
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      setCreateErrorMessage("You are not authenticated.");
      return;
    }

    setIsCreating(true);
    setCreateErrorMessage(null);
    setCreateSuccessMessage(null);

    try {
      const payload = await apiRequest<AdminCreateUserResponse>("/admin/users", {
        method: "POST",
        token,
        body: createForm,
      });

      setCreateForm(initialCreateForm);
      setCreateSuccessMessage(
        `Created ${payload.user.role} user ${payload.user.email}.`,
      );
      setRefreshKey((current) => current + 1);
    } catch (error) {
      if (error instanceof ApiError) {
        setCreateErrorMessage(error.message);
      } else {
        setCreateErrorMessage("User could not be created.");
      }
    } finally {
      setIsCreating(false);
    }
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
                and active filters to the URL, and lets the admin create new
                users without leaving the page.
              </p>
            </div>
            <LogoutButton />
          </div>
        </section>

        <UserSummary />

        <div className="admin-users-layout">
          <section className="panel stack">
            <div className="stack form-header">
              <h2 className="section-title">Create user</h2>
              <p className="status-note">
                These fields map directly to <code>POST /admin/users</code>.
              </p>
            </div>

            <form className="stack" onSubmit={handleCreateUser}>
              <div className="form-grid">
                <label className="field">
                  <span className="field-label">Full name</span>
                  <input
                    className="field-input"
                    type="text"
                    value={createForm.full_name}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        full_name: event.target.value,
                      }))
                    }
                    placeholder="Teacher User"
                    required
                  />
                </label>

                <label className="field">
                  <span className="field-label">Email</span>
                  <input
                    className="field-input"
                    type="email"
                    value={createForm.email}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="teacher@example.com"
                    required
                  />
                </label>

                <label className="field">
                  <span className="field-label">Password</span>
                  <input
                    className="field-input"
                    type="password"
                    value={createForm.password}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    placeholder="Create a password"
                    required
                  />
                </label>

                <label className="field">
                  <span className="field-label">Role</span>
                  <select
                    className="field-input"
                    value={createForm.role}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        role: event.target.value as UserRole,
                      }))
                    }
                  >
                    <option value="teacher">Teacher</option>
                    <option value="parent">Parent</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
              </div>

              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={createForm.is_active}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      is_active: event.target.checked,
                    }))
                  }
                />
                <span>Active account</span>
              </label>

              {createSuccessMessage ? (
                <p className="form-success" role="status">
                  {createSuccessMessage}
                </p>
              ) : null}

              {createErrorMessage ? (
                <p className="form-error" role="alert">
                  {createErrorMessage}
                </p>
              ) : null}

              <button className="button form-submit" type="submit" disabled={isCreating}>
                {isCreating ? "Creating user..." : "Create user"}
              </button>
            </form>
          </section>

          <section className="panel stack">
          <div className="row space-between">
            <div className="stack status-stack">
              <h2 className="section-title">Current users</h2>
              <p className="status-note">
                Showing {users.length} user{users.length === 1 ? "" : "s"} for{" "}
                {selectedRole === "all" ? "all roles" : `role: ${selectedRole}`}
                {" "}and{" "}
                {selectedActive === "all"
                  ? "all activity states"
                  : selectedActive === "active"
                    ? "active users only"
                    : "inactive users only"}
                .
              </p>
            </div>

            <div className="filters-row">
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

              <label className="filter-field">
                <span className="field-label">Active filter</span>
                <select
                  className="field-input filter-select"
                  value={selectedActive}
                  onChange={(event) =>
                    handleActiveChange(event.target.value as ActiveFilter)
                  }
                  aria-label="Filter users by active status"
                >
                  {activeOptions.map((active) => (
                    <option key={active} value={active}>
                      {formatActiveOption(active)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {isLoading ? (
            <p className="status-note">
              Loading users from{" "}
              <code>{buildUsersPath(selectedRole, selectedActive)}</code>.
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

function parseActiveFilter(value: string | null): ActiveFilter {
  if (value === "true") {
    return "active";
  }

  if (value === "false") {
    return "inactive";
  }

  return "all";
}

function buildUsersPath(role: RoleFilter, active: ActiveFilter) {
  const params = new URLSearchParams();

  if (role !== "all") {
    params.set("role", role);
  }

  if (active === "active") {
    params.set("is_active", "true");
  } else if (active === "inactive") {
    params.set("is_active", "false");
  }

  const query = params.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

function capitalizeRole(role: UserRole) {
  return `${role.charAt(0).toUpperCase()}${role.slice(1)}`;
}

function formatActiveOption(active: ActiveFilter) {
  if (active === "all") {
    return "All statuses";
  }

  if (active === "active") {
    return "Active only";
  }

  return "Inactive only";
}
