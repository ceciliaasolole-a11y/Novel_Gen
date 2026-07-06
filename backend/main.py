"""FastAPI main entrypoint for the AI Webnovel Generator backend."""
import asyncio
import json
from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from config import CORS_ORIGINS, BATCH_SIZE
from orchestrator import run_batch, log_to_db

app = FastAPI(title="AI Webnovel Generator Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    project_id: str
    batch_size: int = 5


# In-memory job tracker (single worker; fine for personal use)
_running_jobs: dict[str, asyncio.Task] = {}


@app.get("/")
async def root():
    return {"status": "ok", "service": "ai-webnovel-generator-backend"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/generate")
async def generate(req: GenerateRequest, background_tasks: BackgroundTasks):
    """Start a batch generation job. Returns immediately; stream progress via /stream/{id}."""
    if req.project_id in _running_jobs and not _running_jobs[req.project_id].done():
        return JSONResponse({"error": "A generation job is already running for this project."}, status_code=409)

    task = asyncio.create_task(run_batch_job(req.project_id, req.batch_size or BATCH_SIZE))
    _running_jobs[req.project_id] = task
    return {"status": "started", "project_id": req.project_id, "stream": f"/stream/{req.project_id}"}


async def run_batch_job(project_id: str, batch_size: int):
    """Background task that runs the pipeline and writes logs to DB."""
    try:
        async for event in run_batch(project_id, batch_size):
            # Events are yielded to SSE clients via DB polling; nothing else needed here.
            pass
    except Exception as e:
        await log_to_db(project_id, "System", f"Fatal error: {e}", None, "error")


@app.get("/stream/{project_id}")
async def stream(project_id: str):
    """SSE endpoint: streams generation events to the frontend Live Monitor."""
    async def event_gen():
        # Send an initial hello so the client knows the connection is live
        yield f"data: {json.dumps({'type': 'connected', 'project_id': project_id})}\n\n"

        # Stream while a job is running; poll DB for new logs
        import time
        last_log_time = None
        job = _running_jobs.get(project_id)
        running = job is not None and not job.done()

        timeout = 3600  # 1 hour max
        start = time.time()
        while running and (time.time() - start) < timeout:
            from config import supabase
            q = supabase.table("generation_logs").select("*").eq("project_id", project_id).order("created_at", ascending=True).limit(200)
            if last_log_time:
                q = q.gt("created_at", last_log_time)
            res = q.execute()
            for row in (res.data or []):
                last_log_time = row["created_at"]
                yield f"data: {json.dumps({'type': 'log', 'agent': row['agent'], 'message': row['message'], 'chapter_number': row.get('chapter_number'), 'level': row['level']})}\n\n"
            await asyncio.sleep(2)
            job = _running_jobs.get(project_id)
            running = job is not None and not job.done()

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_gen(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    })


@app.get("/status/{project_id}")
async def status(project_id: str):
    job = _running_jobs.get(project_id)
    return {"running": job is not None and not job.done()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
