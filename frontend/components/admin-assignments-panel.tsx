"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ApiError, apiRequest } from "../lib/api";
import type {
  AdminStudentsResponse,
  AdminUsersResponse,
  CurrentUser,
  StudentRecord,
} from "../lib/types";
import { useAuth } from "./auth-provider";
import { LogoutButton } from "./logout-button";
import { UserSummary } from "./user-summary";

export function AdminAssignmentsPanel() {
  const { token } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [parents, setParents] = useState<CurrentUser[]>([]);
  const [studentsErrorMessage, setStudentsErrorMessage] = useState<string | null>(
    null,
  );
  const [parentsErrorMessage, setParentsErrorMessage] = useState<string | null>(
    null,
  );
  const [isStudentsLoading, setIsStudentsLoading] = useState(true);
  const [isParentsLoading, setIsParentsLoading] = useState(true);
  const selectedStudentId = parsePositiveInteger(searchParams.get("student_id"));
  const selectedParentId = parsePositiveInteger(
    searchParams.get("parent_user_id"),
  );
  const selectedStudent =
    students.find((student) => student.id === selectedStudentId) ?? null;
  const selectedParent =
    parents.find((parent) => parent.id === selectedParentId) ?? null;

  useEffect(() => {
    let cancelled = false;

    async function loadStudents() {
      if (!token) {
        if (!cancelled) {
          setStudents([]);
          setIsStudentsLoading(false);
        }
        return;
      }

      setIsStudentsLoading(true);
      setStudentsErrorMessage(null);

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
            setStudentsErrorMessage(error.message);
          } else {
            setStudentsErrorMessage("Students could not be loaded.");
          }
          setStudents([]);
        }
      } finally {
        if (!cancelled) {
          setIsStudentsLoading(false);
        }
      }
    }

    async function loadParents() {
      if (!token) {
        if (!cancelled) {
          setParents([]);
          setIsParentsLoading(false);
        }
        return;
      }

      setIsParentsLoading(true);
      setParentsErrorMessage(null);

      try {
        const payload = await apiRequest<AdminUsersResponse>(
          "/admin/users?role=parent&is_active=true",
          {
            token,
          },
        );

        if (!cancelled) {
          setParents(payload.users);
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof ApiError) {
            setParentsErrorMessage(error.message);
          } else {
            setParentsErrorMessage("Parents could not be loaded.");
          }
          setParents([]);
        }
      } finally {
        if (!cancelled) {
          setIsParentsLoading(false);
        }
      }
    }

    void loadStudents();
    void loadParents();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (
      isStudentsLoading ||
      studentsErrorMessage ||
      students.length === 0 ||
      selectedStudent
    ) {
      return;
    }

    replaceQueryValue({
      pathname,
      router,
      searchParams,
      key: "student_id",
      value: String(students[0].id),
    });
  }, [
    isStudentsLoading,
    pathname,
    router,
    searchParams,
    selectedStudent,
    studentsErrorMessage,
    students,
  ]);

  useEffect(() => {
    if (
      isParentsLoading ||
      parentsErrorMessage ||
      parents.length === 0 ||
      selectedParent
    ) {
      return;
    }

    replaceQueryValue({
      pathname,
      router,
      searchParams,
      key: "parent_user_id",
      value: String(parents[0].id),
    });
  }, [
    isParentsLoading,
    parents,
    parentsErrorMessage,
    pathname,
    router,
    searchParams,
    selectedParent,
  ]);

  const handleStudentChange = (studentId: number) => {
    replaceQueryValue({
      pathname,
      router,
      searchParams,
      key: "student_id",
      value: String(studentId),
    });
  };

  const handleParentChange = (parentId: number) => {
    replaceQueryValue({
      pathname,
      router,
      searchParams,
      key: "parent_user_id",
      value: String(parentId),
    });
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
                slice loads the student list and the active parent list, stores
                both current choices in the URL, and keeps those choices stable
                across refreshes.
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

            {isStudentsLoading ? (
              <p className="status-note">
                Loading students from <code>/admin/students</code>.
              </p>
            ) : null}

            {studentsErrorMessage ? (
              <p className="form-error" role="alert">
                {studentsErrorMessage}
              </p>
            ) : null}

            {!isStudentsLoading &&
            !studentsErrorMessage &&
            students.length === 0 ? (
              <p className="status-note">
                No students were returned by the backend, so there is nothing to assign yet.
              </p>
            ) : null}

            {!isStudentsLoading &&
            !studentsErrorMessage &&
            students.length > 0 ? (
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

            <div className="stack form-header">
              <h2 className="section-title">Parent selector</h2>
              <p className="status-note">
                This dropdown is intentionally narrow: it only loads active
                parents through <code>GET /admin/users?role=parent&amp;is_active=true</code>.
              </p>
            </div>

            {isParentsLoading ? (
              <p className="status-note">
                Loading parents from{" "}
                <code>/admin/users?role=parent&amp;is_active=true</code>.
              </p>
            ) : null}

            {parentsErrorMessage ? (
              <p className="form-error" role="alert">
                {parentsErrorMessage}
              </p>
            ) : null}

            {!isParentsLoading && !parentsErrorMessage && parents.length === 0 ? (
              <p className="status-note">
                No active parent users were returned by the backend.
              </p>
            ) : null}

            {!isParentsLoading && !parentsErrorMessage && parents.length > 0 ? (
              <>
                <label className="field">
                  <span className="field-label">Parent</span>
                  <select
                    className="field-input"
                    value={selectedParent ? String(selectedParent.id) : ""}
                    onChange={(event) =>
                      handleParentChange(Number(event.target.value))
                    }
                    aria-label="Choose the parent candidate to assign"
                  >
                    {parents.map((parent) => (
                      <option key={parent.id} value={parent.id}>
                        {parent.full_name} ({parent.email})
                      </option>
                    ))}
                  </select>
                </label>

                <p className="status-note">
                  The selected parent lives in <code>?parent_user_id=...</code>,
                  so the candidate stays visible after refresh.
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

            <div className="stack status-stack">
              <h2 className="section-title">Selected parent candidate</h2>
              <p className="status-note">
                This is the exact parent record that the future assign action
                will send to the backend.
              </p>
            </div>

            {!selectedParent ? (
              <p className="status-note">
                Pick a parent next. The following roadmap slice can attach this
                parent to the current student with a real POST request.
              </p>
            ) : (
              <ul className="meta-list">
                <li className="meta-item">
                  <span className="meta-label">Parent id</span>
                  {selectedParent.id}
                </li>
                <li className="meta-item">
                  <span className="meta-label">Full name</span>
                  {selectedParent.full_name}
                </li>
                <li className="meta-item">
                  <span className="meta-label">Email</span>
                  {selectedParent.email}
                </li>
                <li className="meta-item">
                  <span className="meta-label">Role</span>
                  {selectedParent.role}
                </li>
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function parsePositiveInteger(value: string | null) {
  if (!value) {
    return null;
  }

  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
}

function replaceQueryValue({
  pathname,
  router,
  searchParams,
  key,
  value,
}: {
  pathname: string;
  router: ReturnType<typeof useRouter>;
  searchParams: ReturnType<typeof useSearchParams>;
  key: string;
  value: string;
}) {
  const params = new URLSearchParams(searchParams.toString());
  params.set(key, value);
  router.replace(`${pathname}?${params.toString()}`);
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
