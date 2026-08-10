# Thông Tin Deploy — Checkpoint 5

## Thông Tin Học Viên

| Mục | Nội dung |
|-----|----------|
| Họ và tên | Phạm Quốc Thanh |
| Mã học viên | 2A202601407 |
| Repo | https://github.com/ShayNeeo/DAY12_2A202601407_PhamQuocThanh |

## Service

| Mục | Nội dung |
|-----|----------|
| Public URL | https://lab12.w9.nu |
| Platform | Railway / Custom VPS (Docker Compose & Cloudflare Tunnel) |
| Ngày deploy | 2026-08-10 |

## Biến Môi Trường Đã Set Trên Cloud

Ghi tên biến và **nguồn giá trị**, không ghi giá trị:

| Biến | Đã set | Ghi chú |
|------|--------|---------|
| `PORT` | ✅ | platform tự gán (default 8000) |
| `AGENT_API_KEY` | ✅ | đặt trong dashboard/secrets, không nằm trong repo |
| `REDIS_URL` | ✅ | service redis:6379 / redis://redis:6379/0 |
| `RATE_LIMIT_PER_MINUTE` | ✅ | 10 |
| `MONTHLY_BUDGET_USD` | ✅ | 10.0 |
| `LOG_LEVEL` | ✅ | INFO |
| `OPENAI_API_KEY` | ✅ | gpt-4o-mini API key |

## Lệnh Kiểm Tra

```bash
# 1. Liveness — mong đợi 200 {"status":"ok"}
curl -i https://lab12.w9.nu/health

# 2. Readiness — mong đợi 200 {"status":"ready"} (đã nối được Redis)
curl -i https://lab12.w9.nu/ready

# 3. Không có API key — mong đợi 401
curl -i -X POST https://lab12.w9.nu/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}'

# 4. Có API key — mong đợi 200 kèm câu trả lời từ Real LLM
curl -i -X POST https://lab12.w9.nu/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $AGENT_API_KEY" \
  -d '{"message":"VinBank là gì?"}'

# 5. Rate limit — gọi 15 lần, những lần cuối phải trả 429
for i in $(seq 1 15); do
  curl -s -o /dev/null -w "%{http_code} " -X POST https://lab12.w9.nu/api/chat \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $AGENT_API_KEY" \
    -d '{"message":"test"}'
done; echo
```

## Kết Quả Chạy Thật

```
HTTP/1.1 200 OK
content-type: application/json
{"status":"ok","service":"day12-agent","version":"1.0.0"}

HTTP/1.1 200 OK
content-type: application/json
{"status":"ready","redis":true}

HTTP/1.1 401 Unauthorized
content-type: application/json
{"detail":"invalid or missing API key"}

HTTP/1.1 200 OK
content-type: application/json
{"response":"VinBank is a virtual banking service designed to provide you with a range of financial solutions...","leaked":false,"status":"SAFE"}

200 200 200 200 200 200 200 200 200 200 429 429 429 429 429
```

## Ảnh Chụp Màn Hình

Đặt ảnh trong thư mục `screenshots/`:

- `screenshots/dashboard.png` — trang quản lý service trên platform
- `screenshots/health.png` — kết quả gọi `/health` từ trình duyệt hoặc curl
