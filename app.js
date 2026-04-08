/* ====================================================
   아트밸리 보물찾기 — App Logic
   10개 QR 중 5개 수집 → 보물상자 오픈!
   ==================================================== */

// ── Constants ──────────────────────────────────────

const VALID_QR_CODES = [
    'AV_TREASURE_01', 'AV_TREASURE_02', 'AV_TREASURE_03',
    'AV_TREASURE_04', 'AV_TREASURE_05', 'AV_TREASURE_06',
    'AV_TREASURE_07', 'AV_TREASURE_08', 'AV_TREASURE_09',
    'AV_TREASURE_10'
];

const ITEMS = [
    { id: 'key',     name: '황금 열쇠',   icon: '🔑', desc: '보물상자의 자물쇠를 열 열쇠 조각을 찾았어!' },
    { id: 'bag',     name: '탐험가 가방',  icon: '🎒', desc: '보물을 담을 수 있는 가방을 발견했어!' },
    { id: 'map',     name: '보물 지도',    icon: '🗺️', desc: '보물의 위치가 그려진 신비한 지도!' },
    { id: 'lantern', name: '탐험 랜턴',    icon: '🔦', desc: '어두운 곳도 밝혀줄 마법의 랜턴!' },
    { id: 'gem',     name: '보물 원석',    icon: '💎', desc: '아트밸리의 신비로운 보물 원석!' },
];

const REQUIRED_COUNT = 5;
const STORAGE_PREFIX = 'av_';

// ── State ──────────────────────────────────────────

let html5QrScanner = null;
let scannerInitialized = false;
let isProcessing = false;

// ── Sound Manager (Web Audio API) ──────────────────

class SoundManager {
    constructor() {
        this.ctx = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio not supported');
        }
    }

    _playTone(freq, duration, type = 'sine', volume = 0.15) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + duration);
    }

    playItemGet() {
        if (!this.ctx) return;
        this._playTone(523, 0.15, 'sine', 0.12);
        setTimeout(() => this._playTone(659, 0.15, 'sine', 0.12), 100);
        setTimeout(() => this._playTone(784, 0.25, 'sine', 0.15), 200);
    }

    playFanfare() {
        if (!this.ctx) return;
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => this._playTone(freq, 0.3, 'sine', 0.12), i * 150);
        });
        setTimeout(() => {
            this._playTone(1047, 0.6, 'sine', 0.1);
            this._playTone(784, 0.6, 'sine', 0.08);
        }, 600);
    }

    playError() {
        if (!this.ctx) return;
        this._playTone(200, 0.15, 'square', 0.06);
        setTimeout(() => this._playTone(160, 0.2, 'square', 0.06), 100);
    }

    playClick() {
        if (!this.ctx) return;
        this._playTone(800, 0.05, 'sine', 0.05);
    }
}

const sound = new SoundManager();

// ── Storage Helpers ────────────────────────────────

function storageGet(key, fallback) {
    try {
        const val = localStorage.getItem(STORAGE_PREFIX + key);
        return val !== null ? JSON.parse(val) : fallback;
    } catch {
        return fallback;
    }
}

function storageSet(key, value) {
    try {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (e) {
        console.warn('localStorage write failed:', e);
    }
}

// ── Haptic Feedback ────────────────────────────────

function haptic(type) {
    if (!navigator.vibrate) return;
    switch (type) {
        case 'item':    navigator.vibrate([80, 40, 120]); break;
        case 'error':   navigator.vibrate([100, 50, 100]); break;
        case 'clear':   navigator.vibrate([200, 100, 200, 100, 400]); break;
        case 'click':   navigator.vibrate(30); break;
    }
}

// ── Screen Navigation ──────────────────────────────

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
    });
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active');
    }
}

// ── Stars Background ──────────────────────────────

function initStars() {
    const canvas = document.getElementById('stars-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let stars = [];
    let animId;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        generateStars();
    }

    function generateStars() {
        stars = [];
        const count = Math.floor((canvas.width * canvas.height) / 4000);
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 1.5 + 0.3,
                alpha: Math.random() * 0.8 + 0.2,
                speed: Math.random() * 0.005 + 0.002,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    function draw(time) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        stars.forEach(s => {
            const twinkle = Math.sin(time * s.speed + s.phase) * 0.3 + 0.7;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha * twinkle})`;
            ctx.fill();
        });
        animId = requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    resize();
    animId = requestAnimationFrame(draw);
}

// ── Confetti ───────────────────────────────────────

function fireConfetti(duration = 3000) {
    if (typeof confetti === 'undefined') return;
    const end = Date.now() + duration;
    const colors = ['#f4a940', '#ffd700', '#e87a3a', '#7ec8e3', '#ffffff'];

    (function frame() {
        confetti({
            particleCount: 4,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.7 },
            colors: colors
        });
        confetti({
            particleCount: 4,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.7 },
            colors: colors
        });
        if (Date.now() < end) requestAnimationFrame(frame);
    })();
}

function fireBigConfetti() {
    if (typeof confetti === 'undefined') return;
    // Big burst
    confetti({
        particleCount: 100,
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        colors: ['#f4a940', '#ffd700', '#e87a3a', '#7ec8e3', '#ffffff', '#4ade80']
    });
    // Then continuous
    fireConfetti(5000);
}

// ── QR Scanner ─────────────────────────────────────

function openScanner() {
    sound.init();
    sound.playClick();
    haptic('click');

    const scannerScreen = document.getElementById('screen-scanner');
    scannerScreen.classList.add('active');

    if (scannerInitialized && html5QrScanner) {
        // Resume — no permission popup!
        try {
            html5QrScanner.resume();
        } catch (e) {
            // If resume fails (e.g., stream lost), re-initialize
            console.warn('Resume failed, re-initializing:', e);
            scannerInitialized = false;
            startFreshScanner();
        }
    } else {
        startFreshScanner();
    }
}

function startFreshScanner() {
    html5QrScanner = new Html5Qrcode('reader');
    const config = {
        fps: 15,
        qrbox: { width: 220, height: 220 },
        aspectRatio: window.innerHeight / window.innerWidth
    };

    html5QrScanner.start(
        { facingMode: 'environment' },
        config,
        onScanSuccess
    ).then(() => {
        scannerInitialized = true;
    }).catch(err => {
        console.error('Camera error:', err);
        alert('카메라 접근 권한이 필요합니다.\n설정에서 카메라 권한을 허용해주세요.');
        closeScanner();
    });
}

function closeScanner() {
    sound.playClick();
    haptic('click');

    if (html5QrScanner && scannerInitialized) {
        try {
            html5QrScanner.pause(true); // Pause both scanning and video
        } catch (e) {
            console.warn('Pause failed:', e);
        }
    }

    document.getElementById('screen-scanner').classList.remove('active');
    isProcessing = false;
}

function onScanSuccess(decodedText) {
    if (isProcessing) return;
    isProcessing = true;

    // Pause scanner immediately
    if (html5QrScanner) {
        try {
            html5QrScanner.pause(true);
        } catch (e) {
            console.warn('Pause failed:', e);
        }
    }

    // Hide scanner screen
    document.getElementById('screen-scanner').classList.remove('active');

    // Process game logic
    processQRCode(decodedText);
}

// ── Game Logic ─────────────────────────────────────

function processQRCode(code) {
    const scannedQrs = storageGet('scanned_qrs', []);
    const collectedCount = storageGet('collected_count', 0);

    // 1. Valid QR?
    if (!VALID_QR_CODES.includes(code)) {
        sound.playError();
        haptic('error');
        showModal('error', '❌', '잘못된 마커', '아트밸리 공식 보물 마커가 아닙니다.', 'error');
        return;
    }

    // 2. Already scanned this specific QR?
    if (scannedQrs.includes(code)) {
        sound.playError();
        haptic('error');
        showModal('error', '⚠️', '이미 발견한 마커!', '이 보물 마커는 이미 스캔했어요.\n다른 곳에 숨겨진 마커를 찾아보세요!', 'warning');
        return;
    }

    // 3. Already collected 5 items?
    if (collectedCount >= REQUIRED_COUNT) {
        showModal('error', '✨', '이미 보물상자 열림!', '이미 보물상자를 열었어요!\n안내데스크에서 선물을 받으세요.', 'success');
        return;
    }

    // 4. New valid scan! Collect item.
    scannedQrs.push(code);
    const newCount = collectedCount + 1;
    storageSet('scanned_qrs', scannedQrs);
    storageSet('collected_count', newCount);

    const item = ITEMS[newCount - 1];

    if (newCount >= REQUIRED_COUNT) {
        // 🏆 CLEAR!
        storageSet('game_cleared', true);
        sound.playFanfare();
        haptic('clear');
        showItemModal(item, newCount, true);
    } else {
        sound.playItemGet();
        haptic('item');
        showItemModal(item, newCount, false);
    }
}

// ── Modal System ───────────────────────────────────

function showModal(modalId, icon, title, desc, type) {
    const modal = document.getElementById('modal-error');
    modal.querySelector('.modal-icon').textContent = icon;
    const titleEl = modal.querySelector('.modal-title');
    titleEl.textContent = title;
    titleEl.className = 'modal-title ' + type;
    modal.querySelector('.modal-desc').textContent = desc;
    modal.classList.add('active');
}

function closeErrorModal() {
    document.getElementById('modal-error').classList.remove('active');
    showScreen('screen-inventory');
    updateInventoryUI();
    isProcessing = false;
}

function showItemModal(item, count, isClear) {
    const modal = document.getElementById('modal-item');
    modal.querySelector('.modal-icon').textContent = item.icon;
    const titleEl = modal.querySelector('.modal-title');
    titleEl.textContent = item.name + ' 발견!';
    titleEl.className = 'modal-title success';

    let descText = item.desc;
    if (isClear) {
        descText += '\n\n🎉 모든 보물을 찾았어요!';
    } else {
        descText += `\n\n(${count}/${REQUIRED_COUNT} 수집 완료)`;
    }
    modal.querySelector('.modal-desc').textContent = descText;

    // Change button text
    const btn = modal.querySelector('.modal-btn');
    btn.textContent = isClear ? '🎁 보물상자 열기!' : '보관하기!';
    btn.onclick = () => closeItemModal(isClear);

    modal.classList.add('active');
    fireConfetti(isClear ? 0 : 1500);
}

function closeItemModal(goToClear) {
    document.getElementById('modal-item').classList.remove('active');
    isProcessing = false;

    if (goToClear) {
        showClearScreen();
    } else {
        showScreen('screen-inventory');
        updateInventoryUI();
    }
}

// ── Clear Screen ───────────────────────────────────

function showClearScreen() {
    showScreen('screen-clear');
    fireBigConfetti();
}

function goToCertificate() {
    sound.playClick();
    haptic('click');
    showScreen('screen-certificate');

    // Set today's date
    const today = new Date();
    const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
    const dateEl = document.getElementById('cert-date');
    if (dateEl) dateEl.textContent = dateStr;
}

// ── Certificate ────────────────────────────────────

function saveCertificate() {
    sound.playClick();
    haptic('click');

    const certCard = document.getElementById('cert-card');
    if (!certCard) return;

    // Temporarily make the input look like plain text
    const input = document.getElementById('cert-name-input');
    const nameVal = input.value || '탐험가';
    
    // Create a text span to replace input during capture
    const nameSpan = document.createElement('span');
    nameSpan.textContent = nameVal;
    nameSpan.style.cssText = 'font-size:1.1rem;font-weight:700;color:#fff;display:block;padding:10px 0;';
    input.style.display = 'none';
    input.parentNode.insertBefore(nameSpan, input.nextSibling);

    html2canvas(certCard, {
        backgroundColor: '#0f1d33',
        scale: 2,
        useCORS: true,
        logging: false
    }).then(canvas => {
        // Restore input
        nameSpan.remove();
        input.style.display = '';

        // Download
        const link = document.createElement('a');
        link.download = `아트밸리_보물찾기_인증서_${nameVal}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }).catch(err => {
        console.error('Certificate capture failed:', err);
        nameSpan.remove();
        input.style.display = '';
        alert('인증서 저장에 실패했습니다.\n스크린샷으로 저장해주세요!');
    });
}

// ── Inventory UI Update ────────────────────────────

function updateInventoryUI() {
    const count = storageGet('collected_count', 0);
    const cleared = storageGet('game_cleared', false);

    // Progress bar
    const countEl = document.getElementById('progress-count');
    if (countEl) countEl.textContent = `${count}/${REQUIRED_COUNT}`;

    document.querySelectorAll('.progress-segment').forEach((seg, i) => {
        seg.classList.toggle('filled', i < count);
    });

    // Item slots
    ITEMS.forEach((item, i) => {
        const slot = document.getElementById(`slot-${item.id}`);
        if (slot) {
            if (i < count) {
                if (!slot.classList.contains('collected')) {
                    setTimeout(() => slot.classList.add('collected'), i * 80);
                }
            }
        }
    });

    // Mascot message
    const msgEl = document.getElementById('mascot-msg');
    if (msgEl) {
        if (cleared) {
            msgEl.textContent = '축하해! 보물상자를 열었어! 🎉';
        } else if (count === 0) {
            msgEl.textContent = '보물 마커를 찾아 스캔해봐!';
        } else if (count < REQUIRED_COUNT) {
            msgEl.textContent = `${REQUIRED_COUNT - count}개만 더 찾으면 돼! 화이팅!`;
        }
    }

    // Scan button state
    const scanBtn = document.getElementById('btn-scan');
    if (scanBtn) {
        if (cleared) {
            scanBtn.textContent = '🏆 인증서 보기';
            scanBtn.onclick = () => goToCertificate();
            scanBtn.classList.remove('btn-gold');
            scanBtn.classList.add('btn-blue');
        } else {
            scanBtn.textContent = '📷 QR 마커 스캔';
            scanBtn.onclick = () => openScanner();
        }
    }
}

// ── Game Control ───────────────────────────────────

function startGame() {
    sound.init();
    sound.playClick();
    haptic('click');

    storageSet('game_started', true);
    showScreen('screen-inventory');
    updateInventoryUI();
}

function resetGame() {
    if (confirm('모든 보물찾기 데이터를 초기화합니다.\n정말 초기화할까요?')) {
        // Clean up scanner
        if (html5QrScanner && scannerInitialized) {
            try {
                html5QrScanner.stop().then(() => {
                    html5QrScanner = null;
                    scannerInitialized = false;
                }).catch(() => {
                    html5QrScanner = null;
                    scannerInitialized = false;
                });
            } catch (e) {
                html5QrScanner = null;
                scannerInitialized = false;
            }
        }

        // Clear storage
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(STORAGE_PREFIX)) {
                localStorage.removeItem(key);
            }
        });

        location.reload();
    }
}

// ── Initialization ─────────────────────────────────

function init() {
    initStars();

    const gameStarted = storageGet('game_started', false);
    const cleared = storageGet('game_cleared', false);

    if (gameStarted || cleared) {
        showScreen('screen-inventory');
        updateInventoryUI();
    } else {
        showScreen('screen-start');
    }
}

// ── Page Lifecycle ─────────────────────────────────

window.addEventListener('DOMContentLoaded', init);

window.addEventListener('beforeunload', () => {
    if (html5QrScanner && scannerInitialized) {
        try { html5QrScanner.stop(); } catch (e) { /* ignore */ }
    }
});

// Resume audio context on user interaction (mobile policy)
document.addEventListener('click', () => {
    sound.init();
    if (sound.ctx && sound.ctx.state === 'suspended') {
        sound.ctx.resume();
    }
}, { once: true });
