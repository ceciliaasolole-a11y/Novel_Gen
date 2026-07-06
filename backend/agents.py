"""5-Agent pipeline: World Architect, Outline Plotter, Creative Novelist, Chief Editor, Quality Controller."""
import json
from typing import Callable, Optional
from config import supabase, get_api_key, GROQ_MODEL, GEMINI_MODEL, OPENROUTER_MODEL, MAX_REVISION_LOOPS
from llm import groq_chat, gemini_chat, openrouter_chat

LogFn = Callable[[str, str, Optional[int], str], None]


# ---------- Agent 1: World Architect (Groq) ----------
async def agent1_world_architect(project: dict, user_id: str, log: LogFn) -> dict:
    log("World Architect", "Membedah inti cerita menjadi Story Bible...", None, "info")
    system = (
        "You are a World Architect. Given a story core, produce a detailed Story Bible as STRICT JSON. "
        "Include: title, genre, tone, characters (array of {name, role, motivation, appearance, arc}), "
        "world_setting (location, era, rules, factions), main_conflict, themes, and a high-level plot_arc "
        "(array of {act, summary}). Be vivid and specific. Output ONLY valid JSON, no markdown fences."
    )
    user = (
        f"Title: {project['title']}\nGenre: {project['genre']}\nTone: {project['tone']}\n"
        f"Target chapters: {project['target_chapters']}\n\nCore plot:\n{project['core_plot']}\n\n"
        f"Build the Story Bible JSON."
    )
    raw = await groq_chat(get_api_key("groq", user_id), system, user, model=GROQ_MODEL, temperature=0.85, max_tokens=6000)
    text = _strip_fences(raw)
    try:
        bible = json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        bible = json.loads(text[start : end + 1])
    log("World Architect", f"Story Bible selesai: {len(bible.get('characters', []))} karakter, konflik utama ditetapkan.", None, "success")
    return bible


# ---------- Agent 2: Outline Plotter (Groq) ----------
async def agent2_outline_plotter(project: dict, bible: dict, user_id: str, log: LogFn) -> list[dict]:
    log("Outline Plotter", "Menyusun outline per bab dari Story Bible...", None, "info")
    system = (
        "You are an Outline Plotter. Given a Story Bible and a target chapter count, produce a chapter-by-chapter "
        "outline as a JSON array. Each element: {chapter_number, title, summary, conflict, cliffhanger}. "
        "Each chapter must have a clear conflict and an aggressive cliffhanger ending. "
        "Distribute the plot arc evenly across all chapters. Output ONLY valid JSON array, no markdown."
    )
    user = (
        f"Target chapters: {project['target_chapters']}\n\nStory Bible:\n{json.dumps(bible, ensure_ascii=False, indent=2)}\n\n"
        f"Generate the full chapter outline array."
    )
    raw = await groq_chat(get_api_key("groq", user_id), system, user, model=GROQ_MODEL, temperature=0.8, max_tokens=8000)
    text = _strip_fences(raw)
    try:
        outlines = json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("["), text.rfind("]")
        outlines = json.loads(text[start : end + 1])
    log("Outline Plotter", f"Outline {len(outlines)} bab selesai. Setiap bab memiliki konflik & cliffhanger.", None, "success")
    return outlines


# ---------- Agent 3: Creative Novelist (Gemini) ----------
async def agent3_creative_novelist(
    project: dict, bible: dict, outline: dict, prev_summaries: list[str],
    revision_notes: Optional[str], log: LogFn, chapter_number: int, user_id: str,
) -> str:
    if revision_notes:
        log("Creative Novelist", f"REWRITE requested for Bab {chapter_number}. Catatan revisi: {revision_notes[:120]}...", chapter_number, "warning")
    else:
        log("Creative Novelist", f"Menulis draf Bab {chapter_number}: {outline.get('title', '')}...", chapter_number, "info")

    system = (
        "You are a Creative Novelist writing a mobile webnovel. RULES:\n"
        "1. Write in SHORT paragraphs (1-3 sentences max per paragraph).\n"
        "2. Dominated by intense dialogue and direct action. Minimize background narration / info-dumping.\n"
        "3. Each chapter MUST be at least 1000 words.\n"
        "4. End EVERY chapter with an aggressive cliffhanger to hook the reader.\n"
        "5. Stay consistent with the Story Bible and previous chapters — NO plot holes.\n"
        "6. Write in the story's tone. Use vivid, human, natural prose. Avoid AI cliches.\n"
        "7. Output ONLY the chapter prose, no headers, no commentary."
    )
    context = (
        f"=== STORY BIBLE ===\n{json.dumps(bible, ensure_ascii=False, indent=2)}\n\n"
        f"=== PREVIOUS CHAPTERS SUMMARY ===\n" + ("\n".join(f"- {s}" for s in prev_summaries) if prev_summaries else "(first chapter)") + "\n\n"
        f"=== THIS CHAPTER OUTLINE ===\n"
        f"Chapter {outline.get('chapter_number', chapter_number)}: {outline.get('title', '')}\n"
        f"Summary: {outline.get('summary', '')}\n"
        f"Conflict: {outline.get('conflict', '')}\n"
        f"Cliffhanger target: {outline.get('cliffhanger', '')}\n\n"
    )
    if revision_notes:
        context += f"=== REVISION NOTES (rewrite to fix these) ===\n{revision_notes}\n\n"
    context += "Write the full chapter now."

    content = await gemini_chat(
        get_api_key("gemini", user_id), system, context,
        model=GEMINI_MODEL, temperature=0.95, max_output_tokens=8192,
    )
    wc = len(content.split())
    log("Creative Novelist", f"Draf Bab {chapter_number} selesai ({wc} kata).", chapter_number, "success")
    return content


# ---------- Agent 4: Chief Editor (OpenRouter) ----------
async def agent4_chief_editor(content: str, bible: dict, chapter_number: int, log: LogFn, user_id: str) -> str:
    log("Chief Editor", f"Proofreading Bab {chapter_number}...", chapter_number, "info")
    system = (
        "You are a Chief Editor. Polish the draft: smooth diction, fix stiff grammar, correct logical inconsistencies "
        "with the Story Bible, and tighten pacing — WITHOUT rewriting the story or changing plot points. "
        "Keep the webnovel style (short paragraphs, dialogue-heavy). Output ONLY the edited chapter prose, no commentary."
    )
    user = (
        f"=== STORY BIBLE (for consistency) ===\n{json.dumps(bible, ensure_ascii=False, indent=2)}\n\n"
        f"=== DRAFT TO EDIT ===\n{content}\n\nReturn the polished chapter."
    )
    edited = await openrouter_chat(get_api_key("openrouter", user_id), system, user, model=OPENROUTER_MODEL, temperature=0.6, max_tokens=8000)
    log("Chief Editor", f"Bab {chapter_number} selesai di-proofread.", chapter_number, "success")
    return edited


# ---------- Agent 5: Quality Controller (OpenRouter) ----------
async def agent5_quality_controller(content: str, chapter_number: int, log: LogFn, user_id: str) -> dict:
    log("Quality Controller", f"Validasi anti-AI & plagiarisme Bab {chapter_number}...", chapter_number, "info")
    system = (
        "You are an Anti-AI & Plagiarism Quality Controller. You are the FINAL gate. "
        "Evaluate the chapter against these strict rules:\n"
        "1. FORBIDDEN AI cliche words (e.g. delve, testament, tapestry, beacon, symphony of, meticulously, "
        "transformed forever, in the heart of, ultimate sacrifice, woven into, intricate dance, shadows danced).\n"
        "2. BURSTINESS: sentence length must vary — mix short punchy sentences with longer descriptive ones. "
        "REJECT if sentence lengths are uniform.\n"
        "3. SHOW DON'T TELL: convert passive narration into visual physical action. REJECT if too much telling.\n"
        "4. PLAGIARISM: reject if the plot mirrors a famous existing work too closely.\n"
        "5. The text must read as 100% human-written.\n\n"
        "Respond as STRICT JSON: {\"verdict\": \"APPROVED\" | \"REJECT\", \"score\": <0-100>, "
        "\"issues\": [list of specific problems], \"revision_notes\": <specific rewrite instructions, empty if approved>}. "
        "Output ONLY JSON, no markdown."
    )
    user = f"=== CHAPTER TO EVALUATE ===\n{content}\n\nEvaluate now."
    raw = await openrouter_chat(get_api_key("openrouter", user_id), system, user, model=OPENROUTER_MODEL, temperature=0.3, max_tokens=2000)
    text = _strip_fences(raw)
    try:
        result = json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        result = json.loads(text[start : end + 1])

    verdict = result.get("verdict", "REJECT").upper()
    score = result.get("score", 0)
    if "APPROVED" in verdict and score >= 85:
        log("Quality Controller", f"APPROVED Bab {chapter_number} (score {score}/100). 100% human.", chapter_number, "success")
    else:
        issues = result.get("issues", [])
        log("Quality Controller", f"REJECTED Bab {chapter_number} (score {score}/100). Issues: {', '.join(issues[:3])}. Mengirim balik ke Penulis...", chapter_number, "error")
    return result


# ---------- Summary generator (for chaining memory) ----------
async def summarize_chapter(content: str, chapter_number: int, log: LogFn, user_id: str) -> str:
    system = "You are a story summarizer. Produce a concise 2-3 sentence synopsis of the chapter that captures key plot events, character developments, and the cliffhanger. Output only the synopsis."
    user = f"Chapter {chapter_number} content:\n{content}\n\nSummarize."
    summary = await groq_chat(get_api_key("groq", user_id), system, user, model=GROQ_MODEL, temperature=0.4, max_tokens=400)
    log("System", f"Ringkasan Bab {chapter_number} disimpan untuk chaining memory.", chapter_number, "info")
    return summary.strip()


def _strip_fences(raw: str) -> str:
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("```")[1] if "```" in text else text
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    return text
