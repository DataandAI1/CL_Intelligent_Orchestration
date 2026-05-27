<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1R-Z8LAUroVMp9QcRjY98Wj3JfuaV2qpe

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Run with Docker Compose

**Prerequisites:** Docker and Docker Compose

### Security Warning

> **The `GEMINI_API_KEY` is compiled into the JavaScript bundle at build time and embedded in the Docker image.** Anyone with access to the image or the served files can extract the key. Do **not** bake a production API key into the image.
>
> For local development, prefer entering the key via **Settings** at runtime (stored in browser localStorage, not in the image), or use **Ollama** which runs locally and needs no key.
>
> The compose-rendered `DATABASE_URL` for the `cl-api` service contains the Postgres credentials. Don't commit a populated `.env` to source control.

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
2. (Optional) Edit `.env` to set your `GEMINI_API_KEY`, Postgres credentials, and the SPA's `VITE_API_BASE_URL`.
3. First-time setup runs the migration profile before bringing up the app:
   ```bash
   docker compose up -d db
   docker compose --profile migrate run --rm migrate
   docker compose up -d --build api web
   ```
4. Verify the API and DB are healthy:
   ```bash
   docker compose ps
   curl -sf http://localhost:4000/api/health
   ```
5. Open the app: [http://localhost:8080](http://localhost:8080)
6. Connect to the database directly (for development/debugging):
   ```bash
   docker compose exec db psql -U context_lattice -d context_lattice
   ```

For daily start after the first-time setup, `docker compose up -d` is sufficient.

### Stopping and Cleanup

```bash
# Stop services (data persists in pgdata volume)
docker compose down

# Stop services AND delete database data
docker compose down -v
```

### Architecture

The stack is three services on a bridge network:

- **db** (`cl-postgres`, port 5432): Postgres 16 with the schema in `server/migrations/`. Tables: `projects`, `requirement_items`, `design_nodes`, `design_edges`, `artifacts`.
- **api** (`cl-api`, port 4000): Node.js + Express + TypeScript backend exposing `/api/projects` CRUD plus nested `/requirements`, `/design`, and `/artifacts` endpoints. Source in `server/`.
- **web** (`cl-web`, port 8080): nginx serving the built Vite SPA. The SPA calls the API at the URL baked in via `VITE_API_BASE_URL` (build arg).

The SPA loads its list of projects from the API on startup, persists requirements when leaving the Requirements step, persists the design (nodes + edges) when leaving the Design step, and persists generated artifacts (project plans, Draw.io XML, markdown exports) when the user produces them. All persistence is best-effort — if the API is unreachable, the SPA logs a warning and the local-only flow continues to work.

### Running the API standalone (without Docker)

Useful for local backend iteration while the SPA runs via `npm run dev`:

```bash
cd server
npm install
DATABASE_URL=postgres://context_lattice:context_lattice_dev@localhost:5432/context_lattice npx node-pg-migrate up
DATABASE_URL=postgres://context_lattice:context_lattice_dev@localhost:5432/context_lattice npm run dev
```

The API listens on `http://localhost:4000` by default. CORS allows `http://localhost:3000` (Vite dev server) out of the box.
