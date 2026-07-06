"""Orchestrator: runs the 5-agent pipeline for a batch of chapters."""
import asyncio
import time
from typing import AsyncGenerator
from config import supabase, BATCH_SIZE, RATE_LIMIT_SLEEP, MAX_REVISION_LOOPS
from agents import (
    agent1_world_architect, agent2_outline_plotter, agent3_creative_novelist,
    agent4_chief_editor, agent5_quality_controller, summarize_chapter,
)


def make_logger(project_id: str):
    """Returns a sync log function that schedules an async DB write (fire-and-forget)."""
    def log(agent: str, message: str, chapter_number, level: str = "info"):
        try:
            asyncio.get_running_loop().create_task(
                log_to_db(project_id, agent, message, chapter_number, level)
            )
        except RuntimeError:
            # No running loop — write synchronously
            asyncio.run(log_to_db(project_id, agent, message, chapter_number, level))
    return log


async def log_to_db(project_id: str, agent: str, message: str, chapter_number, level: str):
    try:
        supabase.table("generation_logs").insert({
            "project_id": project_id, "agent": agent, "message": message,
            "level": level, "chapter_number": chapter_number,
        }).execute()
    except Exception as e:
        print(f"[log_to_db] failed: {e}")


async def get_or_build_bible(project: dict, user_id: str, log) -> dict:
    """Fetch existing Story Bible or run Agent 1 to create it."""
    res = supabase.table("story_bibles").select("*").eq("project_id", project["id"]).maybeSingle().execute()
    if res.data and res.data.get("content"):
        log("System", "Story Bible ditemukan di database. Melewati Agent 1.", None, "info")
        return res.data["content"]
    bible = await agent1_world_architect(project, user_id, log)
    supabase.table("story_bibles").insert({
        "project_id": project["id"], "content": bible,
    }).execute()
    return bible


async def get_or_build_outlines(project: dict, bible: dict, user_id: str, log) -> list[dict]:
    """Fetch existing chapter rows or run Agent 2 to create outlines."""
    res = supabase.table("chapters").select("*").eq("project_id", project["id"]).order("chapter_number", ascending=True).execute()
    existing = res.data or []
    if existing:
        log("System", f"Ditemukan {len(existing)} bab di database. Melewati Agent 2.", None, "info")
        return existing
    outlines = await agent2_outline_plotter(project, bible, user_id, log)
    rows = [{
        "project_id": project["id"],
        "chapter_number": o["chapter_number"],
        "title": o.get("title", f"Chapter {o['chapter_number']}"),
        "outline": o.get("summary", ""),
        "summary": None,
        "content": None,
        "status": "pending",
    } for o in outlines]
    supabase.table("chapters").insert(rows).execute()
    # Re-fetch to get full rows with ids
    res2 = supabase.table("chapters").select("*").eq("project_id", project["id"]).order("chapter_number", ascending=True).execute()
    return res2.data or []


async def get_prev_summaries(project_id: str, up_to: int) -> list[str]:
    res = supabase.table("chapters").select("summary").eq("project_id", project_id).eq("status", "approved").lt("chapter_number", up_to).order("chapter_number", ascending=True).execute()
    return [r["summary"] for r in (res.data or []) if r.get("summary")]


async def process_chapter(project: dict, bible: dict, chapter: dict, user_id: str, log) -> bool:
    """Run agents 3->4->5 (with revision loop) for a single chapter. Returns True if approved."""
    ch_num = chapter["chapter_number"]
    outline = {
        "chapter_number": ch_num,
        "title": chapter.get("title", ""),
        "summary": chapter.get("outline", ""),
        "conflict": "",
        "cliffhanger": "",
    }
    prev_summaries = await get_prev_summaries(project["id"], ch_num)

    supabase.table("chapters").update({"status": "drafting"}).eq("id", chapter["id"]).execute()

    revision_notes = None
    for attempt in range(MAX_REVISION_LOOPS + 1):
        # Agent 3
        content = await agent3_creative_novelist(project, bible, outline, prev_summaries, revision_notes, log, ch_num, user_id)
        supabase.table("chapters").update({"content": content, "status": "editing", "revision_count": attempt}).eq("id", chapter["id"]).execute()

        # Agent 4
        content = await agent4_chief_editor(content, bible, ch_num, log, user_id)
        supabase.table("chapters").update({"content": content, "status": "reviewing"}).eq("id", chapter["id"]).execute()

        # Agent 5
        qc = await agent5_quality_controller(content, ch_num, log, user_id)
        verdict = qc.get("verdict", "REJECT").upper()
        if "APPROVED" in verdict:
            summary = await summarize_chapter(content, ch_num, log, user_id)
            wc = len(content.split())
            supabase.table("chapters").update({
                "content": content, "summary": summary, "status": "approved",
                "word_count": wc,
            }).eq("id", chapter["id"]).execute()
            return True

        revision_notes = qc.get("revision_notes", "Rewrite to fix AI patterns and improve burstiness.")
        supabase.table("chapters").update({"status": "rejected", "revision_count": attempt + 1}).eq("id", chapter["id"]).execute()
        if attempt >= MAX_REVISION_LOOPS:
            log("Quality Controller", f"Bab {ch_num} melebihi batas revisi ({MAX_REVISION_LOOPS}x). Menyimpan draf terbaik.", ch_num, "warning")
            summary = await summarize_chapter(content, ch_num, log, user_id)
            wc = len(content.split())
            supabase.table("chapters").update({
                "content": content, "summary": summary, "status": "approved",
                "word_count": wc,
            }).eq("id", chapter["id"]).execute()
            return True
    return False


async def run_batch(project_id: str, batch_size: int = BATCH_SIZE) -> AsyncGenerator[dict, None]:
    """Main entry: run a batch of chapters through the pipeline. Yields SSE events."""
    log = make_logger(project_id)

    project_res = supabase.table("projects").select("*").eq("id", project_id).maybeSingle().execute()
    if not project_res.data:
        yield {"type": "error", "message": "Project not found"}
        return
    project = project_res.data
    user_id = project.get("user_id")

    supabase.table("projects").update({"status": "generating"}).eq("id", project_id).execute()
    log("System", f"Memulai batch generation untuk '{project['title']}'", None, "info")
    yield {"type": "log", "agent": "System", "message": f"Memulai batch generation untuk '{project['title']}'", "chapter_number": None, "level": "info"}

    # Agent 1
    bible = await get_or_build_bible(project, user_id, log)
    yield {"type": "log", "agent": "System", "message": "Story Bible siap.", "chapter_number": None, "level": "success"}

    # Agent 2
    chapters = await get_or_build_outlines(project, bible, user_id, log)
    yield {"type": "log", "agent": "System", "message": f"Outline {len(chapters)} bab siap.", "chapter_number": None, "level": "success"}

    # Find next chapters to process (not approved), up to batch_size
    pending = [c for c in chapters if c["status"] != "approved"][:batch_size]
    if not pending:
        yield {"type": "log", "agent": "System", "message": "Semua bab sudah approved. Tidak ada yang perlu digenerate.", "chapter_number": None, "level": "info"}
        yield {"type": "done", "message": "Nothing to generate"}
        supabase.table("projects").update({"status": "completed"}).eq("id", project_id).execute()
        return

    yield {"type": "log", "agent": "System", "message": f"Memproses {len(pending)} bab: Bab {pending[0]['chapter_number']}-{pending[-1]['chapter_number']}", "chapter_number": None, "level": "info"}

    for i, chapter in enumerate(pending):
        ch_num = chapter["chapter_number"]
        # Rate limit sleep between chapters
        if i > 0:
            log("System", f"Jeda {RATE_LIMIT_SLEEP} detik untuk mencegah rate limit...", ch_num, "info")
            yield {"type": "log", "agent": "System", "message": f"Jeda {RATE_LIMIT_SLEEP} detik untuk mencegah rate limit...", "chapter_number": ch_num, "level": "info"}
            await asyncio.sleep(RATE_LIMIT_SLEEP)

        # Re-fetch chapter to get latest id (in case it was just created)
        ch_res = supabase.table("chapters").select("*").eq("project_id", project_id).eq("chapter_number", ch_num).maybeSingle().execute()
        if not ch_res.data:
            continue
        chapter = ch_res.data

        approved = await process_chapter(project, bible, chapter, user_id, log)
        if approved:
            yield {"type": "chapter_approved", "chapter_number": ch_num, "message": f"Bab {ch_num} APPROVED dan disimpan."}

    # Update project status
    all_res = supabase.table("chapters").select("status").eq("project_id", project_id).execute()
    all_chs = all_res.data or []
    all_approved = all(c["status"] == "approved" for c in all_chs) and len(all_chs) >= project["target_chapters"]
    supabase.table("projects").update({"status": "completed" if all_approved else "paused"}).eq("id", project_id).execute()
    yield {"type": "done", "message": "Batch selesai."}
