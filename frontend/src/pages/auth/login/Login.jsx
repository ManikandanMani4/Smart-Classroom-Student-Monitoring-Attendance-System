
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

export default function Login() {
  const [role, setRole] = useState("advisor");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    // Connect this form to your authentication backend next.
    setError("Authentication API is not connected yet.");
  };

  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="brand-icon">SC</div>
        <h1>SmartClassroom</h1>
        <p>
          A smarter way to manage class timetables, attendance,
          and academic activities.
        </p>

        <div className="brand-features">
          <div>✓ Class-wise timetables</div>
          <div>✓ Attendance monitoring</div>
          <div>✓ Secure role-based access</div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-heading">
            <span className="login-label">WELCOME BACK</span>
            <h2>Sign in to your account</h2>
            <p>Enter your credentials to continue.</p>
          </div>

          <form onSubmit={handleLogin}>
            <label htmlFor="login-role">Login as</label>
            <select
              id="login-role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <option value="advisor">Class Advisor</option>
              <option value="student">Student</option>
              <option value="admin">Administrator</option>
            </select>

            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              placeholder="you@college.edu"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <label htmlFor="login-password">Password</label>
            <div className="password-field">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
              />
              <button
                type="button"
                className="show-password"
                onClick={() =>
                  setShowPassword((previous) => !previous)
                }
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            <button className="login-submit" type="submit">
              Sign In
            </button>
          </form>

          <p className="login-footer">
            SmartClassroom · Academic Management System
          </p>
        </div>
      </section>
    </main>
  );
}
