/**
 * ROULETTE QUANTUM PHYSICS LAB V6.0
 * Động Cơ Mô Phỏng Vật Lý Chạy Song Song: Thuật Toán Lý Thuyết (A) vs Thực Tế Hỗn Loạn (B)
 * Nghiên Cứu Quỹ Đạo Lăn, Điểm Rớt, Va Đập Chốt Kim Cương (Deflectors) & Nảy Bật Vách Ô (Pocket Frets)
 */

// THỨ TỰ 37 SỐ BÁNH XE CHÂU ÂU (EUROPEAN WHEEL ORDER)
const POCKETS = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

// CÁC HẰNG SỐ HÌNH HỌC VÒNG QUAY (TÍNH TOÁN BÁN KÍNH CANVAS 380x380)
const CX = 190, CY = 190;
const RADIUS_RIM = 178;        // Vành ngoài cùng bánh xe
const RADIUS_BALL_TRACK = 160; // Đường lăn viên bi trên vành
const RADIUS_DEFLECTORS = 136; // Vòng chốt kim cương (8 deflectors)
const RADIUS_POCKETS = 112;    // Vòng các ô số 0-36
const RADIUS_INNER_CONE = 76;  // Lòng chảo côn bên trong
const RADIUS_CENTER_HUB = 36;  // Trục xoay trung tâm bằng đồng

// 8 VỊ TRÍ CHỐT KIM CƯƠNG (DEFLECTORS / DIAMOND STUDS)
const DEFLECTOR_ANGLES = [
    0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4,
    Math.PI, 5 * Math.PI / 4, 3 * Math.PI / 2, 7 * Math.PI / 4
];

// TRẠNG THÁI MÔ PHỎNG TOÀN CỤC
let isSpinning = false;
let autoBenchmarking = false;
let autoRunsRemaining = 0;
let soundEnabled = true;
let audioCtx = null;

// THỐNG KÊ ĐỐI CHIẾU THỰC NGHIỆM (BENCHMARK DATA)
let benchStats = {
    totalRuns: 0,
    exactHits: 0,
    nearHits: 0,         // Trong phạm vi ±2 ô
    cumulativeError: 0,
    modelACounts: new Array(37).fill(0),
    modelBCounts: new Array(37).fill(0),
    history: []
};

// ============================================================================
// HỆ THỐNG ÂM THANH WEB AUDIO CASINO
// ============================================================================

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type = 'click') {
    if (!soundEnabled) return;
    try {
        initAudio();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'click') {
            // Tiếng bi nảy tanh tách qua vách ngăn
            osc.frequency.setValueAtTime(1200 + Math.random() * 400, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
            osc.start(now);
            osc.stop(now + 0.04);
        } else if (type === 'deflector') {
            // Tiếng kim loại va chạm chốt kim cương (đanh và vang)
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(2200, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.12);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
            osc.start(now);
            osc.stop(now + 0.12);
        } else if (type === 'settle') {
            // Tiếng bi rơi êm vào lòng ô số
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        }
    } catch (e) {}
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    const icon = document.getElementById('soundIcon');
    if (icon) icon.innerText = soundEnabled ? '🔊' : '🔇';
}

// ============================================================================
// LỚP MÔ PHỎNG ĐỘNG LỰC HỌC VẬT LÝ (PHYSICS SIMULATION ENGINE)
// ============================================================================

class WheelSimulator {
    constructor(canvasId, isChaotic = false) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.isChaotic = isChaotic;

        this.wheelAngle = 0;
        this.wheelVelocity = 1.5;
        this.ballAngle = 0;
        this.ballRadius = RADIUS_BALL_TRACK;
        this.ballVelocity = 6.0;

        this.phase = 'idle'; // 'rim', 'drop', 'bounce', 'settled'
        this.startTime = 0;
        this.dropTime = 0;
        this.bouncesCount = 0;
        this.deflectorHits = 0;
        this.targetPocketIndex = 0;
        this.finalPocketNumber = 0;

        this.ballTrail = []; // Lưu các vệt sáng chuyển động
    }

    resetParams(v0, w0, e, theta0, mu, noiseLevel) {
        let actualV0 = v0;
        let actualW0 = w0;
        let actualMu = mu;
        let actualTheta0 = theta0;
        let actualE = e;

        if (this.isChaotic) {
            // MÔ HÌNH THỰC TẾ: Áp dụng nhiễu ma sát, vi sai lực đẩy và nhiệt độ
            const factor = noiseLevel === 0 ? 0 : (noiseLevel === 1 ? 1 : 2.2);
            const noiseV = (Math.random() - 0.5) * 0.45 * factor;
            const noiseW = (Math.random() - 0.5) * 0.15 * factor;
            const noiseMu = (Math.random() - 0.5) * 0.06 * factor;

            actualV0 = Math.max(1.5, v0 + noiseV);
            actualW0 = Math.max(0.3, w0 + noiseW);
            actualMu = Math.max(0.15, mu + noiseMu);
            actualE = Math.min(0.95, Math.max(0.2, e + (Math.random() - 0.5) * 0.05 * factor));
        }

        this.v0 = actualV0;
        this.w0 = actualW0;
        this.mu = actualMu;
        this.e = actualE;
        this.theta0 = actualTheta0;

        this.wheelVelocity = this.w0;
        this.ballVelocity = this.v0;
        this.ballAngle = this.theta0;
        this.ballRadius = RADIUS_BALL_TRACK;
        this.phase = 'rim';
        this.startTime = performance.now();
        this.bouncesCount = 0;
        this.deflectorHits = 0;
        this.ballTrail = [];

        // Tính toán trước điểm rớt lý thuyết
        this.theoreticalDropTime = this.v0 / this.mu;

        // Vận tốc và nảy bật
        this.bounceEnergy = 0;
        this.bouncingAngleOffset = 0;
    }

    update(dt) {
        if (this.phase === 'idle') return;

        // 1. BÁNH XE QUAY THEO CHIỀU KIM ĐỒNG HỒ (+) CÓ MA SÁT Ổ TRỤC NHẸ
        const wheelDecel = 0.035;
        this.wheelVelocity = Math.max(0.25, this.wheelVelocity - wheelDecel * dt);
        this.wheelAngle = (this.wheelAngle + this.wheelVelocity * dt) % (2 * Math.PI);

        // 2. GIAI ĐOẠN 1: VIÊN BI LĂN TRÊN VÀNH NGOÀI (RIM DECELERATION)
        if (this.phase === 'rim') {
            const decel = this.mu * 0.75;
            this.ballVelocity -= decel * dt;
            // Bi quay ngược chiều kim đồng hồ (-)
            this.ballAngle -= (this.ballVelocity * 2.2) * dt;
            this.ballRadius = RADIUS_BALL_TRACK;

            // Kiểm tra điểm rớt (Drop threshold)
            if (this.ballVelocity <= 1.8) {
                this.phase = 'drop';
                this.dropTime = (performance.now() - this.startTime) / 1000;
            }
        }
        // 3. GIAI ĐOẠN 2: BI RỚT XUỐNG VÒNG CHỐT KIM CƯƠNG (DEFLECTORS)
        else if (this.phase === 'drop') {
            const dropSpeed = (RADIUS_BALL_TRACK - RADIUS_POCKETS) / 0.65;
            this.ballRadius -= dropSpeed * dt;
            this.ballAngle -= (this.ballVelocity * 1.5) * dt;
            this.ballVelocity = Math.max(0.8, this.ballVelocity - 1.2 * dt);

            // Kiểm tra va chạm chốt kim cương nếu là mô hình hỗn loạn Model B
            if (this.isChaotic && Math.abs(this.ballRadius - RADIUS_DEFLECTORS) < 10) {
                this.checkDeflectorCollision();
            }

            if (this.ballRadius <= RADIUS_POCKETS + 2) {
                this.phase = 'bounce';
                this.bounceEnergy = this.ballVelocity * 1.2;
                this.ballRadius = RADIUS_POCKETS;
            }
        }
        // 4. GIAI ĐOẠN 3: NẢY BẬT VÁCH NGĂN Ô SỐ (POCKET FRETS BOUNCE)
        else if (this.phase === 'bounce') {
            if (this.bounceEnergy > 0.12) {
                this.bouncesCount++;
                playSound('click');
                // Nhảy nảy zic-zac
                const bounceJump = Math.sin(this.bouncesCount * Math.PI * 0.5) * (this.bounceEnergy * 5);
                this.ballRadius = RADIUS_POCKETS + Math.abs(bounceJump);

                // Độ dịch góc do va đập
                const scatterShift = this.isChaotic ? (Math.random() - 0.45) * 0.18 : 0.08;
                this.ballAngle += (this.wheelVelocity * dt * 0.8) + scatterShift;

                // Suy giảm năng lượng theo hệ số nảy e
                this.bounceEnergy *= this.e;
            } else {
                this.phase = 'settled';
                this.ballRadius = RADIUS_POCKETS - 10;
                playSound('settle');
                this.calculateFinalSettledPocket();
            }
        }
        // 5. GIAI ĐOẠN 4: ĐÃ AN TỌA TRONG Ô SỐ (QUAY CÙNG VỚI BÁNH XE)
        else if (this.phase === 'settled') {
            const pocketAngleStep = (2 * Math.PI) / 37;
            this.ballAngle = this.wheelAngle + this.targetPocketIndex * pocketAngleStep + (pocketAngleStep / 2);
            this.ballRadius = RADIUS_POCKETS - 10;
        }

        // Lưu vết sáng viên bi
        this.ballTrail.push({
            x: CX + this.ballRadius * Math.cos(this.ballAngle),
            y: CY + this.ballRadius * Math.sin(this.ballAngle),
            alpha: 1.0
        });
        if (this.ballTrail.length > 14) {
            this.ballTrail.shift();
        }
    }

    checkDeflectorCollision() {
        const normAngle = ((this.ballAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        for (let da of DEFLECTOR_ANGLES) {
            if (Math.abs(normAngle - da) < 0.16) {
                this.deflectorHits++;
                playSound('deflector');
                // Tán xạ góc mạnh mẽ
                const scatter = (Math.random() > 0.5 ? 1 : -1) * (0.25 + Math.random() * 0.35);
                this.ballAngle += scatter;
                this.ballVelocity *= 0.7; // Giảm mạnh động năng
                break;
            }
        }
    }

    calculateFinalSettledPocket() {
        const pocketAngleStep = (2 * Math.PI) / 37;
        let rel = (this.ballAngle - this.wheelAngle) % (2 * Math.PI);
        if (rel < 0) rel += 2 * Math.PI;

        this.targetPocketIndex = Math.floor(rel / pocketAngleStep) % 37;
        this.finalPocketNumber = POCKETS[this.targetPocketIndex];
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, 380, 380);

        // 1. VÀNH NGOÀI GỖ VÀ KIM LOẠI (MAHOGANY & BRASS OUTER RIM)
        ctx.beginPath();
        ctx.arc(CX, CY, RADIUS_RIM, 0, 2 * Math.PI);
        const rimGrad = ctx.createRadialGradient(CX, CY, RADIUS_DEFLECTORS, CX, CY, RADIUS_RIM);
        rimGrad.addColorStop(0, '#101e14');
        rimGrad.addColorStop(0.85, '#07120a');
        rimGrad.addColorStop(1, '#020604');
        ctx.fillStyle = rimGrad;
        ctx.fill();

        ctx.strokeStyle = this.isChaotic ? '#00d8ff44' : '#00ff8844';
        ctx.lineWidth = 4;
        ctx.stroke();

        // 2. VÀNH CHẠY BI (BALL TRACK RIM)
        ctx.beginPath();
        ctx.arc(CX, CY, RADIUS_BALL_TRACK, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 3. 8 CHỐT KIM CƯƠNG CẢN BI (DEFLECTOR DIAMOND STUDS)
        DEFLECTOR_ANGLES.forEach(ang => {
            const dx = CX + RADIUS_DEFLECTORS * Math.cos(ang);
            const dy = CY + RADIUS_DEFLECTORS * Math.sin(ang);

            ctx.save();
            ctx.translate(dx, dy);
            ctx.rotate(ang + Math.PI / 4);
            ctx.fillStyle = '#ffdd44';
            ctx.shadowColor = '#ffdd00';
            ctx.shadowBlur = 6;
            ctx.fillRect(-3, -3, 6, 6);
            ctx.restore();
        });

        // 4. BÁNH XE QUAY VỚI 37 Ô SỐ (ROTATING 37 POCKETS)
        const pocketAngleStep = (2 * Math.PI) / 37;
        for (let i = 0; i < 37; i++) {
            const num = POCKETS[i];
            const startAng = this.wheelAngle + i * pocketAngleStep;
            const endAng = startAng + pocketAngleStep;
            const midAng = (startAng + endAng) / 2;

            // Vẽ dải màu ô số
            ctx.beginPath();
            ctx.moveTo(CX + RADIUS_INNER_CONE * Math.cos(midAng), CY + RADIUS_INNER_CONE * Math.sin(midAng));
            ctx.arc(CX, CY, RADIUS_POCKETS, startAng, endAng);
            ctx.closePath();

            if (num === 0) ctx.fillStyle = '#056d35';
            else if (RED_NUMBERS.has(num)) ctx.fillStyle = '#b91c1c';
            else ctx.fillStyle = '#18181b';

            ctx.fill();
            ctx.strokeStyle = '#d4af37';
            ctx.lineWidth = 0.8;
            ctx.stroke();

            // Vẽ chữ số
            const textRadius = RADIUS_POCKETS - 14;
            const tx = CX + textRadius * Math.cos(midAng);
            const ty = CY + textRadius * Math.sin(midAng);

            ctx.save();
            ctx.translate(tx, ty);
            ctx.rotate(midAng + Math.PI / 2);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 8.5px "JetBrains Mono", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(num, 0, 0);
            ctx.restore();
        }

        // 5. LÒNG CHẢO CÔN & TRỤC QUAY BẰNG ĐỒNG (BRASS TURRET)
        ctx.beginPath();
        ctx.arc(CX, CY, RADIUS_INNER_CONE, 0, 2 * Math.PI);
        const coneGrad = ctx.createRadialGradient(CX, CY, 5, CX, CY, RADIUS_INNER_CONE);
        coneGrad.addColorStop(0, '#2d2208');
        coneGrad.addColorStop(0.7, '#151105');
        coneGrad.addColorStop(1, '#0a0802');
        ctx.fillStyle = coneGrad;
        ctx.fill();
        ctx.strokeStyle = '#854d0e';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Trục xoay trung tâm với 4 tay nắm bằng đồng
        ctx.save();
        ctx.translate(CX, CY);
        ctx.rotate(this.wheelAngle);
        ctx.beginPath();
        ctx.arc(0, 0, RADIUS_CENTER_HUB, 0, 2 * Math.PI);
        const hubGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, RADIUS_CENTER_HUB);
        hubGrad.addColorStop(0, '#fef08a');
        hubGrad.addColorStop(0.6, '#ca8a04');
        hubGrad.addColorStop(1, '#713f12');
        ctx.fillStyle = hubGrad;
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 4 ngạnh tay quay
        for (let i = 0; i < 4; i++) {
            ctx.rotate(Math.PI / 2);
            ctx.fillStyle = '#eab308';
            ctx.fillRect(-2.5, -RADIUS_CENTER_HUB - 12, 5, 14);
            ctx.beginPath();
            ctx.arc(0, -RADIUS_CENTER_HUB - 12, 4, 0, 2 * Math.PI);
            ctx.fill();
        }
        ctx.restore();

        // 6. MŨI TÊN CHỈ HƯỚNG THAM CHIẾU (REFERENCE TOP INDICATOR)
        ctx.save();
        ctx.strokeStyle = '#ffdd00';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(CX, CY - RADIUS_RIM + 2);
        ctx.lineTo(CX, CY - RADIUS_BALL_TRACK - 2);
        ctx.stroke();
        ctx.restore();

        // 7. VẼ VIÊN BI VÀ VỆT SÁNG (GLOWING BALL & MOTION TRAIL)
        if (this.phase !== 'idle') {
            // Vệt đuôi bi
            this.ballTrail.forEach((pt, idx) => {
                const alpha = (idx + 1) / this.ballTrail.length * 0.4;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 4, 0, 2 * Math.PI);
                ctx.fillStyle = this.isChaotic ? `rgba(0, 216, 255, ${alpha})` : `rgba(0, 255, 136, ${alpha})`;
                ctx.fill();
            });

            // Viên bi chính
            const bx = CX + this.ballRadius * Math.cos(this.ballAngle);
            const by = CY + this.ballRadius * Math.sin(this.ballAngle);

            ctx.save();
            ctx.shadowColor = this.isChaotic ? '#00d8ff' : '#00ff88';
            ctx.shadowBlur = 12;

            // Hào quang
            const ballGrad = ctx.createRadialGradient(bx - 2, by - 2, 1, bx, by, 7);
            ballGrad.addColorStop(0, '#ffffff');
            ballGrad.addColorStop(0.6, this.isChaotic ? '#38bdf8' : '#34d399');
            ballGrad.addColorStop(1, this.isChaotic ? '#0284c7' : '#059669');

            ctx.beginPath();
            ctx.arc(bx, by, 6.5, 0, 2 * Math.PI);
            ctx.fillStyle = ballGrad;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        }
    }
}

// KHỞI TẠO 2 ĐỘNG CƠ BÁNH XE MÔ PHỎNG
let simA = null; // Model A (Deterministic)
let simB = null; // Model B (Chaotic Reality)
let animFrameId = null;
let lastTimestamp = 0;

// ============================================================================
// ĐIỀU KHIỂN & KÍCH HOẠT QUAY SONG SONG (PARALLEL SPIN CONTROLLER)
// ============================================================================

function triggerParallelSpin() {
    if (isSpinning) return;
    isSpinning = true;

    document.getElementById('btnSpin').disabled = true;
    document.getElementById('btnSpin').innerText = '⏳ ĐANG QUAY SONG SONG...';

    // Lấy các tham số từ thanh trượt
    const v0 = parseFloat(document.getElementById('inputBs').value);
    const w0 = parseFloat(document.getElementById('inputWs').value);
    const e = parseFloat(document.getElementById('inputRe').value);
    const deg = parseFloat(document.getElementById('inputIa').value);
    const theta0 = (deg * Math.PI) / 180;
    const mu = parseFloat(document.getElementById('inputFr').value);
    const noise = parseInt(document.getElementById('inputNoise').value, 10);

    // Cài đặt cho cả 2 bánh xe A và B
    simA.resetParams(v0, w0, e, theta0, mu, 0);       // Bánh xe A: không có nhiễu (thuần lý thuyết)
    simB.resetParams(v0, w0, e, theta0, mu, noise);   // Bánh xe B: có nhiễu loạn thực tế

    lastTimestamp = performance.now();
    cancelAnimationFrame(animFrameId);
    animFrameId = requestAnimationFrame(simulationLoop);
}

function simulationLoop(timestamp) {
    const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05) || 0.016;
    lastTimestamp = timestamp;

    simA.update(dt);
    simB.update(dt);

    simA.render();
    simB.render();

    // Cập nhật telemetry trực tiếp
    updateLiveTelemetry();

    // Kiểm tra xem cả 2 bánh xe đã dừng lại chưa
    if (simA.phase === 'settled' && simB.phase === 'settled') {
        isSpinning = false;
        document.getElementById('btnSpin').disabled = false;
        document.getElementById('btnSpin').innerText = '▶ BẮT ĐẦU QUAY SONG SONG (SPACE)';

        onSpinSettledComplete();
        return;
    }

    animFrameId = requestAnimationFrame(simulationLoop);
}

function updateLiveTelemetry() {
    // Model A
    document.getElementById('teleDropTimeA').innerText = `${simA.dropTime ? simA.dropTime.toFixed(2) : '--'} s`;
    document.getElementById('teleBouncesA').innerText = simA.bouncesCount;
    document.getElementById('teleDropAngleA').innerText = `${Math.round((((simA.ballAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) * 180 / Math.PI)}°`;

    // Model B
    document.getElementById('teleDropTimeB').innerText = `${simB.dropTime ? simB.dropTime.toFixed(2) : '--'} s`;
    document.getElementById('teleBouncesB').innerText = simB.bouncesCount;
    document.getElementById('teleDeflectorHitB').innerText = `${simB.deflectorHits} lần va`;

    if (simA.phase === 'settled' && simB.phase === 'settled') {
        const delta = calculatePocketDistance(simA.targetPocketIndex, simB.targetPocketIndex);
        document.getElementById('teleDeltaPockets').innerText = `${delta} ô lệch`;
    } else {
        document.getElementById('teleDeltaPockets').innerText = 'Đang quay...';
    }
}

// TÍNH KHOẢNG CÁCH SỐ Ô TRÊN BÁNH XE TRÒN (0 - 18 Ô)
function calculatePocketDistance(idxA, idxB) {
    const rawDiff = Math.abs(idxA - idxB);
    return Math.min(rawDiff, 37 - rawDiff);
}

// ============================================================================
// TỔNG KẾT VÒNG QUAY & ĐỐI CHIẾU SỰ THẬT (BENCHMARK ANALYSIS)
// ============================================================================

function onSpinSettledComplete() {
    const pA = simA.finalPocketNumber;
    const pB = simB.finalPocketNumber;

    // Cập nhật huy hiệu trên bánh xe
    const badgeA = document.getElementById('pocketA');
    const nameA = document.getElementById('nameA');
    badgeA.innerText = pA;
    nameA.innerText = pA === 0 ? '🟢 ZERO' : (RED_NUMBERS.has(pA) ? '🔴 ĐỎ' : '⚫ ĐEN');

    const badgeB = document.getElementById('pocketB');
    const nameB = document.getElementById('nameB');
    badgeB.innerText = pB;
    nameB.innerText = pB === 0 ? '🟢 ZERO' : (RED_NUMBERS.has(pB) ? '🔴 ĐỎ' : '⚫ ĐEN');

    // Tính khoảng cách lệch
    const delta = calculatePocketDistance(simA.targetPocketIndex, simB.targetPocketIndex);
    const isExact = (delta === 0);
    const isNear = (delta <= 2);

    // Cập nhật thống kê tích lũy
    benchStats.totalRuns++;
    if (isExact) benchStats.exactHits++;
    if (isNear) benchStats.nearHits++;
    benchStats.cumulativeError += delta;
    benchStats.modelACounts[pA]++;
    benchStats.modelBCounts[pB]++;

    // Ghi nhận lịch sử
    const historyItem = {
        run: benchStats.totalRuns,
        pA, pB, delta, isExact, isNear,
        v0: simA.v0, w0: simA.w0,
        deflectors: simB.deflectorHits
    };
    benchStats.history.unshift(historyItem);

    // Cập nhật UI
    updateBenchmarkUI(historyItem);
    drawDistributionChart();

    // Xử lý chế độ Benchmark tự động hàng loạt
    if (autoBenchmarking && autoRunsRemaining > 1) {
        autoRunsRemaining--;
        setTimeout(() => {
            triggerParallelSpin();
        }, 350);
    } else {
        autoBenchmarking = false;
        document.getElementById('btnAuto10').innerText = '⚡ BENCHMARK x10';
        document.getElementById('btnAuto50').innerText = '🚀 BENCHMARK x50';
    }
}

function updateBenchmarkUI(lastItem) {
    const total = benchStats.totalRuns;
    const exactPct = Math.round((benchStats.exactHits / total) * 100);
    const nearPct = Math.round((benchStats.nearHits / total) * 100);
    const meanErr = (benchStats.cumulativeError / total).toFixed(1);

    document.getElementById('bmTotalRuns').innerText = total;
    document.getElementById('bmExactHits').innerHTML = `${benchStats.exactHits} <small>(${exactPct}%)</small>`;
    document.getElementById('bmNearHits').innerHTML = `${benchStats.nearHits} <small>(${nearPct}%)</small>`;
    document.getElementById('bmMeanError').innerHTML = `${meanErr} <small>ô</small>`;

    // Đánh giá kết luận thực nghiệm
    const verdictEl = document.getElementById('bmVerdict');
    const subEl = document.getElementById('bmVerdictSub');

    if (total < 3) {
        verdictEl.className = 'bm-val verdict-badge';
        verdictEl.innerText = 'ĐANG ĐỢI DỮ LIỆU...';
        subEl.innerText = `Cần chạy thêm ${3 - total} vòng nữa`;
    } else if (nearPct >= 50 && meanErr <= 3.5) {
        verdictEl.className = 'bm-val verdict-badge accurate';
        verdictEl.innerText = 'TRÙNG KHỚP CAO (KHẢ THI)';
        subEl.innerText = `Thuật toán dự báo trúng vùng lân cận ${nearPct}% thời gian!`;
    } else if (nearPct >= 30 && meanErr <= 6.0) {
        verdictEl.className = 'bm-val verdict-badge moderate';
        verdictEl.innerText = 'TRÙNG KHỚP TRUNG BÌNH';
        subEl.innerText = `Có tương quan quán tính nhưng bị tán xạ bởi chốt cản`;
    } else {
        verdictEl.className = 'bm-val verdict-badge divergent';
        verdictEl.innerText = 'HỖN LOẠN TÁN XẠ CAO';
        subEl.innerText = `Độ nảy và chốt kim cương làm lệch khỏi dự báo lý thuyết`;
    }

    // Ghi nhật ký vào Physics Log
    appendLogEntry(lastItem);
}

function appendLogEntry(item) {
    const container = document.getElementById('physicsLogContainer');
    if (!container) return;

    const div = document.createElement('div');
    const matchClass = item.isExact ? 'exact-match' : (item.isNear ? 'near-match' : 'divergent');
    const matchIcon = item.isExact ? '🎯 TRÙNG KHỚP 100%' : (item.isNear ? '✨ LÂN CẬN ±2 Ô' : `⚠️ LỆCH ${item.delta} Ô`);

    div.className = `log-entry ${matchClass}`;
    div.innerHTML = `
        <span class="log-time">[#${item.run}]</span>
        <b>Model A: Số ${item.pA}</b> ➔ <b>Model B: Số ${item.pB}</b> | 
        <span>${matchIcon}</span> | 
        <span>Va chốt: ${item.deflectors} | v₀=${item.v0.toFixed(1)}</span>
    `;

    container.insertBefore(div, container.firstChild);
    if (container.children.length > 40) {
        container.removeChild(container.lastChild);
    }
}

function clearLog() {
    const container = document.getElementById('physicsLogContainer');
    if (container) {
        container.innerHTML = '<div class="log-entry sys-msg"><span class="log-time">[SYSTEM]</span> Đã xóa toàn bộ nhật ký.</div>';
    }
}

// ============================================================================
// CHẠY THỬ NGHIỆM TỰ ĐỘNG HÀNG LOẠT (MONTE CARLO BENCHMARK X10 / X50)
// ============================================================================

function toggleAutoBenchmark(count) {
    if (autoBenchmarking) {
        autoBenchmarking = false;
        autoRunsRemaining = 0;
        document.getElementById('btnAuto10').innerText = '⚡ BENCHMARK x10';
        document.getElementById('btnAuto50').innerText = '🚀 BENCHMARK x50';
        return;
    }

    autoBenchmarking = true;
    autoRunsRemaining = count;
    if (count === 10) document.getElementById('btnAuto10').innerText = '⏹ DỪNG x10';
    if (count === 50) document.getElementById('btnAuto50').innerText = '⏹ DỪNG x50';

    if (!isSpinning) {
        triggerParallelSpin();
    }
}

// ============================================================================
// ĐỐI CHIẾU SỐ THỰC TẾ TỪ SÒNG BẠC (REAL CASINO GROUND TRUTH)
// ============================================================================

function handleRealInputKey(event) {
    if (event.key === 'Enter') {
        submitRealCasinoNumber();
    }
}

function submitRealCasinoNumber() {
    const inp = document.getElementById('realInput');
    const msg = document.getElementById('valResultMsg');
    if (!inp || !msg) return;

    const val = parseInt(inp.value, 10);
    if (isNaN(val) || val < 0 || val > 36) {
        alert('Vui lòng nhập số roulette hợp lệ từ 0 đến 36!');
        return;
    }

    if (simA.phase !== 'settled') {
        alert('Hãy bấm QUAY trước để có kết quả dự báo Model A, sau đó đối chiếu số thực tế!');
        return;
    }

    const targetNum = simA.finalPocketNumber;
    const realPocketIdx = POCKETS.indexOf(val);
    const modelAPocketIdx = simA.targetPocketIndex;
    const dist = calculatePocketDistance(realPocketIdx, modelAPocketIdx);

    if (dist === 0) {
        msg.innerHTML = `
            <span style="color: var(--neon-green); font-weight: 800;">🏆 TRÙNG KHỚP TUYỆT ĐỐI!</span><br>
            Số thực tế ra <b>${val}</b> trùng khớp 100% với dự báo Model A (Số ${targetNum})!
        `;
        playSound('deflector');
    } else if (dist <= 2) {
        msg.innerHTML = `
            <span style="color: var(--neon-cyan); font-weight: 700;">✨ TRÚNG CUNG LÂN CẬN (Lệch ${dist} ô)!</span><br>
            Số thực tế ra <b>${val}</b> rơi ngay sát ô dự báo Model A (Số ${targetNum}). Thuật toán nắm bắt quán tính chuẩn xác!
        `;
        playSound('settle');
    } else {
        msg.innerHTML = `
            <span style="color: #cbd5e1;">⚠️ Lệch ${dist} ô trên bánh xe.</span><br>
            Số thực tế ra <b>${val}</b>, dự báo là <b>${targetNum}</b>. Điều chỉnh hệ số ma sát hoặc vận tốc để hiệu chuẩn bàn cược!
        `;
    }

    inp.value = '';
}

// ============================================================================
// BIỂU ĐỒ PHÂN PHỐI TẦN SUẤT 37 SỐ (DISTRIBUTION HISTOGRAM)
// ============================================================================

function drawDistributionChart() {
    const canvas = document.getElementById('distCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    const maxCount = Math.max(1, ...benchStats.modelACounts, ...benchStats.modelBCounts);
    const barWidth = (W - 20) / 37;

    for (let i = 0; i < 37; i++) {
        const x = 10 + i * barWidth;
        const countA = benchStats.modelACounts[i];
        const countB = benchStats.modelBCounts[i];

        const hA = (countA / maxCount) * (H - 30);
        const hB = (countB / maxCount) * (H - 30);

        // Cột Model A (Xanh lá)
        ctx.fillStyle = 'rgba(0, 255, 136, 0.7)';
        ctx.fillRect(x, H - 20 - hA, barWidth * 0.45, hA);

        // Cột Model B (Xanh cyan)
        ctx.fillStyle = 'rgba(0, 216, 255, 0.7)';
        ctx.fillRect(x + barWidth * 0.48, H - 20 - hB, barWidth * 0.45, hB);

        // Nhãn số bên dưới
        if (i % 3 === 0 || i === 0 || i === 36) {
            ctx.fillStyle = '#64748b';
            ctx.font = '8px "JetBrains Mono"';
            ctx.textAlign = 'center';
            ctx.fillText(i, x + barWidth / 2, H - 8);
        }
    }
}

function resetAllStats() {
    if (benchStats.totalRuns > 0 && !confirm('Bạn có chắc muốn đặt lại toàn bộ thống kê thử nghiệm?')) return;

    benchStats = {
        totalRuns: 0,
        exactHits: 0,
        nearHits: 0,
        cumulativeError: 0,
        modelACounts: new Array(37).fill(0),
        modelBCounts: new Array(37).fill(0),
        history: []
    };

    document.getElementById('bmTotalRuns').innerText = '0';
    document.getElementById('bmExactHits').innerHTML = '0 <small>(0%)</small>';
    document.getElementById('bmNearHits').innerHTML = '0 <small>(0%)</small>';
    document.getElementById('bmMeanError').innerHTML = '0.0 <small>ô</small>';
    document.getElementById('bmVerdict').className = 'bm-val verdict-badge';
    document.getElementById('bmVerdict').innerText = 'ĐANG ĐỢI DỮ LIỆU...';
    document.getElementById('bmVerdictSub').innerText = 'Chạy tối thiểu 3 vòng để đánh giá';

    document.getElementById('pocketA').innerText = '--';
    document.getElementById('nameA').innerText = 'Đang chờ';
    document.getElementById('pocketB').innerText = '--';
    document.getElementById('nameB').innerText = 'Đang chờ';

    clearLog();
    drawDistributionChart();

    simA.phase = 'idle';
    simB.phase = 'idle';
    simA.render();
    simB.render();
}

// ============================================================================
// ĐỒNG BỘ THANH TRƯỢT THAM SỐ (INPUT SLIDERS BINDING)
// ============================================================================

function initSliderBindings() {
    const sliders = [
        { id: 'inputBs', valId: 'valBs', fmt: v => `${parseFloat(v).toFixed(1)} m/s` },
        { id: 'inputWs', valId: 'valWs', fmt: v => `${parseFloat(v).toFixed(1)} rad/s` },
        { id: 'inputRe', valId: 'valRe', fmt: v => `${parseFloat(v).toFixed(2)}` },
        { id: 'inputIa', valId: 'valIa', fmt: v => `${v}°` },
        { id: 'inputFr', valId: 'valFr', fmt: v => `${parseFloat(v).toFixed(2)}` },
        { id: 'inputNoise', valId: 'valNoise', fmt: v => v === '0' ? 'Không có (0)' : (v === '1' ? 'Trung bình (σ)' : 'Cao (2σ)') }
    ];

    sliders.forEach(s => {
        const inp = document.getElementById(s.id);
        const val = document.getElementById(s.valId);
        if (inp && val) {
            inp.addEventListener('input', () => {
                val.innerText = s.fmt(inp.value);
            });
        }
    });
}

// ============================================================================
// KHỞI ĐỘNG ỨNG DỤNG
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {
    simA = new WheelSimulator('canvasA', false); // Model A (Deterministic)
    simB = new WheelSimulator('canvasB', true);  // Model B (Chaotic Reality)

    initSliderBindings();
    drawDistributionChart();

    // Phím tắt SPACE để quay nhanh
    document.addEventListener('keydown', e => {
        if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
            e.preventDefault();
            triggerParallelSpin();
        }
    });

    // Vẽ bánh xe lần đầu
    simA.render();
    simB.render();
});
