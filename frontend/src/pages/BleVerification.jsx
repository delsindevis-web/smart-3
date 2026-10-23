import { useRef, useState } from "react";
import { api } from "../api";
import "../styles/ble-verification.css";

function BleVerification({ className, attemptId, beaconId, onVerified }) {
  const [status, setStatus] = useState("ready");
  const [error, setError] = useState("");
  const busyRef = useRef(false);

  const startVerification = async () => {
    if (busyRef.current) return;
    setError("");
    if (!navigator.bluetooth?.requestLEScan) {
      setError("This browser cannot scan BLE advertisements. Use a recent Chrome or Edge browser on a supported device.");
      return;
    }
    if (!beaconId || !attemptId) {
      setError("This attendance session is missing its BLE beacon configuration.");
      return;
    }
    busyRef.current = true;
    setStatus("scanning");
    let scan;
    try {
      scan = await navigator.bluetooth.requestLEScan({ filters: [{ name: beaconId }], keepRepeatedDevices: true });
      const advertisement = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          navigator.bluetooth.removeEventListener("advertisementreceived", onAdvertisement);
          reject(new Error("Classroom beacon not found. Move closer and try again."));
        }, 15000);
        const onAdvertisement = (event) => {
          if (event.device.name !== beaconId || typeof event.rssi !== "number") return;
          clearTimeout(timeout);
          navigator.bluetooth.removeEventListener("advertisementreceived", onAdvertisement);
          resolve(event);
        };
        navigator.bluetooth.addEventListener("advertisementreceived", onAdvertisement);
      });
      setStatus("checking");
      await api(`/api/attendance/attempts/${attemptId}/ble`, {
        method: "POST", body: { beaconId, rssi: advertisement.rssi },
      });
      setStatus("verified");
      onVerified?.();
    } catch (err) {
      setStatus("ready");
      setError(err.message || "BLE scan failed.");
    } finally {
      try { scan?.stop(); } catch { /* already stopped */ }
      busyRef.current = false;
    }
  };

  const labels = {
    ready: ["Ready to verify", "Start the proximity check inside the classroom."],
    scanning: ["Scanning for classroom", `Looking for ${beaconId || "the classroom beacon"}...`],
    checking: ["Checking proximity", "Sending the beacon reading to attendance."],
    verified: ["Proximity verified", "The classroom beacon was detected."],
  };
  const [title, message] = labels[status];

  return <main className={`ble-page ${className || ""}`}><section className="ble-card">
    <div className="ble-header"><div className="ble-icon-wrapper"><div className={`ble-icon ${status}`}>?</div></div>
      <div><span className="ble-eyebrow">STEP 1 OF 2</span><h1>Verify Your Presence</h1>
        <p>Scan for the classroom beacon before continuing.</p></div>
    </div>
    <div className={`ble-scanner ${status}`}><div className="scanner-ring ring-one" /><div className="scanner-ring ring-two" /><div className="scanner-ring ring-three" /></div>
    <div className={`ble-status-panel ${status}`}><div className="status-indicator"><span className="status-dot" /></div>
      <div className="status-text"><h2>{title}</h2><p>{message}</p></div></div>
    {error && <p className="error-message" role="alert">{error}</p>}
    {status !== "verified" && <button className="ble-button primary" onClick={startVerification} disabled={status === "scanning" || status === "checking"}>
      <span>{status === "ready" ? "Start BLE Scan" : "Scanning..."}</span><span className="button-arrow">?</span>
    </button>}
    <div className="ble-footer"><span className="security-dot" /><span>BLE advertisement detected locally</span></div>
  </section></main>;
}

export default BleVerification;
