"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ApiError, apiRequest } from "../lib/api";
import type {
  AdminAssignmentsResponse,
  AdminStudentsResponse,
  AdminUsersResponse,
  AssignParentRequest,
  AssignParentResponse,
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
  const [assignmentsErrorMessage, setAssignmentsErrorMessage] = useState<string | null>(
    null,
  );
  const [assignParentErrorMessage, setAssignParentErrorMessage] = useState<string | null>(
    null,
  );
  const [assignParentSuccessMessage, setAssignParentSuccessMessage] = useState<
    string | null
  >(null);
  const [isStudentsLoading, setIsStudentsLoading] = useState(true);
  const [isParentsLoading, setIsParentsLoading] = useState(true);
  const [isAssignmentsLoading, setIsAssignmentsLoading] = useState(false);
  const [isAssigningParent, setIsAssigningParent] = useState(false);
  const [assignmentsRefreshKey, setAssignmentsRefreshKey] = useState(0);
  const [currentAssignments, setCurrentAssignments] =
    useState<AdminAssignmentsResponse | null>(null);
  const selectedStudentId = parsePositiveInteger(searchParams.get("student_id"));
  const selectedParentId = parsePositiveInteger(
    searchParams.get("parent_user_id"),
  );
  const selectedStudent =
    students.find((student) => student.id === selectedStudentId) ?? null;
  const selectedParent =
    parents.find((parent) => parent.id === selectedParentId) ?? null;
  const selectedParentAlreadyLinked = Boolean(
    selectedParent &&
      currentAssignments?.parents.some((parent) => parent.id === selectedParent.id),
  );
  const canAssignParent = Boolean(
    token &&
      selectedStudent &&
      selectedParent &&
      !selectedParentAlreadyLinked &&
      !isAssigningParent,
  );

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
    let cancelled = false;

    async function loadAssignments() {
      if (!token || !selectedStudent) {
        if (!cancelled) {
          setCurrentAssignments(null);
          setAssignmentsErrorMessage(null);
          setIsAssignmentsLoading(false);
        }
        return;
      }

      setIsAssignmentsLoading(true);
      setAssignmentsErrorMessage(null);

      try {
        const payload = await apiRequest<AdminAssignmentsResponse>(
          `/admin/assignments?student_id=${selectedStudent.id}`,
          {
            token,
          },
        );

        if (!cancelled) {
          setCurrentAssignments(payload);
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof ApiError) {
            setAssignmentsErrorMessage(error.message);
          } else {
            setAssignmentsErrorMessage("Current assignments could not be loaded.");
          }
          setCurrentAssignments(null);
        }
      } finally {
        if (!cancelled) {
          setIsAssignmentsLoading(false);
        }
      }
    }

    void loadAssignments();

    return () => {
      cancelled = true;
    };
  }, [assignmentsRefreshKey, selectedStudent, token]);

  useEffect(() => {
    setAssignParentErrorMessage(null);
    setAssignParentSuccessMessage(null);
  }, [selectedParentId, selectedStudentId]);

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

  const handleAssignParent = async () => {
    if (!token || !selectedStudent || !selectedParent) {
      setAssignParentErrorMessage("Choose a student and a parent first.");
      return;
    }

    const payload: AssignParentRequest = {
      parent_user_id: selectedParent.id,
      student_id: selectedStudent.id,
    };

    setIsAssigningParent(true);
    setAssignParentErrorMessage(null);
    setAssignParentSuccessMessage(null);

    try {
      const response = await apiRequest<AssignParentResponse>("/admin/assign-parent", {
        method: "POST",
        token,
        body: payload,
      });

      setAssignParentSuccessMessage(
        `Linked ${selectedParent.full_name} to ${selectedStudent.full_name}.`,
      );
      setAssignmentsRefreshKey((current) => current + 1);

      if (
        response.parent_user_id !== selectedParent.id ||
        response.student_id !== selectedStudent.id
      ) {
        setAssignParentErrorMessage("Unexpected assign-parent response received.");
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setAssignParentErrorMessage(error.message);
      } else {
        setAssignParentErrorMessage("Parent link could not be created.");
      }
    } finally {
      setIsAssigningParent(false);
    }
  };

  return (
    <main className="app-shell">
      <div className="container stack">
        <section className="hero-card stack">
          <div className="row space-between">
            <div className="stack">
              <p className="eyebrow">Admin assignments</p>
              <h1 className="title">Assign parents and teachers to one student at a time.</h1>
              <p className="subtitle">
                First principle: this page is not a generic directory. It is a
                student-centered assignment workflow. Pick one student, inspect
                who is already linked, then prepare the next parent or teacher
                assignment for that same student.
              </p>
            </div>
            <LogoutButton />
          </div>
        </section>

        <UserSummary />

        <div className="admin-assignments-layout">
          <section className="panel stack">
            <div className="stack form-header">
              <h2 className="section-title">Step 1. Choose the student</h2>
              <p className="status-note">
                The student is the anchor record. Every link shown or created on
                the right side belongs to this selected student.
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

                <div className="stack status-stack">
                  <h3 className="section-title">Selected student</h3>
                  <p className="status-note">
                    This is the exact student that the assignment actions will target.
                  </p>
                </div>

                {selectedStudent ? (
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
                ) : (
                  <p className="status-note">
                    Pick a student first. The rest of the page depends on that choice.
                  </p>
                )}
              </>
            ) : null}
          </section>

          <section className="panel stack">
            <div className="stack status-stack">
              <h2 className="section-title">
                Step 2. Review and prepare assignments for{" "}
                {selectedStudent?.full_name ?? "the selected student"}
              </h2>
              <p className="status-note">
                The correct workflow is: inspect current links first, then pick a
                new parent or teacher candidate for this same student.
              </p>
            </div>

            {!selectedStudent ? (
              <p className="status-note">
                Choose a student on the left first. Then choose which parent should
                be linked to that student.
              </p>
            ) : null}

            {selectedStudent ? (
              <div className="stack">
                <div className="stack status-stack">
                  <h3 className="section-title">Current links</h3>
                  <p className="status-note">
                    This read comes from{" "}
                    <code>/admin/assignments?student_id={selectedStudent.id}</code>,
                    so the admin can see who is already linked before assigning anyone else.
                  </p>
                </div>

                {isAssignmentsLoading ? (
                  <p className="status-note">
                    Loading current links for {selectedStudent.full_name}.
                  </p>
                ) : null}

                {assignmentsErrorMessage ? (
                  <p className="form-error" role="alert">
                    {assignmentsErrorMessage}
                  </p>
                ) : null}

                {!isAssignmentsLoading && !assignmentsErrorMessage ? (
                  <>
                    <div className="stack status-stack">
                      <h3 className="section-title">Linked parents</h3>
                      <p className="status-note">
                        {currentAssignments?.parents.length
                          ? `This student already has ${currentAssignments.parents.length} parent link${currentAssignments.parents.length === 1 ? "" : "s"}.`
                          : "This student does not have any parent links yet."}
                      </p>
                    </div>

                    {currentAssignments?.parents.length ? (
                      <ul className="meta-list">
                        {currentAssignments.parents.map((parent) => (
                          <li className="meta-item" key={parent.id}>
                            <span className="meta-label">Parent</span>
                            {parent.full_name} ({parent.email})
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <div className="stack status-stack">
                      <h3 className="section-title">Linked teachers</h3>
                      <p className="status-note">
                        {currentAssignments?.teachers.length
                          ? `This student already has ${currentAssignments.teachers.length} teacher link${currentAssignments.teachers.length === 1 ? "" : "s"}.`
                          : "This student does not have any teacher links yet."}
                      </p>
                    </div>

                    {currentAssignments?.teachers.length ? (
                      <ul className="meta-list">
                        {currentAssignments.teachers.map((teacher) => (
                          <li className="meta-item" key={teacher.id}>
                            <span className="meta-label">Teacher</span>
                            {teacher.full_name} ({teacher.email})
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}

            <div className="stack status-stack">
              <h3 className="section-title">Add parent link</h3>
              <p className="status-note">
                This section sends the real <code>POST /admin/assign-parent</code>{" "}
                request for the selected student and selected parent.
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
                  <span className="field-label">
                    Parent candidate for {selectedStudent?.full_name ?? "this student"}
                  </span>
                  <select
                    className="field-input"
                    value={selectedParent ? String(selectedParent.id) : ""}
                    onChange={(event) =>
                      handleParentChange(Number(event.target.value))
                    }
                    aria-label="Choose the parent candidate to assign"
                    disabled={!selectedStudent}
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

                {selectedParentAlreadyLinked ? (
                  <p className="status-note">
                    {selectedParent?.full_name ?? "This parent"} is already linked to{" "}
                    {selectedStudent?.full_name ?? "this student"}.
                  </p>
                ) : null}

                {selectedParent ? (
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
                ) : (
                  <p className="status-note">
                    Pick a parent next, then submit the link for{" "}
                    {selectedStudent?.full_name ?? "the selected student"}.
                  </p>
                )}

                {assignParentSuccessMessage ? (
                  <p className="form-success" role="status">
                    {assignParentSuccessMessage}
                  </p>
                ) : null}

                {assignParentErrorMessage ? (
                  <p className="form-error" role="alert">
                    {assignParentErrorMessage}
                  </p>
                ) : null}

                <button
                  className="button form-submit"
                  type="button"
                  onClick={handleAssignParent}
                  disabled={!canAssignParent}
                >
                  {isAssigningParent ? "Assigning parent..." : "Assign parent"}
                </button>
              </>
            ) : null}

            <div className="stack status-stack">
              <h3 className="section-title">Add teacher link</h3>
              <p className="status-note">
                Teacher assignment belongs to the same student-centered workflow.
                The next implementation slice will load active teachers and add
                the teacher selector here.
              </p>
            </div>
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
