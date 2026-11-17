
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import "./Register.css";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    year: "3rd Year",
    section: "",
    roomNo: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage("");
  };

  const getClassName = () => {
    const yearPrefix = {
      "1st Year": "I",
      "2nd Year": "II",
      "3rd Year": "III",
      "4th Year": "IV",
    };

    const department = form.department.trim();
    const section = form.section.trim().toUpperCase();

    return [
      yearPrefix[form.year],
      department,
      section ? `- ${section}` : "",
    ]
      .filter(Boolean)
      .join(" ");
  };

  const handleRegister = async (event) => {
    event.preventDefault();

    if (loading) return;

    setMessage("");

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    const department = form.department.trim();
    const section = form.section.trim().toUpperCase();
    const roomNo = form.roomNo.trim();
    const className = getClassName();

    if (name.length < 2) {
      setMessage("Please enter your full name.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      setMessage("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (!department || !section || !roomNo) {
      setMessage("Please complete all classroom details.");
      return;
    }

    if (form.password.length < 8) {
      setMessage("Password must contain at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage("Your passwords do not match.");
      return;
    }

    setLoading(true);

    let firebaseUser = null;
    let profileSaved = false;

    const logDuration = (step, start) => {
      console.info(
        `[Advisor Registration] ${step}: ${
          Math.round(performance.now() - start)
        } ms`
      );
    };

    const start = performance.now();

    try {
      // Step 1: Create Firebase Authentication account.
      console.info("[Advisor Registration] Creating account...");

      const authStart = performance.now();

      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        form.password
      );

      firebaseUser = credential.user;
      logDuration("Authentication account created", authStart);

      // Step 2: Save the display name.
      const profileStart = performance.now();

      await updateProfile(firebaseUser, {
        displayName: name,
      });

      logDuration("Display name updated", profileStart);

      // Step 3: Create the pending advisor profile.
      const firestoreStart = performance.now();

      await setDoc(doc(db, "users", firebaseUser.uid), {
        uid: firebaseUser.uid,
        name,
        email,
        phone,
        role: "CLASS_ADVISOR",
        department,
        academicYear: form.year,
        section,
        className,
        roomNo,
        assignedClassId: null,
        approvalStatus: "pending",
        createdAt: serverTimestamp(),
      });

      profileSaved = true;
      logDuration("Firestore profile saved", firestoreStart);
      logDuration("Registration completed", start);

      // Step 4: Sign out so the pending advisor cannot access
      // protected advisor pages.
      await signOut(auth);
      firebaseUser = null;

      // Step 5: Send the advisor to the login page.
      navigate("/login", {
        replace: true,
        state: { registrationSubmitted: true },
      });
    } catch (error) {
      console.error("[Advisor Registration] Failed:", {
        code: error.code,
        message: error.message,
      });

      if (profileSaved) {
        // The account and profile exist. Do not delete them because
        // only sign-out or navigation may have failed.
        setMessage(
          "Your registration was saved and is awaiting Admin approval. " +
          "Please return to the login page."
        );
      } else {
        // If Firestore failed after account creation, try to clean up
        // the newly created account. Do not hide cleanup failures.
        if (firebaseUser) {
          try {
            await firebaseUser.delete();
          } catch (cleanupError) {
            console.error(
              "[Advisor Registration] Account cleanup failed:",
              cleanupError.code,
              cleanupError.message
            );
          }
        }

        const messages = {
          "auth/email-already-in-use":
            "This email address is already registered.",
          "auth/invalid-email":
            "Please enter a valid email address.",
          "auth/weak-password":
            "Choose a stronger password.",
          "auth/network-request-failed":
            "Network error. Check your internet connection.",
          "auth/operation-not-allowed":
            "Email/password sign-in is not enabled in Firebase.",
          "permission-denied":
            "Firestore denied the profile write. Check your security rules.",
          "auth/too-many-requests":
            "Too many attempts. Please try again later.",
        };

        setMessage(
          messages[error.code] ||
            `${error.code || "Registration error"}: ${
              error.message || "Please try again."
            }`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="register-page">
      <div className="register-glow register-glow-one" />
      <div className="register-glow register-glow-two" />

      <header className="register-header">
        <Link to="/login" className="register-brand">
          <span className="register-brand-icon">S</span>
          <span>
            Smart<span className="brand-highlight">Classroom</span>
          </span>
        </Link>

        <div className="register-header-right">
          <span>Already a member?</span>
          <Link to="/login" className="register-signin-link">
            Sign in <span>↗</span>
          </Link>
        </div>
      </header>

      <section className="register-layout">
        <div className="register-intro">
          <div className="register-eyebrow">
            <span className="register-status-dot" />
            YOUR CLASSROOM, REIMAGINED
          </div>

          <h1>
            Your next chapter
            <br />
            starts <span>here.</span>
          </h1>

          <p className="register-intro-text">
            One smart space for attendance, academic progress,
            and everything happening in your classroom.
          </p>

          <div className="register-feature-list">
            <div className="register-feature">
              <div className="register-feature-icon">✓</div>
              <div>
                <strong>Everything in one place</strong>
                <p>Stay connected with your classroom.</p>
              </div>
            </div>

            <div className="register-feature">
              <div className="register-feature-icon">↗</div>
              <div>
                <strong>Track your progress</strong>
                <p>Keep academic information organized.</p>
              </div>
            </div>

            <div className="register-feature">
              <div className="register-feature-icon">⌘</div>
              <div>
                <strong>Designed for advisors</strong>
                <p>Manage your classroom in one place.</p>
              </div>
            </div>
          </div>

          <div className="register-bottom-note">
            <span className="register-mini-dot" />
            A smarter way to manage your classroom.
          </div>
        </div>

        <div className="register-form-card">
          <div className="register-card-heading">
            <div className="register-step-label">
              <span>01</span> / ADVISOR REGISTRATION
            </div>

            <h2>Create your advisor account.</h2>
            <p>Enter your personal and classroom details.</p>
          </div>

          <form onSubmit={handleRegister}>
            <div className="register-input-grid">
              <div className="register-input-group">
                <label className="register-label" htmlFor="reg-name">
                  Full name
                </label>
                <input
                  id="reg-name"
                  name="name"
                  type="text"
                  placeholder="Enter full name"
                  value={form.name}
                  onChange={updateField}
                  autoComplete="name"
                  required
                />
              </div>

              <div className="register-input-group">
                <label className="register-label" htmlFor="reg-phone">
                  Mobile number
                </label>
                <input
                  id="reg-phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="10-digit mobile number"
                  value={form.phone}
                  onChange={updateField}
                  maxLength={10}
                  autoComplete="tel"
                  required
                />
              </div>

              <div className="register-input-group register-full-width">
                <label className="register-label" htmlFor="reg-email">
                  Email address
                </label>
                <input
                  id="reg-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={updateField}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="register-input-group register-full-width">
                <label className="register-label" htmlFor="reg-department">
                  Department
                </label>
                <input
                  id="reg-department"
                  name="department"
                  type="text"
                  placeholder="e.g. Information Technology"
                  value={form.department}
                  onChange={updateField}
                  required
                />
              </div>

              <div className="register-input-group">
                <label className="register-label" htmlFor="reg-year">
                  Academic year
                </label>
                <select
                  id="reg-year"
                  name="year"
                  value={form.year}
                  onChange={updateField}
                  required
                >
                  <option>1st Year</option>
                  <option>2nd Year</option>
                  <option>3rd Year</option>
                  <option>4th Year</option>
                </select>
              </div>

              <div className="register-input-group">
                <label className="register-label" htmlFor="reg-section">
                  Section
                </label>
                <input
                  id="reg-section"
                  name="section"
                  type="text"
                  placeholder="Enter section"
                  value={form.section}
                  onChange={updateField}
                  required
                />
              </div>

              <div className="register-input-group">
                <label className="register-label" htmlFor="reg-class">
                  Class name (auto-generated)
                </label>
                <input
                  id="reg-class"
                  type="text"
                  value={getClassName()}
                  placeholder="Class name"
                  readOnly
                />
              </div>

              <div className="register-input-group">
                <label className="register-label" htmlFor="reg-room">
                  Room No.
                </label>
                <input
                  id="reg-room"
                  name="roomNo"
                  type="text"
                  placeholder="Enter room number"
                  value={form.roomNo}
                  onChange={updateField}
                  required
                />
              </div>
            </div>

            <div className="register-input-group register-full-width">
              <label className="register-label" htmlFor="reg-password">
                Create password
              </label>
              <div className="register-password-wrap">
                <input
                  id="reg-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={updateField}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="register-password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="register-input-group register-full-width">
              <label className="register-label" htmlFor="reg-confirm">
                Confirm password
              </label>
              <div className="register-password-wrap">
                <input
                  id="reg-confirm"
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Enter your password again"
                  value={form.confirmPassword}
                  onChange={updateField}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="register-password-toggle"
                  onClick={() => setShowConfirm((value) => !value)}
                >
                  {showConfirm ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {message && (
              <div className="register-message" role="alert">
                {message}
              </div>
            )}

            <button
              className="register-submit"
              type="submit"
              disabled={loading}
            >
              <span>
                {loading ? "Creating account..." : "Create advisor account"}
              </span>
              <span className="register-submit-arrow">→</span>
            </button>

            <p className="register-terms">
              Your information will be used to set up your advisor profile.
            </p>
          </form>

          <div className="register-mobile-login">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </section>

      <footer className="register-page-footer">
        <span>© SmartClassroom</span>
        <span>Built for better learning experiences.</span>
      </footer>
    </main>
  );
}
