import base64
import io
import hmac
import os
import threading
from contextlib import asynccontextmanager
from typing import Any

import mediapipe as mp
import numpy as np
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from PIL import Image

MODEL_PATH = os.environ.get('FACE_LANDMARKER_MODEL', '/models/face_landmarker.task')
SERVICE_TOKEN = os.environ.get('LIVENESS_SERVICE_TOKEN', '')
ACTIONS = {'blink', 'turn_left', 'turn_right', 'smile', 'nod'}
MAX_REQUEST_BYTES = 9_500_000
MAX_FRAME_PAYLOAD_CHARS = 8_000_000

class VerifyRequest(BaseModel):
    challengeId: str = Field(min_length=1, max_length=100)
    nonce: str = Field(min_length=16, max_length=200)
    actions: list[str] = Field(min_length=1, max_length=4)
    baselineFrames: int = Field(ge=2, le=8)
    frames: list[str] = Field(min_length=10, max_length=30)

@asynccontextmanager
async def lifespan(app: FastAPI):
    if len(SERVICE_TOKEN) < 32:
        raise RuntimeError('LIVENESS_SERVICE_TOKEN must be configured with at least 32 characters')
    if not os.path.isfile(MODEL_PATH):
        raise RuntimeError(f'Face model not found: {MODEL_PATH}')
    options = mp.tasks.vision.FaceLandmarkerOptions(
        base_options=mp.tasks.BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=mp.tasks.vision.RunningMode.IMAGE,
        num_faces=2,
        output_face_blendshapes=True,
    )
    app.state.landmarker = mp.tasks.vision.FaceLandmarker.create_from_options(options)
    app.state.inference_lock = threading.Lock()
    yield
    app.state.landmarker.close()

app = FastAPI(title='Smart Attendance Face Liveness', docs_url=None, redoc_url=None, lifespan=lifespan)

@app.middleware('http')
async def guard_verify_request(request: Request, call_next):
    if request.url.path == '/verify':
        authorization = request.headers.get('authorization', '')
        if not hmac.compare_digest(authorization, f'Bearer {SERVICE_TOKEN}'):
            return JSONResponse(status_code=401, content={'detail': 'Unauthorized'})
        try:
            content_length = int(request.headers.get('content-length', '0'))
        except ValueError:
            return JSONResponse(status_code=400, content={'detail': 'Invalid Content-Length'})
        if content_length > MAX_REQUEST_BYTES:
            return JSONResponse(status_code=413, content={'detail': 'Request body is too large'})
    return await call_next(request)

def require_token(authorization: str | None) -> None:
    if not authorization or not hmac.compare_digest(authorization, f'Bearer {SERVICE_TOKEN}'):
        raise HTTPException(status_code=401, detail='Unauthorized')

def decode_frame(encoded: str) -> np.ndarray:
    if len(encoded) > 700_000:
        raise HTTPException(status_code=413, detail='Frame is too large')
    try:
        raw = base64.b64decode(encoded, validate=True)
        with Image.open(io.BytesIO(raw)) as image:
            if image.format != 'JPEG' or image.width > 1280 or image.height > 1280 or image.width < 160 or image.height < 160:
                raise HTTPException(status_code=400, detail='Unsupported frame format or dimensions')
            image.load()
            return np.asarray(image.convert('RGB'))
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail='Frames must be base64 encoded JPEG images')
def category_scores(result: Any) -> dict[str, float]:
    if not result.face_blendshapes:
        return {}
    return {item.category_name: item.score for item in result.face_blendshapes[0]}

@app.get('/health')
def health():
    return {'status': 'ok', 'modelLoaded': hasattr(app.state, 'landmarker')}

def sustained_event(values: list[float], predicate, start: int = 2) -> int | None:
    for index in range(start, len(values) - 1):
        if predicate(values[index]) and predicate(values[index + 1]):
            return index
    return None

@app.post('/verify')
def verify(payload: VerifyRequest, authorization: str | None = Header(default=None)):
    require_token(authorization)
    if len(set(payload.actions)) != len(payload.actions) or any(a not in ACTIONS for a in payload.actions):
        raise HTTPException(status_code=400, detail='Unsupported or duplicate challenge action')
    if payload.baselineFrames > len(payload.frames) - 4:
        raise HTTPException(status_code=400, detail='Not enough action frames after the neutral baseline')
    if sum(len(frame) for frame in payload.frames) > MAX_FRAME_PAYLOAD_CHARS:
        raise HTTPException(status_code=413, detail='Frame payload is too large')
    blendshapes = []
    nose_y = []
    nose_x = []
    expected_shape = None
    for encoded in payload.frames:
        rgb = decode_frame(encoded)
        if expected_shape is None:
            expected_shape = rgb.shape
        elif rgb.shape != expected_shape:
            raise HTTPException(status_code=400, detail='All frames must use the same dimensions')
        with app.state.inference_lock:
            result = app.state.landmarker.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb))
        if len(result.face_landmarks) != 1:
            return {'passed': False, 'score': 0.0, 'actionsCompleted': []}
        face = result.face_landmarks[0]
        eye_width = max(abs(face[263].x - face[33].x), 0.01)
        blendshapes.append(category_scores(result))
        nose_x.append((face[1].x - (face[33].x + face[263].x) / 2) / eye_width)
        nose_y.append((face[1].y - (face[33].y + face[263].y) / 2) / eye_width)

    def vals(name):
        return [frame.get(name, 0.0) for frame in blendshapes]

    events: dict[str, int] = {}
    left_blink, right_blink = vals('eyeBlinkLeft'), vals('eyeBlinkRight')
    blink = [(left + right) / 2 for left, right in zip(left_blink, right_blink)]
    action_start = payload.baselineFrames
    for index in range(action_start + 1, len(blink) - 1):
        if blink[index] >= 0.45 and blink[index - 1] <= 0.25 and blink[index + 1] <= 0.25:
            events['blink'] = index
            break

    smile = [(left + right) / 2 for left, right in zip(vals('mouthSmileLeft'), vals('mouthSmileRight'))]
    if max(smile[:action_start]) < 0.35:
        smile_index = max(range(action_start, len(smile)), key=smile.__getitem__)
        if smile[smile_index] >= 0.45:
            events['smile'] = smile_index

    neutral_x = float(np.median(nose_x[:action_start]))
    left_turn = sustained_event(nose_x, lambda value: value - neutral_x >= 0.12, start=action_start)
    right_turn = sustained_event(nose_x, lambda value: neutral_x - value >= 0.12, start=action_start)
    if left_turn is not None:
        events['turn_left'] = left_turn
    if right_turn is not None:
        events['turn_right'] = right_turn

    neutral_y = float(np.median(nose_y[:action_start]))
    nod_peak = max(range(action_start, len(nose_y)), key=lambda index: abs(nose_y[index] - neutral_y))
    nod_returned = any(abs(nose_y[index] - neutral_y) <= 0.08 for index in range(nod_peak + 1, len(nose_y)))
    if abs(nose_y[nod_peak] - neutral_y) >= 0.12 and nod_returned:
        events['nod'] = nod_peak

    completed = []
    previous_event = -1
    for action in payload.actions:
        event_index = events.get(action)
        if event_index is None or event_index <= previous_event:
            break
        completed.append(action)
        previous_event = event_index
    passed = len(completed) == len(payload.actions)
    # This is ordered challenge coverage, not model confidence or spoof probability.
    score = len(completed) / len(payload.actions)
    return {'passed': passed, 'score': score, 'actionsCompleted': completed}
