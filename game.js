/**
 * Premium Mini-Game Engine for Art Valley Treasure Hunt
 */

let mgInterval, mgTimeout, mgAnimFrame;
let currentGameType = '';
let currentItemCode = '';
let currentMgId = 0; // 🌟 현재 게임 세션 ID
let lives = 3;
let isEnding = false; // 전역 상태로 게임 종료 중인지 체크

// UI Elements (Cached after first open)
let elements = {};

function initGameElements() {
    elements = {
        modal: document.getElementById('modal-minigame'),
        container: document.getElementById('mg-container'),
        resultOverlay: document.getElementById('mg-result'),
        resultText: document.getElementById('result-text'),
        retryBtn: document.getElementById('retry-btn'),
        title: document.getElementById('mg-title'),
        desc: document.getElementById('mg-desc'),
        score: document.getElementById('mg-score'),
        timer: document.getElementById('mg-timer'),
        lives: document.getElementById('mg-lives'),
        intro: document.getElementById('mg-intro'),
        introGuide: document.getElementById('mg-intro-guide'),
        introIcon: document.getElementById('mg-intro-icon')
    };
}

function getEventPos(e, el) {
    const rect = el.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
}

function createParticles(x, y, count, emojis) {
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.textContent = Array.isArray(emojis) ? emojis[Math.floor(Math.random() * emojis.length)] : emojis;
        p.style.left = x + 'px';
        p.style.top = y + 'px';
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 60 + 20;
        p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
        p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
        elements.container.appendChild(p);
        setTimeout(() => p.remove(), 800);
    }
}

function updateLives() {
    elements.lives.textContent = '❤️'.repeat(lives);
}

function takeDamage(loseCb) {
    lives--;
    updateLives();
    elements.container.classList.add('mg-shake');
    haptic('error');
    setTimeout(() => elements.container.classList.remove('mg-shake'), 400);
    if (lives <= 0) setTimeout(loseCb, 400);
}

// ── Main Entry Point ──
function openMiniGame(type, code) {
    if (!elements.modal) initGameElements();

    currentMgId++; // 🌟 새로운 세션 ID 발급
    currentGameType = type;
    currentItemCode = code;

    // Set Title immediately for the Intro Phase
    const item = {
        'key': '황금 열쇠 미션',
        'bag': '탐험가 가방 미션',
        'map': '기억의 지도 미션',
        'lantern': '어둠 속 추적 미션',
        'gem': '보물 원석 미션'
    };
    elements.title.textContent = item[type] || "보물 미션";

    elements.modal.classList.add('active');

    resetGameUI();
    window.ondevicemotion = null;

    // Step 1: Show Intro Guide
    showIntroGuide(type);
}

function showIntroGuide(type) {
    elements.intro.style.display = 'flex';

    let guide = "";
    let icon = "🎮";

    // Clear any previous intro animations
    const existingGhosts = elements.intro.querySelectorAll('.intro-ghost');
    existingGhosts.forEach(g => g.remove());

    switch (type) {
        case 'key':
            icon = "🔑";
            guide = "<b>[ 황금 열쇠 미션 ]</b><br>바늘이 초록색 칸에 왔을 때<br>화면을 터치하세요! (3번 성공)";
            break;
        case 'bag':
            icon = "🎒";
            guide = "<b>[ 탐험가 가방 미션 ]</b><br>가방을 좌우로 움직여 떨어지는 도구를<br>10개 잡으세요! 💣폭탄은 피하세요.";
            break;
        case 'map':
            icon = "🗺️";
            guide = "<b>[ 보물 지도 미션 ]</b><br>반짝이는 순서를 기억하고<br>그대로 따라 누르세요!";
            break;
        case 'lantern':
            icon = "🔦";
            guide = "<b>[ 탐험 랜턴 미션 ]</b><br>손전등을 꾹 눌러 숨어있는 유령을 찾아<br>빛의 중심에 모아보세요!";
            // 🌟 인트로 배경 유령 연출
            for (let i = 0; i < 5; i++) {
                const g = document.createElement('div');
                g.className = 'intro-ghost';
                g.textContent = '👻';
                g.style.left = Math.random() * 80 + 10 + '%';
                g.style.top = Math.random() * 60 + 20 + '%';
                g.style.animationDelay = (Math.random() * 2) + 's';
                elements.intro.appendChild(g);
            }
            break;
        case 'gem':
            icon = "💎";
            guide = "<b>[ 보물 원석 미션 ]</b><br>1단계: 바위를 연타해 부수세요!<br>2단계: 좌우로 비비거나 흔들어서 먼지를 터세요!";
            break;
    }

    elements.introIcon.textContent = icon;
    elements.introGuide.innerHTML = guide;
}

function startMiniGameLogic() {
    // 🌟 인트로 유령 제거 연출
    const introGhosts = elements.intro.querySelectorAll('.intro-ghost');
    introGhosts.forEach(g => {
        g.style.transition = '0.5s';
        g.style.transform = 'scale(0) rotate(360deg)';
        g.style.opacity = '0';
    });

    setTimeout(() => {
        if (elements.intro.style.display === 'none') return; // 이미 닫혔다면 중단

        const myId = currentMgId; // 🌟 이 로직이 시작된 시점의 ID 저장
        elements.intro.style.display = 'none';
        haptic('click');

        const onWin = () => finishMiniGame('✨ 성공!', '#4ade80', true);
        const onLose = () => finishMiniGame('💦 실패! 다시 스캔해주세요', '#ef4444', false);

        // Map item IDs to game types
        switch (currentGameType) {
            case 'key': playLockpick(onWin, onLose, myId); break;
            case 'bag': playCatch(onWin, onLose, myId); break;
            case 'map': playSimon(onWin, onLose, myId); break;
            case 'lantern': playSpotlight(onWin, onLose, myId); break;
            case 'gem': playMash(onWin, onLose, myId); break;
            default: playLockpick(onWin, onLose, myId);
        }
    }, 500); // 500ms 딜레이 후 게임 실행
}

function retryMiniGame() {
    openMiniGame(currentGameType, currentItemCode);
}

function resetGameUI() {
    clearInterval(mgInterval);
    clearTimeout(mgTimeout);
    cancelAnimationFrame(mgAnimFrame);

    // [핵심 수정] 컨테이너 전체를 복제하여 이전 게임의 모든 이벤트 리스너(터치, 드래그 등)를 완전히 소멸시킴
    const oldContainer = elements.container;
    if (oldContainer) {
        const newContainer = oldContainer.cloneNode(true);
        oldContainer.parentNode.replaceChild(newContainer, oldContainer);
        elements.container = newContainer;

        // DOM이 새로 생성되었으므로 내부 UI 요소 참조를 다시 연결 (검은 화면 방지)
        elements.resultOverlay = newContainer.querySelector('#mg-result');
        elements.resultText = newContainer.querySelector('#result-text');
        elements.retryBtn = newContainer.querySelector('#retry-btn');
        elements.intro = newContainer.querySelector('#mg-intro');
        elements.introGuide = newContainer.querySelector('#mg-intro-guide');
        elements.introIcon = newContainer.querySelector('#mg-intro-icon');
    }

    // 새 게임을 위해 이전 게임 요소들 삭제 (intro, result는 유지)
    Array.from(elements.container.children).forEach(child => {
        if (child.id !== 'mg-result' && child.id !== 'mg-intro') child.remove();
    });

    if (elements.resultOverlay) elements.resultOverlay.style.display = 'none';
    if (elements.intro) elements.intro.style.display = 'none';

    elements.container.classList.remove('mg-shake');
    elements.container.classList.remove('flash-success');
    elements.container.style.pointerEvents = 'auto';

    elements.score.textContent = '';
    elements.timer.textContent = '';
    elements.lives.textContent = '';
    lives = 3;

    // 자이로센서 초기화
    window.ondevicemotion = null;
    isEnding = false; // 종료 플래그 리셋
}

function closeMiniGame() {
    resetGameUI();
    window.ondevicemotion = null;
    elements.modal.classList.remove('active');

    // Release processing lock in index.html
    if (typeof isProcessing !== 'undefined') isProcessing = false;
}

function finishMiniGame(msg, color, isWin) {
    if (isEnding) return; // 이미 종료 중이면 무시
    isEnding = true;

    if (isWin) {
        elements.container.style.pointerEvents = 'none';
        elements.resultOverlay.style.display = 'flex';
        elements.resultText.textContent = msg;
        elements.resultText.style.color = color;
        elements.retryBtn.style.display = 'none';

        sound.playFanfare();
        haptic('clear');
        fireConfetti();
        createParticles(elements.container.offsetWidth / 2, elements.container.offsetHeight / 2, 20, ['✨', '🌟', '🎉']);

        // 1.5초 후 성공 데이터 저장 및 닫기
        setTimeout(() => {
            closeMiniGame();
            if (typeof saveItemAfterMission === 'function') {
                saveItemAfterMission(currentGameType, currentItemCode);
            }
        }, 1500);
    } else {
        elements.resultOverlay.style.display = 'flex';
        elements.resultText.textContent = msg;
        elements.resultText.style.color = color;
        elements.retryBtn.style.display = 'none'; // [수정] 다시하기 버튼 제거
        sound.playError();
        haptic('error');
    }
}

// ── 1. 황금 열쇠 미션 (Golden Key) ──
function playLockpick(win, lose, myId) {
    const isAlive = () => currentMgId === myId;
    elements.title.textContent = "황금 열쇠 미션";
    if (elements.desc) elements.desc.textContent = "바늘이 초록색 칸에 왔을 때 탭!";
    elements.container.insertAdjacentHTML('beforeend', `<div style="position:absolute; bottom:50px; width:100%;"><div class="lock-bar"><div id="lp-safe" class="lock-safe"></div><div id="lp-needle" class="lock-needle"></div></div></div>`);
    updateLives();
    let successCount = 0;
    elements.score.textContent = `성공: 0/3`;

    const setSpeed = (s) => {
        const needle = document.getElementById('lp-needle');
        if (needle) needle.style.animationDuration = s + 's';
    };

    elements.container.onmousedown = elements.container.ontouchstart = (e) => {
        if (!isAlive()) return;

        // 중복 클릭 방지 (Ghost Click 차단)
        if (elements.container.dataset.lastPress && Date.now() - parseInt(elements.container.dataset.lastPress) < 300) return;
        elements.container.dataset.lastPress = Date.now();

        e.preventDefault();
        const needle = document.getElementById('lp-needle').getBoundingClientRect();
        const safe = document.getElementById('lp-safe').getBoundingClientRect();

        const needleMid = needle.left + needle.width / 2;
        if (needleMid >= safe.left && needleMid <= safe.right) {
            successCount++;
            elements.score.textContent = `성공: ${successCount}/3`;
            createParticles(getEventPos(e, elements.container).x, getEventPos(e, elements.container).y, 5, '✨');
            haptic('click');

            elements.container.classList.add('flash-success');
            setTimeout(() => { if (isAlive()) elements.container.classList.remove('flash-success'); }, 400);

            if (successCount >= 3) {
                win();
            } else {
                const safeEl = document.getElementById('lp-safe');
                if (safeEl) {
                    safeEl.style.width = (20 - successCount * 3) + '%';
                    safeEl.style.left = Math.random() * 60 + 10 + '%';
                }
                setSpeed(1.2 - successCount * 0.25);
            }
        } else {
            takeDamage(lose);
        }
    };
}

// ── 2. 탐험 도구 캐치 (Explorer Bag) ──
function playCatch(win, lose, myId) {
    const isAlive = () => currentMgId === myId && elements.container.querySelector('#c-player');

    elements.title.textContent = "탐험 도구 캐치";
    if (elements.desc) elements.desc.textContent = "가방을 드래그하여 도구를 10개 담으세요!";

    const existingPlayer = document.getElementById('c-player');
    if (existingPlayer) existingPlayer.remove();

    elements.container.insertAdjacentHTML('beforeend', `<div id="c-player" style="position:absolute; bottom:10px; left:50%; transform:translateX(-50%); font-size:45px; z-index:10; transition: none; cursor: grab;">🎒</div>`);
    updateLives();
    let score = 0;
    let items = [];
    const player = document.getElementById('c-player');
    const toolEmojis = ['🧭', '🗺️', '💧', '🔦', '🍞'];
    elements.score.textContent = `캐치: 0/10`;

    let isDragging = false;
    let startX = 0;
    let playerStartX = 0;

    const startDrag = (e) => {
        if (!isAlive()) return;
        isDragging = true;
        const pos = getEventPos(e, elements.container);
        startX = pos.x;
        playerStartX = player.offsetLeft;
        player.style.cursor = 'grabbing';
    };

    const moveHandler = (e) => {
        if (!isAlive() || !isDragging) return;
        e.preventDefault();
        const pos = getEventPos(e, elements.container);
        const dx = pos.x - startX;
        let newX = playerStartX + dx;

        // 범위 제한
        newX = Math.max(25, Math.min(elements.container.offsetWidth - 25, newX));
        player.style.left = newX + 'px';
        player.style.transform = 'translateX(-50%)'; // 유지
    };

    const endDrag = () => {
        isDragging = false;
        if (player) player.style.cursor = 'grab';
    };

    // 가방에 직접 이벤트 걸거나 컨테이너에서 처리
    player.onmousedown = player.ontouchstart = startDrag;
    window.addEventListener('mousemove', moveHandler);
    window.addEventListener('touchmove', moveHandler, { passive: false });
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchend', endDrag);

    let speed = 3.5;
    mgInterval = setInterval(() => {
        if (!isAlive()) {
            clearInterval(mgInterval);
            window.removeEventListener('mousemove', moveHandler);
            window.removeEventListener('touchmove', moveHandler);
            window.removeEventListener('mouseup', endDrag);
            window.removeEventListener('touchend', endDrag);
            return;
        }

        // 아이템 생성
        if (Math.random() < 0.15) {
            let el = document.createElement('div');
            const isBomb = Math.random() > 0.8;
            el.textContent = isBomb ? '💣' : toolEmojis[Math.floor(Math.random() * toolEmojis.length)];
            el.dataset.type = isBomb ? 'bomb' : 'tool';
            el.className = isBomb ? 'item-bad' : 'item-good';
            el.style.cssText += `position:absolute; top:-40px; left:${Math.random() * 85 + 5}%; font-size:28px; z-index:5;`;
            elements.container.appendChild(el);
            items.push({ el: el, y: -40 });
        }

        // 아이템 이동 및 충돌 체크
        items.forEach((obj, i) => {
            obj.y += speed;
            obj.el.style.top = obj.y + 'px';
            const pRect = player.getBoundingClientRect();
            const eRect = obj.el.getBoundingClientRect();

            // 충돌 판정
            if (eRect.bottom > pRect.top + 15 && eRect.top < pRect.bottom && eRect.left < pRect.right - 10 && eRect.right > pRect.left + 10) {
                const hitX = obj.el.offsetLeft + 15;
                const hitY = obj.el.offsetTop + 15;

                if (obj.el.dataset.type === 'bomb') {
                    // 폭탄 히트: 진동 및 흔들림 연출
                    createParticles(hitX, hitY, 15, ['💥', '🔥']);
                    elements.container.classList.add('mg-shake');
                    setTimeout(() => { if (isAlive()) elements.container.classList.remove('mg-shake'); }, 500);
                    navigator.vibrate?.([100, 50, 100]); // 강한 진동
                    takeDamage(lose);
                } else {
                    score++;
                    elements.score.textContent = `캐치: ${score}/10`;
                    createParticles(hitX, hitY, 3, '✨');
                    speed += 0.08;
                    haptic('click');
                }
                obj.el.remove();
                items.splice(i, 1);
                if (score >= 10 && lives > 0) {
                    clearInterval(mgInterval);
                    win();
                }
            } else if (obj.y > elements.container.offsetHeight) {
                obj.el.remove();
                items.splice(i, 1);
            }
        });
    }, 30);
}

// ── 3. 기억의 지도 (Treasure Map) ──
function playSimon(win, lose, myId) {
    const isAlive = () => currentMgId === myId && document.getElementById('s-grid') !== null;
    elements.title.textContent = "기억의 지도 미션";
    if (elements.desc) elements.desc.textContent = "반짝이는 순서를 기억하세요! (4회)";
    let html = '<div class="simon-grid" id="s-grid">';
    for (let i = 0; i < 9; i++) html += `<div class="simon-btn" data-id="${i}"></div>`;
    elements.container.insertAdjacentHTML('beforeend', html + '</div><div id="s-msg" class="simon-turn-msg"></div>');
    updateLives();

    let sequence = [];
    let playerStep = 0;
    let currentRound = 1; // 🌟 라운드 추적 변수 분리

    const btns = elements.container.querySelectorAll('.simon-btn');
    let turnMsg = document.getElementById('s-msg');

    const showSequence = () => {
        if (!isAlive()) return;
        clearTimeout(mgTimeout);

        playerStep = 0;
        let step = 0;

        btns.forEach(b => b.classList.remove('active'));
        elements.container.style.pointerEvents = 'none';

        const grid = document.getElementById('s-grid');
        if (grid) grid.style.filter = 'brightness(0.5)';

        if (turnMsg) {
            turnMsg.textContent = "👀 순서를 외우세요!";
            turnMsg.style.opacity = '1';
        }

        const nextStep = () => {
            if (!isAlive()) return;
            btns.forEach(b => b.classList.remove('active'));

            if (step < sequence.length) {
                if (step === 0 && turnMsg) turnMsg.style.opacity = '0';
                const currentBtn = btns[sequence[step]];
                if (currentBtn) {
                    currentBtn.classList.add('active');
                    haptic('click');
                }
                step++;
                mgTimeout = setTimeout(nextStep, 800);
            } else {
                elements.container.style.pointerEvents = 'auto';
                if (grid) grid.style.filter = 'brightness(1)';
                if (turnMsg) {
                    turnMsg.textContent = "👇 따라 누르세요!";
                    turnMsg.style.opacity = '1';
                }
                mgTimeout = setTimeout(() => {
                    if (isAlive() && turnMsg) turnMsg.style.opacity = '0';
                }, 1000);
            }
        };
        mgTimeout = setTimeout(nextStep, 1000);
    };

    const generateSequence = () => {
        if (!isAlive()) return;
        clearTimeout(mgTimeout);

        const fixedSequences = [
            [4],             // 1단계: 5
            [1, 7],          // 2단계: 2, 8
            [8, 3, 2],       // 3단계: 9, 4, 3
            [6, 1, 7, 3]     // 4단계: 7, 2, 8, 4
        ];

        sequence = fixedSequences[currentRound - 1] || [];
        elements.score.textContent = `단계: ${currentRound}/4`;
        showSequence();
    };

    btns.forEach(btn => {
        const handlePress = (e) => {
            if (!isAlive() || elements.container.style.pointerEvents === 'none') return;

            // 중복 클릭 방지 (Mobile에서 touch와 mouse가 둘 다 터지는 현상 차단)
            if (btn.dataset.lastPress && Date.now() - parseInt(btn.dataset.lastPress) < 300) return;
            btn.dataset.lastPress = Date.now();

            e.preventDefault();

            const id = parseInt(btn.dataset.id);
            btn.classList.add('active');
            createParticles(getEventPos(e, elements.container).x, getEventPos(e, elements.container).y, 2, '✨');
            haptic('click');

            setTimeout(() => { if (isAlive()) btn.classList.remove('active'); }, 250);

            if (id === sequence[playerStep]) {
                playerStep++;
                if (playerStep === sequence.length) {
                    elements.container.style.pointerEvents = 'none';
                    if (turnMsg) turnMsg.style.opacity = '0';

                    if (currentRound === 4) {
                        setTimeout(() => { if (isAlive()) win(); }, 600);
                    } else {
                        currentRound++;
                        elements.container.classList.add('flash-success');
                        setTimeout(() => { if (isAlive()) elements.container.classList.remove('flash-success'); }, 400);
                        mgTimeout = setTimeout(generateSequence, 800);
                    }
                }
            } else {
                elements.container.style.pointerEvents = 'none';
                if (turnMsg) turnMsg.style.opacity = '0';

                takeDamage(lose);
                if (lives > 0) {
                    mgTimeout = setTimeout(showSequence, 1000);
                }
            }
        };

        btn.onmousedown = handlePress;
        btn.ontouchstart = handlePress;
    });

    mgTimeout = setTimeout(generateSequence, 500);
}

// ── 4. 어둠 속 추적 (Explorer Lantern) ──
function playSpotlight(win, lose, myId) {
    const isAlive = () => currentMgId === myId && document.getElementById('sl-target');
    elements.title.textContent = "어둠 속 추적";
    if (elements.desc) elements.desc.textContent = "손전등을 드래그해 유령을 찾으세요!";
    elements.container.insertAdjacentHTML('beforeend', `<div class="track-gauge-bg"><div id="sl-gauge" class="track-gauge-fill"></div></div>
                                    <div id="sl-bg" style="width:100%; height:100%; background: #000;"></div>
                                    <div id="sl-target" style="position:absolute; font-size:38px; opacity:0; z-index:103; filter: drop-shadow(0 0 10px rgba(255,255,255,0.4));">👻</div>
                                    <div id="sl-handle" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:40px; z-index:110; cursor:grab; filter: drop-shadow(0 0 5px #fff);">🔦</div>`);

    const bg = document.getElementById('sl-bg');
    const target = document.getElementById('sl-target');
    const gaugeFill = document.getElementById('sl-gauge');
    const handle = document.getElementById('sl-handle');

    let stage = 1;
    elements.score.textContent = `단계: 1/3`;
    let ghost = { x: 50, y: 50, vx: 1.2, vy: 1.2 };
    let light = { x: elements.container.offsetWidth / 2, y: elements.container.offsetHeight / 2 };
    let trackTime = 0;
    let isDragging = false;

    // 초기 조명 상태 설정
    if (bg) bg.style.background = `radial-gradient(circle at ${light.x}px ${light.y}px, transparent 0px, transparent 35px, rgba(0,0,0,0.6) 55px, rgba(0,0,0,0.9) 110px, #000 130px)`;

    const startDrag = (e) => {
        if (!isAlive()) return;
        isDragging = true;
        if (handle) handle.style.cursor = 'grabbing';
    };

    const moveLight = (e) => {
        if (!isAlive() || !isDragging) return;
        e.preventDefault();
        light = getEventPos(e, elements.container);
        if (bg) bg.style.background = `radial-gradient(circle at ${light.x}px ${light.y}px, transparent 0px, transparent 35px, rgba(0,0,0,0.6) 55px, rgba(0,0,0,0.9) 110px, #000 130px)`;
        if (handle) {
            handle.style.left = light.x + 'px';
            handle.style.top = light.y + 'px';
        }
    };

    const endDrag = () => {
        isDragging = false;
        if (handle) handle.style.cursor = 'grab';
    };

    handle.onmousedown = handle.ontouchstart = startDrag;
    window.addEventListener('mousemove', moveLight);
    window.addEventListener('touchmove', moveLight, { passive: false });
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchend', endDrag);

    let lastTime = performance.now();
    const loop = (now) => {
        if (!isAlive()) {
            window.removeEventListener('mousemove', moveLight);
            window.removeEventListener('touchmove', moveLight);
            window.removeEventListener('mouseup', endDrag);
            window.removeEventListener('touchend', endDrag);
            return;
        }
        const dt = now - lastTime;
        lastTime = now;

        ghost.x += ghost.vx;
        ghost.y += ghost.vy;

        if (ghost.x <= 10 || ghost.x >= elements.container.offsetWidth - 45) { ghost.vx *= -1; ghost.x = Math.max(11, Math.min(elements.container.offsetWidth - 46, ghost.x)); }
        if (ghost.y <= 10 || ghost.y >= elements.container.offsetHeight - 45) { ghost.vy *= -1; ghost.y = Math.max(11, Math.min(elements.container.offsetHeight - 46, ghost.y)); }

        target.style.left = ghost.x + 'px';
        target.style.top = ghost.y + 'px';

        const dist = Math.hypot(light.x - (ghost.x + 19), light.y - (ghost.y + 19));

        if (dist < 100) {
            target.style.opacity = dist < 45 ? '1' : '0.3';
            if (dist < 45) {
                trackTime += dt;
                if (Math.random() < 0.15) createParticles(ghost.x + 19, ghost.y + 19, 1, '✨');
                if (trackTime % 150 < 30) navigator.vibrate?.(20);
            } else { trackTime = Math.max(0, trackTime - dt * 1.5); }
        } else {
            target.style.opacity = '0';
            trackTime = Math.max(0, trackTime - dt * 2.5);
        }

        const percent = Math.min(100, (trackTime / 1000) * 100);
        if (gaugeFill) gaugeFill.style.width = percent + '%';

        if (percent >= 100) {
            elements.container.classList.add('flash-success');
            setTimeout(() => { if (isAlive()) elements.container.classList.remove('flash-success'); }, 500);
            haptic('item');

            if (stage >= 3) { win(); return; }
            else {
                stage++;
                elements.score.textContent = `단계: ${stage}/3`;
                trackTime = 0;
                ghost.vx = (Math.random() > 0.5 ? 1 : -1) * (1.2 + stage * 0.6);
                ghost.vy = (Math.random() > 0.5 ? 1 : -1) * (1.2 + stage * 0.6);
                createParticles(ghost.x + 19, ghost.y + 19, 10, '🌟');
            }
        }
        mgAnimFrame = requestAnimationFrame(loop);
    };
    mgAnimFrame = requestAnimationFrame(loop);

    let timeLeft = 20.0;
    mgInterval = setInterval(() => {
        if (!isAlive()) { clearInterval(mgInterval); return; }
        timeLeft -= 0.1;
        elements.timer.textContent = `${timeLeft.toFixed(1)}s`;
        if (timeLeft <= 0) {
            clearInterval(mgInterval);
            lose();
        }
    }, 100);
}

// ── 5. 보물 원석 미션 (Treasure Gem) ──
function playMash(win, lose, myId) {
    const isAlive = () => currentMgId === myId && document.getElementById('m-gem');
    elements.title.textContent = "보물 원석 미션";
    if (elements.desc) elements.desc.textContent = "바위를 연타해 부수세요!";
    elements.container.insertAdjacentHTML('beforeend', `<div class="track-gauge-bg"><div id="m-hp" class="track-gauge-fill" style="background: linear-gradient(90deg, #ef4444, #f4a940); width:100%;"></div></div>
                                    <div class="dust-layer" id="m-dust"></div>
                                    <div class="shake-msg" id="m-msg">📱 스마트폰을 마구 흔들어<br>먼지를 터세요!</div>
                                    <div class="rock-wrap" id="m-wrap">
                                        <div id="m-gem" class="mash-gem">💎</div>
                                        <div id="m-rock" class="mash-rock">🪨</div>
                                    </div>`);

    let hp = 100;
    let shakeHp = 100;
    let phase = 1;
    let timeLeft = 15.0;
    let rockStage = 1;

    const hpBar = document.getElementById('m-hp');
    const rockWrap = document.getElementById('m-wrap');
    const rock = document.getElementById('m-rock');
    const gem = document.getElementById('m-gem');
    const dustLayer = document.getElementById('m-dust');
    const msg = document.getElementById('m-msg');

    if (gem) {
        gem.style.filter = `grayscale(100%) brightness(0.3) blur(3px)`;
        gem.style.transform = `translate(-50%, -50%) scale(0.8)`;
    }

    if (rockWrap) {
        rockWrap.onmousedown = rockWrap.ontouchstart = (e) => {
            if (!isAlive() || phase !== 1) return;
            e.preventDefault();

            const prevHp = hp;
            hp -= 4.0;
            if (hpBar) hpBar.style.width = Math.max(0, hp) + '%';
            createParticles(getEventPos(e, elements.container).x, getEventPos(e, elements.container).y, 3, ['🪨', '▫️']);
            haptic('click');

            if (rock) rock.style.transform = `translate(-50%, -50%) rotate(${Math.random() * 15 - 7.5}deg) scale(${0.8 + (hp / 100) * 0.2})`;

            if (prevHp > 70 && hp <= 70 && rockStage === 1) {
                rockStage = 2;
                if (rock) rock.style.clipPath = 'polygon(15% 5%, 100% 10%, 85% 90%, 5% 100%)';
                createParticles(elements.container.offsetWidth / 2, elements.container.offsetHeight / 2, 15, '🪨');
                navigator.vibrate?.([100, 50, 100]);
                elements.container.classList.add('mg-shake');
                setTimeout(() => { if (isAlive()) elements.container.classList.remove('mg-shake'); }, 400);
            } else if (prevHp > 30 && hp <= 30 && rockStage === 2) {
                rockStage = 3;
                if (rock) rock.style.clipPath = 'polygon(25% 25%, 75% 20%, 80% 80%, 20% 75%)';
                createParticles(elements.container.offsetWidth / 2, elements.container.offsetHeight / 2, 20, '🪨');
                navigator.vibrate?.([150, 60, 150]);
                elements.container.classList.add('mg-shake');
                setTimeout(() => { if (isAlive()) elements.container.classList.remove('mg-shake'); }, 500);
            }

            if (hp <= 0) {
                phase = 2;
                if (rock) rock.style.display = 'none';
                if (dustLayer) dustLayer.style.opacity = '1';
                if (msg) msg.style.display = 'block';
                if (elements.desc) elements.desc.textContent = "먼지를 마구 흔들어 터세요!";
                if (hpBar) {
                    hpBar.style.width = '100%';
                    hpBar.style.background = '#a9a9a9';
                }
                elements.container.classList.add('flash-success');
                setTimeout(() => { if (isAlive()) elements.container.classList.remove('flash-success'); }, 500);
                haptic('item');
            }
        };
    }

    let lastX = 0, lastY = 0;
    const handleShake = () => {
        if (!isAlive() || phase !== 2) return;

        const prevShakeHp = shakeHp;
        shakeHp -= 2.5;
        if (hpBar) hpBar.style.width = Math.max(0, shakeHp) + '%';
        if (dustLayer) dustLayer.style.opacity = shakeHp / 100;

        if ((prevShakeHp > 70 && shakeHp <= 70) || (prevShakeHp > 30 && shakeHp <= 30)) {
            navigator.vibrate?.(80);
        }

        const gray = shakeHp;
        const bright = 0.3 + ((100 - shakeHp) / 100) * 1.2;
        const blur = (shakeHp / 100) * 3;
        const scale = 0.8 + ((100 - shakeHp) / 100) * 0.5;
        const glow = (100 - shakeHp) / 100 * 25;

        if (gem) {
            gem.style.filter = `grayscale(${gray}%) brightness(${bright}) blur(${blur}px) drop-shadow(0 0 ${glow}px #7ec8e3)`;
            gem.style.transform = `translate(-50%, -50%) scale(${scale})`;
        }

        if (Math.random() < 0.2) createParticles(elements.container.offsetWidth / 2 + (Math.random() * 40 - 20), elements.container.offsetHeight / 2, 1, '💨');
        if (Math.random() < 0.1 && shakeHp < 50) createParticles(elements.container.offsetWidth / 2, elements.container.offsetHeight / 2, 1, '✨');

        if (shakeHp <= 0) {
            phase = 3;
            dustLayer.style.display = 'none';
            msg.style.display = 'none';
            gem.style.filter = 'drop-shadow(0 0 30px #7ec8e3) brightness(1.5)';
            createParticles(elements.container.offsetWidth / 2, elements.container.offsetHeight / 2, 25, ['💎', '✨', '🌟']);
            win();
        }
    };

    window.ondevicemotion = (e) => {
        if (!isAlive() || phase !== 2 || !e.accelerationIncludingGravity) return;
        const acc = e.accelerationIncludingGravity;
        const deltaX = Math.abs((acc.x || 0) - lastX);
        const deltaY = Math.abs((acc.y || 0) - lastY);
        if (deltaX + deltaY > 15) handleShake();
        lastX = acc.x || 0; lastY = acc.y || 0;
    };

    elements.container.onmousemove = elements.container.ontouchmove = (e) => {
        if (isAlive() && phase === 2 && (e.buttons > 0 || e.touches)) handleShake();
    };

    mgInterval = setInterval(() => {
        if (!isAlive()) { clearInterval(mgInterval); return; }
        if (phase === 3) return;
        timeLeft -= 0.1;
        elements.timer.textContent = `${timeLeft.toFixed(1)}s`;
        if (timeLeft <= 0) {
            clearInterval(mgInterval);
            lose();
        }
    }, 100);
}
