# 🎰 Roulette Physics Simulator & Dual Reality Benchmarker V6.0

Phòng thí nghiệm nghiên cứu động lực học chuyển động và sự nảy bật của viên bi Roulette Châu Âu (37 số: 0–36). Ứng dụng mô phỏng **CHẠY SONG SONG (Dual Parallel Engine)** để kiểm chứng thuật toán lý thuyết có trùng khớp với thực tế hay không!

---

## 🔬 1. Mục Đích Nghiên Cứu & Thuật Toán Vật Lý
Mô hình hóa chính xác 4 giai đoạn chuyển động của viên bi và bánh xe:
1. **Quỹ đạo lăn vành ngoài (Rim Deceleration):** Ma sát lăn $\mu$ và lực hướng tâm giữ bi trên vành ngoài cho đến khi vận tốc giảm xuống dưới ngưỡng rớt $v_{drop}$.
2. **Góc và thời gian rớt (Drop Point & Drop Angle):** Tính toán chính xác thời điểm bi rời vành rơi xuống lòng côn.
3. **Va đập chốt kim cương (Diamond Deflector Impacts):** 8 chốt kim cương quanh lòng chảo gây tán xạ góc và triệt tiêu động năng.
4. **Nảy bật vách ngăn ô số (Pocket Frets Bouncing):** Sự suy giảm năng lượng theo hệ số đàn hồi $e$ ($v_{k+1} = e \cdot v_k$) cho đến khi viên bi an tọa trong 1 ô số duy nhất.

---

## ⚡ 2. Chế Độ Chạy Song Song: "Có Trùng Với Sự Thật Không?"

Màn hình mô phỏng đồng thời 2 bánh xe ở 60 FPS:
- 🟢 **Model A (Thuật Toán Lý Thuyết - Deterministic):** Chạy giải tích vi phân thuần túy theo tham số ban đầu, không có nhiễu ngẫu nhiên.
- 🔵 **Model B (Thực Tế Mô Phỏng - Chaotic Reality):** Áp dụng các biến thiên thực tế: sai số vận tốc ban đầu $\pm \delta v$, ma sát ngẫu nhiên và góc tán xạ khi va chạm chốt kim cương.
- 📊 **Bảng Đánh Giá Độ Khớp Thực Tế (Reality Match Scorecard):**
  + **Tỷ lệ Trùng Khớp Tuyệt Đối (Exact Match %):** Cùng rơi vào đúng 1 ô số.
  + **Tỷ lệ Trùng Khớp Lân Cận (Near Match $\pm 2$ ô %):** Rơi trúng cụm 5 số bánh xe lân cận.
  + **Độ lệch trung bình (Mean Pocket Distance):** Đo lường mức độ hỗn loạn và khả năng dự đoán điểm rơi thực tế.

---

## �� 3. Đối Soát Số Thực Tế Từ Sòng Bạc (Real Casino Validator)
- Cho phép bạn nhập trực tiếp số quay ra trên bàn roulette thật để hệ thống kiểm tra độ lệch so với dự báo của Model A.

---

## 🚀 Trải Nghiệm Trực Tuyến

Truy cập ngay trên GitHub Pages:
🔗 **[https://minhtitan86-debug.github.io/roulette-pro-ai/](https://minhtitan86-debug.github.io/roulette-pro-ai/)**

Chạy cục bộ:
```bash
python3 -m http.server 8080 --directory /path/to/roulette-pro-ai
```
