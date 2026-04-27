/**
 * Premium Mini-Game Engine for Art Valley Treasure Hunt
 */

let mgInterval, mgTimeout, mgAnimFrame;
let currentGameType = '';
let currentItemCode = '';
let lives = 3;

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
    for(let i=0; i<count; i++) {
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
    if(lives <= 0) setTimeout(loseCb, 400);
}

// ── Main Entry Point ──
function openMiniGame(type, code) {
    if (!elements.modal) initGameElements();
    
    currentGameType = type;
    currentItemCode = code;
    elements.modal.classList.add('active');
    
    resetGameUI(); 
    window.ondevicemotion = null; 

    // Show Intro Guide first
    // showIntroGuide(type);
    startMiniGameLogic(); // Start game immediately
}

function showIntroGuide(type) {
    elements.intro.style.display = 'flex';
    
    let guide = "";
    let icon = "🎮";
    
    switch(type) {
        case 'key':
            icon = "🔑";
            guide = "움직이는 바늘이 초록색 영역에 왔을 때<br>화면을 터치하세요! (3번 성공)";
            break;
        case 'bag':
            icon = "🎒";
            guide = "가방을 좌우로 움직여 떨어지는 도구를<br>10개 잡으세요! 💣폭탄은 피하세요.";
            break;
        case 'map':
            icon = "🗺️";
            guide = "지도의 조각들이 반짝이는 순서를<br>잘 기억했다가 그대로 따라 누르세요!";
            break;
        case 'lantern':
            icon = "🔦";
            guide = "손전등을 움직여 숨어있는 유령을 찾아<br>빛의 중심에 1초간 고정시키세요!";
            break;
        case 'gem':
            icon = "💎";
            guide = "1단계: 바위를 연타해 부수세요!<br>2단계: 스마트폰을 흔들어 먼지를 터세요!";
            break;
    }
    
    elements.introIcon.textContent = icon;
    elements.introGuide.innerHTML = guide;
}

function startMiniGameLogic() {
    elements.intro.style.display = 'none';
    haptic('click');

    const onWin = () => finishMiniGame('✨ 성공!', '#4ade80', true);
    const onLose = () => finishMiniGame('💦 실패', '#ef4444', false);

    // Map item IDs to game types
    switch(currentGameType) {
        case 'key':     playLockpick(onWin, onLose); break;
        case 'bag':     playCatch(onWin, onLose); break;
        case 'map':     playSimon(onWin, onLose); break;
        case 'lantern': playSpotlight(onWin, onLose); break;
        case 'gem':     playMash(onWin, onLose); break;
        default:        playLockpick(onWin, onLose);
    }
}

function retryMiniGame() { 
    openMiniGame(currentGameType, currentItemCode); 
}

function resetGameUI() {
    clearInterval(mgInterval); 
    clearTimeout(mgTimeout); 
    cancelAnimationFrame(mgAnimFrame);
    
    // Clear game-specific elements (excluding result overlay)
    Array.from(elements.container.children).forEach(child => { 
        if(child.id !== 'mg-result') child.remove(); 
    });
    
    elements.resultOverlay.style.display = 'none';
    if (elements.intro) elements.intro.style.display = 'none';
    elements.container.classList.remove('mg-shake'); 
    elements.container.classList.remove('flash-success');
    elements.container.style.pointerEvents = 'auto';
    elements.score.textContent = ''; 
    elements.timer.textContent = ''; 
    elements.lives.textContent = '';
    lives = 3; 
}

function closeMiniGame() {
    resetGameUI(); 
    window.ondevicemotion = null;
    elements.modal.classList.remove('active');
    // Global flag from app logic
    if (typeof isProcessing !== 'undefined') isProcessing = false;
}

function finishMiniGame(msg, color, isWin) {
    if(isWin) {
        elements.container.style.pointerEvents = 'none';
        elements.resultOverlay.style.display = 'flex';
        elements.resultText.textContent = msg; 
        elements.resultText.style.color = color;
        elements.retryBtn.style.display = 'none';
        
        createParticles(elements.container.offsetWidth/2, elements.container.offsetHeight/2, 20, ['✨','🌟','🎉']);
        
        // Trigger core app logic to save and show success
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
        elements.retryBtn.style.display = 'block';
    }
}

// ── 1. 타이밍 락픽 (Golden Key) ──
function playLockpick(win, lose) {
    elements.title.textContent = "타이밍 락픽"; 
    if (elements.desc) elements.desc.textContent = "초록색 안전 영역에서 탭하세요! (3번)";
    elements.container.innerHTML += `<div style="position:absolute; bottom:50px; width:100%;"><div class="lock-bar"><div id="lp-safe" class="lock-safe"></div><div id="lp-needle" class="lock-needle"></div></div></div>`;
    updateLives(); 
    let successCount = 0; 
    elements.score.textContent = `성공: 0/3`;

    elements.container.onmousedown = elements.container.ontouchstart = (e) => {
        e.preventDefault();
        const needle = document.getElementById('lp-needle').getBoundingClientRect();
        const safe = document.getElementById('lp-safe').getBoundingClientRect();
        
        if (needle.left + needle.width/2 >= safe.left && needle.left + needle.width/2 <= safe.right) {
            successCount++; 
            elements.score.textContent = `성공: ${successCount}/3`;
            createParticles(getEventPos(e, elements.container).x, getEventPos(e, elements.container).y, 5, '✨');
            haptic('click');
            
            elements.container.classList.add('flash-success');
            setTimeout(() => elements.container.classList.remove('flash-success'), 400);

            if (successCount >= 3) win();
            else {
                const safeEl = document.getElementById('lp-safe');
                safeEl.style.width = (20 - successCount*4) + '%';
                safeEl.style.left = Math.random() * 60 + 10 + '%';
                document.getElementById('lp-needle').style.animationDuration = (1.2 - successCount*0.25) + 's';
            }
        } else { takeDamage(lose); }
    };
}

// ── 2. 탐험 도구 캐치 (Explorer Bag) ──
function playCatch(win, lose) {
    elements.title.textContent = "탐험 도구 캐치"; 
    if (elements.desc) elements.desc.textContent = "초록색 도구를 10개 담으세요! 💣피하기";
    elements.container.innerHTML += `<div id="c-player" style="position:absolute; bottom:10px; left:50%; transform:translateX(-50%); font-size:45px; z-index:10;">🎒</div>`;
    updateLives(); 
    let score = 0; 
    let items = []; 
    const player = document.getElementById('c-player');
    const toolEmojis = ['🧭', '🗺️', '💧', '🔦']; 
    elements.score.textContent = `캐치: 0/10`;

    const moveHandler = (e) => {
        e.preventDefault();
        const pos = getEventPos(e, elements.container);
        player.style.left = Math.max(25, Math.min(elements.container.offsetWidth - 25, pos.x)) + 'px';
    };
    elements.container.addEventListener('mousemove', moveHandler); 
    elements.container.addEventListener('touchmove', moveHandler, {passive:false});

    let speed = 3.5;
    mgInterval = setInterval(() => {
        if (Math.random() < 0.12) {
            let el = document.createElement('div');
            const isBomb = Math.random() > 0.75;
            el.textContent = isBomb ? '💣' : toolEmojis[Math.floor(Math.random() * toolEmojis.length)];
            el.dataset.type = isBomb ? 'bomb' : 'tool';
            el.className = isBomb ? 'item-bad' : 'item-good';
            el.style.cssText += `position:absolute; top:-40px; left:${Math.random()*80 + 10}%; font-size:24px; z-index:5;`;
            elements.container.appendChild(el); 
            items.push({el: el, y: -40});
        }
        
        items.forEach((obj, i) => {
            obj.y += speed; 
            obj.el.style.top = obj.y + 'px';
            const pRect = player.getBoundingClientRect(); 
            const eRect = obj.el.getBoundingClientRect();
            
            if (eRect.bottom > pRect.top+10 && eRect.left < pRect.right-10 && eRect.right > pRect.left+10) {
                const hitX = obj.el.offsetLeft + 15; 
                const hitY = obj.el.offsetTop + 15;
                if (obj.el.dataset.type === 'bomb') {
                    createParticles(hitX, hitY, 15, ['💥','🔥']); 
                    takeDamage(lose);
                } else {
                    score++; 
                    elements.score.textContent = `캐치: ${score}/10`;
                    createParticles(hitX, hitY, 3, '✨'); 
                    speed += 0.1; 
                    haptic('click');
                }
                obj.el.remove(); 
                items.splice(i, 1);
                if (score >= 10 && lives > 0) win();
            } else if (obj.y > 300) { 
                obj.el.remove(); 
                items.splice(i, 1); 
            }
        });
    }, 30);
}

// ── 3. 기억의 지도 (Treasure Map) ──
function playSimon(win, lose) {
    elements.title.textContent = "기억의 지도"; 
    if (elements.desc) elements.desc.textContent = "반짝이는 조각 순서를 기억하세요! (4회)";
    let html = '<div class="simon-grid" id="s-grid">';
    for(let i=0; i<9; i++) html += `<div class="simon-btn" data-id="${i}"></div>`;
    elements.container.innerHTML += html + '</div><div id="s-msg" class="simon-turn-msg"></div>';
    updateLives();
    
    let sequence = []; 
    let playerStep = 0;
    const btns = elements.container.querySelectorAll('.simon-btn');
    const grid = document.getElementById('s-grid');
    const turnMsg = document.getElementById('s-msg');
    
    const showSequence = () => {
        playerStep = 0; 
        let step = 0; 
        elements.container.style.pointerEvents = 'none';
        grid.style.filter = 'brightness(0.5)';
        turnMsg.textContent = "👀 외우세요!";
        turnMsg.style.opacity = '1';

        mgInterval = setInterval(() => {
            if(step > 0) btns[sequence[step-1]].classList.remove('active');
            if(step < sequence.length) {
                if(step === 0) turnMsg.style.opacity = '0';
                btns[sequence[step]].classList.add('active'); 
                step++;
                haptic('click');
            } else {
                clearInterval(mgInterval); 
                elements.container.style.pointerEvents = 'auto';
                grid.style.filter = 'brightness(1)';
                turnMsg.textContent = "👇 따라하세요!";
                turnMsg.style.opacity = '1';
                setTimeout(() => turnMsg.style.opacity = '0', 800);
            }
        }, 600);
    };

    const nextRound = () => {
        sequence.push(Math.floor(Math.random() * 9));
        elements.score.textContent = `조각: ${sequence.length}/4`;
        showSequence();
    };

    btns.forEach(btn => {
        btn.onmousedown = btn.ontouchstart = (e) => {
            e.preventDefault();
            const id = parseInt(btn.dataset.id);
            btn.classList.add('active');
            createParticles(getEventPos(e, elements.container).x, getEventPos(e, elements.container).y, 2, '✨');
            haptic('click');
            setTimeout(() => btn.classList.remove('active'), 200);
            
            if (id === sequence[playerStep]) {
                playerStep++;
                if (playerStep === sequence.length) {
                    if (sequence.length === 4) setTimeout(win, 500);
                    else {
                        elements.container.classList.add('flash-success');
                        setTimeout(() => elements.container.classList.remove('flash-success'), 500);
                        setTimeout(nextRound, 800);
                    }
                }
            } else {
                takeDamage(lose);
                if(lives > 0) setTimeout(showSequence, 800);
            }
        };
    });
    setTimeout(nextRound, 500);
}

// ── 4. 어둠 속 추적 (Explorer Lantern) ──
function playSpotlight(win, lose) {
    elements.title.textContent = "어둠 속 추적"; 
    if (elements.desc) elements.desc.textContent = "손전등 중심에 유령을 1초간 맞추세요!";
    elements.container.innerHTML += `<div class="track-gauge-bg"><div id="sl-gauge" class="track-gauge-fill"></div></div>
                                    <div id="sl-bg" style="width:100%; height:100%; background: #000;"></div>
                                    <div id="sl-target" style="position:absolute; font-size:35px; opacity:0; z-index:103;">👻</div>`;
    const bg = document.getElementById('sl-bg'); 
    const target = document.getElementById('sl-target'); 
    const gaugeFill = document.getElementById('sl-gauge');
    
    let stage = 1; 
    elements.score.textContent = `단계: 1/3`;
    let ghost = { x: 50, y: 50, vx: 1.0, vy: 1.0 }; 
    let light = { x: -100, y: -100 }; 
    let trackTime = 0; 

    const moveLight = (e) => {
        e.preventDefault(); 
        light = getEventPos(e, elements.container);
        bg.style.background = `radial-gradient(circle at ${light.x}px ${light.y}px, transparent 0px, transparent 35px, rgba(0,0,0,0.6) 50px, rgba(0,0,0,0.85) 100px, #000 120px, #000 100%)`;
    };
    elements.container.addEventListener('mousemove', moveLight); 
    elements.container.addEventListener('touchmove', moveLight, {passive:false});

    let lastTime = performance.now();
    const loop = (now) => {
        const dt = now - lastTime; 
        lastTime = now;
        ghost.x += ghost.vx; 
        ghost.y += ghost.vy;
        
        if(ghost.x <= 20 || ghost.x >= elements.container.offsetWidth - 40) ghost.vx *= -1;
        if(ghost.y <= 20 || ghost.y >= elements.container.offsetHeight - 40) ghost.vy *= -1;
        
        target.style.left = ghost.x + 'px'; 
        target.style.top = ghost.y + 'px';
        const dist = Math.hypot(light.x - (ghost.x+17), light.y - (ghost.y+17));
        
        if(dist < 100) { 
            target.style.opacity = dist < 45 ? '1' : '0.4';
            if(dist < 45) { 
                trackTime += dt;
                if(Math.random() < 0.1) createParticles(ghost.x+17, ghost.y+17, 1, '✨');
                if(trackTime % 200 < 20) haptic('click');
            } else { trackTime = Math.max(0, trackTime - dt * 2); }
        } else { target.style.opacity = '0'; trackTime = Math.max(0, trackTime - dt * 2); }

        const percent = Math.min(100, (trackTime / 1000) * 100);
        gaugeFill.style.width = percent + '%';

        if(percent >= 100) {
            elements.container.classList.add('flash-success');
            setTimeout(() => elements.container.classList.remove('flash-success'), 500);

            if(stage >= 3) { win(); return; } 
            else {
                stage++; 
                elements.score.textContent = `단계: ${stage}/3`; 
                trackTime = 0;
                ghost.vx = (Math.random() > 0.5 ? 1 : -1) * (1.0 + stage * 0.5);
                ghost.vy = (Math.random() > 0.5 ? 1 : -1) * (1.0 + stage * 0.5);
                createParticles(ghost.x+17, ghost.y+17, 10, '🌟');
            }
        }
        mgAnimFrame = requestAnimationFrame(loop);
    };
    mgAnimFrame = requestAnimationFrame(loop);
    
    let timeLeft = 20.0;
    mgInterval = setInterval(() => {
        timeLeft -= 0.1; 
        elements.timer.textContent = `${timeLeft.toFixed(1)}s`;
        if(timeLeft <= 0) { cancelAnimationFrame(mgAnimFrame); lose(); }
    }, 100);
}

// ── 5. 바위 깎고 털기 (Treasure Gem) ──
function playMash(win, lose) {
    elements.title.textContent = "바위 깎고 털기!"; 
    if (elements.desc) elements.desc.textContent = "1단계: 바위를 연타해 부수세요!";
    elements.container.innerHTML += `<div class="track-gauge-bg"><div id="m-hp" class="track-gauge-fill" style="background: linear-gradient(90deg, #ef4444, #f4a940); width:100%;"></div></div>
                                    <div class="dust-layer" id="m-dust"></div>
                                    <div class="shake-msg" id="m-msg">📱 스마트폰을 마구 흔들어<br>먼지를 터세요!</div>
                                    <div class="rock-wrap" id="m-wrap">
                                        <div id="m-gem" class="mash-gem">💎</div>
                                        <div id="m-rock" class="mash-rock">🪨</div>
                                    </div>`;
    
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
    
    gem.style.filter = `grayscale(100%) brightness(0.3) blur(3px)`;
    gem.style.transform = `translate(-50%, -50%) scale(0.8)`;
    
    rockWrap.onmousedown = rockWrap.ontouchstart = (e) => {
        if(phase !== 1) return;
        e.preventDefault(); 
        hp -= 4.0; 
        hpBar.style.width = Math.max(0, hp) + '%';
        createParticles(getEventPos(e, elements.container).x, getEventPos(e, elements.container).y, 3, ['🪨', '▫️']);
        haptic('click');
        
        rock.style.transform = `translate(-50%, -50%) rotate(${Math.random()*15 - 7.5}deg) scale(${0.8 + (hp/100)*0.2})`;
        
        if (hp <= 70 && rockStage === 1) {
            rockStage = 2;
            rock.style.clipPath = 'polygon(15% 5%, 100% 10%, 85% 90%, 5% 100%)';
            createParticles(elements.container.offsetWidth/2, elements.container.offsetHeight/2, 10, '🪨');
        } else if (hp <= 35 && rockStage === 2) {
            rockStage = 3;
            rock.style.clipPath = 'polygon(25% 25%, 75% 20%, 80% 80%, 20% 75%)';
            createParticles(elements.container.offsetWidth/2, elements.container.offsetHeight/2, 15, '🪨');
        }

        if (hp <= 0) {
            phase = 2; 
            rock.style.display = 'none';
            dustLayer.style.opacity = '1'; 
            msg.style.display = 'block';
            if (elements.desc) elements.desc.textContent = "2단계: 흔들거나 화면을 문지르세요!";
            hpBar.style.width = '100%'; 
            hpBar.style.background = '#a9a9a9';
            
            elements.container.classList.add('flash-success');
            setTimeout(() => elements.container.classList.remove('flash-success'), 500);
        }
    };

    let lastX = 0, lastY = 0;
    const handleShake = () => {
        if(phase !== 2) return;
        shakeHp -= 2.5; 
        hpBar.style.width = Math.max(0, shakeHp) + '%';
        dustLayer.style.opacity = shakeHp / 100;
        
        const gray = shakeHp; 
        const bright = 0.3 + ((100 - shakeHp) / 100) * 1.2; 
        const blur = (shakeHp / 100) * 3; 
        const scale = 0.8 + ((100 - shakeHp) / 100) * 0.5; 
        const glow = (100 - shakeHp) / 100 * 25; 
        
        gem.style.filter = `grayscale(${gray}%) brightness(${bright}) blur(${blur}px) drop-shadow(0 0 ${glow}px #7ec8e3)`;
        gem.style.transform = `translate(-50%, -50%) scale(${scale})`;
        
        if(Math.random() < 0.2) createParticles(elements.container.offsetWidth/2 + (Math.random()*40-20), elements.container.offsetHeight/2, 1, '💨');
        if(Math.random() < 0.1 && shakeHp < 50) createParticles(elements.container.offsetWidth/2, elements.container.offsetHeight/2, 1, '✨');
        
        if(shakeHp <= 0) {
            phase = 3; 
            dustLayer.style.display = 'none'; 
            msg.style.display = 'none';
            gem.style.filter = 'drop-shadow(0 0 30px #7ec8e3) brightness(1.5)';
            createParticles(elements.container.offsetWidth/2, elements.container.offsetHeight/2, 20, ['💎', '✨', '🌟']);
            win();
        }
    };

    window.ondevicemotion = (e) => {
        if(phase !== 2 || !e.accelerationIncludingGravity) return;
        const acc = e.accelerationIncludingGravity;
        const deltaX = Math.abs((acc.x || 0) - lastX); 
        const deltaY = Math.abs((acc.y || 0) - lastY);
        if(deltaX + deltaY > 15) handleShake(); 
        lastX = acc.x || 0; lastY = acc.y || 0;
    };

    elements.container.onmousemove = elements.container.ontouchmove = (e) => {
        if(phase === 2 && (e.buttons > 0 || e.touches)) handleShake();
    };

    mgInterval = setInterval(() => {
        if(phase === 3) return;
        timeLeft -= 0.1; 
        elements.timer.textContent = `${timeLeft.toFixed(1)}s`;
        if (timeLeft <= 0) lose();
    }, 100);
}
