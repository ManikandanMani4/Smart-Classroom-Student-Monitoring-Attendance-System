import React, { useEffect, useMemo, useState } from "react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import "./HodDashboard.css";


const HodDashboard = () => {

  const navigate = useNavigate();
  const location = useLocation();


  /* =========================================================
     DASHBOARD DATA
  ========================================================= */

  const [dashboardData, setDashboardData] = useState({
    students: [],
    classes: [],
    advisors: [],
    attendance: [],
    timetable: [],
  });


  /* =========================================================
     SIDEBAR MENU
  ========================================================= */

  const menuItems = [
    {
      label: "Dashboard",
      path: "/hod/dashboard",
      icon: "▦",
    },
    {
      label: "Students",
      path: "/hod/students",
      icon: "♙",
    },
    {
      label: "Classes",
      path: "/hod/classes",
      icon: "▤",
    },
    {
      label: "Class Advisors",
      path: "/hod/advisors",
      icon: "♟",
    },
    {
      label: "Attendance",
      path: "/hod/attendance",
      icon: "✓",
    },
    {
      label: "Timetable",
      path: "/hod/timetable",
      icon: "▣",
    },
    {
      label: "Monitoring",
      path: "/hod/monitoring",
      icon: "◉",
    },
    {
      label: "Reports",
      path: "/hod/reports",
      icon: "▥",
    },
  ];


  /* =========================================================
     LOAD DATA FROM LOCAL STORAGE
  ========================================================= */

  const loadDashboardData = () => {

    try {

      const students =
        JSON.parse(
          localStorage.getItem(
            "smartclassroom_Students"
          ) || "[]"
        );


      const classes =
        JSON.parse(
          localStorage.getItem(
            "smartclassroom_Classes"
          ) || "[]"
        );


      const staff =
        JSON.parse(
          localStorage.getItem(
            "smartclassroom_Staff"
          ) || "[]"
        );


      const advisors =
        JSON.parse(
          localStorage.getItem(
            "smartclassroom_Advisors"
          ) || "[]"
        );


      const attendance =
        JSON.parse(
          localStorage.getItem(
            "smartclassroom_Attendance"
          ) || "[]"
        );


      const timetable =
        JSON.parse(
          localStorage.getItem(
            "smartclassroom_Timetable"
          ) || "[]"
        );


      /*
        If a separate Advisors module does not exist,
        use Staff records whose role/designation contains
        "advisor".
      */

      let advisorData = advisors;


      if (
        !Array.isArray(advisorData) ||
        advisorData.length === 0
      ) {

        advisorData = Array.isArray(staff)
          ? staff.filter((item) => {

              const role =
                String(
                  item.role || ""
                ).toLowerCase();

              const designation =
                String(
                  item.designation || ""
                ).toLowerCase();

              return (
                role.includes("advisor") ||
                designation.includes("advisor")
              );

            })
          : [];

      }


      setDashboardData({
        students:
          Array.isArray(students)
            ? students
            : [],

        classes:
          Array.isArray(classes)
            ? classes
            : [],

        advisors:
          Array.isArray(advisorData)
            ? advisorData
            : [],

        attendance:
          Array.isArray(attendance)
            ? attendance
            : [],

        timetable:
          Array.isArray(timetable)
            ? timetable
            : [],
      });

    } catch (error) {

      console.error(
        "Unable to load HOD dashboard data:",
        error
      );

      setDashboardData({
        students: [],
        classes: [],
        advisors: [],
        attendance: [],
        timetable: [],
      });

    }

  };


  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {

    loadDashboardData();

  }, []);


  /* =========================================================
     REFRESH WHEN STORAGE CHANGES
  ========================================================= */

  useEffect(() => {

    const handleStorageChange = () => {
      loadDashboardData();
    };


    window.addEventListener(
      "storage",
      handleStorageChange
    );


    /*
      Custom event allows the dashboard to refresh
      immediately when another module updates
      localStorage in the same browser tab.
    */

    window.addEventListener(
      "smartclassroom:dataUpdated",
      handleStorageChange
    );


    return () => {

      window.removeEventListener(
        "storage",
        handleStorageChange
      );

      window.removeEventListener(
        "smartclassroom:dataUpdated",
        handleStorageChange
      );

    };

  }, []);


  /* =========================================================
     TOTAL VALUES
  ========================================================= */

  const totalStudents =
    dashboardData.students.length;


  const totalClasses =
    dashboardData.classes.length;


  const totalAdvisors =
    dashboardData.advisors.length;


  /* =========================================================
     TODAY'S DATE
  ========================================================= */

  const today = useMemo(() => {

    const now = new Date();

    return now.toISOString().split("T")[0];

  }, []);


  const currentDate =
    new Date().toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );


  /* =========================================================
     ATTENDANCE HELPERS
  ========================================================= */

  const isTodayRecord = (record) => {

    if (!record) {
      return false;
    }


    const possibleDate =
      record.date ||
      record.attendanceDate ||
      record.createdAt ||
      record.timestamp;


    if (!possibleDate) {
      return true;
    }


    try {

      const recordDate =
        new Date(possibleDate)
          .toISOString()
          .split("T")[0];


      return recordDate === today;

    } catch {

      return false;

    }

  };


  const isPresentRecord = (record) => {

    const status =
      String(
        record?.status ||
        record?.attendanceStatus ||
        record?.present ||
        ""
      ).toLowerCase();


    if (
      status === "present" ||
      status === "p" ||
      status === "true"
    ) {
      return true;
    }


    if (
      record?.present === true
    ) {
      return true;
    }


    return false;

  };


  /* =========================================================
     TODAY'S ATTENDANCE
  ========================================================= */

  const todayAttendance =
    dashboardData.attendance.filter(
      isTodayRecord
    );


  const presentCount =
    todayAttendance.filter(
      isPresentRecord
    ).length;


  const attendancePercentage =
    todayAttendance.length > 0
      ? Math.round(
          (
            presentCount /
            todayAttendance.length
          ) * 100
        )
      : null;


  /* =========================================================
     CLASS-WISE ATTENDANCE
  ========================================================= */

  const classAttendance = useMemo(() => {

    if (
      todayAttendance.length === 0
    ) {
      return [];
    }


    const grouped = {};


    todayAttendance.forEach((record) => {

      const className =
        record.className ||
        record.class ||
        record.classCode ||
        "Unknown Class";


      if (!grouped[className]) {

        grouped[className] = {
          className,
          present: 0,
          absent: 0,
          total: 0,
        };

      }


      grouped[className].total += 1;


      if (
        isPresentRecord(record)
      ) {

        grouped[className].present += 1;

      } else {

        grouped[className].absent += 1;

      }

    });


    return Object.values(grouped).map(
      (item) => ({

        ...item,

        percentage:
          item.total > 0
            ? Math.round(
                (
                  item.present /
                  item.total
                ) * 100
              )
            : 0,

      })
    );

  }, [todayAttendance]);


  /* =========================================================
     TODAY'S TIMETABLE
  ========================================================= */

  const todayTimetable =
    useMemo(() => {

      if (
        dashboardData.timetable.length === 0
      ) {
        return [];
      }


      const dayName =
        new Date().toLocaleDateString(
          "en-US",
          {
            weekday: "long",
          }
        );


      return dashboardData.timetable.filter(
        (item) => {

          /*
            If timetable contains a specific date,
            compare with today's date.
          */

          if (item.date) {

            try {

              return (
                new Date(item.date)
                  .toISOString()
                  .split("T")[0] === today
              );

            } catch {

              return false;

            }

          }


          /*
            If timetable contains a day,
            compare with today's day.
          */

          if (item.day) {

            return (
              String(item.day)
                .toLowerCase() ===
              dayName.toLowerCase()
            );

          }


          /*
            If no date/day exists,
            keep the record available.
          */

          return true;

        }
      );

    }, [
      dashboardData.timetable,
      today,
    ]);


  /* =========================================================
     NAVIGATION
  ========================================================= */

  const handleNavigation = (path) => {

    navigate(path);

  };


  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout = () => {

    navigate("/login");

  };


  return (

    <div className="hod-dashboard-layout">


      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside className="hod-sidebar">


        {/* BRAND */}

        <div className="hod-brand">

          <div className="hod-brand-icon">
            SC
          </div>


          <div className="hod-brand-text">

            <h2>
              SmartClassroom
            </h2>

            <span>
              ATTENDANCE SYSTEM
            </span>

          </div>

        </div>


        {/* ROLE */}

        <div className="hod-role">

          <div className="hod-role-label">
            LOGGED IN AS
          </div>

          <div className="hod-role-name">
            Department HOD
          </div>

        </div>


        {/* NAVIGATION */}

        <nav className="hod-navigation">

          {menuItems.map((item) => {

            const isActive =
              location.pathname === item.path ||
              (
                item.path !== "/hod/dashboard" &&
                location.pathname.startsWith(
                  item.path + "/"
                )
              );


            return (

              <button
                key={item.path}
                type="button"
                className={`hod-nav-item ${
                  isActive
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleNavigation(
                    item.path
                  )
                }
              >

                <span className="hod-nav-icon">
                  {item.icon}
                </span>


                <span className="hod-nav-label">
                  {item.label}
                </span>

              </button>

            );

          })}

        </nav>


        {/* USER */}

        <div className="hod-sidebar-bottom">

          <div className="hod-user">

            <div className="hod-avatar">
              H
            </div>


            <div className="hod-user-info">

              <strong>
                Department HOD
              </strong>

              <span>
                Information Technology
              </span>

            </div>

          </div>


          <button
            type="button"
            className="hod-signout"
            onClick={handleLogout}
          >

            <span className="hod-signout-icon">
              ↪
            </span>

            <span>
              Sign Out
            </span>

          </button>

        </div>

      </aside>


      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="hod-main">

        <div className="hod-page">


          {/* =================================================
              HEADER
          ================================================= */}

          <header className="hod-header">


            <div className="hod-header-content">

              <div className="hod-header-label">
                HOD DASHBOARD
              </div>


              <h1>
                Good Morning, HOD
              </h1>


              <p>
                Here's what's happening in the
                Information Technology department today.
              </p>

            </div>


            {/* DATE */}

            <div className="hod-header-date">

              <span>
                TODAY
              </span>


              <strong>
                {currentDate}
              </strong>

            </div>

          </header>


          {/* =================================================
              STATISTICS
          ================================================= */}

          <section className="hod-stats">


            {/* TOTAL STUDENTS */}

            <div className="hod-stat-card">

              <div className="hod-stat-top">

                <span className="hod-stat-title">
                  Total Students
                </span>


                <div className="hod-stat-icon">
                  👨‍🎓
                </div>

              </div>


              <strong className="hod-stat-value">

                {totalStudents}

              </strong>


              <span className="hod-stat-subtitle">
                Across all classes
              </span>

            </div>


            {/* TOTAL CLASSES */}

            <div className="hod-stat-card">

              <div className="hod-stat-top">

                <span className="hod-stat-title">
                  Total Classes
                </span>


                <div className="hod-stat-icon">
                  🏫
                </div>

              </div>


              <strong className="hod-stat-value">

                {totalClasses}

              </strong>


              <span className="hod-stat-subtitle">
                Active classes
              </span>

            </div>


            {/* CLASS ADVISORS */}

            <div className="hod-stat-card">

              <div className="hod-stat-top">

                <span className="hod-stat-title">
                  Class Advisors
                </span>


                <div className="hod-stat-icon">
                  👨‍🏫
                </div>

              </div>


              <strong className="hod-stat-value">

                {totalAdvisors}

              </strong>


              <span className="hod-stat-subtitle">
                Assigned advisors
              </span>

            </div>


            {/* ATTENDANCE */}

            <div className="hod-stat-card">

              <div className="hod-stat-top">

                <span className="hod-stat-title">
                  Today's Attendance
                </span>


                <div className="hod-stat-icon">
                  ✓
                </div>

              </div>


              <strong className="hod-stat-value">

                {attendancePercentage !== null
                  ? `${attendancePercentage}%`
                  : "—"}

              </strong>


              <span className="hod-stat-subtitle">
                Department average
              </span>

            </div>

          </section>


          {/* =================================================
              DASHBOARD GRID
          ================================================= */}

          <section className="hod-dashboard-grid">


            {/* =================================================
                CLASS-WISE ATTENDANCE
            ================================================= */}

            <div className="hod-card">


              <div className="hod-card-header">

                <div>

                  <h2>
                    Class-wise Attendance
                  </h2>


                  <p>
                    Today's attendance overview
                  </p>

                </div>


                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/hod/attendance"
                    )
                  }
                >
                  View All
                </button>

              </div>


              {classAttendance.length === 0 ? (

                <div className="hod-empty-content">

                  <div className="hod-empty-icon">
                    ✓
                  </div>


                  <h3>
                    No Attendance Data
                  </h3>


                  <p>
                    Attendance information will
                    appear here when data is available.
                  </p>

                </div>

              ) : (

                <div className="hod-attendance-list">

                  {classAttendance.map(
                    (item, index) => (

                      <div
                        className="hod-attendance-row"
                        key={
                          `${item.className}-${index}`
                        }
                      >

                        <div className="hod-class-icon">
                          {item.className
                            ?.charAt(0)
                            ?.toUpperCase() || "C"}
                        </div>


                        <div className="hod-class-info">

                          <strong>
                            {item.className}
                          </strong>

                          <span>
                            {item.total} Students
                          </span>

                        </div>


                        <div className="hod-attendance-progress">

                          <div className="hod-attendance-top">

                            <span>
                              {item.present} Present
                            </span>

                            <strong>
                              {item.percentage}%
                            </strong>

                          </div>


                          <div className="hod-progress-track">

                            <div
                              className="hod-progress-fill"
                              style={{
                                width:
                                  `${item.percentage}%`,
                              }}
                            />

                          </div>


                          <span className="hod-absent">
                            {item.absent} Absent
                          </span>

                        </div>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>


            {/* =================================================
                TODAY'S TIMETABLE
            ================================================= */}

            <div className="hod-card">


              <div className="hod-card-header">

                <div>

                  <h2>
                    Today's Timetable
                  </h2>


                  <p>
                    Department schedule
                  </p>

                </div>


                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/hod/timetable"
                    )
                  }
                >
                  View All
                </button>

              </div>


              {todayTimetable.length === 0 ? (

                <div className="hod-empty-content">

                  <div className="hod-empty-icon">
                    ▣
                  </div>


                  <h3>
                    No Timetable Data
                  </h3>


                  <p>
                    Today's timetable will
                    appear here when it is configured.
                  </p>

                </div>

              ) : (

                <div className="hod-timetable-list">

                  {todayTimetable.map(
                    (item, index) => (

                      <div
                        className="hod-timetable-row"
                        key={
                          item.id ||
                          `${item.subject}-${index}`
                        }
                      >

                        <div className="hod-time">

                          {item.time ||
                            item.startTime ||
                            "—"}

                        </div>


                        <div className="hod-timetable-info">

                          <strong>

                            {item.subject ||
                              item.subjectName ||
                              item.name ||
                              "—"}

                          </strong>


                          <span>

                            {item.className ||
                              item.class ||
                              ""}

                            {(
                              item.advisor ||
                              item.faculty ||
                              item.teacher
                            ) && (
                              <>
                                {" • "}
                                {
                                  item.advisor ||
                                  item.faculty ||
                                  item.teacher
                                }
                              </>
                            )}

                          </span>

                        </div>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>

          </section>


        </div>

      </main>

    </div>

  );
};


export default HodDashboard;