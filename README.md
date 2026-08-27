# 🎓 QR-Based Secure Attendance System

![Status](https://img.shields.io/badge/Status-Production%20Ready-success)
![Security](https://img.shields.io/badge/Security-OTP%20%2B%20Device%20Fingerprint-blue)
![Tech](https://img.shields.io/badge/Stack-MERN%20%2B%20Google%20Sheets-orange)
![Queue](https://img.shields.io/badge/Concurrency-Batch%20Write%20Queue-purple)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/2024ucp1505/QR-Based-Attendance-system)

A full-stack, secure, and proxy-resistant classroom attendance tracking system. By combining real-time QR code generation, server-side cryptographic geofencing, and client-hardware device fingerprinting, this system prevents the most common attendance fraud vectors — coordinate spoofing, scanning from home, or signing in for a classmate.

---

## 🌐 Live Deployment

| Component | Status | URL |
|-----------|--------|-----|
| **Frontend (App)** | 🟢 Online | **[Launch Application](https://qr-based-attendance-system-zeta.vercel.app/)** |
| **Backend (API)** | 🟢 Online | [Check Health Status](https://qr-based-attendance-system-bi3d.onrender.com/api/health) |

---

## 🛡️ Three-Layer Security Model

This isn't just a QR scanner — it's a **fortress against proxy attendance**, implementing a *Trust but Verify* model with three independent enforcement layers that must all pass before a single attendance record is written.

### Layer 1 — 🔐 OTP-Based Identity & Domain Verification
- Login requires a **6-digit OTP** (900,000-key space) delivered via transactional email (Resend API), expiring in **5 minutes**.
- **Students** are locked to `@mnit.ac.in` — no external email domain is accepted at the route level.
- **Faculty** OTP grants a **JWT valid for 7 days** on success; only the session creator can close or export their own session.

### Layer 2 — 📍 Geofencing & GPS Validation (Two-Phase)
- Student GPS is captured via `navigator.geolocation` with `enableHighAccuracy: true`, forcing GPS over network triangulation.
- **Phase 1 — Bounding Box Pre-check (O(1))**: Before any expensive math, 4 comparisons reject obviously out-of-range coordinates instantly (no trig).
- **Phase 2 — Haversine Formula** (via `geolib`): Only runs when Phase 1 passes. Calculates the precise geodesic distance between the faculty's anchor point and the student's device.
- Default geofence: **50 meters**, configurable per-session or via `DEFAULT_RADIUS_METERS` env variable.
- The exact calculated distance is **persisted to Google Sheets** as an audit trail — you can see how close every student was at scan time.

### Layer 3 — 📱 Device Fingerprinting ("One Device, One Student")
- `getDeviceId()` in `client/src/utils/helpers.js` checks `localStorage` for a `qr_attendance_device_id` key. If absent, generates a new `dev_` + base-36 string and persists it.
- The server performs an **OR logic check** before any write:
  ```
  row.studentId === input.studentId  ||  row.deviceId === input.deviceId
  ```
- Full logic matrix:

  | Scenario | studentId | deviceId | Result |
  |----------|-----------|----------|--------|
  | Same student, same device | Duplicate | Duplicate | ❌ Blocked |
  | Different student, same device (proxy attempt) | New | Duplicate | ❌ Blocked |
  | Same student, different device | Duplicate | New | ❌ Blocked |
  | Different student, different device | New | New | ✅ Allowed |

### Layer 4 — 🚫 Session Ownership & Rate Safety
- **Role-Based Access**: Faculty dashboard is completely separated from Student view.
- **Secure Exports**: Only the faculty member who *created* the session can download the CSV report.
- **Batch-Write Queue**: Incoming attendance writes are intercepted by an in-memory queue that flushes **10 records every 10 seconds** (= exactly **60 writes/minute**), matching the Google Sheets API rate limit. Students get an **HTTP 202 Accepted** immediately — no waiting for the DB write.

---

## 🔄 System Architecture & Attendance Verification Flow

### User Journey

```mermaid
graph TD
    A[User Visits App] --> B{Role Selection}

    %% Faculty Flow
    B -->|Faculty| C[Login via Email OTP]
    C --> D[Receive 6-Digit OTP — 5 min expiry]
    D --> E[Verify & Access Dashboard]
    E --> F[Create Session & Generate QR]
    F --> G[Monitor Real-time Attendance via polling]
    G --> H[Export CSV / Close Session]

    %% Student Flow
    B -->|Student| I[Login via @mnit.ac.in Email]
    I --> J[Receive OTP — domain validated]
    J --> K[Verify & Unlock Scanner]
    K --> L[Scan Classroom QR Code]
    L --> M{3-Layer Security Checks}

    %% Security Validation
    M -->|Check 1| N[Validate GPS — Bbox + Haversine]
    M -->|Check 2| O[Check Device Fingerprint OR studentId]
    M -->|Check 3| P[Session Active Check]

    %% Result
    N & O & P -->|All Pass| Q[✅ Attendance Queued — HTTP 202]
    Q --> R[Queue flush writes to Google Sheets]
    N & O & P -->|Any Fail| S[❌ Request Denied — HTTP 400]
```

### Attendance Validation Pipeline (Server-Side Sequence)

```
Student Scan
     │
     ▼
Is Session Active? ──────────────► [No]  ──► Block: Session Inactive
     │ [Yes]
     ▼
Duplicate Check ─────────────────► [Yes] ──► Block: Duplicate Student or Device
     │ [No]  (OR logic: studentId || deviceId)
     ▼
Bounding Box Pre-check (O(1)) ───► [Fail] ─► Block: Outside Allowed Area (fast path)
     │ [Pass]
     ▼
Haversine Distance Calculation ──► [Fail] ─► Block: Out of Geofence Range
     │ [Pass]
     ▼
Enqueue Attendance Record ───────────────────► HTTP 202 Accepted (instant response)
     │
     ▼ (every 10 s, max 60/min)
Flush to Google Sheets ──────────────────────► Record Persisted ✅
```

---

## 📦 Tech Stack

### Frontend
- **React 19 + Vite 7**: Blazing fast UI with sub-second HMR.
- **HTML5-QRCode**: Reliable in-browser camera access at 10 FPS.
- **React Router v7**: Client-side routing with role-based guards.
- **CSS3 Variables**: Modern, responsive design without heavy frameworks.

### Backend
- **Node.js + Express**: Robust REST API with 5 endpoints.
- **JWT (JSON Web Tokens)**: Stateless, 7-day authentication tokens.
- **Resend**: Transactional email delivery infrastructure for OTPs.
- **Google Sheets API**: NoSQL-like spreadsheet database with storage abstraction layer (swappable with MongoDB in Phase 2).
- **geolib**: Haversine-based geodesic distance calculation.
- **In-Memory Batch Queue**: Throttled write queue enforcing ≤60 writes/min.

---

## 📁 Repository Structure

```
QR-Based-Attendance-system/
├── client/                         # React Frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Faculty/            # CreateSession.jsx, QRCodeDisplay.jsx
│   │   │   ├── Student/            # QRScanner.jsx
│   │   │   ├── Dashboard/          # AttendanceList.jsx, ExportButton.jsx
│   │   │   └── common/             # LocationPrompt.jsx, Loading.jsx
│   │   ├── hooks/
│   │   │   └── useGeolocation.js   # navigator.geolocation wrapper, enableHighAccuracy
│   │   ├── utils/
│   │   │   └── helpers.js          # getDeviceId() — localStorage fingerprint
│   │   └── services/
│   │       └── api.js              # Axios instance — all API calls
│   └── vercel.json                 # SPA router rewrite rules
│
├── server/                         # Node.js + Express Backend
│   └── src/
│       ├── controllers/            # HTTP handlers (session, attendance, export)
│       ├── services/
│       │   ├── attendanceService.js # _validateAndBuild() → queueAttendance()
│       │   ├── queueService.js      # Batch-write queue (10 items/10 s = 60/min)
│       │   ├── sessionService.js
│       │   └── authService.js       # OTP store + JWT issuer
│       ├── storage/
│       │   ├── googleSheetsStorage.js  # Live storage (9-col sessions, 10-col attendance)
│       │   └── mongoStorage.js          # Phase 2 stub
│       ├── utils/
│       │   └── locationValidator.js     # Bbox pre-check + Haversine
│       └── app.js                       # Server boot + queueService.start()
│
└── postman_collection.json         # 10-case API test suite
```

---

## 🔌 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/send-otp` | — | Send OTP to email (domain-validated for students) |
| `POST` | `/api/auth/verify-otp` | — | Verify OTP → returns JWT |
| `POST` | `/api/create-session` | Teacher JWT | Create session, get QR code |
| `GET` | `/api/session/:sessionId` | — | Get session details |
| `PATCH` | `/api/session/:sessionId/close` | Teacher JWT | Close session |
| `POST` | `/api/mark-attendance` | Student JWT | **Returns 202** — enqueues, validates all 3 layers |
| `GET` | `/api/attendance/:sessionId` | Teacher JWT | Live attendance list |
| `GET` | `/api/export-attendance/:sessionId` | Teacher JWT | Download CSV |
| `GET` | `/api/health` | — | Health check + **queue telemetry** |

### Queue Stats (visible at `/api/health`)
```json
{
  "status": "ok",
  "queue": {
    "currentLength": 3,
    "totalEnqueued": 87,
    "totalFlushed": 80,
    "totalFailed": 0,
    "flushRatePerMin": "60/min",
    "lastFlushAt": "2025-01-17T10:30:00.000Z"
  }
}
```

---

## ⚙️ Environment Variables

### Backend (`server/.env`)
```env
PORT=5000
CLIENT_URL=https://your-frontend-domain.vercel.app

# Google Sheets (database)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms

# Auth & Rate Control
DEFAULT_RADIUS_METERS=50
JWT_SECRET=your_super_secret_jwt_key_here
RESEND_API_KEY=re_your_resend_api_key
```

### Frontend (`client/.env`)
```env
VITE_API_URL=https://your-backend-api.onrender.com/api
```

---

## 💻 Local Development Setup

### Prerequisites
- **Node.js** `v18.x` or higher
- A **Google Cloud Service Account** with Google Sheets API enabled, its email shared as *Editor* on your target Sheet

### 1. Clone & Install
```bash
git clone https://github.com/2024ucp1505/QR-Based-Attendance-system.git
cd QR-Based-Attendance-system
```

### 2. Backend Setup
```bash
cd server
npm install
cp .env.example .env
# Fill in your credentials in .env
npm run dev        # nodemon → hot-reload on http://localhost:5000
```

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev        # Vite → http://localhost:5173
```

### 4. Testing on a Mobile Device (Geofencing requires physical device)
```bash
# Terminal 1 — expose frontend
ngrok http 5173

# Terminal 2 — expose backend
ngrok http 5000
```
Then:
1. Set `CLIENT_URL` in `server/.env` to your ngrok frontend URL.
2. Set `VITE_API_URL` in `client/.env` to your ngrok backend URL.
3. Ensure `vite.config.js` has `server: { host: true }` to accept LAN connections.

---

## 🚀 Deployment Guide

This system uses a **split-host deployment** (Frontend on Vercel, Backend on Render/Railway).

### ⚠️ CORS "Chicken-and-Egg" — Deploy in This Order

Because the backend needs the frontend URL for CORS (`CLIENT_URL`), and the frontend needs the backend URL for API calls (`VITE_API_URL`):

1. **Deploy Backend first** — use `http://localhost:5173` as a placeholder `CLIENT_URL`.
2. **Deploy Frontend** — set `VITE_API_URL` to the live backend URL → obtain your permanent Vercel domain.
3. **Update Backend** — replace `CLIENT_URL` with the actual Vercel domain and redeploy.

### Frontend — Vercel SPA Routing Fix
React Router handles routes client-side, so direct URL access to `/faculty` returns Vercel 404 unless you add `client/vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

### Deployment Verification Checklist
- [ ] `GET /api/health` → `status: ok` with queue stats
- [ ] Accessing `/faculty` directly → redirects to `/login` if unauthenticated
- [ ] Faculty creates session → QR code displayed, `setInterval` polling starts
- [ ] Student scans QR on mobile → receives `202 Accepted` response
- [ ] Google Sheet shows new attendance row within 10 seconds of scan
- [ ] CSV export downloads correctly with session header rows

---

## 🧪 Testing

Import `postman_collection.json` from the project root into Postman. It contains **10 test cases**:

| # | Case | Expected |
|---|------|----------|
| 01 | Send OTP — valid faculty email | `200` |
| 02 | Send OTP — non-MNIT student email | `400` |
| 03 | Verify OTP — wrong/expired code | `401` |
| 04 | Create session — valid faculty token | `201` + `sessionId` |
| 05 | Mark attendance — inside radius | `202` + `queued: true` |
| 06 | Mark attendance — coords outside bounding box | `400` |
| 07 | Mark attendance — missing `deviceId` | `400` |
| 08 | Mark attendance — duplicate device (proxy attempt) | `400` |
| 09 | Queue stress — 5 rapid requests (Collection Runner) | `202` all |
| 10 | Export CSV — valid faculty token | `200` + `text/csv` |

---

## 📊 Performance & Concurrency Design

| Concern | Solution | Key Numbers |
|---------|----------|-------------|
| Google Sheets rate limit | Batch-write queue | 10 items/10 s = **60 writes/min** |
| Expensive GPS math for out-of-range students | Bounding box pre-check (O(1)) | **4 comparisons** before Haversine |
| Student wait time during DB write | HTTP 202 + queue | **~0 ms wait** for student |
| Proxy attendance | Device fingerprint OR studentId check | **0 duplicate records** possible |
| GPS spoofing | Server-side Haversine only | Client coordinates **never trusted** |

---

## 📝 Google Sheets Schema

### Sessions Sheet (9 columns)
| sessionId | facultyName | subject | latitude | longitude | radius | createdAt | status | facultyEmail |

### Attendance Sheet (10 columns)
| recordId | sessionId | studentId | studentName | markedAt | latitude | longitude | distance | studentEmail | deviceId |

---

