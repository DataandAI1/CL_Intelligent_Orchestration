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
