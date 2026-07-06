"""LLM provider clients: Groq, Gemini, OpenRouter."""
import httpx
from typing import Optional

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


async def groq_chat(api_key: str, system: str, user: str, model: str = "llama-3.3-70b-versatile",
                   temperature: float = 0.8, max_tokens: int = 8000) -> str:
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    async with httpx.AsyncClient(timeout=180) as c:
        r = await c.post(GROQ_URL, headers=headers, json=payload)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]


async def gemini_chat(api_key: str, system: str, user: str, model: str = "gemini-1.5-pro",
                     temperature: float = 0.9, max_output_tokens: int = 8192) -> str:
    url = f"{GEMINI_URL}/{model}:generateContent?key={api_key}"
    payload = {
        "system_instruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": {"temperature": temperature, "maxOutputTokens": max_output_tokens},
    }
    async with httpx.AsyncClient(timeout=300) as c:
        r = await c.post(url, json=payload)
        r.raise_for_status()
        data = r.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]


async def openrouter_chat(api_key: str, system: str, user: str, model: str = "deepseek/deepseek-chat-v3-0324",
                          temperature: float = 0.7, max_tokens: int = 8000) -> str:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://webnovel-generator.local",
        "X-Title": "AI Webnovel Generator",
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    async with httpx.AsyncClient(timeout=300) as c:
        r = await c.post(OPENROUTER_URL, headers=headers, json=payload)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]
