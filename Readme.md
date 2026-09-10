# Dastavez

**AI-Based Fake Identity & Document Screening System**

Smart India Hackathon 2026 · Problem Statement **26188**
Theme: Blockchain & Cybersecurity · Category: Software
Team **BYTESENTINEL**

---

## About Team

**BYTESENTINEL** — Smart India Hackathon 2026

| Member | Role |
|---|---|
| Janmajay Sharma | Backend & API — Face verification module, Passport ocr module|
| Anushka | Presentation drafting and research work |
| Prince Vishwakarma | Database handler, Mock database |
| Virat Kataria | Passport MRZ pipeline — detection, OCR, ICAO 9303 validation, System integration, documentation|
| Khushboo Kanojia | Auth- login console , Aadhar ocr pipeline |
| Tanmay Mudgal |Officer console — React, Vite, screening UI Landing page & authentication flow |


## 1. What problem are we solving?

An immigration officer at a border check post has under a minute to decide
whether a traveller's documents are genuine. Today that decision is made by
eye: read the passport, compare the photo to the face, check a name against a
list. It is slow, inconsistent between officers, and no match for modern
forgery.

The fraud has moved faster than the counter. Digital forgeries account for a
large share of document fraud, deepfakes appear in roughly one in five
biometric fraud attempts, and national ID documents are the most targeted
category of all. A convincing forged data page or a synthetic face is cheap to
produce and hard for an unaided human to catch.

Three specific gaps:

- **No arithmetic verification.** Every passport carries machine-readable
  check digits and every Aadhaar number carries a checksum. Neither is
  verified by eye, yet both catch fabricated numbers with certainty.
- **No liveness assurance.** Comparing a face to a document photo proves
  nothing if the "face" is a printed photo or a phone screen.
- **No auditable reasoning.** A rejection recorded as officer judgement cannot
  be reviewed, appealed, or learned from.

## 2. What is our proposed solution?

Dastavez is an **officer's screening console**. The officer captures a live
face, uploads the traveller's documents, and receives in seconds:

- the extracted document data
- which checks passed and which failed, each with a reason
- a 0–100 risk score with its component contributions
- a recommendation: **Clear**, **Review**, or **High risk**

The officer makes the final call. Dastavez supplies evidence, not verdicts.

**The core design idea: deterministic checks before probabilistic ones.**

A passport MRZ carries ICAO 9303 check digits. An Aadhaar number carries a
Verhoeff checksum. These are arithmetic — a fabricated number fails with
certainty, no model, no threshold, no confidence score to argue with. Dastavez
runs these first and weights them highest. Machine learning is used only where
arithmetic cannot help: reading characters off a photograph, and comparing two
faces.

That ordering is what makes the output explainable. When Dastavez flags a
document the officer sees *"check digit mismatch on the passport number"*, not
*"the model scored 0.31"*.

## 3. How does it work?

```
 1. Officer signs in                      → session established, audit begins
 2. Traveller selected from the queue     → case loaded
 3. Liveness check (3 head poses)         → live face reference captured
 4. Document uploaded                     → stored against the case
 5. MRZ detection + OCR                   → structured fields extracted
 6. Checksum validation                   → ICAO 9303 / Verhoeff arithmetic
 7. Cross-verification vs reference DB    → status, name, DOB, expiry compared
 8. Face match (document ↔ live capture)  → similarity score
 9. Risk calculation                      → weighted score + decision band
10. Officer review                        → Clear / Secondary / Escalate
11. Audit log                             → written to case history
```

### One login across three apps

Three apps on three ports, one sign-in. The mechanism is worth stating because
it is the least obvious part of the system.

**Session cookies, not JWTs.** On successful login Flask puts the officer's id
into a signed cookie. Cookies are scoped to the **host, not the port** — a
cookie set on `localhost:5000` is sent by `localhost:3000` and `localhost:5173`
too. That single browser rule is what makes one sign-in cover all three apps
with no token passing.

The cookie is `HttpOnly`, so JavaScript cannot read it and an XSS bug cannot
steal it; a JWT in `localStorage` has the opposite property. It is *signed*,
not encrypted — anyone can read the officer id inside, nobody can change it
without `SECRET_KEY`. And only the id goes in: name and role are re-read from
the database on every request, so deactivating an officer takes effect on their
next click rather than whenever a token happens to expire.

**Both dev servers proxy `/api` to Flask** — `rewrites()` in `next.config.mjs`,
`server.proxy` in `vite.config.js`. The browser only ever sees same-origin
requests to its own port, so there are no CORS preflights and no third-party
cookie. Flask still has CORS configured with `supports_credentials` for direct
calls.

**`credentials: "include"` on every fetch.** Without it the browser silently
omits the cookie and every call returns 401 — the single most common cause of
"it works in Postman but not in my app".

### The request path, end to end

```
Officer types DL001 + passphrase at :3000/login
   -> fetch("/api/auth/login")        same-origin, no CORS
   -> Next rewrite forwards to :5000
   -> Flask: SELECT officer WHERE badge_number = 'DL001'
   -> bcrypt.checkpw(typed, stored_hash)
   -> session["officer_id"] = 1;  audit_logs += LOGIN
   -> Set-Cookie: <session cookie, signed>
   -> browser redirects to :5173
   -> console: GET /api/auth/me       cookie rides along automatically
   -> 200 -> render;  401 -> back to /login
```

### Passport MRZ extraction

The machine-readable zone is located by a detection model, then the polygon is
**padded and perspective-corrected** into a flat strip. Detection models are
trained to hug the printed characters, but OCR needs whitespace around a line
or it clips the first and last glyphs — and a TD3 line is exactly 44 characters
with positional check digits, so a 41-character read is not "mostly right", it
is unparseable. The padding between the two stages is what prevents that.

The crop is then OCR'd in **three preprocessing variants** (original, Otsu
threshold, sharpened adaptive threshold) and the best-scoring result kept. MRZ
recognition is brittle to lighting and print contrast; a threshold that works
on a clean scan fails on a phone photo. Three passes cost CPU and convert a
sometimes-fails pipeline into a usually-succeeds one.

Field values are then verified against the **ICAO 9303 check digits** — each
MRZ field carries a digit computed from its own characters with a repeating
7-3-1 weight cycle. That catches an OCR misread or an altered line without
consulting any database. The implementation is verified against the official
ICAO specimen (`L898902C3`).

### Why check digits are not enough on their own

A valid check digit only proves the line is internally consistent — a forger
computes them correctly too. What a forged passport cannot do is match a record
it was never issued against, which is why `services/passport_matcher.py`
compares every field with the stored row and reports mismatches individually.

Names are compared by **word-set overlap** rather than character distance,
because the real-world difference is word order and truncation ("Kumari Meera"
vs "Meera Kumari", or a middle name the MRZ dropped), not misspelling.

Passport numbers are **not** auto-corrected for the classic `0`/`O` and `1`/`I`
OCR confusions: silently fixing a number is how a genuine mismatch becomes a
false match. If it is misread, the check digit fails and the officer is told.

An unknown passport number returns **REVIEW, not INVALID**. The reference
database only holds what has been loaded into it, so "not found" means a human
decides — it is not evidence of forgery.

### Liveness once, face match per document

The two halves have different natural lifetimes, so they are split.

**Liveness runs once per traveller.** Three frames — head left, head right,
facing forward — captured from the webcam in the console. A single photo proves
nothing, because a photo of a photo looks identical to a camera; requiring
three specific poses is what a printed photo cannot fake. Asking an officer to
repeat the head-turn sequence for every document would be unworkable at a real
counter.

Direction is inferred from nose position relative to the eye midpoint,
**normalised by inter-eye distance**, which makes the check independent of how
far the traveller stands from the camera. A frame containing no face, or more
than one, is rejected rather than guessed at. The verified centre frame is kept
as the case's live reference.

**Face match runs on every photo-bearing document.** Passport, Aadhaar and
driving licence each get their photo cropped and compared against that
reference. That is the point of doing it per document: a forger who swaps the
photo on one document but not another is exactly what this catches. Visas are
skipped — they carry no photo of their own.

Screening cannot start until liveness passes. Running identity checks on
someone you have not confirmed is standing there defeats the purpose.

A similarity just under the threshold returns **REVIEW** rather than NO_MATCH.
Treating 0.48 with the same confidence as 0.05 would misrepresent what the
number means.

### On what Aadhaar PASS means

PASS means the card was read cleanly and its two sides agree with each other.
It is **not** an authentication against UIDAI — no such check exists here — and
the console says so rather than showing a bare green tick.

### Risk engine

| Component | Weight | Why |
|---|---|---|
| Validation | 45 | Deterministic — a checksum failure or blacklist hit is near-certain |
| Tampering | 35 | Forensic signal *(schema in place, producer pending)* |
| Face | 20 | Probabilistic — lighting, age and pose introduce genuine variance |

| Score | Decision | Recommendation |
|---|---|---|
| 0–40 | `CLEAR` | Clear traveller |
| 41–70 | `REVIEW` | Manual review |
| 71–100 | `HIGH_RISK` | Escalate / create case |

The weights live in a single dictionary in one function, so tuning policy is a
one-line change and the value is auditable by anyone reading the file.

## 4. Which technologies did we use?

| Layer | Technology |
|---|---|
| API | Python 3.12, Flask 3, SQLAlchemy 2, bcrypt |
| Database | SQLite (dev) / MySQL via PyMySQL (deployment) |
| OCR | PaddleOCR PP-OCRv5, PaddlePaddle 3.2 |
| MRZ detection | mrzscanner (DocsaidLab), OpenCV |
| Face | InsightFace `buffalo_l`, ONNX Runtime |
| Officer console | React 19, Vite, Tailwind CSS 4, React Router, Recharts |
| Landing & auth | Next.js 16, React 18, TypeScript, Tailwind CSS 3 |

### Repository layout

```
src/
│
├── backend/
│   ├── __pycache__/
│   ├── .venv/
│   ├── {models,blueprints,utils}/
│   ├── blueprints/
│   ├── instance/
│   ├── models/
│   ├── pipelines/
│   ├── services/
│   ├── static/
│   ├── uploads/
│   ├── utils/
│   ├── .env
│   ├── .env.example
│   ├── app.py
│   ├── config.py
│   ├── extensions.py
│   ├── requirements.txt
│   └── seed.py
│
├── database/
│   └── legal_dms_database.sql
│
├── frontend/
│   ├── console/
│   └── landing/
│
├── scripts/
│   ├── build.ps1
│   ├── build.sh
│   ├── dev.ps1
│   └── dev.sh
│
├── .gitignore
├── CHANGES.md
└── README.md
```

### The three-layer split

`blueprints/` does HTTP only. `services/` orchestrates and owns the lazy
imports. `pipelines/` is pure computation — give it an image path, get a dict
back. It imports numpy, OpenCV and ONNX but never Flask or the database, which
makes each pipeline independently testable, runnable as a standalone script,
and movable behind a task queue later without touching web code.

The Aadhaar module imports `passport.ocr`, which is why those packages sit side
by side under `pipelines/` — the import resolves, and both share one PaddleOCR
instance instead of loading the recognition model twice.

Each heavy module is **loaded lazily behind a capability check**, so the app
starts and serves with OCR installed and face missing, or the reverse, or
neither. A missing module degrades one feature into an explicit 503 rather than
taking down the process. `GET /api/health` reports which capabilities are live.

Fuller detail in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## 5. How can a reviewer run it?

### Prerequisites

Python 3.12+, Node.js 18+, and two **native libraries that pip cannot
install**:

| Library | Why it is needed |
|---|---|
| Microsoft Visual C++ 2015–2022 Redistributable (x64) | ONNX Runtime ships compiled DLLs that link against it |
| libjpeg-turbo (VC 64-bit installer, default path `C:\libjpeg-turbo64`) | PyTurboJPEG is a ctypes wrapper with no bundled binary |

Skipping either produces an import error that looks like a missing Python
package but is not.

### Backend

```powershell
git clone https://github.com/<org>/<repo>.git
cd <repo>\src\backend

python -m venv .venv
.\.venv\Scripts\Activate.ps1          # bash: source .venv/bin/activate
pip install -r requirements.txt
Copy-Item .env.example .env
```

The OCR and face dependencies are **optional and separate**, because they are
large and independently owned:

```powershell
pip install -r pipelines\requirements-ocr.txt     # passport + Aadhaar (PaddleOCR, mrzscanner)
pip install -r pipelines\requirements-face.txt    # liveness + face match (InsightFace)
```

### Database

Using the MySQL dump:

```bash
mysql -u root -p < ../database/legal_dms_database.sql
# .env:  DATABASE_URL=mysql+pymysql://root:yourpassword@localhost:3306/legal_dms
```

Or zero setup, if MySQL is a hassle right now:

```
# .env:  DATABASE_URL=sqlite:///dastavez.db
flask --app app init-db
```

Then, either way:

```powershell
flask --app app seed          # officers + reference documents
flask --app app seed-cases    # four demo cases to actually screen
```

All three commands are idempotent — safe to re-run.

### Frontends

```powershell
cd ..\frontend\landing; npm install
cd ..\console;          npm install
```

Two separate npm projects; installing in one does nothing for the other. Copy
their configs too:

```powershell
Copy-Item ..\landing\.env.local.example ..\landing\.env.local
Copy-Item .env.example .env
```

### Run

```powershell
cd ..\..\..
.\src\scripts\dev.ps1          # bash: ./src/scripts/dev.sh
```

Flask API on `:5000`, Next.js landing on `:3000`, Vite console on `:5173`.

Verify before signing in:

```powershell
curl.exe http://localhost:5000/api/health
```

```json
{"aadhaarOcr":true,"database":"up","faceMatch":true,"passportOcr":true}
```

All four must be true. Use `curl.exe`, not `curl` — bare `curl` is a PowerShell
alias for `Invoke-WebRequest`.

### Sign in

<http://localhost:3000/login> — officer ID `DL001` through `DL010`, or the
email (`rajesh.kumar@gov.in`). The passphrase is whatever `DEMO_PASSWORD` is
set to in `src/backend/.env`.

### About those passwords

The dump contains bcrypt hashes like `$2b$12$qkN2HFbef/...` but not the
passwords behind them. That is not an oversight — bcrypt is a **one-way**
function. The plaintext is not stored anywhere and cannot be recovered by
anyone, including whoever created the dump.

So `flask --app app seed` overwrites each hash with one it generates from a
password you choose:

```bash
flask --app app seed --password "SomethingElse"
flask --app app set-password DL003 "OnlyThisOfficer"
```

The `$2b$12$` prefix is worth reading: `2b` is the bcrypt version, `12` is the
**cost factor** — the hash runs 2¹² iterations, so verifying one password takes
a deliberate ~250 ms. That is the point: it makes brute-forcing a stolen
database roughly a hundred million times slower than against SHA-256. The 22
characters after that are the random salt, stored in the open, which is why two
officers with the same password still get different hashes.

### Walk through a screening

1. **New Screening** → select a traveller from the queue
2. **Run the liveness check first** — capture left, right, centre
3. **Then** upload the passport

Order matters: the face match compares against the reference written by step 2.

Test images matching seeded database records are in `docs/test-images/`:

| File | Expected result |
|---|---|
| `passport_A1234567_VALID.jpg` | VALID — clean record |
| `passport_K8392041_BLACKLISTED.jpg` | INVALID — blacklisted |
| `passport_H9146253_EXPIRED.jpg` | INVALID — expired |

Run the blacklisted one. A pass proves little; catching a bad document is what
demonstrates the checks are real.

**First run is slow** — InsightFace and PaddleOCR load their models on first
use. Everything after is fast; models stay in memory for the life of the
process.

Full setup and troubleshooting notes: [`docs/RUNNING.md`](docs/RUNNING.md).

### Single-port build — the whole site on one URL

Three terminals is three things to go wrong in front of judges. This builds
both frontends into plain HTML/CSS/JS and lets Flask serve everything.

```powershell
.\src\scripts\build.ps1            # bash: ./src/scripts/build.sh
```

Then set `CONSOLE_URL=/console` in `src\backend\.env` and:

```powershell
cd src\backend
python app.py
```

Everything on <http://localhost:5000>:

| Path | What |
|---|---|
| `/` | landing page |
| `/login` | sign-in |
| `/console` | officer console |
| `/api/...` | the API |

No Node running at all — `npm` was only needed to produce the files.

Two things make this work. The console is built with `base=/console/` so its
asset URLs resolve under that prefix, and React Router gets a matching
`basename`. And Flask does three kinds of fallback: real files are served
directly; unknown paths under `/console/*` return the console's `index.html` so
React Router can handle them (the "refresh on /console/cases gives a 404" fix);
and landing routes are probed as `login.html` then `login/index.html`, because
a Next.js static export writes one real HTML file per route rather than folders.

**Rebuilding after a change.** The built files are a snapshot — edit a component
and the browser keeps showing the old version until you re-run the build script.
Use the dev servers for day-to-day work; use this build for demos.

## 6. What does the final output look like?

### Per document

Structured fields extracted from the MRZ — passport number, surname, given
names, nationality, date of birth, sex, date of expiry — each shown alongside
its validation state, next to what the database holds and whether the two
agree.

### Per check

| Check | Output |
|---|---|
| Format | `PASS` / `FAIL` with the failing field named |
| Checksum | `VALID` / `INVALID` per ICAO 9303 or Verhoeff |
| Database | `MATCH` / `MISMATCH` / `REVIEW` with the specific discrepancy |
| Liveness | `LIVE` / `NOT_LIVE` naming the failing frame and the pose detected |
| Face match | `MATCH` / `NO_MATCH` / `REVIEW` with a similarity score |

### Per screening

A 0–100 risk score, a decision band, and a recommendation — with component
contributions visible, so the officer sees *which* check drove the score.

Example, for the blacklisted specimen:

```
Passport   K8392041   Meera Kumari   IND
Format     PASS       TD3 structure valid
Checksum   VALID      all check digits verified
Database   MISMATCH   passport status is BLACKLISTED
Liveness   LIVE       three poses confirmed
Face       MATCH      similarity 0.71

Risk 45 / 100   →   REVIEW   →   Manual review
```

### API envelope

All routes answer in one shape — `{"ok": true, "data": ...}` or
`{"ok": false, "error": {"code", "message"}}` — so the frontend has exactly one
branch to write instead of guessing per endpoint.

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | — | liveness + DB connectivity + capability flags |
| POST | `/api/auth/login` | — | sign in, sets the session cookie |
| POST | `/api/auth/logout` | — | clear the session |
| GET | `/api/auth/me` | ✓ | current officer |
| GET | `/api/auth/officers` | ✓ | roster for filter dropdowns |
| POST | `/api/auth/change-password` | ✓ | |
| GET | `/api/cases` | ✓ | `?status=&nationality=&officer=&limit=` |
| GET | `/api/cases/queue` | ✓ | travellers waiting at the counter |
| GET | `/api/cases/flagged` | ✓ | |
| GET | `/api/cases/investigations` | ✓ | |
| GET | `/api/cases/<case_number>` | ✓ | one case + documents + all check results |
| POST | `/api/cases/<case_number>/decision` | ✓ | record a decision, writes the audit row |
| GET | `/api/documents/capabilities` | ✓ | which pipelines can run right now |
| POST | `/api/documents/upload` | ✓ | multipart: `file`, `caseId`, `documentType`, `side` |
| POST | `/api/documents/liveness` | ✓ | `frameLeft`, `frameRight`, `frameCentre`, `caseId` |
| GET | `/api/documents/<id>` | ✓ | one document with its validation results |
| GET | `/api/screening/stages` | ✓ | pipeline definition |
| POST | `/api/screening/run` | ✓ | run the pipeline for a case |
| GET | `/api/screening/verify/passport/<n>` | ✓ | standalone lookup |
| GET | `/api/screening/verify/visa/<n>` | ✓ | |
| GET | `/api/watchlist` | ✓ | blacklisted / expiring documents |
| GET | `/api/analytics` | ✓ | everything the charts plot |
| GET | `/api/activity` | ✓ | the audit trail |

### Persisted

Every screening writes a result row, per-stage validation and face-verification
rows, and an audit entry naming the officer, the action and the timestamp —
retrievable from Case History and aggregated in Reports & Analytics.

### Screenshots

Annotated screenshots of every screen, the test inputs, and the three
verification outcomes: [`assets-screenshots/README.md`](assets-screenshots/README.md).

## 7. Important features and expected impact

### Features

- **Deterministic checksum validation** — ICAO 9303 and Verhoeff arithmetic
  catches fabricated numbers with certainty, before any model runs
- **Multi-variant OCR** — three preprocessing passes per document, best result
  kept, for robustness to real-world image quality
- **Pose-based liveness** — defeats printed photos and static screens; ratios
  normalised so the check is distance-independent
- **Per-document face matching** — catches a forger who swaps the photo on one
  document but not another
- **Reference cross-verification** — status, name, date of birth and expiry
  checked against issuing records; blacklist and expiry enforced
- **Explainable risk scoring** — weighted, component-visible, tunable in one
  place
- **Human in the loop by construction** — no endpoint clears or rejects a
  traveller autonomously
- **Full audit trail** — every officer action recorded and reviewable
- **Graceful degradation** — heavy modules are optional; a missing one disables
  a feature, not the service

### Expected impact

| Area | Impact |
|---|---|
| Detection quality | Arithmetic verification catches forged numbers no visual inspection would |
| Speed | Screening in seconds rather than minutes of manual comparison |
| Consistency | The same rules applied to every traveller, at every counter, on every shift |
| Accountability | Decisions carry recorded evidence, making review and appeal possible |
| Officer focus | Risk banding directs attention to genuinely suspicious cases |
| Scalability | The same pipeline serves border posts, e-KYC and any high-volume ID check |

---

## Adding the next module

The layout is built around this.

**1. New endpoints** → a new file in `src/backend/blueprints/`:

```python
from flask import Blueprint
from utils import login_required, ok

bp = Blueprint("documents", __name__, url_prefix="/api/documents")

@bp.post("/upload")
@login_required
def upload():
    return ok({"uploaded": True})
```

Register it in `blueprints/__init__.py`. Nothing else changes — that is what a
blueprint buys you over piling routes into one file.

**2. New frontend calls** → one function in
`src/frontend/console/src/services/api.js`. Pages import from there and never
touch `fetch` directly, so when an endpoint changes, exactly one file changes.

**3. Filling in the stub stages.** `blueprints/screening.py` has functions
returning `{"implemented": False}`. Each maps to a table that already exists.
Replace one body, persist a row, done — `calculate_risk()` picks it up
automatically and the console needs no changes.

Whoever owns tampering detection writes only to `tampering_results`. Whoever
owns face matching writes only to `face_verification`. Neither can break the
other, and neither has to wait for the other. That separation is the main
reason the schema has one table per stage rather than twenty columns on
`documents`.

## Project status

**Working:** officer authentication and sessions · case queue and history ·
document upload · passport MRZ extraction with ICAO 9303 validation · Aadhaar
OCR with Verhoeff validation · liveness detection · per-document face matching ·
reference-database cross-verification · risk scoring and decision bands ·
analytics dashboard · audit logging · single-port production build

**Architected, not yet implemented:** Error Level Analysis and metadata
forensics. `run_tampering()` returns `implemented: False`. The stage is designed
for, weighted in the risk engine and given a database table, but the producer is
not written. The risk engine handles its absence correctly — an unimplemented
stage contributes zero rather than a false pass.

## Notes and known gaps

- `analytics` shows honest placeholders where a module does not exist yet
  ("tampering module not yet wired") rather than invented numbers. Judges spot
  fake metrics.
- Average processing time needs per-case timing columns before it can be real.
- Set `SESSION_COOKIE_SECURE=true` in `.env` before this ever touches HTTPS.
- `SECRET_KEY` must be changed from the example. Rotating it logs everyone out,
  which is the correct behaviour.
- The console's API layer falls back to local mock data if Flask is unreachable,
  so a demo never white-screens. It deliberately does **not** do that for 401s
  or for writes — a decision that silently failed to save is worse than an error
  message.
- The MRZ orientation search accepts the first rotation the detector accepts
  rather than the best-scoring one.
- Liveness is pose-based: it defeats printed photos and static screens, but not
  a sophisticated video replay.

`CHANGES.md` lists every file added or edited during integration.

## Team

**BYTESENTINEL** — Smart India Hackathon 2026, Problem Statement 26188