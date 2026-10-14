import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import "./Attendance.css";

const API_URL = "http://localhost:5000/api/attendance";

function todayString() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function readArray(key) {
  if (!key) return [];
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function getStudentId(student) {
  return String(
    student?.studentId ??
      student?.student_id ??
      student?.studentIdNumber ??
      student?.rollNumber ??
      student?.registerNumber ??
      student?.rollNo ??
      student?.id ??
      ""
  ).trim();
}

function getRecordStudentId(record) {
  return String(
    record?.studentId ??
      record?.student_id ??
      record?.studentIdNumber ??
      record?.rollNumber ??
      record?.registerNumber ??
      ""
  ).trim();
}

function normalizeStatus(record) {
  const value = String(record?.status ?? record?.attendanceStatus ?? "")
    .trim()
    .toLowerCase();
  if (["present", "p", "late"].includes(value) || record?.present === true) return "Present";
  if (["absent", "a"].includes(value)) return "Absent";
  if (["leave", "on leave"].includes(value)) return "Leave";
  return "Unknown";
}

export default function Attendance() {
  const { user } = useAuth();
  const advisorId = user?.uid || user?.id || user?.email || "";
  const safeAdvisorId = String(advisorId).replace(/[^a-zA-Z0-9_-]/g, "_");
  const studentsKey = advisorId ? `smartclassroom_students_${safeAdvisorId}` : null;

  const [date, setDate] = useState(todayString());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [classroomStatus, setClassroomStatus] = useState("Unknown");
  const [activePeriod, setActivePeriod] = useState("Not available");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadAttendance = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);

    const registeredStudents = readArray(studentsKey);
    setStudents(registeredStudents);

    // Never show backend/demo attendance when this advisor has no registered students.
    if (!advisorId || registeredStudents.length === 0) {
      setRecords([]);
      setClassroomStatus("No student data");
      setActivePeriod("Not available");
      setLastUpdated(new Date());
      setError("");
      setLoading(false);
      return;
    }

    const allowedIds = new Set(
      registeredStudents.map((student) => getStudentId(student).toLowerCase()).filter(Boolean)
    );

    try {
      const response = await fetch(`${API_URL}?date=${encodeURIComponent(date)}`, {
        headers: { Accept: "application/json" },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);

      const apiRecords = Array.isArray(data.records) ? data.records : [];
      const filtered = apiRecords.filter((record) =>
        allowedIds.has(getRecordStudentId(record).toLowerCase())
      );

      setRecords(filtered);
      setClassroomStatus(data.classroomStatus || "Connected");
      setActivePeriod(data.activePeriod || "Not available");
      setLastUpdated(new Date());
      setError("");
    } catch (err) {
      setRecords([]);
      setClassroomStatus("Unavailable");
      setActivePeriod("Not available");
      setError(`${err.message}. Check that the backend attendance API is running.`);
    } finally {
      setLoading(false);
    }
  }, [advisorId, studentsKey, date]);

  useEffect(() => {
    const refresh = () => void loadAttendance(false);
    void loadAttendance(true);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("smartclassroom:dataUpdated", refresh);
    const timer = window.setInterval(refresh, 3000);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("smartclassroom:dataUpdated", refresh);
      window.clearInterval(timer);
    };
  }, [loadAttendance]);

  const summary = useMemo(() => {
    const presentIds = new Set(
      records.filter((r) => normalizeStatus(r) === "Present")
        .map((r) => getRecordStudentId(r).toLowerCase()).filter(Boolean)
    );
    const absentIds = new Set(
      records.filter((r) => normalizeStatus(r) === "Absent")
        .map((r) => getRecordStudentId(r).toLowerCase()).filter(Boolean)
    );
    return {
      totalStudents: students.length,
      presentCount: presentIds.size,
      absentCount: absentIds.size,
    };
  }, [students, records]);

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((record) => {
      const studentName = String(record.studentName || record.student_name || "");
      const id = getRecordStudentId(record);
      const subject = String(record.subject || "");
      const matchesSearch = `${studentName} ${id} ${subject}`.toLowerCase().includes(q);
      const status = normalizeStatus(record);
      return matchesSearch && (statusFilter === "All" || status === statusFilter);
    });
  }, [records, search, statusFilter]);

  async function deleteHistory() {
    if (!window.confirm(`Delete backend attendance history for ${date}? This cannot be undone.`)) return;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/history?date=${encodeURIComponent(date)}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || `Delete failed (${response.status})`);
      await loadAttendance(true);
      window.alert(data.message || "Attendance history deleted.");
    } catch (err) {
      setError(err.message || "Unable to delete attendance history.");
    } finally {
      setDeleting(false);
    }
  }

  function exportCSV() {
    const columns = [
      ["Student ID", "studentId"],
      ["Student Name", "studentName"],
      ["Subject", "subject"],
      ["Period", "period"],
      ["Time", "timestamp"],
      ["Status", "status"],
    ];
    const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [
      columns.map(([label]) => quote(label)).join(","),
      ...filteredRecords.map((record) =>
        columns.map(([, key]) => {
          const aliases = {
            studentId: record.studentId ?? record.student_id ?? getRecordStudentId(record),
            studentName: record.studentName ?? record.student_name,
            timestamp: record.timestamp ?? record.time,
            status: normalizeStatus(record),
          };
          return quote(aliases[key] ?? record[key] ?? "");
        }).join(",")
      ),
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="attendance-page">
      {error && <div className="attendance-alert" role="alert"><strong>Unable to load attendance</strong><p>{error}</p></div>}
      <div className="attendance-refresh-row">
        <button className="attendance-button attendance-button-primary" onClick={() => loadAttendance(true)} disabled={loading}>↻ Refresh</button>
      </div>

      <section className="attendance-stats">
        <article className="attendance-stat"><span className="attendance-stat-icon blue">♙</span><p>Total Students</p><strong>{summary.totalStudents}</strong><small>Registered by this advisor</small></article>
        <article className="attendance-stat"><span className="attendance-stat-icon green">✓</span><p>Present</p><strong>{summary.presentCount}</strong><small>Recorded for selected date</small></article>
        <article className="attendance-stat"><span className="attendance-stat-icon orange">◷</span><p>Absent</p><strong>{summary.absentCount}</strong><small>Explicit absent records only</small></article>
        <article className="attendance-stat"><span className="attendance-stat-icon purple">▣</span><p>Attendance Rate</p><strong>{summary.totalStudents ? `${Math.round((summary.presentCount / summary.totalStudents) * 100)}%` : "0%"}</strong><small>For the selected date</small></article>
      </section>

      <section className="attendance-classroom">
        <div className="attendance-camera-icon">▣</div>
        <div className="attendance-classroom-info"><h2>Classroom Smart Board</h2><p>Camera recognition and automatic attendance status</p><div className="attendance-live-line"><span className="attendance-live-dot" /><span>Refreshes automatically every 3 seconds</span></div></div>
        <div className="attendance-classroom-meta"><span className="attendance-label">Camera / Service</span><strong>{classroomStatus}</strong><span className="attendance-label">Active Period</span><strong>{activePeriod}</strong></div>
      </section>

      <section className="attendance-records">
        <div className="attendance-records-heading"><div><h2>Attendance Records</h2><p>Only records matching this advisor's registered students are shown.</p></div><div className="attendance-actions"><button className="attendance-button" onClick={exportCSV} disabled={!filteredRecords.length}>↓ Export CSV</button><button className="attendance-button attendance-button-danger" onClick={deleteHistory} disabled={deleting || !records.length}>{deleting ? "Deleting..." : "Delete History"}</button></div></div>
        <div className="attendance-filters">
          <label className="attendance-search"><span>⌕</span><input type="search" placeholder="Search student, ID or subject..." value={search} onChange={(e) => setSearch(e.target.value)} /></label>
          <label className="attendance-filter-control"><span>Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label className="attendance-filter-control"><span>Status</span><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="All">All statuses</option><option value="Present">Present</option><option value="Absent">Absent</option><option value="Leave">Leave</option></select></label>
        </div>
        <div className="attendance-table-wrap"><table className="attendance-table"><thead><tr><th>STUDENT</th><th>SUBJECT</th><th>PERIOD</th><th>TIME</th><th>STATUS</th></tr></thead><tbody>
          {loading ? <tr><td colSpan="5" className="attendance-empty">Loading attendance records...</td></tr> : filteredRecords.length === 0 ? <tr><td colSpan="5" className="attendance-empty">{students.length === 0 ? "No students registered for this advisor." : "No attendance records found for this date and filters."}</td></tr> : filteredRecords.map((record, index) => {
            const name = record.studentName || record.student_name || "Unknown student";
            const id = getRecordStudentId(record);
            const status = normalizeStatus(record);
            return <tr key={record.id || `${id}-${index}`}><td><div className="attendance-student"><span className="attendance-avatar">{name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><span><strong>{name}</strong><small>{id}</small></span></div></td><td>{record.subject || "—"}</td><td>{record.period || "—"}</td><td>{record.timestamp || record.time ? new Date(record.timestamp || record.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td><td><span className={`attendance-status ${status.toLowerCase() === "present" ? "is-present" : status.toLowerCase() === "absent" ? "is-absent" : "is-unknown"}`}>{status}</span></td></tr>;
          })}
        </tbody></table></div>
        <footer className="attendance-table-footer"><span>{filteredRecords.length} record(s)</span><span>{lastUpdated ? `Last updated at ${lastUpdated.toLocaleTimeString()}` : "Waiting for data"}</span></footer>
      </section>
      <p className="attendance-note">Attendance records are loaded from the backend and filtered against the logged-in advisor's student list.</p>
    </main>
  );
}
