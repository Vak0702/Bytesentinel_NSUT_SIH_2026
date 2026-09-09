# DASTAVEZ — System Architecture

**AI-Based Fake Identity & Document Screening System**
Smart India Hackathon 2026 · Problem Statement 26188 · Team BYTESENTINEL

---

## 1. What the system does

An immigration officer at a border counter receives a traveller and their
documents. Dastavez takes the document images and a live face capture, and
returns a defensible verdict in seconds: extracted data, which checks passed,
which failed, a 0–100 risk score, and a recommendation.

The officer makes the final decision. The system recommends and evidences; it
does not decide.

---

## 2. Design principles

These explain most of the structural choices below.

**Deterministic checks before probabilistic ones.**
An MRZ carries ICAO 9303 check digits; an Aadhaar number carries a Verhoeff
checksum. These are arithmetic, not inference — a forged number fails with
certainty, no threshold and no confidence score. The system runs them first
and weights them highest. ML is used only where arithmetic cannot help
(reading characters off an image, comparing two faces).

**Every heavy module is optional.**
OCR and face verification are large, slow-to-install dependency trees owned by
different team members. Each is imported lazily behind a capability check, so
the application starts and serves with neither, either, or both installed. A
missing module degrades one feature into an explicit 503 instead of taking the
process down.

**Explainability is a return value, not a feature.**
Every check returns a status *and* a human-readable reason. The risk score
returns its component contributions. The officer sees why a document was
flagged, which is what makes the decision auditable.

**Human in the loop by construction.**
Risk bands recommend actions (Clear / Review / High risk). No endpoint clears
or rejects a traveller autonomously.

---

## 3. Process topology

Three processes in development, one in production.

### Development

```
Browser
  │
  ├── :3000  Next.js 16 landing + login  ──┐
  │                                        │  server-side /api/* proxy
  ├── :5173  Vite + React 19 console   ──┤
  │                                        ▼
  └────────────────────────────► :5000  Flask API + pipelines
                                           │
                                           ▼
                                    SQLite / MySQL
```

Neither frontend calls Flask directly from the browser. Each proxies `/api/*`
server-side — a `rewrites()` rule in `next.config.mjs`, a `proxy` block in
`vite.config.js`. This makes every request same-origin from the browser's
point of view, so the session cookie is first-party rather than third-party.

The session cookie is scoped to the **host**, not the port. That is why an
officer can sign in on `:3000` and be recognised on `:5173` with no token
handoff.

### Production

`scripts/build.ps1` compiles both frontends into `backend/static/`, and
`register_static_routes()` in `app.py` serves them. One origin, one port, no
proxy, no CORS.

---

## 4. Backend structure

```
backend/
├── app.py                  application factory, blueprint registration
├── config.py               env-driven config (dotenv)
├── extensions.py           SQLAlchemy instance
├── models/                 ORM layer
├── blueprints/             HTTP layer  — request/response only
├── services/               orchestration — lazy imports, capability checks
├── pipelines/              algorithms   — no Flask, no DB
└── uploads/<case>/         stored document images + live_reference.jpg
```

### The three-layer split

The separation between `blueprints/`, `services/` and `pipelines/` is the most
important structural decision in the backend.

| Layer | Knows about | Never touches |
|---|---|---|
| `blueprints/` | Flask, sessions, JSON, HTTP status codes | OCR, face models |
| `services/` | Flask config, DB models, the pipelines | HTTP |
| `pipelines/` | numpy, OpenCV, ONNX, PaddleOCR | Flask, the database |

`pipelines/` is pure computation: give it an image path, get a dict back. That
makes each pipeline independently testable from a shell, runnable as a script,
and portable to a worker queue later without touching web code.

`services/` is where the optional-dependency handling lives. Each service
exposes `is_available()` (a `find_spec` probe) and a `_load()` that imports the
heavy module on first use, converting any `ImportError` into a domain-specific
`OcrUnavailable` / `FaceUnavailable` exception. Blueprints turn those into a
503 with an actionable message.

### Blueprints

| Prefix | Responsibility |
|---|---|
| `/api/auth` | Sign in / out, session lifetime, redirect target |
| `/api/cases` | Traveller queue, case detail, case history |
| `/api/documents` | Upload, OCR dispatch, liveness, face match |
| `/api/screening` | Stage orchestration, risk calculation, decision |
| `/api/watchlist` | Blacklist and flagged-traveller lookups |
| `/api/analytics` | Dashboard aggregates, risk distribution |
| `/api/activity` | Officer activity feed |
| `/api/health` | Liveness probe **and capability flags** |

`/api/health` is the diagnostic entry point. It reports `passportOcr`,
`aadhaarOcr`, `faceMatch` and `database` — so "is the OCR module loadable" is
answerable without uploading anything.

---

## 5. Data model

**Identity & audit**
`officers` (bcrypt password hashes) · `audit_logs`

**Workflow**
`cases` — one traveller encounter · `documents` — one uploaded file
`document_extractions` — structured OCR output per document

**Reference data** (what a scanned document is checked *against*)
`passports` · `visas` · `national_ids` · `driving_licenses` · `permits`

Each reference row carries a `document_status` (`ACTIVE`, `EXPIRED`,
`BLACKLISTED`), which is what turns a successful read into a verdict.

**Results**
`screening_results` (risk score, decision) · `validation_results`
`tampering_results` (schema present, producer not yet built) ·
`face_verification` (similarity score, status)

Results are stored per stage rather than as one blob so the officer console can
show which specific check failed, and so a re-run replaces one stage without
discarding the others.

---

## 6. Verification pipelines

### 6.1 Passport MRZ — `pipelines/passport/`

```
image
  ↓ mrzscanner detection model
MRZ polygon located (four orientations attempted)
  ↓ polygon padded 1.55× / 1.35×, corners clamped to image bounds
  ↓ perspective warp to a flat rectangle
MRZ crop
  ↓ three preprocessing variants: original, Otsu, sharpened adaptive
  ↓ PaddleOCR PP-OCRv5 on each
three candidate line-pairs
  ↓ choose_best_mrz_pair() — scores TD3 conformance
  ↓ mrz_parser — field extraction + ICAO 9303 check digits
structured fields
```

Two details worth explaining to a reviewer:

**Why three OCR variants.** MRZ recognition is brittle to lighting and print
contrast. One thresholding choice that works on a clean scan fails on a phone
photo. Running three and scoring the outputs costs CPU but converts a
sometimes-fails pipeline into a usually-succeeds one.

**Why the crop is padded.** Detection models are trained to hug the printed
characters; recognition models need whitespace around a line or they clip the
first and last glyphs. A TD3 line is exactly 44 characters and its check digits
are positional — a 41-character line is not "mostly right", it is unparseable.
The padding between the two stages is what prevents that failure.

Intermediate images are written to disk (`debug_upright_passport.png`,
`debug_mrz.png`, `mrz_variants/`) so a failed read can be diagnosed by looking
at what the model actually saw.

### 6.2 Aadhaar — `pipelines/aadhaar/`

Same OCR foundation, different parser. Field extraction followed by **Verhoeff
checksum** validation of the 12-digit number — the deterministic equivalent of
the passport's check digits.

### 6.3 Face — `pipelines/face/`

InsightFace `buffalo_l` on ONNX Runtime (CPU execution provider). The model is
constructed once per process in `engine.py` and shared; a cold load costs
seconds, so building it per request would dominate response time.

**Liveness** — three frames: head left, head right, centre. Direction is
inferred from the nose position relative to the eye midpoint, normalised by
inter-eye distance, with thresholds of ±0.20 for a turn and ±0.10 for centre.
Normalising by eye distance is what makes the check independent of the
traveller's distance from the camera. A frame containing zero faces or more
than one is rejected rather than guessed at. On success the centre frame is
stored as `uploads/<case>/live_reference.jpg`.

**Match** — cosine similarity between the document photo embedding and the live
reference embedding, returned as `MATCH` / `NO_MATCH` / `REVIEW`.

Liveness is a precondition for matching, not an optional extra: without it, a
"face match" only proves the person holding the phone owns a photo of the
document's subject.

### 6.4 Cross-verification — `services/passport_matcher.py`

Extracted fields are compared field-by-field against the reference row.
Name comparison is token-set based, so `MUDGAL SANJAY` from an MRZ matches
`Sanjay Mudgal` in the database — MRZ ordering is surname-first by standard,
and a naive string compare would produce false mismatches on every document.

---

## 7. Risk engine

`blueprints/screening.py::calculate_risk()`

| Component | Weight | Rationale |
|---|---|---|
| Validation | 45 | Deterministic; a checksum failure or blacklist hit is near-certain evidence |
| Tampering | 35 | Forensic signal (schema in place, producer pending) |
| Face | 20 | Probabilistic; lighting, age and pose introduce genuine variance |

Each component contributes its full weight on a hard failure and half on
`REVIEW` / `SUSPICIOUS`. Score bands:

| Score | Decision | Recommendation |
|---|---|---|
| 0–40 | `CLEAR` | Clear traveller |
| 41–70 | `REVIEW` | Manual review |
| 71–100 | `HIGH_RISK` | Escalate / create case |

The weights are a single dictionary in one function. Tuning the policy — how
much a face mismatch should count relative to an expired visa — is a one-line
change, not a refactor, and the value is auditable by anyone reading the file.

---

## 8. Screening flow

```
 1. Officer signs in                     → session cookie, audit entry
 2. Traveller selected from queue        → case loaded
 3. Liveness check                       → live_reference.jpg written
 4. Document uploaded                    → stored under uploads/<case>/
 5. OCR + MRZ extraction                 → document_extractions row
 6. Checksum validation                  → ICAO 9303 / Verhoeff
 7. Cross-verification vs reference DB   → validation_results row
 8. Face match (document ↔ live)         → face_verification row
 9. Risk calculation                     → screening_results row
10. Officer review                       → Clear / Secondary / Escalate
11. Audit log                            → case history
```

Steps 3 and 4 are order-dependent: the face match at step 8 compares against
the reference written at step 3.

---

## 9. Security

- Passwords stored as bcrypt hashes; never logged or returned
- Session cookies are `HttpOnly`, `SameSite`, host-scoped, with a configurable
  lifetime
- CORS restricted to an explicit `FRONTEND_ORIGINS` allowlist with
  credentials enabled
- Uploads are extension- and size-limited and stored per case, never served
  from a user-controlled path
- All secrets and connection strings come from `.env`, never source
- Every officer action is written to `audit_logs`

---

## 10. Technology stack

| Layer | Technology |
|---|---|
| API | Python 3.12, Flask 3, SQLAlchemy 2, bcrypt |
| Database | SQLite (dev) / MySQL via PyMySQL (deploy) |
| OCR | PaddleOCR PP-OCRv5, PaddlePaddle 3.2 |
| MRZ detection | mrzscanner (DocsaidLab), OpenCV |
| Face | InsightFace `buffalo_l`, ONNX Runtime |
| Console | React 19, Vite, Tailwind CSS 4, React Router, Recharts |
| Landing / auth | Next.js 16, React 18, TypeScript, Tailwind CSS 3 |

Native dependencies (not pip-installable): Microsoft Visual C++ 2015–2022
redistributable for ONNX Runtime; libjpeg-turbo for PyTurboJPEG.

---

## 11. Current status

**Implemented and running**
Officer auth and sessions · case queue and history · document upload and
storage · passport MRZ extraction with ICAO 9303 validation · Aadhaar OCR with
Verhoeff validation · liveness detection · 1:1 face matching · reference-database
cross-verification · risk scoring and decision bands · analytics dashboard ·
audit logging

**Architected, not yet implemented**
`run_tampering()` in `screening.py` returns `implemented: False`. Error Level
Analysis and metadata forensics are designed for, weighted in the risk engine
and given a database table, but the producer is not written. The risk engine
handles its absence correctly — an unimplemented stage contributes zero rather
than a false pass.

**Known limitations**
- Orientation search accepts the first rotation the detector accepts, not the
  best-scoring one
- Liveness is pose-based; it defeats printed photos and static screens, but not
  a sophisticated video replay
- `is_available()` probes third-party module names only, so it cannot detect a
  broken import path inside the project's own pipeline code

---

## 12. Scaling path

The pipeline layer is deliberately free of Flask and database imports, so the
main scaling change requires no rewrite of the algorithms: move
`read_passport`, `check_liveness` and `match_faces` behind a task queue,
return a job ID from the upload endpoint, and let the console poll for results.
Model loading — currently once per process — becomes once per worker.

Beyond that: replace the CPU execution provider with GPU for face inference,
and move `uploads/` to object storage so workers are stateless.
