"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, apiRequest } from "../lib/api";
import type { MeStudentsResponse, ViewerStudent } from "../lib/types";
import { useAuth } from "./auth-provider";
import { LogoutButton } from "./logout-button";
import { UserSummary } from "./user-summary";

export function TeacherStudentsPanel() {
  const { token } = useAuth();
  const [students, setStudents] = useState<ViewerStudent[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadNonce, setReloadNonce] = useState(0);

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
        const payload = await apiRequest<MeStudentsResponse>("/me/students", {
          token,
        });

        if (!cancelled) {
          setStudents(payload.students);
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof ApiError) {
            setErrorMessage(error.message);
          } else {
            setErrorMessage("Assigned students could not be loaded.");
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
  }, [reloadNonce, token]);

  return (
    <main className="app-shell">
      <div className="container stack">
        <section className="hero-card stack">
          <div className="row space-between">
            <div className="stack">
              <p className="eyebrow">Teacher students</p>
              <h1 className="title">Open only the students assigned to you.</h1>
              <p className="subtitle">
                First principle: teachers should not browse the whole school.
                This page calls <code>GET /me/students</code> and shows only the
                students linked to the logged-in teacher.
              </p>
            </div>
            <LogoutButton />
          </div>
        </section>

        <UserSummary />

        <section className="panel stack">
          <div className="stack status-stack">
            <h2 className="section-title">Assigned students</h2>
            <p className="status-note">
              Showing {students.length} student{students.length === 1 ? "" : "s"}{" "}
              from <code>/me/students</code>.
            </p>
          </div>

          {isLoading ? (
            <p className="status-note">
              Loading assigned students from <code>/me/students</code>.
            </p>
          ) : null}

          {errorMessage ? (
            <div className="stack">
              <p className="form-error" role="alert">
                {errorMessage}
              </p>
              <button
                className="button-secondary"
                type="button"
                onClick={() => setReloadNonce((currentValue) => currentValue + 1)}
              >
                Tekrar dene
              </button>
            </div>
          ) : null}

          {!isLoading && !errorMessage && students.length === 0 ? (
            <p className="status-note">
              No students assigned yet.
            </p>
          ) : null}

          {!isLoading && !errorMessage && students.length > 0 ? (
            <ul className="nav-list">
              {students.map((student) => (
                <li key={student.id}>
                  <Link
                    className="nav-link"
                    href={`/teacher/students/${student.id}`}
                  >
                    <strong>{student.full_name}</strong>
                    <span className="status-note">
                      Student id: {student.id}
                    </span>
                    <span
                      className={
                        student.is_active
                          ? "status-chip status-chip-success"
                          : "status-chip status-chip-muted"
                      }
                    >
                      {student.is_active ? "Active" : "Inactive"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    </main>
  );
}
