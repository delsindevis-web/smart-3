import { useEffect, useRef, useState } from "react";
import "../styles/face-liveness.css";

function FaceLiveness({ className, onVerified }) {
  const videoRef = useRef(null);
  const verificationTimers = useRef([]);
  const hasCompletedRef = useRef(false);

  const [cameraStatus, setCameraStatus] = useState("requesting");
  const [verificationStatus, setVerificationStatus] = useState("ready");
  const [error, setError] = useState("");

  // ==========================================
  // START CAMERA
  // ==========================================

  useEffect(() => {
    let stream;
    let mounted = true;

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera API is not supported.");
        }

        const cameraStream =
          await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user",
            },
            audio: false,
          });

        // Stop the stream if the component has already unmounted.
        if (!mounted) {
          cameraStream.getTracks().forEach((track) => track.stop());
          return;
        }

        stream = cameraStream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        setCameraStatus("ready");
      } catch (err) {
        console.error("Camera access error:", err);

        if (mounted) {
          setCameraStatus("error");
          setError(
            "Camera access is required for face verification. " +
              "Please allow camera permissions and try again."
          );
        }
      }
    };

    startCamera();

    return () => {
      mounted = false;

      // Stop camera tracks when leaving the page.
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      // Clear any pending verification timers.
      verificationTimers.current.forEach((timer) => {
        clearTimeout(timer);
      });

      verificationTimers.current = [];
    };
  }, []);

  // ==========================================
  // START FACE VERIFICATION
  // ==========================================

  const startFaceVerification = () => {
    if (
      cameraStatus !== "ready" ||
      verificationStatus !== "ready" ||
      hasCompletedRef.current
    ) {
      return;
    }

    setVerificationStatus("verifying");
    setError("");

    // IMPORTANT:
    // This is a temporary simulation.
    // Actual face-liveness detection has not been implemented.

    const verificationTimer = setTimeout(() => {
      setVerificationStatus("verified");
    }, 3000);

    const completionTimer = setTimeout(() => {
      if (hasCompletedRef.current) {
        return;
      }

      hasCompletedRef.current = true;

      // Notify App.jsx that the face verification step is complete.
      // App.jsx should navigate to the Dynamic QR Verification page.
      if (typeof onVerified === "function") {
        onVerified();
      }
    }, 4500);

    verificationTimers.current.push(
      verificationTimer,
      completionTimer
    );
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <main className={`face-page ${className || ""}`}>
      <section className="face-card">

        {/* HEADER */}

        <header className="face-header">
          <div className="face-header-top">

            <div className="face-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 8V6C4 4.9 4.9 4 6 4H8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />

                <path
                  d="M16 4H18C19.1 4 20 4.9 20 6V8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />

                <path
                  d="M20 16V18C20 19.1 19.1 20 18 20H16"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />

                <path
                  d="M8 20H6C4.9 20 4 19.1 4 18V16"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />

                <circle
                  cx="12"
                  cy="10"
                  r="2.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />

                <path
                  d="M7.5 17C8.5 14.8 10 14 12 14C14 14 15.5 14.8 16.5 17"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div>
              <span className="face-eyebrow">
                STEP 2 OF 3
              </span>

              <h1>Verify Your Identity</h1>

              <p>
                Look directly at the camera to verify that
                you are physically present.
              </p>
            </div>

          </div>
        </header>

        {/* CAMERA */}

        <div
          className={`camera-container ${
            verificationStatus === "verifying"
              ? "verifying"
              : ""
          } ${
            verificationStatus === "verified"
              ? "verified"
              : ""
          }`}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="camera-preview"
          />

          {/* Camera loading */}

          {cameraStatus === "requesting" && (
            <div className="camera-message">
              <div className="camera-loader"></div>

              <strong>
                Requesting camera access
              </strong>

              <span>
                Please allow camera access to continue.
              </span>
            </div>
          )}

          {/* Camera error */}

          {cameraStatus === "error" && (
            <div className="camera-message error">
              <div className="camera-error-icon">
                !
              </div>

              <strong>
                Camera unavailable
              </strong>

              <span>
                {error}
              </span>
            </div>
          )}

          {/* Face scanning animation */}

          {verificationStatus === "verifying" && (
            <>
              <div className="face-frame">
                <span className="frame-corner top-left"></span>
                <span className="frame-corner top-right"></span>
                <span className="frame-corner bottom-left"></span>
                <span className="frame-corner bottom-right"></span>

                <div className="face-scan-line"></div>
              </div>

              <div className="camera-live-badge">
                <span></span>
                LIVE
              </div>

              <div className="face-position-label">
                Keep your face centered
              </div>
            </>
          )}

          {/* Verification success overlay */}

          {verificationStatus === "verified" && (
            <div className="verification-overlay">
              <div className="success-icon">
                ✓
              </div>

              <strong>
                Liveness Verified
              </strong>

              <span>
                Identity check successful
              </span>
            </div>
          )}
        </div>

        {/* READY STATE */}

        {verificationStatus === "ready" && (
          <>
            <div className="face-status ready">
              <div className="status-dot"></div>

              <div>
                <strong>
                  Ready for verification
                </strong>

                <span>
                  Position your face inside the camera frame.
                </span>
              </div>
            </div>

            <div className="face-instructions">

              <div className="instruction-item">
                <span className="instruction-check">
                  ✓
                </span>

                <div>
                  <strong>
                    Face clearly visible
                  </strong>

                  <span>
                    Make sure your face is not covered.
                  </span>
                </div>
              </div>

              <div className="instruction-item">
                <span className="instruction-check">
                  ✓
                </span>

                <div>
                  <strong>
                    Look at the camera
                  </strong>

                  <span>
                    Keep your eyes directed toward the camera.
                  </span>
                </div>
              </div>

              <div className="instruction-item">
                <span className="instruction-check">
                  ✓
                </span>

                <div>
                  <strong>
                    Stay within the frame
                  </strong>

                  <span>
                    Keep your face centered and visible.
                  </span>
                </div>
              </div>

            </div>

            {/* Start button */}

            {cameraStatus === "ready" && (
              <button
                type="button"
                className="face-button"
                onClick={startFaceVerification}
                disabled={hasCompletedRef.current}
              >
                <span>
                  Start Face Verification
                </span>

                <span className="button-arrow">
                  →
                </span>
              </button>
            )}
          </>
        )}

        {/* VERIFYING STATE */}

        {verificationStatus === "verifying" && (
          <div className="verification-status">
            <div className="verification-status-header">

              <div className="verification-spinner">
                <div></div>
              </div>

              <div>
                <h3>
                  Verifying your presence
                </h3>

                <p>
                  Keep your face visible and stay still.
                </p>
              </div>

            </div>

            <div className="verification-progress">
              <div className="verification-progress-header">
                <span>
                  Liveness detection
                </span>

                <span>
                  Checking...
                </span>
              </div>

              <div className="verification-progress-track">
                <div className="verification-progress-fill"></div>
              </div>
            </div>
          </div>
        )}

        {/* VERIFIED STATE */}

        {verificationStatus === "verified" && (
          <div className="verification-status success">
            <h3>
              ✓ Face verification complete
            </h3>

            <p>
              Proceeding to Dynamic QR Verification...
            </p>
          </div>
        )}

        {/* CLASS INFORMATION */}

        <div className="face-footer">
          <span>
            CLASS
          </span>

          <strong>
            {className || "Selected class"}
          </strong>

          <div className="secure-label">
            <span></span>
            Secure identity verification
          </div>
        </div>

      </section>
    </main>
  );
}

export default FaceLiveness;

