import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../../../context/AuthContext";

import "./AdvisorDashboard.css";


/* =========================================================
   ADVISOR LAYOUT
   Sidebar + Header + Main Content
   Everything is kept inside this same file.
========================================================= */

function AdvisorLayout({
  children,
  title,
  description,
}) {
  const { user, logout } = useAuth();

  const navigate = useNavigate();

  const location = useLocation();


  /* =======================================================
     SIDEBAR MENU
  ======================================================= */

  const menuItems = [
    {
      label: "Dashboard",
      path: "/advisor/dashboard",
      icon: "▦",
    },

    {
      label: "Students",
      path: "/advisor/students",
      icon: "♙",
    },

    {
      label: "Attendance",
      path: "/advisor/attendance",
      icon: "✓",
    },

    {
      label: "Timetable",
      path: "/advisor/timetable",
      icon: "▣",
    },

    {
      label: "Classroom",
      path: "/advisor/classroom",
      icon: "◉",
    },

    {
      label: "Alerts",
      path: "/advisor/alerts",
      icon: "⚠",
    },

    {
      label: "Reports",
      path: "/advisor/reports",
      icon: "▥",
    },
  ];


  /* =======================================================
     ACTIVE MENU
  ======================================================= */

  const isActive = (path) => {

    if (path === "/advisor/dashboard") {
      return location.pathname === path;
    }

    return (
      location.pathname === path ||
      location.pathname.startsWith(path + "/")
    );
  };


  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = () => {

    logout();

    navigate("/login");
  };


  return (
    <div className="advisor-dashboard-layout">


      {/* ===================================================
          SIDEBAR
      =================================================== */}

      <aside className="advisor-sidebar">


        {/* =================================================
            BRAND
        ================================================= */}

        <div className="advisor-brand">

          <div className="advisor-brand-icon">
            SC
          </div>

          <div className="advisor-brand-text">

            <h2>
              SmartClassroom
            </h2>

            <span>
              ATTENDANCE SYSTEM
            </span>

          </div>

        </div>


        {/* =================================================
            ROLE
        ================================================= */}

        <div className="advisor-role">

          <div className="advisor-role-label">
            LOGGED IN AS
          </div>

          <div className="advisor-role-name">
            Class Advisor
          </div>

        </div>


        {/* =================================================
            NAVIGATION
        ================================================= */}

        <nav className="advisor-navigation">

          {menuItems.map((item) => {

            const active = isActive(
              item.path
            );

            return (
              <button
                key={item.path}
                type="button"
                className={`advisor-nav-item ${
                  active ? "active" : ""
                }`}
                onClick={() =>
                  navigate(item.path)
                }
              >

                <span className="advisor-nav-icon">
                  {item.icon}
                </span>

                <span className="advisor-nav-label">
                  {item.label}
                </span>

              </button>
            );
          })}

        </nav>


        {/* =================================================
            SIDEBAR BOTTOM
        ================================================= */}

        <div className="advisor-sidebar-bottom">


          {/* USER */}

          <div className="advisor-user">

            <div className="advisor-avatar">

              {user?.name
                ?.charAt(0)
                ?.toUpperCase() || "A"}

            </div>


            <div className="advisor-user-info">

              <strong>
                {user?.name || "Class Advisor"}
              </strong>

              <span>
                {user?.className || "III IT - A"}
              </span>

            </div>

          </div>


          {/* SIGN OUT */}

          <button
            type="button"
            className="advisor-signout"
            onClick={handleLogout}
          >

            <span className="advisor-signout-icon">
              ↪
            </span>

            <span>
              Sign Out
            </span>

          </button>

        </div>

      </aside>


      {/* ===================================================
          MAIN AREA
      =================================================== */}

      <main className="advisor-main">

        <div className="advisor-page">


          {/* =================================================
              HEADER
          ================================================= */}

          <div className="advisor-header">

            <div className="advisor-header-left">

              <div className="advisor-header-label">
                CLASS ADVISOR
              </div>

              <h1>
                {title}
              </h1>

              <p>
                {description ||
                  `Manage and monitor the ${title.toLowerCase()} module of your assigned class.`}
              </p>

            </div>

          </div>


          {/* =================================================
              PAGE CONTENT
          ================================================= */}

          <div className="advisor-module-content">

            {children}

          </div>

        </div>

      </main>

    </div>
  );
}


/* =========================================================
   ADVISOR DASHBOARD
========================================================= */

function AdvisorDashboard() {

  const { user } = useAuth();

  const [students, setStudents] = useState([]);

  const [attendance, setAttendance] = useState([]);

  const [timetable, setTimetable] = useState([]);

  const [alerts, setAlerts] = useState([]);


  /* =======================================================
     LOAD DATA
  ======================================================= */

  const loadDashboardData = () => {

    try {

      const studentsData =
        JSON.parse(
          localStorage.getItem(
            "smartclassroom_Students"
          )
        ) || [];

      const attendanceData =
        JSON.parse(
          localStorage.getItem(
            "smartclassroom_Attendance"
          )
        ) || [];

      const timetableData =
        JSON.parse(
          localStorage.getItem(
            "smartclassroom_Timetable"
          )
        ) || [];

      const alertsData =
        JSON.parse(
          localStorage.getItem(
            "smartclassroom_Alerts"
          )
        ) || [];


      setStudents(
        Array.isArray(studentsData)
          ? studentsData
          : []
      );

      setAttendance(
        Array.isArray(attendanceData)
          ? attendanceData
          : []
      );

      setTimetable(
        Array.isArray(timetableData)
          ? timetableData
          : []
      );

      setAlerts(
        Array.isArray(alertsData)
          ? alertsData
          : []
      );

    } catch (error) {

      console.error(
        "Failed to load advisor dashboard data:",
        error
      );

      setStudents([]);
      setAttendance([]);
      setTimetable([]);
      setAlerts([]);
    }
  };


  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {

    loadDashboardData();

  }, []);


  /* =======================================================
     UPDATE WHEN DATA CHANGES
  ======================================================= */

  useEffect(() => {

    const handleStorage = () => {
      loadDashboardData();
    };


    const handleCustomUpdate = () => {
      loadDashboardData();
    };


    window.addEventListener(
      "storage",
      handleStorage
    );


    window.addEventListener(
      "smartclassroom:dataUpdated",
      handleCustomUpdate
    );


    return () => {

      window.removeEventListener(
        "storage",
        handleStorage
      );

      window.removeEventListener(
        "smartclassroom:dataUpdated",
        handleCustomUpdate
      );

    };

  }, []);


  /* =======================================================
     ASSIGNED CLASS
  ======================================================= */

  const assignedClass =
    user?.className ||
    "III IT - A";


  /* =======================================================
     FILTER STUDENTS
  ======================================================= */

  const classStudents = useMemo(() => {

    if (!Array.isArray(students)) {
      return [];
    }


    return students.filter((student) => {

      const studentClass =
        student.className ||
        student.class ||
        student.class_name ||
        "";


      if (!studentClass) {
        return true;
      }


      return (
        String(studentClass)
          .toLowerCase()
          .trim() ===
        String(assignedClass)
          .toLowerCase()
          .trim()
      );

    });

  }, [
    students,
    assignedClass,
  ]);


  /* =======================================================
     TODAY
  ======================================================= */

  const today = new Date();

  const todayDate =
    today.toISOString().split("T")[0];


  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];


  const todayName =
    dayNames[today.getDay()];


  /* =======================================================
     TODAY ATTENDANCE
  ======================================================= */

  const todayAttendance =
    useMemo(() => {

      if (!Array.isArray(attendance)) {
        return [];
      }


      return attendance.filter(
        (record) => {

          const recordDate =
            record.date ||
            record.attendanceDate ||
            (
              record.createdAt
                ? String(
                    record.createdAt
                  ).split("T")[0]
                : ""
            );


          return (
            recordDate ===
            todayDate
          );

        }
      );

    }, [
      attendance,
      todayDate,
    ]);


  /* =======================================================
     PRESENT STUDENTS
  ======================================================= */

  const presentStudents =
    useMemo(() => {

      let count = 0;


      classStudents.forEach(
        (student) => {

          const studentId =
            student.studentId ||
            student.id ||
            student.rollNumber ||
            student.registerNumber;


          const record =
            todayAttendance.find(
              (item) => {

                const attendanceStudentId =
                  item.studentId ||
                  item.student_id ||
                  item.studentIdNumber ||
                  item.rollNumber ||
                  item.registerNumber;


                return (
                  String(
                    attendanceStudentId
                  ) ===
                  String(studentId)
                );

              }
            );


          if (
            record &&
            (
              record.status ===
                "Present" ||
              record.status ===
                "present" ||
              record.present ===
                true ||
              record.attendance ===
                true
            )
          ) {

            count++;

          }

        }
      );


      return count;

    }, [
      classStudents,
      todayAttendance,
    ]);


  /* =======================================================
     ABSENT STUDENTS
  ======================================================= */

  const absentStudents =
    Math.max(
      classStudents.length -
        presentStudents,
      0
    );


  /* =======================================================
     ATTENDANCE PERCENTAGE
  ======================================================= */

  const attendancePercentage =
    classStudents.length > 0
      ? Math.round(
          (
            presentStudents /
            classStudents.length
          ) * 100
        )
      : 0;


  /* =======================================================
     TODAY TIMETABLE
  ======================================================= */

  const todayTimetable =
    useMemo(() => {

      if (!Array.isArray(timetable)) {
        return [];
      }


      return timetable
        .filter((item) => {

          const day =
            item.day ||
            item.dayName ||
            item.weekDay ||
            "";


          return (
            String(day)
              .toLowerCase()
              .trim() ===
            todayName
              .toLowerCase()
              .trim()
          );

        })
        .filter((item) => {

          const itemClass =
            item.className ||
            item.class ||
            "";


          if (!itemClass) {
            return true;
          }


          return (
            String(itemClass)
              .toLowerCase()
              .trim() ===
            String(assignedClass)
              .toLowerCase()
              .trim()
          );

        });

    }, [
      timetable,
      todayName,
      assignedClass,
    ]);


  /* =======================================================
     RECENT ALERTS
  ======================================================= */

  const recentAlerts =
    useMemo(() => {

      if (!Array.isArray(alerts)) {
        return [];
      }


      return [...alerts]
        .sort((a, b) => {

          const dateA =
            new Date(
              a.createdAt ||
              a.date ||
              0
            ).getTime();


          const dateB =
            new Date(
              b.createdAt ||
              b.date ||
              0
            ).getTime();


          return dateB - dateA;

        })
        .slice(0, 5);

    }, [alerts]);


  /* =======================================================
     QUICK ACTION
  ======================================================= */

  const navigate =
    useNavigate();


  /* =======================================================
     DASHBOARD CONTENT
  ======================================================= */

  return (
    <AdvisorLayout
      title="Dashboard"
      description="Manage and monitor your assigned class."
    >


      {/* =================================================
          ASSIGNED CLASS
      ================================================= */}

      <div className="advisor-class-banner">

        <div>

          <span>
            ASSIGNED CLASS
          </span>

          <h2>
            {assignedClass}
          </h2>

          <p>
            {user?.department ||
              "Information Technology"}
          </p>

        </div>


        <div className="advisor-class-icon">
          ♟
        </div>

      </div>


      {/* =================================================
          STAT CARDS
      ================================================= */}

      <div className="advisor-stat-grid">


        {/* TOTAL STUDENTS */}

        <div className="advisor-stat-card">

          <div className="advisor-stat-icon students">
            ♙
          </div>

          <div className="advisor-stat-content">

            <span>
              TOTAL STUDENTS
            </span>

            <strong>
              {classStudents.length}
            </strong>

            <small>
              Students in your class
            </small>

          </div>

        </div>


        {/* PRESENT */}

        <div className="advisor-stat-card">

          <div className="advisor-stat-icon present">
            ✓
          </div>

          <div className="advisor-stat-content">

            <span>
              PRESENT TODAY
            </span>

            <strong>
              {presentStudents}
            </strong>

            <small>
              Students present
            </small>

          </div>

        </div>


        {/* ABSENT */}

        <div className="advisor-stat-card">

          <div className="advisor-stat-icon absent">
            !
          </div>

          <div className="advisor-stat-content">

            <span>
              ABSENT TODAY
            </span>

            <strong>
              {absentStudents}
            </strong>

            <small>
              Students absent
            </small>

          </div>

        </div>


        {/* ATTENDANCE */}

        <div className="advisor-stat-card">

          <div className="advisor-stat-icon attendance">
            %
          </div>

          <div className="advisor-stat-content">

            <span>
              ATTENDANCE
            </span>

            <strong>
              {attendancePercentage}%
            </strong>

            <small>
              Today's attendance
            </small>

          </div>

        </div>

      </div>


      {/* =================================================
          MAIN DASHBOARD GRID
      ================================================= */}

      <div className="advisor-dashboard-grid">


        {/* =================================================
            ATTENDANCE CARD
        ================================================= */}

        <section className="advisor-dashboard-card attendance-card">

          <div className="advisor-card-header">

            <div>

              <span className="advisor-card-label">
                TODAY
              </span>

              <h3>
                Attendance Overview
              </h3>

            </div>

            <button
              type="button"
              className="advisor-view-button"
              onClick={() =>
                navigate(
                  "/advisor/attendance"
                )
              }
            >
              View Attendance
            </button>

          </div>


          <div className="advisor-attendance-body">


            {/* CIRCLE */}

            <div
              className="advisor-attendance-circle"
              style={{
                "--attendance":
                  `${attendancePercentage}%`,
              }}
            >

              <div className="advisor-attendance-circle-inner">

                <strong>
                  {attendancePercentage}%
                </strong>

                <span>
                  Present
                </span>

              </div>

            </div>


            {/* DETAILS */}

            <div className="advisor-attendance-details">

              <div className="advisor-attendance-item">

                <span className="attendance-dot present-dot">
                </span>

                <div>

                  <strong>
                    {presentStudents}
                  </strong>

                  <span>
                    Present
                  </span>

                </div>

              </div>


              <div className="advisor-attendance-item">

                <span className="attendance-dot absent-dot">
                </span>

                <div>

                  <strong>
                    {absentStudents}
                  </strong>

                  <span>
                    Absent
                  </span>

                </div>

              </div>


              <div className="advisor-attendance-item">

                <span className="attendance-dot total-dot">
                </span>

                <div>

                  <strong>
                    {classStudents.length}
                  </strong>

                  <span>
                    Total
                  </span>

                </div>

              </div>

            </div>

          </div>

        </section>


        {/* =================================================
            TIMETABLE
        ================================================= */}

        <section className="advisor-dashboard-card">

          <div className="advisor-card-header">

            <div>

              <span className="advisor-card-label">
                {todayName.toUpperCase()}
              </span>

              <h3>
                Today's Timetable
              </h3>

            </div>

            <button
              type="button"
              className="advisor-view-button"
              onClick={() =>
                navigate(
                  "/advisor/timetable"
                )
              }
            >
              View All
            </button>

          </div>


          <div className="advisor-timetable-list">

            {todayTimetable.length === 0 ? (

              <div className="advisor-empty-state">

                <div className="advisor-empty-icon">
                  ▣
                </div>

                <p>
                  No timetable available
                </p>

                <span>
                  No classes scheduled for today.
                </span>

              </div>

            ) : (

              todayTimetable
                .slice(0, 5)
                .map(
                  (item, index) => (

                    <div
                      className="advisor-timetable-item"
                      key={
                        item.id ||
                        index
                      }
                    >

                      <div className="advisor-time">

                        <strong>
                          {item.startTime ||
                            item.time ||
                            `Period ${index + 1}`}
                        </strong>

                        {item.endTime && (
                          <span>
                            {item.endTime}
                          </span>
                        )}

                      </div>


                      <div className="advisor-subject">

                        <strong>
                          {item.subject ||
                            item.subjectName ||
                            "Subject"}
                        </strong>

                        <span>
                          {item.faculty ||
                            item.teacher ||
                            item.facultyName ||
                            "Faculty"}
                        </span>

                      </div>


                      <div className="advisor-room">

                        {item.room ||
                          item.classroom ||
                          "—"}

                      </div>

                    </div>

                  )
                )

            )}

          </div>

        </section>


        {/* =================================================
            RECENT ALERTS
        ================================================= */}

        <section className="advisor-dashboard-card advisor-alert-card">

          <div className="advisor-card-header">

            <div>

              <span className="advisor-card-label">
                NOTIFICATIONS
              </span>

              <h3>
                Recent Alerts
              </h3>

            </div>

            <button
              type="button"
              className="advisor-view-button"
              onClick={() =>
                navigate(
                  "/advisor/alerts"
                )
              }
            >
              View Alerts
            </button>

          </div>


          <div className="advisor-alert-list">

            {recentAlerts.length === 0 ? (

              <div className="advisor-empty-state">

                <div className="advisor-empty-icon">
                  ✓
                </div>

                <p>
                  No recent alerts
                </p>

                <span>
                  Everything looks normal.
                </span>

              </div>

            ) : (

              recentAlerts.map(
                (alert, index) => (

                  <div
                    className="advisor-alert-item"
                    key={
                      alert.id ||
                      index
                    }
                  >

                    <div className="advisor-alert-icon">
                      ⚠
                    </div>

                    <div className="advisor-alert-content">

                      <strong>
                        {alert.title ||
                          alert.type ||
                          "Classroom Alert"}
                      </strong>

                      <p>
                        {alert.message ||
                          alert.description ||
                          "An alert requires your attention."}
                      </p>

                      <span>
                        {alert.createdAt ||
                          alert.date ||
                          ""}
                      </span>

                    </div>

                  </div>

                )
              )

            )}

          </div>

        </section>


        {/* =================================================
            QUICK ACTIONS
        ================================================= */}

        <section className="advisor-dashboard-card">

          <div className="advisor-card-header">

            <div>

              <span className="advisor-card-label">
                ACTIONS
              </span>

              <h3>
                Quick Actions
              </h3>

            </div>

          </div>


          <div className="advisor-quick-actions">


            <button
              type="button"
              onClick={() =>
                navigate(
                  "/advisor/students"
                )
              }
            >

              <span>
                ♙
              </span>

              <div>

                <strong>
                  Manage Students
                </strong>

                <small>
                  View class students
                </small>

              </div>

            </button>


            <button
              type="button"
              onClick={() =>
                navigate(
                  "/advisor/attendance"
                )
              }
            >

              <span>
                ✓
              </span>

              <div>

                <strong>
                  Attendance
                </strong>

                <small>
                  Check attendance
                </small>

              </div>

            </button>


            <button
              type="button"
              onClick={() =>
                navigate(
                  "/advisor/classroom"
                )
              }
            >

              <span>
                ◉
              </span>

              <div>

                <strong>
                  Classroom
                </strong>

                <small>
                  Start classroom session
                </small>

              </div>

            </button>


            <button
              type="button"
              onClick={() =>
                navigate(
                  "/advisor/reports"
                )
              }
            >

              <span>
                ▥
              </span>

              <div>

                <strong>
                  Reports
                </strong>

                <small>
                  View class reports
                </small>

              </div>

            </button>

          </div>

        </section>

      </div>

    </AdvisorLayout>
  );
}


/* =========================================================
   EXPORTS
========================================================= */

export {
  AdvisorLayout,
};

export default AdvisorDashboard;