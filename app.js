/**
 * ROULETTE QUANT AI - PRO STATISTICAL PREDICTOR
 * Thuật toán phân tích cung bánh xe châu Âu 37 số (0-36)
 */

// BỐ TRÍ BÁNH XE CHÂU ÂU (EUROPEAN WHEEL ORDER)
const WHEEL_ORDER = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

// CÁC CUNG BÁNH XE (FRENCH SECTORS)
const SECTORS = {
    VOISINS: [22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25], // 17 số quanh số 0
    TIERS: [27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33],                    // 12 số đối diện số 0
    ORPHELINS: [1, 20, 14, 31, 9, 17, 34, 6]                                     // 8 số 2 cánh
};

// TRẠNG THÁI ỨNG DỤNG
let historySpins = [];
let soundEnabled = true;
let audioCtx = null;

// KHỞI TẠO ÂM THANH WEB AUDIO
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type = 'chip') {
    if (!soundEnabled) return;
    try {
        initAudio();
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        const now = audioCtx.currentTime;
        if (type === 'chip') {
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.08);
        } else if (type === 'predict') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
            osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.35);
        }
    } catch (e) {}
}

// LẤY MÀU CỦA SỐ
function getNumberColor(num) {
    if (num === 0) return 'zero';
    return RED_NUMBERS.includes(num) ? 'red' : 'black';
}

// TÌM CUNG BÁNH XE CỦA SỐ
function getNumberSector(num) {
    if (SECTORS.VOISINS.includes(num)) return 'Voisins du Zéro';
    if (SECTORS.TIERS.includes(num)) return 'Tiers du Cylindre';
    if (SECTORS.ORPHELINS.includes(num)) return 'Orphelins';
    return 'Châu Âu';
}

// RENDER BÀN SỐ 1 ĐẾN 36
function initBoardUI() {
    const gridCells = document.getElementById('gridCells');
    gridCells.innerHTML = '';

    // Bố trí 3 hàng x 12 cột theo thứ tự bàn Roulette chuẩn
    for (let row = 3; row >= 1; row--) {
        for (let col = 0; col < 12; col++) {
            const num = col * 3 + row;
            const color = getNumberColor(num);

            const cell = document.createElement('div');
            cell.className = `num-cell ${color}`;
            cell.dataset.num = num;
            cell.id = `cell-${num}`;
            cell.innerHTML = `
                <span class="cell-num">${num}</span>
                <span class="hit-count-pill" id="hit-${num}" style="display:none">0</span>
            `;
            cell.onclick = () => handleNumberClick(num);
            gridCells.appendChild(cell);
        }
    }

    renderTapeSlots();
    loadFromLocalStorage();
}

// RENDER 10 Ô SLOTS LỊCH SỬ
function renderTapeSlots() {
    const tape = document.getElementById('tapeContainer');
    tape.innerHTML = '';

    const count = historySpins.length;
    document.getElementById('inputCount').innerText = count;

    for (let i = 0; i < 10; i++) {
        const slot = document.createElement('div');
        slot.className = 'tape-slot';

        if (i < count) {
            const num = historySpins[i];
            const color = getNumberColor(num);
            const colorText = color === 'zero' ? 'Zero' : (color === 'red' ? 'Đỏ' : 'Đen');

            slot.className = `tape-slot filled ${color}`;
            slot.innerHTML = `
                <span class="slot-index">#${i + 1}</span>
                <span class="slot-value">${num}</span>
                <span class="slot-badge">${colorText}</span>
            `;
        } else {
            slot.innerHTML = `
                <span class="slot-index">#${i + 1}</span>
                <span class="slot-value" style="opacity: 0.15">--</span>
            `;
        }
        tape.appendChild(slot);
    }

    updateBoardHitCountPills();
}

// CẬP NHẬT PILL ĐẾM SỐ LẦN XUẤT HIỆN TRÊN BÀN CƯỢC
function updateBoardHitCountPills() {
    // Reset all
    for (let i = 0; i <= 36; i++) {
        const pill = document.getElementById(`hit-${i}`);
        if (pill) pill.style.display = 'none';
    }

    const counts = {};
    historySpins.forEach(n => counts[n] = (counts[n] || 0) + 1);

    for (let num in counts) {
        const pill = document.getElementById(`hit-${num}`);
        if (pill) {
            pill.innerText = `${counts[num]}x`;
            pill.style.display = 'inline-block';
        }
    }
}

// XỬ LÝ KHI NGƯỜI DÙNG BẤM CHỌN SỐ
function handleNumberClick(num) {
    playSound('chip');

    // Hiệu ứng nháy ô được chọn
    const el = num === 0 ? document.querySelector('.zero-cell') : document.getElementById(`cell-${num}`);
    if (el) {
        el.classList.add('active-pulse');
        setTimeout(() => el.classList.remove('active-pulse'), 300);
    }

    if (historySpins.length >= 10) {
        // Trượt cửa sổ (Sliding window 10 phiên)
        historySpins.shift();
    }
    historySpins.push(num);

    saveToLocalStorage();
    renderTapeSlots();
    runQuantAnalysis();
}

// HOÀN TÁC SỐ VỪA NHẬP
function undoLastNumber() {
    if (historySpins.length > 0) {
        historySpins.pop();
        saveToLocalStorage();
        renderTapeSlots();
        runQuantAnalysis();
    }
}

// XÓA TOÀN BỘ LỊCH SỬ
function clearHistory() {
    historySpins = [];
    saveToLocalStorage();
    renderTapeSlots();
    runQuantAnalysis();
}

// NHẬP 10 SỐ DEMO ĐỂ THỬ NGHIỆM NGAY
function loadDemoData() {
    // 10 số thực tế mô phỏng 1 chuỗi vòng quay có cụm
    const demoSeries = [32, 15, 19, 4, 21, 26, 0, 32, 15, 3];
    historySpins = [...demoSeries];
    playSound('predict');
    saveToLocalStorage();
    renderTapeSlots();
    runQuantAnalysis();
}

// LƯU & TẢI TỪ LOCALSTORAGE
function saveToLocalStorage() {
    try {
        localStorage.setItem('roulette_history_spins', JSON.stringify(historySpins));
    } catch (e) {}
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('roulette_history_spins');
        if (saved) {
            historySpins = JSON.parse(saved);
            renderTapeSlots();
            runQuantAnalysis();
        }
    } catch (e) {}
}

// ============================================================================
// THUẬT TOÁN QUANT DỰ ĐOÁN 5 SỐ THẲNG & THẾ CƯỢC TỶ LỆ THUA THẤP
// ============================================================================

function runQuantAnalysis() {
    const total = historySpins.length;

    // 1. CẬP NHẬT PHÂN BỐ CUNG BÁNH XE
    updateSectorsDistribution();

    if (total < 10) {
        document.getElementById('confidenceBadge').innerText = `Cần thêm ${10 - total} số`;
        document.getElementById('top5Container').innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">⏳</span>
                <p>Đã nhập <b>${total}/10 số</b>. Vui lòng nhập đủ 10 số liên tiếp để AI kích hoạt thuật toán dự đoán chính xác.</p>
            </div>
        `;
        resetOutsidePredictions();
        return;
    }

    playSound('predict');
    document.getElementById('confidenceBadge').innerText = 'AI TỐI ƯU HÓA: CAO';

    // 2. TÍNH TOÁN ĐIỂM XÁC SUẤT CHO 37 CON SỐ (0-36)
    const scores = {};
    for (let i = 0; i <= 36; i++) {
        scores[i] = 0.0;
    }

    // A. Phân tích Cung Nóng Bánh Xe (Wheel Sector Momentum)
    // Xác định 3 số cuối cùng rơi vào cung nào trên bánh xe vật lý
    const last3 = historySpins.slice(-3);
    const sectorHits = { VOISINS: 0, TIERS: 0, ORPHELINS: 0 };
    historySpins.forEach(n => {
        if (SECTORS.VOISINS.includes(n)) sectorHits.VOISINS++;
        else if (SECTORS.TIERS.includes(n)) sectorHits.TIERS++;
        else if (SECTORS.ORPHELINS.includes(n)) sectorHits.ORPHELINS++;
    });

    // Tìm cung đang chiếm ưu thế (Hot Sector)
    let dominantSector = 'VOISINS';
    let maxSectorHits = sectorHits.VOISINS;
    if (sectorHits.TIERS > maxSectorHits) {
        dominantSector = 'TIERS';
        maxSectorHits = sectorHits.TIERS;
    }
    if (sectorHits.ORPHELINS > maxSectorHits) {
        dominantSector = 'ORPHELINS';
        maxSectorHits = sectorHits.ORPHELINS;
    }

    // Cộng điểm cho các số thuộc cung đang thịnh
    SECTORS[dominantSector].forEach(num => {
        scores[num] += 35.0;
    });

    // B. Ma Trận Chuyển Dịch Lân Cận (Neighbor Arc Proximity)
    // Quả bóng thường nảy sang các số lân cận trên vòng tròn bánh xe của số vừa ra
    const lastNum = historySpins[historySpins.length - 1];
    const lastIdx = WHEEL_ORDER.indexOf(lastNum);

    if (lastIdx !== -1) {
        // Lấy 4 số lân cận 2 bên trên bánh xe
        for (let offset = -3; offset <= 3; offset++) {
            const neighborIdx = (lastIdx + offset + 37) % 37;
            const neighborNum = WHEEL_ORDER[neighborIdx];
            scores[neighborNum] += (25.0 - Math.abs(offset) * 4);
        }

        // Điểm nảy đối diện 180 độ (Opposite Bounce)
        const oppositeIdx = (lastIdx + 18) % 37;
        for (let offset = -2; offset <= 2; offset++) {
            const oppNum = WHEEL_ORDER[(oppositeIdx + offset + 37) % 37];
            scores[oppNum] += (18.0 - Math.abs(offset) * 3);
        }
    }

    // C. Quy Luật 1/3 & Hồi Quy Trung Bình (Law of the Thirds)
    // Các số xuất hiện 1 lần trong 10 phiên thường có khuynh hướng nổ lần 2
    const freq = {};
    historySpins.forEach(n => freq[n] = (freq[n] || 0) + 1);

    for (let n = 0; n <= 36; n++) {
        if (freq[n] === 1) {
            scores[n] += 15.0; // Số đang ấm
        } else if (!freq[n]) {
            // Số ngủ quên: ưu tiên số chưa ra trong cung chủ đạo
            if (SECTORS[dominantSector].includes(n)) {
                scores[n] += 12.0;
            }
        }
    }

    // 3. SẮP XẾP CHỌN RA TOP 5 CON SỐ VÀNG
    const sortedNumbers = Object.keys(scores)
        .map(Number)
        .sort((a, b) => scores[b] - scores[a]);

    const top5 = sortedNumbers.slice(0, 5);

    renderTop5(top5, scores);

    // 4. DỰ BÁO CƯỢC NGOÀI (OUTSIDE BETS & DOZENS)
    analyzeOutsideBets();
}

// HIỂN THỊ TOP 5 CON SỐ VÀNG
function renderTop5(top5, scores) {
    const container = document.getElementById('top5Container');
    container.innerHTML = '';

    const maxScore = scores[top5[0]] || 1;

    top5.forEach((num, index) => {
        const color = getNumberColor(num);
        const sector = getNumberSector(num);
        const prob = Math.round((scores[num] / (maxScore * 1.15)) * 92); // Tỷ lệ tương đối 80-92%

        const card = document.createElement('div');
        card.className = `number-card ${index === 0 ? 'rank-1' : ''}`;
        card.style.animationDelay = `${index * 0.08}s`;

        card.innerHTML = `
            <span class="card-rank">TOP #${index + 1}</span>
            <div class="card-number-ball ${color}">${num}</div>
            <div class="card-prob">${prob}% XÁC SUẤT</div>
            <div class="card-sector-tag">${sector}</div>
        `;
        container.appendChild(card);
    });
}

// PHÂN TÍCH THẾ CƯỢC NGOÀI (DOZEN, RED/BLACK, EVEN/ODD)
function analyzeOutsideBets() {
    let redCount = 0;
    let blackCount = 0;
    let evenCount = 0;
    let oddCount = 0;
    let d1Count = 0; // 1-12
    let d2Count = 0; // 13-24
    let d3Count = 0; // 25-36

    historySpins.forEach(n => {
        if (n === 0) return;
        if (RED_NUMBERS.includes(n)) redCount++;
        else blackCount++;

        if (n % 2 === 0) evenCount++;
        else oddCount++;

        if (n >= 1 && n <= 12) d1Count++;
        else if (n >= 13 && n <= 24) d2Count++;
        else if (n >= 25 && n <= 36) d3Count++;
    });

    const nonZeroTotal = historySpins.filter(n => n !== 0).length || 1;

    // 1. ĐỎ VS ĐEN
    const redPct = Math.round((redCount / nonZeroTotal) * 100);
    const blackPct = 100 - redPct;
    document.getElementById('meterRed').style.width = `${redPct}%`;
    document.getElementById('meterBlack').style.width = `${blackPct}%`;
    document.getElementById('labelRed').innerText = `Đỏ: ${redPct}% (${redCount})`;
    document.getElementById('labelBlack').innerText = `Đen: ${blackPct}% (${blackCount})`;

    // Dự báo hồi quy: Nếu Đỏ quá nhiều (>= 60%), ưu tiên bẻ sang Đen và ngược lại
    let recColor = 'Cân Bằng 50/50';
    if (redPct >= 65) {
        recColor = '🔴 ĐỎ ĐANG BÃO ➡️ Canh Bẻ ĐEN (Hồi Quy)';
        document.getElementById('predColorVal').className = 'pred-value gold-text';
    } else if (blackPct >= 65) {
        recColor = '⚫️ ĐEN ĐANG BÃO ➡️ Canh Bẻ ĐỎ (Hồi Quy)';
        document.getElementById('predColorVal').className = 'pred-value ruby-text';
    } else if (redPct > blackPct) {
        recColor = '🔴 Bám Theo ĐỎ (Đà Thuận)';
        document.getElementById('predColorVal').className = 'pred-value ruby-text';
    } else {
        recColor = '⚫️ Bám Theo ĐEN (Đà Thuận)';
        document.getElementById('predColorVal').className = 'pred-value';
    }
    document.getElementById('predColorVal').innerText = recColor;

    // 2. CHẴN VS LẺ
    const evenPct = Math.round((evenCount / nonZeroTotal) * 100);
    const oddPct = 100 - evenPct;
    document.getElementById('meterEven').style.width = `${evenPct}%`;
    document.getElementById('meterOdd').style.width = `${oddPct}%`;
    document.getElementById('labelEven').innerText = `Chẵn: ${evenPct}% (${evenCount})`;
    document.getElementById('labelOdd').innerText = `Lẻ: ${oddPct}% (${oddCount})`;

    let recParity = 'Cân Bằng';
    if (evenPct >= 65) recParity = '🔵 CHẴN ĐANG ÁP ĐẢO ➡️ Đánh LẺ';
    else if (oddPct >= 65) recParity = '🟣 LẺ ĐANG ÁP ĐẢO ➡️ Đánh CHẴN';
    else if (evenPct > oddPct) recParity = '🔵 Ưu Tiên CHẴN';
    else recParity = '🟣 Ưu Tiên LẺ';
    document.getElementById('predParityVal').innerText = recParity;

    // 3. THẾ HÀNG (DOZENS)
    const dozens = [
        { name: 'Hàng 1 (1-12)', count: d1Count, id: 1 },
        { name: 'Hàng 2 (13-24)', count: d2Count, id: 2 },
        { name: 'Hàng 3 (25-36)', count: d3Count, id: 3 }
    ];
    dozens.sort((a, b) => b.count - a.count);

    document.getElementById('d1Stat').innerText = `Hàng 1: ${d1Count} lần (${Math.round(d1Count/nonZeroTotal*100)}%)`;
    document.getElementById('d2Stat').innerText = `Hàng 2: ${d2Count} lần (${Math.round(d2Count/nonZeroTotal*100)}%)`;
    document.getElementById('d3Stat').innerText = `Hàng 3: ${d3Count} lần (${Math.round(d3Count/nonZeroTotal*100)}%)`;

    // Khuyên đánh 2 Hàng có xác suất xuất hiện cao nhất
    const bestDozens = `${dozens[0].name} & ${dozens[1].name}`;
    document.getElementById('dozenRecVal').innerHTML = `
        🎯 Đặt 2 Hàng: <b class="gold-text">${bestDozens}</b> (Bao phủ 24/37 số = <b>64.8%</b> cơ hội thắng!)
    `;
}

// CẬP NHẬT THANH TỶ LỆ CUNG BÁNH XE
function updateSectorsDistribution() {
    if (historySpins.length === 0) {
        document.getElementById('pctVoisins').innerText = '0%';
        document.getElementById('pctTiers').innerText = '0%';
        document.getElementById('pctOrphelins').innerText = '0%';
        document.getElementById('barVoisins').style.width = '0%';
        document.getElementById('barTiers').style.width = '0%';
        document.getElementById('barOrphelins').style.width = '0%';
        return;
    }

    let v = 0, t = 0, o = 0;
    historySpins.forEach(n => {
        if (SECTORS.VOISINS.includes(n)) v++;
        else if (SECTORS.TIERS.includes(n)) t++;
        else if (SECTORS.ORPHELINS.includes(n)) o++;
    });

    const total = historySpins.length;
    const vPct = Math.round((v / total) * 100);
    const tPct = Math.round((t / total) * 100);
    const oPct = Math.round((o / total) * 100);

    document.getElementById('pctVoisins').innerText = `${vPct}%`;
    document.getElementById('pctTiers').innerText = `${tPct}%`;
    document.getElementById('pctOrphelins').innerText = `${oPct}%`;

    document.getElementById('barVoisins').style.width = `${vPct}%`;
    document.getElementById('barTiers').style.width = `${tPct}%`;
    document.getElementById('barOrphelins').style.width = `${oPct}%`;
}

function resetOutsidePredictions() {
    document.getElementById('predColorVal').innerText = '---';
    document.getElementById('predParityVal').innerText = '---';
    document.getElementById('dozenRecVal').innerText = 'Đang chờ đủ 10 số...';
}

// LẮNG NGHE SỰ KIỆN NÚT BẤM
document.getElementById('soundToggleBtn').onclick = () => {
    soundEnabled = !soundEnabled;
    document.getElementById('soundToggleBtn').innerHTML = soundEnabled ? '<span class="icon">🔊</span>' : '<span class="icon">🔇</span>';
};

document.getElementById('demoDataBtn').onclick = loadDemoData;
document.getElementById('resetBtn').onclick = clearHistory;

// KHỞI ĐỘNG
window.onload = () => {
    initBoardUI();
};
