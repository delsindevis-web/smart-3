import "../styles/dashboard.css";

function Dashboard({ studentId, onAttendance }) {
  return (
    <main className="dashboard-page">
      <section className="dashboard-container">

        <header className="dashboard-header">
          <div>
            <h1>Good Morning 👋</h1>
            <p>Welcome to Smart Attendance</p>
          </div>

          <div className="student-info">
            <span>Student</span>
            <strong>{studentId}</strong>
          </div>
        </header>

        <section className="attendance-summary">
          <div className="summary-card">
            <span>Overall Attendance</span>
            <strong>85%</strong>
          </div>

          <div className="summary-card">
            <span>Classes Today</span>
            <strong>4</strong>
          </div>

          <div className="summary-card">
            <span>Present Today</span>
            <strong>0 / 4</strong>
          </div>
        </section>

        <section className="classes-section">
          <h2>Today's Classes</h2>

          <div className="class-list">

            <article className="class-card">
              <div>
                <h3>Computer Networks</h3>
                <p>10:00 AM – 11:00 AM</p>
              </div>

              <button onClick={() => onAttendance("Computer Networks")}>
                    Mark Attendance
              </button>
            </article>

            <article className="class-card">
              <div>
                <h3>Information Retrieval</h3>
                <p>2:00 PM – 3:00 PM</p>
              </div>

              <button onClick={() => onAttendance("Information Retrieval")}>
                Mark Attendance
              </button>
            </article>

          </div>
        </section>

      </section>
    </main>
  );
}

export default Dashboard;


