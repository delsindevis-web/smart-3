import { lazy, Suspense, useState } from "react";
import { api } from "./api";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const BleVerification = lazy(() => import("./pages/BleVerification"));
const FaceLiveness = lazy(() => import("./pages/FaceLiveness"));
const StudentQRVerification = lazy(() => import("./pages/StudentQRVerification"));
const AttendanceSuccess = lazy(() => import("./pages/AttendanceSuccess"));
const ProfessorLogin = lazy(() => import("./pages/ProfessorLogin"));
const ProfessorDashboard = lazy(() => import("./pages/ProfessorDashboard"));

function AppContent() {
  const [studentId, setStudentId] = useState("");
  const [selectedClass, setSelectedClass] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [requiredFactors, setRequiredFactors] = useState([]);
  const [currentPage, setCurrentPage] = useState("login");
  const [professorId, setProfessorId] = useState("");
  const [attendanceResult, setAttendanceResult] = useState(null);
  const [flowError, setFlowError] = useState("");

  const handleLogin = (id) => { setStudentId(id); setCurrentPage("dashboard"); };

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

  if (currentPage === "login") return <div>
    <Login onLogin={handleLogin} />
    <div style={{ textAlign: "center", padding: "16px", background: "#080c18" }}>
      <button onClick={() => setCurrentPage("professor-login")} style={{ background: "transparent", color: "#a5a8ff", border: "1px solid #4545a5", borderRadius: "8px", padding: "10px 20px", cursor: "pointer" }}>
        Professor Login
      </button>
    </div>
  </div>;

  if (currentPage === "dashboard") return <Dashboard studentId={studentId} onAttendance={handleAttendance} />;
  if (currentPage === "ble") return <BleVerification className={selectedClass?.name} attemptId={attemptId} beaconId={selectedClass?.beaconId} onVerified={handleBleVerified} />;
  if (currentPage === "face") return <>
    {flowError && <p role="alert" className="error-message">{flowError}</p>}
    <FaceLiveness className={selectedClass?.name} attemptId={attemptId} onVerified={handleFaceVerified} />
  </>;
  if (currentPage === "qr") return <StudentQRVerification className={selectedClass?.name} onVerified={handleQRVerified} />;
  if (currentPage === "success") return <AttendanceSuccess className={selectedClass?.name} studentId={studentId} attendanceResult={attendanceResult} />;
  if (currentPage === "professor-login") return <ProfessorLogin onLogin={(professor) => { setProfessorId(professor.loginId); setCurrentPage("professor-dashboard"); }} />;
  if (currentPage === "professor-dashboard") return <ProfessorDashboard professorId={professorId} onLogout={() => { sessionStorage.removeItem("token"); setProfessorId(""); setCurrentPage("login"); }} />;
  return null;
}

function App() {
  return <Suspense fallback={<main className="page-loading" role="status">Loading page?</main>}><AppContent /></Suspense>;
}

export default App;
