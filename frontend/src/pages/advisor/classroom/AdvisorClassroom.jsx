import { useState } from "react";
import CameraView from "../../../components/camera/CameraView.jsx";
import "./AdvisorClassroom.css";

function AdvisorClassroom() {
  const [cameraActive, setCameraActive] = useState(false);
  const [message, setMessage] = useState("");

  const handleStartSession = () => {
    setCameraActive(true);
    setMessage("Classroom session started.");
  };

  const handleStopSession = () => {
    setCameraActive(false);
    setMessage("Classroom session ended.");
  };

  const handleCameraReady = () => {
    console.log("Smart Board camera is ready.");
    setMessage("Camera connected successfully.");
  };

  const handleCameraError = (error) => {
    console.error("Camera error:", error);

    setCameraActive(false);
    setMessage(error);
  };

  const handleFrameCapture = (blob) => {
  console.log(
    "AdvisorClassroom received frame:",
    blob.size,
    "bytes"
  );
};

  return (
    <div className="advisor-classroom-page">

      <div className="advisor-classroom-header">

        <div>
          <span className="advisor-section-label">
            CLASSROOM SESSION
          </span>

          <h2>
            Classroom Attendance
          </h2>

          <p>
            Start and monitor classroom attendance sessions.
          </p>
        </div>

      </div>


      {/* SESSION INFORMATION */}

      <div className="advisor-classroom-session">

        <div className="session-info">
          <span>CLASS</span>
          <strong>III IT - A</strong>
        </div>

        <div className="session-info">
          <span>SUBJECT</span>
          <strong>Database Management Systems</strong>
        </div>

        <div className="session-info">
          <span>PERIOD</span>
          <strong>2</strong>
        </div>

        <div className="session-info">
          <span>CLASSROOM</span>
          <strong>Smart Classroom 01</strong>
        </div>

      </div>


      {/* CAMERA */}

      <div className="advisor-classroom-camera">

        <CameraView
          active={cameraActive}
          onCameraReady={handleCameraReady}
          onError={handleCameraError}
          onFrameCapture={handleFrameCapture}
        />

      </div>


      {/* MESSAGE */}

      {message && (
        <div className="advisor-classroom-message">
          {message}
        </div>
      )}


      {/* CONTROLS */}

      <div className="advisor-classroom-controls">

        {!cameraActive ? (

          <button
            type="button"
            className="classroom-start-button"
            onClick={handleStartSession}
          >
            <span>●</span>
            Start Attendance Session
          </button>

        ) : (

          <button
            type="button"
            className="classroom-stop-button"
            onClick={handleStopSession}
          >
            <span>■</span>
            Stop Attendance Session
          </button>

        )}

      </div>

    </div>
  );
}

export default AdvisorClassroom;