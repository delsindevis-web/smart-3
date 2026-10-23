import { useState } from "react";
import { login } from "../api";
import "../styles/login.css";

function Login({ onLogin }) {
  const [submitting, setSubmitting] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!studentId.trim()) {
      setError("Please enter your student ID.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const user = await login(studentId, password);
      onLogin(user.loginId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
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

          <label htmlFor="password">Password <span>(if required)</span></label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
          />

          {error && <p className="error-message">{error}</p>}

          <button type="submit" disabled={submitting}>{submitting ? "Signing in..." : "Continue"}</button>
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

