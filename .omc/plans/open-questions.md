# Open Questions

## Settings Intelligence Engine - 2026-05-18

- [ ] Should Gemini model be user-selectable (e.g., gemini-2.5-pro, gemini-2.0-flash) or stay hardcoded to gemini-2.5-flash? — Affects Settings UI complexity and cost exposure.
- [ ] What minimum Ollama model size should the UI recommend? 7B works for simple JSON, but complex schemas (like AgentDesignResponse with nested arrays) may need 13B+. — Affects user guidance text.
- [ ] Should the build-time `GEMINI_API_KEY` fallback be deprecated in a future iteration or kept permanently? — Affects whether `vite.config.ts` `define` block is eventually cleaned up.
- [ ] Is `sessionStorage` preferable to `localStorage` for API key persistence in any target deployment scenario? Session storage clears on tab close, reducing exposure window. — Affects settings hook implementation.
- [ ] Should a per-request timeout be enforced (e.g., 60s for Ollama calls on slow hardware)? Currently no timeout exists in either path. — Affects user experience on underpowered machines.
- [ ] Does the Tailwind CDN script need a Content Security Policy exception for the Ollama localhost fetch, or is the current CSP permissive enough? — Affects production deployment guidance.

## Docker + Postgres Containerization - 2026-05-18

- [x] ~~Should the `web` service's `depends_on: db` be kept even though the SPA does not connect to Postgres?~~ **RESOLVED (Iteration 2):** Architect edit #1 removed `depends_on: db`. A YAML comment marks where to re-add it when a backend service is introduced.
- [ ] Should a dev compose profile (Option D) with Vite HMR via bind mount be added as a fast follow-up, or deferred until container-based dev is explicitly requested? — Affects developer workflow. Windows + Docker bind mount HMR is unreliable, so it may cause more friction than it solves.
- [ ] Is the Tailwind CDN runtime dependency acceptable for containerized deployments, or should Tailwind be installed as a build dependency for offline builds? — The current setup requires the user's browser to reach `cdn.tailwindcss.com` at page load. If the app must work fully offline or behind a firewall, Tailwind must be bundled.
- [ ] Should the `GEMINI_API_KEY` build arg be required (fail the build if empty) or optional (current behavior, SPA shows ConfigureBanner)? — Affects whether the Docker image is useful without a key baked in.
- [ ] What Postgres version policy should the project follow -- pin to exact (16.x) or track latest alpine? — Affects reproducibility vs. getting security patches automatically.
