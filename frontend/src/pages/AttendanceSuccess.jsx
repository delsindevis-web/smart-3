import "../styles/attendance-success.css";

function AttendanceSuccess({
  className,
  studentId,
  verifiedQR,
}) {
  return (
    <main className="success-page">
      <section className="success-card">

        {/* Success Icon */}
        <div className="success-check">
          ✓
        </div>

        {/* Heading */}
        <h1>Attendance Marked!</h1>

        <p className="success-message">
          Your attendance has been successfully recorded.
        </p>

        {/* Attendance Details */}
        <div className="attendance-details">
          <div>
            <span>Class</span>
            <strong>{className || "Selected class"}</strong>
          </div>

          <div>
            <span>Status</span>
            <strong>Present</strong>
          </div>

          {studentId && (
            <div>
              <span>Student ID</span>
              <strong>{studentId}</strong>
            </div>
          )}
        </div>

        {/* Verification Summary */}
        <div className="success-verification">
          <p>
            ✓ &nbsp; BLE proximity verified
          </p>

          <p>
            ✓ &nbsp; Face liveness verified
          </p>

          <p>
            ✓ &nbsp; Dynamic QR validated
          </p>

          <p>
            ✓ &nbsp; Attendance flow completed
          </p>
        </div>

        {/* Footer Message */}
        <p className="success-note">
          Your attendance verification flow completed using
          BLE proximity, face verification, and dynamic QR
          validation.
        </p>

      </section>
    </main>
  );
}

export default AttendanceSuccess;