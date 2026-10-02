import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import "./Login.css";

// Smart Classroom left-panel image
import classroomImage from "../../../assets/smartclassroom-left-panel.png";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // --------------------------------------------------
  // Login
  // --------------------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    // Small delay for better UI feedback
    await new Promise((resolve) => setTimeout(resolve, 400));

    const result = login(email, password);

    if (!result.success) {
      setError(result.message);
      setLoading(false);
      return;
    }

    const role = result.user.role;

    if (role === "COLLEGE_ADMIN") {
      navigate("/admin/dashboard");
    } else if (role === "HOD") {
      navigate("/hod/dashboard");
    } else if (role === "CLASS_ADVISOR") {
      navigate("/advisor/dashboard");
    } else {
      setError("Your account does not have a valid role.");
    }

    setLoading(false);
  };

  // --------------------------------------------------
  // Demo accounts
  // --------------------------------------------------

  const useAdminAccount = () => {
    setEmail("admin@smartclassroom.com");
    setPassword("Admin@123");
    setError("");
  };

  const useHodAccount = () => {
    setEmail("hod.it@smartclassroom.com");
    setPassword("Hod@123");
    setError("");
  };

  const useAdvisorAccount = () => {
    setEmail("advisor.it@smartclassroom.com");
    setPassword("Advisor@123");
    setError("");
  };

  // --------------------------------------------------
  // Forgot password
  // --------------------------------------------------

  const handleForgotPassword = () => {
    alert("Password reset functionality will be available soon.");
  };

  return (
    <div className="login-page">

      {/* =================================================
          LEFT BRANDING SECTION
      ================================================= */}

      <section
        className="login-brand-section"
        style={{
          "--classroom-image": `url("${classroomImage}")`,
        }}
      >

        <div className="brand-content">

          {/* Logo */}

          <div className="brand-logo">
            <span>SC</span>
          </div>


          {/* Brand name */}

          <div className="brand-name">
            <h1>SmartClassroom</h1>

            <span>
              SMART CAMPUS
            </span>
          </div>


          {/* Main message */}

          <div className="brand-message">

            <h2>
              Smarter classrooms.
              <br />
              Better attendance.
            </h2>

            <p>
              A secure classroom management platform for
              attendance, monitoring and academic coordination.
            </p>

          </div>


          {/* Features */}

          <div className="brand-features">

            <div className="brand-feature">

              <div className="feature-icon">
                ✓
              </div>

              <div>

                <strong>
                  Smart Attendance
                </strong>

                <span>
                  Face-based attendance verification
                </span>

              </div>

            </div>


            <div className="brand-feature">

              <div className="feature-icon">
                ◉
              </div>

              <div>

                <strong>
                  Classroom Monitoring
                </strong>

                <span>
                  Real-time classroom session management
                </span>

              </div>

            </div>


            <div className="brand-feature">

              <div className="feature-icon">
                ▣
              </div>

              <div>

                <strong>
                  Academic Management
                </strong>

                <span>
                  Students, timetable and reports
                </span>

              </div>

            </div>

          </div>

        </div>


        {/* Brand footer */}

        <div className="brand-footer">
          SMART CLASSROOM MANAGEMENT SYSTEM
        </div>

      </section>


      {/* =================================================
          RIGHT LOGIN SECTION
      ================================================= */}

      <section className="login-form-section">

        <div className="login-container">


          {/* Mobile brand */}

          <div className="mobile-brand">

            <div className="mobile-logo">
              SC
            </div>

            <div>

              <strong>
                SmartClassroom
              </strong>

              <span>
                SMART CAMPUS
              </span>

            </div>

          </div>


          {/* Login header */}

          <div className="login-header">

            <span className="login-label">
              WELCOME BACK
            </span>

            <h2>
              Sign in to your account
            </h2>

            <p>
              Enter your credentials to access the
              SmartClassroom dashboard.
            </p>

          </div>


          {/* =================================================
              LOGIN FORM
          ================================================= */}

          <form
            onSubmit={handleSubmit}
            className="login-form"
          >

            {/* Error */}

            {error && (
              <div className="login-error">

                <span>
                  !
                </span>

                <p>
                  {error}
                </p>

              </div>
            )}


            {/* Email */}

            <div className="form-group">

              <label htmlFor="email">
                Email address
              </label>

              <div className="input-wrapper">

                <span className="input-icon">
                  ✉
                </span>

                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  autoComplete="email"
                  required
                />

              </div>

            </div>


            {/* Password */}

            <div className="form-group">

              <div className="password-label-row">

                <label htmlFor="password">
                  Password
                </label>

                <button
                  type="button"
                  className="forgot-password"
                  onClick={handleForgotPassword}
                >
                  Forgot password?
                </button>

              </div>


              <div className="input-wrapper">

                <span className="input-icon">
                  ●
                </span>

                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  autoComplete="current-password"
                  required
                />


                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                >
                  {showPassword
                    ? "Hide"
                    : "Show"}
                </button>

              </div>

            </div>


            {/* Sign in */}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >

              {loading ? (
                <>
                  <span className="login-spinner"></span>

                  <span>
                    Signing in...
                  </span>
                </>
              ) : (
                <>
                  <span>
                    Sign in
                  </span>

                  <span className="login-arrow">
                    →
                  </span>
                </>
              )}

            </button>

          </form>


          {/* =================================================
              DEMO ACCOUNTS
          ================================================= */}

          <div className="demo-section">

            <div className="demo-title">
              DEMO ACCOUNTS
            </div>


            <div className="demo-grid">

              {/* Admin */}

              <button
                type="button"
                onClick={useAdminAccount}
              >

                <span>
                  Admin
                </span>

                <small>
                  College Administrator
                </small>

              </button>


              {/* HOD */}

              <button
                type="button"
                onClick={useHodAccount}
              >

                <span>
                  HOD
                </span>

                <small>
                  IT Department HOD
                </small>

              </button>


              {/* Advisor */}

              <button
                type="button"
                onClick={useAdvisorAccount}
              >

                <span>
                  Advisor
                </span>

                <small>
                  Class Advisor
                </small>

              </button>

            </div>

          </div>


          {/* =================================================
              FOOTER
          ================================================= */}

          <div className="login-footer">

            <span>
              © 2026 SmartClassroom
            </span>

            <span>
              Secure Academic Platform
            </span>

          </div>

        </div>

      </section>

    </div>
  );
}

export default Login;