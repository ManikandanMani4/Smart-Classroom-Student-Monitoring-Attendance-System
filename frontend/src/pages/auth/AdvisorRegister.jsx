
import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  deleteUser,
  signOut,
} from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";

export default function AdvisorRegister() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleRegister(event) {
    event.preventDefault();
    setError("");

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    let newUser = null;
    let profileSaved = false;

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      newUser = credential.user;

      await updateProfile(newUser, {
        displayName: cleanName,
      });

      await setDoc(doc(db, "users", newUser.uid), {
        uid: newUser.uid,
        name: cleanName,
        email: cleanEmail,
        role: "CLASS_ADVISOR",
        approvalStatus: "pending",
        assignedClassId: null,
        department: "",
        className: "",
        createdAt: serverTimestamp(),
      });

      profileSaved = true;

      // Registration should not grant access to the advisor dashboard.
      setSubmitted(true);

      // End the new Firebase session before sending the user to login.
      await signOut(auth);

      navigate("/login", {
        replace: true,
        state: { registrationSubmitted: true },
      });
    } catch (err) {
      console.error("Advisor registration failed:", err);

      // Only remove the new account if its Firestore profile
      // was not saved successfully.
      if (newUser && !profileSaved) {
        try {
          await deleteUser(newUser);
        } catch (deleteError) {
          console.error("Account cleanup failed:", deleteError);
        }
      }

      const messages = {
        "auth/email-already-in-use":
          "This email is already registered.",
        "auth/invalid-email":
          "Please enter a valid email address.",
        "auth/weak-password":
          "Choose a stronger password.",
        "auth/network-request-failed":
          "Network error. Check your internet connection.",
        "permission-denied":
          "Firestore denied registration. Check your security rules.",
      };

      if (profileSaved) {
        setSubmitted(true);
        setError(
          "Your request was saved, but sign-out or redirection failed. " +
          "Your account is awaiting Admin approval. Please return to login."
        );
      } else {
        setError(
          messages[err.code] ||
            "Registration failed. Check your connection and Firebase configuration."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <main className="advisor-register-page">
        <section className="advisor-register-card">
          <h1>Registration Submitted</h1>
          <p>
            Your Class Advisor account has been created and is
            awaiting College Admin approval.
          </p>
          <p>
            You can sign in after the Admin approves your request
            and assigns you a class.
          </p>
          {error && (
            <div role="alert" className="advisor-register-error">
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={() => navigate("/login", { replace: true })}
          >
            Go to Login
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="advisor-register-page">
      <section className="advisor-register-card">
        <h1>Advisor Registration</h1>
        <p>
          Create an account and submit it for Admin approval.
        </p>

        {error && (
          <div
            role="alert"
            className="advisor-register-error"
            style={{
              color: "#b91c1c",
              background: "#fef2f2",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "16px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleRegister}>
          <label htmlFor="advisor-name">Full name</label>
          <input
            id="advisor-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            required
          />

          <label htmlFor="advisor-email">Email address</label>
          <input
            id="advisor-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />

          <label htmlFor="advisor-password">Password</label>
          <input
            id="advisor-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />

          <label htmlFor="advisor-confirm-password">
            Confirm password
          </label>
          <input
            id="advisor-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(event.target.value)
            }
            autoComplete="new-password"
            minLength={8}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Register as Advisor"}
          </button>
        </form>

        <p>
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
