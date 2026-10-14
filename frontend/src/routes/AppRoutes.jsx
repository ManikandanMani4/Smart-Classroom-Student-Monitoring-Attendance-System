import { Navigate, Route, Routes } from "react-router-dom";
import Reports from "../pages/advisor/reports/Reports";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import AdvisorRegister from "../pages/auth/AdvisorRegister";
import Students from "../pages/hod/students/Students";
import Attendance from "../pages/advisor/attendance/Attendance";
import AdminDashboard from "../pages/admin/dashboard/AdminDashboard";
import AdminManagement from "../pages/admin/AdminManagement";
import Alerts from "../pages/advisor/alerts/Alerts";
import HodDashboard from "../pages/hod/dashboard/HodDashboard";
import DashboardLayout from "../layouts/DashboardLayout";
import GlobalTheme from "../components/GlobalTheme";
import AdvisorDashboard, {
  AdvisorLayout,
} from "../pages/advisor/dashboard/AdvisorDashboard";
import Timetable from "../pages/advisor/timetable/Timetable";
import AdvisorStudents from "../pages/advisor/students/AdvisorStudents";
import AdvisorClassroom from "../pages/advisor/classroom/AdvisorClassroom";
import ProtectedRoute from "./ProtectedRoute";
/* =========================================================
   GENERIC MODULE PAGE
   Used only for modules that are not implemented yet.
========================================================= */
function ModulePage({ title, description }) {
  return (
    <section
      style={{
        width: "100%",
        padding: "28px",
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "14px",
      }}
    >
      <h2 style={{ marginTop: 0, color: "#171923" }}>
        {title}
      </h2>

      <p style={{ color: "#697180" }}>
        {description}
      </p>
    </section>
  );
}

/* =========================================================
   ROUTES
========================================================= */

function AppRoutes() {
  return (
    <>
      <GlobalTheme />

      <Routes>
       
       <Route path="/login" element={<Login />} />

<Route path="/register" element={<Register />} />

<Route
  path="/advisor-register"
  element={<AdvisorRegister />}
/>

<Route
  path="/"
  element={<Navigate to="/advisor-register" replace />}
/>
        {/* ================= ADMIN ================= */}

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {[
          ["departments", "Departments"],
          ["staff", "Staff"],
          ["students", "Students"],
          ["classes", "Classes"],
          ["subjects", "Subjects"],
          ["hod", "Staff"],
        ].map(([path, module]) => (
          <Route
            key={path}
            path={`/admin/${path}`}
            element={
              <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                <AdminManagement module={module} />
              </ProtectedRoute>
            }
          />
        ))}

        {[
          ["timetable", "Timetable", "Manage college timetables."],
          ["attendance", "Attendance", "Monitor college attendance."],
          ["monitoring", "Monitoring", "Monitor classroom activity."],
          ["reports", "Reports", "View college reports."],
        ].map(([path, title, description]) => (
          <Route
            key={path}
            path={`/admin/${path}`}
            element={
              <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                <ModulePage
                  title={title}
                  description={description}
                />
              </ProtectedRoute>
            }
          />
        ))}

        {/* ================= HOD ================= */}

        <Route
          path="/hod/dashboard"
          element={
            <ProtectedRoute allowedRoles={["HOD"]}>
              <HodDashboard />
            </ProtectedRoute>
          }
        />

{/* HOD Student Management Page */}

<Route
  path="/hod/students"
  element={
    <ProtectedRoute allowedRoles={["HOD"]}>
      <DashboardLayout title="Students">
        <Students />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>

{/* Other HOD modules */}

{[
  ["classes", "Classes", "Manage department classes."],
  ["advisors", "Class Advisors", "Manage assigned class advisors."],
  ["attendance", "Attendance", "View department attendance."],
  ["timetable", "Timetable", "View the department timetable."],
  ["monitoring", "Monitoring", "Monitor classroom activity."],
  ["reports", "Reports", "View department reports."],
].map(([path, title, description]) => (
  <Route
    key={path}
    path={`/hod/${path}`}
    element={
      <ProtectedRoute allowedRoles={["HOD"]}>
        <DashboardLayout title={title}>
          <ModulePage
            title={title}
            description={description}
          />
        </DashboardLayout>
      </ProtectedRoute>
    }
  />
))}


        {/* ================= CLASS ADVISOR ================= */}

        <Route
          path="/advisor/dashboard"
          element={
            <ProtectedRoute allowedRoles={["CLASS_ADVISOR"]}>
              <AdvisorDashboard />
            </ProtectedRoute>
          }
        />

        {/* Actual student management page */}

        <Route
          path="/advisor/students"
          element={
            <ProtectedRoute allowedRoles={["CLASS_ADVISOR"]}>
              <AdvisorLayout
                title="Students"
                description="Manage students assigned to your class."
              >
                <AdvisorStudents />
              </AdvisorLayout>
            </ProtectedRoute>
          }
        />

        {/* Actual camera classroom page */}

        <Route
          path="/advisor/classroom"
          element={
            <ProtectedRoute allowedRoles={["CLASS_ADVISOR"]}>
              <AdvisorLayout
                title="Classroom"
                description="Start and monitor classroom attendance sessions."
              >
                <AdvisorClassroom />
              </AdvisorLayout>
            </ProtectedRoute>
          }
        />

{/* Actual attendance page */}

<Route
  path="/advisor/attendance"
  element={
    <ProtectedRoute allowedRoles={["CLASS_ADVISOR"]}>
      <AdvisorLayout
        title="Attendance"
        description="Monitor automatically recorded classroom attendance."
      >
        <Attendance />
      </AdvisorLayout>
    </ProtectedRoute>
  }
/>

{/* Other advisor modules */}


{/* Actual timetable upload and management page */}

<Route
  path="/advisor/timetable"
  element={
    <ProtectedRoute allowedRoles={["CLASS_ADVISOR"]}>
      <AdvisorLayout
        title="Timetable"
        description="Upload, extract, review, and manage your class timetable."
      >
        <Timetable />
      </AdvisorLayout>
    </ProtectedRoute>
  }
/>

<Route
  path="/advisor/alerts"
  element={
    <ProtectedRoute allowedRoles={["CLASS_ADVISOR"]}>
      <AdvisorLayout
        title="Alerts"
        description="View classroom and attendance alerts."
      >
        <Alerts />
      </AdvisorLayout>
    </ProtectedRoute>
  }
/>


<Route
  path="/advisor/reports"
  element={
    <ProtectedRoute allowedRoles={["CLASS_ADVISOR"]}>
      <AdvisorLayout
        title="Reports"
        description="View attendance and classroom reports."
      >
        <Reports />
      </AdvisorLayout>
    </ProtectedRoute>
  }
/>


          

        {/* ================= UNAUTHORIZED ================= */}

        <Route
          path="/unauthorized"
          element={
            <div
              style={{
                minHeight: "100vh",
                display: "grid",
                placeItems: "center",
                padding: "24px",
                textAlign: "center",
              }}
            >
              <div>
                <h1>Unauthorized</h1>
                <p>You do not have permission to access this page.</p>
              </div>
            </div>
          }
        />

        {/* ================= FALLBACK ================= */}

        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    </>
  );
}

export default AppRoutes;
