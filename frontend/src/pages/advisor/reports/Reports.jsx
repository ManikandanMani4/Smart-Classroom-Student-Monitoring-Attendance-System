import { useEffect, useMemo, useState } from "react";

const STUDENTS_KEY = "smartclassroom_students";
const ATTENDANCE_KEY = "smartclassroom_attendance";
const CLASS_NAME = "III IT - B";
const ATTENDANCE_API = "http://localhost:5000/api/attendance";

const styles = {
  page: {
    boxSizing: "border-box",
    width: "100%",
    minHeight: "100vh",
    padding: "24px",
    background: "#f5f7fb",
    color: "#172033",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    background: "#fff",
    padding: "20px",
    borderRadius: "14px",
    border: "1px solid #e5eaf1",
    boxShadow: "0 3px 12px rgba(0,0,0,0.03)",
    minWidth: 0,
  },
  input: {
    boxSizing: "border-box",
    padding: "10px 12px",
    border: "1px solid #d9e0ea",
    borderRadius: "8px",
    fontSize: "14px",
    background: "#fff",
    color: "#172033",
    minWidth: 0,
    width: "100%",
  },
  button: {
    padding: "10px 14px",
    border: "none",
    borderRadius: "8px",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
};

function readStorage(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function localDateString(date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function todayString() {
  return localDateString(new Date());
}

function studentId(student) {
  return String(
    student?.studentId ??
      student?.student_id ??
      student?.rollNumber ??
      student?.rollNo ??
      student?.id ??
      ""
  ).trim();
}

function studentName(student) {
  return (
    student?.name ||
    student?.studentName ||
    student?.student_name ||
    student?.fullName ||
    studentId(student) ||
    "Unknown Student"
  );
}

function recordStudentId(record) {
  return String(
    record?.studentId ?? record?.student_id ?? record?.rollNumber ?? record?.id ?? ""
  ).trim();
}

function recordStudentName(record) {
  return String(
    record?.studentName ?? record?.student_name ?? record?.name ?? ""
  ).trim();
}

function recordDate(record) {
  const value =
    record?.date || record?.attendanceDate || record?.timestamp || record?.createdAt;
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value).slice(0, 10) : localDateString(date);
}

function recordStatus(record) {
  const status = String(record?.status ?? record?.attendanceStatus ?? "")
    .trim()
    .toLowerCase();
  if (["present", "p", "late"].includes(status)) return "Present";
  if (["absent", "a"].includes(status)) return "Absent";
  if (["leave", "on leave"].includes(status)) return "Leave";
  return "Unknown";
}

function escapeCsv(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export default function Reports() {
  const [students, setStudents] = useState(() => readStorage(STUDENTS_KEY));
  const [attendance, setAttendance] = useState(() => readStorage(ATTENDANCE_KEY));

  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return localDateString(date);
  });
  const [endDate, setEndDate] = useState(todayString);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReportData() {
      setStudents(readStorage(STUDENTS_KEY));

      if (!startDate || !endDate || startDate > endDate) {
        setAttendance([]);
        setLoadError("Choose a valid date range.");
        return;
      }

      setLoading(true);
      setLoadError("");

      try {
        const dates = [];
        const cursor = new Date(`${startDate}T12:00:00`);
        const lastDate = new Date(`${endDate}T12:00:00`);

        while (cursor <= lastDate) {
          dates.push(
            `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(
              cursor.getDate()
            ).padStart(2, "0")}`
          );
          cursor.setDate(cursor.getDate() + 1);
        }

        const responses = await Promise.all(
          dates.map(async (date) => {
            const response = await fetch(
              `${ATTENDANCE_API}?date=${encodeURIComponent(date)}`
            );
            if (!response.ok) throw new Error(`Failed to load attendance for ${date}`);

            const data = await response.json();
            if (data.success === false) {
              throw new Error(data.message || `Failed to load ${date}`);
            }

            return (Array.isArray(data.records) ? data.records : []).map((record) => ({
              ...record,
              date: data.date || date,
            }));
          })
        );

        if (!cancelled) {
          const records = responses.flat();
          setAttendance(records);
          localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(records));
        }
      } catch (error) {
        console.error("Attendance report loading failed:", error);
        if (!cancelled) {
          const cached = readStorage(ATTENDANCE_KEY).filter((record) => {
            const date = recordDate(record);
            return date >= startDate && date <= endDate;
          });
          setAttendance(cached);
          setLoadError(
            "Could not connect to the attendance server. Showing saved attendance data."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const refresh = () => void loadReportData();
    void loadReportData();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("smartclassroom:dataUpdated", refresh);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("smartclassroom:dataUpdated", refresh);
    };
  }, [startDate, endDate]);

  const reportRows = useMemo(() => {
    const studentMap = new Map();

    students.forEach((student) => {
      const id = studentId(student);
      const name = studentName(student);
      if (id || name) {
        studentMap.set((id || name).toLowerCase(), {
          id: id || name,
          rollNumber: id,
          name,
        });
      }
    });

    attendance.forEach((record) => {
      const id = recordStudentId(record);
      const name = recordStudentName(record);
      const key = (id || name).toLowerCase();
      if (key && !studentMap.has(key)) {
        studentMap.set(key, { id: id || name, rollNumber: id, name: name || id });
      }
    });

    const countedRecords = attendance.filter((record) => {
      const date = recordDate(record);
      return date >= startDate && date <= endDate;
    });

    // A date is an attendance day only when the backend returned at least
    // one recognized attendance status for that date. Do not mark everyone
    // absent on dates with no attendance activity at all.
    const attendanceDays = new Set(
      countedRecords
        .filter((record) => recordStatus(record) !== "Unknown")
        .map((record) => recordDate(record))
        .filter(Boolean)
    );

    return Array.from(studentMap.values()).map((student) => {
      const keyId = String(student.rollNumber || student.id).trim().toLowerCase();
      const keyName = String(student.name).trim().toLowerCase();
      const records = countedRecords.filter((record) => {
        const recordId = recordStudentId(record).trim().toLowerCase();
        const recordName = recordStudentName(record).trim().toLowerCase();
        return (keyId && recordId === keyId) || (recordName && recordName === keyName);
      });

      // Keep one status per student per date. If attendance was recorded
      // for a date but this student has no record, count them as Absent.
      const perDay = new Map();
      records.forEach((record) => {
        const date = recordDate(record);
        const status = recordStatus(record);
        if (date && status !== "Unknown") perDay.set(date, status);
      });

      attendanceDays.forEach((date) => {
        if (!perDay.has(date)) perDay.set(date, "Absent");
      });

      const values = Array.from(perDay.values());
      const present = values.filter((status) => status === "Present").length;
      const absent = values.filter((status) => status === "Absent").length;
      const leave = values.filter((status) => status === "Leave").length;
      const counted = present + absent;
      const percentage = counted ? Math.round((present / counted) * 100) : null;

      return {
        ...student,
        present,
        absent,
        leave,
        percentage,
        status:
          percentage === null
            ? "No Data"
            : percentage < 75
              ? "Low Attendance"
              : "Good Attendance",
      };
    });
  }, [students, attendance, startDate, endDate]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reportRows.filter((row) => {
      const matchesSearch =
        !query ||
        row.name.toLowerCase().includes(query) ||
        String(row.rollNumber || "").toLowerCase().includes(query);
      const matchesStatus = statusFilter === "All" || row.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [reportRows, search, statusFilter]);

  const totalPresent = reportRows.reduce((sum, row) => sum + row.present, 0);
  const totalAbsent = reportRows.reduce((sum, row) => sum + row.absent, 0);
  const totalLeave = reportRows.reduce((sum, row) => sum + row.leave, 0);
  const countedTotal = totalPresent + totalAbsent;
  const overallPercentage = countedTotal
    ? Math.round((totalPresent / countedTotal) * 100)
    : null;
  const lowAttendanceCount = reportRows.filter(
    (row) => row.percentage !== null && row.percentage < 75
  ).length;

  const selectedDays =
    startDate && endDate && startDate <= endDate
      ? Math.floor(
          (new Date(`${endDate}T12:00:00`) - new Date(`${startDate}T12:00:00`)) /
            86400000
        ) + 1
      : 0;

  const statCards = [
    { title: "Total Students", value: reportRows.length, color: "#2563eb" },
    { title: "Present Entries", value: totalPresent, color: "#16a34a" },
    { title: "Absent Entries", value: totalAbsent, color: "#dc2626" },
    { title: "Leave Entries", value: totalLeave, color: "#d97706" },
    {
      title: "Overall Attendance",
      value: overallPercentage === null ? "—" : `${overallPercentage}%`,
      color: overallPercentage !== null && overallPercentage < 75 ? "#dc2626" : "#16a34a",
    },
  ];

  function exportCsv() {
    const header = [
      "Student",
      "Roll Number",
      "Present",
      "Absent",
      "Leave",
      "Attendance %",
      "Status",
    ];
    const lines = [
      header.map(escapeCsv).join(","),
      ...filteredRows.map((row) =>
        [
          row.name,
          row.rollNumber,
          row.present,
          row.absent,
          row.leave,
          row.percentage === null ? "" : `${row.percentage}%`,
          row.status,
        ]
          .map(escapeCsv)
          .join(",")
      ),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-report-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main style={styles.page}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Attendance Reports</h1>
          <p style={{ color: "#64748b", marginBottom: 0 }}>
            Student attendance summary for {CLASS_NAME}
          </p>
        </div>
        <button style={styles.button} onClick={exportCsv} disabled={loading}>
          Export CSV
        </button>
      </header>

      {loadError && (
        <p
          role="alert"
          style={{
            padding: 12,
            background: "#fff7ed",
            color: "#9a3412",
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          {loadError}
        </p>
      )}

      <section
        style={{
          ...styles.card,
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          alignItems: "end",
          marginBottom: 20,
        }}
      >
        <label style={{ display: "grid", gap: 7, flex: "1 1 150px" }}>
          <span style={{ fontSize: 13, color: "#64748b" }}>From date</span>
          <input
            type="date"
            value={startDate}
            max={endDate || todayString()}
            onChange={(event) => setStartDate(event.target.value)}
            style={styles.input}
          />
        </label>
        <label style={{ display: "grid", gap: 7, flex: "1 1 150px" }}>
          <span style={{ fontSize: 13, color: "#64748b" }}>To date</span>
          <input
            type="date"
            value={endDate}
            min={startDate}
            max={todayString()}
            onChange={(event) => setEndDate(event.target.value)}
            style={styles.input}
          />
        </label>
        <button
          style={styles.button}
          onClick={() => {
            const date = new Date();
            date.setDate(date.getDate() - 6);
            setStartDate(localDateString(date));
            setEndDate(todayString());
          }}
        >
          Last 7 Days
        </button>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 16,
          marginBottom: 22,
        }}
      >
        {statCards.map((card) => (
          <div key={card.title} style={styles.card}>
            <p style={{ color: "#64748b", margin: "0 0 10px" }}>{card.title}</p>
            <strong style={{ fontSize: 29, color: card.color }}>{card.value}</strong>
          </div>
        ))}
      </section>

      <section style={{ ...styles.card, marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Attendance Overview</h3>
        {loading ? (
          <p style={{ color: "#64748b" }}>Loading attendance records...</p>
        ) : overallPercentage === null ? (
          <p style={{ color: "#64748b" }}>
            No counted attendance records were found for this date range.
          </p>
        ) : (
          <>
            <div
              style={{
                height: 12,
                background: "#e5e7eb",
                borderRadius: 20,
                overflow: "hidden",
                margin: "16px 0 8px",
              }}
            >
              <div
                style={{
                  width: `${overallPercentage}%`,
                  height: "100%",
                  background: overallPercentage < 75 ? "#dc2626" : "#16a34a",
                  borderRadius: 20,
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                color: "#64748b",
                fontSize: 13,
              }}
            >
              <span>{overallPercentage}% attendance</span>
              <span>{lowAttendanceCount} students below 75%</span>
            </div>
          </>
        )}
      </section>

      <section style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Student-wise Report</h3>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <input
            placeholder="Search student or roll number..."
            aria-label="Search students"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ ...styles.input, flex: "1 1 220px" }}
          />
          <select
            aria-label="Filter attendance"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            style={{ ...styles.input, width: "auto", flex: "0 1 200px" }}
          >
            <option value="All">All students</option>
            <option value="Good Attendance">75% and above</option>
            <option value="Low Attendance">Below 75%</option>
            <option value="No Data">No attendance data</option>
          </select>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720, fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                {["Student", "Roll Number", "Present", "Absent", "Leave", "Attendance", "Status"].map(
                  (heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: 13,
                        borderBottom: "1px solid #e5e7eb",
                        color: "#475569",
                      }}
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id || row.rollNumber || row.name}>
                  <td style={{ padding: 13, borderBottom: "1px solid #edf0f5" }}>{row.name}</td>
                  <td style={{ padding: 13, borderBottom: "1px solid #edf0f5" }}>
                    {row.rollNumber || "—"}
                  </td>
                  <td style={{ padding: 13, borderBottom: "1px solid #edf0f5" }}>{row.present}</td>
                  <td style={{ padding: 13, borderBottom: "1px solid #edf0f5" }}>{row.absent}</td>
                  <td style={{ padding: 13, borderBottom: "1px solid #edf0f5" }}>{row.leave}</td>
                  <td style={{ padding: 13, borderBottom: "1px solid #edf0f5" }}>
                    {row.percentage === null ? "—" : `${row.percentage}%`}
                  </td>
                  <td style={{ padding: 13, borderBottom: "1px solid #edf0f5" }}>
                    <span
                      style={{
                        color:
                          row.percentage === null
                            ? "#64748b"
                            : row.percentage < 75
                              ? "#dc2626"
                              : "#16a34a",
                        fontWeight: 600,
                      }}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{ padding: 35, textAlign: "center", color: "#64748b" }}
                  >
                    {loading
                      ? "Loading student records..."
                      : "No student records found for these filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p style={{ color: "#64748b", fontSize: 12, marginBottom: 0 }}>
          Reports use recorded attendance entries for the selected date range. Leave is displayed
          separately and excluded from the present/absent attendance percentage.
        </p>
      </section>
    </main>
  );
}
