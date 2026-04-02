const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth; canvas.height = window.innerHeight;

const universo = new SistemaEstelar(canvas.width, canvas.height);

const initPlayer = () => ({
    x: canvas.width / 2, y: canvas.height / 2,
    radius: 18, baseColor: '#00d2ff', speed: 5,
    hp: 100, maxHp: 100, kills: 0, 
    isDashing: false, shieldTime: 0, vortexTime: 0,
    history: [] 
});

let player = initPlayer();
const mouse = { x: 0, y: 0 };

const cooldowns = {
    q: { lastUsed: 0, duration: 400 },
    e: { lastUsed: 0, duration: 5000 },
    space: { lastUsed: 0, duration: 3000 },
    shift: { lastUsed: 0, duration: 10000 },
    f: { lastUsed: 0, duration: 8000 },  // Raio Orbital agora no F
    g: { lastUsed: 0, duration: 15000 }, // Buraco Negro agora no G
    c: { lastUsed: 0, duration: 20000 },
    t: { lastUsed: 0, duration: 12000 }
};

const keys = {};
let enemies = []; let bullets = []; let particles = [];
let blackHoles = []; let orbitalStrikes = []; let floatingTexts = []; let shockwaves = [];
let screenShakeTime = 0; let timeScale = 1.0; let slowMotionTimer = 0;

// Sistema de Combo
let combo = 0;
let comboTimer = 0;
let isFrenzy = false;

window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });

function applyScreenShake() {
    if (screenShakeTime > 0) {
        ctx.translate(Math.random() * 10 - 5, Math.random() * 10 - 5);
        screenShakeTime--;
    }
}

// CLASSES (Mantendo as suas originais com leves ajustes visuais)
class Shockwave {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.radius = 10; this.maxRadius = 250;
        this.color = color; this.life = 20; this.maxLife = 20;
    }
    update() { this.radius += 15 * timeScale; this.life -= 1 * timeScale; }
    draw() {
        ctx.save();
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
        ctx.strokeStyle = this.color; ctx.lineWidth = (this.life / this.maxLife) * 10;
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        ctx.stroke();
        ctx.restore();
    }
}

class FloatingText {
    constructor(x, y, text, color, size = 16) {
        this.x = x + (Math.random()*20-10); this.y = y + (Math.random()*20-10);
        this.text = text; this.color = color; this.life = 40; this.size = size;
    }
    update() { this.y -= 1.5 * timeScale; this.life -= 1 * timeScale; }
    draw() {
        ctx.save(); ctx.globalAlpha = Math.max(0, this.life / 40); ctx.fillStyle = this.color;
        ctx.font = `bold ${this.size}px sans-serif`; ctx.shadowBlur = 8; ctx.shadowColor = 'black';
        ctx.fillText(this.text, this.x, this.y); ctx.restore();
    }
}

class OrbitalStrike {
    constructor(x, y) { this.x = x; this.y = y; this.life = 90; this.radius = 150; this.exploded = false; }
    update() {
        this.life -= 1 * timeScale;
        if (this.life <= 30 && !this.exploded) {
            this.exploded = true; screenShakeTime = 25;
            createParticles(this.x, this.y, '#ff00ea', 60);
            shockwaves.push(new Shockwave(this.x, this.y, '#ff00ea'));
            enemies.forEach(en => {
                if (Math.sqrt((this.x - en.x)**2 + (this.y - en.y)**2) < this.radius) {
                    en.hp -= 50; floatingTexts.push(new FloatingText(en.x, en.y, "-50", "#ff00ea", 22));
                }
            });
        }
    }
    draw() {
        if (this.life > 30) {
            ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
            ctx.strokeStyle = `rgba(255, 0, 234, ${Math.abs(Math.sin(this.life/5))})`; ctx.lineWidth = 3; ctx.stroke();
        } else {
            ctx.fillStyle = `rgba(255, 0, 234, ${this.life/30})`;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2); ctx.fill();
        }
    }
}

class Enemy {
    constructor() {
        this.radius = 16;
        this.x = Math.random() < 0.5 ? -this.radius : canvas.width + this.radius;
        this.y = Math.random() * canvas.height;
        this.speed = 1.8 + (player.kills * 0.05);
        this.hp = 20 + (player.kills * 0.8);
    }
    update() {
        let dx = player.x - this.x; let dy = player.y - this.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        let moveX = (dx / dist) * this.speed * timeScale; let moveY = (dy / dist) * this.speed * timeScale;

        blackHoles.forEach(bh => {
            let bhDist = Math.sqrt((bh.x - this.x)**2 + (bh.y - this.y)**2);
            if (bhDist < 350) { moveX += ((bh.x - this.x) / bhDist) * 5 * timeScale; moveY += ((bh.y - this.y) / bhDist) * 5 * timeScale; }
            if (bhDist < bh.radius) { this.hp -= 3 * timeScale; createParticles(this.x, this.y, 'purple', 2); }
        });

        this.x += moveX; this.y += moveY;

        if (dist < this.radius + player.radius) {
            if (player.shieldTime > 0) {
                this.x -= moveX * 20; this.y -= moveY * 20; this.hp -= 10;
                createParticles(this.x, this.y, '#00ffcc', 5);
                shockwaves.push(new Shockwave(player.x, player.y, 'rgba(0, 255, 204, 0.5)'));
            } else {
                player.hp -= 0.8 * timeScale; screenShakeTime = 4;
            }
        }
    }
    draw() {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
        ctx.fillStyle = '#ff1133'; ctx.shadowBlur = 15; ctx.shadowColor = '#ff1133'; ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = 'white'; ctx.fillRect(this.x - 12, this.y - 25, 24 * (this.hp/(20 + player.kills * 0.8)), 4);
    }
}

class Bullet {
    constructor(x, y, targetX, targetY, isExplosion = false) {
        this.x = x; this.y = y; this.radius = isExplosion ? 130 : 6;
        this.color = isExplosion ? 'rgba(255, 150, 0, 0.6)' : (isFrenzy ? '#ffdd00' : '#fff');
        this.isExplosion = isExplosion; this.life = isExplosion ? 15 : 100;
        const dist = Math.sqrt((targetX - x)**2 + (targetY - y)**2);
        this.vx = ((targetX - x) / dist) * 18; this.vy = ((targetY - y) / dist) * 18;
    }
    update() { if (!this.isExplosion) { this.x += this.vx * timeScale; this.y += this.vy * timeScale; } this.life -= 1 * timeScale; }
    draw() {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
        ctx.fillStyle = this.color; 
        if(!this.isExplosion) { ctx.shadowBlur = 15; ctx.shadowColor = this.color; }
        ctx.fill(); ctx.shadowBlur = 0;
    }
}

class BlackHole {
    constructor(x, y) { this.x = x; this.y = y; this.radius = 5; this.maxRadius = 80; this.life = 300; }
    update() { if (this.radius < this.maxRadius) this.radius += 2 * timeScale; this.life -= 1 * timeScale; }
    draw() {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
        ctx.fillStyle = '#050505'; ctx.fill(); ctx.lineWidth = 4;
        ctx.strokeStyle = `rgba(138, 43, 226, ${Math.random() * 0.5 + 0.5})`;
        ctx.shadowBlur = 30; ctx.shadowColor = '#8a2be2'; ctx.stroke(); ctx.shadowBlur = 0;
    }
}

function createParticles(x, y, color, count) {
    for(let i=0; i<count; i++) particles.push({ x, y, vx: Math.random()*10-5, vy: Math.random()*10-5, life: 30, color });
}

function spawnEnemy() {
    if (player.hp > 0 && enemies.length < 20 + player.kills/2) enemies.push(new Enemy());
    setTimeout(spawnEnemy, isFrenzy ? 400 : 800); 
}

function updateUI() {
    const now = Date.now();
    document.getElementById('hp-bar').style.width = Math.max(0, (player.hp / player.maxHp * 100)) + '%';
    document.getElementById('hp-text').innerText = `INTEGRIDADE DO NÚCLEO: ${Math.max(0, Math.floor(player.hp))}%`;
    document.getElementById('score').innerText = `Kills: ${player.kills}`;
    
    const comboEl = document.getElementById('combo-text');
    comboEl.innerText = `Combo: x${combo}`;
    if (isFrenzy) comboEl.classList.add('frenzy');
    else comboEl.classList.remove('frenzy');

    // Atualizado para incluir a tecla G
    ['q', 'e', 'space', 'shift', 't', 'f', 'g', 'c'].forEach((key, index) => {
        const el = document.getElementById(`skill${index+1}`);
        if (el && now - cooldowns[key].lastUsed > cooldowns[key].duration) el.classList.add('ready');
        else if (el) el.classList.remove('ready');
    });
}

function resetGame() {
    player = initPlayer(); enemies = []; bullets = []; particles = []; blackHoles = []; 
    orbitalStrikes = []; floatingTexts = []; shockwaves = []; timeScale = 1; slowMotionTimer = 0; combo = 0; comboTimer = 0;
}

function animate() {
    ctx.save();
    if (slowMotionTimer > 0) { timeScale = 0.25; slowMotionTimer--; } else { timeScale = 1.0; }

    // Gestão do Combo
    if (comboTimer > 0) { comboTimer -= 1 * timeScale; isFrenzy = combo >= 10; } 
    else { combo = 0; isFrenzy = false; }

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

    // --- ENTRADA DE TECLAS (ATUALIZADO) ---
    if (keys[' '] && now - cooldowns.space.lastUsed > cooldowns.space.duration) {
        player.isDashing = true; cooldowns.space.lastUsed = now; setTimeout(() => player.isDashing = false, 150);
        shockwaves.push(new Shockwave(player.x, player.y, 'rgba(0, 210, 255, 0.5)'));
    }
    if (keys['shift'] && now - cooldowns.shift.lastUsed > cooldowns.shift.duration) {
        player.shieldTime = 180; cooldowns.shift.lastUsed = now;
        shockwaves.push(new Shockwave(player.x, player.y, '#00ffcc'));
    }
    if (keys['t'] && now - cooldowns.t.lastUsed > cooldowns.t.duration) {
        player.vortexTime = 300; cooldowns.t.lastUsed = now; screenShakeTime = 10;
        floatingTexts.push(new FloatingText(player.x, player.y - 30, "VORTEX ATIVADO", "#ff5500", 20));
    }
    if (keys['f'] && now - cooldowns.f.lastUsed > cooldowns.f.duration) { // RAIO ORBITAL NO F
        orbitalStrikes.push(new OrbitalStrike(mouse.x, mouse.y)); cooldowns.f.lastUsed = now;
    }
    if (keys['g'] && now - cooldowns.g.lastUsed > cooldowns.g.duration) { // BURACO NEGRO NO G
        blackHoles.push(new BlackHole(mouse.x, mouse.y)); cooldowns.g.lastUsed = now; screenShakeTime = 15;
    }
    if (keys['c'] && now - cooldowns.c.lastUsed > cooldowns.c.duration) {
        slowMotionTimer = 300; cooldowns.c.lastUsed = now;
        shockwaves.push(new Shockwave(player.x, player.y, '#00ffaa'));
    }

    if (player.isDashing) currentSpeed = player.speed * 5;
    if (player.shieldTime > 0) player.shieldTime--;
    if (player.vortexTime > 0) player.vortexTime -= 1 * timeScale;

    // Movimento
    if (keys['w'] && player.y > player.radius) player.y -= currentSpeed;
    if (keys['s'] && player.y < canvas.height - player.radius) player.y += currentSpeed;
    if (keys['a'] && player.x > player.radius) player.x -= currentSpeed;
    if (keys['d'] && player.x < canvas.width - player.radius) player.x += currentSpeed;

    // Rastro
    player.history.push({x: player.x, y: player.y});
    if (player.history.length > (isFrenzy ? 12 : 8)) player.history.shift();
    player.history.forEach((pos, i) => {
        ctx.beginPath(); ctx.arc(pos.x, pos.y, player.radius * (i/player.history.length), 0, Math.PI*2);
        ctx.fillStyle = isFrenzy ? `rgba(255, 150, 0, ${i/20})` : `rgba(0, 210, 255, ${i/20})`; 
        ctx.fill();
    });

    // Tiro Q e Explosão E
    if (keys['q'] && now - cooldowns.q.lastUsed > (cooldowns.q.duration - (isFrenzy ? 200 : 0))) {
        bullets.push(new Bullet(player.x, player.y, mouse.x, mouse.y)); cooldowns.q.lastUsed = now;
    }
    if (keys['e'] && now - cooldowns.e.lastUsed > cooldowns.e.duration) {
        bullets.push(new Bullet(player.x, player.y, player.x, player.y, true)); cooldowns.e.lastUsed = now; 
        screenShakeTime = 15;
    }

    // Desenhar entidades
    shockwaves.forEach((sw, i) => { sw.update(); sw.draw(); if (sw.life <= 0) shockwaves.splice(i, 1); });
    blackHoles.forEach((bh, i) => { bh.update(); bh.draw(); if (bh.life <= 0) { shockwaves.push(new Shockwave(bh.x, bh.y, '#8a2be2')); blackHoles.splice(i, 1); } });
    orbitalStrikes.forEach((os, i) => { os.update(); os.draw(); if (os.life <= 0) orbitalStrikes.splice(i, 1); });

    // Desenhar Jogador
    ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, Math.PI*2);
    ctx.fillStyle = isFrenzy ? '#ffdd00' : player.baseColor; 
    ctx.shadowBlur = isFrenzy ? 30 : 20; ctx.shadowColor = ctx.fillStyle; ctx.fill(); ctx.shadowBlur = 0;

    // Vortex Visual
    if (player.vortexTime > 0) {
        let angleOffset = (Date.now() / 150) % (Math.PI * 2);
        for(let i=0; i<3; i++) {
            let angle = angleOffset + (i * (Math.PI*2/3));
            let bx = player.x + Math.cos(angle) * 70;
            let by = player.y + Math.sin(angle) * 70;
            ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI*2);
            ctx.fillStyle = '#ff5500'; ctx.fill();
            enemies.forEach(en => {
                if (Math.sqrt((bx - en.x)**2 + (by - en.y)**2) < en.radius + 8) en.hp -= 5 * timeScale;
            });
        }
    }

    // Update Balas e Inimigos
    bullets.forEach((b, bi) => { b.update(); b.draw(); if (b.life <= 0) bullets.splice(bi, 1); });
    enemies.forEach((en, ei) => {
        en.update(); en.draw();
        bullets.forEach((b, bi) => {
            const dist = Math.sqrt((b.x - en.x)**2 + (b.y - en.y)**2);
            if (dist < b.radius + en.radius) {
                en.hp -= b.isExplosion ? 4 : (isFrenzy ? 15 : 10);
                if (!b.isExplosion) bullets.splice(bi, 1);
            }
        });
        if (en.hp <= 0) {
            player.kills++; combo++; comboTimer = 180;
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

    updateUI(); ctx.restore(); requestAnimationFrame(animate);
}

spawnEnemy(); animate();
window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
