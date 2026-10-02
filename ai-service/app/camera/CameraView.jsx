import { useEffect, useRef, useState } from "react";
import "./CameraView.css";
console.log("🔥🔥🔥 CAMERA VIEW NEW FILE LOADED 🔥🔥🔥");

function CameraView({
  active = false,
  onCameraReady,
  onError,
  onFrameCapture,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const captureTimerRef = useRef(null);
  const firstCaptureTimerRef = useRef(null);

  const onFrameCaptureRef = useRef(onFrameCapture);
  const onCameraReadyRef = useRef(onCameraReady);
  const onErrorRef = useRef(onError);

  const [status, setStatus] = useState("Camera off");
  const [frameCount, setFrameCount] = useState(0);

  // Keep latest callbacks
  useEffect(() => {
    onFrameCaptureRef.current = onFrameCapture;
  }, [onFrameCapture]);

  useEffect(() => {
    onCameraReadyRef.current = onCameraReady;
  }, [onCameraReady]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // =========================================================
  // CAPTURE ONE FRAME
  // =========================================================
  const captureFrame = () => {
    const video = videoRef.current;

    if (!video) {
      console.log("FRAME: video element not found");
      return;
    }

    if (video.readyState < 2) {
      console.log(
        "FRAME: video not ready. readyState =",
        video.readyState
      );
      return;
    }

    if (
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      console.log(
        "FRAME: video dimensions are zero"
      );
      return;
    }

    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      console.log("FRAME: canvas context unavailable");
      return;
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          console.log("FRAME: blob creation failed");
          return;
        }

        // Increase frame counter
        setFrameCount((previous) => previous + 1);

        console.log(
          "FRAME CAPTURED:",
          blob.size,
          "bytes",
          `${canvas.width}x${canvas.height}`
        );

        // Send frame to parent
        if (onFrameCaptureRef.current) {
          onFrameCaptureRef.current(blob);
        }
      },
      "image/jpeg",
      0.85
    );
  };

  // =========================================================
  // START AUTOMATIC FRAME CAPTURE
  // =========================================================
  const startFrameCapture = () => {
    // Prevent duplicate timers
    if (captureTimerRef.current) {
      console.log("FRAME TIMER: already running");
      return;
    }

    console.log(
      "FRAME TIMER: starting automatic capture"
    );

    // First capture after 1 second
    firstCaptureTimerRef.current = setTimeout(() => {
      console.log("FRAME TIMER: first capture");
      captureFrame();
    }, 1000);

    // Continue every 2 seconds
    captureTimerRef.current = setInterval(() => {
      console.log("FRAME TIMER: capturing...");
      captureFrame();
    }, 2000);
  };

  // =========================================================
  // STOP AUTOMATIC FRAME CAPTURE
  // =========================================================
  const stopFrameCapture = () => {
    if (firstCaptureTimerRef.current) {
      clearTimeout(firstCaptureTimerRef.current);
      firstCaptureTimerRef.current = null;
    }

    if (captureTimerRef.current) {
      clearInterval(captureTimerRef.current);
      captureTimerRef.current = null;

      console.log(
        "FRAME TIMER: stopped"
      );
    }
  };

  // =========================================================
  // START CAMERA
  // =========================================================
  const startCamera = async () => {
    try {
      console.log("CAMERA: starting");

      setStatus("Requesting camera...");

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
            facingMode: "user",
          },
          audio: false,
        });

      streamRef.current = stream;

      const video = videoRef.current;

      if (!video) {
        console.log(
          "CAMERA: video element not available"
        );

        stream.getTracks().forEach((track) => {
          track.stop();
        });

        return;
      }

      video.srcObject = stream;

      // Wait until video metadata is available
      video.onloadedmetadata = async () => {
        try {
          await video.play();

          console.log(
            "CAMERA: video is ready"
          );

          console.log(
            "VIDEO SIZE:",
            video.videoWidth,
            "x",
            video.videoHeight
          );

          setStatus(
            "Ready for recognition"
          );

          if (onCameraReadyRef.current) {
            onCameraReadyRef.current();
          }

          // Start frame capture ONLY after video is ready
          startFrameCapture();
        } catch (error) {
          console.error(
            "CAMERA PLAY ERROR:",
            error
          );

          setStatus("Camera error");

          if (onErrorRef.current) {
            onErrorRef.current(
              error?.message ||
                "Unable to start camera video."
            );
          }
        }
      };
    } catch (error) {
      console.error(
        "CAMERA ERROR:",
        error
      );

      setStatus("Camera error");

      if (onErrorRef.current) {
        onErrorRef.current(
          error?.message ||
            "Unable to access the Smart Board camera."
        );
      }
    }
  };

  // =========================================================
  // STOP CAMERA
  // =========================================================
  const stopCamera = () => {
    console.log("CAMERA: stopping");

    stopFrameCapture();

    const video = videoRef.current;

    if (video) {
      video.onloadedmetadata = null;
    }

    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      streamRef.current = null;
    }

    if (video) {
      video.srcObject = null;
    }

    setStatus("Camera off");
  };

  // =========================================================
  // ACTIVE CONTROL
  // =========================================================
  useEffect(() => {
    if (!active) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };

    // active is intentionally the only trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div className="camera-view">

      {/* HEADER */}
      <div className="camera-view-header">

        <div className="camera-title-section">

          <div className="camera-icon">
            ◉
          </div>

          <div>
            <h3>
              Smart Board Camera
            </h3>

            <p>
              Classroom attendance camera
            </p>
          </div>

        </div>

        <div
          className={`camera-status ${
            active
              ? "active"
              : "inactive"
          }`}
        >
          <span className="status-dot"></span>

          {active
            ? "Camera Active"
            : "Camera Off"}
        </div>

      </div>

      {/* CAMERA PREVIEW */}
      <div className="camera-preview">

        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
        />

        {active && (
          <div className="camera-overlay">

            <div className="scan-corner top-left"></div>

            <div className="scan-corner top-right"></div>

            <div className="scan-corner bottom-left"></div>

            <div className="scan-corner bottom-right"></div>

          </div>
        )}

        {!active && (
          <div className="camera-off-message">
            Camera is currently off
          </div>
        )}

      </div>

      {/* FOOTER */}
      <div className="camera-footer">

        <div>
          <span className="footer-label">
            STATUS
          </span>

          <strong>
            {status}
          </strong>
        </div>

        <div>
          <span className="footer-label">
            FRAMES
          </span>

          <strong>
            {frameCount}
          </strong>
        </div>

        <div>
          <span className="footer-label">
            SOURCE
          </span>

          <strong>
            Smart Board Camera
          </strong>
        </div>

      </div>

    </div>
  );
}

export default CameraView;