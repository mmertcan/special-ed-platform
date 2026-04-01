"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, apiRequest } from "../lib/api";
import type {
  DailyFeedCreateRequest,
  DailyFeedCreateResponse,
  DailyFeedEntry,
  DailyFeedResponse,
  MeStudentsResponse,
  ViewerStudent,
} from "../lib/types";
import { useAuth } from "./auth-provider";
import { LogoutButton } from "./logout-button";
import { UserSummary } from "./user-summary";

export function TeacherStudentDetailPanel() {
  const params = useParams<{ studentId: string }>();
  const { token } = useAuth();
  const [students, setStudents] = useState<ViewerStudent[]>([]);
  const [feedEntries, setFeedEntries] = useState<DailyFeedEntry[]>([]);
  const [studentsErrorMessage, setStudentsErrorMessage] = useState<string | null>(
    null,
  );
  const [feedErrorMessage, setFeedErrorMessage] = useState<string | null>(null);
  const [composerDraft, setComposerDraft] = useState("");
  const [composerErrorMessage, setComposerErrorMessage] = useState<string | null>(
    null,
  );
  const [composerSuccessMessage, setComposerSuccessMessage] = useState<string | null>(
    null,
  );
  const [isStudentsLoading, setIsStudentsLoading] = useState(true);
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedStudentId = parsePositiveInteger(params.studentId);
  const selectedStudent =
    students.find((student) => student.id === selectedStudentId) ?? null;

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
        const payload = await apiRequest<MeStudentsResponse>("/me/students", {
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
            setStudentsErrorMessage("Assigned students could not be loaded.");
          }
          setStudents([]);
        }
      } finally {
        if (!cancelled) {
          setIsStudentsLoading(false);
        }
      }
    }

    void loadStudents();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    async function loadFeed() {
      if (!token || !selectedStudent) {
        if (!cancelled) {
          setFeedEntries([]);
          setFeedErrorMessage(null);
          setIsFeedLoading(false);
        }
        return;
      }

      setIsFeedLoading(true);
      setFeedErrorMessage(null);

      try {
        const payload = await apiRequest<DailyFeedResponse>(
          `/students/${selectedStudent.id}/daily-feed`,
          {
            token,
          },
        );

        if (!cancelled) {
          setFeedEntries(payload.entries);
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof ApiError) {
            setFeedErrorMessage(error.message);
          } else {
            setFeedErrorMessage("Daily feed could not be loaded.");
          }
          setFeedEntries([]);
        }
      } finally {
        if (!cancelled) {
          setIsFeedLoading(false);
        }
      }
    }

    void loadFeed();

    return () => {
      cancelled = true;
    };
  }, [selectedStudent, token]);

  useEffect(() => {
    setComposerDraft("");
    setComposerErrorMessage(null);
    setComposerSuccessMessage(null);
  }, [selectedStudentId]);

  const handleCreateNote = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token || !selectedStudent) {
      setComposerErrorMessage("Choose a valid assigned student first.");
      return;
    }

    const payload: DailyFeedCreateRequest = {
      body: composerDraft,
    };

    setIsSubmitting(true);
    setComposerErrorMessage(null);
    setComposerSuccessMessage(null);

    try {
      const response = await apiRequest<DailyFeedCreateResponse>(
        `/students/${selectedStudent.id}/daily-feed`,
        {
          method: "POST",
          token,
          body: payload,
        },
      );

      setFeedEntries((current) => [response.post, ...current]);
      setComposerDraft("");
      setComposerSuccessMessage(
        `Posted a new daily note for ${selectedStudent.full_name}.`,
      );
    } catch (error) {
      if (error instanceof ApiError) {
        setComposerErrorMessage(error.message);
      } else {
        setComposerErrorMessage("Daily note could not be created.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="app-shell">
      <div className="container stack">
        <section className="hero-card stack">
          <div className="row space-between">
            <div className="stack">
              <p className="eyebrow">Teacher student detail</p>
              <h1 className="title">Open the daily feed only for your assigned student.</h1>
              <p className="subtitle">
                First principle: the URL alone is not trusted. This page first
                loads <code>/me/students</code> to verify the selected student
                belongs to the logged-in teacher, then loads that student&apos;s
                daily feed.
              </p>
            </div>
            <LogoutButton />
          </div>
        </section>

        <UserSummary />

        <section className="panel stack">
          <div className="row space-between">
            <div className="stack status-stack">
              <h2 className="section-title">Student verification</h2>
              <p className="status-note">
                Route param: <code>{params.studentId ?? "missing"}</code>
              </p>
            </div>
            <Link className="button-secondary" href="/teacher/students">
              Back to students
            </Link>
          </div>

          {isStudentsLoading ? (
            <p className="status-note">
              Loading assigned students from <code>/me/students</code>.
            </p>
          ) : null}

          {studentsErrorMessage ? (
            <p className="form-error" role="alert">
              {studentsErrorMessage}
            </p>
          ) : null}

          {!isStudentsLoading && !studentsErrorMessage && !selectedStudentId ? (
            <p className="form-error" role="alert">
              The route student id is invalid.
            </p>
          ) : null}

          {!isStudentsLoading &&
          !studentsErrorMessage &&
          selectedStudentId &&
          !selectedStudent ? (
            <p className="form-error" role="alert">
              This student is not assigned to the logged-in teacher.
            </p>
          ) : null}

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
            </ul>
          ) : null}
        </section>

        <section className="panel stack">
          <div className="stack status-stack">
            <h2 className="section-title">Daily note composer</h2>
            <p className="status-note">
              This form sends <code>POST /students/{selectedStudent?.id ?? "studentId"}/daily-feed</code>.
              On success it clears the draft and prepends the new note to the
              history below.
            </p>
          </div>

          {!selectedStudent ? (
            <p className="status-note">
              The composer is available only after the route student id is verified.
            </p>
          ) : (
            <form className="stack" onSubmit={handleCreateNote}>
              <label className="field">
                <span className="field-label">Daily note</span>
                <textarea
                  className="field-input"
                  rows={5}
                  value={composerDraft}
                  onChange={(event) => setComposerDraft(event.target.value)}
                  placeholder="Bugun iletisim calismasinda guzel ilerleme oldu."
                  disabled={isSubmitting}
                  required
                />
              </label>

              {composerSuccessMessage ? (
                <p className="form-success" role="status">
                  {composerSuccessMessage}
                </p>
              ) : null}

              {composerErrorMessage ? (
                <p className="form-error" role="alert">
                  {composerErrorMessage}
                </p>
              ) : null}

              <button className="button form-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Posting note..." : "Post daily note"}
              </button>
            </form>
          )}
        </section>

        <section className="panel stack">
          <div className="stack status-stack">
            <h2 className="section-title">Daily feed history</h2>
            <p className="status-note">
              Entries are rendered newest-first from{" "}
              <code>/students/{selectedStudent?.id ?? "studentId"}/daily-feed</code>.
            </p>
          </div>

          {isFeedLoading ? (
            <p className="status-note">
              Loading feed history for {selectedStudent?.full_name ?? "the selected student"}.
            </p>
          ) : null}

          {feedErrorMessage ? (
            <p className="form-error" role="alert">
              {feedErrorMessage}
            </p>
          ) : null}

          {!selectedStudent ? (
            <p className="status-note">
              Feed history will load only after the student id is verified against
              the teacher&apos;s assigned-student list.
            </p>
          ) : null}

          {selectedStudent && !isFeedLoading && !feedErrorMessage && feedEntries.length === 0 ? (
            <p className="status-note">
              No daily feed entries yet.
            </p>
          ) : null}

          {selectedStudent && !isFeedLoading && !feedErrorMessage && feedEntries.length > 0 ? (
            <ul className="meta-list">
              {feedEntries.map((entry) => (
                <li className="meta-item" key={entry.id}>
                  <span className="meta-label">
                    Posted {formatUtcTimestamp(entry.posted_at_utc)}
                  </span>
                  {entry.body}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function parsePositiveInteger(value: string | string[] | undefined) {
  if (typeof value !== "string") {
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
