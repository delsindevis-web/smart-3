import { useState } from "react";
import "../styles/login.css";

function Login({ onLogin }) {
  const [studentId, setStudentId] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!studentId.trim()) {
      setError("Please enter your student ID.");
      return;
    }

    setError("");

    console.log("Student ID:", studentId);
    onLogin(studentId.trim());
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-header">
          <h1>Smart Attendance</h1>
          <p>Secure attendance for IIIT Dharwad</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="studentId">Student ID</label>

          <input
            id="studentId"
            type="text"
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
            placeholder="Enter your student ID"
          />

          {error && <p className="error-message">{error}</p>}

          <button type="submit">
            Continue
          </button>
        </form>

        <p className="login-info">
          Your identity will be verified using BLE proximity
          and face liveness detection.
        </p>
      </section>
    </main>
  );
}

export default Login;

