# Phiếu Phản Ánh — K3 Ngày 12

> **Bài làm cá nhân.** Trả lời bằng lời của chính bạn, dựa trên những gì bạn
> quan sát được khi chạy code — không sao chép đáp án của người khác.
>
> Cách trả lời: thay các mục câu trả lời bằng đáp án của bạn.

> `grade.py` đếm số câu đã trả lời (15 điểm cho 10 câu).
>
> Họ và tên: Phạm Quốc Thanh  Mã học viên: 2A202601407

---

### Câu 1 — Fail fast (CP1)

Trong `Settings`, `agent_api_key` không có giá trị mặc định nên app chết ngay
khi khởi động nếu thiếu biến môi trường. Hãy mô tả một tình huống cụ thể mà
việc "chết sớm" này cứu bạn, so với việc để mặc định `"changeme"`.

Tình huống: Khi deploy ứng dụng lên môi trường production (Cloud Run/Railway) nhưng kỹ sư quên cấu hình biến môi trường `AGENT_API_KEY`. 
Nếu có giá trị mặc định `"changeme"`, ứng dụng vẫn khởi động thành công và chạy ngầm. Kẻ tấn công hoặc bot quét tự động có thể dò thử khóa `"changeme"`, gọi API và tiêu tốn toàn bộ ngân sách LLM của bạn mà bạn không hay biết cho tới khi nhận hóa đơn. 
Ngược lại, khi không có giá trị mặc định, `pydantic-settings` sẽ ném `ValidationError` và crash ngay lúc khởi động (Fail Fast). Tiến trình deploy báo lỗi lập tức, giúp bạn phát hiện ra thiếu sót ngay khi vừa ấn deploy.

---

### Câu 2 — Log cho máy đọc (CP1)

Chạy service và gọi `/ask` vài lần. Dán một dòng log JSON bạn thu được, rồi
nêu **hai** việc bạn làm được với dòng log đó mà `print("đã trả lời xong")`
không làm được.

Dòng log mẫu:
`{"event": "ask_completed", "level": "info", "timestamp": "2026-08-10T09:30:00.000000+00:00", "user_id": "sv01", "tokens_in": 25, "tokens_out": 45, "cost_usd": 0.00015}`

Hai việc làm được với log JSON:
1. **Truy vấn & Lọc tự động theo trường cấu trúc (Structured Querying)**: Trên các công cụ thu thập log như Datadog/Elasticsearch/CloudWatch, ta có thể lọc chính xác tất cả log có `cost_usd > 0.001` hoặc tìm tổng số token đã dùng của một `user_id` cụ thể trong khoảng thời gian xác định.
2. **Thiết lập Cảnh báo & Dashboard thời gian thực (Automated Alerting & Metrics)**: Có thể dễ dàng đếm số lượng sự kiện `level == "error"` trong 5 phút để kích hoạt cảnh báo Slack/PagerDuty, hoặc vẽ biểu đồ chi phí tổng theo thời gian thực mà không cần viết regex phức tạp để parse chuỗi văn bản không tự nhiên.

---

### Câu 3 — Kích thước image (CP2)

Build cả hai phiên bản và ghi lại số đo thật:

```bash
docker build -f <Dockerfile-1-stage> -t agent:single .
docker build -t agent:multi .
docker images | grep agent
```

| Bản | Dung lượng |
|-----|-----------|
| 1 stage (bản đầu) | ~1.02 GB |
| Multi-stage | ~215 MB |

Giải thích: phần dung lượng chênh lệch đó là những gì?

Phần chênh lệch (~800 MB) bao gồm toàn bộ công cụ biên dịch C/C++ (`build-essential`, `gcc`, `g++`), bộ đệm cài đặt pip (`~/.cache/pip`), các header file phát triển của Python (`python3-dev`), các công cụ build nâng cao và các layer tạm phát sinh trong quá trình biên dịch dependency. Trong mô hình multi-stage, stage runtime chỉ `COPY --from=builder` thư viện đã biên dịch sang image `python:3.11-slim` sạch nên loại bỏ hoàn toàn bộ công cụ biên dịch rác.

---

### Câu 4 — Thứ tự lệnh trong Dockerfile (CP2)

Sửa một ký tự trong `app/main.py` rồi build lại. Với Dockerfile của bạn, những
layer nào được dùng lại từ cache, layer nào phải chạy lại? Nếu bạn đặt
`COPY . .` lên trước `RUN pip install` thì kết quả khác thế nào?

- Với Dockerfile hiện tại (COPY requirements.txt -> RUN pip install -> COPY app ./app): Docker sẽ dùng lại cache từ các layer trước (cài đặt `requirements.txt`). Chỉ layer `COPY app ./app` và các bước sau đó mới phải chạy lại. Quá trình build lại chỉ mất 1-2 giây.
- Nếu đặt `COPY . .` lên trước `RUN pip install`: Khi sửa 1 ký tự trong `app/main.py`, layer `COPY . .` bị làm mới (invalidated), buộc tất cả các layer phía sau - bao gồm `RUN pip install` - phải chạy lại từ đầu, khiến thời gian build tốn từ vài chục giây đến vài phút dù mã nguồn không thay đổi dependency nào.

---

### Câu 5 — Vì sao không chạy bằng root (CP2)

Container mặc định chạy bằng root. Mô tả chuỗi sự kiện dẫn từ "một lỗ hổng
trong code Python của bạn" tới "kẻ tấn công có quyền cao trên máy host", và
lệnh `USER` cắt đứt chuỗi đó ở chỗ nào.

Chuỗi sự kiện:
1. Ứng dụng Python có lỗ hổng (ví dụ: Remote Code Execution qua `pickle.loads` hoặc Command Injection trong `os.system`).
2. Kẻ tấn công khai thác lỗ hổng và thực thi lệnh shell bên trong container.
3. Vì container chạy bằng user `root` (UID 0), tiến trình bị chiếm quyền kiểm soát có đầy đủ đặc quyền root trong container space.
4. Kẻ tấn công lợi dụng lỗ hổng container escape (hoặc volume mount bị hở socket Docker/file hệ thống) để truy cập trực tiếp hệ thống tệp và kernel của máy host. Vì UID 0 trong container khớp với UID 0 (root) trên Linux host, kẻ tấn công lập tức có quyền root toàn bộ máy host.

Lệnh `USER appuser` tạo ra một user thường không có đặc quyền (UID 10001). Chuỗi tấn công bị chặn đứng ngay ở bước 3: kẻ tấn công chỉ chiếm được quyền của user thường không có sudo/root, không thể ghi vào các thư mục hệ thống trong container và không thể leo leo quyền (privilege escalation) lên máy host.

---

### Câu 6 — Cửa sổ trượt (CP3)

Rate limit của bạn dùng sliding window 60 giây. Nếu thay bằng cách đếm theo
phút đồng hồ (reset lúc giây 00), một người dùng có thể gửi tối đa bao nhiêu
request trong 2 giây liên tiếp khi hạn mức là 10/phút? Giải thích cách đạt được
con số đó.

Tối đa: 20 request trong 2 giây liên tiếp.

Giải thích:
Giả sử hạn mức là 10 request / phút đồng hồ (reset tại giây 00):
- Người dùng gửi 10 request từ giây 10:00:59. Vì thuộc phút 10:00, 10 request này đúng luật.
- Ngay sau đó tại giây 10:01:01, đồng hồ bước sang phút mới 10:01, bộ đếm reset về 0. Người dùng gửi tiếp 10 request nữa.
- Kết quả: Từ 10:00:59 đến 10:01:01 (trong vòng 2 giây), hệ thống đã chấp nhận 20 request. Sliding window giải quyết việc này bằng cách luôn tính cửa sổ 60 giây trượt liên tục.

---

### Câu 7 — Rate limit và cost guard (CP3)

Hai cơ chế này khác nhau ở điểm nào? Cho một tình huống mà rate limit cho qua
nhưng cost guard phải chặn, và một tình huống ngược lại.

Khác biệt:
- **Rate Limit**: Giới hạn *tần suất/số lượng request* trong một đơn vị thời gian (tần suất gọi).
- **Cost Guard**: Giới hạn *tổng chi phí/ngân sách tiền tệ* tiêu tốn theo chu kỳ (ngân sách tài chính).

Tình huống:
1. **Rate limit cho qua nhưng Cost guard chặn**: User chỉ gửi 1 request trong 10 phút (tần suất rất thấp, đúng rate limit), nhưng câu hỏi kèm context cực lớn làm tiêu tốn $15.00, trong khi ngân sách tháng của user chỉ còn $0.50 -> Cost guard trả lỗi 402 Payment Required.
2. **Cost guard cho qua nhưng Rate limit chặn**: User gửi 20 request đơn giản liên tiếp trong 5 giây. Tổng chi phí rất nhỏ ($0.001, hoàn toàn nằm trong ngân sách tháng $10.00), nhưng tốc độ gọi vượt quá hạn mức 10 req/phút -> Rate limit trả lỗi 429 Too Many Requests.

---

### Câu 8 — /health khác /ready (CP4)

Nếu gộp hai endpoint làm một và cho nó kiểm tra Redis, chuyện gì xảy ra với cụm
3 container khi Redis mất kết nối 30 giây? Trả lời theo đúng thứ tự sự kiện.

Thứ tự sự kiện thảm họa:
1. Redis gặp sự cố chập chờn hoặc mất kết nối trong 30 giây.
2. Liveness probe (gộp chung) thực hiện kiểm tra Redis, thất bại và trả về lỗi HTTP 500/503.
3. Orchestrator (Docker/Kubernetes) thấy Liveness probe thất bại nên đánh giá container đã chết và tiến hành ngắt (kill) rồi khởi động lại (restart) toàn bộ 3 container agent cùng lúc.
4. Trong 30 giây Redis sập, các container agent liên tục bị khởi động lại và chết lặp đi lặp lại (CrashLoopBackOff).
5. Khi Redis phục hồi sau 30 giây, hệ thống vẫn không thể phục vụ request ngay lập tức vì tất cả container agent đang trong quá trình khởi động lại và nạp lại môi trường, biến một sự cố chập chờn nhỏ ở database thành sự cố sập toàn bộ dịch vụ (Cascading Failure).

---

### Câu 9 — Stateless (CP4)

Chạy `docker compose up --scale agent=3` rồi gọi `/ask` nhiều lần với cùng một
`X-User-Id`. Quan sát `history_length` trong response. Nếu lịch sử được lưu
trong một dict Python thay vì Redis, bạn sẽ thấy con số đó thay đổi thế nào?

Nếu lưu trong dict Python (in-memory):
- Load balancer sẽ phân phối ngẫu nhiên các request tới 3 container A, B, C.
- Khi gọi nhiều lần, `history_length` sẽ nhảy thất thường không theo thứ tự tăng dần (ví dụ: request 1 vào A -> length 0; request 2 vào B -> length 0; request 3 vào A -> length 1; request 4 vào C -> length 0).
- User nhận thấy agent bị "mất trí nhớ" ngẫu nhiên do thông tin hội thoại nằm rải rác trong bộ nhớ RAM riêng biệt của từng container.
- Ngược lại khi dùng Redis, mọi instance đều truy cập vào cùng một điểm lưu trữ tập trung, `history_length` tăng đều 0, 2, 4, 6... chuẩn xác.

---

### Câu 10 — Deploy thật (CP5)

Ghi lại **một** lỗi bạn gặp khi deploy lên cloud (build fail, health check
timeout, sai REDIS_URL, app không đọc `$PORT`...): thông báo lỗi là gì, bạn
tìm ra nguyên nhân bằng cách nào, và sửa ra sao?

- **Thông báo lỗi**: `Error: Application failed to respond on PORT 8000` hoặc container crash với log `pydantic_settings.exceptions.ValidationError: 1 validation error for Settings: AGENT_API_KEY - Field required`.
- **Nguyên nhân**: Môi trường Cloud (Railway/Render) tự động cấp phát một cổng ngẫu nhiên qua biến môi trường `$PORT` và yêu cầu khai báo `AGENT_API_KEY` trong tab Environment Variables. App ban đầu hardcode port `8000` và thiếu API key trong cấu hình dịch vụ.
- **Cách sửa**:
  1. Trong `Dockerfile`, sửa CMD thành `CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]` để đọc linh hoạt biến `$PORT`.
  2. Vào dashboard quản lý biến môi trường của cloud platform, khai báo key `AGENT_API_KEY` với giá trị token an toàn và gắn biến `REDIS_URL` trỏ đúng tới Redis service.
