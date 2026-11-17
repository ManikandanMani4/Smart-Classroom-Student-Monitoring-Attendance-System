
import { useCallback, useEffect, useMemo, useState } from "react";
import { auth, db } from "../../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "../../../context/AuthContext";
import "./PendingAdvisorRequests.css";

// Wait until Firebase has restored its authentication state.
function waitForFirebaseUser() {
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {};

    unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        unsubscribe();
        resolve(firebaseUser);
      },
      (error) => {
        unsubscribe();
        reject(error);
      }
    );
  });
}

function PendingAdvisorRequests() {
  const { user } = useAuth();

  const [requests, setRequests] = useState([]);
  const [classes, setClasses] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [institutionIdInput, setInstitutionIdInput] = useState(() =>
    String(
      user?.institutionId ||
      user?.institution_id ||
      user?.institution?.id ||
      ""
    ).trim()
  );

  useEffect(() => {
    const profileInstitutionId = String(
      user?.institutionId ||
      user?.institution_id ||
      user?.institution?.id ||
      ""
    ).trim();

    if (profileInstitutionId && !institutionIdInput) {
      setInstitutionIdInput(profileInstitutionId);
    }
  }, [user, institutionIdInput]);

  // Load pending advisor registrations from Firestore.
  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const firebaseUser = await waitForFirebaseUser();

      console.log("Firebase authentication:", firebaseUser
        ? {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
          }
        : "No Firebase user signed in"
      );

      if (!firebaseUser) {
        throw new Error(
          "No Firebase session found. Log out and sign in again using the College Admin account."
        );
      }

      // Refresh the authentication token before accessing Firestore.
      await firebaseUser.getIdToken(true);

      if (
        firebaseUser.email?.toLowerCase() !==
        "admin@smartclassroom.com"
      ) {
        throw new Error(
          "The signed-in Firebase account is not the configured College Admin account."
        );
      }

      const pendingQuery = query(
        collection(db, "users"),
        where("role", "==", "CLASS_ADVISOR"),
        where("approvalStatus", "==", "pending")
      );

const snapshot = await getDocs(pendingQuery);

console.log(
  "[Pending Advisor Requests] Firebase project:",
  db.app.options.projectId
);

console.log(
  "[Pending Advisor Requests] Matching documents:",
  snapshot.size
);

console.table(
  snapshot.docs.map((item) => ({
    uid: item.id,
    email: item.data().email,
    role: item.data().role,
    approvalStatus: item.data().approvalStatus,
  }))
);

const pending = snapshot.docs.map((item) => ({
  uid: item.id,
  ...item.data(),
}));

pending.sort(
        (a, b) =>
          (b.createdAt?.toMillis?.() || 0) -
          (a.createdAt?.toMillis?.() || 0)
      );

      setRequests(pending);
    } catch (err) {
      console.error("Unable to load advisor requests:", err);

      setError(
        `Unable to load requests: ${err.code || "Error"} — ${
          err.message || "Unknown error"
        }`
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Load requests and classes when the component mounts.
  useEffect(() => {
    loadRequests();

    try {
      const savedClasses = JSON.parse(
        localStorage.getItem("smartclassroom_Classes") || "[]"
      );

      setClasses(
        Array.isArray(savedClasses) ? savedClasses : []
      );
    } catch (err) {
      console.error("Unable to load classes:", err);
      setClasses([]);
    }
  }, [loadRequests]);

  // Search advisor requests.
  const filteredRequests = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return requests;

    return requests.filter((item) =>
      [
        item.name,
        item.email,
        item.department,
        item.className,
      ].some((field) =>
        String(field || "").toLowerCase().includes(value)
      )
    );
  }, [requests, search]);

  // Approve an advisor and assign a class.
  const approveRequest = async (request) => {
    const selectedClassId = assignments[request.uid];

    if (!selectedClassId) {
      setError(
        `Choose a class before approving ${
          request.name || request.email
        }.`
      );
      setNotice("");
      return;
    }

    const selectedClass = classes.find(
      (item) =>
        String(item.id) === String(selectedClassId)
    );

    if (!selectedClass) {
      setError(
        "The selected class could not be found. Refresh the page and try again."
      );
      setNotice("");
      return;
    }

    if (user?.role !== "COLLEGE_ADMIN") {
      setError(
        "Only the College Admin can approve advisor requests."
      );
      setNotice("");
      return;
    }

    setBusyUid(request.uid);
    setError("");
    setNotice("");

    try {
      const firebaseUser = await waitForFirebaseUser();

      if (!firebaseUser) {
        throw new Error(
          "Your Firebase session has expired. Sign in again."
        );
      }

      if (
        firebaseUser.email?.toLowerCase() !==
        "admin@smartclassroom.com"
      ) {
        throw new Error(
          "The current Firebase account is not authorized as College Admin."
        );
      }

      // The advisor and face-registration service must use the same institution ID.
      // Configure this field on the College Admin profile or the selected class record.
      const institutionId = String(
        institutionIdInput ||
        user?.institutionId ||
        user?.institution_id ||
        user?.institution?.id ||
        selectedClass.institutionId ||
        selectedClass.institution_id ||
        selectedClass.institution?.id ||
        ""
      ).trim();

      if (!institutionId) {
        throw new Error(
          "Institution ID is missing. Add institutionId to the College Admin profile " +
          "or the selected class record before approving advisors."
        );
      }

      await updateDoc(doc(db, "users", request.uid), {
        approvalStatus: "approved",
        assignedClassId: String(selectedClass.id),
        className:
          selectedClass.name ||
          selectedClass.className ||
          "",
        department: selectedClass.department || "",
        institutionId,
        reviewedAt: serverTimestamp(),
        reviewedBy: firebaseUser.uid,
      });

      setRequests((previous) =>
        previous.filter((item) => item.uid !== request.uid)
      );

      setAssignments((previous) => {
        const next = { ...previous };
        delete next[request.uid];
        return next;
      });

      setNotice(
        `${request.name || request.email} was approved and assigned to ${
          selectedClass.name ||
          selectedClass.className ||
          "the selected class"
        }.`
      );
    } catch (err) {
      console.error("Unable to approve advisor:", err);

      setError(
        `Approval failed: ${err.code || "Error"} — ${
          err.message || "Check Firestore security rules."
        }`
      );
    } finally {
      setBusyUid("");
    }
  };

  // Reject an advisor registration.
  const rejectRequest = async (request) => {
    if (user?.role !== "COLLEGE_ADMIN") {
      setError(
        "Only the College Admin can reject advisor requests."
      );
      setNotice("");
      return;
    }

    const confirmed = window.confirm(
      `Reject the advisor registration for ${
        request.name || request.email
      }?`
    );

    if (!confirmed) return;

    setBusyUid(request.uid);
    setError("");
    setNotice("");

    try {
      const firebaseUser = await waitForFirebaseUser();

      if (!firebaseUser) {
        throw new Error(
          "Your Firebase session has expired. Sign in again."
        );
      }

      if (
        firebaseUser.email?.toLowerCase() !==
        "admin@smartclassroom.com"
      ) {
        throw new Error(
          "The current Firebase account is not authorized as College Admin."
        );
      }

      await updateDoc(doc(db, "users", request.uid), {
        approvalStatus: "rejected",
        reviewedAt: serverTimestamp(),
        reviewedBy: firebaseUser.uid,
      });

      setRequests((previous) =>
        previous.filter((item) => item.uid !== request.uid)
      );

      setNotice(
        `The request from ${
          request.name || request.email
        } was rejected.`
      );
    } catch (err) {
      console.error("Unable to reject advisor:", err);

      setError(
        `Rejection failed: ${err.code || "Error"} — ${
          err.message || "Check Firestore security rules."
        }`
      );
    } finally {
      setBusyUid("");
    }
  };

  if (user?.role !== "COLLEGE_ADMIN") {
    return (
      <section className="advisor-requests-page">
        <div className="advisor-requests-message error">
          This page is available only to the College Admin.
        </div>
      </section>
    );
  }

  return (
    <section className="advisor-requests-page">
      <div className="advisor-requests-heading">
        <div>
          <p className="advisor-requests-eyebrow">
            ADMINISTRATION
          </p>
          <h2>Pending Advisor Requests</h2>
          <p>
            Review registrations and assign a class before
            approving access.
          </p>
        </div>

        <button
          type="button"
          className="advisor-refresh-button"
          onClick={loadRequests}
          disabled={loading || !!busyUid}
        >
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      <div className="advisor-institution-config">
        <label htmlFor="advisor-institution-id">
          Institution ID (required for face registration)
        </label>
        <input
          id="advisor-institution-id"
          type="text"
          value={institutionIdInput}
          onChange={(event) => setInstitutionIdInput(event.target.value)}
          placeholder="Enter the institution ID configured in the AI backend"
          autoComplete="off"
        />
        <p>
          Use the exact same ID configured in the face-registration backend.
          This value is saved to the advisor profile when you approve the request.
        </p>
      </div>

      <div className="advisor-request-stats">
        <div>
          <span>Pending requests</span>
          <strong>{requests.length}</strong>
        </div>

        <div>
          <span>Available classes</span>
          <strong>{classes.length}</strong>
        </div>
      </div>

      {error && (
        <div
          className="advisor-requests-message error"
          role="alert"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          className="advisor-requests-message success"
          role="status"
        >
          {notice}
        </div>
      )}

      <div className="advisor-requests-toolbar">
        <label className="advisor-request-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search by name, email or department..."
          />
        </label>

        <span className="advisor-request-count">
          {filteredRequests.length} shown
        </span>
      </div>

      {loading ? (
        <div className="advisor-requests-empty">
          Loading advisor requests...
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="advisor-requests-empty">
          <div className="advisor-empty-icon">✓</div>
          <h3>
            {search
              ? "No matching requests"
              : "No pending requests"}
          </h3>
          <p>
            {search
              ? "Try another search term."
              : "New advisor registrations will appear here when submitted."}
          </p>
        </div>
      ) : (
        <div className="advisor-request-list">
          {filteredRequests.map((request) => (
            <article
              className="advisor-request-card"
              key={request.uid}
            >
              <div className="advisor-request-person">
                <div className="advisor-request-avatar">
                  {(
                    request.name ||
                    request.email ||
                    "A"
                  )
                    .trim()
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="advisor-request-identity">
                  <h3>
                    {request.name || "Name not provided"}
                  </h3>
                  <p>
                    {request.email || "Email not provided"}
                  </p>
                  <span className="advisor-pending-pill">
                    Pending approval
                  </span>
                </div>
              </div>

              <div className="advisor-request-details">
                <div>
                  <span>Department</span>
                  <strong>
                    {request.department || "Not specified"}
                  </strong>
                </div>

                <div>
                  <span>Registered</span>
                  <strong>
                    {request.createdAt?.toDate
                      ? request.createdAt
                          .toDate()
                          .toLocaleString("en-IN")
                      : "Date unavailable"}
                  </strong>
                </div>
              </div>

              <div className="advisor-request-actions">
                <label>
                  <span>Assign class before approval</span>

                  <select
                    value={assignments[request.uid] || ""}
                    onChange={(event) =>
                      setAssignments((previous) => ({
                        ...previous,
                        [request.uid]: event.target.value,
                      }))
                    }
                    disabled={busyUid === request.uid}
                  >
                    <option value="">Select a class</option>

                    {classes.map((item) => (
                      <option
                        key={item.id}
                        value={String(item.id)}
                      >
                        {item.name ||
                          item.className ||
                          item.code ||
                          `Class ${item.id}`}
                        {item.department
                          ? ` — ${item.department}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="advisor-request-buttons">
                  <button
                    type="button"
                    className="advisor-reject-button"
                    onClick={() => rejectRequest(request)}
                    disabled={!!busyUid}
                  >
                    {busyUid === request.uid
                      ? "Processing..."
                      : "Reject"}
                  </button>

                  <button
                    type="button"
                    className="advisor-approve-button"
                    onClick={() => approveRequest(request)}
                    disabled={
                      !!busyUid || classes.length === 0
                    }
                    title={
                      classes.length === 0
                        ? "Add a class in Classes management first"
                        : ""
                    }
                  >
                    {busyUid === request.uid
                      ? "Processing..."
                      : "Approve"}
                  </button>
                </div>

                {classes.length === 0 && (
                  <p className="advisor-no-classes">
                    Add a class in Admin → Classes before
                    approving an advisor.
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default PendingAdvisorRequests;
