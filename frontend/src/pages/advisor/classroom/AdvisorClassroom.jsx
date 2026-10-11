import { useState, useRef, useCallback } from "react";
import CameraView from "../../../components/camera/CameraView.jsx";
import "./AdvisorClassroom.css";

function AdvisorClassroom() {
  const [cameraActive, setCameraActive] = useState(false);
  const [message, setMessage] = useState("Ready to start attendance.");
  const [faces, setFaces] = useState([]);
  const [faceCount, setFaceCount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [apiError, setApiError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const processingRef = useRef(false);

  const handleStartSession = () => {
    setFaces([]);
    setFaceCount(0);
    setApiError("");
    setLastUpdated(null);
    setMessage("Starting classroom attendance...");
    setCameraActive(true);
  };

  const handleStopSession = () => {
    setCameraActive(false);
    setMessage("Attendance session ended.");
  };

  const handleCameraReady = () => {
    setMessage("Camera connected. Attendance is active.");
  };

  const handleCameraError = (error) => {
    console.error("Camera error:", error);
    setCameraActive(false);
    setMessage("Camera connection failed.");
    setApiError(String(error));
  };

  const handleFrameCapture = useCallback(async (blob) => {
    if (!blob || processingRef.current) return;

    processingRef.current = true;
    setProcessing(true);
    setApiError("");

    try {
      const formData = new FormData();
      formData.append("frame", blob, "classroom-frame.jpg");

      const response = await fetch(
        "http://localhost:5000/api/classroom/frame",
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Face recognition failed.");
      }

      const detectedFaces = Array.isArray(result.faces)
        ? result.faces
        : [];

      setFaces(detectedFaces);
      setFaceCount(
        typeof result.face_count === "number"
          ? result.face_count
          : detectedFaces.length
      );

      setLastUpdated(new Date());
      setMessage("Live recognition is running.");
    } catch (error) {
      console.error("Recognition error:", error);
      setApiError(
        error.message || "Unable to connect to the recognition service."
      );
      setMessage("Recognition service unavailable.");
    } finally {
      processingRef.current = false;
      setProcessing(false);
    }
  }, []);

  const recognizedFaces = faces.filter(
    (face) => face.recognized && face.student_id
  );

  const unknownCount = faces.filter(
    (face) => !face.recognized || !face.student_id
  ).length;

  return (
    <main className="advisor-classroom">
      <header className="classroom-header">
        <div>
          <span className="classroom-eyebrow">ADVISOR PORTAL</span>
          <h1>Classroom Attendance</h1>
          <p>
            Monitor detected faces and review recognition results in real time.
          </p>
        </div>

        <span
          className={`session-badge ${
            cameraActive ? "session-active" : "session-inactive"
          }`}
        >
          <span className="status-dot" />
          {cameraActive ? "Session Active" : "Session Inactive"}
        </span>
      </header>

      <section className="attendance-stats">
        <article className="stat-card">
          <span className="stat-label">Faces Detected</span>
          <strong>{faceCount}</strong>
          <span className="stat-description">
            Latest processed frame
          </span>
        </article>

        <article className="stat-card stat-recognized">
          <span className="stat-label">Recognized</span>
          <strong>{recognizedFaces.length}</strong>
          <span className="stat-description">
            Matched student identities
          </span>
        </article>

        <article className="stat-card stat-unknown">
          <span className="stat-label">Unknown</span>
          <strong>{unknownCount}</strong>
          <span className="stat-description">
            Unmatched detected faces
          </span>
        </article>
      </section>

      <section className="classroom-content">
        <div className="camera-card">
          <div className="section-heading">
            <div>
              <h2>Live Classroom Camera</h2>
              <p>Face detection and identification feed</p>
            </div>

            <span className="live-indicator">
              <span className="status-dot" />
              {cameraActive ? "LIVE" : "OFFLINE"}
            </span>
          </div>

          <div className="camera-container">
            <CameraView
              active={cameraActive}
              onCameraReady={handleCameraReady}
              onCameraError={handleCameraError}
              onFrameCapture={handleFrameCapture}
              faces={faces}
            />

            {!cameraActive && (
              <div className="camera-overlay">
                <div className="camera-overlay-icon">📷</div>
                <h3>Camera is stopped</h3>
                <p>Start the session to begin face recognition.</p>
              </div>
            )}
          </div>

          <div className="camera-footer">
            <div>
              <span className="footer-label">Session status</span>
              <p>{message}</p>
            </div>

            <div className="session-controls">
              {!cameraActive ? (
                <button
                  type="button"
                  className="btn-start"
                  onClick={handleStartSession}
                >
                  Start Attendance
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-stop"
                  onClick={handleStopSession}
                >
                  Stop Attendance
                </button>
              )}
            </div>
          </div>

          {processing && (
            <div className="processing-message">
              <span className="loading-spinner" />
              Processing the latest frame...
            </div>
          )}

          {apiError && (
            <div className="error-message" role="alert">
              <strong>Recognition error:</strong> {apiError}
              <p>
                Check that the Python AI service and Node.js backend are running.
              </p>
            </div>
          )}
        </div>

        <aside className="recognition-summary">
          <div className="section-heading">
            <div>
              <h2>Recognition Summary</h2>
              <p>Latest detection results</p>
            </div>
          </div>

          <div className="summary-row">
            <span>Detected faces</span>
            <strong>{faceCount}</strong>
          </div>

          <div className="summary-row">
            <span>Recognized students</span>
            <strong className="text-green">
              {recognizedFaces.length}
            </strong>
          </div>

          <div className="summary-row">
            <span>Unknown faces</span>
            <strong className="text-red">{unknownCount}</strong>
          </div>

          <div className="summary-divider" />

          <p className="summary-note">
            Recognition scores indicate similarity to a registered face
            embedding. They are not attendance confirmation or probability
            percentages.
          </p>

          <div className="last-updated">
            <span>Last updated</span>
            <strong>
              {lastUpdated
                ? lastUpdated.toLocaleTimeString()
                : "Not yet"}
            </strong>
          </div>
        </aside>
      </section>

      <section className="recognition-panel">
        <div className="section-heading results-heading">
          <div>
            <h2>Live Face Recognition Results</h2>
            <p>
              Student IDs and match scores from the latest processed frame
            </p>
          </div>

          <span className="result-count">
            {faces.length} {faces.length === 1 ? "face" : "faces"}
          </span>
        </div>

        {faces.length === 0 ? (
          <div className="empty-results">
            <div className="empty-icon">◎</div>
            <h3>No faces detected yet</h3>
            <p>
              Start attendance and position faces clearly in front of the camera.
            </p>
          </div>
        ) : (
          <div className="recognition-grid">
            {faces.map((face, index) => {
              const matched = Boolean(
                face.recognized && face.student_id
              );
              const score = Number(face.confidence);
              const validScore = Number.isFinite(score);

              return (
                <article
                  className={`recognition-card ${
                    matched ? "matched" : "unknown"
                  }`}
                  key={`${face.student_id || "unknown"}-${index}`}
                >
                  <div className="recognition-card-top">
                    <span className="face-number">
                      FACE {index + 1}
                    </span>

                    <span
                      className={`recognition-status ${
                        matched ? "status-matched" : "status-unknown"
                      }`}
                    >
                      {matched ? "Recognized" : "Unknown"}
                    </span>
                  </div>

                  <h3 className="student-id">
                    {matched ? face.student_id : "Unknown Person"}
                  </h3>

                  <div className="score-row">
                    <span>Match score</span>
                    <strong>
                      {validScore ? score.toFixed(4) : "N/A"}
                    </strong>
                  </div>

                  <div className="score-track">
                    <div
                      className={`score-fill ${
                        matched
                          ? "score-fill-matched"
                          : "score-fill-unknown"
                      }`}
                      style={{
                        width: `${
                          validScore
                            ? Math.max(0, Math.min(100, score * 100))
                            : 0
                        }%`,
                      }}
                    />
                  </div>

                  <p className="face-note">
                    {matched
                      ? "Matched with a registered student."
                      : "No registered identity matched this face."}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <p className="attendance-disclaimer">
        These are live recognition results, not saved attendance records.
        Attendance must be recorded through a backend endpoint.
      </p>
    </main>
  );
}

export default AdvisorClassroom;