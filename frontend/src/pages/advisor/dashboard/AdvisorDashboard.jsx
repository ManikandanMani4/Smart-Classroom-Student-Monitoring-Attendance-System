import React, { useEffect, useMemo, useState } from "react";

import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../../context/AuthContext";

import "./AdvisorDashboard.css";


const ATTENDANCE_API = "http://localhost:5000/api/attendance";


const STUDENTS_KEY = "smartclassroom_students";

const ATTENDANCE_KEY = "smartclassroom_attendance";

const TIMETABLE_KEY = "smartclassroom_Timetable";

const ALERTS_KEY = "smartclassroom_Alerts";


function readData(key) {

  try {

    const data = JSON.parse(localStorage.getItem(key) || "[]");

    return Array.isArray(data) ? data : [];

  } catch {

    return [];

  }

}


function getTodayDate() {

  const date = new Date();

  return [

    date.getFullYear(),

    String(date.getMonth() + 1).padStart(2, "0"),

    String(date.getDate()).padStart(2, "0"),

  ].join("-");

}


function normalize(value) {

  return String(value ?? "").trim().toLowerCase();

}


function getStudentId(student) {

  return String(

    student?.studentId ||

      student?.student_id ||

      student?.id ||

      student?.rollNumber ||

      student?.registerNumber ||

      student?.studentIdNumber ||

      ""

  )

    .trim()

    .toUpperCase();

}


function getAttendanceStudentId(record) {

  return String(

    record?.studentId ||

      record?.student_id ||

      record?.studentIdNumber ||

      record?.rollNumber ||

      record?.registerNumber ||

      record?.id ||

      ""

  )

    .trim()

    .toUpperCase();

}


function isPresent(record) {

  return (

    normalize(record?.status) === "present" ||

    record?.present === true ||

    record?.attendance === true

  );

}


function AdvisorLayout({ children, title, description }) {

  const { user, logout } = useAuth();

  const navigate = useNavigate();

  const location = useLocation();


  const menuItems = [

    { label: "Dashboard", path: "/advisor/dashboard", icon: "▦" },

    { label: "Students", path: "/advisor/students", icon: "♙" },

    { label: "Attendance", path: "/advisor/attendance", icon: "✓" },

    { label: "Timetable", path: "/advisor/timetable", icon: "▣" },

    { label: "Classroom", path: "/advisor/classroom", icon: "◉" },

    { label: "Alerts", path: "/advisor/alerts", icon: "⚠" },

    { label: "Reports", path: "/advisor/reports", icon: "▥" },

  ];


  const handleLogout = () => {

    logout();

    navigate("/login");

  };


  return (

    <div className="advisor-dashboard-layout">

      <aside className="advisor-sidebar">

        <div className="advisor-brand">

          <div className="advisor-brand-icon">SC</div>

          <div className="advisor-brand-text">

            <h2>SmartClassroom</h2>

            <span>ATTENDANCE SYSTEM</span>

          </div>

        </div>


        <div className="advisor-role">

          <div className="advisor-role-label">LOGGED IN AS</div>

          <div className="advisor-role-name">III IT - B Advisor</div>

        </div>


        <nav className="advisor-navigation">

          {menuItems.map((item) => {

            const active =

              location.pathname === item.path ||

              location.pathname.startsWith(item.path + "/");


            return (

              <button

                key={item.path}

                type="button"

                className={`advisor-nav-item ${active ? "active" : ""}`}

                onClick={() => navigate(item.path)}

              >

                <span className="advisor-nav-icon">{item.icon}</span>

                <span className="advisor-nav-label">{item.label}</span>

              </button>

            );

          })}

        </nav>


        <div className="advisor-sidebar-bottom">

          <div className="advisor-user">

            <div className="advisor-avatar">

              {user?.name?.charAt(0)?.toUpperCase() || "A"}

            </div>

            <div className="advisor-user-info">

              <strong>{user?.name || "III IT - B Advisor"}</strong>

              <span>{user?.className || "III IT - A"}</span>

            </div>

          </div>


          <button

            type="button"

            className="advisor-signout"

            onClick={handleLogout}

          >

            <span className="advisor-signout-icon">↪</span>

            <span>Sign Out</span>

          </button>

        </div>

      </aside>


      <main className="advisor-main">

        <div className="advisor-page">

          <div className="advisor-header">

            <div className="advisor-header-left">

              <div className="advisor-header-label">CLASS ADVISOR</div>

              <h1>{title}</h1>

              <p>

                {description ||

                  `Manage and monitor the ${title.toLowerCase()} module of your assigned class.`}

              </p>

            </div>

          </div>


          <div className="advisor-module-content">{children}</div>

        </div>

      </main>

    </div>

  );

}


function AdvisorDashboard() {

  const { user } = useAuth();

  const navigate = useNavigate();


  const [students, setStudents] = useState(() => readData(STUDENTS_KEY));

  const [attendance, setAttendance] = useState(() =>

    readData(ATTENDANCE_KEY)

  );

  const [timetable, setTimetable] = useState(() =>

    readData(TIMETABLE_KEY)

  );

  const [alerts, setAlerts] = useState(() => readData(ALERTS_KEY));

  const [todayDate, setTodayDate] = useState(getTodayDate);


const loadDashboardData = async () => {

  const currentDate = getTodayDate();


  setStudents(readData(STUDENTS_KEY));

  setTimetable(readData(TIMETABLE_KEY));

  setAlerts(readData(ALERTS_KEY));

  setTodayDate(currentDate);


  try {

    const response = await fetch(

      `${ATTENDANCE_API}?date=${encodeURIComponent(currentDate)}`,

      {

        headers: {

          Accept: "application/json",

        },

      }

    );


    if (!response.ok) {

      throw new Error(

        `Attendance API returned ${response.status}`

      );

    }


    const data = await response.json();


    if (!data.success) {

      throw new Error(

        data.message || "Unable to load attendance."

      );

    }


    const apiRecords = Array.isArray(data.records)

      ? data.records

      : [];


    const normalizedRecords = apiRecords.map((record) => ({

      ...record,

      studentId: String(

        record.studentId || record.student_id || ""

      ).trim().toUpperCase(),

      date: data.date || currentDate,

    }));


    setAttendance(normalizedRecords);


    localStorage.setItem(

      ATTENDANCE_KEY,

      JSON.stringify(normalizedRecords)

    );

  } catch (error) {

    console.error(

      "Could not load dashboard attendance:",

      error

    );

  }

};


  useEffect(() => {

    loadDashboardData();


    const interval = setInterval(() => {

      loadDashboardData();

    }, 3000);


    const handleUpdate = () => {

      loadDashboardData();

    };


    window.addEventListener("storage", handleUpdate);

    window.addEventListener("smartclassroom:dataUpdated", handleUpdate);

    window.addEventListener("focus", handleUpdate);


    return () => {

      clearInterval(interval);

      window.removeEventListener("storage", handleUpdate);

      window.removeEventListener(

        "smartclassroom:dataUpdated",

        handleUpdate

      );

      window.removeEventListener("focus", handleUpdate);

    };

  }, []);


  const assignedClass = user?.className || "III IT - B";


  const todayName = new Date().toLocaleDateString("en-US", {

    weekday: "long",

  });


  const classStudents = useMemo(() => {

    return students.filter((student) => {

      const studentClass =

        student.className || student.class || student.class_name || "";


      // Students without a class field are included in this class.

      if (!studentClass) return true;


      return normalize(studentClass) === normalize(assignedClass);

    });

  }, [students, assignedClass]);


  const todayAttendance = useMemo(() => {

    return attendance.filter((record) => {

      const recordDate =

        record.date ||

        record.attendanceDate ||

        (record.createdAt

          ? String(record.createdAt).split("T")[0]

          : "");


      return recordDate === todayDate;

    });

  }, [attendance, todayDate]);


  const presentIds = useMemo(() => {

    return new Set(

      todayAttendance

        .filter(isPresent)

        .map(getAttendanceStudentId)

        .filter(Boolean)

    );

  }, [todayAttendance]);


  const presentStudents = classStudents.filter((student) =>

    presentIds.has(getStudentId(student))

  ).length;


  const absentStudents = Math.max(

    classStudents.length - presentStudents,

    0

  );


  const attendancePercentage =

    classStudents.length > 0

      ? Math.round((presentStudents / classStudents.length) * 100)

      : 0;


  const todayTimetable = useMemo(() => {

    return timetable

      .filter((item) => {

        const day = item.day || item.dayName || item.weekDay || "";

        return normalize(day) === normalize(todayName);

      })

      .filter((item) => {

        const itemClass = item.className || item.class || "";

        return (

          !itemClass || normalize(itemClass) === normalize(assignedClass)

        );

      })

      .sort((a, b) =>

        String(a.startTime || a.time || "").localeCompare(

          String(b.startTime || b.time || "")

        )

      );

  }, [timetable, todayName, assignedClass]);


  const recentAlerts = useMemo(() => {

    return [...alerts]

      .sort(

        (a, b) =>

          new Date(b.createdAt || b.date || 0).getTime() -

          new Date(a.createdAt || a.date || 0).getTime()

      )

      .slice(0, 5);

  }, [alerts]);


  return (

    <AdvisorLayout

      title="Dashboard"

      description="Manage and monitor your assigned class."

    >

      <div className="advisor-class-banner">

        <div>

          <span>ASSIGNED CLASS</span>

          <h2>{assignedClass}</h2>

          <p>{user?.department || "Information Technology"}</p>

        </div>

        <div className="advisor-class-icon">♟</div>

      </div>


      <div className="advisor-stat-grid">

        <div className="advisor-stat-card">

          <div className="advisor-stat-icon students">♙</div>

          <div className="advisor-stat-content">

            <span>TOTAL STUDENTS</span>

            <strong>{classStudents.length}</strong>

            <small>Students in your class</small>

          </div>

        </div>


        <div className="advisor-stat-card">

          <div className="advisor-stat-icon present">✓</div>

          <div className="advisor-stat-content">

            <span>PRESENT TODAY</span>

            <strong>{presentStudents}</strong>

            <small>Students present</small>

          </div>

        </div>


        <div className="advisor-stat-card">

          <div className="advisor-stat-icon absent">!</div>

          <div className="advisor-stat-content">

            <span>ABSENT TODAY</span>

            <strong>{absentStudents}</strong>

            <small>Students absent</small>

          </div>

        </div>


        <div className="advisor-stat-card">

          <div className="advisor-stat-icon attendance">%</div>

          <div className="advisor-stat-content">

            <span>ATTENDANCE</span>

            <strong>{attendancePercentage}%</strong>

            <small>Today's attendance</small>

          </div>

        </div>

      </div>


      <div className="advisor-dashboard-grid">

        <section className="advisor-dashboard-card attendance-card">

          <div className="advisor-card-header">

            <div>

              <span className="advisor-card-label">TODAY</span>

              <h3>Attendance Overview</h3>

            </div>

            <button

              type="button"

              className="advisor-view-button"

              onClick={() => navigate("/advisor/attendance")}

            >

              View Attendance

            </button>

          </div>


          <div className="advisor-attendance-body">

            <div

              className="advisor-attendance-circle"

              style={{ "--attendance": `${attendancePercentage}%` }}

            >

              <div className="advisor-attendance-circle-inner">

                <strong>{attendancePercentage}%</strong>

                <span>Present</span>

              </div>

            </div>


            <div className="advisor-attendance-details">

              <div className="advisor-attendance-item">

                <span className="attendance-dot present-dot" />

                <div>

                  <strong>{presentStudents}</strong>

                  <span>Present</span>

                </div>

              </div>


              <div className="advisor-attendance-item">

                <span className="attendance-dot absent-dot" />

                <div>

                  <strong>{absentStudents}</strong>

                  <span>Absent</span>

                </div>

              </div>


              <div className="advisor-attendance-item">

                <span className="attendance-dot total-dot" />

                <div>

                  <strong>{classStudents.length}</strong>

                  <span>Total</span>

                </div>

              </div>

            </div>

          </div>

        </section>


        <section className="advisor-dashboard-card">

          <div className="advisor-card-header">

            <div>

              <span className="advisor-card-label">

                {todayName.toUpperCase()}

              </span>

              <h3>Today's Timetable</h3>

            </div>

            <button

              type="button"

              className="advisor-view-button"

              onClick={() => navigate("/advisor/timetable")}

            >

              View All

            </button>

          </div>


          <div className="advisor-timetable-list">

            {todayTimetable.length === 0 ? (

              <div className="advisor-empty-state">

                <div className="advisor-empty-icon">▣</div>

                <p>No timetable available</p>

                <span>No classes scheduled for today.</span>

              </div>

            ) : (

              todayTimetable.slice(0, 5).map((item, index) => (

                <div

                  className="advisor-timetable-item"

                  key={item.id || index}

                >

                  <div className="advisor-time">

                    <strong>

                      {item.startTime || item.time || `Period ${index + 1}`}

                    </strong>

                    {item.endTime && <span>{item.endTime}</span>}

                  </div>


                  <div className="advisor-subject">

                    <strong>

                      {item.subject || item.subjectName || "Subject"}

                    </strong>

                    <span>

                      {item.faculty ||

                        item.teacher ||

                        item.facultyName ||

                        "Faculty"}

                    </span>

                  </div>


                  <div className="advisor-room">

                    {item.room || item.classroom || "—"}

                  </div>

                </div>

              ))

            )}

          </div>

        </section>


        <section className="advisor-dashboard-card advisor-alert-card">

          <div className="advisor-card-header">

            <div>

              <span className="advisor-card-label">NOTIFICATIONS</span>

              <h3>Recent Alerts</h3>

            </div>

            <button

              type="button"

              className="advisor-view-button"

              onClick={() => navigate("/advisor/alerts")}

            >

              View Alerts

            </button>

          </div>


          <div className="advisor-alert-list">

            {recentAlerts.length === 0 ? (

              <div className="advisor-empty-state">

                <div className="advisor-empty-icon">✓</div>

                <p>No recent alerts</p>

                <span>Everything looks normal.</span>

              </div>

            ) : (

              recentAlerts.map((alert, index) => (

                <div

                  className="advisor-alert-item"

                  key={alert.id || index}

                >

                  <div className="advisor-alert-icon">⚠</div>

                  <div className="advisor-alert-content">

                    <strong>

                      {alert.title || alert.type || "Classroom Alert"}

                    </strong>

                    <p>

                      {alert.message ||

                        alert.description ||

                        "An alert requires your attention."}

                    </p>

                    <span>{alert.createdAt || alert.date || ""}</span>

                  </div>

                </div>

              ))

            )}

          </div>

        </section>


        <section className="advisor-dashboard-card">

          <div className="advisor-card-header">

            <div>

              <span className="advisor-card-label">ACTIONS</span>

              <h3>Quick Actions</h3>

            </div>

          </div>


          <div className="advisor-quick-actions">

            <button

              type="button"

              onClick={() => navigate("/advisor/students")}

            >

              <span>♙</span>

              <div>

                <strong>Manage Students</strong>

                <small>Add, remove, and view students</small>

              </div>

            </button>


            <button

              type="button"

              onClick={() => navigate("/advisor/attendance")}

            >

              <span>✓</span>

              <div>

                <strong>Attendance</strong>

                <small>Check attendance records</small>

              </div>

            </button>


            <button

              type="button"

              onClick={() => navigate("/advisor/classroom")}

            >

              <span>◉</span>

              <div>

                <strong>Live Classroom</strong>

                <small>Open camera-based face recognition</small>

              </div>

            </button>


            <button

              type="button"

              onClick={() => navigate("/advisor/reports")}

            >

              <span>▥</span>

              <div>

                <strong>Reports</strong>

                <small>View attendance reports</small>

              </div>

            </button>

          </div>

        </section>

      </div>

    </AdvisorLayout>

  );

}


export { AdvisorLayout };

export default AdvisorDashboard;