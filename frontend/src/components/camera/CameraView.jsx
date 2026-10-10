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
    onCameraError,
    onError,
    onFrameCapture,
    faces = [],
  },
  ref
) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const overlayRef = useRef(null);
  const captureIntervalRef = useRef(null);
  const firstCaptureTimeoutRef = useRef(null);
  const onCameraReadyRef = useRef(onCameraReady);
  const onErrorRef = useRef(onCameraError || onError);
  const onFrameCaptureRef = useRef(onFrameCapture);

  const [status, setStatus] = useState("inactive");
  const [error, setError] = useState("");
  const [frameCount, setFrameCount] = useState(0);

  useEffect(() => { onCameraReadyRef.current = onCameraReady; }, [onCameraReady]);
  useEffect(() => { onErrorRef.current = onCameraError || onError; }, [onCameraError, onError]);
  useEffect(() => { onFrameCaptureRef.current = onFrameCapture; }, [onFrameCapture]);

  // Draw face boxes on a transparent canvas layered over the video.
  useEffect(() => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    if (!video || !overlay || !active) return;

    const drawBoxes = () => {
      const context = overlay.getContext("2d");
      if (!context) return;

      const width = video.clientWidth;
      const height = video.clientHeight;
      const sourceWidth = video.videoWidth;
      const sourceHeight = video.videoHeight;
      if (!width || !height || !sourceWidth || !sourceHeight) return;

      if (overlay.width !== width * window.devicePixelRatio ||
          overlay.height !== height * window.devicePixelRatio) {
        overlay.width = Math.round(width * window.devicePixelRatio);
        overlay.height = Math.round(height * window.devicePixelRatio);
      }

      context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);

      // The API bbox is expected to be [x1, y1, x2, y2] in source-frame pixels.
      faces.forEach((face) => {
        const box = face.bbox;
        if (!Array.isArray(box) || box.length < 4) return;

        const [x1, y1, x2, y2] = box.map(Number);
        if (![x1, y1, x2, y2].every(Number.isFinite)) return;

        // Account for object-fit: contain letterboxing in the displayed video.
        const scale = Math.min(width / sourceWidth, height / sourceHeight);
        const drawnWidth = sourceWidth * scale;
        const drawnHeight = sourceHeight * scale;
        const offsetX = (width - drawnWidth) / 2;
        const offsetY = (height - drawnHeight) / 2;
        const left = offsetX + x1 * scale;
        const top = offsetY + y1 * scale;
        const boxWidth = (x2 - x1) * scale;
        const boxHeight = (y2 - y1) * scale;
        if (boxWidth <= 0 || boxHeight <= 0) return;

        const matched = Boolean(face.recognized && face.student_id);
        const color = matched ? "#16a34a" : "#ef4444";
        context.strokeStyle = color;
        context.lineWidth = 3;
        context.strokeRect(left, top, boxWidth, boxHeight);

        const label = matched ? face.student_id : "Unknown Person";
        context.font = "600 14px Arial";
        const labelWidth = context.measureText(label).width + 16;
        const labelHeight = 25;
        const labelY = Math.max(labelHeight, top);
        context.fillStyle = color;
        context.fillRect(left, labelY - labelHeight, labelWidth, labelHeight);
        context.fillStyle = "#ffffff";
        context.fillText(label, left + 8, labelY - 8);
      });
    };

    drawBoxes();
    const observer = new ResizeObserver(drawBoxes);
    observer.observe(video);
    const animationId = requestAnimationFrame(drawBoxes);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationId);
    };
  }, [faces, active, status]);

  const stopFrameCapture = () => {
    if (firstCaptureTimeoutRef.current) {
      clearTimeout(firstCaptureTimeoutRef.current);
      firstCaptureTimeoutRef.current = null;
    }
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
  };

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      setFrameCount((previous) => previous + 1);
      if (onFrameCaptureRef.current) onFrameCaptureRef.current(blob);
    }, "image/jpeg", 0.85);
  };

  const startFrameCapture = () => {
    stopFrameCapture();
    firstCaptureTimeoutRef.current = setTimeout(captureFrame, 1000);
    captureIntervalRef.current = setInterval(captureFrame, 2000);
  };

  const stopCamera = () => {
    stopFrameCapture();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current.onloadedmetadata = null;
    }
    setStatus("inactive");
    setError("");
  };

  const startCamera = async () => {
    try {
      setError("");
      setStatus("starting");
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access is not supported by this browser.");
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Camera video element is unavailable.");

      video.srcObject = stream;
      await new Promise((resolve) => {
        if (video.readyState >= 1 && video.videoWidth > 0) resolve();
        else video.onloadedmetadata = resolve;
      });
      await video.play();
      setStatus("active");
      onCameraReadyRef.current?.();
      startFrameCapture();
    } catch (cameraError) {
      console.error("CAMERA ERROR:", cameraError);
      let message = cameraError?.message || "Unable to access the camera.";
      if (cameraError?.name === "NotAllowedError") {
        message = "Camera permission was denied. Please allow camera access in your browser.";
      } else if (cameraError?.name === "NotFoundError") {
        message = "No camera was found on this device.";
      } else if (cameraError?.name === "NotReadableError") {
        message = "The camera is already being used by another application.";
      }
      setError(message);
      setStatus("error");
      onErrorRef.current?.(message);
    }
  };

  useImperativeHandle(ref, () => ({ startCamera, stopCamera, captureFrame }));

  useEffect(() => {
    if (active) startCamera();
    else stopCamera();
    return () => stopCamera();
    // active intentionally controls camera lifecycle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div className="camera-view">
      <div className="camera-view-header">
        <div className="camera-view-title">
          <div className="camera-view-icon">◉</div>
          <div>
            <h3>Smart Board Camera</h3>
            <p>Classroom attendance camera</p>
          </div>
        </div>
        <div className={`camera-status camera-status-${status}`}>
          <span className="camera-status-dot" />
          <span>
            {status === "active" ? "Camera Active" :
              status === "starting" ? "Starting Camera" :
              status === "error" ? "Camera Error" : "Camera Off"}
          </span>
        </div>
      </div>

      <div className="camera-preview-container">
        {active && status !== "error" ? (
          <>
            <video
              ref={videoRef}
              className="camera-video"
              autoPlay
              muted
              playsInline
            />
            <canvas
              ref={overlayRef}
              className="camera-face-overlay"
              aria-label="Detected face boxes"
            />
          </>
        ) : (
          <div className="camera-placeholder">
            <div className="camera-placeholder-icon">◉</div>
            <h3>Camera is Off</h3>
            <p>Start the classroom session to activate the Smart Board camera.</p>
          </div>
        )}

        {status === "active" && (
          <div className="camera-scan-overlay" aria-hidden="true">
            <div className="camera-corner top-left" />
            <div className="camera-corner top-right" />
            <div className="camera-corner bottom-left" />
            <div className="camera-corner bottom-right" />
            <div className="camera-scan-line" />
          </div>
        )}

        {status === "starting" && (
          <div className="camera-loading">
            <div className="camera-spinner" />
            <span>Starting camera...</span>
          </div>
        )}
      </div>

      {error && (
        <div className="camera-error">
          <span className="camera-error-icon">!</span>
          <div>
            <strong>Camera Error</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="camera-view-footer">
        <div className="camera-info">
          <span className="camera-info-label">STATUS</span>
          <span className="camera-info-value">
            {status === "active" ? "Ready for recognition" : "Waiting for session"}
          </span>
        </div>
        <div className="camera-info">
          <span className="camera-info-label">FRAMES</span>
          <span className="camera-info-value">{frameCount}</span>
        </div>
        <div className="camera-info">
          <span className="camera-info-label">SOURCE</span>
          <span className="camera-info-value">Smart Board Camera</span>
        </div>
      </div>
    </div>
  );
});

export default CameraView;
