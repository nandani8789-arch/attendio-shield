# ATTENDIO SHIELD

A full-stack, role-based QR attendance management system inspired by the ATTENDIO SHIELD project brief.

## Features

- Role-based login and dashboards for **Students, Faculty, and HODs**.
- Student attendance history, subject-wise attendance percentages, and student ID display.
- Faculty/HOD QR session generation with a fresh random token; generating a new QR deactivates the previous QR for that class.
- Weekly token expiry check, enrollment validation, duplicate scan prevention, and server-side campus geofence validation.
- Browser camera QR scanning and browser geolocation.
- Faculty/HOD student directory, attendance reports, CSV export, and authorized attendance correction with a note.
- SQLite database persisted in `data/attendio.sqlite`.
- Secure password hashing, session-based authentication, Helmet headers, and API rate limiting.

## Requirements

- Node.js 18 or newer and npm.
- Internet connection on first load for Google Fonts and the browser QR scanner library (the app itself and backend run locally).

## Run locally

1. Extract the ZIP.
2. Open a terminal in the `attendio-shield` folder.
3. Install packages:

   ```bash
   npm install
   ```

4. Copy `.env.example` to `.env` and change `SESSION_SECRET`, campus coordinates, and campus radius to your institution's real settings.
5. Start the server:

   ```bash
   npm start
   ```

6. Visit **http://localhost:3000**.

The SQLite database and demo accounts are created automatically on first start.

## Demo accounts

All demo accounts use password: `Attendio@123`

| Role | Email |
|---|---|
| Student | `student@attendio.demo` |
| Student (second sample) | `student2@attendio.demo` |
| Faculty | `faculty@attendio.demo` |
| HOD | `hod@attendio.demo` |

Sample student records and two Computer Science classes are seeded automatically.

## Test the main workflow

1. Sign in as faculty: `faculty@attendio.demo`.
2. Open **Classes** and generate a QR for Web Technology or Database Management Systems. The generated QR is also downloadable.
3. Sign out and sign in as the student: `student@attendio.demo`.
4. Open **Mark attendance**, start the camera scanner, and scan the faculty QR. Grant camera and location permissions.
5. For a successful test, configure `CAMPUS_LAT`, `CAMPUS_LNG`, and `CAMPUS_RADIUS_METERS` in `.env` to match the test device's actual location, then restart the server.
6. Sign in as faculty or HOD and open **Attendance reports** to review or correct the record.

## Important implementation notes

- **Geofencing:** The server checks the submitted browser GPS coordinates against the configured campus center using a distance calculation. Browser GPS can be inaccurate and can be spoofed on compromised devices; production deployments should add stronger device attestation and anti-spoofing controls. The sample campus coordinates are placeholders and must be replaced.
- **HTTPS:** Camera and geolocation are restricted by browsers to secure contexts. `localhost` is accepted for development. Deploy behind HTTPS for real devices.
- **Weekly QR:** Tokens are tied to the server's current ISO-style week key and expire on week change. A faculty member can rotate a class token by generating a new QR. For production, add a scheduled weekly rotation and configurable class time windows.
- **Late status:** The included late rule marks a scan as Late when it occurs at least `ATTENDANCE_LATE_AFTER_MINUTES` minutes after the QR session was generated. Faculty should generate the QR at the class start time. A production timetable should store each class's scheduled start time and calculate lateness relative to it.
- **Biometrics:** This version uses institutional email/password authentication. Native fingerprint/Face ID authentication is device- and browser-dependent and requires a production passkey/WebAuthn registration and verification flow; it is not represented as enabled here.
- **Notifications / red-zone alerts:** The PDF describes alerts to faculty and parents. This project provides the attendance data and reporting foundation, but SMS/email delivery and parent contact management require an SMS/email provider and institution-approved contact data; they are not falsely simulated.
- **Privacy:** Use real student data only after institution approval. Add retention rules, audit logs, consent notices, backups, and access reviews before production use.

## Project structure

```text
attendio-shield/
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── src/
│   ├── db.js
│   └── server.js
├── data/                 # created automatically; SQLite database
├── .env.example
├── package.json
└── README.md
```
