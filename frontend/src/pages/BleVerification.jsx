import { useEffect, useState } from "react";
import "../styles/ble-verification.css";

function BleVerification({ className, onVerified }) {
  const [status, setStatus] = useState("ready");

  useEffect(() => {
    return () => {
      // Cleanup handled by the browser when the component unmounts.
    };
  }, []);

  const startVerification = () => {
    setStatus("scanning");

    setTimeout(() => {
      setStatus("checking");
    }, 2000);

    setTimeout(() => {
      setStatus("verified");
    }, 4000);
  };

  const statusData = {
    ready: {
      title: "Ready to verify",
      message: "Start the proximity check when you're inside the classroom.",
    },

    scanning: {
      title: "Scanning for classroom",
      message: "Looking for the classroom's BLE device...",
    },

    checking: {
      title: "Checking proximity",
      message: "Verifying that you are within the required range...",
    },

    verified: {
      title: "Proximity verified",
      message: "Your device is within the classroom's allowed range.",
    },
  };

  const current = statusData[status];

  return (
    <main className={`ble-page ${className || ""}`}>
      <section className="ble-card">

        {/* Header */}
        <div className="ble-header">

          <div className="ble-icon-wrapper">
            <div className={`ble-icon ${status}`}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 3V21"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />

                <path
                  d="M8.5 7.5L15.5 16.5L8.5 16.5L15.5 7.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <div>
            <span className="ble-eyebrow">
              STEP 1 OF 2
            </span>

            <h1>Verify Your Presence</h1>

            <p>
              Confirm that you are physically present
              inside the classroom before marking attendance.
            </p>
          </div>
        </div>


        {/* Scanner */}
        <div className={`ble-scanner ${status}`}>

          {status === "verified" ? (
            <div className="verified-symbol">
              ✓
            </div>
          ) : (
            <>
              <div className="scanner-ring ring-one"></div>
              <div className="scanner-ring ring-two"></div>
              <div className="scanner-ring ring-three"></div>

              <div className="scanner-center">
                <span></span>
              </div>
            </>
          )}

        </div>


        {/* Status */}
        <div className={`ble-status-panel ${status}`}>

          <div className="status-indicator">
            <span className="status-dot"></span>
          </div>

          <div className="status-text">
            <h2>{current.title}</h2>
            <p>{current.message}</p>
          </div>

        </div>


        {/* Verification steps */}
        <div className="verification-steps">

          <div
            className={`verification-step ${
              status !== "ready" ? "complete" : "active"
            }`}
          >
            <span className="step-icon">
              {status !== "ready" ? "✓" : "1"}
            </span>

            <div>
              <strong>Bluetooth</strong>
              <small>Device communication</small>
            </div>
          </div>


          <div
            className={`verification-step ${
              status === "checking" || status === "verified"
                ? "complete"
                : status === "scanning"
                ? "active"
                : ""
            }`}
          >
            <span className="step-icon">
              {status === "checking" || status === "verified"
                ? "✓"
                : "2"}
            </span>

            <div>
              <strong>Classroom detected</strong>
              <small>Nearby BLE device</small>
            </div>
          </div>


          <div
            className={`verification-step ${
              status === "verified" ? "complete" : ""
            }`}
          >
            <span className="step-icon">
              {status === "verified" ? "✓" : "3"}
            </span>

            <div>
              <strong>Proximity confirmed</strong>
              <small>Within allowed range</small>
            </div>
          </div>

        </div>


        {/* Progress */}
        {(status === "scanning" || status === "checking") && (
          <div className="ble-progress">

            <div className="progress-header">
              <span>
                {status === "scanning"
                  ? "Searching for classroom..."
                  : "Verifying proximity..."}
              </span>

              <span className="progress-percentage">
                {status === "scanning" ? "50%" : "85%"}
              </span>
            </div>

            <div className="progress-track">
              <div
                className={`progress-fill ${status}`}
              ></div>
            </div>

            <p>
              Please stay near the classroom while verification is in progress.
            </p>

          </div>
        )}


        {/* Actions */}
        <div className="ble-actions">

          {status === "ready" && (
            <button
              className="ble-button primary"
              onClick={startVerification}
            >
              <span>Start Proximity Check</span>
              <span className="button-arrow">→</span>
            </button>
          )}


          {status === "verified" && (
            <button
              className="ble-button success"
              onClick={onVerified}
            >
              <span>Continue to Face Verification</span>
              <span className="button-arrow">→</span>
            </button>
          )}

        </div>


        {/* Footer */}
        <div className="ble-footer">
          <span className="security-dot"></span>
          <span>Secure proximity verification</span>
        </div>

      </section>
    </main>
  );
}

export default BleVerification;


