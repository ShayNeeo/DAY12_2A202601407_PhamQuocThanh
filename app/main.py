"""Agent service — điểm ráp nối của cả lab (CP1, CP3, CP4).

Luồng một request tới /ask:

    client ──► verify_api_key ──► rate_limiter ──► cost_guard
                                                       │
                              store.get_history ◄──────┘
                                       │
                                    ask_llm
                                       │
                              store.append × 2 ──► cost_guard.record ──► log_event
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from functools import lru_cache

from fastapi import Depends, FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from utils.mock_llm import ask_llm

from .auth import verify_api_key
from .config import get_settings
from .cost_guard import CostGuard
from .lifecycle import lifecycle
from .logging_utils import log_event
from .rate_limiter import RateLimiter
from .store import ConversationStore, get_redis_client

SERVICE_NAME = "day12-agent"
SERVICE_VERSION = "1.0.0"


# ─────────────────────────────────────────────────────────────
# Providers — CHO SẴN
# Tách ra thành hàm để test có thể thay bằng Redis giả qua
# app.dependency_overrides, và để kết nối Redis chỉ tạo khi thật sự cần.
# ─────────────────────────────────────────────────────────────
@lru_cache(maxsize=1)
def get_store() -> ConversationStore:
    return ConversationStore(get_redis_client())


@lru_cache(maxsize=1)
def get_rate_limiter() -> RateLimiter:
    return RateLimiter(get_redis_client(), get_settings().rate_limit_per_minute)


@lru_cache(maxsize=1)
def get_cost_guard() -> CostGuard:
    return CostGuard(get_redis_client(), get_settings().monthly_budget_usd)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """CHO SẴN — chạy lúc app khởi động và lúc tắt."""
    lifecycle.install()
    log_event("service_started", service=SERVICE_NAME, version=SERVICE_VERSION)
    yield
    log_event("service_stopped", service=SERVICE_NAME)


app = FastAPI(title="Day 12 Production Agent", version=SERVICE_VERSION, lifespan=lifespan)


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)


from fastapi.responses import JSONResponse, RedirectResponse

@app.get("/")
def root():
    return RedirectResponse(url="/docs")


# ─────────────────────────────────────────────────────────────
# Health & readiness
# ─────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    if lifecycle.shutting_down:
        return JSONResponse(status_code=503, content={"status": "shutting_down"})
    return {"status": "ok", "service": SERVICE_NAME, "version": SERVICE_VERSION}



@app.get("/ready")
def ready(store: ConversationStore = Depends(get_store)):
    if lifecycle.shutting_down:
        return JSONResponse(status_code=503, content={"status": "shutting_down"})
    if not store.ping():
        return JSONResponse(status_code=503, content={"status": "not ready", "redis": False})
    return {"status": "ready", "redis": True}



# ─────────────────────────────────────────────────────────────
# Endpoint chính
# ─────────────────────────────────────────────────────────────
from app.guardrails.input_guardrails import detect_injection, topic_filter
from app.guardrails.output_guardrails import content_filter
import asyncio

@app.post("/ask")
def ask(
    payload: AskRequest,
    user_id: str = Depends(verify_api_key),
    store: ConversationStore = Depends(get_store),
    limiter: RateLimiter = Depends(get_rate_limiter),
    guard: CostGuard = Depends(get_cost_guard),
):
    limiter.check(user_id)
    guard.check(user_id)
    
    # Input Guardrails
    if detect_injection(payload.question):
        return {
            "answer": "I cannot process that request due to safety policy.",
            "user_id": user_id,
            "history_length": len(store.get_history(user_id)),
            "cost_usd": 0.0,
            "tokens": {"in": 0, "out": 0},
        }

    history = store.get_history(user_id)
    result = ask_llm(payload.question, history)
    
    # Output Guardrails
    filter_res = content_filter(result["answer"])
    final_answer = filter_res["redacted"] if not filter_res["safe"] else result["answer"]

    store.append(user_id, "user", payload.question)
    store.append(user_id, "assistant", final_answer)
    guard.record(user_id, result["cost_usd"])
    log_event(
        "ask_completed",
        user_id=user_id,
        tokens_in=result["tokens_in"],
        tokens_out=result["tokens_out"],
        cost_usd=result["cost_usd"],
    )
    return {
        "answer": final_answer,
        "user_id": user_id,
        "history_length": len(history),
        "cost_usd": result["cost_usd"],
        "tokens": {"in": result["tokens_in"], "out": result["tokens_out"]},
    }


class ChatRequest(BaseModel):
    message: str

@app.post("/api/chat")
async def api_chat(payload: ChatRequest):
    message = payload.message
    
    if detect_injection(message):
        return {
            "response": "I cannot process that request. I only help with VinBank banking questions.",
            "leaked": False,
            "status": "BLOCKED"
        }
        
    result = ask_llm(message, [])
    response_text = result["answer"]
    
    GUARDS_SECRETS = ["admin123", "vinbank-secret-2024", "db.vinbank.internal"]
    leaked = any(secret in response_text.lower() for secret in GUARDS_SECRETS)
    
    filter_res = content_filter(response_text)
    
    status = "SAFE"
    if leaked:
        status = "LEAKED"
    elif not filter_res["safe"]:
        status = "BLOCKED"
        
    return {
        "response": filter_res["redacted"] if not filter_res["safe"] else response_text,
        "leaked": leaked,
        "status": status
    }

if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(app, host="0.0.0.0", port=settings.port)

