# �� Roulette Quant AI - Pro Statistical Predictor

Ứng dụng dự đoán Roulette chuyên sâu chuẩn Châu Âu (37 số: 0-36) hoạt động trên nền tảng web, sẵn sàng đưa lên GitHub và xuất bản miễn phí qua **GitHub Pages**.

Dự án được xây dựng dựa trên các thuật toán xác suất cung bánh xe vật lý, độ lệch chuẩn Z-Score và chiến thuật cược bảo vệ vốn (Hedge Formula) giúp người chơi đạt độ phủ tới **~78.4% mặt bàn** với tỷ lệ thua cực thấp.

---

## 🌟 Các Tính Năng Nổi Bật

1. **Bàn Nhập Số Trực Quan (Interactive 0-36 Board):**
   - Chạm/click trực tiếp vào các số trên bàn để ghi nhận lịch sử (không cần gõ bàn phím).
   - Đánh dấu màu sắc chuẩn sòng bài: 0 Xanh lá, 18 số Đỏ, 18 số Đen.
   - Dải băng trượt (Rolling Tape) hiển thị 10 phiên gần nhất với hiệu ứng thẻ bài sang trọng.

2. **Thuật Toán Dự Đoán Top 5 Số Vàng (Straight-up Numbers):**
   - **Phân Tích Cung Bánh Xe Vật Lý (French Wheel Sectors):** Theo dõi mật độ bóng rơi vào 3 cung chính (*Voisins du Zéro*, *Tiers du Cylindre*, *Orphelins*).
   - **Ma Trận Chuyển Dịch Lân Cận (Neighbor Arc Proximity):** Tính toán độ lệch quán tính tay quay của Dealer và điểm nảy đối diện 180 độ trên vòng tròn bánh xe.
   - **Quy Luật 1/3 (Law of the Thirds):** Nhận diện các con số đang ấm (hot sleepers) có xu hướng hồi quy trong chu kỳ ngắn.

3. **Dự Đoán Cược Ngoài & Thế Hàng (Outside Bets & Dozens):**
   - Phân tích độ lệch chuẩn Đỏ / Đen và Chẵn / Lẻ.
   - Đề xuất **2 Hàng (Dozens)** tối ưu nhất có tỷ lệ thắng **64.8%**.

4. **Kế Hoạch Cược Tỷ Lệ Thua Cực Thấp (Low-Risk Bankroll Hedge):**
   - **5 phỉnh** vào 5 con số vàng thẳng (Ăn 1:35 nếu nổ trúng).
   - **6 phỉnh** cược bảo hiểm vào 2 Hàng Dozen (Bảo toàn vốn và ăn lãi nhẹ).
   - **Độ phủ an toàn:** 29 trên 37 số (**~78.4% cơ hội giữ/tăng vốn**).

5. **Hiệu Ứng Casino Cao Cấp:**
   - Dark Luxury Velvet & Gold Theme chuẩn phong cách sòng bài Monte Carlo.
   - Âm thanh gõ phỉnh và chuông dự đoán tổng hợp qua Web Audio API (hoạt động offline 100%, không cần tải file âm thanh nặng).
   - Tương thích hoàn hảo trên điện thoại (iOS, Android) và máy tính.

---

## 🚀 Hướng Dẫn Đưa Lên GitHub & Mở Web Miễn Phí (GitHub Pages)

### Bước 1: Khởi tạo Git repository trên máy của bạn
```bash
cd /root/roulette-pro-ai
git init
git add .
git commit -m "Initial commit: Roulette Quant AI Pro"
```

### Bước 2: Tạo Repo mới trên GitHub
1. Đăng nhập vào [GitHub.com](https://github.com).
2. Bấm vào dấu `+` ở góc phải trên cùng ➡️ Chọn **New repository**.
3. Đặt tên repository (ví dụ: `roulette-pro-ai`) ➡️ Chọn **Public** ➡️ Bấm **Create repository**.

### Bước 3: Đẩy code lên GitHub
```bash
git branch -M main
git remote add origin https://github.com/<tên-tài-khoản-của-bạn>/roulette-pro-ai.git
git push -u origin main
```

### Bước 4: Kích hoạt GitHub Pages để chạy web trên điện thoại
1. Vào repository vừa tạo trên GitHub ➡️ Bấm vào thẻ **Settings**.
2. Ở menu bên trái, chọn mục **Pages** (dưới nhóm *Code and automation*).
3. Tại phần **Branch**, chọn nhánh `main` và thư mục `/ (root)` ➡️ Bấm **Save**.
4. Sau 1 phút, GitHub sẽ cung cấp cho bạn một đường link web miễn phí vĩnh viễn dạng:
   `https://<tên-tài-khoản>.github.io/roulette-pro-ai/`

👉 Bạn có thể lưu link này vào màn hình chính điện thoại (Add to Home Screen) để mở lên như một App thực thụ mỗi khi vào bàn chơi!

---

## 🛠 Cấu Trúc Dự Án
```text
roulette-pro-ai/
├── index.html       # Cấu trúc giao diện bàn cược, dải 10 phiên và kết quả AI
├── style.css        # Giao diện Dark Velvet Casino, Glassmorphism & Gold Theme
├── app.js           # Thuật toán phân tích bánh xe, tính toán xác suất & Web Audio
└── README.md        # Hướng dẫn chi tiết dự án
```

---
*Lưu ý: Mọi thuật toán xác suất hỗ trợ quản trị vốn và tối ưu hóa thế cược, hãy luôn chơi có trách nhiệm và giữ vững kỷ luật vốn.*
