"use client";

import { useEffect, useMemo, useState } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { ApiError, apiRequest } from "../lib/api";
import type {
  DailyFeedEntry,
  DailyFeedResponse,
  MeStudentsResponse,
  ViewerStudent,
} from "../lib/types";
import { useAuth } from "./auth-provider";

type StudentPresentation = {
  gradeLabel: string;
  teacherName: string;
  familyNote: string;
  latestDurationLabel: string;
};

type SessionGroup = {
  dateKey: string;
  dateLabel: string;
  entries: DailyFeedEntry[];
};

const studentPresentationCycle: StudentPresentation[] = [
  {
    gradeLabel: "1. Sınıf",
    teacherName: "Ayşe Öğretmen",
    familyNote:
      "Yarın iletişim kartının çantada olması faydalı olur. Evde benzer kartlarla kısa tekrar yapabilirsiniz.",
    latestDurationLabel: "1 saat",
  },
  {
    gradeLabel: "2. Sınıf",
    teacherName: "Zeynep Öğretmen",
    familyNote:
      "Evde kısa yönergelerle devam etmek odaklanmayı güçlendirebilir. Günlük rutinde iki kısa tekrar yeterlidir.",
    latestDurationLabel: "50 dk",
  },
  {
    gradeLabel: "3. Sınıf",
    teacherName: "Elif Öğretmen",
    familyNote:
      "Bu hafta görsel ipuçlarıyla kısa tekrar iyi gelebilir. Özellikle geçiş anlarında aynı ifadeleri kullanmayı deneyin.",
    latestDurationLabel: "45 dk",
  },
];

export function ParentFeedPanel() {
  const { currentUser, token } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<ViewerStudent[]>([]);
  const [entries, setEntries] = useState<DailyFeedEntry[]>([]);
  const [studentsErrorMessage, setStudentsErrorMessage] = useState<string | null>(
    null,
  );
  const [feedErrorMessage, setFeedErrorMessage] = useState<string | null>(null);
  const [isStudentsLoading, setIsStudentsLoading] = useState(true);
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const selectedStudentId = parsePositiveInteger(searchParams.get("student_id"));
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
            setStudentsErrorMessage("Öğrenci listesi yüklenemedi.");
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
    if (isStudentsLoading || studentsErrorMessage || students.length === 0) {
      return;
    }

    const fallbackStudentId = students[0].id;

    if (students.length === 1 && selectedStudentId !== fallbackStudentId) {
      replaceStudentInQuery({
        pathname,
        router,
        searchParams,
        studentId: fallbackStudentId,
      });
      return;
    }

    if (!selectedStudent) {
      replaceStudentInQuery({
        pathname,
        router,
        searchParams,
        studentId: fallbackStudentId,
      });
    }
  }, [
    isStudentsLoading,
    pathname,
    router,
    searchParams,
    selectedStudent,
    selectedStudentId,
    students,
    studentsErrorMessage,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadFeed() {
      if (!token || !selectedStudent) {
        if (!cancelled) {
          setEntries([]);
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
          setEntries(payload.entries);
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof ApiError) {
            setFeedErrorMessage(error.message);
          } else {
            setFeedErrorMessage("Gelişim günlüğü yüklenemedi.");
          }
          setEntries([]);
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

  const sessions = useMemo(() => groupEntriesByDate(entries), [entries]);
  const latestSession = sessions[0] ?? null;
  const pastSessions = sessions.slice(1);
  const studentPresentation = selectedStudent
    ? getStudentPresentation(selectedStudent.id)
    : null;
  const latestSummary = latestSession
    ? buildSessionSummary(latestSession, selectedStudent?.full_name ?? "öğrenciniz")
    : null;
  const latestUpdates = latestSession?.entries.slice(0, 2) ?? [];
  const headerInitials = getInitials(currentUser?.full_name ?? "Veli");

  return (
    <main className="parent-feed-shell">
      <div className="parent-feed-mobile">
        <header className="parent-header">
          <div className="parent-header-main">
            <div className="parent-avatar">{headerInitials}</div>
            <div className="parent-header-copy">
              <h1 className="parent-title">Gelişim Günlüğü</h1>
              <p className="parent-subtitle">Okuldaki oturum paylaşımları</p>
            </div>
          </div>
          <button className="parent-menu-button" type="button" aria-label="Menü">
            •••
          </button>
        </header>

        <section className="parent-student-card">
          <div className="parent-section-label">Öğrenci</div>

          {isStudentsLoading ? (
            <p className="status-note">Öğrenciler yükleniyor.</p>
          ) : null}

          {studentsErrorMessage ? (
            <p className="form-error" role="alert">
              {studentsErrorMessage}
            </p>
          ) : null}

          {!isStudentsLoading && !studentsErrorMessage && students.length === 0 ? (
            <p className="status-note">
              Henüz hesabınıza bağlı öğrenci bulunmuyor.
            </p>
          ) : null}

          {!isStudentsLoading && !studentsErrorMessage && students.length > 0 ? (
            <div className="parent-student-row">
              <div className="parent-student-copy">
                {students.length > 1 ? (
                  <label className="field">
                    <span className="visually-hidden">Öğrenci seç</span>
                    <select
                      className="parent-student-select"
                      value={selectedStudent ? String(selectedStudent.id) : ""}
                      onChange={(event) =>
                        replaceStudentInQuery({
                          pathname,
                          router,
                          searchParams,
                          studentId: Number(event.target.value),
                        })
                      }
                    >
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.full_name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <h2 className="parent-student-name">
                    {selectedStudent?.full_name ?? students[0].full_name}
                  </h2>
                )}

                <p className="parent-student-grade">
                  {studentPresentation?.gradeLabel ?? "Sınıf bilgisi"}
                </p>
              </div>
              <div className="parent-student-icon">OG</div>
            </div>
          ) : null}
        </section>

        <section className="parent-section">
          <div className="parent-section-header">
            <div>
              <h2 className="parent-section-title">Son Oturum</h2>
              <p className="parent-section-date">
                {latestSession ? latestSession.dateLabel : "Henüz oturum paylaşımı yok"}
              </p>
            </div>
            {latestSession ? (
              <span className="parent-attendance-chip">Katıldı</span>
            ) : null}
          </div>

          {selectedStudent && !isFeedLoading && !feedErrorMessage && latestSession ? (
            <div className="parent-stats-grid">
              <article className="parent-stat-card">
                <div className="parent-stat-icon">S</div>
                <strong>{studentPresentation?.latestDurationLabel ?? "45 dk"}</strong>
                <span>Süre</span>
              </article>
              <article className="parent-stat-card">
                <div className="parent-stat-icon">P</div>
                <strong>{latestSession.entries.length} paylaşım</strong>
                <span>Oturum içeriği</span>
              </article>
              <article className="parent-stat-card">
                <div className="parent-stat-icon">Ö</div>
                <strong>{studentPresentation?.teacherName ?? "Öğretmen"}</strong>
                <span>Oturum öğretmeni</span>
              </article>
            </div>
          ) : null}
        </section>

        <section className="parent-card-section">
          <div className="parent-card-label">OTURUM ÖZETİ</div>

          {isFeedLoading ? (
            <p className="status-note">Son oturum yükleniyor.</p>
          ) : null}

          {feedErrorMessage ? (
            <p className="form-error" role="alert">
              {feedErrorMessage}
            </p>
          ) : null}

          {!selectedStudent && !isStudentsLoading && !studentsErrorMessage ? (
            <p className="status-note">Öğrenci seçildiğinde oturum özeti burada görünür.</p>
          ) : null}

          {selectedStudent && !isFeedLoading && !feedErrorMessage && !latestSession ? (
            <p className="status-note">Bu öğrenci için henüz oturum paylaşımı bulunmuyor.</p>
          ) : null}

          {latestSummary ? <p className="parent-summary-text">{latestSummary}</p> : null}
        </section>

        <section className="parent-section">
          <h2 className="parent-section-title">Paylaşımlar</h2>

          {selectedStudent && !isFeedLoading && !feedErrorMessage && latestUpdates.length > 0 ? (
            <div className="parent-updates-list">
              {latestUpdates.map((entry, index) =>
                index === 0 ? (
                  <article className="parent-update-hero" key={entry.id}>
                    <div className="parent-update-art">
                      <span className="parent-update-badge">ETKİNLİK ANI</span>
                    </div>
                    <p className="parent-update-quote">
                      "{entry.body}"
                    </p>
                  </article>
                ) : (
                  <article className="parent-update-note" key={entry.id}>
                    <div className="parent-update-check">OK</div>
                    <p>{entry.body}</p>
                  </article>
                ),
              )}
            </div>
          ) : null}
        </section>

        <section className="parent-family-note">
          <h2 className="parent-family-title">Aile İçin Not</h2>
          <p className="parent-family-text">
            {selectedStudent && latestSession && studentPresentation
              ? studentPresentation.familyNote
              : "Yeni bir oturum paylaşıldığında aile notu burada görünecek."}
          </p>
        </section>

        <section className="parent-section">
          <h2 className="parent-section-title">Geçmiş Oturumlar</h2>

          {!selectedStudent && !isStudentsLoading && !studentsErrorMessage ? (
            <p className="status-note">Geçmiş oturumları görmek için önce öğrenci seçin.</p>
          ) : null}

          {selectedStudent && !isFeedLoading && !feedErrorMessage && pastSessions.length === 0 ? (
            <p className="status-note">Geçmiş oturum bulunmuyor.</p>
          ) : null}

          {pastSessions.length > 0 ? (
            <div className="parent-past-list">
              {pastSessions.map((session) => (
                <article className="parent-past-card" key={session.dateKey}>
                  <div className="parent-past-row">
                    <div>
                      <h3 className="parent-past-date">{session.dateLabel}</h3>
                      <p className="parent-past-summary">
                        {buildPastSessionSummary(session)}
                      </p>
                    </div>
                    <span className="parent-past-link">İncele</span>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <nav className="parent-bottom-nav" aria-label="Alt sekmeler">
          <button className="parent-nav-item parent-nav-item-active" type="button">
            <span>Oturum</span>
          </button>
          <button className="parent-nav-item" type="button">
            <span>Geçmiş</span>
          </button>
          <button className="parent-nav-item" type="button">
            <span>Profil</span>
          </button>
        </nav>
      </div>
    </main>
  );
}

function replaceStudentInQuery({
  pathname,
  router,
  searchParams,
  studentId,
}: {
  pathname: string;
  router: ReturnType<typeof useRouter>;
  searchParams: ReturnType<typeof useSearchParams>;
  studentId: number;
}) {
  const params = new URLSearchParams(searchParams.toString());
  params.set("student_id", String(studentId));
  router.replace(`${pathname}?${params.toString()}`);
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

function groupEntriesByDate(entries: DailyFeedEntry[]): SessionGroup[] {
  const grouped = new Map<string, DailyFeedEntry[]>();

  for (const entry of entries) {
    const dateKey = entry.posted_at_utc.slice(0, 10);
    const existing = grouped.get(dateKey) ?? [];
    existing.push(entry);
    grouped.set(dateKey, existing);
  }

  return [...grouped.entries()]
    .sort((left, right) => right[0].localeCompare(left[0]))
    .map(([dateKey, sessionEntries]) => ({
      dateKey,
      dateLabel: formatTurkishDate(dateKey),
      entries: sessionEntries,
    }));
}

function getStudentPresentation(studentId: number): StudentPresentation {
  return studentPresentationCycle[(studentId - 1) % studentPresentationCycle.length];
}

function buildSessionSummary(session: SessionGroup, studentName: string) {
  const firstEntry = session.entries[0]?.body ?? "";
  const secondEntry = session.entries[1]?.body ?? "";

  if (!firstEntry) {
    return `${studentName} için bu oturuma ait özet henüz oluşmadı.`;
  }

  if (!secondEntry) {
    return `${studentName} ile yapılan bu oturumda öne çıkan gelişim notu şu şekilde paylaşıldı: ${firstEntry}`;
  }

  return `${studentName} ile yapılan bu oturumda öne çıkan iki başlık vardı: ${firstEntry} Ayrıca ${secondEntry.toLowerCase()}`;
}

function buildPastSessionSummary(session: SessionGroup) {
  const preview = session.entries[0]?.body ?? "Bu oturum için kısa not bulunmuyor.";
  return preview.length > 72 ? `${preview.slice(0, 69)}...` : preview;
}

function formatTurkishDate(dateLike: string) {
  const date = new Date(dateLike);

  if (Number.isNaN(date.getTime())) {
    return dateLike;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: "long",
  }).format(date);
}

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "VE";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
