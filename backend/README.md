# AI Webnovel Generator — Backend (FastAPI + Multi-Agent)

Python FastAPI backend that runs the 5-agent webnovel generation pipeline. Deploy to **Railway.app** (free tier friendly — only consumes CPU when a generate request arrives).

## 5 Agents

| # | Agent | Provider | Model | Task |
|---|-------|----------|-------|------|
| 1 | World Architect | Groq | Llama-3.3-70b-Versatile | Builds Story Bible JSON from the core idea |
| 2 | Outline Plotter | Groq | Llama-3.3-70b-Versatile | Breaks Bible into per-chapter outlines with conflicts + cliffhangers |
| 3 | Creative Novelist | Google Gemini | Gemini 1.5 Pro | Writes each chapter (1000+ words, short paragraphs, dialogue-heavy, cliffhanger) using large context window for memory |
| 4 | Chief Editor | OpenRouter | DeepSeek-V3 | Proofreads, smooths diction, fixes grammar/logic |
| 5 | Quality Controller | OpenRouter | DeepSeek-V3 | Anti-AI & plagiarism gate. Rejects AI cliches, checks burstiness, enforces show-don't-tell. Loops back to Agent 3 on REJECT |

## Chaining Context Memory

For each chapter, the orchestrator assembles a prompt package from Supabase:
1. The Story Bible JSON (Agent 1 output) — characters & world stay consistent.
2. Summaries of all previously approved chapters — prevents plot holes.
3. The specific chapter outline.
4. A 15-second `time.sleep` between chapters to avoid free-tier rate limits.

## Deploy to Railway.app

1. Push this `backend/` folder to a private GitHub repo.
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo.
3. Set environment variables (see `.env.example`):
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (from your Supabase project)
   - `CORS_ORIGINS` = your Vercel frontend URL
4. Railway auto-detects `railway.json` and builds with Nixpacks. The `Dockerfile` is also provided as fallback.
5. Once deployed, copy the Railway URL (e.g. `https://your-app.up.railway.app`) and set it as `NEXT_PUBLIC_BACKEND_URL` in your Vercel frontend env vars.

## API Endpoints

- `POST /generate` — `{ project_id, batch_size }` → starts a batch (on-demand). Returns stream URL.
- `GET /stream/{project_id}` — SSE stream of live log events.
- `GET /status/{project_id}` — whether a job is currently running.
- `GET /health` — healthcheck.

## On-Demand Resource Usage

The server only does work when `POST /generate` is called. Between requests it sits idle (passive standby), conserving the $5 free Railway credits. Generation runs as a background `asyncio` task; progress is streamed to the frontend via SSE and persisted to Supabase so nothing is lost if the connection drops.
