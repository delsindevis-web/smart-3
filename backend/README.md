# Smart Attendance System - Backend

REST API for the Smart Attendance System. A student's attendance is recorded only after the
server has verified they are physically in the classroom:

```
Teacher opens a session ─► Student taps "Mark Attendance"
                                   │
              BLE proximity ─► (Dynamic QR, optional) ─► Face liveness
                                   │
                         Server checks every required proof
                                   │
                         Attendance recorded (once per session)
```

* **Zero npm dependencies.** Plain Node.js (`http`, `crypto`) + the built-in SQLite module.
* Requires **Node.js 22.13 or newer**.

## Quick start

```bash
# Terminal 1: build and run the local face verifier
cd face-liveness
docker build -t smart-attendance-face .
docker run --rm -p 8001:8001 -e LIVENESS_SERVICE_TOKEN=replace-with-a-random-secret-of-at-least-32-characters smart-attendance-face

# Terminal 2: start the API (use the same token in backend/.env)
cd backend
cp .env.example .env
npm start                 # http://localhost:4000

# Terminal 3: start the React frontend
cd frontend
npm install
npm run dev               # http://localhost:5173
```

On first start with an empty database, demo data is created:

| Role    | Login ID                | Password                                         |
|---------|-------------------------|--------------------------------------------------|
| Teacher | `T001`                  | `teacher123`                                     |
| Student | `23BCS001` … `23BCS005` | `student123` (not needed in dev mode, see below) |

Courses: Introduction to Programming (`CS101`), Computer Networks (`CN301`), Information Retrieval (`IR302`),
each scheduled every day so the demo works whenever you run it. All five students are enrolled in all three.

Try it:

```bash
# teacher logs in and opens attendance for Computer Networks (course id 2)
T=$(curl -s localhost:4000/api/auth/login -H 'Content-Type: application/json' \
     -d '{"loginId":"T001","password":"teacher123"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')
curl -s localhost:4000/api/sessions -H "Authorization: Bearer $T" -H 'Content-Type: application/json' -d '{"courseId":2}'
```

The student side (login → dashboard → BLE → face → complete) is documented in [`docs/api.md`](docs/api.md),
including ready-to-paste code for your React pages.

## How each check works

| Check | What the server enforces |
|-------|--------------------------|
| **BLE proximity** | Client reports the beacon ID it saw + RSSI. Beacon must match the one assigned to the session, and RSSI must be ≥ `BLE_MIN_RSSI` (default −80 dBm). |
| **Dynamic QR** | Teacher screen polls `GET /api/sessions/:code/qr`; the server mints a new token every `QR_TTL_SECONDS` (5 s). Student submits the scanned token; it must belong to that session and be unexpired (plus a small grace for network delay). |
| **Face liveness** | Server issues a random, single-use, 30-second challenge (e.g. *blink + turn left*). The result must reference that challenge, arrive no faster than humanly possible, and meet `LIVENESS_MIN_SCORE`. |
| **Completion** | `complete` fails unless every factor in `REQUIRED_FACTORS` is verified, the attempt hasn't timed out, and the session is still open. A DB `UNIQUE(session, student)` constraint guarantees one record per student per session, even under double-taps. |

Failed verifications are written to an `audit_log` table so repeated suspicious attempts are visible.

## Configuration (`.env`)

See [`.env.example`](.env.example) - every option is documented there. The important ones:

* `REQUIRED_FACTORS` - `ble,face` (default, matches your current UI flow) or `ble,qr,face`, etc.
* `REQUIRE_PASSWORD` - `false` allows ID-only student login in development. Production requires `true`; the login page accepts a password.
* `SEED_ON_EMPTY` - `true` creates demo accounts in development. Production requires `false`.
* `LIVENESS_SERVICE_TIMEOUT_MS` - verifier request deadline, 15 seconds by default (allowed range 1-30 seconds).
* `JWT_SECRET` - production requires at least 32 characters; generate a random value and keep it secret.

## Project layout

```
backend/
├── src/
│   ├── server.js            HTTP server, CORS, JSON parsing, error handling
│   ├── router.js            tiny router with role-based access
│   ├── config.js            env loading + validation
│   ├── db.js                SQLite schema, transactions, audit log
│   ├── auth.js              scrypt passwords, signed tokens (HS256), login limiter
│   ├── seed.js              demo data (`npm run seed`)
│   ├── routes/              auth, student, attendance, teacher
│   └── services/            ble, qr, liveness, attendance, schedule
├── test/api.test.js
└── docs/api.md              endpoint reference + frontend integration
```

## Known limitations (please read before relying on this for real grading)

1. **Face liveness uses a server-side landmark verifier.** Run the service in `../face-liveness`, then set `LIVENESS_SERVICE_URL` and `LIVENESS_SERVICE_TOKEN` in `.env`. The backend forwards captured frames and ignores client pass flags and scores. The landmark action check is not a certified anti-spoofing detector or identity match.
2. **BLE RSSI is measured by the student device** and cannot be authenticated by this backend. A static beacon ID can be relayed by someone inside the room. Stronger assurance needs trusted beacon broadcasts plus anti-relay hardware or platform attestation. Combining BLE with dynamic QR (`REQUIRED_FACTORS=ble,qr,face`) adds another check. Also note browser support: Web Bluetooth works in Chrome/Edge on Android and desktop, **not on iOS Safari**.
3. **Dev-mode login** (see `REQUIRE_PASSWORD` above).
4. SQLite is perfect for a single server and a class-sized load. Move to PostgreSQL if you ever need multiple servers.
5. Run behind HTTPS in any real deployment (camera and Bluetooth APIs require a secure context anyway).
