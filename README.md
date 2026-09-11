# 🎰 Roulette Quant AI Pro V4.5 - Bàn Cược Trực Quan & Chiến Thuật Ăn / Hòa / Thua Ít

Ứng dụng dự đoán Roulette chuyên sâu chuẩn Châu Âu (37 số: 0–36) hoạt động hoàn toàn trên trình duyệt web, triển khai qua **GitHub Pages** hoặc chạy trực tiếp trên VPS / máy chủ cá nhân.

Phiên bản **V4.5** nâng cấp toàn diện chiến thuật đặt cược và giao diện:
1. **Mặt bàn cược trực quan (Visual Casino Layout):** Bố trí 3 hàng x 12 cột chuẩn quốc tế, các ô Hàng (Dozens), Cột (Columns), cược ngoài, cùng **Racetrack Bánh Xe Vật Lý** hiển thị các đồng phỉnh (Chips 2k) phát sáng theo từng loại cược.
2. **Chiến thuật Đa Tầng bao phủ 80–85% mặt bàn:**
   - 🎯 **Số Thẳng (Straight-up 35:1):** Ăn cực đậm (Lãi ròng từ +42.000đ đến +84.000đ).
   - 🟠 **Cặp Đôi (Split 17:1):** 2 số liền kề theo bàn cược, ăn đậm (Lãi ròng từ +16.000đ đến +48.000đ).
   - 🟣 **Cụm 4 Số (Corner 8:1):** Cụm 4 số vuông 2x2, bảo hiểm hòa vốn hoặc có thêm lãi nhẹ.
   - 🛡 **Hàng (Dozen 2:1):** Cửa phòng thủ chính bảo vệ 12 số (Lãi ròng từ +10.000đ đến +12.000đ).
   - 🧭 **Cụm bánh xe vật lý (Sectors):** Cứu cánh lân cận giúp bảo toàn vốn, thua rất ít khi bóng rơi lệch.
3. **2 Chế Độ Cược Linh Hoạt:**
   - 🟢 **Chuẩn 10 Phỉnh (20.000 VNĐ):** 2 Số Thẳng (2 phỉnh) + 1 Cặp Đôi Split (1 phỉnh) + 1 Cụm 4 Số Corner (2 phỉnh) + 1 Hàng Dozen (5 phỉnh).
   - 🟡 **Tăng Cược 15 Phỉnh (30.000 VNĐ):** 2 Số Thẳng (2 phỉnh) + 2 Cặp Đôi Split (2 phỉnh) + 2 Cụm 4 Số Corner (4 phỉnh) + 1 Hàng Dozen (7 phỉnh).
4. **Phiếu Cược Chi Tiết (Betting Ticket):** Hiển thị rõ ràng các cặp số, cụm 4 số, hàng và số thẳng để người dùng dễ dàng đặt theo trên bàn casino thật.
5. **Khởi động nhanh 5 vòng:** Nhập liên tiếp 5 kết quả đầu tiên để kích hoạt; từ vòng sau chỉ cần nhập 1 số để đối soát thắng/thua và dự báo tiếp theo.

---

## 🌟 Hướng Dẫn Sử Dụng

### Bước 1: Chọn Chế Độ Cược & Nhập 5 Vòng Đầu
- Chọn chế độ cược ở thanh công cụ: **10 Phỉnh (20k)** hoặc **15 Phỉnh (30k)**.
- Bấm lần lượt **5 số kết quả vừa ra** trên bàn cược thật.
- Sau 5 số, hệ thống kích hoạt chế độ **Trượt Tự Động (Rolling Mode)**.

### Bước 2: Quan Sát Phiếu Cược & Đặt Trên Bàn Thật
- Xem **Phiếu Cược Chi Tiết (Betting Ticket)** ở cột bên phải:
  + Số Thẳng (Vàng): Ví dụ Số 17, 25.
  + Cặp Đôi Split (Cam): Ví dụ Cặp [17-20].
  + Cụm 4 Số Corner (Tím): Ví dụ Cụm [16,17,19,20].
  + Hàng Dozen (Xanh ngọc): Ví dụ 2nd 12 (13-24).
- Trên mặt bàn bên trái các đồng phỉnh và viền phát sáng thể hiện chính xác các vị trí cần đặt.

### Bước 3: Nhập Kết Quả & Theo Dõi PnL
- Sau khi vòng quay roulette kết thúc, click vào số vừa trúng.
- Hệ thống lập tức:
  + Đối soát đa tầng: Nổ số thẳng, trúng cặp đôi, trúng cụm 4 số, trúng hàng hay bảo vệ cụm.
  + Cập nhật tổng kết PnL (VNĐ & Phỉnh) và tỷ lệ thắng.
  + Xuất phiếu cược mới cho vòng quay kế tiếp!

---

## 🚀 Trải Nghiệm Trực Tuyến

Truy cập trực tiếp qua GitHub Pages:
**[https://minhtitan86-debug.github.io/roulette-pro-ai/](https://minhtitan86-debug.github.io/roulette-pro-ai/)**

Hoặc chạy cục bộ:
```bash
python3 -m http.server 8080 --directory /path/to/roulette-pro-ai
```
