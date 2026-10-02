import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  AuthProvider,
  useAuth,
} from "./context/AuthContext";

import Login from "./pages/auth/login/Login";

import AdminDashboard from "./pages/admin/dashboard/AdminDashboard";
import AdminManagement from "./pages/admin/AdminManagement";

import HodDashboard from "./pages/hod/dashboard/HodDashboard";
import DashboardLayout from "./layouts/DashboardLayout";

import AdvisorDashboard, {
  AdvisorLayout,
} from "./pages/advisor/dashboard/AdvisorDashboard";

import AdvisorClassroom from "./pages/advisor/classroom/AdvisorClassroom";

/* =========================================================
   GLOBAL THEME
========================================================= */

function GlobalTheme() {
  return (
    <style>{`

      * {
        box-sizing: border-box;
      }

      html,
      body,
      #root {
        width: 100%;
        min-height: 100%;
        margin: 0;
        padding: 0;
      }

      body {
        background: #ffffff;
        color: #171923;

        font-family:
          "Plus Jakarta Sans",
          Inter,
          "Segoe UI",
          Arial,
          sans-serif;

        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      button,
      input,
      select,
      textarea {
        font-family: inherit;
      }

      button {
        cursor: pointer;
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      :root {
        --primary: #5b35d5;
        --primary-light: #f1edff;
        --primary-hover: #4927b5;

        --page-bg: #ffffff;
        --section-bg: #f8f9fc;
        --card-bg: #ffffff;

        --text-main: #171923;
        --text-secondary: #697180;
        --text-muted: #969baa;

        --border: #e5e7eb;
      }


      /* =====================================================
         ADMIN WHITE THEME
      ===================================================== */

      .admin-dashboard,
      .admin-management-layout {
        min-height: 100vh;
        background: #ffffff !important;
      }


      /* =====================================================
         ADMIN MANAGEMENT SIDEBAR
      ===================================================== */

      .admin-management-sidebar {
        position: fixed !important;

        top: 0 !important;
        left: 0 !important;
        bottom: 0 !important;

        width: 297px !important;
        height: 100vh !important;

        display: flex !important;
        flex-direction: column !important;

        background: #ffffff !important;

        color: #171923 !important;

        border-right: 1px solid #e5e7eb !important;

        box-shadow: none !important;

        z-index: 1000 !important;

        overflow-y: auto !important;
      }


      .admin-management-brand {
        background: #ffffff !important;
        flex-shrink: 0;
      }


      .admin-management-role {
        background: #f8f9fc !important;
        border-color: #e5e7eb !important;
        flex-shrink: 0;
      }


      /* =====================================================
         ADMIN NAVIGATION
      ===================================================== */

      .admin-management-navigation {
        flex: 1;

        overflow-y: auto;

        padding: 12px 14px;
      }


      .admin-management-nav-item {
        width: 100% !important;

        min-height: 46px !important;

        display: flex !important;
        align-items: center !important;

        gap: 14px !important;

        margin: 0 0 4px 0 !important;

        padding: 0 14px !important;

        border: 1px solid transparent !important;

        border-radius: 9px !important;

        background: transparent !important;

        color: #596170 !important;

        text-align: left !important;

        transition:
          background 0.2s ease,
          color 0.2s ease,
          border-color 0.2s ease !important;
      }


      .admin-management-nav-item:hover {
        background: #f7f8fb !important;
        color: #171923 !important;
      }


      .admin-management-nav-item.active {
        background: #f1edff !important;
        color: #171923 !important;
        border-color: #ebe5ff !important;
      }


      .admin-management-nav-item.active
      .admin-management-nav-icon {
        color: #5b35d5 !important;
      }


      .admin-management-nav-icon {
        width: 22px;

        min-width: 22px;

        display: flex;
        align-items: center;
        justify-content: center;

        color: #697180;

        font-size: 15px;
      }


      /* =====================================================
         ADMIN USER SECTION
      ===================================================== */

      .admin-management-sidebar-bottom {
        flex-shrink: 0;

        background: #ffffff !important;

        border-top: 1px solid #e5e7eb !important;

        padding: 15px;
      }


      .admin-management-user-info strong {
        color: #171923 !important;
      }


      .admin-management-user-info span {
        color: #7c828e !important;
      }


      .admin-management-signout {
        background: #ffffff !important;

        color: #697180 !important;

        border: 1px solid #e1e4e9 !important;
      }


      .admin-management-signout:hover {
        background: #f7f8fb !important;

        color: #171923 !important;
      }


      /* =====================================================
         ADMIN MAIN
      ===================================================== */

      .admin-management-main {
        width: calc(100% - 297px) !important;

        min-height: 100vh !important;

        margin-left: 297px !important;

        background: #ffffff !important;
      }


      .management-page {
        min-height: 100vh;

        background: #ffffff !important;
      }


      .management-header {
        background: #ffffff !important;

        border-bottom: 1px solid #edf0f3;
      }


      .admin-page-content {
        width: 100%;

        padding: 30px 35px 45px;

        background: #ffffff;
      }


      /* =====================================================
         ADMIN GENERIC MODULE
      ===================================================== */

      .admin-module-page {
        width: 100%;
        min-height: calc(100vh - 100px);
        background: #ffffff;
      }


      .admin-module-header-label {
        color: #5b35d5;

        font-size: 10px;

        font-weight: 800;

        letter-spacing: 1.5px;

        text-transform: uppercase;

        margin-bottom: 8px;
      }


      .admin-module-header h1 {
        margin: 0;

        color: #171923;

        font-size: 30px;

        font-weight: 800;
      }


      .admin-module-header p {
        margin-top: 8px;

        color: #697180;

        font-size: 13px;
      }


      .admin-module-card {
        margin-top: 28px;

        padding: 45px;

        background: #ffffff;

        border: 1px solid #e5e7eb;

        border-radius: 14px;

        text-align: center;

        box-shadow:
          0 3px 12px rgba(30, 24, 70, 0.035);
      }


      .admin-module-icon {
        width: 60px;
        height: 60px;

        margin: 0 auto 18px;

        display: flex;
        align-items: center;
        justify-content: center;

        border-radius: 14px;

        background: #f1edff;

        color: #5b35d5;

        font-size: 20px;

        font-weight: 800;
      }


      .admin-module-card h2 {
        margin: 0;

        color: #171923;

        font-size: 19px;

        font-weight: 800;
      }


      .admin-module-card p {
        margin-top: 8px;

        color: #697180;

        font-size: 13px;
      }


      /* =====================================================
         HOD WHITE THEME
      ===================================================== */

      .hod-dashboard-layout {
        width: 100%;

        min-height: 100vh;

        background: #ffffff !important;
      }


      .hod-sidebar {
        background: #ffffff !important;

        color: #171923 !important;

        border-right: 1px solid #e5e7eb !important;

        box-shadow: none !important;
      }


      .hod-main {
        background: #ffffff !important;
      }


      .hod-page {
        background: #ffffff !important;
      }


      .hod-header {
        background: #ffffff !important;
      }


      .hod-module-content {
        background: #ffffff !important;
      }


      .hod-role {
        background: #f8f9fc !important;

        border-color: #e5e7eb !important;
      }


      .hod-nav-item {
        background: transparent !important;

        color: #596170 !important;
      }


      .hod-nav-item:hover {
        background: #f7f8fb !important;

        color: #171923 !important;
      }


      .hod-nav-item.active {
        background: #f1edff !important;

        color: #5b35d5 !important;
      }


      .hod-sidebar-bottom {
        background: #ffffff !important;

        border-top: 1px solid #e5e7eb !important;
      }


      /* =====================================================
         ADVISOR
         
         AdvisorDashboard.css controls Advisor layout.
      ===================================================== */

      .advisor-dashboard-layout {
        width: 100%;

        min-height: 100vh;
      }


      /* =====================================================
         RESPONSIVE
      ===================================================== */

      @media (max-width: 900px) {

        .admin-management-sidebar {
          width: 230px !important;
        }

        .admin-management-main {
          width: calc(100% - 230px) !important;

          margin-left: 230px !important;
        }

      }


      @media (max-width: 650px) {

        .admin-management-sidebar {
          width: 70px !important;
        }

        .admin-management-main {
          width: calc(100% - 70px) !important;

          margin-left: 70px !important;
        }

        .admin-management-brand-text,
        .admin-management-role,
        .admin-management-user-info {
          display: none !important;
        }

        .admin-management-nav-item {
          justify-content: center !important;

          padding: 0 !important;
        }

        .admin-management-nav-item > span:last-child {
          display: none !important;
        }

      }

    `}</style>
  );
}


/* =========================================================
   PROTECTED ROUTE
========================================================= */

function ProtectedRoute({
  children,
  allowedRoles,
}) {
  const { user } = useAuth();

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <Navigate
        to="/unauthorized"
        replace
      />
    );
  }

  return children;
}


/* =========================================================
   ADMIN GENERIC MODULE
========================================================= */

function AdminModulePage({
  title,
  description,
}) {
  return (
    <div className="admin-module-page">

      <div className="admin-module-header">

        <div className="admin-module-header-label">
          ADMINISTRATION
        </div>

        <h1>
          {title}
        </h1>

        <p>
          {description}
        </p>

      </div>


      <div className="admin-module-card">

        <div className="admin-module-icon">
          SC
        </div>

        <h2>
          {title}
        </h2>

        <p>
          This module is ready to be configured.
        </p>

      </div>

    </div>
  );
}


/* =========================================================
   ADMIN SIDEBAR LAYOUT
========================================================= */

function AdminLayout({
  children,
}) {
  const { user, logout } = useAuth();

  const navigate = useNavigate();

  const location = useLocation();


  const menuItems = [
    {
      label: "Dashboard",
      path: "/admin/dashboard",
      icon: "⌂",
    },

    {
      label: "Departments",
      path: "/admin/departments",
      icon: "▦",
    },

    {
      label: "Staff",
      path: "/admin/staff",
      icon: "♙",
    },

    {
      label: "Students",
      path: "/admin/students",
      icon: "♧",
    },

    {
      label: "Classes",
      path: "/admin/classes",
      icon: "▣",
    },

    {
      label: "Subjects",
      path: "/admin/subjects",
      icon: "▤",
    },

    {
      label: "HOD Management",
      path: "/admin/hod",
      icon: "◉",
    },

    {
      label: "Timetable",
      path: "/admin/timetable",
      icon: "◷",
    },

    {
      label: "Attendance",
      path: "/admin/attendance",
      icon: "✓",
    },

    {
      label: "Monitoring",
      path: "/admin/monitoring",
      icon: "◉",
    },

    {
      label: "Reports",
      path: "/admin/reports",
      icon: "▤",
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

    if (path === "/admin/dashboard") {
      return location.pathname === path;
    }

    return (
      location.pathname === path ||
      location.pathname.startsWith(path + "/")
    );
  };


  return (
    <div className="admin-management-layout">

      {/* ===================================================
          SIDEBAR
      =================================================== */}

      <aside className="admin-management-sidebar">

        {/* BRAND */}

        <div className="admin-management-brand">

          <div className="admin-management-brand-icon">
            SC
          </div>

          <div className="admin-management-brand-text">

            <h2>
              SmartClassroom
            </h2>

            <span>
              SMART CAMPUS
            </span>

          </div>

        </div>


        {/* ROLE */}

        <div className="admin-management-role">

          <div className="admin-management-role-label">
            ROLE
          </div>

          <div className="admin-management-role-name">
            COLLEGE ADMIN
          </div>

        </div>


        {/* NAVIGATION */}

        <nav className="admin-management-navigation">

          {menuItems.map((item) => {

            const active =
              isActive(item.path);

            return (
              <button
                key={item.path}
                type="button"
                className={
                  `admin-management-nav-item ${
                    active ? "active" : ""
                  }`
                }
                onClick={() =>
                  handleNavigation(item.path)
                }
              >

                <span className="admin-management-nav-icon">
                  {item.icon}
                </span>

                <span>
                  {item.label}
                </span>

              </button>
            );

          })}

        </nav>


        {/* USER */}

        <div className="admin-management-sidebar-bottom">

          <div className="admin-management-user">

            <div className="admin-management-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || "A"}
            </div>

            <div className="admin-management-user-info">

              <strong>
                {user?.name || "College Administrator"}
              </strong>

              <span>
                College Admin
              </span>

            </div>

          </div>


          <button
            type="button"
            className="admin-management-signout"
            onClick={handleLogout}
          >

            <span>
              ↪
            </span>

            <span>
              Sign out
            </span>

          </button>

        </div>

      </aside>


      {/* ===================================================
          MAIN
      =================================================== */}

      <main className="admin-management-main">

        <div className="management-page">

          {children}

        </div>

      </main>

    </div>
  );
}


/* =========================================================
   HOD MODULE
========================================================= */

function HodModulePage({
  title,
  description,
}) {
  return (
    <div
      style={{
        width: "100%",
        background: "#ffffff",
      }}
    >

      <div
        style={{
          marginBottom: "25px",
        }}
      >

        <div
          style={{
            color: "#5b35d5",
            fontSize: "10px",
            fontWeight: 800,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}
        >
          HOD MANAGEMENT
        </div>


        <h1
          style={{
            margin: 0,
            color: "#171923",
            fontSize: "30px",
            fontWeight: 800,
          }}
        >
          {title}
        </h1>


        <p
          style={{
            marginTop: "8px",
            color: "#697180",
            fontSize: "13px",
          }}
        >
          {description}
        </p>

      </div>


      <div
        style={{
          background: "#ffffff",

          border: "1px solid #e5e7eb",

          borderRadius: "12px",

          padding: "45px",

          textAlign: "center",

          boxShadow:
            "0 3px 12px rgba(30, 24, 70, 0.035)",
        }}
      >

        <div
          style={{
            width: "55px",
            height: "55px",

            margin: "0 auto 15px",

            display: "flex",
            alignItems: "center",
            justifyContent: "center",

            borderRadius: "12px",

            background: "#f1edff",

            color: "#5b35d5",

            fontSize: "22px",

            fontWeight: 800,
          }}
        >
          SC
        </div>


        <h2
          style={{
            margin: 0,
            color: "#171923",
            fontSize: "18px",
          }}
        >
          {title}
        </h2>


        <p
          style={{
            marginTop: "8px",
            color: "#697180",
            fontSize: "13px",
          }}
        >
          This HOD module is ready to be configured.
        </p>

      </div>

    </div>
  );
}


/* =========================================================
   ADVISOR MODULE
========================================================= */

function AdvisorModulePage({
  title,
  description,
}) {
  return (
    <div
      style={{
        width: "100%",
      }}
    >

      <div
        style={{
          background: "#ffffff",

          border: "1px solid #e5e7eb",

          borderRadius: "14px",

          padding: "45px",

          textAlign: "center",
        }}
      >

        <div
          style={{
            width: "55px",
            height: "55px",

            margin: "0 auto 15px",

            display: "flex",
            alignItems: "center",
            justifyContent: "center",

            borderRadius: "12px",

            background: "#f1edff",

            color: "#5b35d5",

            fontSize: "22px",

            fontWeight: 800,
          }}
        >
          SC
        </div>


        <h2
          style={{
            margin: 0,
            color: "#171923",
            fontSize: "20px",
            fontWeight: 800,
          }}
        >
          {title}
        </h2>


        <p
          style={{
            marginTop: "8px",
            color: "#697180",
            fontSize: "13px",
          }}
        >
          {description}
        </p>

      </div>

    </div>
  );
}


/* =========================================================
   APP ROUTES
========================================================= */

function AppRoutes() {

  return (
    <>
      <GlobalTheme />

      <Routes>

        {/* =================================================
            LOGIN
        ================================================= */}

        <Route
          path="/login"
          element={<Login />}
        />


        {/* =================================================
            ROOT
        ================================================= */}

        <Route
          path="/"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />


        {/* =================================================
            ADMIN DASHBOARD
        ================================================= */}

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute
              allowedRoles={[
                "COLLEGE_ADMIN",
              ]}
            >
              <AdminDashboard />
            </ProtectedRoute>
          }
        />


        {/* =================================================
            ADMIN DEPARTMENTS
        ================================================= */}

        <Route
          path="/admin/departments"
          element={
            <ProtectedRoute
              allowedRoles={[
                "COLLEGE_ADMIN",
              ]}
            >
              <AdminManagement
                module="Departments"
              />
            </ProtectedRoute>
          }
        />


        {/* =================================================
            ADMIN STAFF
        ================================================= */}

        <Route
          path="/admin/staff"
          element={
            <ProtectedRoute
              allowedRoles={[
                "COLLEGE_ADMIN",
              ]}
            >
              <AdminManagement
                module="Staff"
              />
            </ProtectedRoute>
          }
        />


        {/* =================================================
            ADMIN STUDENTS
        ================================================= */}

        <Route
          path="/admin/students"
          element={
            <ProtectedRoute
              allowedRoles={[
                "COLLEGE_ADMIN",
              ]}
            >
              <AdminManagement
                module="Students"
              />
            </ProtectedRoute>
          }
        />


        {/* =================================================
            ADMIN CLASSES
        ================================================= */}

        <Route
          path="/admin/classes"
          element={
            <ProtectedRoute
              allowedRoles={[
                "COLLEGE_ADMIN",
              ]}
            >
              <AdminManagement
                module="Classes"
              />
            </ProtectedRoute>
          }
        />


        {/* =================================================
            ADMIN SUBJECTS
        ================================================= */}

        <Route
          path="/admin/subjects"
          element={
            <ProtectedRoute
              allowedRoles={[
                "COLLEGE_ADMIN",
              ]}
            >
              <AdminManagement
                module="Subjects"
              />
            </ProtectedRoute>
          }
        />


        {/* =================================================
            ADMIN HOD MANAGEMENT
        ================================================= */}

        <Route
          path="/admin/hod"
          element={
            <ProtectedRoute
              allowedRoles={[
                "COLLEGE_ADMIN",
              ]}
            >
              <AdminManagement
                module="Staff"
              />
            </ProtectedRoute>
          }
        />


        {/* =================================================
            ADMIN TIMETABLE
        ================================================= */}

        <Route
          path="/admin/timetable"
          element={
            <ProtectedRoute
              allowedRoles={[
                "COLLEGE_ADMIN",
              ]}
            >
              <AdminLayout>

                <div className="admin-page-content">

                  <AdminModulePage
                    title="Timetable"
                    description="Manage college academic timetables."
                  />

                </div>

              </AdminLayout>
            </ProtectedRoute>
          }
        />


        {/* =================================================
            ADMIN ATTENDANCE
        ================================================= */}

        <Route
          path="/admin/attendance"
          element={
            <ProtectedRoute
              allowedRoles={[
                "COLLEGE_ADMIN",
              ]}
            >
              <AdminLayout>

                <div className="admin-page-content">

                  <AdminModulePage
                    title="Attendance"
                    description="Monitor attendance across the college."
                  />

                </div>

              </AdminLayout>
            </ProtectedRoute>
          }
        />


        {/* =================================================
            ADMIN MONITORING
        ================================================= */}

        <Route
          path="/admin/monitoring"
          element={
            <ProtectedRoute
              allowedRoles={[
                "COLLEGE_ADMIN",
              ]}
            >
              <AdminLayout>

                <div className="admin-page-content">

                  <AdminModulePage
                    title="Monitoring"
                    description="Monitor classroom sessions and attendance activity."
                  />

                </div>

              </AdminLayout>
            </ProtectedRoute>
          }
        />


        {/* =================================================
            ADMIN REPORTS
        ================================================= */}

        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute
              allowedRoles={[
                "COLLEGE_ADMIN",
              ]}
            >
              <AdminLayout>

                <div className="admin-page-content">

                  <AdminModulePage
                    title="Reports"
                    description="Generate and view college attendance reports."
                  />

                </div>

              </AdminLayout>
            </ProtectedRoute>
          }
        />


        {/* =================================================
            HOD DASHBOARD
        ================================================= */}

        <Route
          path="/hod/dashboard"
          element={
            <ProtectedRoute
              allowedRoles={[
                "HOD",
              ]}
            >
              <HodDashboard />
            </ProtectedRoute>
          }
        />


        {/* =================================================
            HOD STUDENTS
        ================================================= */}

        <Route
          path="/hod/students"
          element={
            <ProtectedRoute
              allowedRoles={[
                "HOD",
              ]}
            >
              <DashboardLayout title="Students">

                <HodModulePage
                  title="Students"
                  description="Manage students in the Information Technology department."
                />

              </DashboardLayout>
            </ProtectedRoute>
          }
        />


        {/* =================================================
            HOD CLASSES
        ================================================= */}

        <Route
          path="/hod/classes"
          element={
            <ProtectedRoute
              allowedRoles={[
                "HOD",
              ]}
            >
              <DashboardLayout title="Classes">

                <HodModulePage
                  title="Classes"
                  description="Manage department classes and class information."
                />

              </DashboardLayout>
            </ProtectedRoute>
          }
        />


        {/* =================================================
            HOD ADVISORS
        ================================================= */}

        <Route
          path="/hod/advisors"
          element={
            <ProtectedRoute
              allowedRoles={[
                "HOD",
              ]}
            >
              <DashboardLayout title="Class Advisors">

                <HodModulePage
                  title="Class Advisors"
                  description="Manage class advisors assigned to the department."
                />

              </DashboardLayout>
            </ProtectedRoute>
          }
        />


        {/* =================================================
            HOD ATTENDANCE
        ================================================= */}

        <Route
          path="/hod/attendance"
          element={
            <ProtectedRoute
              allowedRoles={[
                "HOD",
              ]}
            >
              <DashboardLayout title="Attendance">

                <HodModulePage
                  title="Attendance"
                  description="View and monitor department attendance records."
                />

              </DashboardLayout>
            </ProtectedRoute>
          }
        />


        {/* =================================================
            HOD TIMETABLE
        ================================================= */}

        <Route
          path="/hod/timetable"
          element={
            <ProtectedRoute
              allowedRoles={[
                "HOD",
              ]}
            >
              <DashboardLayout title="Timetable">

                <HodModulePage
                  title="Timetable"
                  description="Manage the department timetable."
                />

              </DashboardLayout>
            </ProtectedRoute>
          }
        />


        {/* =================================================
            HOD MONITORING
        ================================================= */}

        <Route
          path="/hod/monitoring"
          element={
            <ProtectedRoute
              allowedRoles={[
                "HOD",
              ]}
            >
              <DashboardLayout title="Monitoring">

                <HodModulePage
                  title="Monitoring"
                  description="Monitor classroom sessions and attendance activity."
                />

              </DashboardLayout>
            </ProtectedRoute>
          }
        />


        {/* =================================================
            HOD REPORTS
        ================================================= */}

        <Route
          path="/hod/reports"
          element={
            <ProtectedRoute
              allowedRoles={[
                "HOD",
              ]}
            >
              <DashboardLayout title="Reports">

                <HodModulePage
                  title="Reports"
                  description="Generate and view department attendance reports."
                />

              </DashboardLayout>
            </ProtectedRoute>
          }
        />


        {/* =================================================
            ADVISOR DASHBOARD
        ================================================= */}

        <Route
          path="/advisor/dashboard"
          element={
            <ProtectedRoute
              allowedRoles={[
                "CLASS_ADVISOR",
              ]}
            >
              <AdvisorDashboard />
            </ProtectedRoute>
          }
        />


        {/* =================================================
            ADVISOR STUDENTS
        ================================================= */}

        <Route
          path="/advisor/students"
          element={
            <ProtectedRoute
              allowedRoles={[
                "CLASS_ADVISOR",
              ]}
            >
              <AdvisorLayout
                title="Students"
                description="Manage students assigned to your class."
              >

                <AdvisorModulePage
                  title="Students"
                  description="Manage students assigned to your class."
                />

              </AdvisorLayout>
            </ProtectedRoute>
          }
        />


        {/* =================================================
            ADVISOR ATTENDANCE
        ================================================= */}

        <Route
          path="/advisor/attendance"
          element={
            <ProtectedRoute
              allowedRoles={[
                "CLASS_ADVISOR",
              ]}
            >
              <AdvisorLayout
                title="Attendance"
                description="View and manage attendance for your assigned class."
              >

                <AdvisorModulePage
                  title="Attendance"
                  description="View and manage attendance for your assigned class."
                />

              </AdvisorLayout>
            </ProtectedRoute>
          }
        />


        {/* =================================================
            ADVISOR TIMETABLE
        ================================================= */}

        <Route
          path="/advisor/timetable"
          element={
            <ProtectedRoute
              allowedRoles={[
                "CLASS_ADVISOR",
              ]}
            >
              <AdvisorLayout
                title="Timetable"
                description="View the timetable for your assigned class."
              >

                <AdvisorModulePage
                  title="Timetable"
                  description="View the timetable for your assigned class."
                />

              </AdvisorLayout>
            </ProtectedRoute>
          }
        />


        {/* =================================================
            ADVISOR CLASSROOM
        ================================================= */}

       <Route
  path="/advisor/classroom"
  element={
    <ProtectedRoute
      allowedRoles={["CLASS_ADVISOR"]}
    >
      <AdvisorLayout
        title="Classroom"
        description="Start and monitor classroom attendance sessions."
      >
        <AdvisorClassroom />
      </AdvisorLayout>
    </ProtectedRoute>
  }
/>


        {/* =================================================
            ADVISOR ALERTS
        ================================================= */}

        <Route
          path="/advisor/alerts"
          element={
            <ProtectedRoute
              allowedRoles={[
                "CLASS_ADVISOR",
              ]}
            >
              <AdvisorLayout
                title="Alerts"
                description="View classroom and attendance alerts."
              >

                <AdvisorModulePage
                  title="Alerts"
                  description="View classroom and attendance alerts."
                />

              </AdvisorLayout>
            </ProtectedRoute>
          }
        />


        {/* =================================================
            ADVISOR REPORTS
        ================================================= */}

        <Route
          path="/advisor/reports"
          element={
            <ProtectedRoute
              allowedRoles={[
                "CLASS_ADVISOR",
              ]}
            >
              <AdvisorLayout
                title="Reports"
                description="View attendance and classroom reports."
              >

                <AdvisorModulePage
                  title="Reports"
                  description="View attendance and classroom reports."
                />

              </AdvisorLayout>
            </ProtectedRoute>
          }
        />


        {/* =================================================
            UNAUTHORIZED
        ================================================= */}

        <Route
          path="/unauthorized"
          element={
            <div
              style={{
                minHeight: "100vh",

                display: "flex",
                alignItems: "center",
                justifyContent: "center",

                background: "#ffffff",

                padding: "20px",
              }}
            >

              <div
                style={{
                  width: "100%",
                  maxWidth: "450px",

                  padding: "45px",

                  background: "#ffffff",

                  border: "1px solid #e5e7eb",

                  borderRadius: "16px",

                  textAlign: "center",

                  boxShadow:
                    "0 8px 30px rgba(30, 24, 70, 0.06)",
                }}
              >

                <div
                  style={{
                    width: "60px",
                    height: "60px",

                    margin: "0 auto 18px",

                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",

                    borderRadius: "14px",

                    background: "#f1edff",

                    color: "#5b35d5",

                    fontSize: "24px",

                    fontWeight: 800,
                  }}
                >
                  !
                </div>


                <h1
                  style={{
                    margin: 0,
                    color: "#171923",
                  }}
                >
                  Unauthorized
                </h1>


                <p
                  style={{
                    marginTop: "10px",
                    color: "#697180",
                  }}
                >
                  You do not have permission to access this page.
                </p>

              </div>

            </div>
          }
        />


        {/* =================================================
            FALLBACK
        ================================================= */}

        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

      </Routes>
    </>
  );
}


/* =========================================================
   APP
========================================================= */

function App() {

  return (
    <BrowserRouter>

      <AuthProvider>

        <AppRoutes />

      </AuthProvider>

    </BrowserRouter>
  );
}


export default App;