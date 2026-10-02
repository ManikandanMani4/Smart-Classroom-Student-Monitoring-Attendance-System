import { useEffect, useMemo, useState } from "react";
import AdminManagement from "../AdminManagement";
import { useAuth } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeMenu, setActiveMenu] = useState("Dashboard");

  const [search, setSearch] = useState("");

  const [showNotifications, setShowNotifications] =
    useState(false);

  const [showProfile, setShowProfile] =
    useState(false);

  /*
   =========================================================
   DYNAMIC DATA
   =========================================================
  */

  const [departments, setDepartments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [activities, setActivities] = useState([]);
  const [notifications, setNotifications] = useState([]);


  /*
   =========================================================
   LOAD DATA FROM LOCAL STORAGE
   =========================================================
  */

  const loadDashboardData = () => {
    try {
      const savedDepartments =
        JSON.parse(
          localStorage.getItem(
            "smartclassroom_Departments"
          )
        ) || [];

      const savedStaff =
        JSON.parse(
          localStorage.getItem(
            "smartclassroom_Staff"
          )
        ) || [];

      const savedStudents =
        JSON.parse(
          localStorage.getItem(
            "smartclassroom_Students"
          )
        ) || [];

      const savedAttendance =
        JSON.parse(
          localStorage.getItem(
            "smartclassroom_Attendance"
          )
        ) || [];

      const savedClassrooms =
        JSON.parse(
          localStorage.getItem(
            "smartclassroom_ClassroomSessions"
          )
        ) || [];

      const savedActivities =
        JSON.parse(
          localStorage.getItem(
            "smartclassroom_Activities"
          )
        ) || [];

      const savedNotifications =
        JSON.parse(
          localStorage.getItem(
            "smartclassroom_Notifications"
          )
        ) || [];


      setDepartments(
        Array.isArray(savedDepartments)
          ? savedDepartments
          : []
      );

      setStaff(
        Array.isArray(savedStaff)
          ? savedStaff
          : []
      );

      setStudents(
        Array.isArray(savedStudents)
          ? savedStudents
          : []
      );

      setAttendance(
        Array.isArray(savedAttendance)
          ? savedAttendance
          : []
      );

      setClassrooms(
        Array.isArray(savedClassrooms)
          ? savedClassrooms
          : []
      );

      setActivities(
        Array.isArray(savedActivities)
          ? savedActivities
          : []
      );

      setNotifications(
        Array.isArray(savedNotifications)
          ? savedNotifications
          : []
      );

    } catch (error) {
      console.error(
        "Dashboard data loading error:",
        error
      );
    }
  };


  /*
   =========================================================
   INITIAL LOAD
   =========================================================
  */

  useEffect(() => {
    loadDashboardData();

    const handleStorageChange = () => {
      loadDashboardData();
    };

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorageChange
      );
    };
  }, []);


  /*
   =========================================================
   REFRESH WHEN DASHBOARD BECOMES ACTIVE
   =========================================================
  */

  useEffect(() => {
    if (activeMenu === "Dashboard") {
      loadDashboardData();
    }
  }, [activeMenu]);


  /*
   =========================================================
   STATISTICS
   =========================================================
  */

  const totalDepartments =
    departments.length;

  const totalStaff =
    staff.length;

  const totalStudents =
    students.length;


  /*
   =========================================================
   ATTENDANCE CALCULATION
   =========================================================
  */

  const attendancePercentage = useMemo(() => {
    if (!attendance.length) {
      return null;
    }

    let present = 0;
    let total = 0;

    attendance.forEach((record) => {
      const status =
        String(
          record.status || ""
        ).toLowerCase();

      if (
        status === "present" ||
        status === "absent" ||
        status === "late" ||
        status === "leave"
      ) {
        total++;

        if (
          status === "present" ||
          status === "late"
        ) {
          present++;
        }
      }
    });

    if (!total) {
      return null;
    }

    return (
      Math.round(
        (present / total) * 1000
      ) / 10
    );
  }, [attendance]);


  /*
   =========================================================
   DEPARTMENT STATISTICS
   =========================================================
  */

  const departmentOverview =
    useMemo(() => {
      return departments.map(
        (department) => {
          const departmentName =
            department.name || "";

          const departmentStudents =
            students.filter(
              (student) =>
                String(
                  student.department || ""
                ).toLowerCase() ===
                departmentName.toLowerCase()
            ).length;

          const departmentStaff =
            staff.filter(
              (member) =>
                String(
                  member.department || ""
                ).toLowerCase() ===
                departmentName.toLowerCase()
            ).length;

          return {
            ...department,
            studentCount:
              departmentStudents,
            staffCount:
              departmentStaff,
          };
        }
      );
    }, [
      departments,
      students,
      staff,
    ]);


  /*
   =========================================================
   SEARCH ACTIVITIES
   =========================================================
  */

  const filteredActivities =
    useMemo(() => {
      if (!search.trim()) {
        return activities;
      }

      const value =
        search.toLowerCase();

      return activities.filter(
        (activity) =>
          String(
            activity.title || ""
          )
            .toLowerCase()
            .includes(value) ||
          String(
            activity.description || ""
          )
            .toLowerCase()
            .includes(value)
      );
    }, [
      search,
      activities,
    ]);


  /*
   =========================================================
   MENU
   =========================================================
  */

  const menuGroups = [
    {
      title: "MAIN",
      items: [
        {
          name: "Dashboard",
          icon: "⌂",
        },
      ],
    },

    {
      title: "MANAGEMENT",
      items: [
        {
          name: "Departments",
          icon: "▦",
        },
        {
          name: "HOD Management",
          icon: "◉",
        },
        {
          name: "Staff",
          icon: "♙",
        },
        {
          name: "Students",
          icon: "♧",
        },
        {
          name: "Classes",
          icon: "▤",
        },
        {
          name: "Subjects",
          icon: "▱",
        },
      ],
    },

    {
      title: "ACADEMIC",
      items: [
        {
          name: "Timetable",
          icon: "◷",
        },
        {
          name: "Attendance",
          icon: "✓",
        },
      ],
    },

    {
      title: "MONITORING",
      items: [
        {
          name: "Classroom Monitoring",
          icon: "◉",
        },
        {
          name: "Alerts",
          icon: "!",
        },
      ],
    },

    {
      title: "ANALYTICS",
      items: [
        {
          name: "Reports",
          icon: "▥",
        },
      ],
    },
  ];


  /*
   =========================================================
   MENU CLICK
   =========================================================
  */

  const handleMenuClick = (menu) => {
    setActiveMenu(menu);

    setShowNotifications(false);
    setShowProfile(false);
  };


  /*
   =========================================================
   LOGOUT
   =========================================================
  */

  const handleLogout = () => {
    logout();

    navigate("/login");
  };


  /*
   =========================================================
   CLEAR NOTIFICATIONS
   =========================================================
  */

  const clearNotifications = () => {
    setNotifications([]);

    localStorage.setItem(
      "smartclassroom_Notifications",
      JSON.stringify([])
    );

    setShowNotifications(false);
  };


  /*
   =========================================================
   QUICK ACTIONS
   =========================================================
  */

  const quickActions = [
    {
      title: "Add Department",
      description:
        "Create a new department",
      icon: "＋",
      menu: "Departments",
    },

    {
      title: "Add Staff",
      description:
        "Register faculty or staff",
      icon: "♙",
      menu: "Staff",
    },

    {
      title: "Add Student",
      description:
        "Register a new student",
      icon: "♧",
      menu: "Students",
    },

    {
      title: "Create Timetable",
      description:
        "Manage academic schedule",
      icon: "◷",
      menu: "Timetable",
    },
  ];


  /*
   =========================================================
   IF MANAGEMENT PAGE IS SELECTED
   =========================================================
  */

  if (activeMenu !== "Dashboard") {
    const moduleMap = {
      Faculty: "Staff",
      "HOD Management": "Staff",
      Departments: "Departments",
      Staff: "Staff",
      Students: "Students",
      Classes: "Classes",
      Subjects: "Subjects",
      Timetable: "Classes",
      Attendance: "Students",
    };

    const selectedModule =
      moduleMap[activeMenu];

    if (selectedModule) {
      return (
        <div className="admin-dashboard">

          <AdminManagement
            module={selectedModule}
            onBack={() =>
              setActiveMenu(
                "Dashboard"
              )
            }
          />

        </div>
      );
    }
  }


  /*
   =========================================================
   DASHBOARD
   =========================================================
  */

  return (
    <div className="admin-dashboard">

      {/* ===================================================
          SIDEBAR
      =================================================== */}

      <aside className="admin-sidebar">

        <div className="admin-brand">

          <div className="admin-brand-icon">
            SC
          </div>

          <div>
            <h2>
              SmartClassroom
            </h2>

            <span>
              ADMIN PORTAL
            </span>
          </div>

        </div>


        <div className="sidebar-scroll">

          {menuGroups.map(
            (group) => (

              <div
                className="sidebar-group"
                key={group.title}
              >

                <div className="sidebar-title">
                  {group.title}
                </div>

                {group.items.map(
                  (item) => (

                    <button
                      key={item.name}
                      className={`sidebar-item ${
                        activeMenu ===
                        item.name
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        handleMenuClick(
                          item.name
                        )
                      }
                    >

                      <span className="sidebar-icon">
                        {item.icon}
                      </span>

                      <span>
                        {item.name}
                      </span>

                      {item.name ===
                        "Alerts" &&
                        notifications.length >
                          0 && (
                          <span className="sidebar-badge">
                            {
                              notifications.length
                            }
                          </span>
                        )}

                    </button>

                  )
                )}

              </div>

            )
          )}

        </div>


        <div className="sidebar-bottom">

          <div className="sidebar-user">

            <div className="sidebar-avatar">
              {user?.name
                ?.charAt(0)
                ?.toUpperCase() ||
                "A"}
            </div>

            <div className="sidebar-user-info">

              <strong>
                {user?.name ||
                  "Administrator"}
              </strong>

              <span>
                College Administrator
              </span>

            </div>

          </div>


          <button
            className="logout-button"
            onClick={handleLogout}
          >
            <span>↪</span>
            Sign out
          </button>

        </div>

      </aside>


      {/* ===================================================
          MAIN
      =================================================== */}

      <main className="admin-main">

        {/* =================================================
            TOP BAR
        ================================================= */}

        <header className="admin-topbar">

          <div className="topbar-left">

            <div>

              <p className="topbar-label">
                COLLEGE ADMINISTRATION
              </p>

              <h1>
                Dashboard
              </h1>

            </div>

          </div>


          <div className="topbar-right">

            <div className="admin-search">

              <span>
                ⌕
              </span>

              <input
                type="text"
                placeholder="Search dashboard..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
              />

              <kbd>
                Ctrl K
              </kbd>

            </div>


            {/* NOTIFICATIONS */}

            <div className="topbar-action-wrapper">

              <button
                className="topbar-icon-button"
                onClick={() =>
                  setShowNotifications(
                    !showNotifications
                  )
                }
              >

                ♧

                {notifications.length >
                  0 && (
                  <span className="notification-dot">
                    {
                      notifications.length
                    }
                  </span>
                )}

              </button>


              {showNotifications && (

                <div className="notification-panel">

                  <div className="panel-header">

                    <div>

                      <strong>
                        Notifications
                      </strong>

                      <span>
                        {
                          notifications.length
                        } alerts
                      </span>

                    </div>

                    {notifications.length >
                      0 && (
                      <button
                        onClick={
                          clearNotifications
                        }
                      >
                        Clear
                      </button>
                    )}

                  </div>


                  {notifications.length ===
                  0 ? (

                    <div className="empty-notification">
                      No notifications
                    </div>

                  ) : (

                    notifications.map(
                      (
                        notification
                      ) => (

                        <div
                          className="notification-item"
                          key={
                            notification.id
                          }
                        >

                          <div
                            className={`notification-type ${
                              notification.type ||
                              "info"
                            }`}
                          >
                            !
                          </div>

                          <div>

                            <strong>
                              {
                                notification.title
                              }
                            </strong>

                            <p>
                              {
                                notification.message
                              }
                            </p>

                            <span>
                              {
                                notification.time ||
                                ""
                              }
                            </span>

                          </div>

                        </div>

                      )
                    )

                  )}

                </div>

              )}

            </div>


            {/* PROFILE */}

            <div className="profile-wrapper">

              <button
                className="profile-button"
                onClick={() =>
                  setShowProfile(
                    !showProfile
                  )
                }
              >

                <div className="profile-avatar">
                  {user?.name
                    ?.charAt(0)
                    ?.toUpperCase() ||
                    "A"}
                </div>

                <div className="profile-info">

                  <strong>
                    {user?.name ||
                      "Administrator"}
                  </strong>

                  <span>
                    Administrator
                  </span>

                </div>

                <span className="profile-arrow">
                  ▾
                </span>

              </button>


              {showProfile && (

                <div className="profile-menu">

                  <button>
                    My Profile
                  </button>

                  <button>
                    Account Settings
                  </button>

                  <button
                    className="profile-logout"
                    onClick={
                      handleLogout
                    }
                  >
                    Sign out
                  </button>

                </div>

              )}

            </div>

          </div>

        </header>


        {/* =================================================
            CONTENT
        ================================================= */}

        <div className="admin-content">


          {/* =================================================
              WELCOME
          ================================================= */}

          <section className="welcome-section">

            <div>

              <p className="welcome-label">
                OVERVIEW
              </p>

              <h2>
                Good evening,{" "}
                {user?.name ||
                  "Administrator"}.
              </h2>

              <p>
                Here's what's happening
                across your college
                today.
              </p>

            </div>


            <div className="date-card">

              <span>
                Today
              </span>

              <strong>
                {new Date().toLocaleDateString(
                  "en-IN",
                  {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }
                )}
              </strong>

            </div>

          </section>


          {/* =================================================
              DYNAMIC STATISTICS
          ================================================= */}

          <section className="stats-grid">

            <div className="admin-stat-card">

              <div className="stat-top">

                <div className="stat-icon blue">
                  ▦
                </div>

              </div>

              <span className="stat-title">
                Departments
              </span>

              <strong className="stat-value">
                {totalDepartments}
              </strong>

              <span className="stat-change">
                Registered departments
              </span>

            </div>


            <div className="admin-stat-card">

              <div className="stat-top">

                <div className="stat-icon purple">
                  ♙
                </div>

              </div>

              <span className="stat-title">
                Staff
              </span>

              <strong className="stat-value">
                {totalStaff}
              </strong>

              <span className="stat-change">
                Registered staff members
              </span>

            </div>


            <div className="admin-stat-card">

              <div className="stat-top">

                <div className="stat-icon green">
                  ♧
                </div>

              </div>

              <span className="stat-title">
                Students
              </span>

              <strong className="stat-value">
                {totalStudents}
              </strong>

              <span className="stat-change">
                Registered students
              </span>

            </div>


            <div className="admin-stat-card">

              <div className="stat-top">

                <div className="stat-icon orange">
                  ✓
                </div>

              </div>

              <span className="stat-title">
                Today's Attendance
              </span>

              <strong className="stat-value">

                {attendancePercentage !==
                null
                  ? `${attendancePercentage}%`
                  : "—"}

              </strong>

              <span className="stat-change">

                {attendancePercentage !==
                null
                  ? "Based on attendance records"
                  : "No attendance data"}

              </span>

            </div>

          </section>


          {/* =================================================
              QUICK ACTIONS
          ================================================= */}

          <section className="section-block">

            <div className="section-heading">

              <div>

                <p>
                  SHORTCUTS
                </p>

                <h3>
                  Quick Actions
                </h3>

              </div>

            </div>


            <div className="quick-actions">

              {quickActions.map(
                (action) => (

                  <button
                    className="quick-action"
                    key={action.title}
                    onClick={() =>
                      handleMenuClick(
                        action.menu
                      )
                    }
                  >

                    <div className="quick-action-icon">
                      {action.icon}
                    </div>

                    <div>

                      <strong>
                        {action.title}
                      </strong>

                      <span>
                        {
                          action.description
                        }
                      </span>

                    </div>

                    <span className="quick-arrow">
                      →
                    </span>

                  </button>

                )
              )}

            </div>

          </section>


          {/* =================================================
              DEPARTMENT OVERVIEW
          ================================================= */}

          <section className="dashboard-columns">

            <div className="panel-card">

              <div className="panel-card-header">

                <div>

                  <p>
                    ACADEMIC
                  </p>

                  <h3>
                    Department Overview
                  </h3>

                </div>

                <button
                  onClick={() =>
                    handleMenuClick(
                      "Departments"
                    )
                  }
                >
                  View all →
                </button>

              </div>


              <div className="department-list">

                {departmentOverview.length ===
                0 ? (

                  <div className="no-results">

                    No departments
                    registered yet.

                  </div>

                ) : (

                  departmentOverview.map(
                    (department) => (

                      <div
                        className="department-row"
                        key={
                          department.id ||
                          department.name
                        }
                      >

                        <div className="department-avatar">

                          {String(
                            department.code ||
                              department.name ||
                              "D"
                          )
                            .slice(0, 3)
                            .toUpperCase()}

                        </div>


                        <div className="department-info">

                          <strong>
                            {
                              department.name
                            }
                          </strong>

                          <span>

                            {
                              department.studentCount
                            }{" "}
                            students

                            &nbsp; • &nbsp;

                            {
                              department.staffCount
                            }{" "}
                            staff

                          </span>

                        </div>


                        <div className="department-attendance">

                          <strong>
                            {department.studentCount +
                              department.staffCount}
                          </strong>

                          <span>
                            records
                          </span>

                        </div>

                      </div>

                    )
                  )

                )}

              </div>

            </div>


            {/* =================================================
                ATTENDANCE
            ================================================= */}

            <div className="panel-card">

              <div className="panel-card-header">

                <div>

                  <p>
                    ATTENDANCE
                  </p>

                  <h3>
                    Attendance Summary
                  </h3>

                </div>

                <button
                  onClick={() =>
                    handleMenuClick(
                      "Attendance"
                    )
                  }
                >
                  Open →
                </button>

              </div>


              <div className="attendance-chart">

                {attendancePercentage !==
                null ? (

                  <div className="chart-value">

                    <strong>
                      {
                        attendancePercentage
                      }%
                    </strong>

                    <span>
                      Current attendance
                    </span>

                  </div>

                ) : (

                  <div className="no-results">

                    <strong>
                      No attendance
                      records
                    </strong>

                    <span>
                      Attendance data
                      will appear here
                      after sessions are
                      recorded.
                    </span>

                  </div>

                )}

              </div>

            </div>

          </section>


          {/* =================================================
              CLASSROOM MONITORING
          ================================================= */}

          <section className="section-block">

            <div className="section-heading">

              <div>

                <p>
                  LIVE SYSTEM
                </p>

                <h3>
                  Classroom Monitoring
                </h3>

              </div>

              <button
                className="view-all-button"
                onClick={() =>
                  handleMenuClick(
                    "Classroom Monitoring"
                  )
                }
              >
                Open monitoring →
              </button>

            </div>


            <div className="classroom-table">

              {classrooms.length ===
              0 ? (

                <div className="no-results">

                  No classroom sessions
                  are currently available.

                </div>

              ) : (

                <>
                  <div className="table-header">

                    <span>
                      CLASSROOM
                    </span>

                    <span>
                      CLASS
                    </span>

                    <span>
                      SUBJECT
                    </span>

                    <span>
                      ATTENDANCE
                    </span>

                    <span>
                      STATUS
                    </span>

                  </div>


                  {classrooms.map(
                    (room) => (

                      <div
                        className="table-row"
                        key={
                          room.id ||
                          room.room ||
                          Math.random()
                        }
                      >

                        <strong>
                          {
                            room.room ||
                            room.classroom ||
                            "—"
                          }
                        </strong>

                        <span>
                          {
                            room.className ||
                            room.class ||
                            "—"
                          }
                        </span>

                        <span>
                          {
                            room.subject ||
                            "—"
                          }
                        </span>

                        <span className="room-attendance">
                          {
                            room.students ||
                            room.attendance ||
                            "—"
                          }
                        </span>

                        <span className="room-status active">

                          <i></i>

                          {
                            room.status ||
                            "Active"
                          }

                        </span>

                      </div>

                    )
                  )}

                </>

              )}

            </div>

          </section>


          {/* =================================================
              RECENT ACTIVITY
          ================================================= */}

          <section className="dashboard-columns">

            <div className="panel-card">

              <div className="panel-card-header">

                <div>

                  <p>
                    SYSTEM
                  </p>

                  <h3>
                    Recent Activity
                  </h3>

                </div>

              </div>


              <div className="activity-list">

                {filteredActivities.length ===
                0 ? (

                  <div className="no-results">

                    No activity recorded
                    yet.

                  </div>

                ) : (

                  filteredActivities.map(
                    (
                      activity,
                      index
                    ) => (

                      <div
                        className="activity-item"
                        key={
                          activity.id ||
                          index
                        }
                      >

                        <div className="activity-icon">
                          {
                            activity.icon ||
                            "•"
                          }
                        </div>

                        <div className="activity-content">

                          <strong>
                            {
                              activity.title
                            }
                          </strong>

                          <p>
                            {
                              activity.description
                            }
                          </p>

                          <span>
                            {
                              activity.time ||
                              ""
                            }
                          </span>

                        </div>

                      </div>

                    )
                  )

                )}

              </div>

            </div>


            {/* =================================================
                SYSTEM STATUS
            ================================================= */}

            <div className="panel-card">

              <div className="panel-card-header">

                <div>

                  <p>
                    SYSTEM HEALTH
                  </p>

                  <h3>
                    System Status
                  </h3>

                </div>

              </div>


              <div className="system-list">

                <div className="system-item">

                  <div>
                    <span className="system-dot online"></span>

                    <strong>
                      Web Application
                    </strong>
                  </div>

                  <span>
                    Online
                  </span>

                </div>


                <div className="system-item">

                  <div>
                    <span className="system-dot online"></span>

                    <strong>
                      Face Recognition
                    </strong>
                  </div>

                  <span>
                    Ready
                  </span>

                </div>


                <div className="system-item">

                  <div>
                    <span className="system-dot online"></span>

                    <strong>
                      Local Data
                    </strong>
                  </div>

                  <span>
                    Connected
                  </span>

                </div>

              </div>


              <div className="system-footer">

                Data source: Application
                storage

              </div>

            </div>

          </section>

        </div>

      </main>

    </div>
  );
}

export default AdminDashboard;