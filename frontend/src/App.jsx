import { useState, useCallback } from "react";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import BleVerification from "./pages/BleVerification";
import FaceLiveness from "./pages/FaceLiveness";
import StudentQRVerification from "./pages/StudentQRVerification";
import AttendanceSuccess from "./pages/AttendanceSuccess";

import ProfessorLogin from "./pages/ProfessorLogin";
import ProfessorDashboard from "./pages/ProfessorDashboard";

function App() {
  const [studentId, setStudentId] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [currentPage, setCurrentPage] = useState("login");

  const [professorId, setProfessorId] = useState("");

  const [verifiedQR, setVerifiedQR] = useState(null);

  // ==========================================
  // STUDENT FLOW
  // ==========================================

  const handleLogin = (id) => {
    setStudentId(id);
    setCurrentPage("dashboard");
  };

  const handleAttendance = (className) => {
    setSelectedClass(className);
    setVerifiedQR(null);
    setCurrentPage("ble");
  };

  // BLE verified -> Face verification
  const handleBleVerified = () => {
    setCurrentPage("face");
  };

  // Face verified -> QR verification
  const handleFaceVerified = () => {
    setCurrentPage("qr");
  };

  // QR verified -> Success
  const handleQRVerified = useCallback((qrData) => {
    setVerifiedQR(qrData);
    setCurrentPage("success");
  }, []);

  // ==========================================
  // PROFESSOR FLOW
  // ==========================================

  const handleProfessorLogin = (professor) => {
    setProfessorId(professor.professorId);
    setCurrentPage("professor-dashboard");
  };

  // ==========================================
  // STUDENT LOGIN
  // ==========================================

  if (currentPage === "login") {
    return (
      <div>
        <Login onLogin={handleLogin} />

        <div
          style={{
            textAlign: "center",
            padding: "16px",
            background: "#080c18",
          }}
        >
          <button
            onClick={() => setCurrentPage("professor-login")}
            style={{
              background: "transparent",
              color: "#a5a8ff",
              border: "1px solid #4545a5",
              borderRadius: "8px",
              padding: "10px 20px",
              cursor: "pointer",
            }}
          >
            Professor Login →
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // STUDENT DASHBOARD
  // ==========================================

  if (currentPage === "dashboard") {
    return (
      <Dashboard
        studentId={studentId}
        onAttendance={handleAttendance}
      />
    );
  }

  // ==========================================
  // BLE VERIFICATION
  // ==========================================

  if (currentPage === "ble") {
    return (
      <BleVerification
        className={selectedClass}
        onVerified={handleBleVerified}
      />
    );
  }

  // ==========================================
  // FACE VERIFICATION
  // ==========================================

  if (currentPage === "face") {
    return (
      <FaceLiveness
        className={selectedClass}
        onVerified={handleFaceVerified}
      />
    );
  }

  // ==========================================
  // DYNAMIC QR VERIFICATION
  // ==========================================

  if (currentPage === "qr") {
    return (
      <StudentQRVerification
        className={selectedClass}
        onVerified={handleQRVerified}
      />
    );
  }

  // ==========================================
  // ATTENDANCE SUCCESS
  // ==========================================

  if (currentPage === "success") {
    return (
      <AttendanceSuccess
        className={selectedClass}
        studentId={studentId}
        verifiedQR={verifiedQR}
      />
    );
  }

  // ==========================================
  // PROFESSOR LOGIN
  // ==========================================

  if (currentPage === "professor-login") {
    return (
      <ProfessorLogin
        onLogin={handleProfessorLogin}
      />
    );
  }

  // ==========================================
  // PROFESSOR DASHBOARD
  // ==========================================

  if (currentPage === "professor-dashboard") {
    return (
      <ProfessorDashboard
        professorId={professorId}
        onLogout={() => {
          setProfessorId("");
          setCurrentPage("login");
        }}
      />
    );
  }

  return null;
}

export default App;

