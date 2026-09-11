# 🎰 Roulette Quant AI Pro - Bàn Cược Trực Quan & Chiến Thuật 10 Phỉnh

Ứng dụng dự đoán Roulette chuyên sâu chuẩn Châu Âu (37 số: 0–36) hoạt động trên nền tảng web, sẵn sàng xuất bản qua **GitHub Pages** hoặc chạy trực tiếp trên máy chủ / VPS.

Phiên bản **V4.0** được thiết kế lại toàn diện:
1. **Mặt bàn cược trực quan (Visual Casino Layout):** Bảng số 0–36, các ô Hàng (Dozens), Cột (Columns), cược ngoài, cùng **Vòng cung bánh xe vật lý (Racetrack)** với hiển thị trực tiếp các đồng phỉnh (Chips 2k) phát sáng tại các vị trí cược.
2. **Khởi động nhanh 5 vòng:** Chỉ cần nhập liên tiếp 5 vòng quay đầu tiên để kích hoạt cược. Từ vòng tiếp theo, chỉ cần nhập 1 số để hệ thống tự động đối soát và tính cược cho vòng mới.
3. **Chiến thuật phân bổ 10 phỉnh (20.000 VNĐ/vòng) 3 tầng:**
   - **Tầng 1 (3 phỉnh = 6.000đ):** 3 số vàng thẳng hạt nhân $\rightarrow$ **Ăn lớn 35:1 (Lãi ròng +52.000 VNĐ = +26 phỉnh)**!
   - **Tầng 2 (4 phỉnh = 8.000đ):** 1 Hàng (Dozen / Cột) tối ưu $\rightarrow$ **Ăn 1:2 (Lãi nhẹ +4.000 VNĐ = +2 phỉnh)**!
   - **Tầng 3 (3 phỉnh = 6.000đ):** Cụm bánh xe vật lý lân cận $\rightarrow$ **Thua rất ít (Chỉ thua -2.000đ đến -4.000đ)**, bảo toàn tới 16.000đ - 18.000đ tiền vốn!
   - **Độ phủ an toàn:** ~75% mặt bàn.

---

## 🌟 Hướng Dẫn Sử Dụng 3 Bước

### Bước 1: Khởi động 5 vòng đầu tiên
- Mở web lên, nhìn vào dải băng trên cùng.
- Nhập lần lượt **5 số kết quả thực tế vừa ra** (bằng cách click trực tiếp vào ô số trên bàn cược hoặc gõ số vào ô input).
- Sau 5 số, hệ thống sẽ tự động chuyển sang chế độ **Trượt tự động (Rolling Mode)**.

### Bước 2: Quan sát các vị trí đặt cược trên bàn
- Nhìn vào mặt bàn cược bên trái:
  + Các ô số thẳng vàng sẽ có **đồng phỉnh vàng x1 (2k)**.
  + Ô Hàng (1st 12 / 2nd 12 / 3rd 12) sẽ có **đồng phỉnh xanh lá x4 (8k)**.
  + Cụm bánh xe lân cận sẽ sáng đèn xanh dương để bảo hiểm thua ít.
- Cột bên phải hiển thị chi tiết số tiền và kịch bản lợi nhuận.

### Bước 3: Đặt cược trên bàn thật & Nhập 1 số tiếp theo
- Sau khi bàn roulette thật có kết quả, bấm vào số vừa ra trên màn hình.
- Hệ thống lập tức:
  + Hiện banner đối soát: Báo trúng số thẳng (+52k), trúng hàng (+4k), vào cụm (-2k) hay lệch.
  + Cộng/trừ PnL tài chính (VNĐ & Phỉnh).
  + Tự động cuốn chiếu lịch sử và xuất ngay vị trí cược cho vòng kế tiếp!

---

## 🚀 Hướng Dẫn Mở Web Qua Local Server Hoặc GitHub Pages

### Chạy Local trên VPS / Máy tính:
```bash
python3 -m http.server 8080
```
Truy cập: `http://localhost:8080/`

### Đẩy lên GitHub & Bật GitHub Pages:
```bash
git add .
git commit -m "Upgrade V4.0: Visual table layout, 5-spin fast start, 10-chip strategy"
git push origin main
```
Vào `Settings` ➡️ `Pages` ➡️ Chọn branch `main` ➡️ Save.
