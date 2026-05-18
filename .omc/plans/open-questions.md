# Open Questions

## Settings Intelligence Engine - 2026-05-18

- [ ] Should Gemini model be user-selectable (e.g., gemini-2.5-pro, gemini-2.0-flash) or stay hardcoded to gemini-2.5-flash? — Affects Settings UI complexity and cost exposure.
- [ ] What minimum Ollama model size should the UI recommend? 7B works for simple JSON, but complex schemas (like AgentDesignResponse with nested arrays) may need 13B+. — Affects user guidance text.
- [ ] Should the build-time `GEMINI_API_KEY` fallback be deprecated in a future iteration or kept permanently? — Affects whether `vite.config.ts` `define` block is eventually cleaned up.
- [ ] Is `sessionStorage` preferable to `localStorage` for API key persistence in any target deployment scenario? Session storage clears on tab close, reducing exposure window. — Affects settings hook implementation.
- [ ] Should a per-request timeout be enforced (e.g., 60s for Ollama calls on slow hardware)? Currently no timeout exists in either path. — Affects user experience on underpowered machines.
- [ ] Does the Tailwind CDN script need a Content Security Policy exception for the Ollama localhost fetch, or is the current CSP permissive enough? — Affects production deployment guidance.
