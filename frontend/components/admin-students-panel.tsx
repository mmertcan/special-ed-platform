"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ApiError, apiRequest } from "../lib/api";
import type { AdminStudentsResponse, StudentRecord } from "../lib/types";
import { useAuth } from "./auth-provider";
import { LogoutButton } from "./logout-button";
import { UserSummary } from "./user-summary";

type ActiveFilter = "all" | "active" | "inactive";

const activeOptions: ActiveFilter[] = ["all", "active", "inactive"];

export function AdminStudentsPanel() {
  const { token } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const selectedActive = parseActiveFilter(searchParams.get("is_active"));

  useEffect(() => {
    let cancelled = false;

    async function loadStudents() {
      if (!token) {
        if (!cancelled) {
          setStudents([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const payload = await apiRequest<AdminStudentsResponse>(
          buildStudentsPath(selectedActive),
          {
            token,
          },
        );

        if (!cancelled) {
          setStudents(payload.students);
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof ApiError) {
            setErrorMessage(error.message);
          } else {
            setErrorMessage("Students could not be loaded.");
          }
          setStudents([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadStudents();

    return () => {
      cancelled = true;
    };
  }, [selectedActive, token]);

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

  return (
    <main className="app-shell">
      <div className="container stack">
        <section className="hero-card stack">
          <div className="row space-between">
            <div className="stack">
              <p className="eyebrow">Admin students</p>
              <h1 className="title">Read the current student directory.</h1>
              <p className="subtitle">
                First principle: this page does one narrow job. It calls{" "}
                <code>GET /admin/students</code> on page load, syncs the active
                filter to the URL, and renders the core student fields before
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
              <h2 className="section-title">Current students</h2>
              <p className="status-note">
                Showing {students.length} student{students.length === 1 ? "" : "s"}{" "}
                for{" "}
                {selectedActive === "all"
                  ? "all activity states"
                  : selectedActive === "active"
                    ? "active students only"
                    : "inactive students only"}
                .
              </p>
            </div>

            <label className="filter-field">
              <span className="field-label">Active filter</span>
              <select
                className="field-input filter-select"
                value={selectedActive}
                onChange={(event) =>
                  handleActiveChange(event.target.value as ActiveFilter)
                }
                aria-label="Filter students by active status"
              >
                {activeOptions.map((active) => (
                  <option key={active} value={active}>
                    {formatActiveOption(active)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {isLoading ? (
            <p className="status-note">
              Loading students from <code>{buildStudentsPath(selectedActive)}</code>.
            </p>
          ) : null}

          {errorMessage ? (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {!isLoading && !errorMessage && students.length === 0 ? (
            <p className="status-note">
              No students were returned by the backend.
            </p>
          ) : null}

          {!isLoading && !errorMessage && students.length > 0 ? (
            <div className="data-list" role="table" aria-label="Admin students list">
              <div className="data-list-header students-grid" role="row">
                <span className="data-cell-label" role="columnheader">
                  Full name
                </span>
                <span className="data-cell-label" role="columnheader">
                  Active
                </span>
                <span className="data-cell-label" role="columnheader">
                  Created
                </span>
              </div>

              {students.map((student) => (
                <article className="data-row students-grid" key={student.id} role="row">
                  <div className="data-cell" role="cell">
                    <span className="data-cell-label">Full name</span>
                    <strong>{student.full_name}</strong>
                  </div>

                  <div className="data-cell" role="cell">
                    <span className="data-cell-label">Active</span>
                    <span
                      className={
                        student.is_active
                          ? "status-chip status-chip-success"
                          : "status-chip status-chip-muted"
                      }
                    >
                      {student.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="data-cell" role="cell">
                    <span className="data-cell-label">Created</span>
                    <span>{formatUtcTimestamp(student.created_at_utc)}</span>
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

function parseActiveFilter(value: string | null): ActiveFilter {
  if (value === "true") {
    return "active";
  }

  if (value === "false") {
    return "inactive";
  }

  return "all";
}

function buildStudentsPath(active: ActiveFilter) {
  if (active === "active") {
    return "/admin/students?is_active=true";
  }

  if (active === "inactive") {
    return "/admin/students?is_active=false";
  }

  return "/admin/students";
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
