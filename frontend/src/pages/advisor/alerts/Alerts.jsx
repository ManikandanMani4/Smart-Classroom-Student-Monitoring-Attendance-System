
  import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../context/AuthContext";

  const ALERTS_KEY = "smartclassroom_Alerts";
  const STUDENTS_KEY = "smartclassroom_students";
  const ATTENDANCE_KEY = "smartclassroom_attendance";
  const API_BASE_URL = "http://localhost:5000";
  const DEFAULT_CLASS_NAME = "III IT - B";
  const CLASS_NAME = DEFAULT_CLASS_NAME;
  const ATTENDANCE_LIMIT = 75;

  const styles = {
    page: {
      padding: "24px",
      background: "#f5f7fb",
      minHeight: "100vh",
      color: "#172033",
      fontFamily: "Arial, sans-serif",
    },
    card: {
      background: "#fff",
      borderRadius: "14px",
      padding: "20px",
      boxShadow: "0 3px 15px rgba(0,0,0,0.04)",
      border: "1px solid #e8edf4",
    },
    input: {
      padding: "11px 13px",
      border: "1px solid #d9e0ea",
      borderRadius: "9px",
      fontSize: "14px",
      background: "#fff",
      color: "#172033",
      minWidth: "0",
    },
    button: {
      padding: "9px 13px",
      borderRadius: "8px",
      border: "1px solid #d9e0ea",
      background: "#fff",
      cursor: "pointer",
      fontSize: "13px",
      fontWeight: 600,
      color: "#334155",
    },
  };

  function readStorage(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function getArray(key) {
    const value = readStorage(key, []);
    return Array.isArray(value) ? value : [];
  }

  function getStudentName(student) {
    return (
      student.name ||
      student.studentName ||
      student.fullName ||
      student.rollNumber ||
      student.rollNo ||
      "Unknown student"
    );
  }

  function getStudentId(student) {
    return String(
      student.id ??
      student.studentId ??
      student.rollNumber ??
      student.rollNo ??
      ""
    );
  }

  function getStudentClass(student) {
    return (
      student.className ||
      student.class ||
      student.assignedClass ||
      ""
    );
  }

  function getDate(value) {
    if (!value) return new Date().toISOString().slice(0, 10);
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? String(value).slice(0, 10)
      : date.toISOString().slice(0, 10);
  }

  function getAttendanceStats(student, records) {
    const studentId = getStudentId(student);
    const studentName = getStudentName(student).toLowerCase();

    const matching = records.filter((record) => {
      const recordId = String(
        record.studentId ??
        record.student_id ??
        record.id ??
        ""
      );

      const recordName = String(
        record.studentName ??
        record.name ??
        ""
      ).toLowerCase();

      return (
        (studentId && recordId === studentId) ||
        recordName === studentName
      );
    });

    // Support attendance records stored as a list of daily entries.
    const present = matching.filter((record) => {
      const status = String(
        record.status ?? record.attendanceStatus ?? ""
      ).toLowerCase();

      return ["present", "p", "late"].includes(status);
    }).length;

    const absent = matching.filter((record) => {
      const status = String(
        record.status ?? record.attendanceStatus ?? ""
      ).toLowerCase();

      return ["absent", "a"].includes(status);
    }).length;

    const total = matching.filter((record) => {
      const status = String(
        record.status ?? record.attendanceStatus ?? ""
      ).toLowerCase();

      return ["present", "p", "late", "absent", "a"].includes(status);
    }).length;

    return {
      present,
      absent,
      total,
      percentage: total
        ? Math.round((present / total) * 100)
        : null,
    };
  }

  function buildAlerts(students, attendance) {
    const generated = [];

    students
      .filter((student) => getStudentClass(student) === CLASS_NAME)
      .forEach((student) => {
        const stats = getAttendanceStats(student, attendance);
        const id = getStudentId(student);
        const name = getStudentName(student);

        if (stats.percentage !== null &&
            stats.percentage < ATTENDANCE_LIMIT) {
          generated.push({
            id: `low-attendance-${id}`,
            studentId: id,
            studentName: name,
            type: "Low Attendance",
            severity: stats.percentage < 50 ? "High" : "Medium",
            message: `Attendance is ${stats.percentage}%, below the required ${ATTENDANCE_LIMIT}%.`,
            date: new Date().toISOString(),
          });
        }

        if (stats.absent >= 3) {
          generated.push({
            id: `absence-${id}`,
            studentId: id,
            studentName: name,
            type: "Repeated Absence",
            severity: stats.absent >= 5 ? "High" : "Medium",
            message: `The student has ${stats.absent} recorded absences.`,
            date: new Date().toISOString(),
          });
        }
      });

    return generated;
  }

  export default function Alerts() {
    const { user } = useAuth();
    const advisorId = String(user?.uid || "").trim();
    const assignedClassId = String(user?.assignedClassId || "").trim();
    const className = String(user?.className || user?.assignedClassName || DEFAULT_CLASS_NAME).trim();
    const [backendAlerts, setBackendAlerts] = useState([]);
    const [backendError, setBackendError] = useState("");
    const [students, setStudents] = useState(() =>
      getArray(STUDENTS_KEY)
    );
    const [attendance, setAttendance] = useState(() =>
      getArray(ATTENDANCE_KEY)
    );
    const [savedAlerts, setSavedAlerts] = useState(() =>
      getArray(ALERTS_KEY)
    );
    const [search, setSearch] = useState("");
    const [severity, setSeverity] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");
    const [typeFilter, setTypeFilter] = useState("All");

    useEffect(() => {
      let cancelled = false;

      const refreshLocalData = () => {
        setStudents(getArray(STUDENTS_KEY));
        setAttendance(getArray(ATTENDANCE_KEY));
        setSavedAlerts(getArray(ALERTS_KEY));
      };

      const refreshBackendAlerts = async () => {
        if (!advisorId) {
          setBackendAlerts([]);
          setBackendError("Your advisor account could not be identified. Please sign in again.");
          return;
        }

        try {
          const params = new URLSearchParams({ advisorId });
          if (assignedClassId) params.set("classId", assignedClassId);
          const response = await fetch(`${API_BASE_URL}/api/alerts?${params.toString()}`);
          const data = await response.json();
          if (!response.ok || data.success === false) {
            throw new Error(data.message || "Could not load classroom alerts.");
          }
          if (!cancelled) {
            const normalized = (Array.isArray(data.alerts) ? data.alerts : []).map((item) => ({
              ...item,
              source: "backend",
              type: item.type === "WRONG_CLASSROOM_DETECTED"
                ? (item.title || "Wrong Classroom")
                : item.type === "UNKNOWN_PERSON_DETECTED"
                ? "Unknown Person Detected"
                : (item.title || item.type || "Notification"),
              severity: String(item.severity || "medium").toLowerCase() === "high"
                ? "High"
                : String(item.severity || "medium").toLowerCase() === "low" ? "Low" : "Medium",
              date: item.createdAt || item.date,
              read: String(item.status || "unread").toLowerCase() === "read",
              dismissed: String(item.status || "").toLowerCase() === "dismissed",
              message: [
                item.studentId ? `Student ID: ${item.studentId}` : "",
                item.registeredClassName ? `Registered class: ${item.registeredClassName}` : "",
                item.detectedClassName ? `Detected classroom: ${item.detectedClassName}` : (item.location ? `Location: ${item.location}` : "")
              ].filter(Boolean).join(" • ") || item.title || "Classroom alert detected."
            }));
            setBackendAlerts(normalized);
            setBackendError("");
          }
        } catch (error) {
          if (!cancelled) setBackendError(error.message || "Could not connect to the SmartClassroom backend.");
        }
      };

      const refresh = () => {
        refreshLocalData();
        refreshBackendAlerts();
      };

      refresh();
      const intervalId = window.setInterval(refreshBackendAlerts, 10000);
      window.addEventListener("storage", refreshLocalData);
      window.addEventListener("focus", refresh);

      return () => {
        cancelled = true;
        window.clearInterval(intervalId);
        window.removeEventListener("storage", refreshLocalData);
        window.removeEventListener("focus", refresh);
      };
    }, [advisorId, assignedClassId]);

    const alerts = useMemo(() => {
      const generated = buildAlerts(students, attendance);
      const existingById = new Map(
        savedAlerts.map((alert) => [String(alert.id), alert])
      );

      // Keep read/dismiss status for generated alerts.
      const mergedGenerated = generated.map((alert) => ({
        ...alert,
        ...(existingById.get(alert.id) || {}),
      }));

      // Keep manually created alerts, but do not duplicate generated ones.
      const generatedIds = new Set(generated.map((alert) => alert.id));
      const manualAlerts = savedAlerts.filter(
        (alert) =>
          !generatedIds.has(String(alert.id)) &&
          !String(alert.id).startsWith("low-attendance-") &&
          !String(alert.id).startsWith("absence-")
      );

      const localAlerts = [...mergedGenerated, ...manualAlerts];
      const localVisible = localAlerts.filter((alert) => !alert.dismissed);
      const serverVisible = backendAlerts.filter((alert) => !alert.dismissed);
      const all = [...serverVisible, ...localVisible];
      const seen = new Set();
      return all.filter((alert) => {
        const key = String(alert.id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }, [students, attendance, savedAlerts, backendAlerts]);

    function persistAlerts(nextAlerts) {
      setSavedAlerts(nextAlerts);
      localStorage.setItem(ALERTS_KEY, JSON.stringify(nextAlerts));
    }

    async function updateAlert(alertId, changes) {
      const target = alerts.find((alert) => String(alert.id) === String(alertId));
      if (target?.source === "backend") {
        const status = changes.dismissed ? "dismissed" : changes.read ? "read" : "unread";
        try {
          const response = await fetch(`${API_BASE_URL}/api/alerts/${encodeURIComponent(alertId)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status })
          });
          const data = await response.json();
          if (!response.ok || data.success === false) {
            throw new Error(data.message || "Could not update this alert.");
          }
          setBackendAlerts((current) => current.map((alert) =>
            String(alert.id) === String(alertId)
              ? { ...alert, status, read: status === "read", dismissed: status === "dismissed" }
              : alert
          ));
        } catch (error) {
          setBackendError(error.message || "Could not update this alert.");
        }
        return;
      }

      const current = getArray(ALERTS_KEY);
      const exists = current.some((alert) => String(alert.id) === String(alertId));
      const next = exists
        ? current.map((alert) => String(alert.id) === String(alertId) ? { ...alert, ...changes } : alert)
        : [...current, { ...(target || { id: alertId }), ...changes }];
      persistAlerts(next);
    }

    const visibleAlerts = alerts.filter((alert) => {
      const query = search.toLowerCase();

      const matchesSearch =
        String(alert.studentName || "").toLowerCase().includes(query) ||
        String(alert.message || "").toLowerCase().includes(query) ||
        String(alert.studentId || "").toLowerCase().includes(query);

      const matchesSeverity =
        severity === "All" || alert.severity === severity;

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Unread" && !alert.read) ||
        (statusFilter === "Read" && alert.read);

      const matchesType =
        typeFilter === "All" || alert.type === typeFilter;

      return (
        matchesSearch &&
        matchesSeverity &&
        matchesStatus &&
        matchesType
      );
    });

    const unreadCount = alerts.filter((alert) => !alert.read).length;
    const highCount = alerts.filter(
      (alert) => alert.severity === "High"
    ).length;

    async function markAllRead() {
      const localNext = [...savedAlerts];
      alerts.filter((alert) => alert.source !== "backend").forEach((alert) => {
        const index = localNext.findIndex((item) => String(item.id) === String(alert.id));
        if (index >= 0) localNext[index] = { ...localNext[index], read: true };
        else localNext.push({ ...alert, read: true });
      });
      persistAlerts(localNext);

      const unreadBackend = alerts.filter((alert) => alert.source === "backend" && !alert.read);
      await Promise.all(unreadBackend.map((alert) => updateAlert(alert.id, { read: true })));
    }

    return (
      <main style={styles.page}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 24,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>
              Alerts & Notifications
            </h1>
            <p style={{ color: "#64748b", marginBottom: 0 }}>
              Monitor attendance and classroom alerts for {className}.
            </p>
          </div>

          <button style={styles.button} onClick={markAllRead}>
            Mark all as read
          </button>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {[
            ["Total Active Alerts", alerts.length, "#2563eb"],
            ["Unread Alerts", unreadCount, "#d97706"],
            ["High Severity", highCount, "#dc2626"],
          ].map(([label, value, color]) => (
            <div key={label} style={styles.card}>
              <p style={{ color: "#64748b", margin: "0 0 10px" }}>
                {label}
              </p>
              <strong style={{ fontSize: 30, color }}>{value}</strong>
            </div>
          ))}
        </section>

        <section style={styles.card}>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 20,
            }}
          >
            <input
              aria-label="Search alerts"
              placeholder="Search student or alert..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ ...styles.input, flex: "1 1 220px" }}
            />

            <select
              aria-label="Filter by severity"
              value={severity}
              onChange={(event) => setSeverity(event.target.value)}
              style={styles.input}
            >
              <option value="All">All severities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={styles.input}
            >
              <option value="All">All statuses</option>
              <option value="Unread">Unread</option>
              <option value="Read">Read</option>
            </select>

            <select
              aria-label="Filter by alert type"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              style={styles.input}
            >
              <option value="All">All types</option>
              <option value="Low Attendance">Low Attendance</option>
              <option value="Repeated Absence">Repeated Absence</option>
              <option value="Student Detected in Wrong Classroom">Student Detected in Wrong Classroom</option>
              <option value="Student Detected in Another Classroom">Student Detected in Another Classroom</option>
              <option value="Unknown Person Detected">Unknown Person Detected</option>
            </select>
          </div>

          {backendError && (
            <p role="alert" style={{ color: "#b45309", margin: "0 0 14px" }}>
              {backendError} Make sure the backend is running at {API_BASE_URL}.
            </p>
          )}

          {visibleAlerts.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "55px 15px",
                color: "#64748b",
              }}
            >
              <div style={{ fontSize: 42, marginBottom: 12 }}>🔔</div>
              <h3 style={{ color: "#172033" }}>No alerts found</h3>
              <p>
                No alerts match these filters. Attendance alerts use saved records, and classroom alerts come from the backend.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {visibleAlerts.map((alert) => {
                const color =
                  alert.severity === "High"
                    ? "#dc2626"
                    : alert.severity === "Medium"
                    ? "#d97706"
                    : "#2563eb";

                return (
                  <article
                    key={alert.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderLeft: `4px solid ${color}`,
                      borderRadius: 10,
                      padding: 16,
                      background: alert.read ? "#fff" : "#f8fbff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: "1 1 250px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                            marginBottom: 8,
                          }}
                        >
                          <strong>{alert.title || alert.type || "Notification"}</strong>
                          <span
                            style={{
                              color,
                              background: `${color}15`,
                              padding: "4px 8px",
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {alert.severity || "Medium"}
                          </span>
                          {!alert.read && (
                            <span
                              style={{
                                color: "#2563eb",
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              NEW
                            </span>
                          )}
                        </div>

                        <div style={{ fontWeight: 600 }}>
                          {alert.studentName || "General alert"}
                        </div>

                        <p
                          style={{
                            margin: "7px 0",
                            color: "#64748b",
                            lineHeight: 1.5,
                          }}
                        >
                          {alert.message}
                        </p>

                        <small style={{ color: "#94a3b8" }}>
                          {alert.date
                            ? new Date(alert.date).toLocaleString()
                            : "Date unavailable"}
                        </small>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          style={styles.button}
                          onClick={() =>
                            updateAlert(alert.id, { read: !alert.read })
                          }
                        >
                          {alert.read ? "Mark unread" : "Mark read"}
                        </button>

                        <button
                          style={{
                            ...styles.button,
                            color: "#dc2626",
                          }}
                          onClick={() =>
                            updateAlert(alert.id, {
                              dismissed: true,
                              dismissedAt: new Date().toISOString(),
                            })
                          }
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <p style={{ color: "#64748b", fontSize: 12, marginTop: 16 }}>
          Attendance alerts use a {ATTENDANCE_LIMIT}% threshold. Classroom alerts are refreshed from the backend every 10 seconds.
        </p>
      </main>
    );
  }
