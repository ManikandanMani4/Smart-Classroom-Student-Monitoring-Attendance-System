
import { useState } from "react";
import { Link } from "react-router-dom";
import "./Login.css";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [role, setRole] = useState("admin");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const { login } = useAuth();
const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage("");
  };

  
const handleLogin = async (event) => {
  event.preventDefault();
  setMessage("");

  const result = await login(
    form.email,
    form.password,
    role
  );

  if (!result.success) {
    setMessage(result.message);
    return;
  }

  const routes = {
    COLLEGE_ADMIN: "/admin/dashboard",
    HOD: "/hod/dashboard",
    CLASS_ADVISOR: "/advisor/dashboard",
  };

  navigate(routes[result.user.role] || "/login", {
    replace: true,
  });
};

 
 

  return (
    <main className="login-page">
      <div className="login-glow login-glow-one" />
      <div className="login-glow login-glow-two" />

      <header className="login-header">
        <Link to="/login" className="login-brand">
          <span className="login-brand-icon">S</span>
          <span>
            Smart<span className="login-brand-highlight">Classroom</span>
          </span>
        </Link>

        <div className="login-header-right">
          <span>New to SmartClassroom?</span>
          <Link to="/register" className="login-register-link">
            Create account <span>↗</span>
          </Link>
        </div>
      </header>

      <section className="login-layout">
        <div className="login-intro">
          <div className="login-eyebrow">
            <span className="login-status-dot" />
            YOUR CLASSROOM, REIMAGINED
          </div>

          <h1>
            Welcome back.
            <br />
            Let's <span>get started.</span>
          </h1>

          <p className="login-intro-text">
            Your classroom activities, attendance, and academic
            information — all in one smart space.
          </p>

          <div className="login-feature-list">
            <div className="login-feature">
              <span className="login-feature-icon">✓</span>
              <div>
                <strong>Stay connected</strong>
                <p>Access your classroom information.</p>
              </div>
            </div>

            <div className="login-feature">
              <span className="login-feature-icon">↗</span>
              <div>
                <strong>Keep track of progress</strong>
                <p>Stay informed about academic activities.</p>
              </div>
            </div>

            <div className="login-feature">
              <span className="login-feature-icon">⌘</span>
              <div>
                <strong>One organized workspace</strong>
                <p>Designed for students and educators.</p>
              </div>
            </div>
          </div>

          <div className="login-bottom-note">
            <span className="login-mini-dot" />
            A smarter way to manage your classroom.
          </div>
        </div>

        <div className="login-form-card">
          <div className="login-card-heading">
            <div className="login-step-label">
              <span>01</span> / YOUR ACCOUNT
            </div>

            <h2>Sign in to continue.</h2>
            <p>Enter your credentials to access your account.</p>
          </div>

          <form onSubmit={handleLogin}>
            <label className="login-label">
              Continue as
            </label>

          
<div className="login-role-options">
  {[
    {
      id: "admin",
      icon: "⚙️",
      title: "Admin",
      subtitle: "Manage system",
    },
    {
      id: "hod",
      icon: "🏢",
      title: "HOD",
      subtitle: "Manage department",
    },
    {
      id: "advisor",
      icon: "👨‍🏫",
      title: "Advisor",
      subtitle: "Guide students",
    },
  ].map((item) => (
    <button
      key={item.id}
      type="button"
      className={`login-role-option ${
        role === item.id ? "selected" : ""
      }`}
      onClick={() => {
        setRole(item.id);
        setMessage("");
      }}
      aria-pressed={role === item.id}
    >
      <span className="login-role-icon">{item.icon}</span>

      <span className="login-role-text">
        <strong>{item.title}</strong>
        <small>{item.subtitle}</small>
      </span>

      <span className="login-role-check">
        {role === item.id ? "✓" : ""}
      </span>
    </button>
  ))}
</div>


            <div className="login-input-group">
              <label className="login-label" htmlFor="login-email">
                Email address
              </label>

              <input
                id="login-email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>

            <div className="login-input-group">
              <div className="login-password-label">
                <label className="login-label" htmlFor="login-password">
                  Password
                </label>

                <Link
                  to="/forgot-password"
                  className="login-forgot-link"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="login-password-wrap">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {message && (
              <div className="login-message" role="status">
                {message}
              </div>
            )}

            <button type="submit" className="login-submit">
              <span>Sign in to your account</span>
              <span className="login-submit-arrow">→</span>
            </button>

            <p className="login-security-note">
              Your classroom information deserves to stay protected.
            </p>
          </form>

          <div className="login-mobile-register">
            Don't have an account?{" "}
            <Link to="/register">Create one</Link>
          </div>
        </div>
      </section>

      <footer className="login-page-footer">
        <span>© SmartClassroom</span>
        <span>Built for better learning experiences.</span>
      </footer>
    </main>
  );
}
