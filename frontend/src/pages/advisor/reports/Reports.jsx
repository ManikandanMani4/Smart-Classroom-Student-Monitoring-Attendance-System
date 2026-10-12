
import { useEffect, useMemo, useState } from "react";

const STUDENTS_KEY = "smartclassroom_students";
const ATTENDANCE_KEY = "smartclassroom_attendance";
const CLASS_NAME = "III IT - B";

const styles = {
  page: {
    padding: 24,
    background: "#f5f7fb",
    minHeight: "100vh",
    color: "#172033",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    background: "#fff",
    padding: 20,
    borderRadius: 14,
    border: "1px solid #e5eaf1",
    boxShadow: "0 3px 12px rgba(0,0,0,0.03)",
  },
  input: {
    padding: "10px 12px",
    border: "1px solid #d9e0ea",
    borderRadius: 8,
    fontSize: 14,
    background: "#fff",
    color: "#172033",
    minWidth: 0,
  },
  button: {
    padding: "10px 14px",
    border: "none",
    borderRadius: 8,
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

function studentId(student) {
  return String(
    student.id ??
    student.studentId ??
    student.rollNumber ??
    student.rollNo ??
    ""
  );
}

function studentName(student) {
  return (
    student.name ||
    student.studentName ||
    student.fullName ||
    studentId(student) ||
    "Unknown Student"
  );
}

function studentClass(student) {
  return student.className || student.class || student.assignedClass || "";
}

function recordStudentId(record) {
  return String(
    record.studentId ??
    record.student_id ??
    record.id ??
    ""
  );
}

function recordStudentName(record) {
  return String(record.studentName ?? record.name ?? "").toLowerCase();
}

function recordDate(record) {
  const value =
    record.date ||
    record.attendanceDate ||
    record.timestamp ||
    record.createdAt;

  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value).slice(0, 10)
    : date.toISOString().slice(0, 10);
}

function recordStatus(record) {
  const status = String(
    record.status ?? record.attendanceStatus ?? ""
  ).toLowerCase();

  if (["present", "p", "late"].includes(status)) return "Present";
  if (["absent", "a"].includes(status)) return "Absent";
  if (["leave", "on leave"].includes(status)) return "Leave";

  return "Unknown";
}

function todayString() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10);
}

function escapeCsv(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export default function Reports() {
  const [students, setStudents] = useState(() =>
    readStorage(STUDENTS_KEY)
  );
  const [attendance, setAttendance] = useState(() =>
    readStorage(ATTENDANCE_KEY)
  );

  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000)
      .toISOString()
      .slice(0, 10);
  });

  const [endDate, setEndDate] = useState(todayString);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    const refresh = () => {
      setStudents(readStorage(STUDENTS_KEY));
      setAttendance(readStorage(ATTENDANCE_KEY));
    };

    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const classStudents = useMemo(
    () =>
      students.filter(
        (student) => studentClass(student) === CLASS_NAME
      ),
    [students]
  );

  const reportRows = useMemo(() => {
    return classStudents.map((student) => {
      const id = studentId(student);
      const name = studentName(student).toLowerCase();

      const records = attendance.filter((record) => {
        const recordId = recordStudentId(record);
        const recordName = recordStudentName(record);
        const date = recordDate(record);

        const matchesStudent =
          (id && recordId === id) ||
          (recordName && recordName === name);

        return (
          matchesStudent &&
          date >= startDate &&
          date <= endDate
        );
      });

      const present = records.filter(
        (record) => recordStatus(record) === "Present"
      ).length;

      const absent = records.filter(
        (record) => recordStatus(record) === "Absent"
      ).length;

      const leave = records.filter(
        (record) => recordStatus(record) === "Leave"
      ).length;

      const total = present + absent;

      return {
        id,
        name: studentName(student),
        rollNumber:
          student.rollNumber ||
          student.rollNo ||
          studentId(student),
        present,
        absent,
        leave,
        total,
        percentage: total
          ? Math.round((present / total) * 100)
          : null,
      };
    });
  }, [classStudents, attendance, startDate, endDate]);

  const filteredRows = reportRows.filter((row) => {
    const query = search.toLowerCase();

    const matchesSearch =
      row.name.toLowerCase().includes(query) ||
      String(row.rollNumber).toLowerCase().includes(query);

    const status =
      row.percentage === null
        ? "No Data"
        : row.percentage < 75
        ? "Low Attendance"
        : "Good Attendance";

    return (
      matchesSearch &&
      (statusFilter === "All" || statusFilter === status)
    );
  });

  const totals = reportRows.reduce(
    (result, row) => {
      result.present += row.present;
      result.absent += row.absent;
      result.leave += row.leave;
      result.total += row.total;
      return result;
    },
    { present: 0, absent: 0, leave: 0, total: 0 }
  );

  const overallPercentage = totals.total
    ? Math.round((totals.present / totals.total) * 100)
    : null;

    const selectedDays =
  startDate && endDate
    ? Math.max(
        0,
        Math.round(
          (new Date(`${endDate}T00:00:00`) -
            new Date(`${startDate}T00:00:00`)) /
            (1000 * 60 * 60 * 24)
        ) + 1
      )
    : 0;

  const lowAttendanceCount = reportRows.filter(
    (row) => row.percentage !== null && row.percentage < 75
  ).length;

  function exportCsv() {
    const header = [
      "Student Name",
      "Roll Number",
      "Present",
      "Absent",
      "Leave",
      "Total Counted Sessions",
      "Attendance Percentage",
    ];

    const rows = filteredRows.map((row) => [
      row.name,
      row.rollNumber,
      row.present,
      row.absent,
      row.leave,
      row.total,
      row.percentage === null ? "No Data" : `${row.percentage}%`,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `attendance-report-${CLASS_NAME.replace(
      /\s+/g,
      "-"
    )}-${startDate}-to-${endDate}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const statCards = [
    {
      title: "Total Students",
      value: classStudents.length,
      color: "#2563eb",
    },
    {
      title: "Present Records",
      value: totals.present,
      color: "#16a34a",
    },
    {
      title: "Absent Records",
      value: totals.absent,
      color: "#dc2626",
    },
    {
      title: "Overall Attendance",
      value:
        overallPercentage === null
          ? "—"
          : `${overallPercentage}%`,
      color: "#7c3aed",
    },
  ];

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
          <h1 style={{ margin: 0, fontSize: 28 }}>
            Attendance Reports
          </h1>
          <p style={{ color: "#64748b", marginBottom: 0 }}>
            Student attendance summary for {CLASS_NAME}
          </p>
        </div>

        <button style={styles.button} onClick={exportCsv}>
          Export CSV
        </button>
      </header>

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
          <span style={{ fontSize: 13, color: "#64748b" }}>
            From date
          </span>
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(event) => setStartDate(event.target.value)}
            style={styles.input}
          />
        </label>

        <label style={{ display: "grid", gap: 7, flex: "1 1 150px" }}>
          <span style={{ fontSize: 13, color: "#64748b" }}>
            To date
          </span>
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
            setStartDate(() => {
              const date = new Date();
              date.setDate(date.getDate() - 6);
              const offset = date.getTimezoneOffset();
              return new Date(date.getTime() - offset * 60000)
                .toISOString()
                .slice(0, 10);
            });
            setEndDate(todayString());
          }}
        >
          {selectedDays === 1
  ? "Last 1 Day"
  : `Last ${selectedDays} Days`}
        </button>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: 22,
        }}
      >
        {statCards.map((card) => (
          <div key={card.title} style={styles.card}>
            <p style={{ color: "#64748b", margin: "0 0 10px" }}>
              {card.title}
            </p>
            <strong style={{ fontSize: 29, color: card.color }}>
              {card.value}
            </strong>
          </div>
        ))}
      </section>

      <section style={{ ...styles.card, marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Attendance Overview</h3>

        {overallPercentage === null ? (
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
                  background:
                    overallPercentage < 75 ? "#dc2626" : "#16a34a",
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
            style={styles.input}
          >
            <option value="All">All students</option>
            <option value="Good Attendance">75% and above</option>
            <option value="Low Attendance">Below 75%</option>
            <option value="No Data">No attendance data</option>
          </select>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 720,
              fontSize: 14,
            }}
          >
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                {[
                  "Student",
                  "Roll Number",
                  "Present",
                  "Absent",
                  "Leave",
                  "Attendance",
                  "Status",
                ].map((heading) => (
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
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id || row.rollNumber}>
                  <td style={{ padding: 13, borderBottom: "1px solid #edf0f5" }}>
                    {row.name}
                  </td>
                  <td style={{ padding: 13, borderBottom: "1px solid #edf0f5" }}>
                    {row.rollNumber || "—"}
                  </td>
                  <td style={{ padding: 13, borderBottom: "1px solid #edf0f5" }}>
                    {row.present}
                  </td>
                  <td style={{ padding: 13, borderBottom: "1px solid #edf0f5" }}>
                    {row.absent}
                  </td>
                  <td style={{ padding: 13, borderBottom: "1px solid #edf0f5" }}>
                    {row.leave}
                  </td>
                  <td style={{ padding: 13, borderBottom: "1px solid #edf0f5" }}>
                    {row.percentage === null
                      ? "—"
                      : `${row.percentage}%`}
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
                      {row.percentage === null
                        ? "No Data"
                        : row.percentage < 75
                        ? "Low Attendance"
                        : "Good Attendance"}
                    </span>
                  </td>
                </tr>
              ))}

              {filteredRows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: 35,
                      textAlign: "center",
                      color: "#64748b",
                    }}
                  >
                    No student records found for these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p style={{ color: "#64748b", fontSize: 12, marginBottom: 0 }}>
          Reports use recorded attendance entries for the selected date
          range. Leave is displayed separately and excluded from the
          present/absent attendance percentage.
        </p>
      </section>
    </main>
  );
}
