"""Configuration & Supabase client for the backend."""
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY", "")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

CORS_ORIGINS = [
    o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()
]

BATCH_SIZE = int(os.getenv("BATCH_SIZE", "5"))
RATE_LIMIT_SLEEP = int(os.getenv("RATE_LIMIT_SLEEP", "15"))
MAX_REVISION_LOOPS = int(os.getenv("MAX_REVISION_LOOPS", "3"))

# Model config
GROQ_MODEL = "llama-3.3-70b-versatile"
GEMINI_MODEL = "gemini-1.5-pro"
OPENROUTER_MODEL = "deepseek/deepseek-chat-v3-0324"  # DeepSeek-V3


def get_api_key(provider: str, user_id: str | None = None) -> str:
    """Fetch an API key from the api_keys table. If user_id is given, scope to that user."""
    q = supabase.table("api_keys").select("api_key").eq("provider", provider)
    if user_id:
        q = q.eq("user_id", user_id)
    res = q.maybeSingle().execute()
    if not res.data:
        raise RuntimeError(
            f"API key for provider '{provider}' not configured. "
            f"Set it in the frontend API Keys page."
        )
    return res.data["api_key"]


def get_project_user_id(project_id: str) -> str | None:
    """Fetch the user_id that owns a project, so we can load their API keys."""
    res = supabase.table("projects").select("user_id").eq("id", project_id).maybeSingle().execute()
    return res.data.get("user_id") if res.data else None
