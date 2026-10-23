import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import "../styles/face-liveness.css";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const FRAME_COUNT = 30;
const FRAME_INTERVAL_MS = 100;

function FaceLiveness({ className, attemptId, onVerified }) {
  const videoRef = useRef(null);
  const [cameraStatus, setCameraStatus] = useState("requesting");
  const [status, setStatus] = useState("ready");
  const [actions, setActions] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let stream;
    let mounted = true;
    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera access requires a supported browser and secure context.");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (!mounted) return stream.getTracks().forEach((track) => track.stop());
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraStatus("ready");
      } catch (err) {
        if (!mounted) return;
        setCameraStatus("error");
        setError(err.message || "Allow camera access to continue.");
      }
    };
    startCamera();
    return () => {
      mounted = false;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video?.videoHeight) throw new Error("Camera is not ready yet.");

    const targetAspect = 4 / 3;
    const sourceAspect = video.videoWidth / video.videoHeight;
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = video.videoWidth;
    let sourceHeight = video.videoHeight;
    if (sourceAspect > targetAspect) {
      sourceWidth = video.videoHeight * targetAspect;
      sourceX = (video.videoWidth - sourceWidth) / 2;
    } else {
      sourceHeight = video.videoWidth / targetAspect;
      sourceY = (video.videoHeight - sourceHeight) / 2;
    }

    const scale = Math.min(1, 640 / sourceWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sourceWidth * scale);
    canvas.height = Math.round(sourceHeight * scale);
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Unable to capture a camera frame.");
    // Match the mirrored, center-cropped preview shown to the student.
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.7).split(",")[1];
  };

  const captureFrames = async (baselineFrameCount, challengeActions) => {
    // Establish a neutral baseline before showing the randomized actions.
    await wait(500);
    const frames = [captureFrame()];
    for (let i = 1; i < baselineFrameCount; i += 1) {
      await wait(FRAME_INTERVAL_MS);
      frames.push(captureFrame());
    }
    challengeActions();
    for (let i = baselineFrameCount; i < FRAME_COUNT; i += 1) {
      await wait(FRAME_INTERVAL_MS);
      frames.push(captureFrame());
    }
    return frames;
  };

  const verify = async () => {
    if (!attemptId || cameraStatus !== "ready" || status === "verifying") return;
    setStatus("verifying");
    setError("");
    setActions([]);
    try {
      const challenge = await api(`/api/attendance/attempts/${attemptId}/liveness/challenge`, { method: "POST" });
      const frames = await captureFrames(challenge.baselineFrames, () => setActions(challenge.actions));
      await api(`/api/attendance/attempts/${attemptId}/liveness`, {
        method: "POST",
        body: { challengeId: challenge.challengeId, nonce: challenge.nonce, frames },
      });
      setStatus("verified");
      await onVerified?.();
    } catch (err) {
      setStatus("ready");
      setError(err.message);
    }
  };

  return (
    <main className={`face-page ${className || ""}`}>
      <section className="face-card">
        <header className="face-header"><div className="face-header-top">
          <div className="face-icon" aria-hidden="true">F</div>
          <div><span className="face-eyebrow">FACE LIVENESS</span>
            <h1>Verify Your Presence</h1>
            <p>Follow the random actions while your camera captures a short sequence.</p>
          </div>
        </div></header>
        <div className={`camera-container ${status === "verifying" ? "verifying" : ""} ${status === "verified" ? "verified" : ""}`}>
          <video ref={videoRef} autoPlay playsInline muted className="camera-preview" />
          {cameraStatus !== "ready" && <div className={`camera-message ${cameraStatus === "error" ? "error" : ""}`}>
            <strong>{cameraStatus === "error" ? "Camera unavailable" : "Requesting camera access"}</strong>
            <span>{error || "Please allow camera access."}</span>
          </div>}
          {status === "verifying" && <div className="camera-live-badge"><span />LIVE</div>}
        </div>
        {actions.length > 0 && <div className="face-status ready" aria-live="polite">
          <div className="status-dot" /><div><strong>{status === "verifying" ? "Do these actions:" : "Last challenge:"}</strong>
            <span>{actions.map((action) => action.replaceAll("_", " ")).join(" then ")}</span></div>
        </div>}
        {error && cameraStatus === "ready" && <p className="error-message" role="alert">{error}</p>}
        {status === "verifying" && <div className="verification-status"><h3>Checking captured frames</h3><p>Follow the actions shown above and keep your face in view.</p></div>}
        <button type="button" className="face-button" onClick={verify}
          disabled={cameraStatus !== "ready" || status === "verifying" || !attemptId}>
          <span>{status === "verifying" ? "Capturing..." : "Start Face Verification"}</span>
          <span className="button-arrow">&gt;</span>
        </button>
        <div className="face-footer"><span>CLASS</span><strong>{className || "Selected class"}</strong></div>
      </section>
    </main>
  );
}

export default FaceLiveness;
