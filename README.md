<<<<<<< HEAD
# smart-attendance-system
Smart attendance system using BLE proximity and face liveness detection
=======
# Smart Attendance System

A secure and automated attendance system that uses **BLE proximity detection** and **face liveness verification** to verify a student's physical presence before recording attendance.

---

## 📌 Project Overview

Traditional attendance systems can be time-consuming and can allow proxy attendance.

The Smart Attendance System aims to provide a more secure and automated solution by combining:

- BLE proximity detection
- Face liveness verification
- Web-based student interface
- Backend attendance management
- Database storage

The system verifies that the student is physically present in the classroom before marking them as present.

---

## 🎯 Objectives

- Reduce proxy attendance.
- Automate the attendance process.
- Verify the student's physical presence.
- Use BLE to determine classroom proximity.
- Use face liveness detection to prevent photo/video-based spoofing.
- Maintain attendance records digitally.
- Provide a simple student-facing web interface.

---

## 🔄 Attendance Flow

The overall attendance process is:

```text
Student Login
      │
      ▼
Student Dashboard
      │
      │ Select Class
      ▼
BLE Proximity Verification
      │
      │ Proximity Verified
      ▼
Face Liveness Verification
      │
      │ Liveness Verified
      ▼
Backend Attendance Recording
      │
      ▼
Attendance Marked Successfully
>>>>>>> 56b5357c340f9069aebc12276a949457a81ea992
