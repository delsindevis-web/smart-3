import { useEffect, useState } from "react";
import { api } from "../api";
import "../styles/dashboard.css";

function Dashboard({ studentId, studentName, onAttendance, onLogout }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [startingCourse, setStartingCourse] = useState(null);

  useEffect(() => {
    let active = true;
    api("/api/student/dashboard")
      .then((result) => { if (active) setData(result); })
      .catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, []);

  const startAttendance = async (course) => {
    setStartingCourse(course.courseId);
    setError("");
    try {
      await onAttendance(course);
    } catch (err) {
      setError(err.message);
    } finally {
      setStartingCourse(null);
    }
  };

  return (
    <main className="dashboard-page">
      <section className="dashboard-container">
        <header className="dashboard-header">
          <div><h1>Smart Attendance</h1><p>Welcome to your dashboard</p></div>
          <div className="student-info">
            <span>Student</span>
            <strong>{data?.student?.name ?? studentName}</strong>
            <small>{data?.student?.studentId ?? studentId}</small>
            {onLogout && (
              <button type="button" className="logout-link" onClick={onLogout}>Log out</button>
            )}
          </div>
        </header>
        {error && <p className="error-message" role="alert">{error}</p>}
        {!data && !error && <p>Loading your classes…</p>}
        {data && <>
          <section className="attendance-summary">
            <div className="summary-card"><span>Overall Attendance</span><strong>{data.summary.overallAttendance}%</strong></div>
            <div className="summary-card"><span>Classes Today</span><strong>{data.summary.classesToday}</strong></div>
            <div className="summary-card"><span>Present Today</span><strong>{data.summary.presentToday}</strong></div>
          </section>
          <section className="classes-section">
            <h2>Today's Classes</h2>
            <div className="class-list">
              {data.classes.map((course) => <article className="class-card" key={course.courseId}>
                <div><h3>{course.name}</h3><p>{course.timeLabel}</p></div>
                <button disabled={!course.canMarkAttendance || startingCourse === course.courseId}
                  onClick={() => startAttendance(course)}>
                  {course.marked ? "Attendance marked" : course.canMarkAttendance
                    ? (startingCourse === course.courseId ? "Starting…" : "Mark Attendance")
                    : "Session not open"}
                </button>
              </article>)}
              {data.classes.length === 0 && <p>No classes scheduled for today.</p>}
            </div>
          </section>
        </>}
      </section>
    </main>
  );
}

export default Dashboard;
