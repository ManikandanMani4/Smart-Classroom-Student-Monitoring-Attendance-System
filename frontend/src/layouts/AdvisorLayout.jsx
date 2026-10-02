import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import "./AdvisorLayout.css";
function AdvisorLayout({
  children,
  title,
  description,
}) {
  const { user, logout } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

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

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="advisor-dashboard-layout">

      {/* ================================
          LEFT SIDEBAR
      ================================= */}

      <aside className="advisor-sidebar">

        {/* BRAND */}

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


        {/* ROLE */}

        <div className="advisor-role">

          <div className="advisor-role-label">
            LOGGED IN AS
          </div>

          <div className="advisor-role-name">
            Class Advisor
          </div>

        </div>


        {/* NAVIGATION */}

        <nav className="advisor-navigation">

          {menuItems.map((item) => {

            const active =
              location.pathname === item.path ||
              (
                item.path !== "/advisor/dashboard" &&
                location.pathname.startsWith(
                  item.path + "/"
                )
              );

            return (
              <button
                key={item.path}
                type="button"
                className={
                  `advisor-nav-item ${
                    active ? "active" : ""
                  }`
                }
                onClick={() => navigate(item.path)}
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


        {/* USER */}

        <div className="advisor-sidebar-bottom">

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
                {user?.department ||
                  "Information Technology"}
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


      {/* ================================
          MAIN CONTENT
      ================================= */}

      <main className="advisor-main">

        <div className="advisor-page">

          <div className="advisor-header">

            <div className="advisor-header-left">

              <div className="advisor-header-label">
                CLASS ADVISOR
              </div>

              <h1>
                {title}
              </h1>

              <p>
                {description}
              </p>

            </div>

          </div>


          <div className="advisor-module-content">

            {children}

          </div>

        </div>

      </main>

    </div>
  );
}

export default AdvisorLayout;