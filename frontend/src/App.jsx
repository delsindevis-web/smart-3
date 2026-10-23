import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { api, AUTH_EXPIRED_EVENT, fetchCurrentUser, hasToken, logout } from "./api";

const AuthPage = lazy(() => import("./pages/AuthPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const BleVerification = lazy(() => import("./pages/BleVerification"));
const FaceLiveness = lazy(() => import("./pages/FaceLiveness"));
const StudentQRVerification = lazy(() => import("./pages/StudentQRVerification"));
const AttendanceSuccess = lazy(() => import("./pages/AttendanceSuccess"));
const ProfessorDashboard = lazy(() => import("./pages/ProfessorDashboard"));

const STUDENT_PAGES = new Set(["dashboard", "ble", "face", "qr", "success"]);
const TEACHER_PAGES = new Set(["professor-dashboard"]);

function dashboardFor(role) {
  return role === "teacher" ? "professor-dashboard" : "dashboard";
}

function allowedPage(role, page) {
  if (role === "teacher") return TEACHER_PAGES.has(page) ? page : dashboardFor(role);
  if (role === "student") return STUDENT_PAGES.has(page) ? page : dashboardFor(role);
  return "login";
}

function AppContent() {
  const [authReady, setAuthReady] = useState(!hasToken());
  const [user, setUser] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [requiredFactors, setRequiredFactors] = useState([]);
  const [currentPage, setCurrentPage] = useState("login");
  const [attendanceResult, setAttendanceResult] = useState(null);
  const [flowError, setFlowError] = useState("");

  const resetAttendanceFlow = () => {
    setSelectedClass(null);
    setAttemptId(null);
    setRequiredFactors([]);
    setAttendanceResult(null);
    setFlowError("");
  };

  const handleLogout = useCallback(() => {
    logout();
    setUser(null);
    resetAttendanceFlow();
    setCurrentPage("login");
  }, []);

  const handleAuthenticated = (authenticatedUser) => {
    setUser(authenticatedUser);
    setCurrentPage(dashboardFor(authenticatedUser.role));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!hasToken()) {
        setAuthReady(true);
        return;
      }
      const current = await fetchCurrentUser();
      if (cancelled) return;
      if (current) {
        setUser(current);
        setCurrentPage((page) => allowedPage(current.role, page === "login" ? dashboardFor(current.role) : page));
      } else {
        setCurrentPage("login");
      }
      setAuthReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onExpired = () => handleLogout();
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [handleLogout]);

  const handleAttendance = async (course) => {
    const result = await api("/api/attendance/attempts", {
      method: "POST", body: { courseId: course.courseId },
    });
    setSelectedClass(course);
    setAttemptId(result.attemptId);
    setRequiredFactors(result.requiredFactors);
    setAttendanceResult(null);
    setFlowError("");
    setCurrentPage("ble");
  };

  const handleBleVerified = () => setCurrentPage("face");

  const finishAttendance = async () => {
    const result = await api(`/api/attendance/attempts/${attemptId}/complete`, { method: "POST" });
    setAttendanceResult(result);
    setCurrentPage("success");
  };

  const handleFaceVerified = async () => {
    if (requiredFactors.includes("qr")) setCurrentPage("qr");
    else await finishAttendance();
  };

  const handleQRVerified = async (qrData) => {
    try {
      await api(`/api/attendance/attempts/${attemptId}/qr`, {
        method: "POST", body: { token: qrData.token },
      });
      await finishAttendance();
    } catch (err) {
      setFlowError(err.message);
      setCurrentPage("face");
    }
  };

  if (!authReady) {
    return <main className="page-loading" role="status">Restoring session…</main>;
  }

  if (!user) {
    return <AuthPage onAuthenticated={handleAuthenticated} />;
  }

  const page = allowedPage(user.role, currentPage);

  if (user.role === "teacher") {
    return (
      <ProfessorDashboard
        professorId={user.loginId}
        onLogout={handleLogout}
      />
    );
  }

  if (page === "dashboard") {
    return (
      <Dashboard
        studentId={user.loginId}
        studentName={user.name}
        onAttendance={handleAttendance}
        onLogout={handleLogout}
      />
    );
  }
  if (page === "ble") {
    return (
      <BleVerification
        className={selectedClass?.name}
        attemptId={attemptId}
        beaconId={selectedClass?.beaconId}
        onVerified={handleBleVerified}
      />
    );
  }
  if (page === "face") {
    return (
      <>
        {flowError && <p role="alert" className="error-message">{flowError}</p>}
        <FaceLiveness className={selectedClass?.name} attemptId={attemptId} onVerified={handleFaceVerified} />
      </>
    );
  }
  if (page === "qr") {
    return <StudentQRVerification className={selectedClass?.name} onVerified={handleQRVerified} />;
  }
  if (page === "success") {
    return (
      <AttendanceSuccess
        className={selectedClass?.name}
        studentId={user.loginId}
        attendanceResult={attendanceResult}
      />
    );
  }
  return null;
}

function App() {
  return <Suspense fallback={<main className="page-loading" role="status">Loading page?</main>}><AppContent /></Suspense>;
}

export default App;
