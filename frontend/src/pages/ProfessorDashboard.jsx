import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import "../styles/professor-dashboard.css";

// ============================================
// SAMPLE CLASS DATA
// ============================================

const classes = [
  {
    name: "Computer Networks",
    code: "CS301",
    time: "10:00 AM – 11:00 AM",
    room: "Room 201",
    students: 60,
  },
  {
    name: "Information Retrieval",
    code: "CS402",
    time: "2:00 PM – 3:00 PM",
    room: "Room 105",
    students: 55,
  },
  {
    name: "Data Structures",
    code: "CS202",
    time: "3:00 PM – 4:00 PM",
    room: "Lab 2",
    students: 62,
  },
];

// ============================================
// DASHBOARD NAVIGATION
// ============================================

const navigation = [
  { name: "Overview", icon: "⌂" },
  { name: "My Classes", icon: "▤" },
  { name: "Live Attendance", icon: "◉" },
  { name: "Attendance Records", icon: "▦" },
  { name: "Reports", icon: "▥" },
  { name: "Settings", icon: "⚙" },
];

// ============================================
// QR CONFIGURATION
// ============================================

const QR_VALIDITY_SECONDS = 30;

// ============================================
// TOKEN GENERATION
// ============================================

function createSessionToken() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  // Fallback for development environments.
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

// ============================================
// QR PAYLOAD GENERATION
// ============================================

function createQrDetails() {
  const issuedAt = new Date();

  const expiresAt = new Date(
    issuedAt.getTime() + QR_VALIDITY_SECONDS * 1000
  );

  return {
    token: createSessionToken(),
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

// ============================================
// MAIN PROFESSOR DASHBOARD
// ============================================

function ProfessorDashboard({ professorId, onLogout }) {
  // Navigation
  const [activeTab, setActiveTab] = useState("Overview");

  // Class selection
  const [selectedClass, setSelectedClass] = useState(classes[0]);

  // Attendance session
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState("");

  // Dynamic QR state
  const [sessionToken, setSessionToken] = useState("");
  const [qrIssuedAt, setQrIssuedAt] = useState("");
  const [qrExpiresAt, setQrExpiresAt] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(
    QR_VALIDITY_SECONDS
  );

  // Session duration
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Demo attendance records
  const [demoAttendance, setDemoAttendance] = useState([]);

  // ============================================
  // CURRENT DATE
  // ============================================

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ============================================
  // DYNAMIC QR ROTATION
  // ============================================

  useEffect(() => {
    if (!sessionActive) {
      return undefined;
    }

    // Generate a fresh QR token and timestamps.
    const refreshQr = () => {
      const qr = createQrDetails();

      setSessionToken(qr.token);
      setQrIssuedAt(qr.issuedAt);
      setQrExpiresAt(qr.expiresAt);
      setSecondsLeft(QR_VALIDITY_SECONDS);
    };

    // Generate a QR immediately.
    refreshQr();

    // Rotate QR every five seconds.
    const rotationInterval = setInterval(() => {
      refreshQr();
    }, QR_VALIDITY_SECONDS * 1000);

    // Update countdown.
    const countdownInterval = setInterval(() => {
      setSecondsLeft((previous) =>
        previous <= 1
          ? QR_VALIDITY_SECONDS
          : previous - 1
      );
    }, 1000);

    // Track session duration.
    const elapsedInterval = setInterval(() => {
      setElapsedSeconds((previous) => previous + 1);
    }, 1000);

    // Cleanup timers when the session ends
    // or the component unmounts.
    return () => {
      clearInterval(rotationInterval);
      clearInterval(countdownInterval);
      clearInterval(elapsedInterval);
    };
  }, [sessionActive]);

  // ============================================
  // START ATTENDANCE SESSION
  // ============================================

  const startSession = () => {
    if (sessionActive) {
      return;
    }

    const newSessionId = createSessionToken();

    const qr = createQrDetails();

    setSessionId(newSessionId);

    setDemoAttendance([]);

    setElapsedSeconds(0);

    setSessionToken(qr.token);
    setQrIssuedAt(qr.issuedAt);
    setQrExpiresAt(qr.expiresAt);

    setSecondsLeft(QR_VALIDITY_SECONDS);

    setSessionActive(true);

    setActiveTab("Live Attendance");
  };

  // ============================================
  // STOP ATTENDANCE SESSION
  // ============================================

  const stopSession = () => {
    setSessionActive(false);

    setSessionToken("");
    setSessionId("");

    setQrIssuedAt("");
    setQrExpiresAt("");

    setSecondsLeft(QR_VALIDITY_SECONDS);
  };

  // ============================================
  // OPEN A CLASS
  // ============================================

  const openClass = (classItem) => {
    if (sessionActive && selectedClass.code !== classItem.code) {
      window.alert(
        "Please end the current attendance session before switching classes."
      );

      return;
    }

    setSelectedClass(classItem);

    setActiveTab("Live Attendance");
  };

  // ============================================
  // FORMAT SESSION DURATION
  // ============================================

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);

    const minutes = Math.floor((seconds % 3600) / 60);

    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, "0")}:${String(
        minutes
      ).padStart(2, "0")}:${String(
        remainingSeconds
      ).padStart(2, "0")}`;
    }

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  // ============================================
  // ATTENDANCE STATISTICS
  // ============================================

  const presentCount = demoAttendance.filter(
    (student) => student.status === "Present"
  ).length;

  const attendancePercentage =
    selectedClass.students > 0
      ? Math.round(
          (presentCount / selectedClass.students) * 100
        )
      : 0;

  // ============================================
  // SIMULATE ATTENDANCE FOR FRONTEND TESTING
  // ============================================

  const addDemoAttendance = () => {
    if (!sessionActive) {
      return;
    }

    if (presentCount >= selectedClass.students) {
      window.alert(
        "All enrolled students have already been marked present in this demo."
      );

      return;
    }

    const nextNumber = demoAttendance.length + 1;

    const demoStudent = {
      id: `DEMO${Date.now()}`,
      name: `Demo Student ${nextNumber}`,
      status: "Present",
      time: new Date().toLocaleTimeString("en-IN"),
      classCode: selectedClass.code,
      sessionId,
    };

    setDemoAttendance((previous) => [
      ...previous,
      demoStudent,
    ]);
  };

  // ============================================
  // MAIN UI
  // ============================================

  return (
    <div className="professor-layout">

      {/* ========================================
          SIDEBAR
      ======================================== */}

      <aside className="professor-sidebar">

        <div className="professor-brand">
          <div className="brand-icon">S</div>

          <div>
            <h2>Smart Attendance</h2>
            <p>Professor Portal</p>
          </div>
        </div>

        <div className="sidebar-label">
          WORKSPACE
        </div>

        <nav className="professor-navigation">
          {navigation.map((item) => (
            <button
              key={item.name}
              type="button"
              className={
                activeTab === item.name
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() => setActiveTab(item.name)}
            >
              <span className="nav-icon">
                {item.icon}
              </span>

              {item.name}
            </button>
          ))}
        </nav>

        {/* Professor profile and logout */}

        <div className="sidebar-bottom">

          <div className="sidebar-profile">

            <div className="profile-avatar">
              P
            </div>

            <div>
              <strong>
                {professorId || "Professor"}
              </strong>

              <span>Professor</span>
            </div>

          </div>

          <button
            type="button"
            className="logout-button"
            onClick={onLogout}
          >
            ↪ Logout
          </button>

        </div>

      </aside>

      {/* ========================================
          MAIN CONTENT
      ======================================== */}

      <main className="professor-main">

        {/* HEADER */}

        <header className="professor-topbar">

          <div>
            <p className="breadcrumb">
              Workspace / {activeTab}
            </p>

            <h1>{activeTab}</h1>
          </div>

          <div className="topbar-right">

            <span className="system-status">
              <span className="status-dot" />
              System Online
            </span>

            <div className="topbar-avatar">
              P
            </div>

          </div>

        </header>

        {/* ========================================
            OVERVIEW
        ======================================== */}

        {activeTab === "Overview" && (
          <>

            {/* Welcome banner */}

            <section className="welcome-banner">

              <div>

                <p className="welcome-eyebrow">
                  PROFESSOR WORKSPACE
                </p>

                <h2>
                  Good morning, Professor 👋
                </h2>

                <p>
                  Manage your classes and monitor attendance
                  from one place.
                </p>

                <span className="welcome-date">
                  {today}
                </span>

              </div>

              <div className="welcome-illustration">
                📚
              </div>

            </section>

            {/* Statistics */}

            <section className="stats-grid">

              <article className="stat-card">

                <div className="stat-heading">
                  Classes Today <span>▤</span>
                </div>

                <strong>{classes.length}</strong>

                <p>Your scheduled classes</p>

              </article>

              <article className="stat-card">

                <div className="stat-heading">
                  Students Present <span>♙</span>
                </div>

                <strong>{presentCount}</strong>

                <p>Recorded in this demo</p>

              </article>

              <article className="stat-card">

                <div className="stat-heading">
                  Attendance Rate <span>◔</span>
                </div>

                <strong>
                  {demoAttendance.length > 0
                    ? `${attendancePercentage}%`
                    : "—"}
                </strong>

                <p>Current demo session</p>

              </article>

              <article className="stat-card">

                <div className="stat-heading">
                  Active Sessions <span>◉</span>
                </div>

                <strong>
                  {sessionActive ? 1 : 0}
                </strong>

                <p>
                  {sessionActive
                    ? "Attendance in progress"
                    : "No active sessions"}
                </p>

              </article>

            </section>

            {/* Today's schedule */}

            <section className="schedule-panel">

              <div className="section-heading">

                <div>
                  <h2>Today's Schedule</h2>

                  <p>
                    Your scheduled classes at a glance.
                  </p>
                </div>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setActiveTab("My Classes")}
                >
                  View all classes →
                </button>

              </div>

              <div className="schedule-list">

                {classes.map((item) => (

                  <article
                    className="schedule-card"
                    key={item.code}
                  >

                    <div className="class-icon">
                      ▤
                    </div>

                    <div className="class-details">

                      <h3>{item.name}</h3>

                      <p>
                        {item.code} · {item.room}
                      </p>

                      <span>{item.time}</span>

                    </div>

                    <span className="class-status">
                      {sessionActive &&
                      selectedClass.code === item.code
                        ? "Live"
                        : "Upcoming"}
                    </span>

                    <button
                      type="button"
                      className="start-button"
                      onClick={() => openClass(item)}
                    >
                      View Class
                    </button>

                  </article>

                ))}

              </div>

            </section>

            {/* Quick actions */}

            <section className="quick-actions-panel">

              <div className="section-heading">
                <div>
                  <h2>Quick Actions</h2>

                  <p>
                    Frequently used professor tools.
                  </p>
                </div>
              </div>

              <div className="quick-actions-grid">

                <button
                  type="button"
                  className="quick-action"
                  onClick={() => {
                    if (sessionActive) {
                      setActiveTab("Live Attendance");
                    } else {
                      setSelectedClass(classes[0]);
                      setActiveTab("Live Attendance");
                    }
                  }}
                >

                  <span>＋</span>

                  <div>
                    <strong>Start Attendance</strong>

                    <p>
                      Choose a class to begin.
                    </p>
                  </div>

                  <b>→</b>

                </button>

                <button
                  type="button"
                  className="quick-action"
                  onClick={() =>
                    setActiveTab("Attendance Records")
                  }
                >

                  <span>▦</span>

                  <div>
                    <strong>Attendance Records</strong>

                    <p>
                      Review recorded attendance.
                    </p>
                  </div>

                  <b>→</b>

                </button>

                <button
                  type="button"
                  className="quick-action"
                  onClick={() => setActiveTab("Reports")}
                >

                  <span>▥</span>

                  <div>
                    <strong>View Reports</strong>

                    <p>
                      Explore attendance reports.
                    </p>
                  </div>

                  <b>→</b>

                </button>

              </div>

            </section>

          </>
        )}

        {/* ========================================
            MY CLASSES
        ======================================== */}

        {activeTab === "My Classes" && (

          <section className="classes-page">

            <div className="section-heading">

              <div>
                <h2>Your Classes</h2>

                <p>
                  View your assigned courses and manage
                  attendance.
                </p>
              </div>

            </div>

            <div className="classes-grid">

              {classes.map((item) => (

                <article
                  className="course-card"
                  key={item.code}
                >

                  <div className="course-card-top">

                    <div className="class-icon">
                      ▤
                    </div>

                    <span className="class-status">
                      {sessionActive &&
                      selectedClass.code === item.code
                        ? "Live"
                        : "Upcoming"}
                    </span>

                  </div>

                  <h2>{item.name}</h2>

                  <p className="course-code">
                    {item.code}
                  </p>

                  <div className="course-meta">

                    <p>◷ {item.time}</p>

                    <p>⌂ {item.room}</p>

                    <p>
                      ♙ {item.students} enrolled students
                    </p>

                  </div>

                  <button
                    type="button"
                    className="start-button full-width"
                    onClick={() => openClass(item)}
                  >
                    View Class →
                  </button>

                </article>

              ))}

            </div>

          </section>

        )}

        {/* ========================================
            LIVE ATTENDANCE
        ======================================== */}

        {activeTab === "Live Attendance" && (

          <section className="live-attendance-page">

            {/* Session heading */}

            <div className="live-page-intro">

              <div>

                <h2>Live Attendance Session</h2>

                <p>
                  Start a session and manage student
                  attendance securely.
                </p>

              </div>

              <span
                className={
                  sessionActive
                    ? "session-badge session-live"
                    : "session-badge session-idle"
                }
              >

                <span className="status-dot" />

                {sessionActive
                  ? "Session Live"
                  : "Session Inactive"}

              </span>

            </div>

            {/* Class selector and controls */}

            <div className="session-controls">

              <div className="session-class-selector">

                <label htmlFor="attendance-class">
                  Select Class
                </label>

                <select
                  id="attendance-class"
                  value={selectedClass.code}
                  disabled={sessionActive}
                  onChange={(event) => {

                    const nextClass = classes.find(
                      (item) =>
                        item.code === event.target.value
                    );

                    if (nextClass) {
                      setSelectedClass(nextClass);
                      setDemoAttendance([]);
                    }

                  }}
                >

                  {classes.map((item) => (

                    <option
                      key={item.code}
                      value={item.code}
                    >
                      {item.name} ({item.code})
                    </option>

                  ))}

                </select>

              </div>

              <div className="session-control-actions">

                {!sessionActive ? (

                  <button
                    type="button"
                    className="start-button"
                    onClick={startSession}
                  >
                    ▶ Start Attendance
                  </button>

                ) : (

                  <button
                    type="button"
                    className="stop-session-button"
                    onClick={stopSession}
                  >
                    ■ End Session
                  </button>

                )}

              </div>

            </div>

            {/* QR and session information */}

            <div className="live-session-grid">

              {/* DYNAMIC QR CARD */}

              <article className="live-session-card qr-session-card">

                <div className="live-card-heading">

                  <div>

                    <h3>Dynamic QR Code</h3>

                    <p>
                      Rotates automatically every 5 seconds.
                    </p>

                  </div>

                  <span className="qr-icon">
                    ▦
                  </span>

                </div>

                {sessionActive ? (

                  <>

                    <div className="qr-code-container">

                      <QRCodeSVG
                        value={JSON.stringify({
                          type: "attendance-session",
                          sessionId,
                          classCode: selectedClass.code,
                          professorId,
                          token: sessionToken,
                          issuedAt: qrIssuedAt,
                          expiresAt: qrExpiresAt,
                        })}
                        size={210}
                        level="H"
                        includeMargin
                      />

                    </div>

                    {/* Countdown */}

                    <div className="qr-countdown">

                      <div className="countdown-label">

                        <span>Next QR refresh</span>

                        <strong>
                          {secondsLeft}s
                        </strong>

                      </div>

                      <div className="countdown-track">

                        <div
                          className="countdown-progress"
                          style={{
                            width: `${
                              (secondsLeft /
                                QR_VALIDITY_SECONDS) *
                              100
                            }%`,
                          }}
                        />

                      </div>

                    </div>

                    <p className="qr-security-note">
                      Demo QR token: {sessionToken.slice(0, 12)}…
                    </p>

                    <p className="qr-security-note">
                      Session ID: {sessionId}
                    </p>

                  </>

                ) : (

                  <div className="qr-inactive">

                    <div className="qr-placeholder">
                      ▦
                    </div>

                    <h3>QR code not generated</h3>

                    <p>
                      Start an attendance session to generate
                      the rotating QR code.
                    </p>

                  </div>

                )}

              </article>

              {/* SESSION INFORMATION */}

              <article className="live-session-card">

                <div className="live-card-heading">

                  <div>

                    <h3>Session Information</h3>

                    <p>
                      Current attendance session details.
                    </p>

                  </div>

                </div>

                <div className="session-info-list">

                  <div>
                    <span>Course</span>

                    <strong>
                      {selectedClass.name}
                    </strong>
                  </div>

                  <div>
                    <span>Course Code</span>

                    <strong>
                      {selectedClass.code}
                    </strong>
                  </div>

                  <div>
                    <span>Classroom</span>

                    <strong>
                      {selectedClass.room}
                    </strong>
                  </div>

                  <div>
                    <span>Enrolled Students</span>

                    <strong>
                      {selectedClass.students}
                    </strong>
                  </div>

                  <div>
                    <span>Session Duration</span>

                    <strong>
                      {formatDuration(elapsedSeconds)}
                    </strong>
                  </div>

                  <div>
                    <span>Verification</span>

                    <strong>
                      BLE + Face Liveness
                    </strong>
                  </div>

                </div>

                {/* Verification workflow */}

                <div className="verification-flow">

                  <h4>Verification Process</h4>

                  <div className="verification-step">

                    <span>1</span>

                    <div>

                      <strong>BLE Proximity</strong>

                      <p>
                        Confirm the student is near the
                        classroom beacon.
                      </p>

                    </div>

                  </div>

                  <div className="verification-step">

                    <span>2</span>

                    <div>

                      <strong>Face Liveness</strong>

                      <p>
                        Verify the student's live presence.
                      </p>

                    </div>

                  </div>

                  <div className="verification-step">

                    <span>3</span>

                    <div>

                      <strong>Attendance Recording</strong>

                      <p>
                        Record attendance after successful
                        verification.
                      </p>

                    </div>

                  </div>

                </div>

              </article>

            </div>

            {/* LIVE ATTENDANCE ROSTER */}

            <article className="live-session-card roster-card">

              <div className="section-heading">

                <div>

                  <h2>Live Attendance Roster</h2>

                  <p>
                    Monitor attendance recorded during
                    this demo session.
                  </p>

                </div>

                <span className="roster-count">
                  {presentCount} / {selectedClass.students} Present
                </span>

              </div>

              {demoAttendance.length === 0 ? (

                <div className="empty-roster">

                  <div>♙</div>

                  <h3>No attendance recorded yet</h3>

                  <p>
                    Student records will appear here after
                    successful verification and backend
                    integration.
                  </p>

                </div>

              ) : (

                <div className="roster-table-wrapper">

                  <table className="roster-table">

                    <thead>

                      <tr>
                        <th>Student</th>
                        <th>Student ID</th>
                        <th>Time</th>
                        <th>Status</th>
                      </tr>

                    </thead>

                    <tbody>

                      {demoAttendance.map((student) => (

                        <tr key={student.id}>

                          <td>{student.name}</td>

                          <td>{student.id}</td>

                          <td>{student.time}</td>

                          <td>

                            <span className="present-status">
                              Present
                            </span>

                          </td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

              )}

              {/* Demo-only control */}

              {sessionActive && (

                <div className="demo-controls">

                  <p>
                    Development preview only — this button
                    simulates a recorded student.
                  </p>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={addDemoAttendance}
                  >
                    + Add Demo Attendance
                  </button>

                </div>

              )}

            </article>

          </section>

        )}

        {/* ========================================
            ATTENDANCE RECORDS
        ======================================== */}

        {activeTab === "Attendance Records" && (

          <section className="placeholder-panel">

            <div className="placeholder-icon">
              ▦
            </div>

            <h2>Attendance Records</h2>

            <p>
              Historical attendance records will be displayed
              here after backend integration.
            </p>

            <button
              type="button"
              className="secondary-button"
              onClick={() => setActiveTab("Live Attendance")}
            >
              Open Live Attendance →
            </button>

          </section>

        )}

        {/* ========================================
            REPORTS
        ======================================== */}

        {activeTab === "Reports" && (

          <section className="placeholder-panel">

            <div className="placeholder-icon">
              ▥
            </div>

            <h2>Attendance Reports</h2>

            <p>
              Attendance summaries, class-wise statistics,
              and downloadable reports will be implemented
              after backend integration.
            </p>

            <button
              type="button"
              className="secondary-button"
              onClick={() => setActiveTab("Attendance Records")}
            >
              View Attendance Records →
            </button>

          </section>

        )}

        {/* ========================================
            SETTINGS
        ======================================== */}

        {activeTab === "Settings" && (

          <section className="placeholder-panel">

            <div className="placeholder-icon">
              ⚙
            </div>

            <h2>Settings</h2>

            <p>
              Professor profile, account preferences, and
              session settings will be available here.
            </p>

            <button
              type="button"
              className="secondary-button"
              onClick={onLogout}
            >
              Logout
            </button>

          </section>

        )}

        {/* FOOTER */}

        <footer className="professor-footer">
          Smart Attendance System · IIIT Dharwad
        </footer>

      </main>

    </div>
  );
}

export default ProfessorDashboard;

