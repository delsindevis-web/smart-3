import { useState } from "react";
import { login } from "../api";
import "../styles/professor-login.css";

function ProfessorLogin({ onLogin }) {
  const [submitting, setSubmitting] = useState(false);
  const [professorId, setProfessorId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (!professorId.trim() || !password) {
      setError("Please enter your Professor ID and password.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const user = await login(professorId, password);
      if (user.role !== "teacher") {
        sessionStorage.removeItem("token");
        throw new Error("This account does not have professor access.");
      }
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="professor-login-page">
      <section className="professor-login-card">
        <div className="professor-login-icon">
          👨‍🏫
        </div>

        <h1>Professor Login</h1>

        <p className="professor-login-subtitle">
          Manage classes and monitor student attendance.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="professor-form-group">
            <label htmlFor="professorId">
              Professor ID
            </label>

            <input
              id="professorId"
              type="text"
              placeholder="Enter your Professor ID"
              value={professorId}
              onChange={(event) =>
                setProfessorId(event.target.value)
              }
              autoComplete="username"
            />
          </div>

          <div className="professor-form-group">
            <label htmlFor="professorPassword">
              Password
            </label>

            <input
              id="professorPassword"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="professor-login-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="professor-login-button"
            disabled={submitting}
          >
            {submitting ? "Signing in..." : "Login to Dashboard"}
          </button>
        </form>

        <p className="professor-login-footer">
          Smart Attendance System
          <br />
          IIIT Dharwad
        </p>
      </section>
    </main>
  );
}

export default ProfessorLogin;