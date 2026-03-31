"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ApiError, apiRequest } from "../lib/api";
import type { AdminStudentsResponse, StudentRecord } from "../lib/types";
import { useAuth } from "./auth-provider";
import { LogoutButton } from "./logout-button";
import { UserSummary } from "./user-summary";

export function AdminAssignmentsPanel() {
  const { token } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const selectedStudentId = parseStudentId(searchParams.get("student_id"));
  const selectedStudent =
    students.find((student) => student.id === selectedStudentId) ?? null;

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
        const payload = await apiRequest<AdminStudentsResponse>("/admin/students", {
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
  }, [token]);

  useEffect(() => {
    if (isLoading || errorMessage || students.length === 0 || selectedStudent) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("student_id", String(students[0].id));
    router.replace(`${pathname}?${params.toString()}`);
  }, [
    errorMessage,
    isLoading,
    pathname,
    router,
    searchParams,
    selectedStudent,
    students,
  ]);

  const handleStudentChange = (studentId: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("student_id", String(studentId));
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <main className="app-shell">
      <div className="container stack">
        <section className="hero-card stack">
          <div className="row space-between">
            <div className="stack">
              <p className="eyebrow">Admin assignments</p>
              <h1 className="title">Choose the student before assigning adults.</h1>
              <p className="subtitle">
                First principle: assignments have to anchor on one student. This
                slice loads <code>GET /admin/students</code>, stores the selected
                student in the URL, and keeps that choice stable across refreshes.
              </p>
            </div>
            <LogoutButton />
          </div>
        </section>

        <UserSummary />

        <div className="admin-assignments-layout">
          <section className="panel stack">
            <div className="stack form-header">
              <h2 className="section-title">Student selector</h2>
              <p className="status-note">
                The dropdown options come directly from <code>GET /admin/students</code>.
              </p>
            </div>

            {isLoading ? (
              <p className="status-note">
                Loading students from <code>/admin/students</code>.
              </p>
            ) : null}

            {errorMessage ? (
              <p className="form-error" role="alert">
                {errorMessage}
              </p>
            ) : null}

            {!isLoading && !errorMessage && students.length === 0 ? (
              <p className="status-note">
                No students were returned by the backend, so there is nothing to assign yet.
              </p>
            ) : null}

            {!isLoading && !errorMessage && students.length > 0 ? (
              <>
                <label className="field">
                  <span className="field-label">Student</span>
                  <select
                    className="field-input"
                    value={selectedStudent ? String(selectedStudent.id) : ""}
                    onChange={(event) =>
                      handleStudentChange(Number(event.target.value))
                    }
                    aria-label="Choose the student to inspect assignments for"
                  >
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.full_name}
                      </option>
                    ))}
                  </select>
                </label>

                <p className="status-note">
                  The selected student lives in <code>?student_id=...</code>, so a
                  refresh keeps the same assignment context.
                </p>
              </>
            ) : null}
          </section>

          <section className="panel stack">
            <div className="stack status-stack">
              <h2 className="section-title">Selected student</h2>
              <p className="status-note">
                This panel shows the exact student record that later assignment
                actions will attach to.
              </p>
            </div>

            {!selectedStudent ? (
              <p className="status-note">
                Pick a student first. The next roadmap slice will fetch parents,
                teachers, and current assignment links for this student.
              </p>
            ) : (
              <ul className="meta-list">
                <li className="meta-item">
                  <span className="meta-label">Student id</span>
                  {selectedStudent.id}
                </li>
                <li className="meta-item">
                  <span className="meta-label">Full name</span>
                  {selectedStudent.full_name}
                </li>
                <li className="meta-item">
                  <span className="meta-label">Active</span>
                  <span
                    className={
                      selectedStudent.is_active
                        ? "status-chip status-chip-success"
                        : "status-chip status-chip-muted"
                    }
                  >
                    {selectedStudent.is_active ? "Active" : "Inactive"}
                  </span>
                </li>
                <li className="meta-item">
                  <span className="meta-label">Created</span>
                  {formatUtcTimestamp(selectedStudent.created_at_utc)}
                </li>
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function parseStudentId(value: string | null) {
  if (!value) {
    return null;
  }

  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
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
