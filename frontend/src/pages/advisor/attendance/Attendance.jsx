

import { useCallback, useEffect, useState } from "react";

import "./Attendance.css";



const API_URL = "http://localhost:5000/api/attendance";

const STUDENTS_KEY = "smartclassroom_students";



function getRegisteredStudents() {

  try {

    const students = JSON.parse(

      localStorage.getItem(STUDENTS_KEY) || "[]"

    );

    return Array.isArray(students) ? students : [];

  } catch {

    return [];

  }

}



function todayString() {

  const date = new Date();

  const localDate = new Date(

    date.getTime() - date.getTimezoneOffset() * 60000

  );

  return localDate.toISOString().slice(0, 10);

}



export default function Attendance() {

  const [date, setDate] = useState(todayString());

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("All");

  const [records, setRecords] = useState([]);

 const [summary, setSummary] = useState({

  totalStudents: getRegisteredStudents().length,

  presentCount: 0,

  absentCount: 0,

});

  const [classroomStatus, setClassroomStatus] = useState("Checking");

  const [activePeriod, setActivePeriod] = useState("Not available");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [lastUpdated, setLastUpdated] = useState(null);

  const [deleting, setDeleting] = useState(false);



  const loadAttendance = useCallback(async (showLoading = false) => {

  if (showLoading) setLoading(true);



  try {

    const response = await fetch(

      `${API_URL}?date=${encodeURIComponent(date)}`,

      { headers: { Accept: "application/json" } }

    );



    const data = await response.json().catch(() => ({}));



    if (!response.ok) {

      throw new Error(

        data.message || `Request failed (${response.status})`

      );

    }



    const registeredStudents = getRegisteredStudents();



    const attendanceRecords = Array.isArray(data.records)

      ? data.records

      : [];



    // Backend totals are authoritative; use record-based fallback only if absent.
    const normalizeStatus = (record) =>
      String(record?.status ?? record?.attendanceStatus ?? "")
        .trim()
        .toLowerCase();

    const presentIds = new Set(
      attendanceRecords
        .filter(
          (record) =>
            normalizeStatus(record) === "present" ||
            record?.present === true ||
            record?.attendance === true
        )
        .map((record) =>
          String(
            record.studentId ||
            record.student_id ||
            record.studentIdNumber ||
            record.rollNumber ||
            record.registerNumber ||
            record.id ||
            ""
          ).trim().toLowerCase()
        )
        .filter(Boolean)
    );

    const totalStudents = Number.isFinite(Number(data.totalStudents))
      ? Number(data.totalStudents)
      : registeredStudents.length;

    const presentCount = Number.isFinite(Number(data.presentCount))
      ? Number(data.presentCount)
      : presentIds.size;

    const absentCount = Number.isFinite(Number(data.absentCount))
      ? Number(data.absentCount)
      : Math.max(0, totalStudents - presentCount);

    setRecords(attendanceRecords);

    setSummary({
      totalStudents,
      presentCount,
      absentCount,
    });

    setClassroomStatus(data.classroomStatus || "Unknown");

    setActivePeriod(data.activePeriod || "Not available");

    setLastUpdated(new Date());

    setError("");

  } catch (err) {

    setRecords([]);



    const totalStudents = getRegisteredStudents().length;



    setSummary({

      totalStudents,

      presentCount: 0,

      absentCount: 0,

    });



    setError(

      `${err.message}. Check that the backend attendance API is running.`

    );

  } finally {

    setLoading(false);

  }

}, [date]);

  // Automatically refresh attendance every three seconds.

 useEffect(() => {

  function refreshStudentCount() {

    setSummary((previous) => ({

      ...previous,

      totalStudents: getRegisteredStudents().length,

    }));



    loadAttendance(false);

  }



  window.addEventListener("storage", refreshStudentCount);

  window.addEventListener("focus", refreshStudentCount);

  window.addEventListener(

    "smartclassroom:dataUpdated",

    refreshStudentCount

  );



  return () => {

    window.removeEventListener("storage", refreshStudentCount);

    window.removeEventListener("focus", refreshStudentCount);

    window.removeEventListener(

      "smartclassroom:dataUpdated",

      refreshStudentCount

    );

  };

}, [loadAttendance]);



  const filteredRecords = records.filter((record) => {

    const student = String(

      record.studentName || record.student_name || ""

    );

    const studentId = String(

      record.studentId || record.student_id || ""

    );

    const subject = String(record.subject || "");



    const matchesSearch = `${student} ${studentId} ${subject}`

      .toLowerCase()

      .includes(search.toLowerCase());



    const matchesStatus =

      statusFilter === "All" ||

      String(record.status || "").toLowerCase() ===

        statusFilter.toLowerCase();



    return matchesSearch && matchesStatus;

  });



  async function deleteHistory() {

    const confirmed = window.confirm(

      `Delete all attendance history for ${date}?\n\n` +

        "This cannot be undone. Student profiles and face registrations will not be deleted."

    );



    if (!confirmed) return;



    setDeleting(true);

    setError("");



    try {

      const response = await fetch(

        `${API_URL}/history?date=${encodeURIComponent(date)}`,

        {

          method: "DELETE",

          headers: { Accept: "application/json" },

        }

      );



      const data = await response.json().catch(() => ({}));



      if (!response.ok) {

        throw new Error(

          data.message || `Delete failed (${response.status})`

        );

      }



      await loadAttendance(true);

      window.alert(data.message || "Attendance history deleted.");

    } catch (err) {

      setError(err.message);

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



    const valueFor = (record, key) => {

      const aliases = {

        studentId: record.studentId ?? record.student_id,

        studentName: record.studentName ?? record.student_name,

        timestamp: record.timestamp ?? record.time,

      };



      const value = aliases[key] ?? record[key] ?? "";

      return `"${String(value).replace(/"/g, '""')}"`;

    };



    const csv = [

      columns.map(([label]) => label).join(","),

      ...filteredRecords.map((record) =>

        columns.map(([, key]) => valueFor(record, key)).join(",")

      ),

    ].join("\r\n");



    const url = URL.createObjectURL(

      new Blob(["\uFEFF" + csv], {

        type: "text/csv;charset=utf-8;",

      })

    );



    const link = document.createElement("a");

    link.href = url;

    link.download = `attendance-${date}.csv`;

    link.click();



    URL.revokeObjectURL(url);

  }



  return (

    <main className="attendance-page">

      {/* AdvisorLayout already displays the page heading. */}



      {error && (

        <div className="attendance-alert" role="alert">

          <strong>Unable to load attendance</strong>

          <p>{error}</p>

        </div>

      )}



      <div className="attendance-refresh-row">

        <button

          className="attendance-button attendance-button-primary"

          onClick={() => loadAttendance(true)}

          disabled={loading}

        >

          ↻ Refresh

        </button>

      </div>



      <section className="attendance-stats">

        <article className="attendance-stat">

          <span className="attendance-stat-icon blue">♙</span>

          <p>Total Students</p>

          <strong>{summary.totalStudents}</strong>

          <small>Enrolled for the selected class</small>

        </article>



        <article className="attendance-stat">

          <span className="attendance-stat-icon green">✓</span>

          <p>Present</p>

          <strong>{summary.presentCount}</strong>

          <small>Automatically recorded</small>

        </article>



        <article className="attendance-stat">

          <span className="attendance-stat-icon orange">◷</span>

          <p>Absent</p>

          <strong>{summary.absentCount}</strong>

          <small>Based on backend attendance rules</small>

        </article>



        <article className="attendance-stat">

          <span className="attendance-stat-icon purple">▣</span>

          <p>Attendance Rate</p>

          <strong>

  {summary.totalStudents > 0

    ? `${Math.round(

        (summary.presentCount / summary.totalStudents) * 100

      )}%`

    : "0%"}

</strong>

          <small>For the selected date</small>

        </article>

      </section>



      <section className="attendance-classroom">

        <div className="attendance-camera-icon">▣</div>



        <div className="attendance-classroom-info">

          <h2>Classroom Smart Board</h2>

          <p>Camera recognition and automatic attendance status</p>



          <div className="attendance-live-line">

            <span className="attendance-live-dot" />

            <span>Page refreshes automatically every 3 seconds</span>

          </div>

        </div>



        <div className="attendance-classroom-meta">

          <span className="attendance-label">Camera / Service</span>

          <strong>{classroomStatus}</strong>

          <span className="attendance-label">Active Period</span>

          <strong>{activePeriod}</strong>

        </div>

      </section>



      <section className="attendance-records">

        <div className="attendance-records-heading">

          <div>

            <h2>Attendance Records</h2>

            <p>Present status comes from the recognition backend.</p>

          </div>



          <div className="attendance-actions">

            <button

              className="attendance-button"

              onClick={exportCSV}

              disabled={filteredRecords.length === 0}

            >

              ↓ Export CSV

            </button>



            <button

              className="attendance-button attendance-button-danger"

              onClick={deleteHistory}

              disabled={deleting}

            >

              {deleting ? "Deleting..." : "Delete History"}

            </button>

          </div>

        </div>



        <div className="attendance-filters">

          <label className="attendance-search">

            <span>⌕</span>

            <input

              type="search"

              placeholder="Search student, ID or subject..."

              value={search}

              onChange={(event) => setSearch(event.target.value)}

            />

          </label>



          <label className="attendance-filter-control">

            <span>Date</span>

            <input

              type="date"

              value={date}

              onChange={(event) => setDate(event.target.value)}

            />

          </label>



          <label className="attendance-filter-control">

            <span>Status</span>

            <select

              value={statusFilter}

              onChange={(event) => setStatusFilter(event.target.value)}

            >

              <option value="All">All statuses</option>

              <option value="Present">Present</option>

              <option value="Absent">Absent</option>

            </select>

          </label>

        </div>



        <div className="attendance-table-wrap">

          <table className="attendance-table">

            <thead>

              <tr>

                <th>STUDENT</th>

                <th>SUBJECT</th>

                <th>PERIOD</th>

                <th>TIME</th>

                <th>STATUS</th>

              </tr>

            </thead>



            <tbody>

              {loading ? (

                <tr>

                  <td colSpan="5" className="attendance-empty">

                    Loading attendance records...

                  </td>

                </tr>

              ) : filteredRecords.length === 0 ? (

                <tr>

                  <td colSpan="5" className="attendance-empty">

                    {error

                      ? "Attendance data is unavailable until the API is connected."

                      : "No attendance records found for these filters."}

                  </td>

                </tr>

              ) : (

                filteredRecords.map((record, index) => {

                  const studentId =

                    record.studentId || record.student_id || "—";



                  const studentName =

                    record.studentName ||

                    record.student_name ||

                    "Unknown student";



                  const status = String(record.status || "Unknown");



                  const initials = studentName

                    .split(/\s+/)

                    .map((part) => part[0])

                    .join("")

                    .slice(0, 2)

                    .toUpperCase();



                  return (

                    <tr key={record.id || `${studentId}-${index}`}>

                      <td>

                        <div className="attendance-student">

                          <span className="attendance-avatar">

                            {initials}

                          </span>



                          <span>

                            <strong>{studentName}</strong>

                            <small>{studentId}</small>

                          </span>

                        </div>

                      </td>



                      <td>{record.subject || "—"}</td>

                      <td>{record.period || "—"}</td>



                      <td>

                        {record.timestamp || record.time

                          ? new Date(

                              record.timestamp || record.time

                            ).toLocaleTimeString([], {

                              hour: "2-digit",

                              minute: "2-digit",

                            })

                          : "—"}

                      </td>



                      <td>

                        <span

                          className={`attendance-status ${

                            status.toLowerCase() === "present"

                              ? "is-present"

                              : status.toLowerCase() === "absent"

                              ? "is-absent"

                              : "is-unknown"

                          }`}

                        >

                          {status}

                        </span>

                      </td>

                    </tr>

                  );

                })

              )}

            </tbody>

          </table>

        </div>



        <footer className="attendance-table-footer">

          <span>{filteredRecords.length} record(s)</span>

          <span>

            {lastUpdated

              ? `Last updated at ${lastUpdated.toLocaleTimeString()}`

              : "Waiting for data"}

          </span>

        </footer>

      </section>



      <p className="attendance-note">

        Attendance is recorded by the backend. This page does not provide

        manual Present/Absent controls. Delete History removes records only

        after the backend confirms the deletion.

      </p>

    </main>

  );

}
