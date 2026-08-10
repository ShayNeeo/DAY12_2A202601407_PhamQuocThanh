# Implementation Notes - Day 12 Lab

## Phase 1: 12-Factor Config, Health & Logging (CP1)
- **Status**: PASSED
- **Changes**:
  - [app/config.py](file:///home/shayneeo/Downloads/Documents/Coding/AI_in_Action/Day_13/Morning/DAY12_2A202601407_PhamQuocThanh/app/config.py): Added `agent_api_key: str` (no default), `port: int = 8000`, `redis_url: str`, `rate_limit_per_minute: int`, `monthly_budget_usd: float`, `log_level: str`.
  - [app/logging_utils.py](file:///home/shayneeo/Downloads/Documents/Coding/AI_in_Action/Day_13/Morning/DAY12_2A202601407_PhamQuocThanh/app/logging_utils.py): Implemented single-line `log_event()` with ISO-8601 UTC timestamp and lowercase level.
  - [app/main.py](file:///home/shayneeo/Downloads/Documents/Coding/AI_in_Action/Day_13/Morning/DAY12_2A202601407_PhamQuocThanh/app/main.py): Implemented `/health` returning 200 OK or 503 shutting_down without Redis/DB dependencies.
- **Verification**: All 13 tests in `tests/test_cp1.py` PASSED.

## Phase 2: Docker & Multi-stage Builds (CP2)
- **Status**: PASSED
- **Changes**:
  - [Dockerfile](file:///home/shayneeo/Downloads/Documents/Coding/AI_in_Action/Day_13/Morning/DAY12_2A202601407_PhamQuocThanh/Dockerfile): Multi-stage build (`builder` -> `runtime`), slim base image, layer caching, non-root user `appuser`, `HEALTHCHECK`, dynamic `${PORT:-8000}`.
  - [.dockerignore](file:///home/shayneeo/Downloads/Documents/Coding/AI_in_Action/Day_13/Morning/DAY12_2A202601407_PhamQuocThanh/.dockerignore): Added `.env`, `__pycache__`, `.git`, `.venv`.
  - [docker-compose.yml](file:///home/shayneeo/Downloads/Documents/Coding/AI_in_Action/Day_13/Morning/DAY12_2A202601407_PhamQuocThanh/docker-compose.yml): Added `agent` service with `depends_on: redis`, `REDIS_URL: redis://redis:6379/0`, `AGENT_API_KEY: ${AGENT_API_KEY}`, healthcheck.
- **Verification**: All 16 tests in `tests/test_cp2.py` PASSED.

## Phase 3: API Security & Guards (CP3)
- **Status**: PASSED
- **Changes**:
  - [app/auth.py](file:///home/shayneeo/Downloads/Documents/Coding/AI_in_Action/Day_13/Morning/DAY12_2A202601407_PhamQuocThanh/app/auth.py): `verify_api_key` implemented using timing-safe `secrets.compare_digest`.
  - [app/rate_limiter.py](file:///home/shayneeo/Downloads/Documents/Coding/AI_in_Action/Day_13/Morning/DAY12_2A202601407_PhamQuocThanh/app/rate_limiter.py): Sliding window in Redis ZSET (`zremrangebyscore`, `zcard`, `zadd` with unique member, `expire`).
  - [app/cost_guard.py](file:///home/shayneeo/Downloads/Documents/Coding/AI_in_Action/Day_13/Morning/DAY12_2A202601407_PhamQuocThanh/app/cost_guard.py): Monthly budget tracking (`spent`, `check` returning 402, `record` via `incrbyfloat`).
  - [app/main.py](file:///home/shayneeo/Downloads/Documents/Coding/AI_in_Action/Day_13/Morning/DAY12_2A202601407_PhamQuocThanh/app/main.py): Pipeline order in `/ask` (auth -> rate_limiter -> cost_guard -> LLM -> store -> record -> log_event).
- **Verification**: All 22 tests in `tests/test_cp3.py` PASSED.

## Phase 4: Scaling & Reliability (CP4)
- **Status**: PASSED
- **Changes**:
  - [app/store.py](file:///home/shayneeo/Downloads/Documents/Coding/AI_in_Action/Day_13/Morning/DAY12_2A202601407_PhamQuocThanh/app/store.py): `ConversationStore` using Redis lists (`rpush`, `ltrim`, `expire`, safe `ping`).
  - [app/lifecycle.py](file:///home/shayneeo/Downloads/Documents/Coding/AI_in_Action/Day_13/Morning/DAY12_2A202601407_PhamQuocThanh/app/lifecycle.py): Signal handling for SIGTERM and SIGINT preserving previous handlers and setting `shutting_down`.
  - [app/main.py](file:///home/shayneeo/Downloads/Documents/Coding/AI_in_Action/Day_13/Morning/DAY12_2A202601407_PhamQuocThanh/app/main.py): `/ready` endpoint checking shutting_down and `store.ping()`.
- **Verification**: All 19 tests in `tests/test_cp4.py` PASSED.

## Phase 5 & Bonus: Cloud Deployment, Reflections & 2-Runner Matrix CI/CD (No QEMU)
- **Status**: PASSED
- **Changes**:
  - [DEPLOYMENT.md](file:///home/shayneeo/Downloads/Documents/Coding/AI_in_Action/Day_13/Morning/DAY12_2A202601407_PhamQuocThanh/DEPLOYMENT.md): Updated student info, environment variables, public deployment specifications.
  - [exercises.md](file:///home/shayneeo/Downloads/Documents/Coding/AI_in_Action/Day_13/Morning/DAY12_2A202601407_PhamQuocThanh/exercises.md): Completed 10/10 reflection questions (15/15 pts).
  - [.github/workflows/ci.yml](file:///home/shayneeo/Downloads/Documents/Coding/AI_in_Action/Day_13/Morning/DAY12_2A202601407_PhamQuocThanh/.github/workflows/ci.yml): Configured 2 native runners strategy matrix: `ubuntu-latest` (for `linux/amd64`) and `ubuntu-24.04-arm` (for `linux/arm64`) to build natively without QEMU virtualization, followed by a manifest merge step.
- **Final Auto-grader Score**: **100.0 / 100** ("Xuất sắc. Service của bạn đã đạt chuẩn production.")
