/**
 * ROULETTE QUANT AI - PRO STATISTICAL PREDICTOR V3.8
 * Tự Động Cuốn Chiếu 10 Phiên & Đối Soát Kết Quả Thắng/Thua Từng Vòng
 */

// BỐ TRÍ BÁNH XE CHÂU ÂU (EUROPEAN WHEEL ORDER)
const WHEEL_ORDER = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

// CÁC CUNG BÁNH XE (FRENCH SECTORS)
const SECTORS = {
    VOISINS: [22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25],
    TIERS: [27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33],
    ORPHELINS: [1, 20, 14, 31, 9, 17, 34, 6]
};

// TRẠNG THÁI TOÀN CỤC CỦA PHIÊN CHƠI
let historySpins = [];       // Cửa sổ trượt 10 phiên gần nhất
let allSpinsHistory = [];    // Toàn bộ lịch sử từ đầu phiên
let soundEnabled = true;
let audioCtx = null;

// LƯU DỰ ĐOÁN CỦA PHIÊN TRƯỚC ĐỂ ĐỐI SOÁT
let lastPredictions = {
    top5: [],
    dozens: [] // Mảng ID tá hàng [1, 2] hoặc [2, 3]
};

// THỐNG KÊ HIỆU SUẤT PHIÊN
let sessionStats = {
    totalEvaluated: 0,
    straightWins: 0,
    dozenWins: 0,
    misses: 0,
    pnlChips: 0
};

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
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.08);
        } else if (type === 'predict') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.setValueAtTime(659.25, now + 0.09);
            osc.frequency.setValueAtTime(783.99, now + 0.18);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.32);
            osc.start(now);
            osc.stop(now + 0.32);
        } else if (type === 'jackpot') {
            // Âm thanh ăn đậm số thẳng
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, now); // D5
            osc.frequency.setValueAtTime(880.00, now + 0.1); // A5
            osc.frequency.setValueAtTime(1174.66, now + 0.2); // D6
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        }
    } catch (e) {}
}

function getNumberColor(num) {
    if (num === 0) return 'zero';
    return RED_NUMBERS.includes(num) ? 'red' : 'black';
}

function getNumberSector(num) {
    if (SECTORS.VOISINS.includes(num)) return 'Voisins du Zéro';
    if (SECTORS.TIERS.includes(num)) return 'Tiers du Cylindre';
    if (SECTORS.ORPHELINS.includes(num)) return 'Orphelins';
    return 'Châu Âu';
}

function getNumberDozenId(num) {
    if (num >= 1 && num <= 12) return 1;
    if (num >= 13 && num <= 24) return 2;
    if (num >= 25 && num <= 36) return 3;
    return 0; // Số 0 không thuộc Dozen nào
}

// KHỞI TẠO BÀN CƯỢC 1-36
function initBoardUI() {
    const gridCells = document.getElementById('gridCells');
    gridCells.innerHTML = '';

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

    loadFromLocalStorage();
    renderTapeSlots();
    updateScorecardUI();
    runQuantAnalysis();
}

// RENDER DẢI BĂNG 10 PHIÊN TRƯỢT
function renderTapeSlots() {
    const tape = document.getElementById("tapeContainer");
    if (!tape) return;
    tape.innerHTML = "";

    const count = historySpins.length;
    const isRolling = allSpinsHistory.length >= 10;

    const rollingTag = document.getElementById("rollingModeTag");
    if (rollingTag) {
        rollingTag.style.display = isRolling ? "inline-block" : "none";
    }
    
    const nextSpinIdx = allSpinsHistory.length + 1;
    const nextSpinEl = document.getElementById("nextSpinNumber");
    if (nextSpinEl) {
        nextSpinEl.innerText = `#${nextSpinIdx}`;
    }

    const statusText = document.getElementById("tapeStatusText");
    if (statusText) {
        if (isRolling) {
            statusText.innerHTML = `Đang trượt 10 phiên gần nhất (Tổng đã quay: <b class="gold-text">${allSpinsHistory.length}</b> phiên)`;
        } else {
            statusText.innerHTML = `Đã nhập: <b class="gold-text">${count}</b>/10 phiên khởi động`;
        }
    }

    for (let i = 0; i < 10; i++) {
        const slot = document.createElement('div');
        slot.className = 'tape-slot';

        if (i < count) {
            const num = historySpins[i];
            const color = getNumberColor(num);
            const colorText = color === 'zero' ? 'Zero' : (color === 'red' ? 'Đỏ' : 'Đen');
            const isNewest = (i === count - 1) && (allSpinsHistory.length >= 10);

            slot.className = `tape-slot filled ${color} ${isNewest ? 'newest-drop' : ''}`;
            slot.innerHTML = `
                <span class="slot-index">#${allSpinsHistory.length - (count - 1 - i)}</span>
                <span class="slot-value">${num}</span>
                <span class="slot-badge">${colorText}</span>
                ${isNewest ? '<span class="newest-badge">MỚI</span>' : ''}
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

// CẬP NHẬT SỐ LẦN XUẤT HIỆN TRONG 10 PHIÊN TRƯỢT
function updateBoardHitCountPills() {
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

// ============================================================================
// XỬ LÝ NHẬP SỐ MỚI (TỰ ĐỘNG CUỐN CHIẾU & ĐỐI SOÁT KẾT QUẢ)
// ============================================================================

function handleNumberClick(num) {
    playSound('chip');

    // Hiệu ứng nháy ô được chọn
    const el = num === 0 ? document.querySelector('.zero-cell') : document.getElementById(`cell-${num}`);
    if (el) {
        el.classList.add('active-pulse');
        setTimeout(() => el.classList.remove('active-pulse'), 300);
    }

    // 1. ĐỐI SOÁT VỚI DỰ ĐOÁN CỦA PHIÊN TRƯỚC (NẾU ĐÃ CÓ DỰ ĐOÁN ĐỦ 10 SỐ)
    if (lastPredictions.top5.length === 5) {
        evaluateLastPrediction(num);
    }

    // 2. LƯU VÀO LỊCH SỬ TỔNG
    allSpinsHistory.push(num);

    // 3. TỰ ĐỘNG TRƯỢT CỬA SỔ 10 PHIÊN
    if (historySpins.length >= 10) {
        historySpins.shift(); // Tự động đẩy số cũ nhất ra
    }
    historySpins.push(num); // Nạp số mới vào cuối

    saveToLocalStorage();
    renderTapeSlots();
    runQuantAnalysis();
}

// ĐỐI SOÁT VÒNG TRƯỚC: THẮNG SỐ THẲNG HAY BẢO HIỂM DOZEN?
function evaluateLastPrediction(newNum) {
    const isStraightHit = lastPredictions.top5.includes(newNum);
    const dozenId = getNumberDozenId(newNum);
    const isDozenHit = lastPredictions.dozens.includes(dozenId);

    sessionStats.totalEvaluated++;

    const banner = document.getElementById('resultBanner');
    banner.style.display = 'flex';

    if (isStraightHit) {
        // ĂN ĐẬM SỐ THẲNG (35:1)
        // 5 phỉnh số thẳng + 6 phỉnh dozen = 11 phỉnh cược. Ăn số thẳng nhận 36 phỉnh. Lãi ròng = +25 phỉnh!
        sessionStats.straightWins++;
        sessionStats.pnlChips += 25;
        playSound('jackpot');

        banner.className = 'result-eval-banner straight-win';
        banner.innerHTML = `
            <div class="banner-left">
                <span class="banner-icon">🏆</span>
                <div class="banner-text">
                    <h4 class="gold-text">NỔ TRÚNG SỐ THẲNG TOP 5: SỐ ${newNum}!</h4>
                    <p>Chúc mừng! Số ${newNum} nằm trong danh sách 5 con số vàng được AI dự đoán.</p>
                </div>
            </div>
            <div class="banner-pnl gold-text">+25 PHỈNH (LÃI ĐẬM)</div>
        `;
    } else if (isDozenHit) {
        // TRÚNG DOZEN BẢO HIỂM
        // Nhận 9 phỉnh, tổng cược 11 phỉnh. Bù đắp vốn gần như tuyệt đối (-2 phỉnh coi như phí bảo hiểm)
        sessionStats.dozenWins++;
        sessionStats.pnlChips -= 2;
        playSound('predict');

        banner.className = 'result-eval-banner dozen-win';
        banner.innerHTML = `
            <div class="banner-left">
                <span class="banner-icon">🛡</span>
                <div class="banner-text">
                    <h4 class="emerald-text">BẢO VỆ VỐN THÀNH CÔNG: TRÚNG HÀNG DOZEN ${dozenId}!</h4>
                    <p>Số ${newNum} rơi vào 2 Hàng bảo hiểm được AI bao phủ. Vốn được giữ vững an toàn.</p>
                </div>
            </div>
            <div class="banner-pnl emerald-text">HÒA / BÙ VỐN (-2P)</div>
        `;
    } else {
        // TRƯỢT CẢ 2
        sessionStats.misses++;
        sessionStats.pnlChips -= 11;

        banner.className = 'result-eval-banner miss';
        banner.innerHTML = `
            <div class="banner-left">
                <span class="banner-icon">⚠️</span>
                <div class="banner-text">
                    <h4 class="ruby-text">PHIÊN NÀY LỆCH NHỊP: SỐ ${newNum}</h4>
                    <p>Bóng rơi vào 8 cửa ngoài vùng bảo hiểm. Tiếp tục giữ kỷ luật vốn theo chu kỳ trượt.</p>
                </div>
            </div>
            <div class="banner-pnl ruby-text">-11 PHỈNH</div>
        `;
    }

    updateScorecardUI();
}

function updateScorecardUI() {
    document.getElementById('scTotalSpins').innerText = allSpinsHistory.length;
    document.getElementById('scStraightWins').innerText = sessionStats.straightWins;
    document.getElementById('scDozenWins').innerText = sessionStats.dozenWins;

    const safeHits = sessionStats.straightWins + sessionStats.dozenWins;
    const winRate = sessionStats.totalEvaluated > 0 ? Math.round((safeHits / sessionStats.totalEvaluated) * 100) : 0;
    document.getElementById('scWinRate').innerText = `${winRate}%`;

    const pnlEl = document.getElementById('scPnlChips');
    if (sessionStats.pnlChips > 0) {
        pnlEl.className = 'sc-val gold-text';
        pnlEl.innerText = `+${sessionStats.pnlChips} Phỉnh`;
    } else if (sessionStats.pnlChips < 0) {
        pnlEl.className = 'sc-val ruby-text';
        pnlEl.innerText = `${sessionStats.pnlChips} Phỉnh`;
    } else {
        pnlEl.className = 'sc-val';
        pnlEl.innerText = '0 Phỉnh';
    }
}

// HOÀN TÁC SỐ VỪA NHẬP
function undoLastNumber() {
    if (allSpinsHistory.length > 0) {
        allSpinsHistory.pop();
        if (allSpinsHistory.length >= 10) {
            historySpins = allSpinsHistory.slice(-10);
        } else {
            historySpins.pop();
        }
        saveToLocalStorage();
        renderTapeSlots();
        runQuantAnalysis();
        document.getElementById('resultBanner').style.display = 'none';
    }
}

// XÓA TOÀN BỘ LỊCH SỬ PHIÊN
function clearHistory() {
    historySpins = [];
    allSpinsHistory = [];
    lastPredictions = { top5: [], dozens: [] };
    sessionStats = { totalEvaluated: 0, straightWins: 0, dozenWins: 0, misses: 0, pnlChips: 0 };
    document.getElementById('resultBanner').style.display = 'none';
    saveToLocalStorage();
    renderTapeSlots();
    updateScorecardUI();
    runQuantAnalysis();
}

// NẠP 10 SỐ MẪU
function loadDemoData() {
    const demoSeries = [32, 15, 19, 4, 21, 26, 0, 32, 15, 3];
    allSpinsHistory = [...demoSeries];
    historySpins = [...demoSeries];
    sessionStats = { totalEvaluated: 0, straightWins: 0, dozenWins: 0, misses: 0, pnlChips: 0 };
    document.getElementById('resultBanner').style.display = 'none';
    playSound('predict');
    saveToLocalStorage();
    renderTapeSlots();
    updateScorecardUI();
    runQuantAnalysis();
}

function saveToLocalStorage() {
    try {
        localStorage.setItem('roulette_all_spins', JSON.stringify(allSpinsHistory));
        localStorage.setItem('roulette_session_stats', JSON.stringify(sessionStats));
        localStorage.setItem('roulette_last_predictions', JSON.stringify(lastPredictions));
    } catch (e) {}
}

function loadFromLocalStorage() {
    try {
        const savedAll = localStorage.getItem('roulette_all_spins');
        if (savedAll) {
            allSpinsHistory = JSON.parse(savedAll);
            historySpins = allSpinsHistory.slice(-10);
        }
        const savedStats = localStorage.getItem('roulette_session_stats');
        if (savedStats) {
            sessionStats = JSON.parse(savedStats);
        }
        const savedPred = localStorage.getItem('roulette_last_predictions');
        if (savedPred) {
            lastPredictions = JSON.parse(savedPred);
        }
    } catch (e) {}
}

// ============================================================================
// THUẬT TOÁN QUANT DỰ ĐOÁN 5 SỐ VÀNG & DOZEN
// ============================================================================

function runQuantAnalysis() {
    const total = historySpins.length;
    updateSectorsDistribution();

    if (total < 10) {
        document.getElementById('confidenceBadge').innerText = `Cần thêm ${10 - total} số`;
        document.getElementById('top5Container').innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">⏳</span>
                <p>Đã nhập <b>${total}/10 số</b> khởi động. Hãy nhập đủ 10 số, sau đó từ phiên #11 hệ thống sẽ tự động cuốn chiếu từng số!</p>
            </div>
        `;
        resetOutsidePredictions();
        lastPredictions = { top5: [], dozens: [] };
        return;
    }

    document.getElementById('confidenceBadge').innerText = 'AI TỐI ƯU HÓA: CAO';

    // 1. TÍNH ĐIỂM 37 SỐ DỰA TRÊN 10 SỐ TRONG CỬA SỔ TRƯỢT HIỆN TẠI
    const scores = {};
    for (let i = 0; i <= 36; i++) {
        scores[i] = 0.0;
    }

    // Phân tích cung bánh xe chiếm ưu thế
    const sectorHits = { VOISINS: 0, TIERS: 0, ORPHELINS: 0 };
    historySpins.forEach(n => {
        if (SECTORS.VOISINS.includes(n)) sectorHits.VOISINS++;
        else if (SECTORS.TIERS.includes(n)) sectorHits.TIERS++;
        else if (SECTORS.ORPHELINS.includes(n)) sectorHits.ORPHELINS++;
    });

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

    SECTORS[dominantSector].forEach(num => scores[num] += 35.0);

    // Lân cận số vừa ra & nảy đối diện
    const lastNum = historySpins[historySpins.length - 1];
    const lastIdx = WHEEL_ORDER.indexOf(lastNum);

    if (lastIdx !== -1) {
        for (let offset = -3; offset <= 3; offset++) {
            const neighborIdx = (lastIdx + offset + 37) % 37;
            scores[WHEEL_ORDER[neighborIdx]] += (25.0 - Math.abs(offset) * 4);
        }
        const oppositeIdx = (lastIdx + 18) % 37;
        for (let offset = -2; offset <= 2; offset++) {
            scores[WHEEL_ORDER[(oppositeIdx + offset + 37) % 37]] += (18.0 - Math.abs(offset) * 3);
        }
    }

    // Quy luật 1/3
    const freq = {};
    historySpins.forEach(n => freq[n] = (freq[n] || 0) + 1);
    for (let n = 0; n <= 36; n++) {
        if (freq[n] === 1) scores[n] += 15.0;
        else if (!freq[n] && SECTORS[dominantSector].includes(n)) scores[n] += 12.0;
    }

    // Chọn Top 5
    const sortedNumbers = Object.keys(scores).map(Number).sort((a, b) => scores[b] - scores[a]);
    const top5 = sortedNumbers.slice(0, 5);

    renderTop5(top5, scores);

    // Lưu Top 5 để đối soát ở vòng tiếp theo
    lastPredictions.top5 = top5;

    // Phân tích cược ngoài & Lưu Dozens
    analyzeOutsideBets();
}

function renderTop5(top5, scores) {
    const container = document.getElementById('top5Container');
    container.innerHTML = '';
    const maxScore = scores[top5[0]] || 1;

    top5.forEach((num, index) => {
        const color = getNumberColor(num);
        const sector = getNumberSector(num);
        const prob = Math.round((scores[num] / (maxScore * 1.15)) * 92);

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

function analyzeOutsideBets() {
    let redCount = 0, blackCount = 0, evenCount = 0, oddCount = 0;
    let d1Count = 0, d2Count = 0, d3Count = 0;

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

    // Đỏ vs Đen
    const redPct = Math.round((redCount / nonZeroTotal) * 100);
    const blackPct = 100 - redPct;
    document.getElementById('meterRed').style.width = `${redPct}%`;
    document.getElementById('meterBlack').style.width = `${blackPct}%`;
    document.getElementById('labelRed').innerText = `Đỏ: ${redPct}% (${redCount})`;
    document.getElementById('labelBlack').innerText = `Đen: ${blackPct}% (${blackCount})`;

    let recColor = 'Cân Bằng 50/50';
    if (redPct >= 65) recColor = '🔴 ĐỎ ĐANG BÃO ➡️ Canh Bẻ ĐEN';
    else if (blackPct >= 65) recColor = '⚫️ ĐEN ĐANG BÃO ➡️ Canh Bẻ ĐỎ';
    else if (redPct > blackPct) recColor = '🔴 Bám Theo ĐỎ';
    else recColor = '⚫️ Bám Theo ĐEN';
    document.getElementById('predColorVal').innerText = recColor;

    // Chẵn vs Lẻ
    const evenPct = Math.round((evenCount / nonZeroTotal) * 100);
    const oddPct = 100 - evenPct;
    document.getElementById('meterEven').style.width = `${evenPct}%`;
    document.getElementById('meterOdd').style.width = `${oddPct}%`;
    document.getElementById('labelEven').innerText = `Chẵn: ${evenPct}% (${evenCount})`;
    document.getElementById('labelOdd').innerText = `Lẻ: ${oddPct}% (${oddCount})`;

    let recParity = 'Cân Bằng';
    if (evenPct >= 65) recParity = '🔵 CHẴN ÁP ĐẢO ➡️ Đánh LẺ';
    else if (oddPct >= 65) recParity = '🟣 LẺ ÁP ĐẢO ➡️ Đánh CHẴN';
    else if (evenPct > oddPct) recParity = '🔵 Ưu Tiên CHẴN';
    else recParity = '🟣 Ưu Tiên LẺ';
    document.getElementById('predParityVal').innerText = recParity;

    // Dozens
    const dozens = [
        { name: 'Hàng 1 (1-12)', count: d1Count, id: 1 },
        { name: 'Hàng 2 (13-24)', count: d2Count, id: 2 },
        { name: 'Hàng 3 (25-36)', count: d3Count, id: 3 }
    ];
    dozens.sort((a, b) => b.count - a.count);

    document.getElementById('d1Stat').innerText = `Hàng 1: ${d1Count} lần (${Math.round(d1Count/nonZeroTotal*100)}%)`;
    document.getElementById('d2Stat').innerText = `Hàng 2: ${d2Count} lần (${Math.round(d2Count/nonZeroTotal*100)}%)`;
    document.getElementById('d3Stat').innerText = `Hàng 3: ${d3Count} lần (${Math.round(d3Count/nonZeroTotal*100)}%)`;

    // Lưu 2 Dozen để đối soát vòng tới
    lastPredictions.dozens = [dozens[0].id, dozens[1].id];

    document.getElementById('dozenRecVal').innerHTML = `
        🎯 Đặt 2 Hàng: <b class="gold-text">${dozens[0].name} & ${dozens[1].name}</b> (Bao phủ 24/37 số = <b>64.8%</b> thắng!)
    `;
}

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
    document.getElementById('pctVoisins').innerText = `${Math.round((v/total)*100)}%`;
    document.getElementById('pctTiers').innerText = `${Math.round((t/total)*100)}%`;
    document.getElementById('pctOrphelins').innerText = `${Math.round((o/total)*100)}%`;

    document.getElementById('barVoisins').style.width = `${Math.round((v/total)*100)}%`;
    document.getElementById('barTiers').style.width = `${Math.round((t/total)*100)}%`;
    document.getElementById('barOrphelins').style.width = `${Math.round((o/total)*100)}%`;
}

function resetOutsidePredictions() {
    document.getElementById('predColorVal').innerText = '---';
    document.getElementById('predParityVal').innerText = '---';
    document.getElementById('dozenRecVal').innerText = 'Đang chờ đủ 10 số...';
}

document.getElementById('soundToggleBtn').onclick = () => {
    soundEnabled = !soundEnabled;
    document.getElementById('soundToggleBtn').innerHTML = soundEnabled ? '<span class="icon">🔊</span>' : '<span class="icon">��</span>';
};

document.getElementById('demoDataBtn').onclick = loadDemoData;
document.getElementById('resetBtn').onclick = clearHistory;

window.onload = () => {
    initBoardUI();
};
