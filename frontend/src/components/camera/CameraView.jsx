import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import "./CameraView.css";

const CameraView = forwardRef(function CameraView(
  {
    active = false,
    onCameraReady,
    onError,
    onFrameCapture,
  },
  ref
) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const captureIntervalRef = useRef(null);
  const firstCaptureTimeoutRef = useRef(null);

  // Keep latest callbacks
  const onCameraReadyRef = useRef(onCameraReady);
  const onErrorRef = useRef(onError);
  const onFrameCaptureRef = useRef(onFrameCapture);

  const [status, setStatus] = useState("inactive");
  const [error, setError] = useState("");
  const [frameCount, setFrameCount] = useState(0);

  /* =========================================================
     KEEP CALLBACKS UPDATED
  ========================================================= */

  useEffect(() => {
    onCameraReadyRef.current = onCameraReady;
  }, [onCameraReady]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onFrameCaptureRef.current = onFrameCapture;
  }, [onFrameCapture]);

  /* =========================================================
     STOP FRAME CAPTURE
  ========================================================= */

  const stopFrameCapture = () => {
    if (firstCaptureTimeoutRef.current) {
      clearTimeout(firstCaptureTimeoutRef.current);
      firstCaptureTimeoutRef.current = null;
    }

    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }

    console.log("FRAME TIMER: stopped");
  };

  /* =========================================================
     CAPTURE CURRENT VIDEO FRAME
  ========================================================= */

  const captureFrame = () => {
    const video = videoRef.current;

    if (!video) {
      console.log("FRAME: video element not found");
      return;
    }

    if (video.readyState < 2) {
      console.log(
        "FRAME: video not ready, readyState =",
        video.readyState
      );
      return;
    }

    if (
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      console.log(
        "FRAME: invalid video dimensions",
        video.videoWidth,
        video.videoHeight
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

        setFrameCount((previous) => previous + 1);

        console.log(
          "FRAME CAPTURED:",
          blob.size,
          "bytes",
          `${canvas.width}x${canvas.height}`
        );

        if (onFrameCaptureRef.current) {
          onFrameCaptureRef.current(blob);
        }
      },
      "image/jpeg",
      0.85
    );
  };

  /* =========================================================
     START AUTOMATIC FRAME CAPTURE
  ========================================================= */

  const startFrameCapture = () => {
    stopFrameCapture();

    console.log(
      "FRAME TIMER: starting automatic capture"
    );

    // First frame after 1 second
    firstCaptureTimeoutRef.current = setTimeout(() => {
      console.log("FRAME TIMER: first capture");
      captureFrame();
    }, 1000);

    // Then every 2 seconds
    captureIntervalRef.current = setInterval(() => {
      console.log("FRAME TIMER: interval capture");
      captureFrame();
    }, 2000);
  };

  /* =========================================================
     START CAMERA
  ========================================================= */

  const startCamera = async () => {
    try {
      console.log("CAMERA: starting");

      setError("");
      setStatus("starting");

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error(
          "Camera access is not supported by this browser."
        );
      }

      // Stop previous stream
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => track.stop());

        streamRef.current = null;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
            frameRate: {
              ideal: 30,
            },
          },
          audio: false,
        });

      console.log(
        "CAMERA: getUserMedia successful"
      );

      streamRef.current = stream;

      const video = videoRef.current;

      if (!video) {
        console.log(
          "CAMERA: video element not available"
        );
        return;
      }

      video.srcObject = stream;

      /*
       * Wait until the video knows its dimensions.
       */
      await new Promise((resolve) => {
        if (
          video.readyState >= 1 &&
          video.videoWidth > 0
        ) {
          resolve();
          return;
        }

        video.onloadedmetadata = () => {
          resolve();
        };
      });

      console.log(
        "CAMERA: video metadata loaded"
      );

      console.log(
        "VIDEO SIZE:",
        video.videoWidth,
        "x",
        video.videoHeight
      );

      await video.play();

      console.log(
        "CAMERA: video playback started"
      );

      setStatus("active");

      if (onCameraReadyRef.current) {
        onCameraReadyRef.current();
      }

      /*
       * Start frame capture only after
       * camera/video is actually ready.
       */
      startFrameCapture();

    } catch (cameraError) {
      console.error(
        "CAMERA ERROR:",
        cameraError
      );

      let message =
        "Unable to access the camera.";

      if (
        cameraError?.name ===
        "NotAllowedError"
      ) {
        message =
          "Camera permission was denied. Please allow camera access in your browser.";
      } else if (
        cameraError?.name ===
        "NotFoundError"
      ) {
        message =
          "No camera was found on this device.";
      } else if (
        cameraError?.name ===
        "NotReadableError"
      ) {
        message =
          "The camera is already being used by another application.";
      } else if (
        cameraError?.name ===
        "OverconstrainedError"
      ) {
        message =
          "The requested camera settings are not supported.";
      } else if (cameraError?.message) {
        message = cameraError.message;
      }

      setError(message);
      setStatus("error");

      if (onErrorRef.current) {
        onErrorRef.current(message);
      }
    }
  };

  /* =========================================================
     STOP CAMERA
  ========================================================= */

  const stopCamera = () => {
    console.log("CAMERA: stopping");

    stopFrameCapture();

    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current.onloadedmetadata = null;
    }

    setStatus("inactive");
    setError("");

    console.log("CAMERA: stopped");
  };

  /* =========================================================
     EXPOSE METHODS TO PARENT
  ========================================================= */

  useImperativeHandle(
    ref,
    () => ({
      startCamera,
      stopCamera,
      captureFrame,
    }),
    []
  );

  /* =========================================================
     ACTIVE / INACTIVE
  ========================================================= */

  useEffect(() => {
    if (active) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };

    // active is intentionally the trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="camera-view">

      {/* CAMERA HEADER */}

      <div className="camera-view-header">

        <div className="camera-view-title">

          <div className="camera-view-icon">
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
          className={`camera-status camera-status-${status}`}
        >
          <span className="camera-status-dot" />

          <span>
            {status === "active"
              ? "Camera Active"
              : status === "starting"
              ? "Starting Camera"
              : status === "error"
              ? "Camera Error"
              : "Camera Off"}
          </span>
        </div>

      </div>


      {/* CAMERA PREVIEW */}

      <div className="camera-preview-container">

        {active && status !== "error" ? (
          <video
            ref={videoRef}
            className="camera-video"
            autoPlay
            muted
            playsInline
          />
        ) : (
          <div className="camera-placeholder">

            <div className="camera-placeholder-icon">
              ◉
            </div>

            <h3>
              Camera is Off
            </h3>

            <p>
              Start the classroom session to
              activate the Smart Board camera.
            </p>

          </div>
        )}


        {/* SCANNING OVERLAY */}

        {status === "active" && (
          <div className="camera-scan-overlay">

            <div className="camera-corner top-left" />
            <div className="camera-corner top-right" />
            <div className="camera-corner bottom-left" />
            <div className="camera-corner bottom-right" />

            <div className="camera-scan-line" />

          </div>
        )}


        {/* LOADING */}

        {status === "starting" && (
          <div className="camera-loading">

            <div className="camera-spinner" />

            <span>
              Starting camera...
            </span>

          </div>
        )}

      </div>


      {/* ERROR */}

      {error && (
        <div className="camera-error">

          <span className="camera-error-icon">
            !
          </span>

          <div>

            <strong>
              Camera Error
            </strong>

            <p>
              {error}
            </p>

          </div>

        </div>
      )}


      {/* CAMERA INFORMATION */}

      <div className="camera-view-footer">

        <div className="camera-info">

          <span className="camera-info-label">
            STATUS
          </span>

          <span className="camera-info-value">
            {status === "active"
              ? "Ready for recognition"
              : "Waiting for session"}
          </span>

        </div>


        <div className="camera-info">

          <span className="camera-info-label">
            FRAMES
          </span>

          <span className="camera-info-value">
            {frameCount}
          </span>

        </div>


        <div className="camera-info">

          <span className="camera-info-label">
            SOURCE
          </span>

          <span className="camera-info-value">
            Smart Board Camera
          </span>

        </div>

      </div>

    </div>
  );
});

export default CameraView;