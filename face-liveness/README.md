# Face liveness verifier

This service runs MediaPipe Face Landmarker on frames sent by the backend. It requires one visible face, evaluates action transitions across ordered frames, and requires the requested actions in challenge order. The checks are heuristics over facial landmarks and blendshapes, not a calibrated anti-spoofing model.

Build and run with Docker:

```powershell
docker build -t smart-attendance-face face-liveness
docker run --rm -p 8001:8001 -e LIVENESS_SERVICE_TOKEN=replace-with-a-random-secret-of-at-least-32-characters smart-attendance-face
```

Set the same token and URL in `backend/.env`:

```env
LIVENESS_SERVICE_URL=http://127.0.0.1:8001/verify
LIVENESS_SERVICE_TOKEN=replace-with-a-random-secret-of-at-least-32-characters
```

The first image build downloads the official MediaPipe face landmarker task model and needs internet access. Keep this endpoint on a private network.

`POST /verify` accepts `{ challengeId, nonce, actions, baselineFrames, frames }`, where `baselineFrames` marks the leading neutral frames and `frames` contains 10 to 30 ordered base64 JPEG strings without a data URL prefix, with a total encoded frame payload no larger than 8 MB. It returns `{ passed, score, actionsCompleted }`. `score` is the fraction of requested actions detected (not model confidence or a calibrated spoof probability).

This is a server-side facial landmark and randomized-action check, not a certified presentation-attack detector or identity match. A sophisticated replay or virtual camera may still fool it; evaluate dedicated anti-spoofing technology before using this for high-stakes attendance.
