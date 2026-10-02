import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import "../pages/hod/dashboard/HodDashboard.css";

function DashboardLayout({ children, title }) {
  const { user, logout } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

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

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => {
    if (location.pathname === path) {
      return true;
    }

    if (path === "/hod/dashboard") {
      return false;
    }

    return location.pathname.startsWith(path + "/");
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
            <h2>SmartClassroom</h2>

            <span>
              ATTENDANCE SYSTEM
            </span>
          </div>
        </div>


        {/* LOGGED IN AS */}

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

          {menuItems.map((item) => (
            <button
              key={item.path}
              type="button"
              className={`hod-nav-item ${
                isActive(item.path) ? "active" : ""
              }`}
              onClick={() => handleNavigation(item.path)}
            >
              <span className="hod-nav-icon">
                {item.icon}
              </span>

              <span className="hod-nav-label">
                {item.label}
              </span>
            </button>
          ))}

        </nav>


        {/* SIDEBAR BOTTOM */}

        <div className="hod-sidebar-bottom">

          <div className="hod-user">

            <div className="hod-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || "H"}
            </div>

            <div className="hod-user-info">

              <strong>
                {user?.name || "Department HOD"}
              </strong>

              <span>
                {user?.department || "Information Technology"}
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
          MAIN CONTENT
      ===================================================== */}

      <main className="hod-main">

        <div className="hod-page">

          {/* HEADER */}

          <div className="hod-header">

            <div className="hod-header-content">

              <div className="hod-header-label">
                HOD MANAGEMENT
              </div>

              <h1>
                {title}
              </h1>

              <p>
                {title === "Students" &&
                  "Manage and monitor students in the Information Technology department."}

                {title === "Classes" &&
                  "View and manage department classes."}

                {title === "Class Advisors" &&
                  "Manage class advisors assigned to the department."}

                {title === "Attendance" &&
                  "Monitor attendance across all department classes."}

                {title === "Timetable" &&
                  "View and manage the department timetable."}

                {title === "Monitoring" &&
                  "Monitor classroom attendance sessions and alerts."}

                {title === "Reports" &&
                  "View and generate department attendance reports."}

                {![
                  "Students",
                  "Classes",
                  "Class Advisors",
                  "Attendance",
                  "Timetable",
                  "Monitoring",
                  "Reports",
                ].includes(title) &&
                  `Manage and monitor the ${title.toLowerCase()} module of the Information Technology department.`}
              </p>

            </div>

          </div>


          {/* PAGE CONTENT */}

          <div className="hod-module-content">
            {children}
          </div>

        </div>

      </main>

    </div>
  );
}

export default DashboardLayout;