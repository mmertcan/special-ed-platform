"use client";

import { useEffect, useMemo, useState } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { ApiError, apiRequest, buildApiUrl } from "../lib/api";
import type {
  DailyFeedEntry,
  DailyFeedResponse,
  MeStudentsResponse,
  ViewerStudent,
} from "../lib/types";
import { useAuth } from "./auth-provider";

type StudentPresentation = {
  gradeLabel: string;
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
    latestDurationLabel: "1 saat",
  },
  {
    gradeLabel: "2. Sınıf",
    latestDurationLabel: "50 dk",
  },
  {
    gradeLabel: "3. Sınıf",
    latestDurationLabel: "45 dk",
  },
];

export function ParentFeedPanel() {
  const { currentUser, logout, token } = useAuth();
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutErrorMessage, setLogoutErrorMessage] = useState<string | null>(null);
  const [studentsReloadNonce, setStudentsReloadNonce] = useState(0);
  const [feedReloadNonce, setFeedReloadNonce] = useState(0);
  const [isLatestSessionExpanded, setIsLatestSessionExpanded] = useState(false);
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
  }, [studentsReloadNonce, token]);

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
  }, [feedReloadNonce, selectedStudent, token]);

  const sessions = useMemo(() => groupEntriesByDate(entries), [entries]);
  const latestSession = sessions[0] ?? null;
  const pastSessions = sessions.slice(1);
  const studentPresentation = selectedStudent
    ? getStudentPresentation(selectedStudent.id)
    : null;
  const latestVisibleUpdates = latestSession?.entries.slice(0, 3) ?? [];
  const latestHiddenUpdates = latestSession?.entries.slice(3) ?? [];
  const latestUpdates = isLatestSessionExpanded
    ? [...latestVisibleUpdates, ...latestHiddenUpdates]
    : latestVisibleUpdates;
  const latestTeacherName = latestSession
    ? getLatestTeacherName(latestSession)
    : null;
  const headerInitials = getInitials(currentUser?.full_name ?? "Veli");

  useEffect(() => {
    setIsLatestSessionExpanded(false);
  }, [selectedStudentId, latestSession?.dateKey]);

  const retryStudentsLoad = () => {
    setStudentsReloadNonce((currentValue) => currentValue + 1);
  };

  const retryFeedLoad = () => {
    setFeedReloadNonce((currentValue) => currentValue + 1);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutErrorMessage(null);

    try {
      await logout();
      router.replace("/login");
    } catch {
      setLogoutErrorMessage("Çıkış sırasında bir sorun oldu. Oturum yine de kapatıldı.");
      router.replace("/login");
    } finally {
      setIsLoggingOut(false);
      setIsMenuOpen(false);
    }
  };

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
          <div className="parent-menu-wrap">
            <button
              className="parent-menu-button"
              type="button"
              aria-label="Menü"
              aria-expanded={isMenuOpen}
              onClick={() => {
                setIsMenuOpen((currentValue) => !currentValue);
                setLogoutErrorMessage(null);
              }}
            >
              •••
            </button>
            {isMenuOpen ? (
              <div className="parent-menu-panel">
                <p className="parent-menu-label">Hesap</p>
                <p className="parent-menu-name">{currentUser?.full_name ?? "Veli"}</p>
                <p className="parent-menu-email">
                  {currentUser?.email ?? "Hesap bilgisi yok"}
                </p>
                <button
                  className="parent-menu-action"
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? "Çıkış yapılıyor..." : "Çıkış yap"}
                </button>
                {logoutErrorMessage ? (
                  <p className="form-error" role="alert">
                    {logoutErrorMessage}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </header>

        <section className="parent-student-card">
          <div className="parent-section-label">Öğrenci</div>

          {isStudentsLoading ? (
            <p className="status-note">Öğrenciler yükleniyor.</p>
          ) : null}

          {studentsErrorMessage ? (
            <div className="stack">
              <p className="form-error" role="alert">
                {studentsErrorMessage}
              </p>
              <button
                className="button-secondary"
                type="button"
                onClick={retryStudentsLoad}
              >
                Tekrar dene
              </button>
            </div>
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
                <strong>{latestTeacherName ?? "Öğretmen bilgisi yok"}</strong>
                <span>Oturum öğretmeni</span>
              </article>
            </div>
          ) : null}
        </section>

        <section className="parent-section">
          <h2 className="parent-section-title">Paylaşımlar</h2>

          {isFeedLoading ? (
            <p className="status-note">Son oturum yükleniyor.</p>
          ) : null}

          {feedErrorMessage ? (
            <div className="stack">
              <p className="form-error" role="alert">
                {feedErrorMessage}
              </p>
              <button
                className="button-secondary"
                type="button"
                onClick={retryFeedLoad}
              >
                Tekrar dene
              </button>
            </div>
          ) : null}

          {!selectedStudent && !isStudentsLoading && !studentsErrorMessage ? (
            <p className="status-note">Öğrenci seçildiğinde paylaşımlar burada görünür.</p>
          ) : null}

          {selectedStudent && !isFeedLoading && !feedErrorMessage && !latestSession ? (
            <p className="status-note">Bu öğrenci için henüz oturum paylaşımı bulunmuyor.</p>
          ) : null}

          {selectedStudent && !isFeedLoading && !feedErrorMessage && latestUpdates.length > 0 ? (
            <div className="parent-updates-list">
              {latestUpdates.map((entry, index) =>
                index === 0 ? (
                  <article className="parent-update-hero" key={entry.id}>
                    <div className="parent-update-art">
                      <span className="parent-update-badge">ETKİNLİK ANI</span>
                    </div>
                    <div className="parent-update-content">
                      <p className="parent-update-quote">
                        "{entry.body}"
                      </p>
                      {entry.media_items && entry.media_items.length > 0 ? (
                        <div className="parent-update-media-list">
                          {entry.media_items.map((mediaItem) => (
                            <a
                              key={mediaItem.id}
                              href={buildApiUrl(`/uploads/${mediaItem.storage_key}`)}
                              target="_blank"
                              rel="noreferrer"
                              className="parent-update-media-link"
                            >
                              <img
                                className="parent-update-media-image"
                                src={buildApiUrl(`/uploads/${mediaItem.storage_key}`)}
                                alt={`${selectedStudent?.full_name ?? "Öğrenci"} oturum görseli`}
                              />
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </article>
                ) : (
                  <article className="parent-update-note" key={entry.id}>
                    <div className="parent-update-check">OK</div>
                    <div className="parent-update-note-copy">
                      <p>{entry.body}</p>
                      {entry.media_items && entry.media_items.length > 0 ? (
                        <div className="parent-update-media-list">
                          {entry.media_items.map((mediaItem) => (
                            <a
                              key={mediaItem.id}
                              href={buildApiUrl(`/uploads/${mediaItem.storage_key}`)}
                              target="_blank"
                              rel="noreferrer"
                              className="parent-update-media-link"
                            >
                              <img
                                className="parent-update-media-image"
                                src={buildApiUrl(`/uploads/${mediaItem.storage_key}`)}
                                alt={`${selectedStudent?.full_name ?? "Öğrenci"} oturum görseli`}
                              />
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </article>
                ),
              )}

              {latestHiddenUpdates.length > 0 ? (
                <div className="parent-more-updates">
                  <button
                    className="parent-more-button"
                    type="button"
                    onClick={() =>
                      setIsLatestSessionExpanded((currentValue) => !currentValue)
                    }
                  >
                    {isLatestSessionExpanded
                      ? "Daha az paylaşım göster"
                      : `${latestHiddenUpdates.length} paylaşımı daha göster`}
                  </button>
                  <p className="parent-more-note">
                    {isLatestSessionExpanded
                      ? "Bu oturumdaki tüm paylaşımlar açık."
                      : "Aynı gün içindeki daha eski paylaşımları ve fotoğrafları görmek için açın."}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
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
          <button
            className="parent-nav-item"
            type="button"
            onClick={() => {
              setIsMenuOpen(true);
              setLogoutErrorMessage(null);
            }}
          >
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

function getLatestTeacherName(session: SessionGroup) {
  const latestNamedEntry = session.entries.find((entry) => entry.author_full_name);
  return latestNamedEntry?.author_full_name ?? null;
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
