# Docker + Postgres Containerization Plan

**Date:** 2026-05-18
**Status:** DRAFT - Iteration 2 (awaiting re-review)
**Iteration:** 2 -- Architect + Critic edits applied
**Mode:** RALPLAN-DR Deliberate Consensus
**Risk Level:** HIGH (introducing infrastructure layer where none exists)

---

## 1. RALPLAN-DR Summary

### Principles

1. **Ship the smallest thing that satisfies both halves of the ask.** The user asked for two things: a local Docker Postgres database, and the entire app + DB in compose. Deliver exactly that.
2. **No production secrets in compose files or version control.** All credentials flow through `.env` (gitignored) with a committed `.env.example` template.
3. **Reversibility over cleverness.** Every file added is new (Dockerfile, compose, nginx config, .dockerignore). No existing source files are modified except `.gitignore` and `README.md`. Easy to revert.
4. **Forward path documented, not built.** The DB has no consumer today. Document how a future backend service would connect rather than inventing one now.
5. **Infrastructure changes must not modify application source code (`.ts`/`.tsx`).** Every file added or changed by this plan is infrastructure (Dockerfile, compose, nginx config, .dockerignore, .gitignore, README). Zero application source files are touched.

### Decision Drivers (Top 3)

| # | Driver | Weight |
|---|--------|--------|
| 1 | **Literal scope fidelity** -- the user said "add Postgres" and "put everything in compose." Neither statement requests a backend API service. | Highest |
| 2 | **Incremental risk** -- introducing Docker + Postgres is already a meaningful infra change. Adding a backend service triples the surface area (new runtime, new dependencies, new API surface, new security boundary). | High |
| 3 | **Time to working state** -- compose-only dockerization can be verified in minutes. A backend service adds days of design decisions (ORM choice, migration tool, API shape, auth model). | Medium |

### Viable Options

#### Option A: Compose-only dockerization (RECOMMENDED)

Dockerize the SPA via multi-stage build (node:20-alpine builder -> nginx:alpine). Add Postgres as a second compose service with a named volume. Wire them on a shared bridge network. DB is running and reachable but not consumed by the SPA. Document the forward path.

- **Pro:** Satisfies both halves of the ask literally. Smallest possible change. Fully reversible.
- **Pro:** Postgres is immediately available for future backend work -- `docker compose exec db psql` works day one.
- **Con:** The DB container runs but nothing writes to it. Could confuse a contributor who expects data flow.
- **Con:** No proof that the DB is useful beyond `pg_isready`.

#### Option B: Introduce a minimal backend service

Add a third compose service (Node/Express or Fastify) with `/health` and `/api/projects` CRUD against Postgres. SPA calls the backend to persist project data.

- **Pro:** Proves the DB is useful end-to-end. Unlocks real persistence.
- **Pro:** Establishes the backend pattern for future features.
- **Con:** Scope explosion -- ORM choice, migration tooling, API design, CORS config, error handling, new `package.json`, new Dockerfile. Easily 3-5x the work.
- **Con:** The user did not ask for a backend. Inventing scope violates Principle 1.

#### Option C: Postgres only (no app dockerization)

Just a `docker-compose.yml` with Postgres. Frontend stays on the host via `npm run dev`.

- **Pro:** Absolute minimum change.
- **Con:** Does NOT satisfy the second half of the ask ("put the entire application...inside a docker container"). **Invalidated by the user's explicit request.**

#### Option D: Compose with dev + prod profiles

Like Option A, but add a `docker-compose.override.yml` with a dev profile that bind-mounts source and runs `vite dev` inside the container for HMR.

- **Pro:** Better DX for daily development inside containers.
- **Con:** Vite HMR through Docker bind mounts on Windows is notoriously unreliable (filesystem event forwarding issues with WSL2/Hyper-V). Adds complexity. Can be added later as a follow-up without changing the production compose.
- **Disposition:** Valid but deferred. Noted in follow-ups.

### Option Invalidation Rationale

- **Option B invalidated:** User did not request a backend. Adding one triples scope and introduces design decisions (ORM, migration tool, API shape) that should be deliberate, not incidental. Violates Principle 1.
- **Option C invalidated:** User explicitly said "put the entire application along with the database inside a docker container using a compose file." A Postgres-only compose does not satisfy this.
- **Option D deferred:** Valid enhancement but not required by the ask. Windows + Docker bind mounts for Vite HMR is a known pain point. Better as a follow-up.

---

## 2. Deliberate Mode Sections

### Pre-mortem: 3 Failure Scenarios

#### Scenario 1: "The ghost database"
- **Trigger:** 6 months from now, the Postgres container has been running alongside the app but nothing reads or writes to it. A new contributor sees it in compose and is confused about its purpose.
- **Blast radius:** Low -- wasted ~50MB of disk and some confusion. No data corruption or security risk.
- **Prevention:** The plan includes a `FORWARD_PATH.md` section in README and a comment block in `docker-compose.yml` explaining why the DB exists and how to connect a future backend. The DB service also includes a healthcheck so `docker compose ps` clearly shows its status.

#### Scenario 2: "API key leaked via committed .env"
- **Trigger:** Developer creates `.env` from `.env.example`, fills in `GEMINI_API_KEY`, and commits it because `.env` was not in `.gitignore` (current `.gitignore` has no `.env` entry -- only `*.local` is covered).
- **Blast radius:** HIGH -- Gemini API key exposed in git history. Requires key rotation and history rewriting.
- **Prevention:** Step 5 of this plan explicitly adds `.env` to `.gitignore`. The `.env.example` file contains placeholder values only. A comment in `.env.example` warns against committing the real file.

#### Scenario 3: "Port collision on 8080"
- **Trigger:** Developer runs `npm run dev` (which binds `:3000`) and simultaneously runs `docker compose up` (which maps `:8080`). In the default configuration these do not collide. A collision would only occur if the developer manually sets `WEB_PORT=3000` in `.env`.
- **Blast radius:** Low -- dev friction, no data loss.
- **Prevention:** Default host port is `8080`, avoiding collision with the Vite dev server which binds `:3000`. No developer action is required for the default case. If both must run simultaneously on the same host port (unlikely), the developer can override `WEB_PORT` in `.env`.

### Expanded Test Plan

#### Unit Tests
- Not applicable for this change. No application code is modified. All new files are infrastructure (Dockerfile, compose, nginx config).

#### Integration Tests
- `docker compose up -d` exits 0 and both containers reach `healthy` state within 60 seconds.
- `docker compose exec db pg_isready -U context_lattice` returns 0.
- `docker compose exec db psql -U context_lattice -d context_lattice -c "SELECT 1"` returns `1`.
- `curl -fsS http://localhost:8080` returns HTTP 200 with `<div id="root">` in the body.
- Postgres data persists across `docker compose down` + `docker compose up -d` (without `-v` flag).

#### E2E Tests
- `curl -sI http://localhost:8080 | grep -E '^HTTP/' | grep -q '200'` succeeds (HTTP 200 from nginx).
- `curl -fsS http://localhost:8080 | grep -o '<div id="root">'` returns `<div id="root">` (SPA entry point present).
- `curl -fsS http://localhost:8080 | grep -c 'Context Lattice'` returns >= 1 (page title appears in built HTML).
- **(manual smoke test)** SPA loaded at `http://localhost:8080` in a browser renders the StartPage and navigation to Settings view works.
- **(manual smoke test)** If `GEMINI_API_KEY` was provided at build time, the LLM provider initializes (verify via browser console -- no `API_KEY is not set` errors).
- **(manual smoke test)** Ollama connectivity (if configured in settings) still works from the containerized SPA (browser makes the request, not the container, so this should be unchanged).

#### Observability
- `docker compose ps` shows both services with health status.
- `docker compose logs web` shows nginx access logs.
- `docker compose logs db` shows Postgres startup logs with "database system is ready to accept connections."
- Postgres healthcheck runs every 5 seconds; unhealthy state is visible in `docker compose ps` within 15 seconds of DB failure.

---

## 3. Recommended Option + ADR

### Architecture Decision Record

| Field | Value |
|-------|-------|
| **Decision** | Option A: Compose-only dockerization. Multi-stage Dockerfile for the SPA (build with node:20-alpine, serve with nginx:alpine). Postgres 16 as a second compose service. Shared bridge network. Named volume for data persistence. |
| **Drivers** | (1) Literal scope fidelity -- deliver what was asked. (2) Incremental risk -- one infra change at a time. (3) Time to working state -- verifiable in minutes, not days. |
| **Alternatives considered** | Option B (backend service) -- rejected: scope explosion, user did not request it. Option C (Postgres only) -- rejected: does not satisfy "put entire app in container." Option D (dev+prod profiles) -- deferred: Windows HMR reliability concern, can be added later. |
| **Why chosen** | Option A is the only option that satisfies both halves of the user's request without inventing unrequested scope. It establishes the infrastructure foundation (compose, networking, volumes) that Options B and D can build on incrementally. |
| **Consequences** | The Postgres database will run but have no consumer until a backend service is added. This is explicitly documented. The production image is static files only -- the container runs nginx serving pre-built assets with no Node.js runtime, which is appropriate for production but means no HMR in the container. |
| **Follow-ups** | (1) Add a backend service (Option B) when persistence requirements are defined. (2) Add a dev compose profile (Option D) if container-based development is desired. (3) Consider replacing CDN Tailwind with a build-time Tailwind install for offline container builds. (4) Evaluate replacing build-time API key injection with a runtime config approach. |

---

## 4. Concrete Implementation Plan

### Step 1: Create `.dockerignore`

**File:** `c:\Users\reyno\Projects\CL_Intelligent_Orchestration\.dockerignore`

**Content shape:**
```
node_modules
dist
dist-ssr
.git
.gitignore
.env
.env.*
.claude
.omc
.vscode
*.md
*.log
```

**Rationale:** Prevents bloating the Docker build context. `node_modules` is the big one (~150MB+ for this project). Excluding `.env*` prevents secrets from entering the image layer.

**Verification:** `docker build` context size should be small (< 5MB). Visible in Docker build output.

---

### Step 2: Create nginx configuration for SPA

**File:** `c:\Users\reyno\Projects\CL_Intelligent_Orchestration\nginx.conf`

**Content shape:**
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback -- all routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
```

**Rationale:** The `try_files` fallback is essential if a client-side router is added later. Without it, direct navigation to any non-root URL returns 404. The static asset caching is standard practice. Security headers are minimal best practice.

**Verification:** After `docker compose up`, `curl -I http://localhost:8080` shows `X-Frame-Options` and `X-Content-Type-Options` headers.

---

### Step 3: Create multi-stage Dockerfile

**File:** `c:\Users\reyno\Projects\CL_Intelligent_Orchestration\Dockerfile`

**Content shape:**
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG GEMINI_API_KEY=""
ENV GEMINI_API_KEY=${GEMINI_API_KEY}
# Promote ARG to ENV so Vite's loadEnv() picks it up during 'npm run build'.
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:80/ || exit 1
```

**Key decisions:**
- `npm ci` (not `npm install`) for reproducible builds from lockfile.
- `GEMINI_API_KEY` passed as a build arg so Vite's `define` can compile it into the bundle. This mirrors the existing `vite.config.ts` behavior. The arg defaults to empty string so builds succeed without a key (the SPA handles missing keys gracefully via ConfigureBanner).
- `nginx:alpine` is ~7MB. No Node.js in the production image.
- Healthcheck uses `wget` (available in alpine) instead of `curl`.

**Verification:** `docker build -t context-lattice .` completes without errors. `docker run --rm context-lattice ls /usr/share/nginx/html` shows `index.html` and `assets/`.

---

### Step 4: Create `docker-compose.yml`

**File:** `c:\Users\reyno\Projects\CL_Intelligent_Orchestration\docker-compose.yml`

**Content shape:**
```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: cl-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-context_lattice}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-context_lattice_dev}
      POSTGRES_DB: ${POSTGRES_DB:-context_lattice}
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-context_lattice}"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s
    networks:
      - cl-network

  web:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        GEMINI_API_KEY: ${GEMINI_API_KEY:-}
    container_name: cl-web
    restart: unless-stopped
    ports:
      # Host port 8080 -> Container port 80 (nginx)
      # Deliberately NOT 3000 to avoid collision with 'npm run dev' (Vite dev server).
      - "${WEB_PORT:-8080}:80"
    # Add 'depends_on: db (condition: service_healthy)' when a backend service is introduced that consumes the database.
    networks:
      - cl-network

volumes:
  # Named volume for Postgres data persistence.
  # Data survives 'docker compose down' but is removed by 'docker compose down -v'.
  # Named volumes are managed by Docker (stored in /var/lib/docker/volumes/)
  # and are preferred over bind mounts for database data because:
  #   1. Better I/O performance (no filesystem translation layer)
  #   2. No host path coupling
  #   3. Portable across machines
  pgdata:

networks:
  cl-network:
    driver: bridge
```

**Key decisions:**
- `postgres:16-alpine` -- latest LTS, minimal image.
- Environment variables use `${VAR:-default}` syntax so compose works without a `.env` file (using dev defaults). Production overrides via `.env`.
- `depends_on: db` is **not** included on the `web` service because the SPA does not connect to Postgres. A YAML comment marks where to add `depends_on: db (condition: service_healthy)` when a backend service is introduced.
- Port `${WEB_PORT:-8080}:80` maps host 8080 to nginx's port 80 inside the container. Port 8080 is chosen deliberately to avoid collision with `npm run dev` (Vite dev server on port 3000). Override via `WEB_PORT` in `.env`.
- The `version` key is omitted. Compose V2 ignores it and emits a deprecation warning.
- Named volume `pgdata` chosen over bind mount for the reasons documented in the compose file.

**Verification:** `docker compose config` validates the file without errors. `docker compose up -d` starts both services.

---

### Step 5: Create `.env.example`

**File:** `c:\Users\reyno\Projects\CL_Intelligent_Orchestration\.env.example`

**Content shape:**
```bash
# Context Lattice - Environment Variables
# Copy this file to .env and fill in your values.
# NEVER commit .env to version control.

# -- Postgres --
POSTGRES_USER=context_lattice
POSTGRES_PASSWORD=context_lattice_dev
POSTGRES_DB=context_lattice
POSTGRES_PORT=5432

# -- Web Port --
# Host port for the containerized SPA (mapped to nginx port 80 inside the container).
# Default is 8080 to avoid collision with 'npm run dev' (Vite on port 3000).
WEB_PORT=8080

# ============================================================================
# SECURITY WARNING — READ BEFORE SETTING
# ============================================================================
# The GEMINI_API_KEY is compiled into the JavaScript bundle at build time and
# embedded in the Docker image. Anyone with access to the image or the served
# files can extract the key.
#
# Do NOT bake a production API key into the image.
#
# For local development, prefer entering the key via Settings at runtime
# (stored in browser localStorage, not in the image), or use Ollama which
# runs locally and needs no key.
# ============================================================================
GEMINI_API_KEY=your_gemini_api_key_here
```

**Verification:** File exists and contains only placeholder values.

---

### Step 6: Update `.gitignore`

**File:** `c:\Users\reyno\Projects\CL_Intelligent_Orchestration\.gitignore`

**Changes:** Append the following block:

```gitignore

# Environment files (secrets)
.env
.env.local
.env.*.local
```

**Rationale:** The current `.gitignore` has `*.local` which covers `.env.local` but does NOT cover a bare `.env` file. Docker compose reads from `.env` by default, so this file will exist and must be ignored.

**Verification:** `git status` does not show `.env` as untracked after creating it. `git check-ignore .env` returns `.env`.

---

### Step 7: Update `README.md`

**File:** `c:\Users\reyno\Projects\CL_Intelligent_Orchestration\README.md`

**Changes:** Add a new section after the existing "Run Locally" section:

```markdown
## Run with Docker Compose

**Prerequisites:** Docker and Docker Compose

## Security Warning

> **The `GEMINI_API_KEY` is compiled into the JavaScript bundle at build time and embedded in the Docker image.** Anyone with access to the image or the served files can extract the key. Do **not** bake a production API key into the image.
>
> For local development, prefer entering the key via **Settings** at runtime (stored in browser localStorage, not in the image), or use **Ollama** which runs locally and needs no key.

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
2. (Optional) Edit `.env` to set your `GEMINI_API_KEY` and Postgres credentials.

3. Build and start all services:
   ```bash
   docker compose up -d --build
   ```

4. Verify both services are healthy:
   ```bash
   docker compose ps
   ```

5. Open the app: [http://localhost:8080](http://localhost:8080)

6. Connect to the database (for development/debugging):
   ```bash
   docker compose exec db psql -U context_lattice -d context_lattice
   ```

### Stopping and Cleanup

```bash
# Stop services (data persists in pgdata volume)
docker compose down

# Stop services AND delete database data
docker compose down -v
```

### Architecture Note

The Postgres database is provisioned for future backend services. The current SPA runs entirely in the browser and does not connect to the database directly. See the forward-path section in `docker-compose.yml` comments for how to add a backend service that consumes the database.
```

**Verification:** README renders correctly on GitHub. New section is visible.

---

### Step 8: Add forward-path documentation (comment block in compose)

This is already included in the `docker-compose.yml` above as comments. Additionally, add a brief section at the bottom of the compose file:

```yaml
# === FORWARD PATH ===
# To add a backend service that consumes Postgres:
#
#   api:
#     build:
#       context: ./api
#       dockerfile: Dockerfile
#     environment:
#       DATABASE_URL: postgres://${POSTGRES_USER:-context_lattice}:${POSTGRES_PASSWORD:-context_lattice_dev}@db:5432/${POSTGRES_DB:-context_lattice}
#     ports:
#       - "4000:4000"
#     depends_on:
#       db:
#         condition: service_healthy
#     networks:
#       - cl-network
#
# The 'web' service would then proxy API requests via nginx:
#   location /api/ {
#       proxy_pass http://api:4000/;
#   }
```

**Verification:** `docker compose config` still validates after adding comments.

---

## 5. Acceptance Criteria

- [ ] `docker compose up -d --build` exits 0 and both containers report healthy within 60 seconds
- [ ] `docker compose exec db pg_isready -U context_lattice` returns 0
- [ ] `docker compose exec db psql -U context_lattice -d context_lattice -c "SELECT 1"` returns a row with value `1`
- [ ] `curl -sI http://localhost:8080 | grep -E '^HTTP/' | grep -q '200'` succeeds (HTTP 200)
- [ ] `curl -fsS http://localhost:8080 | grep -o '<div id="root">'` returns `<div id="root">`
- [ ] `curl -fsS http://localhost:8080 | grep -c 'Context Lattice'` returns >= 1 (page title in built HTML)
- [ ] `.env` is gitignored: `git check-ignore .env` returns `.env`
- [ ] `.env` is NOT committed: `git ls-files .env` returns empty
- [ ] `docker compose down -v` cleanly removes containers and the `pgdata` volume (verify with `docker volume ls | grep pgdata` returning empty)
- [ ] Removing the `db` service from compose does not break the `web` service build: `docker compose up web -d --build` succeeds (no `depends_on` to remove -- services are already independent)
- [ ] README documents the Docker Compose workflow
- [ ] No existing source files (`.ts`, `.tsx`) are modified
- [ ] Multi-stage Dockerfile produces a final image under 50MB (nginx:alpine + static assets)
- [ ] Postgres data persists across `docker compose down` followed by `docker compose up -d` (without `-v`)

---

## 6. Verification Steps (Copy-Pasteable)

Run these in order from the project root:

```bash
# 1. Create .env from template
cp .env.example .env

# 2. (Optional) Edit .env to add your GEMINI_API_KEY
# nano .env

# 3. Verify .env is gitignored
git check-ignore .env
# Expected: .env

# 4. Validate compose file
docker compose config --quiet
# Expected: no output (success)

# 5. Build and start
docker compose up -d --build
# Expected: both services created and started

# 6. Wait for healthy state (poll for up to 60s)
timeout 60 bash -c 'until docker compose ps | grep -q "healthy"; do sleep 2; done'
# Expected: exits before timeout

# 7. Check service health
docker compose ps
# Expected: cl-postgres (healthy), cl-web (healthy)

# 8. Test Postgres connectivity
docker compose exec db pg_isready -U context_lattice
# Expected: /var/run/postgresql:5432 - accepting connections

# 9. Test Postgres query
docker compose exec db psql -U context_lattice -d context_lattice -c "SELECT 1 AS ok"
# Expected:  ok
#            ----
#             1

# 10. Test web server
curl -fsS http://localhost:8080 | grep -o '<div id="root">'
# Expected: <div id="root">

# 10b. Verify page title
curl -fsS http://localhost:8080 | grep -c 'Context Lattice'
# Expected: >= 1

# 11. Check response headers
curl -sI http://localhost:8080 | grep -E "(HTTP|X-Frame|X-Content-Type)"
# Expected:
#   HTTP/1.1 200 OK
#   X-Frame-Options: SAMEORIGIN
#   X-Content-Type-Options: nosniff

# 12. Check final image size
docker images context-lattice --format "{{.Size}}"
# Expected: < 50MB (typically ~25-35MB)

# 13. Test data persistence
docker compose down
docker compose up -d
docker compose exec db psql -U context_lattice -d context_lattice -c "SELECT 1 AS ok"
# Expected: query returns 1 (Postgres restarted with data intact)

# 14. Full cleanup
docker compose down -v
docker volume ls | grep pgdata
# Expected: no output (volume removed)
```

---

## 7. Risks & Mitigations

| Severity | Risk | Mitigation |
|----------|------|------------|
| **HIGH** | `.env` committed to git with real API key or DB password | Step 6 adds `.env` to `.gitignore`. `.env.example` contains only placeholders. Pre-mortem scenario 2 documents this. |
| **LOW** | Port collision between host `npm run dev` and container nginx | Default host port is 8080. Port 3000 (Vite dev) and 8080 (containerized SPA) do not collide. |
| **MEDIUM** | Tailwind CDN unavailable inside container (no internet during build or at runtime) | The CDN script is in `index.html` and loaded by the browser at runtime, not at build time. If the user's browser has internet, it works. If offline container builds are needed, Tailwind should be installed as a build dependency (noted in follow-ups). |
| **LOW** | `npm ci` fails because `package-lock.json` is out of date or missing | `package-lock.json` exists in the repo (visible in git status as untracked/new). Step 3 copies it into the builder stage. If it is missing, the Dockerfile must use `npm install` instead. |
| **LOW** | Docker Desktop not installed on developer machine | README lists Docker as a prerequisite. `docker compose` command will fail with a clear error if Docker is not installed. |
| **LOW** | Postgres container consumes resources with no consumer | Postgres 16 alpine idle memory is ~30MB. Negligible. Forward-path documentation explains the purpose. |
| **LOW** | `importmap` in `index.html` loads React and @google/genai from CDN at runtime | This is the existing behavior, unchanged by containerization. The Vite build resolves imports at build time, so the importmap in `index.html` (lines 164-173) is only used if Vite's bundling does not override it. No action needed. |
| **LOW** | Google Fonts CDN dependency (`fonts.googleapis.com` and `fonts.gstatic.com` in `index.html:9-11`) | The browser loads fonts at runtime from Google's CDN. If offline, the browser falls back to system fonts gracefully. If true offline operation is needed, bundle the fonts as a build dependency. |

---

## 8. Out of Scope (Explicit)

The following items are NOT delivered by this plan:

- **Backend API service** -- No Express/Fastify/Node server. No `/api/*` routes. No ORM. No migration tooling.
- **Database schema or migrations** -- Postgres is provisioned empty. No tables, no seed data, no Prisma/Drizzle/Knex.
- **Authentication or authorization** -- No user accounts, no JWT, no session management.
- **Production deployment** -- This is a local development setup. No cloud provider config, no CI/CD pipeline, no TLS/HTTPS.
- **Vite HMR in container** -- The production image runs nginx, not `vite dev`. Hot module replacement requires running `npm run dev` on the host. A dev compose profile (Option D) is noted as a follow-up.
- **Hot reload bind mount** -- No source code bind mount into the container. Changes require `docker compose up --build`.
- **TLS/HTTPS** -- nginx serves HTTP only. TLS termination would be handled by a reverse proxy in production.
- **Replacing build-time API key injection** -- The `GEMINI_API_KEY` is still compiled into the client bundle at build time via Vite `define`. This is a known security concern but out of scope for this plan.
- **Offline builds** -- Tailwind is loaded via CDN at runtime in the browser. If fully offline operation is needed, Tailwind must be added as a build dependency.
- **Docker Compose watch / dev mode** -- `docker compose watch` for auto-rebuild on file changes is not configured. This is a possible follow-up.

---

## Files Created/Modified Summary

| Action | File | Notes |
|--------|------|-------|
| CREATE | `Dockerfile` | Multi-stage: node:20-alpine builder -> nginx:alpine |
| CREATE | `.dockerignore` | Excludes node_modules, .git, .env, etc. |
| CREATE | `docker-compose.yml` | Two services: `db` (postgres:16-alpine), `web` (nginx) |
| CREATE | `nginx.conf` | SPA-ready nginx config with fallback routing |
| CREATE | `.env.example` | Template with placeholder values |
| MODIFY | `.gitignore` | Append `.env`, `.env.local`, `.env.*.local` |
| MODIFY | `README.md` | Add "Run with Docker Compose" section |

**Total: 5 new files, 2 modified files. Zero application source code changes.**
