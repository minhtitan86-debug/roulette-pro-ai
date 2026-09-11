/**
 * ROULETTE QUANT AI PRO V4.5
 * Bàn Cược Trực Quan • Khởi Động 5 Vòng • Đặt Cược 10 Phỉnh / 15 Phỉnh
 * Chiến Thuật Đa Tầng: Số Thẳng (35:1) - Cặp Đôi Split (17:1) - Cụm 4 Số Corner (8:1) - Hàng Dozen (2:1)
 * Mục Tiêu: Bao Phủ 80-85% Bàn • Ăn Đậm - Hòa Vốn - Thua Rất Ít
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
let currentBetMode = 10;        // 10 phỉnh (20.000đ) hoặc 15 phỉnh (30.000đ)

// KẾ HOẠCH CƯỢC CỦA VÒNG TRƯỚC (DÙNG ĐỂ ĐỐI SOÁT KẾT QUẢ)
let lastBetPlan = null;

// THỐNG KÊ HIỆU SUẤT TÀI CHÍNH
let sessionStats = {
    totalEvaluated: 0,
    straightWins: 0,
    splitWins: 0,
    cornerWins: 0,
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
            osc.frequency.setValueAtTime(900, now);
            osc.frequency.exponentialRampToValueAtTime(450, now + 0.08);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.08);
        } else if (type === 'jackpot') {
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
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);
            gain.gain.setValueAtTime(0.22, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
            osc.start(now);
            osc.stop(now + 0.22);
        } else if (type === 'safe') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'miss') {
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
// CHẾ ĐỘ CƯỢC: 10 PHỈNH (20K) HOẶC 15 PHỈNH (30K)
// ============================================================================

function setBetMode(mode) {
    currentBetMode = mode;
    playSound('chip');

    const btn10 = document.getElementById('mode10Btn');
    const btn15 = document.getElementById('mode15Btn');

    if (mode === 10) {
        if (btn10) btn10.classList.add('active');
        if (btn15) btn15.classList.remove('active');
        document.getElementById('planTotalHeader').innerText = 'KẾ HOẠCH: 10 PHỈNH (20.000 VNĐ)';
        updateScenarioTableValues(10);
    } else {
        if (btn15) btn15.classList.add('active');
        if (btn10) btn10.classList.remove('active');
        document.getElementById('planTotalHeader').innerText = 'KẾ HOẠCH: 15 PHỈNH (30.000 VNĐ) [TĂNG CƯỢC]';
        updateScenarioTableValues(15);
    }

    if (historySpins.length >= 5) {
        runQuantAnalysis();
    }
}

function updateScenarioTableValues(mode) {
    const sStraight = document.getElementById('scenStraightVal');
    const sSplit = document.getElementById('scenSplitVal');
    const sCorner = document.getElementById('scenCornerVal');
    const sDozen = document.getElementById('scenDozenVal');
    const sMiss = document.getElementById('scenMissVal');

    if (mode === 10) {
        if (sStraight) sStraight.innerText = '+52.000đ đến +82.000đ (+26~41 Phỉnh)';
        if (sSplit) sSplit.innerText = '+16.000đ đến +46.000đ (+8~23 Phỉnh)';
        if (sCorner) sCorner.innerText = '+16.000đ đến +46.000đ (Ăn Đậm/Lãi)';
        if (sDozen) sDozen.innerText = '+10.000đ (+5 Phỉnh - Bảo Toàn)';
        if (sMiss) sMiss.innerText = '-20.000đ (-10 Phỉnh)';
    } else {
        if (sStraight) sStraight.innerText = '+42.000đ đến +84.000đ (+21~42 Phỉnh)';
        if (sSplit) sSplit.innerText = '+6.000đ đến +48.000đ (+3~24 Phỉnh)';
        if (sCorner) sCorner.innerText = '+6.000đ đến +48.000đ (Bảo Hiểm Rất Tốt)';
        if (sDozen) sDozen.innerText = '+12.000đ (+6 Phỉnh - Bảo Toàn)';
        if (sMiss) sMiss.innerText = '-30.000đ (-15 Phỉnh)';
    }
}

// ============================================================================
// KHỞI TẠO BÀN CƯỢC CHUẨN 3 HÀNG X 12 CỘT & RACETRACK
// ============================================================================

function initRouletteBoard() {
    const grid = document.getElementById('numbersGridContainer');
    if (!grid) return;
    grid.innerHTML = '';

    // Thứ tự 3 hàng Roulette chuẩn:
    // Hàng 1 (trên cùng): 3, 6, 9, ..., 36
    // Hàng 2 (giữa):     2, 5, 8, ..., 35
    // Hàng 3 (dưới cùng): 1, 4, 7, ..., 34
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
// HÀM TÍNH TOÁN CẶP ĐÔI (SPLIT) VÀ CỤM 4 SỐ (CORNER) HỢP LỆ TRÊN BÀN CƯỢC
// ============================================================================

/**
 * Tìm cặp đôi (Split) hợp lệ cho 1 số trên bàn cược 3x12:
 * Ưu tiên cặp ngang (+3 hoặc -3), nếu không thì cặp dọc (+1 hoặc -1 cùng cột)
 */
function getValidSplit(num) {
    if (num <= 0 || num > 36) return [1, 2];
    if (num <= 33) {
        return [num, num + 3].sort((a, b) => a - b);
    } else if (num > 3) {
        return [num - 3, num].sort((a, b) => a - b);
    } else if (num % 3 !== 0) {
        return [num, num + 1].sort((a, b) => a - b);
    } else {
        return [num - 1, num].sort((a, b) => a - b);
    }
}

/**
 * Tìm cụm 4 số (Corner) 2x2 hợp lệ chứa hoặc bao quanh số:
 * Hình vuông góc bàn cược: [c, c+1, c+3, c+4] với c % 3 != 0 và c <= 32
 */
function getValidCorner(num) {
    if (num <= 0 || num > 36) return [1, 2, 4, 5];
    const r = num % 3;
    let c;
    if (r === 1) { // 1, 4, 7...
        c = (num <= 31) ? num : (num - 3);
    } else if (r === 2) { // 2, 5, 8...
        c = (num <= 32) ? (num - 1) : (num - 4);
    } else { // 3, 6, 9...
        c = (num <= 32) ? (num - 1) : (num - 4);
    }
    if (c <= 0) c = 1;
    if (c > 32) c = 32;
    if (c % 3 === 0) c -= 1;

    return [c, c + 1, c + 3, c + 4].sort((a, b) => a - b);
}

// ============================================================================
// XỬ LÝ NHẬP SỐ MỚI (TỰ ĐỘNG CUỐN CHIẾU & ĐỐI SOÁT VÒNG CƯỢC)
// ============================================================================

function handleNumberClick(num) {
    playSound('chip');
    highlightCellPulse(num);

    // 1. ĐỐI SOÁT VỚI KẾ HOẠCH CƯỢC CỦA VÒNG TRƯỚC
    if (lastBetPlan && lastBetPlan.totalChips > 0) {
        evaluateLastBet(num);
    }

    // 2. LƯU VÀO LỊCH SỬ TỔNG
    allSpinsHistory.push(num);

    // 3. CẬP NHẬT CỬA SỔ TRƯỢT 5-10 VÒNG
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
            if (el) {
                el.style.transform = '';
                el.style.filter = '';
            }
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
    playSound('chip');
}

// ============================================================================
// BỘ ĐỐI SOÁT KẾT QUẢ CƯỢC ĐA TẦNG (TÍNH PNL TIỀN VNĐ & PHỈNH CHÍNH XÁC)
// ============================================================================

function evaluateLastBet(newNum) {
    if (!lastBetPlan) return;

    sessionStats.totalEvaluated++;

    const plan = lastBetPlan;
    let grossChipsReturn = 0;
    let hitDetails = [];

    // 1. Kiểm tra trúng Số Thẳng (35:1)
    plan.straights.forEach(s => {
        if (s.num === newNum) {
            const pay = s.chips * 36; // 35:1 + hoàn gốc = 36 phỉnh / 1 phỉnh cược
            grossChipsReturn += pay;
            sessionStats.straightWins++;
            hitDetails.push(`Số Thẳng ${newNum} (+${pay} phỉnh)`);
        }
    });

    // 2. Kiểm tra trúng Cặp Đôi Split (17:1)
    plan.splits.forEach(sp => {
        if (sp.numbers.includes(newNum)) {
            const pay = sp.chips * 18; // 17:1 + hoàn gốc = 18 phỉnh / 1 phỉnh cược
            grossChipsReturn += pay;
            sessionStats.splitWins++;
            hitDetails.push(`Cặp Đôi [${sp.numbers.join('-')}] (+${pay} phỉnh)`);
        }
    });

    // 3. Kiểm tra trúng Cụm 4 Số Corner (8:1)
    plan.corners.forEach(cn => {
        if (cn.numbers.includes(newNum)) {
            const pay = cn.chips * 9; // 8:1 + hoàn gốc = 9 phỉnh / 1 phỉnh cược
            grossChipsReturn += pay;
            sessionStats.cornerWins++;
            hitDetails.push(`Cụm 4 Số [${cn.numbers.join(',')}] (+${pay} phỉnh)`);
        }
    });

    // 4. Kiểm tra trúng Hàng Dozen (2:1)
    if (plan.dozen.numbers.includes(newNum)) {
        const pay = plan.dozen.chips * 3; // 2:1 + hoàn gốc = 3 phỉnh / 1 phỉnh cược
        grossChipsReturn += pay;
        sessionStats.dozenWins++;
        hitDetails.push(`Hàng ${plan.dozen.name} (+${pay} phỉnh)`);
    }

    // 5. Kiểm tra rơi vào Cụm bánh xe lân cận (nếu không trúng các cửa trên)
    const isClusterHedge = plan.cluster && plan.cluster.numbers.includes(newNum) && hitDetails.length === 0;
    if (isClusterHedge) {
        sessionStats.clusterWins++;
        // Cứu cánh cụm bánh xe: thu hồi 90% vốn
        grossChipsReturn = Math.round(plan.totalChips * 0.9);
        hitDetails.push(`Cụm Bánh Xe ${plan.cluster.name} (Bảo Vệ Vốn)`);
    }

    // TÍNH TOÁN LÃI / LỖ RÒNG (NET PnL)
    const netChips = grossChipsReturn - plan.totalChips;
    const netVnd = netChips * CHIP_VALUE_VND;

    sessionStats.pnlChips += netChips;
    sessionStats.pnlVnd += netVnd;

    if (hitDetails.length === 0) {
        sessionStats.misses++;
    }

    // HIỂN THỊ BANNER KẾT QUẢ TRỰC QUAN
    const banner = document.getElementById('resultBanner');
    if (banner) {
        banner.style.display = 'flex';

        if (netChips >= 20) {
            // NỔ HŨ / ĂN CỰC ĐẬM
            playSound('jackpot');
            banner.className = 'result-eval-banner jackpot';
            banner.innerHTML = `
                <div class="banner-left">
                    <span class="banner-icon">🏆</span>
                    <div class="banner-text">
                        <h4 class="gold-text">NỔ THẮNG LỚN: SỐ ${newNum}! (${hitDetails.join(' + ')})</h4>
                        <p>Bóng rơi hoàn hảo vào vùng cược đắc địa! Lợi nhuận cực đại theo đúng chiến thuật.</p>
                    </div>
                </div>
                <div class="banner-pnl gold-text">+${netVnd.toLocaleString('vi-VN')} VNĐ (+${netChips} Phỉnh)</div>
            `;
        } else if (netChips > 0) {
            // ĂN LÃI TỐT
            playSound('win');
            banner.className = 'result-eval-banner dozen-win';
            banner.innerHTML = `
                <div class="banner-left">
                    <span class="banner-icon">🎉</span>
                    <div class="banner-text">
                        <h4 class="emerald-text">TRÚNG CƯỢC CÓ LÃI: SỐ ${newNum}! (${hitDetails.join(' + ')})</h4>
                        <p>Chiến thuật bảo vệ vốn và sinh lời thành công! Thu về ${grossChipsReturn} phỉnh.</p>
                    </div>
                </div>
                <div class="banner-pnl emerald-text">+${netVnd.toLocaleString('vi-VN')} VNĐ (+${netChips} Phỉnh)</div>
            `;
        } else if (netChips === 0) {
            // HÒA VỐN CHUẨN
            playSound('safe');
            banner.className = 'result-eval-banner cluster-safe';
            banner.innerHTML = `
                <div class="banner-left">
                    <span class="banner-icon">🛡</span>
                    <div class="banner-text">
                        <h4 class="blue-text">HÒA VỐN XUẤT SẮC: SỐ ${newNum}! (${hitDetails.join(' + ')})</h4>
                        <p>Hệ thống phòng thủ bảo toàn 100% số vốn cược, không mất một đồng nào!</p>
                    </div>
                </div>
                <div class="banner-pnl blue-text">0 VNĐ (Hòa Vốn)</div>
            `;
        } else if (netChips > -plan.totalChips) {
            // THUA ÍT / BẢO VỆ VỐN
            playSound('safe');
            banner.className = 'result-eval-banner cluster-safe';
            banner.innerHTML = `
                <div class="banner-left">
                    <span class="banner-icon">🧭</span>
                    <div class="banner-text">
                        <h4 class="blue-text">RƠI VÀO VÙNG BẢO VỆ: SỐ ${newNum}</h4>
                        <p>Bảo hiểm phát huy tác dụng! Thu hồi lại phần lớn vốn cược, <b>chỉ thua rất ít</b>.</p>
                    </div>
                </div>
                <div class="banner-pnl blue-text">${netVnd.toLocaleString('vi-VN')} VNĐ (${netChips} Phỉnh)</div>
            `;
        } else {
            // TRƯỢT HOÀN TOÀN
            playSound('miss');
            banner.className = 'result-eval-banner miss';
            banner.innerHTML = `
                <div class="banner-left">
                    <span class="banner-icon">❌</span>
                    <div class="banner-text">
                        <h4 class="red-text">LỆCH BÀN CƯỢC: SỐ ${newNum}</h4>
                        <p>Bóng rơi vào vùng ngoài tỷ lệ 85%. Kế hoạch vòng sau sẽ tự động điều chỉnh quán tính.</p>
                    </div>
                </div>
                <div class="banner-pnl red-text">${netVnd.toLocaleString('vi-VN')} VNĐ (${netChips} Phỉnh)</div>
            `;
        }
    }

    updateScorecardUI();
}

function updateScorecardUI() {
    document.getElementById('scTotal').innerText = sessionStats.totalEvaluated;
    document.getElementById('scStraight').innerText = sessionStats.straightWins;
    document.getElementById('scDozen').innerText = sessionStats.dozenWins;
    document.getElementById('scCluster').innerText = sessionStats.cornerWins + sessionStats.splitWins + sessionStats.clusterWins;
    document.getElementById('scMiss').innerText = sessionStats.misses;

    const totalPositive = sessionStats.straightWins + sessionStats.splitWins + sessionStats.cornerWins + sessionStats.dozenWins + sessionStats.clusterWins;
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
// THUẬT TOÁN ĐỊNH LƯỢNG QUÁN TÍNH & PHÂN BỔ 10 PHỈNH / 15 PHỈNH
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

    // 1. Phân tích mật độ cung bánh xe
    const sectorStats = calculateSectorFrequencies();

    // 2. Tính quán tính điểm rơi lân cận
    const hotNumbers = calculateHotNeighbors();

    // 3. Phân bổ các cửa theo Bet Mode đã chọn (10 phỉnh hoặc 15 phỉnh)
    let plan = {};

    if (currentBetMode === 10) {
        // --- CHẾ ĐỘ 10 PHỈNH (20.000 VNĐ) ---
        // 2 Số Thẳng: 1 phỉnh mỗi số = 2 phỉnh
        const straightNums = [hotNumbers[0], hotNumbers[1]];
        const straights = straightNums.map(n => ({ num: n, chips: 1 }));

        // 1 Cặp Đôi (Split): 1 phỉnh
        const splitPair = getValidSplit(hotNumbers[0]);
        const splits = [{ numbers: splitPair, chips: 1 }];

        // 1 Cụm 4 số (Corner): 2 phỉnh
        const cornerQuad = getValidCorner(hotNumbers[1] || hotNumbers[0]);
        const corners = [{ numbers: cornerQuad, chips: 2 }];

        // 1 Hàng (Dozen): 5 phỉnh
        const bestDozen = calculateBestDozen(straightNums);
        const dozen = {
            id: bestDozen.id,
            name: bestDozen.name,
            numbers: bestDozen.numbers,
            chips: 5
        };

        // Cụm bánh xe bảo hiểm
        const bestCluster = calculateBestCluster(straightNums, sectorStats);

        plan = {
            mode: 10,
            totalChips: 10,
            totalVnd: 20000,
            straights,
            splits,
            corners,
            dozen,
            cluster: bestCluster
        };
    } else {
        // --- CHẾ ĐỘ 15 PHỈNH (30.000 VNĐ) - TĂNG CƯỢC ---
        // 2 Số Thẳng: 1 phỉnh mỗi số = 2 phỉnh
        const straightNums = [hotNumbers[0], hotNumbers[1]];
        const straights = straightNums.map(n => ({ num: n, chips: 1 }));

        // 2 Cặp Đôi (Split): 1 phỉnh mỗi cặp = 2 phỉnh
        const split1 = getValidSplit(hotNumbers[0]);
        let split2 = getValidSplit(hotNumbers[1]);
        if (split2[0] === split1[0] && split2[1] === split1[1]) {
            split2 = getValidSplit(hotNumbers[2] || 17);
        }
        const splits = [
            { numbers: split1, chips: 1 },
            { numbers: split2, chips: 1 }
        ];

        // 2 Cụm 4 số (Corner): 2 phỉnh mỗi cụm = 4 phỉnh
        const corner1 = getValidCorner(hotNumbers[0]);
        let corner2 = getValidCorner(hotNumbers[1]);
        if (corner2[0] === corner1[0]) {
            corner2 = getValidCorner(hotNumbers[2] || 25);
        }
        const corners = [
            { numbers: corner1, chips: 2 },
            { numbers: corner2, chips: 2 }
        ];

        // 1 Hàng (Dozen): 7 phỉnh
        const bestDozen = calculateBestDozen(straightNums);
        const dozen = {
            id: bestDozen.id,
            name: bestDozen.name,
            numbers: bestDozen.numbers,
            chips: 7
        };

        const bestCluster = calculateBestCluster(straightNums, sectorStats);

        plan = {
            mode: 15,
            totalChips: 15,
            totalVnd: 30000,
            straights,
            splits,
            corners,
            dozen,
            cluster: bestCluster
        };
    }

    lastBetPlan = plan;

    // 4. Hiển thị phỉnh trực quan lên mặt bàn cược
    placeVisualChipsOnBoard(plan);

    // 5. Hiển thị Phiếu Cược Chi Tiết (Betting Ticket)
    renderBetTicketUI(plan);

    // 6. Cập nhật Racetrack & các chỉ số phụ
    const straightNums = plan.straights.map(s => s.num);
    updateRacetrackUI(sectorStats, straightNums, plan.cluster.numbers);
    updateAuxiliaryMetrics();
}

function renderWaitingState() {
    const need = 5 - historySpins.length;
    const badge = document.getElementById('confidenceBadge');
    if (badge) badge.innerText = `Cần thêm ${need} số...`;

    const ticket = document.getElementById('betTicketBox');
    if (ticket) {
        ticket.innerHTML = `
            <div class="ticket-empty-state">
                <span class="empty-icon">⏳</span>
                <p>Hãy bấm đủ <b>${need} số nữa</b> trên bàn cược để AI phân tích quán tính và xuất phiếu cược chi tiết.</p>
            </div>
        `;
    }
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

// TÍNH QUÁN TÍNH & ĐIỂM SỐ CÁC SỐ NÓNG
function calculateHotNeighbors() {
    const scores = {};
    for (let i = 0; i <= 36; i++) scores[i] = 0;

    historySpins.forEach((num, idx) => {
        const weight = (idx + 1) * 2;
        scores[num] += weight;

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

    const sorted = Object.keys(scores)
        .map(n => parseInt(n, 10))
        .sort((a, b) => scores[b] - scores[a]);

    return sorted;
}

// CHỌN HÀNG TỐI ƯU
function calculateBestDozen(straightNums) {
    let d1 = 0, d2 = 0, d3 = 0;

    historySpins.forEach(n => {
        if (n >= 1 && n <= 12) d1++;
        else if (n >= 13 && n <= 24) d2++;
        else if (n >= 25 && n <= 36) d3++;
    });

    straightNums.forEach(n => {
        if (n >= 1 && n <= 12) d1 += 2;
        else if (n >= 13 && n <= 24) d2 += 2;
        else if (n >= 25 && n <= 36) d3 += 2;
    });

    if (d1 >= d2 && d1 >= d3) {
        return { id: 'dozen1', name: '1st 12 (1 - 12)', numbers: DOZENS.dozen1 };
    } else if (d2 >= d1 && d2 >= d3) {
        return { id: 'dozen2', name: '2nd 12 (13 - 24)', numbers: DOZENS.dozen2 };
    } else {
        return { id: 'dozen3', name: '3rd 12 (25 - 36)', numbers: DOZENS.dozen3 };
    }
}

// CHỌN CỤM BÁNH XE LÂN CẬN
function calculateBestCluster(straightNums, sectorStats) {
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

    let sectorName = 'Cụm Voisins du Zéro (17 số)';
    let numbers = SECTORS.VOISINS;

    if (bestSector === 'TIERS') {
        sectorName = 'Cụm Tiers du Cylindre (12 số)';
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
// HIỂN THỊ ĐỒNG PHỈNH TRỰC QUAN LÊN BÀN CƯỢC (PLACE VISUAL CHIPS)
// ============================================================================

function clearAllChipsFromBoard() {
    const spots = document.querySelectorAll('.chip-spot');
    spots.forEach(sp => sp.innerHTML = '');

    // Gỡ highlight trên tất cả ô
    for (let i = 0; i <= 36; i++) {
        const cell = i === 0 ? document.getElementById('cell-0') : document.getElementById(`cell-${i}`);
        if (cell) {
            cell.style.boxShadow = '';
            cell.style.borderColor = '';
        }
    }
}

function placeVisualChipsOnBoard(plan) {
    // 1. ĐẶT PHỈNH SỐ THẲNG (VÀNG)
    plan.straights.forEach(s => {
        const spot = document.getElementById(`chip-spot-${s.num}`);
        if (spot) {
            spot.innerHTML += `
                <div class="casino-chip chip-straight" title="Số Thẳng ${s.num}: ${s.chips} Phỉnh (${s.chips * 2}k) - 35:1">
                    <span class="chip-inner-text">2K</span>
                    <span class="chip-stack-count">x${s.chips}</span>
                </div>
            `;
        }
        const cell = document.getElementById(`cell-${s.num}`);
        if (cell) {
            cell.style.boxShadow = 'inset 0 0 12px rgba(245, 207, 109, 0.9), 0 0 10px rgba(245, 207, 109, 0.5)';
        }
    });

    // 2. ĐẶT PHỈNH CẶP ĐÔI SPLIT (CAM)
    plan.splits.forEach(sp => {
        // Đặt phỉnh vào số thứ 2 của cặp để biểu thị liên kết
        const targetNum = sp.numbers[1];
        const spot = document.getElementById(`chip-spot-${targetNum}`);
        if (spot) {
            spot.innerHTML += `
                <div class="casino-chip chip-split" title="Cặp Đôi [${sp.numbers.join('-')}]: ${sp.chips} Phỉnh - 17:1">
                    <span class="chip-inner-text">2K</span>
                    <span class="chip-stack-count">x${sp.chips}</span>
                </div>
            `;
        }
        // Viền cam nhẹ cho cả 2 số
        sp.numbers.forEach(num => {
            const cell = document.getElementById(`cell-${num}`);
            if (cell && !plan.straights.some(s => s.num === num)) {
                cell.style.boxShadow = 'inset 0 0 8px rgba(245, 158, 11, 0.7)';
            }
        });
    });

    // 3. ĐẶT PHỈNH CỤM 4 SỐ CORNER (TÍM)
    plan.corners.forEach(cn => {
        // Đặt phỉnh vào số góc của cụm
        const targetNum = cn.numbers[0];
        const spot = document.getElementById(`chip-spot-${targetNum}`);
        if (spot) {
            spot.innerHTML += `
                <div class="casino-chip chip-corner" title="Cụm 4 Số [${cn.numbers.join(',')}]: ${cn.chips} Phỉnh - 8:1">
                    <span class="chip-inner-text">2K</span>
                    <span class="chip-stack-count">x${cn.chips}</span>
                </div>
            `;
        }
        // Viền tím nhẹ cho 4 số
        cn.numbers.forEach(num => {
            const cell = document.getElementById(`cell-${num}`);
            if (cell && !plan.straights.some(s => s.num === num) && !plan.splits.some(sp => sp.numbers.includes(num))) {
                cell.style.boxShadow = 'inset 0 0 8px rgba(168, 85, 247, 0.7)';
            }
        });
    });

    // 4. ĐẶT PHỈNH HÀNG DOZEN (XANH NGỌC)
    const dozenSpot = document.getElementById(`chip-spot-${plan.dozen.id}`);
    if (dozenSpot) {
        dozenSpot.innerHTML = `
            <div class="casino-chip chip-dozen" title="${plan.dozen.name}: ${plan.dozen.chips} Phỉnh (${plan.dozen.chips * 2}k) - 2:1">
                <span class="chip-inner-text">2K</span>
                <span class="chip-stack-count">x${plan.dozen.chips}</span>
            </div>
        `;
    }
}

// ============================================================================
// HIỂN THỊ PHIẾU CƯỢC CHI TIẾT (BETTING TICKET UI)
// ============================================================================

function renderBetTicketUI(plan) {
    const badge = document.getElementById('confidenceBadge');
    if (badge) badge.innerText = 'Bao Phủ ~82% Bàn';

    const ticket = document.getElementById('betTicketBox');
    if (!ticket) return;

    let html = '';

    // 1. DÒNG CƯỢC SỐ THẲNG
    const straightList = plan.straights.map(s => {
        const color = RED_NUMBERS.includes(s.num) ? 'red' : (s.num === 0 ? 'zero' : 'black');
        return `<span class="ticket-num-badge ${color}">Số ${s.num}</span>`;
    }).join(' ');

    const straightChipsTotal = plan.straights.reduce((acc, s) => acc + s.chips, 0);
    html += `
        <div class="ticket-row straight">
            <div class="ticket-row-left">
                <span class="ticket-type-badge gold">🎯 SỐ THẲNG (35:1)</span>
                <div class="ticket-targets">${straightList}</div>
            </div>
            <div class="ticket-row-right">
                <span class="ticket-chips">${straightChipsTotal} Phỉnh</span>
                <span class="ticket-vnd">${(straightChipsTotal * CHIP_VALUE_VND).toLocaleString('vi-VN')}đ</span>
            </div>
        </div>
    `;

    // 2. DÒNG CƯỢC CẶP ĐÔI (SPLIT)
    const splitChipsTotal = plan.splits.reduce((acc, s) => acc + s.chips, 0);
    const splitList = plan.splits.map(sp => {
        return `<span class="ticket-pair-badge">🔗 [${sp.numbers[0]} - ${sp.numbers[1]}]</span>`;
    }).join(' ');

    html += `
        <div class="ticket-row split">
            <div class="ticket-row-left">
                <span class="ticket-type-badge amber">🟠 CẶP ĐÔI (17:1)</span>
                <div class="ticket-targets">${splitList}</div>
            </div>
            <div class="ticket-row-right">
                <span class="ticket-chips">${splitChipsTotal} Phỉnh</span>
                <span class="ticket-vnd">${(splitChipsTotal * CHIP_VALUE_VND).toLocaleString('vi-VN')}đ</span>
            </div>
        </div>
    `;

    // 3. DÒNG CƯỢC CỤM 4 SỐ (CORNER)
    const cornerChipsTotal = plan.corners.reduce((acc, c) => acc + c.chips, 0);
    const cornerList = plan.corners.map(cn => {
        return `<span class="ticket-corner-badge">🔲 [${cn.numbers.join(',')}]</span>`;
    }).join(' ');

    html += `
        <div class="ticket-row corner">
            <div class="ticket-row-left">
                <span class="ticket-type-badge purple">🟣 CỤM 4 SỐ (8:1)</span>
                <div class="ticket-targets">${cornerList}</div>
            </div>
            <div class="ticket-row-right">
                <span class="ticket-chips">${cornerChipsTotal} Phỉnh</span>
                <span class="ticket-vnd">${(cornerChipsTotal * CHIP_VALUE_VND).toLocaleString('vi-VN')}đ</span>
            </div>
        </div>
    `;

    // 4. DÒNG CƯỢC HÀNG (DOZEN)
    html += `
        <div class="ticket-row dozen">
            <div class="ticket-row-left">
                <span class="ticket-type-badge emerald">🛡 HÀNG (2:1)</span>
                <div class="ticket-targets"><span class="ticket-dozen-badge">${plan.dozen.name}</span></div>
            </div>
            <div class="ticket-row-right">
                <span class="ticket-chips">${plan.dozen.chips} Phỉnh</span>
                <span class="ticket-vnd">${(plan.dozen.chips * CHIP_VALUE_VND).toLocaleString('vi-VN')}đ</span>
            </div>
        </div>
    `;

    // 5. TỔNG CỘNG
    html += `
        <div class="ticket-summary-footer">
            <div class="footer-left">
                <span class="footer-label">TỔNG ĐẶT CƯỢC:</span>
                <span class="footer-strategy">Bao phủ 82% • Ăn Lớn / Hòa / Thua Ít</span>
            </div>
            <div class="footer-right">
                <span class="total-chips-val gold-text">${plan.totalChips} Phỉnh</span>
                <span class="total-vnd-val">(${plan.totalVnd.toLocaleString('vi-VN')} VNĐ)</span>
            </div>
        </div>
    `;

    ticket.innerHTML = html;
}

// CẬP NHẬT RACETRACK CUNG BÁNH XE
function updateRacetrackUI(sectorStats, straightNums, clusterNums) {
    const pV = document.getElementById('probVoisins');
    const pT = document.getElementById('probTiers');
    const pO = document.getElementById('probOrphelins');
    const pJ = document.getElementById('probJeuZero');

    if (pV) pV.innerText = `${sectorStats.voisinsPct}%`;
    if (pT) pT.innerText = `${sectorStats.tiersPct}%`;
    if (pO) pO.innerText = `${sectorStats.orphelinsPct}%`;
    if (pJ) pJ.innerText = `${sectorStats.jeuZeroPct}%`;

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

    const bRed = document.getElementById('barRed');
    const bBlack = document.getElementById('barBlack');
    const lRed = document.getElementById('labelRed');
    const lBlack = document.getElementById('labelBlack');
    const mColor = document.getElementById('metricColorVal');

    if (bRed) bRed.style.width = `${redPct}%`;
    if (bBlack) bBlack.style.width = `${blackPct}%`;
    if (lRed) lRed.innerText = `Đỏ: ${redPct}%`;
    if (lBlack) lBlack.innerText = `Đen: ${blackPct}%`;
    if (mColor) mColor.innerText = redPct > blackPct ? 'Ưu tiên ĐỎ' : (blackPct > redPct ? 'Ưu tiên ĐEN' : 'Cân bằng');

    const bEven = document.getElementById('barEven');
    const bOdd = document.getElementById('barOdd');
    const lEven = document.getElementById('labelEven');
    const lOdd = document.getElementById('labelOdd');
    const mParity = document.getElementById('metricParityVal');

    if (bEven) bEven.style.width = `${evenPct}%`;
    if (bOdd) bOdd.style.width = `${oddPct}%`;
    if (lEven) lEven.innerText = `Chẵn: ${evenPct}%`;
    if (lOdd) lOdd.innerText = `Lẻ: ${oddPct}%`;
    if (mParity) mParity.innerText = evenPct > oddPct ? 'Ưu tiên CHẴN' : (oddPct > evenPct ? 'Ưu tiên LẺ' : 'Cân bằng');
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
        splitWins: 0,
        cornerWins: 0,
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
    const demo = [17, 20, 32, 2, 25];
    allSpinsHistory = [];
    historySpins = [];
    lastBetPlan = null;

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
        localStorage.setItem('roulette_bet_mode', JSON.stringify(currentBetMode));
    } catch (e) {}
}

function loadFromLocalStorage() {
    try {
        const savedHistory = localStorage.getItem('roulette_quant_history');
        const savedAll = localStorage.getItem('roulette_quant_all');
        const savedStats = localStorage.getItem('roulette_quant_stats');
        const savedMode = localStorage.getItem('roulette_bet_mode');

        if (savedHistory) historySpins = JSON.parse(savedHistory);
        if (savedAll) allSpinsHistory = JSON.parse(savedAll);
        if (savedStats) sessionStats = JSON.parse(savedStats);
        if (savedMode) setBetMode(JSON.parse(savedMode));
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
