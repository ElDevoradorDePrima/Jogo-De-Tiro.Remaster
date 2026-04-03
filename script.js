const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth; canvas.height = window.innerHeight;

const universo = new SistemaEstelar(canvas.width, canvas.height);
const sistemaNivel = new SistemaNivel(); 

const initPlayer = () => ({
    x: canvas.width / 2, y: canvas.height / 2,
    radius: 18, baseColor: '#00d2ff', speed: 5,
    hp: 100, maxHp: 100, kills: 0, 
    isDashing: false, shieldTime: 0, vortexTime: 0,
    history: [] 
});

let player = initPlayer();
const mouse = { x: 0, y: 0 };

// --- HABILIDADES & DESBLOQUEIOS ---
const cooldowns = {
    q:     { id: 'skill-q',     lastUsed: 0, duration: 400,   unlock: 1 },
    space: { id: 'skill-space', lastUsed: 0, duration: 3000,  unlock: 1 },
    e:     { id: 'skill-e',     lastUsed: 0, duration: 5000,  unlock: 2 },
    shift: { id: 'skill-shift', lastUsed: 0, duration: 10000, unlock: 3 },
    f:     { id: 'skill-f',     lastUsed: 0, duration: 8000,  unlock: 4 },  
    t:     { id: 'skill-t',     lastUsed: 0, duration: 12000, unlock: 5 },
    g:     { id: 'skill-g',     lastUsed: 0, duration: 15000, unlock: 6 }, 
    c:     { id: 'skill-c',     lastUsed: 0, duration: 20000, unlock: 7 },
    z:     { id: 'skill-z',     lastUsed: 0, duration: 6000,  unlock: 8 }, 
    x:     { id: 'skill-x',     lastUsed: 0, duration: 10000, unlock: 9 }  
};

const keys = {};
let enemies = []; let bullets = []; let particles = []; let homingMissiles = [];
let blackHoles = []; let orbitalStrikes = []; let floatingTexts = []; let shockwaves = [];
let screenShakeTime = 0; let timeScale = 1.0; let slowMotionTimer = 0;
let combo = 0; let comboTimer = 0; let isFrenzy = false;

// --- NOVAS VARIÁVEIS DE EFEITO ---
let screenFlash = 0; 
let flashColor = 'white';
let lastFrenzyState = false;

function getMultDano() {
    let baseMultiplier = 1 + (sistemaNivel.nivel * 0.15); 
    return isFrenzy ? baseMultiplier * 2.5 : baseMultiplier; 
}

// --- ÁUDIO ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let bgmStarted = false;

function start8BitBGM() {
    if (bgmStarted || audioCtx.state === 'suspended') return;
    bgmStarted = true;
    const notes = [130.81, 155.56, 174.61, 196.00, 174.61, 155.56];
    let noteIndex = 0;

    setInterval(() => {
        if (player.hp <= 0) return;
        const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
        osc.type = 'square';
        let baseFreq = notes[noteIndex] + (sistemaNivel.nivel * 5);
        let freq = isFrenzy ? baseFreq * 1.5 : baseFreq; 
        
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
        noteIndex = (noteIndex + 1) % notes.length;
    }, 150 - Math.min(50, sistemaNivel.nivel * 2));
}

function initAudio() { if (audioCtx.state === 'suspended') audioCtx.resume(); start8BitBGM(); }

function playSound(type) {
    if (audioCtx.state === 'suspended') return;
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination); const now = audioCtx.currentTime;

    switch(type) {
        case 'q': osc.type = 'square'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(300, now + 0.1); gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1); osc.start(now); osc.stop(now + 0.1); break;
        case 'e': osc.type = 'square'; osc.frequency.setValueAtTime(100, now); osc.frequency.exponentialRampToValueAtTime(20, now + 0.3); gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.3); osc.start(now); osc.stop(now + 0.3); break;
        case 'space': osc.type = 'triangle'; osc.frequency.setValueAtTime(300, now); osc.frequency.linearRampToValueAtTime(800, now + 0.15); gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.15); osc.start(now); osc.stop(now + 0.15); break;
        case 'shift': osc.type = 'square'; osc.frequency.setValueAtTime(400, now); osc.frequency.setValueAtTime(600, now + 0.1); osc.frequency.setValueAtTime(800, now + 0.2); gain.gain.setValueAtTime(0.05, now); gain.gain.linearRampToValueAtTime(0, now + 0.3); osc.start(now); osc.stop(now + 0.3); break;
        case 't': osc.type = 'triangle'; osc.frequency.setValueAtTime(600, now); osc.frequency.linearRampToValueAtTime(200, now + 0.4); gain.gain.setValueAtTime(0.08, now); gain.gain.linearRampToValueAtTime(0, now + 0.4); osc.start(now); osc.stop(now + 0.4); break;
        case 'f': osc.type = 'square'; osc.frequency.setValueAtTime(1500, now); osc.frequency.exponentialRampToValueAtTime(50, now + 0.6); gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.6); osc.start(now); osc.stop(now + 0.6); break;
        case 'g': osc.type = 'triangle'; osc.frequency.setValueAtTime(150, now); osc.frequency.linearRampToValueAtTime(30, now + 1); gain.gain.setValueAtTime(0.15, now); gain.gain.linearRampToValueAtTime(0, now + 1.5); osc.start(now); osc.stop(now + 1.5); break;
        case 'c': osc.type = 'square'; osc.frequency.setValueAtTime(800, now); osc.frequency.setValueAtTime(1200, now + 0.1); gain.gain.setValueAtTime(0.05, now); gain.gain.linearRampToValueAtTime(0, now + 0.3); osc.start(now); osc.stop(now + 0.3); break;
        case 'z': osc.type = 'sawtooth'; osc.frequency.setValueAtTime(2000, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.2); gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.2); osc.start(now); osc.stop(now + 0.2); break;
        case 'x': osc.type = 'square'; osc.frequency.setValueAtTime(1000, now); osc.frequency.linearRampToValueAtTime(2000, now + 0.3); gain.gain.setValueAtTime(0.05, now); gain.gain.linearRampToValueAtTime(0, now + 0.3); osc.start(now); osc.stop(now + 0.3); break;
        case 'kill': osc.type = 'square'; osc.frequency.setValueAtTime(600, now); osc.frequency.setValueAtTime(900, now + 0.05); gain.gain.setValueAtTime(0.05, now); gain.gain.linearRampToValueAtTime(0, now + 0.1); osc.start(now); osc.stop(now + 0.1); break;
        case 'hurt': osc.type = 'square'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(40, now + 0.2); gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.2); osc.start(now); osc.stop(now + 0.2); break;
        case 'levelup': osc.type = 'square'; osc.frequency.setValueAtTime(400, now); osc.frequency.setValueAtTime(600, now+0.1); osc.frequency.setValueAtTime(800, now+0.2); osc.frequency.setValueAtTime(1200, now+0.3); gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.6); osc.start(now); osc.stop(now + 0.6); break;
    }
}

window.addEventListener('mousedown', initAudio, { once: true });
window.addEventListener('keydown', (e) => { initAudio(); keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });

function applyScreenShake() { if (screenShakeTime > 0) { ctx.translate(Math.random() * 10 - 5, Math.random() * 10 - 5); screenShakeTime--; } }

// --- CLASSES ---
class Shockwave { constructor(x, y, color, extraRadius=0) { this.x = x; this.y = y; this.radius = 10; this.maxRadius = 250 + extraRadius; this.color = color; this.life = 20; this.maxLife = 20; } update() { this.radius += 15 * timeScale; this.life -= 1 * timeScale; } draw() { ctx.save(); ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2); ctx.strokeStyle = this.color; ctx.lineWidth = (this.life / this.maxLife) * 10; ctx.globalAlpha = Math.max(0, this.life / this.maxLife); ctx.stroke(); ctx.restore(); } }
class FloatingText { constructor(x, y, text, color, size = 16) { this.x = x + (Math.random()*20-10); this.y = y + (Math.random()*20-10); this.text = text; this.color = color; this.life = 40; this.size = size; } update() { this.y -= 1.5 * timeScale; this.life -= 1 * timeScale; } draw() { ctx.save(); ctx.globalAlpha = Math.max(0, this.life / 40); ctx.fillStyle = this.color; ctx.font = `bold ${this.size}px sans-serif`; ctx.shadowBlur = 8; ctx.shadowColor = 'black'; ctx.textAlign = 'center'; ctx.fillText(this.text, this.x, this.y); ctx.restore(); } }
class OrbitalStrike { 
    constructor(x, y) { this.x = x; this.y = y; this.life = 90; this.radius = isFrenzy ? 250 : 150; this.exploded = false; }
    update() { 
        this.life -= 1 * timeScale; 
        if (this.life <= 30 && !this.exploded) { 
            this.exploded = true; screenShakeTime = 25; playSound('e'); createParticles(this.x, this.y, '#ff00ea', 60); shockwaves.push(new Shockwave(this.x, this.y, '#ff00ea', isFrenzy ? 100 : 0)); 
            enemies.forEach(en => { 
                if (Math.hypot(this.x - en.x, this.y - en.y) < this.radius) { 
                    en.hp -= 50 * getMultDano();
                    floatingTexts.push(new FloatingText(en.x, en.y, Math.floor(50 * getMultDano()), "#ff00ea", 22)); 
                } 
            }); 
        } 
    } 
    draw() { 
        if (this.life > 30) { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2); ctx.strokeStyle = `rgba(255, 0, 234, ${Math.abs(Math.sin(this.life/5))})`; ctx.lineWidth = 3; ctx.stroke(); } 
        else { ctx.fillStyle = `rgba(255, 0, 234, ${this.life/30})`; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2); ctx.fill(); } 
    } 
}
class Bullet { 
    constructor(x, y, targetX, targetY, isExplosion = false) { 
        this.x = x; this.y = y; 
        this.radius = isExplosion ? (isFrenzy ? 200 : 130) : 6; 
        this.color = isExplosion ? 'rgba(255, 150, 0, 0.6)' : (isFrenzy ? '#ffdd00' : '#fff'); 
        this.isExplosion = isExplosion; this.life = isExplosion ? 15 : 100; 
        const dist = Math.hypot(targetX - x, targetY - y); 
        this.vx = ((targetX - x) / dist) * 18; this.vy = ((targetY - y) / dist) * 18; 
    } 
    update() { if (!this.isExplosion) { this.x += this.vx * timeScale; this.y += this.vy * timeScale; } this.life -= 1 * timeScale; } 
    draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2); ctx.fillStyle = this.color; if(!this.isExplosion) { ctx.shadowBlur = 15; ctx.shadowColor = this.color; } ctx.fill(); ctx.shadowBlur = 0; } 
}
class BlackHole { 
    constructor(x, y) { this.x = x; this.y = y; this.radius = 5; this.maxRadius = 80; this.life = 300; } 
    update() { if (this.radius < this.maxRadius) this.radius += 2 * timeScale; this.life -= 1 * timeScale; } 
    draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2); ctx.fillStyle = '#050505'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = `rgba(138, 43, 226, ${Math.random() * 0.5 + 0.5})`; ctx.shadowBlur = 30; ctx.shadowColor = '#8a2be2'; ctx.stroke(); ctx.shadowBlur = 0; } 
}

// Míssil Teleguiado ATUALIZADO com RASTRO
class HomingMissile {
    constructor(x, y) {
        this.x = x; this.y = y; this.radius = 8;
        this.speed = 12; this.life = 150; this.target = null;
        this.trail = []; 
    }
    update() {
        this.life -= timeScale;
        this.trail.push({x: this.x, y: this.y});
        if (this.trail.length > 10) this.trail.shift();
        
        if (!this.target || this.target.hp <= 0) {
            let closestDist = Infinity;
            enemies.forEach(e => {
                let d = Math.hypot(e.x - this.x, e.y - this.y);
                if (d < closestDist) { closestDist = d; this.target = e; }
            });
        }
        
        if (this.target) {
            let dx = this.target.x - this.x; let dy = this.target.y - this.y;
            let dist = Math.hypot(dx, dy);
            this.x += (dx/dist) * this.speed * timeScale; 
            this.y += (dy/dist) * this.speed * timeScale;
            
            if (dist < this.target.radius + this.radius) {
                this.target.hp -= 40 * getMultDano();
                createParticles(this.x, this.y, '#ff5500', 20);
                shockwaves.push(new Shockwave(this.x, this.y, '#ffaa00', 50));
                screenFlash = 0.2; flashColor = 'orange';
                playSound('e');
                this.life = 0;
            }
        } else {
            this.y -= this.speed * timeScale; 
        }
    }
    draw() {
        this.trail.forEach((t, i) => {
            ctx.beginPath(); ctx.arc(t.x, t.y, this.radius * (i/this.trail.length), 0, Math.PI*2);
            ctx.fillStyle = `rgba(255, 255, 0, ${i/20})`; ctx.fill();
        });
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
        ctx.fillStyle = '#ffff00'; ctx.shadowBlur = 15; ctx.shadowColor = '#ffff00'; ctx.fill(); ctx.shadowBlur = 0;
    }
}

function createParticles(x, y, color, count) { for(let i=0; i<count; i++) particles.push({ x, y, vx: Math.random()*10-5, vy: Math.random()*10-5, life: 30, color }); }

class Enemy {
    constructor() {
        this.radius = 16;
        this.x = Math.random() < 0.5 ? -this.radius : canvas.width + this.radius;
        this.y = Math.random() * canvas.height;
        let lvlFactor = sistemaNivel.nivel;
        this.speed = 1.5 + (player.kills * 0.02) + (lvlFactor * 0.15);
        this.hp = 20 + (player.kills * 0.5) + (lvlFactor * 5);
        this.maxHp = this.hp;
    }
    update() {
        let dx = player.x - this.x; let dy = player.y - this.y;
        let dist = Math.hypot(dx, dy);
        let moveX = (dx / dist) * this.speed * timeScale; let moveY = (dy / dist) * this.speed * timeScale;

        blackHoles.forEach(bh => {
            let bhDist = Math.hypot(bh.x - this.x, bh.y - this.y);
            let pullForce = isFrenzy ? 8 : 5; 
            if (bhDist < 350) { moveX += ((bh.x - this.x) / bhDist) * pullForce * timeScale; moveY += ((bh.y - this.y) / bhDist) * pullForce * timeScale; }
            if (bhDist < bh.radius) { this.hp -= 3 * timeScale * getMultDano(); createParticles(this.x, this.y, 'purple', 2); }
        });

        this.x += moveX; this.y += moveY;

        if (dist < this.radius + player.radius) {
            if (player.shieldTime > 0) {
                this.x -= moveX * 20; this.y -= moveY * 20; 
                this.hp -= 15 * getMultDano();
                createParticles(this.x, this.y, '#00ffcc', 5);
                shockwaves.push(new Shockwave(player.x, player.y, 'rgba(0, 255, 204, 0.5)'));
            } else {
                player.hp -= 0.8 * timeScale; screenShakeTime = 4;
                if (Math.random() < 0.1) playSound('hurt'); 
            }
        }
    }
    draw() {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
        ctx.fillStyle = '#ff1133'; ctx.shadowBlur = 15; ctx.shadowColor = '#ff1133'; ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = 'white'; ctx.fillRect(this.x - 12, this.y - 25, 24 * (this.hp/this.maxHp), 4);
    }
}

function spawnEnemy() {
    let limit = 20 + (sistemaNivel.nivel * 5);
    if (player.hp > 0 && enemies.length < limit) enemies.push(new Enemy());
    let spawnRate = Math.max(250, 800 - (sistemaNivel.nivel * 40));
    setTimeout(spawnEnemy, isFrenzy ? Math.max(100, spawnRate/2) : spawnRate); 
}

function updateUI() {
    const now = Date.now();
    document.getElementById('hp-bar').style.width = Math.max(0, (player.hp / player.maxHp * 100)) + '%';
    document.getElementById('hp-text').innerText = `INTEGRIDADE DO NÚCLEO: ${Math.max(0, Math.floor(player.hp))}%`;
    document.getElementById('score').innerText = `Kills: ${player.kills}`;
    
    const comboEl = document.getElementById('combo-text');
    comboEl.innerText = `Combo: x${combo}`;
    if (isFrenzy) comboEl.classList.add('frenzy'); else comboEl.classList.remove('frenzy');

    Object.keys(cooldowns).forEach(key => {
        const skill = cooldowns[key]; const el = document.getElementById(skill.id);
        if (!el) return;
        if (sistemaNivel.nivel >= skill.unlock) {
            el.classList.remove('locked');
            if (now - skill.lastUsed > skill.duration) el.classList.add('ready'); else el.classList.remove('ready');
        } else {
            el.classList.add('locked'); el.classList.remove('ready');
        }
    });
}

function resetGame() {
    player = initPlayer(); enemies = []; bullets = []; particles = []; homingMissiles = []; blackHoles = []; 
    orbitalStrikes = []; floatingTexts = []; shockwaves = []; timeScale = 1; slowMotionTimer = 0; combo = 0; comboTimer = 0;
    sistemaNivel.resetar();
}

function dispararEfeitosLevelUp(lvl) {
    playSound('levelup'); player.maxHp += 20; player.hp = player.maxHp; 
    screenShakeTime = 25;
    screenFlash = 0.8; flashColor = 'white'; // Flash de Level Up
    slowMotionTimer = 40; // Pequeno slow no level up
    
    shockwaves.push(new Shockwave(player.x, player.y, '#00ffaa', 100));
    floatingTexts.push(new FloatingText(canvas.width/2, canvas.height/2 - 100, `LEVEL UP! NÍVEL ${lvl}`, "#00ffaa", 45));
    
    Object.keys(cooldowns).forEach(key => {
        if (cooldowns[key].unlock === lvl) floatingTexts.push(new FloatingText(canvas.width/2, canvas.height/2 - 40, `NOVA HABILIDADE DESBLOQUEADA!`, "#00d2ff", 30));
    });
}

function animate() {
    ctx.save();
    if (slowMotionTimer > 0) { timeScale = 0.25; slowMotionTimer--; } else { timeScale = 1.0; }

    if (comboTimer > 0) { comboTimer -= 1 * timeScale; isFrenzy = combo >= 10; } 
    else { combo = 0; isFrenzy = false; }

    // DETECÇÃO DE INÍCIO DE FRENZY
    if (isFrenzy && !lastFrenzyState) {
        screenFlash = 0.6; flashColor = 'gold'; screenShakeTime = 30;
        floatingTexts.push(new FloatingText(player.x, player.y - 60, "FRENZY ATIVADO!", "gold", 40));
    }
    lastFrenzyState = isFrenzy;

    universo.desenhar(ctx, canvas, player.x, player.y, timeScale);
    applyScreenShake();

    if (player.hp <= 0) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ff0044"; ctx.font = "bold 70px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("SISTEMA COMPROMETIDO", canvas.width/2, canvas.height/2);
        if (keys['r']) resetGame();
        ctx.restore(); requestAnimationFrame(animate); return;
    }

    const now = Date.now();
    let currentSpeed = player.speed + (isFrenzy ? 2 : 0);

    // CONTROLES DE HABILIDADES
    if (keys[' '] && sistemaNivel.nivel >= cooldowns.space.unlock && now - cooldowns.space.lastUsed > cooldowns.space.duration) {
        playSound('space'); player.isDashing = true; cooldowns.space.lastUsed = now; setTimeout(() => player.isDashing = false, 150); shockwaves.push(new Shockwave(player.x, player.y, 'rgba(0, 210, 255, 0.5)'));
    }
    if (keys['shift'] && sistemaNivel.nivel >= cooldowns.shift.unlock && now - cooldowns.shift.lastUsed > cooldowns.shift.duration) {
        playSound('shift'); player.shieldTime = 180; cooldowns.shift.lastUsed = now; shockwaves.push(new Shockwave(player.x, player.y, '#00ffcc'));
    }
    if (keys['t'] && sistemaNivel.nivel >= cooldowns.t.unlock && now - cooldowns.t.lastUsed > cooldowns.t.duration) {
        playSound('t'); player.vortexTime = 300; cooldowns.t.lastUsed = now; screenShakeTime = 10; floatingTexts.push(new FloatingText(player.x, player.y - 30, "VORTEX ATIVADO", "#ff5500", 20));
    }
    if (keys['f'] && sistemaNivel.nivel >= cooldowns.f.unlock && now - cooldowns.f.lastUsed > cooldowns.f.duration) { 
        playSound('f'); orbitalStrikes.push(new OrbitalStrike(mouse.x, mouse.y)); cooldowns.f.lastUsed = now;
    }
    if (keys['g'] && sistemaNivel.nivel >= cooldowns.g.unlock && now - cooldowns.g.lastUsed > cooldowns.g.duration) { 
        playSound('g'); blackHoles.push(new BlackHole(mouse.x, mouse.y)); cooldowns.g.lastUsed = now; screenShakeTime = 15;
    }
    if (keys['c'] && sistemaNivel.nivel >= cooldowns.c.unlock && now - cooldowns.c.lastUsed > cooldowns.c.duration) {
        playSound('c'); slowMotionTimer = 300; cooldowns.c.lastUsed = now; shockwaves.push(new Shockwave(player.x, player.y, '#00ffaa'));
    }
    if (keys['z'] && sistemaNivel.nivel >= cooldowns.z.unlock && now - cooldowns.z.lastUsed > cooldowns.z.duration) {
        playSound('z'); cooldowns.z.lastUsed = now; screenShakeTime = 10;
        let raioZ = isFrenzy ? 300 : 180; 
        shockwaves.push(new Shockwave(player.x, player.y, '#00d2ff', raioZ - 250));
        enemies.forEach(en => { if (Math.hypot(player.x - en.x, player.y - en.y) < raioZ) { en.hp -= 40 * getMultDano(); createParticles(en.x, en.y, '#00d2ff', 10); } });
    }
    if (keys['x'] && sistemaNivel.nivel >= cooldowns.x.unlock && now - cooldowns.x.lastUsed > cooldowns.x.duration) {
        playSound('x'); cooldowns.x.lastUsed = now;
        let qtdMisseis = isFrenzy ? 6 : 3; 
        for(let i=0; i<qtdMisseis; i++) { setTimeout(() => homingMissiles.push(new HomingMissile(player.x, player.y)), i * 150); }
    }

    if (player.isDashing) currentSpeed = player.speed * 5;
    if (player.shieldTime > 0) player.shieldTime--;
    if (player.vortexTime > 0) player.vortexTime -= 1 * timeScale;

    if (keys['w'] && player.y > player.radius) player.y -= currentSpeed;
    if (keys['s'] && player.y < canvas.height - player.radius) player.y += currentSpeed;
    if (keys['a'] && player.x > player.radius) player.x -= currentSpeed;
    if (keys['d'] && player.x < canvas.width - player.radius) player.x += currentSpeed;

    player.history.push({x: player.x, y: player.y});
    if (player.history.length > (isFrenzy ? 12 : 8)) player.history.shift();
    player.history.forEach((pos, i) => {
        ctx.beginPath(); ctx.arc(pos.x, pos.y, player.radius * (i/player.history.length), 0, Math.PI*2);
        ctx.fillStyle = isFrenzy ? `rgba(255, 150, 0, ${i/20})` : `rgba(0, 210, 255, ${i/20})`; ctx.fill();
    });

    if (keys['q'] && sistemaNivel.nivel >= cooldowns.q.unlock && now - cooldowns.q.lastUsed > (cooldowns.q.duration - (isFrenzy ? 200 : 0))) {
        playSound('q'); cooldowns.q.lastUsed = now;
        bullets.push(new Bullet(player.x, player.y, mouse.x, mouse.y)); 
        if (isFrenzy) { bullets.push(new Bullet(player.x, player.y, mouse.x + 80, mouse.y + 80)); bullets.push(new Bullet(player.x, player.y, mouse.x - 80, mouse.y - 80)); }
    }
    if (keys['e'] && sistemaNivel.nivel >= cooldowns.e.unlock && now - cooldowns.e.lastUsed > cooldowns.e.duration) {
        playSound('e'); bullets.push(new Bullet(player.x, player.y, player.x, player.y, true)); cooldowns.e.lastUsed = now; screenShakeTime = 15;
    }

    shockwaves.forEach((sw, i) => { sw.update(); sw.draw(); if (sw.life <= 0) shockwaves.splice(i, 1); });
    blackHoles.forEach((bh, i) => { bh.update(); bh.draw(); if (bh.life <= 0) { shockwaves.push(new Shockwave(bh.x, bh.y, '#8a2be2')); blackHoles.splice(i, 1); } });
    orbitalStrikes.forEach((os, i) => { os.update(); os.draw(); if (os.life <= 0) orbitalStrikes.splice(i, 1); });
    homingMissiles.forEach((m, i) => { m.update(); m.draw(); if (m.life <= 0) homingMissiles.splice(i, 1); });

    // AURA DE FRENZY NO PLAYER
    if (isFrenzy && Math.random() > 0.4) createParticles(player.x, player.y, 'yellow', 1);

    ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, Math.PI*2);
    ctx.fillStyle = isFrenzy ? '#ffdd00' : player.baseColor; 
    ctx.shadowBlur = isFrenzy ? 40 : 20; ctx.shadowColor = ctx.fillStyle; ctx.fill(); ctx.shadowBlur = 0;

    if (player.vortexTime > 0) {
        let angleOffset = (Date.now() / 150) % (Math.PI * 2);
        let numOrbs = isFrenzy ? 6 : 3; 
        let vSpeed = isFrenzy ? 2 : 1;
        for(let i=0; i<numOrbs; i++) {
            let angle = (angleOffset * vSpeed) + (i * (Math.PI*2/numOrbs));
            let bx = player.x + Math.cos(angle) * (isFrenzy ? 90 : 70); 
            let by = player.y + Math.sin(angle) * (isFrenzy ? 90 : 70);
            ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI*2); ctx.fillStyle = '#ff5500'; ctx.fill();
            enemies.forEach(en => { if (Math.hypot(bx - en.x, by - en.y) < en.radius + 8) en.hp -= 5 * timeScale * getMultDano(); });
        }
    }

    bullets.forEach((b, bi) => { b.update(); b.draw(); if (b.life <= 0) bullets.splice(bi, 1); });
    
    enemies.forEach((en, ei) => {
        en.update(); en.draw();
        bullets.forEach((b, bi) => {
            if (Math.hypot(b.x - en.x, b.y - en.y) < b.radius + en.radius) { 
                en.hp -= (b.isExplosion ? 15 : 10) * getMultDano();
                if (!b.isExplosion) bullets.splice(bi, 1); 
            }
        });
        if (en.hp <= 0) {
            playSound('kill'); player.kills++; combo++; comboTimer = 180;
            let subiuDeNivel = sistemaNivel.ganharXP(25); 
            if (subiuDeNivel) dispararEfeitosLevelUp(sistemaNivel.nivel);
            floatingTexts.push(new FloatingText(en.x, en.y, isFrenzy ? "FRENZY!" : "+1", isFrenzy ? "#ff3300" : "#ffdd00"));
            createParticles(en.x, en.y, '#ffae00', 15);
            enemies.splice(ei, 1);
        }
    });

    particles.forEach((p, i) => {
        p.x += p.vx * timeScale; p.y += p.vy * timeScale; p.life -= 1 * timeScale;
        ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, p.life / 30); ctx.fillRect(p.x, p.y, 4, 4);
        ctx.globalAlpha = 1; if(p.life <= 0) particles.splice(i, 1);
    });

    floatingTexts.forEach((ft, i) => { ft.update(); ft.draw(); if (ft.life <= 0) floatingTexts.splice(i, 1); });

    // --- RENDERIZAÇÃO DO SCREEN FLASH (Deve ser por último) ---
    if (screenFlash > 0) {
        ctx.save();
        ctx.fillStyle = flashColor;
        ctx.globalAlpha = screenFlash;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        screenFlash -= 0.02 * timeScale;
    }

    updateUI(); ctx.restore(); requestAnimationFrame(animate);
}

spawnEnemy(); animate();
window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
