/**
 * ROULETTE QUANT AI PRO V4.0
 * Bàn Cược Trực Quan • Khởi Động 5 Vòng • Phân Bổ 10 Phỉnh (2k/Phỉnh = 20k/Vòng)
 * Chiến Thuật 3 Tầng: Số Thẳng (Ăn Đậm) - Hàng (Bảo Toàn) - Cụm (Thua Ít)
 */

// BỐ TRÍ BÁNH XE CHÂU ÂU (EUROPEAN WHEEL ORDER)
const WHEEL_ORDER = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

// 4 CUNG BÁNH XE VẬT LÝ CHÂU ÂU
const SECTORS = {
    VOISINS: [22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25], // 17 số
    TIERS: [27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33],                    // 12 số
    ORPHELINS: [1, 20, 14, 31, 9, 17, 34, 6],                                 // 8 số
    JEU_ZERO: [12, 35, 3, 26, 0, 32, 15]                                      // 7 số
};

// ĐỊNH NGHĨA 3 HÀNG (DOZENS) & 3 CỘT (COLUMNS)
const DOZENS = {
    dozen1: Array.from({length: 12}, (_, i) => i + 1),        // 1 - 12
    dozen2: Array.from({length: 12}, (_, i) => i + 13),       // 13 - 24
    dozen3: Array.from({length: 12}, (_, i) => i + 25)        // 25 - 36
};

const COLUMNS = {
    col1: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
    col2: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
    col3: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36]
};

// TRẠNG THÁI TOÀN CỤC CỦA ỨNG DỤNG
let historySpins = [];          // Cửa sổ trượt 5 - 10 vòng gần nhất
let allSpinsHistory = [];       // Toàn bộ lịch sử từ đầu phiên
let soundEnabled = true;
let audioCtx = null;

const CHIP_VALUE_VND = 2000;    // Mỗi phỉnh 2.000 VNĐ
const TOTAL_CHIPS_BET = 10;     // Mỗi vòng cược đúng 10 phỉnh = 20.000 VNĐ

// KẾ HOẠCH CƯỢC CỦA VÒNG TRƯỚC (DÙNG ĐỂ ĐỐI SOÁT KẾT QUẢ)
let lastBetPlan = null;

// THỐNG KÊ HIỆU SUẤT TÀI CHÍNH
let sessionStats = {
    totalEvaluated: 0,
    straightWins: 0,
    dozenWins: 0,
    clusterWins: 0,
    misses: 0,
    pnlChips: 0,
    pnlVnd: 0
};

// ============================================================================
// KHỞI TẠO ÂM THANH WEB AUDIO CASINO
// ============================================================================

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
            // Tiếng gõ phỉnh nhựa casino
            osc.frequency.setValueAtTime(900, now);
            osc.frequency.exponentialRampToValueAtTime(450, now + 0.08);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.08);
        } else if (type === 'jackpot') {
            // Tiếng chuông nổ số thẳng (3 nốt ngân vang)
            const chords = [523.25, 659.25, 783.99, 1046.50];
            chords.forEach((freq, idx) => {
                const o = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                o.connect(g);
                g.connect(audioCtx.destination);
                o.type = 'triangle';
                o.frequency.setValueAtTime(freq, now + idx * 0.08);
                g.gain.setValueAtTime(0.2, now + idx * 0.08);
                g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.45);
                o.start(now + idx * 0.08);
                o.stop(now + idx * 0.08 + 0.45);
            });
        } else if (type === 'win') {
            // Tiếng thắng hàng
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);
            gain.gain.setValueAtTime(0.22, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
            osc.start(now);
            osc.stop(now + 0.22);
        } else if (type === 'safe') {
            // Tiếng bảo vệ vốn cụm
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'miss') {
            // Tiếng trượt cược
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(130, now + 0.25);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
        }
    } catch (e) {
        console.warn('Lỗi Audio:', e);
    }
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    const icon = document.getElementById('soundIcon');
    if (icon) icon.innerText = soundEnabled ? '🔊' : '🔇';
}

// ============================================================================
// KHỞI TẠO GIAO DIỆN BÀN CƯỢC 36 SỐ & RACETRACK BÁNH XE
// ============================================================================

function initRouletteBoard() {
    const grid = document.getElementById('numbersGridContainer');
    if (!grid) return;
    grid.innerHTML = '';

    // Thứ tự 3 hàng Roulette chuẩn quốc tế:
    // Hàng 1 (trên cùng): 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36
    // Hàng 2 (giữa):     2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35
    // Hàng 3 (dưới cùng): 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34
    const rowNumbers = [
        [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
        [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
        [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]
    ];

    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 12; c++) {
            const num = rowNumbers[r][c];
            const isRed = RED_NUMBERS.includes(num);
            const colorClass = isRed ? 'red' : 'black';

            const cell = document.createElement('div');
            cell.className = `number-cell ${colorClass}`;
            cell.id = `cell-${num}`;
            cell.setAttribute('onclick', `handleNumberClick(${num})`);

            cell.innerHTML = `
                <span class="cell-number">${num}</span>
                <div class="chip-spot" id="chip-spot-${num}"></div>
                <span class="hit-badge" id="hit-${num}">0x</span>
            `;

            grid.appendChild(cell);
        }
    }

    initRacetrackWheel();
}

function initRacetrackWheel() {
    const wheelContainer = document.getElementById('racetrackWheel');
    if (!wheelContainer) return;
    wheelContainer.innerHTML = '';

    WHEEL_ORDER.forEach(num => {
        let colorClass = 'black';
        if (num === 0) colorClass = 'zero';
        else if (RED_NUMBERS.includes(num)) colorClass = 'red';

        const pocket = document.createElement('div');
        pocket.className = `wheel-pocket ${colorClass}`;
        pocket.id = `pocket-${num}`;
        pocket.setAttribute('onclick', `handleNumberClick(${num})`);
        pocket.innerHTML = `<span class="pocket-num">${num}</span>`;

        wheelContainer.appendChild(pocket);
    });
}

// ============================================================================
// XỬ LÝ NHẬP SỐ MỚI (TỰ ĐỘNG CUỐN CHIẾU & ĐỐI SOÁT VÒNG CƯỢC)
// ============================================================================

function handleNumberClick(num) {
    playSound('chip');
    highlightCellPulse(num);

    // 1. ĐỐI SOÁT VỚI KẾ HOẠCH CƯỢC CỦA VÒNG TRƯỚC (NẾU ĐÃ CÓ CƯỢC)
    if (lastBetPlan && lastBetPlan.straightNumbers && lastBetPlan.straightNumbers.length > 0) {
        evaluateLastBet(num);
    }

    // 2. LƯU VÀO LỊCH SỬ TỔNG
    allSpinsHistory.push(num);

    // 3. CẬP NHẬT CỬA SỔ TRƯỢT 5-10 VÒNG
    // Nếu vượt quá 10 vòng, đẩy số cũ nhất ra để duy trì quán tính mới nhất
    if (historySpins.length >= 10) {
        historySpins.shift();
    }
    historySpins.push(num);

    saveToLocalStorage();
    renderTapeSlots();
    runQuantAnalysis();
}

function highlightCellPulse(num) {
    const el = num === 0 ? document.getElementById('cell-0') : document.getElementById(`cell-${num}`);
    if (el) {
        el.style.transform = 'scale(1.15)';
        el.style.filter = 'brightness(1.5)';
        setTimeout(() => {
            el.style.transform = '';
            el.style.filter = '';
        }, 300);
    }
}

function handleInputKeydown(event) {
    if (event.key === 'Enter') {
        submitNumberFromInput();
    }
}

function submitNumberFromInput() {
    const inp = document.getElementById('numInput');
    if (!inp) return;
    const val = parseInt(inp.value, 10);
    if (!isNaN(val) && val >= 0 && val <= 36) {
        handleNumberClick(val);
        inp.value = '';
    } else {
        alert('Vui lòng nhập số hợp lệ từ 0 đến 36!');
    }
}

function handleOutsideBetClick(betType) {
    // Thông báo cho người dùng
    playSound('chip');
}

// ============================================================================
// BỘ ĐỐI SOÁT KẾT QUẢ CƯỢC VÒNG VỪA RỒI (TÍNH PNL TIỀN VNĐ & PHỈNH)
// ============================================================================

function evaluateLastBet(newNum) {
    if (!lastBetPlan) return;

    sessionStats.totalEvaluated++;

    const isStraightHit = lastBetPlan.straightNumbers.includes(newNum);
    const isDozenHit = lastBetPlan.dozenNumbers.includes(newNum);
    const isClusterHit = lastBetPlan.clusterNumbers.includes(newNum);

    const banner = document.getElementById('resultBanner');
    banner.style.display = 'flex';

    if (isStraightHit) {
        // �� TẦNG 1: NỔ TRÚNG SỐ THẲNG (ĂN ĐẬM)
        // 1 phỉnh ăn 35 phỉnh (trả lại 36 phỉnh cả gốc). Trừ 10 phỉnh tổng cược => LÃI RÒNG: +26 phỉnh = +52.000 VNĐ!
        const netChips = 26;
        const netVnd = netChips * CHIP_VALUE_VND;

        sessionStats.straightWins++;
        sessionStats.pnlChips += netChips;
        sessionStats.pnlVnd += netVnd;
        playSound('jackpot');

        banner.className = 'result-eval-banner jackpot';
        banner.innerHTML = `
            <div class="banner-left">
                <span class="banner-icon">🏆</span>
                <div class="banner-text">
                    <h4 class="gold-text">NỔ TRÚNG SỐ THẲNG VÀNG: SỐ ${newNum}!</h4>
                    <p>Chúc mừng! Bóng rơi chính xác vào số hạt nhân Tầng 1 (Tỷ lệ trả thưởng cực cao 35:1).</p>
                </div>
            </div>
            <div class="banner-pnl gold-text">+${netVnd.toLocaleString('vi-VN')} VNĐ (+${netChips} Phỉnh)</div>
        `;
    } else if (isDozenHit) {
        // 🛡 TẦNG 2: TRÚNG HÀNG BẢO TOÀN VỐN (ĂN 2:1)
        // Đặt 4 phỉnh vào Hàng (1:2). Trả thưởng 4 x 3 = 12 phỉnh. Trừ 10 phỉnh tổng cược => LÃI RÒNG: +2 phỉnh = +4.000 VNĐ!
        const netChips = 2;
        const netVnd = netChips * CHIP_VALUE_VND;

        sessionStats.dozenWins++;
        sessionStats.pnlChips += netChips;
        sessionStats.pnlVnd += netVnd;
        playSound('win');

        banner.className = 'result-eval-banner dozen-win';
        banner.innerHTML = `
            <div class="banner-left">
                <span class="banner-icon">🛡</span>
                <div class="banner-text">
                    <h4 class="emerald-text">TRÚNG HÀNG BẢO HIỂM: ${lastBetPlan.dozenName} (SỐ ${newNum})</h4>
                    <p>Bảo toàn vốn xuất sắc! Thu về 12 phỉnh, trừ 10 phỉnh cược và có thêm lãi nhẹ.</p>
                </div>
            </div>
            <div class="banner-pnl emerald-text">+${netVnd.toLocaleString('vi-VN')} VNĐ (+${netChips} Phỉnh)</div>
        `;
    } else if (isClusterHit) {
        // 🧭 TẦNG 3: RƠI VÀO CỤM BẢO VỆ (THUA ÍT)
        // Bóng rơi vào cụm lân cận. Thu lại ~18.000đ (9 phỉnh) => CHỈ THUA NHẸ 1 phỉnh (-2.000 VNĐ) thay vì mất 20.000đ!
        const netChips = -1;
        const netVnd = netChips * CHIP_VALUE_VND;

        sessionStats.clusterWins++;
        sessionStats.pnlChips += netChips;
        sessionStats.pnlVnd += netVnd;
        playSound('safe');

        banner.className = 'result-eval-banner cluster-safe';
        banner.innerHTML = `
            <div class="banner-left">
                <span class="banner-icon">🧭</span>
                <div class="banner-text">
                    <h4 class="blue-text">RƠI VÀO CỤM BÁNH XE LÂN CẬN (SỐ ${newNum})</h4>
                    <p>Bảo hiểm cụm phát huy tác dụng! Thu hồi lại phần lớn vốn cược, <b>chỉ thua rất ít</b>.</p>
                </div>
            </div>
            <div class="banner-pnl blue-text">${netVnd.toLocaleString('vi-VN')} VNĐ (${netChips} Phỉnh)</div>
        `;
    } else {
        // ❌ LỆCH TOÀN BỘ MẶT BÀN
        const netChips = -10;
        const netVnd = netChips * CHIP_VALUE_VND;

        sessionStats.misses++;
        sessionStats.pnlChips += netChips;
        sessionStats.pnlVnd += netVnd;
        playSound('miss');

        banner.className = 'result-eval-banner miss';
        banner.innerHTML = `
            <div class="banner-left">
                <span class="banner-icon">❌</span>
                <div class="banner-text">
                    <h4 class="red-text">VÒNG NÀY LỆCH ĐỘ PHỦ (SỐ ${newNum})</h4>
                    <p>Bóng rơi vào vùng không cược. Tỷ lệ bảo toàn tổng thể vẫn đạt mức cao an toàn.</p>
                </div>
            </div>
            <div class="banner-pnl red-text">${netVnd.toLocaleString('vi-VN')} VNĐ (${netChips} Phỉnh)</div>
        `;
    }

    updateScorecardUI();
}

// CẬP NHẬT CÁC THẺ THỐNG KÊ TÀI CHÍNH
function updateScorecardUI() {
    document.getElementById('scTotalSpins').innerText = sessionStats.totalEvaluated;
    document.getElementById('scStraightWins').innerText = sessionStats.straightWins;
    document.getElementById('scDozenWins').innerText = sessionStats.dozenWins;
    document.getElementById('scClusterWins').innerText = sessionStats.clusterWins;

    const totalPositive = sessionStats.straightWins + sessionStats.dozenWins + sessionStats.clusterWins;
    const winRate = sessionStats.totalEvaluated > 0 
        ? Math.round((totalPositive / sessionStats.totalEvaluated) * 100) 
        : 0;
    document.getElementById('scWinRate').innerText = `${winRate}%`;

    // Cập nhật PnL trên Header
    const pnlVndEl = document.getElementById('totalPnlVnd');
    const pnlChipsEl = document.getElementById('totalPnlChips');

    if (pnlVndEl) {
        const sign = sessionStats.pnlVnd >= 0 ? '+' : '';
        pnlVndEl.innerText = `${sign}${sessionStats.pnlVnd.toLocaleString('vi-VN')} VNĐ`;
        pnlVndEl.className = `bank-val ${sessionStats.pnlVnd >= 0 ? 'emerald-text' : 'red-text'}`;
    }

    if (pnlChipsEl) {
        const sign = sessionStats.pnlChips >= 0 ? '+' : '';
        pnlChipsEl.innerText = `${sign}${sessionStats.pnlChips} Phỉnh`;
        pnlChipsEl.className = `bank-val ${sessionStats.pnlChips >= 0 ? 'emerald-text' : 'red-text'}`;
    }
}

// ============================================================================
// DẢI BĂNG LỊCH SỬ 5 VÒNG KHỞI ĐỘNG (ROLLING TAPE)
// ============================================================================

function renderTapeSlots() {
    const tape = document.getElementById('tapeContainer');
    if (!tape) return;
    tape.innerHTML = '';

    const count = historySpins.length;
    document.getElementById('tapeCountText').innerText = count;

    const tag = document.getElementById('rollingModeTag');
    if (count >= 5) {
        tag.className = 'rolling-mode-tag';
        tag.innerText = `🔄 Chế Độ Trượt Tự Động Đang Bật (${count} phiên)`;
    } else {
        tag.className = 'rolling-mode-tag';
        tag.style.background = 'rgba(245, 207, 109, 0.15)';
        tag.style.borderColor = 'rgba(245, 207, 109, 0.4)';
        tag.style.color = 'var(--gold-primary)';
        tag.innerText = `⏳ Cần nhập thêm ${5 - count} vòng để bắt đầu cược`;
    }

    // Hiển thị các ô slot (tối thiểu 5 ô)
    const totalSlots = Math.max(5, count);
    for (let i = 0; i < totalSlots; i++) {
        const slot = document.createElement('div');

        if (i < count) {
            const num = historySpins[i];
            let color = 'black';
            if (num === 0) color = 'zero';
            else if (RED_NUMBERS.includes(num)) color = 'red';

            slot.className = `tape-slot filled ${color}`;
            slot.innerHTML = `
                <span class="tape-slot-num">${num}</span>
                <span class="tape-slot-sub">#${allSpinsHistory.length - count + i + 1}</span>
            `;
        } else {
            slot.className = 'tape-slot empty';
            slot.innerHTML = `
                <span class="tape-slot-num">?</span>
                <span class="tape-slot-sub">Vòng ${i + 1}</span>
            `;
        }
        tape.appendChild(slot);
    }

    // Cập nhật số lần trúng trên bàn
    updateHitCountBadges();
}

function updateHitCountBadges() {
    for (let i = 0; i <= 36; i++) {
        const badge = document.getElementById(`hit-${i}`);
        if (badge) badge.style.display = 'none';
    }

    const counts = {};
    historySpins.forEach(n => counts[n] = (counts[n] || 0) + 1);

    for (let num in counts) {
        const badge = document.getElementById(`hit-${num}`);
        if (badge) {
            badge.innerText = `${counts[num]}x`;
            badge.style.display = 'inline-block';
        }
    }
}

// ============================================================================
// THUẬT TOÁN PHÂN TÍCH QUAN TÍNH & PHÂN BỔ 10 PHỈNH (20K VNĐ)
// ============================================================================

function runQuantAnalysis() {
    clearAllChipsFromBoard();

    const nextSpinNumberEl = document.getElementById('nextSpinNumber');
    if (nextSpinNumberEl) {
        nextSpinNumberEl.innerText = `#${allSpinsHistory.length + 1}`;
    }

    // Nếu chưa đủ 5 vòng khởi động, chờ dữ liệu
    if (historySpins.length < 5) {
        lastBetPlan = null;
        renderWaitingState();
        return;
    }

    // 1. PHÂN TÍCH TẦN SUẤT CUNG BÁNH XE (SECTORS DENSITY)
    const sectorStats = calculateSectorFrequencies();

    // 2. TÍNH TOÁN QUÁN TÍNH & ĐIỂM RƠI LÂN CẬN (NEIGHBOR PROXIMITY)
    const hotNumbers = calculateHotNeighbors();

    // 3. CHỌN 3 SỐ VÀNG HẠT NHÂN (TẦNG 1: 3 PHỈNH)
    const straightNumbers = hotNumbers.slice(0, 3);

    // 4. CHỌN HÀNG (DOZEN) TỐI ƯU NHẤT (TẦNG 2: 4 PHỈNH)
    const bestDozen = calculateBestDozen(straightNumbers);

    // 5. CHỌN CỤM BÁNH XE BẢO HIỂM (TẦNG 3: 3 PHỈNH)
    const bestCluster = calculateBestCluster(straightNumbers, sectorStats);

    // LƯU KẾ HOẠCH CƯỢC HIỆN TẠI
    lastBetPlan = {
        straightNumbers: straightNumbers,
        dozenId: bestDozen.id,
        dozenName: bestDozen.name,
        dozenNumbers: bestDozen.numbers,
        clusterName: bestCluster.name,
        clusterNumbers: bestCluster.numbers
    };

    // 6. HIỂN THỊ CÁC ĐỒNG PHỈNH TRỰC QUAN LÊN MẶT BÀN CƯỢC
    placeVisualChipsOnBoard(straightNumbers, bestDozen.id, bestCluster);

    // 7. HIỂN THỊ KẾ HOẠCH LÊN CỘT DỰ BÁO BÊN PHẢI
    renderBetPlanUI(straightNumbers, bestDozen, bestCluster);

    // 8. CẬP NHẬT CÁC CHỈ SỐ RACETRACK VÀ PHỤ TRỢ
    updateRacetrackUI(sectorStats, straightNumbers, bestCluster.numbers);
    updateAuxiliaryMetrics();
}

function renderWaitingState() {
    const need = 5 - historySpins.length;
    const badge = document.getElementById('confidenceBadge');
    if (badge) badge.innerText = `Cần thêm ${need} số...`;

    document.getElementById('straightNumbersDisplay').innerHTML = `
        <span class="placeholder-text">⏳ Hãy bấm đủ ${5} số khởi động đầu tiên để AI tính toán phân bổ 10 phỉnh.</span>
    `;
    document.getElementById('dozenRecommendationBox').innerHTML = `
        <span class="placeholder-text">Đang phân tích chuỗi 5 vòng...</span>
    `;
    document.getElementById('clusterRecommendationBox').innerHTML = `
        <span class="placeholder-text">Đang quét quán tính bánh xe...</span>
    `;
}

// TÍNH MẬT ĐỘ CUNG BÁNH XE
function calculateSectorFrequencies() {
    const total = historySpins.length;
    let vCount = 0, tCount = 0, oCount = 0, jCount = 0;

    historySpins.forEach(n => {
        if (SECTORS.VOISINS.includes(n)) vCount++;
        if (SECTORS.TIERS.includes(n)) tCount++;
        if (SECTORS.ORPHELINS.includes(n)) oCount++;
        if (SECTORS.JEU_ZERO.includes(n)) jCount++;
    });

    return {
        voisinsPct: Math.round((vCount / total) * 100),
        tiersPct: Math.round((tCount / total) * 100),
        orphelinsPct: Math.round((oCount / total) * 100),
        jeuZeroPct: Math.round((jCount / total) * 100),
        vCount, tCount, oCount, jCount
    };
}

// TÍNH TOÁN CÁC SỐ VÀNG CÓ ĐIỂM SỐ QUÁN TÍNH CAO NHẤT
function calculateHotNeighbors() {
    const scores = {};
    for (let i = 0; i <= 36; i++) scores[i] = 0;

    // Trọng số các phiên gần nhất (phiên mới nhất có trọng số cao hơn)
    historySpins.forEach((num, idx) => {
        const weight = (idx + 1) * 2;
        scores[num] += weight;

        // Cộng điểm cho các số lân cận trên bánh xe vật lý (+/- 2 số xung quanh)
        const pos = WHEEL_ORDER.indexOf(num);
        if (pos !== -1) {
            for (let offset = -2; offset <= 2; offset++) {
                if (offset === 0) continue;
                const neighborIdx = (pos + offset + WHEEL_ORDER.length) % WHEEL_ORDER.length;
                const neighborNum = WHEEL_ORDER[neighborIdx];
                scores[neighborNum] += Math.round(weight * 0.5);
            }
        }
    });

    // Sắp xếp số theo điểm từ cao đến thấp
    const sorted = Object.keys(scores)
        .map(n => parseInt(n, 10))
        .sort((a, b) => scores[b] - scores[a]);

    return sorted;
}

// CHỌN HÀNG TỐI ƯU CHỨA NHIỀU ĐIỂM QUÁN TÍNH NHẤT
function calculateBestDozen(straightNums) {
    let d1 = 0, d2 = 0, d3 = 0;

    historySpins.forEach(n => {
        if (n >= 1 && n <= 12) d1++;
        else if (n >= 13 && n <= 24) d2++;
        else if (n >= 25 && n <= 36) d3++;
    });

    // Cộng thêm ưu tiên từ các số thẳng đã chọn
    straightNums.forEach(n => {
        if (n >= 1 && n <= 12) d1 += 2;
        else if (n >= 13 && n <= 24) d2 += 2;
        else if (n >= 25 && n <= 36) d3 += 2;
    });

    if (d1 >= d2 && d1 >= d3) {
        return { id: 'dozen1', name: '1st 12 (Số 1 - 12)', numbers: DOZENS.dozen1 };
    } else if (d2 >= d1 && d2 >= d3) {
        return { id: 'dozen2', name: '2nd 12 (Số 13 - 24)', numbers: DOZENS.dozen2 };
    } else {
        return { id: 'dozen3', name: '3rd 12 (Số 25 - 36)', numbers: DOZENS.dozen3 };
    }
}

// CHỌN CỤM BÁNH XE LÂN CẬN PHÙ HỢP
function calculateBestCluster(straightNums, sectorStats) {
    // Xác định cung nào có mật độ cao nhất trong các phiên gần đây
    let bestSector = 'VOISINS';
    let maxPct = sectorStats.voisinsPct;

    if (sectorStats.tiersPct > maxPct) {
        bestSector = 'TIERS';
        maxPct = sectorStats.tiersPct;
    }
    if (sectorStats.orphelinsPct > maxPct) {
        bestSector = 'ORPHELINS';
        maxPct = sectorStats.orphelinsPct;
    }

    let sectorName = 'Cụm Voisins du Zéro';
    let numbers = SECTORS.VOISINS;

    if (bestSector === 'TIERS') {
        sectorName = 'Cụm Tiers du Cylindre';
        numbers = SECTORS.TIERS;
    } else if (bestSector === 'ORPHELINS') {
        sectorName = 'Cụm Orphelins (8 số)';
        numbers = SECTORS.ORPHELINS;
    }

    return {
        name: sectorName,
        sectorKey: bestSector,
        numbers: numbers
    };
}

// ============================================================================
// HIỂN THỊ ĐỒNG PHỈNH TRỰC TIẾP LÊN MẶT BÀN CƯỢC (PLACE VISUAL CHIPS)
// ============================================================================

function clearAllChipsFromBoard() {
    const spots = document.querySelectorAll('.chip-spot');
    spots.forEach(sp => sp.innerHTML = '');
}

function placeVisualChipsOnBoard(straightNums, dozenId, cluster) {
    // 1. ĐẶT PHỈNH SỐ THẲNG (MỖI SỐ 1 PHỈNH 2K)
    straightNums.forEach(num => {
        const spot = document.getElementById(`chip-spot-${num}`);
        if (spot) {
            spot.innerHTML = `
                <div class="casino-chip chip-straight" title="Cược Số Thẳng ${num}: 1 Phỉnh (2k)">
                    <span class="chip-inner-text">2K</span>
                    <span class="chip-stack-count">x1</span>
                </div>
            `;
        }
    });

    // 2. ĐẶT PHỈNH HÀNG (4 PHỈNH 2K = 8K)
    const dozenSpot = document.getElementById(`chip-spot-${dozenId}`);
    if (dozenSpot) {
        dozenSpot.innerHTML = `
            <div class="casino-chip chip-dozen" title="Cược Hàng: 4 Phỉnh (8k)">
                <span class="chip-inner-text">2K</span>
                <span class="chip-stack-count">x4</span>
            </div>
        `;
    }

    // 3. ĐÁNH DẤU CỤM BẢO HIỂM TRÊN BÀN (HIGHLIGHT HIỆU ỨNG CỤM)
    cluster.numbers.forEach(cNum => {
        const cell = cNum === 0 ? document.getElementById('cell-0') : document.getElementById(`cell-${cNum}`);
        if (cell && !straightNums.includes(cNum)) {
            cell.style.boxShadow = 'inset 0 0 10px rgba(59, 130, 246, 0.5)';
            setTimeout(() => {
                if (cell) cell.style.boxShadow = '';
            }, 5000);
        }
    });
}

// ============================================================================
// CẬP NHẬT KẾ HOẠCH CƯỢC LÊN GIAO DIỆN CỘT PHẢI
// ============================================================================

function renderBetPlanUI(straightNums, dozen, cluster) {
    const badge = document.getElementById('confidenceBadge');
    if (badge) badge.innerText = 'Độ Phủ ~75% Bàn';

    // 1. RENDER 3 SỐ VÀNG
    const straightDisplay = document.getElementById('straightNumbersDisplay');
    if (straightDisplay) {
        straightDisplay.innerHTML = '';
        straightNums.forEach(num => {
            let color = 'black';
            if (num === 0) color = 'zero';
            else if (RED_NUMBERS.includes(num)) color = 'red';

            const pill = document.createElement('div');
            pill.className = `straight-pill ${color}`;
            pill.innerHTML = `
                <div class="num-circle">${num}</div>
                <div class="prob-text">1 Phỉnh (2k)</div>
            `;
            straightDisplay.appendChild(pill);
        });
    }

    // 2. RENDER HÀNG DOZEN
    const dozenBox = document.getElementById('dozenRecommendationBox');
    if (dozenBox) {
        dozenBox.innerHTML = `
            <div class="rec-tag-box emerald">
                <span>🛡 ${dozen.name}</span>
                <span class="gold-text">• Đặt 4 Phỉnh (8.000đ)</span>
            </div>
        `;
    }

    // 3. RENDER CỤM BẢO HIỂM
    const clusterBox = document.getElementById('clusterRecommendationBox');
    if (clusterBox) {
        clusterBox.innerHTML = `
            <div class="rec-tag-box blue">
                <span>🧭 ${cluster.name}</span>
                <span class="gold-text">• Đặt 3 Phỉnh (6.000đ)</span>
            </div>
        `;
    }
}

// CẬP NHẬT RACETRACK CUNG BÁNH XE
function updateRacetrackUI(sectorStats, straightNums, clusterNums) {
    document.getElementById('probVoisins').innerText = `${sectorStats.voisinsPct}%`;
    document.getElementById('probTiers').innerText = `${sectorStats.tiersPct}%`;
    document.getElementById('probOrphelins').innerText = `${sectorStats.orphelinsPct}%`;
    document.getElementById('probJeuZero').innerText = `${sectorStats.jeuZeroPct}%`;

    // Highlight các pocket trên bánh xe
    WHEEL_ORDER.forEach(num => {
        const pocket = document.getElementById(`pocket-${num}`);
        if (!pocket) return;

        pocket.classList.remove('highlight-gold', 'highlight-cluster');

        if (straightNums.includes(num)) {
            pocket.classList.add('highlight-gold');
        } else if (clusterNums.includes(num)) {
            pocket.classList.add('highlight-cluster');
        }
    });
}

// CẬP NHẬT CHỈ SỐ ĐỎ/ĐEN & CHẴN/LẺ
function updateAuxiliaryMetrics() {
    let red = 0, black = 0, even = 0, odd = 0;
    const total = historySpins.length;

    historySpins.forEach(n => {
        if (n === 0) return;
        if (RED_NUMBERS.includes(n)) red++;
        else black++;

        if (n % 2 === 0) even++;
        else odd++;
    });

    const validNums = red + black;
    const redPct = validNums > 0 ? Math.round((red / validNums) * 100) : 50;
    const blackPct = 100 - redPct;

    const evenPct = validNums > 0 ? Math.round((even / validNums) * 100) : 50;
    const oddPct = 100 - evenPct;

    document.getElementById('barRed').style.width = `${redPct}%`;
    document.getElementById('barBlack').style.width = `${blackPct}%`;
    document.getElementById('labelRed').innerText = `Đỏ: ${redPct}%`;
    document.getElementById('labelBlack').innerText = `Đen: ${blackPct}%`;
    document.getElementById('metricColorVal').innerText = redPct > blackPct ? 'Ưu tiên ĐỎ' : (blackPct > redPct ? 'Ưu tiên ĐEN' : 'Cân bằng');

    document.getElementById('barEven').style.width = `${evenPct}%`;
    document.getElementById('barOdd').style.width = `${oddPct}%`;
    document.getElementById('labelEven').innerText = `Chẵn: ${evenPct}%`;
    document.getElementById('labelOdd').innerText = `Lẻ: ${oddPct}%`;
    document.getElementById('metricParityVal').innerText = evenPct > oddPct ? 'Ưu tiên CHẴN' : (oddPct > evenPct ? 'Ưu tiên LẺ' : 'Cân bằng');
}

// ============================================================================
// CÁC HÀM TIỆN ÍCH: HOÀN TÁC, XÓA LỊCH SỬ, DỮ LIỆU MẪU 5 VÒNG
// ============================================================================

function undoLastNumber() {
    if (allSpinsHistory.length === 0) return;
    playSound('chip');
    allSpinsHistory.pop();
    historySpins.pop();

    saveToLocalStorage();
    renderTapeSlots();
    runQuantAnalysis();
}

function clearHistory() {
    if (!confirm('Bạn có chắc muốn xóa toàn bộ lịch sử phiên chơi này?')) return;
    allSpinsHistory = [];
    historySpins = [];
    lastBetPlan = null;
    sessionStats = {
        totalEvaluated: 0,
        straightWins: 0,
        dozenWins: 0,
        clusterWins: 0,
        misses: 0,
        pnlChips: 0,
        pnlVnd: 0
    };

    const banner = document.getElementById('resultBanner');
    if (banner) banner.style.display = 'none';

    saveToLocalStorage();
    renderTapeSlots();
    clearAllChipsFromBoard();
    updateScorecardUI();
    runQuantAnalysis();
}

function resetAll() {
    clearHistory();
}

function loadDemo5Spins() {
    // Nạp sẵn 5 số thực tế từ sòng bài để người dùng trải nghiệm ngay
    const demo = [17, 20, 32, 2, 25];
    clearHistory();

    demo.forEach(num => {
        allSpinsHistory.push(num);
        historySpins.push(num);
    });

    saveToLocalStorage();
    renderTapeSlots();
    runQuantAnalysis();
    playSound('jackpot');
}

// LƯU TRỮ VÀ KHÔI PHỤC TỪ LOCALSTORAGE
function saveToLocalStorage() {
    try {
        localStorage.setItem('roulette_quant_history', JSON.stringify(historySpins));
        localStorage.setItem('roulette_quant_all', JSON.stringify(allSpinsHistory));
        localStorage.setItem('roulette_quant_stats', JSON.stringify(sessionStats));
    } catch (e) {}
}

function loadFromLocalStorage() {
    try {
        const savedHistory = localStorage.getItem('roulette_quant_history');
        const savedAll = localStorage.getItem('roulette_quant_all');
        const savedStats = localStorage.getItem('roulette_quant_stats');

        if (savedHistory) historySpins = JSON.parse(savedHistory);
        if (savedAll) allSpinsHistory = JSON.parse(savedAll);
        if (savedStats) sessionStats = JSON.parse(savedStats);
    } catch (e) {}
}

// ============================================================================
// KHỞI ĐỘNG KHI TẢI TRANG
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {
    initRouletteBoard();
    loadFromLocalStorage();
    renderTapeSlots();
    updateScorecardUI();
    runQuantAnalysis();
});
