import "../styles/attendance-success.css";

const factorLabels = {
  ble: "BLE proximity verified",
  face: "Face liveness verified",
  qr: "Dynamic QR validated",
};

function AttendanceSuccess({ className, studentId, attendanceResult }) {
  const verified = attendanceResult?.verified ?? {};
  const markedAt = attendanceResult?.markedAt
    ? new Date(attendanceResult.markedAt).toLocaleTimeString()
    : null;
  const completedFactors = Object.entries(factorLabels)
    .filter(([factor]) => verified[factor])
    .map(([, label]) => label);

  return (
    <main className="success-page">
      <section className="success-card">
        <div className="success-check">✓</div>
        <h1>Attendance Marked!</h1>
        <p className="success-message">Your attendance has been recorded by the server.</p>
        <div className="attendance-details">
          <div><span>Class</span><strong>{className || "Selected class"}</strong></div>
          <div><span>Status</span><strong>{attendanceResult?.status ?? "Present"}</strong></div>
          {studentId && <div><span>Student ID</span><strong>{studentId}</strong></div>}
          {markedAt && <div><span>Marked at</span><strong>{markedAt}</strong></div>}
        </div>
        <div className="success-verification">
          {completedFactors.map((label) => <p key={label}>✓ &nbsp; {label}</p>)}
        </div>
        <p className="success-note">Attendance was recorded after the required checks passed.</p>
      </section>
    </main>
  );
}

export default AttendanceSuccess;
